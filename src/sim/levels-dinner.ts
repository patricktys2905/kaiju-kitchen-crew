// World 6: Dinner Service. New: the Chef's Hand (slams down where the team is, after a warning shadow:
// hide under a shelf), balance pans (the heavier pan sinks, the other rises) and conveyor belts.
// Then everything from every world, mixed together.
import { LevelBuilder, type LevelDef } from './level';

const W6 = 'Dinner Service';

function watchTheHand(): LevelDef {
  const b = new LevelBuilder('Watch the Hand', W6, "The Chef's Hand slams down where you are. Hide under something!", 64, ['soup']).room();
  b.solid(8, 12, 6, 1).solid(20, 12, 6, 1).solid(32, 12, 6, 1).solid(44, 12, 6, 1).solid(56, 12, 7, 1)
    .add(
      { t: 'hand', period: 4.5, offset: 1.5 },
      { t: 'item', kind: 'soup', x: 34, y: 15 },
      { t: 'pot', x: 52, y: 15 },
      { t: 'plate', x: 56, y: 15, w: 7 },
      { t: 'sign', x: 1, y: 7, text: 'See the shadow? Get under a shelf before the Hand slams!' },
    );
  return b.start(2).build();
}

function balancingAct(): LevelDef {
  const b = new LevelBuilder('Balancing Act', W6, 'Balance pans: the heavier side sinks, the other rises.', 60, ['cake', 'pizza']).room();
  b.solid(1, 11, 9, 5) // starting platform
    .solid(6, 9, 4, 2) // a ledge above it, with the heavy cube at the edge over the left pan
    .solid(18, 7, 41, 9) // the high counter
    .add(
      { t: 'crate', x: 8, y: 8, w: 1, h: 1, need: 1, weight: 3 },
      { t: 'balance', x1: 10, x2: 14, y: 11, w: 3, travel: 4 },
      { t: 'lift', on: 'L', x: 17, y: 15, w: 1, x2: 17, y2: 7 },
      { t: 'lever', id: 'L', x: 19, y: 6 },
      { t: 'item', kind: 'cake', x: 24, y: 6 },
      { t: 'item', kind: 'pizza', x: 34, y: 6 },
      { t: 'pot', x: 44, y: 6 },
      { t: 'plate', x: 49, y: 6, w: 9 },
      { t: 'sign', x: 1, y: 5, text: 'Friend on the right pan, then push the heavy cube onto the left pan' },
      { t: 'sign', x: 19, y: 3, text: 'Up top? Pull the lever to bring the lift for the others' },
    );
  return b.start(2, 10).build();
}

function conveyorChaos(): LevelDef {
  const b = new LevelBuilder('Conveyor Chaos', W6, 'Conveyor belts AND the Chef’s Hand. Keep walking!', 72, ['fries', 'soup']).room();
  b.clear(8, 16, 12, 1).clear(24, 16, 12, 1).traps(37, 16, 2) // one safe tile after the belt: a snoozing kaiju carried off it stops there
    .solid(12, 12, 4, 1).solid(26, 12, 4, 1).solid(40, 12, 6, 1).solid(52, 12, 6, 1).solid(62, 12, 10, 1)
    .add(
      { t: 'hand', period: 4, offset: 2 },
      { t: 'belt', x: 8, y: 16, w: 12, dir: -1, speed: 130 },
      { t: 'belt', x: 24, y: 16, w: 12, dir: 1, speed: 120 },
      { t: 'item', kind: 'fries', x: 30, y: 15 },
      { t: 'item', kind: 'soup', x: 44, y: 15 },
      { t: 'pot', x: 58, y: 15 },
      { t: 'plate', x: 63, y: 15, w: 8 },
      { t: 'sign', x: 1, y: 9, text: 'Belts carry you. Walk against them!' },
      { t: 'sign', x: 22, y: 8, text: 'Mousetraps after this belt: jump them!' },
    );
  return b.start(2).build();
}

function rushHour(): LevelDef {
  const b = new LevelBuilder('Rush Hour', W6, 'Order tickets, belts and the Hand, all at once!', 84, ['pizza', 'cake', 'soup']).room();
  b.clear(8, 16, 16, 1).traps(32, 16, 2).traps(37, 16, 2)
    .solid(44, 12, 6, 1).solid(56, 12, 6, 1).solid(71, 12, 12, 1)
    .add(
      { t: 'ticket', x: 5, rule: 'speedy', dur: 10 },
      { t: 'belt', x: 8, y: 16, w: 16, dir: -1, speed: 160 },
      { t: 'item', kind: 'pizza', x: 26, y: 15 },
      { t: 'ticket', x: 28, rule: 'reverse', dur: 10 },
      { t: 'item', kind: 'cake', x: 42, y: 15 },
      { t: 'hand', period: 3.8, offset: 0 },
      { t: 'ticket', x: 50, rule: 'dark', dur: 10 },
      { t: 'item', kind: 'soup', x: 58, y: 15 },
      { t: 'pot', x: 66, y: 15 },
      { t: 'plate', x: 72, y: 15, w: 10 },
    );
  return b.start(2).build();
}

function headChef(): LevelDef {
  const b = new LevelBuilder('Head Chef', W6, 'The Pot Mech in the restaurant. Watch out for the Hand!', 80, ['fries', 'pizza']).room();
  b.clear(10, 16, 10, 1)
    .solid(12, 11, 6, 1)
    .solid(24, 0, 1, 8)
    .clear(32, 16, 3, 1)
    .solid(34, 11, 6, 1)
    .solid(40, 0, 1, 9)
    .solid(63, 11, 12, 1)
    .add(
      { t: 'robot', x: 4, y: 13 },
      { t: 'hand', period: 4, offset: 3 },
      { t: 'belt', x: 10, y: 16, w: 10, dir: -1, speed: 110 },
      { t: 'block', mat: 'cracker', x: 24, y: 8, w: 1, h: 8 },
      { t: 'item', kind: 'fries', x: 28, y: 15 },
      { t: 'scale', id: 's', x: 32, y: 16, w: 3, need: 6, hold: 6 },
      { t: 'door', on: 's', x: 40, y: 9, h: 7 },
      { t: 'item', kind: 'pizza', x: 46, y: 15 },
      { t: 'pot', x: 58, y: 15 },
      { t: 'plate', x: 64, y: 15, w: 10 },
      { t: 'sign', x: 7, y: 6, text: 'Even the Mech has to hide from the Hand' },
    );
  return b.start(1).build();
}

function grandBanquet(): LevelDef {
  const b = new LevelBuilder('Grand Banquet', W6, 'The final feast: soup, cake, pizza, fries. Everything you have learned!', 110, ['soup', 'cake', 'pizza', 'fries']).room();
  b.solid(6, 12, 6, 1)
    .clear(12, 16, 10, 1).solid(15, 12, 4, 1)
    .solid(26, 13, 3, 3).solid(29, 11, 3, 5).solid(28, 9, 4, 2)
    .solid(40, 7, 10, 9)
    .clear(55, 16, 12, 1).traps(68, 16, 2)
    .solid(58, 12, 5, 1).solid(72, 12, 6, 1).solid(84, 12, 6, 1).solid(98, 12, 11, 1)
    .add(
      { t: 'hand', period: 4.5, offset: 3 },
      { t: 'belt', x: 12, y: 16, w: 10, dir: -1, speed: 120 },
      { t: 'item', kind: 'soup', x: 24, y: 15 },
      { t: 'crate', x: 30, y: 8, w: 1, h: 1, need: 1, weight: 3 },
      { t: 'balance', x1: 32, x2: 36, y: 11, w: 3, travel: 4 },
      { t: 'lift', on: 'L', x: 39, y: 15, w: 1, x2: 39, y2: 7 },
      { t: 'lever', id: 'L', x: 41, y: 6 },
      { t: 'item', kind: 'cake', x: 44, y: 6 },
      { t: 'check', x: 51, y: 15 },
      { t: 'ticket', x: 52, rule: 'speedy', dur: 8 },
      { t: 'belt', x: 55, y: 16, w: 12, dir: 1, speed: 120 },
      { t: 'item', kind: 'pizza', x: 60, y: 15 },
      { t: 'ticket', x: 74, rule: 'dark', dur: 10 },
      { t: 'item', kind: 'fries', x: 78, y: 15 },
      { t: 'pot', x: 94, y: 15 },
      { t: 'plate', x: 99, y: 15, w: 10 },
    );
  return b.start(2).build();
}

export const DINNER_LEVELS: LevelDef[] = [watchTheHand(), balancingAct(), conveyorChaos(), rushHour(), headChef(), grandBanquet()];
