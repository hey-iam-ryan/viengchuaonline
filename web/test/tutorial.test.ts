import { test, expect } from 'vitest';
import { tutorialSeen, markTutorialSeen, tutorialSteps } from '../src/ui/tutorial';
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
