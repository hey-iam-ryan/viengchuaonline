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
  onChantPref: (on: boolean) => void;
}

/** Thanh trạng thái, nút hành động theo ngữ cảnh, bộ đếm, giờ lễ, chia sẻ, cúng dường. */
export function createHud(d: HudDeps) {
  const { root } = d;
  let netStatus: NetStatus = 'connecting';
  let hall: number | null = null;
  let total = 0;
  let userChant: boolean | null = null; // lựa chọn trong phiên; null = mặc định

  const statusText = h('span');
  const changeBtn = h('button', { type: 'button', class: 'chip-btn', on: { click: () => d.net.changeHall() } });
  const statusPill = h('div', { class: 'pill status', 'aria-live': 'polite' }, h('span', { class: 'dot' }), statusText, changeBtn);
  const ceremony = h('div', { class: 'pill ceremony' });

  const chantBtn = h('button', { type: 'button', class: 'icon-btn', 'aria-pressed': 'false', on: { click: () => toggleChant() } }, '🎵');
  const shareBtn = h('button', { type: 'button', class: 'icon-btn', on: { click: () => doShare() } }, '🔗');
  const menuBtn = h('button', { type: 'button', class: 'icon-btn', 'aria-expanded': 'false', on: { click: () => toggleMenu() } }, '⋯');
  const menu = h('div', { class: 'menu', hidden: true });
  const top = h('div', { class: 'top' }, statusPill, h('div', { class: 'top-right' }, chantBtn, shareBtn, menuBtn), menu);

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

  function toggleMenu(force?: boolean) {
    const open = force ?? menu.hidden;
    menu.hidden = !open;
    menuBtn.setAttribute('aria-expanded', String(open));
  }

  function buildMenu() {
    menu.replaceChildren(
      h('button', { type: 'button', on: { click: () => { const l = getLang() === 'vi' ? 'en' : 'vi'; setLang(l); d.onLang(l); toggleMenu(false); } } }, `🌐 ${t('lang')}`),
      ...(d.donateUrl ? [h('a', { href: d.donateUrl, target: '_blank', rel: 'noopener noreferrer', class: 'donate' }, `🙏 ${t('donate')}`)] : []),
      h('button', { type: 'button', on: { click: () => { toggleMenu(false); showCredits(); } } }, `📜 ${t('credits')}`),
    );
  }

  function showCredits() {
    const box: HTMLDivElement = h('div', { class: 'onboard', role: 'dialog', 'aria-modal': 'true' },
      h('div', { class: 'card' }, h('h2', {}, t('credits')), h('p', { class: 'sub' }, t('credits.body')),
        h('button', { type: 'button', class: 'primary', on: { click: () => { box.remove(); } } }, t('close'))));
    root.appendChild(box);
  }

  function chantShouldPlay(now: number) {
    const c = ceremonyStatus(now + d.net.serverOffsetMs);
    if (userChant !== null) return userChant;
    return c.active && d.actions.progress.chant;
  }

  function toggleChant() {
    const now = Date.now();
    userChant = !chantShouldPlay(now);
    d.onChantPref(userChant);
    syncChant(now, true);
  }

  function syncChant(now: number, force = false) {
    const want = chantShouldPlay(now);
    chantBtn.setAttribute('aria-pressed', String(want));
    chantBtn.title = `${t('chant')}: ${want ? 'ON' : 'OFF'}`;
    if (want === d.audio.chantPlaying && !force) return;
    const c = ceremonyStatus(now + d.net.serverOffsetMs);
    void d.audio.setChant(want).then(() => {
      if (want && c.active) d.audio.seekChant((now + d.net.serverOffsetMs - c.startMs) / 1000);
    });
  }

  function relabel() {
    for (const b of Object.values(B)) b.querySelector('.lb')!.textContent = t(b.dataset.key as Key);
    changeBtn.textContent = t('hall.change');
    chantBtn.setAttribute('aria-label', t('chant'));
    shareBtn.setAttribute('aria-label', t('share'));
    shareBtn.title = t('share');
    menuBtn.setAttribute('aria-label', t('menu'));
    (stats.querySelector('.k-bows') as HTMLElement).textContent = `${t('stats.bows')}:`;
    (stats.querySelector('.k-beads') as HTMLElement).textContent = `${t('stats.beads')}:`;
    hint.textContent = matchMedia('(pointer: coarse)').matches ? t('hint.mobile') : t('hint.desktop');
    buildMenu();
    renderStatus();
    renderProgress(d.actions.progress);
  }

  function renderStatus() {
    statusPill.dataset.state = netStatus;
    changeBtn.hidden = netStatus !== 'online';
    statusText.textContent =
      netStatus === 'online' ? t('hall.status', { hall: (hall ?? 0) + 1, count: formatCount(Math.max(total, 1), getLang()) })
      : netStatus === 'solo' ? t('hall.solo') : t('hall.connecting');
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
      if (d.audio.unlocked) syncChant(now);
    },
  };
}
