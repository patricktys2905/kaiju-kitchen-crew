import * as Phaser from 'phaser';
import { sfx } from '../audio';
import { clearTaps, consumeTap } from '../input';
import { applyPendingUpdate } from '../pwa';
import { SPECIES, VIEW } from '../sim/constants';
import { fitCamera, hasArt } from '../render/art';
import { isFullscreen, isInstalledApp, setTouchMode, toggleFullscreen } from '../touch';
import { mountPanel } from '../ui';
import { musicOn, playMusic, toggleMusic } from '../music';

/** Draws a little kitchen with kaiju bouncing along the counter (behind the menus). */
export function drawMenuBackdrop(scene: Phaser.Scene): void {
  fitCamera(scene);
  const g = scene.add.graphics();
  if (hasArt('bg-menu')) scene.add.image(0, 0, 'bg-menu').setOrigin(0).setDisplaySize(VIEW.w, VIEW.h).setDepth(-1);
  else {
  g.fillStyle(0xfaf1e2, 1).fillRect(0, 0, VIEW.w, VIEW.h);
  g.lineStyle(2, 0xe0cfb4, 1);
  for (let y = 0; y < 560; y += 24) {
    g.lineBetween(0, y, VIEW.w, y);
    const off = (y / 24) % 2 ? 24 : 0;
    for (let x = off; x < VIEW.w; x += 48) g.lineBetween(x, y, x, y + 24);
  }
  g.fillStyle(0xece6dc, 1).fillRect(0, 600, VIEW.w, 14);
  g.fillStyle(0x9a6438, 1).fillRect(0, 614, VIEW.w, 106);
  g.fillStyle(0x7b4c28, 1);
  for (let x = 0; x < VIEW.w; x += 160) g.fillRect(x, 614, 3, 106);
  }
  const picks = [0, 9, 2, 7, 15, 5];
  picks.forEach((sp, i) => {
    if (!scene.textures.exists(`kaiju-${sp}`)) return;
    const img = scene.add.image(90 + i * 220, 600, `kaiju-${sp}`).setOrigin(0.5, 1);
    img.setScale(96 / img.height);
    scene.tweens.add({ targets: img, y: 600 - 26, duration: 380 + i * 37, yoyo: true, repeat: -1, ease: 'Quad.easeOut', delay: i * 90 });
  });
  scene.add.graphics().setDepth(5).fillStyle(0x140e0a, 0.35).fillRect(0, 0, VIEW.w, VIEW.h);
  void SPECIES;
}

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('menu');
  }

  create(data: { notice?: string }): void {
    clearTaps();
    setTouchMode('off');
    drawMenuBackdrop(this);
    playMusic('menu');
    const root = mountPanel('menu');
    this.events.once('shutdown', () => root.remove());
    const notice = data?.notice ? `<p class="status bad">${data.notice}</p>` : '';
    root.innerHTML = `<div class="panel" style="position:relative">
      <h1 class="title">Kaiju Kitchen Crew</h1>
      <p>A co-op cooking platformer for <b>2–6 kaiju</b>. Stack on each other, carry ingredients, cook the recipe, and get <b>everyone</b> onto the plate.</p>
      ${notice}
      <div class="row">
        <button class="go" data-act="online">🌐 Play online</button>
        <button data-act="local">🎮 Same screen</button>
        <button data-act="music">♪ Music: ${musicOn ? 'on' : 'off'}</button>
        ${isInstalledApp() && !isFullscreen() ? '' : `<button data-act="fs">⛶ ${isFullscreen() ? 'Exit full screen' : 'Full screen'}</button>`}
      </div>
      <h2>Controls</h2>
      <div class="keys">
        <b>Move</b><span>A / D · ← / → · stick · on-screen ◀ ▶</span>
        <b>Jump</b><span>W or Space · ↑ · pad A · JUMP</span>
        <b>Grab / throw</b><span>S or E · ↓ or Enter · pad X/B · GRAB (near the pot = drop it in)</span>
        <b>Swap kaiju</b><span>Q · Right-Shift · pad Y · SWAP (same screen only)</span>
        <b>Retry / menu</b><span>R · Esc</span>
        <b>Full screen</b><span>F · ⛶ button (any time, also mid-level)</span>
        <b>Music</b><span>M · ♪ button</span>
      </div>
      <div class="ver">v${__APP_VERSION__}</div>
    </div>`;
    root.querySelectorAll<HTMLButtonElement>('button[data-act]').forEach(b => b.addEventListener('click', () => this.act(b.dataset.act!)));
  }

  private act(a: string): void {
    sfx.ui();
    if (a === 'online') this.scene.start('lobby');
    if (a === 'local') this.scene.start('local');
    if (a === 'music') { toggleMusic(); this.scene.restart(); }
    if (a === 'fs') { toggleFullscreen(); setTimeout(() => this.scene.restart(), 400); }
  }

  update(): void {
    applyPendingUpdate();
    if (consumeTap('KeyO')) this.act('online');
    else if (consumeTap('KeyL')) this.act('local');
    else if (consumeTap('KeyM')) this.act('music');
    clearTaps();
  }
}
