import { test, expect } from 'vitest';
import { Circumambulation, CIRCUM_LAPS } from '../src/circum';
import { TOWER, TOWER_RING } from '../src/world';

const R = (TOWER_RING.inner + TOWER_RING.outer) / 2;
const at = (a: number, r = R) => ({ x: TOWER.x + Math.cos(a) * r, z: TOWER.z + Math.sin(a) * r });
function walk(c: Circumambulation, from: number, to: number, r = R) {
  const out: ReturnType<Circumambulation['update']>[] = [];
  const steps = Math.ceil(Math.abs(to - from) / 0.05);
  for (let i = 0; i <= steps; i++) { const p = at(from + ((to - from) * i) / steps, r); out.push(c.update(p.x, p.z)); }
  return out.filter((e) => e.lap);
}

test('đi đủ 1 vòng quanh tháp → đếm 1 vòng', () => {
  const c = new Circumambulation();
  const laps = walk(c, 0, Math.PI * 2 + 0.1);
  expect(laps.map((e) => e.lap)).toEqual([1]);
});
test('đủ 3 vòng thì báo viên mãn', () => {
  const c = new Circumambulation();
  const laps = walk(c, 0, Math.PI * 2 * CIRCUM_LAPS + 0.1);
  expect(laps.map((e) => e.lap)).toEqual([1, 2, 3]);
  expect(laps.at(-1)?.done).toBe(true);
});
test('đi chiều ngược lại cũng tính; đổi chiều giữa chừng thì không cộng dồn', () => {
  const c = new Circumambulation();
  expect(walk(c, 0, -Math.PI * 2 - 0.1).map((e) => e.lap)).toEqual([1]);
  const d = new Circumambulation();
  walk(d, 0, Math.PI);
  expect(walk(d, Math.PI, 0)).toEqual([]);
});
test('ra khỏi lối đi vòng thì phải đi lại từ đầu', () => {
  const c = new Circumambulation();
  walk(c, 0, Math.PI * 1.5);
  c.update(TOWER.x, TOWER.z + TOWER_RING.outer + 5); // đi ra xa
  expect(walk(c, 0, Math.PI * 1.2)).toEqual([]);
});
