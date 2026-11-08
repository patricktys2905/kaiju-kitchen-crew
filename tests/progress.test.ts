import { beforeEach, describe, expect, it } from 'vitest';

// a tiny in-memory localStorage for the progress module
const store = new Map<string, string>();
(globalThis as unknown as { localStorage: Storage }).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
  clear: () => store.clear(),
  key: () => null,
  length: 0,
} as Storage;

const P = await import('../src/progress');

describe('progress, stars and unlocks', () => {
  beforeEach(() => store.clear());

  it('a clear gives ★, no splats ★, the spoon ★ — and stars are kept forever', () => {
    let r = P.recordClear(0, 50, 2, false);
    expect(P.countStars(r.starsNow)).toBe(1);
    expect(r.best).toBe(true);
    r = P.recordClear(0, 60, 0, false);
    expect(r.best).toBe(false);
    expect(P.countStars(r.newStars)).toBe(1);
    r = P.recordClear(0, 70, 3, true); // a sloppy run with the spoon still adds the spoon star
    expect(P.countStars(r.starsNow)).toBe(3);
    expect(P.bestTime(0)).toBe(50);
    expect(P.totalStars()).toBe(3);
  });

  it(`world 2 opens after ${P.UNLOCK_NEED} clears in world 1`, () => {
    const w1 = P.WORLDS[0].levels;
    expect(P.worldOpen(1)).toBe(false);
    let opened: number | null = null;
    w1.slice(0, P.UNLOCK_NEED).forEach(i => { const r = P.recordClear(i, 30, 1, false); if (r.worldOpened !== null) opened = r.worldOpened; });
    expect(opened).toBe(1);
    expect(P.worldOpen(1)).toBe(true);
    expect(P.levelOpen(P.WORLDS[1].levels[0])).toBe(true);
    expect(P.worldOpen(2)).toBe(false);
  });

  it('hats unlock with stars, and only unlocked hats can be worn', () => {
    expect(P.unlockedHats().map(h => h.id)).toEqual(['chef']);
    P.setHat(3, 'crown');
    expect(P.hatOf(3)).toBe(''); // locked
    P.setHat(3, 'chef');
    expect(P.hatOf(3)).toBe('chef');
    const r = P.recordClear(0, 30, 0, true); // 3 stars → party hat
    expect(r.newHats.map(h => h.id)).toEqual(['party']);
  });

  it('old saves (best times only) carry over as clears', () => {
    store.set('kkc-progress', JSON.stringify({ 0: 42.5, 1: 61 }));
    expect(P.bestTime(0)).toBe(42.5);
    expect(P.countStars(P.starMask(1))).toBe(1);
    expect(P.totalStars()).toBe(2);
  });
});
