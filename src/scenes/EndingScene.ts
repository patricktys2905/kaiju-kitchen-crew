// The end-of-game celebration: the whole crew dancing in their hats, confetti, and the star tally.
import * as Phaser from 'phaser';
import { sfx } from '../audio';
import { clearTaps, consumeTap, readDevices } from '../input';
import { playMusic } from '../music';
import { HATS, countStars, starMask, totalStars, unlockedHats, hatOf } from '../progress';
import { body, display, withShadow } from '../render/fonts';
import { SPECIES, VIEW } from '../sim/constants';
import { LEVELS } from '../sim/levels';
import { setTouchMode } from '../touch';
import { drawMenuBackdrop } from './MenuScene';

const CONFETTI = [0xff4a6a, 0x4ab0ff, 0xffe14a, 0x6ad86a, 0xffffff, 0xb07aff, 0xff9a3c];

export class EndingScene extends Phaser.Scene {
  private crew: { img: Phaser.GameObjects.Image; hat: Phaser.GameObjects.Image | null; x: number; ph: number }[] = [];
  private bits: { x: number; y: number; vx: number; vy: number; c: number; r: number; s: number }[] = [];
  private g!: Phaser.GameObjects.Graphics;
  private t = 0;
  private ready = 0;
  constructor() {
    super('ending');
  }

  init(data: { species?: number[]; back?: string }): void {
    this.registry.set('ending-back', data.back ?? 'menu');
    this.registry.set('ending-species', data.species?.length ? data.species : [0, 9, 2, 7, 15, 5]);
  }

  create(): void {
    clearTaps();
    setTouchMode('end');
    drawMenuBackdrop(this);
    playMusic('menu');
    sfx.recipeDone();
    this.crew = [];
    this.bits = [];
    this.t = 0;
    this.ready = 1.2;
    this.add.graphics().fillStyle(0x140e0a, 0.45).fillRect(0, 0, VIEW.w, VIEW.h);
    const all = LEVELS.length;
    const stars = totalStars(), spoons = LEVELS.filter((_, i) => starMask(i) & 4).length;
    const perfect = LEVELS.filter((_, i) => countStars(starMask(i)) === 3).length;
    withShadow(this.add.text(VIEW.w / 2, 70, 'ALL ORDERS SERVED!', display(78, '#ffe9c7', { align: 'center' })).setOrigin(0.5), 6);
    withShadow(this.add.text(VIEW.w / 2, 140, 'The Kaiju Kitchen Crew cooked every dish in the house.', body(26, '#fff6e6', 800)).setOrigin(0.5), 3);
    const lines = [
      `★ ${stars} / ${all * 3} stars`,
      `${spoons} / ${all} golden spoons found`,
      `${unlockedHats().length} / ${HATS.length} hats unlocked`,
      perfect === all ? 'A perfect kitchen. The chef weeps with joy!' : `${perfect} perfect levels. Can you find every spoon?`,
    ];
    withShadow(this.add.text(VIEW.w / 2, 185, lines.join('\n'), body(28, '#ffd84a', 900, { align: 'center', lineSpacing: 6 })).setOrigin(0.5, 0), 3);
    withShadow(this.add.text(VIEW.w / 2, VIEW.h - 22, 'Thanks for playing! · Enter / tap: menu', body(22, '#ffe9c7', 800)).setOrigin(0.5), 3);
    // the crew, dancing on the counter
    const species = this.registry.get('ending-species') as number[];
    const n = species.length, gap = Math.min(170, (VIEW.w - 200) / Math.max(1, n - 1));
    species.forEach((sp, i) => {
      const x = VIEW.w / 2 + (i - (n - 1) / 2) * gap;
      const key = `kaiju-${sp}`;
      const img = this.add.image(x, 640, this.textures.exists(key) ? key : '__WHITE').setOrigin(0.5, 1);
      if (!this.textures.exists(key)) img.setDisplaySize(60, 60).setTint(SPECIES[sp].color);
      const h = hatOf(sp);
      const hat = h && this.textures.exists('hat-' + h) ? this.add.image(x, 0, 'hat-' + h).setOrigin(0.5, 1) : null;
      this.crew.push({ img, hat, x, ph: i * 1.3 });
    });
    this.g = this.add.graphics().setDepth(5);
    for (let k = 0; k < 160; k++) this.bits.push(this.bit(Math.random() * VIEW.h));
  }

  private bit(y = -20) {
    return { x: Math.random() * VIEW.w, y, vx: (Math.random() - 0.5) * 60, vy: 60 + Math.random() * 120, c: CONFETTI[(Math.random() * CONFETTI.length) | 0], r: Math.random() * 6, s: 4 + Math.random() * 5 };
  }

  update(_: number, deltaMs: number): void {
    const dt = Math.min(0.05, deltaMs / 1000);
    this.t += dt;
    this.ready -= dt;
    for (const c of this.crew) {
      const ph = this.t * 7 + c.ph, up = Math.max(0, Math.sin(ph));
      const base = 120 / c.img.height;
      const squash = Math.sin(ph) < 0.1 ? 0.88 : 1;
      c.img.setScale(base * (2 - squash), base * squash).setPosition(c.x, 640 - up * 34).setAngle(Math.sin(ph * 0.5) * 12).setFlipX(Math.sin(ph * 0.5) > 0);
      if (c.hat) {
        const hw = c.img.displayWidth * 0.5;
        c.hat.setScale((hw / c.hat.width) * 0.9).setPosition(c.x + Math.sin((c.img.angle * Math.PI) / 180) * c.img.displayHeight * 0.8, c.img.y - c.img.displayHeight * 0.86 + c.hat.displayHeight * 0.35)
          .setAngle(c.img.angle).setFlipX(c.img.flipX);
      }
    }
    this.g.clear();
    for (const b of this.bits) {
      b.x += b.vx * dt + Math.sin(this.t * 3 + b.r) * 20 * dt;
      b.y += b.vy * dt;
      b.r += dt * 6;
      if (b.y > VIEW.h + 10) Object.assign(b, this.bit());
      this.g.fillStyle(b.c, 0.9).fillRect(b.x, b.y, b.s * Math.abs(Math.cos(b.r)) + 1, b.s);
    }
    const devs = readDevices();
    const any = [...devs.values()].some(x => x.start || x.grab || x.jump);
    if (this.ready <= 0 && (consumeTap('Enter') || consumeTap('Space') || consumeTap('Escape') || any)) {
      sfx.ui();
      this.scene.start(this.registry.get('ending-back') as string);
    }
    clearTaps();
  }
}
