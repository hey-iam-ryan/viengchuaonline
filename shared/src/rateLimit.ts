export class TokenBucket {
  private tokens: number;
  private last: number;
  constructor(private readonly ratePerSec: number, private readonly burst: number, now = Date.now()) {
    this.tokens = burst;
    this.last = now;
  }
  take(now: number, cost = 1): boolean {
    this.tokens = Math.min(this.burst, this.tokens + ((now - this.last) / 1000) * this.ratePerSec);
    this.last = now;
    if (this.tokens < cost) return false;
    this.tokens -= cost;
    return true;
  }
}
