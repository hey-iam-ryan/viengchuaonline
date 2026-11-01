import { test, expect } from 'vitest';
import { clampCamera } from '../src/player/camera';

test('camera không xuyên tường mặt tiền chánh điện khi đứng ngoài sân', () => {
  // người ở sân sát tường mặt tiền (z=-10..-10.5), camera xoay ra sau tường (bên trong điện)
  const c = clampCamera(6, -8, 6, -14);
  expect(c.z).toBeGreaterThan(-10);
  expect(c.x).toBeCloseTo(6);
});
test('không vướng gì thì giữ nguyên', () => expect(clampCamera(0, 10, 0, 16)).toEqual({ x: 0, z: 16 }));
test('đi qua cửa thì không bị chặn', () => expect(clampCamera(0, -8, 0, -13)).toEqual({ x: 0, z: -13 }));

test('camera không chui vào mái cổng tam quan', () => {
  const c = clampCamera(0, 14, -3, 21);
  expect(c.z).toBeLessThan(16.8);
});

test('đứng ngay dưới cổng thì camera không bị kéo dính vào người', () => {
  expect(clampCamera(0, 18, 0, 24)).toEqual({ x: 0, z: 24 });
});
