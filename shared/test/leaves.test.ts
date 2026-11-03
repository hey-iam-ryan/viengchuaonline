import { test, expect } from 'vitest';
import { LEAF_EVERY_MS, LEAF_MAX, LEAF_INITIAL, leafPos, spawnLeaves, canSweep, SWEEP_RANGE } from '../src/leaves';
import { BOUNDS, OBSTACLES, POND, PLAYER_RADIUS } from '../src/world';

test('vị trí lá cố định theo (gian, lượt) và nằm trên sân đi được', () => {
  expect(leafPos(3, 77)).toEqual(leafPos(3, 77));
  expect(leafPos(3, 77)).not.toEqual(leafPos(4, 77));
  for (let s = 0; s < 300; s++) {
    const p = leafPos(1, s);
    expect(p.x).toBeGreaterThan(BOUNDS.minX); expect(p.x).toBeLessThan(BOUNDS.maxX);
    expect(p.z).toBeGreaterThan(-9); // ngoài chánh điện (sân)
    const inside = (b: { minX: number; maxX: number; minZ: number; maxZ: number }) => p.x > b.minX - PLAYER_RADIUS && p.x < b.maxX + PLAYER_RADIUS && p.z > b.minZ - PLAYER_RADIUS && p.z < b.maxZ + PLAYER_RADIUS;
    expect(inside(POND)).toBe(false);
    for (const b of OBSTACLES) expect(inside(b)).toBe(false);
  }
});
test('gian mới có sẵn LEAF_INITIAL lá; sau đó mỗi LEAF_EVERY_MS thêm 1, tối đa LEAF_MAX, không dồn quá', () => {
  const t0 = 1000 * LEAF_EVERY_MS;
  let st = spawnLeaves({ leaves: [], slot: -1 }, 2, t0);
  expect(st.added).toHaveLength(LEAF_INITIAL);
  st = spawnLeaves(st.state, 2, t0 + 3 * LEAF_EVERY_MS);
  expect(st.added).toHaveLength(3);
  expect(st.state.leaves).toHaveLength(LEAF_INITIAL + 3);
  st = spawnLeaves(st.state, 2, t0 + 1000 * LEAF_EVERY_MS);
  expect(st.state.leaves).toHaveLength(LEAF_MAX);
  expect(new Set(st.state.leaves.map((l) => l.id)).size).toBe(LEAF_MAX);
  expect(spawnLeaves(st.state, 2, t0 + 1000 * LEAF_EVERY_MS).added).toEqual([]);
});
test('chỉ quét được lá ở gần', () => {
  const leaf = { id: 1, x: 0, z: 10 };
  expect(canSweep(leaf, 0, 10 + SWEEP_RANGE - 0.01)).toBe(true);
  expect(canSweep(leaf, 0, 10 + SWEEP_RANGE + 0.5)).toBe(false);
});
