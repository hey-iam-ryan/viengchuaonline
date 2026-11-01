import * as THREE from 'three';

let tex: THREE.Texture | null | undefined;
function glowTexture(): THREE.Texture | null {
  if (tex !== undefined) return tex;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  if (!g) return (tex = null);
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.25, 'rgba(255,255,255,0.55)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  return (tex = new THREE.CanvasTexture(c));
}

/** Quầng sáng giả (additive sprite) — rẻ hơn hậu kỳ bloom, chạy tốt trên điện thoại. */
export function glowSprite(color: number, size: number, baseOpacity = 0.5): THREE.Sprite {
  const m = new THREE.SpriteMaterial({ map: glowTexture(), color, transparent: true, opacity: baseOpacity, blending: THREE.AdditiveBlending, depthWrite: false });
  const s = new THREE.Sprite(m);
  s.scale.setScalar(size);
  s.userData.baseOpacity = baseOpacity;
  return s;
}

/** Đêm càng sâu, quầng sáng càng rõ. */
export function setGlowNight(glows: THREE.Sprite[], night: number) {
  for (const s of glows) (s.material as THREE.SpriteMaterial).opacity = s.userData.baseOpacity * (0.35 + 0.9 * night);
}
