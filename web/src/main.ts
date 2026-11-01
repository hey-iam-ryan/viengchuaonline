import './ui/styles.css';
import * as THREE from 'three';
import { HALL, nearestZone } from '@vco/shared/world';
import { createRenderer } from './scene/renderer';
import { buildTemple } from './scene/temple';
import { LocalPlayer } from './player/localPlayer';
import { Controls } from './player/controls';
import { createAvatar } from './player/avatar';
import { AudioManager } from './interact/audio';
import { IncenseField } from './interact/incense';
import { Actions } from './interact/actions';

function fatal(msg: string) {
  const d = document.createElement('div');
  d.className = 'fatal';
  d.textContent = msg;
  document.body.appendChild(d);
}

const canvas = document.getElementById('scene') as HTMLCanvasElement;
const stage = createRenderer(canvas);
if (!stage) {
  fatal('Thiết bị hoặc trình duyệt của bạn chưa hỗ trợ đồ hoạ 3D (WebGL). Hãy thử mở bằng Chrome hoặc Safari mới nhất. 🙏');
} else {
  const { scene, camera } = stage;
  const temple = buildTemple(scene);
  const player = new LocalPlayer();
  const controls = new Controls(canvas);
  controls.camYaw = 0;
  const me = createAvatar('lam', 'Bạn');
  scene.add(me.root);

  const audio = new AudioManager();
  const unlock = () => audio.unlock();
  window.addEventListener('pointerdown', unlock, { once: true });
  window.addEventListener('keydown', unlock, { once: true });
  const incense = new IncenseField(scene, temple.burners);
  const actions = new Actions({ player, audio, incense, send: () => {}, now: () => Date.now() });

  const camTarget = new THREE.Vector3();
  const camPos = new THREE.Vector3();
  stage.onFrame((dt) => {
    player.update(dt, controls.move, controls.camYaw);
    me.root.position.x = player.x;
    me.root.position.z = player.z;
    me.root.rotation.y = player.ry;
    me.setPose(player.pose, performance.now() / 1000);
    incense.update(dt, Date.now());

    // camera góc nhìn thứ ba
    const inHall = player.x > HALL.minX && player.x < HALL.maxX && player.z > HALL.minZ && player.z < HALL.maxZ;
    const dist = inHall ? Math.min(controls.camDist, 4.5) : controls.camDist;
    const h = Math.sin(controls.camPitch) * dist + 1.2;
    const flat = Math.cos(controls.camPitch) * dist;
    camPos.set(player.x + Math.sin(controls.camYaw) * flat, h, player.z + Math.cos(controls.camYaw) * flat);
    if (inHall) {
      camPos.x = Math.max(HALL.minX + 0.4, Math.min(HALL.maxX - 0.4, camPos.x));
      camPos.z = Math.max(HALL.minZ + 0.4, Math.min(HALL.maxZ - 0.4, camPos.z));
      camPos.y = Math.min(camPos.y, 3.8);
    }
    camera.position.lerp(camPos, Math.min(1, dt * 8));
    camTarget.set(player.x, 1.0, player.z);
    camera.lookAt(camTarget);
  });

  // dev hook để thử nghiệm
  if (import.meta.env.MODE !== 'production') (window as any).__vco = { player, controls, nearestZone, actions, audio };
}
