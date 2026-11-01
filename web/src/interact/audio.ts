import { BEAT_MS, MUSIC_TRACKS, Playlist, beatsBetween, isBellBeat } from './soundtrack';

type Ch = 'sfx' | 'chant' | 'music';
const LOOKAHEAD_MS = 300;

/**
 * Ba kênh: sfx (chuông, mõ, hạt khi bấm), chant (gõ mõ tụng kinh đều nhịp, đồng bộ theo giờ server),
 * music (nhạc thiền nền, phát lần lượt, tải lazy từng bài).
 * Trước unlock() (cử chỉ đầu tiên) mọi lệnh là no-op — yêu cầu của iOS Safari.
 */
export class AudioManager {
  private ctx: AudioContext | null = null;
  private gains: Partial<Record<Ch, GainNode>> = {};
  private vol: Record<Ch, number> = { sfx: 0.9, chant: 0.7, music: 0.45 };
  private noise: AudioBuffer | null = null;
  private offsetMs = 0;
  private chantTimer: ReturnType<typeof setInterval> | null = null;
  private chantUntil = 0;
  private musicEl: HTMLAudioElement | null = null;
  private playlist = new Playlist(MUSIC_TRACKS);
  private wantMusic = false;
  private wantChant = false;

  get unlocked() { return !!this.ctx; }
  get musicOn() { return this.wantMusic; }
  get chantOn() { return this.wantChant; }

  constructor() {
    if (typeof document !== 'undefined')
      document.addEventListener('visibilitychange', () => {
        if (!this.musicEl) return;
        if (document.hidden) this.musicEl.pause();
        else if (this.wantMusic) this.musicEl.play().catch(() => {});
      });
  }

  unlock(): void {
    if (this.ctx) { if (this.ctx.state !== 'running') this.ctx.resume().catch(() => {}); return; } // iOS: 'interrupted' sau khi khoá màn hình
    const Ctor: typeof AudioContext | undefined = (globalThis as any).AudioContext ?? (globalThis as any).webkitAudioContext;
    if (!Ctor) return;
    try {
      this.ctx = new Ctor();
      for (const ch of ['sfx', 'chant', 'music'] as Ch[]) {
        const g = this.ctx.createGain();
        g.gain.value = this.vol[ch];
        g.connect(this.ctx.destination);
        this.gains[ch] = g;
      }
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    } catch {
      this.ctx = null;
    }
  }

  /** Độ lệch giờ server − giờ máy, để nhịp mõ của mọi người khớp nhau. */
  setServerOffset(ms: number): void { this.offsetMs = ms; }

  setVolume(ch: Ch, v: number): void {
    this.vol[ch] = v;
    if (this.gains[ch]) this.gains[ch]!.gain.value = v;
  }

  private tone(freq: number, dur: number, peak: number, type: OscillatorType = 'sine', at = 0, ch: Ch = 'sfx', drop = 1) {
    const ctx = this.ctx!;
    const t = ctx.currentTime + Math.max(0, at);
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq * drop, t);
    if (drop !== 1) o.frequency.exponentialRampToValueAtTime(freq, t + 0.03);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.gains[ch]!);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  private click(at: number, ch: Ch, peak: number) {
    const ctx = this.ctx!;
    if (!this.noise) {
      this.noise = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.05), ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (d.length / 6));
    }
    const t = ctx.currentTime + Math.max(0, at);
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1700;
    bp.Q.value = 3;
    const g = ctx.createGain();
    g.gain.value = peak;
    src.connect(bp).connect(g).connect(this.gains[ch]!);
    src.start(t);
  }

  /** Mõ gỗ: "cốc" trầm, có tiếng gõ gỗ ngắn. */
  private mo(at: number, ch: Ch, volume: number) {
    this.tone(520, 0.18, 0.85 * volume, 'sine', at, ch, 1.6);
    this.tone(1160, 0.07, 0.22 * volume, 'triangle', at, ch, 1.3);
    this.click(at, ch, 0.35 * volume);
  }

  /** Đại hồng chung: các hoạ âm không điều hoà, ngân dài. */
  private bigBell(at: number, ch: Ch, volume: number) {
    const f = 98;
    for (const [m, a, d] of [[1, 0.5, 9], [2.0, 0.3, 7], [2.76, 0.22, 5], [5.4, 0.12, 3], [8.9, 0.06, 1.6], [0.5, 0.25, 10]])
      this.tone(f * m, d, a * volume, 'sine', at, ch);
  }

  /** Chuông gia trì nhỏ. */
  private smallBell(at: number, ch: Ch, volume: number) {
    this.tone(1318, 2.4, 0.25 * volume, 'sine', at, ch);
    this.tone(3410, 1.2, 0.08 * volume, 'sine', at, ch);
    this.tone(659, 2.8, 0.12 * volume, 'sine', at, ch);
  }

  playBell(volume = 1): void { if (this.ctx) this.bigBell(0, 'sfx', volume); }
  playMo(volume = 1): void { if (this.ctx) this.mo(0, 'sfx', volume); }
  playChime(volume = 1): void { if (this.ctx) this.smallBell(0, 'sfx', volume); }
  playBead(volume = 1): void { if (this.ctx) this.tone(2400 + Math.random() * 400, 0.04, 0.18 * volume, 'triangle'); }

  /** Gõ mõ tụng kinh đều nhịp trên lưới thời gian chung + chuông mỗi 24 nhịp. */
  async setChant(on: boolean): Promise<void> {
    this.wantChant = on;
    if (!this.ctx) return;
    if (!on) {
      if (this.chantTimer) clearInterval(this.chantTimer);
      this.chantTimer = null;
      return;
    }
    if (this.chantTimer) return;
    this.chantUntil = Date.now() + this.offsetMs;
    const tick = () => {
      const now = Date.now() + this.offsetMs;
      const until = now + LOOKAHEAD_MS;
      for (const b of beatsBetween(Math.max(this.chantUntil, now), until, BEAT_MS)) {
        const at = (b.atMs - now) / 1000;
        this.mo(at, 'chant', 0.8);
        if (isBellBeat(b.index)) this.smallBell(at, 'chant', 0.9);
      }
      this.chantUntil = until;
    };
    tick();
    this.chantTimer = setInterval(tick, 100);
  }

  /** Nhạc thiền nền: phát lần lượt các bài, hết thì quay lại bài đầu. */
  async setMusic(on: boolean): Promise<void> {
    this.wantMusic = on;
    if (!this.ctx) return;
    if (!on) { this.musicEl?.pause(); return; }
    if (!this.musicEl) {
      const el = new Audio();
      el.preload = 'auto';
      el.src = `${import.meta.env.BASE_URL}${this.playlist.current().file}`;
      el.addEventListener('ended', () => {
        el.src = `${import.meta.env.BASE_URL}${this.playlist.next().file}`;
        if (this.wantMusic) el.play().catch(() => {});
      });
      el.addEventListener('error', () => {
        // bài lỗi/thiếu → thử bài tiếp theo sau một lúc
        setTimeout(() => {
          el.src = `${import.meta.env.BASE_URL}${this.playlist.next().file}`;
          if (this.wantMusic) el.play().catch(() => {});
        }, 3000);
      });
      try {
        // qua Web Audio để chỉnh âm lượng được trên iOS (iOS bỏ qua el.volume)
        this.ctx.createMediaElementSource(el).connect(this.gains.music!);
      } catch {
        el.volume = this.vol.music;
      }
      this.musicEl = el;
    }
    try { await this.musicEl.play(); } catch { /* trình duyệt chặn: sẽ thử lại ở lần chạm sau */ }
  }
}
