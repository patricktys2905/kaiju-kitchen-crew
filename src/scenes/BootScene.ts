import * as Phaser from 'phaser';
import { fitCamera, setAvailable } from '../render/art';
import { fontsReady } from '../render/fonts';

/** Loads public/art/manifest.json, then every image in it (kaiju + Gemini kitchen art), then the menu. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }
  preload(): void {
    this.load.json('art-manifest', 'art/manifest.json');
    this.load.on('loaderror', () => { /* missing art: shapes fallback */ });
  }
  create(): void {
    fitCamera(this);
    const list = (this.cache.json.get('art-manifest') as string[] | undefined) ?? [];
    const go = () => { void fontsReady().then(() => this.scene.start('menu')); };
    if (!list.length) { go(); return; }
    const bar = this.add.graphics();
    this.load.on('progress', (v: number) => {
      bar.clear();
      bar.fillStyle(0x3a2c22, 1).fillRoundedRect(440, 350, 400, 20, 10);
      bar.fillStyle(0xffb347, 1).fillRoundedRect(440, 350, 400 * v, 20, 10);
    });
    for (const k of list) this.load.image(k, `art/${k}.webp`);
    this.load.once('complete', () => {
      setAvailable(list.filter(k => this.textures.exists(k)));
      go();
    });
    this.load.start();
  }
}
