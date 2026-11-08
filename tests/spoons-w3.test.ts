// The golden spoons of World 3 (The Pantry) can really be reached (with just 2 kaiju, solo-style).
import { describe, expect, it } from 'vitest';
import { PHYS, T } from '../src/sim/constants';
import { TILE_TRAP } from '../src/sim/level';
import { PANTRY_LEVELS } from '../src/sim/levels-pantry';
import { toward, walker } from './helpers';
import { Play } from './play';

const lv = (i: number) => PANTRY_LEVELS[i];
const spoonX = (g: Play) => (g.w.spoon!.x + g.w.spoon!.w / 2) / T;
type W = { tileAt(c: number, r: number): number };

/** k jumps (holding) toward the spoon's column until it's found. */
function reach(g: Play, k: number, max = 400): void {
  const x = spoonX(g) * T, p = g.P(k);
  g.drive(k, f => ({ mx: Math.abs(p.x + p.w / 2 - x) < 4 ? 0 : Math.sign(x - (p.x + p.w / 2)), jump: f % 50 < 34 }), () => g.w.spoonGot, max, 'reach the spoon');
}

// ------------------------------------------------------------------ helpers (as in playthrough-w3)
/** While a "reverse" ticket is on, a player presses the opposite way: so does the bot. */
function minded(g: Play): Play {
  const drive = g.drive.bind(g);
  g.drive = (k, inp, cond, max, what) => drive(k, f => {
    const i = inp(f);
    return g.w.rule === 'reverse' && i.mx ? { ...i, mx: -i.mx } : i;
  }, cond, max, what);
  return g;
}
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
/** Walk to x tiles, hopping over mousetraps. */
function trapWalk(g: Play, k: number, xT: number, max = 1500): void {
  const w = g.w, p = w.players[k], x = xT * T;
  const tile = (w as unknown as W).tileAt.bind(w);
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
      if ([p.x - 3, p.x + p.w / 2, p.x + p.w + 3].some(px => below(px) === TILE_TRAP)) inp.mx = travel;
      else { inp.mx = Math.abs(p.x + p.w / 2 - x) < 4 ? 0 : dir; travel = 0; }
    }
    return inp;
  }, () => p.grounded && Math.abs(p.x + p.w / 2 - x) < 10, max, `trap-walk to ${xT}`);
  g.tick(3);
}
/** Both climb into the Pot Mech (front first); returns [first in, last in (who drives)]. */
function bothAboard(g: Play): [number, number] {
  const ks = g.order();
  for (const k of ks) { g.grab(k); if (g.P(k).inRobot < 0) g.board(k); }
  g.tick(160);
  return [ks[0], ks[1]];
}
/** Through the honey pit and over the pillars of Noodle Buddies / Pantry Panic (as noodleDuo). */
function honeyPit(g: Play, A: number, B: number): void {
  g.walk(A, 9.3);
  g.walkQ(B, 8.4);
  g.walk(A, 10.5);
  g.pick(A, 'honey');
  g.step2(A, 13.4);
  g.walk(B, 12.3);
  g.climb(A, B, 13, 15);
  g.walk(A, 18);
  g.waitFor(() => g.P(B).grounded, 120, 'B up');
}

describe('World 3 golden spoons', () => {
  it('Noodle Buddies: up on the pot, off a friend\'s head', () => {
    const g = new Play(lv(0), 2);
    const [A, B] = g.order();
    honeyPit(g, A, B);
    g.step2(A, 23.6);
    g.step2(B, 22.7);
    for (const t of [27, 31, 35, 39, 44]) { hop(g, A, t + 0.45); hop(g, B, t - 0.45); }
    const pot = g.w.pots[0];
    g.jumpUp(A, (pot.x + pot.w / 2) / T, pot.y / T);
    g.onHead(B, A);
    reach(g, B);
    expect(g.w.spoonGot).toBe(true);
  });

  it('Swing Shift: leap over the shaft off a friend\'s head; the noodle catches you', () => {
    const g = new Play(lv(1), 2);
    const [A, B] = g.order();
    at(g, A, 11.4);
    at(g, B, 10.4);
    g.onHead(B, A);
    reach(g, B);
    expect(g.w.spoonGot).toBe(true);
    const b = g.P(B);
    g.waitFor(() => b.vy >= 0 && b.y > 10 * T, 200, 'dangling');
    g.tick(40);
    g.drive(A, () => ({ mx: -1 }), () => b.grounded && g.feet(B) <= 10 * T + 1, 600, 'haul up');
  });

  it('Pot Mech: ride on the Mech\'s head while it jumps by the door', () => {
    const g = new Play(lv(2), 2);
    const r = g.w.robots[0];
    const [rider, pilot] = bothAboard(g);
    g.mechTo(pilot, 16); // through the cracker wall
    g.mechTo(pilot, 30.4); // up the step, right by the (shut) door
    g.unboard(rider);
    g.waitFor(() => g.P(rider).grounded && Math.abs(g.feet(rider) - r.y) < 1, 120, 'on the Mech\'s head');
    g.tick(30);
    const t0 = g.frame;
    g.drive(pilot, f => ({ jump: f < 30 }), () => g.w.spoonGot || (g.frame > t0 + 10 && r.grounded), 120, 'Mech jump');
    expect(g.w.spoonGot).toBe(true);
  });

  it('Mech Arm: leap off a friend\'s head from the end of the lever shelf', () => {
    const g = new Play(lv(3), 2);
    const [first, driver] = bothAboard(g);
    g.mechTo(driver, 15);
    // both hop out onto the Mech's head and up onto the lever shelf
    g.unboard(driver);
    g.tick(30);
    g.jumpUp(driver, 18.4, 12);
    g.unboard(first);
    g.tick(30);
    g.jumpUp(first, 17.2, 12);
    at(g, driver, 18.75); // right at the end of the shelf
    g.onHead(first, driver);
    reach(g, first);
    expect(g.w.spoonGot).toBe(true);
  });

  it('Order Chaos: a leap off the end of the flour shelf, in the dark', () => {
    const g = minded(new Play(lv(4), 2));
    g.spread();
    g.gather(23.2);
    for (const [i, k] of g.order().entries()) trapWalk(g, k, 42 - i * 0.9);
    const [X, Y] = g.order();
    g.walk(X, 44.6);
    g.walk(Y, 43.6);
    g.climb(Y, X, 13, 46.3);
    if (g.w.rule === 'lowgrav') throw new Error('still moon gravity');
    reach(g, Y);
    expect(g.w.spoonGot).toBe(true);
  });

  it('Pantry Panic: leap off the Mech\'s head at the left end of the block', () => {
    const g = new Play(lv(5), 2);
    const w = g.w, r = w.robots[0];
    const [B, A] = w.players.map(p => p.idx);
    honeyPit(g, A, B);
    g.step2(A, 21.55);
    g.step2(B, 20.65);
    for (const t of [25, 29, 33]) { hop(g, A, t + 0.45); hop(g, B, t - 0.45); }
    at(g, A, 34.6);
    expect(w.tetherLen).toBe(0);
    // B drives the Mech to the cracker wall; B hops out and is the step A climbs onto the Mech's head by
    g.walk(B, 39.7);
    g.board(B);
    g.mechTo(B, 51.4);
    g.walk(A, 48.5);
    g.unboard(B);
    g.tick(20);
    g.dropOff(B, -1);
    at(g, B, (r.x - 18) / T);
    g.climb(A, B, r.y / T, (r.x + 70) / T);
    // B climbs back in and drives up onto the block (A riding), then to its left end
    g.board(B);
    g.mechTo(B, 58 + PHYS.robot.w / 2 / T - 0.3);
    g.waitFor(() => w.rule !== 'lowgrav', 1200, 'moon gravity to wear off');
    g.mechTo(B, 61);
    g.mechTo(B, 58 + PHYS.robot.w / 2 / T + 0.05);
    at(g, A, (r.x + 20) / T);
    reach(g, A);
    expect(g.w.spoonGot).toBe(true);
  });
});
