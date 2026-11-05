import { T } from '../src/sim/constants';
import { LevelBuilder, type LevelDef } from '../src/sim/level';
import { NO_INPUT, World, type Player, type PlayerInput } from '../src/sim/world';

export type Script = (w: World, frame: number) => (Partial<PlayerInput> | undefined)[];

export function makeWorld(level: LevelDef, n: number): World {
  return new World(level, Array.from({ length: n }, (_, i) => i), Array.from({ length: n }, (_, i) => `P${i + 1}`));
}

/** Runs until cond() is true (returns frames used) or throws after max frames. */
export function until(w: World, script: Script, cond: (w: World) => boolean, max = 900, what = 'condition'): number {
  for (let f = 0; f < max; f++) {
    if (cond(w)) return f;
    const raw = script(w, f);
    const inputs = w.players.map((_, i) => ({ ...NO_INPUT, ...(raw[i] ?? {}) }));
    w.step(inputs);
    if (w.phase === 'splat') throw new Error(`splat while waiting for ${what} (player ${w.splatWho})`);
  }
  if (cond(w)) return max;
  throw new Error(`timed out waiting for ${what}: ` + w.players.map(p => `P${p.idx}@(${p.x.toFixed(0)},${p.y.toFixed(0)})`).join(' '));
}

export function frames(w: World, n: number, script: Script = () => []): void {
  for (let f = 0; f < n; f++) {
    const raw = script(w, f);
    w.step(w.players.map((_, i) => ({ ...NO_INPUT, ...(raw[i] ?? {}) })));
  }
}

export const cx = (p: Player) => p.x + p.w / 2;
export const bottom = (p: Player) => p.y + p.h;
/** Input that walks player towards an x centre. */
export const toward = (p: Player, x: number, tol = 3): Partial<PlayerInput> => ({ mx: Math.abs(cx(p) - x) <= tol ? 0 : Math.sign(x - cx(p)) * (Math.abs(cx(p) - x) < 12 ? 0.3 : 1) });

/** A flat test room with optional tweaks. */
export function flatRoom(w = 40, edit?: (b: LevelBuilder) => void): LevelDef {
  const b = new LevelBuilder('Test', 'Test', '', w, ['bread']).room();
  edit?.(b);
  return b.start(2).build();
}

export const tileTop = (row: number) => row * T;

/** Walk towards x, jumping when there is a gap or a step just ahead (like a player would). */
export function walker(w: World, p: Player, x: number): Partial<PlayerInput> {
  const dir = Math.sign(x - cx(p));
  if (Math.abs(cx(p) - x) < 6) return {};
  const ww = w as unknown as { solidsFor(b: unknown): { x: number; y: number; w: number; h: number }[]; tileHits(b: unknown, pb: number | null): unknown[] };
  const aheadX = dir > 0 ? p.x + p.w + 2 : p.x - 14;
  const floorProbe = { x: aheadX, y: p.y + p.h + 1, w: 12, h: 30 };
  const wallProbe = { x: aheadX, y: p.y, w: 12, h: p.h - 4 };
  // friends are not obstacles to jump over: just queue behind them
  const hit = (b: { x: number; y: number; w: number; h: number }) => ww.tileHits(b, null).length > 0 || ww.solidsFor(p).some(s => (s as { kind?: string }).kind !== 'player' && b.x < s.x + s.w && b.x + b.w > s.x && b.y < s.y + s.h && b.y + b.h > s.y);
  const jump = (p.grounded && (!hit(floorProbe) || hit(wallProbe))) || (!p.grounded && p.vy < 0); // hold jump while rising
  return { mx: dir, jump };
}
