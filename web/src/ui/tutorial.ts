import { h } from './dom';
import { t } from './i18n';

const KEY = 'vco.tutorial.v1';

function store(): Storage | undefined {
  try { return globalThis.localStorage; } catch { return undefined; }
}

export function tutorialSeen(s: Storage | undefined = store()): boolean {
  try { return !s || s.getItem(KEY) === '1'; } catch { return true; }
}
export function markTutorialSeen(s: Storage | undefined = store()): void {
  try { s?.setItem(KEY, '1'); } catch { /* bỏ qua */ }
}

export function tutorialSteps(mobile: boolean): { title: string; body: string }[] {
  return [
    { title: t('tut.move.title'), body: t(mobile ? 'tut.move.mob' : 'tut.move.desk') },
    { title: t('tut.bow.title'), body: t('tut.bow.body') },
    { title: t('tut.more.title'), body: t('tut.more.body') },
  ];
}

/**
 * Thẻ hướng dẫn 3 bước ở đáy màn hình, chỉ hiện lần đầu.
 * `onClose` chạy khi thẻ đóng, hoặc ngay lập tức nếu đã xem rồi, để các thông báo khác không đè lên thẻ.
 * Trả về `true` nếu thẻ được hiện.
 */
export function showTutorial(root: HTMLElement, onClose?: () => void, s: Storage | undefined = store()): boolean {
  if (tutorialSeen(s)) {
    onClose?.();
    return false;
  }
  const steps = tutorialSteps(matchMedia('(pointer: coarse)').matches);
  let i = 0;
  const title = h('h3');
  const body = h('p');
  const dots = h('div', { class: 'tut-dots' });
  const next = h('button', { type: 'button', class: 'tut-next', on: { click: () => (i < steps.length - 1 ? (i++, render()) : close()) } });
  const skip = h('button', { type: 'button', class: 'tut-skip', on: { click: () => close() } }, t('tut.skip'));
  const card = h('div', { class: 'tut', role: 'dialog', 'aria-label': t('tut.move.title') }, title, body, h('div', { class: 'tut-foot' }, dots, skip, next));
  function render() {
    title.textContent = steps[i].title;
    body.textContent = steps[i].body;
    next.textContent = i < steps.length - 1 ? t('tut.next') : t('tut.done');
    dots.replaceChildren(...steps.map((_, k) => h('i', { class: k === i ? 'on' : '' })));
  }
  function close() {
    markTutorialSeen(s);
    card.remove();
    onClose?.();
  }
  render();
  root.appendChild(card);
  return true;
}
