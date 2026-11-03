import { NET_HZ, type ClientMsg, type Pose, type Robe, type ServerMsg } from '@vco/shared/protocol';

export type NetStatus = 'connecting' | 'online' | 'solo';
const MAX_FULL_RETRIES = 3;
const BACKOFF_MIN = 1000;
const BACKOFF_MAX = 30_000;
const SEND_INTERVAL = 1000 / NET_HZ;
const CODE_FULL = 4001;
const CODE_CHANGE = 4100;

interface Opts {
  url: string | null;
  fetchFn?: typeof fetch;
  WS?: typeof WebSocket;
  now?: () => number;
  random?: () => number;
}

type StatusCb = (s: NetStatus, hall: number | null) => void;
type MsgCb = (m: ServerMsg) => void;

/**
 * Lobby → Hall WebSocket. Gian đầy → thử gian khác (≤3 lần) → chế độ một mình.
 * Rớt mạng → một mình + kết nối lại với backoff có jitter. Không bao giờ ném lỗi ra ngoài.
 */
export class NetClient {
  serverOffsetMs = 0;
  hall: number | null = null;
  status: NetStatus = 'connecting';
  private readonly url: string | null;
  private readonly fetchFn: typeof fetch;
  private readonly WS: typeof WebSocket | undefined;
  private readonly now: () => number;
  private readonly random: () => number;
  private hello: { name: string; robe: Robe; k: number } | null = null;
  private ws: WebSocket | null = null;
  private wsHall = -1;
  private exclude: number[] = [];
  private fullTries = 0;
  private backoffK = 0;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingState: { x: number; z: number; ry: number; p: Pose } | null = null;
  private lastSent = 0;
  private sendTimer: ReturnType<typeof setTimeout> | null = null;
  private statusCbs: StatusCb[] = [];
  private msgCbs: MsgCb[] = [];
  private gotFull = false;
  private changing = false;
  private gen = 0;
  private prefer = -1;

  constructor(o: Opts) {
    this.url = o.url;
    this.fetchFn = o.fetchFn ?? ((...a: Parameters<typeof fetch>) => fetch(...a));
    this.WS = o.WS ?? (globalThis as any).WebSocket;
    this.now = o.now ?? (() => Date.now());
    this.random = o.random ?? Math.random;
    if (typeof document !== 'undefined')
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && this.status === 'solo' && this.url && this.hello && !this.ws) {
          this.clearRetry();
          this.backoffK = 0;
          void this.connect();
        }
      });
  }

  on(ev: 'status', cb: StatusCb): void;
  on(ev: 'msg', cb: MsgCb): void;
  on(ev: 'status' | 'msg', cb: StatusCb | MsgCb): void {
    if (ev === 'status') this.statusCbs.push(cb as StatusCb);
    else this.msgCbs.push(cb as MsgCb);
  }

  /** prefer: gian bạn bè rủ vào (0-based), chỉ dùng cho lần kết nối đầu. */
  start(hello: { name: string; robe: Robe; k?: number }, prefer = -1): void {
    this.hello = { k: 0, ...hello };
    this.prefer = prefer;
    if (!this.url || !this.WS) { this.setStatus('solo', null); return; }
    this.setStatus('connecting', null);
    void this.connect();
  }

  private setStatus(s: NetStatus, hall: number | null) {
    this.status = s;
    this.hall = hall;
    for (const cb of this.statusCbs) cb(s, hall);
  }

  private async connect(): Promise<void> {
    const gen = ++this.gen;
    let hall: number;
    try {
      const params: string[] = [];
      if (this.prefer >= 0) params.push(`prefer=${this.prefer}`);
      if (this.exclude.length) params.push(`exclude=${this.exclude.join(',')}`);
      const q = params.length ? `?${params.join('&')}` : '';
      const res = await this.fetchFn(`${this.url}/lobby${q}`);
      if (!res.ok) throw new Error(`lobby ${res.status}`);
      hall = Number((await res.json()).hall);
    } catch {
      if (gen === this.gen) this.goSolo();
      return;
    }
    if (gen !== this.gen) return;
    if (!Number.isInteger(hall) || hall < 0) { this.goSolo(); return; }
    this.openHall(hall);
  }

  private openHall(hall: number) {
    const wsUrl = `${this.url!.replace(/^http/, 'ws')}/hall/${hall}`;
    let ws: WebSocket;
    try {
      ws = new this.WS!(wsUrl);
    } catch {
      this.goSolo();
      return;
    }
    this.ws = ws;
    this.wsHall = hall;
    this.gotFull = false;
    ws.onopen = () => ws.send(JSON.stringify({ t: 'hello', ...this.hello! } satisfies ClientMsg));
    ws.onmessage = (e) => {
      let m: ServerMsg;
      try { m = JSON.parse(String(e.data)); } catch { return; }
      if (m.t === 'full') { this.gotFull = true; return; }
      if (m.t === 'welcome') {
        this.serverOffsetMs = m.now - this.now();
        this.fullTries = 0;
        this.backoffK = 0;
        this.exclude = [];
        this.prefer = -1;
        this.setStatus('online', m.hall);
      }
      for (const cb of this.msgCbs) cb(m);
    };
    ws.onclose = (e) => {
      if (this.ws !== ws) return;
      this.ws = null;
      if (this.changing) {
        this.changing = false;
        this.exclude = [hall];
        this.setStatus('connecting', null);
        void this.connect();
        return;
      }
      if (e.code === CODE_FULL || this.gotFull) {
        this.exclude = [...this.exclude, hall];
        if (++this.fullTries <= MAX_FULL_RETRIES) { void this.connect(); return; }
      }
      this.goSolo();
    };
    ws.onerror = () => { /* onclose sẽ xử lý */ };
  }

  private goSolo() {
    if (this.status !== 'solo') this.setStatus('solo', null);
    this.scheduleRetry();
  }

  private scheduleRetry() {
    if (this.retryTimer || !this.url) return;
    const base = Math.min(BACKOFF_MAX, BACKOFF_MIN * 2 ** this.backoffK);
    this.backoffK++;
    const delay = Math.round(base * (0.5 + this.random()));
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      this.fullTries = 0;
      this.exclude = [];
      void this.connect();
    }, delay);
  }

  private clearRetry() {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = null;
  }

  private get open() {
    return !!this.ws && this.ws.readyState === 1 && this.status === 'online';
  }

  send(m: ClientMsg): void {
    if (!this.open) return;
    try { this.ws!.send(JSON.stringify(m)); } catch { /* bỏ qua */ }
  }

  /** Gộp trạng thái, gửi tối đa NET_HZ lần/giây, luôn gửi trạng thái mới nhất. */
  sendState(s: { x: number; z: number; ry: number; p: Pose }): void {
    if (!this.open) return;
    this.pendingState = s;
    const wait = this.lastSent + SEND_INTERVAL - this.now();
    if (wait <= 0) { this.flushState(); return; }
    if (!this.sendTimer) this.sendTimer = setTimeout(() => { this.sendTimer = null; this.flushState(); }, wait);
  }

  private flushState() {
    if (!this.pendingState) return;
    const s = this.pendingState;
    this.pendingState = null;
    this.lastSent = this.now();
    const r = (v: number) => Math.round(v * 100) / 100;
    this.send({ t: 's', x: r(s.x), z: r(s.z), ry: r(s.ry), p: s.p });
  }

  /** Lên cấp: cập nhật cho lần kết nối sau và báo ngay cho gian hiện tại. */
  setRank(k: number): void {
    if (this.hello) this.hello.k = k;
    this.send({ t: 'rk', k });
  }

  changeHall(): void {
    if (!this.ws || this.status !== 'online') return;
    this.changing = true;
    try { this.ws.close(CODE_CHANGE, 'change'); } catch { /* */ }
  }
}
