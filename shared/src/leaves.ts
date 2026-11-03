import { BOUNDS, OBSTACLES, PLAYER_RADIUS, POND, type Box } from './world';

/** Lá rụng trên sân: cứ LEAF_EVERY_MS thêm một lá, tối đa LEAF_MAX lá mỗi gian. */
export const LEAF_EVERY_MS = 20_000;
export const LEAF_MAX = 24;
/** Gian mới có sẵn vài lá để người đầu tiên có việc làm. */
export const LEAF_INITIAL = 8;
export const SWEEP_RANGE = 1.4;

export interface Leaf { id: number; x: number; z: number }
export interface LeafState { leaves: Leaf[]; slot: number }

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const YARD_MIN_Z = -8.5; // chỉ rụng ngoài sân, không vào chánh điện
const blocked = (x: number, z: number) =>
  [POND, ...OBSTACLES].some((b: Box) => x > b.minX - PLAYER_RADIUS && x < b.maxX + PLAYER_RADIUS && z > b.minZ - PLAYER_RADIUS && z < b.maxZ + PLAYER_RADIUS);

/** Vị trí lá xác định theo (gian, lượt) — mọi máy tính ra giống nhau. */
export function leafPos(hall: number, slot: number): { x: number; z: number } {
  const r = rng(hall * 100_003 + slot * 7_919 + 17);
  for (let i = 0; i < 30; i++) {
    const x = BOUNDS.minX + 1 + r() * (BOUNDS.maxX - BOUNDS.minX - 2);
    const z = YARD_MIN_Z + r() * (BOUNDS.maxZ - 1 - YARD_MIN_Z);
    if (!blocked(x, z)) return { x: Math.round(x * 100) / 100, z: Math.round(z * 100) / 100 };
  }
  return { x: 2, z: 11 };
}

/** Thêm lá cho các lượt đã trôi qua (không dồn quá LEAF_MAX). */
export function spawnLeaves(state: LeafState, hall: number, now: number): { state: LeafState; added: Leaf[] } {
  const nowSlot = Math.floor(now / LEAF_EVERY_MS);
  if (nowSlot <= state.slot) return { state, added: [] };
  const room = state.slot < 0 ? LEAF_INITIAL : LEAF_MAX - state.leaves.length;
  const from = Math.max(state.slot + 1, nowSlot - room + 1);
  const added: Leaf[] = [];
  for (let s = from; s <= nowSlot && added.length < room; s++) added.push({ id: s, ...leafPos(hall, s) });
  return { state: { leaves: [...state.leaves, ...added], slot: nowSlot }, added };
}

export const canSweep = (leaf: Leaf, x: number, z: number, range = SWEEP_RANGE) => Math.hypot(leaf.x - x, leaf.z - z) <= range;
