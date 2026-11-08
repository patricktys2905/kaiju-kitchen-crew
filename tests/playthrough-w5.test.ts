// Whole-level playthroughs, World 5 (The Sink), played solo-style (one kaiju at a time).
import { describe, it } from 'vitest';
import { T } from '../src/sim/constants';
import { SINK_LEVELS } from '../src/sim/levels-sink';
import { Play } from './play';

const lv = (i: number) => SINK_LEVELS[i];
const COUNTS = [2, 6];

/** Swim (or walk) kaiju k to x tiles at the surface; queueing behind a floating friend also counts. */
function swimTo(g: Play, k: number, xT: number, max = 1200): void {
  const p = g.P(k), x = xT * T;
  let still = 0, last = p.x;
  g.drive(k, () => {
    const d = x - g.cx(k);
    return { mx: Math.abs(d) < 5 ? 0 : Math.sign(d) * (Math.abs(d) < 14 ? 0.3 : 1) };
  }, () => {
    still = Math.abs(p.x - last) < 0.2 ? still + 1 : 0;
    last = p.x;
    return Math.abs(g.cx(k) - x) < 8 || still > 60;
  }, max, `swim to ${xT}`);
  g.tick(3);
}

/** Floating kaiju k grabs the ingredient of this kind (swimming over to it). */
function pickAfloat(g: Play, k: number, kind: string): void {
  const it = g.w.items.find(i => i.kind === kind && !i.delivered && i.carrier < 0);
  if (!it) throw new Error(`no ${kind} lying around`);
  const p = g.P(k);
  // it bobs about: grab when it is within reach (reach = the kaiju's box + 10 px)
  const inReach = () => it.x + 26 < p.x + p.w + 10 && it.x - 2 > p.x - 10 && it.y + 22 > p.y - 10 && it.y + 2 < p.y + p.h + 10;
  for (let tries = 0; tries < 20 && p.carry < 0; tries++) {
    g.drive(k, () => {
      const d = it.x + 12 - g.cx(k);
      return { mx: Math.abs(d) < 5 ? 0 : Math.sign(d) * (Math.abs(d) < 14 ? 0.3 : 1) };
    }, () => inReach() || p.carry >= 0, 900, `swim to the ${kind}`);
    if (p.carry >= 0) break; // caught it as it bobbed into us
    const a: { grab: boolean }[] = []; a[k] = { grab: true };
    g.tick(1, () => a);
    g.tick(1);
  }
  g.tick(2);
  if (g.w.items[g.P(k).carry]?.kind !== kind) throw new Error(`P${k} failed to pick up ${kind} — ` + g.where() + ` item ${it.x / T},${it.y / T} p ${g.P(k).x / T},${g.P(k).y / T} carry ${g.P(k).carry}`);
}

/** Everyone, front first, in hops (never off the shared screen), to slots behind xT. */
function swimGather(g: Play, xT: number, gap = 1, who?: number[]): void {
  for (let hop = 0; hop < 12; hop++) {
    const ord = g.order().filter(k => !who || who.includes(k));
    if (ord.every((k, i) => Math.abs(g.cx(k) - (xT - i * gap) * T) < 12)) return;
    let moved = false;
    ord.forEach((k, i) => {
      const lo = Math.min(...ord.filter(j => j !== k).map(j => g.cx(j) / T));
      const want = xT - i * gap, here = g.cx(k) / T;
      const goal = Math.min(want, lo + 20);
      if (Math.sign(goal - here) !== Math.sign(want - here) || Math.abs(here - goal) < 0.3) return;
      swimTo(g, k, goal);
      moved = true;
    });
    if (!moved) return;
  }
}

function bathTime(g: Play): void {
  const w = g.w;
  const puller = g.order().find(k => !g.onSomeone(k))!;
  g.pull(puller);
  g.waitFor(() => Math.abs(w.waters[0].level - 7 * T) < 1, 900, 'sink filled');
  // the front one swims out and grabs the floating apple, then everyone floats over by the high ledge
  const A = g.order()[0];
  pickAfloat(g, A, 'apple');
  swimGather(g, 29.5);
  // front first, hop up onto the high ledge and walk on
  g.order().forEach((k, i) => {
    g.jumpUp(k, 32.5, 6);
    g.walk(k, 38.6 - i * 0.9);
  });
  g.deliver(A);
  g.finish();
}

/** Kaiju k stands on the drain at bx tiles, rides a soap bubble up until its feet are near row `row`,
 *  then hops off sideways (dir) onto the ledge there, landing past x tiles `land`. */
function rideBubble(g: Play, k: number, bx: number, row: number, dir: 1 | -1, land: number): void {
  const p = g.P(k);
  g.step2(k, bx);
  g.drive(k, () => ({ mx: Math.abs(g.cx(k) - bx * T) < 4 ? 0 : Math.sign(bx * T - g.cx(k)) * 0.3 }), () => g.feet(k) < 15.5 * T, 600, 'lifted by a bubble');
  g.drive(k, () => ({}), () => g.feet(k) < row * T - 6, 600, 'ride the bubble up');
  // just above the ledge: walk off the bubble onto it (no jump, so we don't sail into whoever is there)
  g.drive(k, () => ({ mx: dir * 0.6 }), () => p.grounded && g.feet(k) <= row * T + 1 && (g.cx(k) - land * T) * dir > 0, 200, `hop off the bubble onto row ${row}`);
  g.tick(3);
}

function bubbleBath(g: Play): void {
  const A = g.order().find(k => !g.onSomeone(k))!;
  // grapes: ride the first bubble up beside the hanging shelf
  rideBubble(g, A, 8.5, 6, 1, 10.5);
  g.pick(A, 'grapes');
  g.walk(A, 17); // off the shelf, down to the floor
  g.gather(24.4);
  // one at a time up the second bubble onto the high ledge; the first up (free-handed) takes the pear
  g.order().forEach((k, i) => {
    rideBubble(g, k, 26.5, 6, 1, 28.5);
    if (g.P(k).carry < 0 && g.w.items.some(it => it.kind === 'pear' && it.carrier < 0)) g.pick(k, 'pear');
    g.walk(k, 40.5 - i * 0.9);
  });
  g.deliver(g.carrier('grapes'));
  g.deliver(g.carrier('pear'));
  g.finish();
}

/** Wait until a timed jet has just switched off (a full off-window ahead). */
function jetJustOff(g: Play, j: number): void {
  const jet = g.w.jets[j];
  g.waitFor(() => jet.state === 'hot', 400, `jet ${j} on`);
  g.waitFor(() => jet.state !== 'hot', 400, `jet ${j} off`);
}

function tapDance(g: Play): void {
  const w = g.w;
  g.spread();
  // everyone waits left of the first jet (it blows leftwards, away from the pit)
  g.gather(9.4);
  // a safe strip between the two jets (x 20.45 – 23.55): 4 fit on the floor, the rest ride on heads
  const slots = [23.45, 22.58, 21.71, 20.84];
  const team = g.order();
  const base: number[] = [];
  team.forEach((k, i) => {
    g.walkQ(k, 9.4); // right up to the jet first: the off-window is short
    jetJustOff(g, 0);
    if (i < slots.length) { g.walk(k, slots[i]); base.push(k); return; }
    g.walk(k, 17); // over the pit while the tap is off...
    g.onHead(k, base[i - slots.length]); // ...then up onto a front friend's head, out of the jet
  });
  // the always-on jet blows each across the big gap; riders go first (off their friend's head)
  const across = [...team.slice(slots.length), ...team.slice(0, slots.length)];
  across.forEach((k, i) => {
    if (i === 0) {
      g.walk(k, 38.5);
      g.pick(k, 'carrot');
    }
    g.walk(k, 43.2 - i * 0.9);
  });
  // carrot first (the recipe's order): across the pool to the pot
  const C = g.carrier('carrot');
  swimTo(g, C, 55.5);
  g.deliver(C);
  // then the front free-handed one still before the pool swims for the floating apple
  const X = g.order().find(k => w.players[k].carry < 0 && g.cx(k) < 44 * T)!;
  pickAfloat(g, X, 'apple');
  swimTo(g, X, 55.5);
  g.deliver(X);
  g.finish();
}

/** Floating beside a hanging shelf: swim strokes straight up, and only steer over once the feet are above row `row`. */
function upOntoShelf(g: Play, k: number, row: number, dir: 1 | -1, holdX: number, max = 600): void {
  const p = g.P(k);
  const hold = () => { const d = holdX * T - g.cx(k); return Math.abs(d) < 3 ? 0 : Math.sign(d) * 0.3; };
  g.drive(k, f => ({ mx: g.feet(k) < row * T ? dir : hold(), jump: f % 45 < 30 }), () => p.grounded && g.feet(k) <= row * T + 1, max, `up onto the shelf at row ${row}`);
  g.tick(3);
}

function drainPlan(g: Play): void {
  const w = g.w;
  const puller = [...w.players].filter(p => !g.onSomeone(p.idx)).sort((a, b) => Math.abs(a.x - 3 * T) - Math.abs(b.x - 3 * T))[0].idx;
  g.pull(puller, 0);
  g.waitFor(() => Math.abs(w.waters[0].level - 6 * T) < 1, 900, 'sink A filled');
  // grapes: float up beside the high shelf
  const G = g.order().find(k => !g.onSomeone(k))!;
  swimTo(g, G, 11.3);
  upOntoShelf(g, G, 4, 1, 11);
  g.pick(G, 'grapes');
  swimTo(g, G, 18); // back down into the water
  swimTo(g, G, 21.9); // out onto the wall between the sinks
  // the others float over too (sink A, by the wall)
  g.order().filter(k => k !== G).forEach((k, i) => swimTo(g, k, 20.4 - i));
  // G floats across sink B, climbs the block and pulls B's plug
  swimTo(g, G, 29.3);
  g.jumpUp(G, 31, 8);
  g.pull(G, 1);
  g.waitFor(() => Math.abs(w.waters[1].level - 16 * T) < 1, 900, 'sink B drained');
  // the front free-handed one goes down into sink B and through the tunnel for the pear
  const P = g.order().find(k => w.players[k].carry < 0 && g.cx(k) < 21 * T)!;
  g.pick(P, 'pear');
  g.gather(48.5);
  g.deliver(g.carrier('grapes'));
  g.deliver(g.carrier('pear'));
  g.finish();
}

/** Run right and jump a pit from its very edge (the pit starts at column edgeT), landing past landT. */
function leap(g: Play, k: number, edgeT: number, landT: number): void {
  const p = g.P(k);
  let took = false;
  g.drive(k, () => {
    if (p.grounded && p.x > edgeT * T - 26) took = true;
    return { mx: 1, jump: took && (p.grounded || p.vy < 0) };
  }, () => took && p.grounded && p.x > landT * T - 17 - 1 && g.feet(k) >= 15.9 * T, 400, `leap the pit at ${edgeT}`);
  g.tick(3);
}

/** Kaiju ks (front first) queue up to their slots, as far as the shared screen allows. */
function advance(g: Play, ks: number[], slot: (j: number) => number, reach = 20): void {
  ks.forEach((k, j) => {
    const lo = Math.min(...g.w.players.filter(p => p.idx !== k).map(p => g.cx(p.idx) / T));
    const goal = Math.min(slot(j), lo + reach);
    if (goal > g.cx(k) / T + 0.3) g.walkQ(k, goal);
  });
}

function sudsExpress(g: Play): void {
  const w = g.w;
  // the 'reverse' ticket prints at x 5: a solo player just waits it out
  const F = g.order().find(k => !g.onSomeone(k))!;
  g.drive(F, () => ({ mx: 1 }), () => w.rule === 'reverse', 300, 'print the reverse ticket');
  g.waitFor(() => w.rule === null, 900, 'reverse ticket over');
  g.spread();
  g.gather(9.4); // left of the jet (it blows leftwards, away from the pit)
  // one at a time: over the pit while the tap is off, then up a soap bubble onto the big block
  const team = g.order(), up: number[] = [];
  const slot = (j: number) => 29 - j * 0.9; // on the block, the front one right by the apple
  team.forEach((k, i) => {
    advance(g, team.slice(i), j => 9.4 - j * 0.9); // the ones still waiting shuffle up to the jet
    jetJustOff(g, 0);
    leap(g, k, 12, 16.6); // the 4-tile pit: take off right at the edge
    g.walk(k, 20.2);
    rideBubble(g, k, 21.5, 7, 1, 23.6);
    up.push(k);
    advance(g, up, slot); // (the back of the team holds the shared camera back: move up as it allows)
  });
  g.pick(g.order()[0], 'apple');
  // down off the block (stepping off gently, so nobody lands on a friend), front first, lining up before the pool
  g.order().forEach((k, i) => {
    g.walk(k, 32.5);
    g.dropOff(k, 1);
    g.walk(k, 38.8 - i * 0.95);
  });
  // across the pool: the apple first, then the next one fishes out the floating carrot, then the rest float up behind
  const A = g.carrier('apple');
  const lo = () => Math.min(...w.players.filter(p => p.idx !== A).map(p => g.cx(p.idx) / T));
  swimTo(g, A, Math.min(57.5, lo() + 20));
  const C = g.order().find(k => w.players[k].carry < 0 && g.cx(k) < 40 * T)!;
  pickAfloat(g, C, 'carrot');
  swimTo(g, C, Math.min(56.5, lo() + 20));
  swimGather(g, 48, 1, g.order().filter(k => k !== A && k !== C));
  g.deliver(A);
  g.deliver(C);
  g.finish();
}

function washingUp(g: Play): void {
  const w = g.w;
  const puller = [...w.players].filter(p => !g.onSomeone(p.idx)).sort((a, b) => Math.abs(a.x - 4 * T) - Math.abs(b.x - 4 * T))[0].idx;
  g.pull(puller, 0);
  g.waitFor(() => Math.abs(w.waters[0].level - 6 * T) < 1, 900, 'sink filled');
  // grapes: float up beside the high shelf
  const G = g.order().find(k => !g.onSomeone(k))!;
  swimTo(g, G, 13);
  upOntoShelf(g, G, 4, 1, 13);
  g.pick(G, 'grapes');
  swimTo(g, G, 20); // back down into the water
  // everyone floats over to the first block, then (front first) hops up onto it
  swimGather(g, 24.3);
  g.order().forEach((k, i) => {
    g.jumpUp(k, 26, 6);
    g.walk(k, 32.1 - i * 0.9);
  });
  // down into the gap, up a soap bubble onto the second block; the first free-handed one takes the pear
  const blk2: number[] = [];
  g.order().forEach(k => {
    g.walk(k, 32.5);
    g.dropOff(k, 1);
    rideBubble(g, k, 35.5, 6, 1, 37.6);
    if (w.players[k].carry < 0 && w.items.some(it => it.kind === 'pear' && it.carrier < 0)) g.pick(k, 'pear');
    blk2.push(k);
    advance(g, blk2, j => 44.4 - j * 0.9);
  });
  // the jet blows each across the pits (step down gently first, out of the jet, then walk into it)
  const team = g.order(), across: number[] = [];
  team.forEach((k, i) => {
    advance(g, team.slice(i), j => 44.4 - j * 0.9);
    g.walk(k, 44.6);
    g.dropOff(k, 1);
    const lo = Math.min(...w.players.filter(p => p.idx !== k).map(p => g.cx(p.idx) / T));
    const behind = Math.min(...across.map(j => g.cx(j) / T - 0.9), 99); // don't overtake the ones already across
    g.walk(k, Math.min(68 - i * 0.9, lo + 22, behind));
    across.push(k);
    advance(g, across, j => 68 - j * 0.9, 22);
  });
  g.gather(69);
  // free hands in the line: the front one takes the apple (just ahead), the back one the carrot (just behind)
  const has = (kind: string) => w.items.some(it => it.kind === kind && it.carrier >= 0);
  const free = () => g.order().filter(k => w.players[k].carry < 0);
  if (free().length) g.pick(free()[0], 'apple');
  if (free().length) g.pick(free()[free().length - 1], 'carrot');
  g.deliver(G);
  if (!has('apple')) { g.walk(G, 71.5); g.pick(G, 'apple'); } // nobody had a free hand: G goes back for it
  g.deliver(g.carrier('apple'));
  if (!has('carrot')) {
    const Cr = free()[free().length - 1];
    if (g.cx(Cr) > 64 * T) g.walk(Cr, 63.6); // back over the line
    g.pick(Cr, 'carrot');
  }
  g.deliver(g.carrier('pear'));
  g.deliver(g.carrier('carrot'));
  g.finish();
}

const ROUTES: [number, (g: Play) => void][] = [[0, bathTime], [1, bubbleBath], [2, tapDance], [3, drainPlan], [4, sudsExpress], [5, washingUp]];

describe('World 5 playthroughs (solo-style: one kaiju at a time)', () => {
  for (const [i, route] of ROUTES) {
    for (const n of COUNTS) {
      it(`${i + 1}. ${lv(i).name} with ${n} kaiju`, () => route(new Play(lv(i), n)));
    }
  }
});
