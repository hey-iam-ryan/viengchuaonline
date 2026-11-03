import { DurableObject } from 'cloudflare:workers';
import {
  HALL_CAPACITY, INCENSE_COOLDOWN_MS, INCENSE_MAX_PER_HALL, INCENSE_TTL_MS, LANTERN_COOLDOWN_MS, LANTERN_MAX_PER_HALL,
  LANTERN_TTL_MS, NET_HZ, GREET_COOLDOWN_MS, WISH_COOLDOWN_MS, WISH_MAX_PER_HALL,
  parseClientMsg, type Incense, type Lantern, type PlayerState, type ServerMsg, type Wish,
} from '@vco/shared/protocol';
import { clampToPond, resolveCollision, SPAWN } from '@vco/shared/world';
import { emptyStats, type DayStats } from '@vco/shared/stats';
import { SWEEP_RANGE, canSweep, spawnLeaves, type LeafState } from '@vco/shared/leaves';
import { sanitizeName } from '@vco/shared/name';
import { TokenBucket } from '@vco/shared/rateLimit';
import type { Env } from './env';

/** Trạng thái mỗi kết nối, lưu trong attachment để còn sau hibernation. */
interface Attachment {
  id: string;
  hall: number;
  state: PlayerState | null; // null = chưa hello
  lastIncense: number;
  lastLantern?: number;
  lastWish?: number;
  lastHi?: number;
  violations: number;
}

const FLUSH_MS = 1000 / NET_HZ;
const MAX_VIOLATIONS = 20;
const REPORT_MS = 1000;
const RATE = { perSec: 15, burst: 30 };
/** Còn người thì báo lại Lobby định kỳ, để Lobby phân biệt gian sống với gian đã reset. */
export const HEARTBEAT_MS = 60_000;

export class Hall extends DurableObject<Env> {
  private hall = -1;
  private incense: Incense[] = [];
  private lanterns: Lantern[] = [];
  private wishes: Wish[] = [];
  private pending: DayStats = emptyStats();
  private leafState: LeafState = { leaves: [], slot: -1 };
  private buckets = new WeakMap<WebSocket, TokenBucket>();
  private dirty = new Set<string>();
  private gone: string[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private lastFlush = 0;
  private lastReport = 0;
  private reportTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {
      this.incense = (await ctx.storage.get<Incense[]>('incense')) ?? [];
      this.lanterns = (await ctx.storage.get<Lantern[]>('lanterns')) ?? [];
      this.wishes = (await ctx.storage.get<Wish[]>('wishes')) ?? [];
      this.leafState = (await ctx.storage.get<LeafState>('leaves')) ?? { leaves: [], slot: -1 };
      this.hall = (await ctx.storage.get<number>('hall')) ?? -1;
    });
  }

  async fetch(req: Request): Promise<Response> {
    if (req.headers.get('Upgrade') !== 'websocket') return new Response('Expected WebSocket', { status: 426 });
    const n = Number(new URL(req.url).pathname.slice(1));
    if (this.hall !== n) {
      this.hall = n;
      await this.ctx.storage.put('hall', n);
    }
    const [client, server] = Object.values(new WebSocketPair());
    if (this.openSockets().length >= HALL_CAPACITY) {
      server.accept();
      server.send(JSON.stringify({ t: 'full' } satisfies ServerMsg));
      server.close(4001, 'full');
      return new Response(null, { status: 101, webSocket: client });
    }
    this.ctx.acceptWebSocket(server);
    const att: Attachment = { id: crypto.randomUUID().slice(0, 8), hall: n, state: null, lastIncense: 0, violations: 0 };
    server.serializeAttachment(att);
    this.scheduleReport();
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer) {
    const att = ws.deserializeAttachment() as Attachment;
    const now = Date.now();
    let bucket = this.buckets.get(ws);
    if (!bucket) this.buckets.set(ws, (bucket = new TokenBucket(RATE.perSec, RATE.burst, now)));
    const msg = bucket.take(now) ? parseClientMsg(raw) : null;
    if (!msg) {
      att.violations++;
      ws.serializeAttachment(att);
      if (att.violations >= MAX_VIOLATIONS) ws.close(4008, 'policy');
      return;
    }
    // lá rụng theo thời gian: tính bù khi có hoạt động (không cần hẹn giờ → vẫn hibernate được)
    if (this.hall >= 0) {
      const sp = spawnLeaves(this.leafState, this.hall, now);
      if (sp.added.length) {
        this.leafState = sp.state;
        await this.ctx.storage.put('leaves', this.leafState);
        if (msg.t !== 'hello') this.broadcast({ t: 'la', add: sp.added });
        else this.broadcast({ t: 'la', add: sp.added }, ws);
      }
    }
    if (msg.t === 'hello') {
      if (att.state) return;
      att.state = { id: att.id, n: sanitizeName(msg.name), r: msg.robe, x: SPAWN.x, z: SPAWN.z, ry: SPAWN.ry, p: 0, k: msg.k };
      ws.serializeAttachment(att);
      const players = this.players().filter((p) => p.id !== att.id);
      this.send(ws, {
        t: 'welcome', id: att.id, hall: att.hall, now, players,
        incense: this.liveIncense(now), lanterns: this.liveLanterns(now), wishes: this.wishes, leaves: this.leafState.leaves,
      });
      this.markDirty(att.id);
      return;
    }
    if (!att.state) return; // chưa hello
    switch (msg.t) {
      case 's': {
        const p = resolveCollision(msg.x, msg.z);
        att.state = { ...att.state, x: p.x, z: p.z, ry: msg.ry, p: msg.p };
        ws.serializeAttachment(att);
        this.markDirty(att.id);
        break;
      }
      case 'a':
        if (msg.a === 'bow') this.count('bows');
        this.broadcast({ t: 'act', id: att.id, a: msg.a }, ws);
        break;
      case 'den': {
        if (now - (att.lastLantern ?? 0) < LANTERN_COOLDOWN_MS) return;
        att.lastLantern = now;
        ws.serializeAttachment(att);
        const p = clampToPond(msg.x, msg.z);
        const l: Lantern = { x: Math.round(p.x * 100) / 100, z: Math.round(p.z * 100) / 100, at: now, s: Math.floor(Math.random() * 1000) };
        this.lanterns = [...this.liveLanterns(now), l].slice(-LANTERN_MAX_PER_HALL);
        await this.ctx.storage.put('lanterns', this.lanterns);
        this.count('lanterns');
        this.broadcast({ t: 'den', l }, ws);
        break;
      }
      case 'quet': {
        const leaf = this.leafState.leaves.find((l) => l.id === msg.id);
        // vị trí phía server cập nhật ~5 lần/giây nên nới thêm 1m cho độ trễ
        if (!leaf || !canSweep(leaf, att.state.x, att.state.z, SWEEP_RANGE + 1)) return;
        this.leafState = { ...this.leafState, leaves: this.leafState.leaves.filter((l) => l.id !== msg.id) };
        await this.ctx.storage.put('leaves', this.leafState);
        this.broadcast({ t: 'la', del: [msg.id], by: att.id }, ws);
        break;
      }
      case 'rk':
        att.state = { ...att.state, k: msg.k };
        ws.serializeAttachment(att);
        this.markDirty(att.id);
        break;
      case 'hi': {
        if (now - (att.lastHi ?? 0) < GREET_COOLDOWN_MS) return;
        att.lastHi = now;
        ws.serializeAttachment(att);
        this.broadcast({ t: 'hi', from: att.id, to: msg.to }, ws);
        break;
      }
      case 'ng': {
        if (now - (att.lastWish ?? 0) < WISH_COOLDOWN_MS) return;
        att.lastWish = now;
        ws.serializeAttachment(att);
        const w: Wish = { n: att.state.n, p: msg.p, at: now };
        this.wishes = [...this.wishes, w].slice(-WISH_MAX_PER_HALL);
        await this.ctx.storage.put('wishes', this.wishes);
        this.count('wishes');
        this.broadcast({ t: 'ng', w }, ws);
        break;
      }
      case 'inc': {
        if (now - att.lastIncense < INCENSE_COOLDOWN_MS) return;
        att.lastIncense = now;
        ws.serializeAttachment(att);
        const i: Incense = { b: msg.b, at: now };
        this.incense = [...this.liveIncense(now), i].slice(-INCENSE_MAX_PER_HALL);
        await this.ctx.storage.put('incense', this.incense);
        this.count('incense');
        this.broadcast({ t: 'inc', i }, ws); // người thắp đã tự hiển thị
        break;
      }
    }
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string) {
    this.leave(ws);
    try { ws.close(code, reason); } catch { /* đã đóng */ }
  }

  async webSocketError(ws: WebSocket) {
    this.leave(ws);
  }

  private leave(ws: WebSocket) {
    const att = ws.deserializeAttachment() as Attachment | null;
    if (att?.state) {
      this.dirty.delete(att.id);
      this.gone.push(att.id);
      this.scheduleFlush();
    }
    this.scheduleReport(ws);
  }

  private openSockets(except?: WebSocket) {
    return this.ctx.getWebSockets().filter((w) => w !== except && w.readyState === WebSocket.OPEN);
  }

  private players(): PlayerState[] {
    const out: PlayerState[] = [];
    for (const w of this.openSockets()) {
      const a = w.deserializeAttachment() as Attachment | null;
      if (a?.state) out.push(a.state);
    }
    return out;
  }

  private liveLanterns(now: number) {
    return this.lanterns.filter((l) => now - l.at < LANTERN_TTL_MS);
  }

  /** Gộp số liệu trong ngày, gửi kèm lần báo cáo Lobby kế tiếp (không tốn thêm request). */
  private count(k: keyof DayStats) {
    this.pending[k]++;
    this.scheduleReport();
  }

  private liveIncense(now: number) {
    return this.incense.filter((i) => now - i.at < INCENSE_TTL_MS);
  }

  private markDirty(id: string) {
    this.dirty.add(id);
    this.scheduleFlush();
  }

  private scheduleFlush() {
    if (this.flushTimer) return;
    const delay = Math.max(0, this.lastFlush + FLUSH_MS - Date.now());
    this.flushTimer = setTimeout(() => this.flush(), delay);
  }

  private flush() {
    this.flushTimer = null;
    this.lastFlush = Date.now();
    if (!this.dirty.size && !this.gone.length) return;
    const u = this.players().filter((p) => this.dirty.has(p.id));
    const msg: ServerMsg = { t: 'snap', u, gone: this.gone };
    this.dirty.clear();
    this.gone = [];
    this.broadcast(msg);
  }

  private send(ws: WebSocket, m: ServerMsg) {
    try { ws.send(JSON.stringify(m)); } catch { /* socket đang đóng */ }
  }

  private broadcast(m: ServerMsg, except?: WebSocket) {
    const s = JSON.stringify(m);
    for (const w of this.openSockets(except)) {
      try { w.send(s); } catch { /* bỏ qua */ }
    }
  }

  /** Báo số người về Lobby, tối đa 1 lần/giây; về 0 thì báo ngay. */
  private scheduleReport(leaving?: WebSocket) {
    const count = this.openSockets(leaving).length;
    const now = Date.now();
    if (count === 0 || now - this.lastReport >= REPORT_MS) {
      if (this.reportTimer) { clearTimeout(this.reportTimer); this.reportTimer = null; }
      this.report(count);
    } else if (!this.reportTimer) {
      this.reportTimer = setTimeout(() => {
        this.reportTimer = null;
        this.report(this.openSockets().length);
      }, REPORT_MS - (now - this.lastReport));
    }
  }

  async alarm() {
    const count = this.openSockets().length;
    this.report(count);
  }

  private async ensureHeartbeat() {
    const cur = await this.ctx.storage.getAlarm();
    if (cur == null || cur <= Date.now()) await this.ctx.storage.setAlarm(Date.now() + HEARTBEAT_MS);
  }

  private report(count: number) {
    this.lastReport = Date.now();
    if (this.hall < 0) return;
    if (count > 0) this.ctx.waitUntil(this.ensureHeartbeat());
    const lobby = this.env.LOBBY.get(this.env.LOBBY.idFromName('lobby'));
    const deltas = this.pending;
    this.pending = emptyStats();
    this.ctx.waitUntil(lobby.report(this.hall, count, deltas).catch(() => {}));
  }
}
