import './ui/styles.css';
import * as THREE from 'three';
import { BOUNDS, HALL, ZONES, nearestZone } from '@vco/shared/world';
import { createRenderer } from './scene/renderer';
import { buildTemple } from './scene/temple';
import { LocalPlayer } from './player/localPlayer';
import { Controls } from './player/controls';
import { createAvatar, type Avatar } from './player/avatar';
import { capCameraHeight, clampCamera } from './player/camera';
import { AudioManager } from './interact/audio';
import { IncenseField } from './interact/incense';
import { LanternField } from './interact/lanterns';
import { WishTree } from './interact/wishes';
import { daylightAt, vnHour } from './scene/daylight';
import { setGlowNight } from './scene/glow';
import { MAT } from './scene/materials';
import { inviteUrl, makeCard, preferredHall, shareImage, cardText } from './ui/shareCard';
import { formatCount } from './ui/hud';
import { getLang } from './ui/i18n';
import { nearestPlayer } from './net/nearby';
import { FloatLayer } from './ui/floatText';
import { buildFestive } from './scene/festive';
import { showTutorial } from './ui/tutorial';
import { checkIn, loadDaily, record, saveDaily } from './state/daily';
import { RANKS, practicePoints, rankLabel, rankOf } from './state/rank';
import { LeafField } from './interact/leafField';
import { FishSchool } from './interact/fish';
import { lunarOf, occasionOf } from '@vco/shared/lunar';
import { occasionLabel } from './ui/occasion';
import { Actions } from './interact/actions';
import { NetClient } from './net/client';
import { RemotePlayers } from './net/remotePlayers';
import { CF_BEACON, DONATE_URL, REALTIME_URL } from './config';
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
  document.getElementById('loading')?.remove();
  fatal(t('webgl'));
} else {
  const { scene, camera } = stage;
  const temple = buildTemple(scene);
  const player = new LocalPlayer();
  const audio = new AudioManager();
  const incense = new IncenseField(scene, temple.burners);
  const festive = buildFestive(scene);
  const lanterns = new LanternField(scene);
  const leafField = new LeafField(scene);
  const fish = new FishSchool(scene);
  const wishTree = new WishTree(scene);
  const net = new NetClient({ url: REALTIME_URL });
  const remotes = new RemotePlayers(scene);
  const stateOf = () => ({ x: player.x, z: player.z, ry: player.ry, p: player.pose });

  let hud: ReturnType<typeof createHud> | null = null;
  let daily = loadDaily();
  const points = () => practicePoints({ ...actions.progress, days: daily.days ?? 0 });
  let myRank = 0;
  let myRobe: Parameters<typeof createAvatar>[0] = 'lam';
  let myName = '';
  const refreshRank = () => {
    const k = rankOf(points());
    if (k === myRank) return;
    const up = k > myRank;
    myRank = k;
    if (me) {
      // dựng lại nhãn tên kèm bậc mới
      scene.remove(me.root);
      me.dispose();
      me = createAvatar(myRobe, myName || t('me'), rankLabel(k));
      scene.add(me.root);
    }
    net.setRank(k);
    if (up) hud?.toast(t('rank.up', { r: rankLabel(k) }));
  };
  const floats = new FloatLayer(ui);
  const headPos = new THREE.Vector3();
  const floatAtMe = (kind: Parameters<FloatLayer['spawn']>[0]) => {
    headPos.set(player.x, 1.7, player.z).project(camera);
    if (headPos.z > 1) return; // sau lưng camera
    floats.spawn(kind, (headPos.x * 0.5 + 0.5) * innerWidth, (-headPos.y * 0.5 + 0.5) * innerHeight);
  };
  const actions = new Actions({
    player, audio, incense, lanterns, wishes: wishTree, leaves: leafField, fish,
    myName: () => actions.progress.name,
    send: (m) => net.send(m),
    now: () => Date.now(),
    onProgress: (p, ms) => hud?.onProgress(p, ms),
    onRoundDone: (r) => hud?.onRoundDone(r),
    onPerform: (k) => {
      floatAtMe(k);
      const r = record(daily, k, Date.now());
      daily = r.state;
      saveDaily(daily);
      if (hud && (r.completed.length || r.allDone)) hud.onQuest(r.completed, r.allDone);
      else hud?.renderQuests();
      refreshRank();
    },
  });
  setLang(detectLang(navigator.languages ?? [navigator.language], actions.progress.lang));

  net.on('msg', (m) => {
    const now = Date.now();
    remotes.apply(m, now);
    if (m.t === 'welcome') {
      audio.setServerOffset(net.serverOffsetMs);
      incense.sync((m.incense ?? []).map((i) => ({ ...i, at: i.at - net.serverOffsetMs })), now);
      lanterns.sync((m.lanterns ?? []).map((l) => ({ ...l, at: l.at - net.serverOffsetMs })), now);
      wishTree.sync(m.wishes ?? []);
      leafField.sync(m.leaves ?? []);
      player.takeChanged();
      net.sendState(stateOf());
    } else if (m.t === 'act') {
      actions.onRemoteAction(m.id, m.a);
      if (m.a === 'ca') { const p = remotes.positions().find((r) => r.id === m.id); if (p) fish.release(p.x, p.z); }
      if (m.a === 'cauan') remotes.say(m.id, t('cauan.say'), performance.now() / 1000);
    }
    else if (m.t === 'inc') incense.add({ b: m.i.b, at: m.i.at - net.serverOffsetMs });
    else if (m.t === 'den') lanterns.add({ ...m.l, at: m.l.at - net.serverOffsetMs });
    else if (m.t === 'ng') { wishTree.add(m.w); hud?.onRemoteWish(m.w); }
    else if (m.t === 'la') {
      if (m.add) leafField.add(m.add);
      for (const id of m.del ?? []) leafField.remove(id);
    } else if (m.t === 'hi') {
      remotes.say(m.from, t('greet.say'), performance.now() / 1000);
      if (m.to === remotes.myId) hud?.onGreeted(m.from, remotes.nameOf(m.from) || t('me'));
    }
  });
  net.on('status', (s) => {
    if (s !== 'online') remotes.clear();
    leafField.setLocal(s !== 'online');
  });

  let me: Avatar | null = null;
  let controls: Controls | null = null;
  let entered = false;

  const shareBase = location.origin + location.pathname;
  const occToday = occasionLabel(lunarOf(Date.now()));
  if (occToday) queueMicrotask(() => {
    const el = document.querySelector<HTMLElement>('[data-occasion]');
    if (el) el.textContent = t('occ.welcome', { occ: occToday });
  });
  const prefer = preferredHall(location.search);
  if (REALTIME_URL)
    fetch(`${REALTIME_URL}/stats`).then((r) => r.json()).then((st) => {
      const el = document.querySelector<HTMLElement>('[data-today]');
      const d = st?.today;
      if (el && d && d.incense + d.bows + d.lanterns > 0)
        el.textContent = t('today', { incense: formatCount(d.incense, getLang()), bows: formatCount(d.bows, getLang()), lanterns: formatCount(d.lanterns, getLang()) });
    }).catch(() => {});

  showOnboarding(ui, { name: actions.progress.name, robe: actions.progress.robe }, ({ name, robe }) => {
    audio.unlock();
    window.addEventListener('pointerdown', () => audio.unlock()); // bật lại âm thanh nếu iOS đã ngắt
    entered = true;
    const clean = name ? sanitizeName(name) : '';
    actions.setProgress({ ...actions.progress, name: clean, robe });
    myRobe = robe;
    myName = clean;
    controls = new Controls(canvas);
    controls.onTap = (cx, cy) => {
      // bấm xuống nền → tìm điểm trên mặt đất (y = 0) và đi tới đó
      ndc.set((cx / innerWidth) * 2 - 1, -(cy / innerHeight) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      if (!raycaster.ray.intersectPlane(groundPlane, hit)) return;
      if (hit.x < BOUNDS.minX || hit.x > BOUNDS.maxX || hit.z < BOUNDS.minZ || hit.z > BOUNDS.maxZ) return;
      player.moveTo(hit.x, hit.z);
      ring.position.set(hit.x, 0.03, hit.z);
      ring.visible = true;
      ringT = 0;
    };
    hud = createHud({
      root: ui, player, actions, audio, net,
      statsUrl: REALTIME_URL, donateUrl: DONATE_URL,
      shareUrl: shareBase,
      wishes: () => wishTree.list,
      daily: () => daily,
      rank: () => {
        const p = points();
        const k = rankOf(p);
        const nx = RANKS[k + 1];
        return { label: rankLabel(k), points: p, nextLabel: nx ? rankLabel(k + 1) : null, toNext: nx ? nx.min - p : 0 };
      },
      nearby: () => nearestPlayer(remotes.positions(), player.x, player.z),
      greet: (id) => { if (actions.greet(id)) me?.say(t('greet.say'), performance.now() / 1000); },
      invite: () => inviteUrl(shareBase, net.status === 'online' ? net.hall : null),
      shareCard: async (kind, n) => {
        stage.renderer.render(scene, camera); // chụp ngay sau khi vẽ để có ảnh (không cần preserveDrawingBuffer)
        const blob = await makeCard(canvas, kind, n, shareBase);
        return blob ? shareImage(blob, cardText(kind, n).title, inviteUrl(shareBase, net.hall)) : 'failed';
      },
      onLang: (l) => actions.setProgress({ ...actions.progress, lang: l }),
      onAudioPref: (pref) => actions.setProgress({ ...actions.progress, ...pref }),
    });
    hud.onProgress(actions.progress, null);
    const ci = checkIn(daily, Date.now());
    daily = ci.state;
    saveDaily(daily);
    myRank = rankOf(points());
    me = createAvatar(robe, clean || t('me'), rankLabel(myRank));
    scene.add(me.root);
    if (ci.firstToday) hud.onCheckIn(daily.streak);
    else hud.renderQuests();
    net.start({ name: clean, robe, k: myRank }, prefer);
    showTutorial(ui);
  });

  // bấm để đi: tia chiếu xuống mặt đất + vòng đánh dấu điểm đến
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const hit = new THREE.Vector3();
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.28, 0.4, 32), new THREE.MeshBasicMaterial({ color: 0xf2c95a, transparent: true, opacity: 0.9, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2;
  ring.visible = false;
  scene.add(ring);
  let ringT = 0;

  const camTarget = new THREE.Vector3();
  const camPos = new THREE.Vector3();
  let introYaw = 0;
  let lastSky = -Infinity;
  let firstFrame = true;
  const applyDaylight = (now: number) => {
    festive.setOccasion(occasionOf(lunarOf(now + net.serverOffsetMs)));
    const d = daylightAt(vnHour(now + net.serverOffsetMs));
    (scene.background as THREE.Color).setHex(d.sky);
    scene.fog?.color.setHex(d.sky);
    stage.sun.intensity = d.sun;
    stage.sun.position.y = d.sunY;
    stage.hemi.intensity = d.hemi;
    stage.hemi.color.setHex(d.night > 0.5 ? 0x8f9be0 : 0xfff1d6);
    MAT.lantern.emissiveIntensity = 0.8 + 2.4 * d.night;
    for (const l of temple.lights) l.intensity = (l === temple.lights[0] ? 18 : 10) * (1 + d.night * 0.8);
    setGlowNight(temple.glows, d.night);
    setGlowNight(lanterns.glows, d.night);
    setGlowNight(festive.glows, d.night);
  };
  stage.onFrame((dt) => {
    const now = Date.now();
    if (firstFrame) {
      firstFrame = false;
      const l = document.getElementById('loading');
      l?.classList.add('done');
      setTimeout(() => l?.remove(), 700);
    }
    if (now - lastSky > 2000) { lastSky = now; applyDaylight(now); }
    incense.update(dt, now);
    lanterns.update(now);
    leafField.update(dt, now);
    fish.update(dt);
    wishTree.update(now);
    remotes.update(now, camera.position);
    if (!entered || !controls || !me) {
      // màn chào: camera lượn chậm quanh sân chùa
      introYaw += dt * 0.08;
      camera.position.set(Math.sin(introYaw) * 15, 11, -4 + Math.cos(introYaw) * 15);
      camera.lookAt(0, 2.5, -12);
      return;
    }
    player.update(dt, controls.move, controls.camYaw, controls.run);
    if (ring.visible) {
      ringT += dt;
      const k = player.hasTarget ? 1 + Math.sin(ringT * 6) * 0.1 : Math.max(0, 1 - ringT * 2);
      ring.scale.setScalar(k);
      (ring.material as THREE.MeshBasicMaterial).opacity = player.hasTarget ? 0.9 : Math.max(0, 0.9 - ringT * 2);
      if (!player.hasTarget && ringT > 0.5) ring.visible = false;
      if (!player.hasTarget && ringT > 0.5) ringT = 0;
    }
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
      camPos.y = Math.min(camPos.y, 4.6);
    } else {
      const c = clampCamera(player.x, player.z, camPos.x, camPos.z);
      camPos.x = c.x;
      camPos.z = c.z;
      camPos.y = capCameraHeight(c.x, c.z, camPos.y);
    }
    camera.position.lerp(camPos, Math.min(1, dt * 8));
    // bản đồ rộng: vùng đổ bóng đi theo người chơi
    stage.sun.position.x = player.x + 18;
    stage.sun.position.z = player.z + 14;
    stage.sun.target.position.set(player.x, 0, player.z);
    camTarget.set(player.x, 1.0, player.z);
    camera.lookAt(camTarget);
  });

  if (import.meta.env.MODE !== 'production') {
    (window as any).__vco = {
      player, get controls() { return controls; }, nearestZone, actions, audio, net, remotes,
      zones: ZONES,
      sceneBg: () => (scene.background as THREE.Color).getHex(),
      lanterns, wishTree, leafField, fish, camera,
      teleportToCushion(i: number) {
        const z = ZONES.filter((z) => z.kind === 'cushion')[i];
        player.x = z.x; player.z = z.z; actions.sit();
      },
    };
  }
}
