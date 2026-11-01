import { test, expect } from 'vitest';
import { nearestPlayer, GREET_RANGE } from '../src/net/nearby';

const P = (id: string, x: number, z: number) => ({ id, n: id, x, z });
test('chọn người gần nhất trong tầm chào', () => {
  expect(nearestPlayer([P('a', 3, 0), P('b', 1, 1), P('c', 0.5, 9)], 0, 0)?.id).toBe('b');
  expect(nearestPlayer([P('a', GREET_RANGE + 0.1, 0)], 0, 0)).toBeNull();
  expect(nearestPlayer([], 0, 0)).toBeNull();
});
