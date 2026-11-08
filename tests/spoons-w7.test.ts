// The golden spoons of World 7 can really be reached (2 kaiju, solo-style).
import { describe, expect, it } from 'vitest';
import { T } from '../src/sim/constants';
import { BAKERY_LEVELS } from '../src/sim/levels-bakery';
import { Play } from './play';

const sx = (g: Play) => (g.w.spoon!.x + g.w.spoon!.w / 2) / T;
function reach(g: Play, k: number): void {
  const x = sx(g) * T, p = g.P(k);
  g.drive(k, f => ({ mx: Math.abs(p.x + p.w / 2 - x) < 4 ? 0 : Math.sign(x - (p.x + p.w / 2)), jump: f % 50 < 34 }), () => g.w.spoonGot, 400, 'reach the spoon');
}
function wallClimb(g: Play, k: number, topRow: number, pastX: number, aimX?: number): void {
  const p = g.P(k);
  g.drive(k, f => ({ mx: p.y + p.h <= (topRow + 0.5) * T && aimX !== undefined ? Math.sign(aimX * T - (p.x + p.w / 2)) : 1, jump: f % 16 < 8 }),
    () => p.grounded && p.y + p.h <= topRow * T + 1 && p.x + p.w / 2 > pastX * T, 1500, 'wall-climb');
}
/** Both kaiju onto a dough pad together; wait for it to rise; B hops on A's head and jumps. */
function doughBoost(g: Play, d: number): void {
  const [A, B] = g.order(), dough = g.w.lifts[d], x0 = dough.x / T;
  g.walkQ(A, x0 - 0.8); g.walkQ(B, x0 - 1.7);
  g.push(B, x0 + 2, () => g.cx(A) >= (x0 + 1.8) * T);
  g.waitFor(() => Math.abs(dough.y - dough.by) < 1, 1200, 'risen');
  g.onHead(B, A);
  reach(g, B);
}

const f0 = (g: Play, k: number) => g.P(k).grounded && g.P(k).y + g.P(k).h > 12 * T;

describe('World 7 golden spoons', () => {
  it('Sprinkle Climb: a leap off the top of the sprinkle wall', () => {
    const g = new Play(BAKERY_LEVELS[0], 2);
    const [A] = g.order();
    g.walk(A, 13.3);
    wallClimb(g, A, 9, 14);
    g.walk(A, 14.5);
    g.waitFor(() => g.P(A).grounded, 120, 'landed');
    g.drive(A, f => ({ mx: f < 4 ? 0 : -1, jump: f > 0 && f < 40 }), () => g.w.spoonGot || (f0(g, A)), 80, 'leap left');
    expect(g.w.spoonGot).toBe(true);
    expect(g.w.spoonGot).toBe(true);
  });
  it('Rising Dough: risen dough and a friend\'s head', () => {
    const g = new Play(BAKERY_LEVELS[1], 2);
    doughBoost(g, 0);
    expect(g.w.spoonGot).toBe(true);
  });
  it('Oven Timer: a quick boost inside the oven', () => {
    const g = new Play(BAKERY_LEVELS[2], 2);
    const [A, B] = g.order();
    g.walk(A, 22); g.walk(B, 15.5); g.grab(B);
    g.walk(A, 30.5); g.walk(B, 29.4);
    g.onHead(B, A);
    reach(g, B);
    expect(g.w.spoonGot).toBe(true);
  });
  it('Sprinkle Shaft: a leap from the top of the pillar', () => {
    const g = new Play(BAKERY_LEVELS[3], 2);
    const [A] = g.order();
    g.walk(A, 13.6);
    wallClimb(g, A, 3, 15, 15.5);
    reach(g, A);
    expect(g.w.spoonGot).toBe(true);
  });
  it('Proofing Drawer: risen dough and a friend\'s head', () => {
    const g = new Play(BAKERY_LEVELS[4], 2);
    doughBoost(g, 0);
    expect(g.w.spoonGot).toBe(true);
  });
});
