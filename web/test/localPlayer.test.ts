import { test, expect } from 'vitest';
import { Pose } from '@vco/shared/protocol';
import { SPAWN, ZONES } from '@vco/shared/world';
import { LocalPlayer, BOW_SECONDS } from '../src/player/localPlayer';

const cushion = ZONES.find((z) => z.kind === 'cushion')!;

test('bắt đầu ở SPAWN, đứng yên', () => {
  const p = new LocalPlayer();
  expect([p.x, p.z, p.pose]).toEqual([SPAWN.x, SPAWN.z, Pose.Stand]);
});
test('đi 1s về phía trước ≈ 3m', () => {
  const p = new LocalPlayer();
  p.update(1, { x: 0, z: -1 }, 0);
  expect(SPAWN.z - p.z).toBeCloseTo(3, 1);
  expect(p.pose).toBe(Pose.Walk);
});
test('hướng đi theo camera: yaw π/2 + tiến → đi về −x', () => {
  const p = new LocalPlayer();
  p.update(1, { x: 0, z: -1 }, Math.PI / 2);
  expect(p.x).toBeCloseTo(SPAWN.x - 3, 1);
  expect(p.z).toBeCloseTo(SPAWN.z, 1);
});
test('không xuyên bàn thờ', () => {
  const p = new LocalPlayer();
  p.x = 0; p.z = -22.5;
  p.update(1, { x: 0, z: -1 }, 0);
  expect(p.z).toBeGreaterThan(-23);
});
test('dừng → đứng', () => {
  const p = new LocalPlayer();
  p.update(0.1, { x: 0, z: -1 }, 0);
  p.update(0.1, { x: 0, z: 0 }, 0);
  expect(p.pose).toBe(Pose.Stand);
});
test('lạy chỉ khi ngồi; lạy xong về ngồi; đi thì đứng dậy', () => {
  const p = new LocalPlayer();
  expect(p.bow()).toBe(false);
  p.sitAt(cushion);
  expect([p.x, p.z, p.pose]).toEqual([cushion.x, cushion.z, Pose.Sit]);
  expect(p.bow()).toBe(true);
  expect(p.pose).toBe(Pose.Bow);
  expect(p.bow()).toBe(false); // đang lạy thì không chồng
  p.update(BOW_SECONDS + 0.01, { x: 0, z: 0 }, 0);
  expect(p.pose).toBe(Pose.Sit);
  p.update(0.1, { x: 1, z: 0 }, 0);
  expect(p.pose).toBe(Pose.Walk);
});
test('ngồi quay mặt về tượng Phật (−z)', () => {
  const p = new LocalPlayer();
  p.sitAt(cushion);
  expect(Math.cos(p.ry)).toBeCloseTo(-1);
});
test('changed chỉ bật khi có thay đổi', () => {
  const p = new LocalPlayer();
  p.takeChanged();
  p.update(0.1, { x: 0, z: 0 }, 0);
  expect(p.changed).toBe(false);
  p.update(0.1, { x: 0, z: -1 }, 0);
  expect(p.changed).toBe(true);
  p.takeChanged();
  expect(p.changed).toBe(false);
});
