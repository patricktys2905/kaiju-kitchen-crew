// World 2 (The Fridge): each new mechanic, then the key moves of every Fridge level for 2..6 kaiju.
import { describe, expect, it } from 'vitest';
import { MAX_PLAYERS, MIN_PLAYERS, PHYS, T } from '../src/sim/constants';
import { FRIDGE_LEVELS } from '../src/sim/levels-fridge';
import type { Player, PlayerInput, World } from '../src/sim/world';
import { bottom, cx, flatRoom, frames, makeWorld, toward, until } from './helpers';

function place(p: Player, x: number, floorY: number): void {
  p.x = x - p.w / 2; p.y = floorY - p.h; p.vx = p.vy = 0;
}
const only = (i: number, inp: Partial<PlayerInput>) => { const a: Partial<PlayerInput>[] = []; a[i] = inp; return a; };
const lvl = (name: string) => FRIDGE_LEVELS.find(l => l.name === name)!;
/** Hop up into a floating snack right above. */
function eat(w: World, i: number, x: number): void {
  const p = w.players[i];
  until(w, () => only(i, toward(p, x, 5)), () => Math.abs(cx(p) - x) < 8, 400, 'to snack');
  frames(w, 5);
  frames(w, 40, (_, f) => only(i, { jump: f < 20 }));
  frames(w, 20);
}
const up = (p: Player, top: number) => p.grounded && bottom(p) <= top + 1;

describe('fridge mechanics', () => {
  it('jumping into a cookie makes you BIG; a lemon drop shrinks you', () => {
    const w = makeWorld(flatRoom(40, b => b.add({ t: 'pickup', kind: 'cookie', x: 8, y: 14 }, { t: 'pickup', kind: 'lemon', x: 12, y: 13 })), 2);
    const a = w.players[1];
    frames(w, 10);
    eat(w, 1, 8 * T + 20);
    expect(a.big).toBe(true);
    expect(a.h).toBe(PHYS.big.h);
    expect(bottom(a)).toBeCloseTo(16 * T, 1);
    eat(w, 1, 12 * T + 20);
    expect(a.big).toBe(false);
    expect(a.h).toBe(PHYS.ph);
  });
  it('walking under a floating snack does not eat it', () => {
    const w = makeWorld(flatRoom(40, b => b.add({ t: 'pickup', kind: 'cookie', x: 8, y: 14 })), 2);
    frames(w, 10);
    until(w, () => [{}, toward(w.players[1], 12 * T)], () => cx(w.players[1]) > 12 * T - 4, 400);
    expect(w.players[1].big).toBe(false);
  });
  it('a big kaiju smashes a cracker wall; a normal one cannot', () => {
    const w = makeWorld(flatRoom(40, b => b.solid(10, 0, 1, 8).add({ t: 'block', mat: 'cracker', x: 10, y: 8, w: 1, h: 8 })), 2);
    const a = w.players[1];
    frames(w, 10);
    frames(w, 120, () => [{}, { mx: 1 }]);
    expect(w.blocks[0].broken).toBe(false);
    a.big = true; a.w = PHYS.big.w; a.h = PHYS.big.h; a.y -= PHYS.big.h - PHYS.ph; a.x -= 20;
    frames(w, 60, () => [{}, { mx: 1 }]);
    expect(w.blocks[0].broken).toBe(true);
    frames(w, 60, () => [{}, { mx: 1 }]);
    expect(a.x).toBeGreaterThan(11 * T);
  });
  it('a mouse hole lets normal kaiju through but not big ones', () => {
    const lv = flatRoom(40, b => b.solid(12, 0, 6, 15));
    const w = makeWorld(lv, 2);
    const [a, b] = w.players;
    frames(w, 10);
    b.big = true; b.w = PHYS.big.w; b.h = PHYS.big.h; place(b, 10 * T, 16 * T);
    place(a, 6 * T, 16 * T);
    frames(w, 200, () => [{}, { mx: 1 }]);
    expect(b.x + b.w).toBeLessThanOrEqual(12 * T + 0.01);
    place(b, 3 * T, 16 * T);
    frames(w, 200, () => [{ mx: 1 }, {}]);
    expect(a.x).toBeGreaterThan(18 * T);
  });
  it('standing on a BIG friend reaches a 4-tile ledge', () => {
    const w = makeWorld(flatRoom(40, b => b.solid(12, 12, 20, 4)), 2);
    const [b, a] = w.players;
    a.big = true; a.w = PHYS.big.w; a.h = PHYS.big.h; place(a, 12 * T - 26, 16 * T); place(b, 8 * T, 16 * T);
    frames(w, 10);
    until(w, (_, f) => [{ ...toward(b, cx(a)), jump: f % 40 < 22 }, {}], () => b.grounded && Math.abs(bottom(b) - a.y) < 1, 400, 'onto big');
    frames(w, 5);
    until(w, (_, f) => [{ mx: 1, jump: f % 50 < 30 }, {}], () => up(b, 12 * T), 300, 'up the ledge');
  });
  it('big kaiju weigh 3 on a scale and push like 2', () => {
    const w = makeWorld(flatRoom(40, b => b.add({ t: 'scale', id: 's', x: 20, y: 15, w: 3, need: 3 }, { t: 'crate', x: 10, y: 14, w: 2, h: 2, need: 2, weight: 3 })), 2);
    const [, a] = w.players;
    a.big = true; a.w = PHYS.big.w; a.h = PHYS.big.h; place(a, 9 * T - 26, 16 * T);
    frames(w, 10);
    const x0 = w.crates[0].x;
    frames(w, 60, () => [{}, { mx: 1 }]);
    expect(w.crates[0].x).toBeGreaterThan(x0 + 20);
    place(a, 21.5 * T, 15 * T);
    frames(w, 10);
    expect(w.scales[0].active).toBe(true);
  });
  it('ice makes you slide much further', () => {
    const slide = (ice: boolean) => {
      const w = makeWorld(flatRoom(60, b => { if (ice) b.ice(1, 16, 58); }), 2);
      const a = w.players[1];
      frames(w, 10);
      frames(w, 60, () => [{}, { mx: 1 }]);
      const x0 = a.x;
      frames(w, 90);
      return a.x - x0;
    };
    expect(slide(true)).toBeGreaterThan(slide(false) + 40);
  });
  it('jelly bounces you about 5.5 tiles; frozen jelly does not', () => {
    const w = makeWorld(flatRoom(40, b => b.add({ t: 'jelly', x: 10, y: 15, w: 2, h: 1, on: 'f' }, { t: 'lever', id: 'f', x: 4, y: 15 })), 2);
    const [b, a] = w.players;
    place(a, 11 * T, 15 * T - 1);
    frames(w, 5);
    let top = bottom(a);
    frames(w, 70, () => { top = Math.min(top, bottom(a)); return []; });
    expect(15 * T - top).toBeGreaterThan(5.3 * T);
    place(b, 4 * T + 20, 16 * T);
    until(w, () => [], () => a.grounded || bottom(a) >= 15 * T - 1, 200);
    frames(w, 2, (_, f) => [{ grab: f === 0 }]);
    frames(w, 90);
    expect(a.grounded).toBe(true);
    expect(bottom(a)).toBeCloseTo(15 * T, 1);
  });
  it('chili melts ice walls on touch; it wears off', () => {
    const w = makeWorld(flatRoom(40, b => b.solid(12, 0, 1, 8).add({ t: 'block', mat: 'ice', x: 12, y: 8, w: 1, h: 8 }, { t: 'pickup', kind: 'chili', x: 6, y: 14 })), 2);
    const a = w.players[1];
    frames(w, 10);
    frames(w, 150, () => [{}, { mx: 1 }]);
    expect(w.blocks[0].broken).toBe(false);
    place(a, 6 * T + 20, 16 * T);
    eat(w, 1, 6 * T + 20);
    expect(a.spicyT).toBeGreaterThan(0);
    until(w, () => [{}, { mx: 1 }], () => w.blocks[0].broken, 300, 'melt');
  });
  it('soda: the next jump reaches a 5-tile ledge, carrying a friend on your head', () => {
    const w = makeWorld(flatRoom(40, b => b.solid(14, 11, 20, 5).add({ t: 'pickup', kind: 'soda', x: 13, y: 14 })), 2);
    const [b, a] = w.players;
    place(a, 13 * T + 20, 16 * T);
    place(b, 6 * T, 16 * T);
    frames(w, 10);
    frames(w, 30, (_, f) => [{}, { jump: f < 15 }]); // drinks the soda
    frames(w, 30);
    expect(a.fizz).toBe(true);
    place(b, cx(a), a.y - 1);
    frames(w, 10);
    expect(Math.abs(bottom(b) - a.y)).toBeLessThan(1);
    const by0 = b.y;
    let top = bottom(a);
    frames(w, 50, (_, f) => { top = Math.min(top, bottom(a)); return [{}, { jump: f < 30 }]; });
    expect(16 * T - top).toBeGreaterThan(5 * T + 10);
    expect(a.fizz).toBe(false);
    void by0;
  });
  it('icicles splat', () => {
    const w = makeWorld(flatRoom(40, b => b.solid(8, 0, 4, 13).icicles(8, 13, 4)), 2);
    frames(w, 10);
    let splat = false;
    for (let f = 0; f < 300 && !splat; f++) { w.step([{ mx: 0, jump: false, grab: false }, { mx: 1, jump: f % 30 < 20, grab: false }]); splat = w.phase === 'splat'; }
    expect(splat).toBe(true);
  });
});

describe('Cookie Monster', () => {
  for (let n = MIN_PLAYERS; n <= MAX_PLAYERS; n++) {
    it(`${n} kaiju: grow, smash the crackers, climb on the big one, shrink, and all fit through the mouse hole`, () => {
      const w = makeWorld(lvl('Cookie Monster'), n);
      const big = w.players[n - 1], climber = w.players[n - 2];
      frames(w, 10);
      eat(w, n - 1, 6 * T + 20);
      expect(big.big).toBe(true);
      until(w, () => only(n - 1, { mx: 1 }), () => w.blocks[0].broken, 400, 'smash');
      until(w, () => only(n - 1, toward(big, 18 * T - 26)), () => Math.abs(cx(big) - (18 * T - 26)) < 4, 400, 'big at wall');
      until(w, (_, f) => only(n - 2, { ...toward(climber, cx(big)), jump: f % 40 < 22 }), () => climber.grounded && Math.abs(bottom(climber) - big.y) < 1, 600, 'onto big');
      frames(w, 5);
      until(w, (_, f) => only(n - 2, { mx: 1, jump: f % 50 < 30 }), () => up(climber, 12 * T), 300, 'climber up');
      // big kaiju steps back, jumps into the lemon drop
      eat(w, n - 1, 15 * T + 20);
      expect(big.big).toBe(false);
      for (const p of w.players) if (p.big && p !== climber) eat(w, p.idx, 15 * T + 20);
      // everyone else goes through the mouse hole
      until(w, (_, f) => w.players.map(p => (p === climber ? {} : p.big ? { ...toward(p, 15 * T + 20, 5), jump: f % 40 < 15 } : { mx: 1 })), () => w.players.every(p => p === climber || p.x > 31 * T), 1200, 'through the hole');
    });
  }
});

describe('Heavy Snack', () => {
  it('2 kaiju: one BIG + one normal push the ×3 cube into the scale pit and the door opens', () => {
    const w = makeWorld(lvl('Heavy Snack'), 2);
    const [b, a] = w.players;
    frames(w, 10);
    eat(w, 1, 5 * T + 20);
    expect(a.big).toBe(true);
    place(b, 7 * T, 16 * T);
    until(w, () => [{ mx: 1 }, { mx: 1 }], () => w.doors[0].open >= 1, 900, 'door open');
  });
  it('the strawberry shelf is reachable from a BIG friend', () => {
    const w = makeWorld(lvl('Heavy Snack'), 2);
    const [b, a] = w.players;
    a.big = true; a.w = PHYS.big.w; a.h = PHYS.big.h;
    place(a, 23 * T, 16 * T); place(b, 25 * T, 16 * T);
    frames(w, 10);
    until(w, (_, f) => [{ ...toward(b, cx(a)), jump: f % 40 < 22 }, {}], () => b.grounded && Math.abs(bottom(b) - a.y) < 1, 600, 'onto big');
    frames(w, 5);
    until(w, (_, f) => [{ ...toward(b, 22.5 * T), jump: f % 50 < 30 }, {}], () => up(b, 12 * T), 300, 'on the shelf');
  });
});

describe('Slippery Slope', () => {
  for (let n = MIN_PLAYERS; n <= MAX_PLAYERS; n++) {
    it(`${n} kaiju: jump the gap at the end of the ice, then all bounce up the jelly`, () => {
      const w = makeWorld(lvl('Slippery Slope'), n);
      frames(w, 10);
      // one at a time, front first: run and jump the gap
      // the team walks up to the ice together (the shared screen keeps them close)
      frames(w, 60, () => w.players.map(() => ({ mx: 1 })));
      const crossed = new Set<Player>();
      for (let k = 0; k < n; k++) {
        const p = w.players.filter(q => !crossed.has(q)).reduce((x, y) => (x.x > y.x ? x : y)); // whoever is in front
        const i = p.idx;
        crossed.add(p);
        until(w, () => only(i, { mx: 1, jump: cx(p) > 18.2 * T && cx(p) < 19.5 * T }), () => p.grounded && p.x > 21.5 * T, 600, `P${i} over the gap`);
        frames(w, 40, () => only(i, { mx: 1 }));
      }
      until(w, (_, f) => w.players.map((p, i) => (up(p, 10 * T) ? toward(p, 39 * T - i * 36) : { ...toward(p, p.y < 15 * T - 40 ? 33 * T : 29 * T), jump: (f + i * 7) % 30 < 4 })), () => w.players.every(p => up(p, 10 * T)), 2400, 'all up');
    });
  }
});

describe('Deep Freeze', () => {
  for (let n = MIN_PLAYERS; n <= MAX_PLAYERS; n++) {
    it(`${n} kaiju: freeze the jelly bridge, cross, unfreeze, bounce up`, () => {
      const w = makeWorld(lvl('Deep Freeze'), n);
      frames(w, 10);
      const p0 = w.players[0];
      w.players.forEach((p, i) => place(p, 8 * T - i * 36 + 10, 16 * T));
      place(p0, 6 * T + 20, 16 * T);
      frames(w, 10);
      frames(w, 2, (_, f) => only(0, { grab: f === 0 }));
      frames(w, 5);
      expect(w.jellies[0].frozen).toBe(true);
      until(w, () => w.players.map(() => ({ mx: 1 })), () => w.players.every(p => p.x > 19 * T), 900, 'across the frozen bridge');
      frames(w, 30);
      const lead = w.players.reduce((a, b) => (Math.abs(cx(a) - 21.5 * T) < Math.abs(cx(b) - 21.5 * T) ? a : b));
      until(w, () => only(lead.idx, toward(lead, 21 * T + 20, 5)), () => Math.abs(cx(lead) - (21 * T + 20)) < 40, 400);
      frames(w, 2, (_, f) => only(lead.idx, { grab: f === 0 }));
      frames(w, 5);
      expect(w.jellies[1].frozen).toBe(false);
      until(w, (_, f) => w.players.map((p, i) => (up(p, 10 * T) ? toward(p, 35 * T - i * 36) : { ...toward(p, p.y < 15 * T - 40 ? 29 * T : 25 * T), jump: (f + i * 7) % 30 < 4 })), () => w.players.every(p => up(p, 10 * T)), 2400, 'all up');
    });
  }
});

describe('Hot Stuff', () => {
  for (let n = MIN_PLAYERS; n <= MAX_PLAYERS; n++) {
    it(`${n} kaiju: melt the ice, then soda-jump up one by one`, () => {
      const w = makeWorld(lvl('Hot Stuff'), n);
      frames(w, 10);
      const a = w.players[n - 1];
      eat(w, n - 1, 4 * T + 20);
      until(w, () => only(n - 1, { mx: 1 }), () => w.blocks[0].broken, 400, 'melt');
      for (const p of [...w.players].reverse()) {
        until(w, () => only(p.idx, toward(p, 13 * T + 20)), () => Math.abs(cx(p) - (13 * T + 20)) < 5 && w.pickups[1].respawn === 0, 900, 'to soda');
        frames(w, 30, (_, f) => only(p.idx, { jump: f < 12 }));
        frames(w, 30);
        expect(p.fizz).toBe(true);
        until(w, () => only(p.idx, toward(p, 15 * T + 10)), () => Math.abs(cx(p) - (15 * T + 10)) < 4, 200);
        frames(w, 4);
        until(w, (_, f) => only(p.idx, { mx: 1, jump: f < 30 }), () => up(p, 11 * T), 200, `P${p.idx} up`);
        until(w, () => only(p.idx, toward(p, 18 * T + p.idx * 36)), () => Math.abs(cx(p) - (18 * T + p.idx * 36)) < 4, 300);
      }
      expect(a.x).toBeGreaterThan(16 * T);
      // second chili melts the upper wall
      eat(w, n - 1, 23 * T + 20);
      until(w, () => only(n - 1, { mx: 1 }), () => w.blocks[1].broken, 400, 'melt 2');
    });
  }
});

describe('Fridge Raid', () => {
  for (let n = MIN_PLAYERS; n <= MAX_PLAYERS; n++) {
    it(`${n} kaiju: through the mouse hole and past the ice wall`, () => {
      const w = makeWorld(lvl('Fridge Raid'), n);
      w.players.forEach((p, i) => place(p, 44.6 * T + (i % 4) * 38, 16 * T - (i >= 4 ? PHYS.ph + 1 : 0)));
      frames(w, 10);
      until(w, (_, f) => w.players.map((p, i) => ({ mx: 1, jump: p.x < 48 * T && (f + i * 9) % 40 < 6 })), () => w.players.every(p => p.x > 58 * T), 1500, 'through the hole');
      // the front kaiju goes for the chili while the others step back
      const a = w.players.reduce((x, y) => (x.x > y.x ? x : y));
      frames(w, 90, () => w.players.map(p => (p === a ? {} : { mx: -1 })));
      eat(w, a.idx, 61 * T + 20);
      until(w, () => only(a.idx, { mx: 1 }), () => w.blocks[1].broken, 400, 'melt');
    });
  }
  it('the strawberry shelf: big friend from the second cookie', () => {
    const w = makeWorld(lvl('Fridge Raid'), 2);
    const [b, a] = w.players;
    place(a, 68 * T + 20, 16 * T); place(b, 66 * T + 20, 16 * T);
    frames(w, 10);
    eat(w, 1, 68 * T + 20);
    expect(a.big).toBe(true);
    until(w, () => [{}, toward(a, 71 * T)], () => Math.abs(cx(a) - 71 * T) < 4, 300);
    until(w, (_, f) => [{ ...toward(b, cx(a)), jump: f % 40 < 22 }, {}], () => b.grounded && Math.abs(bottom(b) - a.y) < 1, 600, 'onto big');
    frames(w, 5);
    until(w, (_, f) => [{ ...toward(b, 72.5 * T), jump: f % 50 < 30 }, {}], () => up(b, 12 * T), 300, 'on the shelf');
  });
});
