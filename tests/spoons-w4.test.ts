// The golden spoons of World 4 can really be reached (2 kaiju, solo-style).
import { describe, expect, it } from 'vitest';
import { T } from '../src/sim/constants';
import { STOVE_LEVELS } from '../src/sim/levels-stove';
import { Play } from './play';

type Cyc = { state: 'cold' | 'warn' | 'hot' };
const sx = (g: Play) => (g.w.spoon!.x + g.w.spoon!.w / 2) / T;
const mx = (from: number, to: number, tol = 4) => (Math.abs(to - from) <= tol ? 0 : Math.sign(to - from) * (Math.abs(to - from) < 12 ? 0.3 : 1));
/** Pilot k makes the Pot Mech jump (straight up), until the spoon is found or the Mech is back down. */
function mechJump(g: Play, k: number): void {
  const r = g.w.robots[0];
  let left = false;
  g.drive(k, f => { if (!r.grounded) left = true; return { jump: f < 40 }; }, () => g.w.spoonGot || (left && r.grounded), 150, 'Mech jump');
}
/** k jumps (holding) at the spoon's column until it's found. */
function reach(g: Play, k: number): void {
  const x = sx(g) * T, p = g.P(k);
  g.drive(k, f => ({ mx: Math.abs(p.x + p.w / 2 - x) < 4 ? 0 : Math.sign(x - (p.x + p.w / 2)), jump: f % 50 < 34 }), () => g.w.spoonGot, 400, 'reach the spoon');
}
/** Wait for the start of a cool window (just after the hot phase ends). */
function coolStart(g: Play, c: Cyc, what: string): void {
  g.waitFor(() => c.state === 'hot', 600, what + ' hot');
  g.waitFor(() => c.state !== 'hot', 400, what + ' cool');
}
/** Stand in a steam column (centre vxT) and ride it; once the feet are above clearRow, steer to xT and land. */
function ventRide(g: Play, k: number, vxT: number, clearRow: number, xT: number, landRow = 16): void {
  const p = g.P(k);
  let up = false;
  g.drive(k, f => {
    const feet = p.y + p.h, c = p.x + p.w / 2;
    if (feet < clearRow * T - 4) up = true;
    else if (p.grounded && feet > (clearRow + 1) * T && Math.abs(c - vxT * T) < 3 * T) up = false;
    if (!up) return { mx: mx(c, vxT * T), jump: Math.abs(c - vxT * T) < 30 && f % 40 < 20 };
    return { mx: mx(c, xT * T, 3) };
  }, () => p.grounded && Math.abs(p.x + p.w / 2 - xT * T) < 10 && p.y + p.h <= landRow * T + 1, 2400, `ride the vent at ${vxT} to ${xT}`);
  g.tick(3);
}
/** Stand in a steam column (centre vxT) until it puffs you up past row `row`, then steer to x tiles: until the spoon. */
function ventLean(g: Play, k: number, vxT: number, row: number, xT: number): void {
  const p = g.P(k);
  g.drive(k, () => {
    const c = p.x + p.w / 2;
    return p.y + p.h < row * T ? { mx: mx(c, xT * T, 3) } : { mx: mx(c, vxT * T) };
  }, () => g.w.spoonGot, 900, `ride the vent at ${vxT} and lean to ${xT}`);
}

describe('World 4 golden spoons', () => {
  it('Melting Point: a leap off a friend\'s head on the safe pillar', () => {
    const g = new Play(STOVE_LEVELS[0], 2);
    const [A, B] = g.order();
    g.walk(A, 9.3); g.walk(B, 8.4);
    g.walk(A, 16.9); // hop, hop onto the pillar (right side)
    g.walk(B, 15.8);
    g.onHead(B, A);
    g.drive(B, f => ({ mx: 1, jump: f < 40 }), () => g.w.spoonGot, 80, 'leap right');
    expect(g.w.spoonGot).toBe(true);
  });
  it('Steam Room: ride the big vent all the way up and lean left', () => {
    const g = new Play(STOVE_LEVELS[1], 2);
    const w = g.w, [v1, v2] = w.vents;
    const [A, B] = g.order();
    coolStart(g, v1, 'vent 1');
    g.walk(A, 19.9);
    coolStart(g, v1, 'vent 1');
    g.walk(B, 19);
    g.waitFor(() => v2.state === 'hot', 600, 'vent 2 on');
    g.waitFor(() => v2.state !== 'hot', 600, 'vent 2 off');
    ventLean(g, A, 22, 3, 18.5);
    expect(w.spoonGot).toBe(true);
  });
  it('Grill Marks: a friend\'s head on the pepper block', () => {
    const g = new Play(STOVE_LEVELS[2], 2);
    const w = g.w, burner = w.burners[0], vent = w.vents[0];
    const [A, B] = g.order();
    for (const k of [A, B]) {
      coolStart(g, burner, 'burner');
      g.walk(k, 17.6);
      coolStart(g, vent, 'vent');
      ventRide(g, k, 20, 9, k === A ? 25 : 23.5, 9);
    }
    g.walk(A, sx(g));
    g.walk(B, sx(g) - 1);
    g.onHead(B, A);
    reach(g, B);
    expect(w.spoonGot).toBe(true);
  });
  it('Oven Mitts: make the Mech jump high over the hot hob', () => {
    const g = new Play(STOVE_LEVELS[3], 2);
    const [A, B] = g.order();
    g.board(A); g.board(B);
    g.tick(170); // B dozes: A at the controls gets every job
    g.mechTo(A, sx(g));
    mechJump(g, A);
    expect(g.w.spoonGot).toBe(true);
  });
  it('Flambé: a friend\'s head in the dark far corner', () => {
    const g = new Play(STOVE_LEVELS[4], 2);
    const w = g.w, burner = w.burners[0];
    const [A, B] = g.order();
    g.walk(A, 9.4); g.walk(B, 8.5);
    g.walk(A, 26.9); // over the chocolate bridge without stopping
    g.walk(B, 26);
    g.walk(A, 35.5); g.walk(B, 34.6);
    for (const k of [A, B]) { // up the steam, over the onion tower
      ventRide(g, k, 38, 4, 41, 4);
      g.walk(k, 42.4);
      g.dropOff(k, 1);
      g.walk(k, k === A ? 48.5 : 47.6);
    }
    for (const k of [A, B]) { coolStart(g, burner, 'burner'); g.walk(k, k === A ? 61 : 60.1); }
    expect(w.rule).toBe('dark');
    g.walk(A, sx(g) + 0.2);
    g.walk(B, sx(g) - 1);
    g.onHead(B, A);
    reach(g, B);
    expect(w.spoonGot).toBe(true);
  });
  it('Sunday Roast: ride on the Mech\'s head while it jumps', () => {
    const g = new Play(STOVE_LEVELS[5], 2);
    const w = g.w, vent = w.vents[0], r = w.robots[0];
    g.spread();
    const [A, B] = g.order();
    for (const k of [A, B]) { g.walk(k, 20.8); coolStart(g, vent, 'vent'); if (k === A) g.walk(A, 24.5); }
    ventRide(g, B, 23, 8, 29.5, 8); // B rides the steam up onto the sausage block
    g.board(A);
    g.tick(60);
    g.mechTo(A, 31.2); // the Mech parks by the block's end...
    g.walk(B, 30.6);
    g.dropOff(B, 1); // ...and B steps down onto its head
    if (Math.abs(g.feet(B) - r.y) > 1) throw new Error('B missed the Mech — ' + g.where());
    g.mechTo(A, sx(g)); // B rides along
    g.tick(5);
    mechJump(g, A); // B rides up on its head
    expect(w.spoonGot).toBe(true);
  });
});
