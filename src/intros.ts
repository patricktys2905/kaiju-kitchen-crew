// "New!" cards: the first time a level uses a mechanic you haven't met yet, a little card explains it.
import type { LevelDef } from './sim/level';
import { TILE_ICE, TILE_ICICLE, TILE_STICKY, TILE_TRAP } from './sim/level';

export interface Intro { key: string; art: string; title: string; text: string; has: (l: LevelDef) => boolean }

const ent = (t: string, pred: (e: Record<string, unknown>) => boolean = () => true) => (l: LevelDef) => l.ents.some(e => e.t === t && pred(e as unknown as Record<string, unknown>));
const tile = (t: number) => (l: LevelDef) => l.tiles.includes(t);

export const INTROS: Intro[] = [
  { key: 'spoon', art: 'it-spoon', title: 'Golden spoons', text: 'Every level hides one. Touch it, then finish the level for a star!', has: ent('spoon') },
  { key: 'lift', art: 'ob-spatula', title: 'Spatula lift', text: 'GRAB the lever to send it up or down.', has: ent('lift', e => e.on !== undefined && e.x === e.x2) },
  { key: 'scale', art: 'ob-scale', title: 'Kitchen scale', text: 'Pile on enough weight (kaiju, cubes) to switch it on.', has: ent('scale') },
  { key: 'crate', art: 'ob-sugar', title: 'Sugar cubes', text: 'Push them. ×2 cubes need two kaiju pushing together.', has: ent('crate') },
  { key: 'toaster', art: 'ob-toaster', title: 'Pop-up toaster', text: 'Stand on it while a friend pulls the lever: BOING!', has: ent('toaster') },
  { key: 'burner', art: 'ob-hob', title: 'Hobs', text: 'They glow orange before they get hot. Cross when they cool!', has: ent('burner') },
  { key: 'shuttle', art: 'ob-spatula', title: 'Moving spatula', text: 'It shuttles back and forth on its own. Hop on and ride.', has: ent('lift', e => e.on === undefined && e.x !== e.x2) },
  { key: 'cookie', art: 'ob-cookie', title: 'Cookie', text: 'Eat it to grow BIG: heavy, strong, and you smash crackers.', has: ent('pickup', e => e.kind === 'cookie') },
  { key: 'lemon', art: 'ob-lemon', title: 'Lemon drop', text: 'Shrinks you back to normal size.', has: ent('pickup', e => e.kind === 'lemon') },
  { key: 'chili', art: 'ob-chili', title: 'Chili', text: 'SPICY! For a while you melt any ice you touch.', has: ent('pickup', e => e.kind === 'chili') },
  { key: 'soda', art: 'ob-soda', title: 'Soda', text: 'Your next jump is a super fizzy jump.', has: ent('pickup', e => e.kind === 'soda') },
  { key: 'jelly', art: 'ob-jelly', title: 'Jelly', text: 'Boing! It bounces you high. Its switch freezes it solid.', has: ent('jelly') },
  { key: 'ice', art: 'ob-ice', title: 'Ice', text: 'Slippery floors, and icicles that splat. Careful!', has: l => tile(TILE_ICE)(l) || tile(TILE_ICICLE)(l) },
  { key: 'tether', art: 'ob-board', title: 'Noodle tether', text: 'You are tied together with noodles. Move as a team!', has: l => !!l.tether },
  { key: 'robot', art: 'ob-robot', title: 'The Pot Mech', text: 'GRAB to climb in. Crew share the jobs: walk, jump and arm. HOLD GRAB to hop out.', has: ent('robot') },
  { key: 'ticket', art: 'ob-ticket', title: 'Order tickets', text: 'Silly rules print out for a while. You never need them to win.', has: ent('ticket') },
  { key: 'trap', art: 'ob-trap', title: 'Mousetraps', text: 'SNAP. Jump over them.', has: tile(TILE_TRAP) },
  { key: 'melty', art: 'ob-choc', title: 'Chocolate', text: 'It melts while you stand on it, then sets again. Keep moving!', has: ent('melty') },
  { key: 'vent', art: 'ob-vent', title: 'Steam vents', text: 'Ride the steam up when it puffs.', has: ent('vent') },
  { key: 'jet', art: 'ob-tap', title: 'Tap jets', text: 'Water from the tap shoves you sideways.', has: ent('jet') },
  { key: 'water', art: 'ob-plug', title: 'Water', text: 'Kaiju float! JUMP underwater to swim. The plug lever fills or drains it.', has: ent('water') },
  { key: 'bubble', art: 'ob-bubble', title: 'Soap bubbles', text: 'Stand on one and ride it up, then hop off before it pops.', has: ent('bubbler') },
  { key: 'hand', art: 'ob-hand', title: "The Chef's Hand", text: 'It slams down where its shadow is. Hide under something!', has: ent('hand') },
  { key: 'balance', art: 'ob-plate', title: 'Balance pans', text: 'The heavier pan sinks and the other one rises.', has: ent('balance') },
  { key: 'belt', art: 'ob-belt', title: 'Conveyor belts', text: 'They carry you (and snoozing friends) along.', has: ent('belt') },
  { key: 'sticky', art: 'tex-sprinkle', title: 'Sprinkle walls', text: 'Sticky! Jump at one, hold towards it and keep jumping to climb.', has: tile(TILE_STICKY) },
  { key: 'dough', art: 'ob-dough', title: 'Proofing dough', text: 'Stand on it and it rises. Leave a snoozer on it to keep it up!', has: ent('dough') },
  { key: 'timer', art: 'ob-timer', title: 'Oven timer', text: 'GRAB to wind it: its doors stay open until it rings.', has: ent('timer') },
];

const KEY = 'kkc-seen';
function seen(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(KEY) ?? '[]') as string[]); } catch { return new Set(); }
}
/** Cards for mechanics this level uses that haven't been shown on this device yet (and marks them shown). */
export function introsFor(level: LevelDef): Intro[] {
  const s = seen();
  const out = INTROS.filter(i => !s.has(i.key) && i.has(level)).slice(0, 3);
  for (const i of out) s.add(i.key);
  try { localStorage.setItem(KEY, JSON.stringify([...s])); } catch { /* fine */ }
  return out;
}
