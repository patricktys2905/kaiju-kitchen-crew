// World 7 (The Bakery) mechanics: sticky sprinkle walls, proofing dough, oven timers.
import { describe, expect, it } from 'vitest';
import { T } from '../src/sim/constants';
import { flatRoom, frames, makeWorld, toward, until, bottom, cx } from './helpers';

describe('sticky sprinkle walls', () => {
  it('a kaiju climbs a 6-tile sprinkle wall by wall-jumping (hold towards it, tap jump)', () => {
    const w = makeWorld(flatRoom(30, b => b.sticky(12, 10, 1, 6).start(4)), 2);
    frames(w, 10);
    const p = w.players[1];
    until(w, (_, f) => [undefined, { mx: 1, jump: f % 16 < 8 }], () => p.grounded && bottom(p) <= 10 * T + 1, 900, 'on top of the sprinkle wall');
    expect(cx(p)).toBeGreaterThan(12 * T);
  });
  it('a plain wall can not be climbed that way', () => {
    const w = makeWorld(flatRoom(30, b => b.solid(12, 10, 1, 6).start(4)), 2);
    frames(w, 10);
    const p = w.players[1];
    frames(w, 600, (_, f) => [undefined, { mx: 1, jump: f % 16 < 8 }]);
    expect(bottom(p)).toBeGreaterThan(14 * T);
  });
  it('you slide down slowly while clinging', () => {
    const w = makeWorld(flatRoom(30, b => b.sticky(12, 6, 1, 10).start(4)), 2);
    frames(w, 10);
    const p = w.players[1];
    until(w, (_, f) => [undefined, { mx: 1, jump: f % 40 < 20 }], () => p.clingDir === 1 && p.vy > 0, 300, 'clinging');
    frames(w, 5, () => [undefined, { mx: 1 }]);
    expect(p.vy).toBeLessThanOrEqual(46);
  });
});

describe('proofing dough', () => {
  const room = () => flatRoom(30, b => b.clear(10, 16, 2, 2).solid(12, 10, 6, 6).start(4).add({ t: 'dough', x: 10, y: 16, w: 2, rise: 6 }));
  it('rises while someone stands on it, up to a ledge', () => {
    const w = makeWorld(room(), 2);
    frames(w, 10);
    const p = w.players[1], d = w.lifts[0];
    until(w, () => [undefined, toward(p, 11 * T)], () => p.grounded && Math.abs(cx(p) - 11 * T) < 4, 300, 'onto the dough');
    until(w, () => [], () => d.y <= 10 * T + 0.5, 900, 'risen');
    expect(bottom(p)).toBeCloseTo(10 * T, 0);
    until(w, () => [undefined, { mx: 1 }], () => p.grounded && cx(p) > 13 * T, 200, 'onto the ledge');
  });
  it('sinks back when nobody is on it', () => {
    const w = makeWorld(room(), 2);
    frames(w, 10);
    const p = w.players[1], d = w.lifts[0];
    until(w, () => [undefined, toward(p, 11 * T)], () => p.grounded && Math.abs(cx(p) - 11 * T) < 4, 300, 'onto the dough');
    frames(w, 330);
    const high = d.y;
    until(w, () => [undefined, { mx: 1, jump: true }], () => p.grounded && cx(p) > 13 * T, 300, 'off');
    frames(w, 400);
    expect(d.y).toBeGreaterThan(high + T);
    expect(d.y).toBeCloseTo(16 * T, 0);
  });
});

describe('oven timers', () => {
  it('GRAB winds it; its door stays open until it rings', () => {
    const w = makeWorld(flatRoom(30, b => b.solid(20, 0, 1, 10).start(4).add({ t: 'timer', id: 't', x: 8, y: 15, secs: 5 }, { t: 'door', on: 't', x: 20, y: 10, h: 6 })), 2);
    frames(w, 10);
    const p = w.players[1];
    until(w, () => [undefined, toward(p, 8.5 * T)], () => Math.abs(cx(p) - 8.5 * T) < 4, 300, 'at the timer');
    frames(w, 1, () => [undefined, { grab: true }]);
    expect(w.switchOn('t')).toBe(true);
    frames(w, 60);
    expect(w.doors[0].open).toBeGreaterThan(0.9);
    frames(w, 5 * 60);
    expect(w.switchOn('t')).toBe(false);
    frames(w, 120);
    expect(w.doors[0].open).toBeLessThan(0.1);
  });
  it('winding it again resets the time', () => {
    const w = makeWorld(flatRoom(30, b => b.start(4).add({ t: 'timer', id: 't', x: 8, y: 15, secs: 4 })), 2);
    frames(w, 10);
    const p = w.players[1];
    until(w, () => [undefined, toward(p, 8.5 * T)], () => Math.abs(cx(p) - 8.5 * T) < 4, 300, 'at the timer');
    frames(w, 1, () => [undefined, { grab: true }]);
    frames(w, 180);
    frames(w, 1, () => [undefined, { grab: true }]);
    expect(w.timers[0].left).toBeGreaterThan(3.9);
  });
});
