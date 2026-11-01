import { DurableObject } from 'cloudflare:workers';
import { HALL_CAPACITY, HALL_COUNT } from '@vco/shared/protocol';
import type { Env } from './env';

/** Ngưỡng mềm: để chừa chỗ cho người vào cùng bạn bè và bù cho số đếm trễ. */
export const SOFT_CAP = 90;
/** Gian không báo lại trong khoảng này coi như trống (gian bị reset/deploy không kịp báo 0). */
export const STALE_MS = 150_000;
type Counts = Record<number, { c: number; at: number }>;

export class Lobby extends DurableObject<Env> {
  private async raw(): Promise<Counts> {
    return (await this.ctx.storage.get<Counts>('counts')) ?? {};
  }

  /** Số người hiện tại mỗi gian, bỏ các báo cáo đã cũ. */
  private async counts(): Promise<Record<number, number>> {
    const now = Date.now();
    const out: Record<number, number> = {};
    for (const [h, v] of Object.entries(await this.raw())) if (v && now - v.at < STALE_MS) out[Number(h)] = v.c;
    return out;
  }

  async report(hall: number, count: number): Promise<void> {
    if (!Number.isInteger(hall) || hall < 0 || hall >= HALL_COUNT) return;
    if (!Number.isFinite(count) || count < 0) return;
    const c = await this.raw();
    c[hall] = { c: Math.min(HALL_CAPACITY, Math.floor(count)), at: Date.now() };
    await this.ctx.storage.put('counts', c);
  }

  async assign(exclude: number[]): Promise<{ hall: number; total: number }> {
    const c = await this.counts();
    const ex = new Set(exclude);
    const total = Object.values(c).reduce((a, b) => a + b, 0);
    let pick = -1;
    for (let h = 0; h < HALL_COUNT; h++) {
      if (ex.has(h)) continue;
      const n = c[h] ?? 0;
      if (n < SOFT_CAP) { pick = h; break; }
      if (n < HALL_CAPACITY && (pick < 0 || n < (c[pick] ?? 0))) pick = h;
    }
    if (pick >= 0) {
      // giữ chỗ ngay: người vào dồn dập trước khi Hall kịp báo vẫn được chia đều; báo cáo thật của Hall sẽ ghi đè
      const raw = await this.raw();
      raw[pick] = { c: Math.min(HALL_CAPACITY, (c[pick] ?? 0) + 1), at: Date.now() };
      await this.ctx.storage.put('counts', raw);
    }
    return { hall: pick, total };
  }

  async total(): Promise<number> {
    return Object.values(await this.counts()).reduce((a, b) => a + b, 0);
  }
}
