import * as THREE from 'three';
import { LANTERN_TTL_MS, type Lantern } from '@vco/shared/protocol';
import { POND } from '@vco/shared/world';
import { glowSprite } from '../scene/glow';

const M = 0.25;
const clampX = (x: number) => Math.max(POND.minX + M, Math.min(POND.maxX - M, x));
const clampZ = (z: number) => Math.max(POND.minZ + M, Math.min(POND.maxZ - M, z));

/** Đèn trôi chậm theo vòng lượn (xác định theo seed) nên mọi người thấy giống nhau, luôn trong hồ. */
export function lanternPos(l: Lantern, now: number): { x: number; z: number } {
  const t = (now - l.at) / 1000;
  const a = (l.s % 360) * (Math.PI / 180);
  const r = 0.6 + (l.s % 7) * 0.12;
  const w = 0.025 + (l.s % 5) * 0.004;
  return { x: clampX(l.x + Math.cos(a + t * w) * r - Math.cos(a) * r), z: clampZ(l.z + Math.sin(a + t * w) * r * 0.8 - Math.sin(a) * r * 0.8) };
}

const PETAL = new THREE.ConeGeometry(0.22, 0.22, 8, 1, true);
const BASE = new THREE.CylinderGeometry(0.2, 0.24, 0.06, 10);
const CANDLE = new THREE.SphereGeometry(0.05, 6, 6);
const PETAL_MAT = new THREE.MeshStandardMaterial({ color: 0xf6b3c4, emissive: 0xff7a5a, emissiveIntensity: 0.35, side: THREE.DoubleSide, roughness: 0.6 });
const BASE_MAT = new THREE.MeshStandardMaterial({ color: 0x5f8a3e, roughness: 0.9 });
const FLAME_MAT = new THREE.MeshBasicMaterial({ color: 0xffd27a });

interface Item { l: Lantern; g: THREE.Group }

/** Đèn hoa đăng trên hồ sen. */
export class LanternField {
  private items: Item[] = [];
  readonly glows: THREE.Sprite[] = [];
  constructor(private readonly scene: THREE.Scene) {}

  add(l: Lantern): void {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(BASE, BASE_MAT));
    const p = new THREE.Mesh(PETAL, PETAL_MAT);
    p.position.y = 0.13;
    g.add(p);
    const f = new THREE.Mesh(CANDLE, FLAME_MAT);
    f.position.y = 0.2;
    g.add(f);
    const glow = glowSprite(0xffb35a, 1.1, 0.55);
    glow.position.y = 0.25;
    g.add(glow);
    this.glows.push(glow);
    this.scene.add(g);
    this.items.push({ l, g });
    if (this.items.length > 40) this.remove(0);
  }

  sync(list: Lantern[], now: number): void {
    while (this.items.length) this.remove(0);
    for (const l of list) if (now - l.at < LANTERN_TTL_MS) this.add(l);
  }

  private remove(i: number) {
    const [it] = this.items.splice(i, 1);
    this.scene.remove(it.g);
    const gi = this.glows.findIndex((s) => s.parent === it.g);
    if (gi >= 0) this.glows.splice(gi, 1);
  }

  update(now: number): void {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      const age = now - it.l.at;
      if (age >= LANTERN_TTL_MS) { this.remove(i); continue; }
      const p = lanternPos(it.l, now);
      it.g.position.set(p.x, 0.04 + Math.sin(now / 900 + it.l.s) * 0.015, p.z);
      it.g.rotation.y = now / 9000 + it.l.s;
      const fade = Math.min(1, (LANTERN_TTL_MS - age) / 30_000);
      it.g.scale.setScalar(Math.max(0.01, fade));
    }
  }
}
