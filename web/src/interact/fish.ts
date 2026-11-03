import * as THREE from 'three';
import { LAKE } from '@vco/shared/world';

const BODY = new THREE.SphereGeometry(0.16, 10, 8);
const TAIL = new THREE.ConeGeometry(0.1, 0.18, 6);
const MATS = [0xf07a2a, 0xf2c95a, 0xe84a2a].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.5, emissive: c, emissiveIntensity: 0.15 }));
const LIFE = 7;

interface Fish { g: THREE.Group; tail: THREE.Mesh; from: THREE.Vector3; to: THREE.Vector3; t: number; phase: number }

/** Phóng sinh: mỗi lần thả 3 con cá chép từ bờ bơi ra giữa hồ lớn rồi lặn mất. */
export class FishSchool {
  private fish: Fish[] = [];
  constructor(private readonly scene: THREE.Scene) {}

  release(x: number, z: number, _now?: number): void {
    for (let i = 0; i < 3; i++) {
      const g = new THREE.Group();
      const body = new THREE.Mesh(BODY, MATS[i % MATS.length]);
      body.scale.set(1.8, 0.7, 0.8);
      const tail = new THREE.Mesh(TAIL, MATS[i % MATS.length]);
      tail.rotation.z = Math.PI / 2;
      tail.position.x = 0.36;
      g.add(body, tail);
      const from = new THREE.Vector3(Math.max(LAKE.maxX - 0.8, Math.min(x - 1.6, LAKE.maxX - 0.8)), 0.02, z + (i - 1) * 0.5);
      const to = new THREE.Vector3(LAKE.maxX - 7 - i * 2.5, -0.1, z + (i - 1) * 2.2 + (Math.random() - 0.5) * 2);
      g.position.copy(from);
      this.scene.add(g);
      this.fish.push({ g, tail, from, to, t: -i * 0.25, phase: Math.random() * 6 });
    }
  }

  update(dt: number): void {
    for (let i = this.fish.length - 1; i >= 0; i--) {
      const f = this.fish[i];
      f.t += dt;
      const k = Math.max(0, f.t) / LIFE;
      if (k >= 1) { this.scene.remove(f.g); this.fish.splice(i, 1); continue; }
      const e = 1 - (1 - k) * (1 - k);
      f.g.position.lerpVectors(f.from, f.to, e);
      f.g.position.y = 0.04 - Math.max(0, k - 0.75) * 1.2; // cuối hành trình lặn xuống
      f.g.position.z += Math.sin(f.t * 3 + f.phase) * 0.25;
      f.g.rotation.y = Math.atan2(-(f.to.z - f.from.z), f.to.x - f.from.x) + Math.PI + Math.sin(f.t * 6 + f.phase) * 0.25;
      f.tail.rotation.y = Math.sin(f.t * 14 + f.phase) * 0.6;
    }
  }
}
