import './ui/styles.css';
import * as THREE from 'three';
import { HALL, ZONES, nearestZone } from '@vco/shared/world';
import { createRenderer } from './scene/renderer';
import { buildTemple } from './scene/temple';
import { LocalPlayer } from './player/localPlayer';
import { Controls } from './player/controls';
import { createAvatar, type Avatar } from './player/avatar';
import { AudioManager } from './interact/audio';
import { IncenseField } from './interact/incense';
import { Actions } from './interact/actions';
import { NetClient } from './net/client';
import { RemotePlayers } from './net/remotePlayers';
import { CF_BEACON, DONATE_URL, REALTIME_URL } from './config';
import { saveProgress } from './state/progress';
import { detectLang, setLang, t } from './ui/i18n';
import { showOnboarding } from './ui/onboarding';
import { createHud } from './ui/hud';
import { sanitizeName } from '@vco/shared/name';

function fatal(msg: string) {
  const d = document.createElement('div');
  d.className = 'fatal';
  d.textContent = msg;
  document.body.appendChild(d);
}

if (CF_BEACON) {
  const s = document.createElement('script');
  s.defer = true;
  s.src = 'https://static.cloudflareinsights.com/beacon.min.js';
  s.dataset.cfBeacon = JSON.stringify({ token: CF_BEACON });
  document.head.appendChild(s);
}

const ui = document.getElementById('ui')!;
const canvas = document.getElementById('scene') as HTMLCanvasElement;
const stage = createRenderer(canvas);

if (!stage) {
  setLang(detectLang(navigator.languages ?? [], null));
  fatal(t('webgl'));
} else {
  const { scene, camera } = stage;
  const temple = buildTemple(scene);
  const player = new LocalPlayer();
  const audio = new AudioManager();
  const incense = new IncenseField(scene, temple.burners);
  const net = new NetClient({ url: REALTIME_URL });
  const remotes = new RemotePlayers(scene);
  const stateOf = () => ({ x: player.x, z: player.z, ry: player.ry, p: player.pose });

  let hud: ReturnType<typeof createHud> | null = null;
  const actions = new Actions({
    player, audio, incense,
    send: (m) => net.send(m),
    now: () => Date.now(),
    onProgress: (p, ms) => hud?.onProgress(p, ms),
    onRoundDone: () => hud?.onRoundDone(),
  });
  setLang(detectLang(navigator.languages ?? [navigator.language], actions.progress.lang));

  net.on('msg', (m) => {
    const now = Date.now();
    remotes.apply(m, now);
    if (m.t === 'welcome') {
      incense.sync(m.incense.map((i) => ({ ...i, at: i.at - net.serverOffsetMs })), now);
      player.takeChanged();
      net.sendState(stateOf());
    } else if (m.t === 'act') actions.onRemoteAction(m.id, m.a);
    else if (m.t === 'inc') incense.add({ b: m.i.b, at: m.i.at - net.serverOffsetMs });
  });
  net.on('status', (s) => { if (s !== 'online') remotes.clear(); });

  let me: Avatar | null = null;
  let controls: Controls | null = null;
  let entered = false;

  showOnboarding(ui, { name: actions.progress.name, robe: actions.progress.robe }, ({ name, robe }) => {
    audio.unlock();
    window.addEventListener('pointerdown', () => audio.unlock()); // bật lại âm thanh nếu iOS đã ngắt
    entered = true;
    const clean = name ? sanitizeName(name) : '';
    actions.setProgress({ ...actions.progress, name: clean, robe });
    me = createAvatar(robe, clean || t('me'));
    scene.add(me.root);
    controls = new Controls(canvas);
    hud = createHud({
      root: ui, player, actions, audio, net,
      statsUrl: REALTIME_URL, donateUrl: DONATE_URL,
      shareUrl: location.origin + location.pathname,
      onLang: (l) => actions.setProgress({ ...actions.progress, lang: l }),
      onChantPref: (on) => saveProgress({ ...actions.progress, chant: on }),
    });
    hud.onProgress(actions.progress, null);
    net.start({ name: clean, robe });
  });

  const camTarget = new THREE.Vector3();
  const camPos = new THREE.Vector3();
  let introYaw = 0;
  stage.onFrame((dt) => {
    const now = Date.now();
    incense.update(dt, now);
    remotes.update(now, camera.position);
    if (!entered || !controls || !me) {
      // màn chào: camera lượn chậm quanh sân chùa
      introYaw += dt * 0.08;
      camera.position.set(Math.sin(introYaw) * 15, 11, -4 + Math.cos(introYaw) * 15);
      camera.lookAt(0, 2.5, -12);
      return;
    }
    player.update(dt, controls.move, controls.camYaw);
    me.root.position.set(player.x, 0, player.z);
    me.root.rotation.y = player.ry;
    me.setPose(player.pose, performance.now() / 1000);
    if (player.changed) { net.sendState(stateOf()); player.takeChanged(); }
    hud?.update(dt);

    const inHall = player.x > HALL.minX && player.x < HALL.maxX && player.z > HALL.minZ && player.z < HALL.maxZ;
    const dist = inHall ? Math.min(controls.camDist, 4.5) : controls.camDist;
    const flat = Math.cos(controls.camPitch) * dist;
    camPos.set(player.x + Math.sin(controls.camYaw) * flat, Math.sin(controls.camPitch) * dist + 1.2, player.z + Math.cos(controls.camYaw) * flat);
    if (inHall) {
      camPos.x = Math.max(HALL.minX + 0.4, Math.min(HALL.maxX - 0.4, camPos.x));
      camPos.z = Math.max(HALL.minZ + 0.4, Math.min(HALL.maxZ - 0.4, camPos.z));
      camPos.y = Math.min(camPos.y, 3.8);
    }
    camera.position.lerp(camPos, Math.min(1, dt * 8));
    camTarget.set(player.x, 1.0, player.z);
    camera.lookAt(camTarget);
  });

  if (import.meta.env.MODE !== 'production') {
    (window as any).__vco = {
      player, get controls() { return controls; }, nearestZone, actions, audio, net, remotes,
      zones: ZONES,
      teleportToCushion(i: number) {
        const z = ZONES.filter((z) => z.kind === 'cushion')[i];
        player.x = z.x; player.z = z.z; actions.sit();
      },
    };
  }
}
