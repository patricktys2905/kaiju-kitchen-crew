// Compact snapshots for online play. The host's World is the only real simulation; guests build the
// same level locally (so all the static parts already exist) and copy the moving parts in.
import { PHYS } from '../sim/constants';
import type { Phase, World } from '../sim/world';

const PHASES: Phase[] = ['play', 'splat', 'clear'];
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
  j?: number[][]; // jelly frozen wobble
  bl?: number[][]; // blocks broken breakT
}

export function makeSnapshot(w: World): Snapshot {
  return {
    ph: PHASES.indexOf(w.phase), pt: r2(w.phaseT), lt: r2(w.levelT), sp: w.splats, sw: w.splatWho, dl: w.delivered, ck: w.checkpoint, cam: r1(w.camX),
    p: w.players.map(p => [r1(p.x), r1(p.y), r1(p.vx), r1(p.vy), p.facing, p.carry, p.grounded ? 1 : 0, r2(p.landT), p.big ? 1 : 0, r2(p.spicyT), p.fizz ? 1 : 0]),
    k: w.pickups.map(pk => r2(pk.respawn)),
    j: w.jellies.map(j => [j.frozen ? 1 : 0, r2(j.wobble)]),
    bl: w.blocks.map(b => [b.broken ? 1 : 0, r2(b.breakT)]),
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
  });
  s.k?.forEach((v, i) => { const pk = w.pickups[i]; if (pk) pk.respawn = v; });
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
