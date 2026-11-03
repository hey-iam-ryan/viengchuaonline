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
  const lanterns = { add: vi.fn() };
  const wishes = { add: vi.fn() };
  const sent: ClientMsg[] = [];
  let now = 0;
  const onProgress = vi.fn();
  const a = new Actions({ player, audio: audio as any, incense: incense as any, lanterns: lanterns as any, wishes: wishes as any, send: (m) => sent.push(m), now: () => now, storage: memStorage(), onProgress });
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
test('đứng ở đâu cũng vái được (tính là một lạy)', () => {
  const s = setup();
  expect(s.a.available().bow).toBe(true);
  s.a.bow();
  expect(s.sent).toEqual([{ t: 'a', a: 'bow' }]);
  expect(s.a.progress.bowsTotal).toBe(1);
});
test('đang đi thì không lạy', () => {
  const s = setup();
  s.player.update(0.1, { x: 1, z: 0 }, 0);
  expect(s.a.available().bow).toBe(false);
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

test('thả đèn chỉ ở bờ hồ, có cooldown', () => {
  const s = setup('pond');
  expect(s.a.available().lantern).toBe(true);
  expect(s.a.lantern()).toBe(true);
  expect(s.a.lantern()).toBe(false);
  expect(s.sent).toEqual([{ t: 'den', x: expect.any(Number), z: expect.any(Number) }]);
  const far = setup();
  expect(far.a.lantern()).toBe(false);
});
test('gửi lời nguyện chỉ ở cây bồ đề, có cooldown', () => {
  const s = setup('wish');
  expect(s.a.available().wish).toBe(true);
  expect(s.a.wish(2)).toBe(true);
  expect(s.a.wish(3)).toBe(false);
  expect(s.sent).toEqual([{ t: 'ng', p: 2 }]);
});

test('chắp tay chào: vái + gửi tin, cooldown 3s', () => {
  const s = setup();
  expect(s.a.greet('bob')).toBe(true);
  expect(s.player.pose).toBe(Pose.Vai);
  expect(s.sent).toEqual([{ t: 'hi', to: 'bob' }]);
  s.setNow(1000);
  expect(s.a.greet('bob')).toBe(false);
  s.setNow(3100);
  s.player.update(2, { x: 0, z: 0 }, 0);
  expect(s.a.greet('bob')).toBe(true);
});

test('mỗi hành động thành công báo onPerform để hiện chữ bay', () => {
  const onPerform = vi.fn();
  const player = new LocalPlayer();
  const z = ZONES.find((z) => z.id === 'mo')!;
  player.x = z.x; player.z = z.z;
  const a = new Actions({ player, audio: { playBell: vi.fn(), playMo: vi.fn(), playBead: vi.fn(), playChime: vi.fn() } as any, incense: { add: vi.fn() } as any, send: () => {}, now: () => 0, storage: memStorage(), onPerform });
  a.mo();
  a.bead();
  a.bow();
  expect(onPerform.mock.calls.map((c) => c[0])).toEqual(['mo', 'bead', 'bow']);
  a.bell(); // xa chuông → không báo
  expect(onPerform).toHaveBeenCalledTimes(3);
});

test('quét lá: chỉ khi có lá gần, gửi tin, cộng điểm, báo chữ bay', () => {
  const onPerform = vi.fn();
  const player = new LocalPlayer();
  const leaves = { nearest: vi.fn(() => ({ id: 7, x: player.x, z: player.z + 0.5 })), remove: vi.fn() };
  const sent: ClientMsg[] = [];
  const a = new Actions({ player, audio: { playBell: vi.fn(), playMo: vi.fn(), playBead: vi.fn(), playChime: vi.fn() } as any, incense: { add: vi.fn() } as any, leaves: leaves as any, send: (m) => sent.push(m), now: () => 0, storage: memStorage(), onPerform });
  expect(a.available().sweep).toBe(true);
  expect(a.sweep()).toBe(true);
  expect(leaves.remove).toHaveBeenCalledWith(7);
  expect(sent).toEqual([{ t: 'quet', id: 7 }]);
  expect(a.progress.leavesTotal).toBe(1);
  expect(onPerform).toHaveBeenCalledWith('sweep');
  leaves.nearest.mockReturnValue(null as any);
  expect(a.available().sweep).toBe(false);
  expect(a.sweep()).toBe(false);
});
