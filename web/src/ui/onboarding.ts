import { ROBES, type Robe } from '@vco/shared/protocol';
import { ROBE_COLOR } from '../player/avatar';
import { h } from './dom';
import { getLang, setLang, t } from './i18n';

export interface OnboardResult { name: string; robe: Robe }

/** Màn đầu: pháp danh (tuỳ chọn), màu áo, nút "Vào chùa". Nút là cử chỉ đầu tiên → mở khoá âm thanh. */
export function showOnboarding(root: HTMLElement, initial: OnboardResult, onEnter: (r: OnboardResult) => void): void {
  let robe = initial.robe;
  const name = h('input', { type: 'text', maxlength: '24', autocomplete: 'nickname', enterkeyhint: 'go', 'aria-label': t('onboard.name'), placeholder: t('onboard.name') });
  name.value = initial.name;
  const swatches = ROBES.map((r) => {
    const b = h('button', { type: 'button', class: 'swatch', 'aria-label': t(`robe.${r}`), title: t(`robe.${r}`), 'aria-pressed': String(r === robe) });
    b.style.background = `#${ROBE_COLOR[r].toString(16).padStart(6, '0')}`;
    b.addEventListener('click', () => {
      robe = r;
      swatches.forEach((s, i) => s.setAttribute('aria-pressed', String(ROBES[i] === r)));
    });
    return b;
  });
  const enter = () => {
    card.remove();
    onEnter({ name: name.value.trim(), robe });
  };
  name.addEventListener('keydown', (e) => { if (e.key === 'Enter') enter(); });
  const langBtn = h('button', { type: 'button', class: 'link', on: { click: () => { setLang(getLang() === 'vi' ? 'en' : 'vi'); card.remove(); showOnboarding(root, { name: name.value, robe }, onEnter); } } }, t('lang'));
  const card = h('div', { class: 'onboard', role: 'dialog', 'aria-modal': 'true', 'aria-label': t('title') },
    h('div', { class: 'card' },
      h('div', { class: 'lotus', 'aria-hidden': 'true' }, '🪷'),
      h('h1', {}, t('title')),
      h('p', { class: 'sub' }, t('onboard.sub')),
      name,
      h('div', { class: 'label' }, t('onboard.robe')),
      h('div', { class: 'swatches' }, ...swatches),
      h('button', { type: 'button', class: 'primary', on: { click: enter } }, t('enter')),
      langBtn,
    ),
  );
  root.appendChild(card);
}
