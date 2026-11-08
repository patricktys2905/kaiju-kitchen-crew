// World 3 (The Pantry): noodle tether, Pot Mech, order tickets, mousetraps, then key moves per level.
import { describe, expect, it } from 'vitest';
import { MAX_PLAYERS, MIN_PLAYERS, PHYS, T } from '../src/sim/constants';
import { PANTRY_LEVELS } from '../src/sim/levels-pantry';
import type { Player, PlayerInput, World } from '../src/sim/world';
import { bottom, cx, flatRoom, frames, makeWorld, toward, until, walker } from './helpers';

function place(p: Player, x: number, floorY: number): void {
  p.x = x - p.w / 2; p.y = floorY - p.h; p.vx = p.vy = 0;
}
const only = (i: number, inp: Partial<PlayerInput>) => { const a: Partial<PlayerInput>[] = []; a[i] = inp; return a; };
const tap = (w: World, i: number) => frames(w, 2, (_, f) => only(i, { grab: f === 0 }));
const lvl = (name: string) => PANTRY_LEVELS.find(l => l.name === name)!;
const up = (p: Player, top: number) => p.grounded && bottom(p) <= top + 1;
const dist = (a: Player, b: Player) => Math.hypot(cx(a) - cx(b), a.y - b.y);

describe('noodle tether', () => {
  it('neighbours cannot get further apart than the noodle', () => {
    const lv = flatRoom(60); lv.tether = 170;
    const w = makeWorld(lv, 2);
    frames(w, 10);
    frames(w, 200, () => [{ mx: -1 }, { mx: 1 }]);
    expect(dist(w.players[0], w.players[1])).toBeLessThanOrEqual(171);
  });
  it('a kaiju who walks off a ledge dangles (no splat) and is hauled up when the friend walks away', () => {
    const lv = flatRoom(40, b => b.solid(1, 12, 10, 4).clear(11, 16, 6, 2)); lv.tether = 170;
    const w = makeWorld(lv, 2);
    const [a, b] = w.players;
    place(a, 9.5 * T, 12 * T); place(b, 10.5 * T, 12 * T);
    frames(w, 10);
    frames(w, 120, () => [{}, { mx: 1 }]); // b walks off into the bottomless gap
    expect(w.phase).toBe('play');
    expect(b.y).toBeGreaterThan(12 * T);
    until(w, () => [{ mx: -1 }, {}], () => up(b, 12 * T), 400, 'hauled up');
    expect(w.phase).toBe('play');
  });
});

describe('Pot Mech', () => {
  const mechRoom = (edit?: Parameters<typeof flatRoom>[1]) => flatRoom(50, b => { b.add({ t: 'robot', x: 10, y: 13 }); edit?.(b); });
  it('GRAB to climb in; one crew does everything; HOLD GRAB to hop out', () => {
    const w = makeWorld(mechRoom(), 2);
    const [a] = w.players;
    const r = w.robots[0];
    place(a, r.x - 10, 16 * T);
    frames(w, 10);
    tap(w, 0);
    expect(a.inRobot).toBe(0);
    const x0 = r.x;
    frames(w, 60, () => [{ mx: 1 }]);
    expect(r.x).toBeGreaterThan(x0 + 60);
    let top = r.y;
    frames(w, 60, (_, f) => { top = Math.min(top, r.y); return [{ jump: f < 3 }]; });
    expect(16 * T - PHYS.robot.h - top).toBeGreaterThan(4 * T);
    tap(w, 0);
    expect(a.inRobot).toBe(0); // a tap doesn't throw you out any more
    frames(w, 40, () => [{ grab: true }]); // hold GRAB to hop out
    expect(a.inRobot).toBe(-1);
    expect(r.crew).toEqual([]);
  });
  it('with 3 crew: 1st steers, 2nd jumps, 3rd works the arm', () => {
    const w = makeWorld(mechRoom(b => b.add({ t: 'item', kind: 'melon', x: 17, y: 15 })), 3);
    const r = w.robots[0];
    w.players.forEach(p => place(p, r.x - 10, 16 * T));
    frames(w, 5);
    for (let i = 0; i < 3; i++) tap(w, i);
    expect(r.crew).toEqual([0, 1, 2]);
    const x0 = r.x;
    frames(w, 30, () => [{}, { mx: 1 }, { mx: 1 }]); // not the legs: no movement
    expect(Math.abs(r.x - x0)).toBeLessThan(1);
    frames(w, 30, () => [{}, { jump: true }, {}]); // jump seat
    expect(r.y).toBeLessThan(16 * T - PHYS.robot.h - 10);
    frames(w, 60);
    until(w, () => [{ mx: 1 }], () => r.x + r.w > 17 * T - 30, 300, 'to melon');
    frames(w, 10);
    tap(w, 2);
    expect(r.carry).toBe(0);
  });
  it('kaiju cannot lift a watermelon', () => {
    const w = makeWorld(flatRoom(40, b => b.add({ t: 'item', kind: 'melon', x: 8, y: 15 })), 2);
    const a = w.players[0];
    place(a, 8 * T + 20, 16 * T);
    frames(w, 5);
    tap(w, 0);
    expect(a.carry).toBe(-1);
    expect(w.events.some(e => e.type === 'heavy')).toBe(true);
  });
  it('weighs 6 on a scale, smashes crackers, and carries a kaiju on its head up a jump', () => {
    const w = makeWorld(mechRoom(b => b.solid(20, 0, 1, 8).add({ t: 'block', mat: 'cracker', x: 20, y: 8, w: 1, h: 8 }, { t: 'scale', id: 's', x: 14, y: 15, w: 3, need: 6 })), 2);
    const [a, b] = w.players;
    const r = w.robots[0];
    place(a, r.x - 10, 16 * T);
    frames(w, 5);
    tap(w, 0);
    place(b, r.x + r.w / 2, r.y - 1);
    frames(w, 5);
    until(w, (_, f) => [{ mx: 1, jump: f % 40 === 0 }], () => w.scales[0].active, 300, 'on scale');
    frames(w, 2);
    until(w, () => [{ mx: 1 }], () => w.blocks[0].broken, 300, 'smash');
    frames(w, 30);
    place(b, r.x + r.w / 2, r.y - 1);
    frames(w, 5);
    const by = b.y;
    let top = b.y;
    frames(w, 60, (_, f) => { top = Math.min(top, b.y); return [{ jump: f < 3 }]; });
    expect(by - top).toBeGreaterThan(3 * T);
  });
});

describe('order tickets and mousetraps', () => {
  it('a ticket fires when the first kaiju passes; moon gravity makes jumps much higher', () => {
    const w = makeWorld(flatRoom(40, b => b.add({ t: 'ticket', x: 6, rule: 'lowgrav' })), 2);
    const a = w.players[1];
    frames(w, 10);
    until(w, () => [{ mx: 1 }, { mx: 1 }], () => w.rule === 'lowgrav', 300, 'ticket');
    frames(w, 30);
    let top = bottom(a);
    frames(w, 120, (_, f) => { top = Math.min(top, bottom(a)); return [{}, { jump: f < 60 }]; });
    expect(16 * T - top).toBeGreaterThan(6 * T);
  });
  it('reverse swaps left and right; untie cuts the noodle', () => {
    const lv = flatRoom(60, b => b.add({ t: 'ticket', x: 5, rule: 'reverse' }, { t: 'ticket', x: 8, rule: 'untie' })); lv.tether = 170;
    const w = makeWorld(lv, 2);
    const a = w.players[1];
    frames(w, 10);
    until(w, () => [{ mx: 1 }, { mx: 1 }], () => w.rule === 'reverse', 300);
    const x0 = a.x;
    frames(w, 30, () => [{ mx: 1 }, { mx: 1 }]);
    expect(a.x).toBeLessThan(x0);
    a.x = 9.5 * T; w.players[0].x = 8.6 * T;
    frames(w, 2);
    expect(w.tetherLen).toBe(0);
  });
  it('mousetraps splat', () => {
    const w = makeWorld(flatRoom(40, b => b.traps(8, 16, 2)), 2);
    frames(w, 10);
    let splat = false;
    for (let f = 0; f < 200 && !splat; f++) { w.step([{ mx: 0, jump: false, grab: false }, { mx: 1, jump: false, grab: false }]); splat = w.phase === 'splat'; }
    expect(splat).toBe(true);
  });
});

describe('Noodle Buddies', () => {
  for (const n of [2, 3, 6]) {
    it(`${n} kaiju: lower the front kaiju into the pit for the honey and haul them back up`, () => {
      const w = makeWorld(lvl('Noodle Buddies'), n);
      const a = w.players[n - 1];
      frames(w, 10);
      until(w, () => w.players.map(p => (p === a ? { mx: 1 } : toward(p, 8.6 * T - (n - 2 - p.idx) * 36, 5))), () => a.grounded && a.y > 14 * T, 600, 'down in the pit');
      until(w, () => only(n - 1, toward(a, 10 * T + 20, 5)), () => Math.abs(cx(a) - (10 * T + 20)) < 10, 300, 'to honey');
      tap(w, n - 1);
      expect(w.items[a.carry]?.kind).toBe('honey');
      until(w, () => w.players.map(p => (p === a ? {} : { mx: -1 })), () => up(a, 13 * T), 600, 'hauled up');
    });
  }
  it('pillar hops: a missed jump is caught by the noodle and the faller is hauled back', () => {
    const w = makeWorld(lvl('Noodle Buddies'), 2);
    const [b, a] = w.players;
    place(a, 23 * T, 13 * T); place(b, 21 * T, 13 * T);
    frames(w, 10);
    frames(w, 90, () => [{}, { mx: 1 }]); // walks straight off the edge
    expect(w.phase).toBe('play');
    expect(a.y).toBeGreaterThan(13 * T);
    until(w, () => [{ mx: -1 }, {}], () => up(a, 13 * T), 600, 'hauled up');
    // then hop across all the pillars
    const tops = [27, 31, 35, 39, 44]; // pillar centres (tiles), then the far ledge
    // front kaiju to the very edge, partner right behind
    until(w, () => [{}, toward(a, 23.6 * T, 3)], () => Math.abs(cx(a) - 23.6 * T) < 6, 300);
    until(w, () => [toward(b, 22.7 * T, 3), {}], () => Math.abs(cx(b) - 22.7 * T) < 6, 300);
    for (const t of tops) {
      for (const [p, i, goal] of [[a, 1, t + 0.45], [b, 0, t - 0.45]] as [Player, number, number][]) {
        until(w, (_, f) => only(i, { ...toward(p, goal * T, 4), jump: f < 20 && Math.abs(cx(p) - goal * T) > 30 }), () => p.grounded && Math.abs(cx(p) - goal * T) < 12, 600, `P${i} to ${goal}`);
        frames(w, 4);
      }
    }
    expect(w.phase).toBe('play');
  });
});

describe('Swing Shift', () => {
  it('dangle down the shaft, swing into the nook, grab the pasta, get hauled up', () => {
    const w = makeWorld(lvl('Swing Shift'), 2);
    const [b, a] = w.players;
    place(b, 11 * T, 10 * T); place(a, 11.6 * T, 10 * T);
    frames(w, 10);
    frames(w, 40, () => [{}, { mx: 1 }]); // a steps off into the shaft
    until(w, () => [toward(b, 11.4 * T, 3), { mx: 1 }], () => a.x + a.w + 10 > 14 * T + 8 && a.y + a.h + 10 > 13 * T + 16, 600, 'into the nook');
    tap(w, 1);
    expect(w.items[a.carry]?.kind).toBe('pasta');
    expect(w.phase).toBe('play');
    until(w, () => [{ mx: -1 }, {}], () => up(a, 10 * T), 600, 'hauled up');
  });
});

describe('Pot Mech (level)', () => {
  for (const n of [2, 3]) {
    it(`${n} kaiju: board, smash, the rest ride up the step, scale opens the door, all get through`, () => {
      const w = makeWorld(lvl('Pot Mech'), n);
      const r = w.robots[0];
      const pilot = w.players[n - 1];
      frames(w, 10);
      until(w, () => only(n - 1, toward(pilot, r.x - 10, 5)), () => Math.abs(cx(pilot) - (r.x - 10)) < 12, 300);
      tap(w, n - 1);
      expect(pilot.inRobot).toBe(0);
      // riders hop onto its head
      for (const p of w.players) if (p !== pilot) { place(p, r.x + 20 + p.idx * 30, r.y); }
      frames(w, 10);
      until(w, () => only(n - 1, { mx: 1 }), () => w.blocks[0].broken, 400, 'smash');
      until(w, () => only(n - 1, { mx: 1 }), () => r.x + r.w > 17 * T, 400, 'at the step');
      frames(w, 40, (_, f) => only(n - 1, { mx: 1, jump: f < 3 }));
      until(w, () => only(n - 1, { mx: 1 }), () => r.grounded && r.y + r.h <= 13 * T + 1, 300, 'up the step');
      expect(w.players.filter(p => p !== pilot).every(p => p.y + p.h <= 13 * T + 1)).toBe(true);
      until(w, () => only(n - 1, toward({ x: r.x, w: r.w } as Player, 25.5 * T)), () => w.scales[0].active, 600, 'on the scale');
      until(w, () => w.players.map(() => ({ mx: 1 })), () => w.players.every(p => p.x > 33 * T), 900, 'through the door');
    });
  }
});

describe('Mech Arm (level)', () => {
  it('the Mech carries the watermelon over the low shelf to the pot', () => {
    const w = makeWorld(lvl('Mech Arm'), 2);
    const r = w.robots[0];
    const [, a] = w.players;
    place(a, r.x - 10, 16 * T);
    place(w.players[0], r.x + r.w / 2, r.y - 1);
    w.leverOn.set('g', true); // (the lever puzzle is tested below)
    frames(w, 10);
    tap(w, 1);
    until(w, () => [{}, { mx: 1 }], () => r.x + r.w > 13 * T, 400);
    frames(w, 10);
    tap(w, 1);
    expect(w.items[r.carry]?.kind).toBe('melon');
    until(w, () => [{}, { mx: 1 }], () => r.x + r.w > 25 * T - 10, 400, 'to the low shelf');
    frames(w, 60, (_, f) => [{}, { mx: 1, jump: f < 3 }]);
    until(w, () => [{}, { mx: 1 }], () => r.x > 37 * T && r.grounded, 600, 'over it');
    until(w, () => [{}, { mx: 1 }], () => r.x + r.w > 43 * T, 400, 'at the pot');
    tap(w, 1);
    expect(w.delivered).toBe(1);
  });
  it('a kaiju riding the Mech jumps up to the lever shelf', () => {
    const w = makeWorld(lvl('Mech Arm'), 2);
    const r = w.robots[0];
    const [b, a] = w.players;
    place(a, r.x - 10, 16 * T);
    place(b, 19.5 * T, 16 * T);
    frames(w, 5);
    tap(w, 1);
    until(w, () => [{}, toward({ x: r.x, w: r.w } as Player, 15 * T)], () => Math.abs(r.x + r.w / 2 - 15 * T) < 8, 400);
    place(b, r.x + r.w / 2, r.y - 1);
    frames(w, 10);
    until(w, (_, f) => [{ ...toward(b, 17.5 * T), jump: f % 50 < 30 }, {}], () => up(b, 12 * T), 300, 'on the shelf');
    until(w, () => [toward(b, 17 * T + 20, 5), {}], () => Math.abs(cx(b) - (17 * T + 20)) < 10, 200);
    tap(w, 0);
    frames(w, 30);
    expect(w.doors[0].open).toBe(1);
  });
});

describe('Pantry Panic after a splat', () => {
  it('splatting past the 4-tile step brings the Mech (with its watermelon) and the left-behind flour to the checkpoint', () => {
    const w = makeWorld(PANTRY_LEVELS.find(l => l.name === 'Pantry Panic')!, 2);
    const r = w.robots[0];
    const melon = w.items.find(i => i.kind === 'melon')!;
    w.tetherLen = 0;
    // the Mech carries the melon, but is left behind the step; the team goes on and reaches checkpoint 2
    r.carry = melon.idx; melon.carrier = 1000;
    w.players.forEach((p, i) => { p.x = 70 * T + i * 40; p.y = 16 * T - p.h; });
    frames(w, 10);
    expect(w.checkpoint).toBe(1);
    // splat on the mousetraps
    const [a] = w.players;
    a.x = 76 * T; a.y = 16 * T - a.h - 2;
    for (let f = 0; f < 120 && w.phase !== 'splat'; f++) frames(w, 1);
    expect(w.phase).toBe('splat');
    for (let f = 0; f < 200 && w.phase !== 'play'; f++) frames(w, 1);
    expect(w.phase).toBe('play');
    expect(r.x).toBeGreaterThan(65 * T); // the Mech came along
    expect(r.carry).toBe(melon.idx); // still holding the melon
    const flour = w.items.find(i => i.kind === 'flour')!;
    expect(flour.x).toBeGreaterThan(66 * T); // the flour left on the step came along too
  });
});

describe('ticket levels never depend on a ticket', () => {
  it('Order Chaos: the steps can be climbed in normal gravity, by every kaiju on its own', () => {
    const lv = PANTRY_LEVELS.find(l => l.name === 'Order Chaos')!;
    const w = makeWorld({ ...lv, ents: lv.ents.filter(e => e.t !== 'ticket') }, 2);
    frames(w, 10);
    for (const [k, p] of [...w.players].sort((a, b) => b.x - a.x).entries()) {
      until(w, () => only(p.idx, walker(w, p, (21 - k) * T)), () => p.grounded && Math.abs(cx(p) - (21 - k) * T) < 10, 900, `P${p.idx} over the steps`);
    }
  });
  it('solo play: a ticket prints when the first kaiju reaches it, even with a friend asleep at the start', () => {
    const w = makeWorld(PANTRY_LEVELS.find(l => l.name === 'Order Chaos')!, 2);
    frames(w, 10);
    until(w, () => [{}, { mx: 1 }], () => w.rule === 'lowgrav', 300, 'ticket');
  });
});

describe('Order Chaos', () => {
  for (let n = MIN_PLAYERS; n <= MAX_PLAYERS; n++) {
    it(`${n} kaiju: moon gravity gets everyone over the 6-tile wall`, () => {
      const w = makeWorld(lvl('Order Chaos'), n);
      frames(w, 10);
      until(w, (_, f) => w.players.map((p, i) => (p.x > 18.5 * T ? {} : { mx: 1, jump: (f + i * 11) % 70 < 50 })), () => w.players.every(p => p.x > 18 * T), 2400, 'over the wall');
      expect(w.rule).toBe('lowgrav');
    });
  }
});

describe('Pot Mech crew jobs', () => {
  it('solo with SWAP: both kaiju aboard, the one actually playing drives and works the arm', () => {
    const w = makeWorld(flatRoom(50, b => b.add({ t: 'robot', x: 10, y: 13 }, { t: 'item', kind: 'melon', x: 20, y: 15 })), 2);
    const r = w.robots[0];
    const [a, b] = w.players;
    place(a, r.x - 10, 16 * T); place(b, r.x - 50, 16 * T);
    frames(w, 10);
    tap(w, 0); // A climbs in
    until(w, () => [{}, { mx: 1 }], () => b.x + b.w > r.x - 4, 200, 'B walks up'); // the player swaps to B
    tap(w, 1); // B climbs in (A is now asleep inside)
    expect(r.crew).toEqual([0, 1]);
    frames(w, 160, () => [{}, {}]);
    frames(w, 10, () => [{}, { mx: 1 }]);
    expect(r.roles).toEqual(['ride', 'all']);
    const x0 = r.x;
    until(w, () => [{}, { mx: 1 }], () => r.x + r.w > 20 * T - 20, 600, 'B drives');
    expect(r.x).toBeGreaterThan(x0 + 100);
    frames(w, 10);
    tap(w, 1);
    expect(w.items[r.carry]?.kind).toBe('melon');
    expect(r.crew).toEqual([0, 1]); // grabbing never throws anyone out
  });
  it('a GRAB with nothing to grab keeps you in the Mech', () => {
    const w = makeWorld(flatRoom(50, b => b.add({ t: 'robot', x: 10, y: 13 })), 2);
    const r = w.robots[0];
    place(w.players[0], r.x - 10, 16 * T);
    frames(w, 5);
    tap(w, 0);
    tap(w, 0); tap(w, 0);
    expect(r.crew).toEqual([0]);
  });
});

describe('Pot Mech: hopping out keeps what the arm holds', () => {
  it('tap GRAB = arm picks up; hold GRAB = hop out, and the Mech is still holding it', async () => {
    const { Play } = await import('./play');
    const { flatRoom } = await import('./helpers');
    const g = new Play(flatRoom(30, b => b.add({ t: 'robot', x: 8, y: 13 }, { t: 'item', kind: 'melon', x: 13, y: 15 })), 2);
    const [A] = g.order();
    g.board(A);
    g.mechTo(A, 11.2);
    g.mechArm(A);
    const r = g.w.robots[0];
    expect(r.carry).toBeGreaterThanOrEqual(0);
    g.unboard(A);
    expect(r.carry).toBeGreaterThanOrEqual(0);
  });
});

describe('Pot Mech: boarding next to the watermelon', () => {
  it('GRAB beside both the melon and the Mech climbs in', async () => {
    const { Play } = await import('./play');
    const { flatRoom } = await import('./helpers');
    const g = new Play(flatRoom(30, b => b.add({ t: 'robot', x: 14, y: 13 }, { t: 'item', kind: 'melon', x: 12, y: 15 })), 2);
    const [A] = g.order();
    g.walk(A, 13.3);
    g.grab(A);
    expect(g.P(A).inRobot).toBe(0);
  });
});
