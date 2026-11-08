// Whole-level playthroughs, World 7 (The Bakery), played solo-style (one kaiju at a time).
import { describe, it } from 'vitest';
import { T } from '../src/sim/constants';
import { BAKERY_LEVELS } from '../src/sim/levels-bakery';
import { Play } from './play';

const lv = (i: number) => BAKERY_LEVELS[i];
const COUNTS = [2, 6];

/** Wall-jump up sprinkles (hold towards them, tap jump) until standing on row `topRow` past x `pastX`. */
function wallClimb(g: Play, k: number, dir: number, topRow: number, pastX: number, aimX?: number): void {
  const p = g.P(k);
  g.drive(k, f => {
    const high = p.y + p.h <= (topRow + 0.5) * T;
    const mx = high && aimX !== undefined ? Math.sign(aimX * T - (p.x + p.w / 2)) : dir;
    return { mx, jump: f % 16 < 8 };
  }, () => p.grounded && p.y + p.h <= topRow * T + 1 && (dir > 0 ? p.x + p.w / 2 > pastX * T : p.x + p.w / 2 < pastX * T), 1500, `wall-climb to row ${topRow}`);
  g.tick(3);
}

/** Ride a dough pad up: the batch walks on (front first), waits for it to rise, then walks off onto the ledge. */
function doughUp(g: Play, d: number, batch: number[], spots: number[]): void {
  const dough = g.w.lifts[d];
  g.waitFor(() => Math.abs(dough.y - dough.ay) < 1, 900, 'dough down');
  const x0 = dough.x / T, w = dough.w / T;
  // line up beside it, then the back one pushes the whole batch on together (it rises after a moment)
  batch.forEach((k, i) => g.walkQ(k, x0 - 0.8 - i * 0.9));
  const front = batch[0], back = batch[batch.length - 1];
  if (batch.length > 1) g.push(back, x0 + w, () => g.cx(front) >= (x0 + w - 0.5) * T);
  else g.walk(front, x0 + w - 0.5);
  g.waitFor(() => Math.abs(dough.y - dough.by) < 1, 1200, 'dough risen');
  batch.forEach((k, i) => g.walk(k, spots[i]));
}

/** Drop the carried ingredient in the pot, then step back (more ingredients are still behind us). */
function deliverBack(g: Play, k: number): void {
  const pot = g.w.pots[0];
  const before = g.w.delivered;
  g.walk(k, (pot.x - 20) / T);
  g.grab(k);
  if (g.w.delivered !== before + 1) throw new Error(`P${k} failed to deliver`);
  g.walk(k, pot.x / T - 2.2);
}

/** The free-handed kaiju closest to an ingredient (so nobody walks through the others to get it). */
function nearestFree(g: Play, kind: string): number {
  const it = g.w.items.find(i => i.kind === kind && !i.delivered && i.carrier < 0)!;
  const free = g.w.players.filter(p => p.carry < 0);
  free.sort((a, b) => Math.abs(a.x - it.x) - Math.abs(b.x - it.x));
  return free[0].idx;
}

/** Everyone (front first) lines up at x - i*gap, never walking backwards. */
function line(g: Play, x: number, gap = 0.9): void {
  g.order().forEach((k, i) => { const want = x - i * gap; if (g.cx(k) / T < want - 0.2) g.walkQ(k, want); });
}

function sprinkleClimb(g: Play): void {
  g.spread();
  const first = g.order()[0];
  g.order().forEach((k, i) => {
    g.walk(k, 13.3);
    wallClimb(g, k, 1, 9, 15.2);
    if (k === first) g.pick(k, 'flour');
    g.walk(k, 22 - i * 0.9);
  });
  g.deliver(g.carrier('flour'));
  g.finish();
}

function risingDough(g: Play): void {
  g.spread();
  g.pick(g.order()[0], 'egg');
  const team = g.order();
  let spot = 25;
  for (let b = 0; b < team.length; b += 3) {
    const batch = team.slice(b, b + 3);
    doughUp(g, 0, batch, batch.map(() => spot--));
  }
  const free = g.order().find(k => g.P(k).carry < 0)!;
  g.pick(free, 'flour');
  g.deliver(g.carrier('egg'));
  g.deliver(g.carrier('flour'));
  g.finish();
}

function ovenTimer(g: Play): void {
  const w = g.w;
  g.spread();
  g.pick(g.order()[0], 'butter');
  line(g, 22.5);
  const back = g.order()[g.n - 1];
  g.walk(back, 15.5);
  g.grab(back);
  g.push(back, 41, () => w.players.every(p => p.x > 38.2 * T));
  g.gather(44);
  g.deliver(g.carrier('butter'));
  const free = g.order().find(k => g.P(k).carry < 0)!;
  g.pick(free, 'berry');
  g.deliver(free);
  g.finish();
}

function sprinkleShaft(g: Play): void {
  g.spread();
  line(g, 13.6);
  const team = g.order();
  team.forEach((k, i) => {
    if (i === 0) {
      wallClimb(g, k, 1, 3, 15, 15.5); // onto the pillar top for the honey
      g.grab(k);
      if (g.P(k).carry < 0) throw new Error('no honey');
    }
    wallClimb(g, k, 1, 6, 21.3); // over the pillar, down the shaft, up the shelf face
    g.walk(k, 28 - i * 0.9);
  });
  const free = g.order().find(k => g.P(k).carry < 0)!;
  g.pick(free, 'flour');
  g.deliver(g.carrier('honey'));
  g.deliver(g.carrier('flour'));
  g.finish();
}

function proofingDrawer(g: Play): void {
  const w = g.w;
  g.spread();
  g.pick(g.order()[0], 'milk');
  const team = g.order();
  let spot = 21.5;
  for (let b = 0; b < team.length; b += 3) {
    const batch = team.slice(b, b + 3);
    doughUp(g, 0, batch, batch.map(() => (spot -= 0.9) + 0.9));
  }
  g.pick(g.order().find(k => g.P(k).carry < 0)!, 'egg');
  // everyone but the winder down to the door; the winder winds and pushes the line through
  const up = g.order();
  const winder = up[up.length - 1];
  up.slice(0, -1).forEach((k, i) => { g.walk(k, 23.2); g.dropOff(k, 1); g.walkQ(k, 29.4 - i * 0.9); });
  g.walk(winder, 21.5);
  g.grab(winder);
  g.walk(winder, 22.6);
  g.dropOff(winder, 1);
  g.push(winder, 34, () => w.players.every(p => p.x > 31.2 * T));
  const free = g.order().find(k => g.P(k).carry < 0);
  if (free !== undefined) g.pick(free, 'butter');
  line(g, 39.4);
  const t2 = g.order();
  let s2 = 49;
  for (let b = 0; b < t2.length; b += 3) {
    const batch = t2.slice(b, b + 3);
    doughUp(g, 1, batch, batch.map(() => (s2 -= 0.9) + 0.9));
  }
  g.deliver(g.carrier('milk'));
  g.deliver(g.carrier('egg'));
  if (free === undefined) {
    // not enough hands (2 kaiju): back down for the butter, and up the dough again
    const k = g.order()[g.n - 1], other = g.order()[0];
    g.walk(other, 46);
    g.walk(k, 43.3); g.dropOff(k, -1);
    g.pick(k, 'butter');
    doughUp(g, 1, [k], [47]);
  }
  g.deliver(g.carrier('butter'));
  g.finish();
}

function weddingCake(g: Play): void {
  const w = g.w;
  g.spread();
  g.pick(g.order()[0], 'flour');
  // tier 1: sprinkle face
  line(g, 12.4);
  g.order().forEach((k, i) => { wallClimb(g, k, 1, 12, 14.2); g.walk(k, 22.4 - i * 0.9); });
  // tier 2: dough
  line(g, 22.4);
  const team = g.order();
  let spot = 34;
  for (let b = 0; b < team.length; b += 3) {
    const batch = team.slice(b, b + 3);
    doughUp(g, 0, batch, batch.map(() => (spot -= 0.9) + 0.9));
  }
  // tier 3: sprinkle face again
  g.order().forEach((k, i) => { wallClimb(g, k, 1, 4, 36.3); g.walk(k, 42 - i * 0.9); });
  g.pick(g.order().find(k => g.P(k).carry < 0)!, 'berry');
  // off the end of the cake, line up at the oven door; the last one winds the timer and pushes the line through
  const down = g.order();
  const winder = down[down.length - 1];
  down.slice(0, -1).forEach((k, i) => { g.walk(k, 53.2); g.dropOff(k, 1); g.walkQ(k, 61.4 - i * 0.9); });
  g.walk(winder, 53.2);
  g.dropOff(winder, 1);
  g.walk(winder, 56.5);
  g.grab(winder);
  g.push(winder, 64, () => w.players.every(p => p.x > 63.2 * T));
  deliverBack(g, g.carrier('flour'));
  const e = nearestFree(g, 'egg');
  g.pick(e, 'egg');
  deliverBack(g, e);
  deliverBack(g, g.carrier('berry'));
  const h = nearestFree(g, 'honey');
  g.pick(h, 'honey');
  g.deliver(h);
  g.finish();
}

const ROUTES: [number, (g: Play) => void][] = [[0, sprinkleClimb], [1, risingDough], [2, ovenTimer], [3, sprinkleShaft], [4, proofingDrawer], [5, weddingCake]];

describe('World 7 playthroughs (solo-style: one kaiju at a time)', () => {
  for (const [i, route] of ROUTES) {
    for (const n of COUNTS) {
      it(`${i + 1}. ${lv(i).name} with ${n} kaiju`, () => route(new Play(lv(i), n)));
    }
  }
});
