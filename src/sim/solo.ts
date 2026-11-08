import type { PlayerInput, World } from './world';

/** Same screen: a snoozing kaiju you walk into shuffles along with you (so one person can push a ×2 cube). */
export function nudgeSleepers(w: World, inputs: PlayerInput[], asleep: (i: number) => boolean): PlayerInput[] {
  for (let pass = 0; pass < w.players.length; pass++) {
    for (const s of w.players) {
      if (!asleep(s.idx) || inputs[s.idx].mx !== 0 || s.inRobot >= 0 || !s.grounded) continue;
      for (const a of w.players) {
        const m = inputs[a.idx].mx;
        if (a === s || Math.abs(m) < 0.2 || a.inRobot >= 0 || !a.grounded) continue; // only a walking kaiju nudges
        const dir = m * (w.rule === 'reverse' ? -1 : 1); // the way it actually walks (backwards-day ticket flips it)
        const gap = dir > 0 ? s.x - (a.x + a.w) : a.x - (s.x + s.w);
        if (gap > -1 && gap < 4 && a.y < s.y + s.h - 8 && s.y < a.y + a.h - 8) { inputs[s.idx] = { ...inputs[s.idx], mx: m }; break; }
      }
    }
  }
  return inputs;
}
