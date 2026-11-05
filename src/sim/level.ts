// Level format + a tiny builder so levels are written as code (rectangles of counter, shelves,
// hot hobs, and entities) instead of hand-counted ASCII. All coordinates are in TILES.
import type { ItemKind } from './constants';

/** How many kaiju a scale / sugar cube needs. 'all' = every player; { upTo } = min(players, upTo). */
export type Need = number | 'all' | { upTo: number };

export const TILE_EMPTY = 0;
export const TILE_SOLID = 1;
export const TILE_SHELF = 2; // jump up through, stand on top
export const TILE_HOT = 3; // always-hot hob: solid, splats on touch
export const TILE_ICE = 4; // slippery floor
export const TILE_ICICLE = 5; // icicles: solid, splats on touch
export const TILE_TRAP = 6; // mousetrap: solid, splats on touch
export const isHazardTile = (t: number) => t === TILE_HOT || t === TILE_ICICLE || t === TILE_TRAP;

/** Order tickets change one rule until the next ticket (or for `dur` seconds). 'untie' cuts the noodle. */
export type TicketRule = 'lowgrav' | 'reverse' | 'dark' | 'speedy' | 'untie';

export type PickupKind = 'cookie' | 'lemon' | 'chili' | 'soda';

export type EntDef =
  | { t: 'item'; kind: ItemKind; x: number; y: number }
  | { t: 'pot'; x: number; y: number } // 2 x 1 tiles
  | { t: 'plate'; x: number; y: number; w: number } // exit: y = the row the plate rests on
  | { t: 'lever'; id: string; x: number; y: number }
  | { t: 'scale'; id: string; x: number; y: number; w: number; need: Need; hold?: number } // w x 1, hold = kitchen-timer seconds
  | { t: 'door'; on: string; x: number; y: number; h: number }
  | { t: 'lift'; on?: string; x: number; y: number; w: number; x2: number; y2: number; speed?: number } // no `on` = shuttles forever
  | { t: 'crate'; x: number; y: number; w: number; h: number; need: Need; weight: number }
  | { t: 'toaster'; on: string; x: number; y: number } // 2 x 1, launches whoever stands on it when `on` switches
  | { t: 'burner'; x: number; y: number; w: number; cold: number; hot: number; offset?: number }
  | { t: 'check'; x: number; y: number }
  | { t: 'pickup'; kind: PickupKind; x: number; y: number } // eaten on touch, grows back
  | { t: 'jelly'; x: number; y: number; w: number; h: number; on?: string } // bouncy; frozen solid while switch `on` is on
  | { t: 'block'; mat: 'ice' | 'cracker'; x: number; y: number; w: number; h: number } // ice melts (chili), crackers smash (big kaiju)
  | { t: 'robot'; x: number; y: number } // Pot Mech, 3x3 tiles, top-left tile
  | { t: 'ticket'; x: number; rule: TicketRule; dur?: number } // prints once every kaiju is past column x
  | { t: 'melty'; x: number; y: number; w: number; h: number } // chocolate: melts while stood on, sets again later
  | { t: 'vent'; x: number; y: number; w: number; h: number; cold: number; hot: number; offset?: number } // steam column h tiles tall rising from row y
  | { t: 'jet'; x: number; y: number; w: number; h: number; dir: 1 | -1; cold?: number; hot?: number; offset?: number } // tap jet zone (cold 0 = always on)
  | { t: 'water'; x: number; w: number; low: number; high: number; on?: string } // surface row when drained / filled (filled while `on`; no switch = always filled)
  | { t: 'bubbler'; x: number; y: number; every: number } // soap bubbles you can ride up
  | { t: 'hand'; period: number; offset?: number } // the Chef's Hand slams where the team is (hide under something!)
  | { t: 'balance'; x1: number; x2: number; y: number; w: number; travel: number } // two pans: the heavier goes down, the other up
  | { t: 'belt'; x: number; y: number; w: number; dir: 1 | -1; speed?: number } // conveyor belt (a solid row that carries you)
  | { t: 'sign'; x: number; y: number; text: string };

export interface LevelDef {
  name: string;
  world: string;
  intro: string; // one-line goal shown at the start
  w: number;
  h: number;
  tiles: Uint8Array; // w*h
  recipe: ItemKind[];
  tether?: number; // kaiju tied together by a noodle this long (px)
  spawn: { x: number; y: number }; // tile the first kaiju stands in (others line up to the right)
  ents: EntDef[];
}

export class LevelBuilder {
  tiles: Uint8Array;
  ents: EntDef[] = [];
  spawn = { x: 2, y: 15 };
  constructor(public name: string, public world: string, public intro: string, public w: number, public recipe: ItemKind[], public h = 18) {
    this.tiles = new Uint8Array(w * h);
  }
  fill(x: number, y: number, w: number, h: number, v: number): this {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (i >= 0 && j >= 0 && i < this.w && j < this.h) this.tiles[j * this.w + i] = v;
    return this;
  }
  solid(x: number, y: number, w: number, h: number): this { return this.fill(x, y, w, h, TILE_SOLID); }
  clear(x: number, y: number, w: number, h: number): this { return this.fill(x, y, w, h, TILE_EMPTY); }
  shelf(x: number, y: number, w: number): this { return this.fill(x, y, w, 1, TILE_SHELF); }
  hot(x: number, y: number, w: number, h = 1): this { return this.fill(x, y, w, h, TILE_HOT); }
  ice(x: number, y: number, w: number, h = 1): this { return this.fill(x, y, w, h, TILE_ICE); }
  icicles(x: number, y: number, w: number): this { return this.fill(x, y, w, 1, TILE_ICICLE); }
  traps(x: number, y: number, w: number): this { return this.fill(x, y, w, 1, TILE_TRAP); }
  tetherLen?: number;
  tie(len: number): this { this.tetherLen = len; return this; }
  /** Standard floor (rows 16-17) and side walls. */
  room(): this {
    this.solid(0, 16, this.w, 2);
    this.solid(0, 0, 1, this.h);
    this.solid(this.w - 1, 0, 1, this.h);
    return this;
  }
  start(x: number, y = 15): this { this.spawn = { x, y }; return this; }
  add(...e: EntDef[]): this { this.ents.push(...e); return this; }
  build(): LevelDef {
    return { name: this.name, world: this.world, intro: this.intro, w: this.w, h: this.h, tiles: this.tiles, recipe: this.recipe, tether: this.tetherLen, spawn: this.spawn, ents: this.ents };
  }
}

export function resolveNeed(n: Need, players: number): number {
  if (n === 'all') return players;
  if (typeof n === 'number') return n;
  return Math.min(players, n.upTo);
}
