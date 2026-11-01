import { test, expect, vi } from 'vitest';
import { fullscreenSupport, toggleFullscreen } from '../src/ui/fullscreen';

const doc = (o: any) => ({ documentElement: o.el ?? {}, fullscreenElement: o.fs ?? null, exitFullscreen: o.exit, webkitExitFullscreen: o.wexit, webkitFullscreenElement: o.wfs ?? null }) as any;
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1';

test('có Fullscreen API (chuẩn hoặc webkit) → api', () => {
  expect(fullscreenSupport(doc({ el: { requestFullscreen() {} } }), 'x')).toBe('api');
  expect(fullscreenSupport(doc({ el: { webkitRequestFullscreen() {} } }), 'x')).toBe('api');
});
test('iPhone không có API → hướng dẫn thêm vào màn hình chính', () => {
  expect(fullscreenSupport(doc({}), IPHONE)).toBe('ios-pwa');
  expect(fullscreenSupport(doc({}), 'Mozilla/5.0 (X11; Linux)')).toBe('none');
});
test('đang mở như app (standalone) → không cần nút', () => {
  expect(fullscreenSupport(doc({}), IPHONE, true)).toBe('standalone');
});
test('toggle: chưa full → request; đang full → exit', async () => {
  const req = vi.fn(async () => {});
  const exit = vi.fn(async () => {});
  await toggleFullscreen(doc({ el: { requestFullscreen: req }, exit }));
  expect(req).toHaveBeenCalled();
  await toggleFullscreen(doc({ el: { requestFullscreen: req }, exit, fs: {} }));
  expect(exit).toHaveBeenCalled();
});
test('toggle không ném lỗi khi trình duyệt từ chối', async () => {
  await expect(toggleFullscreen(doc({ el: { requestFullscreen: async () => { throw new Error('denied'); } } }))).resolves.toBe(false);
});
