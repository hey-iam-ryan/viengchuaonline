import { test, expect } from 'vitest';
import { daylightAt, vnHour } from '../src/scene/daylight';

test('giờ VN', () => expect(vnHour(Date.parse('2026-11-01T11:30:00Z'))).toBeCloseTo(18.5));
test('trưa sáng hẳn, nửa đêm tối hẳn', () => {
  expect(daylightAt(12).night).toBe(0);
  expect(daylightAt(0).night).toBe(1);
  expect(daylightAt(12).sun).toBeGreaterThan(daylightAt(0).sun);
});
test('hoàng hôn 18h là chuyển tiếp', () => {
  const d = daylightAt(18);
  expect(d.night).toBeGreaterThan(0);
  expect(d.night).toBeLessThan(1);
});
test('liên tục, không nhảy cóc qua 24h', () => {
  for (let h = 0; h < 24; h += 0.25) expect(Math.abs(daylightAt(h).night - daylightAt(h + 0.25).night)).toBeLessThan(0.2);
  expect(daylightAt(23.99).night).toBeCloseTo(daylightAt(0).night, 1);
});
