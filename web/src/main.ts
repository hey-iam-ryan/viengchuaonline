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
import { NetClient } from './net/client';
import { RemotePlayers } from './net/remotePlayers';
import { REALTIME_URL } from './config';

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
  const stateOf = () => ({ x: player.x, z: player.z, ry: player.ry, p: player.pose });
  const net = new NetClient({ url: REALTIME_URL });
  const remotes = new RemotePlayers(scene);
  const actions = new Actions({ player, audio, incense, send: (m) => net.send(m), now: () => Date.now() });
  net.on('msg', (m) => {
    const now = Date.now();
    remotes.apply(m, now);
    if (m.t === 'welcome') { incense.sync(m.incense.map((i) => ({ ...i, at: i.at - net.serverOffsetMs })), now); player.takeChanged(); net.sendState(stateOf()); }
    else if (m.t === 'act') actions.onRemoteAction(m.id, m.a);
    else if (m.t === 'inc') incense.add({ b: m.i.b, at: m.i.at - net.serverOffsetMs });
  });
  net.on('status', (s) => { if (s !== 'online') remotes.clear(); });
  net.start({ name: actions.progress.name, robe: actions.progress.robe });

  const camTarget = new THREE.Vector3();
  const camPos = new THREE.Vector3();
  stage.onFrame((dt) => {
    player.update(dt, controls.move, controls.camYaw);
    me.root.position.x = player.x;
    me.root.position.z = player.z;
    me.root.rotation.y = player.ry;
    me.setPose(player.pose, performance.now() / 1000);
    incense.update(dt, Date.now());
    if (player.changed) { net.sendState(stateOf()); player.takeChanged(); }
    remotes.update(Date.now(), camera.position);

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
  if (import.meta.env.MODE !== 'production') (window as any).__vco = { player, controls, nearestZone, actions, audio, net, remotes };
}
