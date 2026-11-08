// A test "player" that plays whole levels the way a solo player does: one kaiju moves at a time
// (the others wait, asleep), using only real inputs. Level routes are written with these moves.
import { PHYS, T } from '../src/sim/constants';
import type { LevelDef } from '../src/sim/level';
import { NO_INPUT, World, type Player, type PlayerInput } from '../src/sim/world';
import { nudgeSleepers } from '../src/sim/solo';
import { makeWorld, walker } from './helpers';

type Inp = Partial<PlayerInput>;
const cxOf = (p: Player) => p.x + p.w / 2;

export class Play {
  w: World;
  frame = 0;
  constructor(level: LevelDef, n: number) {
    this.w = makeWorld(level, n);
    this.tick(10);
  }
  get n(): number { return this.w.players.length; }
  P(k: number): Player { return this.w.players[k]; }
  cx(k: number): number { return cxOf(this.P(k)); }
  feet(k: number): number { const p = this.P(k); return p.y + p.h; }
  /** kaiju indices, front (rightmost) first */
  order(): number[] { return [...this.w.players].sort((a, b) => b.x - a.x).map(p => p.idx); }

  private step(inputs: Inp[]): void {
    const full = this.w.players.map((_, i) => ({ ...NO_INPUT, ...(inputs[i] ?? {}) }));
    // like same-screen solo play: whoever has no input is asleep, and walking into them nudges them along
    this.w.step(nudgeSleepers(this.w, full, i => inputs[i] === undefined));
    this.frame++;
    if (this.w.phase === 'splat') throw new Error(`SPLAT (kaiju ${this.w.splatWho}) at frame ${this.frame}: ${this.where()}${this.recent()}`);
  }
  where(): string { return this.w.players.map(p => `P${p.idx}@${(cxOf(p) / T).toFixed(1)},${((p.y + p.h) / T).toFixed(1)}${p.inRobot >= 0 ? 'M' : ''}`).join(' '); }
  tick(frames: number, inputs: (f: number) => Inp[] = () => []): void { for (let f = 0; f < frames; f++) this.step(inputs(f)); }
  /** Give kaiju k input until cond, else fail with a description. */
  log: string[] = [];
  drive(k: number, inp: (f: number) => Inp, cond: () => boolean, max: number, what: string): void {
    this.log.push(`f${this.frame} P${k} ${what} | ${this.where()}`);
    if (this.log.length > 60) this.log.shift();
    for (let f = 0; f < max; f++) {
      if (cond() || this.w.phase === 'clear') return;
      const a: Inp[] = []; a[k] = inp(f);
      this.step(a);
    }
    if (!cond() && this.w.phase !== 'clear') throw new Error(`stuck: ${what} (P${k}) — ${this.where()} cubes ${this.w.crates.map(c => `${(c.x / T).toFixed(2)},${(c.y / T).toFixed(2)} n${c.pushers}/${c.need}`).join(' ')}${this.recent()}`);
  }
  recent(): string { return '\n  recent steps:\n  ' + this.log.join('\n  '); }
  /** Push a line of snoozing friends: kaiju k walks (no jumping) to x tiles. */
  push(k: number, xT: number, until: () => boolean = () => false, max = 1500): void {
    const p = this.P(k), x = xT * T;
    this.drive(k, () => ({ mx: Math.sign(x - cxOf(p)) }), () => until() || Math.abs(cxOf(p) - x) < 6, max, `push to ${xT}`);
    this.tick(3);
  }
  waitFor(cond: () => boolean, max: number, what: string): void {
    for (let f = 0; f < max && !cond(); f++) this.step([]);
    if (!cond()) throw new Error(`stuck waiting: ${what} — ` + this.where() + this.recent());
  }

  /** Walk (hopping gaps and steps) to x tiles. */
  walk(k: number, xT: number, max = 1200): void {
    const x = xT * T, p = this.P(k);
    this.drive(k, () => {
      const inp = walker(this.w, p, x, true);
      if (p.grounded && inp.mx && this.friendAhead(p, Math.sign(inp.mx), x)) inp.jump = true; // hop over, don't shove
      return inp;
    }, () => p.grounded && Math.abs(cxOf(p) - x) < 10, max, `walk to ${xT}`);
    this.tick(3);
  }
  /** A friend right in front of p, standing between p and the goal x. */
  private friendAhead(p: Player, dir: number, goal: number): boolean {
    return this.w.players.some(q => {
      if (q === p || q.inRobot >= 0) return false;
      const gap = dir > 0 ? q.x - (p.x + p.w) : p.x - (q.x + q.w);
      const beyond = dir > 0 ? goal > q.x + q.w : goal < q.x;
      return beyond && gap > -2 && gap < 6 && q.y < p.y + p.h - 8 && p.y < q.y + q.h - 8;
    });
  }
  /** Walk to x tiles, but stopping behind a friend who is in the way also counts (queueing). */
  walkQ(k: number, xT: number, max = 1200): void {
    const x = xT * T, p = this.P(k);
    let still = 0, last = p.x;
    this.drive(k, () => walker(this.w, p, x, true), () => {
      still = Math.abs(p.x - last) < 0.2 ? still + 1 : 0;
      last = p.x;
      return p.grounded && (Math.abs(cxOf(p) - x) < 10 || still > 60);
    }, max, `queue to ${xT}`);
    this.tick(3);
  }
  /** Unstack the starting pile: everyone side by side, rightwards from the leftmost. */
  spread(gap = 0.9): void {
    const ps = [...this.w.players].sort((a, b) => b.x - a.x || a.y - b.y); // front first, top first
    const minX = Math.min(...ps.map(p => cxOf(p))) / T;
    ps.forEach((p, i) => { const xT = minX + (ps.length - 1 - i) * gap; if (Math.abs(cxOf(p) / T - xT) > 0.2) this.walk(p.idx, xT); });
  }
  /** Is kaiju k standing on another kaiju's head? */
  onSomeone(k: number): boolean {
    const p = this.P(k);
    return this.w.players.some(q => q !== p && Math.abs(p.y + p.h - q.y) < 2 && p.x < q.x + q.w && p.x + p.w > q.x);
  }
  /** Who is carrying an ingredient of this kind? */
  carrier(kind: string): number {
    const p = this.w.players.find(q => q.carry >= 0 && this.w.items[q.carry]?.kind === kind);
    if (!p) throw new Error(`nobody carries ${kind}`);
    return p.idx;
  }
  /** Walk without jumping (to stand still at an edge, etc). */
  step2(k: number, xT: number, max = 600): void {
    const x = xT * T, p = this.P(k);
    this.drive(k, () => ({ mx: Math.abs(cxOf(p) - x) <= 3 ? 0 : Math.sign(x - cxOf(p)) * (Math.abs(cxOf(p) - x) < 12 ? 0.3 : 1) }), () => p.grounded && Math.abs(cxOf(p) - x) < 6, max, `step to ${xT}`);
    this.tick(3);
  }
  /** Jump (holding) while steering to x, until standing with feet at or above row `topRow`. */
  jumpUp(k: number, xT: number, topRow: number, max = 600): void {
    const p = this.P(k), x = xT * T;
    this.drive(k, f => ({ mx: Math.abs(cxOf(p) - x) < 4 ? 0 : Math.sign(x - cxOf(p)), jump: f % 45 < 30 }), () => p.grounded && p.y + p.h <= topRow * T + 1 && f0(p, x), max, `jump up to row ${topRow} at ${xT}`);
    this.tick(4);
    function f0(q: Player, gx: number) { return Math.abs(cxOf(q) - gx) < 40; }
  }
  /** Hop onto kaiju h's head. */
  onHead(k: number, h: number, max = 600): void {
    const p = this.P(k), q = this.P(h);
    this.drive(k, f => ({ mx: Math.abs(cxOf(p) - cxOf(q)) < 4 ? 0 : Math.sign(cxOf(q) - cxOf(p)), jump: f % 40 < 26 }), () => p.grounded && Math.abs(p.y + p.h - q.y) < 1, max, `onto P${h}'s head`);
    this.tick(5);
  }
  /** Climb via kaiju h: hop onto h's head, then up to stand on row topRow (steering to xT once above h). */
  climb(k: number, h: number, topRow: number, xT?: number, max = 900): void {
    const p = this.P(k), q = this.P(h);
    let stood = false; // first land on h's head, only then head for xT
    this.drive(k, f => {
      if (p.grounded && Math.abs(p.y + p.h - q.y) < 1) stood = true;
      if (p.grounded && !stood && p.y + p.h > q.y + 1) stood = false;
      const above = stood && p.y + p.h <= q.y + 1;
      const tx = above && xT !== undefined ? xT * T : cxOf(q);
      const dx = tx - cxOf(p);
      // like a player: get close, jump straight up, steer in the air (don't shove things along the ground)
      if (p.grounded && Math.abs(dx) > 45 && !above) return walker(this.w, p, tx, true);
      return { mx: p.grounded || Math.abs(dx) < 4 ? 0 : Math.sign(dx), jump: f % 45 < 30 };
    }, () => p.grounded && p.y + p.h <= topRow * T + 1 && Math.abs(p.y + p.h - q.y) > 1, max, `climb via P${h} to row ${topRow}`);
    this.tick(4);
  }
  /** Step gently off a ledge in direction dir (so you don't drift onto someone below). */
  dropOff(k: number, dir: number): void {
    const p = this.P(k);
    this.drive(k, () => ({ mx: 0.25 * dir }), () => !p.grounded, 400, 'step off the ledge');
    this.drive(k, () => ({}), () => p.grounded, 200, 'land');
    this.tick(3);
  }
  grab(k: number): void { const a: Inp[] = []; a[k] = { grab: true }; this.step(a); this.tick(2); }
  holdGrab(k: number, frames = 40): void { this.tick(frames, () => { const a: Inp[] = []; a[k] = { grab: true }; return a; }); this.tick(2); }
  /** Pick up the nearest ingredient of a kind. */
  pick(k: number, kind: string): void {
    const it = this.w.items.find(i => i.kind === kind && !i.delivered && i.carrier < 0);
    if (!it) throw new Error(`no ${kind} lying around`);
    const ix = it.x + PHYS.item / 2;
    this.drive(k, () => walker(this.w, this.P(k), ix, true), () => this.P(k).grounded && Math.abs(cxOf(this.P(k)) - ix) < 24 && Math.abs(this.P(k).y + this.P(k).h - (it.y + PHYS.item)) < 30, 1200, `to the ${kind}`);
    this.tick(3);
    this.grab(k);
    if (this.w.items[this.P(k).carry]?.kind !== kind) throw new Error(`P${k} failed to pick up ${kind} — ` + this.where());
  }
  /** Walk to the pot and drop the carried ingredient in. */
  deliver(k: number): void {
    const pot = this.w.pots[0];
    const before = this.w.delivered;
    // anyone standing between k and the pot hops past it first (else k would shove them along)
    const ahead = this.order().filter(j => j !== k && this.cx(j) > this.cx(k) && this.cx(j) < pot.x + 10);
    for (const j of ahead) this.walkQ(j, this.slotPast(j));
    this.walk(k, (pot.x - 20) / T);
    this.grab(k);
    if (this.w.delivered !== before + 1) throw new Error(`P${k} failed to deliver — ` + this.where());
    this.walkQ(k, this.slotPast(k)); // hop over the pot, out of the next one's way
  }
  /** Where kaiju k should wait past the pot: lined up from the far end of the plate, front first. */
  private slotPast(k: number): number {
    const pot = this.w.pots[0], pl = this.w.plates[0];
    const potEnd = (pot.x + pot.w) / T;
    const there = this.w.players.filter(p => p.idx !== k && cxOf(p) / T > potEnd).length;
    const far = pl && pl.x > pot.x ? (pl.x + pl.w) / T - 0.6 : potEnd + 6;
    const lo = Math.min(...this.w.players.filter(p => p.idx !== k).map(p => cxOf(p) / T), 999);
    return Math.min(Math.max(far - there * 0.9, potEnd + 1.2), lo + 20);
  }
  pull(k: number, leverIdx = 0): void {
    const l = this.w.levers[leverIdx];
    this.walk(k, (l.x + T / 2) / T);
    const before = this.w.leverOn.get(l.id);
    this.grab(k);
    if (this.w.leverOn.get(l.id) === before) throw new Error(`P${k} failed to pull lever ${leverIdx}`);
  }
  /** Everyone (one at a time, front first) lines up behind x tiles. */
  gather(xT: number, gap = 0.9): void {
    for (let hop = 0; hop < 12; hop++) {
      const ord = this.order();
      const done = ord.every((k, i) => Math.abs(this.cx(k) - (xT - i * gap) * T) < 12);
      if (done) return;
      ord.forEach((k, i) => {
        const others = ord.filter(j => j !== k).map(j => this.cx(j) / T);
        const lo = Math.min(...others, 999);
        const want = xT - i * gap, here = this.cx(k) / T;
        const goal = Math.min(want, lo + 20); // never run off the shared screen
        if (Math.sign(goal - here) !== Math.sign(want - here)) return; // don't walk away from the goal: wait for the others
        if (Math.abs(here - goal) > 0.3) this.walkQ(k, goal);
      });
    }
  }
  /** Everyone onto the plate (one at a time); the level must clear. */
  finish(): void {
    if (!this.w.recipeDone) throw new Error('recipe not done');
    const pl = this.w.plates[0];
    // in hops (front first, never off the shared screen), everyone to a spot on the plate
    for (let hop = 0; hop < 10 && this.w.phase !== 'clear'; hop++) {
      this.order().forEach((k, i) => {
        if (this.w.phase === 'clear' || this.w.onPlate(this.P(k))) return;
        const lo = Math.min(...this.w.players.filter(p => p.idx !== k).map(p => cxOf(p) / T));
        const spot = Math.max((pl.x + pl.w - 25 - i * 37) / T, (pl.x + 20) / T);
        const goal = Math.min(spot, lo + 20);
        if (goal > this.cx(k) / T + 0.3 || spot < this.cx(k) / T) this.walkQ(k, goal);
      });
    }
    this.waitFor(() => this.w.phase === 'clear', 60, 'level clear');
  }

  // ---------------------------------------------------------------- Pot Mech
  board(k: number): void {
    const r = this.w.robots[0];
    const side = cxOf(this.P(k)) < r.x + r.w / 2 ? r.x - 20 : r.x + r.w + 20;
    this.walk(k, side / T);
    this.grab(k);
    if (this.P(k).inRobot < 0) throw new Error(`P${k} failed to board`);
  }
  /** Pilot k drives the Mech so its centre is at x tiles (jumping when blocked). */
  mechTo(k: number, xT: number, max = 1500): void {
    const r = this.w.robots[0], x = xT * T;
    let stuck = 0, last = r.x;
    this.drive(k, () => {
      const dir = Math.abs(r.x + r.w / 2 - x) < 4 ? 0 : Math.sign(x - (r.x + r.w / 2));
      stuck = Math.abs(r.x - last) < 0.5 && dir !== 0 ? stuck + 1 : 0;
      last = r.x;
      return { mx: dir * (Math.abs(r.x + r.w / 2 - x) < 14 ? 0.3 : 1), jump: stuck > 4 && r.grounded };
    }, () => r.grounded && Math.abs(r.x + r.w / 2 - x) < 12, max, `Mech to ${xT}`);
    this.tick(4);
  }
  mechArm(k: number): void { this.grab(k); }
  unboard(k: number): void { this.holdGrab(k, 40); if (this.P(k).inRobot >= 0) throw new Error(`P${k} failed to hop out`); }
}
