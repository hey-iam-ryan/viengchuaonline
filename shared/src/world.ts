import type { BurnerId } from './protocol';

export interface Box { minX: number; maxX: number; minZ: number; maxZ: number }
export type ZoneKind = 'cushion' | 'burner' | 'bell' | 'mo' | 'pond' | 'wish' | 'quanam' | 'phongsinh';
export interface Zone { id: string; kind: ZoneKind; x: number; z: number; r: number; burner?: BurnerId }

const box = (minX: number, maxX: number, minZ: number, maxZ: number): Box => ({ minX, maxX, minZ, maxZ });

/** Toàn bộ khuôn viên chùa (mét). Cổng ở +z, chánh điện ở −z. */
export const BOUNDS: Box = box(-50, 50, -60, 40);
/** Khu sân chùa trung tâm (lá rụng, gạch lát). */
export const CORE: Box = box(-20, 20, -30, 20);

/** Hồ lớn phía Tây, đảo giữa hồ có tượng Quan Âm, cầu đá bắc từ bờ (z∈[-1.2,1.2]). */
export const LAKE: Box = box(-48, -24, -14, 14);
export const ISLAND: Box = box(-40, -32, -4, 4);
export const BRIDGE_HALF = 1.2;
export const QUAN_AM = { x: -37.5, z: 0 };
const LAKE_PARTS: Box[] = [
  box(LAKE.minX, LAKE.maxX, ISLAND.maxZ, LAKE.maxZ), // bắc
  box(LAKE.minX, LAKE.maxX, LAKE.minZ, ISLAND.minZ), // nam
  box(LAKE.minX, ISLAND.minX, ISLAND.minZ, ISLAND.maxZ), // tây đảo
  box(ISLAND.maxX, LAKE.maxX, ISLAND.minZ, -BRIDGE_HALF), // giữa đảo và bờ, nam cầu
  box(ISLAND.maxX, LAKE.maxX, BRIDGE_HALF, ISLAND.maxZ), // giữa đảo và bờ, bắc cầu
];

/** Đường vào chùa phía Nam: đèn đá hai bên, cổng ngoài ở cuối đường. */
export const STONE_LANTERNS: { x: number; z: number }[] = [22, 26, 30, 34].flatMap((z) => [{ x: -3.4, z }, { x: 3.4, z }]);
export const OUTER_GATE_Z = 38.5;

/** Chánh điện: tường dày 0.5, cửa rộng 6m (x∈[-3,3]) ở z=-10. */
export const HALL: Box = box(-10, 10, -28, -10);
export const HALL_DOOR_HALF_WIDTH = 3;

export const ALTAR: Box = box(-2.5, 2.5, -27, -23);
export const POND: Box = box(-10, -4, 0, 8);
export const YARD_BURNER: Box = box(-0.6, 0.6, 3.4, 4.6);
export const HALL_BURNER: Box = box(-0.5, 0.5, -21.5, -20.5);
export const BELL_TOWER: Box = box(11, 13, -3, -1);
export const MO_STAND: Box = box(3.25, 3.75, -22.25, -21.75);
export const GATE_PILLARS: Box[] = [box(-4, -3, 17.5, 18.5), box(3, 4, 17.5, 18.5), box(-8, -7, 17.5, 18.5), box(7, 8, 17.5, 18.5)];

/** Cây bồ đề treo lời nguyện. */
export const WISH_TREE = { x: 14, z: 8, s: 1.6 };

/** Gốc cây trang trí ven khuôn viên (cũng là vật cản). */
export const TREES: { x: number; z: number; s: number }[] = [
  { x: -16, z: 14, s: 1.2 }, { x: 16, z: 14, s: 1.1 }, { x: -17, z: 4, s: 1.4 }, { x: 17, z: 6, s: 1 },
  { x: -15, z: -6, s: 1.1 }, { x: 16.5, z: -8, s: 1.3 }, { x: -15, z: -20, s: 1.5 }, { x: 15, z: -21, s: 1.2 },
  { x: -13, z: 10, s: 0.8 }, { x: 13, z: 12, s: 0.9 },
  // đường vào chùa
  { x: -7, z: 24, s: 1.1 }, { x: 7, z: 25, s: 1.2 }, { x: -8, z: 31, s: 1.3 }, { x: 8, z: 32, s: 1 }, { x: -6.5, z: 36, s: 0.9 }, { x: 6.5, z: 35.5, s: 1.1 },
  // quanh hồ lớn
  { x: -22, z: 17, s: 1.3 }, { x: -30, z: 18, s: 1.1 }, { x: -42, z: 18, s: 1.4 }, { x: -22, z: -18, s: 1.2 }, { x: -34, z: -19, s: 1.5 }, { x: -46, z: -18, s: 1 },
];

export const OBSTACLES: Box[] = [
  box(-10, 10, -28.5, -28), // tường sau
  box(-10.5, -10, -28.5, -10), // tường trái
  box(10, 10.5, -28.5, -10), // tường phải
  box(-10.5, -HALL_DOOR_HALF_WIDTH, -10.5, -10), // mặt tiền trái
  box(HALL_DOOR_HALF_WIDTH, 10.5, -10.5, -10), // mặt tiền phải
  ALTAR,
  POND,
  YARD_BURNER,
  HALL_BURNER,
  BELL_TOWER,
  MO_STAND,
  ...GATE_PILLARS,
  box(WISH_TREE.x - 0.6, WISH_TREE.x + 0.6, WISH_TREE.z - 0.6, WISH_TREE.z + 0.6),
  ...LAKE_PARTS,
  box(QUAN_AM.x - 1, QUAN_AM.x + 1, QUAN_AM.z - 1, QUAN_AM.z + 1),
  ...STONE_LANTERNS.map((l) => box(l.x - 0.3, l.x + 0.3, l.z - 0.3, l.z + 0.3)),
  box(-7, -5, OUTER_GATE_Z - 0.5, OUTER_GATE_Z + 0.5),
  box(5, 7, OUTER_GATE_Z - 0.5, OUTER_GATE_Z + 0.5),
  ...TREES.map((t) => box(t.x - 0.4 * t.s, t.x + 0.4 * t.s, t.z - 0.4 * t.s, t.z + 0.4 * t.s)),
];

const cushions: Zone[] = [];
const COLS = [-4.5, -1.5, 1.5, 4.5];
const ROWS = [-20, -18, -16, -14, -12];
ROWS.forEach((z, ri) => COLS.forEach((x, ci) => cushions.push({ id: `cushion-${ri * COLS.length + ci}`, kind: 'cushion', x, z, r: 0.8 })));

export const ZONES: Zone[] = [
  ...cushions,
  { id: 'burner-hall', kind: 'burner', x: 0, z: -19.6, r: 1.2, burner: 'hall' },
  { id: 'burner-yard', kind: 'burner', x: 0, z: 5.6, r: 1.6, burner: 'yard' },
  { id: 'bell', kind: 'bell', x: 12, z: 0.2, r: 1.6 },
  { id: 'mo', kind: 'mo', x: 4.6, z: -22, r: 1.2 },
  { id: 'pond', kind: 'pond', x: -3.2, z: 4, r: 1.6 },
  { id: 'pond-n', kind: 'pond', x: -7, z: 9, r: 1.6 },
  { id: 'wish', kind: 'wish', x: 12.6, z: 8, r: 1.6 },
  { id: 'quanam', kind: 'quanam', x: -34.6, z: 0, r: 1.6 },
  { id: 'phongsinh', kind: 'phongsinh', x: -22.6, z: 7, r: 1.6 },
];

/** Kẹp toạ độ đèn hoa đăng vào trong mặt hồ (chừa mép 0.3m). */
export function clampToPond(x: number, z: number): { x: number; z: number } {
  const m = 0.3;
  return { x: Math.max(POND.minX + m, Math.min(POND.maxX - m, x)), z: Math.max(POND.minZ + m, Math.min(POND.maxZ - m, z)) };
}

export const SPAWN = { x: 0, z: 28, ry: Math.PI };
export const PLAYER_RADIUS = 0.35;

function pushOut(x: number, z: number, b: Box): { x: number; z: number } {
  const r = PLAYER_RADIUS;
  const cx = Math.max(b.minX, Math.min(x, b.maxX));
  const cz = Math.max(b.minZ, Math.min(z, b.maxZ));
  const dx = x - cx;
  const dz = z - cz;
  const d = Math.hypot(dx, dz);
  if (d >= r) return { x, z };
  if (d > 1e-9) return { x: cx + (dx / d) * r, z: cz + (dz / d) * r };
  // tâm nằm trong hộp: đẩy theo trục có độ xuyên nhỏ nhất
  const opts = [
    { x: b.minX - r, z, pen: x - b.minX },
    { x: b.maxX + r, z, pen: b.maxX - x },
    { x, z: b.minZ - r, pen: z - b.minZ },
    { x, z: b.maxZ + r, pen: b.maxZ - z },
  ].sort((a, c) => a.pen - c.pen);
  return { x: opts[0].x, z: opts[0].z };
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Kẹp vào khuôn viên rồi đẩy khỏi vật cản (hình tròn bán kính PLAYER_RADIUS vs AABB). */
export function resolveCollision(x: number, z: number): { x: number; z: number } {
  let p = { x: clamp(x, BOUNDS.minX + PLAYER_RADIUS, BOUNDS.maxX - PLAYER_RADIUS), z: clamp(z, BOUNDS.minZ + PLAYER_RADIUS, BOUNDS.maxZ - PLAYER_RADIUS) };
  for (let pass = 0; pass < 4; pass++) {
    let moved = false;
    for (const b of OBSTACLES) {
      const q = pushOut(p.x, p.z, b);
      if (q.x !== p.x || q.z !== p.z) { p = q; moved = true; }
    }
    p.x = clamp(p.x, BOUNDS.minX + PLAYER_RADIUS, BOUNDS.maxX - PLAYER_RADIUS);
    p.z = clamp(p.z, BOUNDS.minZ + PLAYER_RADIUS, BOUNDS.maxZ - PLAYER_RADIUS);
    if (!moved) break;
  }
  return p;
}

export function nearestZone(x: number, z: number): Zone | null {
  let best: Zone | null = null;
  let bestD = Infinity;
  for (const zone of ZONES) {
    const d = Math.hypot(zone.x - x, zone.z - z);
    if (d <= zone.r && d < bestD) { best = zone; bestD = d; }
  }
  return best;
}
