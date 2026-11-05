/** Cấp bậc tu tập theo các giai đoạn hoa sen — chỉ là danh hiệu, không mua được. */
export const RANKS = [
  { min: 0, vi: 'Mầm sen', en: 'Lotus Sprout', icon: '🌱' },
  { min: 30, vi: 'Búp sen', en: 'Lotus Bud', icon: '🌷' },
  { min: 120, vi: 'Sen hé', en: 'Opening Lotus', icon: '🪷' },
  { min: 400, vi: 'Sen nở', en: 'Blooming Lotus', icon: '🪷' },
  { min: 1200, vi: 'Sen vàng', en: 'Golden Lotus', icon: '🌼' },
  { min: 3000, vi: 'Liên hoa', en: 'Sacred Lotus', icon: '✨' },
] as const;

export function practicePoints(p: { bowsTotal: number; incenseTotal: number; beadRounds: number; days: number; leavesTotal?: number; zenMinutes?: number }): number {
  return p.bowsTotal + p.incenseTotal * 3 + p.beadRounds * 10 + p.days * 5 + (p.leavesTotal ?? 0) * 2 + (p.zenMinutes ?? 0) * 2;
}

export function rankOf(points: number): number {
  let k = 0;
  RANKS.forEach((r, i) => { if (points >= r.min) k = i; });
  return k;
}

import { getLang } from '../ui/i18n';

export function rankLabel(k: number): string {
  const r = RANKS[Math.max(0, Math.min(RANKS.length - 1, k))];
  return `${r.icon} ${getLang() === 'en' ? r.en : r.vi}`;
}
