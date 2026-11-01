import { test, expect, vi } from 'vitest';
import { Pose, type ClientMsg } from '@vco/shared/protocol';
import { ZONES } from '@vco/shared/world';
import { Actions } from '../src/interact/actions';
import { LocalPlayer } from '../src/player/localPlayer';
import { memStorage } from './storage';

function setup(zoneId?: string) {
  const player = new LocalPlayer();
  if (zoneId) { const z = ZONES.find((z) => z.id === zoneId)!; player.x = z.x; player.z = z.z; }
  const audio = { playBell: vi.fn(), playMo: vi.fn(), playBead: vi.fn(), playChime: vi.fn() };
  const incense = { add: vi.fn() };
  const sent: ClientMsg[] = [];
  let now = 0;
  const onProgress = vi.fn();
  const a = new Actions({ player, audio: audio as any, incense: incense as any, send: (m) => sent.push(m), now: () => now, storage: memStorage(), onProgress });
  return { a, player, audio, incense, sent, setNow: (t: number) => (now = t), onProgress };
}

test('thắp hương cooldown 10s', () => {
  const s = setup('burner-yard');
  expect(s.a.available().incense).toBe('yard');
  expect(s.a.lightIncense()).toBe(true);
  s.setNow(5000);
  expect(s.a.lightIncense()).toBe(false);
  s.setNow(10_001);
  expect(s.a.lightIncense()).toBe(true);
  expect(s.sent).toEqual([{ t: 'inc', b: 'yard' }, { t: 'inc', b: 'yard' }]);
  expect(s.incense.add).toHaveBeenCalledTimes(2);
  expect(s.a.progress.incenseTotal).toBe(2);
});
test('xa lư hương thì không thắp được', () => {
  const s = setup();
  expect(s.a.available().incense).toBeNull();
  expect(s.a.lightIncense()).toBe(false);
  expect(s.sent).toEqual([]);
});
test('không lạy khi đứng', () => {
  const s = setup('cushion-0');
  expect(s.a.available()).toMatchObject({ sit: true, bow: false });
  s.a.bow();
  expect(s.sent).toEqual([]);
});
test('ngồi rồi lạy: gửi tin, đếm, báo mốc', () => {
  const s = setup('cushion-0');
  s.a.sit();
  expect(s.player.pose).toBe(Pose.Sit);
  expect(s.a.available()).toMatchObject({ sit: false, bow: true });
  s.a.bow();
  expect(s.sent).toEqual([{ t: 'a', a: 'bow' }]);
  expect(s.a.progress.bowsTotal).toBe(1);
  expect(s.audio.playChime).toHaveBeenCalled();
  expect(s.onProgress).toHaveBeenLastCalledWith(expect.objectContaining({ bowsTotal: 1 }), null);
});
test('chuông & mõ chỉ khi đứng gần', () => {
  const far = setup();
  far.a.bell(); far.a.mo();
  expect(far.sent).toEqual([]);
  const b = setup('bell');
  b.a.bell();
  expect(b.sent).toEqual([{ t: 'a', a: 'chuong' }]);
  expect(b.audio.playBell).toHaveBeenCalled();
  const m = setup('mo');
  m.a.mo();
  expect(m.sent).toEqual([{ t: 'a', a: 'mo' }]);
});
test('lần chuỗi ở đâu cũng được; chỉ báo người khác khi xong vòng', () => {
  const s = setup();
  for (let i = 0; i < 108; i++) s.a.bead();
  expect(s.audio.playBead).toHaveBeenCalledTimes(108);
  expect(s.sent).toEqual([{ t: 'a', a: 'beads' }]);
  expect(s.a.progress.beadRounds).toBe(1);
});
test('hành động người khác: chuông/mõ nghe nhỏ hơn', () => {
  const s = setup();
  s.a.onRemoteAction('x', 'chuong');
  s.a.onRemoteAction('x', 'mo');
  s.a.onRemoteAction('x', 'bow');
  expect(s.audio.playBell).toHaveBeenCalledWith(0.45);
  expect(s.audio.playMo).toHaveBeenCalledWith(0.35);
});
