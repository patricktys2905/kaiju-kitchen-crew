// The golden spoons of World 1 can really be reached (with just 2 kaiju, solo-style).
import { describe, expect, it } from 'vitest';
import { T } from '../src/sim/constants';
import { COUNTER_LEVELS } from '../src/sim/levels';
import { Play } from './play';

const spoonX = (g: Play) => (g.w.spoon!.x + g.w.spoon!.w / 2) / T;
/** k jumps (holding) at the spoon's column until it's found. */
function reach(g: Play, k: number): void {
  const x = spoonX(g) * T, p = g.P(k);
  g.drive(k, f => ({ mx: Math.abs(p.x + p.w / 2 - x) < 4 ? 0 : Math.sign(x - (p.x + p.w / 2)), jump: f % 50 < 34 }), () => g.w.spoonGot, 400, 'reach the spoon');
}
/** B stands on A's head under the spoon, then jumps for it. */
function boost(g: Play, A: number, B: number, at = spoonX(g)): void {
  g.walk(A, at);
  g.walk(B, at + (g.cx(B) / T < at ? -1 : 1));
  g.onHead(B, A);
  reach(g, B);
}

describe('World 1 golden spoons', () => {
  it('Shelf Help: up in the corner, off a friend\'s head', () => {
    const g = new Play(COUNTER_LEVELS[0], 2);
    const [A, B] = g.order();
    boost(g, B, A, 1.5);
    expect(g.w.spoonGot).toBe(true);
  });
  it('Weigh-In: a leap from the edge of the top shelf', () => {
    const g = new Play(COUNTER_LEVELS[1], 2);
    const [A, B] = g.order();
    g.walk(A, 18); g.walk(B, 17);
    g.climb(B, A, 13, 18.5);
    g.jumpUp(B, 21, 11);
    g.step2(B, 22.4);
    reach(g, B);
    expect(g.w.spoonGot).toBe(true);
  });
  it('Sugar Cubes: from the top of the big cube', () => {
    const g = new Play(COUNTER_LEVELS[2], 2);
    const [, B] = g.order();
    g.walk(B, 20.5);
    g.jumpUp(B, 23, 14);
    reach(g, B);
    expect(g.w.spoonGot).toBe(true);
  });
  it('Pop-Up: launch straight up from the toaster', () => {
    const g = new Play(COUNTER_LEVELS[3], 2);
    const [A, B] = g.order();
    g.walk(A, 16);
    g.pull(B, 0);
    g.drive(A, () => ({}), () => g.w.spoonGot || (g.P(A).grounded && g.P(A).vy === 0 && g.frame > 0 && g.P(A).y < 15 * T - 40), 200, 'pop up');
    expect(g.w.spoonGot).toBe(true);
  });
  it('Hot Hob: jump off the moving spatula over the hot pit', () => {
    const g = new Play(COUNTER_LEVELS[4], 2);
    const [A] = g.order();
    const [bA] = g.w.burners, sh = g.w.lifts[0];
    g.waitFor(() => bA.state === 'hot', 400, 'burner hot');
    g.waitFor(() => bA.state === 'cold', 200, 'burner cool');
    g.walk(A, 23.5);
    g.waitFor(() => Math.abs(sh.x - sh.ax) < 1 && sh.wait > 0.4, 900, 'shuttle at start');
    g.drive(A, f => ({ mx: 1, jump: f < 12 }), () => g.P(A).grounded && Math.abs(g.P(A).y + g.P(A).h - sh.y) < 1, 120, 'onto the shuttle');
    // ride, stay centred, and jump when under the spoon
    const sx = spoonX(g) * T;
    g.drive(A, () => { const p = g.P(A), c = sh.x + sh.w / 2; return { mx: Math.abs(p.x + p.w / 2 - c) > 6 ? Math.sign(c - (p.x + p.w / 2)) * 0.5 : 0, jump: Math.abs(p.x + p.w / 2 - sx) < 14 || p.vy < 0 }; }, () => g.w.spoonGot, 600, 'jump for the spoon');
    expect(g.w.spoonGot).toBe(true);
  });
  it('Sandwich Rush: high over the end of the counter, off a friend\'s head', () => {
    const g = new Play(COUNTER_LEVELS[5], 2);
    const [low, top] = g.order();
    g.walk(low, 12.5);
    g.walk(top, 11.6);
    g.climb(top, low, 13, 14.5);
    g.walk(low, 11);
    g.walk(top, 15.5);
    g.grab(top);
    g.drive(low, () => ({ mx: 1 }), () => g.P(low).grounded && g.P(low).y + g.P(low).h <= 13 * T + 1 && g.P(low).x > 16 * T, 300, 'popped up');
    boost(g, low, top, spoonX(g));
    expect(g.w.spoonGot).toBe(true);
  });
});
