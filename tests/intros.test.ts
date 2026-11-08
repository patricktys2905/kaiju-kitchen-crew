import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const store = new Map<string, string>();
(globalThis as unknown as { localStorage: Storage }).localStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: () => {}, clear: () => store.clear(), key: () => null, length: 0 } as Storage;
const { INTROS, introsFor } = await import('../src/intros');
const { LEVELS } = await import('../src/sim/levels');

describe('mechanic intro cards', () => {
  it('every card has its art', () => {
    for (const i of INTROS) expect(existsSync(`public/art/${i.art}.webp`), i.art).toBe(true);
  });
  it('every mechanic is introduced somewhere, each card only once, at most 3 per level', () => {
    store.clear();
    const shown: string[] = [];
    for (const l of LEVELS) { const c = introsFor(l); expect(c.length).toBeLessThanOrEqual(3); shown.push(...c.map(x => x.key)); }
    expect(new Set(shown).size).toBe(shown.length);
    expect([...shown].sort()).toEqual(INTROS.map(i => i.key).sort());
  });
});
