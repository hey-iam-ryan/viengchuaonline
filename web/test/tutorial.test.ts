import { test, expect, vi } from 'vitest';
import { tutorialSeen, markTutorialSeen, tutorialSteps, showTutorial } from '../src/ui/tutorial';
import { memStorage, throwingStorage } from './storage';
import { setLang } from '../src/ui/i18n';

test('hướng dẫn chỉ hiện lần đầu', () => {
  const s = memStorage();
  expect(tutorialSeen(s)).toBe(false);
  markTutorialSeen(s);
  expect(tutorialSeen(s)).toBe(true);
});
test('storage lỗi → coi như đã xem (không làm phiền mỗi lần)', () => {
  expect(tutorialSeen(throwingStorage())).toBe(true);
  expect(() => markTutorialSeen(throwingStorage())).not.toThrow();
});
test('3 bước, có nội dung riêng cho điện thoại', () => {
  setLang('vi');
  const desk = tutorialSteps(false);
  const mob = tutorialSteps(true);
  expect(desk).toHaveLength(3);
  expect(desk[0].body).toMatch(/Shift/);
  expect(mob[0].body).toMatch(/[Cc]hạm/);
});

test('đã xem hướng dẫn: không hiện thẻ, gọi onClose ngay', () => {
  const s = memStorage();
  markTutorialSeen(s);
  const onClose = vi.fn();
  expect(showTutorial(document.body, onClose, s)).toBe(false);
  expect(onClose).toHaveBeenCalledOnce();
  expect(document.querySelector('.tut')).toBeNull();
});
test('lần đầu: hiện thẻ, onClose chỉ chạy khi bấm Bỏ qua', () => {
  setLang('vi');
  vi.stubGlobal('matchMedia', () => ({ matches: false }));
  const s = memStorage();
  const onClose = vi.fn();
  expect(showTutorial(document.body, onClose, s)).toBe(true);
  expect(onClose).not.toHaveBeenCalled();
  (document.querySelector('.tut-skip') as HTMLButtonElement).click();
  expect(onClose).toHaveBeenCalledOnce();
  expect(document.querySelector('.tut')).toBeNull();
  expect(tutorialSeen(s)).toBe(true);
  vi.unstubAllGlobals();
});
