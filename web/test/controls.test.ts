import { test, expect, afterEach } from 'vitest';
import { Controls } from '../src/player/controls';

let c: Controls | null = null;
afterEach(() => c?.dispose());
const key = (type: 'keydown' | 'keyup', code: string) => window.dispatchEvent(new KeyboardEvent(type, { code }));

test('W → tiến (z = −1)', () => {
  c = new Controls(document.body);
  key('keydown', 'KeyW');
  expect(c.move).toEqual({ x: 0, z: -1 });
  key('keyup', 'KeyW');
  expect(c.move).toEqual({ x: 0, z: 0 });
});
test('W+D chuẩn hoá ≤ 1', () => {
  c = new Controls(document.body);
  key('keydown', 'KeyW');
  key('keydown', 'KeyD');
  expect(Math.hypot(c.move.x, c.move.z)).toBeCloseTo(1);
  expect(c.move.x).toBeGreaterThan(0);
});
test('mũi tên cũng chạy', () => {
  c = new Controls(document.body);
  key('keydown', 'ArrowLeft');
  expect(c.move.x).toBe(-1);
});
test('mất focus thì nhả phím', () => {
  c = new Controls(document.body);
  key('keydown', 'KeyW');
  window.dispatchEvent(new Event('blur'));
  expect(c.move).toEqual({ x: 0, z: 0 });
});
test('gõ trong ô input không điều khiển', () => {
  c = new Controls(document.body);
  const input = document.createElement('input');
  document.body.appendChild(input);
  input.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW', bubbles: true }));
  expect(c.move).toEqual({ x: 0, z: 0 });
  input.remove();
});

const ptr = (type: string, o: Record<string, unknown>) => Object.assign(new Event(type, { bubbles: true }), { pointerId: 1, pointerType: 'mouse', isPrimary: true, ...o });

test('bấm nhanh không kéo → sự kiện tap; kéo thì không', () => {
  c = new Controls(document.body);
  const taps: [number, number][] = [];
  c.onTap = (x, y) => taps.push([x, y]);
  document.body.dispatchEvent(ptr('pointerdown', { clientX: 100, clientY: 200 }));
  window.dispatchEvent(ptr('pointerup', { clientX: 102, clientY: 201 }));
  document.body.dispatchEvent(ptr('pointerdown', { clientX: 100, clientY: 200 }));
  window.dispatchEvent(ptr('pointermove', { clientX: 160, clientY: 200 }));
  window.dispatchEvent(ptr('pointerup', { clientX: 160, clientY: 200 }));
  expect(taps).toEqual([[102, 201]]);
});
test('giữ Shift → run', () => {
  c = new Controls(document.body);
  key('keydown', 'ShiftLeft');
  expect(c.run).toBe(true);
  key('keyup', 'ShiftLeft');
  expect(c.run).toBe(false);
});
