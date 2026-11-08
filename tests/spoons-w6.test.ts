// The golden spoons of World 6 can really be reached (2 kaiju, solo-style), Chef's Hand and all.
import { describe, expect, it } from 'vitest';
import { PHYS, T } from '../src/sim/constants';
import { isHazardTile } from '../src/sim/level';
import { DINNER_LEVELS } from '../src/sim/levels-dinner';
import type { Player, PlayerInput, World } from '../src/sim/world';
import { walker } from './helpers';
import { Play } from './play';

type Inp = Partial<PlayerInput>;
const cxOf = (b: { x: number; w: number }) => b.x + b.w / 2;
const H = PHYS.hand;

// ------------------------------------------------------------------ the Chef's Hand (as in playthrough-w6)
function untilHit(w: World): number {
  let best = Infinity;
  for (const h of w.hands) {
    const t = h.state === 'idle' ? h.period - h.t + H.warn
      : h.state === 'warn' ? H.warn - h.t
        : h.state === 'slam' ? (h.t <= 0.25 ? 0 : H.slam - h.t + H.lift + h.period + H.warn)
          : H.lift - h.t + h.period + H.warn;
    best = Math.min(best, t);
  }
  return best;
}
function safeAt(w: World, b: { x: number; y: number; w: number; h: number }, x: number, tx: number): boolean {
  if (!(x + b.w > tx - H.w / 2 - 4 && x < tx + H.w / 2 + 4)) return true;
  return w.sheltered({ x, y: b.y, w: b.w, h: b.h });
}
function beltUnder(w: World, b: { x: number; y: number; w: number; h: number }) {
  return w.belts.find(bt => Math.abs(b.y + b.h - bt.y) < 1 && b.x + b.w > bt.x && b.x < bt.x + bt.w);
}
/** The kaiju being played steps out of the Hand's shadow (and the 'reverse' ticket is undone). */
function handGuard(g: Play): void {
  const w = g.w;
  const g2 = g as unknown as { step(inputs: Inp[]): void; guarded?: number };
  const orig = g2.step.bind(g);
  g2.guarded = 0;
  g2.step = (inputs: Inp[]) => {
    const k = inputs.findIndex(i => i !== undefined);
    if (k >= 0) inputs[k] = adjust(k, { ...inputs[k] });
    orig(inputs);
  };
  const adjust = (k: number, inp: Inp): Inp => {
    const p = w.players[k];
    const r = p.inRobot >= 0 ? w.robots[p.inRobot] : null;
    const body = r ?? p;
    const grounded = r ? r.grounded : p.grounded;
    const run = (r ? PHYS.robot.run : PHYS.run) * (w.rule === 'speedy' ? PHYS.speedy : 1);
    for (const h of w.hands) {
      const tHit = h.state === 'warn' ? H.warn - h.t : h.state === 'slam' && h.t <= 0.25 ? 0 : -1;
      if (tHit < 0 || !grounded) continue;
      const bt = beltUnder(w, body);
      const drift = bt ? bt.dir * bt.speed : 0;
      const ok = (mx: number, jump = false) => [0, 0.08, 0.16, 0.25].every(d => {
        if (h.state === 'slam' && h.t > d) return true;
        const tt = h.state === 'slam' ? d - h.t : tHit + d;
        return safeAt(w, body, body.x + (mx * run + (jump ? 0 : drift)) * tt, h.tx);
      });
      const mine = Math.max(-1, Math.min(1, inp.mx ?? 0));
      if (ok(mine, !!inp.jump)) continue;
      const hold = drift ? Math.max(-1, Math.min(1, -drift / run)) : 0;
      const alt = [hold, 0, -1, 1, -0.5, 0.5].find(m => ok(m));
      g2.guarded!++;
      inp = { mx: alt ?? hold, grab: inp.grab };
    }
    if (w.rule === 'reverse' && inp.mx) inp = { ...inp, mx: -inp.mx };
    return inp;
  };
}
/** Wait (everyone resting) until the Hand has just landed, if there isn't `secs` left before it does. */
function handWindow(g: Play, secs: number): void {
  if (!g.w.hands.length || untilHit(g.w) > secs) return;
  g.waitFor(() => g.w.hands.every(h => h.state === 'lift' || (h.state === 'slam' && h.t > 0.25)), 900, 'the Hand to land');
}

// ------------------------------------------------------------------ moving about (as in playthrough-w6)
function screenReach(g: Play, k: number): number {
  const lo = Math.min(...g.w.players.filter(p => p.idx !== k).map(p => cxOf(p) / T));
  return Math.max(23.3, lo + 22.75);
}
function hazardAhead(w: World, p: Player, dir: number): boolean {
  const ww = w as unknown as { tileAt(c: number, r: number): number };
  const row = Math.floor((p.y + p.h + 2) / T);
  const x0 = dir > 0 ? p.x + p.w : p.x;
  for (let d = 0; d <= 26; d += 6) if (isHazardTile(ww.tileAt(Math.floor((x0 + dir * d) / T), row))) return true;
  return false;
}
function friendAhead(w: World, p: Player, dir: number, goal: number): boolean {
  return w.players.some(q => {
    if (q === p || q.inRobot >= 0) return false;
    const gap = dir > 0 ? q.x - (p.x + p.w) : p.x - (q.x + q.w);
    const beyond = dir > 0 ? goal > q.x + q.w : goal < q.x;
    return beyond && gap > -2 && gap < 6 && q.y < p.y + p.h - 8 && p.y < q.y + q.h - 8;
  });
}
function go(g: Play, k: number, xT: number, opts: { queue?: boolean; max?: number; exact?: boolean } = {}): void {
  const w = g.w, p = g.P(k), x = xT * T;
  const g2 = g as unknown as { guarded: number };
  let still = 0, last = p.x, guarded = g2.guarded ?? 0;
  g.drive(k, () => {
    const inp = walker(w, p, x, true);
    const dir = Math.sign(inp.mx ?? 0);
    if (p.grounded && dir && hazardAhead(w, p, dir)) inp.jump = true;
    if (!opts.queue && p.grounded && dir && friendAhead(w, p, dir, x)) inp.jump = true;
    if (p.grounded && dir && beltUnder(w, p)?.dir === -dir) inp.jump = true;
    if (!p.grounded && p.vy < 0) inp.jump = true;
    return inp;
  }, () => {
    const gd = g2.guarded ?? 0;
    still = Math.abs(p.x - last) < 0.2 && gd === guarded ? still + 1 : 0;
    guarded = gd; last = p.x;
    return p.grounded && (Math.abs(cxOf(p) - x) < 10 || (!!opts.queue && still > 60));
  }, opts.max ?? 1500, `${opts.queue ? 'queue' : 'go'} to ${xT.toFixed(2)}`);
  g.tick(3);
  if (opts.exact && Math.abs(cxOf(p) - x) < 12) {
    g.drive(k, () => ({ mx: Math.abs(cxOf(p) - x) < 1.5 && !beltUnder(w, p) ? 0 : Math.sign(x - cxOf(p)) * (beltUnder(w, p) ? 1 : 0.25) }), () => p.grounded && Math.abs(cxOf(p) - x) < 2.5 && Math.abs(p.vx) < 1 && !beltUnder(w, p), 120, `shuffle to ${xT.toFixed(2)}`);
  }
}
/** Everyone (front first) to spots counting back from xT; waits for the Hand between moves. */
function line(g: Play, xT: number, gap = 0.9): void {
  for (let hop = 0; hop < 12; hop++) {
    const ord = g.order();
    const want = (i: number) => xT - i * gap;
    if (ord.every((k, i) => Math.abs(g.cx(k) - want(i) * T) < 12)) return;
    ord.forEach((k, i) => {
      const here = g.cx(k) / T, goal = Math.min(want(i), screenReach(g, k));
      if (Math.sign(goal - here) !== Math.sign(want(i) - here) || Math.abs(here - goal) < 0.3) return;
      handWindow(g, Math.abs(goal - here) * T / PHYS.run + 0.6);
      go(g, k, goal, { queue: true });
    });
  }
}
function unstackOrder(g: Play): number[] {
  const w = g.w, left = g.order(), seq: number[] = [];
  const onTop = (q: Player, k: Player) => Math.abs(q.y + q.h - k.y) < 2 && q.x < k.x + k.w && q.x + q.w > k.x;
  while (left.length) {
    const i = left.findIndex(k => !left.some(j => j !== k && onTop(w.players[j], w.players[k])));
    seq.push(left.splice(i, 1)[0]);
  }
  return seq;
}
/** Pilot k drives the Mech to x tiles: hops along backwards belts and when blocked. */
function mechGo(g: Play, k: number, xT: number, opts: { snatch?: string; max?: number; onBelt?: boolean } = {}): void {
  const w = g.w, r = w.robots[0], x = xT * T;
  let jp = false, stuck = 0, last = r.x;
  g.drive(k, f => {
    const d = x - (r.x + r.w / 2), dir = Math.abs(d) < 4 ? 0 : Math.sign(d);
    const inp: Inp = { mx: dir * (Math.abs(d) < 14 ? 0.3 : 1) };
    stuck = dir && Math.abs(r.x - last) < 0.3 ? stuck + 1 : 0;
    last = r.x;
    const bt = beltUnder(w, r);
    if (r.grounded && !jp && dir && ((bt && bt.dir === -dir) || stuck > 4)) inp.jump = true;
    jp = !!inp.jump;
    const it = opts.snatch !== undefined && r.carry < 0 ? w.items.find(i => i.kind === opts.snatch && !i.delivered && i.carrier < 0) : undefined;
    if (it) {
      const reachX = r.facing > 0 ? r.x + r.w - 20 : r.x - 50;
      if (it.x + PHYS.item > reachX && it.x < reachX + 70 && it.y + PHYS.item > r.y - 10 && it.y < r.y + r.h + 10) inp.grab = f % 2 === 0;
    }
    return inp;
  }, () => r.grounded && Math.abs(r.x + r.w / 2 - x) < 8 && (!!opts.onBelt || !beltUnder(w, r)), opts.max ?? 1500, `Mech to ${xT}`);
  g.tick(4);
}

// ------------------------------------------------------------------ the spoon
const spoonX = (g: Play) => (g.w.spoon!.x + g.w.spoon!.w / 2) / T;
/** k jumps (holding) at the spoon's column until it's found. */
function grabSpoon(g: Play, k: number): void {
  const x = spoonX(g) * T, p = g.P(k);
  g.drive(k, f => ({ mx: Math.abs(p.x + p.w / 2 - x) < 4 ? 0 : Math.sign(x - (p.x + p.w / 2)), jump: f % 50 < 34 }), () => g.w.spoonGot, 400, 'reach the spoon');
}
const lv = (i: number) => new Play(DINNER_LEVELS[i], 2);

describe('World 6 golden spoons', () => {
  it('Watch the Hand: a quick boost out in the open between slams', () => {
    const g = lv(0);
    handGuard(g);
    for (const s of [8, 20, 32]) line(g, s + 6 - 0.45); // shelf to shelf
    const [A, B] = g.order();
    handWindow(g, 99); // the Hand has just landed: out we go
    go(g, A, 40.5, { exact: true });
    go(g, B, 39.3);
    g.onHead(B, A);
    grabSpoon(g, B);
    expect(g.w.spoonGot).toBe(true);
  });

  it('Balancing Act: a leap off the risen right pan', () => {
    const g = lv(1);
    const w = g.w;
    const [A, B] = g.order();
    g.walk(A, 15.5);
    const cube = w.crates[0];
    g.jumpUp(B, 7, 9);
    g.step2(B, (cube.x - 18) / T);
    g.push(B, 10.5, () => cube.x >= 10 * T);
    g.waitFor(() => w.lifts[1].y < 11 * T - 80, 200, 'right pan up');
    g.step2(A, 14.55); // to the pan's left edge
    let n = 0;
    g.drive(A, f => ({ mx: f < 6 ? 0 : -0.6, jump: f < 30 }), () => w.spoonGot || (n++ > 5 && g.P(A).grounded), 120, 'leap left');
    expect(w.spoonGot).toBe(true);
  });

  it('Conveyor Chaos: the belt drops a snoozing friend on the safe tile; hop on its head', () => {
    const g = lv(2);
    const w = g.w;
    handGuard(g);
    line(g, 7.4);
    const [A, B] = g.order();
    handWindow(g, 3.5);
    go(g, A, 33); // over the backwards belt, onto the forward one...
    g.waitFor(() => !beltUnder(w, g.P(A)) && g.P(A).grounded, 300, 'A carried off the belt'); // ...and asleep
    handWindow(g, 99); // (far apart: the Hand lands between them)
    go(g, B, 34.3, { queue: true });
    g.onHead(B, A);
    grabSpoon(g, B);
    expect(w.spoonGot).toBe(true);
  });

  it('Rush Hour: leap off a friend\'s head over the mousetraps, land on the island', () => {
    const g = lv(3);
    const w = g.w;
    handGuard(g);
    const first = unstackOrder(g)[0];
    const B = g.order().find(k => k !== first)!;
    go(g, first, 24.5, { exact: true });
    go(g, B, 7.5, { queue: true, exact: true });
    g.waitFor(() => w.rule === null, 900, 'the speedy ticket to run out');
    const A = first;
    handWindow(g, 99);
    go(g, B, 25.5); // (the shared screen: the one behind catches up first)
    go(g, A, 30);
    g.step2(A, 31.2);
    handWindow(g, 99); // (well apart: the Hand lands between them)
    go(g, B, 29.5);
    g.onHead(B, A);
    // jump right off the head, then steer for the middle of the island
    const p = g.P(B);
    g.drive(B, f => {
      const mx = cxOf(p) < 33.2 * T ? 1 : Math.sign(35 * T - cxOf(p)) * (Math.abs(35 * T - cxOf(p)) < 10 ? 0 : 1);
      return { mx, jump: f < 40 }; // (the guard undoes the 'reverse' ticket)
    }, () => p.grounded && cxOf(p) > 33 * T, 200, 'leap to the island');
    expect(w.spoonGot).toBe(true);
  });

  it('Head Chef: drive the Mech through the door before it shuts, then jump', () => {
    const g = lv(4);
    const w = g.w, r = w.robots[0];
    handGuard(g);
    // as in the playthrough: one runs ahead, the other boards; then the runner pilots
    const order = unstackOrder(g), R = order[0], crew = order.slice(1);
    if (!g.onSomeone(R)) g.onHead(R, crew[0]);
    g.drive(R, () => ({ mx: 1, jump: true }), () => g.P(R).x > r.x + r.w && g.P(R).grounded, 200, 'hop over the Mech');
    go(g, R, 20.6, { exact: true });
    for (const k of crew) g.board(k);
    handWindow(g, 99);
    g.board(R);
    g.tick(2, () => { const a: Inp[] = []; a[R] = { mx: 1 }; return a; });
    mechGo(g, R, 15, { onBelt: true });
    g.drive(R, () => ({ mx: 110 / 150 * 1.02 * Math.sign(15 * T - (r.x + r.w / 2) + 30) }), () => w.hands[0].state === 'lift', 900, 'Mech holds under the shelf');
    mechGo(g, R, 37); // smash the cracker wall, wait under the shelf past the scale
    handWindow(g, 99);
    mechGo(g, R, 33); // back onto the scale: the door opens
    g.waitFor(() => w.doors[0].open >= 1, 120, 'door open');
    mechGo(g, R, 50.5); // through the door before it shuts
    const x = spoonX(g) * T;
    g.drive(R, f => ({ mx: Math.abs(r.x + r.w / 2 - x) < 4 ? 0 : Math.sign(x - (r.x + r.w / 2)) * 0.3, jump: f % 50 < 34 }), () => w.spoonGot, 300, 'Mech jumps for the spoon');
    expect(w.spoonGot).toBe(true);
  });

  it('Grand Banquet: up on the pot rack off a friend\'s head, then jump', () => {
    const g = lv(5);
    const w = g.w;
    handGuard(g);
    // the playthrough's way up to the counter, for two
    line(g, 11.5);
    const crossers = g.order();
    const spots = [29.5, 27.5];
    crossers.forEach((k, i) => { handWindow(g, i === 1 ? 99 : 3.5); go(g, k, spots[i], { queue: i > 0 }); });
    const R = crossers[0], P = crossers[1], cube = w.crates[0];
    g.drive(R, () => ({ mx: 1, jump: true }), () => g.P(R).grounded && g.P(R).x > 32.2 * T, 200, 'hop the cube');
    go(g, R, 37);
    handWindow(g, 4);
    go(g, P, 29.6);
    g.step2(P, (cube.x - 18) / T);
    g.push(P, 32.4, () => cube.x >= 32 * T);
    g.waitFor(() => w.lifts[1].y < 11 * T - 80, 200, 'right pan up');
    g.jumpUp(R, 41, 7);
    g.walk(R, 41.5);
    go(g, P, 34.6);
    g.dropOff(P, 1);
    const lift = w.lifts[2];
    g.walk(P, 39.5);
    g.grab(R);
    g.waitFor(() => Math.abs(lift.y - Math.min(lift.ay, lift.by)) < 1, 400, 'lift up');
    // both on the counter (sheltered by the rack): one stands under the spoon, the other climbs
    g.walk(R, 47.5);
    g.walk(P, 46.5);
    handWindow(g, 4);
    g.climb(P, R, 4, 47.5);
    grabSpoon(g, P);
    expect(w.spoonGot).toBe(true);
  });
});
