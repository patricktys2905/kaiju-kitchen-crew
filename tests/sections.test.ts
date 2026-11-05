// Each tricky move in levels 2-6, set up directly and played with real inputs, for 2..6 kaiju where
// the count matters. (Level 1 is played start-to-finish in levels.test.ts.)
import { describe, expect, it } from 'vitest';
import { MAX_PLAYERS, MIN_PLAYERS, PHYS, T } from '../src/sim/constants';
import { LEVELS } from '../src/sim/levels';
import type { Player, PlayerInput, World } from '../src/sim/world';
import { bottom, cx, frames, makeWorld, toward, until } from './helpers';

/** Put a kaiju so its feet are on `floorY`, centred on x. */
function place(p: Player, x: number, floorY: number): void {
  p.x = x - p.w / 2; p.y = floorY - p.h; p.vx = p.vy = 0;
}
const only = (i: number, inp: Partial<PlayerInput>) => { const a: Partial<PlayerInput>[] = []; a[i] = inp; return a; };
const tap = (w: World, i: number) => frames(w, 2, (_, f) => only(i, { grab: f === 0 }));
const lvl = (name: string) => LEVELS.find(l => l.name === name)!;

describe('Weigh-In', () => {
  it('a kaiju boosted by a friend reaches the high shelf with the bread', () => {
    const w = makeWorld(lvl('Weigh-In'), 2);
    const [a, b] = w.players;
    place(a, 17 * T + 20, 16 * T); place(b, 16 * T, 16 * T);
    frames(w, 10);
    until(w, (_, f) => [{}, { ...toward(b, cx(a)), jump: f % 40 < 25 }], () => b.grounded && Math.abs(bottom(b) - a.y) < 1, 400, 'onto a');
    until(w, (_, f) => [{}, { ...toward(b, 18.5 * T), jump: f % 50 < 30 }], () => b.grounded && Math.abs(bottom(b) - 13 * T) < 1, 400, 'onto shelf A');
    frames(w, 5);
    until(w, (_, f) => [{}, { ...toward(b, 21 * T), jump: f % 50 < 30 }], () => b.grounded && Math.abs(bottom(b) - 11 * T) < 1, 400, 'onto shelf B');
    until(w, () => [{}, toward(b, 21 * T + 20)], () => Math.abs(cx(b) - (21 * T + 20)) < 4, 300);
    tap(w, 1);
    expect(w.items[b.carry]?.kind).toBe('bread');
  });
  for (let n = MIN_PLAYERS; n <= MAX_PLAYERS; n++) {
    it(`${n} kaiju fit on the scale, and the timer lets them all through the door`, () => {
      const w = makeWorld(lvl('Weigh-In'), n);
      w.players.forEach((p, i) => place(p, 11 * T + 20 + (i % 5) * 38, 15 * T - (i >= 5 ? PHYS.ph + 1 : 0)));
      frames(w, 20);
      expect(w.scales[0].active).toBe(true);
      until(w, (_, f) => w.players.map((p, i) => ({ mx: 1, jump: (f + i * 9) % 30 < 12 })), () => w.players.every(p => p.x > 26 * T), 600, 'all through');
    });
  }
});

describe('Sugar Cubes', () => {
  it('little cube under the shelf + a friend on it reaches the tomato', () => {
    const w = makeWorld(lvl('Sugar Cubes'), 2);
    const [a, b] = w.players;
    const cube = w.crates[0];
    place(a, cube.x - 20, 16 * T); place(b, cube.x - 60, 16 * T);
    frames(w, 10);
    until(w, () => [{ mx: 1 }, { mx: 1 }], () => cube.x >= 14 * T, 400, 'cube under shelf');
    frames(w, 10);
    // a climbs the cube, b climbs a, then jumps up through the shelf
    until(w, (_, f) => [{ ...toward(a, cube.x + cube.w / 2), jump: f % 40 < 20 && bottom(a) > cube.y }, {}], () => a.grounded && Math.abs(bottom(a) - cube.y) < 1 && Math.abs(cx(a) - (cube.x + cube.w / 2)) < 6, 400, 'a on cube');
    until(w, (_, f) => [{}, { ...toward(b, cx(a)), jump: f % 40 < 20 }], () => b.grounded && Math.abs(bottom(b) - a.y) < 1, 600, 'b on a');
    until(w, (_, f) => [{}, { mx: 0.3, jump: f % 50 < 30 }], () => b.grounded && Math.abs(bottom(b) - 12 * T) < 1, 300, 'b on shelf');
    until(w, () => [{}, toward(b, 15 * T + 20)], () => Math.abs(cx(b) - (15 * T + 20)) < 4, 300);
    tap(w, 1);
    expect(w.items[b.carry]?.kind).toBe('tomato');
  });
  for (let n = MIN_PLAYERS; n <= MAX_PLAYERS; n++) {
    it(`${n} kaiju push the big cube into the scale pit and the door opens`, () => {
      const w = makeWorld(lvl('Sugar Cubes'), n);
      const big = w.crates[1];
      w.players.forEach((p, i) => place(p, big.x - 20 - i * 36, 16 * T));
      frames(w, 10);
      until(w, () => w.players.map(() => ({ mx: 1 })), () => w.doors[0].open >= 1, 900, 'door open');
      until(w, (_, f) => w.players.map((p, i) => ({ mx: 1, jump: (f + i * 9) % 30 < 12 })), () => w.players.every(p => p.x > 38 * T), 900, 'all through');
    });
  }
});

describe('Pop-Up', () => {
  it('the toaster pops a kaiju (carrying bread) onto the top counter', () => {
    const w = makeWorld(lvl('Pop-Up'), 2);
    const [a, b] = w.players;
    const toaster = w.toasters[0];
    place(a, toaster.x + 30, toaster.y); place(b, 10 * T + 20, 16 * T);
    a.carry = 0; w.items[0].carrier = 0;
    frames(w, 10);
    tap(w, 1);
    until(w, () => [{ mx: 1 }, {}], () => a.grounded && Math.abs(bottom(a) - 8 * T) < 1, 300, 'on the counter');
    expect(a.carry).toBe(0);
  });
  for (let n = MIN_PLAYERS; n <= MAX_PLAYERS; n++) {
    it(`the top lever pops the remaining ${n - 1} kaiju up (in trips)`, () => {
      const w = makeWorld(lvl('Pop-Up'), n);
      const top = w.players[n - 1];
      place(top, 20 * T + 20, 8 * T);
      const rest = w.players.slice(0, n - 1);
      rest.forEach((p, i) => place(p, 4 * T + i * 40, 16 * T));
      frames(w, 10);
      const up = (p: Player) => p.grounded && bottom(p) <= 8 * T + 1;
      for (let trip = 0; trip < 6 && !rest.every(up); trip++) {
        // walk onto the toaster (hop on), stacking is fine
        const t = w.toasters[0];
        const onToaster = (p: Player): boolean => p.grounded && cx(p) > t.x - 10 && cx(p) < t.x + t.w + 10 && bottom(p) <= t.y + 1;
        frames(w, 180, (_, f) => w.players.map((p, i) => (p === top || up(p) || onToaster(p) ? {} : { ...toward(p, 16 * T), jump: (f + i * 11) % 40 < 14 })));
        tap(w, n - 1);
        frames(w, 70, () => w.players.map(p => (p === top ? {} : { mx: 1 })));
        frames(w, 40, () => w.players.map(p => (p !== top && up(p) ? toward(p, 25 * T) : {})));
      }
      expect(rest.every(up)).toBe(true);
    });
  }
});

describe('Hot Hob', () => {
  it('a team can cross burner A when it cools', () => {
    const w = makeWorld(lvl('Hot Hob'), 3);
    frames(w, 10);
    const burner = w.burners[0];
    until(w, () => w.players.map(p => toward(p, 10.4 * T - (2 - p.idx) * 38)), () => burner.state === 'hot', 400);
    until(w, () => [], () => burner.state === 'cold', 400);
    until(w, () => w.players.map(() => ({ mx: 1 })), () => w.players.every(p => p.x > 18 * T), 300, 'across burner A');
  });
  it('the shuttle spatula carries kaiju over the hot pit', () => {
    const w = makeWorld(lvl('Hot Hob'), 2);
    const [a, b] = w.players;
    const sh = w.lifts[0];
    place(a, 23 * T + 18, 16 * T); place(b, 22 * T, 16 * T);
    until(w, () => [], () => Math.abs(sh.x - sh.ax) < 0.5 && sh.wait > 0.3, 1200, 'shuttle at start');
    until(w, () => [{ mx: 1, jump: true }], () => a.grounded && Math.abs(bottom(a) - sh.y) < 1, 120, 'a on shuttle');
    until(w, () => [toward(a, sh.x + sh.w / 2)], () => Math.abs(sh.x - sh.bx) < 0.5, 900, 'ride');
    until(w, () => [{ mx: 1 }], () => a.grounded && cx(a) > 36 * T, 200, 'off at the far side');
  });
  for (let n = MIN_PLAYERS; n <= MAX_PLAYERS; n++) {
    it(`${n} kaiju: scale → burner B → door within the timer`, () => {
      const w = makeWorld(lvl('Hot Hob'), n);
      w.players.forEach((p, i) => place(p, 45 * T + 20 + (i % 5) * 38, 15 * T - (i >= 5 ? PHYS.ph + 1 : 0)));
      frames(w, 20);
      expect(w.scales[0].active).toBe(true);
      const burner = w.burners[1];
      until(w, () => [], () => burner.state === 'hot', 600);
      until(w, () => [], () => burner.state === 'cold', 600);
      until(w, (_, f) => w.players.map((p, i) => ({ mx: 1, jump: p.x < 50 * T && (f + i * 9) % 30 < 12 })), () => w.players.every(p => p.x > 58 * T), 600, 'through the door');
    });
  }
});

describe('Sandwich Rush', () => {
  it('first kaiju up by stacking, then the lever pops the others up the plateau', () => {
    const w = makeWorld(lvl('Sandwich Rush'), 3);
    const [a, b, c] = w.players;
    place(c, 13 * T - 20, 16 * T); place(b, 13 * T - 60, 16 * T); place(a, 6 * T, 16 * T);
    frames(w, 10);
    until(w, (_, f) => [{}, { mx: 1, jump: f % 40 < 25 }, {}], () => b.grounded && Math.abs(bottom(b) - 13 * T) < 1, 600, 'b up');
    until(w, () => [{}, toward(b, 16 * T), {}], () => Math.abs(cx(b) - 16 * T) < 4, 300);
    // a and c hop onto the toaster
    const up = (p: Player) => p.grounded && bottom(p) <= 13 * T + 1;
    for (let trip = 0; trip < 4 && !(up(a) && up(c)); trip++) {
      frames(w, 120, (_, f) => [up(a) ? {} : { ...toward(a, 11 * T), jump: f % 40 < 14 }, {}, up(c) ? {} : { ...toward(c, 11 * T), jump: (f + 20) % 40 < 14 }]);
      tap(w, 1);
      frames(w, 80, () => [{ mx: 1 }, {}, { mx: 1 }]);
    }
    expect(up(a) && up(c)).toBe(true);
  });
  it('the cheese shelf is reachable with one friend', () => {
    const w = makeWorld(lvl('Sandwich Rush'), 2);
    const [a, b] = w.players;
    place(a, 54 * T + 10, 16 * T); place(b, 53 * T - 20, 16 * T);
    frames(w, 10);
    until(w, (_, f) => [{}, { ...toward(b, cx(a)), jump: f % 40 < 25 }], () => b.grounded && Math.abs(bottom(b) - a.y) < 1, 400, 'onto a');
    until(w, (_, f) => [{}, { ...toward(b, 55.5 * T), jump: f % 50 < 30 }], () => b.grounded && Math.abs(bottom(b) - 13 * T) < 1, 400, 'on the shelf');
  });
  for (let n = MIN_PLAYERS; n <= MAX_PLAYERS; n++) {
    it(`${n} kaiju push the cube into the pit and get through the door`, () => {
      const w = makeWorld(lvl('Sandwich Rush'), n);
      const cube = w.crates[0];
      w.players.forEach((p, i) => (i < 3 ? place(p, cube.x - 20 - i * 36, 16 * T) : place(p, 30 * T - (i - 3) * 38, 13 * T)));
      frames(w, 10);
      until(w, () => w.players.map(() => ({ mx: 1 })), () => w.doors[0].open >= 1, 900, 'door open');
      until(w, (_, f) => w.players.map((p, i) => ({ mx: 1, jump: (f + i * 9) % 30 < 12 })), () => w.players.every(p => p.x > 50 * T), 900, 'all through');
    });
  }
});

describe('every level: the pot and plate at the end work for 6', () => {
  for (const l of LEVELS) {
    it(l.name, () => {
      const w = makeWorld(l, 6);
      const plate = w.plates[0];
      w.delivered = l.recipe.length;
      w.players.forEach((p, i) => place(p, plate.x + 22 + (i % 5) * 38, plate.y - (i >= 5 ? PHYS.ph + 1 : 0)));
      frames(w, 30);
      expect(w.phase).toBe('clear');
    });
  }
});
