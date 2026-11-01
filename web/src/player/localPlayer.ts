import { Pose } from '@vco/shared/protocol';
import { PLAYER_RADIUS, SPAWN, resolveCollision, type Zone } from '@vco/shared/world';

export const WALK_SPEED = 3; // m/s
export const BOW_SECONDS = 1.6;
const DEADZONE = 0.05;

export class LocalPlayer {
  x = SPAWN.x;
  z = SPAWN.z;
  ry = SPAWN.ry;
  pose: Pose = Pose.Stand;
  private bowLeft = 0;
  private dirty = true;

  get changed(): boolean { return this.dirty; }
  takeChanged(): void { this.dirty = false; }

  private set(x: number, z: number, ry: number, pose: Pose) {
    if (x !== this.x || z !== this.z || ry !== this.ry || pose !== this.pose) this.dirty = true;
    this.x = x; this.z = z; this.ry = ry; this.pose = pose;
  }

  /** move: vector trong hệ camera (z = −1 là tiến), |move| ≤ 1. camYaw: góc quay camera quanh trục y. */
  update(dt: number, move: { x: number; z: number }, camYaw: number): void {
    const mag = Math.hypot(move.x, move.z);
    if (mag > DEADZONE) {
      this.bowLeft = 0;
      const c = Math.cos(camYaw);
      const s = Math.sin(camYaw);
      const wx = move.x * c + move.z * s;
      const wz = -move.x * s + move.z * c;
      // chia nhỏ bước để không "xuyên" qua vật cản mỏng khi dt lớn
      const dist = Math.hypot(wx, wz) * WALK_SPEED * dt;
      const steps = Math.max(1, Math.ceil(dist / (PLAYER_RADIUS * 0.5)));
      let p = { x: this.x, z: this.z };
      for (let i = 0; i < steps; i++) p = resolveCollision(p.x + (wx * WALK_SPEED * dt) / steps, p.z + (wz * WALK_SPEED * dt) / steps);
      this.set(p.x, p.z, Math.atan2(wx, wz), Pose.Walk);
      return;
    }
    if (this.pose === Pose.Bow) {
      this.bowLeft -= dt;
      if (this.bowLeft <= 0) this.set(this.x, this.z, this.ry, Pose.Sit);
      return;
    }
    if (this.pose === Pose.Walk) this.set(this.x, this.z, this.ry, Pose.Stand);
  }

  sitAt(zone: Zone): void {
    this.bowLeft = 0;
    this.set(zone.x, zone.z, Math.PI, Pose.Sit); // nhìn về −z, nơi đặt tượng Phật
  }

  standUp(): void {
    if (this.pose === Pose.Sit || this.pose === Pose.Bow) this.set(this.x, this.z, this.ry, Pose.Stand);
  }

  /** Bắt đầu một lạy. Chỉ được khi đang ngồi (và không đang lạy). */
  bow(): boolean {
    if (this.pose !== Pose.Sit) return false;
    this.bowLeft = BOW_SECONDS;
    this.set(this.x, this.z, this.ry, Pose.Bow);
    return true;
  }
}
