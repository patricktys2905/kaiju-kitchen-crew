// Runs a level: local (same screen), online host (runs the sim, sends snapshots) or online guest
// (sends input, shows the host's snapshots).
import * as Phaser from 'phaser';
import { sfx } from '../audio';
import { clearTaps, consumeTap, Controllers, mergedInput, readDevices } from '../input';
import type { LobbySeat, NetGuest, NetHost, NetMsg } from '../net/net';
import { applySnapshot, extrapolate, makeSnapshot } from '../net/snapshot';
import { addSlice, fitCamera, hasArt, RES, SlicePool, SpritePool } from '../render/art';
import { buildStatic, drawDynamic, placeItem } from '../render/draw';
import { body, display, popIn, withShadow } from '../render/fonts';
import { ITEMS, PHYS, SPECIES, STEP, T, VIEW, WORLD_VIEW, ZOOM } from '../sim/constants';
import { LEVELS } from '../sim/levels';
import { nudgeSleepers } from '../sim/solo';
import { playMusic, toggleMusic } from '../music';
import { NO_INPUT, robotRole, World, type GameEvent, type PlayerInput } from '../sim/world';
import type { TicketRule } from '../sim/level';
import { isTouchDevice, setTouchMode, toggleFullscreen } from '../touch';
import { fmtTime, starsHtml } from '../ui';
import { bestTime, countStars, hatOf, levelOpen, recordClear, STAR_CLEAN, STAR_SPOON, WORLDS } from '../progress';

export interface GameData {
  mode: 'local' | 'host' | 'guest';
  species: number[];
  names?: string[];
  level: number;
  host?: NetHost;
  seats?: LobbySeat[]; // host: who is in which seat
  guest?: NetGuest;
  seat?: number; // guest: my seat
  hats?: string[]; // hat worn by each kaiju ('' = none); local play reads the saved choices
}

let controllers: Controllers | null = null; // survives level changes in local play

const TICKETS: Record<TicketRule, { title: string; text: string; short: string }> = {
  lowgrav: { title: 'MOON GRAVITY', text: 'Everything floats! Jump really high.', short: 'Moon gravity' },
  reverse: { title: 'BACKWARDS DAY', text: 'Left is right and right is left!', short: 'Backwards controls' },
  dark: { title: 'LIGHTS OUT', text: 'Stick together, you only see near each other.', short: 'Lights out' },
  speedy: { title: 'RUSH ORDER', text: 'Everyone runs super fast!', short: 'Rush order' },
  untie: { title: 'NOODLE SNAPPED', text: "You're not tied together any more.", short: '' },
};



export class GameScene extends Phaser.Scene {
  private d!: GameData;
  private world!: World;
  private acc = 0;
  private time0 = 0;
  private dyn!: Phaser.GameObjects.Graphics;
  private hudFront!: Phaser.GameObjects.Graphics;
  private front!: Phaser.GameObjects.Graphics;
  private worldLayer!: Phaser.GameObjects.Layer;
  private hudLayer!: Phaser.GameObjects.Layer;
  private pool!: SpritePool;
  private hudPool!: SpritePool;
  private slices!: SlicePool;
  private dark!: Phaser.GameObjects.RenderTexture;
  private robotTags: Phaser.GameObjects.Text[] = [];
  private ticketText!: Phaser.GameObjects.Text;
  private hud!: Phaser.GameObjects.Graphics;
  private kaiju: Phaser.GameObjects.Image[] = [];
  private hats: (Phaser.GameObjects.Image | null)[] = [];
  private tags: Phaser.GameObjects.Text[] = [];
  private scaleTexts: Phaser.GameObjects.Text[] = [];
  private crateTexts: Phaser.GameObjects.Text[] = [];
  private banner!: Phaser.GameObjects.Text;
  private sub!: Phaser.GameObjects.Text;
  private starsT!: Phaser.GameObjects.Text;
  private infoL!: Phaser.GameObjects.Text;
  private infoR!: Phaser.GameObjects.Text;
  private hint!: Phaser.GameObjects.Text;
  private recipeLabel!: Phaser.GameObjects.Text;
  private popups: { t: Phaser.GameObjects.Text; life: number }[] = [];
  private shownPhase = '';
  private introT = 0;
  private netAcc = 0;
  private netEvents: GameEvent[] = [];
  private notice = '';
  private leaving = false;
  private prevStart = false;
  private bestNow = false;

  constructor() {
    super('game');
  }

  init(d: GameData): void {
    this.d = d;
    this.acc = 0;
    this.netAcc = 0;
    this.netEvents = [];
    this.notice = '';
    this.leaving = false;
    this.shownPhase = '';
    this.introT = 3.2;
    this.popups = [];
    this.kaiju = [];
    this.hats = [];
    this.tags = [];
    this.scaleTexts = [];
    this.crateTexts = [];
    if (d.mode === 'local' && (!controllers || controllers.count !== d.species.length)) controllers = new Controllers(d.species.length);
  }

  create(): void {
    clearTaps();
    const d = this.d;
    const level = LEVELS[d.level];
    this.world = new World(level, d.species, d.names ?? d.species.map((_, i) => `Kaiju ${i + 1}`));
    const w = this.world;
    // Two cameras: the world camera is zoomed in (bigger kaiju) and follows the team; the HUD camera isn't.
    const cam = fitCamera(this, ZOOM);
    cam.scrollX = w.camX;
    cam.scrollY = this.camTargetY();
    this.worldLayer = this.add.layer();
    this.hudLayer = this.add.layer().setDepth(100);
    const ui = this.cameras.add(0, 0, VIEW.w * RES, VIEW.h * RES).setOrigin(0, 0).setZoom(RES);
    cam.ignore(this.hudLayer);
    ui.ignore(this.worldLayer);
    const L = <T extends Phaser.GameObjects.GameObject>(o: T): T => { this.worldLayer.add(o); return o; };
    const H = <T extends Phaser.GameObjects.GameObject>(o: T): T => { this.hudLayer.add(o); return o; };
    this.pool = new SpritePool(this, this.worldLayer);
    this.hudPool = new SpritePool(this, this.hudLayer);
    this.slices = new SlicePool(this, this.worldLayer);
    this.robotTags = [];
    this.time0 = 0;

    buildStatic(this, this.worldLayer, w);
    for (const s of w.signs) {
      const t = L(this.add.text(s.x, s.y, s.text, body(15, '#fff6e6', 800, { wordWrap: { width: 230 }, align: 'center' })).setOrigin(0, 0).setDepth(1));
      if (hasArt('ob-sign')) {
        L(addSlice(this, 'ob-sign', s.x - 30, s.y - 24, t.width + 60, t.height + 48, 0.24).setOrigin(0).setDepth(0.9));
      } else {
        const bg = L(this.add.graphics().setDepth(0.5));
        bg.fillStyle(0x2f3b2f, 0.92).fillRoundedRect(s.x - 10, s.y - 8, t.width + 20, t.height + 16, 8);
        bg.lineStyle(4, 0x8a5a32, 1).strokeRoundedRect(s.x - 10, s.y - 8, t.width + 20, t.height + 16, 8);
      }
    }
    this.dyn = L(this.add.graphics().setDepth(5));
    this.front = L(this.add.graphics().setDepth(12));
    for (const s of w.scales) this.scaleTexts.push(L(this.add.text(s.x + s.w / 2, s.y - 16, '', display(18, '#ffffff')).setOrigin(0.5).setDepth(7)));
    for (const c of w.crates) this.crateTexts.push(L(this.add.text(c.x + c.w / 2, c.y + c.h / 2, '', display(c.w > T ? 22 : 15, '#7a93b0', { strokeThickness: 0 })).setOrigin(0.5).setDepth(8)));
    w.players.forEach(p => {
      const key = `kaiju-${p.species}`;
      const img = L(this.textures.exists(key) ? this.add.image(0, 0, key) : this.add.image(0, 0, '__WHITE'));
      img.setOrigin(0.5, 1).setDepth(10);
      this.kaiju.push(img);
      const hat = (d.hats ?? d.species.map(hatOf))[p.idx] ?? '';
      this.hats.push(hat && this.textures.exists('hat-' + hat) ? L(this.add.image(0, 0, 'hat-' + hat).setOrigin(0.5, 1).setDepth(10.5)) : null);
      this.tags.push(L(this.add.text(0, 0, '', body(13, SPECIES[p.species].css, 900, { stroke: '#2a1408', strokeThickness: 4 })).setOrigin(0.5, 1).setDepth(11)));
    });

    // HUD (fixed to the screen)
    for (let i = 0; i < w.robots.length; i++) this.robotTags.push(L(this.add.text(0, 0, '', body(13, '#ffe9c7', 900, { stroke: '#2a1408', strokeThickness: 4, align: 'center' })).setOrigin(0.5, 1).setDepth(11)));
    // lights-out ticket: a dark layer with soft holes around every kaiju
    if (!this.textures.exists('glow')) {
      const c = this.textures.createCanvas('glow', 320, 320)!;
      const ctx = c.getContext();
      const grad = ctx.createRadialGradient(160, 160, 20, 160, 160, 160);
      grad.addColorStop(0, 'rgba(255,255,255,1)'); grad.addColorStop(0.55, 'rgba(255,255,255,0.85)'); grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grad; ctx.fillRect(0, 0, 320, 320); c.refresh();
    }
    this.dark = H(this.add.renderTexture(0, 0, VIEW.w, VIEW.h).setOrigin(0).setDepth(95).setVisible(false));
    this.hud = H(this.add.graphics().setDepth(100));
    this.hudFront = H(this.add.graphics().setDepth(104));
    const top = isTouchDevice ? 56 : 14;
    this.infoL = H(withShadow(this.add.text(20, top, '', display(22)).setDepth(101), 3));
    this.infoR = H(withShadow(this.add.text(VIEW.w - 20, top, '', display(22)).setOrigin(1, 0).setDepth(101), 3));
    this.recipeLabel = H(this.add.text(VIEW.w / 2, 8, 'ORDER', display(14, '#7a4a22', { strokeThickness: 0 })).setOrigin(0.5, 0).setDepth(102));
    this.banner = H(withShadow(this.add.text(VIEW.w / 2, VIEW.h / 2 - 70, '', display(76, '#ffe9c7', { align: 'center' })).setOrigin(0.5).setDepth(110), 6));
    this.starsT = H(withShadow(this.add.text(VIEW.w / 2, VIEW.h / 2 + 4, '', display(46, '#ffd84a', { align: 'center' })).setOrigin(0.5, 0).setDepth(110), 4));
    this.sub = H(withShadow(this.add.text(VIEW.w / 2, VIEW.h / 2 + 10, '', body(24, '#fff6e6', 800, { align: 'center', wordWrap: { width: 900 } })).setOrigin(0.5, 0).setDepth(110), 3));
    const hint = d.mode === 'guest' ? 'F full screen · M music · Esc leave' : d.mode === 'host' ? 'R retry · F full screen · M music · Esc menu' : 'R retry · F full screen · M music · Esc menu · Q / R-Shift swap kaiju';
    this.ticketText = H(withShadow(this.add.text(VIEW.w - 20, (isTouchDevice ? 56 : 14) + 34, '', body(17, '#ffe27a', 900, { align: 'right' })).setOrigin(1, 0).setDepth(101), 2));
    this.hint = H(withShadow(this.add.text(20, VIEW.h - 30, isTouchDevice ? '' : hint, body(15, '#fff6e6', 800)).setDepth(101), 2));

    playMusic(level.world);
    this.wireNet();
    this.events.once('shutdown', () => setTouchMode('off'));
    this.showIntro();
  }

  private showIntro(): void {
    const lvl = LEVELS[this.d.level];
    this.banner.setText(`${this.d.level + 1}. ${lvl.name}`);
    this.sub.setText(lvl.intro);
    popIn(this, this.banner);
  }

  // ------------------------------------------------------------------ networking
  private wireNet(): void {
    const d = this.d;
    if (d.mode === 'host' && d.host) {
      d.host.onGuestJoin = () => {};
      d.host.onPick = () => {};
      d.host.onGuestLeave = g => {
        const seat = d.seats?.findIndex(s => s.guest === g) ?? -1;
        const name = seat >= 0 ? d.seats![seat].name : 'A friend';
        sfx.leave();
        d.seats = d.seats?.filter(s => s.guest !== g);
        if (!d.seats || d.seats.length < 2) { this.toLobby(`${name} left. Waiting for friends…`); return; }
        this.notice = `${name} left · restarting with ${d.seats.length} kaiju…`;
        this.time.delayedCall(2200, () => this.restart(d.level));
      };
    }
    if (d.mode === 'guest' && d.guest) {
      d.guest.onMsg = (m: NetMsg) => {
        if (m.t === 'snap') { applySnapshot(this.world, m.s); this.playEvents(m.ev); }
        if (m.t === 'start') {
          this.leaving = true;
          this.scene.restart({ mode: 'guest', species: m.species, names: m.names, level: m.level, guest: d.guest, seat: m.seat } satisfies GameData);
        }
        if (m.t === 'lobby') { this.notice = 'The host is picking the next level…'; }
      };
      d.guest.onClosed = reason => {
        this.notice = reason;
        this.time.delayedCall(2500, () => { if (!this.leaving) { this.leaving = true; this.scene.start('menu', { notice: reason }); } });
      };
    }
  }

  /** Stars won this run, plus anything newly unlocked. */
  private rewardText(res: ReturnType<typeof recordClear>, splats: number, spoon: boolean): string {
    this.starsT.setText(starsHtml(res.starsNow).replace(/<i>★<\/i>/g, '☆'));
    const why = [splats === 0 ? 'no splats' : '', spoon ? 'golden spoon' : ''].filter(Boolean).join(' · ');
    const n = countStars(res.newStars);
    const lines = ['', ''];
    if (n) lines.push(`+${n} new star${n > 1 ? 's' : ''}!${why ? ` (${why})` : ''}`);
    if (!(res.starsNow & STAR_CLEAN)) lines.push('Clear it with no splats for a star');
    else if (!(res.starsNow & STAR_SPOON) && this.world.spoon) lines.push('A golden spoon is hidden somewhere in this level…');
    for (const h of res.newHats) lines.push(`🎩 New hat unlocked: ${h.name}!`);
    if (res.worldOpened !== null) lines.push(`🔓 World ${res.worldOpened + 1}: ${WORLDS[res.worldOpened].name} is open!`);
    return lines.join('\n') + '\n';
  }

  /** Host/local: (re)start a level for everyone. */
  private restart(level: number): void {
    if (this.leaving) return;
    const d = this.d;
    this.leaving = true;
    if (d.mode === 'host' && d.host && d.seats) {
      const species = d.seats.map(s => s.species);
      const names = d.seats.map(s => s.name);
      d.seats.forEach((s, i) => { if (s.who === 'guest' && s.guest !== undefined) d.host!.send(s.guest, { t: 'start', species, names, seat: i, level }); });
      this.scene.restart({ ...d, species, names, level } satisfies GameData);
      return;
    }
    this.scene.restart({ ...d, level });
  }

  private toMenu(): void {
    if (this.leaving) return;
    const d = this.d;
    if (d.mode === 'host' && d.host && d.seats) { this.toLobby(''); return; }
    this.leaving = true;
    d.guest?.close();
    this.scene.start(d.mode === 'local' ? 'local' : 'menu');
  }

  private toLobby(status: string): void {
    const d = this.d;
    if (!d.host || !d.seats) return;
    this.leaving = true;
    d.seats.forEach((s, i) => { if (s.who === 'guest' && s.guest !== undefined) d.host!.send(s.guest, { t: 'lobby', seats: d.seats!, you: i, level: d.level }); });
    this.scene.start('lobby', { reopen: { host: d.host, seats: d.seats, level: d.level } });
    void status;
  }

  // ------------------------------------------------------------------ frame
  update(_t: number, deltaMs: number): void {
    if (this.leaving) return;
    const dt = Math.min(0.1, deltaMs / 1000);
    this.time0 += dt;
    this.introT -= dt;
    const d = this.d;
    const w = this.world;
    const devs = readDevices();
    const anyStart = [...devs.values()].some(x => x.start);
    const startEdge = anyStart && !this.prevStart;
    this.prevStart = anyStart;

    // menu keys
    if (consumeTap('Escape')) { this.toMenu(); return; }
    if (consumeTap('KeyF')) toggleFullscreen();
    if (consumeTap('KeyM')) this.popup(toggleMusic() ? '♪ Music on' : '♪ Music off', w.camX + 480, this.cameras.main.scrollY + 120, '#ffe9c7');
    if (d.mode !== 'guest') {
      if (consumeTap('KeyR')) { this.restart(d.level); return; }
      if (w.phase === 'clear' && w.phaseT > 0.8 && (consumeTap('KeyN') || consumeTap('Enter') || startEdge)) {
        const next = (d.level + 1) % LEVELS.length;
        if (levelOpen(next)) this.restart(next); else this.toMenu();
        return;
      }
    }
    clearTaps();

    if (d.mode === 'guest') {
      const me = mergedInput(devs);
      this.netAcc += dt;
      if (this.netAcc >= (d.guest?.route === 'backup' ? 1 / 15 : 1 / 30)) {
        this.netAcc = 0;
        d.guest?.send({ t: 'in', i: { mx: me.mx, jump: me.jump, grab: me.grab } });
      }
      extrapolate(w, dt);
    } else {
      let inputs: PlayerInput[];
      if (d.mode === 'local') inputs = nudgeSleepers(w, controllers!.update(devs), i => controllers!.labelOf(i) === null);
      else {
        const me = mergedInput(devs);
        inputs = w.players.map((_, i) => {
          if (i === 0) return { mx: me.mx, jump: me.jump, grab: me.grab };
          const seat = d.seats?.[i];
          return (seat?.guest !== undefined && d.host?.inputOf(seat.guest)) || NO_INPUT;
        });
      }
      this.acc += dt;
      let steps = 0;
      while (this.acc >= STEP && steps < 5) {
        w.step(inputs);
        this.acc -= STEP;
        steps++;
      }
      if (steps === 5) this.acc = 0;
      const ev = w.drainEvents();
      this.playEvents(ev);
      if (d.mode === 'host') {
        this.netEvents.push(...ev);
        this.netAcc += dt;
        if (this.netAcc >= (d.host?.hasBackupGuests ? 0.075 : 0.05)) {
          this.netAcc = 0;
          d.host?.broadcast({ t: 'snap', s: makeSnapshot(w), ev: this.netEvents.splice(0, 40) });
          this.netEvents = [];
        }
      }
    }
    this.render(dt);
  }

  // ------------------------------------------------------------------ events → sound + popups
  private playEvents(ev: GameEvent[]): void {
    const w = this.world;
    for (const e of ev) {
      switch (e.type) {
        case 'jump': sfx.jump(); break;
        case 'land': sfx.land(); break;
        case 'pickup': sfx.pickup(); break;
        case 'spoon': { sfx.spoon(); const sp = this.world.spoon; if (sp) this.popup('GOLDEN SPOON!', sp.x + sp.w / 2, sp.y - 20, '#ffe27a'); break; }
        case 'throw': sfx.throw(); break;
        case 'catch': sfx.catch(); this.popup('Nice catch!', w.players[e.p].x + PHYS.pw / 2, w.players[e.p].y - 30, '#9fe0ff'); break;
        case 'lever': sfx.lever(); break;
        case 'scaleOn': sfx.scaleOn(); break;
        case 'scaleOff': sfx.scaleOff(); break;
        case 'door': sfx.door(); break;
        case 'toast': sfx.toast(); break;
        case 'good': {
          sfx.good();
          const pot = w.pots[0];
          if (pot) this.popup(`${ITEMS[w.items[e.item].kind].name} ✓`, pot.x + pot.w / 2, pot.y - 40, '#9dff8a');
          break;
        }
        case 'wrong': {
          sfx.wrong();
          const pot = w.pots[0];
          const want = w.nextIngredient;
          if (pot) this.popup(want ? `Not yet! ${ITEMS[want].name} first` : 'Wrong!', pot.x + pot.w / 2, pot.y - 40, '#ff8a7a');
          break;
        }
        case 'burn': sfx.burn(); break;
        case 'recipeDone': sfx.recipeDone(); this.popup('ORDER COOKED! Everyone to the plate!', w.pots[0]?.x ?? w.camX + 640, (w.pots[0]?.y ?? 300) - 80, '#ffe27a', 30); break;
        case 'splat': sfx.splat(); this.cameras.main.shake(220, 0.008); break;
        case 'respawn': sfx.respawn(); break;
        case 'check': sfx.check(); { const c = w.checks[w.checkpoint]; if (c) this.popup('Checkpoint!', c.x + T / 2, c.y - 80, '#9dff8a'); } break;
        case 'burnerHot': sfx.burnerHot(); break;
        case 'clear': sfx.clear(); break;
        case 'grow': sfx.grow(); this.popup('BIG!', w.players[e.p].x + w.players[e.p].w / 2, w.players[e.p].y - 30, '#ffd27a'); break;
        case 'shrink': sfx.shrink(); break;
        case 'spicy': sfx.spicy(); this.popup('SPICY!', w.players[e.p].x + w.players[e.p].w / 2, w.players[e.p].y - 30, '#ff7a4a'); break;
        case 'fizz': sfx.fizz(); this.popup('Fizzy!', w.players[e.p].x + w.players[e.p].w / 2, w.players[e.p].y - 30, '#9fe0ff'); break;
        case 'fizzJump': sfx.fizzJump(); break;
        case 'bounce': sfx.bounce(); break;
        case 'melt': sfx.melt(); break;
        case 'smash': sfx.smash(); this.cameras.main.shake(120, 0.004); break;
        case 'board': sfx.board(); break;
        case 'exit': sfx.exit(); break;
        case 'heavy': sfx.wrong(); this.popup('Too heavy! Use the Pot Mech', w.players[e.p].x + w.players[e.p].w / 2, w.players[e.p].y - 30, '#ffb0a0'); break;
        case 'robotJump': sfx.robotJump(); break;
        case 'robotLand': sfx.robotLand(); this.cameras.main.shake(100, 0.004); break;
        case 'ticket': this.showTicket(e.rule); break;
        case 'ticketEnd': sfx.ticketEnd(); break;
        case 'drip': sfx.drip(); break;
        case 'reform': break;
        case 'handWarn': sfx.handWarn(); this.popup('HIDE!', this.world.hands[0]?.tx ?? 640, 200, '#ff7a5a', 34); break;
        case 'handSlam': sfx.handSlam(); this.cameras.main.shake(200, 0.01); break;
        case 'pop': sfx.pop(); break;
        case 'swim': sfx.swim(); break;
        case 'splash': break;
      }
    }
  }

  private showTicket(rule: TicketRule): void {
    sfx.ticket();
    const info = TICKETS[rule];
    const box = this.add.container(VIEW.w / 2, -140).setDepth(120);
    this.hudLayer.add(box);
    if (hasArt('ob-ticket')) box.add(this.add.image(0, 0, 'ob-ticket').setDisplaySize(330, 200).setAngle(-3));
    else box.add(this.add.rectangle(0, 0, 330, 200, 0xfffaf0));
    box.add(this.add.text(0, -42, 'NEW ORDER TICKET!', display(22, '#d23a2a', { strokeThickness: 0 })).setOrigin(0.5));
    box.add(this.add.text(0, -6, info.title, display(30, '#2a1408', { strokeThickness: 0 })).setOrigin(0.5));
    box.add(this.add.text(8, 36, info.text, body(16, '#4a3020', 800, { align: 'center', wordWrap: { width: 240 } })).setOrigin(0.5));
    this.tweens.add({ targets: box, y: 170, duration: 450, ease: 'Back.easeOut', hold: 2200, yoyo: true, onComplete: () => box.destroy() });
  }

  private popup(text: string, x: number, y: number, color: string, size = 22): void {
    const t = withShadow(this.add.text(x, y, text, display(size, color)).setOrigin(0.5).setDepth(60), 3);
    this.worldLayer.add(t);
    popIn(this, t, 1.5, 260);
    this.popups.push({ t, life: 1.6 });
  }

  // ------------------------------------------------------------------ drawing
  /** Vertical camera: follows the middle of the team (the level is taller than the view). */
  private camTargetY(): number {
    const w = this.world;
    let lo = Infinity, hi = -Infinity;
    for (const p of w.players) { lo = Math.min(lo, p.y); hi = Math.max(hi, p.y + p.h); }
    const mid = (lo + hi) / 2;
    // on touch screens show a strip below the floor so the kaiju sit above the thumb buttons
    const extra = isTouchDevice ? 80 : 0;
    return Math.max(0, Math.min(w.H - WORLD_VIEW.h + extra, mid - WORLD_VIEW.h * 0.58 + extra));
  }

  private render(dt: number): void {
    const w = this.world;
    const d = this.d;
    const cam = this.cameras.main;
    cam.scrollX += (w.camX - cam.scrollX) * Math.min(1, dt * 10);
    cam.scrollY += (this.camTargetY() - cam.scrollY) * Math.min(1, dt * 5);
    const time = this.time0;

    this.dyn.clear();
    this.front.clear();
    this.pool.begin();
    this.slices.begin();
    drawDynamic(this.dyn, w, time, this.pool, this.slices, this.front);

    w.scales.forEach((s, i) => {
      const t = this.scaleTexts[i];
      t.setText(s.timer > 0 && !s.active ? `${Math.ceil(s.timer)}` : `${Math.min(s.load, 99)}/${s.need}`);
      t.setColor(s.active ? '#9dff8a' : s.timer > 0 ? '#ffc04a' : '#ffffff');
    });
    w.crates.forEach((c, i) => {
      const t = this.crateTexts[i];
      t.setPosition(c.x + c.w / 2, c.y + c.h / 2);
      t.setText(c.need > 1 ? (c.pushers > 0 ? `${c.pushers}/${c.need}` : `×${c.need}`) : '');
    });

    // kaiju
    w.players.forEach((p, i) => {
      const img = this.kaiju[i];
      const hgt = 64 * (p.h / PHYS.ph);
      const base = img.texture.key === '__WHITE' ? 1 : hgt / img.height;
      const walking = p.grounded && Math.abs(p.vx) > 30;
      const bob = walking ? Math.abs(Math.sin(time * 16 + i)) * 3 : 0;
      const squash = p.landT > 0 ? 1 - p.landT * 1.4 : !p.grounded ? 1.06 : 1;
      img.setScale(base * (2 - squash) * (p.landT > 0 ? 1 : 0.98), base * squash);
      img.setPosition(p.x + p.w / 2, p.y + p.h + 4 - bob);
      img.setFlipX(p.facing < 0);
      if (img.texture.key === '__WHITE') img.setDisplaySize(p.w, p.h).setTint(SPECIES[p.species].color);
      const crew = p.inRobot >= 0;
      const splatted = w.phase === 'splat' && w.splatWho === i;
      img.setAlpha(crew ? 0 : splatted ? 0.35 + 0.3 * Math.sin(time * 30) : 1);
      img.setAngle(splatted ? 90 : 0);
      const hat = this.hats[i];
      if (hat) {
        // sits on the head: scaled to the kaiju, tilted with its step, flops off sideways when splatted
        const hw = Math.abs(img.displayWidth) * 0.5;
        hat.setScale(hw / hat.width * (2 - squash) * 0.5 + hw / hat.width * 0.5);
        const top = img.y - Math.abs(img.displayHeight) * 0.86;
        hat.setPosition(img.x - p.facing * hw * 0.08, top + hat.displayHeight * 0.35);
        hat.setFlipX(p.facing < 0).setAngle(splatted ? 70 : p.facing * (walking ? Math.sin(time * 16 + i) * 5 : -4));
        hat.setAlpha(img.alpha);
      }
      // name tag
      let label: string;
      let asleep = false;
      if (d.mode === 'local') {
        const own = controllers!.labelOf(i);
        asleep = own === null;
        label = own ?? 'z z z';
      } else {
        const mine = d.mode === 'host' ? i === 0 : i === d.seat;
        label = mine ? `▼ ${p.name}` : p.name;
      }
      img.setTint(asleep ? 0xb8b8c8 : p.spicyT > 0 && Math.sin(time * 20) > 0 ? 0xff9a7a : 0xffffff);
      // spicy flames / soda bubbles
      if (p.spicyT > 0) for (let k = 0; k < 3; k++) {
        const ph = (time * 2 + k / 3) % 1;
        this.front.fillStyle(k % 2 ? 0xffb030 : 0xff4a1c, 0.85 * (1 - ph)).fillCircle(p.x + 6 + k * (p.w - 12) / 2, p.y - ph * 30, 7 * (1 - ph) + 2);
      }
      if (p.fizz) for (let k = 0; k < 4; k++) {
        const ph = (time * 1.5 + k / 4) % 1;
        this.front.lineStyle(2, 0xbfeaff, 0.9 * (1 - ph)).strokeCircle(p.x + p.w / 2 + Math.sin(time * 4 + k * 2) * p.w * 0.6, p.y + p.h - ph * 60, 3 + k % 2 * 2);
      }
      const tag = this.tags[i];
      tag.setText(label);
      const carryLift = p.carry >= 0 ? PHYS.item : 0;
      // neighbours' tags sit at different heights so they don't overlap
      const near = w.players.some(o => o !== p && o.idx < p.idx && Math.abs(o.x - p.x) < 60 && Math.abs(o.y - p.y) < 20);
      const hatLift = hat && !crew ? hat.displayHeight * 0.55 : 0;
      tag.setPosition(p.x + p.w / 2, p.y - 30 - Math.max(carryLift, hatLift) - (near ? 15 : 0) + (asleep ? Math.sin(time * 2 + i) * 3 : 0));
      tag.setAlpha(crew ? 0 : asleep ? 0.7 : 1);
    });
    w.robots.forEach((r, ri) => {
      const t = this.robotTags[ri];
      const names = r.crew.map((pi, seat) => {
        const role = r.roles[seat] ?? robotRole(seat, r.crew.length);
        const icon = role === 'all' ? 'DRIVER' : role === 'legs' ? 'LEGS' : role === 'jump' ? 'JUMP' : role === 'arm' ? 'ARM' : role === 'jump+arm' ? 'JUMP+ARM' : 'zzz';
        const who = d.mode === 'local' ? controllers!.labelOf(pi) ?? w.players[pi].name : w.players[pi].name;
        return icon + ': ' + who;
      });
      t.setText(names.length ? names.join('\n') + '\n(hold GRAB to hop out)' : 'GRAB to climb in');
      t.setPosition(r.x + r.w / 2, r.y - 12 - (w.players.some(p => p.inRobot < 0 && Math.abs(p.x + p.w / 2 - (r.x + r.w / 2)) < r.w / 2 && p.y < r.y) ? 40 : 0));
    });
    // carried ingredients go in front of the kaiju
    for (const it of w.items) {
      if (it.carrier < 0 || it.delivered) continue;
      placeItem(this.pool, this.front, it.kind, it.x + PHYS.item / 2, it.y + PHYS.item / 2 - 10, PHYS.item, 12);
    }
    this.pool.end();
    this.slices.end();

    // popups
    for (const p of this.popups) {
      p.life -= dt;
      p.t.y -= dt * 30;
      p.t.setAlpha(Math.min(1, p.life * 2));
      if (p.life <= 0) p.t.destroy();
    }
    this.popups = this.popups.filter(p => p.life > 0);

    this.drawHud(time);
  }

  private drawHud(time: number): void {
    const w = this.world;
    const d = this.d;
    const g = this.hud;
    g.clear();
    this.hudFront.clear();
    this.hudPool.begin();
    // recipe card
    const r = w.level.recipe;
    const cw = Math.max(160, r.length * 52 + 30), cx = VIEW.w / 2 - cw / 2, cy = 6;
    g.fillStyle(0x000000, 0.2).fillRoundedRect(cx + 3, cy + 5, cw, 74, 10);
    g.fillStyle(0xfff6e0, 1).fillRoundedRect(cx, cy, cw, 74, 10);
    g.lineStyle(2, 0xe0c9a0, 1);
    for (let y = cy + 30; y < cy + 70; y += 14) g.lineBetween(cx + 8, y, cx + cw - 8, y);
    r.forEach((k, i) => {
      const x = cx + 15 + 26 + i * 52, y = cy + 48;
      const done = i < w.delivered, next = i === w.delivered;
      if (next) g.fillStyle(0xffc04a, 0.35 + 0.25 * Math.sin(time * 6)).fillCircle(x, y, 22);
      placeItem(this.hudPool, g, k, x, y, 30, 103);
      if (done) {
        this.hudFront.fillStyle(0x2a9a3a, 0.9).fillCircle(x + 14, y - 12, 9);
        this.hudFront.lineStyle(3, 0xffffff, 1).beginPath().moveTo(x + 9, y - 12).lineTo(x + 13, y - 8).lineTo(x + 19, y - 16).strokePath();
      }
      if (i < r.length - 1) g.fillStyle(0xb08a5a, 1).fillTriangle(x + 22, y - 4, x + 22, y + 4, x + 28, y);
    });
    this.hudPool.end();
    // order ticket in force
    this.ticketText.setText(w.rule ? '🎫 ' + TICKETS[w.rule].short + (w.ruleT > 0 ? ' · ' + Math.ceil(w.ruleT) + 's' : '') : '');
    // lights out
    this.dark.setVisible(w.rule === 'dark');
    if (w.rule === 'dark') {
      const cam = this.cameras.main;
      const sx = (x: number) => (x - cam.scrollX) * ZOOM, sy = (y: number) => (y - cam.scrollY) * ZOOM;
      this.dark.clear().fill(0x05030a, 0.94);
      for (const p of w.players) if (p.inRobot < 0) this.dark.erase('glow', sx(p.x + p.w / 2), sy(p.y + p.h / 2));
      for (const r of w.robots) this.dark.erase('glow', sx(r.x + r.w / 2), sy(r.y + r.h / 2));
      for (const k of [...w.pots, ...w.plates]) this.dark.erase('glow', sx(k.x + k.w / 2), sy(k.y));
      this.dark.render();
    }
    this.recipeLabel.setText(w.recipeDone ? 'COOKED! → PLATE' : 'ORDER');
    this.recipeLabel.setColor(w.recipeDone ? '#2a9a3a' : '#7a4a22');

    const lvl = LEVELS[d.level];
    this.infoL.setText(`${d.level + 1}. ${lvl.name}`);
    this.infoR.setText(`⏱ ${fmtTime(w.levelT)}   💥 ${w.splats}${w.spoon ? (w.spoonGot ? '   🥄 ✓' : '   🥄 ?') : ''}`);

    // banners
    let phaseKey = w.phase as string;
    if (this.notice) phaseKey = 'notice:' + this.notice;
    if (phaseKey !== this.shownPhase) {
      this.shownPhase = phaseKey;
      if (this.notice) {
        this.banner.setText('');
        this.sub.setText(this.notice);
      } else if (w.phase === 'splat') {
        const who = w.players[w.splatWho];
        this.banner.setText('SPLAT!');
        this.sub.setText(who ? `${SPECIES[who.species].full} got splatted. Back to the ${w.checkpoint >= 0 ? 'checkpoint' : 'start'}, everyone!` : '');
        popIn(this, this.banner);
        this.introT = 0;
      } else if (w.phase === 'clear') {
        const res = recordClear(d.level, w.levelT, w.splats, w.spoonGot);
        this.bestNow = res.best;
        const best = bestTime(d.level);
        const last = d.level === LEVELS.length - 1, worldEnd = !last && LEVELS[d.level + 1].world !== lvl.world;
        this.banner.setText(last ? 'ALL ORDERS SERVED!' : worldEnd ? 'WORLD COMPLETE!' : 'ORDER UP!');
        if (last || worldEnd) sfx.recipeDone();
        const nextTxt = d.mode === 'guest' ? 'Waiting for the host…' : isTouchDevice ? '' : 'N / Enter: next level · R: replay · Esc: menu';
        const extra = this.rewardText(res, w.splats, w.spoonGot) + (last ? 'You beat Kaiju Kitchen Crew! The chef is very impressed.\n' : worldEnd ? `${lvl.world} done! Next up: ${LEVELS[d.level + 1].world}.\n` : '');
        this.sub.setText(`${extra}${fmtTime(w.levelT)} · ${w.splats} splat${w.splats === 1 ? '' : 's'}${this.bestNow ? ' · NEW BEST!' : best !== undefined ? ` · best ${fmtTime(best)}` : ''}\n\n${nextTxt}`);
        popIn(this, this.banner);
        this.introT = 0;
      } else if (this.introT <= 0) {
        this.banner.setText('');
        this.sub.setText('');
      }
    }
    if (w.phase === 'play' && !this.notice && this.introT <= 0 && this.banner.text && this.shownPhase === 'play') {
      this.banner.setText('');
      this.sub.setText('');
    }
    const dim = w.phase === 'clear' || !!this.notice;
    if (dim) g.fillStyle(0x140e0a, 0.45).fillRect(0, 0, VIEW.w, VIEW.h);
    if (this.banner.text || this.sub.text) {
      g.fillStyle(0x140e0a, 0.35).fillRoundedRect(VIEW.w / 2 - 480, VIEW.h / 2 - 130, 960, 60 + 70 + this.sub.height + 20, 24);
    }
    setTouchMode(w.phase === 'clear' ? 'end' : 'game', { swap: d.mode === 'local' && d.species.length > 1, host: d.mode !== 'guest' });
    this.hint.setVisible(w.phase === 'play');
    this.starsT.setVisible(w.phase === 'clear');
  }
}
