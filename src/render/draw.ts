// Shape drawing for the kitchen: backdrop, counters, gadgets and ingredients. Kaiju use the art images.
import type * as Phaser from 'phaser';
import { addSlice, fitInside, hasArt, type SlicePool, type SpritePool } from './art';
import { ITEMS, PHYS, T, type ItemKind } from '../sim/constants';
import { TILE_HOT, TILE_ICE, TILE_ICICLE, TILE_SHELF, TILE_SOLID, TILE_TRAP } from '../sim/level';
import { SPECIES } from '../sim/constants';
import type { World } from '../sim/world';

type G = Phaser.GameObjects.Graphics;

const WOOD = 0x9a6438, WOOD_D = 0x7b4c28, WOOD_L = 0xb57b4a;
const MARBLE = 0xece6dc, MARBLE_D = 0xcfc6b8;

/** Per-world look: wall paintings, block texture, and the countertop edge colours. */
const THEMES: Record<string, { walls: [string, string]; tex: string; lip?: [number, number] }> = {
  'Counter Top': { walls: ['bg-kitchen', 'bg-kitchen2'], tex: 'tex-cabinet' },
  'The Fridge': { walls: ['bg-fridge', 'bg-fridge2'], tex: 'tex-fridge' },
  'The Pantry': { walls: ['bg-pantry', 'bg-pantry2'], tex: 'tex-pantry' },
  'Stove & Oven': { walls: ['bg-oven', 'bg-oven2'], tex: 'tex-stove', lip: [0xb8bec6, 0x5a5f66] },
  'The Sink': { walls: ['bg-sink', 'bg-sink2'], tex: 'tex-sink', lip: [0xf4f9fc, 0x9fb8c8] },
  'Dinner Service': { walls: ['bg-dining', 'bg-dining2'], tex: 'tex-dining', lip: [0xe8c27a, 0x8a5a2a] },
};

/** Backdrop + static tiles with the Gemini art (wall paintings, cabinet + marble textures, shelves). */
export function buildStatic(scene: Phaser.Scene, layer: Phaser.GameObjects.Layer, w: World): void {
  const g = scene.add.graphics().setDepth(0.2);
  layer.add(g);
  const theme = THEMES[w.level.world] ?? THEMES['Counter Top'];
  const fridge = w.level.world === 'The Fridge', pantry = w.level.world === 'The Pantry';
  const wallA = theme.walls[0], wallB = theme.walls[1];
  const solidTex = hasArt(theme.tex) ? theme.tex : 'tex-cabinet';
  const art = hasArt(wallA) && hasArt(solidTex);
  if (!art) { drawStatic(g, w); return; }
  // wall: two paintings side by side, alternating (mirrored every other pair)
  const bh = w.H, bw = Math.round((bh * 16) / 9);
  for (let x = 0, k = 0; x < w.W; x += bw, k++) {
    const key = k % 2 && hasArt(wallB) ? wallB : wallA;
    layer.add(scene.add.image(x, 0, key).setOrigin(0).setDisplaySize(bw, bh).setFlipX(k % 4 >= 2).setDepth(0));
  }
  g.fillStyle(fridge ? 0x0a2a40 : 0x2a1408, fridge ? 0.08 : 0.12).fillRect(0, 0, w.W, w.H); // calm the wall down a touch
  const tex = (key: string, cells: number, cellH: number) => {
    const t = scene.textures.get(key);
    if (!t.has('c0')) {
      const sz = t.getSourceImage().width / cells;
      for (let j = 0; j < cells; j++) for (let i = 0; i < cells; i++) t.add('c' + (j * cells + i), 0, i * sz, j * sz, sz, Math.min(sz, cellH || sz));
    }
  };
  tex(solidTex, 4, 0);
  if (hasArt('tex-marble')) tex('tex-marble', 4, 40);
  if (hasArt('tex-ice')) tex('tex-ice', 4, 0);
  const lv = w.level;
  // more cabinets below the level (seen on phones, where the camera sits lower)
  for (let j = lv.h; j < lv.h + 3; j++) for (let i = 0; i < lv.w; i++) layer.add(scene.add.image(i * T, j * T, solidTex, 'c' + ((j % 4) * 4 + (i % 4))).setOrigin(0).setDisplaySize(T, T).setDepth(0.1));
  const at = (i: number, j: number) => (i < 0 || i >= lv.w || j < 0 || j >= lv.h ? 0 : lv.tiles[j * lv.w + i]);
  for (let j = 0; j < lv.h; j++) for (let i = 0; i < lv.w; i++) {
    const t = at(i, j), x = i * T, y = j * T;
    if (t === TILE_SOLID) {
      layer.add(scene.add.image(x, y, solidTex, 'c' + ((j % 4) * 4 + (i % 4))).setOrigin(0).setDisplaySize(T, T).setDepth(0.1));
      if (at(i, j + 1) !== TILE_SOLID) g.fillStyle(0x3a1f0e, 0.5).fillRect(x, y + T - 4, T, 4);
      if (at(i - 1, j) !== TILE_SOLID) g.fillStyle(0x3a1f0e, 0.35).fillRect(x, y, 3, T);
      if (at(i + 1, j) !== TILE_SOLID) g.fillStyle(0x3a1f0e, 0.35).fillRect(x + T - 3, y, 3, T);
      const above = at(i, j - 1);
      if (above !== TILE_SOLID && above !== TILE_HOT) {
        if (fridge) { g.fillStyle(0xe8f4fb, 1).fillRect(x, y, T, 10); g.fillStyle(0x9fc8e0, 1).fillRect(x, y + 8, T, 3); }
        else if (pantry) { g.fillStyle(0xd9a46a, 1).fillRect(x, y, T, 8); g.fillStyle(0x6b3f1e, 1).fillRect(x, y + 7, T, 3); }
        else if (theme.lip) { g.fillStyle(theme.lip[0], 1).fillRect(x, y, T, 8); g.fillStyle(theme.lip[1], 1).fillRect(x, y + 7, T, 3); }
        else if (hasArt('tex-marble')) layer.add(scene.add.image(x, y, 'tex-marble', 'c' + (i % 4)).setOrigin(0).setDisplaySize(T, 13).setDepth(0.15));
        else g.fillStyle(MARBLE, 1).fillRect(x, y, T, 12);
        g.fillStyle(0x8a7a66, 0.6).fillRect(x, y + 12, T, 2);
        g.fillStyle(0x000000, 0.12).fillRect(x, y + 14, T, 5);
      }
    } else if (t === TILE_SHELF && at(i - 1, j) !== TILE_SHELF) {
      let n = 1;
      while (at(i + n, j) === TILE_SHELF) n++;
      const shelfKey = fridge && hasArt('ob-glass-shelf') ? 'ob-glass-shelf' : 'ob-shelf';
      if (hasArt(shelfKey)) {
        const hh = fridge ? 22 : 30, tex = scene.textures.get(shelfKey).getSourceImage().height;
        layer.add(addSlice(scene, shelfKey, x - 4, y - 5, n * T + 8, hh, hh / tex).setOrigin(0).setDepth(0.3));
      }
      else for (let k = 0; k < n; k++) drawShelfTile(g, x + k * T, y, k === 0, k === n - 1);
    } else if (t === TILE_HOT) {
      drawHob(g, x, y, T, 2);
    } else if (t === TILE_ICE) {
      if (hasArt('tex-ice')) layer.add(scene.add.image(x, y, 'tex-ice', 'c' + ((j % 4) * 4 + (i % 4))).setOrigin(0).setDisplaySize(T, T).setDepth(0.1));
      else g.fillStyle(0xbfe6ff, 1).fillRect(x, y, T, T);
      g.fillStyle(0xffffff, 0.8).fillRect(x, y, T, 4);
    } else if (t === TILE_ICICLE) {
      drawIcicles(g, x, y);
    } else if (t === TILE_TRAP) {
      layer.add(scene.add.image(x, y, solidTex, 'c' + ((j % 4) * 4 + (i % 4))).setOrigin(0).setDisplaySize(T, T).setDepth(0.1));
      if (hasArt('ob-trap')) layer.add(fitInside(scene.add.image(x + T / 2, y + 6, 'ob-trap'), T + 8, 26).setOrigin(0.5, 1).setDepth(0.4));
      else drawTrap(g, x, y);
    }
  }
}

function drawTrap(g: G, x: number, y: number): void {
  g.fillStyle(0xb57b4a, 1).fillRect(x + 2, y - 6, T - 4, 8);
  g.lineStyle(2, 0xc0c0c0, 1).strokeRect(x + 6, y - 12, T - 12, 8);
}

function drawIcicles(g: G, x: number, y: number): void {
  g.fillStyle(0xdff3ff, 1).fillRect(x, y, T, 8);
  for (let k = 0; k < 4; k++) {
    const ix = x + 5 + k * 10, len = 18 + ((k * 7) % 3) * 8;
    g.fillStyle(0xbfe6ff, 1).fillTriangle(ix - 5, y + 6, ix + 5, y + 6, ix, y + 6 + len);
    g.fillStyle(0xffffff, 0.8).fillTriangle(ix - 3, y + 6, ix - 1, y + 6, ix - 2, y + len * 0.7);
  }
}

function drawShelfTile(g: G, x: number, y: number, first: boolean, last: boolean): void {
  g.fillStyle(0x000000, 0.12).fillRect(x, y + 12, T, 6);
  g.fillStyle(WOOD_L, 1).fillRect(x, y, T, 12);
  g.fillStyle(WOOD_D, 1).fillRect(x, y + 10, T, 2);
  if (first || last) {
    const bx = first ? x + 6 : x + T - 10;
    g.fillStyle(0x6b6b6b, 1).fillTriangle(bx, y + 12, bx + 4, y + 12, bx + 4, y + 30);
  }
}

/** Backdrop + all static tiles as shapes (used when the art is missing). */
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
    } else if (t === TILE_ICE) {
      g.fillStyle(0xbfe6ff, 1).fillRect(x, y, T, T);
      g.fillStyle(0xffffff, 0.8).fillRect(x, y, T, 4);
    } else if (t === TILE_ICICLE) {
      drawIcicles(g, x, y);
    } else if (t === TILE_TRAP) {
      g.fillStyle(WOOD, 1).fillRect(x, y, T, T);
      drawTrap(g, x, y);
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
    case 'milk':
      g.fillStyle(0x3a7ad0, 1).fillRect(cx - h * 0.6, cy - h * 0.2, s * 0.6, h * 1.2);
      g.fillStyle(0xffffff, 1).fillRect(cx - h * 0.6, cy - h, s * 0.6, h * 0.8);
      break;
    case 'berry': case 'butter': case 'yogurt': case 'honey': case 'cereal': case 'flour': case 'pasta': case 'melon':
    case 'potato': case 'onion': case 'sausage': case 'pepper': case 'apple': case 'grapes': case 'carrot': case 'pear': case 'cake': case 'soup': case 'pizza': case 'fries':
      g.fillStyle(ITEMS[kind].color, 1).fillCircle(cx, cy, h);
      break;
    case 'lettuce':
      g.fillStyle(0x4f9e2c, 1).fillCircle(cx, cy, h);
      g.fillStyle(0x7ccf4a, 1).fillCircle(cx - 2, cy - 1, h - 3);
      g.lineStyle(2, 0xc4f09a, 1).lineBetween(cx - h + 4, cy, cx + h - 4, cy);
      break;
  }
}

/** An ingredient: Gemini icon if we have it, otherwise shapes. */
export function placeItem(pool: SpritePool | null, g: G, kind: ItemKind, cx: number, cy: number, s = PHYS.item, depth = 8): void {
  const key = `it-${kind}`;
  if (pool && hasArt(key)) {
    fitInside(pool.take(key, depth), s * 1.35, s * 1.35).setPosition(cx, cy);
    return;
  }
  drawItem(g, kind, cx, cy, s);
}

/** Everything that moves or changes: gadgets, cubes, ingredients. Uses the Gemini art when present. */
export function drawDynamic(g: G, w: World, time: number, pool: SpritePool | null = null, slices: SlicePool | null = null, fg: G | null = null): void {
  const front = fg ?? g;
  const art = (k: string) => !!pool && hasArt(k);
  const sliced = (k: string) => !!slices && hasArt(k);
  // the noodle tying neighbouring kaiju together (sags when slack)
  if (w.tetherLen > 0) {
    for (let k = 0; k + 1 < w.players.length; k++) {
      const a = w.players[k], b = w.players[k + 1];
      if (a.inRobot >= 0 || b.inRobot >= 0) continue;
      const ax = a.x + a.w / 2, ay = a.y + a.h * 0.55, bx = b.x + b.w / 2, by = b.y + b.h * 0.55;
      const d = Math.hypot(bx - ax, by - ay);
      const sag = d < w.tetherLen ? Math.sqrt(w.tetherLen * w.tetherLen - d * d) * 0.45 : 0;
      const mx = (ax + bx) / 2, my = (ay + by) / 2 + sag;
      const pts: { x: number; y: number }[] = [];
      for (let s = 0; s <= 16; s++) {
        const t = s / 16, u = 1 - t;
        pts.push({ x: u * u * ax + 2 * u * t * mx + t * t * bx, y: u * u * ay + 2 * u * t * my + t * t * by + Math.sin(t * Math.PI * 3 + time * 2) * 1.2 });
      }
      for (const [wd, col] of [[8, 0xb8862a], [5, 0xf4d47a]] as [number, number][]) {
        g.lineStyle(wd, col, 1);
        for (let s = 0; s < pts.length - 1; s++) g.lineBetween(pts[s].x, pts[s].y, pts[s + 1].x, pts[s + 1].y);
      }
    }
  }
  // the Pot Mech (the first crew member peeks out of the porthole)
  for (const r of w.robots) {
    const squash = r.landT > 0 ? 1 - r.landT * 0.6 : 1;
    if (art('ob-robot')) {
      const img = fitInside(pool!.take('ob-robot', 9), r.w + 40, r.h + 30).setOrigin(0.5, 1);
      img.setScale(img.scaleX * (2 - squash), img.scaleY * squash).setPosition(r.x + r.w / 2, r.y + r.h + 4).setFlipX(r.facing < 0);
      const pilot = r.crew[0];
      if (pilot !== undefined) {
        const key = 'kaiju-' + w.players[pilot].species;
        const px = r.x + r.w / 2 + (r.facing > 0 ? 1 : -1) * img.displayWidth * 0.08, py = r.y + r.h + 4 - img.displayHeight * 0.55;
        g.fillStyle(0xbfe6ff, 1).fillCircle(px, py, 15);
        if (hasArt(key)) fitInside(pool!.take(key, 9.5), 26, 26).setPosition(px, py + 2).setFlipX(r.facing < 0);
        g.fillStyle(0xffffff, 0.35).fillCircle(px - 5, py - 6, 5);
      }
    } else {
      g.fillStyle(0x8a9099, 1).fillRoundedRect(r.x, r.y + r.h * (1 - squash), r.w, r.h * squash, 14);
      g.fillStyle(0xbfe6ff, 1).fillCircle(r.x + r.w / 2, r.y + r.h * 0.45, 16);
    }
    if (!r.crew.length) g.lineStyle(3, 0xffffff, 0.35 + 0.3 * Math.sin(time * 4)).strokeRoundedRect(r.x - 6, r.y - 6, r.w + 12, r.h + 12, 16);
    void SPECIES;
  }
  // checkpoints (toothpick flags)
  w.checks.forEach((c, i) => {
    const x = c.x + T / 2, base = c.y + T;
    const reached = i <= w.checkpoint;
    if (art('ob-flag')) {
      const img = fitInside(pool!.take('ob-flag', 4), 50, 84).setOrigin(0.5, 1).setPosition(x, base + 2);
      img.setAngle(Math.sin(time * 3 + i) * 3);
      if (!reached) img.setTint(0x9a9a9a).setAlpha(0.8);
      return;
    }
    g.lineStyle(3, 0xd7b37a, 1).lineBetween(x, base, x, base - 70);
    const col = reached ? 0x5fd35f : 0xbdb6aa;
    const wave = Math.sin(time * 5) * 3;
    g.fillStyle(col, 1).fillTriangle(x, base - 70, x + 30, base - 62 + wave, x, base - 52);
  });
  // plates (the exit)
  for (const p of w.plates) {
    const cx = p.x + p.w / 2, y = p.y;
    if (sliced('ob-plate')) {
      const hh = 56;
      slices!.take('ob-plate', p.x - 10, y + 12 - hh, p.w + 20, hh, hh / 142, 2);
    } else {
      g.fillStyle(0x000000, 0.12).fillEllipse(cx, y + 2, p.w + 10, 16);
      g.fillStyle(0x8fb8d8, 1).fillEllipse(cx, y - 2, p.w, 18);
      g.fillStyle(0xffffff, 1).fillEllipse(cx, y - 4, p.w - 14, 12);
    }
    if (!w.recipeDone) {
      // a cloche marks the plate as closed until the recipe is done
      if (art('ob-cloche')) fitInside(pool!.take('ob-cloche', 3), 90, 80).setOrigin(0.5, 1).setPosition(cx, y - 4);
      else {
        const r = 30;
        g.fillStyle(0xdfe4ea, 1).slice(cx, y - 6, r, Math.PI, 0, false).fillPath();
        g.fillStyle(0xaab2bb, 1).fillCircle(cx, y - 6 - r, 6);
      }
      g.lineStyle(2, 0xffffff, 0.35);
      for (let xx = p.x; xx < p.x + p.w; xx += 16) g.lineBetween(xx, y - 6 * T, xx + 8, y - 6 * T);
    } else {
      const sh = 0.5 + 0.5 * Math.sin(time * 4);
      g.fillStyle(0xfff3b0, 0.16 + 0.1 * sh).fillRect(p.x, y - 6 * T, p.w, 6 * T);
      for (let k = 0; k < 6; k++) {
        const sx = p.x + ((k * 97 + time * 40) % p.w), sy = y - 20 - ((k * 53 + time * 60) % 160);
        g.fillStyle(0xffffff, 0.8).fillCircle(sx, sy, 2.5);
      }
    }
  }
  // pots
  for (const p of w.pots) {
    const done = w.recipeDone;
    if (art('ob-pot')) {
      fitInside(pool!.take('ob-pot', 6), p.w + 34, 84).setOrigin(0.5, 1).setPosition(p.x + p.w / 2, p.y + p.h + 2);
      if (done) g.fillStyle(0xffe27a, 0.25 + 0.15 * Math.sin(time * 5)).fillCircle(p.x + p.w / 2, p.y - 6, 40);
    } else {
      g.fillStyle(0x2c3036, 1).fillRoundedRect(p.x - 8, p.y + 6, 12, 8, 3).fillRoundedRect(p.x + p.w - 4, p.y + 6, 12, 8, 3);
      g.fillStyle(0x3a3f47, 1).fillRoundedRect(p.x, p.y, p.w, p.h, { tl: 4, tr: 4, bl: 12, br: 12 });
      g.fillStyle(0x50565f, 1).fillRect(p.x - 3, p.y - 2, p.w + 6, 8);
      g.fillStyle(done ? 0xffc04a : 0xd98a3a, 1).fillEllipse(p.x + p.w / 2, p.y + 2, p.w - 10, 6);
    }
    for (let k = 0; k < 3; k++) {
      const ph = (time * 0.7 + k / 3) % 1;
      g.fillStyle(0xffffff, 0.35 * (1 - ph)).fillCircle(p.x + 20 + k * 20 + Math.sin(time * 3 + k) * 4, p.y - 30 - ph * 50, 6 + ph * 8);
    }
  }
  // burners
  for (const b of w.burners) drawHob(g, b.x, b.y, b.w, b.state === 'hot' ? 2 : b.state === 'warn' ? 1 : 0, time);
  // doors (cutting boards that slide up into the wall)
  for (const d of w.doors) {
    if (d.h < 1) continue;
    if (sliced('ob-board')) {
      if (d.h < 8) continue;
      const ww = d.w + 14;
      slices!.take('ob-board', d.x - 7, d.topY, ww, d.h, ww / 290, 6);
      continue;
    }
    g.fillStyle(0xc98d4c, 1).fillRect(d.x, d.y, d.w, d.h);
    g.fillStyle(0xe0a964, 1).fillRect(d.x + 3, d.y, d.w - 10, d.h);
    g.lineStyle(1, 0xb07636, 0.7);
    for (let yy = d.y + 20; yy < d.y + d.h; yy += 26) g.lineBetween(d.x + 6, yy, d.x + d.w - 8, yy + 4);
    g.fillStyle(0x7b4c28, 1).fillRect(d.x, d.y + d.h - 6, d.w, 6);
  }
  // scales
  for (const s of w.scales) {
    const light = s.active ? 0x7ad37a : s.timer > 0 ? 0xffc04a : 0xbfc6cf;
    if (sliced('ob-scale')) {
      const hh = s.h + 14;
      slices!.take('ob-scale', s.x - 4, s.y + s.h + 2 - hh, s.w + 8, hh, hh / 368, 6);
      g.fillStyle(light, 0.6).fillRoundedRect(s.x + 6, s.y - 3, s.w - 12, 5, 2);
      // the dial (drawn crisp on top of the stretched middle)
      const dx = s.x + s.w / 2, dy = s.y + s.h / 2 + 6, r = 11;
      g.fillStyle(0x6b7480, 1).fillCircle(dx, dy, r + 2);
      g.fillStyle(0xffffff, 1).fillCircle(dx, dy, r);
      const frac = Math.min(1, s.load / Math.max(1, s.need));
      const ang = -Math.PI * 0.75 + frac * Math.PI * 1.5;
      g.lineStyle(2, 0xd23a2a, 1).lineBetween(dx, dy, dx + Math.cos(ang - Math.PI / 2) * (r - 2), dy + Math.sin(ang - Math.PI / 2) * (r - 2));
    } else {
      g.fillStyle(0xf6f3ee, 1).fillRoundedRect(s.x, s.y + 6, s.w, s.h - 6, 6);
      g.fillStyle(light, 1).fillRect(s.x + 2, s.y, s.w - 4, 8);
      g.fillStyle(0x9aa3ad, 1).fillRect(s.x, s.y + 7, s.w, 2);
      const dx = s.x + s.w / 2, dy = s.y + s.h / 2 + 4, r = 10;
      g.fillStyle(0xffffff, 1).fillCircle(dx, dy, r);
      g.lineStyle(2, 0x6b7480, 1).strokeCircle(dx, dy, r);
      const frac = Math.min(1, s.load / Math.max(1, s.need));
      const ang = -Math.PI * 0.75 + frac * Math.PI * 1.5;
      g.lineStyle(2, 0xd23a2a, 1).lineBetween(dx, dy, dx + Math.cos(ang - Math.PI / 2) * (r - 2), dy + Math.sin(ang - Math.PI / 2) * (r - 2));
    }
    if (!s.active && s.timer > 0 && s.hold > 0) {
      const dx = s.x + s.w / 2, dy = s.y - 16;
      g.lineStyle(5, 0xff9a3c, 1).beginPath().arc(dx, dy, 20, -Math.PI / 2, -Math.PI / 2 + (s.timer / s.hold) * Math.PI * 2, false).strokePath();
    }
  }
  // lifts (spatulas)
  for (const l of w.lifts) {
    if (l.bal) {
      const cx = l.x + l.w / 2;
      g.lineStyle(3, 0x8a6a3a, 1).lineBetween(l.x + 6, l.y, cx, l.y - 70).lineBetween(l.x + l.w - 6, l.y, cx, l.y - 70).lineBetween(cx, l.y - 70, cx, 0);
      if (sliced('ob-plate')) slices!.take('ob-plate', l.x - 8, l.y - 16, l.w + 16, 40, 40 / 142, 6);
      else g.fillStyle(0xffffff, 1).fillEllipse(cx, l.y + 6, l.w + 10, 18);
      continue;
    }
    if (l.on !== undefined && l.ax === l.bx) {
      g.fillStyle(0x6b6b6b, 1).fillRect(l.x + l.w / 2 - 4, l.y + l.h, 8, Math.max(0, l.ay - l.y));
    }
    if (l.on === undefined) g.fillStyle(0x2b2b2b, 1).fillRoundedRect(l.x + l.w / 2 - 6, l.y + 14, 12, 18, 3);
    if (art('ob-spatula')) {
      if (sliced('ob-spatula')) slices!.take('ob-spatula', l.x - 5, l.y - 5, l.w + 14, 26, 26 / 115, 6);
      else pool!.take('ob-spatula', 6).setOrigin(0, 0).setDisplaySize(l.w + 10, 24).setPosition(l.x - 5, l.y - 4);
      continue;
    }
    g.fillStyle(0xaeb6bf, 1).fillRoundedRect(l.x, l.y, l.w, 14, 4);
    g.fillStyle(0xd7dde3, 1).fillRoundedRect(l.x + 2, l.y + 1, l.w - 4, 6, 3);
    g.fillStyle(0x7d858f, 1);
    for (let sx = l.x + 16; sx < l.x + l.w - 10; sx += 20) g.fillRect(sx, l.y + 4, 8, 3);
  }
  // toasters
  for (const t of w.toasters) {
    g.fillStyle(0x000000, 0.15).fillEllipse(t.x + t.w / 2, t.y + t.h, t.w, 8);
    if (art('ob-toaster')) {
      const squash = t.popT > 0.35 ? 0.9 : 1;
      const hh = (t.h + 18) * squash;
      if (sliced('ob-toaster')) slices!.take('ob-toaster', t.x - 6, t.y + t.h + 2 - hh, t.w + 12, hh, hh / 346, 6);
      else pool!.take('ob-toaster', 6).setOrigin(0.5, 1).setDisplaySize(t.w + 12, hh).setPosition(t.x + t.w / 2, t.y + t.h + 2);
    } else {
      g.fillStyle(0xb9c1ca, 1).fillRoundedRect(t.x, t.y, t.w, t.h, 10);
      g.fillStyle(0xe3e8ee, 1).fillRoundedRect(t.x + 4, t.y + 3, t.w - 8, 10, 6);
      g.fillStyle(0x2b2e33, 1).fillRoundedRect(t.x + 12, t.y + 2, 22, 5, 2).fillRoundedRect(t.x + t.w - 34, t.y + 2, 22, 5, 2);
      g.fillStyle(0xe03a2a, 1).fillRect(t.x + t.w - 6, t.y + 12 + (t.popT > 0 ? -8 : 0), 8, 5);
    }
    if (t.popT > 0) {
      const k = t.popT / 0.5;
      g.fillStyle(0xffd27a, k).fillCircle(t.x + t.w / 2, t.y - 6, 30 * (1 - k) + 6);
    }
  }
  // levers
  for (const l of w.levers) {
    const on = !!w.leverOn.get(l.id);
    const bx = l.x + T / 2, by = l.y + T;
    if (w.level.world === 'The Sink' && art('ob-plug')) {
      const img = fitInside(pool!.take('ob-plug', 6), 40, 54).setOrigin(0.5, 1).setPosition(bx, by + 2 - (on ? 0 : 8));
      img.setAngle(on ? 0 : -12);
      continue;
    }
    if (art('ob-lever')) {
      const img = fitInside(pool!.take('ob-lever', 6), 46, 46).setOrigin(0.5, 1).setPosition(bx, by + 2);
      img.setFlipX(!on);
      if (l.flipT > 0) img.setScale(img.scaleX * 1.1, img.scaleY * 0.92);
      continue;
    }
    g.fillStyle(0x6b6b6b, 1).fillRoundedRect(bx - 12, by - 8, 24, 8, 3);
    const ang = (on ? 0.6 : -0.6) * (l.flipT > 0 ? 0.6 : 1);
    const tx = bx + Math.sin(ang) * 26, ty = by - 8 - Math.cos(ang) * 26;
    g.lineStyle(4, 0x8a8f96, 1).lineBetween(bx, by - 8, tx, ty);
    g.fillStyle(on ? 0x5fd35f : 0xe03a2a, 1).fillCircle(tx, ty, 6);
  }
  // sugar cubes
  for (const c of w.crates) {
    g.fillStyle(0x000000, 0.12).fillRect(c.x + 4, c.y + c.h - 2, c.w - 4, 4);
    if (art('ob-sugar')) {
      pool!.take('ob-sugar', 7).setOrigin(0, 0).setDisplaySize(c.w + 6, c.h + 6).setPosition(c.x - 3, c.y - 4);
    } else {
      g.fillStyle(0xdfe9f2, 1).fillRoundedRect(c.x, c.y, c.w, c.h, 6);
      g.fillStyle(0xffffff, 1).fillRoundedRect(c.x + 2, c.y + 2, c.w - 8, c.h - 8, 5);
      g.fillStyle(0xeef4fa, 1);
      for (let k = 0; k < (c.w * c.h) / 400; k++) g.fillRect(c.x + 6 + ((k * 37) % (c.w - 14)), c.y + 6 + ((k * 23) % (c.h - 14)), 3, 3);
    }
  }
  // the golden spoon: gleams and bobs until someone finds it
  if (w.spoon && !w.spoonGot) {
    const sp = w.spoon, cx = sp.x + sp.w / 2, cy = sp.y + sp.h / 2 + Math.sin(time * 2.5) * 4;
    g.fillStyle(0xffe27a, 0.18 + 0.1 * Math.sin(time * 4)).fillCircle(cx, cy, 26);
    if (art('it-spoon')) fitInside(pool!.take('it-spoon', 7), 40, 40).setPosition(cx, cy).setAngle(Math.sin(time * 1.7) * 10);
    else g.fillStyle(0xf5c542, 1).fillEllipse(cx, cy - 8, 16, 20).fillRect(cx - 2, cy, 4, 18);
    for (let k = 0; k < 3; k++) {
      const a = time * 1.5 + k * 2.1, r = 24;
      g.fillStyle(0xffffff, 0.5 + 0.5 * Math.sin(time * 6 + k)).fillCircle(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 2);
    }
  }
  // snacks (cookie, lemon drop, chili, soda): bob gently; after being eaten they grow back
  for (const pk of w.pickups) {
    const cx = pk.x + (T - 8) / 2, cy = pk.y + (T - 8) / 2 + Math.sin(time * 3 + pk.x) * 3;
    const key = 'ob-' + pk.kind;
    const k = pk.respawn > 0 ? 1 - pk.respawn / PHYS.pickupRespawn : 1;
    if (pk.respawn > 0 && k < 0.6) continue;
    if (art(key)) {
      const img = fitInside(pool!.take(key, 7), 38 * k, 38 * k).setPosition(cx, cy).setAlpha(pk.respawn > 0 ? 0.5 : 1);
      img.setAngle(Math.sin(time * 2 + pk.y) * 8);
    } else {
      const col = pk.kind === 'cookie' ? 0xc8873a : pk.kind === 'lemon' ? 0xffe14a : pk.kind === 'chili' ? 0xe0301e : 0x3aa05a;
      g.fillStyle(col, pk.respawn > 0 ? 0.5 : 1).fillCircle(cx, cy, 15 * k);
    }
    if (pk.respawn === 0) g.lineStyle(2, 0xffffff, 0.35 + 0.25 * Math.sin(time * 5 + pk.x)).strokeCircle(cx, cy, 22);
  }
  // jelly: wobbles; frozen = icy blue
  for (const j of w.jellies) {
    const sq = j.frozen ? 1 : 1 - Math.sin((0.3 - j.wobble) * 30) * j.wobble * 0.6;
    if (art('ob-jelly')) {
      for (let xx = j.x; xx < j.x + j.w - 1; xx += T) {
        const img = fitInside(pool!.take('ob-jelly', 6), T + 10, j.h + 16).setOrigin(0.5, 1);
        img.setScale(img.scaleX * (2 - sq), img.scaleY * sq).setPosition(xx + T / 2, j.y + j.h + 3);
        if (j.frozen) img.setTint(0x9fd8ff);
      }
    } else {
      g.fillStyle(j.frozen ? 0x9fd8ff : 0x7ad84a, 0.95).fillRoundedRect(j.x, j.y + j.h * (1 - sq), j.w, j.h * sq, 8);
    }
    if (j.frozen) {
      g.fillStyle(0xffffff, 0.35).fillRect(j.x + 2, j.y - 2, j.w - 4, 5);
      for (let k = 0; k < j.w / 20; k++) g.fillStyle(0xffffff, 0.8).fillCircle(j.x + 10 + k * 20, j.y + 8 + (k % 2) * 10, 2);
    }
  }
  // ice walls (melt) and cracker walls (smash)
  for (const b of w.blocks) {
    if (b.broken && b.breakT >= 1) continue;
    const a = b.broken ? 1 - b.breakT : 1;
    const drop = b.broken ? b.breakT * (b.mat === 'ice' ? 20 : 60) : 0;
    if (b.mat === 'ice') {
      for (let yy = b.y; yy < b.y + b.h; yy += T) {
        if (art('ob-ice')) pool!.take('ob-ice', 6).setOrigin(0, 0).setDisplaySize(b.w + 6, T + 4).setPosition(b.x - 3, yy - 2 + drop).setAlpha(a);
        else g.fillStyle(0xbfe6ff, 0.9 * a).fillRect(b.x, yy + drop, b.w, T);
      }
      if (b.broken) for (let k = 0; k < 5; k++) g.fillStyle(0x7ac8ff, a * 0.7).fillCircle(b.x + 6 + k * 7, b.y + b.h - 4 + drop * 0.2, 6 * (1 - a) + 3);
    } else {
      if (art('ob-cracker')) {
        const cw = b.w + 12, ch = cw * (512 / 361);
        for (let yy = b.y + b.h - ch, k = 0; yy > b.y - ch + 4; yy -= ch - 6, k++) {
          const img = pool!.take('ob-cracker', 6).setOrigin(0, 0).setDisplaySize(cw, ch);
          const cut = Math.max(0, b.y - yy); // never poke out above the wall
          img.setCrop(0, cut * (512 / ch), 361, 512 - cut * (512 / ch));
          img.setPosition(b.x - 6 + (b.broken ? (k % 2 ? 1 : -1) * drop * 0.6 : 0), yy + drop).setAlpha(a).setAngle(b.broken ? (k % 2 ? 1 : -1) * drop * 0.5 : 0);
        }
      } else {
        g.fillStyle(0xd9a24a, a).fillRect(b.x, b.y + drop, b.w, b.h);
      }
    }
  }
  // chocolate platforms: sag and drip as they melt; a faint outline while they set again
  for (const m of w.meltys) {
    if (m.gone) {
      const k = 1 - Math.max(0, m.regrow) / 4;
      g.lineStyle(2, 0x7a4a2a, 0.25 + 0.35 * k).strokeRoundedRect(m.x + 2, m.y + 2, m.w - 4, m.h - 4, 6);
      continue;
    }
    const sag = 1 - m.melt * 0.3;
    if (sliced('ob-choc')) slices!.take('ob-choc', m.x - 3, m.y + m.h * (1 - sag) - 3, m.w + 6, m.h * sag + 8, (m.h * sag + 8) / 272, 6);
    else g.fillStyle(0x6b3a1e, 1).fillRoundedRect(m.x, m.y + m.h * (1 - sag), m.w, m.h * sag, 6);
    if (m.melt > 0.05) for (let k = 0; k < m.w / 20; k++) {
      const ph = (time * 1.5 + k * 0.37) % 1;
      g.fillStyle(0x5a2e14, 0.9 * m.melt).fillEllipse(m.x + 10 + k * 20, m.y + m.h + ph * 26 * m.melt, 6, 10);
    }
  }
  // steam vents
  for (const v of w.vents) {
    const floorY = v.y + v.h;
    if (art('ob-vent')) fitInside(pool!.take('ob-vent', 4), v.w + 10, 30).setOrigin(0.5, 1).setPosition(v.x + v.w / 2, floorY + 8);
    else g.fillStyle(0x5a5f66, 1).fillRect(v.x, floorY - 6, v.w, 6);
    const n = v.state === 'hot' ? 10 : v.state === 'warn' ? 3 : 0;
    for (let k = 0; k < n; k++) {
      const ph = (time * (v.state === 'hot' ? 1.2 : 0.6) + k / n) % 1;
      const yy = floorY - ph * (v.state === 'hot' ? v.h : 50);
      g.fillStyle(0xffffff, 0.35 * (1 - ph)).fillCircle(v.x + v.w / 2 + Math.sin(time * 3 + k * 2) * v.w * 0.35, yy, 10 + ph * 18);
    }
  }
  // tap jets
  for (const j of w.jets) {
    const src = j.dir > 0 ? j.x : j.x + j.w;
    g.fillStyle(0xc8d4dc, 1).fillRoundedRect(src - 10, j.y + j.h / 2 - 12, 20, 24, 6);
    if (j.state === 'cold') continue;
    const n = j.state === 'hot' ? 9 : 3;
    for (let k = 0; k < n; k++) {
      const ph = (time * 1.6 + k / n) % 1;
      const xx = j.dir > 0 ? j.x + ph * j.w : j.x + j.w - ph * j.w;
      g.lineStyle(3, 0x7ac8ff, (j.state === 'hot' ? 0.7 : 0.3) * (1 - ph * 0.5)).lineBetween(xx, j.y + 8 + ((k * 37) % (j.h - 16)), xx - j.dir * 40, j.y + 8 + ((k * 37) % (j.h - 16)));
    }
  }
  // soap bubbles you can ride
  for (const b of w.bubbles) {
    const a = b.life > 6 ? 0.5 + 0.5 * Math.sin(time * 30) : 1;
    if (art('ob-bubble')) fitInside(pool!.take('ob-bubble', 7), b.w + 10, b.w + 10).setPosition(b.x + b.w / 2, b.y + b.w / 2 - 6).setAlpha(0.85 * a);
    else g.lineStyle(3, 0xbfe6ff, a).strokeCircle(b.x + b.w / 2, b.y + b.w / 2 - 6, b.w / 2);
  }
  // conveyor belts
  for (const b of w.belts) {
    if (sliced('ob-belt')) slices!.take('ob-belt', b.x - 4, b.y - 4, b.w + 8, 34, 34 / 155, 6);
    else g.fillStyle(0x2b2e33, 1).fillRoundedRect(b.x, b.y, b.w, 26, 10);
    for (let xx = 0; xx < b.w; xx += 30) {
      const ox = b.x + ((xx + time * b.speed * b.dir) % b.w + b.w) % b.w;
      g.fillStyle(0xffd27a, 0.8).fillTriangle(ox, b.y + 6, ox, b.y + 16, ox + b.dir * 8, b.y + 11);
    }
  }
  // water (in front of the kaiju, see-through)
  for (const wt of w.waters) {
    const top = wt.level;
    front.fillStyle(0x4ab0e8, 0.32).fillRect(wt.x, top, wt.w, w.H - top);
    front.lineStyle(3, 0xd8f4ff, 0.8);
    for (let xx = wt.x; xx < wt.x + wt.w; xx += 12) front.lineBetween(xx, top + Math.sin(time * 3 + xx * 0.05) * 3, xx + 12, top + Math.sin(time * 3 + (xx + 12) * 0.05) * 3);
  }
  // the Chef's Hand: a shadow warns where it will slam
  for (const h of w.hands) {
    if (h.state === 'idle') continue;
    const tx = h.tx;
    let stop = w.H;
    const col = Math.floor(tx / T);
    for (let j = 0; j < w.level.h; j++) if (w.level.tiles[j * w.level.w + col]) { stop = j * T; break; }
    const k = h.state === 'warn' ? h.t / 1.4 : 1;
    front.fillStyle(0x000000, 0.15 + 0.3 * k).fillEllipse(tx, stop, 60 + 80 * k, 16);
    if (h.state === 'warn') front.lineStyle(3, 0xff4a2a, 0.5 + 0.5 * Math.sin(time * 18)).strokeEllipse(tx, stop, 150, 22);
    const handH = 260;
    const yBottom = h.state === 'warn' ? stop - 330 + k * 60 : h.state === 'slam' ? stop + 4 : stop - (h.t / 0.6) * 340;
    if (art('ob-hand')) fitInside(pool!.take('ob-hand', 13), 170, handH).setOrigin(0.5, 1).setPosition(tx, yBottom);
    else front.fillStyle(0xffffff, 1).fillRoundedRect(tx - 60, yBottom - 120, 120, 120, 30);
  }
  // ingredients lying around (carried ones are drawn in front of the kaiju by the scene)
  for (const it of w.items) {
    if (it.delivered || it.carrier >= 0) continue;
    g.fillStyle(0x000000, 0.12).fillEllipse(it.x + PHYS.item / 2, it.y + PHYS.item, PHYS.item, 5);
    const bob = it.vy === 0 ? Math.sin(time * 3 + it.idx) * 1.5 : 0;
    if (w.nextIngredient === it.kind) g.lineStyle(2, 0xffffff, 0.5 + 0.4 * Math.sin(time * 6)).strokeCircle(it.x + PHYS.item / 2, it.y + PHYS.item / 2 + bob, PHYS.item * 0.9);
    placeItem(pool, g, it.kind, it.x + PHYS.item / 2, it.y + PHYS.item / 2 + bob);
  }
}
