import * as THREE from 'three';
import { TOWER, TOWER_HALF, TOWER_RING } from '@vco/shared/world';
import { MAT } from './materials';
import { glowSprite } from './glow';

function mesh(g: THREE.BufferGeometry, m: THREE.Material, shadow = true) {
  const o = new THREE.Mesh(g, m);
  o.castShadow = shadow;
  o.receiveShadow = true;
  return o;
}

/** Mái tầng tháp: chóp bốn mặt dẹt, góc vểnh nhẹ. */
function tierRoof(half: number): THREE.Mesh {
  const geo = new THREE.ConeGeometry(half * Math.SQRT2 + 0.7, 0.9, 4, 1, true);
  geo.rotateY(Math.PI / 4);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) if (pos.getY(i) < 0) pos.setY(i, pos.getY(i) + 0.18); // vểnh mép
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x5a3426, roughness: 0.75, side: THREE.DoubleSide }));
  m.castShadow = true;
  return m;
}

/** Bảo tháp 7 tầng + lối đi nhiễu tháp lát đá + 4 đèn ở 4 góc. Trả về quầng sáng. */
export function buildTowerArea(root: THREE.Group): THREE.Sprite[] {
  const glows: THREE.Sprite[] = [];
  const g = new THREE.Group();
  g.position.set(TOWER.x, 0, TOWER.z);
  root.add(g);

  const plinth = mesh(new THREE.BoxGeometry(TOWER_HALF * 2 + 0.6, 0.5, TOWER_HALF * 2 + 0.6), MAT.stone);
  plinth.position.y = 0.25;
  g.add(plinth);
  let y = 0.5;
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xead2a0, roughness: 0.85 });
  for (let i = 0; i < 7; i++) {
    const half = TOWER_HALF * (1 - i * 0.1);
    const h = i === 0 ? 2.6 : 1.7;
    const wall = mesh(new THREE.BoxGeometry(half * 2, h, half * 2), wallMat);
    wall.position.y = y + h / 2;
    g.add(wall);
    // cửa vòm sơn son ở 4 mặt
    for (let k = 0; k < 4; k++) {
      const door = mesh(new THREE.BoxGeometry(half * 0.55, h * 0.6, 0.06), MAT.lacquer, false);
      const a = (k * Math.PI) / 2;
      door.position.set(Math.sin(a) * (half + 0.02), y + h * 0.42, Math.cos(a) * (half + 0.02));
      door.rotation.y = a;
      g.add(door);
    }
    y += h;
    const roof = tierRoof(half);
    roof.position.y = y + 0.3;
    g.add(roof);
    y += 0.45;
  }
  const spire = mesh(new THREE.ConeGeometry(0.3, 2.2, 8), MAT.gold);
  spire.position.y = y + 1.1;
  g.add(spire);
  for (let k = 0; k < 3; k++) {
    const ring = mesh(new THREE.TorusGeometry(0.32 - k * 0.06, 0.05, 6, 16), MAT.gold, false);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = y + 0.4 + k * 0.45;
    g.add(ring);
  }
  const top = glowSprite(0xffd36b, 2.2, 0.35);
  top.position.y = y + 2.4;
  g.add(top);
  glows.push(top);

  // lối đi vòng
  const path = mesh(new THREE.RingGeometry(TOWER_RING.inner - 0.2, TOWER_RING.outer - 1.2, 48), MAT.stone, false);
  path.rotation.x = -Math.PI / 2;
  path.position.y = 0.015;
  g.add(path);
  // đường nối từ hông chánh điện tới tháp
  for (const x of [-14, 14]) {
    const link = mesh(new THREE.PlaneGeometry(2.6, 22), MAT.stone, false);
    link.rotation.x = -Math.PI / 2;
    link.position.set(x * 0.75, 0.012, -36);
    link.rotation.z = Math.sign(x) * 0.45;
    root.add(link);
  }
  // đèn lồng 4 góc lối đi
  for (let k = 0; k < 4; k++) {
    const a = Math.PI / 4 + (k * Math.PI) / 2;
    const r = TOWER_RING.outer - 0.6;
    const post = mesh(new THREE.CylinderGeometry(0.08, 0.1, 2.4, 6), MAT.wood);
    post.position.set(Math.cos(a) * r, 1.2, Math.sin(a) * r);
    g.add(post);
    const lamp = mesh(new THREE.SphereGeometry(0.28, 10, 8), MAT.lantern, false);
    lamp.scale.y = 1.25;
    lamp.position.set(Math.cos(a) * r, 2.5, Math.sin(a) * r);
    g.add(lamp);
    const gl = glowSprite(0xff5a2a, 1.4, 0.45);
    gl.position.copy(lamp.position);
    g.add(gl);
    glows.push(gl);
  }
  return glows;
}
