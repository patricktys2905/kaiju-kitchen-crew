// Compact snapshots for online play. The host's World is the only real simulation; guests build the
// same level locally (so all the static parts already exist) and copy the moving parts in.
import { PHYS } from '../sim/constants';
import type { HandState, Phase, RobotRole, World } from '../sim/world';

const PHASES: Phase[] = ['play', 'splat', 'clear'];
const ROLES: RobotRole[] = ['all', 'legs', 'jump', 'arm', 'jump+arm', 'ride'];
const ST = ['cold', 'warn', 'hot'] as const;
const HS: HandState[] = ['idle', 'warn', 'slam', 'lift'];
const r1 = (v: number) => Math.round(v * 10) / 10;
const r2 = (v: number) => Math.round(v * 100) / 100;

export interface Snapshot {
  ph: number; pt: number; lt: number; sp: number; sw: number; dl: number; ck: number; cam: number;
  p: number[][]; // x y vx vy facing carry grounded landT
  i: number[][]; // x y carrier delivered
  c: number[][]; // x y pushers
  l: number[][]; // x y
  d: number[]; // door open
  s: number[][]; // load timer active
  t: number[]; // toaster popT
  b: number[]; // burner state 0 cold 1 warn 2 hot
  lv: string[]; // levers that are on
  k?: number[]; // pickups respawn
  gs?: number; // golden spoon found
  ti?: number[]; // oven timers: seconds left
  j?: number[][]; // jelly frozen wobble
  bl?: number[][]; // blocks broken breakT
  r?: number[][]; // robots x y vx vy facing carry grounded landT armT ...crew
  rr?: number[][]; // robot crew jobs
  tf?: number[]; // tickets fired
  ru?: [string | null, number]; // rule, time left
  tl?: number; // noodle length
  me?: number[][]; // melty melt gone regrow
  ve?: number[]; // vent states
  je?: number[]; // jet states
  wa?: number[]; // water levels
  bu?: number[][]; // bubbles x y life
  ha?: number[][]; // hands state t tx
}

export function makeSnapshot(w: World): Snapshot {
  return {
    ph: PHASES.indexOf(w.phase), pt: r2(w.phaseT), lt: r2(w.levelT), sp: w.splats, sw: w.splatWho, dl: w.delivered, ck: w.checkpoint, cam: r1(w.camX),
    p: w.players.map(p => [r1(p.x), r1(p.y), r1(p.vx), r1(p.vy), p.facing, p.carry, p.grounded ? 1 : 0, r2(p.landT), p.big ? 1 : 0, r2(p.spicyT), p.fizz ? 1 : 0]),
    k: w.pickups.map(pk => r2(pk.respawn)),
    gs: w.spoonGot ? 1 : 0,
    ti: w.timers.map(t => r2(t.left)),
    j: w.jellies.map(j => [j.frozen ? 1 : 0, r2(j.wobble)]),
    bl: w.blocks.map(b => [b.broken ? 1 : 0, r2(b.breakT)]),
    r: w.robots.map(r => [r1(r.x), r1(r.y), r1(r.vx), r1(r.vy), r.facing, r.carry, r.grounded ? 1 : 0, r2(r.landT), r2(r.armT), ...r.crew]),
    rr: w.robots.map(r => r.roles.map(x => ROLES.indexOf(x))),
    tf: w.tickets.map(t => (t.fired ? 1 : 0)),
    ru: [w.rule, r2(w.ruleT)],
    tl: w.tetherLen,
    me: w.meltys.map(m => [r2(m.melt), m.gone ? 1 : 0, r2(m.regrow)]),
    ve: w.vents.map(v => ST.indexOf(v.state)),
    je: w.jets.map(j => ST.indexOf(j.state)),
    wa: w.waters.map(x => r1(x.level)),
    bu: w.bubbles.map(b => [r1(b.x), r1(b.y), r2(b.life)]),
    ha: w.hands.map(h => [HS.indexOf(h.state), r2(h.t), r1(h.tx)]),
    i: w.items.map(it => [r1(it.x), r1(it.y), it.carrier, it.delivered ? 1 : 0]),
    c: w.crates.map(c => [r1(c.x), r1(c.y), c.pushers]),
    l: w.lifts.map(l => [r1(l.x), r1(l.y)]),
    d: w.doors.map(d => r2(d.open)),
    s: w.scales.map(s => [s.load, r2(s.timer), s.active ? 1 : 0]),
    t: w.toasters.map(t => r2(t.popT)),
    b: w.burners.map(b => (b.state === 'cold' ? 0 : b.state === 'warn' ? 1 : 2)),
    lv: [...w.leverOn].filter(([, on]) => on).map(([id]) => id),
  };
}

export function applySnapshot(w: World, s: Snapshot): void {
  w.phase = PHASES[s.ph] ?? 'play';
  w.phaseT = s.pt;
  w.levelT = s.lt;
  w.splats = s.sp;
  w.splatWho = s.sw;
  w.delivered = s.dl;
  w.checkpoint = s.ck;
  w.camX = s.cam;
  s.p.forEach((a, k) => {
    const p = w.players[k];
    if (!p) return;
    [p.x, p.y, p.vx, p.vy] = a;
    p.facing = a[4] < 0 ? -1 : 1;
    p.carry = a[5];
    p.grounded = a[6] === 1;
    p.landT = a[7];
    p.big = a[8] === 1;
    p.w = p.big ? PHYS.big.w : PHYS.pw;
    p.h = p.big ? PHYS.big.h : PHYS.ph;
    p.spicyT = a[9] ?? 0;
    p.fizz = a[10] === 1;
    p.inRobot = -1;
  });
  s.r?.forEach((a, i) => {
    const r = w.robots[i];
    if (!r) return;
    [r.x, r.y, r.vx, r.vy] = a;
    r.facing = a[4] < 0 ? -1 : 1; r.carry = a[5]; r.grounded = a[6] === 1; r.landT = a[7]; r.armT = a[8];
    r.crew = a.slice(9);
    r.roles = (s.rr?.[i] ?? []).map(k => ROLES[k] ?? 'ride');
    for (const pi of r.crew) if (w.players[pi]) w.players[pi].inRobot = i;
  });
  s.tf?.forEach((v, i) => { const t = w.tickets[i]; if (t) t.fired = v === 1; });
  if (s.ru) { w.rule = s.ru[0] as World['rule']; w.ruleT = s.ru[1]; }
  if (s.tl !== undefined) w.tetherLen = s.tl;
  s.me?.forEach((a, i) => { const m = w.meltys[i]; if (m) { m.melt = a[0]; m.gone = a[1] === 1; m.regrow = a[2]; } });
  s.ve?.forEach((v, i) => { const x = w.vents[i]; if (x) x.state = ST[v]; });
  s.je?.forEach((v, i) => { const x = w.jets[i]; if (x) x.state = ST[v]; });
  s.wa?.forEach((v, i) => { const x = w.waters[i]; if (x) x.level = v; });
  if (s.bu) w.bubbles = s.bu.map((a, i) => ({ kind: 'bubble' as const, idx: i, x: a[0], y: a[1], w: 56, h: 16, life: a[2] }));
  s.ha?.forEach((a, i) => { const h = w.hands[i]; if (h) { h.state = HS[a[0]]; h.t = a[1]; h.tx = a[2]; } });
  s.k?.forEach((v, i) => { const pk = w.pickups[i]; if (pk) pk.respawn = v; });
  w.spoonGot = s.gs === 1;
  s.ti?.forEach((v, i) => { const t = w.timers[i]; if (t) t.left = v; });
  s.j?.forEach((a, i) => { const j = w.jellies[i]; if (j) { j.frozen = a[0] === 1; j.wobble = a[1]; } });
  s.bl?.forEach((a, i) => { const b = w.blocks[i]; if (b) { b.broken = a[0] === 1; b.breakT = a[1]; } });
  s.i.forEach((a, k) => {
    const it = w.items[k];
    if (!it) return;
    [it.x, it.y, it.carrier] = a;
    it.delivered = a[3] === 1;
  });
  s.c.forEach((a, k) => { const c = w.crates[k]; if (c) { [c.x, c.y, c.pushers] = a; } });
  s.l.forEach((a, k) => { const l = w.lifts[k]; if (l) { [l.x, l.y] = a; } });
  s.d.forEach((o, k) => { const d = w.doors[k]; if (d) { d.open = o; d.h = d.fullH * (1 - o); } });
  s.s.forEach((a, k) => { const sc = w.scales[k]; if (sc) { sc.load = a[0]; sc.timer = a[1]; sc.active = a[2] === 1; } });
  s.t.forEach((v, k) => { const t = w.toasters[k]; if (t) t.popT = v; });
  s.b.forEach((v, k) => { const b = w.burners[k]; if (b) b.state = v === 0 ? 'cold' : v === 1 ? 'warn' : 'hot'; });
  for (const id of w.leverOn.keys()) w.leverOn.set(id, s.lv.includes(id));
}

/** Between snapshots, keep kaiju moving on the guest (dead reckoning). */
export function extrapolate(w: World, dt: number): void {
  if (w.phase !== 'play') return;
  for (const p of w.players) {
    p.x += p.vx * dt;
    if (!p.grounded) p.y += p.vy * dt;
  }
}
