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
