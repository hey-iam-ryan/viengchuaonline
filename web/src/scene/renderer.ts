import * as THREE from 'three';
import { PIXEL_RATIO, QualityGovernor, type QualityLevel } from './quality';

export interface Stage {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  sun: THREE.DirectionalLight;
  hemi: THREE.HemisphereLight;
  onFrame(cb: (dt: number, now: number) => void): void;
  quality: QualityGovernor;
}

export function hasWebGL(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

/** Trả null khi không có WebGL. */
export function createRenderer(canvas: HTMLCanvasElement): Stage | null {
  if (!hasWebGL()) return null;
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  } catch {
    return null;
  }
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf3d9b1);
  scene.fog = new THREE.Fog(0xf3d9b1, 45, 140);

  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 300);

  const hemi = new THREE.HemisphereLight(0xfff1d6, 0x6b5a3a, 1.1);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffe2b0, 2.2);
  sun.position.set(18, 30, 14);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera;
  sc.left = -32; sc.right = 32; sc.top = 32; sc.bottom = -32; sc.near = 1; sc.far = 90;
  sun.shadow.bias = -0.0005;
  scene.add(sun);
  scene.add(sun.target); // bóng đổ đi theo người chơi (main cập nhật vị trí)

  const applyLevel = (lvl: QualityLevel) => {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, PIXEL_RATIO[lvl]));
    renderer.shadowMap.enabled = lvl === 2;
    sun.castShadow = lvl === 2;
    scene.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.Material | undefined;
      if (m) m.needsUpdate = true;
    });
    resize();
  };
  const quality = new QualityGovernor(applyLevel);

  const resize = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  window.addEventListener('resize', resize);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, PIXEL_RATIO[2]));
  resize();

  const cbs: ((dt: number, now: number) => void)[] = [];
  let last = performance.now();
  let frames = 0;
  let secStart = last;
  renderer.setAnimationLoop(() => {
    const t = performance.now();
    const dt = Math.min(0.1, (t - last) / 1000);
    last = t;
    for (const cb of cbs) cb(dt, Date.now());
    renderer.render(scene, camera);
    frames++;
    if (t - secStart >= 1000) {
      if (document.visibilityState === 'visible') quality.sample((frames * 1000) / (t - secStart));
      frames = 0;
      secStart = t;
    }
  });

  return { renderer, scene, camera, sun, hemi, onFrame: (cb) => cbs.push(cb), quality };
}
