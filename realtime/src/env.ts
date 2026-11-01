import type { Hall } from './hall';
import type { Lobby } from './lobby';

export interface Env {
  HALL: DurableObjectNamespace<Hall>;
  LOBBY: DurableObjectNamespace<Lobby>;
  ALLOWED_ORIGINS: string;
}
