// World 4: Stove & Oven. New: chocolate platforms (melt after ~1.6 s of being stood on, set again ~4 s later),
// steam vents (puff you upward on a cycle), and the Pot Mech's metal feet (it walks on hot hobs; kaiju ride on it).
// Reach rules: jump ≈ 110 px; a vent lifts you to the top of its column and a bit beyond.
import { LevelBuilder, type LevelDef } from './level';

const W4 = 'Stove & Oven';

function meltingPoint(): LevelDef {
  const b = new LevelBuilder('Melting Point', W4, "Chocolate melts if you stand on it too long. Keep moving!", 52, ['potato']).room();
  b.clear(10, 16, 13, 2) // bottomless
    .solid(15, 14, 3, 4) // a safe pillar halfway
    .add(
      { t: 'melty', x: 11, y: 14, w: 3, h: 1 },
      { t: 'melty', x: 19, y: 14, w: 3, h: 1 },
      { t: 'item', kind: 'potato', x: 16, y: 13 },
      { t: 'pot', x: 32, y: 15 },
      { t: 'plate', x: 38, y: 15, w: 9 },
      { t: 'sign', x: 2, y: 10, text: 'Chocolate melts under you. Keep hopping!' },
      { t: 'sign', x: 13, y: 9, text: 'Phew, a safe spot' },
      { t: 'spoon', x: 18, y: 9 }, // over the far chocolate: a leap off a friend's head on the safe pillar
    );
  return b.start(2).build();
}

function steamRoom(): LevelDef {
  const b = new LevelBuilder('Steam Room', W4, 'Steam vents puff you upward. Wait for the steam, then ride it!', 56, ['onion', 'sausage']).room();
  b.solid(10, 8, 7, 2) // a high shelf block
    .solid(24, 5, 2, 11) // a tall wall
    .add(
      { t: 'vent', x: 7, y: 16, w: 2, h: 9, cold: 1.8, hot: 3.2 },
      { t: 'item', kind: 'onion', x: 13, y: 7 },
      { t: 'vent', x: 21, y: 16, w: 2, h: 13, cold: 1.8, hot: 3.2, offset: 1.5 },
      { t: 'item', kind: 'sausage', x: 30, y: 15 },
      { t: 'pot', x: 40, y: 15 },
      { t: 'plate', x: 45, y: 15, w: 8 },
      { t: 'sign', x: 1, y: 10, text: 'Stand over the vent when the steam comes, then steer' },
      { t: 'sign', x: 17, y: 4, text: 'Ride the big one over the wall' },
      { t: 'spoon', x: 19, y: 1 }, // way up top: ride the big vent all the way and lean left (not over the wall)
    );
  return b.start(2).build();
}

function grillMarks(): LevelDef {
  const b = new LevelBuilder('Grill Marks', W4, 'Hobs, steam and chocolate. Time it right!', 64, ['pepper', 'sausage']).room();
  b.clear(8, 16, 8, 1)
    .solid(22, 9, 6, 2)
    .hot(31, 16, 8, 1)
    .add(
      { t: 'burner', x: 8, y: 16, w: 8, cold: 2.6, hot: 1.4 },
      { t: 'melty', x: 9, y: 14, w: 2, h: 1 }, { t: 'melty', x: 13, y: 14, w: 2, h: 1 },
      { t: 'vent', x: 19, y: 16, w: 2, h: 8, cold: 2, hot: 3 },
      { t: 'item', kind: 'pepper', x: 25, y: 8 },
      { t: 'spoon', x: 25, y: 4 }, // high over the pepper: a friend's head on the shelf block
      { t: 'check', x: 29, y: 15 },
      { t: 'melty', x: 32, y: 15, w: 2, h: 1 }, { t: 'melty', x: 36, y: 15, w: 2, h: 1 },
      { t: 'item', kind: 'sausage', x: 42, y: 15 },
      { t: 'pot', x: 50, y: 15 },
      { t: 'plate', x: 55, y: 15, w: 8 },
      { t: 'sign', x: 2, y: 10, text: 'Cross when the hob is cool, or hop the chocolate' },
    );
  return b.start(2).build();
}

function ovenMitts(): LevelDef {
  const b = new LevelBuilder('Oven Mitts', W4, "A long hot hob! Only the Pot Mech's metal feet can take the heat.", 64, ['potato', 'onion']).room();
  b.hot(13, 16, 22, 1)
    .shelf(21, 11, 3)
    .add(
      { t: 'robot', x: 4, y: 13 },
      { t: 'item', kind: 'potato', x: 22, y: 10 },
      { t: 'item', kind: 'onion', x: 38, y: 15 },
      { t: 'pot', x: 46, y: 15 },
      { t: 'plate', x: 52, y: 15, w: 10 },
      { t: 'sign', x: 7, y: 9, text: "Hot hob! Ride on the Mech's head, its metal feet can take it" },
      { t: 'sign', x: 18, y: 7, text: 'Hop up from the Mech' },
      { t: 'spoon', x: 29, y: 9 }, // high over the hot hob: make the Mech jump there
    );
  return b.start(1).build();
}

function flambe(): LevelDef {
  const b = new LevelBuilder('Flambé', W4, 'Order tickets in a hot kitchen. Rush, float, then find your way in the dark!', 76, ['pepper', 'onion']).room();
  b.hot(10, 16, 16, 1)
    .solid(40, 4, 3, 12)
    .clear(50, 16, 6, 1)
    .add(
      { t: 'ticket', x: 6, rule: 'speedy', dur: 9 },
      ...[10, 12, 14, 16, 18, 20, 22, 24].map(x => ({ t: 'melty' as const, x, y: 15, w: 2, h: 1 })),
      { t: 'item', kind: 'pepper', x: 28, y: 15 },
      { t: 'ticket', x: 31, rule: 'lowgrav' },
      { t: 'vent', x: 37, y: 16, w: 2, h: 12, cold: 1, hot: 3 },
      { t: 'item', kind: 'onion', x: 41, y: 3 },
      { t: 'ticket', x: 45, rule: 'dark' },
      { t: 'burner', x: 50, y: 16, w: 6, cold: 2.4, hot: 1.6 },
      { t: 'pot', x: 62, y: 15 },
      { t: 'spoon', x: 74, y: 11 }, // in the dark, in the far corner past the plate: a friend's head
      { t: 'plate', x: 66, y: 15, w: 8 },
      { t: 'sign', x: 1, y: 10, text: "A chocolate bridge over a hot hob: don't stop!" },
    );
  return b.start(2).build();
}

function sundayRoast(): LevelDef {
  const b = new LevelBuilder('Sunday Roast', W4, 'Final order: potato, sausage, pepper, onion. Everything the stove has got!', 96, ['potato', 'sausage', 'pepper', 'onion']).room();
  b.clear(8, 16, 12, 2)
    .solid(25, 8, 6, 2)
    .hot(38, 16, 14, 1)
    .shelf(44, 11, 3)
    .clear(56, 16, 6, 1)
    .add(
      { t: 'item', kind: 'potato', x: 4, y: 15 },
      { t: 'melty', x: 9, y: 14, w: 2, h: 1 }, { t: 'melty', x: 13, y: 14, w: 2, h: 1 }, { t: 'melty', x: 17, y: 14, w: 2, h: 1 },
      { t: 'vent', x: 22, y: 16, w: 2, h: 9, cold: 1.8, hot: 3 },
      { t: 'item', kind: 'sausage', x: 28, y: 7 },
      { t: 'check', x: 33, y: 15 },
      { t: 'robot', x: 34, y: 13 },
      { t: 'spoon', x: 35, y: 8 }, // over the Mech: step onto its head from the sausage block and ride along on a Mech jump
      { t: 'item', kind: 'pepper', x: 45, y: 10 },
      { t: 'burner', x: 56, y: 16, w: 6, cold: 2.4, hot: 1.4 },
      { t: 'item', kind: 'onion', x: 64, y: 15 },
      { t: 'ticket', x: 66, rule: 'speedy', dur: 10 },
      { t: 'pot', x: 80, y: 15 },
      { t: 'plate', x: 85, y: 15, w: 10 },
    );
  return b.start(2).build();
}

export const STOVE_LEVELS: LevelDef[] = [meltingPoint(), steamRoom(), grillMarks(), ovenMitts(), flambe(), sundayRoast()];
