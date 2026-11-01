import { test, expect } from 'vitest';
import { addBow, loadProgress, nextBead, saveProgress } from '../src/state/progress';
import { memStorage, throwingStorage } from './storage';

test('mốc 3 và 108 lạy', () => {
  let p = loadProgress(memStorage(), 0);
  const ms: (number | null)[] = [];
  for (let i = 0; i < 108; i++) { const r = addBow(p, 0); p = r.p; ms.push(r.milestone); }
  expect(ms[2]).toBe(3);
  expect(ms[107]).toBe(108);
  expect(ms.filter(Boolean)).toHaveLength(2);
});
test('bowsToday reset theo ngày VN (00:00 VN = 17:00Z)', () => {
  const t1 = Date.parse('2026-11-01T16:00:00Z');
  let p = addBow(loadProgress(memStorage(), t1), t1).p;
  p = addBow(p, Date.parse('2026-11-01T17:30:00Z')).p;
  expect(p.bowsToday).toBe(1);
  expect(p.bowsTotal).toBe(2);
  expect(p.day).toBe('2026-11-02');
});
test('mốc tính theo số lạy trong ngày', () => {
  const t = Date.parse('2026-11-01T05:00:00Z');
  let p = loadProgress(memStorage(), t);
  for (let i = 0; i < 2; i++) p = addBow(p, t).p;
  const next = Date.parse('2026-11-02T05:00:00Z');
  const ms = [addBow(p, next), addBow(addBow(p, next).p, next)].map((r) => r.milestone);
  expect(ms).toEqual([null, null]);
});
test('hạt thứ 108 xong vòng, quay về 0', () => {
  const p = { ...loadProgress(memStorage(), 0), beadIndex: 107 };
  const r = nextBead(p);
  expect(r.roundDone).toBe(true);
  expect(r.p.beadIndex).toBe(0);
  expect(r.p.beadRounds).toBe(1);
  expect(nextBead(r.p)).toMatchObject({ roundDone: false, p: { beadIndex: 1 } });
});
test('lưu rồi đọc lại được', () => {
  const s = memStorage();
  const p = addBow(loadProgress(s, 0), 0).p;
  saveProgress({ ...p, name: 'Minh', robe: 'nau' }, s);
  expect(loadProgress(s, 0)).toMatchObject({ bowsTotal: 1, name: 'Minh', robe: 'nau' });
});
test('JSON hỏng hoặc kiểu sai → mặc định', () => {
  const s = memStorage();
  s.setItem('vco.progress.v1', '{oops');
  expect(loadProgress(s, 0).bowsTotal).toBe(0);
  s.setItem('vco.progress.v1', '{"bowsTotal":"many","robe":"do","beadIndex":999}');
  const p = loadProgress(s, 0);
  expect([p.bowsTotal, p.robe, p.beadIndex]).toEqual([0, 'lam', 0]);
});
test('storage ném lỗi không crash', () => {
  expect(loadProgress(throwingStorage(), 0).bowsTotal).toBe(0);
  expect(() => saveProgress(loadProgress(throwingStorage(), 0), throwingStorage())).not.toThrow();
});
