// World 1: Counter Top. Six teaching levels; every one must be solvable with 2 to 6 kaiju.
// Reach rules used when designing (see constants): one jump ≈ 110 px (2.75 tiles), a kaiju is 34 px
// tall, so a 3-tile wall needs 1 friend to stand on, a 4-tile ledge needs 2 (or a cube + a friend),
// and nothing over ~7 tiles can be stacked even by 6, so the toaster is needed.
import { LevelBuilder, type LevelDef } from './level';
import { FRIDGE_LEVELS } from './levels-fridge';
import { PANTRY_LEVELS } from './levels-pantry';
import { STOVE_LEVELS } from './levels-stove';

function shelfHelp(): LevelDef {
  const b = new LevelBuilder('Shelf Help', 'Counter Top', 'Get everyone up the counter and cook some toast!', 46, ['bread']).room();
  b.clear(11, 16, 3, 1) // lift pit (the lift sits flush with the floor)
    .solid(14, 13, 31, 3) // the counter top
    .add(
      { t: 'lift', on: 'a', x: 11, y: 16, w: 3, x2: 11, y2: 13 },
      { t: 'lever', id: 'a', x: 21, y: 12 },
      { t: 'item', kind: 'bread', x: 25, y: 12 },
      { t: 'pot', x: 31, y: 12 },
      { t: 'plate', x: 37, y: 12, w: 7 },
      { t: 'sign', x: 3, y: 11, text: "Too high? Stand on a friend's head and JUMP!" },
      { t: 'sign', x: 17, y: 9, text: 'GRAB the lever to work the spatula lift' },
      { t: 'sign', x: 25, y: 9, text: 'GRAB the bread, carry it to the pot' },
      { t: 'sign', x: 36, y: 9, text: 'Recipe done? Everyone onto the plate!' },
    );
  return b.start(2).build();
}

function weighIn(): LevelDef {
  const b = new LevelBuilder('Weigh-In', 'Counter Top', 'The kitchen scale only starts its timer when EVERYONE is on it.', 56, ['cheese', 'bread']).room();
  b.shelf(17, 13, 3).shelf(20, 11, 3)
    .solid(25, 0, 1, 10)
    .add(
      { t: 'scale', id: 'a', x: 11, y: 15, w: 5, need: 'all', hold: 5 },
      { t: 'door', on: 'a', x: 25, y: 10, h: 6 },
      { t: 'item', kind: 'bread', x: 21, y: 10 },
      { t: 'item', kind: 'cheese', x: 31, y: 15 },
      { t: 'pot', x: 40, y: 15 },
      { t: 'plate', x: 46, y: 15, w: 8 },
      { t: 'sign', x: 10, y: 11, text: 'Everyone on the scale starts the timer' },
      { t: 'sign', x: 17, y: 8, text: 'Shelves: jump up through them' },
      { t: 'sign', x: 37, y: 11, text: 'Follow the recipe card: order matters!' },
    );
  return b.start(2).build();
}

function sugarCubes(): LevelDef {
  const b = new LevelBuilder('Sugar Cubes', 'Counter Top', 'Sugar cubes can be pushed. Big ones need a team.', 60, ['tomato']).room();
  b.shelf(13, 12, 4)
    .clear(30, 16, 3, 2) // scale pit, 1 tile deep: a cube pushed over it drops in and stays
    .solid(37, 0, 1, 9)
    .add(
      { t: 'crate', x: 8, y: 15, w: 1, h: 1, need: 1, weight: 1 },
      { t: 'item', kind: 'tomato', x: 15, y: 11 },
      { t: 'crate', x: 22, y: 14, w: 2, h: 2, need: { upTo: 2 }, weight: 3 },
      { t: 'scale', id: 'b', x: 30, y: 17, w: 3, need: 3 },
      { t: 'door', on: 'b', x: 37, y: 9, h: 7 },
      { t: 'pot', x: 44, y: 15 },
      { t: 'plate', x: 50, y: 15, w: 8 },
      { t: 'sign', x: 4, y: 11, text: 'Push the little cube under the shelf' },
      { t: 'sign', x: 20, y: 10, text: 'Big cube: push it together' },
      { t: 'sign', x: 29, y: 11, text: 'This scale wants 3 weight' },
    );
  return b.start(2).build();
}

function popUp(): LevelDef {
  const b = new LevelBuilder('Pop-Up', 'Counter Top', 'The toaster launches whoever is standing on it.', 54, ['egg', 'bread']).room();
  b.solid(18, 8, 35, 8)
    .add(
      { t: 'item', kind: 'bread', x: 4, y: 15 },
      { t: 'lever', id: 'a', x: 10, y: 15 },
      { t: 'toaster', on: 'a', x: 15, y: 15 },
      { t: 'lever', id: 'a', x: 20, y: 7 },
      { t: 'check', x: 22, y: 7 },
      { t: 'item', kind: 'egg', x: 27, y: 7 },
      { t: 'pot', x: 34, y: 7 },
      { t: 'plate', x: 43, y: 7, w: 9 },
      { t: 'sign', x: 3, y: 11, text: 'Hop on the toaster, a friend pulls the lever' },
      { t: 'sign', x: 19, y: 4, text: 'Pull this one to pop up the rest' },
    );
  return b.start(2).build();
}

function hotHob(): LevelDef {
  const b = new LevelBuilder('Hot Hob', 'Counter Top', 'Hobs glow before they get hot. Splat once and the whole team restarts.', 76, ['ham', 'cheese']).room();
  b.clear(11, 16, 7, 1) // burner A sits in the floor
    .hot(24, 16, 12, 1) // always-hot pit
    .clear(51, 16, 4, 1) // burner B
    .solid(57, 0, 1, 9)
    .add(
      { t: 'burner', x: 11, y: 16, w: 7, cold: 2.8, hot: 1.4 },
      { t: 'check', x: 20, y: 15 },
      { t: 'lift', x: 24, y: 15, w: 3, x2: 33, y2: 15, speed: 110 },
      { t: 'check', x: 38, y: 15 },
      { t: 'item', kind: 'ham', x: 41, y: 15 },
      { t: 'scale', id: 'b', x: 45, y: 15, w: 5, need: 'all', hold: 6 },
      { t: 'burner', x: 51, y: 16, w: 4, cold: 2.2, hot: 1.4, offset: 1 },
      { t: 'door', on: 'b', x: 57, y: 9, h: 7 },
      { t: 'item', kind: 'cheese', x: 61, y: 15 },
      { t: 'pot', x: 64, y: 15 },
      { t: 'plate', x: 67, y: 15, w: 8 },
      { t: 'sign', x: 8, y: 11, text: 'Wait for the hob to cool, then run!' },
      { t: 'sign', x: 21, y: 11, text: 'Ride the spatula across' },
    );
  return b.start(2).build();
}

function sandwichRush(): LevelDef {
  const b = new LevelBuilder('Sandwich Rush', 'Counter Top', 'Final order: bread, ham, cheese, bread. Use everything you have learned!', 84, ['bread', 'ham', 'cheese', 'bread']).room();
  b.solid(13, 13, 18, 3)
    .clear(42, 16, 3, 2)
    .solid(49, 0, 1, 9)
    .shelf(54, 13, 3)
    .add(
      { t: 'item', kind: 'bread', x: 6, y: 15 },
      { t: 'toaster', on: 'a', x: 10, y: 15 },
      { t: 'lever', id: 'a', x: 15, y: 12 },
      { t: 'item', kind: 'ham', x: 22, y: 12 },
      { t: 'check', x: 32, y: 15 },
      { t: 'crate', x: 34, y: 14, w: 2, h: 2, need: { upTo: 2 }, weight: 3 },
      { t: 'scale', id: 'b', x: 42, y: 17, w: 3, need: 3 },
      { t: 'door', on: 'b', x: 49, y: 9, h: 7 },
      { t: 'check', x: 51, y: 15 },
      { t: 'item', kind: 'cheese', x: 55, y: 12 },
      { t: 'item', kind: 'bread', x: 60, y: 15 },
      { t: 'pot', x: 66, y: 15 },
      { t: 'plate', x: 72, y: 15, w: 10 },
    );
  return b.start(2).build();
}

export const COUNTER_LEVELS: LevelDef[] = [shelfHelp(), weighIn(), sugarCubes(), popUp(), hotHob(), sandwichRush()];
export const LEVELS: LevelDef[] = [...COUNTER_LEVELS, ...FRIDGE_LEVELS, ...PANTRY_LEVELS, ...STOVE_LEVELS];
