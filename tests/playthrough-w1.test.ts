// Whole-level playthroughs, World 1 (Counter Top), played solo-style (one kaiju at a time).
import { describe, it } from 'vitest';
import { T } from '../src/sim/constants';
import { COUNTER_LEVELS } from '../src/sim/levels';
import { Play } from './play';

const lv = (i: number) => COUNTER_LEVELS[i];
const COUNTS = [2, 6];

function shelfHelp(g: Play): void {
  const w = g.w, [A, B, ...rest] = g.order();
  const lift = w.lifts[0];
  g.walk(A, 13.5); // stand on the lift, against the counter
  g.walk(B, 12.6);
  g.onHead(B, A);
  g.jumpUp(B, 15, 13);
  g.pull(B); // lift up
  g.waitFor(() => Math.abs(lift.y - 13 * T) < 1, 300, 'lift up');
  let arrived = 0;
  g.walk(A, 19.5 - arrived++ * 0.9);
  for (const c of rest) {
    g.grab(B); // lift down
    g.waitFor(() => Math.abs(lift.y - 16 * T) < 1, 300, 'lift down');
    g.walk(c, 12.5);
    g.grab(B); // lift up
    g.waitFor(() => Math.abs(lift.y - 13 * T) < 1, 300, 'lift up');
    g.walk(c, 19.5 - arrived++ * 0.9);
  }
  g.pick(B, 'bread');
  g.deliver(B);
  g.finish();
}

function weighIn(g: Play): void {
  const w = g.w, [A, B] = g.order();
  // bread from the high shelf
  g.walk(A, 18);
  g.walk(B, 17);
  g.climb(B, A, 13, 18.5);
  g.jumpUp(B, 21, 11);
  g.pick(B, 'bread');
  // everyone onto the scale (5 fit side by side, a 6th on someone's head)
  const team = g.order();
  team.forEach((k, i) => g.walk(k, 15.5 - i * 0.92));
  g.waitFor(() => w.scales[0].active, 60, 'scale active');
  // the last one pushes the whole line through the door before the timer runs out
  const back = [...team].reverse().find(k => !g.onSomeone(k))!; // a rider on a head can't push the line
  g.push(back, 30, () => w.players.every(p => p.x > 26 * T));
  g.gather(36);
  const front = g.order().find(k => w.players[k].carry < 0)!;
  g.pick(front, 'cheese');
  g.deliver(front);
  g.deliver(B);
  g.finish();
}

function sugarCubes(g: Play): void {
  const w = g.w, [A, B, ...rest] = g.order();
  const small = w.crates[0];
  g.step2(A, (small.x - 18) / T);
  g.push(A, 14.2, () => small.x >= 14 * T);
  g.jumpUp(A, (small.x + 20) / T, 15);
  g.walk(B, (small.x - 30) / T);
  g.climb(B, A, 12, 15.5); // via A's head, up through the shelf
  g.pick(B, 'tomato');
  g.walk(B, 18.5);
  rest.forEach((c, i) => g.walk(c, 11 - i * 0.9));
  // the ×2 cube: A pushes B who pushes the cube, into the scale pit
  const big = w.crates[1];
  g.step2(B, (big.x - 18) / T);
  g.walk(A, 17.5);
  g.step2(A, (B === A ? 0 : (w.players[B].x - 18) / T));
  g.push(A, 40, () => w.doors[0].open >= 1);
  g.gather(36);
  g.order().forEach((k, i) => g.walk(k, 42 - i * 0.9));
  g.deliver(B);
  g.finish();
}

function popUp(g: Play): void {
  const w = g.w, [A, B, ...rest] = g.order();
  g.walk(A, 16); // onto the toaster (hands free: up top, A works the lever)
  g.pull(B, 0); // floor lever
  g.drive(A, () => ({ mx: 1 }), () => w.players[A].grounded && w.players[A].y + w.players[A].h <= 8 * T + 1, 300, 'launched onto the counter');
  let spot = 26, puller = A;
  const launch = (c: number) => {
    g.walk(c, 16);
    g.walk(puller, 21.2);
    g.grab(puller);
    g.drive(c, () => ({ mx: 1 }), () => w.players[c].grounded && w.players[c].y + w.players[c].h <= 8 * T + 1, 300, 'launched');
    g.walk(puller, spot); // make way; the new arrival takes over the lever
    spot -= 0.9;
    puller = c;
  };
  g.pick(B, 'bread'); // B brings the bread up (first, so walking back doesn't shove the others left)
  rest.forEach((c, i) => g.walk(c, 13.5 - i * 0.9));
  for (const c of [B, ...rest]) launch(c);
  g.pick(A, 'egg');
  g.deliver(A);
  g.deliver(B);
  g.finish();
}

function hotHob(g: Play): void {
  const w = g.w;
  const [bA, bB] = w.burners;
  g.spread(); // nobody rides on a head over the hob
  // burner A, one at a time when it has just cooled
  g.order().forEach((k, i) => {
    g.waitFor(() => bA.state === 'hot', 400, 'burner A hot');
    g.waitFor(() => bA.state === 'cold', 200, 'burner A cool');
    g.walk(k, 23.2 - i * 0.86);
  });
  // the shuttle spatula over the hot pit, one at a time
  const sh = w.lifts[0];
  g.order().forEach((k, i) => {
    g.walk(k, 23.5);
    g.waitFor(() => Math.abs(sh.x - sh.ax) < 1 && sh.wait > 0.4, 900, 'shuttle at start');
    g.drive(k, f => ({ mx: 1, jump: f < 12 }), () => w.players[k].grounded && Math.abs(w.players[k].y + w.players[k].h - sh.y) < 1, 120, 'onto the shuttle');
    g.drive(k, () => ({ mx: Math.sign(sh.x + sh.w / 2 - (w.players[k].x + 17)) * 0.4 }), () => Math.abs(sh.x - sh.bx) < 1, 900, 'ride');
    g.walk(k, 41.5 - i * 0.9);
  });
  g.gather(43.5);
  const team = g.order();
  g.pick(team[0], 'ham');
  // everyone on the scale, then the back one pushes the line through burner B and the door
  team.forEach((k, i) => g.walk(k, 49.5 - i * 0.92));
  g.waitFor(() => w.scales[0].active, 60, 'scale active');
  g.waitFor(() => bB.state === 'hot', 400, 'burner B hot');
  g.waitFor(() => bB.state === 'cold', 200, 'burner B cool');
  g.push(team[team.length - 1], 64, () => w.players.every(p => p.x > 58 * T));
  g.gather(62);
  g.deliver(team[0]);
  const f = g.order()[0];
  g.pick(f, 'cheese');
  g.deliver(f);
  g.finish();
}

function sandwichRush(g: Play): void {
  const w = g.w, ord = g.order(), rest = ord.slice(2);
  const [low, top] = ord;
  g.pick(low, 'bread');
  g.walk(low, 12.5);
  g.walk(top, 11.6);
  g.climb(top, low, 13, 14.5); // top is up on the counter
  rest.forEach((c, i) => g.walk(c, 9.6 - i * 0.9)); // queue by the toaster
  // everyone else pops up on the toaster (top works the lever); arrivals land past the lever and walk on
  let spot = 27.5;
  g.walk(top, 15.5);
  for (const c of [low, ...rest]) {
    g.walk(c, 11);
    g.grab(top);
    g.drive(c, () => ({ mx: 1 }), () => w.players[c].grounded && w.players[c].y + w.players[c].h <= 13 * T + 1 && w.players[c].x > 16 * T, 300, 'popped up');
    g.walk(c, spot);
    spot -= 0.9;
  }
  g.pick(top, 'ham');
  // down off the counter, front two first: F to the ×2 cube, S right behind (S pushes F pushes the cube)
  const cube = w.crates[0];
  const [F, S] = g.order();
  g.walk(F, 30.5); g.dropOff(F, 1);
  g.step2(F, (cube.x - 18) / T);
  g.walk(S, 30.5); g.dropOff(S, 1);
  g.step2(S, (w.players[F].x - 18) / T);
  g.push(S, 45, () => w.doors[0].open >= 1);
  g.gather(53);
  // cheese from the shelf: one boosts the other (two with free hands if there are, else after delivering)
  const boost = () => {
    const [X, Y] = g.order().filter(k => w.players[k].carry < 0);
    g.walk(X, 55);
    g.walk(Y, 53.8);
    g.onHead(Y, X);
    g.jumpUp(Y, 55.5, 13);
    g.pick(Y, 'cheese');
  };
  const free = w.players.filter(p => p.carry < 0).length;
  if (free >= 2) boost();
  const spare = g.order().find(k => w.players[k].carry < 0);
  if (free >= 3 && spare !== undefined) g.pick(spare, 'bread'); // the 2nd bread, before it's left behind
  g.gather(64.5); // up to the pot, so nobody is held back by the shared screen
  g.deliver(g.carrier('bread'));
  g.deliver(g.carrier('ham'));
  if (free < 2) { g.gather(56); boost(); }
  g.deliver(g.carrier('cheese'));
  const last = w.items.some(i => i.kind === 'bread' && i.carrier >= 0) ? g.carrier('bread') : g.order().find(k => w.players[k].carry < 0)!;
  if (w.players[last].carry < 0) g.pick(last, 'bread');
  g.deliver(last);
  g.finish();
}


const ROUTES: [number, (g: Play) => void][] = [[0, shelfHelp], [1, weighIn], [2, sugarCubes], [3, popUp], [4, hotHob], [5, sandwichRush]];

describe('World 1 playthroughs (solo-style: one kaiju at a time)', () => {
  for (const [i, route] of ROUTES) {
    for (const n of COUNTS) {
      it(`${i + 1}. ${lv(i).name} with ${n} kaiju`, () => route(new Play(lv(i), n)));
    }
  }
});
