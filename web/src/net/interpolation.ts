export const RENDER_DELAY_MS = 200;
const MAX_SAMPLES = 10;
const TAU = Math.PI * 2;

const wrap = (a: number) => a - TAU * Math.floor((a + Math.PI) / TAU);

interface S { t: number; x: number; z: number; ry: number }

/** Hiển thị trễ 200ms, nội suy tuyến tính giữa các snapshot; ry theo đường ngắn nhất. */
export class Interp {
  private s: S[] = [];
  get size() { return this.s.length; }

  push(t: number, x: number, z: number, ry: number): void {
    this.s.push({ t, x, z, ry });
    if (this.s.length > MAX_SAMPLES) this.s.shift();
  }

  sample(t: number): { x: number; z: number; ry: number } | null {
    const s = this.s;
    if (!s.length) return null;
    const rt = t - RENDER_DELAY_MS;
    if (rt <= s[0].t) return { x: s[0].x, z: s[0].z, ry: s[0].ry };
    const end = s[s.length - 1];
    if (rt >= end.t) return { x: end.x, z: end.z, ry: end.ry };
    let i = s.length - 2;
    while (i > 0 && s[i].t > rt) i--;
    const a = s[i];
    const b = s[i + 1];
    const k = b.t === a.t ? 1 : (rt - a.t) / (b.t - a.t);
    return { x: a.x + (b.x - a.x) * k, z: a.z + (b.z - a.z) * k, ry: a.ry + wrap(b.ry - a.ry) * k };
  }
}
