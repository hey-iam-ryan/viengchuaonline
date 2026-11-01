import { HALL_COUNT } from '@vco/shared/protocol';
import type { Env } from './env';
export { Hall } from './hall';
export { Lobby } from './lobby';

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const m = url.pathname.match(/^\/hall\/(\d+)$/);
    if (m) {
      const n = Number(m[1]);
      if (n >= HALL_COUNT) return new Response('Not found', { status: 404 });
      return env.HALL.get(env.HALL.idFromName(`hall-${n}`)).fetch(new Request(`https://hall/${n}`, req));
    }
    return new Response('Not found', { status: 404 });
  },
} satisfies ExportedHandler<Env>;
