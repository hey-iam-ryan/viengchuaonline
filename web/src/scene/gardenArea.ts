import * as THREE from 'three';
import { BAMBOO, DRUM_TOWER, ZEN, ZONES } from '@vco/shared/world';
import { MAT, fadablePostMaterial } from './materials';

function mesh(g: THREE.BufferGeometry, m: THREE.Material, shadow = true) {
  const o = new THREE.Mesh(g, m);
  o.castShadow = shadow;
  o.receiveShadow = true;
  return o;
}

/** Lầu trống (đối xứng lầu chuông) + vườn thiền giữa rừng trúc. Trả về material cột lầu trống (để làm mờ khi đứng sát). */
export function buildGardenArea(root: THREE.Group): THREE.MeshStandardMaterial {
  // --- lầu trống ---
  const dt = DRUM_TOWER;
  const cx = (dt.minX + dt.maxX) / 2;
  const cz = (dt.minZ + dt.maxZ) / 2;
  const postMat = fadablePostMaterial();
  for (const [x, z] of [[dt.minX, dt.minZ], [dt.maxX, dt.minZ], [dt.minX, dt.maxZ], [dt.maxX, dt.maxZ]]) {
    const post = mesh(new THREE.CylinderGeometry(0.16, 0.18, 4, 10), postMat);
    post.position.set(x, 2, z);
    root.add(post);
  }
  const roof = mesh(new THREE.ConeGeometry(2.3, 1.2, 4), MAT.roof);
  roof.rotation.y = Math.PI / 4;
  roof.position.set(cx, 4.6, cz);
  root.add(roof);
  const base = mesh(new THREE.BoxGeometry(2.8, 0.15, 2.8), MAT.stone);
  base.position.set(cx, 0.07, cz);
  root.add(base);
  const drum = mesh(new THREE.CylinderGeometry(0.85, 0.85, 1.1, 24), new THREE.MeshStandardMaterial({ color: 0x9e2a1c, roughness: 0.5 }));
  drum.rotation.z = Math.PI / 2;
  drum.position.set(cx, 1.6, cz);
  root.add(drum);
  for (const sx of [-1, 1]) {
    const skin = mesh(new THREE.CircleGeometry(0.8, 24), new THREE.MeshStandardMaterial({ color: 0xe6cf9a, roughness: 0.8 }), false);
    skin.position.set(cx + sx * 0.56, 1.6, cz);
    skin.rotation.y = (sx * Math.PI) / 2;
    root.add(skin);
  }
  const stand = mesh(new THREE.BoxGeometry(1.4, 1.0, 0.25), MAT.wood);
  stand.position.set(cx, 0.55, cz);
  root.add(stand);

  // --- vườn thiền ---
  const sand = mesh(new THREE.CircleGeometry(ZEN.clearing + 1.5, 40), new THREE.MeshStandardMaterial({ color: 0xe8dcc2, roughness: 1 }), false);
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(ZEN.x, 0.012, ZEN.z);
  root.add(sand);
  for (let r = 1.6; r < ZEN.clearing + 1.2; r += 0.7) {
    const ring = mesh(new THREE.RingGeometry(r, r + 0.05, 64), new THREE.MeshStandardMaterial({ color: 0xcdbd9c, roughness: 1 }), false);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(ZEN.x, 0.016, ZEN.z);
    root.add(ring);
  }
  const center = mesh(new THREE.DodecahedronGeometry(0.9, 0), MAT.stone);
  center.scale.set(1, 0.6, 1);
  center.position.set(ZEN.x, 0.4, ZEN.z);
  root.add(center);
  const lotusPot = mesh(new THREE.CylinderGeometry(0.4, 0.3, 0.35, 12), MAT.bronze);
  lotusPot.position.set(ZEN.x, 0.9, ZEN.z);
  root.add(lotusPot);
  const seatMat = new THREE.MeshStandardMaterial({ color: 0x8a8578, roughness: 0.95 });
  for (const z of ZONES.filter((z) => z.kind === 'zen')) {
    const seat = mesh(new THREE.CylinderGeometry(0.5, 0.6, 0.18, 10), seatMat);
    seat.position.set(z.x, 0.09, z.z);
    root.add(seat);
  }
  // rừng trúc: mỗi cụm vài thân trúc cao
  const stalks: THREE.Matrix4[] = [];
  const leaves: THREE.Matrix4[] = [];
  const m = new THREE.Matrix4();
  BAMBOO.forEach((b, i) => {
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + i;
      const x = b.x + Math.cos(a) * 0.45;
      const z = b.z + Math.sin(a) * 0.45;
      const h = 5 + ((i * 7 + k * 3) % 5) * 0.6;
      const tilt = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.sin(a) * 0.06, 0, Math.cos(a) * 0.06));
      stalks.push(m.clone().compose(new THREE.Vector3(x, h / 2, z), tilt, new THREE.Vector3(1, h, 1)));
      leaves.push(m.clone().compose(new THREE.Vector3(x, h - 0.4, z), tilt, new THREE.Vector3(1.3, 1.6, 1.3)));
    }
  });
  const stalkMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.06, 0.08, 1, 6), new THREE.MeshStandardMaterial({ color: 0x7f9a3f, roughness: 0.7 }), stalks.length);
  stalks.forEach((mm, i) => stalkMesh.setMatrixAt(i, mm));
  const leafMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.6, 0), new THREE.MeshStandardMaterial({ color: 0x5e8a3a, roughness: 1, flatShading: true }), leaves.length);
  leaves.forEach((mm, i) => leafMesh.setMatrixAt(i, mm));
  stalkMesh.castShadow = leafMesh.castShadow = true;
  root.add(stalkMesh, leafMesh);
  // lối đi từ sân sang vườn thiền
  const path = mesh(new THREE.PlaneGeometry(ZEN.x - 20, 2.4), MAT.stone, false);
  path.rotation.x = -Math.PI / 2;
  path.position.set((ZEN.x + 20) / 2 - 3, 0.013, ZEN.z);
  root.add(path);
  return postMat;
}
