// Same-screen setup: how many kaiju, who is who, which level.
import * as Phaser from 'phaser';
import { sfx } from '../audio';
import { clearTaps, consumeTap } from '../input';
import { MAX_PLAYERS, MIN_PLAYERS } from '../sim/constants';
import { setTouchMode } from '../touch';
import { cycleSpecies, levelGrid, mountPanel, seatRow } from '../ui';
import { drawMenuBackdrop } from './MenuScene';

const saved = { count: 2, species: [0, 9, 2, 7, 15, 5], level: 0 };

export class LocalScene extends Phaser.Scene {
  private root: HTMLElement | null = null;
  constructor() {
    super('local');
  }

  create(): void {
    clearTaps();
    setTouchMode('off');
    drawMenuBackdrop(this);
    this.root = mountPanel('local');
    const root = this.root;
    this.events.once('shutdown', () => { root.remove(); this.root = null; });
    this.render();
  }

  private render(): void {
    const root = this.root;
    if (!root) return;
    const seats = saved.species.slice(0, saved.count).map((sp, i) => seatRow(sp, `Kaiju ${i + 1}`, true).replace(/data-pick="(-?1)"/g, `data-pick="$1" data-seat="${i}"`)).join('');
    root.innerHTML = `<div class="panel">
      <h1>Same screen</h1>
      <p class="muted">Each keyboard side, gamepad or touch screen takes a kaiju as soon as you use it. Kaiju nobody is using just snooze. Press <b>SWAP</b> to jump into a snoozing one (great for practising alone).</p>
      <h2>How many kaiju?</h2>
      <div class="row">${Array.from({ length: MAX_PLAYERS - MIN_PLAYERS + 1 }, (_, k) => k + MIN_PLAYERS).map(n => `<button data-count="${n}" class="${n === saved.count ? 'on' : ''}">${n}</button>`).join('')}</div>
      ${seats}
      <h2>Level</h2>
      ${levelGrid(saved.level)}
      <div class="row"><button class="go" data-act="start">Start cooking ▶</button><button data-act="back">Back</button></div>
    </div>`;
    root.querySelectorAll<HTMLButtonElement>('button[data-count]').forEach(b => b.addEventListener('click', () => { saved.count = Number(b.dataset.count); sfx.ui(); this.render(); }));
    root.querySelectorAll<HTMLButtonElement>('button[data-level]').forEach(b => b.addEventListener('click', () => { saved.level = Number(b.dataset.level); sfx.ui(); this.render(); }));
    root.querySelectorAll<HTMLButtonElement>('button[data-pick]').forEach(b => b.addEventListener('click', () => {
      const i = Number(b.dataset.seat);
      const taken = new Set(saved.species.slice(0, saved.count).filter((_, k) => k !== i));
      saved.species[i] = cycleSpecies(saved.species[i], Number(b.dataset.pick), taken);
      sfx.pickup();
      this.render();
    }));
    root.querySelectorAll<HTMLButtonElement>('button[data-act]').forEach(b => b.addEventListener('click', () => this.act(b.dataset.act!)));
  }

  private act(a: string): void {
    sfx.ui();
    if (a === 'back') this.scene.start('menu');
    if (a === 'start') this.scene.start('game', { mode: 'local', species: saved.species.slice(0, saved.count), level: saved.level });
  }

  update(): void {
    if (consumeTap('Escape')) this.act('back');
    else if (consumeTap('Enter') || consumeTap('Space')) this.act('start');
    clearTaps();
  }
}
