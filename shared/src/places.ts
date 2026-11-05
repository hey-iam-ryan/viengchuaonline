import { BOUNDS, OBSTACLES, PLAYER_RADIUS, type Box } from './world';

/** Nơi đến trong bản đồ: điểm đứng đặt sát vùng tương tác để tới nơi là hiện nút hành động. */
export type PlaceId = 'gate' | 'courtyard' | 'hall' | 'bell' | 'drum' | 'wish' | 'zen' | 'lake' | 'quanam' | 'stupa';
export interface Place { id: PlaceId; icon: string; x: number; z: number; node: string }
export interface Pt { x: number; z: number }

/**
 * Điểm mốc: hai điểm nối nhau trong LINKS luôn đi thẳng được (test kiểm chứng bằng mô phỏng va chạm).
 * Bản đồ nhỏ và cố định nên dùng đồ thị cố định thay cho lưới tìm đường.
 */
export const WAYPOINTS: Record<string, Pt> = {
  outer: { x: 0, z: 34 },
  gate: { x: 0, z: 21 },
  yard: { x: 2.4, z: 12 }, // lệch khỏi trục giữa để không vướng lư hương sân
  front: { x: 2.4, z: -5 }, // giữa sân, trước chánh điện
  yardW: { x: -8, z: -4.5 },
  yardE: { x: 8, z: -4.5 },
  east: { x: 14, z: -5 },
  door: { x: 0, z: -7.5 },
  hallIn: { x: 0, z: -11.5 },
  sideW: { x: -13, z: -12 },
  sideE: { x: 13, z: -12 },
  backW: { x: -12, z: -32 },
  backE: { x: 12, z: -32 },
  stupa: { x: 0, z: -37.5 },
  ringW: { x: -7, z: -45 },
  ringE: { x: 7, z: -45 },
  ringS: { x: 0, z: -52 },
  lakeN: { x: -18, z: 12 },
  lakeE: { x: -20, z: 0 },
  island: { x: -33.6, z: 0 },
  lakeNE: { x: -20, z: 16 },
  lakeNW: { x: -38, z: 16 },
  lakeSE: { x: -20, z: -16 },
  lakeSW: { x: -38, z: -16 },
  zenPath: { x: 20, z: 0 },
  zenGate: { x: 28, z: 0 },
};

export const LINKS: [string, string][] = [
  ['outer', 'gate'], ['gate', 'yard'], ['yard', 'front'], ['front', 'door'], ['door', 'hallIn'],
  ['front', 'yardW'], ['front', 'yardE'], ['yardE', 'east'],
  ['yardW', 'sideW'], ['east', 'sideE'], ['sideW', 'backW'], ['sideE', 'backE'],
  ['backW', 'stupa'], ['backE', 'stupa'],
  ['stupa', 'ringW'], ['stupa', 'ringE'], ['ringW', 'ringS'], ['ringE', 'ringS'],
  ['yard', 'lakeN'], ['lakeN', 'lakeE'], ['lakeE', 'island'],
  ['lakeN', 'lakeNE'], ['lakeNE', 'lakeNW'], ['lakeE', 'lakeSE'], ['lakeSE', 'lakeSW'],
  ['east', 'zenPath'], ['zenPath', 'zenGate'],
];

export const PLACES: Place[] = [
  { id: 'gate', icon: '⛩️', x: 0, z: 21, node: 'gate' },
  { id: 'courtyard', icon: '🪔', x: 0, z: 6.8, node: 'yard' },
  { id: 'hall', icon: '🪷', x: 0, z: -12.6, node: 'hallIn' },
  { id: 'bell', icon: '🔔', x: 12, z: 1.2, node: 'yardE' },
  { id: 'drum', icon: '🥁', x: -12, z: 1.2, node: 'yardW' },
  { id: 'wish', icon: '🌳', x: 12.2, z: 9, node: 'yard' },
  { id: 'zen', icon: '🧘', x: 33, z: 0, node: 'zenGate' },
  { id: 'lake', icon: '🐟', x: -22.4, z: 7, node: 'lakeE' },
  { id: 'quanam', icon: '🙏', x: -34.2, z: 0, node: 'island' },
  { id: 'stupa', icon: '🛕', x: 0, z: -38.5, node: 'stupa' },
];

/** Đoạn a→b có cắt hộp (nới mx theo trục x, mz theo trục z) không. Thuật toán slab. */
function segmentHitsBox(a: Pt, b: Pt, box: Box, mx: number, mz: number): boolean {
  let t0 = 0;
  let t1 = 1;
  for (const [p, d, lo, hi] of [
    [a.x, b.x - a.x, box.minX - mx, box.maxX + mx],
    [a.z, b.z - a.z, box.minZ - mz, box.maxZ + mz],
  ]) {
    if (Math.abs(d) < 1e-9) {
      if (p <= lo || p >= hi) return false;
      continue;
    }
    let u = (lo - p) / d;
    let v = (hi - p) / d;
    if (u > v) [u, v] = [v, u];
    t0 = Math.max(t0, u);
    t1 = Math.min(t1, v);
    if (t0 >= t1) return false;
  }
  return true;
}

/**
 * Đi thẳng từ a tới b mà không chạm vật cản nào: đoạn thẳng không cắt vật cản nào đã nới thêm bán kính người chơi,
 * và cả đoạn nằm trong khuôn viên. Không chấp nhận "trượt dọc" vật cản: lộ trình phải trông như người đi bộ bình thường.
 * Tính hình học trực tiếp (không mô phỏng từng bước) để bấm chọn nơi đến không bị trễ trên máy yếu.
 */
export function canWalk(a: Pt, b: Pt): boolean {
  const r = PLAYER_RADIUS - 0.02;
  const inBounds = (p: Pt) => p.x >= BOUNDS.minX + r && p.x <= BOUNDS.maxX - r && p.z >= BOUNDS.minZ + r && p.z <= BOUNDS.maxZ - r;
  if (!inBounds(a) || !inBounds(b)) return false;
  return !OBSTACLES.some((box) => touches(a, b, box, r));
}

/** Khoảng cách từ điểm p tới đoạn a→b. */
function distToSegment(p: Pt, a: Pt, b: Pt): number {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const len2 = dx * dx + dz * dz;
  const t = len2 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / len2)) : 0;
  return Math.hypot(p.x - (a.x + dx * t), p.z - (a.z + dz * t));
}

/**
 * Người chơi (hình tròn bán kính r) đi dọc a→b có chạm hộp không: đoạn thẳng cắt "hộp bo góc"
 * = hộp nới r theo x, hộp nới r theo z, và 4 hình tròn bán kính r ở 4 góc (khớp với resolveCollision).
 */
function touches(a: Pt, b: Pt, box: Box, r: number): boolean {
  if (segmentHitsBox(a, b, box, r, 0) || segmentHitsBox(a, b, box, 0, r)) return true;
  for (const cx of [box.minX, box.maxX]) for (const cz of [box.minZ, box.maxZ]) if (distToSegment({ x: cx, z: cz }, a, b) < r) return true;
  return false;
}

const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.z - b.z);

/** Đường ngắn nhất giữa hai điểm mốc (Dijkstra trên đồ thị nhỏ). */
function shortest(from: string, to: string): string[] {
  const d: Record<string, number> = {};
  const prev: Record<string, string> = {};
  const todo = new Set(Object.keys(WAYPOINTS));
  for (const k of todo) d[k] = Infinity;
  d[from] = 0;
  while (todo.size) {
    let u = '';
    for (const k of todo) if (!u || d[k] < d[u]) u = k;
    todo.delete(u);
    if (u === to || d[u] === Infinity) break;
    for (const [a, b] of LINKS) {
      const v = a === u ? b : b === u ? a : null;
      if (!v || !todo.has(v)) continue;
      const nd = d[u] + dist(WAYPOINTS[u], WAYPOINTS[v]);
      if (nd < d[v]) { d[v] = nd; prev[v] = u; }
    }
  }
  const path = [to];
  while (path[0] !== from && prev[path[0]]) path.unshift(prev[path[0]]);
  return path[0] === from ? path : [];
}

/** Lộ trình từ (x, z) tới nơi đến: các điểm cần đi lần lượt, điểm cuối là điểm đứng của nơi đến. */
export function routeTo(x: number, z: number, id: PlaceId): Pt[] {
  const place = PLACES.find((p) => p.id === id);
  if (!place) return [];
  const here = { x, z };
  const goal = { x: place.x, z: place.z };
  if (canWalk(here, goal)) return [goal];
  const starts = Object.keys(WAYPOINTS).sort((a, b) => dist(here, WAYPOINTS[a]) - dist(here, WAYPOINTS[b]));
  // góc khuất hiếm gặp: đi tới điểm mốc gần nhất, có trượt dọc vật cản như khi tự đi bằng tay
  const start = starts.find((k) => canWalk(here, WAYPOINTS[k])) ?? starts[0];
  const pts = [...shortest(start, place.node).map((k) => WAYPOINTS[k]), goal];
  // bỏ bớt điểm mốc thừa: từ mỗi điểm nhảy tới điểm xa nhất còn đi thẳng được
  const out: Pt[] = [];
  let cur: Pt = here;
  let i = 0;
  while (i < pts.length) {
    let j = pts.length - 1;
    while (j > i && !canWalk(cur, pts[j])) j--;
    out.push(pts[j]);
    cur = pts[j];
    i = j + 1;
  }
  return out;
}
