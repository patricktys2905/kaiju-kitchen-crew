import { describe, expect, it } from 'vitest';
import { applySnapshot, makeSnapshot } from '../src/net/snapshot';
import { T } from '../src/sim/constants';
import { LEVELS } from '../src/sim/levels';
import { PANTRY_LEVELS } from '../src/sim/levels-pantry';
import { frames, makeWorld } from './helpers';

describe('online snapshots', () => {
  it('copy the Pot Mech, its crew, tickets and the noodle to a guest', () => {
    const lvl = PANTRY_LEVELS.find(l => l.name === 'Pantry Panic')!;
    const host = makeWorld(lvl, 3);
    const r = host.robots[0];
    host.tetherLen = 0;
    host.players.forEach((p, i) => { p.x = r.x - 50 - i * 40; p.y = r.y + r.h - 34; });
    host.players[2].x = r.x - 30;
    frames(host, 5);
    frames(host, 2, (_, f) => [{}, {}, { grab: f === 0 }]);
    host.tickets[0].fired = true; host.tetherLen = 0; host.rule = 'lowgrav'; host.ruleT = 7;
    frames(host, 20, () => [{}, {}, { mx: 1 }]);
    const guest = makeWorld(lvl, 3);
    applySnapshot(guest, JSON.parse(JSON.stringify(makeSnapshot(host))));
    expect(guest.robots[0].crew).toEqual([2]);
    expect(guest.players[2].inRobot).toBe(0);
    expect(guest.robots[0].x).toBeCloseTo(r.x, 0);
    expect(guest.tickets[0].fired).toBe(true);
    expect(guest.tetherLen).toBe(0);
    expect(guest.rule).toBe('lowgrav');
  });
  it('every level round-trips without errors', () => {
    for (const l of LEVELS) {
      const a = makeWorld(l, 4), b = makeWorld(l, 4);
      frames(a, 30, () => a.players.map(() => ({ mx: 1 })));
      applySnapshot(b, JSON.parse(JSON.stringify(makeSnapshot(a))));
      a.players.forEach((p, i) => expect(Math.abs(p.x - b.players[i].x)).toBeLessThan(0.1 * T));
    }
  });
});
