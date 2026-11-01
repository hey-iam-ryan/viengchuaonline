const KEYS: Record<string, [number, number]> = {
  KeyW: [0, -1], ArrowUp: [0, -1], KeyS: [0, 1], ArrowDown: [0, 1],
  KeyA: [-1, 0], ArrowLeft: [-1, 0], KeyD: [1, 0], ArrowRight: [1, 0],
};
const JOY_RADIUS = 56;

const isTyping = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);

/**
 * Bàn phím (WASD/mũi tên), kéo chuột/vuốt để xoay camera, lăn chuột/chụm 2 ngón để zoom,
 * joystick ảo ở nửa trái màn hình khi chạm.
 */
export class Controls {
  readonly move = { x: 0, z: 0 };
  camYaw = 0;
  camPitch = 0.32;
  camDist = 6;
  private down = new Set<string>();
  private joy = { x: 0, z: 0 };
  private joyId: number | null = null;
  private joyOrigin = { x: 0, y: 0 };
  private dragId: number | null = null;
  private dragLast = { x: 0, y: 0 };
  private pinch = new Map<number, { x: number; y: number }>();
  private pinchDist = 0;
  private joyBase: HTMLDivElement;
  private joyKnob: HTMLDivElement;
  private off: (() => void)[] = [];

  constructor(private readonly el: HTMLElement) {
    this.joyBase = document.createElement('div');
    this.joyBase.className = 'joy';
    this.joyBase.dataset.testid = 'joystick';
    this.joyKnob = document.createElement('div');
    this.joyKnob.className = 'joy-knob';
    this.joyBase.appendChild(this.joyKnob);
    document.getElementById('ui')?.appendChild(this.joyBase);

    this.on(window, 'keydown', (e: KeyboardEvent) => {
      if (isTyping(e.target) || !KEYS[e.code]) return;
      this.down.add(e.code);
      this.recompute();
    });
    this.on(window, 'keyup', (e: KeyboardEvent) => { this.down.delete(e.code); this.recompute(); });
    this.on(window, 'blur', () => { this.down.clear(); this.joy = { x: 0, z: 0 }; this.recompute(); });
    this.on(el, 'pointerdown', (e: PointerEvent) => this.pointerDown(e));
    this.on(window, 'pointermove', (e: PointerEvent) => this.pointerMove(e));
    this.on(window, 'pointerup', (e: PointerEvent) => this.pointerUp(e));
    this.on(window, 'pointercancel', (e: PointerEvent) => this.pointerUp(e));
    this.on(el, 'wheel', (e: WheelEvent) => { this.zoom(e.deltaY * 0.01); e.preventDefault(); }, { passive: false });
  }

  get hasTouch() { return this.joyId !== null; }

  private on<T extends Event>(t: EventTarget, type: string, fn: (e: T) => void, opts?: AddEventListenerOptions) {
    t.addEventListener(type, fn as EventListener, opts);
    this.off.push(() => t.removeEventListener(type, fn as EventListener, opts));
  }

  private zoom(d: number) { this.camDist = Math.max(3, Math.min(11, this.camDist + d)); }

  private pointerDown(e: PointerEvent) {
    if (e.pointerType === 'touch') {
      this.pinch.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (this.pinch.size === 2) {
        const [a, b] = [...this.pinch.values()];
        this.pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
      }
      if (e.clientX < window.innerWidth * 0.45 && this.joyId === null) {
        this.joyId = e.pointerId;
        this.joyOrigin = { x: e.clientX, y: e.clientY };
        this.joyBase.style.left = `${e.clientX}px`;
        this.joyBase.style.top = `${e.clientY}px`;
        this.joyBase.classList.add('active');
        return;
      }
    }
    if (this.dragId === null) {
      this.dragId = e.pointerId;
      this.dragLast = { x: e.clientX, y: e.clientY };
    }
  }

  private pointerMove(e: PointerEvent) {
    if (this.pinch.has(e.pointerId)) {
      this.pinch.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (this.pinch.size === 2 && this.joyId === null) {
        const [a, b] = [...this.pinch.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        this.zoom((this.pinchDist - d) * 0.03);
        this.pinchDist = d;
        return;
      }
    }
    if (e.pointerId === this.joyId) {
      let dx = e.clientX - this.joyOrigin.x;
      let dy = e.clientY - this.joyOrigin.y;
      const d = Math.hypot(dx, dy);
      if (d > JOY_RADIUS) { dx = (dx / d) * JOY_RADIUS; dy = (dy / d) * JOY_RADIUS; }
      this.joyKnob.style.transform = `translate(${dx}px, ${dy}px)`;
      this.joy = { x: dx / JOY_RADIUS, z: dy / JOY_RADIUS };
      this.recompute();
    } else if (e.pointerId === this.dragId) {
      const dx = e.clientX - this.dragLast.x;
      const dy = e.clientY - this.dragLast.y;
      this.dragLast = { x: e.clientX, y: e.clientY };
      this.camYaw -= dx * 0.006;
      this.camPitch = Math.max(0.05, Math.min(1.1, this.camPitch + dy * 0.004));
    }
  }

  private pointerUp(e: PointerEvent) {
    this.pinch.delete(e.pointerId);
    if (e.pointerId === this.joyId) {
      this.joyId = null;
      this.joy = { x: 0, z: 0 };
      this.joyKnob.style.transform = '';
      this.joyBase.classList.remove('active');
      this.recompute();
    }
    if (e.pointerId === this.dragId) this.dragId = null;
  }

  private recompute() {
    let x = this.joy.x;
    let z = this.joy.z;
    for (const k of this.down) { x += KEYS[k][0]; z += KEYS[k][1]; }
    const m = Math.hypot(x, z);
    if (m > 1) { x /= m; z /= m; }
    this.move.x = x === 0 ? 0 : x;
    this.move.z = z === 0 ? 0 : z;
  }

  dispose(): void {
    this.off.forEach((f) => f());
    this.joyBase.remove();
  }
}
