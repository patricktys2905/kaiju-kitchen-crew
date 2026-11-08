// Whole-level playthroughs, World 2 (The Fridge), played solo-style (one kaiju at a time).
import { describe, it } from 'vitest';
import { T } from '../src/sim/constants';
import { FRIDGE_LEVELS } from '../src/sim/levels-fridge';
import type { PlayerInput } from '../src/sim/world';
import { Play } from './play';

const lv = (i: number) => FRIDGE_LEVELS[i];
const COUNTS = [2, 6];
type Inp = Partial<PlayerInput>;
const only = (k: number, inp: Inp): Inp[] => { const a: Inp[] = []; a[k] = inp; return a; };

/** Like g.gather, but nobody ever walks backwards (so a kaiju already ahead just waits). */
function advance(g: Play, xT: number, gap = 0.9): void {
  for (let hop = 0; hop < 12; hop++) {
    let moved = false;
    g.order().forEach((k, i) => {
      const lo = Math.min(...g.w.players.filter(p => p.idx !== k).map(p => g.cx(p.idx) / T));
      const goal = Math.min(xT - i * gap, lo + 20);
      if (goal > g.cx(k) / T + 0.3) { g.walkQ(k, goal); moved = true; }
    });
    if (!moved) return;
  }
}

/** Stand still under a floating snack at x tiles and hop up into it. */
function eat(g: Play, k: number, xT: number): void {
  g.step2(k, xT);
  g.tick(45, f => only(k, { jump: f < 20 }));
  g.tick(10);
}

function cookieMonster(g: Play): void {
  const w = g.w;
  if (g.n > 2) g.spread();
  const [A, B] = g.order();
  eat(g, A, 6.5);
  if (!w.players[A].big) throw new Error('A did not grow');
  g.drive(A, () => ({ mx: 1 }), () => w.blocks[0].broken, 300, 'smash the crackers');
  g.walk(A, (18 * T - 26) / T); // against the shelf block: a big stepladder
  g.climb(B, A, 12, 20);
  g.pick(B, 'milk');
  eat(g, A, 15.5); // lemon drop: small again, to fit the mouse hole
  if (w.players[A].big) throw new Error('A did not shrink');
  g.gather(35);
  g.deliver(B);
  g.finish();
}

function heavySnack(g: Play): void {
  const w = g.w, crate = w.crates[0];
  if (g.n > 2) g.spread(); // (with 6, a rider hopping down off a head lands in the cookie and grows BIG)
  let [A, B] = g.order();
  if (w.players[A].big) [A, B] = [B, A]; // A: normal, at the cube; B: BIG, pushes A
  g.walk(A, (crate.x - 18) / T); // A waits at the ×3 cube
  if (!w.players[B].big) eat(g, B, 5.5); // B grows BIG (shoving the sleepers behind a little to the left)
  if (!w.players[B].big) throw new Error('B did not grow');
  g.step2(B, (w.players[A].x - 26) / T);
  g.push(B, 30, () => w.doors[0].open >= 1); // BIG B (×2) pushes A (×1) pushes the cube into the scale pit
  // the strawberry: A climbs BIG B under the shelf
  g.walk(B, 22.5);
  g.climb(A, B, 12, 22.5);
  g.pick(A, 'berry');
  g.gather(33);
  const f = g.order().find(k => w.players[k].carry < 0)!;
  g.pick(f, 'butter');
  g.deliver(f);
  g.deliver(A);
  g.finish();
}

/** Come to a standstill at x tiles on ice (ease off early: you slide). */
function iceTo(g: Play, k: number, xT: number, max = 900): void {
  const p = g.P(k), x = xT * T;
  g.drive(k, () => {
    const want = Math.max(-170, Math.min(170, (x - g.cx(k)) * 2));
    return { mx: want > p.vx + 8 ? 1 : want < p.vx - 8 ? -1 : 0 };
  }, () => p.grounded && Math.abs(g.cx(k) - x) < 8 && Math.abs(p.vx) < 4, max, `ice-stop at ${xT}`);
}

function slipperySlope(g: Play): void {
  if (g.n > 2) g.spread();
  // line up on the ice, well apart (bumping a sleeper on ice sends it sliding)
  g.order().forEach((k, i) => iceTo(g, k, 12.6 - i * 1.2));
  // front first: run and jump the gap at the end of the ice
  g.order().forEach((k, i) => g.walk(k, 27.3 - i * 0.9));
  // front first: BOING up the jelly onto the shelf
  g.order().forEach((k, i) => {
    g.walk(k, 39.4 - i * 0.9);
    if (g.feet(k) > 10 * T + 1) throw new Error(`P${k} did not get up the jelly — ${g.where()}`);
  });
  const [A] = g.order();
  g.pick(A, 'yogurt');
  g.gather(44);
  g.deliver(A);
  g.finish();
}

function deepFreeze(g: Play): void {
  const w = g.w;
  if (g.n > 2) g.spread();
  g.pull(g.order()[0], 0); // freezer ON: the jelly bridge turns to ice
  if (!w.jellies[0].frozen) throw new Error('bridge not frozen');
  g.order().forEach((k, i) => g.walk(k, 23.3 - i * 0.9)); // front first, across the bridge
  // freezer OFF (the jelly bounces again): whoever stands at the lever pulls it, without shoving anyone back onto the bridge
  const near = [...g.order()].sort((a, b) => Math.abs(g.cx(a) - 21.5 * T) - Math.abs(g.cx(b) - 21.5 * T))[0];
  g.grab(near);
  if (w.jellies[1].frozen) throw new Error('jelly still frozen');
  // front first: BOING up onto the shelf (the icicles are only over the bridge)
  g.order().forEach((k, i) => {
    g.walk(k, 35.4 - i * 0.9);
    if (g.feet(k) > 10 * T + 1) throw new Error(`P${k} did not get up the jelly — ${g.where()}`);
  });
  const [A] = g.order().slice(-1); // the last one up stands by the milk
  g.pick(A, 'milk');
  g.gather(44);
  const f = g.order().find(k => w.players[k].carry < 0)!;
  g.pick(f, 'berry');
  g.deliver(A);
  g.deliver(f);
  g.finish();
}

/** Drink the soda at x tiles, then soda-jump onto the ledge whose wall starts at wallT (top row topRow). */
function sodaUp(g: Play, k: number, sodaT: number, wallT: number, topRow: number, pk: number): void {
  const w = g.w, p = g.P(k);
  g.walk(k, sodaT);
  g.waitFor(() => w.pickups[pk].respawn === 0, 400, 'soda back');
  g.tick(40, f => only(k, { jump: f < 15 }));
  g.tick(10);
  if (!p.fizz) throw new Error(`P${k} did not drink the soda — ${g.where()}`);
  g.step2(k, wallT - 0.5);
  g.drive(k, f => ({ mx: 1, jump: f < 30 }), () => p.grounded && g.feet(k) <= topRow * T + 1, 200, 'soda jump');
  g.tick(3);
}

function hotStuff(g: Play): void {
  const w = g.w;
  if (g.n > 2) g.spread(); // (with 6, the front rider starts in the chili: it is already spicy)
  const A = g.order()[0];
  if (w.players[A].spicyT <= 0) eat(g, A, 4.5);
  g.drive(A, () => ({ mx: 1 }), () => w.blocks[0].broken, 300, 'melt the ice wall');
  g.order().forEach((k, i) => g.walkQ(k, 13.5 - i * 0.9)); // queue for the soda
  // A first: up, the second chili melts the upper ice wall, A takes the yogurt
  sodaUp(g, A, 13.5, 16, 11, 1);
  eat(g, A, 23.5);
  g.drive(A, () => ({ mx: 1 }), () => w.blocks[1].broken, 300, 'melt the upper ice wall');
  g.pick(A, 'yogurt');
  g.walk(A, 30);
  // the rest, one at a time (the soda grows back); the first one up takes the butter
  g.order().filter(k => k !== A).forEach((k, i) => {
    sodaUp(g, k, 13.5, 16, 11, 1);
    if (i === 0) g.pick(k, 'butter');
    g.walk(k, 29.1 - i * 0.9);
  });
  g.gather(35);
  g.deliver(g.carrier('butter'));
  g.deliver(A);
  g.finish();
}

function fridgeRaid(g: Play): void {
  const w = g.w, lo = (but: number) => Math.min(...w.players.filter(p => p.idx !== but).map(p => g.cx(p.idx) / T));
  if (g.n > 2) g.spread();
  const A = g.order()[0];
  eat(g, A, 8.5); // A grows BIG...
  if (!w.players[A].big) throw new Error('A did not grow');
  g.drive(A, () => ({ mx: 1 }), () => w.blocks[0].broken, 300, 'smash the crackers'); // ...and smashes the crackers
  const milkX = w.items.find(i => i.kind === 'milk')!.x + 12;
  const M = g.order().filter(k => k !== A).sort((a, b) => Math.abs(g.cx(a) - milkX) - Math.abs(g.cx(b) - milkX))[0];
  g.pick(M, 'milk');
  // line up on the ice, well apart, A in front
  g.order().forEach((k, i) => iceTo(g, k, 21 - i));
  // front first: jump the gap. The first two BOING straight up onto the shelf; the rest wait by the jelly
  const team = g.order();
  team.forEach((k, i) => {
    if (i < 2) g.walk(k, Math.min(38.5 - i * 1.3, lo(k) + 22.5)); // (A is BIG: leave room)
    else g.walk(k, 30.5 - (i - 2) * 0.9);
  });
  g.pick(A, 'butter');
  g.walk(A, 42.8);
  advance(g, 42.8, 1.1); // the rest BOING up onto the shelf
  g.walk(A, 46.5);
  eat(g, A, 46.5); // lemon drop: small enough for the mouse hole
  if (w.players[A].big) throw new Error('A did not shrink');
  g.walk(A, 50.5);
  advance(g, 50.5); // everyone down to the mouse hole
  // A goes through first: the chili melts the ice wall
  eat(g, A, 61.5);
  g.drive(A, () => ({ mx: 1 }), () => w.blocks[1].broken, 300, 'melt the ice wall');
  advance(g, 66);
  advance(g, 79);
  const back = [...g.order()].reverse().slice(0, 2); // the two rearmost fetch the strawberry later
  const yx = w.items.find(i => i.kind === 'yogurt')!.x + 12;
  const spare = g.order().filter(k => w.players[k].carry < 0 && !back.includes(k)).sort((a, b) => Math.abs(g.cx(a) - yx) - Math.abs(g.cx(b) - yx));
  if (spare.length) g.pick(spare[0], 'yogurt'); // someone standing by the yogurt grabs it
  // the strawberry: the two rearmost go back; X grows BIG under the shelf, Y climbs X.
  // With free hands that happens first (nobody has run ahead to the plate yet); with two kaiju, after delivering.
  const [X, Y] = back;
  const early = back.every(k => w.players[k].carry < 0);
  if (!early) { g.deliver(g.carrier('milk')); g.deliver(g.carrier('butter')); }
  g.walk(X, Math.max(68.5, g.cx(Y) / T - 21)); // (two kaiju: the leash keeps X near Y, so in hops)
  g.walk(Y, Math.max(74, g.cx(X) / T + 1.5));
  g.walk(X, 68.5);
  if (!w.players[X].big) eat(g, X, 68.5);
  if (!w.players[X].big) throw new Error('X did not grow');
  g.step2(X, 71);
  g.climb(Y, X, 12, 72.5);
  g.pick(Y, 'berry');
  if (early) { g.deliver(g.carrier('milk')); g.deliver(g.carrier('butter')); }
  g.deliver(Y);
  if (!w.items.some(i => i.kind === 'yogurt' && i.carrier >= 0)) g.pick(X, 'yogurt');
  g.deliver(g.carrier('yogurt'));
  g.finish();
}

const ROUTES: [number, (g: Play) => void][] = [[0, cookieMonster], [1, heavySnack], [2, slipperySlope], [3, deepFreeze], [4, hotStuff], [5, fridgeRaid]];

describe('World 2 playthroughs (solo-style: one kaiju at a time)', () => {
  for (const [i, route] of ROUTES) {
    for (const n of COUNTS) {
      it(`${i + 1}. ${lv(i).name} with ${n} kaiju`, () => route(new Play(lv(i), n)));
    }
  }
});
