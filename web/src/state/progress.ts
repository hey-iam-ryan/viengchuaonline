import { ROBES, type Robe } from '@vco/shared/protocol';

export type Lang = 'vi' | 'en';
export interface Progress {
  bowsTotal: number;
  bowsToday: number;
  day: string; // YYYY-MM-DD theo giờ Việt Nam
  beadIndex: number; // 0..107
  beadRounds: number;
  incenseTotal: number;
  leavesTotal: number;
  name: string;
  robe: Robe;
  lang: Lang | null;
  music: boolean; // nhạc thiền nền
  chant: boolean; // gõ mõ tụng kinh (ngoài giờ lễ)
}

const KEY = 'vco.progress.v1';
export const BEADS = 108;

export const vnDay = (now: number) => new Date(now + 7 * 3_600_000).toISOString().slice(0, 10);

const defaults = (now: number): Progress => ({
  bowsTotal: 0, bowsToday: 0, day: vnDay(now), beadIndex: 0, beadRounds: 0, incenseTotal: 0, leavesTotal: 0,
  name: '', robe: 'lam', lang: null, music: true, chant: false,
});

const nat = (v: unknown, max = Number.MAX_SAFE_INTEGER) => (Number.isInteger(v) && (v as number) >= 0 && (v as number) <= max ? (v as number) : 0);

function safeStorage(): Storage | undefined {
  try { return globalThis.localStorage; } catch { return undefined; }
}

export function loadProgress(storage: Storage | undefined = safeStorage(), now = Date.now()): Progress {
  const d = defaults(now);
  let raw: any = null;
  try { raw = JSON.parse(storage?.getItem(KEY) ?? 'null'); } catch { raw = null; }
  if (!raw || typeof raw !== 'object') return d;
  const p: Progress = {
    bowsTotal: nat(raw.bowsTotal),
    bowsToday: nat(raw.bowsToday),
    day: typeof raw.day === 'string' ? raw.day : d.day,
    beadIndex: nat(raw.beadIndex, BEADS - 1),
    beadRounds: nat(raw.beadRounds),
    incenseTotal: nat(raw.incenseTotal),
    leavesTotal: nat(raw.leavesTotal),
    name: typeof raw.name === 'string' ? raw.name.slice(0, 64) : '',
    robe: ROBES.includes(raw.robe) ? raw.robe : 'lam',
    lang: raw.lang === 'vi' || raw.lang === 'en' ? raw.lang : null,
    music: raw.music !== false,
    chant: raw.chant === true,
  };
  if (p.day !== d.day) { p.day = d.day; p.bowsToday = 0; }
  return p;
}

export function saveProgress(p: Progress, storage: Storage | undefined = safeStorage()): void {
  try { storage?.setItem(KEY, JSON.stringify(p)); } catch { /* Safari private / đầy bộ nhớ */ }
}

export function addBow(p: Progress, now: number): { p: Progress; milestone: 3 | 108 | null } {
  const day = vnDay(now);
  const today = (day === p.day ? p.bowsToday : 0) + 1;
  const next = { ...p, day, bowsToday: today, bowsTotal: p.bowsTotal + 1 };
  return { p: next, milestone: today === 3 ? 3 : today === 108 ? 108 : null };
}

export function nextBead(p: Progress): { p: Progress; roundDone: boolean } {
  const idx = p.beadIndex + 1;
  if (idx >= BEADS) return { p: { ...p, beadIndex: 0, beadRounds: p.beadRounds + 1 }, roundDone: true };
  return { p: { ...p, beadIndex: idx }, roundDone: false };
}
