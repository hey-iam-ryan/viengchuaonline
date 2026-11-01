import { test, expect } from 'vitest';
import { Bow108, BOW_GRID_MS } from '../src/interact/bow108';

test('lạy theo lưới thời gian chung, đếm tới 108 rồi xong', () => {
  const b = new Bow108();
  const start = 10 * BOW_GRID_MS + 123;
  b.start(start);
  expect(b.active).toBe(true);
  expect(b.tick(start)).toBe(false); // chưa tới nhịp
  expect(b.tick(11 * BOW_GRID_MS)).toBe(true);
  expect(b.tick(11 * BOW_GRID_MS + 10)).toBe(false); // không lạy 2 lần trong 1 nhịp
  let t = 11 * BOW_GRID_MS;
  for (let i = 2; i <= 108; i++) { t += BOW_GRID_MS; expect(b.tick(t)).toBe(true); }
  expect(b.count).toBe(108);
  expect(b.done).toBe(true);
  expect(b.active).toBe(false);
  expect(b.tick(t + BOW_GRID_MS)).toBe(false);
});
test('bỏ lỡ nhiều nhịp (tab ẩn) thì chỉ tính 1 lạy, không dồn', () => {
  const b = new Bow108();
  b.start(0);
  expect(b.tick(BOW_GRID_MS * 20)).toBe(true);
  expect(b.count).toBe(1);
});
test('dừng giữa chừng', () => {
  const b = new Bow108();
  b.start(0);
  b.tick(BOW_GRID_MS);
  b.stop();
  expect(b.active).toBe(false);
  expect(b.done).toBe(false);
  expect(b.tick(BOW_GRID_MS * 2)).toBe(false);
  expect(b.count).toBe(1);
});
