import * as THREE from 'three';

const std = (color: number, opts: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0, ...opts });

/** Bảng màu chùa Việt: son đỏ, vàng thếp, ngói nâu, tường vàng đất, đá xám ấm. */
export const MAT = {
  ground: std(0xb9a27c, { roughness: 1 }),
  grass: std(0x7f9a55, { roughness: 1 }),
  wall: std(0xe8c27a),
  wallInner: std(0xc98f4a),
  lacquer: std(0x8e1c17, { roughness: 0.45 }),
  wood: std(0x6b3a1f, { roughness: 0.7 }),
  roof: std(0x5a3426, { roughness: 0.75 }),
  roofEdge: std(0x3b2219, { roughness: 0.7 }),
  gold: std(0xd6a640, { roughness: 0.32, metalness: 0.85, emissive: 0x3a2400, emissiveIntensity: 0.35 }),
  bronze: std(0x6e4a26, { roughness: 0.45, metalness: 0.7 }),
  stone: std(0x9b9284, { roughness: 0.95 }),
  water: std(0x3f7a74, { roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.9 }),
  lilyPad: std(0x4f7d3a, { roughness: 0.9, side: THREE.DoubleSide }),
  lotus: std(0xf2a6b8, { roughness: 0.6 }),
  cushion: std(0xc8962e, { roughness: 0.9 }),
  lantern: std(0xd22b1e, { emissive: 0xff3a1a, emissiveIntensity: 0.8, roughness: 0.6 }),
  leaf: std(0x4f7a3a, { roughness: 1, flatShading: true }),
  trunk: std(0x5a4030, { roughness: 1 }),
  floor: std(0x7a4b2a, { roughness: 0.6 }),
} as const;

/** Gạch sân: texture canvas tạo bằng code (0 byte tải). */
export function tileTexture(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  g.fillStyle = '#b8a07a';
  g.fillRect(0, 0, 128, 128);
  for (let y = 0; y < 4; y++)
    for (let x = 0; x < 4; x++) {
      const v = 165 + ((x * 7 + y * 13) % 5) * 6;
      g.fillStyle = `rgb(${v},${v - 18},${v - 50})`;
      g.fillRect(x * 32 + 1, y * 32 + 1, 30, 30);
    }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** Bản sao material cột sơn son, bật trong suốt để làm mờ khi người chơi đứng sát (cột lầu chuông, lầu trống). */
export function fadablePostMaterial(): THREE.MeshStandardMaterial {
  const m = (MAT.lacquer as THREE.MeshStandardMaterial).clone();
  m.transparent = true;
  return m;
}
