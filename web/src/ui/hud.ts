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
import { PRAYERS, type Wish } from '@vco/shared/protocol';
import type { CardKind } from './shareCard';
import { Bow108, BOW_TARGET } from '../interact/bow108';
import { Pose } from '@vco/shared/protocol';
import { lunarOf } from '@vco/shared/lunar';
import { lunarShort, occasionLabel } from './occasion';
import { QUESTS, questsDone, type DailyState, type QuestId } from '../state/daily';

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
  wishes: () => Wish[];
  invite: () => string;
  shareCard: (kind: CardKind, n: number) => Promise<'shared' | 'downloaded' | 'failed'>;
  /** Người gần nhất trong tầm chào. */
  nearby: () => { id: string; n: string } | null;
  daily: () => DailyState;
  rank: () => { label: string; points: number; nextLabel: string | null; toNext: number };
  greet: (id: string) => void;
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
  const questChip = h('button', { type: 'button', class: 'quest-chip', 'data-testid': 'quest-chip', on: { click: () => showQuests() } });
  const stats = h('div', { class: 'stats' }, questChip, h('span', { class: 'sep' }, ' · '), h('span', { class: 'k-bows' }), ' ', bowsEl, h('span', { class: 'sep' }, ' · '), h('span', { class: 'k-beads' }), ' ', beadsEl);

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
    lantern: btn('act.lantern', '🏮', () => {
      if (d.actions.lantern()) toast(t('lantern.done'));
      else if (d.actions.available().lantern) toast(t('lantern.wait', { s: Math.ceil(d.actions.cooldownLeft('lantern') / 1000) }));
    }, 'primary-act'),
    wish: btn('act.wish', '🎋', () => {
      const left = d.actions.cooldownLeft('wish');
      if (left > 0) { toast(t('wish.wait', { s: Math.ceil(left / 1000) })); return; }
      pickWish();
    }, 'primary-act'),
    greet: btn('act.greet', '🙏', () => { if (greetTarget) d.greet(greetTarget.id); }, 'primary-act'),
    sweep: btn('act.sweep', '🧹', () => d.actions.sweep(), 'primary-act'),
    bow108: btn('act.bow108', '🙇', () => startBow108()),
    beads: btn('act.beads', '📿', () => d.actions.bead()),
  };
  const actionsBar = h('div', { class: 'actions' }, ...Object.values(B));

  let greetTarget: { id: string; n: string } | null = null;

  // --- 108 lạy liên tục ---
  const session = new Bow108();
  const b108Count = h('div', { class: 'b108-count', 'data-testid': 'bow108-count' });
  const b108Bar = h('div', { class: 'b108-bar' }, h('i'));
  const b108Stop = h('button', { type: 'button', class: 'b108-stop', on: { click: () => stopBow108() } });
  const b108Title = h('div', { class: 'b108-title' });
  const b108Hint = h('div', { class: 'b108-hint' });
  const b108 = h('div', { class: 'b108', hidden: true }, b108Title, b108Count, b108Bar, b108Hint, b108Stop);
  root.append(b108);
  function renderBow108() {
    b108.hidden = !session.active;
    b108Count.textContent = `${session.count}/${BOW_TARGET}`;
    (b108Bar.firstChild as HTMLElement).style.width = `${(session.count / BOW_TARGET) * 100}%`;
  }
  function startBow108() {
    session.start(Date.now() + d.net.serverOffsetMs);
    renderBow108();
  }
  function stopBow108() {
    session.stop();
    renderBow108();
  }
  const hint = h('div', { class: 'hint' });
  const toasts = h('div', { class: 'toasts', 'aria-live': 'polite' });
  root.append(top, ceremony, stats, actionsBar, hint, toasts);

  function toast(msg: string, action?: { label: string; fn: () => void }) {
    const el = h('div', { class: action ? 'toast has-action' : 'toast' }, msg,
      action ? h('button', { type: 'button', on: { click: () => { el.remove(); action.fn(); } } }, action.label) : null);
    toasts.appendChild(el);
    const life = action ? 7000 : 2200;
    setTimeout(() => el.classList.add('out'), life);
    setTimeout(() => el.remove(), life + 500);
  }

  const prayerText = (i: number) => PRAYERS[i]?.[getLang()] ?? '';

  function pickWish() {
    const list = h('div', { class: 'wish-list' }, ...PRAYERS.map((_, i) =>
      h('button', { type: 'button', class: 'wish-opt', on: { click: () => { box.remove(); if (d.actions.wish(i)) toast(t('wish.done')); } } }, prayerText(i))));
    const box: HTMLDivElement = h('div', { class: 'onboard', role: 'dialog', 'aria-modal': 'true' },
      h('div', { class: 'card' }, h('h2', {}, t('wish.title')), list,
        h('button', { type: 'button', class: 'link', on: { click: () => { box.remove(); } } }, t('close'))));
    root.appendChild(box);
  }

  function showWishes() {
    const ws = [...d.wishes()].reverse();
    const body = ws.length
      ? h('ul', { class: 'wishes' }, ...ws.map((w) => h('li', {}, h('b', {}, w.n || t('me')), ` — ${prayerText(w.p)}`)))
      : t('wish.empty');
    showDialog(`🎋 ${t('wish.list')}`, body);
  }

  async function shareAchievement(kind: CardKind, n: number) {
    const r = await d.shareCard(kind, n);
    if (r === 'downloaded') toast(t('card.saved'));
  }

  async function doShare() {
    const r = await share(d.invite(), t('share.text'));
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
      h('button', { type: 'button', on: { click: () => { toggleMenu(false); showWishes(); } } }, `🎋 ${t('wish.list')}`),
      ...(netStatus === 'online' ? [h('button', { type: 'button', on: { click: () => { toggleMenu(false); void doShare(); } } }, `👥 ${t('invite')}`)] : []),
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

  const questName = (id: QuestId) => {
    const q = QUESTS.find((x) => x.id === id)!;
    return t(`q.${id}`, { n: q.target });
  };
  function showQuests() {
    const st = d.daily();
    const list = h('ul', { class: 'quests' }, ...QUESTS.map((q) => {
      const v = Math.min(q.target, st.prog[q.id] ?? 0);
      return h('li', { class: v >= q.target ? 'done' : '' }, h('span', {}, `${q.icon} ${questName(q.id)}`), h('b', {}, v >= q.target ? '✓' : `${v}/${q.target}`));
    }));
    const rk = d.rank();
    showDialog(`📜 ${t('q.title')}`,
      h('p', { class: 'rank-line' }, t('rank.line', { r: rk.label, p: rk.points }), rk.nextLabel ? h('small', {}, t('rank.next', { n: rk.toNext, r: rk.nextLabel })) : null),
      h('p', { class: 'sub' }, t('q.streak', { n: Math.max(1, st.streak) })), list);
  }
  function renderQuests() {
    questChip.textContent = `📜 ${questsDone(d.daily())}/${QUESTS.length}`;
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
    for (const b of Object.values(B)) b.querySelector('.lb')!.textContent = t(b.dataset.key as Key, { name: '' });
    b108Title.textContent = t('bow108.title');
    b108Hint.textContent = t('bow108.hint');
    b108Stop.textContent = t('bow108.stop');
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
      if (milestone === 3) toast(t('milestone.3'));
      if (milestone === 108) toast(t('milestone.108'), { label: t('card.share'), fn: () => void shareAchievement('bows', 108) });
    },
    onRoundDone(rounds: number) { toast(t('round.done'), { label: t('card.share'), fn: () => void shareAchievement('beads', rounds) }); },
    onGreeted(fromId: string, name: string) {
      toast(t('greet.got', { name }), { label: t('greet.back'), fn: () => d.greet(fromId) });
    },
    renderQuests,
    onQuest(completed: QuestId[], allDone: boolean) {
      renderQuests();
      for (const id of completed) toast(t('q.done1', { q: questName(id) }));
      if (allDone) toast(t('q.all'));
    },
    onCheckIn(streak: number) {
      renderQuests();
      toast(t('q.checkin', { n: streak }));
    },
    onRemoteWish(w: Wish) { toast(`🎋 ${w.n || t('me')}: ${prayerText(w.p)}`); },
    update(dt: number) {
      const a = d.actions.available();
      B.sit.hidden = !a.sit;
      B.stand.hidden = !(d.player.pose === Pose.Sit || d.player.pose === Pose.Bow);
      B.bow.hidden = !a.bow || session.active;
      B.bow108.hidden = session.active;
      greetTarget = d.nearby();
      B.greet.hidden = !greetTarget;
      if (greetTarget) {
        const gl = t('act.greet', { name: greetTarget.n }).trim();
        const g = B.greet.querySelector('.lb')!;
        if (g.textContent !== gl) g.textContent = gl;
      }
      const standing = d.player.pose === Pose.Stand || d.player.pose === Pose.Vai;
      const bowLabel = t(standing ? 'act.vai' : 'act.bow');
      const lb = B.bow.querySelector('.lb')!;
      if (lb.textContent !== bowLabel) lb.textContent = bowLabel;
      if (session.active) {
        if (d.player.pose === Pose.Walk) stopBow108();
        else if (session.tick(Date.now() + d.net.serverOffsetMs)) {
          d.actions.bow();
          renderBow108();
          if (session.done) {
            renderBow108();
            toast(t('bow108.done'), { label: t('card.share'), fn: () => void shareAchievement('bows', BOW_TARGET) });
          }
        }
      }
      B.bell.hidden = !a.bell;
      B.mo.hidden = !a.mo;
      B.incense.hidden = !a.incense;
      B.lantern.hidden = !a.lantern;
      B.wish.hidden = !a.wish;
      B.sweep.hidden = !a.sweep;
      acc += dt;
      if (acc < 1) return;
      acc = 0;
      const now = Date.now();
      const c = ceremonyStatus(now + d.net.serverOffsetMs);
      ceremony.dataset.active = String(c.active);
      const lunar = lunarOf(now + d.net.serverOffsetMs);
      const occ = occasionLabel(lunar);
      ceremony.dataset.occasion = String(!!occ);
      ceremony.replaceChildren(
        h('span', { class: 'cer-day' }, occ ?? lunarShort(lunar)),
        h('span', { class: 'cer-time' }, c.active ? t('ceremony.active') : t('ceremony.next', { time: formatVnTime(c.startMs), left: formatCountdown(c.startMs - now - d.net.serverOffsetMs) })),
      );
      syncAudio();
    },
  };
}
