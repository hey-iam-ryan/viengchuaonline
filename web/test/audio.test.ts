import { test, expect, vi, afterEach } from 'vitest';
import { AudioManager } from '../src/interact/audio';

afterEach(() => { delete (globalThis as any).AudioContext; });

test('trước unlock: không tạo AudioContext, mọi lệnh là no-op', async () => {
  const spy = vi.fn();
  (globalThis as any).AudioContext = spy;
  const a = new AudioManager();
  a.playBell(); a.playMo(); a.playBead(); a.playChime();
  await a.setChant(true);
  a.seekChant(3);
  expect(spy).not.toHaveBeenCalled();
});
test('không có Web Audio thì unlock cũng không ném lỗi', () => {
  const a = new AudioManager();
  expect(() => { a.unlock(); a.playBell(); }).not.toThrow();
});
test('unlock tạo đúng một AudioContext', () => {
  const ctor = vi.fn(function (this: any) {
    this.state = 'suspended';
    this.resume = vi.fn(async () => {});
    this.currentTime = 0;
    this.sampleRate = 8000;
    this.destination = {};
    this.createGain = () => ({ gain: { value: 1, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() { return this; } });
  });
  (globalThis as any).AudioContext = ctor;
  const a = new AudioManager();
  a.unlock();
  a.unlock();
  expect(ctor).toHaveBeenCalledTimes(1);
});

test('iOS: context bị "interrupted" thì unlock gọi resume lại', () => {
  const resume = vi.fn(async () => {});
  (globalThis as any).AudioContext = vi.fn(function (this: any) {
    this.state = 'running';
    this.resume = resume;
    this.destination = {};
    this.createGain = () => ({ gain: { value: 1 }, connect() { return this; } });
  });
  const a = new AudioManager();
  a.unlock();
  (a as any).ctx.state = 'interrupted';
  a.unlock();
  expect(resume).toHaveBeenCalledTimes(1);
});
