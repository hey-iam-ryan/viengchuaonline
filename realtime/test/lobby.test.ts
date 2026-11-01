import { test, expect, beforeEach } from 'vitest';
import { runInDurableObject } from 'cloudflare:test';
import { env, exports } from 'cloudflare:workers';
import { ORIGIN, join, sleep } from './helpers';

const lobby = () => (env as any).LOBBY.get((env as any).LOBBY.idFromName('lobby'));
const get = (path: string, origin = ORIGIN) => (exports as any).default.fetch(`http://x${path}`, { headers: { Origin: origin } }) as Promise<Response>;
beforeEach(async () => {
  await runInDurableObject(lobby(), async (_i: unknown, state: DurableObjectState) => state.storage.deleteAll());
});
const getJson = async (path: string) => (await get(path)).json() as Promise<any>;

test('xếp vào gian 0 khi trống', async () => expect(await getJson('/lobby')).toEqual({ hall: 0, total: 0 }));

test('gian 0 đạt 90 → gian 1; exclude được tôn trọng', async () => {
  await lobby().report(0, 90);
  expect((await getJson('/lobby')).hall).toBe(1);
  expect((await getJson('/lobby?exclude=1')).hall).toBe(2);
  expect((await getJson('/lobby?exclude=1,2,abc')).hall).toBe(3);
});

test('mọi gian ≥ 90 → gian ít người nhất còn chỗ', async () => {
  for (let h = 0; h < 100; h++) await lobby().report(h, h === 42 ? 91 : 99);
  expect((await getJson('/lobby')).hall).toBe(42);
});

test('tất cả đầy → -1', async () => {
  for (let h = 0; h < 100; h++) await lobby().report(h, 100);
  expect((await getJson('/lobby')).hall).toBe(-1);
});

test('total = tổng counts; stats có cache header', async () => {
  await lobby().report(3, 7);
  await lobby().report(4, 5);
  await lobby().report(4, 6);
  const res = await get('/stats');
  expect(await res.json()).toMatchObject({ total: 13 });
  expect(res.headers.get('Cache-Control')).toBe('max-age=5');
  expect(res.headers.get('Access-Control-Allow-Origin')).toBe(ORIGIN);
});

test('report bỏ qua giá trị rác', async () => {
  await lobby().report(500, 3);
  await lobby().report(1, -4);
  await lobby().report(2, Number.NaN);
  expect((await getJson('/stats')).total).toBe(0);
});

test('origin lạ → 403; hall 100 → 404; đường lạ → 404', async () => {
  expect((await get('/lobby', 'https://evil.example')).status).toBe(403);
  expect((await get('/hall/100')).status).toBe(404);
  expect((await get('/nope')).status).toBe(404);
});

test('ws từ origin lạ bị chặn', async () => {
  const res = await (exports as any).default.fetch('http://x/hall/0', { headers: { Upgrade: 'websocket', Origin: 'https://evil.example' } });
  expect(res.status).toBe(403);
});

test('Hall join thật làm tăng total', async () => {
  await join(20);
  let total = 0;
  for (let i = 0; i < 30 && total < 1; i++) {
    await sleep(100);
    total = (await getJson('/stats')).total;
  }
  expect(total).toBeGreaterThanOrEqual(1);
});

test('báo cáo cũ hơn STALE_MS bị bỏ qua (gian bị reset không kịp báo)', async () => {
  await lobby().report(5, 40);
  await lobby().report(6, 2);
  await runInDurableObject(lobby(), async (_i: unknown, state: DurableObjectState) => {
    const c = (await state.storage.get<any>('counts'))!;
    c[5].at = Date.now() - 10 * 60_000;
    await state.storage.put('counts', c);
  });
  expect((await getJson('/stats')).total).toBe(2);
});

test('giữ chỗ khi xếp: nhiều người vào dồn dập trước khi gian kịp báo vẫn được chia gian', async () => {
  const halls: number[] = [];
  for (let i = 0; i < 95; i++) halls.push((await getJson('/lobby')).hall);
  expect(halls.filter((h) => h === 0)).toHaveLength(90);
  expect(halls.slice(90)).toEqual([1, 1, 1, 1, 1]);
});

test('rủ bạn: prefer gian còn chỗ thì vào đúng gian đó', async () => {
  expect((await getJson('/lobby?prefer=7')).hall).toBe(7);
  await lobby().report(8, 100);
  expect((await getJson('/lobby?prefer=8')).hall).toBe(0);
  expect((await getJson('/lobby?prefer=abc')).hall).toBe(0);
});

test('thống kê trong ngày: Hall gửi số liệu gộp, /stats trả về today', async () => {
  await lobby().report(1, 2, { incense: 3, bows: 5, lanterns: 1, wishes: 2 });
  await lobby().report(2, 1, { incense: 1 });
  expect(await getJson('/stats')).toEqual({ total: 3, today: { incense: 4, bows: 5, lanterns: 1, wishes: 2 } });
});

test('Hall gộp số lạy/hương rồi báo về Lobby', async () => {
  const a = await join(42);
  a.c.send({ t: 'inc', b: 'yard' });
  a.c.send({ t: 'a', a: 'bow' });
  let today: any = {};
  for (let i = 0; i < 30 && !(today.incense >= 1 && today.bows >= 1); i++) {
    await sleep(100);
    today = (await getJson('/stats')).today;
  }
  expect(today.incense).toBeGreaterThanOrEqual(1);
  expect(today.bows).toBeGreaterThanOrEqual(1);
});
