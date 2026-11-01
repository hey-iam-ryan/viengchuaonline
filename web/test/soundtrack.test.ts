import { test, expect } from 'vitest';
import { MUSIC_TRACKS, Playlist, BEAT_MS, BELL_EVERY, beatsBetween, isBellBeat } from '../src/interact/soundtrack';

test('playlist bắt đầu bằng bài ngắn nhất, lặp vòng', () => {
  const p = new Playlist(MUSIC_TRACKS);
  expect(p.current().file).toBe('audio/ripples.mp3');
  const seen = [p.current().file];
  for (let i = 0; i < MUSIC_TRACKS.length; i++) seen.push(p.next().file);
  expect(seen.at(-1)).toBe(seen[0]);
  expect(new Set(seen).size).toBe(MUSIC_TRACKS.length);
});
test('mọi bài đều có ghi nguồn CC BY', () => {
  for (const t of MUSIC_TRACKS) expect(t.credit).toMatch(/Kevin MacLeod.*incompetech\.com.*Creative Commons: By Attribution 4\.0/);
});
test('nhịp mõ theo lưới thời gian chung (mọi người gõ cùng nhịp)', () => {
  expect(beatsBetween(0, 3 * BEAT_MS, BEAT_MS)).toEqual([{ index: 0, atMs: 0 }, { index: 1, atMs: BEAT_MS }, { index: 2, atMs: 2 * BEAT_MS }]);
  expect(beatsBetween(BEAT_MS + 1, 3 * BEAT_MS + 1, BEAT_MS)).toEqual([{ index: 2, atMs: 2 * BEAT_MS }, { index: 3, atMs: 3 * BEAT_MS }]);
  expect(beatsBetween(500, 500, BEAT_MS)).toEqual([]);
});
test('chuông mỗi BELL_EVERY nhịp', () => {
  expect(isBellBeat(0)).toBe(true);
  expect(isBellBeat(BELL_EVERY)).toBe(true);
  expect(isBellBeat(5)).toBe(false);
});
