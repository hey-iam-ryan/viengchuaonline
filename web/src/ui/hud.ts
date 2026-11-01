import { ceremonyStatus } from '@vco/shared/ceremony';
import type { Actions } from '../interact/actions';
import type { AudioManager } from '../interact/audio';
import type { NetClient, NetStatus } from '../net/client';
import type { LocalPlayer } from '../player/localPlayer';
import type { Progress } from '../state/progress';
import { BEADS } from '../state/progress';
import { h } from './dom';
import { getLang, onLangChange, setLang, t, type Key, type Lang } from './i18n';
import { share } from './share';
import { fullscreenSupport, isFullscreen, toggleFullscreen } from './fullscreen';
import { MUSIC_TRACKS } from '../interact/soundtrack';

export function formatCountdown(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return `${hh}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}
export function formatCount(n: number, lang: Lang): string {
  return new Intl.NumberFormat(lang === 'vi' ? 'vi-VN' : 'en-US').format(n);
}
export function formatVnTime(ms: number): string {
  return new Date(ms + 7 * 3_600_000).toISOString().slice(11, 16);
}

export function formatStatus(state: NetStatus, hall: number | null, total: number, compact: boolean): string {
  if (state === 'online') {
    const vars = { hall: (hall ?? 0) + 1, count: formatCount(Math.max(total, 1), getLang()) };
    return t(compact ? 'hall.statusShort' : 'hall.status', vars);
  }
  if (state === 'solo') return t(compact ? 'hall.soloShort' : 'hall.solo');
  return t('hall.connecting');
}

export interface HudDeps {
  root: HTMLElement;
  player: LocalPlayer;
  actions: Actions;
  audio: AudioManager;
  net: NetClient;
  statsUrl: string | null;
  donateUrl: string;
  shareUrl: string;
  onLang: (l: Lang) => void;
  onAudioPref: (pref: { music?: boolean; chant?: boolean }) => void;
}

/** Thanh trạng thái, nút hành động theo ngữ cảnh, bộ đếm, giờ lễ, chia sẻ, cúng dường. */
export function createHud(d: HudDeps) {
  const { root } = d;
  let netStatus: NetStatus = 'connecting';
  let hall: number | null = null;
  let total = 0;
  let userChant: boolean | null = null; // lựa chọn trong phiên; null = mặc định

  const statusText = h('span');
  const statusPill = h('div', { class: 'pill status', 'aria-live': 'polite' }, h('span', { class: 'dot' }), statusText);
  const ceremony = h('div', { class: 'pill ceremony' });

  const musicBtn = h('button', { type: 'button', class: 'icon-btn', 'aria-pressed': 'false', on: { click: () => toggleMusic() } }, '🎵');
  const chantBtn = h('button', { type: 'button', class: 'icon-btn', 'aria-pressed': 'false', on: { click: () => toggleChant() } }, '🪵');
  const fsSupport = fullscreenSupport();
  const fsBtn = h('button', { type: 'button', class: 'icon-btn', on: { click: () => doFullscreen() } }, '⛶');
  fsBtn.hidden = fsSupport === 'none' || fsSupport === 'standalone';
  const shareBtn = h('button', { type: 'button', class: 'icon-btn', on: { click: () => doShare() } }, '🔗');
  const menuBtn = h('button', { type: 'button', class: 'icon-btn', 'aria-expanded': 'false', on: { click: () => toggleMenu() } }, '⋯');
  const menu = h('div', { class: 'menu', hidden: true });
  const top = h('div', { class: 'top' }, statusPill, h('div', { class: 'top-right' }, musicBtn, chantBtn, fsBtn, shareBtn, menuBtn), menu);

  const bowsEl = h('b', { 'data-testid': 'bow-count' });
  const beadsEl = h('b');
  const stats = h('div', { class: 'stats' }, h('span', { class: 'k-bows' }), ' ', bowsEl, h('span', { class: 'sep' }, ' · '), h('span', { class: 'k-beads' }), ' ', beadsEl);

  const btn = (key: Key, icon: string, fn: () => void, cls = '') => {
    const b = h('button', { type: 'button', class: `act ${cls}`, on: { click: (e) => { e.stopPropagation(); fn(); } } }, h('span', { class: 'ic', 'aria-hidden': 'true' }, icon), h('span', { class: 'lb' }));
    b.dataset.key = key;
    return b;
  };
  const B = {
    sit: btn('act.sit', '🪷', () => d.actions.sit(), 'primary-act'),
    stand: btn('act.stand', '⬆️', () => d.player.standUp()),
    bow: btn('act.bow', '🙏', () => d.actions.bow(), 'primary-act'),
    bell: btn('act.bell', '🔔', () => d.actions.bell(), 'primary-act'),
    mo: btn('act.mo', '🪵', () => d.actions.mo(), 'primary-act'),
    incense: btn('act.incense', '🕯️', () => {
      if (d.actions.lightIncense()) toast(t('incense.done'));
      else if (d.actions.available().incense) toast(t('incense.wait', { s: Math.ceil(d.actions.incenseCooldownLeft() / 1000) }));
    }, 'primary-act'),
    beads: btn('act.beads', '📿', () => d.actions.bead()),
  };
  const actionsBar = h('div', { class: 'actions' }, ...Object.values(B));
  const hint = h('div', { class: 'hint' });
  const toasts = h('div', { class: 'toasts', 'aria-live': 'polite' });
  root.append(top, ceremony, stats, actionsBar, hint, toasts);

  function toast(msg: string) {
    const el = h('div', { class: 'toast' }, msg);
    toasts.appendChild(el);
    setTimeout(() => el.classList.add('out'), 2200);
    setTimeout(() => el.remove(), 2700);
  }

  async function doShare() {
    const r = await share(d.shareUrl, t('share.text'));
    if (r === 'copied') toast(t('share.copied'));
  }

  async function doFullscreen() {
    if (fsSupport === 'ios-pwa') { showDialog(t('fullscreen.ios.title'), t('fullscreen.ios.body')); return; }
    await toggleFullscreen();
    renderFs();
  }
  function renderFs() {
    const on = isFullscreen();
    fsBtn.setAttribute('aria-pressed', String(on));
    fsBtn.textContent = on ? '🗗' : '⛶';
  }
  document.addEventListener('fullscreenchange', renderFs);
  document.addEventListener('webkitfullscreenchange', renderFs);
  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyF' && !(e.target instanceof HTMLInputElement) && fsSupport === 'api') void doFullscreen();
  });

  function toggleMenu(force?: boolean) {
    const open = force ?? menu.hidden;
    menu.hidden = !open;
    menuBtn.setAttribute('aria-expanded', String(open));
  }

  function buildMenu() {
    menu.replaceChildren(
      ...(netStatus === 'online' ? [h('button', { type: 'button', on: { click: () => { d.net.changeHall(); toggleMenu(false); } } }, `🚪 ${t('hall.change')}`)] : []),
      h('button', { type: 'button', on: { click: () => { const l = getLang() === 'vi' ? 'en' : 'vi'; setLang(l); d.onLang(l); toggleMenu(false); } } }, `🌐 ${t('lang')}`),
      ...(d.donateUrl ? [h('a', { href: d.donateUrl, target: '_blank', rel: 'noopener noreferrer', class: 'donate' }, `🙏 ${t('donate')}`)] : []),
      h('button', { type: 'button', on: { click: () => { toggleMenu(false); showCredits(); } } }, `📜 ${t('credits')}`),
    );
  }

  function showDialog(title: string, ...body: (string | HTMLElement)[]) {
    const box: HTMLDivElement = h('div', { class: 'onboard', role: 'dialog', 'aria-modal': 'true' },
      h('div', { class: 'card' }, h('h2', {}, title), ...body.map((b) => (typeof b === 'string' ? h('p', { class: 'sub' }, b) : b)),
        h('button', { type: 'button', class: 'primary', on: { click: () => { box.remove(); } } }, t('close'))));
    root.appendChild(box);
  }

  function showCredits() {
    const list = h('ul', { class: 'credits' }, ...MUSIC_TRACKS.map((tr) => h('li', {}, tr.credit)));
    showDialog(t('credits'), t('credits.body'), h('p', { class: 'sub' }, h('b', {}, `${t('credits.music')}:`)), list);
  }

  function chantShouldPlay(now: number) {
    if (userChant !== null) return userChant;
    return d.actions.progress.chant || ceremonyStatus(now + d.net.serverOffsetMs).active;
  }

  function toggleChant() {
    userChant = !chantShouldPlay(Date.now());
    d.onAudioPref({ chant: userChant });
    syncAudio();
  }

  function toggleMusic() {
    d.onAudioPref({ music: !d.actions.progress.music });
    syncAudio();
  }

  function syncAudio() {
    const now = Date.now();
    const chant = chantShouldPlay(now);
    const music = d.actions.progress.music;
    chantBtn.setAttribute('aria-pressed', String(chant));
    musicBtn.setAttribute('aria-pressed', String(music));
    chantBtn.title = `${t('chant.mo')}: ${t(chant ? 'on' : 'off')}`;
    musicBtn.title = `${t('music')}: ${t(music ? 'on' : 'off')}`;
    if (!d.audio.unlocked) return;
    d.audio.setServerOffset(d.net.serverOffsetMs);
    if (chant !== d.audio.chantOn) void d.audio.setChant(chant);
    if (music !== d.audio.musicOn) void d.audio.setMusic(music);
  }

  function relabel() {
    for (const b of Object.values(B)) b.querySelector('.lb')!.textContent = t(b.dataset.key as Key);
    musicBtn.setAttribute('aria-label', t('music'));
    chantBtn.setAttribute('aria-label', t('chant.mo'));
    fsBtn.setAttribute('aria-label', t('fullscreen'));
    fsBtn.title = t('fullscreen');
    shareBtn.setAttribute('aria-label', t('share'));
    shareBtn.title = t('share');
    menuBtn.setAttribute('aria-label', t('menu'));
    (stats.querySelector('.k-bows') as HTMLElement).textContent = `${t('stats.bows')}:`;
    (stats.querySelector('.k-beads') as HTMLElement).textContent = `${t('stats.beads')}:`;
    hint.textContent = matchMedia('(pointer: coarse)').matches ? t('hint.mobile') : t('hint.desktop');
    buildMenu();
    renderStatus();
    renderProgress(d.actions.progress);
    syncAudio();
  }

  const narrow = matchMedia('(max-width: 480px)');
  narrow.addEventListener?.('change', () => renderStatus());
  function renderStatus() {
    statusPill.dataset.state = netStatus;
    statusText.textContent = formatStatus(netStatus, hall, total, narrow.matches);
    buildMenu();
  }

  function renderProgress(p: Progress) {
    bowsEl.textContent = String(p.bowsToday);
    beadsEl.textContent = `${p.beadIndex}/${BEADS} · ${p.beadRounds} ${t('stats.rounds')}`;
  }

  async function pollStats() {
    if (!d.statsUrl || netStatus !== 'online') return;
    try {
      const r = await fetch(`${d.statsUrl}/stats`);
      if (r.ok) { total = Number((await r.json()).total) || 0; renderStatus(); }
    } catch { /* bỏ qua */ }
  }
  setInterval(pollStats, 30_000);

  d.net.on('status', (s, hh) => {
    netStatus = s;
    hall = hh;
    renderStatus();
    if (s === 'online') void pollStats();
  });
  onLangChange(relabel);
  relabel();
  setTimeout(() => hint.classList.add('fade'), 9000);
  document.addEventListener('pointerdown', (e) => { if (!menu.hidden && !top.contains(e.target as Node)) toggleMenu(false); });

  let acc = 1;
  return {
    toast,
    onProgress(p: Progress, milestone: 3 | 108 | null) {
      renderProgress(p);
      if (milestone) toast(t(milestone === 3 ? 'milestone.3' : 'milestone.108'));
    },
    onRoundDone() { toast(t('round.done')); },
    update(dt: number) {
      const a = d.actions.available();
      B.sit.hidden = !a.sit;
      B.stand.hidden = !(a.bow || d.player.pose === 3);
      B.bow.hidden = !a.bow;
      B.bell.hidden = !a.bell;
      B.mo.hidden = !a.mo;
      B.incense.hidden = !a.incense;
      acc += dt;
      if (acc < 1) return;
      acc = 0;
      const now = Date.now();
      const c = ceremonyStatus(now + d.net.serverOffsetMs);
      ceremony.dataset.active = String(c.active);
      ceremony.textContent = c.active ? t('ceremony.active') : t('ceremony.next', { time: formatVnTime(c.startMs), left: formatCountdown(c.startMs - now - d.net.serverOffsetMs) });
      syncAudio();
    },
  };
}
