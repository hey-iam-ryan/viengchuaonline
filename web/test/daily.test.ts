import { test, expect } from 'vitest';
import { QUESTS, checkIn, emptyDaily, loadDaily, record, saveDaily, questsDone } from '../src/state/daily';
import { memStorage, throwingStorage } from './storage';

const day = (iso: string) => Date.parse(iso);
const D1 = day('2026-11-03T03:00:00Z'); // 3/11 giờ VN
const D2 = day('2026-11-04T03:00:00Z');
const D4 = day('2026-11-06T03:00:00Z');

test('điểm danh: ngày đầu streak 1, hôm sau 2, bỏ 1 ngày thì về 1', () => {
  let r = checkIn(emptyDaily(), D1);
  expect([r.state.streak, r.firstToday]).toEqual([1, true]);
  r = checkIn(r.state, D1 + 3600_000);
  expect([r.state.streak, r.firstToday]).toEqual([1, false]);
  r = checkIn(r.state, D2);
  expect(r.state.streak).toBe(2);
  r = checkIn(r.state, D4);
  expect(r.state.streak).toBe(1);
});
test('nhiệm vụ: đếm tiến độ, báo hoàn thành đúng 1 lần, xong hết thì allDone', () => {
  let s = checkIn(emptyDaily(), D1).state;
  const r1 = record(s, 'bow', D1); s = r1.state;
  expect(r1.completed).toEqual([]);
  s = record(s, 'bow', D1).state;
  const r3 = record(s, 'bow', D1); s = r3.state;
  expect(r3.completed).toEqual(['bows']);
  expect(record(s, 'bow', D1).completed).toEqual([]);
  s = record(s, 'incense', D1).state;
  s = record(s, 'lantern', D1).state;
  for (let i = 0; i < 27; i++) s = record(s, 'bead', D1).state;
  const last = record(s, 'bell', D1);
  expect(last.completed).toEqual(['bellMo']);
  expect(last.allDone).toBe(true);
  expect(questsDone(last.state)).toBe(QUESTS.length);
});
test('qua ngày mới thì nhiệm vụ làm lại từ đầu', () => {
  let s = checkIn(emptyDaily(), D1).state;
  s = record(s, 'incense', D1).state;
  expect(questsDone(s)).toBe(1);
  s = checkIn(s, D2).state;
  expect(questsDone(s)).toBe(0);
  expect(record(s, 'incense', D2 + 1000).completed).toEqual(['incense']);
});
test('lưu/đọc, storage hỏng không crash', () => {
  const st = memStorage();
  const s = record(checkIn(emptyDaily(), D1).state, 'mo', D1).state;
  saveDaily(s, st);
  expect(loadDaily(st)).toEqual(s);
  st.setItem('vco.daily.v1', '{broken');
  expect(loadDaily(st)).toEqual(emptyDaily());
  expect(loadDaily(throwingStorage())).toEqual(emptyDaily());
  expect(() => saveDaily(s, throwingStorage())).not.toThrow();
});
