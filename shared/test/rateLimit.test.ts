import { test, expect } from 'vitest';
import { TokenBucket } from '../src/rateLimit';

test('burst rồi chặn, hồi theo thời gian', () => {
  const b = new TokenBucket(10, 3, 0);
  expect([b.take(0), b.take(0), b.take(0), b.take(0)]).toEqual([true, true, true, false]);
  expect(b.take(100)).toBe(true);
  expect(b.take(100)).toBe(false);
});
test('không vượt burst sau thời gian dài', () => {
  const b = new TokenBucket(10, 3, 0);
  const r = [1, 2, 3, 4].map(() => b.take(1_000_000));
  expect(r).toEqual([true, true, true, false]);
});
