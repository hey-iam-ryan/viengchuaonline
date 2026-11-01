import { test, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ServerMsg } from '@vco/shared/protocol';
import { NetClient, type NetStatus } from '../src/net/client';

class FakeWS {
  static all: FakeWS[] = [];
  static OPEN = 1;
  readyState = 0;
  sent: any[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;
  onclose: ((e: { code: number }) => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(public url: string) { FakeWS.all.push(this); }
  send(s: string) { this.sent.push(JSON.parse(s)); }
  close(code = 1000) { this.readyState = 3; this.onclose?.({ code }); }
  // điều khiển từ test
  open() { this.readyState = 1; this.onopen?.(); }
  recv(m: ServerMsg) { this.onmessage?.({ data: JSON.stringify(m) }); }
  drop(code = 1006) { this.readyState = 3; this.onclose?.({ code }); }
}
const last = () => FakeWS.all.at(-1)!;
const hello = { name: 'An', robe: 'lam' as const };
const welcome = (hall: number, now: number): ServerMsg => ({ t: 'welcome', id: 'me', hall, now, players: [], incense: [] });
const flush = async () => { for (let i = 0; i < 5; i++) await Promise.resolve(); };

function lobby(...halls: number[]) {
  const urls: string[] = [];
  const fetchFn = vi.fn(async (u: string) => {
    urls.push(u);
    const hall = halls.length > 1 ? halls.shift()! : halls[0];
    return { ok: true, json: async () => ({ hall, total: 1 }) } as Response;
  });
  return { fetchFn, urls };
}

beforeEach(() => { FakeWS.all = []; vi.useFakeTimers(); vi.setSystemTime(1_000_000); });
afterEach(() => vi.useRealTimers());

function make(fetchFn: any, random = () => 0.5) {
  const c = new NetClient({ url: 'https://rt.example', fetchFn, WS: FakeWS as any, random });
  const status: [NetStatus, number | null][] = [];
  c.on('status', (s, h) => status.push([s, h]));
  return { c, status };
}

test('không có URL → solo', () => {
  const c = new NetClient({ url: null });
  const s = vi.fn();
  c.on('status', s);
  c.start(hello);
  expect(s).toHaveBeenLastCalledWith('solo', null);
});

test('lobby → hall → welcome → online, offset đồng hồ', async () => {
  const { fetchFn, urls } = lobby(3);
  const { c, status } = make(fetchFn);
  c.start(hello);
  await flush();
  expect(urls[0]).toBe('https://rt.example/lobby');
  expect(last().url).toBe('wss://rt.example/hall/3');
  last().open();
  expect(last().sent[0]).toEqual({ t: 'hello', name: 'An', robe: 'lam' });
  last().recv(welcome(3, Date.now() + 5000));
  expect(status.at(-1)).toEqual(['online', 3]);
  expect(c.serverOffsetMs).toBe(5000);
  expect(c.hall).toBe(3);
});

test('full → thử gian khác tối đa 3 lần rồi solo', async () => {
  const { fetchFn, urls } = lobby(0, 1, 2, 3);
  const { c, status } = make(fetchFn);
  c.start(hello);
  for (let k = 0; k < 4; k++) {
    await flush();
    last().open();
    last().recv({ t: 'full' });
    last().drop(4001);
  }
  await flush();
  expect(urls).toEqual([
    'https://rt.example/lobby',
    'https://rt.example/lobby?exclude=0',
    'https://rt.example/lobby?exclude=0,1',
    'https://rt.example/lobby?exclude=0,1,2',
  ]);
  expect(status.at(-1)).toEqual(['solo', null]);
});

test('lobby trả -1 → solo', async () => {
  const { fetchFn } = lobby(-1);
  const { c, status } = make(fetchFn);
  c.start(hello);
  await flush();
  expect(status.at(-1)).toEqual(['solo', null]);
  expect(FakeWS.all).toHaveLength(0);
});

test('rớt kết nối → backoff có jitter, trần 30s', async () => {
  const fetchFn = vi.fn(async () => { throw new Error('offline'); });
  const spy = vi.spyOn(globalThis, 'setTimeout');
  const { c } = make(fetchFn, () => 0.5);
  c.start(hello);
  const delays: number[] = [];
  for (let k = 0; k < 7; k++) {
    await flush();
    const call = spy.mock.calls.at(-1)!;
    delays.push(call[1] as number);
    vi.advanceTimersByTime(call[1] as number);
  }
  expect(delays).toEqual([1000, 2000, 4000, 8000, 16000, 30000, 30000]);
});

test('jitter: random=0 → nửa thời gian', async () => {
  const fetchFn = vi.fn(async () => { throw new Error('offline'); });
  const spy = vi.spyOn(globalThis, 'setTimeout');
  const { c } = make(fetchFn, () => 0);
  c.start(hello);
  await flush();
  expect(spy.mock.calls.at(-1)![1]).toBe(500);
});

test('đang online rồi rớt → solo rồi tự kết nối lại', async () => {
  const { fetchFn } = lobby(2);
  const { c, status } = make(fetchFn);
  c.start(hello);
  await flush();
  last().open();
  last().recv(welcome(2, Date.now()));
  last().drop();
  expect(status.at(-1)).toEqual(['solo', null]);
  vi.advanceTimersByTime(1000);
  await flush();
  last().open();
  last().recv(welcome(2, Date.now()));
  expect(status.at(-1)).toEqual(['online', 2]);
});

test('sendState gộp ≤ 5Hz, gửi trạng thái mới nhất', async () => {
  const { fetchFn } = lobby(0);
  const { c } = make(fetchFn);
  c.start(hello);
  await flush();
  last().open();
  last().recv(welcome(0, Date.now()));
  for (let k = 0; k < 20; k++) {
    c.sendState({ x: k, z: 0, ry: 0, p: 1 });
    vi.advanceTimersByTime(50);
  }
  vi.advanceTimersByTime(300);
  const states = last().sent.filter((m) => m.t === 's');
  expect(states.length).toBeGreaterThanOrEqual(4);
  expect(states.length).toBeLessThanOrEqual(6);
  expect(states.at(-1).x).toBe(19);
});

test('offline thì send bỏ qua, không ném lỗi', () => {
  const c = new NetClient({ url: null });
  c.start(hello);
  expect(() => { c.send({ t: 'a', a: 'bow' }); c.sendState({ x: 0, z: 0, ry: 0, p: 0 }); }).not.toThrow();
});

test('msg chuyển tiếp cho listener', async () => {
  const { fetchFn } = lobby(0);
  const { c } = make(fetchFn);
  const got: ServerMsg[] = [];
  c.on('msg', (m) => got.push(m));
  c.start(hello);
  await flush();
  last().open();
  last().recv(welcome(0, Date.now()));
  last().recv({ t: 'act', id: 'x', a: 'bow' });
  expect(got.map((m) => m.t)).toEqual(['welcome', 'act']);
});

test('đổi gian: hỏi lobby với exclude gian hiện tại', async () => {
  const { fetchFn, urls } = lobby(4, 5);
  const { c } = make(fetchFn);
  c.start(hello);
  await flush();
  last().open();
  last().recv(welcome(4, Date.now()));
  c.changeHall();
  await flush();
  expect(urls.at(-1)).toBe('https://rt.example/lobby?exclude=4');
});
