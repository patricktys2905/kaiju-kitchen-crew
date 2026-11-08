// Whole-level playthroughs, World 4 (Stove & Oven), played solo-style (one kaiju at a time).
import { describe, it } from 'vitest';
import { PHYS, T } from '../src/sim/constants';
import { STOVE_LEVELS } from '../src/sim/levels-stove';
import { Play } from './play';

const lv = (i: number) => STOVE_LEVELS[i];
const COUNTS = [2, 6];

type Cyc = { state: 'cold' | 'warn' | 'hot' };
const mx = (from: number, to: number, tol = 4) => (Math.abs(to - from) <= tol ? 0 : Math.sign(to - from) * (Math.abs(to - from) < 12 ? 0.3 : 1));

/** Wait for the start of a cool window (just after the hot phase ends). */
function coolStart(g: Play, c: Cyc, what: string): void {
  g.waitFor(() => c.state === 'hot', 600, what + ' hot');
  g.waitFor(() => c.state !== 'hot', 400, what + ' cool');
}

/** Stand in a steam column (centre vxT) and ride it; once the feet are above clearRow, steer to xT and land. */
function ventRide(g: Play, k: number, vxT: number, clearRow: number, xT: number, landRow = 16): void {
  const p = g.P(k);
  let up = false; // high enough: steer for the landing (until back on the ground)
  g.drive(k, f => {
    const feet = p.y + p.h, c = p.x + p.w / 2;
    if (feet < clearRow * T - 4) up = true;
    else if (p.grounded && feet > (clearRow + 1) * T && Math.abs(c - vxT * T) < 3 * T) up = false; // fell back down
    if (!up) return { mx: mx(c, vxT * T), jump: Math.abs(c - vxT * T) < 30 && f % 40 < 20 };
    return { mx: mx(c, xT * T, 3) };
  }, () => p.grounded && Math.abs(p.x + p.w / 2 - xT * T) < 10 && p.y + p.h <= landRow * T + 1, 2400, `ride the vent at ${vxT} to ${xT}`);
  g.tick(3);
}

/** Hop from spot to spot over a hot strip (the floor there is a hazard, so plain walking won't do). */
function hops(g: Play, k: number, spots: number[]): void {
  const p = g.P(k);
  for (const s of spots) {
    g.drive(k, f => ({ mx: mx(p.x + p.w / 2, s * T, 3), jump: f < 18 && Math.abs(p.x + p.w / 2 - s * T) > 20 }),
      () => p.grounded && Math.abs(p.x + p.w / 2 - s * T) < 14, 400, `hop to ${s}`);
  }
  g.tick(2);
}

// ---------------------------------------------------------------- the shared screen: move up in hops
const LEASH = 22.3; // tiles a kaiju may get ahead of the rearmost one (camera edges are walls)
const cxT = (g: Play, k: number) => g.cx(k) / T;
const loOf = (g: Play, k: number) => Math.min(...g.w.players.filter(p => p.idx !== k).map(p => (p.x + p.w / 2) / T));
/** Kaiju who are across move on (front first) towards base - i*gap, as far as the shared screen lets them. */
function settle(g: Play, ks: number[], base: number, gap = 0.9): void {
  [...ks].sort((a, b) => g.cx(b) - g.cx(a)).forEach((k, i) => {
    const goal = Math.min(base - i * gap, loOf(g, k) + LEASH);
    if (goal > cxT(g, k) + 0.3) g.walkQ(k, goal);
  });
}
/** The waiting line (front first) shuffles up behind front. */
function queue(g: Play, ks: number[], front: number, gap = 0.9): void {
  [...ks].sort((a, b) => g.cx(b) - g.cx(a)).forEach((k, i) => { if (front - i * gap > cxT(g, k) + 0.3) g.walkQ(k, front - i * gap); });
}

// ---------------------------------------------------------------- Pot Mech: everyone aboard, the pilot does the rest
function allAboard(g: Play, before?: (k: number) => void): number {
  let last = -1;
  const r = g.w.robots[0];
  const ord = g.order(), free = (k: number) => g.P(k).carry < 0;
  // hands-free kaiju first; then the carriers, who put their ingredient down beside the Mech (behind them, for the arm)
  for (const k of [...ord.filter(free), ...ord.filter(k => !free(k))]) {
    before?.(k);
    if (!free(k)) {
      g.walk(k, (r.x - 20) / T);
      g.drive(k, () => ({ mx: -0.3 }), () => g.P(k).facing < 0, 10, 'turn round');
      g.grab(k); // toss it down
      g.tick(50);
    }
    g.board(k);
    last = k;
  }
  g.tick(170); // the passengers doze off: the one at the controls gets every job
  return last;
}
const R = (g: Play) => g.w.robots[0];
/** The Mech arm picks up an ingredient (jumping for one up on a shelf). */
function armGet(g: Play, pilot: number, kind: string, jump = false): void {
  const r = R(g);
  const it = g.w.items.find(i => i.kind === kind && !i.delivered && i.carrier < 0);
  if (!it) throw new Error(`no ${kind} for the arm`);
  const ic = it.x + PHYS.item / 2;
  const dir = r.x + r.w / 2 > ic ? -1 : 1; // face it: the arm reaches out in front
  g.mechTo(pilot, (ic - dir * 67) / T);
  if (r.facing !== dir) g.drive(pilot, () => ({ mx: dir * 0.3 }), () => r.facing === dir, 20, 'turn the Mech');
  if (jump) {
    g.drive(pilot, f => ({ jump: f < 30, grab: f > 6 && f % 2 === 0 }), () => r.carry >= 0, 120, `jump for the ${kind}`);
    g.drive(pilot, () => ({}), () => r.grounded, 200, 'Mech lands');
  } else g.mechArm(pilot);
  if (g.w.items[r.carry]?.kind !== kind) throw new Error(`the arm missed the ${kind} — ${g.where()}`);
}
/** Drive up to the pot and drop the held ingredient in. */
function armPot(g: Play, pilot: number): void {
  const pot = g.w.pots[0], before = g.w.delivered;
  g.mechTo(pilot, (pot.x - 52 - 20) / T);
  g.mechArm(pilot);
  if (g.w.delivered !== before + 1) throw new Error(`the Mech failed to deliver — ${g.where()}`);
}
function mechFinish(g: Play, pilot: number): void {
  const pl = g.w.plates[0];
  g.mechTo(pilot, (pl.x + pl.w / 2) / T);
  g.waitFor(() => g.w.phase === 'clear', 60, 'level clear');
}

// ---------------------------------------------------------------- routes
function meltingPoint(g: Play): void {
  g.spread();
  g.gather(9.3); // lined up at the pit
  const ord = g.order();
  g.pick(ord[0], 'potato'); // up on the safe pillar
  ord.forEach((k, i) => { // one at a time: hop, hop, hop, then make room
    g.walk(k, 23.8);
    queue(g, ord.slice(i + 1), 9.3);
    settle(g, ord.slice(0, i + 1), 29);
  });
  g.deliver(ord[0]);
  g.finish();
}

function steamRoom(g: Play): void {
  const w = g.w, [v1] = w.vents;
  const ord = g.order(), A = ord[0];
  // A rides the first vent up to the onion shelf
  coolStart(g, v1, 'vent 1');
  ventRide(g, A, 8, 8, 13, 8);
  g.pick(A, 'onion');
  g.walk(A, 16.4);
  g.dropOff(A, 1);
  g.walk(A, 19.9);
  // the rest file past the first vent while it is off, and wait under the shelf
  ord.slice(1).forEach((k, i) => {
    coolStart(g, v1, 'vent 1');
    g.walk(k, 19 - i * 0.9);
  });
  // front first, over the tall wall on the big vent
  ord.forEach((k, i) => {
    ventRide(g, k, 22, 5, 33 - i * 0.9);
    if (i === 1) { g.pick(k, 'sausage'); g.walk(k, 32.1); }
  });
  g.deliver(A);
  g.deliver(g.carrier('sausage'));
  g.finish();
}

function grillMarks(g: Play): void {
  const w = g.w, burner = w.burners[0], vent = w.vents[0];
  g.spread();
  g.gather(7.3); // lined up by the burner
  const ord = g.order(), A = ord[0];
  // one at a time: over the burner while it's cool, then past the vent while it's off; A rides it up to the pepper
  ord.forEach((k, i) => {
    coolStart(g, burner, 'burner');
    g.walk(k, 17.6);
    coolStart(g, vent, 'vent');
    if (k === A) { ventRide(g, A, 20, 9, 24, 9); g.pick(A, 'pepper'); } // A waits up on the shelf
    else g.walk(k, 21.8);
    queue(g, ord.slice(i + 1), 7.3);
    settle(g, ord.slice(1, i + 1), 29.6);
  });
  // over the hot strip on the chocolate, front first (A steps down off the shelf when it's its turn)
  let spot = 46;
  for (const k of g.order()) {
    if (k === A) { g.walk(A, 27.4); g.dropOff(A, 1); }
    g.walk(k, 30.3);
    hops(g, k, [33, 37, 40]);
    if (w.players[k].carry < 0 && w.items.some(it => it.kind === 'sausage' && it.carrier < 0 && !it.delivered)) g.pick(k, 'sausage');
    g.walk(k, spot);
    spot -= 0.9;
  }
  g.deliver(A);
  g.deliver(g.carrier('sausage'));
  g.finish();
}

function ovenMitts(g: Play): void {
  const pilot = allAboard(g);
  g.mechTo(pilot, 8); // off the start, facing the hob
  armGet(g, pilot, 'potato', true); // jump under the shelf, the arm grabs it
  armPot(g, pilot);
  armGet(g, pilot, 'onion');
  armPot(g, pilot);
  mechFinish(g, pilot);
}

function flambe(g: Play): void {
  const w = g.w, burner = w.burners[0];
  g.spread();
  g.gather(9.4); // lined up at the chocolate bridge
  const ord = g.order(), [A, B] = ord;
  // over the bridge, one at a time and without stopping; the line shuffles up behind
  ord.forEach((k, i) => {
    g.walk(k, 26.9);
    queue(g, ord.slice(i + 1), 9.4);
    if (k === A) g.pick(A, 'pepper');
    settle(g, ord.slice(0, i + 1), 35.5);
  });
  // up the steam to the tower top, front first; B takes the onion
  ord.forEach((k, i) => {
    ventRide(g, k, 38, 4, 41, 4);
    if (k === B) g.pick(k, 'onion');
    g.walk(k, 42.4);
    g.dropOff(k, 1);
    g.walk(k, 48.5 - i * 0.9);
  });
  // over the burner when it's off
  ord.forEach((k, i) => {
    coolStart(g, burner, 'burner');
    g.walk(k, 61 - i * 0.9);
  });
  g.deliver(A);
  g.deliver(B);
  g.finish();
}

function sundayRoast(g: Play): void {
  const w = g.w, vent = w.vents[0];
  g.pick(g.order()[0], 'potato'); // it's right under the front kaiju
  g.spread();
  const ord = g.order(), B = ord.slice(1).find(k => w.players[k].carry < 0)!; // not the very first across: the screen won't stretch that far yet
  // over the melting stepping stones, then past the vent while it's off; B rides it up to the sausage
  ord.forEach((k, i) => {
    g.walk(k, 20.8);
    coolStart(g, vent, 'vent');
    if (k === B) ventRide(g, k, 23, 8, 25.6, 8); // B waits up on the shelf
    else g.walk(k, 24.5);
    queue(g, ord.slice(i + 1), 7.0, 0.88);
    settle(g, ord.slice(0, i + 1).filter(j => j !== B), 32.6);
  });
  // everyone into the Pot Mech (carriers' ingredients drop right beside it), then the pilot cooks
  const pilot = allAboard(g, k => { if (k === B) { g.pick(B, 'sausage'); g.walk(B, 30.4); g.dropOff(B, 1); } });
  armGet(g, pilot, 'potato');
  armPot(g, pilot);
  armGet(g, pilot, 'sausage');
  armPot(g, pilot);
  armGet(g, pilot, 'pepper', true);
  armPot(g, pilot);
  armGet(g, pilot, 'onion');
  armPot(g, pilot);
  mechFinish(g, pilot);
}

const ROUTES: [number, (g: Play) => void][] = [[0, meltingPoint], [1, steamRoom], [2, grillMarks], [3, ovenMitts], [4, flambe], [5, sundayRoast]];

describe('World 4 playthroughs (solo-style: one kaiju at a time)', () => {
  for (const [i, route] of ROUTES) {
    for (const n of COUNTS) {
      it(`${i + 1}. ${lv(i).name} with ${n} kaiju`, () => route(new Play(lv(i), n)));
    }
  }
});
