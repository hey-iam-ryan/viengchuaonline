import { test, expect } from 'vitest';
import { CEREMONY_DURATION_MS, ceremonyStatus } from '../src/ceremony';

const utc = (s: string) => Date.parse(s);
test('đang lễ sáng (05:05 VN)', () =>
  expect(ceremonyStatus(utc('2026-11-01T22:05:00Z'))).toMatchObject({
    active: true,
    startMs: utc('2026-11-01T22:00:00Z'),
    endMs: utc('2026-11-01T22:00:00Z') + CEREMONY_DURATION_MS,
    nextStartMs: utc('2026-11-02T11:00:00Z'),
  }));
test('ngay trước lễ chiều', () =>
  expect(ceremonyStatus(utc('2026-11-02T10:59:59Z'))).toMatchObject({ active: false, startMs: utc('2026-11-02T11:00:00Z'), nextStartMs: utc('2026-11-02T11:00:00Z') }));
test('vừa hết lễ chiều → kế tiếp là 05:00 hôm sau', () => {
  const s = ceremonyStatus(utc('2026-11-02T11:15:00Z'));
  expect(s.active).toBe(false);
  expect(s.nextStartMs).toBe(utc('2026-11-02T22:00:00Z'));
});
