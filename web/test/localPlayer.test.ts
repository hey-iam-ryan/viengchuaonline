import { test, expect } from 'vitest';
import { Pose } from '@vco/shared/protocol';
import { SPAWN, ZONES } from '@vco/shared/world';
import { LocalPlayer, BOW_SECONDS, VAI_SECONDS, RUN_FACTOR } from '../src/player/localPlayer';

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

test('đứng bấm lạy → vái, xong về đứng; đi thì huỷ', () => {
  const p = new LocalPlayer();
  expect(p.bow()).toBe(true);
  expect(p.pose).toBe(Pose.Vai);
  expect(p.bow()).toBe(false); // đang vái không chồng
  p.update(VAI_SECONDS + 0.01, { x: 0, z: 0 }, 0);
  expect(p.pose).toBe(Pose.Stand);
  p.bow();
  p.update(0.1, { x: 1, z: 0 }, 0);
  expect(p.pose).toBe(Pose.Walk);
});

test('bấm để đi: tự đi tới đích rồi đứng lại', () => {
  const p = new LocalPlayer();
  p.x = 0; p.z = 15;
  p.moveTo(3, 12);
  for (let i = 0; i < 60 && p.hasTarget; i++) p.update(0.05, { x: 0, z: 0 }, 0);
  expect(Math.hypot(p.x - 3, p.z - 12)).toBeLessThan(0.3);
  expect(p.hasTarget).toBe(false);
  expect(p.pose).toBe(Pose.Stand);
});
test('bấm phím thì huỷ tự đi', () => {
  const p = new LocalPlayer();
  p.moveTo(10, 5);
  p.update(0.1, { x: 0, z: 0 }, 0);
  p.update(0.1, { x: 1, z: 0 }, 0);
  expect(p.hasTarget).toBe(false);
});
test('đích nằm trong vật cản → kẹt thì tự dừng, không đi mãi', () => {
  const p = new LocalPlayer();
  p.x = 0; p.z = -21.5;
  p.moveTo(0, -25); // giữa bàn thờ
  for (let i = 0; i < 200; i++) p.update(0.05, { x: 0, z: 0 }, 0);
  expect(p.hasTarget).toBe(false);
  expect(p.pose).toBe(Pose.Stand);
});
test('giữ Shift chạy nhanh hơn', () => {
  const p = new LocalPlayer();
  p.update(1, { x: 0, z: -1 }, 0, true);
  expect(SPAWN.z - p.z).toBeCloseTo(3 * RUN_FACTOR, 1);
});
test('đang ngồi mà bấm đi → đứng dậy đi', () => {
  const p = new LocalPlayer();
  p.sitAt(cushion);
  p.moveTo(cushion.x + 2, cushion.z);
  p.update(0.1, { x: 0, z: 0 }, 0);
  expect(p.pose).toBe(Pose.Walk);
});

test('đi theo lộ trình: qua lần lượt các điểm rồi đứng lại ở điểm cuối', () => {
  const p = new LocalPlayer();
  p.followRoute([{ x: 2.4, z: 21 }, { x: 2.4, z: 12 }, { x: 0, z: 6.8 }]);
  expect(p.routing).toBe(true);
  for (let i = 0; i < 400 && p.hasTarget; i++) p.update(1 / 30, { x: 0, z: 0 }, 0);
  expect(p.routing).toBe(false);
  expect(Math.hypot(p.x - 0, p.z - 6.8)).toBeLessThan(0.2);
  expect(p.pose).toBe(Pose.Stand);
});
test('đi theo lộ trình nhanh hơn đi bộ thường (như khi chạy)', () => {
  const p = new LocalPlayer();
  p.followRoute([{ x: 0, z: 18 }]);
  p.update(1, { x: 0, z: 0 }, 0);
  expect(SPAWN.z - p.z).toBeCloseTo(3 * RUN_FACTOR, 1);
});
test('đang đi theo lộ trình mà dùng joystick thì huỷ lộ trình', () => {
  const p = new LocalPlayer();
  p.followRoute([{ x: 0, z: 20 }, { x: 0, z: 12 }]);
  p.update(0.1, { x: 0, z: 0 }, 0);
  p.update(0.1, { x: 1, z: 0 }, 0);
  p.update(0.1, { x: 0, z: 0 }, 0);
  expect(p.routing).toBe(false);
  expect(p.hasTarget).toBe(false);
});
test('bấm xuống nền giữa lộ trình thì thôi đi theo lộ trình', () => {
  const p = new LocalPlayer();
  p.followRoute([{ x: 0, z: 20 }, { x: 0, z: 12 }]);
  p.moveTo(1, 27);
  expect(p.routing).toBe(false);
  for (let i = 0; i < 100 && p.hasTarget; i++) p.update(1 / 30, { x: 0, z: 0 }, 0);
  expect(Math.hypot(p.x - 1, p.z - 27)).toBeLessThan(0.2);
});
test('kẹt giữa lộ trình (điểm nằm trong vật cản) thì bỏ điểm đó, đi tiếp điểm sau', () => {
  const p = new LocalPlayer();
  // (0, 4) là lư hương sân: không tới được; điểm sau (2.4, 12) vẫn phải tới
  p.followRoute([{ x: 0, z: 4 }, { x: 2.4, z: 12 }]);
  for (let i = 0; i < 900 && p.hasTarget; i++) p.update(1 / 30, { x: 0, z: 0 }, 0);
  expect(Math.hypot(p.x - 2.4, p.z - 12)).toBeLessThan(0.2);
});
