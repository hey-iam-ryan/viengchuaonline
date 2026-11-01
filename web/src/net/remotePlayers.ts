import * as THREE from 'three';
import type { PlayerState, ServerMsg } from '@vco/shared/protocol';
import { createAvatar, type Avatar } from '../player/avatar';
import { Interp } from './interpolation';

const LABEL_CROWD = 60;
const LABEL_NEAR = 9;

interface Remote { state: PlayerState; avatar: Avatar; interp: Interp }

/** Avatar của người khác trong cùng gian, chuyển động mượt nhờ nội suy. */
export class RemotePlayers {
  private map = new Map<string, Remote>();
  private selfId: string | null = null;

  constructor(private readonly scene: THREE.Scene) {}

  count(): number { return this.map.size; }

  apply(m: ServerMsg, now: number): void {
    if (m.t === 'welcome') {
      this.clear();
      this.selfId = m.id;
      for (const p of m.players) this.upsert(p, now);
    } else if (m.t === 'snap') {
      for (const p of m.u) this.upsert(p, now);
      for (const id of m.gone) this.remove(id);
    }
  }

  private upsert(p: PlayerState, now: number) {
    if (p.id === this.selfId) return;
    let r = this.map.get(p.id);
    if (r && (r.state.n !== p.n || r.state.r !== p.r)) { this.remove(p.id); r = undefined; }
    if (!r) {
      const avatar = createAvatar(p.r, p.n);
      this.scene.add(avatar.root);
      r = { state: p, avatar, interp: new Interp() };
      this.map.set(p.id, r);
    }
    r.state = p;
    r.interp.push(now, p.x, p.z, p.ry);
  }

  private remove(id: string) {
    const r = this.map.get(id);
    if (!r) return;
    this.scene.remove(r.avatar.root);
    r.avatar.dispose();
    this.map.delete(id);
  }

  update(now: number, camera?: THREE.Vector3): void {
    const crowded = this.map.size > LABEL_CROWD;
    const t = now / 1000;
    for (const r of this.map.values()) {
      const s = r.interp.sample(now);
      if (!s) continue;
      r.avatar.root.position.x = s.x;
      r.avatar.root.position.z = s.z;
      r.avatar.root.rotation.y = s.ry;
      r.avatar.setPose(r.state.p, t);
      if (camera) r.avatar.label.visible = !crowded || Math.hypot(s.x - camera.x, s.z - camera.z) < LABEL_NEAR;
    }
  }

  clear(): void {
    for (const id of [...this.map.keys()]) this.remove(id);
  }
}
