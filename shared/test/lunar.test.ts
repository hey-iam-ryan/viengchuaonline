import { test, expect } from 'vitest';
import { solarToLunar, lunarOf, occasionOf } from '../src/lunar';

test('Tết các năm (mùng 1 tháng Giêng)', () => {
  expect(solarToLunar(10, 2, 2024)).toMatchObject({ day: 1, month: 1, year: 2024, leap: false });
  expect(solarToLunar(29, 1, 2025)).toMatchObject({ day: 1, month: 1, year: 2025 });
  expect(solarToLunar(17, 2, 2026)).toMatchObject({ day: 1, month: 1, year: 2026 });
  expect(solarToLunar(6, 2, 2027)).toMatchObject({ day: 1, month: 1, year: 2027 });
  expect(solarToLunar(16, 2, 2026)).toMatchObject({ month: 12, year: 2025 }); // giao thừa vẫn là năm cũ
});
test('Vu Lan & Trung thu 2025', () => {
  expect(solarToLunar(6, 9, 2025)).toMatchObject({ day: 15, month: 7 });
  expect(solarToLunar(6, 10, 2025)).toMatchObject({ day: 15, month: 8 });
});
test('tháng 6 nhuận năm Ất Tỵ 2025', () => {
  expect(solarToLunar(25, 7, 2025)).toMatchObject({ day: 1, month: 6, leap: true });
  expect(solarToLunar(24, 7, 2025)).toMatchObject({ month: 6, leap: false });
});
test('lunarOf dùng giờ Việt Nam (UTC+7)', () => {
  // 16/2/2026 17:30 UTC = 17/2/2026 00:30 giờ VN → mùng 1 Tết
  expect(lunarOf(Date.parse('2026-02-16T17:30:00Z'))).toMatchObject({ day: 1, month: 1, year: 2026 });
  expect(lunarOf(Date.parse('2026-02-16T16:30:00Z'))).toMatchObject({ month: 12 });
});
test('dịp lễ', () => {
  expect(occasionOf({ day: 1, month: 1, year: 2026, leap: false })).toBe('tet');
  expect(occasionOf({ day: 3, month: 1, year: 2026, leap: false })).toBe('tet');
  expect(occasionOf({ day: 15, month: 1, year: 2026, leap: false })).toBe('ramThang1');
  expect(occasionOf({ day: 15, month: 4, year: 2026, leap: false })).toBe('phatDan');
  expect(occasionOf({ day: 15, month: 7, year: 2026, leap: false })).toBe('vuLan');
  expect(occasionOf({ day: 15, month: 9, year: 2026, leap: false })).toBe('ram');
  expect(occasionOf({ day: 1, month: 10, year: 2026, leap: false })).toBe('mung1');
  expect(occasionOf({ day: 15, month: 7, year: 2026, leap: true })).toBe('ram'); // rằm tháng nhuận không phải Vu Lan
  expect(occasionOf({ day: 9, month: 10, year: 2026, leap: false })).toBeNull();
});
