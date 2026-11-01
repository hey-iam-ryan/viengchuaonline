import { test, expect } from 'vitest';
import { vnDay, emptyStats, addStats } from '../src/stats';

test('ngày theo giờ VN', () => {
  expect(vnDay(Date.parse('2026-11-01T16:59:00Z'))).toBe('2026-11-01');
  expect(vnDay(Date.parse('2026-11-01T17:00:00Z'))).toBe('2026-11-02');
});
test('cộng dồn thống kê, bỏ giá trị rác', () => {
  const s = addStats(emptyStats(), { incense: 2, bows: 3, lanterns: 1, wishes: 1 });
  expect(addStats(s, { incense: 1, bows: -5, lanterns: Number.NaN } as any)).toEqual({ incense: 3, bows: 3, lanterns: 1, wishes: 1 });
});
