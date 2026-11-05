// Tuning numbers for the platformer. Units: pixels and seconds. One tile = 40 px.
export const T = 40;
export const VIEW = { w: 1280, h: 720 }; // screen / HUD coordinates
/** How much of the kitchen the shared camera shows (world px). Smaller = bigger kaiju on screen. */
export const WORLD_VIEW = { w: 960, h: 540 };
export const ZOOM = VIEW.w / WORLD_VIEW.w;
export const STEP = 1 / 60; // fixed simulation step
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 6;

export const PHYS = {
  pw: 34, // kaiju hitbox
  ph: 34,
  run: 250,
  accelGround: 2600,
  accelAir: 1700,
  gravity: 2200,
  maxFall: 1100,
  jumpV: 700, // ≈ 110 px jump: 3 tiles needs a friend to stand on
  jumpCut: 0.45, // releasing jump early cuts the rise
  coyote: 0.08,
  jumpBuffer: 0.12,
  toastV: 1240, // pop-up toaster launch (≈ 8.5 tiles)
  pushSpeed: 95, // sugar cubes move slowly
  item: 24, // ingredient size
  throwStill: { vx: 120, vy: -760 }, // standing still: toss up (to a friend on a ledge)
  throwMove: { vx: 380, vy: -480 }, // moving: lob forward
  edge: 6, // shared-screen margin
  big: { w: 50, h: 56 }, // after eating a cookie: a big friend is a 4-tile step (56 + 110)
  fizzV: 1000, // soda jump (≈ 5.5 tiles)
  bounceV: 1000, // jelly bounce
  iceAccel: 380, // on ice you slide
  spicy: 8, // seconds a chili lasts
  pickupRespawn: 5,
  tether: 170, // default noodle length between neighbouring kaiju
  robot: { w: 104, h: 112, run: 150, jumpV: 870, weight: 6 }, // Pot Mech (jump ≈ 4 tiles)
  lowGrav: 0.42, // moon-gravity ticket
  speedy: 1.5,
};

export const TIMING = {
  splat: 1.1, // freeze after someone gets splatted, before the team respawns
  clear: 2.2,
  liftSpeed: 130,
  doorSpeed: 6, // door open fraction per second
};

/** The kaiju roster (same cast as Kitchen Kaiju). Each player picks a different one. */
export const SPECIES = [
  { name: 'GOBZILLA', full: 'Gobzilla Jr.', food: 'strawberry lizard', color: 0xff5a7a, css: '#ff5a7a' },
  { name: 'SQUIDGEON', full: 'Squidgeon', food: 'jelly octopus', color: 0x4fd1ff, css: '#4fd1ff' },
  { name: 'CRABBAGE', full: 'Crabbage', food: 'cheese crab', color: 0xffd24a, css: '#ffd24a' },
  { name: 'BLOBLIN', full: 'Bloblin', food: 'lime jelly', color: 0x8dff6a, css: '#8dff6a' },
  { name: 'MOTHBALL', full: 'Mothball', food: 'marshmallow moth', color: 0xb98cff, css: '#b98cff' },
  { name: 'TOASTBAT', full: 'Toastbat', food: 'toast bat', color: 0xff9a3c, css: '#ff9a3c' },
  { name: 'DUMPLORD', full: 'Dumplord', food: 'dumpling lord', color: 0xf0cf8e, css: '#f0cf8e' },
  { name: 'NORIGON', full: 'Norigon', food: 'sushi dragon', color: 0x21c7a8, css: '#21c7a8' },
  { name: 'CHOCOMUNCH', full: 'Chocomunch', food: 'chocolate golem', color: 0xa0652e, css: '#c8834a' },
  { name: 'BUBBLEGUMBO', full: 'Bubblegumbo', food: 'bubblegum elephant', color: 0xff7ad9, css: '#ff7ad9' },
  { name: 'BLUEBEARY', full: 'Bluebeary', food: 'blueberry muffin bear', color: 0x4a6cff, css: '#7a93ff' },
  { name: 'PIZZARAPTOR', full: 'Pizzaraptor', food: 'pizza raptor', color: 0xe03a2a, css: '#ff6a4a' },
  { name: 'GRAPEHOUND', full: 'Grapehound', food: 'grape hound', color: 0x6a2aa8, css: '#a066e0' },
  { name: 'AVOCADRAKE', full: 'Avocadrake', food: 'avocado dragon', color: 0x9bb33a, css: '#b6cf52' },
  { name: 'SALMONSTER', full: 'Salmonster', food: 'salmon fish monster', color: 0x2f5f9f, css: '#6f9fdf' },
  { name: 'ONIGIRILLA', full: 'Onigirilla', food: 'rice-ball gorilla', color: 0xdfe6ee, css: '#eef3f8' },
];

export type ItemKind = 'bread' | 'cheese' | 'tomato' | 'egg' | 'ham' | 'lettuce' | 'milk' | 'berry' | 'butter' | 'yogurt' | 'honey' | 'cereal' | 'flour' | 'pasta' | 'melon';
/** Too heavy for a kaiju: only the Pot Mech's arm can carry these. */
export const HEAVY: ItemKind[] = ['melon'];
export const ITEMS: Record<ItemKind, { name: string; color: number }> = {
  bread: { name: 'Bread', color: 0xe8b25c },
  cheese: { name: 'Cheese', color: 0xffd23a },
  tomato: { name: 'Tomato', color: 0xe8392a },
  egg: { name: 'Egg', color: 0xfff6e6 },
  ham: { name: 'Ham', color: 0xf28a9a },
  lettuce: { name: 'Lettuce', color: 0x7ccf4a },
  milk: { name: 'Milk', color: 0xf4f8ff },
  berry: { name: 'Strawberry', color: 0xe8394a },
  butter: { name: 'Butter', color: 0xfff0a0 },
  yogurt: { name: 'Yogurt', color: 0xffc0d8 },
  honey: { name: 'Honey', color: 0xf0a020 },
  cereal: { name: 'Cereal', color: 0x4a8ad8 },
  flour: { name: 'Flour', color: 0xf4ead8 },
  pasta: { name: 'Pasta', color: 0xf0d060 },
  melon: { name: 'Watermelon', color: 0x3a9a3a },
};
