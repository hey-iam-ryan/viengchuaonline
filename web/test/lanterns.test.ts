import { test, expect } from 'vitest';
import { POND } from '@vco/shared/world';
import { lanternPos } from '../src/interact/lanterns';

test('đèn trôi chậm nhưng luôn nằm trong hồ', () => {
  const l = { x: POND.minX + 0.4, z: POND.maxZ - 0.4, at: 0, s: 123 };
  for (let t = 0; t < 600_000; t += 7_000) {
    const p = lanternPos(l, t);
    expect(p.x).toBeGreaterThanOrEqual(POND.minX + 0.2);
    expect(p.x).toBeLessThanOrEqual(POND.maxX - 0.2);
    expect(p.z).toBeGreaterThanOrEqual(POND.minZ + 0.2);
    expect(p.z).toBeLessThanOrEqual(POND.maxZ - 0.2);
  }
  expect(lanternPos(l, 60_000)).not.toEqual(lanternPos(l, 0));
});
