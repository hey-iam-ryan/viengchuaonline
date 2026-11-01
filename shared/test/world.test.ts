import { test, expect } from 'vitest';
import { BOUNDS, OBSTACLES, PLAYER_RADIUS, SPAWN, ZONES, nearestZone, resolveCollision } from '../src/world';

const outside = (x: number, z: number, b: { minX: number; maxX: number; minZ: number; maxZ: number }) =>
  x < b.minX - PLAYER_RADIUS + 1e-6 || x > b.maxX + PLAYER_RADIUS - 1e-6 || z < b.minZ - PLAYER_RADIUS + 1e-6 || z > b.maxZ + PLAYER_RADIUS - 1e-6;

test('kẹp ngoài bản đồ', () =>
  expect(resolveCollision(999, -999)).toEqual({ x: BOUNDS.maxX - PLAYER_RADIUS, z: BOUNDS.minZ + PLAYER_RADIUS }));

test('không đứng trong bàn thờ', () => {
  const p = resolveCollision(0, -25);
  const altar = OBSTACLES.find((b) => b.minZ <= -25 && b.maxZ >= -25 && b.minX <= 0 && b.maxX >= 0)!;
  expect(altar).toBeDefined();
  expect(outside(p.x, p.z, altar)).toBe(true);
});

test('không có điểm nào kết thúc trong vật cản', () => {
  for (let x = -20; x <= 20; x += 0.7)
    for (let z = -30; z <= 20; z += 0.7) {
      const p = resolveCollision(x, z);
      for (const b of OBSTACLES) {
        const cx = Math.max(b.minX, Math.min(p.x, b.maxX));
        const cz = Math.max(b.minZ, Math.min(p.z, b.maxZ));
        expect(Math.hypot(p.x - cx, p.z - cz)).toBeGreaterThan(PLAYER_RADIUS - 1e-3);
      }
    }
});

test('đi qua cửa chánh điện được', () => expect(resolveCollision(0, -10)).toEqual({ x: 0, z: -10 }));
test('spawn hợp lệ', () => expect(resolveCollision(SPAWN.x, SPAWN.z)).toEqual({ x: SPAWN.x, z: SPAWN.z }));

test('mọi zone đều đứng tới được', () => {
  for (const z of ZONES) {
    const p = resolveCollision(z.x, z.z);
    expect(Math.hypot(p.x - z.x, p.z - z.z)).toBeLessThanOrEqual(z.r);
  }
});

test('có 20 bồ đoàn, zone gần', () => {
  expect(ZONES.filter((z) => z.kind === 'cushion')).toHaveLength(20);
  const bell = ZONES.find((z) => z.kind === 'bell')!;
  expect(nearestZone(bell.x + 0.1, bell.z)?.id).toBe(bell.id);
  expect(nearestZone(SPAWN.x, SPAWN.z)).toBeNull();
  expect(ZONES.find((z) => z.id === 'burner-yard')?.burner).toBe('yard');
  expect(ZONES.find((z) => z.id === 'burner-hall')?.burner).toBe('hall');
});
