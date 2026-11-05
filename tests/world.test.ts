import { describe, expect, it } from 'vitest';
import { PHYS, T, WORLD_VIEW as VIEW } from '../src/sim/constants';
import { bottom, cx, flatRoom, frames, makeWorld, toward, until } from './helpers';

describe('movement', () => {
  it('a kaiju lands on the floor and can walk', () => {
    const w = makeWorld(flatRoom(), 2);
    frames(w, 30);
    const p = w.players[1];
    expect(bottom(p)).toBeCloseTo(16 * T, 3);
    expect(p.grounded).toBe(true);
    const x0 = p.x;
    frames(w, 30, () => [{}, { mx: 1 }]);
    expect(p.x - x0).toBeGreaterThan(80);
  });

  it('one jump rises ~110 px: more than 2.5 tiles, less than 3', () => {
    const w = makeWorld(flatRoom(), 2);
    frames(w, 20);
    const p = w.players[0];
    const start = bottom(p);
    let best = start;
    frames(w, 50, (_, f) => { best = Math.min(best, bottom(p)); return [{ jump: f < 40 }]; });
    const rise = start - best;
    expect(rise).toBeGreaterThan(2.5 * T);
    expect(rise).toBeLessThan(3 * T);
  });

  it('a 3-tile wall stops one kaiju but not one standing on a friend', () => {
    const lvl = flatRoom(40, b => b.solid(12, 13, 27, 3));
    const w = makeWorld(lvl, 2);
    const [b, a] = w.players;
    frames(w, 20);
    // alone: can't get up
    until(w, () => [{}, toward(a, 12 * T - 20)], () => Math.abs(cx(a) - (12 * T - 20)) < 4, 300, 'a at wall');
    frames(w, 60, (_, f) => [{}, { mx: 1, jump: f < 30 }]);
    expect(bottom(a)).toBeGreaterThan(13 * T + 1);
    // b jumps on a's head, then up
    until(w, () => [toward(b, 12 * T - 80)], () => Math.abs(cx(b) - (12 * T - 80)) < 4, 300, 'b in place');
    until(w, (_, f) => [{ mx: 1, jump: f < 25 }], () => b.grounded && Math.abs(bottom(b) - a.y) < 1, 200, 'b on a');
    until(w, (_, f) => [{ mx: 1, jump: f < 30 }], () => b.grounded && Math.abs(bottom(b) - 13 * T) < 1, 200, 'b on the counter');
  });

  it('standing on a friend means riding along when they walk or jump', () => {
    const w = makeWorld(flatRoom(), 2);
    const [a, b] = w.players;
    b.x = a.x; b.y = a.y - PHYS.ph - 10;
    frames(w, 20);
    expect(Math.abs(bottom(b) - a.y)).toBeLessThan(1);
    const dx0 = b.x - a.x;
    frames(w, 30, () => [{ mx: 1 }]);
    expect(b.x - a.x).toBeCloseTo(dx0, 3);
    const startY = b.y;
    let top = b.y;
    frames(w, 30, (_, f) => { top = Math.min(top, b.y); return [{ jump: f < 25 }]; });
    expect(startY - top).toBeGreaterThan(90); // b was lifted by a's jump
  });

  it('the shared screen keeps the team together', () => {
    const w = makeWorld(flatRoom(120), 2);
    frames(w, 400, () => [{ mx: 1 }, { mx: -1 }]);
    const [a, b] = w.players;
    expect(cx(a) - cx(b)).toBeLessThanOrEqual(VIEW.w);
    expect(a.x + a.w).toBeLessThanOrEqual(w.camX + VIEW.w);
    expect(b.x).toBeGreaterThanOrEqual(w.camX);
  });
});

describe('kitchen gadgets', () => {
  it('kitchen scale with need=all opens the door, and its timer holds it open', () => {
    const lvl = flatRoom(40, b => b.solid(20, 0, 1, 10).add(
      { t: 'scale', id: 'a', x: 5, y: 15, w: 4, need: 'all', hold: 2 },
      { t: 'door', on: 'a', x: 20, y: 10, h: 6 },
    ));
    const w = makeWorld(lvl, 2);
    const [a, b] = w.players;
    frames(w, 10);
    a.x = 5 * T + 4; a.y = 15 * T - PHYS.ph - 2;
    frames(w, 30);
    expect(w.scales[0].load).toBe(1);
    expect(w.doors[0].open).toBe(0);
    b.x = 6.5 * T; b.y = 15 * T - PHYS.ph - 2;
    frames(w, 30);
    expect(w.scales[0].active).toBe(true);
    expect(w.doors[0].open).toBe(1);
    // both walk off: the timer keeps it open for ~2 s
    frames(w, 60, () => [{ mx: 1 }, { mx: 1 }]);
    expect(w.scales[0].load).toBe(0);
    expect(w.doors[0].open).toBe(1);
    frames(w, 150);
    expect(w.doors[0].open).toBe(0);
  });

  it('a big sugar cube needs 2 pushers (also counting a push-chain)', () => {
    const lvl = flatRoom(40, b => b.add({ t: 'crate', x: 10, y: 14, w: 2, h: 2, need: 2, weight: 3 }));
    const w = makeWorld(lvl, 2);
    const [b, a] = w.players; // a in front
    const c = w.crates[0];
    frames(w, 10);
    const x0 = c.x;
    frames(w, 120, () => [{}, { mx: 1 }]);
    expect(c.x).toBeCloseTo(x0, 3);
    frames(w, 160, () => [{ mx: 1 }, { mx: 1 }]);
    expect(c.x).toBeGreaterThan(x0 + 40);
    expect(b.x).toBeLessThan(a.x); // b pushes a who pushes the cube
    expect(c.pushers).toBe(2);
  });

  it('a cube pushed over a 1-deep scale pit drops in and weighs it', () => {
    const lvl = flatRoom(40, b => b.clear(16, 16, 3, 2).add(
      { t: 'crate', x: 10, y: 14, w: 2, h: 2, need: 2, weight: 3 },
      { t: 'scale', id: 'b', x: 16, y: 17, w: 3, need: 3 },
    ));
    const w = makeWorld(lvl, 2);
    until(w, () => [{ mx: 1 }, { mx: 1 }], () => w.scales[0].active, 900, 'cube on scale');
    frames(w, 200, () => [{ mx: 1 }, { mx: 1 }]);
    expect(w.scales[0].active).toBe(true); // it stays in the pit
  });

  it('the spatula lift carries a stack up when a lever is pulled', () => {
    const lvl = flatRoom(40, b => b.clear(11, 16, 3, 1).solid(14, 13, 20, 3).add(
      { t: 'lift', on: 'a', x: 11, y: 16, w: 3, x2: 11, y2: 13 },
      { t: 'lever', id: 'a', x: 17, y: 12 },
    ));
    const w = makeWorld(lvl, 3);
    const [a, b, c] = w.players;
    a.x = 11 * T + 2; a.y = 16 * T - PHYS.ph - 1;
    b.x = 11 * T + 4; b.y = a.y - PHYS.ph - 4;
    c.x = 17 * T + 2; c.y = 13 * T - PHYS.ph - 1;
    frames(w, 20);
    frames(w, 2, (_, f) => [{}, {}, { grab: f === 0 }]);
    frames(w, 90);
    expect(w.lifts[0].y).toBeCloseTo(13 * T, 3);
    expect(bottom(a)).toBeCloseTo(13 * T, 1);
    expect(bottom(b)).toBeCloseTo(a.y, 1);
  });

  it('the toaster launches a kaiju over a 7-tile counter', () => {
    const lvl = flatRoom(40, b => b.add({ t: 'toaster', on: 'a', x: 10, y: 15 }, { t: 'lever', id: 'a', x: 5, y: 15 }));
    const w = makeWorld(lvl, 2);
    const [a, b] = w.players;
    a.x = 10 * T + 20; a.y = 15 * T - PHYS.ph;
    b.x = 5 * T + 2; b.y = 15 * T - PHYS.ph;
    frames(w, 20);
    let top = bottom(a);
    frames(w, 80, (_, f) => { top = Math.min(top, bottom(a)); return [{}, { grab: f === 0 }]; });
    expect(16 * T - top).toBeGreaterThan(7.5 * T);
  });

  it('ingredients: pick up, drop in the pot in recipe order; wrong ones get spat out', () => {
    const lvl = flatRoom(40, b => b.add(
      { t: 'item', kind: 'cheese', x: 4, y: 15 },
      { t: 'item', kind: 'bread', x: 5, y: 15 },
      { t: 'pot', x: 9, y: 15 },
    ));
    lvl.recipe = ['bread', 'cheese'];
    const w = makeWorld(lvl, 2);
    const a = w.players[0];
    w.players[1].x = 16 * T;
    frames(w, 10);
    until(w, () => [toward(a, 4 * T + 20)], () => Math.abs(cx(a) - (4 * T + 20)) < 4, 300);
    frames(w, 2, (_, f) => [{ grab: f === 0 }]);
    expect(w.items[a.carry].kind).toBe('cheese');
    until(w, () => [toward(a, 8.6 * T)], () => Math.abs(cx(a) - 8.6 * T) < 4, 300);
    frames(w, 2, (_, f) => [{ grab: f === 0 }]);
    expect(w.delivered).toBe(0);
    expect(w.events.some(e => e.type === 'wrong')).toBe(true);
    // now bread first
    until(w, () => [toward(a, 5 * T + 20)], () => Math.abs(cx(a) - (5 * T + 20)) < 4, 300);
    frames(w, 30);
    frames(w, 2, (_, f) => [{ grab: f === 0 }]);
    expect(a.carry).toBeGreaterThanOrEqual(0);
    expect(w.items[a.carry].kind).toBe('bread');
    until(w, () => [toward(a, 8.6 * T)], () => Math.abs(cx(a) - 8.6 * T) < 4, 300);
    frames(w, 2, (_, f) => [{ grab: f === 0 }]);
    expect(w.delivered).toBe(1);
  });

  it('a friend catches a tossed ingredient', () => {
    const lvl = flatRoom(40, b => b.solid(10, 13, 10, 3).add({ t: 'item', kind: 'bread', x: 8, y: 15 }));
    const w = makeWorld(lvl, 2);
    const [a, b] = w.players;
    a.x = 8 * T + 3; a.y = 16 * T - PHYS.ph;
    b.x = 10 * T + 2; b.y = 13 * T - PHYS.ph;
    frames(w, 10);
    frames(w, 2, (_, f) => [{ grab: f === 0 }]);
    expect(a.carry).toBe(0);
    frames(w, 2, (_, f) => [{ grab: f === 0 }]); // standing still: toss up
    frames(w, 60);
    expect(b.carry).toBe(0);
  });

  it('touching a hot hob splats, and the team respawns', () => {
    const lvl = flatRoom(40, b => b.hot(8, 16, 3, 1));
    const w = makeWorld(lvl, 2);
    w.players[1].x = 25 * T;
    frames(w, 10);
    let splat = false;
    for (let f = 0; f < 200 && !splat; f++) { w.step([{ mx: 1, jump: false, grab: false }, { mx: 0, jump: false, grab: false }]); splat = w.phase === 'splat'; }
    expect(splat).toBe(true);
    frames(w, 80);
    expect(w.phase).toBe('play');
    expect(w.splats).toBe(1);
    expect(cx(w.players[0])).toBeLessThan(8 * T);
  });

  it('the level clears only when the recipe is done and EVERY kaiju is on the plate', () => {
    const lvl = flatRoom(40, b => b.add({ t: 'plate', x: 10, y: 15, w: 6 }));
    lvl.recipe = [];
    const w = makeWorld(lvl, 3);
    frames(w, 10);
    const [a, b, c] = w.players;
    until(w, () => [{}, toward(b, 13 * T), toward(c, 14.5 * T)], () => Math.abs(cx(b) - 13 * T) < 4 && Math.abs(cx(c) - 14.5 * T) < 4, 400);
    frames(w, 10);
    expect(w.phase).toBe('play');
    until(w, () => [toward(a, 11.5 * T)], () => w.phase === 'clear', 400);
  });
});
