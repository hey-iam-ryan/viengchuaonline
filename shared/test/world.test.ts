import { test, expect } from 'vitest';
import { BOUNDS, OBSTACLES, PLAYER_RADIUS, POND, SPAWN, ZONES, clampToPond, nearestZone, resolveCollision } from '../src/world';

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

test('có chỗ thả đèn ở hồ sen và cây lời nguyện', () => {
  expect(ZONES.find((z) => z.kind === 'pond')).toBeDefined();
  expect(ZONES.find((z) => z.kind === 'wish')).toBeDefined();
});
test('clampToPond đưa toạ độ vào trong mặt hồ', () => {
  const p = clampToPond(100, -100);
  expect(p.x).toBeLessThanOrEqual(POND.maxX - 0.3);
  expect(p.z).toBeGreaterThanOrEqual(POND.minZ + 0.3);
  expect(clampToPond(-7, 4)).toEqual({ x: -7, z: 4 });
});

test('khuôn viên mở rộng: đi được ra đảo Quan Âm qua cầu, không lội xuống hồ', () => {
  expect(BOUNDS.minX).toBeLessThanOrEqual(-48);
  expect(BOUNDS.maxZ).toBeGreaterThanOrEqual(38);
  // trên cầu: đi được
  expect(resolveCollision(-28, 0)).toEqual({ x: -28, z: 0 });
  // giữa hồ (ngoài cầu): bị đẩy ra
  const inLake = resolveCollision(-28, 8);
  expect(inLake).not.toEqual({ x: -28, z: 8 });
  // trên đảo, trước tượng: đi được
  expect(resolveCollision(-34, 0)).toEqual({ x: -34, z: 0 });
});
test('có điểm cầu an trước tượng Quan Âm và điểm phóng sinh bên hồ', () => {
  expect(ZONES.find((z) => z.kind === 'quanam')).toBeDefined();
  expect(ZONES.find((z) => z.kind === 'phongsinh')).toBeDefined();
});
test('đường đi bộ từ chỗ xuất phát tới đảo Quan Âm thông suốt (không bị tường chặn)', () => {
  // đi thẳng từng đoạn: xuất phát → sân → bờ hồ → cầu → đảo
  const path: [number, number][] = [[SPAWN.x, SPAWN.z], [0, 12], [-18, 12], [-20, 0], [-34, 0]];
  let p = { x: SPAWN.x, z: SPAWN.z };
  for (let i = 1; i < path.length; i++) {
    const [tx, tz] = path[i];
    for (let k = 0; k < 400 && Math.hypot(tx - p.x, tz - p.z) > 0.2; k++) {
      const d = Math.hypot(tx - p.x, tz - p.z);
      p = resolveCollision(p.x + ((tx - p.x) / d) * 0.15, p.z + ((tz - p.z) / d) * 0.15);
    }
    expect(Math.hypot(tx - p.x, tz - p.z)).toBeLessThan(0.5);
  }
});
