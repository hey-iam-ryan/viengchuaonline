import { TOWER, TOWER_RING } from './world';

export const CIRCUM_LAPS = 3;
const TAU = Math.PI * 2;
const wrap = (a: number) => a - TAU * Math.floor((a + Math.PI) / TAU);

/** Đếm vòng đi nhiễu quanh bảo tháp (theo góc tích luỹ khi ở trong lối đi vòng). */
export class Circumambulation {
  private active = false;
  private prev = 0;
  private cum = 0;
  laps = 0;

  reset(): void {
    this.active = false;
    this.cum = 0;
    this.laps = 0;
  }

  /** Trả về { lap } đúng lúc vừa xong một vòng; done = true khi đủ CIRCUM_LAPS vòng. */
  update(x: number, z: number): { lap?: number; done?: boolean; inRing: boolean } {
    const dx = x - TOWER.x;
    const dz = z - TOWER.z;
    const r = Math.hypot(dx, dz);
    if (r < TOWER_RING.inner || r > TOWER_RING.outer) {
      if (this.active) this.reset();
      return { inRing: false };
    }
    const a = Math.atan2(dz, dx);
    if (!this.active) {
      this.active = true;
      this.prev = a;
      this.cum = 0;
      this.laps = 0;
      return { inRing: true };
    }
    const da = wrap(a - this.prev);
    this.prev = a;
    if (Math.abs(da) > 0.6) { this.cum = 0; this.laps = 0; return { inRing: true }; } // nhảy cóc (dịch chuyển)
    this.cum += da;
    const n = Math.floor(Math.abs(this.cum) / TAU);
    if (n > this.laps) {
      this.laps = n;
      return { lap: n, done: n === CIRCUM_LAPS, inRing: true };
    }
    return { inRing: true };
  }
}
