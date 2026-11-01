type Ch = 'sfx' | 'chant';
const CHANT_URL = `${import.meta.env.BASE_URL}audio/niem-phat.m4a`;

/**
 * Âm thanh: chuông, mõ, hạt, chuông gia trì đều tổng hợp bằng Web Audio (0 byte tải).
 * Niệm Phật: thử tải file (lazy), thiếu thì dùng vòng lặp tổng hợp (drone + mõ).
 * Trước unlock() (cử chỉ đầu tiên) mọi lệnh là no-op — yêu cầu của iOS Safari.
 */
export class AudioManager {
  private ctx: AudioContext | null = null;
  private gains: Partial<Record<Ch, GainNode>> = {};
  private vol: Record<Ch, number> = { sfx: 0.9, chant: 0.55 };
  private chantBuf: AudioBuffer | null = null;
  private chantSrc: AudioBufferSourceNode | null = null;
  private chantOn = false;
  private chantOffset = 0;

  get unlocked() { return !!this.ctx; }
  get chantPlaying() { return this.chantOn; }

  unlock(): void {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {}); return; }
    const Ctor: typeof AudioContext | undefined = (globalThis as any).AudioContext ?? (globalThis as any).webkitAudioContext;
    if (!Ctor) return;
    try {
      this.ctx = new Ctor();
      for (const ch of ['sfx', 'chant'] as Ch[]) {
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

  setVolume(ch: Ch, v: number): void {
    this.vol[ch] = v;
    if (this.gains[ch]) this.gains[ch]!.gain.value = v;
  }

  private tone(freq: number, dur: number, peak: number, type: OscillatorType = 'sine', at = 0) {
    const ctx = this.ctx!;
    const t = ctx.currentTime + at;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.gains.sfx!);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  /** Đại hồng chung: các hoạ âm không điều hoà, ngân dài. */
  playBell(volume = 1): void {
    if (!this.ctx) return;
    const f = 98;
    for (const [m, a, d] of [[1, 0.5, 9], [2.0, 0.3, 7], [2.76, 0.22, 5], [5.4, 0.12, 3], [8.9, 0.06, 1.6], [0.5, 0.25, 10]])
      this.tone(f * m, d, a * volume);
  }

  /** Mõ gỗ: "cốc" ngắn, trầm. */
  playMo(volume = 1): void {
    if (!this.ctx) return;
    this.tone(520, 0.16, 0.8 * volume, 'sine');
    this.tone(1040, 0.06, 0.25 * volume, 'triangle');
  }

  /** Chuông gia trì nhỏ khi lạy. */
  playChime(volume = 1): void {
    if (!this.ctx) return;
    this.tone(1318, 2.2, 0.25 * volume);
    this.tone(3410, 1.2, 0.08 * volume);
  }

  /** Tiếng hạt chuỗi lách cách. */
  playBead(volume = 1): void {
    if (!this.ctx) return;
    this.tone(2400 + Math.random() * 400, 0.04, 0.18 * volume, 'triangle');
  }

  async setChant(on: boolean): Promise<void> {
    this.chantOn = on;
    if (!this.ctx) return;
    if (!on) { this.stopChant(); return; }
    if (!this.chantBuf) this.chantBuf = (await this.loadChant()) ?? this.synthChant();
    if (this.chantOn && !this.chantSrc) this.startChant(this.chantOffset);
  }

  seekChant(offsetSec: number): void {
    this.chantOffset = Math.max(0, offsetSec);
    if (!this.ctx || !this.chantSrc || !this.chantBuf) return;
    this.stopChant();
    this.startChant(this.chantOffset);
  }

  private startChant(offset: number) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.chantBuf;
    src.loop = true;
    src.connect(this.gains.chant!);
    src.start(0, offset % this.chantBuf!.duration);
    this.chantSrc = src;
  }

  private stopChant() {
    try { this.chantSrc?.stop(); } catch { /* đã dừng */ }
    this.chantSrc?.disconnect();
    this.chantSrc = null;
  }

  private async loadChant(): Promise<AudioBuffer | null> {
    try {
      const res = await fetch(CHANT_URL);
      if (!res.ok) return null;
      return await this.ctx!.decodeAudioData(await res.arrayBuffer());
    } catch {
      return null;
    }
  }

  /** Vòng lặp 16 giây: nền trầm (drone) + mõ đều nhịp ~1 giây, tạo bằng code. */
  private synthChant(): AudioBuffer {
    const ctx = this.ctx!;
    const sr = ctx.sampleRate;
    const len = 16 * sr;
    const buf = ctx.createBuffer(1, len, sr);
    const d = buf.getChannelData(0);
    const TAU = Math.PI * 2;
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const swell = 0.6 + 0.4 * Math.sin((TAU * t) / 16);
      let s = 0.16 * Math.sin(TAU * 110 * t) + 0.09 * Math.sin(TAU * 164.8 * t) + 0.05 * Math.sin(TAU * 220 * t + Math.sin(TAU * 0.25 * t));
      s *= swell;
      const beat = t % 1;
      s += Math.exp(-beat * 38) * 0.55 * Math.sin(TAU * 520 * beat);
      d[i] = s * 0.8;
    }
    return buf;
  }
}
