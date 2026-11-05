import { test, expect } from 'vitest';
import { Meditation, breathPhase } from '../src/interact/meditation';

test('thiền hẹn giờ: đếm ngược, xong thì done, phút đã thiền', () => {
  const m = new Meditation();
  m.start(5, 1000);
  expect(m.active).toBe(true);
  expect(m.tick(1000 + 60_000)).toMatchObject({ remainingMs: 4 * 60_000, done: false });
  const end = m.tick(1000 + 5 * 60_000);
  expect(end).toMatchObject({ remainingMs: 0, done: true });
  expect(m.active).toBe(false);
  expect(m.minutesDone).toBe(5);
  expect(m.tick(1000 + 6 * 60_000).done).toBe(false); // không báo xong 2 lần
});
test('dừng giữa chừng: chỉ tính số phút trọn đã thiền', () => {
  const m = new Meditation();
  m.start(10, 0);
  m.tick(150_000);
  m.stop(150_000);
  expect(m.active).toBe(false);
  expect(m.minutesDone).toBe(2);
});
test('nhịp thở 4s hít – 4s thở', () => {
  expect(breathPhase(0)).toMatchObject({ inhale: true });
  expect(breathPhase(4000)).toMatchObject({ inhale: false });
  expect(breathPhase(2000).k).toBeCloseTo(0.5);
});
