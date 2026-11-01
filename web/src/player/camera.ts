import { OBSTACLES, type Box } from '@vco/shared/world';

/** Các vật cản cao hơn camera: 5 bức tường chánh điện (xem shared/world OBSTACLES[0..4]). */
const WALLS: Box[] = OBSTACLES.slice(0, 5);
const MARGIN = 0.3;

/** Thời điểm t∈[0,1] đoạn P→C chạm hộp b (đã nới MARGIN), hoặc null. Thuật toán slab. */
function hit(px: number, pz: number, dx: number, dz: number, b: Box): number | null {
  let t0 = 0;
  let t1 = 1;
  for (const [p, d, lo, hi] of [[px, dx, b.minX - MARGIN, b.maxX + MARGIN], [pz, dz, b.minZ - MARGIN, b.maxZ + MARGIN]]) {
    if (Math.abs(d) < 1e-9) {
      if (p < lo || p > hi) return null;
      continue;
    }
    let a = (lo - p) / d;
    let c = (hi - p) / d;
    if (a > c) [a, c] = [c, a];
    t0 = Math.max(t0, a);
    t1 = Math.min(t1, c);
    if (t0 > t1) return null;
  }
  return t0;
}

/** Kéo camera về phía người chơi nếu đoạn người→camera xuyên tường chánh điện. */
export function clampCamera(px: number, pz: number, cx: number, cz: number): { x: number; z: number } {
  const dx = cx - px;
  const dz = cz - pz;
  let t = 1;
  for (const w of WALLS) {
    const h = hit(px, pz, dx, dz, w);
    if (h !== null && h < t) t = h;
  }
  return t === 1 ? { x: cx, z: cz } : { x: px + dx * t, z: pz + dz * t };
}
