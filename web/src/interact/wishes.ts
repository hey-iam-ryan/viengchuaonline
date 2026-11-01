import * as THREE from 'three';
import { WISH_MAX_PER_HALL, type Wish } from '@vco/shared/protocol';
import { WISH_TREE } from '@vco/shared/world';

const RIBBON = new THREE.PlaneGeometry(0.09, 0.55);
RIBBON.translate(0, -0.27, 0);
const COLORS = [0xd22b1e, 0xe0a530, 0xc8962e, 0xb51f1a];

/** Dải lụa đỏ/vàng trên cây bồ đề, mỗi dải là một lời nguyện. */
export class WishTree {
  list: Wish[] = [];
  private ribbons: THREE.InstancedMesh;

  constructor(scene: THREE.Scene) {
    const mat = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.7 });
    this.ribbons = new THREE.InstancedMesh(RIBBON, mat, WISH_MAX_PER_HALL);
    this.ribbons.count = 0;
    const color = new THREE.Color();
    for (let i = 0; i < WISH_MAX_PER_HALL; i++) this.ribbons.setColorAt(i, color.setHex(COLORS[i % COLORS.length]));
    scene.add(this.ribbons);
  }

  add(w: Wish): void {
    this.list = [...this.list, w].slice(-WISH_MAX_PER_HALL);
    this.layout();
  }

  sync(list: Wish[]): void {
    this.list = list.slice(-WISH_MAX_PER_HALL);
    this.layout();
  }

  private layout() {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const s = WISH_TREE.s;
    this.list.forEach((w, i) => {
      const a = i * 2.39996; // góc vàng: rải đều quanh tán cây
      const r = (1.0 + (i % 3) * 0.4) * s; // treo dưới tán, ngoài thân cây
      const y = (2.0 + (i % 4) * 0.07) * s;
      q.setFromEuler(new THREE.Euler(0, -a, Math.sin(w.at) * 0.15));
      m.compose(new THREE.Vector3(WISH_TREE.x + Math.cos(a) * r, y, WISH_TREE.z + Math.sin(a) * r), q, new THREE.Vector3(1, 1, 1));
      this.ribbons.setMatrixAt(i, m);
    });
    this.ribbons.count = this.list.length;
    this.ribbons.instanceMatrix.needsUpdate = true;
  }

  update(now: number): void {
    this.ribbons.rotation.y = Math.sin(now / 4000) * 0.004; // gió nhẹ
  }
}
