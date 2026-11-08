// World 7: The Bakery. New: sticky sprinkle walls (cling to the side, JUMP to wall-jump up), proofing dough
// (rises slowly while someone stands on it, sinks back when empty: leave a snoozer on it to keep it up),
// and oven timers (GRAB to wind; doors on that timer stay open until it rings).
// Reach rules: solo jump ≈ 3.6 tiles of reach, off a friend's head ≈ 4.5; dough rises ≈ 1 tile/s.
import { LevelBuilder, type LevelDef } from './level';

const W7 = 'The Bakery';

function sprinkleClimb(): LevelDef {
  const b = new LevelBuilder('Sprinkle Climb', W7, 'Sprinkle walls are sticky: jump at one, hold towards it, and keep jumping!', 48, ['flour']).room();
  b.solid(15, 9, 32, 7) // the bread board, high up
    .sticky(14, 9, 1, 7) // its frosted face
    .add(
      { t: 'item', kind: 'flour', x: 21, y: 8 },
      { t: 'pot', x: 29, y: 8 },
      { t: 'plate', x: 37, y: 8, w: 9 },
      { t: 'sign', x: 3, y: 9, text: 'Jump at the sprinkles, hold towards them and JUMP again to climb' },
      { t: 'sign', x: 20, y: 5, text: 'Plain walls are too slippery. Only sprinkles stick!' },
      { t: 'spoon', x: 13, y: 5 }, // a leap off the top of the sprinkle wall
    );
  return b.start(2).build();
}

function risingDough(): LevelDef {
  const b = new LevelBuilder('Rising Dough', W7, 'Dough rises while you stand on it, and sinks when you leave.', 56, ['egg', 'flour']).room();
  b.clear(16, 16, 3, 2) // the dough sits flush in the floor
    .solid(19, 9, 36, 7) // the high counter
    .add(
      { t: 'item', kind: 'egg', x: 8, y: 15 },
      { t: 'dough', x: 16, y: 16, w: 3, rise: 7 },
      { t: 'check', x: 22, y: 8 },
      { t: 'item', kind: 'flour', x: 28, y: 8 },
      { t: 'pot', x: 35, y: 8 },
      { t: 'plate', x: 43, y: 8, w: 10 },
      { t: 'sign', x: 3, y: 10, text: 'Stand on the dough and wait: it rises! (3 fit on it)' },
      { t: 'sign', x: 22, y: 5, text: 'It sinks when nobody is on it. Leave a snoozer to keep it up!' },
      { t: 'spoon', x: 17, y: 4 }, // high over the dough: risen dough + a friend's head
    );
  return b.start(2).build();
}

function ovenTimer(): LevelDef {
  const b = new LevelBuilder('Oven Timer', W7, 'Wind the timer: the oven doors stay open until it rings!', 60, ['butter', 'berry']).room();
  b.solid(24, 0, 1, 10).solid(37, 0, 1, 10) // oven walls above the doors
    .solid(25, 9, 12, 1) // the oven roof
    .add(
      { t: 'item', kind: 'butter', x: 6, y: 15 },
      { t: 'timer', id: 't', x: 15, y: 15, secs: 9 },
      { t: 'door', on: 't', x: 24, y: 10, h: 6 },
      { t: 'door', on: 't', x: 37, y: 10, h: 6 },
      { t: 'check', x: 40, y: 15 },
      { t: 'item', kind: 'berry', x: 43, y: 15 },
      { t: 'pot', x: 47, y: 15 },
      { t: 'plate', x: 51, y: 15, w: 8 },
      { t: 'sign', x: 8, y: 10, text: 'GRAB the timer to wind it. Doors open until it rings!' },
      { t: 'sign', x: 26, y: 5, text: 'Everyone through both oven doors!' },
      { t: 'spoon', x: 30, y: 11 }, // up inside the oven: a quick boost while the timer runs
    );
  return b.start(2).build();
}

function sprinkleShaft(): LevelDef {
  const b = new LevelBuilder('Sprinkle Shaft', W7, 'Climb the sprinkle chimney. Honey sits on top of the tall pillar.', 50, ['honey', 'flour']).room();
  b.sticky(15, 3, 1, 13) // a tall frosted pillar
    .solid(21, 6, 28, 10) // the high shelf
    .sticky(20, 6, 1, 10) // its frosted face
    .add(
      { t: 'item', kind: 'honey', x: 15, y: 2 },
      { t: 'check', x: 24, y: 5 },
      { t: 'item', kind: 'flour', x: 29, y: 5 },
      { t: 'pot', x: 35, y: 5 },
      { t: 'plate', x: 40, y: 5, w: 8 },
      { t: 'sign', x: 3, y: 9, text: 'Climb the pillar for the honey, then the shelf face' },
      { t: 'sign', x: 26, y: 1, text: 'Carry the honey down? Just hop off!' },
      { t: 'spoon', x: 17, y: 1 }, // a leap from the top of the pillar
    );
  return b.start(2).build();
}

function proofingDrawer(): LevelDef {
  const b = new LevelBuilder('Proofing Drawer', W7, 'Dough up, wind the timer, run for the door!', 64, ['milk', 'egg', 'butter']).room();
  b.clear(12, 16, 3, 2) // dough pit
    .solid(15, 10, 8, 6) // the ledge
    .solid(30, 0, 1, 10) // wall over the timer door
    .clear(40, 16, 3, 2) // second dough pit
    .solid(43, 11, 20, 5) // the serving shelf
    .add(
      { t: 'item', kind: 'milk', x: 5, y: 15 },
      { t: 'dough', x: 12, y: 16, w: 3, rise: 6 },
      { t: 'item', kind: 'egg', x: 18, y: 9 },
      { t: 'timer', id: 't', x: 21, y: 9, secs: 10 },
      { t: 'door', on: 't', x: 30, y: 10, h: 6 },
      { t: 'check', x: 33, y: 15 },
      { t: 'item', kind: 'butter', x: 36, y: 15 },
      { t: 'dough', x: 40, y: 16, w: 3, rise: 5 },
      { t: 'check', x: 45, y: 10 },
      { t: 'pot', x: 50, y: 10 },
      { t: 'plate', x: 54, y: 10, w: 8 },
      { t: 'sign', x: 2, y: 10, text: 'Ride the dough up to the ledge' },
      { t: 'sign', x: 22, y: 5, text: 'Wind the timer, then everyone through the door!' },
      { t: 'spoon', x: 13, y: 5 }, // over the first dough: risen dough + a friend's head
    );
  return b.start(2).build();
}

function weddingCake(): LevelDef {
  const b = new LevelBuilder('Wedding Cake', W7, 'The grand finale: climb the cake, then dash through the oven door!', 84, ['flour', 'egg', 'berry', 'honey']).room();
  b.solid(14, 12, 40, 4) // tier 1
    .sticky(13, 12, 1, 4)
    .solid(26, 8, 28, 4) // tier 2
    .clear(23, 12, 3, 4) // dough well in tier 1
    .solid(36, 4, 18, 4) // tier 3
    .sticky(35, 4, 1, 4)
    .solid(62, 0, 1, 10) // wall over the oven door
    .add(
      { t: 'item', kind: 'flour', x: 6, y: 15 },
      { t: 'dough', x: 23, y: 12, w: 3, rise: 4 },
      { t: 'check', x: 28, y: 7 },
      { t: 'item', kind: 'berry', x: 44, y: 3 },
      { t: 'check', x: 57, y: 15 },
      { t: 'timer', id: 't', x: 56, y: 15, secs: 10 },
      { t: 'door', on: 't', x: 62, y: 10, h: 6 },
      { t: 'item', kind: 'egg', x: 64, y: 15 }, // after the door, so 2 kaiju never carry more than 2
      { t: 'item', kind: 'honey', x: 66, y: 15 },
      { t: 'pot', x: 72, y: 15 },
      { t: 'plate', x: 75, y: 15, w: 7 },
      { t: 'sign', x: 2, y: 9, text: 'Sprinkles, dough, more sprinkles... up the cake!' },
      { t: 'sign', x: 38, y: 0, text: 'Berries on top!' },
      { t: 'spoon', x: 60, y: 11 }, // by the oven door: a friend's head
    );
  return b.start(2).build();
}

export const BAKERY_LEVELS: LevelDef[] = [sprinkleClimb(), risingDough(), ovenTimer(), sprinkleShaft(), proofingDrawer(), weddingCake()];
