import { test, expect } from 'vitest';
import { cardText, inviteUrl, preferredHall } from '../src/ui/shareCard';
import { setLang } from '../src/ui/i18n';

test('nội dung thẻ thành tích', () => {
  setLang('vi');
  expect(cardText('bows', 108).title).toBe('Hôm nay tôi đã lạy 108 lạy 🙏');
  expect(cardText('beads', 3).title).toBe('Tôi đã lần xong 3 vòng chuỗi 108 hạt 📿');
  setLang('en');
  expect(cardText('bows', 108).title).toBe('I made 108 bows today 🙏');
  setLang('vi');
});
test('link rủ bạn kèm số gian (1-based), đọc lại được', () => {
  const u = inviteUrl('https://x.io/vc/', 4);
  expect(u).toBe('https://x.io/vc/?g=5');
  expect(preferredHall('?g=5')).toBe(4);
  expect(preferredHall('?g=0')).toBe(-1);
  expect(preferredHall('?g=abc')).toBe(-1);
  expect(preferredHall('')).toBe(-1);
  expect(inviteUrl('https://x.io/vc/', null)).toBe('https://x.io/vc/');
});
