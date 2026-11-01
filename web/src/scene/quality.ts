export type QualityLevel = 0 | 1 | 2;
export const PIXEL_RATIO: Record<QualityLevel, number> = { 2: 2, 1: 1.5, 0: 1 };
const LOW_FPS = 28;
const LOW_SECONDS = 3;

/** Bắt đầu ở mức 2; 3 giây liên tiếp < 28fps → giảm 1 mức. Không tự tăng lại trong phiên. */
export class QualityGovernor {
  level: QualityLevel = 2;
  private lowStreak = 0;
  constructor(private readonly setLevel: (lvl: QualityLevel) => void) {}

  /** Gọi mỗi giây với fps trung bình của giây đó. */
  sample(fps: number): void {
    if (fps >= LOW_FPS) { this.lowStreak = 0; return; }
    if (++this.lowStreak < LOW_SECONDS || this.level === 0) return;
    this.lowStreak = 0;
    this.level = (this.level - 1) as QualityLevel;
    this.setLevel(this.level);
  }
}
