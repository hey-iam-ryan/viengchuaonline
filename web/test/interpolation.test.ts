import { test, expect } from 'vitest';
import { Interp } from '../src/net/interpolation';

test('nội suy giữa hai mẫu với độ trễ 200ms', () => {
  const i = new Interp();
  i.push(0, 0, 0, 0);
  i.push(200, 2, 0, 0);
  expect(i.sample(300)!.x).toBeCloseTo(1);
});
test('trước mẫu đầu / sau mẫu cuối thì kẹp, không ngoại suy', () => {
  const i = new Interp();
  i.push(1000, 5, 1, 0);
  i.push(1200, 7, 1, 0);
  expect(i.sample(0)!.x).toBe(5);
  expect(i.sample(99_999)!.x).toBe(7);
});
test('ry đi đường ngắn nhất qua ±π', () => {
  const i = new Interp();
  i.push(0, 0, 0, 3.0);
  i.push(200, 0, 0, -3.0);
  expect(Math.abs(i.sample(300)!.ry)).toBeGreaterThan(3.0);
});
test('chỉ giữ 10 mẫu', () => {
  const i = new Interp();
  for (let k = 0; k < 50; k++) i.push(k * 100, k, 0, 0);
  expect(i.size).toBe(10);
});
test('chưa có mẫu → null', () => expect(new Interp().sample(0)).toBeNull());
