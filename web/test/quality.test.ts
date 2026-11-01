import { test, expect } from 'vitest';
import { QualityGovernor } from '../src/scene/quality';

test('giảm mức sau 3s fps thấp, không tăng lại', () => {
  const lv: number[] = [];
  const q = new QualityGovernor((l) => lv.push(l));
  for (let i = 0; i < 3; i++) q.sample(20);
  for (let i = 0; i < 10; i++) q.sample(60);
  for (let i = 0; i < 3; i++) q.sample(20);
  expect(lv).toEqual([1, 0]);
});
test('fps chập chờn không giảm', () => {
  const lv: number[] = [];
  const q = new QualityGovernor((l) => lv.push(l));
  [20, 20, 40, 20, 20, 40].forEach((f) => q.sample(f));
  expect(lv).toEqual([]);
});
test('không giảm dưới 0', () => {
  const lv: number[] = [];
  const q = new QualityGovernor((l) => lv.push(l));
  for (let i = 0; i < 30; i++) q.sample(5);
  expect(lv).toEqual([1, 0]);
});
