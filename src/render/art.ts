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

/** Scales an image to fit inside w×h (keeps aspect). */
export function fitInside(img: Phaser.GameObjects.Image, w: number, h: number): Phaser.GameObjects.Image {
  const s = Math.min(w / img.width, h / img.height);
  return img.setScale(s);
}
