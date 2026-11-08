// The golden spoons of World 5 can really be reached (2 kaiju, solo-style).
import { describe, expect, it } from 'vitest';
import { T } from '../src/sim/constants';
import { SINK_LEVELS } from '../src/sim/levels-sink';
import { Play } from './play';

const sx = (g: Play) => (g.w.spoon!.x + g.w.spoon!.w / 2) / T;
/** k jumps (holding) at the spoon's column until it's found. */
function reach(g: Play, k: number): void {
  const x = sx(g) * T, p = g.P(k);
  g.drive(k, f => ({ mx: Math.abs(p.x + p.w / 2 - x) < 4 ? 0 : Math.sign(x - (p.x + p.w / 2)), jump: f % 50 < 34 }), () => g.w.spoonGot, 400, 'reach the spoon');
}
/** Swim (or walk) kaiju k to x tiles at the surface. */
function swimTo(g: Play, k: number, xT: number, max = 1200): void {
  const x = xT * T;
  g.drive(k, () => {
    const d = x - g.cx(k);
    return { mx: Math.abs(d) < 5 ? 0 : Math.sign(d) * (Math.abs(d) < 14 ? 0.3 : 1) };
  }, () => Math.abs(g.cx(k) - x) < 8, max, `swim to ${xT}`);
  g.tick(3);
}
/** Kaiju k stands on the drain at bx tiles and rides a soap bubble up as far as it goes, jumping off at the top. */
function bubbleTop(g: Play, k: number, bx: number): void {
  const p = g.P(k);
  g.step2(k, bx);
  g.drive(k, () => ({ mx: Math.abs(g.cx(k) - bx * T) < 4 ? 0 : Math.sign(bx * T - g.cx(k)) * 0.3 }), () => g.feet(k) < 15.5 * T, 600, 'lifted by a bubble');
  g.drive(k, () => {
    const b = g.w.bubbles.find(u => Math.abs(u.y - (p.y + p.h)) < 2);
    return { mx: Math.abs(g.cx(k) - sx(g) * T) < 4 ? 0 : Math.sign(sx(g) * T - g.cx(k)) * 0.2, jump: !b || b.life > 6.6 };
  }, () => g.w.spoonGot, 900, 'ride the bubble to the top');
}

describe('World 5 golden spoons', () => {
  it('Bath Time: wait at the far end of the empty sink while it fills', () => {
    const g = new Play(SINK_LEVELS[0], 2);
    const w = g.w;
    const B = g.order().find(k => g.onSomeone(k)) ?? g.order()[0];
    const A = g.order().find(k => k !== B)!;
    g.walk(A, (w.levers[0].x + T / 2) / T); // A waits by the plug lever
    g.walk(B, 12); // B goes down into the empty sink...
    g.walk(B, sx(g)); // ...over to the far corner
    g.pull(A);
    g.waitFor(() => w.spoonGot || Math.abs(w.waters[0].level - 7 * T) < 1, 900, 'the sink fills, B floats up');
    expect(w.spoonGot).toBe(true);
  });
  it('Bubble Bath: ride the first bubble all the way to the top', () => {
    const g = new Play(SINK_LEVELS[1], 2);
    const A = g.order().find(k => !g.onSomeone(k))!;
    bubbleTop(g, A, 8.5);
    expect(g.w.spoonGot).toBe(true);
  });
  it('Tap Dance: jump up out of the pool', () => {
    const g = new Play(SINK_LEVELS[2], 2);
    const w = g.w;
    g.spread();
    g.gather(9.4);
    const team = g.order();
    const slots = [23.45, 22.58];
    team.forEach((k, i) => {
      g.walkQ(k, 9.4);
      g.waitFor(() => w.jets[0].state === 'hot', 400, 'jet on');
      g.waitFor(() => w.jets[0].state !== 'hot', 400, 'jet off');
      g.walk(k, slots[i]);
    });
    team.forEach((k, i) => g.walk(k, 43.2 - i * 0.9)); // the jet blows each across
    const A = team[0];
    swimTo(g, A, sx(g));
    g.tick(30);
    reach(g, A);
    expect(w.spoonGot).toBe(true);
  });
  it('Drain Plan: float in sink B while a friend pulls the plug, and sink with the water', () => {
    const g = new Play(SINK_LEVELS[3], 2);
    const w = g.w;
    const puller = [...w.players].filter(p => !g.onSomeone(p.idx)).sort((a, b) => Math.abs(a.x - 3 * T) - Math.abs(b.x - 3 * T))[0].idx;
    g.pull(puller, 0);
    g.waitFor(() => Math.abs(w.waters[0].level - 6 * T) < 1, 900, 'sink A filled');
    const [A, B] = g.order();
    swimTo(g, A, 21.9); // out onto the wall between the sinks
    swimTo(g, B, 20.4);
    swimTo(g, A, 29.3); // A floats across sink B and climbs the block
    g.jumpUp(A, 31, 8);
    swimTo(g, B, 29.3); // B floats over to the far end of sink B (under the jump, round the block)
    g.jumpUp(B, 33, 8);
    swimTo(g, B, sx(g)); // off the block's far end, into the water
    g.walk(A, 32.5);
    g.grab(A); // pull the plug
    g.waitFor(() => w.spoonGot || Math.abs(w.waters[1].level - 16 * T) < 1, 900, 'sink B drains, B sinks with it');
    expect(w.spoonGot).toBe(true);
  });
  it('Suds Express: a friend\'s head on the big block', () => {
    const g = new Play(SINK_LEVELS[4], 2);
    const w = g.w;
    const F = g.order().find(k => !g.onSomeone(k))!;
    g.drive(F, () => ({ mx: 1 }), () => w.rule === 'reverse', 300, 'print the reverse ticket');
    g.waitFor(() => w.rule === null, 900, 'reverse ticket over');
    g.spread();
    g.gather(9.4);
    const team = g.order();
    team.forEach(k => {
      g.walkQ(k, 9.4);
      g.waitFor(() => w.jets[0].state === 'hot', 400, 'jet on');
      g.waitFor(() => w.jets[0].state !== 'hot', 400, 'jet off');
      const p = g.P(k);
      let took = false;
      g.drive(k, () => { if (p.grounded && p.x > 12 * T - 26) took = true; return { mx: 1, jump: took && (p.grounded || p.vy < 0) }; },
        () => took && p.grounded && p.x > 16.6 * T - 18 && g.feet(k) >= 15.9 * T, 400, 'leap the pit');
      g.walk(k, 20.2);
      g.step2(k, 21.5);
      g.drive(k, () => ({}), () => g.feet(k) < 7 * T - 6, 600, 'ride a bubble up');
      g.drive(k, () => ({ mx: 0.6 }), () => p.grounded && g.feet(k) <= 7 * T + 1 && p.x > 23.6 * T, 200, 'hop off onto the block');
      g.walk(k, 26);
    });
    const [A, B] = g.order();
    g.walk(A, sx(g));
    g.walk(B, sx(g) - 1);
    g.onHead(B, A);
    reach(g, B);
    expect(w.spoonGot).toBe(true);
  });
  it('Washing Up: ride a bubble all the way up out of the gap', () => {
    const g = new Play(SINK_LEVELS[5], 2);
    const w = g.w;
    const puller = [...w.players].filter(p => !g.onSomeone(p.idx)).sort((a, b) => Math.abs(a.x - 4 * T) - Math.abs(b.x - 4 * T))[0].idx;
    g.pull(puller, 0);
    g.waitFor(() => Math.abs(w.waters[0].level - 6 * T) < 1, 900, 'sink filled');
    // everyone floats over to the first block and hops up onto it
    const ord = g.order();
    ord.forEach((k, i) => swimTo(g, k, 24.3 - i));
    g.order().forEach((k, i) => { g.jumpUp(k, 26, 6); g.walk(k, 32.1 - i * 0.9); });
    const A = g.order()[0];
    g.walk(A, 32.5);
    g.dropOff(A, 1); // down into the gap
    bubbleTop(g, A, 35.5);
    expect(w.spoonGot).toBe(true);
  });
});
