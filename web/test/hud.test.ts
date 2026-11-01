import { test, expect, vi } from 'vitest';
import { formatCountdown, formatCount, formatVnTime } from '../src/ui/hud';
import { share } from '../src/ui/share';

test('format', () => {
  expect(formatCountdown(5025_000)).toBe('1:23:45');
  expect(formatCountdown(59_000)).toBe('0:00:59');
  expect(formatCountdown(-5)).toBe('0:00:00');
  expect(formatCount(1234, 'vi')).toBe('1.234');
  expect(formatCount(1234, 'en')).toBe('1,234');
  expect(formatVnTime(Date.parse('2026-11-02T11:00:00Z'))).toBe('18:00');
  expect(formatVnTime(Date.parse('2026-11-01T22:00:00Z'))).toBe('05:00');
});
test('share dùng Web Share khi có', async () => {
  const s = vi.fn(async () => {});
  Object.defineProperty(navigator, 'share', { value: s, configurable: true });
  expect(await share('https://x', 'hi')).toBe('shared');
  expect(s).toHaveBeenCalledWith({ url: 'https://x', text: 'hi', title: expect.any(String) });
  Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
});
test('share fallback copy', async () => {
  const w = vi.fn(async () => {});
  Object.defineProperty(navigator, 'clipboard', { value: { writeText: w }, configurable: true });
  expect(await share('https://x', 'hi')).toBe('copied');
  expect(w).toHaveBeenCalledWith('hi https://x');
});
test('share: người dùng huỷ / không có gì → failed, không ném lỗi', async () => {
  Object.defineProperty(navigator, 'share', { value: async () => { throw new DOMException('x', 'AbortError'); }, configurable: true });
  expect(await share('https://x', 'hi')).toBe('failed');
  Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
  Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });
  expect(await share('https://x', 'hi')).toBe('failed');
});
