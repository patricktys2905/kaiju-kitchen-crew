import { describe, expect, it } from 'vitest';
import { MAX_PLAYERS, MIN_PLAYERS, PHYS, T } from '../src/sim/constants';
import { TILE_EMPTY } from '../src/sim/level';
import { LEVELS } from '../src/sim/levels';
import type { PlayerInput } from '../src/sim/world';
import { bottom, cx, frames, makeWorld, toward, until } from './helpers';

describe('every level is well-formed', () => {
  for (const lvl of LEVELS) {
    describe(lvl.name, () => {
      it('has a pot, a plate, and every recipe ingredient', () => {
        expect(lvl.ents.some(e => e.t === 'pot')).toBe(true);
        expect(lvl.ents.some(e => e.t === 'plate')).toBe(true);
        const have = lvl.ents.filter(e => e.t === 'item').map(e => (e as { kind: string }).kind).sort();
        expect(have).toEqual([...lvl.recipe].sort());
      });
      it('every door/lift/toaster is wired to a switch that exists', () => {
        const ids = new Set(lvl.ents.flatMap(e => (e.t === 'lever' || e.t === 'scale' || e.t === 'timer' ? [e.id] : [])));
        for (const e of lvl.ents) if ((e.t === 'door' || e.t === 'toaster' || (e.t === 'lift' && e.on)) && 'on' in e) expect(ids.has(e.on!)).toBe(true);
      });
      it('has at most one golden spoon, floating in open air', () => {
        const spoons = lvl.ents.filter(e => e.t === 'spoon') as { x: number; y: number }[];
        expect(spoons.length).toBeLessThanOrEqual(1);
        for (const sp of spoons) {
          expect(sp.y).toBeGreaterThanOrEqual(1);
          expect(lvl.tiles[sp.y * lvl.w + sp.x]).toBe(TILE_EMPTY);
        }
      });
      for (let n = MIN_PLAYERS; n <= MAX_PLAYERS; n++) {
        it(`${n} kaiju spawn in open space and settle without a splat`, () => {
          const w = makeWorld(lvl, n);
          for (const p of w.players) {
            const i0 = Math.floor(p.x / T), i1 = Math.floor((p.x + p.w - 0.01) / T);
            const j0 = Math.floor(p.y / T), j1 = Math.floor((p.y + p.h - 0.01) / T);
            for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) expect(lvl.tiles[j * lvl.w + i]).toBe(TILE_EMPTY);
          }
          frames(w, 60);
          expect(w.phase).toBe('play');
          for (const p of w.players) expect(p.grounded).toBe(true);
        });
        it(`scales are satisfiable with ${n} kaiju (+ cubes)`, () => {
          const w = makeWorld(lvl, n);
          const cubeWeight = w.crates.reduce((s, c) => s + c.weight, 0) + w.robots.length * 6; // the Pot Mech weighs 6
          for (const s of w.scales) expect(s.need).toBeLessThanOrEqual(n + cubeWeight);
          // a BIG kaiju (cookie) pushes like two
          const strength = lvl.ents.some(e => e.t === 'pickup' && e.kind === 'cookie') ? 2 * n : n;
          for (const c of w.crates) expect(c.need).toBeLessThanOrEqual(strength);
        });
      }
    });
  }
});

/** Hold right and hop: gets a kaiju over small things and onto friends. */
const hopRight = (f: number, i: number): Partial<PlayerInput> => ({ mx: 1, jump: (f + i * 7) % 36 < 16 });

describe('Shelf Help can be finished', () => {
  for (let n = MIN_PLAYERS; n <= MAX_PLAYERS; n++) {
    it(`with ${n} kaiju`, () => {
      const w = makeWorld(LEVELS[0], n);
      const P = w.players;
      const booster = P[n - 1], climber = P[n - 2];
      const plateauTop = 13 * T;
      const up = (p: (typeof P)[number]) => p.grounded && bottom(p) <= plateauTop + 1;
      frames(w, 20);
      // 1. booster goes to the wall, climber hops on its head, then up onto the counter
      until(w, () => { const a: Partial<PlayerInput>[] = []; a[n - 1] = toward(booster, 541); return a; }, () => Math.abs(cx(booster) - 541) < 4, 400, 'booster at wall');
      until(w, (_, f) => { const a: Partial<PlayerInput>[] = []; a[n - 2] = { mx: 1, jump: f % 40 < 25 }; return a; }, () => up(climber), 600, 'climber on counter');
      // 2. climber goes to the lever (it is the right-most from now on)
      const leverX = 21 * T + 20;
      until(w, () => { const a: Partial<PlayerInput>[] = []; a[n - 2] = toward(climber, leverX + 30); return a; }, () => Math.abs(cx(climber) - (leverX + 30)) < 4, 400, 'climber at lever');
      const pull = () => frames(w, 2, (_, f) => { const a: Partial<PlayerInput>[] = []; a[n - 2] = { grab: f === 0 }; return a; });
      // 3. ferry everyone up with the lift
      for (let trip = 0; trip < 6 && !P.every(up); trip++) {
        frames(w, 120, () => P.map(p => (p === climber || up(p) ? {} : { mx: 1 })));
        pull();
        frames(w, 90);
        expect(w.lifts[0].y).toBeCloseTo(13 * T, 1);
        // riders step off to the right (stopping short of the climber)
        frames(w, 90, () => P.map(p => (p !== climber && up(p) ? toward(p, leverX - 60) : {})));
        pull();
        frames(w, 90);
      }
      expect(P.every(up)).toBe(true);
      // 4. climber fetches the bread and drops it in the pot
      const bread = w.items[0];
      until(w, () => { const a: Partial<PlayerInput>[] = []; a[n - 2] = toward(climber, bread.x + PHYS.item / 2); return a; }, () => Math.abs(cx(climber) - (bread.x + PHYS.item / 2)) < 4, 400, 'at bread');
      frames(w, 2, (_, f) => { const a: Partial<PlayerInput>[] = []; a[n - 2] = { grab: f === 0 }; return a; });
      expect(climber.carry).toBe(0);
      until(w, () => { const a: Partial<PlayerInput>[] = []; a[n - 2] = toward(climber, 31 * T - 20); return a; }, () => Math.abs(cx(climber) - (31 * T - 20)) < 4, 400, 'at pot');
      frames(w, 2, (_, f) => { const a: Partial<PlayerInput>[] = []; a[n - 2] = { grab: f === 0 }; return a; });
      expect(w.recipeDone).toBe(true);
      // 5. everyone onto the plate
      until(w, (_, f) => P.map((p, i) => (w.onPlate(p) ? {} : hopRight(f, i))), () => w.phase === 'clear', 2400, 'everyone on the plate');
    });
  }
});

describe('respawning is safe at every checkpoint', () => {
  for (const lvl of LEVELS) {
    it(lvl.name, () => {
      for (let n = MIN_PLAYERS; n <= MAX_PLAYERS; n++) {
        const w = makeWorld(lvl, n);
        for (let c = -1; c < w.checks.length; c++) {
          w.checkpoint = c;
          (w as unknown as { respawn(): void }).respawn();
          frames(w, 120); // nobody touches anything: they must just stand there safely
          expect(w.phase, `${n} kaiju at checkpoint ${c}`).toBe('play');
          expect(w.splats).toBe(0);
        }
      }
    });
  }
});

describe('after a splat, nothing you still need is stranded behind the checkpoint', () => {
  for (const lvl of LEVELS) {
    it(lvl.name, () => {
      const w = makeWorld(lvl, 2);
      for (let c = 0; c < w.checks.length; c++) {
        const cp = w.checks[c];
        w.checkpoint = c;
        (w as unknown as { respawn(): void }).respawn();
        frames(w, 60);
        for (const it of w.items) if (!it.delivered && it.carrier < 0) expect(it.x + 12, `${it.kind} behind checkpoint ${c}`).toBeGreaterThanOrEqual(cp.x - 2 * T);
        for (const r of w.robots) expect(r.x + r.w / 2, `Mech behind checkpoint ${c}`).toBeGreaterThanOrEqual(cp.x - 7 * T);
        expect(w.phase).toBe('play');
      }
    });
  }
});
