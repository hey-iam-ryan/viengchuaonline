import { test, expect } from 'vitest';
import { occasionLabel, lunarShort } from '../src/ui/occasion';
import { setLang } from '../src/ui/i18n';

test('nhãn dịp lễ & ngày âm lịch', () => {
  setLang('vi');
  expect(occasionLabel({ day: 15, month: 9, year: 2026, leap: false })).toBe('🌕 Rằm tháng 9');
  expect(occasionLabel({ day: 1, month: 10, year: 2026, leap: false })).toBe('🌙 Mùng Một tháng 10');
  expect(occasionLabel({ day: 15, month: 7, year: 2026, leap: false })).toBe('🌹 Lễ Vu Lan báo hiếu');
  expect(occasionLabel({ day: 2, month: 1, year: 2026, leap: false })).toBe('🧧 Tết Nguyên Đán');
  expect(occasionLabel({ day: 9, month: 10, year: 2026, leap: false })).toBeNull();
  expect(lunarShort({ day: 23, month: 9, year: 2026, leap: false })).toBe('23/9 âm lịch');
  expect(lunarShort({ day: 3, month: 6, year: 2025, leap: true })).toBe('3/6 nhuận âm lịch');
  setLang('en');
  expect(occasionLabel({ day: 15, month: 9, year: 2026, leap: false })).toBe('🌕 Full moon, month 9');
  expect(lunarShort({ day: 23, month: 9, year: 2026, leap: false })).toBe('Lunar 23/9');
  setLang('vi');
});
