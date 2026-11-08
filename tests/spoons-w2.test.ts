// The golden spoons of World 2 can really be reached (2 kaiju, solo-style).
import { describe, expect, it } from 'vitest';
import { T } from '../src/sim/constants';
import { FRIDGE_LEVELS } from '../src/sim/levels-fridge';
import type { PlayerInput } from '../src/sim/world';
import { Play } from './play';

type Inp = Partial<PlayerInput>;
const only = (k: number, inp: Inp): Inp[] => { const a: Inp[] = []; a[k] = inp; return a; };
const sx = (g: Play) => (g.w.spoon!.x + g.w.spoon!.w / 2) / T;
/** k jumps (holding) at the spoon's column until it's found. */
function reach(g: Play, k: number): void {
  const x = sx(g) * T, p = g.P(k);
  g.drive(k, f => ({ mx: Math.abs(p.x + p.w / 2 - x) < 4 ? 0 : Math.sign(x - (p.x + p.w / 2)), jump: f % 50 < 34 }), () => g.w.spoonGot, 400, 'reach the spoon');
}
/** From a standstill at a ledge's edge, a (held) jump in direction dir. */
function leap(g: Play, k: number, dir: 1 | -1): void {
  g.drive(k, f => ({ mx: dir, jump: f < 40 }), () => g.w.spoonGot, 80, 'leap for the spoon');
}
/** Stand still under a floating snack at x tiles and hop up into it. */
function eat(g: Play, k: number, xT: number): void {
  g.step2(k, xT);
  g.tick(45, f => only(k, { jump: f < 20 }));
  g.tick(10);
}
/** Come to a standstill at x tiles on ice (ease off early: you slide). */
function iceTo(g: Play, k: number, xT: number, max = 900): void {
  const p = g.P(k), x = xT * T;
  g.drive(k, () => {
    const want = Math.max(-170, Math.min(170, (x - g.cx(k)) * 2));
    return { mx: want > p.vx + 8 ? 1 : want < p.vx - 8 ? -1 : 0 };
  }, () => p.grounded && Math.abs(g.cx(k) - x) < 8 && Math.abs(p.vx) < 4, max, `ice-stop at ${xT}`);
}

describe('World 2 golden spoons', () => {
  it('Cookie Monster: a leap left off the shelf block', () => {
    const g = new Play(FRIDGE_LEVELS[0], 2);
    const w = g.w, [A, B] = g.order();
    eat(g, A, 6.5);
    g.drive(A, () => ({ mx: 1 }), () => w.blocks[0].broken, 300, 'smash the crackers');
    g.walk(A, (18 * T - 26) / T);
    g.climb(B, A, 12, 20);
    g.step2(B, 18.5);
    leap(g, B, -1);
    expect(w.spoonGot).toBe(true);
  });
  it('Heavy Snack: hop on top of the heavy cube', () => {
    const g = new Play(FRIDGE_LEVELS[1], 2);
    const A = g.order()[0];
    g.walk(A, 8.6);
    g.jumpUp(A, 10.5, 14);
    reach(g, A);
    expect(g.w.spoonGot).toBe(true);
  });
  it('Slippery Slope: BOING on the jelly with a friend riding on your head', () => {
    const g = new Play(FRIDGE_LEVELS[2], 2);
    g.order().forEach((k, i) => iceTo(g, k, 12.6 - i * 1.2));
    g.order().forEach((k, i) => g.walk(k, 27.3 - i * 0.9));
    const [A, B] = g.order();
    g.onHead(B, A);
    g.drive(A, f => ({ mx: g.cx(A) < 28.9 * T ? 1 : 0, jump: f < 15 }), () => g.w.spoonGot, 300, 'hop onto the jelly and bounce');
    expect(g.w.spoonGot).toBe(true);
  });
  it('Deep Freeze: BOING off the jelly and steer left', () => {
    const g = new Play(FRIDGE_LEVELS[3], 2);
    const w = g.w;
    g.pull(g.order()[0], 0);
    g.order().forEach((k, i) => g.walk(k, 23.3 - i * 0.9));
    const near = [...g.order()].sort((a, b) => Math.abs(g.cx(a) - 21.5 * T) - Math.abs(g.cx(b) - 21.5 * T))[0];
    g.grab(near);
    const A = g.order()[0];
    g.step2(A, 23.4);
    let up = false;
    g.drive(A, f => { const p = g.P(A); if (p.vy < -900) up = true; return { mx: up ? -1 : 1, jump: f < 12 }; }, () => w.spoonGot, 200, 'hop on the jelly, bounce and steer left');
    expect(w.spoonGot).toBe(true);
  });
  it('Hot Stuff: a soda jump off a friend\'s head', () => {
    const g = new Play(FRIDGE_LEVELS[4], 2);
    const w = g.w, A = g.order()[0], B = g.order()[1];
    if (w.players[A].spicyT <= 0) eat(g, A, 4.5);
    g.drive(A, () => ({ mx: 1 }), () => w.blocks[0].broken, 300, 'melt the ice wall');
    g.walk(A, 13.5);
    g.walk(B, 12.4);
    g.onHead(B, A); // (B's hop takes it through the soda)
    if (!w.players[B].fizz) throw new Error('B did not drink the soda — ' + g.where());
    g.walk(A, 5.5); // B rides along
    g.drive(B, f => ({ jump: f < 40 }), () => w.spoonGot, 80, 'soda jump');
    expect(w.spoonGot).toBe(true);
  });
  it('Fridge Raid: a friend\'s head on the butter block', () => {
    const g = new Play(FRIDGE_LEVELS[5], 2);
    const w = g.w;
    const A = g.order()[0];
    eat(g, A, 8.5);
    g.drive(A, () => ({ mx: 1 }), () => w.blocks[0].broken, 300, 'smash the crackers');
    g.order().forEach((k, i) => iceTo(g, k, 21 - i));
    g.order().forEach((k, i) => g.walk(k, 38.5 - i * 1.3)); // jump the gap, BOING up onto the block
    const B = g.order()[0] === A ? g.order()[1] : g.order()[0];
    g.walk(A, sx(g));
    g.walk(B, sx(g) - 1.2);
    g.onHead(B, A); // (A is BIG: a tall step)
    reach(g, B);
    expect(w.spoonGot).toBe(true);
  });
});
