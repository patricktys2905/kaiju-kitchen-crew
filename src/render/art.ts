// Gemini art: what's available, the render resolution, and a tiny per-frame sprite pool.
// Every draw checks `hasArt` and falls back to the shape drawing when an image is missing.
import type * as Phaser from 'phaser';
import { VIEW } from '../sim/constants';

/** Render resolution multiplier: the canvas is VIEW × RES real pixels, so phones get crisp art. */
export const RES = (() => {
  if (typeof window === 'undefined') return 1;
  const dpr = window.devicePixelRatio || 1;
  const longest = Math.max(window.screen?.width ?? VIEW.w, window.screen?.height ?? VIEW.h) * dpr;
  return Math.max(1, Math.min(2, Math.round((longest / VIEW.w) * 2) / 2));
})();

let available = new Set<string>();
export const hasArt = (key: string) => available.has(key);
export function setAvailable(keys: string[]): void {
  available = new Set(keys);
}

/** Points a scene's main camera at the 1280×720 layout at the current resolution. */
export function fitCamera(scene: Phaser.Scene, extraZoom = 1): Phaser.Cameras.Scene2D.Camera {
  return scene.cameras.main.setOrigin(0, 0).setZoom(RES * extraZoom);
}

/** Reuses Image objects frame to frame: begin(), take() as many as needed, end() hides the rest. */
export class SpritePool {
  private items: Phaser.GameObjects.Image[] = [];
  private used = 0;
  constructor(private scene: Phaser.Scene, private layer: Phaser.GameObjects.Layer) {}
  begin(): void {
    this.used = 0;
  }
  take(key: string, depth: number): Phaser.GameObjects.Image {
    let img = this.items[this.used];
    if (!img) {
      img = this.scene.add.image(0, 0, key);
      this.layer.add(img);
      this.items.push(img);
    } else if (img.texture.key !== key) {
      img.setTexture(key);
    }
    this.used++;
    img.setCrop();
    return img.setVisible(true).setDepth(depth).setAlpha(1).setAngle(0).setFlipX(false).setFlipY(false).setOrigin(0.5).clearTint();
  }
  end(): void {
    for (let i = this.used; i < this.items.length; i++) this.items[i].setVisible(false);
  }
}

/** Where each prop's ends/corners are (texture px): those keep their shape, only the middle stretches. */
export const SLICES: Record<string, [number, number, number, number]> = {
  'ob-shelf': [70, 70, 0, 0],
  'ob-glass-shelf': [60, 60, 0, 0],
  'ob-board': [0, 0, 150, 70],
  'ob-scale': [140, 140, 0, 0],
  'ob-toaster': [150, 150, 0, 0],
  'ob-sign': [95, 95, 85, 85],
  'ob-plate': [150, 150, 0, 0],
  'ob-spatula': [70, 140, 0, 0],
  'ob-choc': [70, 70, 0, 0],
  'ob-belt': [90, 90, 0, 0],
};

/** A nine-slice of a prop, `w`×`h` world px, corners drawn at `scale` (so they never squash). */
export function addSlice(scene: Phaser.Scene, key: string, x: number, y: number, w: number, h: number, scale: number): Phaser.GameObjects.NineSlice {
  const [l, r, t, b] = SLICES[key];
  return scene.add.nineslice(x, y, key, undefined, Math.max(l + r + 2, w / scale), Math.max(t + b + 2, h / scale), l, r, t, b).setScale(scale);
}

/** Like SpritePool, for nine-slices (one pool per texture). */
export class SlicePool {
  private pools = new Map<string, { items: Phaser.GameObjects.NineSlice[]; used: number }>();
  constructor(private scene: Phaser.Scene, private layer: Phaser.GameObjects.Layer) {}
  begin(): void {
    for (const p of this.pools.values()) p.used = 0;
  }
  /** Top-left at (x, y), size w×h in world px; `scale` = texture px → world px for the corners. */
  take(key: string, x: number, y: number, w: number, h: number, scale: number, depth: number): Phaser.GameObjects.NineSlice {
    let p = this.pools.get(key);
    if (!p) { p = { items: [], used: 0 }; this.pools.set(key, p); }
    const [l, r, t, b] = SLICES[key];
    const tw = Math.max(l + r + 2, w / scale), th = Math.max(t + b + 2, h / scale);
    let ns = p.items[p.used];
    if (!ns) {
      ns = this.scene.add.nineslice(0, 0, key, undefined, tw, th, l, r, t, b);
      this.layer.add(ns);
      p.items.push(ns);
    } else if (Math.abs(ns.width - tw) > 0.5 || Math.abs(ns.height - th) > 0.5) {
      ns.setSize(tw, th);
    }
    p.used++;
    return ns.setOrigin(0, 0).setScale(scale).setPosition(x, y).setDepth(depth).setVisible(true).setAlpha(1).clearTint();
  }
  end(): void {
    for (const p of this.pools.values()) for (let i = p.used; i < p.items.length; i++) p.items[i].setVisible(false);
  }
}

/** Scales an image to fit inside w×h (keeps aspect). */
export function fitInside(img: Phaser.GameObjects.Image, w: number, h: number): Phaser.GameObjects.Image {
  const s = Math.min(w / img.width, h / img.height);
  return img.setScale(s);
}
