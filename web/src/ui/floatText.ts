import { getLang } from './i18n';

export type FloatKind = 'bow' | 'mo' | 'bell' | 'bead' | 'incense' | 'lantern';

/** Chữ bay lên khi tu tập — phản hồi vui mắt, không tích điểm, không gắn với tiền. */
const TEXT: Record<'vi' | 'en', Record<FloatKind, string[]>> = {
  vi: {
    bow: ['An lạc +1', 'Phiền não −1'],
    mo: ['Tĩnh tâm +1'],
    bell: ['Thanh tịnh +1'],
    bead: ['Nam mô A Di Đà Phật'],
    incense: ['Tâm hương 🙏'],
    lantern: ['Bình an +1'],
  },
  en: {
    bow: ['Peace +1', 'Worries −1'],
    mo: ['Calm +1'],
    bell: ['Serenity +1'],
    bead: ['Namo Amitabha'],
    incense: ['Incense offered 🙏'],
    lantern: ['Blessings +1'],
  },
};

export function floatText(kind: FloatKind, i: number): string {
  const list = TEXT[getLang()][kind];
  return list[i % list.length];
}

const MAX = 8;

/** Hiện chữ bay lên tại toạ độ màn hình (px), tự xoá sau hoạt cảnh. */
export class FloatLayer {
  private n: Partial<Record<FloatKind, number>> = {};
  constructor(private readonly root: HTMLElement) {}

  spawn(kind: FloatKind, x: number, y: number): void {
    const i = this.n[kind] ?? 0;
    this.n[kind] = i + 1;
    const live = this.root.querySelectorAll('.float-text');
    if (live.length >= MAX) live[0].remove();
    const el = document.createElement('div');
    el.className = `float-text ft-${kind}`;
    el.textContent = floatText(kind, i);
    el.style.left = `${x + (Math.random() - 0.5) * 40}px`;
    el.style.top = `${y}px`;
    this.root.appendChild(el);
    setTimeout(() => el.remove(), 1600);
  }
}
