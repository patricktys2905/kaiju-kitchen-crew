// Shape drawing for the kitchen: backdrop, counters, gadgets and ingredients. Kaiju use the art images.
import type * as Phaser from 'phaser';
import { PHYS, T, type ItemKind } from '../sim/constants';
import { TILE_HOT, TILE_SHELF, TILE_SOLID } from '../sim/level';
import type { World } from '../sim/world';

type G = Phaser.GameObjects.Graphics;

const WOOD = 0x9a6438, WOOD_D = 0x7b4c28, WOOD_L = 0xb57b4a;
const MARBLE = 0xece6dc, MARBLE_D = 0xcfc6b8;

/** Backdrop + all static tiles. Drawn once per level. */
export function drawStatic(g: G, w: World): void {
  const W = w.W, H = w.H;
  // wall
  g.fillStyle(0xf1dfc3, 1).fillRect(0, 0, W, H);
  // subway tiles on the lower wall
  g.fillStyle(0xfaf1e2, 1).fillRect(0, 240, W, H - 240);
  g.lineStyle(2, 0xe0cfb4, 1);
  for (let y = 240; y < H; y += 24) {
    g.lineBetween(0, y, W, y);
    const off = ((y - 240) / 24) % 2 ? 24 : 0;
    for (let x = off; x < W; x += 48) g.lineBetween(x, y, x, y + 24);
  }
  // upper wall trim
  g.fillStyle(0xd9b98c, 1).fillRect(0, 232, W, 10);
  // decorations: hanging pans and a window every so often
  for (let x = 300; x < W; x += 900) {
    g.fillStyle(0xbfd8ea, 1).fillRoundedRect(x, 50, 200, 140, 12);
    g.fillStyle(0xe8f4fb, 1).fillRoundedRect(x + 10, 60, 85, 120, 6).fillRoundedRect(x + 105, 60, 85, 120, 6);
    g.lineStyle(6, 0xffffff, 1).strokeRoundedRect(x, 50, 200, 140, 12);
  }
  for (let x = 760; x < W; x += 900) {
    g.lineStyle(3, 0x8a7a66, 0.6).lineBetween(x, 20, x + 220, 20);
    for (let k = 0; k < 3; k++) {
      const px = x + 30 + k * 75;
      g.lineStyle(2, 0x8a7a66, 0.6).lineBetween(px, 20, px, 40);
      g.fillStyle(0x6b5a4a, 0.35).fillCircle(px, 70 + k * 6, 24 + k * 4);
      g.fillStyle(0x6b5a4a, 0.35).fillRect(px - 3, 36, 6, 14);
    }
  }

  const lv = w.level;
  const at = (i: number, j: number) => (i < 0 || i >= lv.w || j < 0 || j >= lv.h ? 0 : lv.tiles[j * lv.w + i]);
  for (let j = 0; j < lv.h; j++) for (let i = 0; i < lv.w; i++) {
    const t = at(i, j), x = i * T, y = j * T;
    if (t === TILE_SOLID) {
      g.fillStyle(WOOD, 1).fillRect(x, y, T, T);
      g.fillStyle(WOOD_D, 1).fillRect(x, y + T - 3, T, 3).fillRect(x + T - 2, y, 2, T);
      g.fillStyle(WOOD_L, 1).fillRect(x, y, 2, T);
      if (i % 2 === 0) g.fillStyle(WOOD_D, 0.5).fillCircle(x + T - 6, y + T / 2, 2.5); // cabinet knobs
      const above = at(i, j - 1);
      if (above !== TILE_SOLID && above !== TILE_HOT) {
        g.fillStyle(MARBLE, 1).fillRect(x, y, T, 12);
        g.fillStyle(MARBLE_D, 1).fillRect(x, y + 10, T, 3);
        g.lineStyle(1, 0xbfb4a3, 0.6).lineBetween(x + ((i * 13) % 30), y + 2, x + ((i * 13) % 30) + 12, y + 8);
      }
    } else if (t === TILE_SHELF) {
      g.fillStyle(0x000000, 0.12).fillRect(x, y + 12, T, 6);
      g.fillStyle(WOOD_L, 1).fillRect(x, y, T, 12);
      g.fillStyle(WOOD_D, 1).fillRect(x, y + 10, T, 2);
      if (at(i - 1, j) !== TILE_SHELF || at(i + 1, j) !== TILE_SHELF) {
        const bx = at(i - 1, j) !== TILE_SHELF ? x + 6 : x + T - 10;
        g.fillStyle(0x6b6b6b, 1).fillTriangle(bx, y + 12, bx + 4, y + 12, bx + 4, y + 30);
      }
    } else if (t === TILE_HOT) {
      drawHob(g, x, y, T, 2);
    }
  }
}

/** A hob: 0 cold, 1 warming up, 2 hot. */
export function drawHob(g: G, x: number, y: number, w: number, state: number, time = 0): void {
  g.fillStyle(0x1f1d1c, 1).fillRect(x, y, w, T);
  g.fillStyle(0x34302d, 1).fillRect(x, y, w, 6);
  const pulse = 0.75 + 0.25 * Math.sin(time * 10);
  const col = state === 2 ? 0xff4a1c : state === 1 ? 0xff9a3c : 0x4a4644;
  const a = state === 2 ? pulse : state === 1 ? 0.5 + 0.5 * Math.abs(Math.sin(time * 14)) : 1;
  if (state === 2) g.fillStyle(0xff6a2a, 0.25 * pulse).fillRect(x, y - 14, w, 14);
  g.lineStyle(4, col, a);
  for (let cx = x + 20; cx < x + w; cx += 40) g.strokeEllipse(cx, y + 6, 32, 8);
}

export function drawItem(g: G, kind: ItemKind, cx: number, cy: number, s = PHYS.item): void {
  const h = s / 2;
  switch (kind) {
    case 'bread':
      // a slice of bread: crust outline with the puffy top
      g.fillStyle(0xa8642a, 1).fillCircle(cx - h * 0.45, cy - h * 0.35, h * 0.62).fillCircle(cx + h * 0.45, cy - h * 0.35, h * 0.62).fillRoundedRect(cx - h * 0.85, cy - h * 0.4, s * 0.85, h * 1.4, 3);
      g.fillStyle(0xf6dba6, 1).fillCircle(cx - h * 0.45, cy - h * 0.35, h * 0.45).fillCircle(cx + h * 0.45, cy - h * 0.35, h * 0.45).fillRoundedRect(cx - h * 0.68, cy - h * 0.4, s * 0.68, h * 1.22, 2);
      break;
    case 'cheese':
      g.fillStyle(0xe6b422, 1).fillTriangle(cx - h, cy + h, cx + h, cy + h, cx + h, cy - h);
      g.fillStyle(0xffd23a, 1).fillTriangle(cx - h + 3, cy + h - 2, cx + h - 2, cy + h - 2, cx + h - 2, cy - h + 4);
      g.fillStyle(0xe6b422, 1).fillCircle(cx + h * 0.4, cy + h * 0.35, s * 0.08).fillCircle(cx + h * 0.65, cy - h * 0.1, s * 0.06);
      break;
    case 'tomato':
      g.fillStyle(0xc4281c, 1).fillCircle(cx, cy + 1, h);
      g.fillStyle(0xe8392a, 1).fillCircle(cx - 1, cy, h - 2);
      g.fillStyle(0xffffff, 0.45).fillCircle(cx - h * 0.4, cy - h * 0.35, s * 0.1);
      g.fillStyle(0x3c9a2a, 1).fillTriangle(cx - 5, cy - h + 2, cx + 5, cy - h + 2, cx, cy - h - 4);
      break;
    case 'egg':
      g.fillStyle(0xd8ccb8, 1).fillEllipse(cx, cy + 1, s * 0.8, s);
      g.fillStyle(0xfff6e6, 1).fillEllipse(cx - 1, cy, s * 0.72, s * 0.92);
      g.fillStyle(0xffffff, 0.8).fillEllipse(cx - h * 0.3, cy - h * 0.4, s * 0.18, s * 0.26);
      break;
    case 'ham':
      g.fillStyle(0xd96a7a, 1).fillCircle(cx, cy, h);
      g.fillStyle(0xf6a3b0, 1).fillCircle(cx, cy, h - 3);
      g.lineStyle(2, 0xfbd3d9, 1).strokeCircle(cx + 1, cy - 1, h * 0.45);
      break;
    case 'lettuce':
      g.fillStyle(0x4f9e2c, 1).fillCircle(cx, cy, h);
      g.fillStyle(0x7ccf4a, 1).fillCircle(cx - 2, cy - 1, h - 3);
      g.lineStyle(2, 0xc4f09a, 1).lineBetween(cx - h + 4, cy, cx + h - 4, cy);
      break;
  }
}

/** Everything that moves or changes: gadgets, cubes, ingredients. */
export function drawDynamic(g: G, w: World, time: number): void {
  // checkpoints (toothpick flags)
  w.checks.forEach((c, i) => {
    const x = c.x + T / 2, base = c.y + T;
    g.lineStyle(3, 0xd7b37a, 1).lineBetween(x, base, x, base - 70);
    const col = i <= w.checkpoint ? 0x5fd35f : 0xbdb6aa;
    const wave = Math.sin(time * 5) * 3;
    g.fillStyle(col, 1).fillTriangle(x, base - 70, x + 30, base - 62 + wave, x, base - 52);
  });
  // plates (the exit)
  for (const p of w.plates) {
    const cx = p.x + p.w / 2, y = p.y;
    g.fillStyle(0x000000, 0.12).fillEllipse(cx, y + 2, p.w + 10, 16);
    g.fillStyle(0x8fb8d8, 1).fillEllipse(cx, y - 2, p.w, 18);
    g.fillStyle(0xffffff, 1).fillEllipse(cx, y - 4, p.w - 14, 12);
    if (!w.recipeDone) {
      // a small cloche marks the plate as closed until the recipe is done
      const r = 30;
      g.fillStyle(0xdfe4ea, 1).slice(cx, y - 6, r, Math.PI, 0, false).fillPath();
      g.fillStyle(0xaab2bb, 1).fillCircle(cx, y - 6 - r, 6);
      g.fillStyle(0xffffff, 0.45).fillEllipse(cx - 12, y - 22, 8, 16);
      g.lineStyle(2, 0xffffff, 0.35);
      for (let xx = p.x; xx < p.x + p.w; xx += 16) g.lineBetween(xx, y - 6 * T, xx + 8, y - 6 * T);
    } else {
      const sh = 0.5 + 0.5 * Math.sin(time * 4);
      g.fillStyle(0xfff3b0, 0.18 + 0.12 * sh).fillRect(p.x, y - 6 * T, p.w, 6 * T);
      for (let k = 0; k < 6; k++) {
        const sx = p.x + ((k * 97 + time * 40) % p.w), sy = y - 20 - ((k * 53 + time * 60) % 160);
        g.fillStyle(0xffffff, 0.8).fillCircle(sx, sy, 2.5);
      }
    }
  }
  // pots
  for (const p of w.pots) {
    const done = w.recipeDone;
    g.fillStyle(0x2c3036, 1).fillRoundedRect(p.x - 8, p.y + 6, 12, 8, 3).fillRoundedRect(p.x + p.w - 4, p.y + 6, 12, 8, 3);
    g.fillStyle(0x3a3f47, 1).fillRoundedRect(p.x, p.y, p.w, p.h, { tl: 4, tr: 4, bl: 12, br: 12 });
    g.fillStyle(0x50565f, 1).fillRect(p.x - 3, p.y - 2, p.w + 6, 8);
    g.fillStyle(done ? 0xffc04a : 0xd98a3a, 1).fillEllipse(p.x + p.w / 2, p.y + 2, p.w - 10, 6);
    for (let k = 0; k < 3; k++) {
      const ph = (time * 0.7 + k / 3) % 1;
      g.fillStyle(0xffffff, 0.35 * (1 - ph)).fillCircle(p.x + 20 + k * 20 + Math.sin(time * 3 + k) * 4, p.y - 8 - ph * 50, 6 + ph * 8);
    }
  }
  // burners
  for (const b of w.burners) drawHob(g, b.x, b.y, b.w, b.state === 'hot' ? 2 : b.state === 'warn' ? 1 : 0, time);
  // doors (cutting boards that slide up into the wall)
  for (const d of w.doors) {
    if (d.h < 1) continue;
    g.fillStyle(0xc98d4c, 1).fillRect(d.x, d.y, d.w, d.h);
    g.fillStyle(0xe0a964, 1).fillRect(d.x + 3, d.y, d.w - 10, d.h);
    g.lineStyle(1, 0xb07636, 0.7);
    for (let yy = d.y + 20; yy < d.y + d.h; yy += 26) g.lineBetween(d.x + 6, yy, d.x + d.w - 8, yy + 4);
    g.fillStyle(0x7b4c28, 1).fillRect(d.x, d.y + d.h - 6, d.w, 6);
  }
  // scales
  for (const s of w.scales) {
    g.fillStyle(0xf6f3ee, 1).fillRoundedRect(s.x, s.y + 6, s.w, s.h - 6, 6);
    g.fillStyle(s.active ? 0x7ad37a : s.timer > 0 ? 0xffc04a : 0xbfc6cf, 1).fillRect(s.x + 2, s.y, s.w - 4, 8);
    g.fillStyle(0x9aa3ad, 1).fillRect(s.x, s.y + 7, s.w, 2);
    // dial
    const dx = s.x + s.w / 2, dy = s.y + s.h / 2 + 4, r = 10;
    g.fillStyle(0xffffff, 1).fillCircle(dx, dy, r);
    g.lineStyle(2, 0x6b7480, 1).strokeCircle(dx, dy, r);
    const frac = Math.min(1, s.load / Math.max(1, s.need));
    const ang = -Math.PI * 0.75 + frac * Math.PI * 1.5;
    g.lineStyle(2, 0xd23a2a, 1).lineBetween(dx, dy, dx + Math.cos(ang - Math.PI / 2) * (r - 2), dy + Math.sin(ang - Math.PI / 2) * (r - 2));
    if (!s.active && s.timer > 0 && s.hold > 0) {
      g.lineStyle(4, 0xff9a3c, 1).beginPath().arc(dx, dy, r + 6, -Math.PI / 2, -Math.PI / 2 + (s.timer / s.hold) * Math.PI * 2, false).strokePath();
    }
  }
  // lifts (spatulas)
  for (const l of w.lifts) {
    if (l.on !== undefined && l.ax === l.bx) {
      g.fillStyle(0x6b6b6b, 1).fillRect(l.x + l.w / 2 - 4, l.y + l.h, 8, Math.max(0, l.ay - l.y));
    }
    g.fillStyle(0xaeb6bf, 1).fillRoundedRect(l.x, l.y, l.w, 14, 4);
    g.fillStyle(0xd7dde3, 1).fillRoundedRect(l.x + 2, l.y + 1, l.w - 4, 6, 3);
    g.fillStyle(0x7d858f, 1);
    for (let sx = l.x + 16; sx < l.x + l.w - 10; sx += 20) g.fillRect(sx, l.y + 4, 8, 3);
    if (l.on === undefined) g.fillStyle(0x2b2b2b, 1).fillRoundedRect(l.x + l.w / 2 - 6, l.y + 14, 12, 18, 3);
  }
  // toasters
  for (const t of w.toasters) {
    g.fillStyle(0x000000, 0.15).fillEllipse(t.x + t.w / 2, t.y + t.h, t.w, 8);
    g.fillStyle(0xb9c1ca, 1).fillRoundedRect(t.x, t.y, t.w, t.h, 10);
    g.fillStyle(0xe3e8ee, 1).fillRoundedRect(t.x + 4, t.y + 3, t.w - 8, 10, 6);
    g.fillStyle(0x2b2e33, 1).fillRoundedRect(t.x + 12, t.y + 2, 22, 5, 2).fillRoundedRect(t.x + t.w - 34, t.y + 2, 22, 5, 2);
    g.fillStyle(0xe03a2a, 1).fillRect(t.x + t.w - 6, t.y + 12 + (t.popT > 0 ? -8 : 0), 8, 5);
    if (t.popT > 0) {
      const k = t.popT / 0.5;
      g.fillStyle(0xffd27a, k).fillCircle(t.x + t.w / 2, t.y - 6, 26 * (1 - k) + 6);
    }
  }
  // levers
  for (const l of w.levers) {
    const on = !!w.leverOn.get(l.id);
    const bx = l.x + T / 2, by = l.y + T;
    g.fillStyle(0x6b6b6b, 1).fillRoundedRect(bx - 12, by - 8, 24, 8, 3);
    const ang = (on ? 0.6 : -0.6) * (l.flipT > 0 ? 0.6 : 1);
    const tx = bx + Math.sin(ang) * 26, ty = by - 8 - Math.cos(ang) * 26;
    g.lineStyle(4, 0x8a8f96, 1).lineBetween(bx, by - 8, tx, ty);
    g.fillStyle(on ? 0x5fd35f : 0xe03a2a, 1).fillCircle(tx, ty, 6);
  }
  // sugar cubes
  for (const c of w.crates) {
    g.fillStyle(0x000000, 0.12).fillRect(c.x + 4, c.y + c.h - 2, c.w - 4, 4);
    g.fillStyle(0xdfe9f2, 1).fillRoundedRect(c.x, c.y, c.w, c.h, 6);
    g.fillStyle(0xffffff, 1).fillRoundedRect(c.x + 2, c.y + 2, c.w - 8, c.h - 8, 5);
    g.fillStyle(0xeef4fa, 1);
    for (let k = 0; k < (c.w * c.h) / 400; k++) g.fillRect(c.x + 6 + ((k * 37) % (c.w - 14)), c.y + 6 + ((k * 23) % (c.h - 14)), 3, 3);
    if (c.pushers > 0 && c.pushers < c.need) g.fillStyle(0xffc04a, 0.35).fillRoundedRect(c.x, c.y, c.w, c.h, 6);
  }
  // ingredients
  for (const it of w.items) {
    if (it.delivered) continue;
    if (it.carrier < 0) g.fillStyle(0x000000, 0.12).fillEllipse(it.x + PHYS.item / 2, it.y + PHYS.item, PHYS.item, 5);
    const bob = it.carrier < 0 && it.vy === 0 ? Math.sin(time * 3 + it.idx) * 1.5 : 0;
    const next = w.nextIngredient === it.kind;
    if (next && it.carrier < 0) g.lineStyle(2, 0xffffff, 0.5 + 0.4 * Math.sin(time * 6)).strokeCircle(it.x + PHYS.item / 2, it.y + PHYS.item / 2 + bob, PHYS.item * 0.8);
    drawItem(g, it.kind, it.x + PHYS.item / 2, it.y + PHYS.item / 2 + bob);
  }
}
