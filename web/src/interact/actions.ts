import { GREET_COOLDOWN_MS, INCENSE_COOLDOWN_MS, LANTERN_COOLDOWN_MS, WISH_COOLDOWN_MS, Pose, type Action, type BurnerId, type ClientMsg } from '@vco/shared/protocol';
import { nearestZone } from '@vco/shared/world';
import type { LocalPlayer } from '../player/localPlayer';
import type { AudioManager } from './audio';
import type { IncenseField } from './incense';
import type { LanternField } from './lanterns';
import type { WishTree } from './wishes';
import type { LeafField } from './leafField';
import { SWEEP_RANGE } from '@vco/shared/leaves';
import type { FloatKind } from '../ui/floatText';
import { addBow, loadProgress, nextBead, saveProgress, type Progress } from '../state/progress';

const BELL_COOLDOWN_MS = 2500;

export interface ActionDeps {
  player: LocalPlayer;
  audio: Pick<AudioManager, 'playBell' | 'playMo' | 'playBead' | 'playChime'> & { playDrum?: () => void };
  incense: Pick<IncenseField, 'add'>;
  lanterns?: Pick<LanternField, 'add'>;
  wishes?: Pick<WishTree, 'add'>;
  leaves?: Pick<LeafField, 'nearest' | 'remove'>;
  fish?: { release(x: number, z: number, now: number): void };
  myName?: () => string;
  send: (m: ClientMsg) => void;
  now: () => number;
  storage?: Storage;
  onProgress?: (p: Progress, milestone: 3 | 108 | null) => void;
  onRoundDone?: (rounds: number) => void;
  /** Hành động thành công (để hiện chữ bay lên). */
  onPerform?: (kind: FloatKind) => void;
}

export interface Available { sit: boolean; bow: boolean; bell: boolean; mo: boolean; incense: BurnerId | null; lantern: boolean; wish: boolean; sweep: boolean; cauan: boolean; phongsinh: boolean; drum: boolean; zen: boolean }

export class Actions {
  progress: Progress;
  private lastIncense = -Infinity;
  private lastBell = -Infinity;
  private lastLantern = -Infinity;
  private lastWish = -Infinity;
  private lastGreet = -Infinity;
  private lastSweep = -Infinity;
  private lastCauAn = -Infinity;
  private lastFish = -Infinity;
  private lastDrum = -Infinity;

  constructor(private readonly d: ActionDeps) {
    this.progress = loadProgress(d.storage, d.now());
  }

  setProgress(p: Progress, milestone: 3 | 108 | null = null) {
    this.progress = p;
    saveProgress(p, this.d.storage);
    this.d.onProgress?.(p, milestone);
  }

  available(): Available {
    const p = this.d.player;
    const zone = nearestZone(p.x, p.z);
    const sitting = p.pose === Pose.Sit || p.pose === Pose.Bow;
    return {
      sit: zone?.kind === 'cushion' && !sitting,
      bow: p.pose === Pose.Sit || p.pose === Pose.Stand,
      bell: zone?.kind === 'bell',
      mo: zone?.kind === 'mo',
      incense: zone?.kind === 'burner' ? zone.burner ?? null : null,
      lantern: zone?.kind === 'pond',
      wish: zone?.kind === 'wish',
      sweep: !!this.d.leaves?.nearest(p.x, p.z, SWEEP_RANGE),
      cauan: zone?.kind === 'quanam',
      phongsinh: zone?.kind === 'phongsinh',
      drum: zone?.kind === 'drum',
      zen: zone?.kind === 'zen' && p.pose !== Pose.Sit,
    };
  }

  sit(): void {
    const zone = nearestZone(this.d.player.x, this.d.player.z);
    if (zone?.kind === 'cushion') this.d.player.sitAt(zone);
  }

  bow(): void {
    if (!this.d.player.bow()) return;
    const r = addBow(this.progress, this.d.now());
    this.setProgress(r.p, r.milestone);
    this.d.audio.playChime();
    this.d.send({ t: 'a', a: 'bow' });
    this.d.onPerform?.('bow');
  }

  bell(): void {
    const now = this.d.now();
    if (!this.available().bell || now - this.lastBell < BELL_COOLDOWN_MS) return;
    this.lastBell = now;
    this.d.audio.playBell();
    this.d.send({ t: 'a', a: 'chuong' });
    this.d.onPerform?.('bell');
  }

  mo(): void {
    if (!this.available().mo) return;
    this.d.audio.playMo();
    this.d.send({ t: 'a', a: 'mo' });
    this.d.onPerform?.('mo');
  }

  bead(): void {
    const r = nextBead(this.progress);
    this.setProgress(r.p);
    this.d.audio.playBead();
    this.d.onPerform?.('bead');
    if (r.roundDone) {
      this.d.send({ t: 'a', a: 'beads' });
      this.d.onRoundDone?.(r.p.beadRounds);
    }
  }

  lightIncense(): boolean {
    const b = this.available().incense;
    const now = this.d.now();
    if (!b || now - this.lastIncense < INCENSE_COOLDOWN_MS) return false;
    this.lastIncense = now;
    this.d.incense.add({ b, at: now });
    this.setProgress({ ...this.progress, incenseTotal: this.progress.incenseTotal + 1 });
    this.d.send({ t: 'inc', b });
    this.d.onPerform?.('incense');
    return true;
  }

  /** Thả đèn hoa đăng ở mép hồ gần người chơi. */
  lantern(): boolean {
    const now = this.d.now();
    if (!this.available().lantern || now - this.lastLantern < LANTERN_COOLDOWN_MS) return false;
    this.lastLantern = now;
    const p = this.d.player;
    const x = Math.round(p.x * 100) / 100;
    const z = Math.round((p.z - 1.2) * 100) / 100;
    this.d.lanterns?.add({ x, z, at: now, s: Math.floor(Math.random() * 1000) });
    this.d.send({ t: 'den', x, z });
    this.d.onPerform?.('lantern');
    return true;
  }

  wish(p: number): boolean {
    const now = this.d.now();
    if (!this.available().wish || now - this.lastWish < WISH_COOLDOWN_MS) return false;
    this.lastWish = now;
    this.d.wishes?.add({ n: this.d.myName?.() ?? '', p, at: now });
    this.d.send({ t: 'ng', p });
    return true;
  }

  /** Chắp tay chào một người: vái + gửi tin (server phát cho cả gian). */
  greet(to: string): boolean {
    const now = this.d.now();
    if (now - this.lastGreet < GREET_COOLDOWN_MS) return false;
    this.lastGreet = now;
    this.d.player.bow();
    this.d.send({ t: 'hi', to });
    return true;
  }

  /** Cầu an trước tượng Quan Âm: vái + chuông gia trì. */
  cauAn(): boolean {
    const now = this.d.now();
    if (!this.available().cauan || now - this.lastCauAn < 5_000) return false;
    this.lastCauAn = now;
    this.d.player.bow();
    this.d.audio.playChime();
    this.d.send({ t: 'a', a: 'cauan' });
    this.d.onPerform?.('cauan');
    return true;
  }

  /** Đánh trống ở lầu trống. */
  drum(): boolean {
    const now = this.d.now();
    if (!this.available().drum || now - this.lastDrum < 1500) return false;
    this.lastDrum = now;
    this.d.audio.playDrum?.();
    this.d.send({ t: 'a', a: 'trong' });
    this.d.onPerform?.('drum');
    return true;
  }

  /** Ngồi lên tảng đá thiền gần nhất. */
  sitZen(): boolean {
    const zone = nearestZone(this.d.player.x, this.d.player.z);
    if (zone?.kind !== 'zen') return false;
    this.d.player.sitAt(zone);
    return true;
  }

  /** Phóng sinh: thả cá chép xuống hồ lớn. */
  phongSinh(): boolean {
    const now = this.d.now();
    if (!this.available().phongsinh || now - this.lastFish < 15_000) return false;
    this.lastFish = now;
    this.d.fish?.release(this.d.player.x, this.d.player.z, now);
    this.d.send({ t: 'a', a: 'ca' });
    this.d.onPerform?.('fish');
    return true;
  }

  /** Quét chiếc lá gần nhất. */
  sweep(): boolean {
    const now = this.d.now();
    const p = this.d.player;
    const leaf = this.d.leaves?.nearest(p.x, p.z, SWEEP_RANGE);
    if (!leaf || now - this.lastSweep < 400) return false;
    this.lastSweep = now;
    this.d.leaves!.remove(leaf.id);
    this.setProgress({ ...this.progress, leavesTotal: this.progress.leavesTotal + 1 });
    this.d.send({ t: 'quet', id: leaf.id });
    this.d.onPerform?.('sweep');
    return true;
  }

  cooldownLeft(kind: 'lantern' | 'wish'): number {
    const now = this.d.now();
    return kind === 'lantern' ? Math.max(0, LANTERN_COOLDOWN_MS - (now - this.lastLantern)) : Math.max(0, WISH_COOLDOWN_MS - (now - this.lastWish));
  }

  incenseCooldownLeft(): number {
    return Math.max(0, INCENSE_COOLDOWN_MS - (this.d.now() - this.lastIncense));
  }

  onRemoteAction(_id: string, a: Action): void {
    if (a === 'chuong') this.d.audio.playBell(0.45);
    else if (a === 'mo') this.d.audio.playMo(0.35);
    else if (a === 'trong') this.d.audio.playDrum?.();
  }
}
