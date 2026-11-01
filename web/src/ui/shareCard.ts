import { t } from './i18n';

export type CardKind = 'bows' | 'beads';

export function cardText(kind: CardKind, n: number): { title: string; sub: string } {
  return { title: t(kind === 'bows' ? 'card.bows' : 'card.beads', { n }), sub: t('card.sub') };
}

/** Link rủ bạn: kèm số gian (1-based) để bạn bè vào đúng gian của mình. */
export function inviteUrl(base: string, hall: number | null): string {
  const u = new URL(base);
  if (hall !== null && hall >= 0) u.searchParams.set('g', String(hall + 1));
  return u.toString();
}

export function preferredHall(search: string): number {
  const g = Number(new URLSearchParams(search).get('g'));
  return Number.isInteger(g) && g >= 1 ? g - 1 : -1;
}

/** Ghép ảnh chụp cảnh chùa + chữ thành thẻ 1080×1350 để đăng mạng xã hội. */
export async function makeCard(shot: HTMLCanvasElement, kind: CardKind, n: number, link: string): Promise<Blob | null> {
  const W = 1080;
  const H = 1350;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  if (!g) return null;
  const s = Math.max(W / shot.width, H / shot.height);
  g.drawImage(shot, (W - shot.width * s) / 2, (H - shot.height * s) / 2, shot.width * s, shot.height * s);
  const grd = g.createLinearGradient(0, H * 0.45, 0, H);
  grd.addColorStop(0, 'rgba(60,10,5,0)');
  grd.addColorStop(1, 'rgba(60,10,5,0.92)');
  g.fillStyle = grd;
  g.fillRect(0, 0, W, H);
  const { title, sub } = cardText(kind, n);
  g.textAlign = 'center';
  g.fillStyle = '#f2c95a';
  g.font = 'bold 64px "Times New Roman", serif';
  g.fillText(title, W / 2, H - 250, W - 80);
  g.fillStyle = '#fff6e3';
  g.font = '40px system-ui, sans-serif';
  g.fillText(sub, W / 2, H - 170, W - 80);
  g.font = '32px system-ui, sans-serif';
  g.fillText(link.replace(/^https?:\/\//, ''), W / 2, H - 100, W - 80);
  return new Promise((r) => c.toBlob((b) => r(b), 'image/jpeg', 0.88));
}

/** Chia sẻ ảnh qua Web Share (điện thoại), không được thì tải ảnh về + chép link. */
export async function shareImage(blob: Blob, text: string, url: string): Promise<'shared' | 'downloaded' | 'failed'> {
  const file = new File([blob], 'vieng-chua-online.jpg', { type: 'image/jpeg' });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  try {
    if (nav.share && nav.canShare?.({ files: [file] })) {
      await nav.share({ files: [file], text: `${text} ${url}` });
      return 'shared';
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = file.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    await nav.clipboard?.writeText(`${text} ${url}`).catch(() => {});
    return 'downloaded';
  } catch {
    return 'failed';
  }
}
