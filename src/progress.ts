// Saved progress: best times, stars, which worlds are open, which hats are unlocked and who wears what.
// Stars per level (kept forever once earned): ★ cleared, ★ clean run (no splats), ★ golden spoon found.
import { LEVELS } from './sim/levels';

export const STAR_CLEAR = 1, STAR_CLEAN = 2, STAR_SPOON = 4;

export interface Hat { id: string; name: string; stars: number }
/** Hats unlock as the crew's star total grows. */
export const HATS: Hat[] = [
  { id: 'chef', name: 'Chef toque', stars: 0 },
  { id: 'party', name: 'Party hat', stars: 3 },
  { id: 'beanie', name: 'Beanie', stars: 8 },
  { id: 'flower', name: 'Sunflower', stars: 14 },
  { id: 'cowboy', name: 'Cowboy hat', stars: 20 },
  { id: 'propeller', name: 'Propeller cap', stars: 28 },
  { id: 'pirate', name: 'Pirate hat', stars: 36 },
  { id: 'viking', name: 'Viking helmet', stars: 46 },
  { id: 'tophat', name: 'Top hat', stars: 58 },
  { id: 'crown', name: 'Crown', stars: 75 },
];

interface Save { best: Record<number, number>; stars: Record<number, number>; hats: Record<number, string> }
const KEY = 'kkc-save', OLD_KEY = 'kkc-progress';
/** Levels are needed in the previous world to open the next one. */
export const UNLOCK_NEED = 4;

function read(): Save {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw) as Partial<Save>;
      return { best: s.best ?? {}, stars: s.stars ?? {}, hats: s.hats ?? {} };
    }
    // first run after the update: carry over best times (each one is a clear)
    const old = JSON.parse(localStorage.getItem(OLD_KEY) ?? '{}') as Record<number, number>;
    const stars: Record<number, number> = {};
    for (const k of Object.keys(old)) stars[Number(k)] = STAR_CLEAR;
    return { best: old, stars, hats: {} };
  } catch {
    return { best: {}, stars: {}, hats: {} };
  }
}
function write(s: Save): void {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* private mode: progress lasts this session */ }
}

export function bestTime(level: number): number | undefined { return read().best[level]; }
export function starMask(level: number): number { return read().stars[level] ?? 0; }
export const countStars = (mask: number) => (mask & 1) + ((mask >> 1) & 1) + ((mask >> 2) & 1);
export function totalStars(): number { return Object.values(read().stars).reduce((a, m) => a + countStars(m), 0); }

/** World index (0-based) of each level, and the level indices of each world. */
export const WORLDS: { name: string; levels: number[] }[] = [];
LEVELS.forEach((l, i) => {
  let wd = WORLDS.find(x => x.name === l.world);
  if (!wd) WORLDS.push(wd = { name: l.world, levels: [] });
  wd.levels.push(i);
});
export const worldOf = (level: number) => WORLDS.findIndex(x => x.levels.includes(level));

const unlockAll = () => typeof location !== 'undefined' && /[?&]unlock\b/.test(location.search);
export function clearedIn(world: number): number {
  const s = read();
  return WORLDS[world]?.levels.filter(i => (s.stars[i] ?? 0) & STAR_CLEAR).length ?? 0;
}
export function worldOpen(world: number): boolean {
  return world === 0 || unlockAll() || clearedIn(world - 1) >= Math.min(UNLOCK_NEED, WORLDS[world - 1].levels.length);
}
export const levelOpen = (level: number) => worldOpen(worldOf(level));

export interface ClearResult { best: boolean; newStars: number; starsNow: number; newHats: Hat[]; worldOpened: number | null }
/** Record a clear; reports what's new (stars, hats, a world opening) for the celebration. */
export function recordClear(level: number, time: number, splats: number, spoon: boolean): ClearResult {
  const s = read();
  const hatsBefore = unlockedHats().map(h => h.id);
  const nextWorld = worldOf(level) + 1;
  const wasOpen = nextWorld < WORLDS.length && worldOpen(nextWorld);
  const best = s.best[level] === undefined || time < s.best[level];
  if (best) s.best[level] = Math.round(time * 10) / 10;
  const got = STAR_CLEAR | (splats === 0 ? STAR_CLEAN : 0) | (spoon ? STAR_SPOON : 0);
  const before = s.stars[level] ?? 0;
  s.stars[level] = before | got;
  write(s);
  return {
    best,
    newStars: s.stars[level] & ~before,
    starsNow: s.stars[level],
    newHats: unlockedHats().filter(h => !hatsBefore.includes(h.id)),
    worldOpened: nextWorld < WORLDS.length && !wasOpen && worldOpen(nextWorld) ? nextWorld : null,
  };
}

export function unlockedHats(): Hat[] {
  const n = totalStars();
  return HATS.filter(h => h.stars <= n || unlockAll());
}
/** The hat a kaiju species wears ('' = none). */
export function hatOf(species: number): string {
  const id = read().hats[species] ?? '';
  return unlockedHats().some(h => h.id === id) ? id : '';
}
export function setHat(species: number, id: string): void {
  const s = read();
  if (id) s.hats[species] = id; else delete s.hats[species];
  write(s);
}
