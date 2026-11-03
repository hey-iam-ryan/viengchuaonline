import * as THREE from 'three';
import { BOUNDS, BRIDGE_HALF, ISLAND, LAKE, OUTER_GATE_Z, QUAN_AM, STONE_LANTERNS } from '@vco/shared/world';
import { MAT } from './materials';
import { glowSprite } from './glow';

const JADE = new THREE.MeshStandardMaterial({ color: 0xf4f1ea, roughness: 0.35, metalness: 0.05, emissive: 0x2a2a22, emissiveIntensity: 0.25 });
const STONE_DARK = new THREE.MeshStandardMaterial({ color: 0x7d766b, roughness: 0.95 });

function mesh(g: THREE.BufferGeometry, m: THREE.Material, shadow = true) {
  const o = new THREE.Mesh(g, m);
  o.castShadow = shadow;
  o.receiveShadow = true;
  return o;
}

/** Tượng Quan Âm đứng, cầm bình tịnh thuỷ, trên toà sen — nhìn về phía cầu (+x). Cao ~5m. */
function quanAm(): THREE.Group {
  const g = new THREE.Group();
  const base = mesh(new THREE.CylinderGeometry(1.3, 1.5, 0.8, 24), STONE_DARK);
  base.position.y = 0.4;
  g.add(base);
  const petals = new THREE.InstancedMesh(new THREE.SphereGeometry(0.4, 10, 8), MAT.lotus, 18);
  const m = new THREE.Matrix4();
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    m.compose(new THREE.Vector3(Math.cos(a) * 1.05, 1.0, Math.sin(a) * 1.05), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -a, 0.9)), new THREE.Vector3(0.5, 1, 0.75));
    petals.setMatrixAt(i, m);
  }
  g.add(petals);
  const robe = mesh(new THREE.LatheGeometry([[0, 0], [0.75, 0], [0.62, 1.2], [0.5, 2.3], [0.45, 2.9], [0.3, 3.15], [0, 3.2]].map(([x, y]) => new THREE.Vector2(x, y)), 24), JADE);
  robe.position.y = 1.05;
  g.add(robe);
  const veil = mesh(new THREE.ConeGeometry(0.55, 1.6, 20, 1, true), JADE);
  veil.position.set(0, 3.9, -0.05);
  g.add(veil);
  const head = mesh(new THREE.SphereGeometry(0.3, 20, 16), JADE);
  head.position.y = 4.55;
  head.scale.y = 1.12;
  g.add(head);
  const crown = mesh(new THREE.CylinderGeometry(0.16, 0.22, 0.3, 12), MAT.gold);
  crown.position.y = 4.95;
  g.add(crown);
  const vase = mesh(new THREE.LatheGeometry([[0, 0], [0.09, 0.02], [0.12, 0.12], [0.05, 0.28], [0.06, 0.34], [0, 0.34]].map(([x, y]) => new THREE.Vector2(x, y)), 12), JADE);
  vase.position.set(0.32, 3.2, 0.4);
  g.add(vase);
  const halo = mesh(new THREE.TorusGeometry(0.55, 0.04, 8, 40), MAT.gold, false);
  halo.position.set(0, 4.6, -0.35);
  g.add(halo);
  const glow = glowSprite(0xfff1c9, 3.2, 0.3);
  glow.position.set(0, 4.5, -0.2);
  g.add(glow);
  g.userData.glow = glow;
  g.rotation.y = Math.PI / 2; // nhìn về phía cầu (+x)
  return g;
}

function stoneLantern(): THREE.Group {
  const g = new THREE.Group();
  const parts: [THREE.BufferGeometry, number][] = [
    [new THREE.BoxGeometry(0.6, 0.2, 0.6), 0.1],
    [new THREE.CylinderGeometry(0.12, 0.15, 0.8, 8), 0.6],
    [new THREE.BoxGeometry(0.5, 0.45, 0.5), 1.2],
    [new THREE.ConeGeometry(0.5, 0.35, 4), 1.6],
  ];
  for (const [geo, y] of parts) {
    const o = mesh(geo, MAT.stone);
    o.position.y = y;
    if (geo instanceof THREE.ConeGeometry) o.rotation.y = Math.PI / 4;
    g.add(o);
  }
  const light = mesh(new THREE.BoxGeometry(0.3, 0.25, 0.52), new THREE.MeshBasicMaterial({ color: 0xffd38a }), false);
  light.position.y = 1.2;
  g.add(light);
  const glow = glowSprite(0xffc070, 1.3, 0.4);
  glow.position.y = 1.2;
  g.add(glow);
  g.userData.glow = glow;
  return g;
}

/** Hồ lớn + đảo + cầu đá + tượng Quan Âm; đường vào chùa có đèn đá; cổng ngoài. Trả về các quầng sáng để chỉnh theo ngày/đêm. */
export function buildLakeArea(root: THREE.Group): THREE.Sprite[] {
  const glows: THREE.Sprite[] = [];

  // mặt hồ & bờ đá
  const water = new THREE.Mesh(new THREE.PlaneGeometry(LAKE.maxX - LAKE.minX, LAKE.maxZ - LAKE.minZ), MAT.water);
  water.rotation.x = -Math.PI / 2;
  water.position.set((LAKE.minX + LAKE.maxX) / 2, 0.03, (LAKE.minZ + LAKE.maxZ) / 2);
  water.receiveShadow = true;
  root.add(water);
  const rim = 0.5;
  for (const [x0, x1, z0, z1] of [
    [LAKE.minX - rim, LAKE.maxX + rim, LAKE.minZ - rim, LAKE.minZ],
    [LAKE.minX - rim, LAKE.maxX + rim, LAKE.maxZ, LAKE.maxZ + rim],
    [LAKE.minX - rim, LAKE.minX, LAKE.minZ, LAKE.maxZ],
    [LAKE.maxX, LAKE.maxX + rim, LAKE.minZ, -BRIDGE_HALF],
    [LAKE.maxX, LAKE.maxX + rim, BRIDGE_HALF, LAKE.maxZ],
  ]) {
    const b = mesh(new THREE.BoxGeometry(x1 - x0, 0.35, z1 - z0), MAT.stone);
    b.position.set((x0 + x1) / 2, 0.17, (z0 + z1) / 2);
    root.add(b);
  }
  // lá sen trên hồ lớn
  const pads = new THREE.InstancedMesh(new THREE.CircleGeometry(0.55, 12), MAT.lilyPad, 60);
  const flat = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
  const mm = new THREE.Matrix4();
  let n = 0;
  for (let i = 0; i < 200 && n < 60; i++) {
    const x = LAKE.minX + 1 + ((i * 0.618) % 1) * (LAKE.maxX - LAKE.minX - 2);
    const z = LAKE.minZ + 1 + ((i * 0.377 + 0.11) % 1) * (LAKE.maxZ - LAKE.minZ - 2);
    const nearIsland = x > ISLAND.minX - 1 && x < ISLAND.maxX + 1 && z > ISLAND.minZ - 1 && z < ISLAND.maxZ + 1;
    const onBridge = x > ISLAND.maxX - 1 && Math.abs(z) < BRIDGE_HALF + 0.8;
    if (nearIsland || onBridge) continue;
    const sc = 0.7 + ((i * 0.53) % 1) * 0.8;
    pads.setMatrixAt(n++, mm.compose(new THREE.Vector3(x, 0.06, z), flat, new THREE.Vector3(sc, sc, sc)));
  }
  pads.count = n;
  root.add(pads);

  // đảo
  const island = mesh(new THREE.CylinderGeometry(5.2, 5.6, 0.4, 32), MAT.grass);
  island.scale.z = 0.85;
  island.position.set((ISLAND.minX + ISLAND.maxX) / 2, 0.1, 0);
  root.add(island);
  const plaza = mesh(new THREE.CylinderGeometry(3.2, 3.2, 0.06, 32), MAT.stone);
  plaza.position.set(QUAN_AM.x + 1, 0.32, 0);
  root.add(plaza);

  // cầu đá cong
  const bridgeLen = LAKE.maxX + rim - ISLAND.maxX + 1;
  const deck = new THREE.Group();
  const SEG = 14;
  for (let i = 0; i < SEG; i++) {
    const t = (i + 0.5) / SEG;
    const x = ISLAND.maxX - 0.5 + t * bridgeLen;
    const y = -0.02 + Math.sin(t * Math.PI) * 0.12; // vồng nhẹ: chân nhân vật (y=0) luôn trên mặt cầu
    const plank = mesh(new THREE.BoxGeometry(bridgeLen / SEG + 0.02, 0.18, BRIDGE_HALF * 2), STONE_DARK);
    plank.position.set(x, y, 0);
    plank.rotation.z = -Math.cos(t * Math.PI) * 0.03;
    deck.add(plank);
    for (const sz of [-1, 1]) {
      const post = mesh(new THREE.BoxGeometry(0.14, 0.6, 0.14), MAT.lacquer);
      post.position.set(x, y + 0.38, sz * (BRIDGE_HALF - 0.05));
      deck.add(post);
    }
  }
  root.add(deck);

  // tượng Quan Âm
  const qa = quanAm();
  qa.position.set(QUAN_AM.x, 0.3, QUAN_AM.z);
  root.add(qa);
  glows.push(qa.userData.glow);
  const bowl = new THREE.Group();
  bowl.position.set(QUAN_AM.x + 2.2, 0.32, 0);
  const incenseBowl = mesh(new THREE.CylinderGeometry(0.35, 0.25, 0.5, 14), MAT.bronze);
  incenseBowl.position.y = 0.55;
  const stand = mesh(new THREE.BoxGeometry(0.6, 0.3, 0.6), MAT.stone);
  stand.position.y = 0.15;
  bowl.add(stand, incenseBowl);
  root.add(bowl);

  // đường vào chùa (lát đá) + đèn đá
  const road = mesh(new THREE.PlaneGeometry(4.4, BOUNDS.maxZ - 19), MAT.stone, false);
  road.rotation.x = -Math.PI / 2;
  road.position.set(0, 0.012, (BOUNDS.maxZ + 19) / 2);
  root.add(road);
  for (const l of STONE_LANTERNS) {
    const o = stoneLantern();
    o.position.set(l.x, 0, l.z);
    root.add(o);
    glows.push(o.userData.glow);
  }

  // cổng ngoài
  for (const x of [-6, 6]) {
    const pil = mesh(new THREE.BoxGeometry(1.4, 3.6, 1), MAT.lacquer);
    pil.position.set(x, 1.8, OUTER_GATE_Z);
    root.add(pil);
    const cap = mesh(new THREE.BoxGeometry(1.7, 0.3, 1.3), MAT.roofEdge);
    cap.position.set(x, 3.75, OUTER_GATE_Z);
    root.add(cap);
  }
  const beam = mesh(new THREE.BoxGeometry(13.4, 0.5, 0.8), MAT.roof);
  beam.position.set(0, 4.1, OUTER_GATE_Z);
  root.add(beam);

  return glows;
}
