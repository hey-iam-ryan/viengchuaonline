export const HALL_CAPACITY = 100;
export const HALL_COUNT = 100;
export const NET_HZ = 5;
export const MAX_MSG_BYTES = 512;
export const INCENSE_TTL_MS = 600_000;
export const INCENSE_MAX_PER_HALL = 60;
export const INCENSE_COOLDOWN_MS = 10_000;
export const LANTERN_TTL_MS = 600_000;
export const LANTERN_MAX_PER_HALL = 40;
export const LANTERN_COOLDOWN_MS = 15_000;
export const WISH_MAX_PER_HALL = 30;
export const WISH_COOLDOWN_MS = 30_000;
export const GREET_COOLDOWN_MS = 3_000;
/** Số bậc tu tập (0..RANK_COUNT-1). */
export const RANK_COUNT = 6;

/** Lời nguyện soạn sẵn — không cho gõ tự do để khỏi phải kiểm duyệt. */
export const PRAYERS: readonly { vi: string; en: string }[] = [
  { vi: 'Cầu cho gia đình bình an, mạnh khoẻ', en: 'Peace and health for my family' },
  { vi: 'Cầu cho cha mẹ sống lâu trăm tuổi', en: 'Long life for my parents' },
  { vi: 'Cầu siêu cho người thân đã khuất', en: 'Peaceful rest for loved ones who have passed' },
  { vi: 'Cầu cho công việc hanh thông, thuận lợi', en: 'Success and ease in my work' },
  { vi: 'Cầu cho học hành tấn tới, thi cử đỗ đạt', en: 'Progress in my studies and exams' },
  { vi: 'Cầu cho tâm an, buông bỏ phiền muộn', en: 'A calm mind, free of worries' },
  { vi: 'Cầu cho người bệnh sớm bình phục', en: 'Quick recovery for the sick' },
  { vi: 'Cầu cho tình duyên viên mãn', en: 'Love and harmony' },
  { vi: 'Cầu cho quốc thái dân an, mưa thuận gió hoà', en: 'Peace for the nation and good weather' },
  { vi: 'Cầu cho chúng sinh bớt khổ đau', en: 'Less suffering for all beings' },
];

export type Robe = 'lam' | 'nau' | 'trang' | 'vang';
export const ROBES: readonly Robe[] = ['lam', 'nau', 'trang', 'vang'];
export type Action = 'bow' | 'mo' | 'chuong' | 'beads' | 'cauan' | 'ca';
export const ACTIONS: readonly Action[] = ['bow', 'mo', 'chuong', 'beads', 'cauan', 'ca'];
export type BurnerId = 'hall' | 'yard';
export const BURNERS: readonly BurnerId[] = ['hall', 'yard'];

/** Bow = lạy sát đất khi ngồi bồ đoàn; Vai = vái khi đứng. */
export const Pose = { Stand: 0, Walk: 1, Sit: 2, Bow: 3, Vai: 4 } as const;
export type Pose = (typeof Pose)[keyof typeof Pose];

export interface PlayerState { id: string; n: string; r: Robe; x: number; z: number; ry: number; p: Pose; k?: number }
export interface Incense { b: BurnerId; at: number }
export interface Lantern { x: number; z: number; at: number; s: number }
export interface Wish { n: string; p: number; at: number }
export interface LeafMsg { id: number; x: number; z: number }

export type ClientMsg =
  | { t: 'hello'; name: string; robe: Robe; k: number }
  | { t: 's'; x: number; z: number; ry: number; p: Pose }
  | { t: 'a'; a: Action }
  | { t: 'inc'; b: BurnerId }
  | { t: 'den'; x: number; z: number }
  | { t: 'ng'; p: number }
  | { t: 'hi'; to: string }
  | { t: 'rk'; k: number }
  | { t: 'quet'; id: number };

export type ServerMsg =
  | { t: 'welcome'; id: string; hall: number; now: number; players: PlayerState[]; incense: Incense[]; lanterns: Lantern[]; wishes: Wish[]; leaves: LeafMsg[] }
  | { t: 'snap'; u: PlayerState[]; gone: string[] }
  | { t: 'act'; id: string; a: Action }
  | { t: 'inc'; i: Incense }
  | { t: 'den'; l: Lantern }
  | { t: 'ng'; w: Wish }
  | { t: 'hi'; from: string; to: string }
  | { t: 'la'; add?: LeafMsg[]; del?: number[]; by?: string }
  | { t: 'full' };

const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const oneOf = <T>(list: readonly T[], v: unknown): v is T => list.includes(v as T);
const decoder = new TextDecoder();
const isRank = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0 && (v as number) < RANK_COUNT;

export function parseClientMsg(raw: string | ArrayBuffer): ClientMsg | null {
  const size = typeof raw === 'string' ? raw.length : raw.byteLength;
  if (size > MAX_MSG_BYTES) return null;
  let m: any;
  try {
    m = JSON.parse(typeof raw === 'string' ? raw : decoder.decode(raw));
  } catch {
    return null;
  }
  if (!m || typeof m !== 'object') return null;
  switch (m.t) {
    case 'hello':
      return typeof m.name === 'string' && oneOf(ROBES, m.robe) ? { t: 'hello', name: m.name, robe: m.robe, k: isRank(m.k) ? m.k : 0 } : null;
    case 'quet':
      return Number.isInteger(m.id) && m.id >= 0 ? { t: 'quet', id: m.id } : null;
    case 'rk':
      return isRank(m.k) ? { t: 'rk', k: m.k } : null;
    case 's':
      return num(m.x) && num(m.z) && num(m.ry) && oneOf([0, 1, 2, 3, 4], m.p)
        ? { t: 's', x: m.x, z: m.z, ry: m.ry, p: m.p }
        : null;
    case 'a':
      return oneOf(ACTIONS, m.a) ? { t: 'a', a: m.a } : null;
    case 'inc':
      return oneOf(BURNERS, m.b) ? { t: 'inc', b: m.b } : null;
    case 'den':
      return num(m.x) && num(m.z) ? { t: 'den', x: m.x, z: m.z } : null;
    case 'hi':
      return typeof m.to === 'string' && m.to.length > 0 && m.to.length <= 16 ? { t: 'hi', to: m.to } : null;
    case 'ng':
      return Number.isInteger(m.p) && m.p >= 0 && m.p < PRAYERS.length ? { t: 'ng', p: m.p } : null;
    default:
      return null;
  }
}
