import { DurableObject } from 'cloudflare:workers';
import { HALL_CAPACITY, HALL_COUNT } from '@vco/shared/protocol';
import type { Env } from './env';

/** Ngưỡng mềm: để chừa chỗ cho người vào cùng bạn bè và bù cho số đếm trễ. */
export const SOFT_CAP = 90;
type Counts = Record<number, number>;

export class Lobby extends DurableObject<Env> {
  private async counts(): Promise<Counts> {
    return (await this.ctx.storage.get<Counts>('counts')) ?? {};
  }

  async report(hall: number, count: number): Promise<void> {
    if (!Number.isInteger(hall) || hall < 0 || hall >= HALL_COUNT) return;
    if (!Number.isFinite(count) || count < 0) return;
    const c = await this.counts();
    c[hall] = Math.min(HALL_CAPACITY, Math.floor(count));
    await this.ctx.storage.put('counts', c);
  }

  async assign(exclude: number[]): Promise<{ hall: number; total: number }> {
    const c = await this.counts();
    const ex = new Set(exclude);
    const total = Object.values(c).reduce((a, b) => a + b, 0);
    let least = -1;
    for (let h = 0; h < HALL_COUNT; h++) {
      if (ex.has(h)) continue;
      const n = c[h] ?? 0;
      if (n < SOFT_CAP) return { hall: h, total };
      if (n < HALL_CAPACITY && (least < 0 || n < (c[least] ?? 0))) least = h;
    }
    return { hall: least, total };
  }

  async total(): Promise<number> {
    return Object.values(await this.counts()).reduce((a, b) => a + b, 0);
  }
}
