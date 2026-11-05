// World 4 (Stove & Oven): melting chocolate, steam vents, the Mech on hot hobs; key moves per level.
import { describe, expect, it } from 'vitest';
import { MAX_PLAYERS, MIN_PLAYERS, PHYS, T } from '../src/sim/constants';
import { STOVE_LEVELS } from '../src/sim/levels-stove';
import type { Player, PlayerInput, World } from '../src/sim/world';
import { bottom, cx, flatRoom, frames, makeWorld, toward, until, walker } from './helpers';

function place(p: Player, x: number, floorY: number): void { p.x = x - p.w / 2; p.y = floorY - p.h; p.vx = p.vy = 0; }
const only = (i: number, inp: Partial<PlayerInput>) => { const a: Partial<PlayerInput>[] = []; a[i] = inp; return a; };
const tap = (w: World, i: number) => frames(w, 2, (_, f) => only(i, { grab: f === 0 }));
const lvl = (name: string) => STOVE_LEVELS.find(l => l.name === name)!;
const up = (p: Player, top: number) => p.grounded && bottom(p) <= top + 1;

describe('stove mechanics', () => {
  it('chocolate holds a kaiju ~1.6 s, melts, then sets again', () => {
    const w = makeWorld(flatRoom(40, b => b.clear(8, 16, 6, 2).add({ t: 'melty', x: 10, y: 14, w: 2, h: 1 })), 2);
    const a = w.players[1];
    place(a, 11 * T, 14 * T);
    frames(w, 60);
    expect(w.meltys[0].gone).toBe(false);
    expect(bottom(a)).toBeCloseTo(14 * T, 0);
    frames(w, 50);
    expect(w.meltys[0].gone).toBe(true);
    frames(w, 60 * PHYS.regrow + 160); // (the kaiju fell: the splat pause comes first)
    expect(w.meltys[0].gone).toBe(false);
  });
  it('a steam vent lifts a kaiju several tiles while it is on', () => {
    const w = makeWorld(flatRoom(40, b => b.add({ t: 'vent', x: 10, y: 16, w: 2, h: 9, cold: 0.001, hot: 10 })), 2);
    const a = w.players[1];
    place(a, 11 * T, 16 * T);
    let top = bottom(a);
    frames(w, 120, () => { top = Math.min(top, bottom(a)); return []; });
    expect(16 * T - top).toBeGreaterThan(8 * T);
  });
  it('the Mech walks over a hot hob without a splat; a kaiju riding it is safe too', () => {
    const w = makeWorld(flatRoom(40, b => b.hot(12, 16, 10, 1).add({ t: 'robot', x: 6, y: 13 })), 2);
    const [b, a] = w.players;
    const r = w.robots[0];
    place(a, r.x - 10, 16 * T); place(b, 2 * T, 16 * T);
    frames(w, 5);
    tap(w, 1);
    place(b, r.x + r.w / 2, r.y - 1);
    frames(w, 5);
    until(w, () => [{}, { mx: 1 }], () => r.x > 23 * T, 600, 'across');
    expect(w.phase).toBe('play');
  });
});

describe('Melting Point', () => {
  for (const n of [2, 4, 6]) {
    it(`${n} kaiju hop the chocolate to the safe pillar and on to the far side`, () => {
      const w = makeWorld(lvl('Melting Point'), n);
      frames(w, 10);
      // one at a time, front first
      const order = [...w.players].sort((a, b) => b.x - a.x);
      // like a real team: batches of up to 3 hop to the safe pillar, then on across; the rest wait at the edge
      const go = (p: Player, x: number) => until(w, () => only(p.idx, walker(w, p, x)), () => p.grounded && Math.abs(cx(p) - x) < 10, 900, 'P' + p.idx + ' to ' + (x / T).toFixed(1));
      let crossed = 0;
      for (let s = 0; s < order.length; s += 3) {
        const rest = order.slice(s);
        rest.forEach((p, k) => go(p, (9.3 - k * 0.88) * T));
        const batch = order.slice(s, s + 3);
        batch.forEach((p, k) => go(p, (17.4 - k * 0.9) * T));
        batch.forEach(p => go(p, (27.5 - crossed++ * 0.9) * T));
      }
      expect(w.players.every(p => p.x > 22 * T)).toBe(true);
    });
  }
});

describe('Steam Room', () => {
  for (const n of [2, 6]) {
    it(`${n} kaiju ride the vents up to the shelf and over the tall wall`, () => {
      const w = makeWorld(lvl('Steam Room'), n);
      frames(w, 10);
      const order = [...w.players].sort((a, b) => b.x - a.x);
      order.forEach((p, k) => {
        until(w, (_, f) => only(p.idx, { ...toward(p, p.y < 10 * T ? 13 * T : 8 * T, 4), jump: f % 40 === 0 }), () => up(p, 8 * T), 1500, `P${p.idx} onto the shelf`);
        until(w, () => only(p.idx, toward(p, (20.5 - k * 0.9) * T, 4)), () => p.grounded && Math.abs(cx(p) - (20.5 - k * 0.9) * T) < 8, 600);
      });
      order.forEach((p, k) => {
        until(w, () => only(p.idx, { ...toward(p, p.y < 6 * T ? 30 * T : 22 * T, 4) }), () => p.grounded && p.x > 26 * T, 1500, `P${p.idx} over the wall`);
        until(w, () => only(p.idx, toward(p, (36 - k) * T, 5)), () => Math.abs(cx(p) - (36 - k) * T) < 10, 400);
      });
    });
  }
});

describe('Grill Marks', () => {
  it('cross the burner when it is cool; ride the vent to the pepper; hop the chocolate over the hot pit', () => {
    const w = makeWorld(lvl('Grill Marks'), 2);
    const [b, a] = w.players;
    frames(w, 10);
    const burner = w.burners[0];
    until(w, () => [toward(b, 6 * T), toward(a, 7 * T)], () => burner.state === 'hot', 400);
    until(w, () => [], () => burner.state === 'cold', 400);
    until(w, () => [{ mx: 1 }, { mx: 1 }], () => w.players.every(p => p.x > 17 * T), 300, 'across the burner');
    until(w, (_, f) => [{}, { ...toward(a, a.y < 11 * T ? 25 * T : 20 * T, 4), jump: f % 40 === 0 }], () => up(a, 9 * T), 1200, 'onto the pepper shelf');
    place(a, 30 * T, 16 * T); place(b, 29 * T, 16 * T);
    frames(w, 10);
    for (const goal of [33, 37, 40]) until(w, (_, f) => [{}, { ...toward(a, goal * T, 4), jump: f < 18 && Math.abs(cx(a) - goal * T) > 20 }], () => a.grounded && Math.abs(cx(a) - goal * T) < 14, 400, `to ${goal}`);
    expect(w.phase).toBe('play');
  });
});

describe('Oven Mitts', () => {
  for (const n of [2, 4]) {
    it(`${n} kaiju: the Mech carries the riders across the hot hob; a rider hops up to the potato`, () => {
      const w = makeWorld(lvl('Oven Mitts'), n);
      const r = w.robots[0];
      const pilot = w.players[n - 1];
      place(pilot, r.x - 10, 16 * T);
      frames(w, 5);
      tap(w, n - 1);
      w.players.filter(p => p !== pilot).forEach((p, k) => place(p, r.x + 18 + (k % 2) * 40, r.y - 1 - Math.floor(k / 2) * 36));
      frames(w, 10);
      until(w, () => only(n - 1, toward({ x: r.x, w: r.w } as Player, 22.5 * T)), () => Math.abs(r.x + r.w / 2 - 22.5 * T) < 8, 900, 'under the shelf');
      const rider = w.players[0];
      until(w, (_, f) => only(0, { ...toward(rider, 22.5 * T, 4), jump: f % 50 < 30 }), () => up(rider, 11 * T), 300, 'on the shelf');
      until(w, () => only(0, toward(rider, 22 * T + 20, 5)), () => Math.abs(cx(rider) - (22 * T + 20)) < 10, 200);
      tap(w, 0);
      expect(w.items[rider.carry]?.kind).toBe('potato');
      // back down onto the Mech, then everyone across
      frames(w, 2, (_, f) => only(0, { grab: f === 0 })); // toss is fine too; just drop onto the Mech
      until(w, () => w.players.map(p => (p === pilot ? { mx: 1 } : p.y < r.y - 20 ? { ...toward(p, r.x + r.w / 2, 4) } : toward(p, r.x + r.w / 2, 4))), () => r.x > 36 * T, 1200, 'across');
      expect(w.phase).toBe('play');
    });
  }
});

describe('Flambé', () => {
  for (let n = MIN_PLAYERS; n <= MAX_PLAYERS; n += 2) {
    it(`${n} kaiju rush over the chocolate bridge without stopping`, () => {
      const w = makeWorld(lvl('Flambé'), n);
      frames(w, 10);
      const ord = [...w.players].sort((a, b) => b.x - a.x);
      until(w, () => ord.map((p, k) => ({ p, k })).sort((x, y) => x.p.idx - y.p.idx).map(({ p, k }) => walker(w, p, (30 - k * 0.9) * T)), () => ord.every((p, k) => p.grounded && Math.abs(cx(p) - (30 - k * 0.9) * T) < 8), 2400, 'over the bridge');
    });
  }
  it('the vent alone (no moon gravity ticket) takes a kaiju up the tower', () => {
    const lv = lvl('Flambé');
    const w = makeWorld({ ...lv, ents: lv.ents.filter(e => e.t !== 'ticket') }, 2);
    const [b, a] = w.players;
    place(a, 34 * T, 16 * T); place(b, 33 * T, 16 * T);
    frames(w, 10);
    until(w, (_, f) => [{}, { ...toward(a, a.y < 6 * T ? 41.5 * T : 38 * T, 4), jump: f % 40 === 0 }], () => up(a, 4 * T), 1500, 'up the tower');
  });
  it('moon gravity + the vent take everyone up the tower', () => {
    const w = makeWorld(lvl('Flambé'), 3);
    w.players.forEach((p, i) => place(p, 33 * T + i * 40, 16 * T));
    frames(w, 30);
    expect(w.rule).toBe('lowgrav');
    for (const p of [...w.players].sort((a, b) => b.x - a.x)) {
      until(w, (_, f) => only(p.idx, { ...toward(p, p.y < 6 * T ? 41.5 * T : 38 * T, 4), jump: f % 40 === 0 }), () => up(p, 4 * T), 1500, `P${p.idx} up the tower`);
    }
  });
});
