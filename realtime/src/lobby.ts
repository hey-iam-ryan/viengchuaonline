import { DurableObject } from 'cloudflare:workers';
import type { Env } from './env';

export class Lobby extends DurableObject<Env> {
  async report(_hall: number, _count: number): Promise<void> {}
}
