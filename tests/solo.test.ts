import { describe, expect, it } from 'vitest';
import { LEVELS } from '../src/sim/levels';
import { NO_INPUT } from '../src/sim/world';
import { nudgeSleepers } from '../src/sim/solo';
import { makeWorld } from './helpers';

describe('solo practice (same screen, one person)', () => {
  it('Sugar Cubes: walking into your snoozing friend pushes the ×2 cube', () => {
    const w = makeWorld(LEVELS[2], 2);
    const big = w.crates[1];
    const [awake, sleepy] = w.players;
    sleepy.x = big.x - sleepy.w - 1; awake.x = sleepy.x - awake.w - 20;
    const x0 = big.x;
    for (let f = 0; f < 400; f++) w.step(nudgeSleepers(w, [{ ...NO_INPUT, mx: 1 }, { ...NO_INPUT }], i => i === 1));
    expect(big.x).toBeGreaterThan(x0 + 100);
  });
});

describe('nudging under the backwards-day ticket', () => {
  it('a kaiju walking (backwards) into a sleeper shoves it, and leaves the one behind it alone', async () => {
    const { nudgeSleepers } = await import('../src/sim/solo');
    const { makeWorld, flatRoom, frames } = await import('./helpers');
    const { NO_INPUT } = await import('../src/sim/world');
    const w = makeWorld(flatRoom(30, b => b.start(8)), 3);
    frames(w, 30);
    const [a, b, c] = [...w.players].sort((p, q) => p.x - q.x); // b in the middle, touching both
    b.x = a.x + a.w + 1; c.x = b.x + b.w + 1;
    frames(w, 2);
    w.rule = 'reverse';
    const inputs = w.players.map(() => ({ ...NO_INPUT }));
    inputs[b.idx] = { ...NO_INPUT, mx: -1 }; // presses left, really walks right
    const out = nudgeSleepers(w, inputs, i => i !== b.idx);
    expect(out[c.idx].mx).toBe(-1); // the one in front (to the right) shuffles along
    expect(out[a.idx].mx).toBe(0); // the one behind is not dragged
  });
});
