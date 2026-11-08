// Whole-level playthroughs, World 6 (Dinner Service), played solo-style (one kaiju at a time).
import { describe, it } from 'vitest';
import { PHYS, T } from '../src/sim/constants';
import { isHazardTile } from '../src/sim/level';
import { DINNER_LEVELS } from '../src/sim/levels-dinner';
import type { Player, PlayerInput, World } from '../src/sim/world';
import { walker } from './helpers';
import { Play } from './play';

type Inp = Partial<PlayerInput>;
const lv = (i: number) => DINNER_LEVELS[i];
const COUNTS = [2, 6];
const cxOf = (b: { x: number; w: number }) => b.x + b.w / 2;
const H = PHYS.hand;

// ------------------------------------------------------------------ the Chef's Hand, like a player sees it
/** Seconds until the Hand next lands (0 while it is landing). */
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
/** Would a body at x be safe from a Hand landing at tx? */
function safeAt(w: World, b: { x: number; y: number; w: number; h: number }, x: number, tx: number): boolean {
  if (!(x + b.w > tx - H.w / 2 - 4 && x < tx + H.w / 2 + 4)) return true;
  return w.sheltered({ x, y: b.y, w: b.w, h: b.h });
}
function beltUnder(w: World, b: { x: number; y: number; w: number; h: number }) {
  return w.belts.find(bt => Math.abs(b.y + b.h - bt.y) < 1 && b.x + b.w > bt.x && b.x < bt.x + bt.w);
}

/**
 * Plays like a person watching the shadow: while the Hand is coming down, the kaiju being played
 * steps out of the shadow (or under shelter), or stands still if where it's going is under the Hand.
 * Under the 'reverse' ticket the player simply pushes the other way.
 */
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
        return safeAt(w, body, body.x + (mx * run + (jump ? 0 : drift)) * tt, h.tx); // (in the air the belt doesn't carry you)
      });
      const mine = Math.max(-1, Math.min(1, inp.mx ?? 0));
      if (ok(mine, !!inp.jump)) continue;
      const hold = drift ? Math.max(-1, Math.min(1, -drift / run)) : 0;
      const alt = [hold, 0, -1, 1, -0.5, 0.5].find(m => ok(m));
      g2.guarded!++;
      inp = { mx: alt ?? hold, grab: inp.grab }; // (no jumping while dodging)
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

// ------------------------------------------------------------------ moving about
/** How far right kaiju k may go before the shared screen stops it (centre, tiles). */
function reach(g: Play, k: number): number {
  const lo = Math.min(...g.w.players.filter(p => p.idx !== k).map(p => cxOf(p) / T));
  return Math.max(23.3, lo + 22.75);
}
/** Is there a hazard tile (mousetrap) just ahead of p's feet? */
function hazardAhead(w: World, p: Player, dir: number): boolean {
  const ww = w as unknown as { tileAt(c: number, r: number): number };
  const row = Math.floor((p.y + p.h + 2) / T);
  const x0 = dir > 0 ? p.x + p.w : p.x;
  for (let d = 0; d <= 26; d += 6) if (isHazardTile(ww.tileAt(Math.floor((x0 + dir * d) / T), row))) return true;
  return false;
}
/** Walk to x tiles like walk(), but also hop mousetraps and hop along belts (faster than walking on them). */
function go(g: Play, k: number, xT: number, opts: { queue?: boolean; hopBelt?: boolean; max?: number; exact?: boolean } = {}): void {
  const w = g.w, p = g.P(k), x = xT * T;
  const g2 = g as unknown as { guarded: number };
  let still = 0, last = p.x, guarded = g2.guarded ?? 0;
  g.drive(k, () => {
    const inp = walker(w, p, x, true);
    const dir = Math.sign(inp.mx ?? 0);
    if (p.grounded && dir && hazardAhead(w, p, dir)) inp.jump = true;
    if (!opts.queue && p.grounded && dir && friendAhead(w, p, dir, x)) inp.jump = true;
    if (opts.hopBelt !== false && p.grounded && dir && beltUnder(w, p)?.dir === -dir) inp.jump = true;
    if (!p.grounded && p.vy < 0) inp.jump = true;
    return inp;
  }, () => {
    const gd = g2.guarded ?? 0;
    still = Math.abs(p.x - last) < 0.2 && gd === guarded ? still + 1 : 0;
    guarded = gd; last = p.x;
    return p.grounded && (Math.abs(cxOf(p) - x) < 10 || (!!opts.queue && still > 60));
  }, opts.max ?? 1500, `${opts.queue ? 'queue' : 'go'} to ${xT.toFixed(2)}`);
  g.tick(3);
  if (opts.exact && Math.abs(cxOf(p) - x) < 12) { // shuffle onto the very spot (off a belt's end, too)
    g.drive(k, () => ({ mx: Math.abs(cxOf(p) - x) < 1.5 && !beltUnder(w, p) ? 0 : Math.sign(x - cxOf(p)) * (beltUnder(w, p) ? 1 : 0.25) }), () => p.grounded && Math.abs(cxOf(p) - x) < 2.5 && Math.abs(p.vx) < 1 && !beltUnder(w, p), 120, `shuffle to ${xT.toFixed(2)}`);
  }
}
function friendAhead(w: World, p: Player, dir: number, goal: number): boolean {
  return w.players.some(q => {
    if (q === p || q.inRobot >= 0) return false;
    const gap = dir > 0 ? q.x - (p.x + p.w) : p.x - (q.x + q.w);
    const beyond = dir > 0 ? goal > q.x + q.w : goal < q.x;
    return beyond && gap > -2 && gap < 6 && q.y < p.y + p.h - 8 && p.y < q.y + q.h - 8;
  });
}
/** Everyone (front first) to spots counting back from xT; waits for the Hand between moves. */
function line(g: Play, xT: number, gap = 0.9): void {
  for (let hop = 0; hop < 12; hop++) {
    const ord = g.order();
    const want = (i: number) => xT - i * gap;
    if (ord.every((k, i) => Math.abs(g.cx(k) - want(i) * T) < 12)) return;
    ord.forEach((k, i) => {
      const here = g.cx(k) / T, goal = Math.min(want(i), reach(g, k));
      if (Math.sign(goal - here) !== Math.sign(want(i) - here) || Math.abs(here - goal) < 0.3) return;
      handWindow(g, Math.abs(goal - here) * T / PHYS.run + 0.6);
      go(g, k, goal, { queue: true });
    });
  }
}

// ------------------------------------------------------------------ routes
function watchTheHand(g: Play): void {
  handGuard(g);
  const shelf = (s: number, wd = 6) => s + wd - 0.45; // the front spot under a shelf
  line(g, shelf(8));
  for (const s of [20, 32]) line(g, shelf(s));
  handWindow(g, 3);
  const f = g.order()[0];
  g.pick(f, 'soup');
  line(g, shelf(32));
  line(g, shelf(44));
  g.deliver(g.carrier('soup'));
  line(g, shelf(56, 7));
  g.finish();
}

/** Riders take the lever-lift up one at a time; `op` works the lever. Returns the next free spot. */
function ferry(g: Play, op: number, riders: number[], liftIdx: number, at: number, spot: number, gap = 0.9): number {
  const w = g.w, lift = w.lifts[liftIdx];
  const top = Math.min(lift.ay, lift.by), bot = Math.max(lift.ay, lift.by);
  for (const c of riders) {
    if (Math.abs(lift.y - bot) > 1) { g.grab(op); g.waitFor(() => Math.abs(lift.y - bot) < 1, 400, 'lift down'); }
    g.walk(c, at);
    g.grab(op);
    g.waitFor(() => Math.abs(lift.y - top) < 1, 400, 'lift up');
    g.walk(c, spot);
    spot -= gap;
  }
  return spot;
}

function balancingAct(g: Play): void {
  const w = g.w;
  if (g.n > 2) g.spread();
  const ord = g.order(), rest = ord.slice(0, g.n - 2), A = ord[g.n - 2], B = ord[g.n - 1];
  // the others go down to the floor first, queueing for the lift (not under the left pan: it sinks)
  rest.forEach((c, i) => {
    g.walk(c, 12.4);
    g.dropOff(c, 1);
    go(g, c, 16.4 - i * 0.9, { queue: true });
  });
  // A waits on the right pan; B climbs to the ledge and pushes the heavy cube onto the left pan
  g.walk(A, 15.5);
  const cube = w.crates[0];
  g.jumpUp(B, 7, 9);
  g.step2(B, (cube.x - 18) / T);
  g.push(B, 10.5, () => cube.x >= 10 * T);
  g.waitFor(() => w.lifts[1].y < 11 * T - 80, 200, 'right pan up');
  // A hops up onto the counter and works the lever: everyone else rides the lift
  g.jumpUp(A, 19, 7);
  g.walk(A, 19.5);
  let spot = ferry(g, A, rest, 2, 17.5, 28.5);
  // B comes down off the ledge and rides last
  g.walk(B, 13.2);
  spot = ferry(g, A, [B], 2, 17.5, spot);
  const free = g.order().filter(k => w.players[k].carry < 0);
  g.pick(free[0], 'cake');
  g.pick(free[1], 'pizza');
  g.gather(43);
  g.deliver(g.carrier('cake'));
  g.deliver(g.carrier('pizza'));
  g.finish();
}

/** Front first, but nobody leaves while someone is still standing on their head. */
function unstackOrder(g: Play): number[] {
  const w = g.w, left = g.order(), seq: number[] = [];
  const onTop = (q: Player, k: Player) => Math.abs(q.y + q.h - k.y) < 2 && q.x < k.x + k.w && q.x + q.w > k.x;
  while (left.length) {
    const i = left.findIndex(k => !left.some(j => j !== k && onTop(w.players[j], w.players[k])));
    seq.push(left.splice(i, 1)[0]);
  }
  return seq;
}
/** Someone free-handed who can already reach it grabs it; else the front free one fetches it. */
function take(g: Play, kind: string): number {
  const w = g.w, it = w.items.find(i => i.kind === kind && !i.delivered && i.carrier < 0);
  if (!it) throw new Error(`no ${kind} lying around`);
  const free = g.order().filter(k => w.players[k].carry < 0 && w.players[k].grounded);
  const near = free.find(k => { const p = w.players[k]; return p.x - 10 < it.x + PHYS.item && p.x + p.w + 10 > it.x && p.y - 10 < it.y + PHYS.item && p.y + p.h + 10 > it.y; });
  if (near !== undefined) { g.grab(near); if (w.players[near].carry === it.idx) return near; }
  pickG(g, free[0], kind);
  return free[0];
}
/** pick(), but hopping mousetraps and belts on the way. */
function pickG(g: Play, k: number, kind: string): void {
  const it = g.w.items.find(i => i.kind === kind && !i.delivered && i.carrier < 0);
  if (!it) throw new Error(`no ${kind} lying around`);
  go(g, k, (it.x + PHYS.item / 2) / T);
  g.grab(k);
  if (g.w.items[g.P(k).carry]?.kind !== kind) throw new Error(`P${k} failed to pick up ${kind} — ` + g.where());
}
/** Go and grab an ingredient wherever it is now (even while a belt is carrying it off). */
function snatch(g: Play, k: number, kind: string, side = -1): void {
  const w = g.w, p = g.P(k);
  const it = w.items.find(i => i.kind === kind && !i.delivered && i.carrier < 0);
  if (!it) throw new Error(`no ${kind} lying around`);
  g.drive(k, f => {
    const ix = it.x + PHYS.item / 2 + side * 26;
    const inp = walker(w, p, ix, true);
    const dir = Math.sign(inp.mx ?? 0);
    if (p.grounded && dir && hazardAhead(w, p, dir)) inp.jump = true;
    if (!p.grounded && p.vy < 0) inp.jump = true;
    const near = Math.abs(cxOf(p) - (it.x + PHYS.item / 2)) < 50 && Math.abs(p.y + p.h - (it.y + PHYS.item)) < 30;
    return { ...inp, grab: near && f % 2 === 0 };
  }, () => p.carry === it.idx, 900, `snatch the ${kind}`);
  g.tick(2);
}

function conveyorChaos(g: Play): void {
  handGuard(g);
  if (g.n > 2) g.spread();
  line(g, 7.4); // packed at the start of the backwards belt
  // over the backwards belt, front first, onto the floor between the belts (4 fit; more go on heads)
  const floor = [23.45, 22.55, 21.65, 20.75];
  const ord = g.order(), crossed: number[] = [];
  ord.forEach((k, i) => {
    handWindow(g, i === ord.length - 1 ? 6 : 3.5);
    if (i < floor.length) go(g, k, floor[i]);
    else {
      const h = crossed[floor.length - 1 - (i - floor.length)];
      go(g, k, g.cx(h) / T);
      if (!g.onSomeone(k)) throw new Error(`P${k} not on a head — ` + g.where());
    }
    crossed.push(k);
  });
  // on along the forward belt (grab the fries at its end), hop the traps, under the shelf
  const seq = unstackOrder(g);
  let spot = 45.2 + 0.9;
  seq.forEach((k, i) => {
    const last = i === seq.length - 1;
    if (i > 0) handWindow(g, last ? 6 : 3.5); // (the first one must get going: everyone is bunched up under the Hand)
    if (i === 1) snatch(g, k, 'fries');
    spot = Math.min(spot - 0.9, reach(g, k));
    // no room left past the traps (the shared screen holds the others back): wait on the safe tile before them
    go(g, k, spot < 39.6 ? 36.5 : spot);
  });
  line(g, 45.2);
  take(g, 'soup');
  line(g, 57.4);
  g.deliver(g.carrier('fries'));
  g.deliver(g.carrier('soup'));
  g.finish();
}

/** Line up some of the kaiju (front first) behind xT, never past the shared screen. */
function lineSome(g: Play, ks: number[], xT: number, gap = 0.9): void {
  unstackOrder(g).filter(k => ks.includes(k)).forEach((k, i) => {
    const goal = Math.min(xT - i * gap, reach(g, k));
    if (goal > g.cx(k) / T + 0.08) go(g, k, goal, { queue: true, exact: true });
  });
}

/** Wait (everyone resting) until the Hand will land in `secs` (the next time round, if that's already past). */
function timeTo(g: Play, secs: number): void {
  if (untilHit(g.w) < secs) handWindow(g, 99);
  g.waitFor(() => untilHit(g.w) <= secs, 900, `${secs}s before the Hand`);
}

function rushHour(g: Play): void {
  handGuard(g);
  const w = g.w;
  // the Hand comes early: the top of the front stack sets off over the long backwards belt at once,
  // so the team isn't one big target; then the others unstack and wait at the belt
  const first = unstackOrder(g)[0];
  const right: number[] = [first];
  go(g, first, 24.5, { exact: true }); // (rearmost spot: the shared screen leaves room in front for the rest)
  const left = () => g.order().filter(k => !right.includes(k));
  lineSome(g, left(), 7.5, 0.87);
  // one at a time, onto the floor before the traps (a tile apart: under the 'reverse' ticket a
  // kaiju walking away drags along whoever stands right behind it)
  while (left().length) {
    const L = left(), k = L[0], last = L.length === 1;
    const slot = (): number | null => {
      const r = Math.min(30.8, reach(g, k)), xs = right.map(j => g.cx(j) / T);
      if (Math.max(...xs) + 0.97 <= r + 0.1) return Math.min(Math.max(...xs) + 0.97, r);
      if (Math.min(...xs) - 0.97 >= 24.44) return Math.min(...xs) - 0.97;
      return null;
    };
    let t = slot();
    if (t === null) { lineSome(g, L, 7.5, 0.87); t = slot(); }
    if (t === null) throw new Error('no room past the belt — ' + g.where());
    // the last one times it so the Hand lands while it's still on the belt, then everyone moves on
    if (last) timeTo(g, 2.9); else handWindow(g, 3.5);
    if (w.items.some(i => i.kind === 'pizza' && i.carrier < 0) && reach(g, k) > 26.7) pickG(g, k, 'pizza');
    go(g, k, t, { exact: true });
    right.push(k);
  }
  // straight on: over the traps, under the first shelf (front first). No more room under it while
  // the last one is back at the belt: the others wait well short of it, and the last fetches the cake
  let spot = 49.5 + 0.9, open = 40;
  const runners = g.order();
  runners.forEach((k, i) => {
    const lastOne = i === runners.length - 1;
    if (i > 0) handWindow(g, lastOne ? 4.5 : 3);
    if (lastOne) pickG(g, k, 'cake');
    spot = Math.min(spot - 0.9, reach(g, k));
    if (spot >= 44.4) go(g, k, spot);
    else { go(g, k, open); open += 1; }
  });
  line(g, 49.5);
  const free = g.order().find(k => w.players[k].carry < 0);
  if (free !== undefined) {
    handWindow(g, 3);
    pickG(g, free, 'soup');
    line(g, 61.5);
    g.deliver(g.carrier('pizza'));
  } else { // (two kaiju, hands full: the pizza goes in first, then its carrier comes back for the soup)
    const a = g.carrier('pizza');
    handWindow(g, 4);
    g.deliver(a);
    handWindow(g, 3);
    pickG(g, a, 'soup');
  }
  g.deliver(g.carrier('cake'));
  g.deliver(g.carrier('soup'));
  g.finish();
}

/** Pilot k drives the Mech to x tiles: hops along backwards belts, hops when blocked, and can
 *  snatch an ingredient with the arm on the way. */
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

function headChef(g: Play): void {
  handGuard(g);
  const w = g.w, r = w.robots[0];
  // the top of the front stack runs on ahead (over the belt), so the first slam isn't on all of us
  const order = unstackOrder(g), R = order[0], crew = order.slice(1);
  if (!g.onSomeone(R)) g.onHead(R, crew[0]); // (the Mech is too tall to jump: hop it from a friend's head)
  g.drive(R, () => ({ mx: 1, jump: true }), () => g.P(R).x > r.x + r.w && g.P(R).grounded, 200, 'hop over the Mech');
  go(g, R, 20.6, { exact: true });
  for (const k of crew) g.board(k); // the first aboard pilots, for now
  handWindow(g, 99);
  // the runner comes back and climbs in too (now it's the pilot: the others have been napping)
  g.board(R);
  g.tick(2, () => { const a: Inp[] = []; a[R] = { mx: 1 }; return a; });
  if (r.roles[r.crew.indexOf(R)] !== 'all') throw new Error('runner is not the only pilot: ' + r.roles.join());
  mechGo(g, R, 15, { onBelt: true }); // under the shelf over the belt
  // hold still against the belt until the Hand has landed
  g.drive(R, () => ({ mx: 110 / 150 * 1.02 * Math.sign(15 * T - (r.x + r.w / 2) + 30) }), () => w.hands[0].state === 'lift', 900, 'Mech holds under the shelf');
  // smash the cracker wall, scoop up the fries, over the scale, under the next shelf: toss the fries ahead
  mechGo(g, R, 37, { snatch: 'fries' });
  if (r.carry < 0) throw new Error('the Mech missed the fries');
  g.grab(R);
  handWindow(g, 99);
  mechGo(g, R, 33); // back onto the scale: the door opens and stays open
  g.waitFor(() => w.doors[0].open >= 1, 120, 'door open');
  // everyone hops out and waits just past the door (the Hand aims between them and the Mech)
  const all = [R, ...crew];
  all.forEach((k, i) => {
    const lastOne = i === all.length - 1;
    if (lastOne) handWindow(g, 6);
    g.unboard(k);
    if (i === 0) pickG(g, k, 'fries');
    if (i === 1) pickG(g, k, 'pizza');
    go(g, k, 47.5 - i * 0.9, { queue: true });
  });
  // then on to the plate, front first (fries first into the pot): the ones ahead stay well clear of
  // the ones behind, so the Hand (aiming between) never lands on anybody
  let spot = 73.5 + 0.9;
  const pot = w.pots[0];
  g.order().forEach((k, i, ord) => {
    if (i === 0) { /* must get going: the last one out just joined the others */ } else handWindow(g, i === ord.length - 1 ? 4.5 : 3);
    const it = w.players[k].carry;
    if (it >= 0) {
      go(g, k, (pot.x - 20) / T);
      g.grab(k);
      if (!w.items[it].delivered) throw new Error(`P${k} failed to deliver — ` + g.where());
    }
    spot = Math.min(spot - 0.9, reach(g, k));
    go(g, k, spot, { queue: true });
  });
  line(g, 73.5);
  g.finish();
}

function grandBanquet(g: Play): void {
  handGuard(g);
  const w = g.w;
  if (g.n > 2) g.spread();
  line(g, 11.5); // under the first shelf
  // over the backwards belt, front first: the first grabs the soup and waits up on the cube's ledge,
  // the others on the floor and the stairs (all well clear of where the Hand aims)
  const spots = [29.5, 27.5, 26.5, 25.5, 24.6, 23.7];
  const crossers = g.order();
  crossers.forEach((k, i) => {
    const last = i === crossers.length - 1;
    handWindow(g, last ? 99 : 3.5);
    if (i === 0) pickG(g, k, 'soup');
    go(g, k, spots[Math.min(i, spots.length - 1)], { queue: i > 0 });
  });
  // the first hops the cube onto the right pan (under the pot rack); the next pushes the cube onto the left pan
  const R = crossers[0], cube = w.crates[0];
  g.drive(R, () => ({ mx: 1, jump: true }), () => g.P(R).grounded && g.P(R).x > 32.2 * T, 200, 'hop the cube');
  go(g, R, 37);
  const P = g.order().filter(k => k !== R)[0];
  handWindow(g, 4);
  go(g, P, 29.6);
  g.step2(P, (cube.x - 18) / T);
  g.push(P, 32.4, () => cube.x >= 32 * T);
  g.waitFor(() => w.lifts[1].y < 11 * T - 80, 200, 'right pan up');
  // the rider hops up onto the counter and works the lever; the pusher comes down for the lift
  g.jumpUp(R, 41, 7);
  g.walk(R, 41.5);
  const down = (k: number) => {
    if (g.feet(k) < 9.5 * T) { go(g, k, 31.2); g.dropOff(k, 1); }
    go(g, k, 34.6);
    g.dropOff(k, 1);
  };
  down(P);
  let spot = ferry(g, R, [P], 2, 39.5, Math.min(45.4, reach(g, P)));
  // the rest, one at a time: up the stairs, over the ledge, down past the pans and up the lift
  for (const k of g.order().filter(j => g.feet(j) > 7.5 * T)) {
    handWindow(g, 3);
    go(g, k, 29.6);
    down(k);
    spot = ferry(g, R, [k], 2, 39.5, Math.min(spot, reach(g, k)));
  }
  // the cake, then off the counter onto the floor past it, front first; the last one stays back
  // on the counter (under the rack), so the Hand aims at the empty counter edge, not the floor
  take(g, 'cake');
  const X = g.order()[g.n - 1];
  const floorSlots = [54.5, 53.6, 52.7, 51.8, 50.9];
  const offCounter = (k: number, xT: number) => { go(g, k, 49.4); g.dropOff(k, 1); go(g, k, xT, { exact: true }); };
  unstackOrder(g).filter(k => k !== X).forEach((k, i) => { handWindow(g, 2.5); offCounter(k, floorSlots[i]); });
  // in one go: the last one to the counter's end, the front one over the belt and the traps
  // (the Hand now aims over the belt, between the floor and the ones ahead)
  const free = (k: number) => w.players[k].carry < 0;
  const pizzaFree = () => w.items.some(i => i.kind === 'pizza' && i.carrier < 0 && !i.delivered);
  const bSlots = [71.4, 70.5, 67.48];
  handWindow(g, 99);
  go(g, X, 49.4, { exact: true });
  const F = g.order().filter(k => k !== X);
  const toB = F.slice(0, Math.min(bSlots.length, F.length));
  // whoever has free hands takes the spot by the pizza (at the belt's end)
  if (pizzaFree() && toB.length === bSlots.length && !free(toB[2])) {
    const j = toB.findIndex(free);
    if (j >= 0) [toB[2], toB[j]] = [toB[j], toB[2]];
  }
  toB.forEach((k, i) => {
    if (i > 0) handWindow(g, 3);
    if (pizzaFree() && free(k) && (i === 2 || toB.length < bSlots.length)) snatch(g, k, 'pizza');
    go(g, k, bSlots[i], { exact: true });
  });
  // the rest of the floor shuffle forward, the last one comes down off the counter
  lineSome(g, F.filter(k => !toB.includes(k)), 54.5, 0.9);
  const rear = Math.min(...w.players.filter(p => p.idx !== X && cxOf(p) < 60 * T).map(p => cxOf(p) / T), 55.4);
  offCounter(X, rear - 0.9);
  // everyone under the next shelf (the fries are just past it), then the one after
  line(g, 77.5);
  if (w.players.some(p => p.carry < 0)) take(g, 'fries');
  line(g, 89.5);
  // into the pot in recipe order, then onto the plate
  const carried = (kind: string) => w.items.some(i => i.kind === kind && i.carrier >= 0);
  handWindow(g, 4);
  g.deliver(g.carrier('soup'));
  handWindow(g, 4);
  g.deliver(g.carrier('cake'));
  if (!carried('pizza')) {
    // two kaiju, hands were full: back for the pizza (by the traps) and the fries (by the first shelf)
    const [front, back] = g.order();
    handWindow(g, 4);
    go(g, front, 89.5);
    handWindow(g, 4);
    pickG(g, back, 'pizza');
    go(g, back, 76.5);
    handWindow(g, 3);
    pickG(g, front, 'fries');
    go(g, front, 77.45, { exact: true }); // back under the shelf
  }
  handWindow(g, 4);
  g.deliver(g.carrier('pizza'));
  handWindow(g, 4);
  g.deliver(g.carrier('fries'));
  g.finish();
}

const ROUTES: [number, (g: Play) => void][] = [[0, watchTheHand], [1, balancingAct], [2, conveyorChaos], [3, rushHour], [4, headChef], [5, grandBanquet]];

describe('World 6 playthroughs (solo-style: one kaiju at a time)', () => {
  for (const [i, route] of ROUTES) {
    for (const n of COUNTS) {
      it(`${i + 1}. ${lv(i).name} with ${n} kaiju`, () => route(new Play(lv(i), n)));
    }
  }
});
