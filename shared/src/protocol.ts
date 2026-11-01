export const HALL_CAPACITY = 100;
export const HALL_COUNT = 100;
export const NET_HZ = 5;
export const MAX_MSG_BYTES = 512;
export const INCENSE_TTL_MS = 600_000;
export const INCENSE_MAX_PER_HALL = 60;
export const INCENSE_COOLDOWN_MS = 10_000;

export type Robe = 'lam' | 'nau' | 'trang' | 'vang';
export const ROBES: readonly Robe[] = ['lam', 'nau', 'trang', 'vang'];
export type Action = 'bow' | 'mo' | 'chuong' | 'beads';
export const ACTIONS: readonly Action[] = ['bow', 'mo', 'chuong', 'beads'];
export type BurnerId = 'hall' | 'yard';
export const BURNERS: readonly BurnerId[] = ['hall', 'yard'];

export const Pose = { Stand: 0, Walk: 1, Sit: 2, Bow: 3 } as const;
export type Pose = (typeof Pose)[keyof typeof Pose];

export interface PlayerState { id: string; n: string; r: Robe; x: number; z: number; ry: number; p: Pose }
export interface Incense { b: BurnerId; at: number }

export type ClientMsg =
  | { t: 'hello'; name: string; robe: Robe }
  | { t: 's'; x: number; z: number; ry: number; p: Pose }
  | { t: 'a'; a: Action }
  | { t: 'inc'; b: BurnerId };

export type ServerMsg =
  | { t: 'welcome'; id: string; hall: number; now: number; players: PlayerState[]; incense: Incense[] }
  | { t: 'snap'; u: PlayerState[]; gone: string[] }
  | { t: 'act'; id: string; a: Action }
  | { t: 'inc'; i: Incense }
  | { t: 'full' };

const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const oneOf = <T>(list: readonly T[], v: unknown): v is T => list.includes(v as T);
const decoder = new TextDecoder();

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
      return typeof m.name === 'string' && oneOf(ROBES, m.robe) ? { t: 'hello', name: m.name, robe: m.robe } : null;
    case 's':
      return num(m.x) && num(m.z) && num(m.ry) && oneOf([0, 1, 2, 3], m.p)
        ? { t: 's', x: m.x, z: m.z, ry: m.ry, p: m.p }
        : null;
    case 'a':
      return oneOf(ACTIONS, m.a) ? { t: 'a', a: m.a } : null;
    case 'inc':
      return oneOf(BURNERS, m.b) ? { t: 'inc', b: m.b } : null;
    default:
      return null;
  }
}
