/** Ngồi thiền hẹn giờ (5/10/15 phút). Thời gian theo đồng hồ thật, không theo khung hình. */
export class Meditation {
  active = false;
  minutesDone = 0;
  private start0 = 0;
  private durMs = 0;

  start(minutes: number, now: number): void {
    this.active = true;
    this.start0 = now;
    this.durMs = minutes * 60_000;
    this.minutesDone = 0;
  }

  tick(now: number): { remainingMs: number; done: boolean } {
    if (!this.active) return { remainingMs: 0, done: false };
    const el = now - this.start0;
    if (el >= this.durMs) {
      this.active = false;
      this.minutesDone = Math.round(this.durMs / 60_000);
      return { remainingMs: 0, done: true };
    }
    return { remainingMs: this.durMs - el, done: false };
  }

  stop(now: number): void {
    if (!this.active) return;
    this.active = false;
    this.minutesDone = Math.floor((now - this.start0) / 60_000);
  }
}

/** Nhịp thở hướng dẫn: 4 giây hít vào, 4 giây thở ra. k ∈ [0,1] trong mỗi pha. */
export function breathPhase(ms: number): { inhale: boolean; k: number } {
  const t = ms % 8000;
  return t < 4000 ? { inhale: true, k: t / 4000 } : { inhale: false, k: (t - 4000) / 4000 };
}
