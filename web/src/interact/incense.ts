import * as THREE from 'three';
import { INCENSE_MAX_PER_HALL, INCENSE_TTL_MS, type BurnerId, type Incense } from '@vco/shared/protocol';

const STICK_GEO = new THREE.CylinderGeometry(0.012, 0.012, 0.42, 4);
STICK_GEO.translate(0, 0.21, 0);
const STICK_MAT = new THREE.MeshStandardMaterial({ color: 0xa8322a, roughness: 0.8 });
const EMBER_MAT = new THREE.MeshBasicMaterial({ color: 0xff5a1e });
const EMBER_GEO = new THREE.SphereGeometry(0.018, 6, 4);
const PUFFS_PER_BUNDLE = 6;

function smokeTexture(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,0.75)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

interface Bundle { i: Incense; group: THREE.Group; seed: number }

/** Bó 3 nén hương cắm trên lư hương, có khói bay; tự tắt sau INCENSE_TTL_MS. */
export class IncenseField {
  private bundles: Bundle[] = [];
  private smoke: THREE.Points;
  private smokePos: Float32Array;
  private readonly maxPuffs = INCENSE_MAX_PER_HALL * PUFFS_PER_BUNDLE;

  constructor(private readonly scene: THREE.Scene, private readonly burners: Record<BurnerId, THREE.Vector3>) {
    this.smokePos = new Float32Array(this.maxPuffs * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.smokePos, 3));
    geo.setDrawRange(0, 0);
    this.smoke = new THREE.Points(
      geo,
      new THREE.PointsMaterial({ size: 0.35, map: smokeTexture(), transparent: true, opacity: 0.45, depthWrite: false, color: 0xe9e4dc }),
    );
    this.smoke.frustumCulled = false;
    scene.add(this.smoke);
  }

  add(i: Incense): void {
    const base = this.burners[i.b];
    if (!base) return;
    const seed = Math.random();
    const group = new THREE.Group();
    const n = this.bundles.filter((b) => b.i.b === i.b).length;
    const a = seed * Math.PI * 2;
    const r = Math.min(0.32, 0.06 + (n % 8) * 0.04) * (i.b === 'yard' ? 1.3 : 0.75);
    group.position.set(base.x + Math.cos(a) * r, base.y, base.z + Math.sin(a) * r);
    for (let k = 0; k < 3; k++) {
      const s = new THREE.Mesh(STICK_GEO, STICK_MAT);
      s.position.x = (k - 1) * 0.035;
      s.rotation.z = (k - 1) * 0.12;
      const e = new THREE.Mesh(EMBER_GEO, EMBER_MAT);
      e.position.y = 0.42;
      s.add(e);
      group.add(s);
    }
    this.scene.add(group);
    this.bundles.push({ i, group, seed });
    while (this.bundles.length > INCENSE_MAX_PER_HALL) this.remove(0);
  }

  /** Đồng bộ toàn bộ danh sách (vd. từ welcome). */
  sync(list: Incense[], now: number): void {
    while (this.bundles.length) this.remove(0);
    for (const i of list) if (now - i.at < INCENSE_TTL_MS) this.add(i);
  }

  private remove(idx: number) {
    const [b] = this.bundles.splice(idx, 1);
    this.scene.remove(b.group);
  }

  update(_dt: number, now: number): void {
    for (let k = this.bundles.length - 1; k >= 0; k--) if (now - this.bundles[k].i.at >= INCENSE_TTL_MS) this.remove(k);
    const t = now / 1000;
    let n = 0;
    for (const b of this.bundles) {
      const life = 1 - (now - b.i.at) / INCENSE_TTL_MS; // nhang cháy ngắn dần
      b.group.scale.y = 0.35 + 0.65 * life;
      for (let p = 0; p < PUFFS_PER_BUNDLE; p++) {
        const phase = (t * 0.35 + p / PUFFS_PER_BUNDLE + b.seed) % 1;
        const o = n * 3;
        this.smokePos[o] = b.group.position.x + Math.sin(t * 1.3 + p + b.seed * 9) * 0.08 * (1 + phase * 3);
        this.smokePos[o + 1] = b.group.position.y + 0.42 * b.group.scale.y + phase * 1.6;
        this.smokePos[o + 2] = b.group.position.z + Math.cos(t * 1.1 + p) * 0.06 * (1 + phase * 3);
        n++;
      }
    }
    const geo = this.smoke.geometry;
    geo.setDrawRange(0, n);
    (geo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  }
}
