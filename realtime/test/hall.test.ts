import { test, expect } from 'vitest';
import { resolveCollision } from '@vco/shared/world';
import { HALL_CAPACITY } from '@vco/shared/protocol';
import { connect, join, sleep } from './helpers';

test('hello → welcome có id & now', async () => {
  const { w } = await join(0);
  expect(w).toMatchObject({ hall: 0, players: [], incense: [] });
  expect(typeof w.id).toBe('string');
  expect(Math.abs(w.now - Date.now())).toBeLessThan(5000);
});

test('người thứ hai thấy người thứ nhất', async () => {
  const a = await join(1, 'Minh');
  a.c.send({ t: 's', x: 1, z: 10, ry: 0, p: 1 });
  await sleep(400);
  const b = await join(1, 'Lan');
  expect(b.w.players).toEqual([expect.objectContaining({ id: a.w.id, n: 'Minh', x: 1, z: 10, p: 1 })]);
  // a thấy b xuất hiện qua snap
  let seen = false;
  for (let i = 0; i < 5 && !seen; i++) seen = (await a.c.next('snap')).u.some((p) => p.id === b.w.id && p.n === 'Lan');
  expect(seen).toBe(true);
});

test('tên được làm sạch phía server', async () => {
  const a = await join(2, 'đ.m');
  const b = await join(2);
  expect(b.w.players[0]).toMatchObject({ id: a.w.id, n: 'Phật tử' });
});

test('toạ độ trên bàn thờ bị đẩy ra', async () => {
  const a = await join(3);
  const b = await join(3);
  a.c.send({ t: 's', x: 0, z: -25, ry: 0, p: 0 });
  let found;
  for (let i = 0; i < 5 && !found; i++) found = (await b.c.next('snap')).u.find((p) => p.id === a.w.id && p.z !== 15);
  expect(found).toBeDefined();
  expect({ x: found!.x, z: found!.z }).toEqual(resolveCollision(0, -25));
});

test('tin trước hello bị bỏ qua', async () => {
  const a = await connect(4);
  a.send({ t: 's', x: 1, z: 1, ry: 0, p: 0 });
  a.send({ t: 'a', a: 'bow' });
  const b = await join(4);
  expect(b.w.players).toEqual([]);
});

test('gộp snapshot ≤ 5Hz', async () => {
  const a = await join(5);
  const b = await join(5);
  b.c.msgs.length = 0;
  // 15 tin trong ~1s (dưới rate limit 15/s) → server chỉ được phát ≤ ~5 snap/giây
  for (let i = 0; i < 15; i++) {
    a.c.send({ t: 's', x: i * 0.035, z: 5, ry: 0, p: 1 });
    await sleep(70);
  }
  await sleep(300);
  const snaps = b.c.msgs.filter((m) => m.t === 'snap');
  expect(snaps.length).toBeGreaterThan(0);
  expect(snaps.length).toBeLessThanOrEqual(7);
  expect(snaps.length).toBeLessThan(15);
  const last = snaps.at(-1) as any;
  expect(last.u.find((p: any) => p.id === a.w.id).x).toBeCloseTo(0.49);
});

test('hành động phát cho người khác', async () => {
  const a = await join(6);
  const b = await join(6);
  a.c.send({ t: 'a', a: 'bow' });
  expect(await b.c.next('act')).toEqual({ t: 'act', id: a.w.id, a: 'bow' });
});

test('thắp hương có cooldown & còn khi người mới vào', async () => {
  const a = await join(7);
  const b = await join(7);
  a.c.send({ t: 'inc', b: 'yard' });
  a.c.send({ t: 'inc', b: 'yard' });
  const inc = await b.c.next('inc');
  expect(inc.i.b).toBe('yard');
  await sleep(300);
  expect(b.c.msgs.filter((m) => m.t === 'inc')).toHaveLength(0);
  const c = await join(7);
  expect(c.w.incense).toHaveLength(1);
});

test(`đầy ${HALL_CAPACITY} → full + đóng 4001`, async () => {
  const conns = [];
  for (let i = 0; i < HALL_CAPACITY; i++) conns.push(await connect(8));
  const extra = await connect(8);
  expect(await extra.next('full')).toEqual({ t: 'full' });
  expect(await extra.waitClose()).toBe(4001);
});

test('spam rác → đóng 4008', async () => {
  const a = await join(9);
  for (let i = 0; i < 25; i++) a.c.send('{bad');
  expect(await a.c.waitClose()).toBe(4008);
});

test('tin quá rate bị đếm là vi phạm', async () => {
  const a = await join(10);
  for (let i = 0; i < 80; i++) a.c.send({ t: 'a', a: 'mo' });
  expect(await a.c.waitClose()).toBe(4008);
});

test('rời đi → gone', async () => {
  const a = await join(11);
  const b = await join(11);
  a.c.close();
  let gone: string[] = [];
  for (let i = 0; i < 5 && !gone.includes(a.w.id); i++) gone = (await b.c.next('snap')).gone;
  expect(gone).toContain(a.w.id);
});

test('gian có người thì đặt alarm heartbeat; alarm báo lại số người về Lobby', async () => {
  const { env } = await import('cloudflare:workers');
  const { runInDurableObject, runDurableObjectAlarm } = await import('cloudflare:test');
  await join(30);
  const hall = (env as any).HALL.get((env as any).HALL.idFromName('hall-30'));
  const alarm = await runInDurableObject(hall, async (_i: unknown, s: DurableObjectState) => s.storage.getAlarm());
  expect(alarm).not.toBeNull();
  const lobby = (env as any).LOBBY.get((env as any).LOBBY.idFromName('lobby'));
  await runInDurableObject(lobby, async (_i: unknown, s: DurableObjectState) => s.storage.deleteAll());
  expect(await runDurableObjectAlarm(hall)).toBe(true);
  await sleep(100);
  // chỉ xét gian 30: các gian của test khác trong file có thể cũng đang báo về Lobby
  const c30 = await runInDurableObject(lobby, async (_i: unknown, s: DurableObjectState) => (await s.storage.get<any>('counts'))?.[30]?.c);
  expect(c30).toBe(1);
});

test('người thắp hương không nhận lại sự kiện của chính mình (tránh nhân đôi)', async () => {
  const a = await join(31);
  const b = await join(31);
  a.c.send({ t: 'inc', b: 'hall' });
  await b.c.next('inc');
  await sleep(200);
  expect(a.c.msgs.filter((m) => m.t === 'inc')).toHaveLength(0);
});

test('thả đèn hoa đăng: kẹp vào hồ, cooldown, người mới vào thấy, không gửi lại người thả', async () => {
  const a = await join(40);
  const b = await join(40);
  expect(a.w.lanterns).toEqual([]);
  a.c.send({ t: 'den', x: 999, z: 4 });
  a.c.send({ t: 'den', x: -7, z: 4 });
  const got = await b.c.next('den');
  const { POND } = await import('@vco/shared/world');
  expect(got.l.x).toBeLessThanOrEqual(POND.maxX);
  await sleep(200);
  expect(b.c.msgs.filter((m) => m.t === 'den')).toHaveLength(0);
  expect(a.c.msgs.filter((m) => m.t === 'den')).toHaveLength(0);
  const c = await join(40);
  expect(c.w.lanterns).toHaveLength(1);
});

test('lời nguyện: kèm pháp danh đã làm sạch, cooldown, giữ cho người mới', async () => {
  const a = await join(41, 'Minh Tâm');
  const b = await join(41);
  a.c.send({ t: 'ng', p: 0 });
  a.c.send({ t: 'ng', p: 1 });
  const w = await b.c.next('ng');
  expect(w.w).toMatchObject({ n: 'Minh Tâm', p: 0 });
  await sleep(200);
  expect(b.c.msgs.filter((m) => m.t === 'ng')).toHaveLength(0);
  const c = await join(41);
  expect(c.w.wishes.map((x) => x.p)).toEqual([0]);
});

test('chắp tay chào: gửi cho cả gian (trừ người chào), có cooldown', async () => {
  const a = await join(50, 'Minh Tâm');
  const b = await join(50);
  const c = await join(50);
  a.c.send({ t: 'hi', to: b.w.id });
  a.c.send({ t: 'hi', to: b.w.id });
  expect(await b.c.next('hi')).toEqual({ t: 'hi', from: a.w.id, to: b.w.id });
  expect(await c.c.next('hi')).toEqual({ t: 'hi', from: a.w.id, to: b.w.id });
  await sleep(200);
  expect(b.c.msgs.filter((m) => m.t === 'hi')).toHaveLength(0);
  expect(a.c.msgs.filter((m) => m.t === 'hi')).toHaveLength(0);
});

test('cấp bậc: có trong welcome của người khác, cập nhật khi lên cấp', async () => {
  const a = await connect(60);
  a.send({ t: 'hello', name: 'Minh', robe: 'lam', k: 2 });
  const aw = await a.next('welcome');
  const b = await join(60);
  expect(b.w.players.find((p) => p.id === aw.id)?.k).toBe(2);
  a.send({ t: 'rk', k: 3 });
  let k = 2;
  for (let i = 0; i < 5 && k !== 3; i++) k = (await b.c.next('snap')).u.find((p) => p.id === aw.id)?.k ?? k;
  expect(k).toBe(3);
});

test('quét lá: welcome có lá, quét lá gần thì cả gian thấy lá biến mất, lá xa thì không', async () => {
  const a = await join(70);
  const b = await join(70);
  expect(a.w.leaves.length).toBeGreaterThan(0);
  const leaf = a.w.leaves[0];
  const far = a.w.leaves.find((l) => Math.hypot(l.x - leaf.x, l.z - leaf.z) > 6);
  a.c.send({ t: 's', x: leaf.x, z: leaf.z + 0.5, ry: 0, p: 0 });
  await sleep(300);
  if (far) a.c.send({ t: 'quet', id: far.id });
  a.c.send({ t: 'quet', id: leaf.id });
  const m = await b.c.next('la');
  expect(m.del).toEqual([leaf.id]);
  expect(m.by).toBe(a.w.id);
  await sleep(200);
  expect(b.c.msgs.filter((x) => x.t === 'la' && x.del)).toHaveLength(0);
  const c = await join(70);
  expect(c.w.leaves.find((l) => l.id === leaf.id)).toBeUndefined();
});
