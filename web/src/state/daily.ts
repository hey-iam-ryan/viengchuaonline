import { vnDay } from './progress';
import type { FloatKind } from '../ui/floatText';

export type QuestId = 'bows' | 'incense' | 'lantern' | 'beads' | 'bellMo';
export interface Quest { id: QuestId; target: number; kinds: FloatKind[]; icon: string }

/** 5 việc tu tập mỗi ngày (làm mới 0h giờ Việt Nam). */
export const QUESTS: Quest[] = [
  { id: 'bows', target: 3, kinds: ['bow'], icon: '🙏' },
  { id: 'incense', target: 1, kinds: ['incense'], icon: '🕯️' },
  { id: 'lantern', target: 1, kinds: ['lantern'], icon: '🏮' },
  { id: 'beads', target: 27, kinds: ['bead'], icon: '📿' },
  { id: 'bellMo', target: 1, kinds: ['bell', 'mo'], icon: '🔔' },
];

export interface DailyState { day: string; lastVisit: string; streak: number; prog: Partial<Record<QuestId, number>> }

const KEY = 'vco.daily.v1';
export const emptyDaily = (): DailyState => ({ day: '', lastVisit: '', streak: 0, prog: {} });

const prevDay = (d: string) => new Date(Date.parse(`${d}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10);

/** Điểm danh: gọi khi vào chùa. Sang ngày mới thì làm mới nhiệm vụ & cập nhật chuỗi ngày. */
export function checkIn(s: DailyState, now: number): { state: DailyState; firstToday: boolean } {
  const today = vnDay(now);
  if (s.lastVisit === today) return { state: s, firstToday: false };
  const streak = s.lastVisit === prevDay(today) ? s.streak + 1 : 1;
  return { state: { day: today, lastVisit: today, streak, prog: {} }, firstToday: true };
}

export function questsDone(s: DailyState): number {
  return QUESTS.filter((q) => (s.prog[q.id] ?? 0) >= q.target).length;
}

/** Ghi nhận một việc vừa làm; trả về nhiệm vụ vừa hoàn thành (mỗi nhiệm vụ báo đúng 1 lần). */
export function record(s: DailyState, kind: FloatKind, now: number): { state: DailyState; completed: QuestId[]; allDone: boolean } {
  let state = s;
  if (state.day !== vnDay(now)) state = checkIn(state, now).state;
  const prog = { ...state.prog };
  const completed: QuestId[] = [];
  for (const q of QUESTS) {
    if (!q.kinds.includes(kind)) continue;
    const before = prog[q.id] ?? 0;
    prog[q.id] = before + 1;
    if (before < q.target && before + 1 >= q.target) completed.push(q.id);
  }
  const next = { ...state, prog };
  return { state: next, completed, allDone: completed.length > 0 && questsDone(next) === QUESTS.length };
}

export function loadDaily(storage: Storage | undefined = safe()): DailyState {
  try {
    const r = JSON.parse(storage?.getItem(KEY) ?? 'null');
    if (!r || typeof r !== 'object' || typeof r.day !== 'string' || typeof r.streak !== 'number') return emptyDaily();
    return { day: r.day, lastVisit: String(r.lastVisit ?? ''), streak: Math.max(0, Math.floor(r.streak)), prog: r.prog && typeof r.prog === 'object' ? r.prog : {} };
  } catch {
    return emptyDaily();
  }
}

export function saveDaily(s: DailyState, storage: Storage | undefined = safe()): void {
  try { storage?.setItem(KEY, JSON.stringify(s)); } catch { /* bỏ qua */ }
}

function safe(): Storage | undefined {
  try { return globalThis.localStorage; } catch { return undefined; }
}
