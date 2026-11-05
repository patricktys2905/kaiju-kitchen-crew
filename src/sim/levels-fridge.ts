// World 2: The Fridge. New things: cookies (grow BIG), lemon drops (shrink), cracker walls (big kaiju
// smash them), mouse holes (1 tile tall: big kaiju don't fit), ice floors (slide), jelly (bounces you
// ~5.5 tiles; frozen solid while the freezer lever is on), icicles (splat), chili (melts ice walls),
// soda (next jump ~5.5 tiles). Snacks float a little off the ground: jump into them to eat them.
// Reach rules: normal jump ≈ 110 px; a kaiju is 34 px, a BIG one 56 px, so standing on a big friend
// reaches a 4-tile ledge (166 px). Jelly and soda reach ≈ 227 px (a 5-6 tile ledge).
import { LevelBuilder, type LevelDef } from './level';

const W2 = 'The Fridge';

function cookieMonster(): LevelDef {
  const b = new LevelBuilder('Cookie Monster', W2, 'Cookies make you BIG. Big kaiju smash crackers and make great stepladders.', 52, ['milk']).room();
  b.solid(12, 0, 1, 8) // wall above the cracker wall
    .solid(18, 12, 13, 3) // shelf block with a mouse hole underneath (row 15)
    .add(
      { t: 'pickup', kind: 'cookie', x: 6, y: 14 },
      { t: 'block', mat: 'cracker', x: 12, y: 8, w: 1, h: 8 },
      { t: 'pickup', kind: 'lemon', x: 15, y: 13 },
      { t: 'item', kind: 'milk', x: 24, y: 11 },
      { t: 'pot', x: 37, y: 15 },
      { t: 'plate', x: 42, y: 15, w: 8 },
      { t: 'sign', x: 2, y: 10, text: 'Jump into the cookie to grow BIG' },
      { t: 'sign', x: 7, y: 6, text: 'Big kaiju smash crackers: just walk into them' },
      { t: 'sign', x: 23, y: 8, text: 'Stand on a BIG friend to reach the milk' },
      { t: 'sign', x: 14, y: 9, text: 'Too big for the mouse hole? Lemon drops shrink you' },
    );
  return b.start(2).build();
}

function heavySnack(): LevelDef {
  const b = new LevelBuilder('Heavy Snack', W2, 'A big kaiju pushes like two and weighs like three.', 52, ['butter', 'berry']).room();
  b.clear(18, 16, 3, 2) // scale pit
    .solid(26, 0, 1, 9)
    .shelf(21, 12, 3)
    .add(
      { t: 'pickup', kind: 'cookie', x: 5, y: 14 },
      { t: 'crate', x: 10, y: 14, w: 2, h: 2, need: 3, weight: 3 },
      { t: 'scale', id: 'b', x: 18, y: 17, w: 3, need: 3 },
      { t: 'door', on: 'b', x: 26, y: 9, h: 7 },
      { t: 'item', kind: 'berry', x: 22, y: 11 },
      { t: 'item', kind: 'butter', x: 30, y: 15 },
      { t: 'pot', x: 36, y: 15 },
      { t: 'plate', x: 41, y: 15, w: 8 },
      { t: 'sign', x: 2, y: 10, text: 'This cube needs ×3 pushing. A BIG kaiju counts as 2' },
      { t: 'sign', x: 16, y: 7, text: 'Strawberry up high? Use a BIG friend as a step' },
    );
  return b.start(2).build();
}

function slipperySlope(): LevelDef {
  const b = new LevelBuilder('Slippery Slope', W2, 'Ice is slippery and jelly is bouncy. Mind the gap!', 60, ['yogurt']).room();
  b.ice(7, 16, 12)
    .clear(19, 16, 3, 2) // a gap in the floor
    .solid(30, 10, 11, 6)
    .add(
      { t: 'check', x: 23, y: 15 },
      { t: 'jelly', x: 28, y: 15, w: 2, h: 1 },
      { t: 'item', kind: 'yogurt', x: 35, y: 9 },
      { t: 'pot', x: 46, y: 15 },
      { t: 'plate', x: 51, y: 15, w: 8 },
      { t: 'sign', x: 6, y: 11, text: 'Ice! You slide, so jump the gap at the end' },
      { t: 'sign', x: 24, y: 9, text: 'Jelly: BOING! Steer onto the shelf' },
    );
  return b.start(2).build();
}

function deepFreeze(): LevelDef {
  const b = new LevelBuilder('Deep Freeze', W2, 'The freezer lever turns jelly into ice. Icicles splat!', 60, ['milk', 'berry']).room();
  b.clear(10, 16, 8, 2) // pit under the jelly bridge
    .solid(10, 0, 8, 11)
    .icicles(10, 11, 8)
    .solid(26, 10, 11, 6)
    .add(
      { t: 'lever', id: 'f', x: 6, y: 15 },
      { t: 'jelly', x: 10, y: 16, w: 8, h: 1, on: 'f' },
      { t: 'check', x: 19, y: 15 },
      { t: 'lever', id: 'f', x: 21, y: 15 },
      { t: 'jelly', x: 24, y: 15, w: 2, h: 1, on: 'f' },
      { t: 'item', kind: 'milk', x: 30, y: 9 },
      { t: 'item', kind: 'berry', x: 41, y: 15 },
      { t: 'pot', x: 46, y: 15 },
      { t: 'plate', x: 51, y: 15, w: 8 },
      { t: 'sign', x: 1, y: 11, text: 'Freezer ON = jelly turns to ice. Bouncing into icicles = SPLAT' },
      { t: 'sign', x: 19, y: 9, text: 'Everyone across? Freezer OFF, then BOING up' },
    );
  return b.start(2).build();
}

function hotStuff(): LevelDef {
  const b = new LevelBuilder('Hot Stuff', W2, 'Chili makes you spicy enough to melt ice. Soda gives one huge jump.', 52, ['butter', 'yogurt']).room();
  b.solid(9, 0, 1, 8)
    .solid(16, 11, 15, 5)
    .solid(27, 0, 1, 6)
    .add(
      { t: 'pickup', kind: 'chili', x: 4, y: 14 },
      { t: 'block', mat: 'ice', x: 9, y: 8, w: 1, h: 8 },
      { t: 'pickup', kind: 'soda', x: 13, y: 14 },
      { t: 'item', kind: 'butter', x: 20, y: 10 },
      { t: 'pickup', kind: 'chili', x: 23, y: 9 },
      { t: 'block', mat: 'ice', x: 27, y: 6, w: 1, h: 5 },
      { t: 'item', kind: 'yogurt', x: 29, y: 10 },
      { t: 'pot', x: 36, y: 15 },
      { t: 'plate', x: 41, y: 15, w: 8 },
      { t: 'sign', x: 2, y: 10, text: 'Eat the chili, then touch the ice wall' },
      { t: 'sign', x: 11, y: 9, text: 'Soda: your next jump is HUGE (friends on your head come too)' },
    );
  return b.start(2).build();
}

function fridgeRaid(): LevelDef {
  const b = new LevelBuilder('Fridge Raid', W2, 'Final order: milk, butter, strawberry, yogurt. Use every snack trick!', 94, ['milk', 'butter', 'berry', 'yogurt']).room();
  b.solid(12, 0, 1, 8)
    .ice(13, 16, 11)
    .clear(24, 16, 3, 2)
    .solid(33, 10, 11, 6)
    .solid(49, 0, 9, 15) // mouse-hole wall: the only way through is the 1-tile tunnel (row 15)
    .solid(65, 0, 1, 8)
    .shelf(71, 12, 3)
    .add(
      { t: 'item', kind: 'milk', x: 4, y: 15 },
      { t: 'pickup', kind: 'cookie', x: 8, y: 14 },
      { t: 'block', mat: 'cracker', x: 12, y: 8, w: 1, h: 8 },
      { t: 'check', x: 28, y: 15 },
      { t: 'jelly', x: 31, y: 15, w: 2, h: 1 },
      { t: 'item', kind: 'butter', x: 38, y: 9 },
      { t: 'pickup', kind: 'lemon', x: 46, y: 13 },
      { t: 'check', x: 59, y: 15 },
      { t: 'pickup', kind: 'chili', x: 61, y: 14 },
      { t: 'block', mat: 'ice', x: 65, y: 8, w: 1, h: 8 },
      { t: 'pickup', kind: 'cookie', x: 68, y: 14 },
      { t: 'item', kind: 'berry', x: 72, y: 11 },
      { t: 'item', kind: 'yogurt', x: 77, y: 15 },
      { t: 'pot', x: 81, y: 15 },
      { t: 'plate', x: 85, y: 15, w: 8 },
    );
  return b.start(2).build();
}

export const FRIDGE_LEVELS: LevelDef[] = [cookieMonster(), heavySnack(), slipperySlope(), deepFreeze(), hotStuff(), fridgeRaid()];
