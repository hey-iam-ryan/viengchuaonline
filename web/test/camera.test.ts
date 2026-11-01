import { test, expect } from 'vitest';
import { GATE_CAM_MAX_Y, capCameraHeight, clampCamera } from '../src/player/camera';

test('camera không xuyên tường mặt tiền chánh điện khi đứng ngoài sân', () => {
  // người ở sân sát tường mặt tiền (z=-10..-10.5), camera xoay ra sau tường (bên trong điện)
  const c = clampCamera(6, -8, 6, -14);
  expect(c.z).toBeGreaterThan(-10);
  expect(c.x).toBeCloseTo(6);
});
test('không vướng gì thì giữ nguyên', () => expect(clampCamera(0, 10, 0, 16)).toEqual({ x: 0, z: 16 }));
test('đi qua cửa thì không bị chặn', () => expect(clampCamera(0, -8, 0, -13)).toEqual({ x: 0, z: -13 }));

test('ở chỗ xuất phát, camera phía sau KHÔNG bị kéo sát vào lưng (lối cổng để trống)', () => {
  expect(clampCamera(0, 15, 0, 21)).toEqual({ x: 0, z: 21 });
});
test('camera trong vùng cổng bị hạ thấp dưới mái, ngoài vùng cổng giữ nguyên', () => {
  expect(capCameraHeight(-3, 18, 5.1)).toBeLessThanOrEqual(GATE_CAM_MAX_Y);
  expect(capCameraHeight(0, 10, 5.1)).toBe(5.1);
  expect(capCameraHeight(12, 18, 5.1)).toBe(5.1);
});

test('đứng ngay dưới cổng thì camera không bị kéo dính vào người', () => {
  expect(clampCamera(0, 18, 0, 24)).toEqual({ x: 0, z: 24 });
});
