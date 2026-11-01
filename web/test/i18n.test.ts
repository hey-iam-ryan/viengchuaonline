import { test, expect } from 'vitest';
import { detectLang, setLang, t, vi as viDict, en as enDict } from '../src/ui/i18n';

test('detectLang', () => {
  expect(detectLang(['vi-VN'], null)).toBe('vi');
  expect(detectLang(['zh-TW', 'en'], null)).toBe('en');
  expect(detectLang(['vi'], 'en')).toBe('en');
  expect(detectLang([], null)).toBe('vi');
});
test('t có biến', () => {
  setLang('vi');
  expect(t('hall.status', { hall: 12, count: '1.234' })).toBe('Gian 12 · 1.234 người đang viếng chùa');
  setLang('en');
  expect(t('enter')).toBe('Enter the temple');
  setLang('vi');
  expect(t('enter')).toBe('Vào chùa');
});
test('en đủ key như vi', () => expect(Object.keys(enDict).sort()).toEqual(Object.keys(viDict).sort()));
