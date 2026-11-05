// The whole game simulation: Phaser-free and deterministic (fixed 60 Hz steps, inputs only).
// Online, the host runs this; guests copy snapshots of it.
//
// Physics model: axis-aligned boxes. Kaiju and sugar cubes are solid to each other, so you can stand on
// a friend's head (and get carried when they move or jump). Lifts/doors/scales/toasters/pots are solid
// fixtures. Ingredients are not solid: they are carried above a kaiju's head, thrown, or lie around.
import { HEAVY, ITEMS, PHYS, STEP, T, TIMING, WORLD_VIEW as VIEW, type ItemKind } from './constants';
import { isHazardTile, resolveNeed, TILE_HOT, TILE_ICE, TILE_SHELF, TILE_SOLID, type LevelDef, type PickupKind, type TicketRule } from './level';

export interface PlayerInput {
  mx: number; // -1..1
  jump: boolean; // held
  grab: boolean; // held
}
export const NO_INPUT: PlayerInput = { mx: 0, jump: false, grab: false };

export interface Box { x: number; y: number; w: number; h: number }

type Kind = 'player' | 'crate' | 'lift' | 'door' | 'scale' | 'toaster' | 'pot' | 'burner' | 'jelly' | 'block' | 'robot' | 'melty' | 'bubble' | 'belt';
interface BodyBase extends Box { kind: Kind; idx: number }

export interface Player extends BodyBase {
  kind: 'player';
  species: number;
  name: string;
  vx: number; vy: number;
  facing: 1 | -1;
  grounded: boolean;
  coyote: number; buffer: number; canCut: boolean;
  jumpPrev: boolean; grabPrev: boolean;
  carry: number; // item index or -1
  pushing: Body | null; pushDir: number;
  safeX: number; safeY: number;
  landT: number; // for the squash animation
  big: boolean; // ate a cookie
  spicyT: number; // ate a chili: melts ice
  fizz: boolean; // drank soda: next jump is a big one
  inRobot: number; // index of the Pot Mech this kaiju is crewing, or -1
  idleT: number; // seconds without any input (napping crew get no job in the Mech)
  grabHeldT: number; // how long GRAB has been held (hold to hop out of the Mech)
}
export interface Crate extends BodyBase { kind: 'crate'; vx: number; vy: number; need: number; weight: number; homeX: number; homeY: number; pushers: number }
export interface Lift extends BodyBase { kind: 'lift'; on?: string; ax: number; ay: number; bx: number; by: number; speed: number; s: number; dir: number; wait: number; bal?: { other: number; base: number; travel: number; left: boolean } }
export interface Door extends BodyBase { kind: 'door'; on: string; topY: number; fullH: number; open: number }
export interface Scale extends BodyBase { kind: 'scale'; id: string; need: number; hold: number; load: number; timer: number; active: boolean }
export interface Toaster extends BodyBase { kind: 'toaster'; on: string; popT: number }
export interface Pot extends BodyBase { kind: 'pot' }
export interface Burner extends BodyBase { kind: 'burner'; cold: number; hot: number; offset: number; state: 'cold' | 'warn' | 'hot' }
export interface Jelly extends BodyBase { kind: 'jelly'; on?: string; frozen: boolean; wobble: number }
export interface Block extends BodyBase { kind: 'block'; mat: 'ice' | 'cracker'; broken: boolean; breakT: number }
/** The Pot Mech: kaiju climb in (GRAB) and each crew seat works one part: legs, jump, arm. */
export interface Robot extends BodyBase { kind: 'robot'; vx: number; vy: number; facing: 1 | -1; grounded: boolean; crew: number[]; roles: RobotRole[]; carry: number; homeX: number; homeY: number; ckX: number; ckY: number; landT: number; armT: number }
export interface Melty extends BodyBase { kind: 'melty'; melt: number; gone: boolean; regrow: number }
export interface Bubble extends BodyBase { kind: 'bubble'; life: number }
export interface Belt extends BodyBase { kind: 'belt'; dir: number; speed: number }
export interface Cycler { x: number; y: number; w: number; h: number; cold: number; hot: number; offset: number; state: 'cold' | 'warn' | 'hot' }
export interface Vent extends Cycler {}
export interface Jet extends Cycler { dir: number }
export interface Water { x: number; w: number; low: number; high: number; on?: string; inv?: boolean; level: number }
export interface Bubbler { x: number; y: number; every: number; t: number }
export type HandState = 'idle' | 'warn' | 'slam' | 'lift';
export interface Hand { period: number; state: HandState; t: number; tx: number }
export type Body = Player | Crate | Lift | Door | Scale | Toaster | Pot | Burner | Jelly | Block | Robot | Melty | Bubble | Belt;
type Mover = Player | Crate | Robot;
/** item.carrier values >= this mean "held by robot (carrier - ROBOT_CARRIER)". */
export const ROBOT_CARRIER = 1000;
export interface Ticket { x: number; rule: TicketRule; dur: number; fired: boolean }
export type RobotRole = 'all' | 'legs' | 'jump' | 'arm' | 'jump+arm' | 'ride';
export function robotRole(seat: number, crew: number): RobotRole {
  if (crew === 1) return 'all';
  if (seat === 0) return 'legs';
  if (seat === 1) return crew === 2 ? 'jump+arm' : 'jump';
  if (seat === 2) return 'arm';
  return 'ride';
}
export interface Pickup { kind: PickupKind; x: number; y: number; respawn: number }

export interface Item { idx: number; kind: ItemKind; x: number; y: number; vx: number; vy: number; carrier: number; delivered: boolean; homeX: number; homeY: number; thrower: number; throwT: number; grounded: boolean }
export interface Lever { id: string; x: number; y: number; flipT: number }
export interface Checkpoint { x: number; y: number; tx: number; ty: number }
export interface Plate { x: number; y: number; w: number }
export interface Sign { x: number; y: number; text: string }

export type Phase = 'play' | 'splat' | 'clear';
export type GameEvent =
  | { type: 'jump' | 'land' | 'pickup' | 'throw' | 'catch' | 'lever' | 'splat' | 'grow' | 'shrink' | 'spicy' | 'fizz' | 'fizzJump' | 'bounce'; p: number }
  | { type: 'melt' | 'smash'; block: number }
  | { type: 'board' | 'exit' | 'heavy' | 'robotJump' | 'robotLand'; p: number }
  | { type: 'ticket'; rule: TicketRule }
  | { type: 'drip' | 'reform' | 'handWarn' | 'handSlam' | 'pop' | 'splash' }
  | { type: 'swim'; p: number }
  | { type: 'ticketEnd' }
  | { type: 'good' | 'wrong' | 'burn'; item: number }
  | { type: 'recipeDone' | 'clear' | 'respawn' | 'check' | 'scaleOn' | 'scaleOff' | 'toast' | 'door' | 'burnerHot' };

const EPS = 0.01;

function overlap(a: Box, b: Box): boolean {
  return a.x < b.x + b.w - EPS && a.x + a.w > b.x + EPS && a.y < b.y + b.h - EPS && a.y + a.h > b.y + EPS;
}

export class World {
  readonly level: LevelDef;
  readonly W: number; // level size in px
  readonly H: number;
  players: Player[] = [];
  crates: Crate[] = [];
  lifts: Lift[] = [];
  doors: Door[] = [];
  scales: Scale[] = [];
  toasters: Toaster[] = [];
  pots: Pot[] = [];
  burners: Burner[] = [];
  jellies: Jelly[] = [];
  blocks: Block[] = [];
  pickups: Pickup[] = [];
  robots: Robot[] = [];
  meltys: Melty[] = [];
  vents: Vent[] = [];
  jets: Jet[] = [];
  waters: Water[] = [];
  bubblers: Bubbler[] = [];
  bubbles: Bubble[] = [];
  hands: Hand[] = [];
  belts: Belt[] = [];
  tickets: Ticket[] = [];
  rule: TicketRule | null = null; // current order-ticket rule
  ruleT = 0; // seconds left (0 = until the next ticket)
  tetherLen = 0;
  items: Item[] = [];
  levers: Lever[] = [];
  checks: Checkpoint[] = [];
  plates: Plate[] = [];
  signs: Sign[] = [];
  leverOn = new Map<string, boolean>();
  private pulses = new Set<string>();
  delivered = 0;
  checkpoint = -1; // -1 = level start
  phase: Phase = 'play';
  phaseT = 0;
  levelT = 0;
  splats = 0;
  splatWho = -1;
  camX = 0;
  events: GameEvent[] = [];
  private fixtures: Body[] = [];

  constructor(level: LevelDef, species: number[], names: string[] = []) {
    this.level = level;
    this.W = level.w * T;
    this.H = level.h * T;
    const n = species.length;
    species.forEach((sp, i) => this.players.push(this.makePlayer(i, sp, names[i] ?? `P${i + 1}`)));
    for (const e of level.ents) {
      switch (e.t) {
        case 'item': {
          const x = e.x * T + (T - PHYS.item) / 2, y = (e.y + 1) * T - PHYS.item;
          this.items.push({ idx: this.items.length, kind: e.kind, x, y, vx: 0, vy: 0, carrier: -1, delivered: false, homeX: x, homeY: y, thrower: -1, throwT: 0, grounded: true });
          break;
        }
        case 'pot': this.pots.push({ kind: 'pot', idx: this.pots.length, x: e.x * T, y: e.y * T, w: 2 * T, h: T }); break;
        case 'plate': this.plates.push({ x: e.x * T, y: (e.y + 1) * T, w: e.w * T }); break;
        case 'lever': this.levers.push({ id: e.id, x: e.x * T, y: e.y * T, flipT: 0 }); this.leverOn.set(e.id, false); break;
        case 'scale': this.scales.push({ kind: 'scale', idx: this.scales.length, id: e.id, x: e.x * T, y: e.y * T, w: e.w * T, h: T, need: resolveNeed(e.need, n), hold: e.hold ?? 0, load: 0, timer: 0, active: false }); break;
        case 'door': this.doors.push({ kind: 'door', idx: this.doors.length, on: e.on, x: e.x * T + 6, y: e.y * T, w: T - 12, h: e.h * T, topY: e.y * T, fullH: e.h * T, open: 0 }); break;
        case 'lift': this.lifts.push({ kind: 'lift', idx: this.lifts.length, on: e.on, x: e.x * T, y: e.y * T, w: e.w * T, h: T, ax: e.x * T, ay: e.y * T, bx: e.x2 * T, by: e.y2 * T, speed: e.speed ?? TIMING.liftSpeed, s: 0, dir: 1, wait: 0 }); break;
        case 'crate': this.crates.push({ kind: 'crate', idx: this.crates.length, x: e.x * T, y: e.y * T, w: e.w * T, h: e.h * T, vx: 0, vy: 0, need: Math.max(1, resolveNeed(e.need, n)), weight: e.weight, homeX: e.x * T, homeY: e.y * T, pushers: 0 }); break;
        case 'toaster': this.toasters.push({ kind: 'toaster', idx: this.toasters.length, on: e.on, x: e.x * T, y: e.y * T + 8, w: 2 * T, h: T - 8, popT: 0 }); break;
        case 'burner': this.burners.push({ kind: 'burner', idx: this.burners.length, x: e.x * T, y: e.y * T, w: e.w * T, h: T, cold: e.cold, hot: e.hot, offset: e.offset ?? 0, state: 'cold' }); break;
        case 'check': this.checks.push({ x: e.x * T, y: e.y * T, tx: e.x, ty: e.y }); break;
        case 'sign': this.signs.push({ x: e.x * T, y: e.y * T, text: e.text }); break;
        case 'robot': {
          const x = e.x * T + (3 * T - PHYS.robot.w) / 2, y = (e.y + 3) * T - PHYS.robot.h;
          this.robots.push({ kind: 'robot', idx: this.robots.length, x, y, w: PHYS.robot.w, h: PHYS.robot.h, vx: 0, vy: 0, facing: 1, grounded: false, crew: [], roles: [], carry: -1, homeX: x, homeY: y, ckX: x, ckY: y, landT: 0, armT: 0 });
          break;
        }
        case 'ticket': this.tickets.push({ x: e.x * T, rule: e.rule, dur: e.dur ?? 0, fired: false }); break;
        case 'melty': this.meltys.push({ kind: 'melty', idx: this.meltys.length, x: e.x * T, y: e.y * T, w: e.w * T, h: e.h * T, melt: 0, gone: false, regrow: 0 }); break;
        case 'vent': this.vents.push({ x: e.x * T, y: (e.y - e.h) * T, w: e.w * T, h: e.h * T, cold: e.cold, hot: e.hot, offset: e.offset ?? 0, state: 'cold' }); break;
        case 'jet': this.jets.push({ x: e.x * T, y: e.y * T, w: e.w * T, h: e.h * T, dir: e.dir, cold: e.cold ?? 0, hot: e.hot ?? 1, offset: e.offset ?? 0, state: 'cold' }); break;
        case 'water': this.waters.push({ x: e.x * T, w: e.w * T, low: e.low * T, high: e.high * T, on: e.on, inv: e.inv, level: e.on === undefined || e.inv ? e.high * T : e.low * T }); break;
        case 'bubbler': this.bubblers.push({ x: e.x * T, y: e.y * T, every: e.every, t: e.every * 0.6 }); break;
        case 'hand': this.hands.push({ period: e.period, state: 'idle', t: -(e.offset ?? 0), tx: 0 }); break;
        case 'balance': {
          const a = this.lifts.length, mk = (x: number, left: boolean) => this.lifts.push({ kind: 'lift', idx: this.lifts.length, x: x * T, y: e.y * T, w: e.w * T, h: 20, ax: x * T, ay: e.y * T, bx: x * T, by: e.y * T, speed: 120, s: 0, dir: 1, wait: 0, bal: { other: left ? a + 1 : a, base: e.y * T, travel: e.travel * T, left } });
          mk(e.x1, true); mk(e.x2, false);
          break;
        }
        case 'belt': this.belts.push({ kind: 'belt', idx: this.belts.length, x: e.x * T, y: e.y * T, w: e.w * T, h: T, dir: e.dir, speed: e.speed ?? 90 }); break;
        case 'pickup': this.pickups.push({ kind: e.kind, x: e.x * T + 4, y: e.y * T + 4, respawn: 0 }); break;
        case 'jelly': this.jellies.push({ kind: 'jelly', idx: this.jellies.length, on: e.on, x: e.x * T, y: e.y * T, w: e.w * T, h: e.h * T, frozen: false, wobble: 0 }); break;
        case 'block': this.blocks.push({ kind: 'block', idx: this.blocks.length, mat: e.mat, x: e.x * T, y: e.y * T, w: e.w * T, h: e.h * T, broken: false, breakT: 0 }); break;
      }
    }
    this.fixtures = [...this.lifts, ...this.doors, ...this.scales, ...this.toasters, ...this.pots, ...this.burners, ...this.jellies, ...this.blocks, ...this.meltys, ...this.belts];
    this.tetherLen = level.tether ?? 0;
    this.placeTeam(level.spawn.x, level.spawn.y);
    this.updateCamera();
  }

  private makePlayer(idx: number, species: number, name: string): Player {
    return {
      kind: 'player', idx, species, name, x: 0, y: 0, w: PHYS.pw, h: PHYS.ph, vx: 0, vy: 0, facing: 1, grounded: false,
      coyote: 0, buffer: 0, canCut: false, jumpPrev: false, grabPrev: false, carry: -1, pushing: null, pushDir: 0, safeX: 0, safeY: 0, landT: 0, big: false, spicyT: 0, fizz: false, inRobot: -1, idleT: 0, grabHeldT: 0,
    };
  }

  /** Lines the team up from a tile (3 across, then stacked on each other's heads). */
  private placeTeam(tx: number, ty: number): void {
    // up to 3 columns next to the flag that have safe solid ground (no mousetraps, hobs, pits);
    // whoever doesn't fit stands on a friend's head
    const safe = (i: number) => {
      const below = this.tileAt(i, ty + 1);
      return !this.tileAt(i, ty) && below !== 0 && below !== TILE_SHELF && !isHazardTile(below)
        && !this.burners.some(b => i * T + 1 > b.x && i * T < b.x + b.w && b.y <= (ty + 1) * T);
    };
    const cols: number[] = [];
    for (const d of [0, 1, 2, -1, -2, 3, -3]) if (cols.length < 3 && safe(tx + d)) cols.push(tx + d);
    if (!cols.length) cols.push(tx);
    cols.sort((a, b) => a - b);
    this.players.forEach((p, i) => {
      p.big = false; p.spicyT = 0; p.fizz = false; p.w = PHYS.pw; p.h = PHYS.ph; p.inRobot = -1;
      p.x = cols[i % cols.length] * T + 3;
      p.y = (ty + 1) * T - PHYS.ph - Math.floor(i / cols.length) * (PHYS.ph + 2);
      p.vx = p.vy = 0;
      p.carry = -1;
      p.safeX = p.x;
      p.safeY = p.y;
      p.grounded = false;
    });
  }

  get recipeDone(): boolean {
    return this.delivered >= this.level.recipe.length;
  }
  get nextIngredient(): ItemKind | null {
    return this.level.recipe[this.delivered] ?? null;
  }

  switchOn(id: string): boolean {
    if (this.leverOn.get(id)) return true;
    return this.scales.some(s => s.id === id && (s.active || s.timer > 0));
  }

  // ------------------------------------------------------------------ main step
  step(inputs: PlayerInput[]): void {
    if (this.phase === 'clear') { this.phaseT += STEP; this.idleInputs(inputs); return; }
    if (this.phase === 'splat') {
      this.phaseT -= STEP;
      this.idleInputs(inputs);
      if (this.phaseT <= 0) this.respawn();
      return;
    }
    this.levelT += STEP;
    this.updateSwitches();
    this.updateFridge();
    this.updateStoveSink();
    this.updateDoors();
    this.updateBurners();
    this.updateLifts();
    this.updateBubbles();
    this.updateBelts();
    this.updateToasters();
    this.updateCrates();
    this.updateTickets();
    this.updateCamera();
    this.updateRobots(inputs);
    this.updatePlayers(inputs);
    this.applyTether();
    this.updateItems();
    this.updatePickups();
    this.updateHands();
    this.checkHazards();
    if (this.phase !== 'play') return;
    this.updateCheckpoints();
    this.checkPlate();
  }

  /** Keep edge detection honest while the game is frozen. */
  private idleInputs(inputs: PlayerInput[]): void {
    this.players.forEach((p, i) => { const inp = inputs[i] ?? NO_INPUT; p.jumpPrev = inp.jump; p.grabPrev = inp.grab; });
  }

  // ------------------------------------------------------------------ collision helpers
  private tileAt(i: number, j: number): number {
    if (i < 0 || i >= this.level.w) return TILE_SOLID; // level sides are walls
    if (j < 0 || j >= this.level.h) return 0; // open above and below (falling out = splat)
    return this.level.tiles[j * this.level.w + i];
  }

  /** Everything solid that `b` could bump into (tiles excluded). */
  private solidsFor(b: Body | Item | null, forItem = false): Body[] {
    const out: Body[] = [];
    for (const f of this.fixtures) {
      if (f === b) continue;
      if (forItem && f.kind === 'pot') continue; // ingredients fall into the pot
      if (f.kind === 'door' && f.h < 1) continue;
      if (f.kind === 'block' && f.broken) continue;
      if (f.kind === 'melty' && f.gone) continue;
      out.push(f);
    }
    for (const c of this.crates) if (c !== b) out.push(c);
    for (const r of this.robots) if (r !== b) out.push(r);
    for (const u of this.bubbles) if (u !== b) out.push(u);
    if (!forItem) for (const p of this.players) if (p !== b && p.inRobot < 0) out.push(p);
    return out;
  }

  /** Solid tile boxes overlapping `box`. Shelves only count when falling onto them from above. */
  private tileHits(box: Box, prevBottom: number | null): Box[] {
    const out: Box[] = [];
    const i0 = Math.floor(box.x / T), i1 = Math.floor((box.x + box.w - EPS) / T);
    const j0 = Math.floor(box.y / T), j1 = Math.floor((box.y + box.h - EPS) / T);
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const t = this.tileAt(i, j);
      if (!t) continue;
      if (t === TILE_SHELF && (prevBottom === null || prevBottom > j * T + 0.5)) continue;
      const tb = { x: i * T, y: j * T, w: T, h: T };
      if (overlap(box, tb)) out.push(tb);
    }
    return out;
  }

  private sweepX(b: Box, dx: number, solids: Body[]): number {
    if (!dx) return 0;
    const nb = { x: b.x + dx, y: b.y, w: b.w, h: b.h };
    let nx = nb.x;
    const hits: Box[] = [...this.tileHits(nb, null)];
    for (const s of solids) if (overlap(nb, s) && !overlap(b, s)) hits.push(s);
    for (const h of hits) nx = dx > 0 ? Math.min(nx, h.x - b.w) : Math.max(nx, h.x + h.w);
    const d = nx - b.x;
    return dx > 0 ? Math.max(0, d) : Math.min(0, d);
  }

  private sweepY(b: Box, dy: number, solids: Body[]): number {
    if (!dy) return 0;
    const nb = { x: b.x, y: b.y + dy, w: b.w, h: b.h };
    let ny = nb.y;
    const hits: Box[] = [...this.tileHits(nb, dy > 0 ? b.y + b.h : null)];
    for (const s of solids) if (overlap(nb, s) && !overlap(b, s)) hits.push(s);
    for (const h of hits) ny = dy > 0 ? Math.min(ny, h.y - b.h) : Math.max(ny, h.y + h.h);
    const d = ny - b.y;
    return dy > 0 ? Math.max(0, d) : Math.min(0, d);
  }

  /** Kaiju and cubes standing directly on top of `b`. */
  ridersOf(b: Box, depthGuard = 0): Mover[] {
    if (depthGuard > 12) return [];
    const out: Mover[] = [];
    const test = (r: Mover) => {
      if (r === b || (r.kind === 'player' && r.inRobot >= 0)) return;
      if (Math.abs(r.y + r.h - b.y) < 0.6 && r.x < b.x + b.w - EPS && r.x + r.w > b.x + EPS) out.push(r);
    };
    this.players.forEach(test);
    this.crates.forEach(test);
    this.robots.forEach(test);
    return out;
  }

  /** Total weight resting on `b` (kaiju 1 each, cubes their weight), counting whole stacks. */
  weightOn(b: Box, depth = 0, seen = new Set<Box>()): number {
    if (depth > 12) return 0;
    let w = 0;
    for (const r of this.ridersOf(b)) {
      if (seen.has(r)) continue;
      seen.add(r);
      w += (r.kind === 'player' ? (r.big ? 3 : 1) : r.kind === 'robot' ? PHYS.robot.weight : r.weight) + this.weightOn(r, depth + 1, seen);
    }
    return w;
  }

  /** Moves a kaiju/cube sideways; whatever stands on it comes along. */
  private moveX(b: Mover, dx: number, depth = 0): number {
    if (!dx || depth > 12) return 0;
    const riders = this.ridersOf(b);
    let d = this.sweepX(b, dx, this.solidsFor(b));
    if ((b.kind === 'player' || b.kind === 'robot') && depth === 0) {
      // Shared screen: the camera edges act as walls, so nobody can wander off on their own.
      const left = this.camX + PHYS.edge, right = this.camX + VIEW.w - PHYS.edge;
      if (d < 0 && b.x + d < left) d = Math.min(0, Math.max(d, left - b.x));
      if (d > 0 && b.x + b.w + d > right) d = Math.max(0, Math.min(d, right - b.x - b.w));
    }
    b.x += d;
    if (d) for (const r of riders) this.moveX(r, d, depth + 1);
    return d;
  }

  /** Moves a kaiju/cube vertically. Going up pushes the whole stack on top of it first. */
  private moveY(b: Mover, dy: number, depth = 0): number {
    if (!dy || depth > 12) return 0;
    if (dy < 0) for (const r of this.ridersOf(b)) this.moveY(r, dy, depth + 1);
    const d = this.sweepY(b, dy, this.solidsFor(b));
    b.y += d;
    return d;
  }

  private isGrounded(b: Box, self: Body | null): boolean {
    const probe = { x: b.x, y: b.y + 1, w: b.w, h: b.h };
    if (this.tileHits(probe, b.y + b.h).length) return true;
    for (const s of this.solidsFor(self)) if (overlap(probe, s) && !overlap(b, s)) return true;
    return false;
  }

  // ------------------------------------------------------------------ fixtures
  private updateSwitches(): void {
    for (const s of this.scales) {
      s.load = this.weightOn(s);
      const was = s.active || s.timer > 0;
      s.active = s.load >= s.need;
      if (s.active) s.timer = s.hold;
      else s.timer = Math.max(0, s.timer - STEP);
      const now = s.active || s.timer > 0;
      if (now && !was) { this.pulses.add(s.id); this.events.push({ type: 'scaleOn' }); }
      if (!now && was) this.events.push({ type: 'scaleOff' });
    }
  }

  private updateDoors(): void {
    for (const d of this.doors) {
      const want = this.switchOn(d.on) ? 1 : 0;
      if (want > d.open) {
        if (d.open === 0) this.events.push({ type: 'door' });
        d.open = Math.min(1, d.open + TIMING.doorSpeed * STEP);
      } else if (want < d.open) {
        const next = Math.max(0, d.open - TIMING.doorSpeed * STEP);
        // never close onto someone
        const box = { x: d.x, y: d.topY, w: d.w, h: d.fullH * (1 - next) };
        const blocked = [...this.players.filter(p => p.inRobot < 0), ...this.crates, ...this.robots].some(b => overlap(box, b));
        if (!blocked) d.open = next;
      }
      d.y = d.topY;
      d.h = d.fullH * (1 - d.open);
    }
  }

  private updateBurners(): void {
    for (const b of this.burners) {
      const cyc = b.cold + b.hot;
      const t = (((this.levelT + b.offset) % cyc) + cyc) % cyc;
      const st = t >= b.cold ? 'hot' : t >= b.cold - 0.8 ? 'warn' : 'cold';
      if (st === 'hot' && b.state !== 'hot') this.events.push({ type: 'burnerHot' });
      b.state = st;
    }
  }

  private updateLifts(): void {
    for (const l of this.lifts) {
      if (l.bal) {
        // balance pans: the heavier pan sinks, the other rises
        const left = l.bal.left ? l : this.lifts[l.bal.other], right = l.bal.left ? this.lifts[l.bal.other] : l;
        const d = Math.max(-l.bal.travel, Math.min(l.bal.travel, (this.weightOn(left) - this.weightOn(right)) * PHYS.balanceK));
        const target = l.bal.base + (l.bal.left ? d : -d);
        const step = Math.max(-l.speed * STEP, Math.min(l.speed * STEP, target - l.y));
        if (Math.abs(step) > 0.01) this.moveKinematic(l, 0, step);
        continue;
      }
      const len = Math.hypot(l.bx - l.ax, l.by - l.ay) || 1;
      const ds = (l.speed * STEP) / len;
      let target: number;
      if (l.on !== undefined) target = this.switchOn(l.on) ? 1 : 0;
      else {
        if (l.wait > 0) { l.wait -= STEP; continue; }
        target = l.dir > 0 ? 1 : 0;
      }
      if (Math.abs(target - l.s) < 1e-6) {
        if (l.on === undefined) { l.dir = -l.dir; l.wait = 0.8; }
        continue;
      }
      const ns = target > l.s ? Math.min(target, l.s + ds) : Math.max(target, l.s - ds);
      const nx = l.ax + (l.bx - l.ax) * ns, ny = l.ay + (l.by - l.ay) * ns;
      const moved = this.moveKinematic(l, nx - l.x, ny - l.y);
      if (moved) l.s = ns;
    }
  }

  /** Moves a lift; riders come along, anyone underneath/beside blocks it. Returns false if blocked. */
  private moveKinematic(l: Box, dx: number, dy: number): boolean {
    const riders = this.ridersOf(l);
    const others = [...this.players.filter(p => p.inRobot < 0), ...this.crates, ...this.robots].filter(b => !riders.includes(b));
    const nb = { x: l.x + dx, y: l.y + dy, w: l.w, h: l.h };
    if (others.some(o => overlap(nb, o) && !overlap(l, o))) return false;
    if (dy < 0) for (const r of riders) this.moveY(r, dy, 1);
    l.x = nb.x;
    l.y = nb.y;
    if (dy > 0) for (const r of riders) this.carryDown(r, dy);
    if (dx) for (const r of riders) this.moveX(r, dx, 1);
    return true;
  }

  private carryDown(b: Mover, dy: number, depth = 0): void {
    if (depth > 12) return;
    const riders = this.ridersOf(b);
    const d = this.moveY(b, dy, 1);
    if (d) for (const r of riders) this.carryDown(r, d, depth + 1);
  }

  private updateToasters(): void {
    for (const t of this.toasters) {
      t.popT = Math.max(0, t.popT - STEP);
      if (!this.pulses.has(t.on)) continue;
      t.popT = 0.5;
      this.events.push({ type: 'toast' });
      const launch = (b: Box, depth: number) => {
        if (depth > 12) return;
        for (const r of this.ridersOf(b)) {
          r.vy = -PHYS.toastV;
          if (r.kind === 'player') { r.canCut = false; r.coyote = 0; }
          launch(r, depth + 1);
        }
      };
      launch(t, 0);
    }
    this.pulses.clear();
  }

  private updateCrates(): void {
    for (const c of this.crates) {
      // pushers were counted at the end of last step
      c.vx = c.pushers >= c.need ? this.pushDirFor(c) * PHYS.pushSpeed : 0;
      c.vy = Math.min(PHYS.maxFall, c.vy + PHYS.gravity * STEP);
      if (c.vx) this.moveX(c, c.vx * STEP);
      const want = c.vy * STEP;
      const d = this.moveY(c, want);
      if (Math.abs(d - want) > 0.001) c.vy = 0;
      if (c.y > this.H + 200) { c.x = c.homeX; c.y = c.homeY; c.vy = 0; }
    }
  }

  private crateDir = new Map<Crate, number>();
  private pushDirFor(c: Crate): number {
    return this.crateDir.get(c) ?? 0;
  }

  /** Counts kaiju pushing each cube (including kaiju pushing a kaiju who pushes the cube). */
  private countPushers(): void {
    this.crateDir.clear();
    for (const c of this.crates) {
      c.pushers = 0;
      for (const dir of [1, -1]) {
        let n = 0;
        for (const p of this.players) {
          if (p.pushDir !== dir || !p.grounded) continue;
          let cur: Body | null = p.pushing, guard = 0;
          while (cur && cur.kind === 'player' && cur.pushDir === dir && guard++ < 8) cur = cur.pushing;
          if (cur === c) n += p.big ? 2 : 1;
        }
        if (n > c.pushers) { c.pushers = n; this.crateDir.set(c, dir); }
      }
    }
  }

  // ------------------------------------------------------------------ players
  private updateCamera(): void {
    let lo = Infinity, hi = -Infinity;
    for (const p of this.players) { lo = Math.min(lo, p.x + p.w / 2); hi = Math.max(hi, p.x + p.w / 2); }
    const c = (lo + hi) / 2 - VIEW.w / 2;
    this.camX = Math.max(0, Math.min(this.W - VIEW.w, c));
  }

  private updatePlayers(inputs: PlayerInput[]): void {
    // lowest kaiju first, so a stack moves bottom-up
    const order = [...this.players].sort((a, b) => b.y - a.y);
    for (const p of order) {
      if (p.inRobot >= 0) continue; // crewing the Pot Mech (handled in updateRobots)
      const inp = inputs[p.idx] ?? NO_INPUT;
      const jumpEdge = inp.jump && !p.jumpPrev;
      const grabEdge = inp.grab && !p.grabPrev;
      p.jumpPrev = inp.jump;
      p.grabPrev = inp.grab;
      p.landT = Math.max(0, p.landT - STEP);

      p.grounded = p.vy >= 0 && this.isGrounded(p, p);
      p.spicyT = Math.max(0, p.spicyT - STEP);
      const under = p.grounded ? this.groundUnder(p) : null;
      if (under === 'jelly') {
        // boing: jelly throws you up (and whoever is standing on you)
        p.vy = -PHYS.bounceV;
        p.grounded = false;
        p.canCut = false;
        p.coyote = 0;
        this.events.push({ type: 'bounce', p: p.idx });
      }
      if (p.grounded) p.coyote = PHYS.coyote; else p.coyote -= STEP;
      if (jumpEdge) p.buffer = PHYS.jumpBuffer; else p.buffer -= STEP;
      const water = this.waterAt(p.x + p.w / 2, p.y + p.h / 2);
      if (water) {
        // near the surface you can jump out; deeper down a jump is a swim stroke
        if (p.y + p.h / 2 - water.level < 34) p.coyote = PHYS.coyote;
        else if (p.buffer > 0) { p.vy = -PHYS.swimV; p.buffer = 0; this.events.push({ type: 'swim', p: p.idx }); }
      }
      if (p.buffer > 0 && p.coyote > 0) {
        p.vy = p.fizz ? -PHYS.fizzV : -PHYS.jumpV;
        if (p.fizz) { p.fizz = false; this.events.push({ type: 'fizzJump', p: p.idx }); }
        p.buffer = 0;
        p.coyote = 0;
        p.canCut = true;
        p.grounded = false;
        this.events.push({ type: 'jump', p: p.idx });
      }
      if (!inp.jump && p.vy < 0 && p.canCut) { p.vy *= PHYS.jumpCut; p.canCut = false; }

      const mx = Math.max(-1, Math.min(1, inp.mx)) * (this.rule === 'reverse' ? -1 : 1);
      if (Math.abs(mx) > 0.2) p.facing = mx > 0 ? 1 : -1;
      const target = Math.abs(mx) > 0.2 ? mx * PHYS.run * (this.rule === 'speedy' ? PHYS.speedy : 1) * (water ? 0.7 : 1) : 0;
      const acc = (under === 'ice' ? PHYS.iceAccel : p.grounded ? PHYS.accelGround : PHYS.accelAir) * STEP;
      p.vx = p.vx < target ? Math.min(target, p.vx + acc) : Math.max(target, p.vx - acc);
      if (water) p.vy = Math.min(260, p.vy * (p.vy < -PHYS.swimV ? 0.97 : 0.92) - this.gravity * 0.35 * STEP); // floaty (a jump out keeps its speed)
      else p.vy = Math.min(this.maxFall, p.vy + this.gravity * STEP);
      for (const v of this.vents) if (v.state === 'hot' && overlap(p, v)) p.vy = Math.max(-PHYS.ventMax, p.vy - PHYS.ventAcc * STEP);
      // tap jets push you along on top of your own movement
      for (const j of this.jets) if (j.state === 'hot' && overlap(p, j)) this.moveX(p, j.dir * PHYS.jetPush * STEP);

      const wantX = p.vx * STEP;
      const dX = this.moveX(p, wantX);
      if (Math.abs(dX - wantX) > 0.001 && this.tileHits({ x: p.x + Math.sign(wantX), y: p.y, w: p.w, h: p.h }, null).length) p.vx = 0;

      const wantY = p.vy * STEP;
      const dY = this.moveY(p, wantY);
      if (Math.abs(dY - wantY) > 0.001) {
        if (p.vy > 420) { p.landT = 0.16; this.events.push({ type: 'land', p: p.idx }); }
        p.vy = 0;
        p.canCut = false;
      }

      // what am I pushing against?
      p.pushing = null;
      p.pushDir = 0;
      if (Math.abs(mx) > 0.2) {
        const dir = mx > 0 ? 1 : -1;
        const probe = { x: p.x + dir * 2, y: p.y, w: p.w, h: p.h };
        for (const s of [...this.crates, ...this.players]) {
          if (s !== p && overlap(probe, s) && !overlap(p, s)) { p.pushing = s; p.pushDir = dir; break; }
        }
      }

      // big kaiju smash cracker walls they push against
      if (p.big && Math.abs(mx) > 0.2) {
        const probe = { x: p.x + (mx > 0 ? 3 : -3), y: p.y, w: p.w, h: p.h };
        for (const b of this.blocks) if (b.mat === 'cracker' && !b.broken && overlap(probe, b)) this.breakBlock(b);
      }
      // spicy kaiju melt ice they touch
      if (p.spicyT > 0) {
        const probe = { x: p.x - 3, y: p.y - 3, w: p.w + 6, h: p.h + 6 };
        for (const b of this.blocks) if (b.mat === 'ice' && !b.broken && overlap(probe, b)) this.breakBlock(b);
      }
      if (grabEdge) this.grab(p);
    }
    for (const p of this.players) {
      if (p.inRobot >= 0) continue;
      p.grounded = p.vy >= 0 && this.isGrounded(p, p);
      if (p.grounded && this.isSafeGround(p)) { p.safeX = p.x; p.safeY = p.y; }
    }
    this.countPushers();
  }

  /** Solid, non-hot ground (not a lift or a kaiju), good for dropping things after a splat. */
  private isSafeGround(p: Player): boolean {
    const probe = { x: p.x, y: p.y + 1, w: p.w, h: p.h };
    const tiles = this.tileHits(probe, p.y + p.h);
    if (!tiles.length) return false;
    for (const t of tiles) if (isHazardTile(this.tileAt(Math.floor(t.x / T), Math.floor(t.y / T)))) return false;
    return !this.burners.some(b => overlap(probe, b));
  }

  private grab(p: Player): void {
    const reach = { x: p.x - 10, y: p.y - 10, w: p.w + 20, h: p.h + 20 };
    if (p.carry >= 0) {
      const it = this.items[p.carry];
      const pot = this.pots.find(k => overlap(reach, { x: k.x - 8, y: k.y - 30, w: k.w + 16, h: k.h + 30 }));
      p.carry = -1;
      it.carrier = -1;
      if (pot) {
        it.x = pot.x + pot.w / 2 - PHYS.item / 2;
        it.y = pot.y - PHYS.item / 2;
        it.vx = it.vy = 0;
        this.potCheck(it, pot);
        return;
      }
      const moving = Math.abs(p.vx) > 60;
      const t = moving ? PHYS.throwMove : PHYS.throwStill;
      it.vx = p.facing * t.vx + p.vx * 0.3;
      it.vy = t.vy;
      it.thrower = p.idx;
      it.throwT = 0.45;
      it.grounded = false;
      this.events.push({ type: 'throw', p: p.idx });
      return;
    }
    let best: Item | null = null, bestD = Infinity;
    for (const it of this.items) {
      if (it.delivered || it.carrier >= 0) continue;
      if (!overlap(reach, { x: it.x, y: it.y, w: PHYS.item, h: PHYS.item })) continue;
      const d = Math.abs(it.x - p.x) + Math.abs(it.y - p.y);
      if (d < bestD) { bestD = d; best = it; }
    }
    if (best) {
      if (HEAVY.includes(best.kind)) { this.events.push({ type: 'heavy', p: p.idx }); return; }
      this.pick(p, best);
      return;
    }
    for (const r of this.robots) {
      if (overlap({ x: reach.x - 16, y: reach.y - 16, w: reach.w + 32, h: reach.h + 32 }, r)) { this.board(p, r); return; }
    }
    for (const l of this.levers) {
      if (overlap(reach, { x: l.x + 4, y: l.y, w: T - 8, h: T })) {
        this.leverOn.set(l.id, !this.leverOn.get(l.id));
        for (const o of this.levers) if (o.id === l.id) o.flipT = 0.25;
        this.pulses.add(l.id);
        this.events.push({ type: 'lever', p: p.idx });
        return;
      }
    }
  }

  private pick(p: Player, it: Item): void {
    // nobody holds two things; take it from the floor (or out of the air)
    p.carry = it.idx;
    it.carrier = p.idx;
    it.vx = it.vy = 0;
    this.events.push({ type: 'pickup', p: p.idx });
  }

  // ------------------------------------------------------------------ items
  private updateItems(): void {
    for (const it of this.items) {
      if (it.delivered) continue;
      if (it.carrier >= ROBOT_CARRIER) {
        const r = this.robots[it.carrier - ROBOT_CARRIER];
        it.x = r.facing > 0 ? r.x + r.w - 4 : r.x - PHYS.item + 4;
        it.y = r.y + 18 - Math.sin(r.armT * 6) * 6;
        continue;
      }
      if (it.carrier >= 0) {
        const p = this.players[it.carrier];
        it.x = p.x + p.w / 2 - PHYS.item / 2;
        it.y = p.y - PHYS.item + 4;
        continue;
      }
      it.throwT = Math.max(0, it.throwT - STEP);
      if (this.waterAt(it.x + PHYS.item / 2, it.y + PHYS.item / 2)) { it.vy = Math.max(-150, it.vy * 0.88 - 700 * STEP); it.vx *= 0.95; }
      else it.vy = Math.min(this.maxFall, it.vy + this.gravity * STEP);
      for (const j of this.jets) if (j.state === 'hot' && overlap({ x: it.x, y: it.y, w: PHYS.item, h: PHYS.item }, j)) it.vx = Math.max(-PHYS.jetMax, Math.min(PHYS.jetMax, it.vx + j.dir * PHYS.jetAcc * STEP));
      const box = { x: it.x, y: it.y, w: PHYS.item, h: PHYS.item };
      const solids = this.solidsFor(null, true);
      const dx = this.sweepX(box, it.vx * STEP, solids);
      if (Math.abs(dx - it.vx * STEP) > 0.001) it.vx *= -0.3;
      it.x += dx;
      box.x = it.x;
      const wantY = it.vy * STEP;
      const dy = this.sweepY(box, wantY, solids);
      it.y += dy;
      it.grounded = false;
      if (Math.abs(dy - wantY) > 0.001) {
        if (it.vy > 0) it.grounded = true;
        it.vy = 0;
      }
      if (it.grounded) it.vx *= 0.8;
      if (Math.abs(it.vx) < 2) it.vx = 0;
      const ib = { x: it.x, y: it.y, w: PHYS.item, h: PHYS.item };

      // a friend catches it out of the air
      if (!it.grounded) {
        for (const p of this.players) {
          if (p.carry >= 0 || p.inRobot >= 0 || HEAVY.includes(it.kind) || (p.idx === it.thrower && it.throwT > 0)) continue;
          if (overlap(ib, p)) { this.pick(p, it); this.events.push({ type: 'catch', p: p.idx }); break; }
        }
        if (it.carrier >= 0) continue;
      }
      // into the pot
      const pot = this.pots.find(k => overlap(ib, { x: k.x + 4, y: k.y - 6, w: k.w - 8, h: k.h }));
      if (pot) { this.potCheck(it, pot); continue; }
      // burnt or lost
      const hot = this.tileHits({ x: ib.x, y: ib.y + 1, w: ib.w, h: ib.h }, null)
        .some(t => this.tileAt(Math.floor(t.x / T), Math.floor(t.y / T)) === TILE_HOT)
        || this.burners.some(b => b.state === 'hot' && overlap({ x: ib.x, y: ib.y + 1, w: ib.w, h: ib.h }, b));
      if (hot || it.y > this.H + 100) {
        if (hot) this.events.push({ type: 'burn', item: it.idx });
        this.resetItem(it);
      }
    }
  }

  private resetItem(it: Item): void {
    it.x = it.homeX; it.y = it.homeY; it.vx = it.vy = 0; it.carrier = -1; it.thrower = -1;
  }

  private potCheck(it: Item, pot: Pot): void {
    if (it.kind === this.nextIngredient) {
      it.delivered = true;
      it.carrier = -1;
      this.delivered++;
      this.events.push({ type: 'good', item: it.idx });
      if (this.recipeDone) this.events.push({ type: 'recipeDone' });
    } else {
      // spat back out
      it.x = pot.x + pot.w / 2 - PHYS.item / 2;
      it.y = pot.y - PHYS.item - 6;
      it.vy = -620;
      it.vx = (it.idx % 2 ? 1 : -1) * 220;
      it.thrower = -1;
      it.throwT = 0;
      this.events.push({ type: 'wrong', item: it.idx });
    }
  }

  // ------------------------------------------------------------------ hazards, checkpoints, exit
  private checkHazards(): void {
    for (const r of this.robots) {
      const probe = { x: r.x + 2, y: r.y - 1, w: r.w - 4, h: r.h + 2 };
      // metal feet: the Mech walks on hot hobs; mousetraps and icicles still get it
      const hot = this.tileHits(probe, null).some(t => { const k = this.tileAt(Math.floor(t.x / T), Math.floor(t.y / T)); return isHazardTile(k) && k !== TILE_HOT; });
      if (hot || r.y > this.H + 40 || this.handHits(r)) { this.splat(this.players[r.crew[0] ?? 0]); return; }
    }
    for (const p of this.players) {
      if (p.inRobot >= 0) continue;
      const probe = { x: p.x + 2, y: p.y, w: p.w - 4, h: p.h + 1 };
      const reach = { x: probe.x, y: probe.y - 1, w: probe.w, h: probe.h + 1 }; // icicles hang above
      const onHot = this.tileHits(reach, null).some(t => isHazardTile(this.tileAt(Math.floor(t.x / T), Math.floor(t.y / T))));
      const onBurner = this.burners.some(b => b.state === 'hot' && overlap(probe, b));
      if (onHot || onBurner || p.y > this.H + 40 || this.handHits(p)) { this.splat(p); return; }
    }
  }

  private splat(p: Player): void {
    this.phase = 'splat';
    this.phaseT = TIMING.splat;
    this.splatWho = p.idx;
    this.splats++;
    this.events.push({ type: 'splat', p: p.idx });
  }

  private respawn(): void {
    // anything being carried is dropped where its carrier last stood safely
    for (const pl of this.players) {
      if (pl.carry < 0) continue;
      const it = this.items[pl.carry];
      it.carrier = -1;
      it.x = pl.safeX + pl.w / 2 - PHYS.item / 2;
      it.y = pl.safeY + pl.h - PHYS.item;
      it.vx = it.vy = 0;
      pl.carry = -1;
    }
    for (const r of this.robots) { r.crew = []; r.roles = []; r.x = r.ckX; r.y = r.ckY; r.vx = r.vy = 0; }
    for (const h of this.hands) { h.state = 'idle'; h.t = -1.5; }
    this.bubbles = [];
    const cp = this.checkpoint >= 0 ? this.checks[this.checkpoint] : null;
    if (cp) this.placeTeam(cp.tx, cp.ty); else this.placeTeam(this.level.spawn.x, this.level.spawn.y);
    if (cp) this.bringAlong(cp);
    this.phase = 'play';
    this.phaseT = 0;
    this.splatWho = -1;
    this.updateCamera();
    this.events.push({ type: 'respawn' });
  }

  /** After a splat at a checkpoint, nothing you still need is left stranded behind it:
   *  the Pot Mech parks next to the team and ingredients still needed from behind come too. */
  private bringAlong(cp: Checkpoint): void {
    const ground = (i: number) => { const b = this.tileAt(i, cp.ty + 1); return b !== 0 && b !== TILE_SHELF && !isHazardTile(b); };
    const clear = (i: number, rows: number) => { for (let j = cp.ty - rows + 1; j <= cp.ty; j++) if (this.tileAt(i, j)) return false; return true; };
    for (const r of this.robots) {
      if (r.x + r.w / 2 >= cp.x - T) continue; // already at or ahead of the checkpoint
      for (const d of [3, 4, 5, -4, -5, -6, 6, 7]) {
        const i0 = cp.tx + d;
        if (![0, 1, 2].every(k => ground(i0 + k) && clear(i0 + k, 3))) continue;
        const box = { x: i0 * T + (3 * T - r.w) / 2, y: (cp.ty + 1) * T - r.h, w: r.w, h: r.h };
        if (this.players.some(p => overlap(p, box))) continue;
        r.x = box.x; r.y = box.y; r.ckX = r.x; r.ckY = r.y;
        break;
      }
    }
    const needed = this.level.recipe.slice(this.delivered);
    for (const it of this.items) {
      if (it.delivered || it.carrier >= 0 || it.x + PHYS.item / 2 >= cp.x - T) continue;
      if (!needed.includes(it.kind)) continue;
      // drop it just beside the flag (on the side away from the team's columns)
      const col = [-1, -2, 1, 2, 0].map(d => cp.tx + d).find(i => ground(i) && clear(i, 1)) ?? cp.tx;
      it.x = col * T + (T - PHYS.item) / 2; it.y = (cp.ty + 1) * T - PHYS.item - 2; it.vx = it.vy = 0; it.thrower = -1;
      it.homeX = it.x; it.homeY = it.y;
    }
  }

  private updateCheckpoints(): void {
    this.checks.forEach((c, i) => {
      if (i <= this.checkpoint) return;
      const zone = { x: c.x - 4, y: c.y - 2 * T, w: T + 8, h: 3 * T };
      if (this.players.some(p => overlap(p, zone))) {
        this.checkpoint = i;
        for (const r of this.robots) if (r.grounded) { r.ckX = r.x; r.ckY = r.y; }
        this.events.push({ type: 'check' });
      }
    });
  }

  /** On the plate = centre over it, standing on it (or on a friend who is). */
  onPlate(p: Player): boolean {
    if (p.inRobot >= 0) {
      const r = this.robots[p.inRobot];
      return r.grounded && this.plates.some(pl => r.x + r.w / 2 >= pl.x && r.x + r.w / 2 <= pl.x + pl.w && r.y + r.h <= pl.y + 1);
    }
    return this.plates.some(pl => {
      const cx = p.x + p.w / 2;
      return cx >= pl.x && cx <= pl.x + pl.w && p.y + p.h <= pl.y + 1 && p.y + p.h > pl.y - 6 * T;
    }) && p.grounded;
  }

  private checkPlate(): void {
    if (!this.recipeDone || !this.plates.length) return;
    if (this.players.every(p => this.onPlate(p))) {
      this.phase = 'clear';
      this.phaseT = 0;
      this.events.push({ type: 'clear' });
    }
  }

  // ------------------------------------------------------------------ stove, sink, dinner service
  private cycle(c: Cycler): void {
    if (c.cold <= 0) { c.state = 'hot'; return; }
    const cyc = c.cold + c.hot;
    const t = (((this.levelT + c.offset) % cyc) + cyc) % cyc;
    c.state = t >= c.cold ? 'hot' : t >= c.cold - 0.7 ? 'warn' : 'cold';
  }

  private updateStoveSink(): void {
    for (const v of this.vents) this.cycle(v);
    for (const j of this.jets) this.cycle(j);
    for (const m of this.meltys) {
      if (!m.gone) {
        if (this.ridersOf(m).length) m.melt += STEP / PHYS.meltTime; else m.melt = Math.max(0, m.melt - STEP / 3);
        if (m.melt >= 1) { m.gone = true; m.regrow = PHYS.regrow; this.events.push({ type: 'drip' }); }
      } else {
        m.regrow -= STEP;
        const blocked = [...this.players.filter(p => p.inRobot < 0), ...this.crates, ...this.robots].some(b => overlap(m, b));
        if (m.regrow <= 0 && !blocked) { m.gone = false; m.melt = 0; this.events.push({ type: 'reform' }); }
      }
    }
    for (const w of this.waters) {
      const target = w.on === undefined || this.switchOn(w.on) !== !!w.inv ? w.high : w.low;
      if (Math.abs(target - w.level) > 0.5) w.level += Math.sign(target - w.level) * Math.min(70 * STEP, Math.abs(target - w.level));
    }
  }

  /** The water a point is under, if any. */
  waterAt(x: number, y: number): Water | null {
    for (const w of this.waters) if (x >= w.x && x <= w.x + w.w && y > w.level) return w;
    return null;
  }

  private updateBubbles(): void {
    for (const s of this.bubblers) {
      s.t += STEP;
      if (s.t < s.every) continue;
      // rises out of the drain in the floor, lifting whoever is standing on it
      const b: Bubble = { kind: 'bubble', idx: 0, x: s.x - 8, y: s.y + T, w: 56, h: 16, life: 0 };
      if (!this.bubbles.some(o => overlap(b, o))) { this.bubbles.push(b); s.t = 0; }
    }
    for (const b of this.bubbles) {
      b.life += STEP;
      const dy = -PHYS.bubbleSpeed * STEP;
      const pop = b.life > PHYS.bubbleLife || (b.life > 0.4 && this.tileHits({ x: b.x, y: b.y + dy, w: b.w, h: b.h }, null).length > 0) || b.y < 0;
      if (pop) { b.life = -1; this.events.push({ type: 'pop' }); continue; }
      this.moveKinematic(b, 0, dy);
    }
    this.bubbles = this.bubbles.filter(b => b.life >= 0);
  }

  private updateBelts(): void {
    for (const b of this.belts) {
      const dx = b.dir * b.speed * STEP;
      for (const r of this.ridersOf(b)) this.moveX(r, dx, 1);
      for (const it of this.items) {
        if (it.delivered || it.carrier >= 0 || !it.grounded) continue;
        if (Math.abs(it.y + PHYS.item - b.y) < 1 && it.x + PHYS.item > b.x && it.x < b.x + b.w) it.x += this.sweepX({ x: it.x, y: it.y, w: PHYS.item, h: PHYS.item }, dx, this.solidsFor(null, true));
      }
    }
  }

  private updateHands(): void {
    for (const h of this.hands) {
      h.t += STEP;
      if (h.state === 'idle' && h.t >= h.period) {
        // aim at the middle of the team
        const xs = this.players.map(p => p.x + p.w / 2);
        h.tx = (Math.min(...xs) + Math.max(...xs)) / 2;
        h.state = 'warn'; h.t = 0; this.events.push({ type: 'handWarn' });
      } else if (h.state === 'warn' && h.t >= PHYS.hand.warn) { h.state = 'slam'; h.t = 0; this.events.push({ type: 'handSlam' }); }
      else if (h.state === 'slam' && h.t >= PHYS.hand.slam) { h.state = 'lift'; h.t = 0; }
      else if (h.state === 'lift' && h.t >= PHYS.hand.lift) { h.state = 'idle'; h.t = 0; }
    }
  }

  /** Something solid above this box (a shelf, a counter) shelters it from the Chef's Hand. */
  sheltered(b: Box): boolean {
    const i0 = Math.floor((b.x + 4) / T), i1 = Math.floor((b.x + b.w - 4) / T), jTop = Math.floor((b.y - 1) / T);
    for (let i = i0; i <= i1; i++) {
      let covered = false;
      for (let j = 0; j <= jTop; j++) if (this.tileAt(i, j)) { covered = true; break; }
      if (!covered) return false;
    }
    return true;
  }

  private handHits(b: Box): boolean {
    for (const h of this.hands) {
      if (h.state !== 'slam' || h.t > 0.25) continue;
      if (b.x + b.w > h.tx - PHYS.hand.w / 2 && b.x < h.tx + PHYS.hand.w / 2 && !this.sheltered(b)) return true;
    }
    return false;
  }

  // ------------------------------------------------------------------ pantry: rules, tickets, noodle, Pot Mech
  get gravity(): number { return PHYS.gravity * (this.rule === 'lowgrav' ? PHYS.lowGrav : 1); }
  get maxFall(): number { return PHYS.maxFall * (this.rule === 'lowgrav' ? 0.55 : 1); }

  private updateTickets(): void {
    if (this.rule && this.ruleT > 0) {
      this.ruleT -= STEP;
      if (this.ruleT <= 0) { this.rule = null; this.ruleT = 0; this.events.push({ type: 'ticketEnd' }); }
    }
    // a ticket prints when the first kaiju reaches it (snoozing friends can't hold it up).
    // Levels never depend on a ticket's rule to get through: rules only change how it plays.
    const front = Math.max(...this.players.map(p => p.x + p.w / 2));
    for (const t of this.tickets) {
      if (t.fired || front < t.x) continue;
      t.fired = true;
      if (t.rule === 'untie') this.tetherLen = 0;
      else { this.rule = t.rule; this.ruleT = t.dur; }
      this.events.push({ type: 'ticket', rule: t.rule });
    }
  }

  /** The noodle: neighbouring kaiju (in player order) stay within tetherLen of each other.
   *  Whoever is standing holds; whoever is in the air gets pulled (so you can dangle, swing and be hauled up). */
  private applyTether(): void {
    const L = this.tetherLen;
    if (!L) return;
    for (let iter = 0; iter < 3; iter++) {
      for (let k = 0; k + 1 < this.players.length; k++) {
        const a = this.players[k], b = this.players[k + 1];
        if (a.inRobot >= 0 || b.inRobot >= 0) continue;
        const dx = b.x + b.w / 2 - (a.x + a.w / 2), dy = b.y + b.h / 2 - (a.y + a.h / 2);
        const dist = Math.hypot(dx, dy);
        if (dist <= L) continue;
        const nx = dx / dist, ny = dy / dist, excess = dist - L;
        const ga = a.grounded, gb = b.grounded;
        const sa = ga && !gb ? 0 : !ga && gb ? 1 : 0.5; // share of the correction a takes
        const sb = 1 - sa;
        if (sb) { this.moveX(b, -nx * excess * sb, 1); this.moveY(b, -ny * excess * sb, 1); }
        if (sa) { this.moveX(a, nx * excess * sa, 1); this.moveY(a, ny * excess * sa, 1); }
        // remove the stretching part of their velocities
        const rel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if (rel > 0) {
          b.vx -= nx * rel * sb; b.vy -= ny * rel * sb;
          a.vx += nx * rel * sa; a.vy += ny * rel * sa;
        }
      }
    }
  }

  private board(p: Player, r: Robot): void {
    if (p.carry >= 0) { const it = this.items[p.carry]; it.carrier = -1; p.carry = -1; }
    p.inRobot = r.idx;
    p.idleT = 0;
    p.grabHeldT = 0;
    r.crew.push(p.idx);
    this.events.push({ type: 'board', p: p.idx });
  }

  private leave(p: Player, r: Robot): void {
    r.crew = r.crew.filter(i => i !== p.idx);
    p.inRobot = -1;
    p.grabHeldT = 0;
    p.grabPrev = true; // the held GRAB doesn't also grab something outside
    p.x = r.x + r.w / 2 - p.w / 2;
    p.y = r.y - p.h - 1;
    if (this.tileHits(p, null).length) { p.x = r.facing > 0 ? r.x - p.w - 1 : r.x + r.w + 1; p.y = r.y + r.h - p.h; }
    p.vx = 0; p.vy = -350;
    this.events.push({ type: 'exit', p: p.idx });
  }

  /** The arm: pick up / drop in the pot / throw. Returns false if there was nothing to do. */
  private robotArm(r: Robot): boolean {
    const reach = { x: r.facing > 0 ? r.x + r.w - 20 : r.x - 50, y: r.y - 10, w: 70, h: r.h + 20 };
    if (r.carry >= 0) {
      const it = this.items[r.carry];
      r.carry = -1;
      it.carrier = -1;
      const pot = this.pots.find(k => overlap(reach, { x: k.x - 8, y: k.y - 40, w: k.w + 16, h: k.h + 40 }));
      if (pot) { it.x = pot.x + pot.w / 2 - PHYS.item / 2; it.y = pot.y - PHYS.item / 2; it.vx = it.vy = 0; this.potCheck(it, pot); }
      else { it.vx = r.facing * 300; it.vy = -420; it.thrower = -1; it.grounded = false; }
      r.armT = 0.3;
      return true;
    }
    const it = this.items.find(i => !i.delivered && i.carrier < 0 && overlap(reach, { x: i.x, y: i.y, w: PHYS.item, h: PHYS.item }));
    if (!it) return false;
    r.carry = it.idx;
    it.carrier = ROBOT_CARRIER + r.idx;
    r.armT = 0.3;
    this.events.push({ type: 'pickup', p: r.crew[0] ?? 0 });
    return true;
  }

  private updateRobots(inputs: PlayerInput[]): void {
    for (const r of this.robots) {
      r.landT = Math.max(0, r.landT - STEP);
      r.armT = Math.max(0, r.armT - STEP);
      let mx = 0, jumpEdge = false;
      const leaving: Player[] = [];
      // jobs go to the crew who are actually playing (in seat order); napping crew just ride along
      for (const pi of r.crew) {
        const p = this.players[pi];
        const inp = inputs[pi] ?? NO_INPUT;
        p.idleT = Math.abs(inp.mx) > 0.2 || inp.jump || inp.grab ? 0 : p.idleT + STEP;
      }
      const active = r.crew.filter(pi => this.players[pi].idleT < 2.5);
      const staff = active.length ? active : r.crew;
      r.roles = r.crew.map(pi => (staff.includes(pi) ? robotRole(staff.indexOf(pi), staff.length) : 'ride'));
      r.crew.forEach((pi, k) => {
        const p = this.players[pi];
        const inp = inputs[pi] ?? NO_INPUT;
        const je = inp.jump && !p.jumpPrev, ge = inp.grab && !p.grabPrev;
        p.jumpPrev = inp.jump; p.grabPrev = inp.grab;
        const role = r.roles[k];
        if (role === 'all' || role === 'legs') mx = Math.max(-1, Math.min(1, inp.mx)) * (this.rule === 'reverse' ? -1 : 1);
        if (role === 'all' || role === 'jump' || role === 'jump+arm') jumpEdge ||= je;
        if (ge && (role === 'all' || role === 'arm' || role === 'jump+arm')) this.robotArm(r);
        // hold GRAB to hop out
        p.grabHeldT = inp.grab ? p.grabHeldT + STEP : 0;
        if (p.grabHeldT >= 0.45) leaving.push(p);
      });
      for (const p of leaving) this.leave(p, r);

      r.grounded = r.vy >= 0 && this.isGrounded(r, r);
      if (Math.abs(mx) > 0.2) r.facing = mx > 0 ? 1 : -1;
      const target = Math.abs(mx) > 0.2 ? mx * PHYS.robot.run * (this.rule === 'speedy' ? PHYS.speedy : 1) : 0;
      const acc = (r.grounded ? 1800 : 1100) * STEP;
      r.vx = r.vx < target ? Math.min(target, r.vx + acc) : Math.max(target, r.vx - acc);
      if (jumpEdge && r.grounded) { r.vy = -PHYS.robot.jumpV; r.grounded = false; this.events.push({ type: 'robotJump', p: r.crew[0] ?? 0 }); }
      r.vy = Math.min(this.maxFall, r.vy + this.gravity * STEP);
      const wantX = r.vx * STEP;
      if (Math.abs(this.moveX(r, wantX) - wantX) > 0.001 && this.tileHits({ x: r.x + Math.sign(wantX), y: r.y, w: r.w, h: r.h }, null).length) r.vx = 0;
      const wantY = r.vy * STEP;
      if (Math.abs(this.moveY(r, wantY) - wantY) > 0.001) {
        if (r.vy > 400) { r.landT = 0.2; this.events.push({ type: 'robotLand', p: r.crew[0] ?? 0 }); }
        r.vy = 0;
      }
      r.grounded = r.vy >= 0 && this.isGrounded(r, r);
      // the Mech smashes cracker walls it walks into
      if (Math.abs(mx) > 0.2) {
        const probe = { x: r.x + (mx > 0 ? 3 : -3), y: r.y, w: r.w, h: r.h };
        for (const b of this.blocks) if (b.mat === 'cracker' && !b.broken && overlap(probe, b)) this.breakBlock(b);
      }
      // the crew ride inside
      for (const pi of r.crew) {
        const p = this.players[pi];
        p.x = r.x + r.w / 2 - p.w / 2; p.y = r.y + r.h / 2 - p.h / 2;
        p.vx = r.vx; p.vy = r.vy; p.grounded = r.grounded; p.facing = r.facing;
      }
    }
  }

  // ------------------------------------------------------------------ fridge: jelly, ice, pickups
  private updateFridge(): void {
    for (const j of this.jellies) {
      j.frozen = j.on !== undefined && this.switchOn(j.on);
      j.wobble = Math.max(0, j.wobble - STEP);
    }
    for (const b of this.blocks) if (b.broken) b.breakT = Math.min(1, b.breakT + STEP * 2.5);
  }

  /** What a grounded kaiju is standing on: bouncy jelly, slippery ice, or ordinary ground (null). */
  private groundUnder(p: Player): 'jelly' | 'ice' | null {
    const probe = { x: p.x, y: p.y + 1, w: p.w, h: p.h };
    for (const j of this.jellies) {
      if (!overlap(probe, j) || overlap(p, j)) continue;
      if (!j.frozen) { j.wobble = 0.3; return 'jelly'; }
      return 'ice';
    }
    for (const t of this.tileHits(probe, p.y + p.h)) if (this.tileAt(Math.floor(t.x / T), Math.floor(t.y / T)) === TILE_ICE) return 'ice';
    return null;
  }

  private breakBlock(b: Block): void {
    b.broken = true;
    this.events.push({ type: b.mat === 'ice' ? 'melt' : 'smash', block: b.idx });
  }

  private updatePickups(): void {
    for (const pk of this.pickups) {
      if (pk.respawn > 0) { pk.respawn = Math.max(0, pk.respawn - STEP); continue; }
      const box = { x: pk.x, y: pk.y, w: T - 8, h: T - 8 };
      for (const p of this.players) {
        if (p.inRobot >= 0 || !overlap(p, box)) continue;
        let used = false;
        if (pk.kind === 'cookie' && !p.big) used = this.resize(p, true);
        else if (pk.kind === 'lemon' && p.big) used = this.resize(p, false);
        else if (pk.kind === 'chili') { p.spicyT = PHYS.spicy; used = true; this.events.push({ type: 'spicy', p: p.idx }); }
        else if (pk.kind === 'soda' && !p.fizz) { p.fizz = true; used = true; this.events.push({ type: 'fizz', p: p.idx }); }
        if (used) { pk.respawn = PHYS.pickupRespawn; break; }
      }
    }
  }

  /** Grow (cookie) or shrink (lemon drop), keeping the feet in place. Fails if there is no room to grow. */
  private resize(p: Player, big: boolean): boolean {
    const nw = big ? PHYS.big.w : PHYS.pw, nh = big ? PHYS.big.h : PHYS.ph;
    const cx = p.x + p.w / 2, bottom = p.y + p.h;
    const riders = this.ridersOf(p);
    const solids = this.solidsFor(p).filter(s => !riders.includes(s as Player));
    for (const dx of [0, -8, 8, -16, 16]) {
      const box = { x: cx - nw / 2 + dx, y: bottom - nh, w: nw, h: nh };
      if (this.tileHits(box, null).length || solids.some(s => overlap(box, s))) continue;
      if (big) for (const r of riders) this.moveY(r, -(nh - p.h), 1);
      p.x = box.x; p.y = box.y; p.w = nw; p.h = nh; p.big = big;
      this.events.push({ type: big ? 'grow' : 'shrink', p: p.idx });
      return true;
    }
    return false;
  }

  drainEvents(): GameEvent[] {
    const e = this.events;
    this.events = [];
    return e;
  }

  /** Colour of an ingredient (for UI). */
  static itemColor(k: ItemKind): number {
    return ITEMS[k].color;
  }
}
