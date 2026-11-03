import { Pose } from '@vco/shared/protocol';
import { PLAYER_RADIUS, SPAWN, resolveCollision, type Zone } from '@vco/shared/world';

export const WALK_SPEED = 3; // m/s
export const RUN_FACTOR = 1.8;
const ARRIVE = 0.15;
const STUCK_WINDOW = 0.6; // giây
export const BOW_SECONDS = 1.6;
export const VAI_SECONDS = 1.2;
const DEADZONE = 0.05;

export class LocalPlayer {
  x = SPAWN.x;
  z = SPAWN.z;
  ry = SPAWN.ry;
  pose: Pose = Pose.Stand;
  private bowLeft = 0;
  private dirty = true;
  private target: { x: number; z: number } | null = null;
  private stuckT = 0;
  private stuckFrom = { x: 0, z: 0 };

  get hasTarget(): boolean { return this.target !== null; }

  /** Bấm xuống nền: tự đi tới (x, z). */
  moveTo(x: number, z: number): void {
    this.target = { x, z };
    this.bowLeft = 0;
    this.stuckT = 0;
    this.stuckFrom = { x: this.x, z: this.z };
  }

  cancelTarget(): void { this.target = null; }

  /** Đi theo hướng (wx, wz) trong hệ thế giới, chia nhỏ bước để không xuyên vật cản. */
  private walk(wx: number, wz: number, dist: number): void {
    const len = Math.hypot(wx, wz) || 1;
    const ux = wx / len;
    const uz = wz / len;
    const steps = Math.max(1, Math.ceil(dist / (PLAYER_RADIUS * 0.5)));
    let p = { x: this.x, z: this.z };
    for (let i = 0; i < steps; i++) p = resolveCollision(p.x + (ux * dist) / steps, p.z + (uz * dist) / steps);
    this.set(p.x, p.z, Math.atan2(ux, uz), Pose.Walk);
  }

  get changed(): boolean { return this.dirty; }
  takeChanged(): void { this.dirty = false; }

  private set(x: number, z: number, ry: number, pose: Pose) {
    if (x !== this.x || z !== this.z || ry !== this.ry || pose !== this.pose) this.dirty = true;
    this.x = x; this.z = z; this.ry = ry; this.pose = pose;
  }

  /** move: vector trong hệ camera (z = −1 là tiến), |move| ≤ 1. camYaw: góc quay camera quanh trục y. */
  update(dt: number, move: { x: number; z: number }, camYaw: number, run = false): void {
    const speed = WALK_SPEED * (run ? RUN_FACTOR : 1);
    const mag = Math.hypot(move.x, move.z);
    if (mag > DEADZONE) {
      this.target = null;
      this.bowLeft = 0;
      const c = Math.cos(camYaw);
      const s = Math.sin(camYaw);
      const wx = move.x * c + move.z * s;
      const wz = -move.x * s + move.z * c;
      this.walk(wx, wz, Math.hypot(wx, wz) * speed * dt);
      return;
    }
    if (this.target) {
      const dx = this.target.x - this.x;
      const dz = this.target.z - this.z;
      const d = Math.hypot(dx, dz);
      if (d < ARRIVE) {
        this.target = null;
        this.set(this.x, this.z, this.ry, Pose.Stand);
        return;
      }
      this.walk(dx, dz, Math.min(d, speed * dt));
      // kẹt (đích trong vật cản / bị chặn): sau STUCK_WINDOW mà đi được quá ít thì dừng
      this.stuckT += dt;
      if (this.stuckT >= STUCK_WINDOW) {
        const moved = Math.hypot(this.x - this.stuckFrom.x, this.z - this.stuckFrom.z);
        if (moved < speed * STUCK_WINDOW * 0.25) {
          this.target = null;
          this.set(this.x, this.z, this.ry, Pose.Stand);
          return;
        }
        this.stuckT = 0;
        this.stuckFrom = { x: this.x, z: this.z };
      }
      return;
    }
    if (this.pose === Pose.Bow || this.pose === Pose.Vai) {
      this.bowLeft -= dt;
      if (this.bowLeft <= 0) this.set(this.x, this.z, this.ry, this.pose === Pose.Bow ? Pose.Sit : Pose.Stand);
      return;
    }
    if (this.pose === Pose.Walk) this.set(this.x, this.z, this.ry, Pose.Stand);
  }

  sitAt(zone: Zone): void {
    this.bowLeft = 0;
    this.set(zone.x, zone.z, Math.PI, Pose.Sit); // nhìn về −z, nơi đặt tượng Phật
  }

  standUp(): void {
    if (this.pose === Pose.Sit || this.pose === Pose.Bow || this.pose === Pose.Vai) this.set(this.x, this.z, this.ry, Pose.Stand);
  }

  /** Ngồi bồ đoàn → lạy sát đất; đang đứng → vái. Đang đi/đang lạy thì không. */
  bow(): boolean {
    if (this.pose === Pose.Sit) {
      this.bowLeft = BOW_SECONDS;
      this.set(this.x, this.z, this.ry, Pose.Bow);
      return true;
    }
    if (this.pose === Pose.Stand) {
      this.bowLeft = VAI_SECONDS;
      this.set(this.x, this.z, this.ry, Pose.Vai);
      return true;
    }
    return false;
  }
}
