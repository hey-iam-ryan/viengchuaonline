/** Nhịp lạy chung: mọi người trong chùa lạy cùng lúc (theo giờ server). */
export const BOW_GRID_MS = 3500;
export const BOW_TARGET = 108;

/** Phiên 108 lạy liên tục. tick() trả true đúng lúc cần lạy (tối đa 1 lần/nhịp, không dồn nhịp đã lỡ). */
export class Bow108 {
  active = false;
  done = false;
  count = 0;
  private lastSlot = -1;

  start(nowServer: number): void {
    this.active = true;
    this.done = false;
    this.count = 0;
    this.lastSlot = Math.floor(nowServer / BOW_GRID_MS);
  }

  stop(): void {
    this.active = false;
  }

  tick(nowServer: number): boolean {
    if (!this.active) return false;
    const slot = Math.floor(nowServer / BOW_GRID_MS);
    if (slot <= this.lastSlot) return false;
    this.lastSlot = slot;
    this.count++;
    if (this.count >= BOW_TARGET) {
      this.active = false;
      this.done = true;
    }
    return true;
  }
}
