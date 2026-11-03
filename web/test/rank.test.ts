import { test, expect } from 'vitest';
import { RANKS, rankOf, practicePoints } from '../src/state/rank';
import { setLang } from '../src/ui/i18n';

test('điểm tu tập', () => {
  expect(practicePoints({ bowsTotal: 10, incenseTotal: 2, beadRounds: 1, days: 3 })).toBe(10 + 6 + 10 + 15);
});
test('cấp bậc theo ngưỡng điểm', () => {
  expect(rankOf(0)).toBe(0);
  expect(rankOf(RANKS[1].min - 1)).toBe(0);
  expect(rankOf(RANKS[1].min)).toBe(1);
  expect(rankOf(1e9)).toBe(RANKS.length - 1);
  expect(RANKS).toHaveLength(6);
});
test('tên cấp bậc vi/en', () => {
  setLang('vi');
  expect(RANKS.map((r) => r.vi)).toEqual(['Mầm sen', 'Búp sen', 'Sen hé', 'Sen nở', 'Sen vàng', 'Liên hoa']);
  expect(RANKS.map((r) => r.en)).toEqual(['Lotus Sprout', 'Lotus Bud', 'Opening Lotus', 'Blooming Lotus', 'Golden Lotus', 'Sacred Lotus']);
});
