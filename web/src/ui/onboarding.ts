import { ROBES, type Robe } from '@vco/shared/protocol';
import { ROBE_COLOR } from '../player/avatar';
import { h } from './dom';
import { getLang, setLang, t, type Lang } from './i18n';

/** `lang` chỉ có khi người chơi tự bấm chọn ngôn ngữ, để không ghi đè việc tự nhận diện. */
export interface OnboardResult { name: string; robe: Robe; lang?: Lang }

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
    onEnter({ name: name.value.trim(), robe, lang: initial.lang });
  };
  name.addEventListener('keydown', (e) => { if (e.key === 'Enter') enter(); });
  const langOpt = (l: Lang, label: string) => h('button', {
    type: 'button', lang: l, 'aria-pressed': String(getLang() === l),
    on: { click: () => { if (getLang() === l) return; setLang(l); card.remove(); showOnboarding(root, { name: name.value, robe, lang: l }, onEnter); } },
  }, label);
  // Tên mỗi ngôn ngữ viết bằng chính ngôn ngữ đó, để ai cũng nhận ra.
  const langSwitch = h('div', { class: 'lang-switch', role: 'group', 'aria-label': 'Ngôn ngữ / Language' }, langOpt('vi', 'Tiếng Việt'), langOpt('en', 'English'));
  const card = h('div', { class: 'onboard', role: 'dialog', 'aria-modal': 'true', 'aria-label': t('title') },
    h('div', { class: 'card' },
      langSwitch,
      h('div', { class: 'lotus', 'aria-hidden': 'true' }, '🪷'),
      h('h1', {}, t('title')),
      h('p', { class: 'sub' }, t('onboard.sub')),
      h('p', { class: 'occasion', 'data-occasion': '' }),
      h('p', { class: 'today', 'data-today': '' }),
      name,
      h('div', { class: 'label' }, t('onboard.robe')),
      h('div', { class: 'swatches' }, ...swatches),
      h('button', { type: 'button', class: 'primary', on: { click: enter } }, t('enter')),
    ),
  );
  root.appendChild(card);
}
