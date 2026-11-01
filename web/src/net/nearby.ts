export const GREET_RANGE = 4;

/** Người gần nhất trong tầm chào (mét), hoặc null. */
export function nearestPlayer<T extends { id: string; x: number; z: number }>(list: Iterable<T>, x: number, z: number, max = GREET_RANGE): T | null {
  let best: T | null = null;
  let bd = max;
  for (const p of list) {
    const d = Math.hypot(p.x - x, p.z - z);
    if (d <= bd) { best = p; bd = d; }
  }
  return best;
}
