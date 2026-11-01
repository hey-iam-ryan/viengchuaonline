export type FsSupport = 'api' | 'ios-pwa' | 'standalone' | 'none';

const isIOS = (ua: string) => /iPhone|iPad|iPod/.test(ua);

export function isStandalone(): boolean {
  try {
    return matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches || (navigator as any).standalone === true;
  } catch {
    return false;
  }
}

/** api: có Fullscreen API · ios-pwa: iPhone, phải "Thêm vào MH chính" · standalone: đang mở như app. */
export function fullscreenSupport(doc: Document = document, ua = navigator.userAgent, standalone = isStandalone()): FsSupport {
  if (standalone) return 'standalone';
  const el = doc.documentElement as any;
  if (el?.requestFullscreen || el?.webkitRequestFullscreen) return 'api';
  return isIOS(ua) ? 'ios-pwa' : 'none';
}

export const isFullscreen = (doc: Document = document) => !!(doc.fullscreenElement || (doc as any).webkitFullscreenElement);

/** Bật/tắt toàn màn hình. Trả true nếu đang ở toàn màn hình sau khi gọi. Không ném lỗi. */
export async function toggleFullscreen(doc: Document = document): Promise<boolean> {
  const d = doc as any;
  try {
    if (isFullscreen(doc)) {
      await (d.exitFullscreen ?? d.webkitExitFullscreen)?.call(doc);
      return false;
    }
    const el = d.documentElement;
    await (el.requestFullscreen ?? el.webkitRequestFullscreen)?.call(el, { navigationUI: 'hide' });
    return true;
  } catch {
    return false;
  }
}
