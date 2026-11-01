export interface Track { file: string; title: string; credit: string }

const cc = (title: string) =>
  `"${title}" Kevin MacLeod (incompetech.com) — Licensed under Creative Commons: By Attribution 4.0 License (creativecommons.org/licenses/by/4.0)`;

/** Nhạc thiền nền (CC BY 4.0). Bài ngắn nhất đứng đầu để bắt đầu nhanh. */
export const MUSIC_TRACKS: Track[] = [
  { file: 'audio/ripples.mp3', title: 'Ripples', credit: cc('Ripples') },
  { file: 'audio/ishikari-lore.mp3', title: 'Ishikari Lore', credit: cc('Ishikari Lore') },
  { file: 'audio/healing.mp3', title: 'Healing', credit: cc('Healing') },
];

export class Playlist {
  private i = 0;
  constructor(private readonly tracks: Track[]) {}
  current(): Track { return this.tracks[this.i]; }
  next(): Track { this.i = (this.i + 1) % this.tracks.length; return this.current(); }
}

/** Nhịp mõ tụng kinh (~86 nhịp/phút) và chuông mỗi 24 nhịp. */
export const BEAT_MS = 700;
export const BELL_EVERY = 24;

/**
 * Các nhịp trên lưới thời gian chung (tính từ epoch theo giờ server) trong [fromMs, toMs).
 * Vì lưới là chung, mọi người trong chùa nghe mõ gõ cùng nhịp.
 */
export function beatsBetween(fromMs: number, toMs: number, beatMs = BEAT_MS): { index: number; atMs: number }[] {
  const out: { index: number; atMs: number }[] = [];
  for (let k = Math.ceil(fromMs / beatMs); k * beatMs < toMs; k++) out.push({ index: k, atMs: k * beatMs });
  return out;
}

export const isBellBeat = (index: number) => index % BELL_EVERY === 0;
