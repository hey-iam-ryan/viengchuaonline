import { test, expect } from 'vitest';
import { floatText } from '../src/ui/floatText';
import { setLang } from '../src/ui/i18n';

test('chữ bay theo hành động, lạy xen kẽ an lạc / phiền não', () => {
  setLang('vi');
  expect(floatText('bow', 0)).toBe('An lạc +1');
  expect(floatText('bow', 1)).toBe('Phiền não −1');
  expect(floatText('bow', 2)).toBe('An lạc +1');
  expect(floatText('mo', 0)).toBe('Tĩnh tâm +1');
  expect(floatText('bell', 0)).toBe('Thanh tịnh +1');
  expect(floatText('bead', 0)).toBe('Nam mô A Di Đà Phật');
  expect(floatText('incense', 0)).toBe('Tâm hương 🙏');
  expect(floatText('lantern', 0)).toBe('Bình an +1');
  setLang('en');
  expect(floatText('bow', 1)).toBe('Worries −1');
  setLang('vi');
});
test('không có chữ nào nhắc tới tiền hay mua bán', () => {
  for (const lang of ['vi', 'en'] as const) {
    setLang(lang);
    for (const k of ['bow', 'mo', 'bell', 'bead', 'incense', 'lantern'] as const)
      for (let i = 0; i < 2; i++) expect(floatText(k, i)).not.toMatch(/công đức|merit|tiền|money|\$|đ\b|vnđ/i);
  }
  setLang('vi');
});

test('chữ bay khi quét lá', () => {
  setLang('vi');
  expect(floatText('sweep', 0)).toBe('Sân sạch, tâm an +1');
});
