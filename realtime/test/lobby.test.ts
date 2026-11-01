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
  expect(await res.json()).toEqual({ total: 13 });
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
