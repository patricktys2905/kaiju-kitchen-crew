// World 3: The Pantry. New: the noodle tether (kaiju tied together in player order; standing kaiju hold,
// airborne ones get pulled, so you can dangle, swing and be hauled up), the Pot Mech (GRAB to climb in;
// crew seats = legs, jump, arm; weighs 6, smashes crackers, jumps ≈ 4 tiles, carries heavy things),
// order tickets (rule changes) and mousetraps (splat).
// Reach rules: noodle 170 px; a kaiju riding on the Mech's head reaches ≈ 4 tiles + a jump;
// moon gravity jump ≈ 265 px (6.5 tiles).
import { LevelBuilder, type LevelDef } from './level';

const W3 = 'The Pantry';

function noodleBuddies(): LevelDef {
  const b = new LevelBuilder('Noodle Buddies', W3, "You're all tied together with a noodle. Lower friends down, haul them up!", 60, ['honey', 'cereal']).room().tie(170);
  b.solid(1, 13, 9, 3) // ledge A
    .solid(14, 13, 10, 3) // ledge B (the pit in between is 3 tiles deep: too deep to jump out of)
    .clear(24, 16, 18, 2) // bottomless gap...
    .solid(26, 13, 2, 5).solid(30, 13, 2, 5).solid(34, 13, 2, 5).solid(38, 13, 2, 5) // ...with pillars
    .solid(42, 13, 17, 3)
    .add(
      { t: 'item', kind: 'honey', x: 10, y: 15 },
      { t: 'item', kind: 'cereal', x: 31, y: 12 },
      { t: 'pot', x: 46, y: 12 },
      { t: 'plate', x: 50, y: 12, w: 8 },
      { t: 'sign', x: 2, y: 9, text: 'Tied together! Lower a friend into the pit for the honey' },
      { t: 'sign', x: 15, y: 9, text: 'Walk away from the edge to haul them back up' },
      { t: 'sign', x: 26, y: 8, text: 'Missed a jump? The noodle catches you' },
    );
  return b.start(2, 12).build();
}

function swingShift(): LevelDef {
  const b = new LevelBuilder('Swing Shift', W3, 'Dangle a friend down the shaft and swing them into the nook. Mind the mousetraps!', 60, ['pasta', 'flour']).room().tie(170);
  b.solid(1, 10, 11, 6) // ledge A
    .traps(12, 16, 2) // mousetraps at the bottom of the shaft
    .solid(14, 10, 12, 6) // ledge B...
    .clear(14, 12, 2, 2) // ...with a nook in its side
    .traps(28, 16, 2).solid(30, 15, 2, 1).traps(32, 16, 2).solid(34, 15, 2, 1).traps(36, 16, 2)
    .add(
      { t: 'item', kind: 'pasta', x: 14, y: 13 },
      { t: 'check', x: 27, y: 15 },
      { t: 'item', kind: 'flour', x: 34, y: 14 },
      { t: 'pot', x: 46, y: 15 },
      { t: 'plate', x: 50, y: 15, w: 8 },
      { t: 'sign', x: 2, y: 6, text: 'Lower a friend down the shaft. Mousetraps = SPLAT!' },
      { t: 'sign', x: 15, y: 6, text: 'Swing into the nook for the pasta, then haul them up' },
      { t: 'sign', x: 26, y: 10, text: 'Hop across on the stepping stones' },
    );
  return b.start(2, 9).build();
}

function potMech(): LevelDef {
  const b = new LevelBuilder('Pot Mech', W3, 'GRAB next to the Pot Mech to climb in. Crew: legs, jump, arm.', 64, ['pasta']).room();
  b.solid(13, 0, 1, 8)
    .solid(18, 13, 46, 3) // a 3-tile step
    .clear(24, 13, 3, 1) // the scale sits flush in the step
    .solid(32, 0, 1, 6)
    .add(
      { t: 'robot', x: 6, y: 13 },
      { t: 'block', mat: 'cracker', x: 13, y: 8, w: 1, h: 8 },
      { t: 'scale', id: 's', x: 24, y: 13, w: 3, need: 6, hold: 6 },
      { t: 'door', on: 's', x: 32, y: 6, h: 7 },
      { t: 'item', kind: 'pasta', x: 38, y: 12 },
      { t: 'pot', x: 44, y: 12 },
      { t: 'plate', x: 52, y: 12, w: 10 },
      { t: 'sign', x: 1, y: 8, text: 'GRAB next to the Pot Mech to climb in (GRAB again to hop out). 1st in = legs, 2nd = jump, 3rd = arm' },
      { t: 'sign', x: 15, y: 9, text: 'Ride on its head when it jumps!' },
      { t: 'sign', x: 22, y: 7, text: 'This scale wants 6. The Mech weighs 6' },
    );
  return b.start(2).build();
}

function mechArm(): LevelDef {
  const b = new LevelBuilder('Mech Arm', W3, 'A whole watermelon! Only the Pot Mech is strong enough to carry it.', 64, ['melon', 'honey']).room();
  b.shelf(16, 12, 3)
    .solid(21, 0, 1, 9)
    .solid(26, 12, 10, 2) // a low shelf: kaiju fit under it, the Mech climbs over
    .add(
      { t: 'robot', x: 3, y: 13 },
      { t: 'item', kind: 'melon', x: 13, y: 15 },
      { t: 'lever', id: 'g', x: 17, y: 11 },
      { t: 'door', on: 'g', x: 21, y: 9, h: 7 },
      { t: 'item', kind: 'honey', x: 30, y: 15 },
      { t: 'pot', x: 44, y: 15 },
      { t: 'plate', x: 52, y: 15, w: 10 },
      { t: 'sign', x: 7, y: 9, text: "Too heavy for kaiju! The Mech's arm can carry it" },
      { t: 'sign', x: 14, y: 8, text: 'Ride the Mech up to the lever' },
      { t: 'sign', x: 26, y: 8, text: 'Kaiju fit under, the Mech jumps over' },
    );
  return b.start(7).build();
}

function orderChaos(): LevelDef {
  const b = new LevelBuilder('Order Chaos', W3, 'New order tickets keep changing the rules!', 74, ['cereal', 'flour']).room();
  b.solid(14, 10, 4, 6) // 6 tiles tall: too tall to climb... normally
    .traps(24, 16, 2).traps(29, 16, 2).traps(34, 16, 2)
    .shelf(44, 13, 3)
    .add(
      { t: 'ticket', x: 6, rule: 'lowgrav' },
      { t: 'item', kind: 'cereal', x: 16, y: 9 },
      { t: 'ticket', x: 20, rule: 'reverse' },
      { t: 'ticket', x: 38, rule: 'dark' },
      { t: 'item', kind: 'flour', x: 45, y: 12 },
      { t: 'ticket', x: 52, rule: 'speedy' },
      { t: 'pot', x: 62, y: 15 },
      { t: 'plate', x: 65, y: 15, w: 8 },
      { t: 'sign', x: 1, y: 10, text: 'Order tickets change the rules. Read them!' },
    );
  return b.start(2).build();
}

function pantryPanic(): LevelDef {
  const b = new LevelBuilder('Pantry Panic', W3, 'Final order: honey, pasta, watermelon, flour. Noodle, Mech AND tickets!', 100, ['honey', 'pasta', 'melon', 'flour']).room().tie(170);
  b.solid(1, 13, 9, 3)
    .solid(14, 13, 8, 3)
    .clear(22, 16, 10, 2)
    .solid(24, 13, 2, 5).solid(28, 13, 2, 5)
    .solid(32, 13, 6, 3)
    .solid(50, 0, 1, 8)
    .solid(58, 12, 10, 4)
    .traps(76, 16, 2)
    .add(
      { t: 'item', kind: 'honey', x: 10, y: 15 },
      { t: 'ticket', x: 34, rule: 'untie' },
      { t: 'check', x: 39, y: 15 },
      { t: 'robot', x: 40, y: 13 },
      { t: 'item', kind: 'pasta', x: 46, y: 15 },
      { t: 'block', mat: 'cracker', x: 50, y: 8, w: 1, h: 8 },
      { t: 'item', kind: 'melon', x: 54, y: 15 },
      { t: 'ticket', x: 55, rule: 'lowgrav', dur: 15 },
      { t: 'item', kind: 'flour', x: 64, y: 11 },
      { t: 'check', x: 69, y: 15 },
      { t: 'ticket', x: 72, rule: 'speedy', dur: 10 },
      { t: 'pot', x: 84, y: 15 },
      { t: 'plate', x: 89, y: 15, w: 10 },
    );
  return b.start(2, 12).build();
}

export const PANTRY_LEVELS: LevelDef[] = [noodleBuddies(), swingShift(), potMech(), mechArm(), orderChaos(), pantryPanic()];
