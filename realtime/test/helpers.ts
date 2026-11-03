import { exports } from 'cloudflare:workers';
import type { ClientMsg, ServerMsg } from '@vco/shared/protocol';

export interface TestClient {
  ws: WebSocket;
  msgs: ServerMsg[];
  closed: { code: number } | null;
  send(m: ClientMsg | string): void;
  next<T extends ServerMsg['t']>(t: T, timeoutMs?: number): Promise<Extract<ServerMsg, { t: T }>>;
  waitClose(timeoutMs?: number): Promise<number>;
  close(): void;
}

export const ORIGIN = 'http://localhost:5173';
export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function connect(hall: number, origin = ORIGIN): Promise<TestClient> {
  const res = await (exports as any).default.fetch(`http://x/hall/${hall}`, { headers: { Upgrade: 'websocket', Origin: origin } });
  const ws = res.webSocket as WebSocket;
  if (!ws) throw new Error(`no websocket, status ${res.status}`);
  ws.accept();
  const c: TestClient = {
    ws,
    msgs: [],
    closed: null,
    send: (m) => ws.send(typeof m === 'string' ? m : JSON.stringify(m)),
    async next(t, timeoutMs = 3000) {
      const start = Date.now();
      let seen = 0;
      while (Date.now() - start < timeoutMs) {
        const i = c.msgs.findIndex((m, idx) => idx >= seen && m.t === t);
        if (i >= 0) return c.msgs.splice(i, 1)[0] as any;
        await sleep(10);
      }
      throw new Error(`timeout waiting for ${t}; got ${JSON.stringify(c.msgs.map((m) => m.t))}`);
    },
    async waitClose(timeoutMs = 3000) {
      const start = Date.now();
      while (!c.closed && Date.now() - start < timeoutMs) await sleep(10);
      if (!c.closed) throw new Error('not closed');
      return c.closed.code;
    },
    close: () => ws.close(1000, 'bye'),
  };
  ws.addEventListener('message', (e) => c.msgs.push(JSON.parse(e.data as string)));
  ws.addEventListener('close', (e) => (c.closed = { code: e.code }));
  return c;
}

export async function join(hall: number, name = 'An') {
  const c = await connect(hall);
  c.send({ t: 'hello', name, robe: 'lam', k: 0 });
  const w = await c.next('welcome');
  return { c, w };
}
