import * as THREE from 'three';
import type { Occasion } from '@vco/shared/lunar';
import { glowSprite } from './glow';
import { MAT } from './materials';

/** Dây đèn lồng giăng ngang sân (ngày Rằm, mùng Một, lễ lớn) + cây mai vàng (Tết). */
export function buildFestive(scene: THREE.Scene) {
  const root = new THREE.Group();
  root.visible = false;
  scene.add(root);
  const glows: THREE.Sprite[] = [];

  // dây đèn: 4 dây ngang lối đi, mỗi dây 9 đèn, võng xuống ở giữa
  const PER = 9;
  const ROWS = [13, 7, 1, -5];
  const lanterns = new THREE.InstancedMesh(new THREE.SphereGeometry(0.2, 10, 8), MAT.lantern, PER * ROWS.length);
  const m = new THREE.Matrix4();
  const lineMat = new THREE.LineBasicMaterial({ color: 0x3b2219 });
  let i = 0;
  for (const z of ROWS) {
    const pts: THREE.Vector3[] = [];
    for (let k = 0; k <= 20; k++) {
      const x = -9 + (18 * k) / 20;
      pts.push(new THREE.Vector3(x, 4.6 - Math.sin((Math.PI * k) / 20) * 0.9, z));
    }
    root.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lineMat));
    for (let k = 1; k <= PER; k++) {
      const x = -9 + (18 * k) / (PER + 1);
      const y = 4.6 - Math.sin((Math.PI * k) / (PER + 1)) * 0.9 - 0.3;
      m.compose(new THREE.Vector3(x, y, z), new THREE.Quaternion(), new THREE.Vector3(1, 1.25, 1));
      lanterns.setMatrixAt(i++, m);
      if (k % 2 === 1) {
        const g = glowSprite(0xff5a2a, 0.75, 0.35);
        g.position.set(x, y, z);
        root.add(g);
        glows.push(g);
      }
    }
  }
  root.add(lanterns);

  // cây mai vàng (Tết) hai bên cửa chánh điện
  const mai = new THREE.Group();
  mai.visible = false;
  root.add(mai);
  const blossom = new THREE.MeshStandardMaterial({ color: 0xffd23f, emissive: 0x6a4a00, emissiveIntensity: 0.4, roughness: 0.6 });
  const pot = new THREE.MeshStandardMaterial({ color: 0x8e1c17, roughness: 0.5 });
  for (const x of [-5.2, 5.2]) {
    const tree = new THREE.Group();
    tree.position.set(x, 0, -8.6);
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.32, 0.6, 12), pot);
    p.position.y = 0.3;
    tree.add(p);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 1.6, 6), MAT.trunk);
    trunk.position.y = 1.3;
    tree.add(trunk);
    const flowers = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.07, 0), blossom, 90);
    for (let k = 0; k < 90; k++) {
      const a = k * 2.39996;
      const r = 0.25 + ((k * 0.37) % 1) * 0.6;
      m.makeTranslation(Math.cos(a) * r, 1.7 + ((k * 0.61) % 1) * 0.9, Math.sin(a) * r);
      flowers.setMatrixAt(k, m);
    }
    tree.add(flowers);
    mai.add(tree);
  }

  return {
    glows,
    setOccasion(o: Occasion | null) {
      root.visible = o !== null;
      mai.visible = o === 'tet';
    },
  };
}
