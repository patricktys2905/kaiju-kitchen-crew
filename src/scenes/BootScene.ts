import * as Phaser from 'phaser';
import { fontsReady } from '../render/fonts';
import { SPECIES } from '../sim/constants';

/** Loads the kaiju art (shared with Kitchen Kaiju) and the fonts, then opens the menu. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }
  preload(): void {
    const bar = this.add.graphics();
    this.load.on('progress', (v: number) => {
      bar.clear();
      bar.fillStyle(0x3a2c22, 1).fillRoundedRect(440, 350, 400, 20, 10);
      bar.fillStyle(0xffb347, 1).fillRoundedRect(440, 350, 400 * v, 20, 10);
    });
    this.load.on('loaderror', () => { /* missing art: shapes fallback */ });
    SPECIES.forEach((_, i) => this.load.image(`kaiju-${i}`, `art/kaiju-${i}.webp`));
  }
  create(): void {
    void fontsReady().then(() => this.scene.start('menu'));
  }
}
