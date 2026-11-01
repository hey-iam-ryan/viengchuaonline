import * as THREE from 'three';
import type { BurnerId } from '@vco/shared/protocol';
import {
  ALTAR, BELL_TOWER, BOUNDS, GATE_PILLARS, HALL, HALL_BURNER, MO_STAND, OBSTACLES, POND, TREES, YARD_BURNER, ZONES, type Box,
} from '@vco/shared/world';
import { MAT, tileTexture } from './materials';

export interface Temple {
  burners: Record<BurnerId, THREE.Vector3>;
  bell: THREE.Object3D;
  mo: THREE.Object3D;
  statue: THREE.Object3D;
}

const HALL_WALL_H = 4.2;

function mesh(geo: THREE.BufferGeometry, mat: THREE.Material, shadow = true): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = shadow;
  m.receiveShadow = true;
  return m;
}

function boxMesh(b: Box, y0: number, h: number, mat: THREE.Material): THREE.Mesh {
  const m = mesh(new THREE.BoxGeometry(b.maxX - b.minX, h, b.maxZ - b.minZ), mat);
  m.position.set((b.minX + b.maxX) / 2, y0 + h / 2, (b.minZ + b.maxZ) / 2);
  return m;
}

function textPlaque(text: string, w: number, h: number): THREE.Mesh {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = Math.round((512 * h) / w);
  const g = c.getContext('2d')!;
  g.fillStyle = '#7a1410';
  g.fillRect(0, 0, c.width, c.height);
  g.strokeStyle = '#e0b24a';
  g.lineWidth = 10;
  g.strokeRect(8, 8, c.width - 16, c.height - 16);
  g.fillStyle = '#f2c95a';
  g.font = `bold ${Math.round(c.height * 0.5)}px "Times New Roman", serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, c.width / 2, c.height / 2 + 4);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return mesh(new THREE.BoxGeometry(w, h, 0.12), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 }), false);
}

/**
 * Mái cong kiểu chùa Việt: mặt cắt lõm, đầu đao cong vút ở 4 góc, bờ nóc có ngọc.
 * length chạy theo trục x, depth theo z. Gốc toạ độ: tâm mép mái dưới.
 */
function curvedRoof(length: number, depth: number, height: number, overhang = 1.2): THREE.Group {
  const g = new THREE.Group();
  const d = depth / 2 + overhang;
  const lift = 0.45;
  const t = 0.28;
  const s = new THREE.Shape();
  s.moveTo(-d, lift);
  s.quadraticCurveTo(-d * 0.42, height * 0.18, 0, height);
  s.quadraticCurveTo(d * 0.42, height * 0.18, d, lift);
  s.lineTo(d, lift - t);
  s.quadraticCurveTo(d * 0.42, height * 0.18 - t, 0, height - t * 1.4);
  s.quadraticCurveTo(-d * 0.42, height * 0.18 - t, -d, lift - t);
  s.closePath();
  const len = length + overhang * 2;
  const geo = new THREE.ExtrudeGeometry(s, { depth: len, bevelEnabled: false, curveSegments: 10 });
  geo.translate(0, 0, -len / 2);
  geo.rotateY(Math.PI / 2);
  g.add(mesh(geo, MAT.roof));

  // bờ nóc
  const ridge = mesh(new THREE.BoxGeometry(len * 0.92, 0.32, 0.36), MAT.roofEdge);
  ridge.position.y = height + 0.02;
  g.add(ridge);
  const pearl = mesh(new THREE.SphereGeometry(0.32, 16, 12), MAT.gold);
  pearl.position.y = height + 0.55;
  g.add(pearl);
  const flame = mesh(new THREE.ConeGeometry(0.16, 0.5, 8), MAT.gold);
  flame.position.y = height + 1.0;
  g.add(flame);
  for (const sx of [-1, 1]) {
    const end = mesh(new THREE.ConeGeometry(0.2, 0.9, 6), MAT.roofEdge);
    end.position.set((sx * len * 0.92) / 2, height + 0.35, 0);
    end.rotation.z = -sx * 0.5;
    g.add(end);
  }

  // đầu đao ở 4 góc
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      const x0 = (sx * len) / 2;
      const z0 = sz * d;
      const curve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(x0 - sx * 1.4, lift - 0.05, z0 - sz * 0.6),
        new THREE.Vector3(x0 + sx * 0.25, lift - 0.05, z0 + sz * 0.15),
        new THREE.Vector3(x0 + sx * 0.55, lift + 0.95, z0 + sz * 0.45),
      );
      g.add(mesh(new THREE.TubeGeometry(curve, 10, 0.11, 6), MAT.roofEdge));
    }
  return g;
}

function lantern(x: number, y: number, z: number): THREE.Group {
  const g = new THREE.Group();
  const body = mesh(new THREE.SphereGeometry(0.28, 12, 10), MAT.lantern, false);
  body.scale.set(1, 1.25, 1);
  g.add(body);
  for (const dy of [-0.36, 0.36]) {
    const cap = mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.07, 10), MAT.gold, false);
    cap.position.y = dy;
    g.add(cap);
  }
  const tassel = mesh(new THREE.CylinderGeometry(0.02, 0.05, 0.35, 6), MAT.lantern, false);
  tassel.position.y = -0.55;
  g.add(tassel);
  g.position.set(x, y, z);
  return g;
}

function bronzeBurner(scale: number): THREE.Group {
  const g = new THREE.Group();
  const pts = [
    [0, 0], [0.42, 0], [0.5, 0.12], [0.52, 0.32], [0.46, 0.48], [0.5, 0.52], [0.36, 0.56],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const pot = mesh(new THREE.LatheGeometry(pts, 20), MAT.bronze);
  pot.position.y = 0.3;
  g.add(pot);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const leg = mesh(new THREE.CylinderGeometry(0.06, 0.04, 0.34, 6), MAT.bronze);
    leg.position.set(Math.cos(a) * 0.34, 0.17, Math.sin(a) * 0.34);
    g.add(leg);
  }
  for (const sx of [-1, 1]) {
    const ear = mesh(new THREE.TorusGeometry(0.1, 0.03, 6, 12), MAT.bronze);
    ear.position.set(sx * 0.5, 0.92, 0);
    ear.rotation.y = Math.PI / 2;
    g.add(ear);
  }
  const ash = mesh(new THREE.CircleGeometry(0.42, 20), MAT.stone, false);
  ash.rotation.x = -Math.PI / 2;
  ash.position.y = 0.8;
  g.add(ash);
  g.scale.setScalar(scale);
  return g;
}

/** Tượng Phật ngồi kiết già trên toà sen, nhìn về +z. Cao ~2.6m. */
function buddha(): THREE.Group {
  const g = new THREE.Group();
  // toà sen
  const base = mesh(new THREE.CylinderGeometry(0.95, 0.75, 0.35, 24), MAT.gold);
  base.position.y = 0.18;
  g.add(base);
  const petalGeo = new THREE.SphereGeometry(0.28, 10, 8);
  const petals = new THREE.InstancedMesh(petalGeo, MAT.lotus, 32);
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  for (let i = 0; i < 32; i++) {
    const row = i < 16 ? 0 : 1;
    const a = ((i % 16) / 16) * Math.PI * 2 + row * 0.2;
    const r = row ? 0.82 : 0.98;
    q.setFromEuler(new THREE.Euler(0, -a, row ? 0.55 : 0.85));
    m4.compose(new THREE.Vector3(Math.cos(a) * r, 0.42 + row * 0.12, Math.sin(a) * r), q, new THREE.Vector3(0.5, 1, 0.75));
    petals.setMatrixAt(i, m4);
  }
  petals.castShadow = true;
  g.add(petals);

  const body = new THREE.Group();
  body.position.y = 0.5;
  g.add(body);
  const legs = mesh(new THREE.CapsuleGeometry(0.32, 0.85, 6, 14), MAT.gold);
  legs.rotation.z = Math.PI / 2;
  legs.scale.set(1, 1, 1.35);
  legs.position.set(0, 0.3, 0.12);
  body.add(legs);
  const torso = mesh(new THREE.SphereGeometry(0.5, 20, 16), MAT.gold);
  torso.scale.set(1.05, 1.35, 0.8);
  torso.position.y = 0.95;
  body.add(torso);
  const hands = mesh(new THREE.SphereGeometry(0.2, 12, 10), MAT.gold);
  hands.scale.set(1.4, 0.55, 0.9);
  hands.position.set(0, 0.55, 0.42);
  body.add(hands);
  const neck = mesh(new THREE.CylinderGeometry(0.13, 0.16, 0.2, 12), MAT.gold);
  neck.position.y = 1.62;
  body.add(neck);
  const head = mesh(new THREE.SphereGeometry(0.3, 20, 16), MAT.gold);
  head.scale.set(1, 1.12, 1);
  head.position.y = 1.92;
  body.add(head);
  const ush = mesh(new THREE.SphereGeometry(0.14, 12, 10), MAT.gold);
  ush.position.y = 2.24;
  body.add(ush);
  for (const sx of [-1, 1]) {
    const ear = mesh(new THREE.CapsuleGeometry(0.05, 0.22, 4, 8), MAT.gold);
    ear.position.set(sx * 0.3, 1.86, 0);
    body.add(ear);
  }
  // hào quang
  const halo = mesh(new THREE.TorusGeometry(0.5, 0.035, 8, 40), MAT.gold, false);
  halo.position.set(0, 1.95, -0.32);
  body.add(halo);
  const glow = new THREE.Mesh(
    new THREE.CircleGeometry(0.48, 32),
    new THREE.MeshBasicMaterial({ color: 0xffd36b, transparent: true, opacity: 0.35, depthWrite: false }),
  );
  glow.position.set(0, 1.95, -0.34);
  body.add(glow);
  const mandorla = mesh(new THREE.TorusGeometry(1.05, 0.04, 8, 48), MAT.gold, false);
  mandorla.scale.set(1, 1.15, 1);
  mandorla.position.set(0, 1.1, -0.45);
  body.add(mandorla);
  return g;
}

function bell(): THREE.Group {
  const g = new THREE.Group();
  const pts = [[0, 0.95], [0.18, 0.92], [0.3, 0.8], [0.34, 0.4], [0.38, 0.1], [0.44, 0], [0.4, 0]].map(
    ([x, y]) => new THREE.Vector2(x, y),
  );
  g.add(mesh(new THREE.LatheGeometry(pts, 24), MAT.bronze));
  const hook = mesh(new THREE.TorusGeometry(0.09, 0.03, 6, 12), MAT.bronze);
  hook.position.y = 1.02;
  g.add(hook);
  g.scale.setScalar(1.4);
  return g;
}

function tree(x: number, z: number, s: number, trunks: THREE.Matrix4[], crowns: THREE.Matrix4[]) {
  trunks.push(new THREE.Matrix4().compose(new THREE.Vector3(x, 1.2 * s, z), new THREE.Quaternion(), new THREE.Vector3(s, s, s)));
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, x * 1.7 + z, 0));
  crowns.push(new THREE.Matrix4().compose(new THREE.Vector3(x, 3.4 * s, z), q, new THREE.Vector3(2.2 * s, 1.7 * s, 2.2 * s)));
  crowns.push(new THREE.Matrix4().compose(new THREE.Vector3(x + 0.6 * s, 4.3 * s, z - 0.3 * s), q, new THREE.Vector3(1.4 * s, 1.2 * s, 1.4 * s)));
}

export function buildTemple(scene: THREE.Scene): Temple {
  const root = new THREE.Group();
  scene.add(root);

  // --- mặt đất ---
  const grass = mesh(new THREE.PlaneGeometry(160, 160), MAT.grass, false);
  grass.rotation.x = -Math.PI / 2;
  grass.position.y = -0.02;
  root.add(grass);
  const tiles = tileTexture();
  const bw = BOUNDS.maxX - BOUNDS.minX + 4;
  const bd = BOUNDS.maxZ - BOUNDS.minZ + 4;
  tiles.repeat.set(bw / 2, bd / 2);
  const yard = mesh(new THREE.PlaneGeometry(bw, bd), new THREE.MeshStandardMaterial({ map: tiles, roughness: 1 }), false);
  yard.rotation.x = -Math.PI / 2;
  yard.position.set((BOUNDS.minX + BOUNDS.maxX) / 2, 0, (BOUNDS.minZ + BOUNDS.maxZ) / 2);
  root.add(yard);
  const path = mesh(new THREE.PlaneGeometry(3.2, 28), MAT.stone, false);
  path.rotation.x = -Math.PI / 2;
  path.position.set(0, 0.01, 4);
  root.add(path);

  // tường rào thấp quanh khuôn viên
  const fence = [
    { minX: BOUNDS.minX - 1, maxX: BOUNDS.minX - 0.5, minZ: BOUNDS.minZ - 1, maxZ: BOUNDS.maxZ + 1 },
    { minX: BOUNDS.maxX + 0.5, maxX: BOUNDS.maxX + 1, minZ: BOUNDS.minZ - 1, maxZ: BOUNDS.maxZ + 1 },
    { minX: BOUNDS.minX - 1, maxX: BOUNDS.maxX + 1, minZ: BOUNDS.minZ - 1, maxZ: BOUNDS.minZ - 0.5 },
    { minX: BOUNDS.minX - 1, maxX: -8, minZ: BOUNDS.maxZ + 0.5, maxZ: BOUNDS.maxZ + 1 },
    { minX: 8, maxX: BOUNDS.maxX + 1, minZ: BOUNDS.maxZ + 0.5, maxZ: BOUNDS.maxZ + 1 },
  ];
  for (const f of fence) root.add(boxMesh(f, 0, 1.3, MAT.wall));

  // --- cổng tam quan ---
  for (const p of GATE_PILLARS) {
    const tall = Math.abs(p.minX) < 5;
    const h = tall ? 5.2 : 4.2;
    root.add(boxMesh(p, 0, h, MAT.lacquer));
    const cap = boxMesh({ minX: p.minX - 0.1, maxX: p.maxX + 0.1, minZ: p.minZ - 0.1, maxZ: p.maxZ + 0.1 }, h, 0.25, MAT.gold);
    root.add(cap);
  }
  const gateZ = (GATE_PILLARS[0].minZ + GATE_PILLARS[0].maxZ) / 2;
  const mid = curvedRoof(7, 1.6, 1.3, 0.9);
  mid.position.set(0, 5.4, gateZ);
  root.add(mid);
  for (const sx of [-1, 1]) {
    const side = curvedRoof(3.6, 1.4, 1.0, 0.6);
    side.position.set(sx * 5.5, 4.4, gateZ);
    root.add(side);
  }
  const gatePlaque = textPlaque('NAM MÔ A DI ĐÀ PHẬT', 5.6, 0.8);
  gatePlaque.position.set(0, 4.6, gateZ + 0.6);
  root.add(gatePlaque);
  const beam = boxMesh({ minX: -3, maxX: 3, minZ: gateZ - 0.25, maxZ: gateZ + 0.25 }, 4.95, 0.3, MAT.lacquer);
  root.add(beam);
  for (const x of [-5.5, 5.5]) root.add(lantern(x, 3.4, gateZ + 0.6));
  for (const x of [-1.8, 1.8]) root.add(lantern(x, 4.0, gateZ + 0.6));

  // --- hồ sen ---
  const water = boxMesh({ ...POND }, -0.3, 0.32, MAT.water);
  water.castShadow = false;
  root.add(water);
  const rimW = 0.35;
  for (const r of [
    { minX: POND.minX - rimW, maxX: POND.maxX + rimW, minZ: POND.minZ - rimW, maxZ: POND.minZ },
    { minX: POND.minX - rimW, maxX: POND.maxX + rimW, minZ: POND.maxZ, maxZ: POND.maxZ + rimW },
    { minX: POND.minX - rimW, maxX: POND.minX, minZ: POND.minZ, maxZ: POND.maxZ },
    { minX: POND.maxX, maxX: POND.maxX + rimW, minZ: POND.minZ, maxZ: POND.maxZ },
  ])
    root.add(boxMesh(r, 0, 0.3, MAT.stone));
  const pads = new THREE.InstancedMesh(new THREE.CircleGeometry(0.4, 12), MAT.lilyPad, 16);
  const flowers = new THREE.InstancedMesh(new THREE.ConeGeometry(0.14, 0.32, 7), MAT.lotus, 7);
  const tmp = new THREE.Matrix4();
  const flat = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
  for (let i = 0; i < 16; i++) {
    const x = POND.minX + 0.6 + ((i * 0.61) % 1) * (POND.maxX - POND.minX - 1.2);
    const z = POND.minZ + 0.6 + ((i * 0.37 + 0.13) % 1) * (POND.maxZ - POND.minZ - 1.2);
    const sc = 0.7 + ((i * 0.53) % 1) * 0.6;
    pads.setMatrixAt(i, tmp.compose(new THREE.Vector3(x, 0.04, z), flat, new THREE.Vector3(sc, sc, sc)));
    if (i < 7) flowers.setMatrixAt(i, tmp.compose(new THREE.Vector3(x, 0.2, z), new THREE.Quaternion(), new THREE.Vector3(1, 1, 1)));
  }
  root.add(pads, flowers);

  // --- lư hương sân ---
  const pedestal = boxMesh(YARD_BURNER, 0, 0.7, MAT.stone);
  root.add(pedestal);
  const yb = bronzeBurner(1.3);
  yb.position.set((YARD_BURNER.minX + YARD_BURNER.maxX) / 2, 0.7, (YARD_BURNER.minZ + YARD_BURNER.maxZ) / 2);
  root.add(yb);

  // --- tháp chuông ---
  const bt = BELL_TOWER;
  for (const [x, z] of [[bt.minX, bt.minZ], [bt.maxX, bt.minZ], [bt.minX, bt.maxZ], [bt.maxX, bt.maxZ]]) {
    const post = mesh(new THREE.CylinderGeometry(0.16, 0.18, 4, 10), MAT.lacquer);
    post.position.set(x, 2, z);
    root.add(post);
  }
  const btRoof = curvedRoof(bt.maxX - bt.minX, bt.maxZ - bt.minZ, 1.1, 0.7);
  btRoof.position.set((bt.minX + bt.maxX) / 2, 4, (bt.minZ + bt.maxZ) / 2);
  root.add(btRoof);
  const btBeam = boxMesh({ minX: bt.minX, maxX: bt.maxX, minZ: -2.1, maxZ: -1.9 }, 3.7, 0.2, MAT.wood);
  root.add(btBeam);
  const bellObj = bell();
  bellObj.position.set((bt.minX + bt.maxX) / 2, 2.2, (bt.minZ + bt.maxZ) / 2);
  root.add(bellObj);
  const btBase = boxMesh({ minX: bt.minX - 0.4, maxX: bt.maxX + 0.4, minZ: bt.minZ - 0.4, maxZ: bt.maxZ + 0.4 }, 0, 0.15, MAT.stone);
  root.add(btBase);

  // --- chánh điện ---
  const walls = OBSTACLES.slice(0, 5);
  for (const w of walls) root.add(boxMesh(w, 0, HALL_WALL_H, MAT.wall));
  const lintel = boxMesh({ minX: -3, maxX: 3, minZ: -10.5, maxZ: -10 }, 3.3, HALL_WALL_H - 3.3, MAT.wall);
  root.add(lintel);
  const floor = mesh(new THREE.PlaneGeometry(HALL.maxX - HALL.minX, HALL.maxZ - HALL.minZ), MAT.floor, false);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0.02, (HALL.minZ + HALL.maxZ) / 2);
  root.add(floor);
  const ceiling = mesh(new THREE.PlaneGeometry(HALL.maxX - HALL.minX + 1, HALL.maxZ - HALL.minZ + 1), MAT.wood, false);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(0, HALL_WALL_H, (HALL.minZ + HALL.maxZ) / 2);
  root.add(ceiling);
  for (const x of [-10.2, -6.6, -3.2, 3.2, 6.6, 10.2]) {
    const col = mesh(new THREE.CylinderGeometry(0.28, 0.3, HALL_WALL_H, 12), MAT.lacquer);
    col.position.set(x, HALL_WALL_H / 2, -9.8);
    root.add(col);
    const foot = mesh(new THREE.CylinderGeometry(0.4, 0.42, 0.25, 12), MAT.stone);
    foot.position.set(x, 0.12, -9.8);
    root.add(foot);
  }
  const hallRoof = curvedRoof(HALL.maxX - HALL.minX, HALL.maxZ - HALL.minZ, 2.4, 1.6);
  hallRoof.position.set(0, HALL_WALL_H, (HALL.minZ + HALL.maxZ) / 2);
  root.add(hallRoof);
  const band = boxMesh({ minX: -6.5, maxX: 6.5, minZ: -22.5, maxZ: -15.5 }, HALL_WALL_H + 1.6, 1.1, MAT.wall);
  root.add(band);
  const upper = curvedRoof(13, 7, 1.8, 1.0);
  upper.position.set(0, HALL_WALL_H + 2.6, -19);
  root.add(upper);
  const plaque = textPlaque('CHÁNH ĐIỆN', 3.6, 0.8);
  plaque.position.set(0, 3.75, -9.85);
  root.add(plaque);
  for (const x of [-8.4, -5, 5, 8.4]) root.add(lantern(x, 3.3, -9.2));

  // bàn thờ + tượng
  const altar = boxMesh(ALTAR, 0, 1.0, MAT.lacquer);
  root.add(altar);
  const trim = boxMesh({ minX: ALTAR.minX - 0.05, maxX: ALTAR.maxX + 0.05, minZ: ALTAR.minZ - 0.05, maxZ: ALTAR.maxZ + 0.05 }, 0.95, 0.08, MAT.gold);
  root.add(trim);
  const step = boxMesh({ minX: -1.6, maxX: 1.6, minZ: -26.7, maxZ: -24.6 }, 1.0, 0.35, MAT.lacquer);
  root.add(step);
  const statue = buddha();
  statue.position.set(0, 1.35, -25.6);
  root.add(statue);
  for (const sx of [-1, 1]) {
    const candle = mesh(new THREE.CylinderGeometry(0.06, 0.09, 0.9, 8), MAT.gold);
    candle.position.set(sx * 1.9, 1.45, -23.5);
    root.add(candle);
    const fl = mesh(new THREE.ConeGeometry(0.05, 0.16, 8), new THREE.MeshBasicMaterial({ color: 0xffc04a }), false);
    fl.position.set(sx * 1.9, 1.98, -23.5);
    root.add(fl);
    const vase = mesh(new THREE.CylinderGeometry(0.14, 0.1, 0.45, 10), MAT.bronze);
    vase.position.set(sx * 1.2, 1.22, -23.6);
    root.add(vase);
    for (let k = 0; k < 3; k++) {
      const bloom = mesh(new THREE.SphereGeometry(0.1, 8, 6), MAT.lotus, false);
      bloom.position.set(sx * 1.2 + (k - 1) * 0.1, 1.55 + (k % 2) * 0.1, -23.6);
      root.add(bloom);
    }
  }
  const glowLight = new THREE.PointLight(0xffc477, 18, 16, 1.6);
  glowLight.position.set(0, 3.2, -21.5);
  root.add(glowLight);
  const fill = new THREE.PointLight(0xffe3b0, 10, 20, 1.6);
  fill.position.set(0, 3.4, -14);
  root.add(fill);

  // lư hương trong điện
  const hb = bronzeBurner(0.75);
  const hbTable = boxMesh(HALL_BURNER, 0, 0.55, MAT.lacquer);
  root.add(hbTable);
  hb.position.set(0, 0.55, (HALL_BURNER.minZ + HALL_BURNER.maxZ) / 2);
  root.add(hb);

  // mõ
  root.add(boxMesh(MO_STAND, 0, 0.55, MAT.lacquer));
  const mo = new THREE.Group();
  const moBody = mesh(new THREE.SphereGeometry(0.3, 16, 12), new THREE.MeshStandardMaterial({ color: 0x9b3b1f, roughness: 0.5 }));
  moBody.scale.set(1.1, 0.8, 1);
  mo.add(moBody);
  const slit = mesh(new THREE.BoxGeometry(0.4, 0.04, 0.05), MAT.roofEdge, false);
  slit.position.set(0, 0, 0.29);
  mo.add(slit);
  mo.position.set((MO_STAND.minX + MO_STAND.maxX) / 2, 0.8, (MO_STAND.minZ + MO_STAND.maxZ) / 2);
  root.add(mo);

  // bồ đoàn
  const cushions = ZONES.filter((z) => z.kind === 'cushion');
  const cMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.42, 0.45, 0.16, 16), MAT.cushion, cushions.length);
  cushions.forEach((c, i) => cMesh.setMatrixAt(i, new THREE.Matrix4().makeTranslation(c.x, 0.1, c.z)));
  cMesh.receiveShadow = true;
  root.add(cMesh);

  // cây
  const trunks: THREE.Matrix4[] = [];
  const crowns: THREE.Matrix4[] = [];
  for (const t of TREES) tree(t.x, t.z, t.s, trunks, crowns);
  const trunkMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.18, 0.28, 2.4, 7), MAT.trunk, trunks.length);
  trunks.forEach((m, i) => trunkMesh.setMatrixAt(i, m));
  const crownMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), MAT.leaf, crowns.length);
  crowns.forEach((m, i) => crownMesh.setMatrixAt(i, m));
  trunkMesh.castShadow = crownMesh.castShadow = true;
  root.add(trunkMesh, crownMesh);

  const burnerTop = (o: THREE.Object3D, h: number) => o.position.clone().add(new THREE.Vector3(0, h, 0));
  return {
    burners: { yard: burnerTop(yb, 0.8 * 1.3), hall: burnerTop(hb, 0.8 * 0.75) },
    bell: bellObj,
    mo,
    statue,
  };
}
