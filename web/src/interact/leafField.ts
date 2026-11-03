import * as THREE from 'three';
import { LEAF_EVERY_MS, spawnLeaves, type Leaf, type LeafState } from '@vco/shared/leaves';

const COLORS = [0xe0a43a, 0xd2873a, 0xf0c64e, 0xc96a2e];
const MAX = 40;

/** Lá rụng trên sân. Online: server quyết định; một mình: tự rụng theo cùng công thức. */
export class LeafField {
  private leaves: Leaf[] = [];
  private mesh: THREE.InstancedMesh;
  private flying: { leaf: Leaf; t: number }[] = [];
  private local: LeafState = { leaves: [], slot: -1 };
  private localMode = true;
  private dirty = true;

  constructor(scene: THREE.Scene) {
    const shape = new THREE.Shape();
    shape.moveTo(0, -0.24);
    shape.quadraticCurveTo(0.19, -0.03, 0, 0.24);
    shape.quadraticCurveTo(-0.19, -0.03, 0, -0.24);
    const geo = new THREE.ShapeGeometry(shape, 4);
    geo.rotateX(-Math.PI / 2);
    this.mesh = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ roughness: 0.8, side: THREE.DoubleSide, emissive: 0x5a3a10, emissiveIntensity: 0.35 }), MAX);
    const c = new THREE.Color();
    for (let i = 0; i < MAX; i++) this.mesh.setColorAt(i, c.setHex(COLORS[i % COLORS.length]));
    this.mesh.count = 0;
    this.mesh.receiveShadow = true;
    scene.add(this.mesh);
  }

  /** Online thì tắt tự rụng (server gửi lá); rớt mạng thì tự rụng tiếp ở máy. */
  setLocal(local: boolean): void {
    this.localMode = local;
    if (local) { this.local = { leaves: [...this.leaves], slot: this.local.slot }; }
  }

  sync(list: Leaf[]): void { this.leaves = [...list]; this.dirty = true; }
  add(list: Leaf[]): void {
    const have = new Set(this.leaves.map((l) => l.id));
    this.leaves.push(...list.filter((l) => !have.has(l.id)));
    this.dirty = true;
  }
  remove(id: number): void {
    const l = this.leaves.find((x) => x.id === id);
    if (!l) return;
    this.leaves = this.leaves.filter((x) => x.id !== id);
    if (this.localMode) this.local.leaves = this.local.leaves.filter((x) => x.id !== id);
    this.flying.push({ leaf: l, t: 0 });
    this.dirty = true;
  }

  nearest(x: number, z: number, max: number): Leaf | null {
    let best: Leaf | null = null;
    let bd = max;
    for (const l of this.leaves) {
      const d = Math.hypot(l.x - x, l.z - z);
      if (d <= bd) { best = l; bd = d; }
    }
    return best;
  }

  update(dt: number, now: number): void {
    if (this.localMode && Math.floor(now / LEAF_EVERY_MS) > this.local.slot) {
      const sp = spawnLeaves(this.local, -1, now);
      this.local = sp.state;
      if (sp.added.length) this.add(sp.added);
    }
    for (const f of this.flying) f.t += dt;
    const before = this.flying.length;
    this.flying = this.flying.filter((f) => f.t < 0.8);
    if (!this.dirty && !this.flying.length && before === 0) return;
    this.dirty = false;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    let i = 0;
    for (const l of this.leaves) {
      if (i >= MAX) break;
      q.setFromEuler(new THREE.Euler(0, (l.id * 2.39996) % (Math.PI * 2), 0));
      m.compose(new THREE.Vector3(l.x, 0.025, l.z), q, new THREE.Vector3(1, 1, 1));
      this.mesh.setMatrixAt(i++, m);
    }
    for (const f of this.flying) {
      if (i >= MAX) break;
      const k = f.t / 0.8;
      q.setFromEuler(new THREE.Euler(k * 6, (f.leaf.id * 2.39996) % 6 + k * 8, k * 3));
      const s = 1 - k;
      m.compose(new THREE.Vector3(f.leaf.x + k * 0.6, 0.03 + Math.sin(k * Math.PI) * 1.2, f.leaf.z - k * 0.4), q, new THREE.Vector3(s, s, s));
      this.mesh.setMatrixAt(i++, m);
    }
    this.mesh.count = i;
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
