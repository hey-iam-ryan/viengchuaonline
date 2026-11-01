import * as THREE from 'three';
import { Pose, type Robe } from '@vco/shared/protocol';
import { BOW_SECONDS, VAI_SECONDS } from './localPlayer';

export const ROBE_COLOR: Record<Robe, number> = { lam: 0x5a7fb5, nau: 0x7a4a2a, trang: 0xf2eee4, vang: 0xe0a530 };
const SKIN = new THREE.MeshStandardMaterial({ color: 0xf1c9a0, roughness: 0.8 });
const HAIR = new THREE.MeshStandardMaterial({ color: 0x2a1d17, roughness: 0.9 });
const robeMats = new Map<Robe, THREE.MeshStandardMaterial>();
const robeMat = (r: Robe) => {
  let m = robeMats.get(r);
  if (!m) robeMats.set(r, (m = new THREE.MeshStandardMaterial({ color: ROBE_COLOR[r], roughness: 0.85 })));
  return m;
};

// hình học dùng chung cho mọi nhân vật
const G = {
  skirt: new THREE.CylinderGeometry(0.2, 0.34, 0.5, 14),
  torso: new THREE.SphereGeometry(0.26, 14, 12),
  head: new THREE.SphereGeometry(0.27, 18, 14),
  hair: new THREE.SphereGeometry(0.285, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.55),
  bun: new THREE.SphereGeometry(0.09, 10, 8),
  hands: new THREE.SphereGeometry(0.075, 8, 6),
  lap: new THREE.SphereGeometry(0.34, 14, 8),
  eye: new THREE.SphereGeometry(0.025, 6, 6),
};
const EYE = new THREE.MeshBasicMaterial({ color: 0x1b1310 });

function nameSprite(name: string): THREE.Sprite {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 64;
  const g = c.getContext('2d')!;
  g.font = '600 30px system-ui, sans-serif';
  const w = Math.min(248, g.measureText(name).width + 28);
  g.fillStyle = 'rgba(40,20,10,0.55)';
  g.beginPath();
  g.roundRect((256 - w) / 2, 10, w, 44, 22);
  g.fill();
  g.fillStyle = '#fff6e3';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(name, 128, 33, 236);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthWrite: false, transparent: true }));
  s.scale.set(1.2, 0.3, 1);
  s.position.y = 1.55;
  s.renderOrder = 10;
  return s;
}

export interface Avatar {
  root: THREE.Object3D;
  label: THREE.Sprite;
  setPose(p: Pose, t: number): void;
  dispose(): void;
}

/** Nhân vật chibi Phật tử: đầu to, áo theo màu, tóc búi. t = thời gian (giây). */
export function createAvatar(robe: Robe, name: string): Avatar {
  const root = new THREE.Group();
  const mat = robeMat(robe);
  const mk = (g: THREE.BufferGeometry, m: THREE.Material) => {
    const o = new THREE.Mesh(g, m);
    o.castShadow = true;
    return o;
  };

  const skirt = mk(G.skirt, mat);
  skirt.position.y = 0.25;
  const lap = mk(G.lap, mat);
  lap.scale.set(1.15, 0.38, 0.95);
  lap.position.y = 0.1;
  lap.visible = false;
  root.add(skirt, lap);

  const upper = new THREE.Group(); // xoay quanh hông khi lạy
  upper.position.y = 0.5;
  root.add(upper);
  const torso = mk(G.torso, mat);
  torso.scale.set(1, 1.05, 0.85);
  torso.position.y = 0.16;
  const hands = mk(G.hands, SKIN);
  hands.scale.set(0.8, 1.5, 0.8);
  hands.position.set(0, 0.24, 0.24);
  const head = mk(G.head, SKIN);
  head.position.y = 0.62;
  const hair = mk(G.hair, HAIR);
  hair.position.set(0, 0.64, -0.02);
  hair.rotation.x = -0.35;
  const bun = mk(G.bun, HAIR);
  bun.position.set(0, 0.86, -0.12);
  const eyes = [-0.09, 0.09].map((x) => {
    const e = new THREE.Mesh(G.eye, EYE);
    e.position.set(x, 0.62, 0.25);
    e.scale.y = 1.4;
    return e;
  });
  upper.add(torso, hands, head, hair, bun, ...eyes);

  const label = nameSprite(name);
  root.add(label);

  let current: Pose | -1 = -1;
  let since = 0;

  return {
    root,
    label,
    setPose(p, t) {
      if (p !== current) { current = p; since = t; }
      const sitting = p === Pose.Sit || p === Pose.Bow;
      skirt.visible = !sitting;
      lap.visible = sitting;
      upper.position.y = sitting ? 0.22 : 0.5;
      label.position.y = sitting ? 1.27 : 1.55;
      upper.rotation.x = 0;
      root.position.y = 0;
      if (p === Pose.Walk) {
        root.position.y = Math.abs(Math.sin(t * 9)) * 0.06;
        upper.rotation.z = Math.sin(t * 9) * 0.05;
      } else upper.rotation.z = 0;
      if (p === Pose.Bow) {
        // lạy: quỳ, cúi sát đất (giữ một nhịp) rồi ngẩng lên
        const k = Math.min(1, (t - since) / BOW_SECONDS);
        const e = k < 0.35 ? Math.sin((k / 0.35) * Math.PI / 2) : k < 0.6 ? 1 : Math.cos(((k - 0.6) / 0.4) * Math.PI / 2);
        upper.rotation.x = e * 1.4;
        upper.position.y = 0.22 - e * 0.08;
      }
      if (p === Pose.Vai) {
        // vái: đứng chắp tay, cúi đầu
        const k = Math.min(1, (t - since) / VAI_SECONDS);
        upper.rotation.x = Math.sin(k * Math.PI) * 0.75;
      }
    },
    dispose() {
      (label.material as THREE.SpriteMaterial).map?.dispose();
      label.material.dispose();
    },
  };
}
