/** Giờ hiện tại theo giờ Việt Nam (0..24). */
export const vnHour = (ms: number) => (((ms / 3_600_000 + 7) % 24) + 24) % 24;

const smooth = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export interface Daylight {
  night: number; // 0 = ban ngày, 1 = đêm
  dusk: number; // 0..1, mạnh nhất lúc bình minh/hoàng hôn
  sky: number; // màu nền & sương
  sun: number; // cường độ nắng
  hemi: number; // ánh sáng môi trường
  sunY: number; // độ cao mặt trời (hướng nắng)
}

const mix = (c1: number, c2: number, t: number) => {
  const r = ((c1 >> 16) & 255) + (((c2 >> 16) & 255) - ((c1 >> 16) & 255)) * t;
  const g = ((c1 >> 8) & 255) + (((c2 >> 8) & 255) - ((c1 >> 8) & 255)) * t;
  const b = (c1 & 255) + ((c2 & 255) - (c1 & 255)) * t;
  return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);
};

const DAY = 0xf3d9b1;
const DUSK = 0xd98a62;
const NIGHT = 0x1d1c3b;

/** Ngày/đêm theo giờ VN: sáng 4h30–6h30, tối 17–19h. */
export function daylightAt(h: number): Daylight {
  h = ((h % 24) + 24) % 24;
  const night = h < 12 ? 1 - smooth(4.5, 6.5, h) : smooth(17, 19, h);
  const dusk = Math.max(0, 1 - Math.abs(night - 0.5) * 2) * (night > 0 && night < 1 ? 1 : 0);
  const base = mix(DAY, NIGHT, night);
  const sky = mix(base, DUSK, dusk * 0.6);
  return { night, dusk, sky, sun: 2.2 * (1 - night) + 0.55 * night, hemi: 1.1 * (1 - night) + 0.9 * night, sunY: 30 * (1 - night) + 8 };
}
