// Whole-level playthroughs, World 3 (The Pantry), played solo-style (one kaiju at a time).
import { describe, it } from 'vitest';
import { PHYS, T } from '../src/sim/constants';
import { isHazardTile, TILE_TRAP } from '../src/sim/level';
import { PANTRY_LEVELS } from '../src/sim/levels-pantry';
import { toward, walker } from './helpers';
import { Play } from './play';

const lv = (i: number) => PANTRY_LEVELS[i];
const COUNTS = [2, 6];
type W = { tileAt(c: number, r: number): number };

/** While a "reverse" ticket is on, a player presses the opposite way: so does the bot. */
function minded(g: Play): Play {
  const drive = g.drive.bind(g);
  g.drive = (k, inp, cond, max, what) => drive(k, f => {
    const i = inp(f);
    return g.w.rule === 'reverse' && i.mx ? { ...i, mx: -i.mx } : i;
  }, cond, max, what);
  return g;
}

/** Walk to x tiles, hopping over mousetraps (the plain walker would stroll onto them). */
function trapWalk(g: Play, k: number, xT: number, max = 1500): void {
  const w = g.w, p = w.players[k], x = xT * T;
  const tile = (w as unknown as W).tileAt.bind(w);
  /** first thing below x (px), looking down from the feet */
  const below = (px: number) => {
    const c = Math.floor(px / T);
    for (let r = Math.floor((p.y + p.h + 1) / T); r < w.level.h; r++) if (tile(c, r)) return tile(c, r);
    return 0;
  };
  let travel = 0;
  g.drive(k, () => {
    const inp = walker(w, p, x, true);
    const dir = Math.sign(x - (p.x + p.w / 2));
    if (p.grounded && dir) {
      const edge = dir > 0 ? p.x + p.w : p.x;
      for (let d = 2; d < 18; d += 4) if (below(edge + dir * d) === TILE_TRAP) { inp.jump = true; travel = dir; }
    }
    if (!p.grounded && travel) {
      // keep going until clear of the trap, then steer for the spot (so you don't land on a friend)
      if ([p.x - 3, p.x + p.w / 2, p.x + p.w + 3].some(px => below(px) === TILE_TRAP)) inp.mx = travel;
      else { inp.mx = Math.abs(p.x + p.w / 2 - x) < 4 ? 0 : dir; travel = 0; }
    }
    return inp;
  }, () => p.grounded && Math.abs(p.x + p.w / 2 - x) < 10, max, `trap-walk to ${xT}`);
  g.tick(3);
}

/** Everyone climbs into the Pot Mech (front first); returns the last one in, who drives. */
function allAboard(g: Play): number {
  let pilot = -1;
  for (const k of g.order()) {
    g.grab(k); // already next to it? (at the start the front kaiju can be wedged against it)
    if (g.P(k).inRobot < 0) g.board(k);
    pilot = k;
  }
  g.tick(160); // the ones who climbed in earlier nod off: the one who is playing gets every job
  return pilot;
}

/** Mech centre (tiles) that puts the arm's reach over a thing at x px (Mech facing right). */
const armAt = (x: number) => (x - PHYS.robot.w / 2) / T;

// ------------------------------------------------------------------ the noodle
// Kaiju are tied in player order (P0-P1-P2-...), neighbours at most 170 px (~4.25 tiles) apart. Whoever is in
// the air gets pulled when the noodle goes tight, so every move keeps both neighbours in reach. A big team
// stands in player order and inches along like a caterpillar.

/** Stand still at x tiles (on flat ground), creeping the last bit so the spot is exact. */
function at(g: Play, k: number, xT: number): void {
  const p = g.P(k), x = xT * T;
  g.drive(k, () => {
    const d = x - g.cx(k);
    return { mx: Math.abs(d) < 1 ? 0 : Math.sign(d) * Math.min(1, Math.max(0.22, Math.abs(d) / 40)) };
  }, () => p.grounded && Math.abs(g.cx(k) - x) < 2 && Math.abs(p.vx) < 5, 600, `stand at ${xT}`);
}

/** One jump (or a walk) to x tiles, landing and stopping there. */
function hop(g: Play, k: number, xT: number): void {
  const p = g.P(k), x = xT * T;
  g.drive(k, f => ({ ...toward(p, x, 4), jump: f < 20 && Math.abs(g.cx(k) - x) > 30 }), () => p.grounded && Math.abs(g.cx(k) - x) < 12, 600, `hop to ${xT}`);
  g.tick(4);
}

/** Is there a gap, a hazard or a step up between here and x tiles (so walking won't do)? */
function gapTo(g: Play, k: number, xT: number): boolean {
  const cur = g.cx(k) / T, dir = Math.sign(xT - cur), feet = g.feet(k);
  for (let x = cur; (xT - x) * dir > 0; x += dir * 0.2) {
    const f = standAt(g, k, x);
    if (f === null || f < feet - 2) return true;
  }
  const f = standAt(g, k, xT);
  return f === null || f < feet - 2;
}

/** Move to x tiles: a hop if there is a gap on the way, then stand exactly there. */
function go(g: Play, k: number, xT: number): void {
  const p = g.P(k), x = xT * T, lo = Math.min(p.x, x - p.w / 2), hi = Math.max(p.x + p.w, x + p.w / 2);
  const pot = g.w.pots.find(o => o.x < hi && o.x + o.w > lo);
  if (pot && x > pot.x - 2 && x < pot.x + pot.w + 2) g.jumpUp(k, xT, pot.y / T); // up onto the pot
  else if (pot && p.y + p.h > pot.y + 2) { // over it: from right beside it, one hop
    const dir = Math.sign(x - g.cx(k));
    at(g, k, (dir > 0 ? pot.x - 18 : pot.x + pot.w + 18) / T);
    hop(g, k, xT);
  }
  else if (gapTo(g, k, xT)) hop(g, k, xT);
  at(g, k, xT);
}

/** Where kaiju k would stand at x tiles: feet height (px) of the ground there (not a hazard), or null. */
function standAt(g: Play, k: number, xT: number): number | null {
  const tile = (g.w as unknown as W).tileAt.bind(g.w), p = g.P(k);
  const r0 = Math.floor((p.y + p.h + 1) / T) - 1;
  let feet: number | null = null;
  for (const o of g.w.pots) {
    if (xT * T + p.w / 2 <= o.x || xT * T - p.w / 2 >= o.x + o.w) continue;
    return xT * T > o.x + 2 && xT * T < o.x + o.w - 2 ? o.y : null; // on top of the pot, or half inside it
  }
  for (let col = Math.floor(xT - 0.42); col <= Math.floor(xT + 0.42); col++) {
    let r = r0;
    while (r < r0 + 4 && !tile(col, r)) r++;
    if (r >= r0 + 4 || isHazardTile(tile(col, r))) { if (col === Math.floor(xT)) return null; continue; }
    if (r * T < (feet ?? Infinity)) feet = r * T;
  }
  return feet;
}

/** The chain (front last) moves to targets, front first, never stretching a noodle (to ~3.9 tiles) and only
 *  ever stopping on safe ground. */
function crawl(g: Play, c: number[], targets: number[], strict = true): void {
  const dist = (k: number, xT: number, feet: number) => Math.hypot(g.cx(k) / T - xT, (g.feet(k) - feet) / T);
  for (let pass = 0; pass < 30 && g.w.phase !== 'clear'; pass++) {
    let moved = false;
    for (let i = c.length - 1; i >= 0; i--) {
      const k = c[i], cur = g.cx(k) / T, want = targets[i];
      if (Math.abs(want - cur) < 0.06) continue;
      const dir = Math.sign(want - cur);
      const lead = dir > 0 ? c[i + 1] : c[i - 1], tail = dir > 0 ? c[i - 1] : c[i + 1]; // the one in the way / the one left behind
      const potOnWay = g.w.pots.some(o => (o.x / T - cur) * dir > 0 && ((o.x + o.w) / T - want) * dir < 0 && g.feet(k) > o.y + 2);
      const room = potOnWay ? 1.5 : 0.9; // a hop over the pot lands less precisely
      let goal = lead === undefined ? want : dir > 0 ? Math.min(want, g.cx(lead) / T - room) : Math.max(want, g.cx(lead) / T + room);
      for (; (goal - cur) * dir > 0.06; goal -= dir * 0.05) {
        const feet = standAt(g, k, goal);
        if (feet !== null && (tail === undefined || dist(tail, goal, feet) <= 3.9)) break;
      }
      if ((goal - cur) * dir <= 0.06) continue;
      go(g, k, goal);
      moved = true;
    }
    if (!moved) break;
  }
  if (strict && g.w.phase !== 'clear' && c.some((k, i) => Math.abs(g.cx(k) / T - targets[i]) > 0.2)) throw new Error(`crawl stuck — ${g.where()}${g.recent()}`);
}

/** Through the honey pit (ledge A ends at 10, ledge B starts at 14, the pit is 3 deep: too deep to jump out).
 *  The front one fetches the honey. Then, one by one: drop in, be the step the one ahead climbs out on,
 *  and the last one is hauled out. Spots are chosen so no noodle is ever stretched. */
function pitCrossing(g: Play, c: number[], ahead = [19.2, 20.4, 21.6], haulTo = 18.6): void {
  const n = c.length, A0 = 9.55, DROP = 11.4, STEP = 12.45, WAIT = 13.4, B0 = 14.45, B1 = 15.6;
  const closeUpA = (j: number) => { for (let i = j; i >= 0; i--) at(g, c[i], A0 - (j - i) * 0.9); };
  crawl(g, c, c.map((_, i) => A0 - (n - 1 - i) * 0.9));
  // the front one goes down for the honey
  g.pick(c[n - 1], 'honey');
  at(g, c[n - 1], DROP);
  closeUpA(n - 2);
  at(g, c[n - 1], STEP);
  for (let j = n - 2; j >= 0; j--) {
    // state: c[j+1] down in the pit at STEP, c[j] (and c[j-1]...) lined up on A, c[j+2]... on B
    g.walk(c[j], DROP); // drop in
    at(g, c[j], DROP);
    at(g, c[j + 1], WAIT); // make way
    for (let i = n - 1; i >= j + 2; i--) at(g, c[i], B1 + (i - j - 2) * 0.9); // the ones on B shuffle along
    if (j > 0) closeUpA(j - 1);
    at(g, c[j], STEP);
    g.climb(c[j + 1], c[j], 13, B0); // c[j+1] climbs out over c[j]'s head
    at(g, c[j + 1], B0);
  }
  // the last one is hauled out. Pulling level with the top only drags them into the corner, so the one in
  // front (c[1]) rides on c[2]'s head and c[2] walks away: that noodle pulls up and over
  at(g, c[0], 13.55); // against the wall
  at(g, c[2], 15.35);
  crawl(g, c.slice(2), [15.35, ...ahead].slice(0, n - 2), false);
  g.onHead(c[1], c[2]);
  at(g, c[1], 15.7); // at the front of the head (the pull drags them back a little)
  g.walk(c[2], haulTo);
  g.waitFor(() => g.P(c[0]).grounded && g.feet(c[0]) <= 13 * T + 1, 200, 'hauled out of the pit');
  g.dropOff(c[1], -1);
}

/** The caterpillar over 2-tile pillars spaced 4 apart (gaps 2): two to a pillar, standing at t-0.45 / t+0.45.
 *  From front pillar F to F+4 in 12 moves; every move keeps both of the mover's neighbours within reach. */
function pillarShift(g: Play, c: number[], F: number, after?: (k: number) => void): void {
  const moves: [number, number][] = [
    [5, F + 3.55], [4, F + 0.45], [5, F + 4.45], [3, F - 0.45], [4, F + 3.55], [2, F - 3.55],
    [3, F + 0.45], [1, F - 4.45], [2, F - 0.45], [0, F - 7.55], [1, F - 3.55], [0, F - 4.45]];
  for (const [i, x] of moves) {
    if (g.cx(c[i]) / T > x - 0.05) continue; // already there or further (a squashed-up start)
    go(g, c[i], x);
    after?.(c[i]);
  }
}

/** Pick up a kind lying within reach (no walking), if hands are free. */
function grabIfNear(g: Play, k: number, kind: string): void {
  const p = g.P(k);
  if (p.carry >= 0) return;
  const it = g.w.items.find(i => i.kind === kind && !i.delivered && i.carrier < 0);
  if (!it || it.x > p.x + p.w + 10 || it.x + PHYS.item < p.x - 10 || Math.abs(it.y + PHYS.item - (p.y + p.h)) > 20) return;
  g.grab(k);
}

// ------------------------------------------------------------------ 1. Noodle Buddies
function noodleBuddies(g: Play): void {
  if (g.n === 2) return noodleDuo(g);
  const w = g.w;
  const c = w.players.map(p => p.idx); // the noodle's order; P0 at the back, the last one in front
  // unstack: the top row goes to the front, in order
  for (let i = c.length - 1; i >= 3; i--) g.walk(c[i], 7.5 - (c.length - 1 - i) * 0.9);
  pitCrossing(g, c);
  crawl(g, c, [14.55, 15.45, 18.55, 19.45, 22.55, 23.45]);
  for (const F of [23, 27, 31, 35, 39]) pillarShift(g, c, F, k => grabIfNear(g, k, 'cereal'));
  if (!w.items.some(i => i.kind === 'cereal' && i.carrier >= 0)) throw new Error('nobody picked up the cereal');
  // pack onto the far ledge and the pot, in three waves
  const waves = [[45.2, 43.4, 42.5, 39.45, 38.55, 35.45], [46.55, 44.3, 43.4, 42.5, 39.45, 38.55], [47.45, 45.2, 44.3, 43.4, 42.5, 39.45]];
  for (const wave of waves) wave.forEach((x, j) => go(g, c[5 - j], x));
  // honey from on top of the pot, cereal from beside it
  g.grab(g.carrier('honey'));
  g.grab(g.carrier('cereal'));
  if (!w.recipeDone) throw new Error('recipe not done ' + g.where());
  [49, 47.45, 46.55, 45.2, 43.35, 42.45].forEach((x, j) => go(g, c[5 - j], x));
  crawl(g, c, [52.9, 53.8, 54.7, 55.6, 56.5, 57.4]);
  g.waitFor(() => w.phase === 'clear', 60, 'level clear');
}

function noodleDuo(g: Play): void {
  const w = g.w;
  const [A, B] = g.order();
  // A walks down into the pit for the honey, then waits at its far side
  g.walk(A, 9.3);
  g.walkQ(B, 8.4); // close behind (the noodle is only ~4 tiles)
  g.walk(A, 10.5);
  g.pick(A, 'honey');
  g.step2(A, 13.4);
  // B comes down too and is the step A climbs out on; then A hauls B up by walking away
  g.walk(B, 12.3);
  g.climb(A, B, 13, 15);
  g.walk(A, 18);
  g.waitFor(() => w.players[B].grounded, 120, 'B up');
  // over the pillars in turns, front then back, never more than a noodle apart
  g.step2(A, 23.6);
  g.step2(B, 22.7);
  for (const t of [27, 31, 35, 39, 44]) {
    const cereal = t === 31;
    hop(g, A, t + 0.45);
    hop(g, B, t - 0.45);
    if (cereal) {
      g.step2(A, 31.6); // shuffle up close: B's arms just reach the cereal under A
      g.step2(B, 30.65);
      g.grab(B);
      if (w.items[w.players[B].carry]?.kind !== 'cereal') throw new Error('no cereal ' + g.where());
    }
  }
  g.deliver(A);
  g.deliver(B);
  g.finish();
}

// ------------------------------------------------------------------ 2. Swing Shift
/** The front kaiju (the end of the noodle) is lowered down the shaft by its neighbour, swings into the nook
 *  for the pasta and is hauled back up. */
function swingForPasta(g: Play, front: number, anchor: number): void {
  const w = g.w, a = g.P(front);
  g.drive(front, () => ({ mx: 0.4 }), () => !a.grounded && a.y > 10 * T, 300, 'off into the shaft');
  g.tick(30);
  at(g, anchor, 11.4); // anchor right at the edge
  g.drive(front, () => ({ mx: 1 }), () => a.x + a.w + 10 > 14 * T + 8 && a.y + a.h + 10 > 13 * T + 16, 300, 'swing into the nook');
  g.grab(front);
  if (w.items[a.carry]?.kind !== 'pasta') throw new Error('no pasta ' + g.where());
  g.drive(anchor, () => ({ mx: -1 }), () => a.grounded && a.y + a.h <= 10 * T + 1, 600, 'haul up');
}

function swingShift(g: Play): void {
  const w = g.w, n = g.n;
  const c = w.players.map(p => p.idx); // the noodle's order; P0 at the back, the last one in front
  if (n > 3) for (let i = n - 1; i >= 3; i--) g.walk(c[i], 7.5 - (n - 1 - i) * 0.9); // unstack: top row to the front
  crawl(g, c, c.map((_, i) => (i === n - 1 ? 11.5 : 10.6 - (n - 2 - i) * 0.9)));
  swingForPasta(g, c[n - 1], c[n - 2]);
  // line up at the shaft edge in noodle order (the next crawl hops the shaft one at a time and goes down the stairs)
  crawl(g, c, c.map((_, i) => 11.55 - (n - 1 - i) * 0.95));
  if (n === 2) {
    const [B, A] = c;
    crawl(g, c, [26.55, 27.45]);
    // over the mousetraps in turns, never more than a noodle apart
    for (const t of [31, 35, 39]) {
      go(g, A, t - 0.45); go(g, B, t - 3.55); go(g, A, t + 0.45); go(g, B, t - 0.45);
      grabIfNear(g, B, 'flour');
    }
  } else {
    crawl(g, c, [22.55, 23.45, 24.55, 25.45, 26.55, 27.45]);
    // onto the first stepping stone (from the stairs: like a caterpillar shift, squashed up)
    const entry: [number, number][] = [[5, 30.55], [4, 27.45], [5, 31.45], [3, 26.55], [4, 30.55], [2, 25.45], [3, 27.45], [1, 24.55], [2, 26.55], [0, 23.45], [1, 25.45], [0, 24.55]];
    for (const [i, x] of entry) go(g, c[i], x);
    for (const F of [31, 35, 39, 43]) pillarShift(g, c, F, k => grabIfNear(g, k, 'flour'));
  }
  if (!w.items.some(i => i.kind === 'flour' && i.carrier >= 0)) throw new Error('nobody picked up the flour ' + g.where());
  if (n === 2) {
    // pasta from beside the pot, then that one hops up onto the pot to make room for the flour
    const [B, A] = c;
    crawl(g, c, [44.55, 45.5]);
    g.grab(A);
    go(g, A, 46.55);
    at(g, B, 45.5);
    g.grab(B);
  } else {
    g.grab(g.carrier('pasta')); // both carriers are standing on top of the pot
    g.grab(g.carrier('flour'));
  }
  if (!w.recipeDone) throw new Error('recipe not done ' + g.where());
  crawl(g, c, c.map((_, i) => 57.4 - (n - 1 - i) * 0.9));
  g.waitFor(() => w.phase === 'clear', 60, 'level clear');
}

// ------------------------------------------------------------------ 3. Pot Mech
function potMech(g: Play): void {
  const w = g.w;
  const pilot = allAboard(g);
  g.mechTo(pilot, 16); // smash the cracker wall
  g.mechTo(pilot, 25.5); // up the step, onto the scale
  g.waitFor(() => w.scales[0].active, 60, 'scale active');
  const pasta = w.items.find(i => i.kind === 'pasta')!;
  g.mechTo(pilot, armAt(pasta.x + PHYS.item / 2));
  g.mechArm(pilot);
  if (w.robots[0].carry !== pasta.idx) throw new Error('Mech missed the pasta');
  g.mechTo(pilot, armAt(w.pots[0].x + 4));
  g.mechArm(pilot);
  if (!w.recipeDone) throw new Error('pasta not in the pot');
  g.mechTo(pilot, 57); // everyone rides onto the plate
  g.waitFor(() => w.phase === 'clear', 60, 'level clear');
}

// ------------------------------------------------------------------ 4. Mech Arm
function mechArm(g: Play): void {
  const w = g.w, r = w.robots[0];
  const pilot = allAboard(g);
  const melon = w.items.find(i => i.kind === 'melon')!;
  // park by the lever shelf (hopping out starts with a GRAB tap, which would fling a carried melon,
  // so the melon waits), hop out onto the Mech's head, jump up and pull the lever
  g.mechTo(pilot, 15);
  g.unboard(pilot);
  g.tick(30);
  g.jumpUp(pilot, 17.5, 12);
  g.pull(pilot);
  // through the door and under the low shelf for the honey; wait there
  g.walk(pilot, 24);
  g.pick(pilot, 'honey');
  g.walk(pilot, 31);
  // somebody still inside (napping until now) drives: back for the melon, then over the shelf to the pot
  const driver = r.crew[r.crew.length - 1];
  g.mechTo(driver, (melon.x - 6 + PHYS.robot.w / 2) / T); // back a little: facing left, melon in reach
  g.mechArm(driver);
  if (r.carry !== melon.idx) throw new Error('Mech missed the melon');
  g.mechTo(driver, 30);
  g.mechTo(driver, armAt(w.pots[0].x + 4));
  g.mechArm(driver);
  if (w.delivered !== 1) throw new Error('melon not in the pot');
  g.walk(pilot, 38); // (keeping up, so the Mech can get onto the plate without leaving them off-screen)
  g.mechTo(driver, 54); // out of the way, onto the plate
  g.deliver(pilot);
  g.finish();
}

// ------------------------------------------------------------------ 5. Order Chaos
/** Across the three mousetrap pairs (24-25, 29-30, 34-35), one at a time, front first, never off the
 *  shared screen: with a big team some wait on the island between the last two traps. */
function crossTraps(g: Play): void {
  const lo = (k: number) => Math.min(...g.w.players.filter(p => p.idx !== k).map(p => (p.x + p.w / 2) / T));
  const ord = g.order();
  if (ord.length <= 2) {
    ord.forEach((k, i) => trapWalk(g, k, Math.min(42 - i * 0.9, lo(k) + 19.5)));
    return;
  }
  // past the traps (as far as the screen allows), on the island between the last two, between the first two
  const spots = [40.2, 39.2, 38.2, 33.45, 32.2, 27.5];
  ord.forEach((k, i) => trapWalk(g, k, Math.min(spots[i], lo(k) + 21.3)));
  g.order().forEach((k, i) => trapWalk(g, k, 42 - i * 0.9));
}

function orderChaos(g: Play): void {
  const w = minded(g).w;
  g.spread();
  g.pick(g.order()[0], 'cereal');
  g.gather(23.2); // the first one past x=20 swaps left and right
  crossTraps(g);
  // flour from the high shelf: one boosts the other
  const Y = g.order().find(k => w.players[k].carry < 0)!; // the climber needs free hands
  const X = g.order().find(k => k !== Y)!;
  g.walk(X, 44.6);
  g.walk(Y, 43.6);
  g.climb(Y, X, 13, 45.5);
  g.pick(Y, 'flour');
  g.gather(56);
  g.deliver(g.carrier('cereal'));
  g.deliver(g.carrier('flour'));
  g.finish();
}

// ------------------------------------------------------------------ 6. Pantry Panic
function pantryPanic(g: Play): void {
  const w = g.w, n = g.n;
  const c = w.players.map(p => p.idx); // the noodle's order; P0 at the back, the last one in front
  // the noodle part: the honey pit, two pillars, and the ticket on the far ledge cuts the noodle
  if (n === 2) {
    const [B, A] = c;
    g.walk(A, 9.3);
    g.walkQ(B, 8.4);
    g.walk(A, 10.5);
    g.pick(A, 'honey');
    g.step2(A, 13.4);
    g.walk(B, 12.3);
    g.climb(A, B, 13, 15);
    g.walk(A, 18);
    g.waitFor(() => w.players[B].grounded, 120, 'B up');
    g.step2(A, 21.55);
    g.step2(B, 20.65);
    for (const t of [25, 29, 33]) { hop(g, A, t + 0.45); hop(g, B, t - 0.45); }
  } else {
    for (let i = n - 1; i >= 3; i--) g.walk(c[i], 7.5 - (n - 1 - i) * 0.9); // unstack: top row to the front
    pitCrossing(g, c, [18.6, 19.8, 21.4], 17.65);
    crawl(g, c, [14.55, 15.45, 16.55, 17.45, 20.55, 21.45]);
    for (const F of [21, 25, 29]) pillarShift(g, c, F);
  }
  at(g, c[n - 1], 34.6);
  if (w.tetherLen !== 0) throw new Error('still tied ' + g.where());
  if (n === 2) panicDuo(g, c[1], c[0]); else panicCrew(g, c);
}

// The Pot Mech part of Pantry Panic. Without a ticket kaiju can't get up the 4-tile block, so they ride the Mech:
// inside, or (when carrying something, since climbing in drops it) standing on its head.
const BLOCK_L = 58, BLOCK_R = 68;
/** Mech centre (tiles) that puts the arm's reach on a thing at x px when facing left. */
const armLeftAt = (x: number) => (x + 10 + PHYS.robot.w / 2) / T;
const noTicket = (g: Play) => g.waitFor(() => g.w.rule !== 'lowgrav', 1200, 'moon gravity to wear off');

function panicDuo(g: Play, A: number, B: number): void {
  const w = g.w, r = w.robots[0];
  const pasta = w.items.find(i => i.kind === 'pasta')!, melon = w.items.find(i => i.kind === 'melon')!;
  const pot = w.pots[0];
  // B climbs in and drives to the block, smashing the cracker wall
  g.walk(B, 39.7);
  g.board(B);
  g.mechTo(B, 51.4); // (hopping out begins with a GRAB tap: keep the melon out of the arm's reach)
  g.walk(A, 48.5);
  // B hops out (not next to the melon: a GRAB there just tries to lift it) and is the step A (holding the honey) climbs onto the Mech's head by
  g.unboard(B);
  g.tick(20);
  g.dropOff(B, -1);
  at(g, B, (r.x - 18) / T);
  g.climb(A, B, r.y / T, (r.x + 70) / T);
  // B climbs back in, fetches the pasta with the arm (A rides along), then up the block
  g.board(B);
  g.mechTo(B, armLeftAt(pasta.x));
  g.mechArm(B);
  if (r.carry !== pasta.idx) throw new Error('Mech missed the pasta');
  g.mechTo(B, BLOCK_L - PHYS.robot.w / 2 / T - 0.05);
  noTicket(g); // (the moon-gravity ticket prints here; the route doesn't need it)
  g.mechTo(B, 61);
  // A steps off, down the far side, over the mousetrap trench, honey in the pot, then up onto the pot
  g.walk(A, 66.5);
  g.walk(A, 70.5);
  g.mechTo(B, BLOCK_R - PHYS.robot.w / 2 / T - 0.1);
  trapWalk(g, A, 81.5);
  g.walk(A, (pot.x - 20) / T);
  g.grab(A);
  go(g, A, (pot.x + pot.w / 2 + 20) / T);
  // the Mech follows and drops the pasta in
  g.mechTo(B, 70);
  g.mechTo(B, armAt(pot.x + 4));
  g.mechArm(B);
  if (w.delivered !== 2) throw new Error('pasta not in the pot ' + g.where());
  // second trip: A climbs in too, back up the block; B hops out for the flour
  g.board(A);
  g.mechTo(A, 70);
  g.mechTo(A, 62.5); // (from the right, so the arm faces away from the flour)
  g.unboard(B);
  g.tick(20);
  g.pick(B, 'flour');
  g.walk(B, 66.5);
  g.walk(B, 71);
  // A drives down for the melon and back
  g.mechTo(A, armLeftAt(melon.x));
  g.mechArm(A);
  if (r.carry !== melon.idx) throw new Error('Mech missed the melon ' + g.where());
  noTicket(g);
  g.mechTo(A, 61);
  g.mechTo(A, BLOCK_R - PHYS.robot.w / 2 / T - 0.1);
  trapWalk(g, B, 81.5);
  go(g, B, (pot.x + pot.w / 2 + 20) / T); // wait on top of the pot
  g.mechTo(A, 70);
  g.mechTo(A, armAt(pot.x + 4));
  g.mechArm(A);
  g.grab(B);
  if (!w.recipeDone) throw new Error('recipe not done ' + g.where());
  g.walk(B, 97.4);
  g.mechTo(A, 91);
  g.waitFor(() => w.phase === 'clear', 60, 'level clear');
}

function panicCrew(g: Play, c: number[]): void {
  const w = g.w, r = w.robots[0], pot = w.pots[0];
  const melon = w.items.find(i => i.kind === 'melon')!;
  const H = c[5], F = c[1], P = c[0], Q = c[4]; // honey carrier, the step, the pasta carrier, the flour fetcher
  // off the pillars onto the far ledge, front first
  at(g, c[5], 37.45);
  at(g, c[4], 36.5);
  go(g, c[3], 35.55);
  go(g, c[2], 34.6);
  go(g, c[1], 29.45); go(g, c[1], 33.65);
  at(g, c[0], 25.45); go(g, c[0], 29.45); go(g, c[0], 32.7);
  // three climb into the Mech; the last one in drives to the cracker wall
  for (const k of [c[4], c[3], c[2]]) g.board(k);
  g.tick(160);
  g.mechTo(c[2], 51.4); // (hopping out begins with a GRAB tap: keep the melon out of the arm's reach)
  // the rest follow; P picks up the pasta; F is the step the two carriers climb onto the Mech's head by
  g.walk(H, 48);
  g.walk(F, (r.x - 18) / T);
  g.pick(P, 'pasta');
  g.climb(H, F, r.y / T, (r.x + 84) / T);
  g.climb(P, F, r.y / T, (r.x + 30) / T);
  g.board(F);
  g.mechTo(F, BLOCK_L - PHYS.robot.w / 2 / T - 0.05);
  noTicket(g); // (the moon-gravity ticket prints here; the route doesn't need it)
  g.mechTo(F, 61); // up the block, carriers riding on top
  // on top: the riders step off; Q hops out for the flour
  g.walk(H, 66.5);
  g.walk(P, 65.55);
  g.unboard(Q);
  g.tick(20);
  g.pick(Q, 'flour');
  // F drives down for the melon and back up
  g.mechTo(F, armLeftAt(melon.x));
  g.mechArm(F);
  if (r.carry !== melon.idx) throw new Error('Mech missed the melon');
  g.mechTo(F, 61);
  // everyone down the far side, then the Mech waits at the edge of the block (the shared screen)
  g.walk(H, 71.4);
  g.walk(P, 70.45);
  g.walk(Q, 69.5);
  g.mechTo(F, BLOCK_R - PHYS.robot.w / 2 / T - 0.1);
  // over the trench: honey in and past the pot, pasta in and up onto the pot, Q up there too
  trapWalk(g, H, 81.5);
  g.walk(H, (pot.x - 20) / T);
  g.grab(H);
  go(g, H, 87.5);
  trapWalk(g, P, 81.5);
  g.walk(P, (pot.x - 20) / T);
  g.grab(P);
  go(g, P, (pot.x + pot.w - 20) / T);
  trapWalk(g, Q, 81.5);
  go(g, Q, (pot.x + 20) / T);
  if (w.delivered !== 2) throw new Error('honey and pasta not both in');
  // the Mech brings the melon; then the flour
  g.mechTo(F, 70);
  g.mechTo(F, armAt(pot.x + 4));
  g.mechArm(F);
  g.grab(Q);
  if (!w.recipeDone) throw new Error('recipe not done');
  // onto the plate
  g.walk(H, 97.4);
  g.walk(P, 96.45);
  g.walk(Q, 95.5);
  g.mechTo(F, 91);
  g.waitFor(() => w.phase === 'clear', 60, 'level clear');
}

const ROUTES: [number, (g: Play) => void][] = [[0, noodleBuddies], [1, swingShift], [2, potMech], [3, mechArm], [4, orderChaos], [5, pantryPanic]];

describe('World 3 playthroughs (solo-style: one kaiju at a time)', () => {
  for (const [i, route] of ROUTES) {
    for (const n of COUNTS) {
      it(`${i + 1}. ${lv(i).name} with ${n} kaiju`, () => {
        const g = new Play(lv(i), n);
        try { route(g); } catch (e) {
          const m = (e as Error).message;
          throw new Error(m.includes('recent steps') ? m : `${m} — ${g.where()}${g.recent()}`);
        }
      });
    }
  }
});
