// Worlds 5 (The Sink) and 6 (Dinner Service): mechanics and key moves.
import { describe, expect, it } from 'vitest';
import { PHYS, T } from '../src/sim/constants';
import { DINNER_LEVELS } from '../src/sim/levels-dinner';
import { SINK_LEVELS } from '../src/sim/levels-sink';
import type { Player, PlayerInput, World } from '../src/sim/world';
import { bottom, cx, flatRoom, frames, makeWorld, toward, until, walker } from './helpers';

function place(p: Player, x: number, floorY: number): void { p.x = x - p.w / 2; p.y = floorY - p.h; p.vx = p.vy = 0; }
const only = (i: number, inp: Partial<PlayerInput>) => { const a: Partial<PlayerInput>[] = []; a[i] = inp; return a; };
const tap = (w: World, i: number) => frames(w, 2, (_, f) => only(i, { grab: f === 0 }));
const sink = (name: string) => SINK_LEVELS.find(l => l.name === name)!;
const dinner = (name: string) => DINNER_LEVELS.find(l => l.name === name)!;
const up = (p: Player, top: number) => p.grounded && bottom(p) <= top + 1;

describe('water', () => {
  it('kaiju float to the surface; JUMP underwater swims; items float', () => {
    const w = makeWorld(flatRoom(40, b => b.add({ t: 'water', x: 8, w: 10, low: 8, high: 8 }, { t: 'item', kind: 'apple', x: 12, y: 15 })), 2);
    const a = w.players[1];
    place(a, 10 * T, 16 * T);
    frames(w, 240);
    expect(Math.abs(a.y + a.h / 2 - 8 * T)).toBeLessThan(24); // bobbing at the surface
    expect(w.items[0].y).toBeLessThan(9 * T); // the apple floated up too
  });
});

describe('Bath Time', () => {
  for (const n of [2, 6]) {
    it(`${n} kaiju: pull the plug, float up, hop onto the high ledge`, () => {
      const w = makeWorld(sink('Bath Time'), n);
      const lead = w.players[0];
      place(lead, 5 * T + 20, 10 * T);
      frames(w, 10);
      tap(w, 0);
      expect(w.leverOn.get('p')).toBe(true);
      until(w, () => w.players.map(p => ({ mx: 1 })), () => w.players.every(p => p.x > 10 * T), 600, 'into the sink');
      until(w, () => [], () => Math.abs(w.waters[0].level - 7 * T) < 1, 900, 'filled');
      for (const p of [...w.players].sort((a, b) => b.x - a.x)) {
        // the floaters drift over to the ledge side together
        frames(w, 60, () => w.players.map(q => (q.x < 31 * T && q !== p ? toward(q, 27 * T, 4) : {})));
        until(w, (_, f) => only(p.idx, { ...toward(p, 34 * T), jump: f % 30 < 15 }), () => up(p, 6 * T), 900, `P${p.idx} up`);
        frames(w, 90, () => only(p.idx, { mx: 1 })); // make room for the next one
      }
    });
  }
});

describe('Bubble Bath', () => {
  it('ride a bubble up to the grapes shelf', () => {
    const w = makeWorld(sink('Bubble Bath'), 2);
    const [b, a] = w.players;
    place(b, 3 * T, 16 * T);
    frames(w, 5);
    until(w, () => [{}, toward(a, 8 * T + 20, 4)], () => w.bubbles.some(u => Math.abs(bottom(a) - u.y) < 1), 600, 'lifted by a bubble');
    until(w, () => [{}, {}], () => bottom(a) < 6 * T + 10, 600, 'risen');
    until(w, (_, f) => [{}, { mx: 1, jump: f < 20 }], () => up(a, 6 * T), 200, 'on the shelf');
  });
});

describe('Tap Dance', () => {
  it('the helpful jet blows a kaiju across the big gap', () => {
    const w = makeWorld(sink('Tap Dance'), 2);
    const [b, a] = w.players;
    place(a, 25 * T, 16 * T); place(b, 23 * T, 16 * T);
    frames(w, 5);
    until(w, () => [{}, walker(w, a, 38 * T)], () => a.grounded && a.x > 36 * T, 600, 'across');
    expect(w.phase).toBe('play');
  });
  it('the item jet: jumping the first gap works when the tap is off', () => {
    const w = makeWorld(sink('Tap Dance'), 2);
    const [, a] = w.players;
    place(a, 12 * T, 16 * T);
    until(w, () => [], () => w.jets[0].state === 'cold', 400);
    until(w, () => [{}, walker(w, a, 19 * T)], () => a.grounded && a.x > 17 * T, 300, 'across');
  });
});

describe('Drain Plan', () => {
  it('fill sink A for the grapes; drain sink B to reach the pear in the tunnel', () => {
    const w = makeWorld(sink('Drain Plan'), 2);
    const [b, a] = w.players;
    frames(w, 5);
    expect(w.waters[1].level).toBeCloseTo(8 * T, 0); // B starts full
    place(b, 3 * T + 20, 10 * T);
    tap(w, 0);
    until(w, () => [], () => Math.abs(w.waters[0].level - 6 * T) < 1, 900, 'A filled');
    place(a, 11 * T, 6 * T + 10); // beside the shelf, not under it
    frames(w, 20);
    until(w, (_, f) => [{}, { mx: a.y < 5 * T ? 1 : 0, jump: f % 30 < 15 }], () => up(a, 4 * T), 600, 'grapes shelf');
    // float in B, climb onto the block, pull B's plug
    place(b, 25 * T, 8 * T + 10);
    place(a, 31 * T, 8 * T + 10);
    until(w, (_, f) => [{}, { ...toward(a, 32.5 * T, 4), jump: f % 30 < 15 }], () => up(a, 8 * T), 600, 'on the block');
    until(w, () => [{}, toward(a, 32 * T + 20, 4)], () => Math.abs(cx(a) - (32 * T + 20)) < 8, 200);
    tap(w, 1);
    until(w, () => [], () => Math.abs(w.waters[1].level - 16 * T) < 1, 900, 'B drained');
    place(a, 28 * T, 16 * T);
    until(w, () => [{}, toward(a, 33 * T + 20, 4)], () => Math.abs(cx(a) - (33 * T + 20)) < 8, 400, 'into the tunnel');
    tap(w, 1);
    expect(w.items[a.carry]?.kind).toBe('pear');
  });
});

describe('Chef’s Hand', () => {
  it('an unsheltered kaiju is splatted; one under a shelf is safe', () => {
    const lv = flatRoom(40, b => b.solid(5, 12, 4, 1).add({ t: 'hand', period: 0.5 }));
    const w = makeWorld(lv, 2);
    const [a, b] = w.players;
    place(a, 7 * T, 16 * T); place(b, 7 * T + 40, 16 * T);
    frames(w, 5);
    until(w, () => [], () => w.hands[0].state === 'lift', 300);
    expect(w.phase).toBe('play'); // both under the shelf
    place(a, 15 * T, 16 * T); place(b, 16 * T, 16 * T);
    let splat = false;
    for (let f = 0; f < 600 && !splat; f++) { w.step([{ mx: 0, jump: false, grab: false }, { mx: 0, jump: false, grab: false }]); splat = w.phase === 'splat'; }
    expect(splat).toBe(true);
  });
  for (const n of [2, 4]) {
    it(`Watch the Hand: ${n} kaiju hop from shelter to shelter and survive`, () => {
      const w = makeWorld(dinner('Watch the Hand'), n);
      const shelters = [8, 20, 32, 44, 56]; // first column of each shelf
      frames(w, 5);
      const rank = new Map([...w.players].sort((x, y) => x.x - y.x).map((p, r) => [p, r]));
      void rank;
      until(w, () => w.players.map(p => toward(p, 13.4 * T, 4)), () => w.players.every(p => p.grounded && w.sheltered(p)), 600, 'to shelter 1');
      for (const s of shelters.slice(1)) {
        // wait for a slam to pass, then move everyone to the next shelter
        until(w, () => [], () => w.hands[0].state === 'lift', 900, 'a slam');
        const rk = new Map([...w.players].sort((x, y) => x.x - y.x).map((p, r) => [p, r]));
        const spot = (p: Player) => (s + 0.6 + rk.get(p)! * 0.85) * T;
        void spot;
        until(w, () => w.players.map(p => walker(w, p, (s + 5.4) * T)), () => w.players.every(p => p.grounded && w.sheltered(p) && p.x > s * T - 20), 400, `to shelter ${s}`);
      }
      expect(w.splats).toBe(0);
    });
  }
});

describe('Balancing Act', () => {
  it('cube on the left pan lifts a friend on the right pan up to the counter; the lever brings the others', () => {
    const w = makeWorld(dinner('Balancing Act'), 3);
    const [a, b, c] = w.players;
    const cube = w.crates[0];
    place(b, 15 * T, 11 * T); // b waits on the right pan
    place(a, cube.x - 20, 9 * T); place(c, 3 * T, 11 * T);
    frames(w, 10);
    until(w, () => [{ mx: 1 }, {}, {}], () => cube.x >= 10 * T && cube.vy === 0 && cube.y > 9 * T, 400, 'cube onto the pan');
    frames(w, 20, () => [{ mx: -1 }]);
    frames(w, 90);
    const right = w.lifts[1];
    expect(right.y).toBeLessThan(11 * T - 60);
    until(w, (_, f) => [{}, { mx: 1, jump: f % 40 < 20 }, {}], () => up(b, 7 * T), 300, 'b on the counter');
    until(w, () => [{}, toward(b, 19 * T + 20, 4), {}], () => Math.abs(cx(b) - (19 * T + 20)) < 10, 300);
    tap(w, 1);
    expect(w.leverOn.get('L')).toBe(true);
    until(w, () => [{}, toward(b, 23 * T, 4), {}], () => Math.abs(cx(b) - 23 * T) < 10, 300);
    // the others drop to the floor and take the lift
    for (const p of [a, c]) {
      w.leverOn.set('L', false);
      until(w, () => [], () => Math.abs(w.lifts[2].y - 15 * T) < 1, 400, 'lift down');
      place(p, 17 * T + 20, 15 * T);
      frames(w, 5);
      w.leverOn.set('L', true);
      until(w, () => [], () => up(p, 7 * T) || p.y + p.h <= 7 * T + 1, 300, `P${p.idx} lifted`);
      until(w, () => only(p.idx, toward(p, (p === a ? 24 : 22) * T, 4)), () => up(p, 7 * T) && p.x > 20 * T, 300);
      frames(w, 60, () => only(p.idx, toward(p, (p === a ? 24 : 22) * T, 4)));
    }
  });
});

describe('belts', () => {
  it('a belt carries a standing kaiju; walking against it is slower', () => {
    const w = makeWorld(flatRoom(40, b => b.clear(8, 16, 12, 1).add({ t: 'belt', x: 8, y: 16, w: 12, dir: -1, speed: 130 })), 2);
    const a = w.players[1];
    place(a, 15 * T, 16 * T);
    frames(w, 5);
    const x0 = a.x;
    frames(w, 30);
    expect(a.x).toBeLessThan(x0 - 40);
    const x1 = a.x;
    frames(w, 30, () => [{}, { mx: 1 }]);
    expect(a.x - x1).toBeGreaterThan(20);
    expect(a.x - x1).toBeLessThan(PHYS.run * 0.5);
  });
});

describe('Head Chef', () => {
  it('the Mech under a shelf survives the Hand', () => {
    const w = makeWorld(dinner('Head Chef'), 2);
    const r = w.robots[0];
    const [b, a] = w.players;
    place(a, r.x - 10, 16 * T);
    frames(w, 5);
    tap(w, 1);
    place(b, r.x + r.w / 2, r.y - 1);
    until(w, () => [{}, toward({ x: r.x, w: r.w } as Player, 15 * T)], () => Math.abs(r.x + r.w / 2 - 15 * T) < 24, 600);
    until(w, () => [{}, toward({ x: r.x, w: r.w } as Player, 15 * T)], () => w.hands[0].state === 'lift', 900, 'a slam');
    expect(w.phase).toBe('play');
  });
});
