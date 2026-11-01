import { test, expect } from 'vitest';
import { sanitizeName } from '../src/name';

test('giữ tiếng Việt, chuẩn hoá NFC', () => {
  const r = sanitizeName('Minh Tâm'.normalize('NFD'));
  expect(r).toBe('Minh Tâm'.normalize('NFC'));
});
test('cắt 16 grapheme', () => {
  expect([...new Intl.Segmenter().segment(sanitizeName('🙏'.repeat(30)))].length).toBe(16);
});
test('bỏ ký tự điều khiển & zero-width, trim', () => expect(sanitizeName('  An​\u0007 ')).toBe('An'));
test('rỗng/không phải chuỗi/tục → Phật tử', () => {
  expect(sanitizeName('')).toBe('Phật tử');
  expect(sanitizeName('   ')).toBe('Phật tử');
  expect(sanitizeName(42)).toBe('Phật tử');
  expect(sanitizeName('đ.m')).toBe('Phật tử');
  expect(sanitizeName('Fuck you')).toBe('Phật tử');
});
test('tên bình thường chứa chuỗi con không bị oan', () => expect(sanitizeName('Đam Mê')).toBe('Đam Mê'));
