export interface DayStats { incense: number; bows: number; lanterns: number; wishes: number }
export const STAT_KEYS: (keyof DayStats)[] = ['incense', 'bows', 'lanterns', 'wishes'];

export const vnDay = (now: number) => new Date(now + 7 * 3_600_000).toISOString().slice(0, 10);
export const emptyStats = (): DayStats => ({ incense: 0, bows: 0, lanterns: 0, wishes: 0 });

/** Cộng dồn, bỏ qua giá trị không phải số nguyên dương. */
export function addStats(a: DayStats, d: Partial<DayStats>): DayStats {
  const out = { ...a };
  for (const k of STAT_KEYS) {
    const v = d[k];
    if (typeof v === 'number' && Number.isInteger(v) && v > 0) out[k] += v;
  }
  return out;
}
