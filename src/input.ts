// Keyboard + gamepad + touch, read independently of Phaser and mapped onto PlayerInput.
// Local play needs no join screen: every device that is used grabs the first free kaiju, and
// SWAP hops to the next free one (so one person can test a level by switching between kaiju).
import type { PlayerInput } from './sim/world';
import { readTouch } from './touch';

export interface DeviceRead extends PlayerInput {
  swap: boolean;
  start: boolean;
  any: boolean; // device was touched/pressed this frame
}

export const KEYMAPS = [
  { key: 'kbL', label: 'Keys L', left: ['KeyA'], right: ['KeyD'], jump: ['KeyW', 'Space'], grab: ['KeyS', 'KeyE'], swap: ['KeyQ'] },
  { key: 'kbR', label: 'Keys R', left: ['ArrowLeft'], right: ['ArrowRight'], jump: ['ArrowUp'], grab: ['ArrowDown', 'Enter', 'Numpad0'], swap: ['ShiftRight', 'Slash'] },
];

const keys: Record<string, boolean> = {};
const tapped = new Set<string>();
const BLOCK = new Set(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'Slash', 'Tab']);

export function initInput(onFirstGesture: () => void): void {
  window.addEventListener('keydown', e => {
    onFirstGesture();
    if ((e.target as HTMLElement | null)?.tagName === 'INPUT') return;
    keys[e.code] = true;
    if (!e.repeat) tapped.add(e.code);
    if (BLOCK.has(e.code)) e.preventDefault();
  });
  window.addEventListener('keyup', e => { keys[e.code] = false; });
  window.addEventListener('pointerdown', onFirstGesture);
  window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
}

export function injectTap(code: string): void {
  tapped.add(code);
}
export function consumeTap(code: string): boolean {
  return tapped.delete(code);
}
export function clearTaps(): void {
  tapped.clear();
}

function pads(): (Gamepad | null)[] {
  return navigator.getGamepads ? Array.from(navigator.getGamepads()) : [];
}

const EMPTY = (): DeviceRead => ({ mx: 0, jump: false, grab: false, swap: false, start: false, any: false });

/** Every device attached right now, each with its current state. */
export function readDevices(): Map<string, DeviceRead> {
  const out = new Map<string, DeviceRead>();
  for (const m of KEYMAPS) {
    const d = EMPTY();
    d.mx = (m.right.some(k => keys[k]) ? 1 : 0) - (m.left.some(k => keys[k]) ? 1 : 0);
    d.jump = m.jump.some(k => keys[k]);
    d.grab = m.grab.some(k => keys[k]);
    d.swap = m.swap.some(k => keys[k]);
    d.any = d.mx !== 0 || d.jump || d.grab || d.swap;
    out.set(m.key, d);
  }
  pads().forEach((gp, i) => {
    if (!gp) return;
    const d = EMPTY();
    const b = (n: number) => !!gp.buttons[n]?.pressed;
    let mx = gp.axes[0] ?? 0;
    if (Math.abs(mx) < 0.3) mx = 0;
    if (b(14)) mx = -1;
    if (b(15)) mx = 1;
    d.mx = mx;
    d.jump = b(0) || b(12);
    d.grab = b(2) || b(1) || b(7) || b(5);
    d.swap = b(3) || b(4);
    d.start = b(9);
    d.any = d.mx !== 0 || d.jump || d.grab || d.swap || d.start;
    out.set(`pad${i}`, d);
  });
  const t = readTouch();
  out.set('touch', { ...t, start: false, any: t.mx !== 0 || t.jump || t.grab || t.swap });
  return out;
}

export function deviceLabel(key: string): string {
  if (key === 'kbL') return 'WASD';
  if (key === 'kbR') return 'ARROWS';
  if (key === 'touch') return 'TOUCH';
  if (key.startsWith('pad')) return `PAD ${Number(key.slice(3)) + 1}`;
  return key;
}

/** All devices on this machine merged into one input (online: one player per device). */
export function mergedInput(devs: Map<string, DeviceRead>): DeviceRead {
  const out = EMPTY();
  for (const d of devs.values()) {
    out.mx += d.mx;
    out.jump ||= d.jump; out.grab ||= d.grab; out.swap ||= d.swap; out.start ||= d.start; out.any ||= d.any;
  }
  out.mx = Math.max(-1, Math.min(1, out.mx));
  return out;
}

/** Local play: which device drives which kaiju. */
export class Controllers {
  owner = new Map<string, number>(); // device -> kaiju index
  private prevSwap = new Map<string, boolean>();
  constructor(public count: number) {}

  private free(from: number): number {
    const taken = new Set(this.owner.values());
    for (let k = 0; k < this.count; k++) {
      const i = (from + k) % this.count;
      if (!taken.has(i)) return i;
    }
    return -1;
  }

  /** Returns per-kaiju inputs and handles joining/swapping. */
  update(devs: Map<string, DeviceRead>): PlayerInput[] {
    const inputs: PlayerInput[] = Array.from({ length: this.count }, () => ({ mx: 0, jump: false, grab: false }));
    for (const [key, d] of devs) {
      if (!this.owner.has(key) && d.any) {
        const k = this.free(0);
        if (k >= 0) this.owner.set(key, k);
      }
      const swapEdge = d.swap && !this.prevSwap.get(key);
      this.prevSwap.set(key, d.swap);
      const own = this.owner.get(key);
      if (own === undefined) continue;
      if (swapEdge) {
        const k = this.free(own + 1);
        if (k >= 0) { this.owner.set(key, k); continue; }
      }
      const inp = inputs[own];
      inp.mx = Math.max(-1, Math.min(1, inp.mx + d.mx));
      inp.jump ||= d.jump;
      inp.grab ||= d.grab;
    }
    return inputs;
  }

  /** Device label driving kaiju i, or null if it is asleep. */
  labelOf(i: number): string | null {
    for (const [k, v] of this.owner) if (v === i) return deviceLabel(k);
    return null;
  }
}
