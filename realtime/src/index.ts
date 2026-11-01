import { HALL_COUNT } from '@vco/shared/protocol';
import type { Env } from './env';
export { Hall } from './hall';
export { Lobby } from './lobby';

function allowedOrigin(req: Request, env: Env): string | null {
  const origin = req.headers.get('Origin');
  if (!origin) return null;
  const list = env.ALLOWED_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean);
  return list.includes(origin) ? origin : null;
}

const json = (body: unknown, origin: string, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': origin, Vary: 'Origin', ...extra },
  });

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const origin = allowedOrigin(req, env);
    if (!origin) return new Response('Forbidden', { status: 403 });
    if (req.method === 'OPTIONS')
      return new Response(null, { headers: { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'GET', Vary: 'Origin' } });

    const lobby = () => env.LOBBY.get(env.LOBBY.idFromName('lobby'));

    if (url.pathname === '/lobby') {
      const exclude = (url.searchParams.get('exclude') ?? '').split(',').filter((s) => s.trim() !== '').map(Number).filter(Number.isInteger);
      const prefer = Number(url.searchParams.get('prefer') ?? -1);
      return json(await lobby().assign(exclude, Number.isInteger(prefer) ? prefer : -1), origin, { 'Cache-Control': 'no-store' });
    }
    if (url.pathname === '/stats') {
      const l = lobby();
      const [total, today] = await Promise.all([l.total(), l.today()]);
      return json({ total, today }, origin, { 'Cache-Control': 'max-age=5' });
    }

    const m = url.pathname.match(/^\/hall\/(\d+)$/);
    if (m) {
      const n = Number(m[1]);
      if (n >= HALL_COUNT) return new Response('Not found', { status: 404 });
      return env.HALL.get(env.HALL.idFromName(`hall-${n}`)).fetch(new Request(`https://hall/${n}`, req));
    }
    return new Response('Not found', { status: 404 });
  },
} satisfies ExportedHandler<Env>;
