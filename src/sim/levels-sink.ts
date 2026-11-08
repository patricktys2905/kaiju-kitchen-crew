// World 5: The Sink. New: water (kaiju float up to the surface; JUMP underwater is a swim stroke; near the
// surface it's a normal jump), the plug lever (fills / drains a sink), soap bubbles you ride upward, and
// tap jets that push you sideways. Ingredients float too.
// Reach rules: from the surface a jump clears ≈ 110 px; a bubble rises ≈ 75 px/s for 7 s.
import { LevelBuilder, type LevelDef } from './level';

const W5 = 'The Sink';

function bathTime(): LevelDef {
  const b = new LevelBuilder('Bath Time', W5, 'Pull the plug lever to fill the sink. Kaiju float!', 56, ['apple']).room();
  b.solid(1, 10, 9, 6) // left ledge
    .solid(31, 6, 24, 10) // high right ledge
    .add(
      { t: 'lever', id: 'p', x: 5, y: 9 },
      { t: 'water', x: 10, w: 21, low: 15, high: 7, on: 'p' },
      { t: 'item', kind: 'apple', x: 20, y: 15 },
      { t: 'pot', x: 40, y: 5 },
      { t: 'plate', x: 46, y: 5, w: 8 },
      { t: 'sign', x: 1, y: 6, text: 'Pull the plug lever: the sink fills and you float up!' },
      { t: 'sign', x: 18, y: 3, text: 'JUMP underwater to swim' },
    );
  return b.start(2, 9).build();
}

function bubbleBath(): LevelDef {
  const b = new LevelBuilder('Bubble Bath', W5, 'Soap bubbles float up. Ride one!', 56, ['grapes', 'pear']).room();
  b.solid(10, 6, 6, 2)
    .solid(28, 6, 27, 10)
    .add(
      { t: 'bubbler', x: 8, y: 15, every: 2.2 },
      { t: 'item', kind: 'grapes', x: 13, y: 5 },
      { t: 'bubbler', x: 26, y: 15, every: 2.2 },
      { t: 'item', kind: 'pear', x: 33, y: 5 },
      { t: 'pot', x: 42, y: 5 },
      { t: 'plate', x: 47, y: 5, w: 7 },
      { t: 'sign', x: 1, y: 10, text: 'Stand on a soap bubble and ride it up, then hop off' },
    );
  return b.start(2).build();
}

function tapDance(): LevelDef {
  const b = new LevelBuilder('Tap Dance', W5, 'Tap jets push you sideways: sometimes in your way, sometimes a big help.', 72, ['carrot', 'apple']).room();
  b.clear(13, 16, 3, 2)
    .clear(26, 16, 10, 2)
    .solid(30, 14, 2, 4)
    .add(
      { t: 'jet', x: 10, y: 10, w: 10, h: 6, dir: -1, cold: 1.6, hot: 2 },
      { t: 'jet', x: 24, y: 8, w: 13, h: 8, dir: 1 },
      { t: 'item', kind: 'carrot', x: 38, y: 15 },
      { t: 'water', x: 44, w: 9, low: 12, high: 12 },
      { t: 'item', kind: 'apple', x: 48, y: 15 },
      { t: 'pot', x: 58, y: 15 },
      { t: 'plate', x: 62, y: 15, w: 8 },
      { t: 'sign', x: 2, y: 9, text: 'Jump the gap when the tap is OFF' },
      { t: 'sign', x: 22, y: 5, text: 'This jet blows you across. Jump into it!' },
    );
  return b.start(2).build();
}

function drainPlan(): LevelDef {
  const b = new LevelBuilder('Drain Plan', W5, 'Two sinks, two plugs. Fill one, drain the other.', 64, ['grapes', 'pear']).room();
  b.solid(1, 10, 6, 6)
    .solid(12, 4, 5, 1) // high shelf over sink A
    .solid(21, 8, 2, 8) // wall between the sinks
    .solid(30, 8, 6, 7) // block in sink B, with a 1-tile tunnel under it (row 15)
    .add(
      { t: 'lever', id: 'a', x: 3, y: 9 },
      { t: 'water', x: 7, w: 14, low: 15, high: 6, on: 'a' },
      { t: 'item', kind: 'grapes', x: 14, y: 3 },
      { t: 'water', x: 23, w: 18, low: 16, high: 8, on: 'b', inv: true },
      { t: 'lever', id: 'b', x: 32, y: 7 },
      { t: 'item', kind: 'pear', x: 33, y: 15 },
      { t: 'pot', x: 50, y: 15 },
      { t: 'plate', x: 55, y: 15, w: 8 },
      { t: 'sign', x: 8, y: 9, text: 'Fill this sink to float up to the grapes' },
      { t: 'sign', x: 24, y: 4, text: "The pear is under the block: drain the sink, you can't dive" },
    );
  return b.start(2, 9).build();
}

function sudsExpress(): LevelDef {
  const b = new LevelBuilder('Suds Express', W5, 'Bubbles, jets and order tickets!', 76, ['apple', 'carrot']).room();
  b.clear(12, 16, 4, 2)
    .solid(23, 7, 10, 9)
    .add(
      { t: 'ticket', x: 5, rule: 'reverse', dur: 12 },
      { t: 'jet', x: 10, y: 11, w: 8, h: 5, dir: -1, cold: 1.5, hot: 1.8 },
      { t: 'bubbler', x: 21, y: 15, every: 2 },
      { t: 'item', kind: 'apple', x: 28, y: 6 },
      { t: 'ticket', x: 35, rule: 'lowgrav' },
      { t: 'water', x: 40, w: 10, low: 10, high: 10 },
      { t: 'item', kind: 'carrot', x: 45, y: 15 },
      { t: 'ticket', x: 52, rule: 'speedy', dur: 8 },
      { t: 'pot', x: 60, y: 15 },
      { t: 'plate', x: 65, y: 15, w: 8 },
    );
  return b.start(2).build();
}

function washingUp(): LevelDef {
  const b = new LevelBuilder('Washing Up', W5, 'Final order: grapes, apple, pear, carrot. Fill, float, ride and blow across!', 96, ['grapes', 'apple', 'pear', 'carrot']).room();
  b.solid(1, 10, 8, 6)
    .solid(14, 4, 5, 1)
    .solid(25, 6, 8, 10)
    .solid(37, 6, 8, 10)
    .clear(48, 16, 10, 2)
    .solid(52, 14, 2, 4)
    .add(
      { t: 'lever', id: 'p', x: 4, y: 9 },
      { t: 'water', x: 9, w: 16, low: 15, high: 6, on: 'p' },
      { t: 'item', kind: 'grapes', x: 16, y: 3 },
      { t: 'bubbler', x: 35, y: 15, every: 2.2 },
      { t: 'item', kind: 'pear', x: 41, y: 5 },
      { t: 'jet', x: 47, y: 9, w: 12, h: 7, dir: 1 },
      { t: 'check', x: 59, y: 15 },
      { t: 'item', kind: 'carrot', x: 62, y: 15 },
      { t: 'ticket', x: 64, rule: 'dark', dur: 12 },
      // the apple waits past the jet: it only blows one way, so at most two ingredients (grapes, pear)
      // may need carrying across it, or a team of 2 (one pair of hands each) could never finish
      { t: 'item', kind: 'apple', x: 70, y: 15 },
      { t: 'pot', x: 80, y: 15 },
      { t: 'plate', x: 85, y: 15, w: 10 },
    );
  return b.start(2, 9).build();
}

export const SINK_LEVELS: LevelDef[] = [bathTime(), bubbleBath(), tapDance(), drainPlan(), sudsExpress(), washingUp()];
