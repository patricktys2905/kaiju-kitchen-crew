// HTML panels (menu, local setup, online lobby). HTML so typing and tapping work the same on phones
// and computers, and text stays crisp at any screen size.
import { SPECIES } from './sim/constants';
import { LEVELS } from './sim/levels';
import { bestTime, clearedIn, countStars, HATS, hatOf, STAR_CLEAN, STAR_CLEAR, STAR_SPOON, starMask, totalStars, unlockedHats, UNLOCK_NEED, WORLDS, worldOf, worldOpen } from './progress';

const CSS = `
.panel-wrap { position: fixed; inset: 0; z-index: 15; display: flex; align-items: center; justify-content: center; font-family: Nunito, Arial, sans-serif; font-weight: 800; color: #f1e4d2; }
.panel { background: #2a1408f2; border: 4px solid #ffcf8a; border-radius: 24px; padding: 20px 28px; width: min(760px, 94vw); max-height: 94vh; overflow: auto; box-shadow: 0 10px 0 #140b05; box-sizing: border-box; }
.panel h1 { font-family: 'Luckiest Guy', 'Arial Black', sans-serif; font-weight: 400; letter-spacing: 0.04em; color: #ffb347; margin: 0 0 6px; font-size: 38px; text-shadow: 0 4px 0 #140b05; }
.panel h2 { font-family: 'Luckiest Guy', 'Arial Black', sans-serif; font-weight: 400; letter-spacing: 0.04em; color: #ffe9c7; margin: 14px 0 4px; font-size: 22px; }
.panel p { margin: 6px 0; line-height: 1.4; }
.panel .muted { color: #cdb9a3; font-weight: 700; font-size: 15px; }
.panel .row { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 12px; align-items: center; }
.panel button { font-family: 'Luckiest Guy', 'Arial Black', sans-serif; font-weight: 400; letter-spacing: 0.04em; font-size: 20px; padding: 11px 18px; border-radius: 14px;
  border: 3px solid #ffcf8a; background: #3a1f0e; color: #ffe9c7; cursor: pointer; touch-action: manipulation; }
.panel button.go { background: #ff9a3c; color: #2a1408; }
.panel button.on { background: #ffcf8a; color: #2a1408; }
.panel button:disabled { opacity: 0.4; cursor: default; }
.panel input { font-family: 'Luckiest Guy', 'Arial Black', sans-serif; font-size: 34px; letter-spacing: 0.3em; width: 7em; text-transform: uppercase; text-align: center;
  padding: 8px; border-radius: 12px; border: 3px solid #ffcf8a; background: #fff3dc; color: #2a1408; }
.panel input.name { font-size: 20px; letter-spacing: 0.02em; width: 9em; text-transform: none; font-family: Nunito, Arial, sans-serif; font-weight: 800; }
.panel .code { font-family: 'Luckiest Guy', 'Arial Black', sans-serif; font-size: 64px; letter-spacing: 0.25em; color: #fff3dc; text-shadow: 0 5px 0 #140b05; margin: 4px 0; }
.panel .seat { display: flex; align-items: center; gap: 12px; padding: 6px 12px; margin-top: 6px; border-radius: 14px; background: #0006; border: 3px solid transparent; }
.panel .seat img { width: 44px; height: 44px; object-fit: contain; }
.panel .seat .k { font-family: 'Luckiest Guy', 'Arial Black', sans-serif; font-size: 21px; flex: 1; }
.panel .seat .who { color: #cdb9a3; font-size: 14px; font-family: Nunito, Arial, sans-serif; }
.panel .seat button { font-size: 16px; padding: 6px 12px; }
.panel .levels { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 6px; }
.panel .levels button { font-size: 16px; padding: 8px; text-align: left; line-height: 1.15; }
.panel .world { font-family: 'Luckiest Guy', 'Arial Black', sans-serif; letter-spacing: 0.04em; color: #ffcf8a; font-size: 16px; margin-top: 10px; }
.panel .levels button small { display: block; font-family: Nunito, Arial, sans-serif; font-weight: 800; font-size: 12px; opacity: 0.8; letter-spacing: 0; }
.panel .status { margin-top: 12px; font-size: 16px; }
.panel .seat.sel { box-shadow: 0 0 0 3px #fff inset; }
.panel .seat.clickable { cursor: pointer; }
.panel .picker { display: grid; grid-template-columns: repeat(8, 1fr); gap: 6px; margin-top: 8px; }
.panel .picker button { position: relative; padding: 4px 2px 2px; border-radius: 12px; background: #0005; border: 3px solid #ffcf8a55; font-size: 11px; line-height: 1.1;
  font-family: Nunito, Arial, sans-serif; font-weight: 900; letter-spacing: 0; color: #ffe9c7; }
.panel .picker button img { width: 100%; height: 48px; object-fit: contain; display: block; }
.panel .picker button.mine { border-color: #fff; background: #ffcf8a44; }
.panel .picker button.taken { opacity: 0.45; }
.panel .picker button .who { position: absolute; top: 2px; right: 4px; font-size: 10px; }
.panel .worlds { display: grid; grid-template-columns: repeat(6, 1fr); gap: 6px; margin-top: 6px; }
.panel .worlds button { position: relative; height: 74px; color: #fff3dc; padding: 4px; border-radius: 12px; background-size: cover; background-position: center; font-size: 13px; line-height: 1.05;
  display: flex; flex-direction: column; justify-content: flex-end; text-shadow: 0 2px 0 #140b05, 0 0 6px #140b05; overflow: hidden; }
.panel .worlds button.on { box-shadow: 0 0 0 3px #fff; color: #ffe9c7; background-color: #3a1f0e; }
.panel .worlds button .st { font-family: Nunito, Arial, sans-serif; font-weight: 900; font-size: 12px; color: #ffd84a; }
.panel .worlds button:disabled { opacity: 0.55; filter: grayscale(0.8); }
.panel .worlds button .lock { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 26px; text-shadow: none; }
.panel .levels button .stars { font-size: 15px; letter-spacing: 1px; color: #ffd84a; }
.panel .levels button .stars i { font-style: normal; color: #ffffff38; }
.panel .total { color: #ffd84a; font-size: 16px; margin-left: 8px; font-family: Nunito, Arial, sans-serif; font-weight: 900; }
.panel .hats { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; align-items: center; }
.panel .hats button { width: 54px; height: 50px; padding: 2px; border-radius: 12px; background: #0005; border: 3px solid #ffcf8a55; position: relative; }
.panel .hats button img { width: 100%; height: 100%; object-fit: contain; }
.panel .hats button.on { border-color: #fff; background: #ffcf8a44; }
.panel .hats button:disabled { opacity: 0.35; }
.panel .hats button small { position: absolute; bottom: -2px; right: 2px; font-size: 10px; font-family: Nunito, Arial, sans-serif; color: #ffd84a; }
@media (max-width: 700px) { .panel .worlds { grid-template-columns: repeat(3, 1fr); } .panel .levels { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 700px) { .panel .picker { grid-template-columns: repeat(4, 1fr); } }
.panel .status.bad { color: #ff8a7a; }
.panel .title { font-size: 54px; line-height: 1; margin-bottom: 4px; }
.panel .keys { display: grid; grid-template-columns: auto 1fr; gap: 2px 14px; font-size: 15px; color: #e8d6c0; }
.panel .keys b { color: #ffcf8a; }
.panel .ver { position: absolute; right: 10px; bottom: 6px; font-size: 12px; color: #cdb9a3; }
@media (max-height: 500px) { .panel { padding: 12px 18px; } .panel h1 { font-size: 28px; } .panel .title { font-size: 38px; } .panel button { font-size: 17px; padding: 8px 14px; } .panel .code { font-size: 44px; } }
`;

let styled = false;

/** Mounts a panel; returns the root and a remover. */
export function mountPanel(id: string): HTMLElement {
  if (!styled) {
    const st = document.createElement('style');
    st.textContent = CSS;
    document.head.appendChild(st);
    styled = true;
  }
  document.getElementById(id)?.remove();
  const root = document.createElement('div');
  root.id = id;
  root.className = 'panel-wrap';
  document.body.appendChild(root);
  return root;
}

export const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

export function fmtTime(t: number): string {
  const m = Math.floor(t / 60), sec = Math.floor(t % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
}

const WORLD_BG: Record<string, string> = { 'Counter Top': 'bg-kitchen', 'The Fridge': 'bg-fridge', 'The Pantry': 'bg-pantry', 'Stove & Oven': 'bg-oven', 'The Sink': 'bg-sink', 'Dinner Service': 'bg-dining', 'The Bakery': 'bg-bakery' };
export const starsHtml = (mask: number) => [STAR_CLEAR, STAR_CLEAN, STAR_SPOON].map(b => (mask & b ? '★' : '<i>★</i>')).join('');

/** World map: a card per world (locked ones greyed out), then the chosen world's levels with their stars.
 *  Every button carries data-level, so picking a world just selects its first open level. */
export function levelGrid(selected: number, enabled = true): string {
  const cur = Math.max(0, worldOf(selected));
  const cards = WORLDS.map((wd, wi) => {
    const open = worldOpen(wi);
    const stars = wd.levels.reduce((a, i) => a + countStars(starMask(i)), 0);
    const bg = WORLD_BG[wd.name] ? `background-image:linear-gradient(#140b0533 10%, #140b05ee 85%), url(art/${WORLD_BG[wd.name]}.webp)` : '';
    const first = wd.levels.find(i => !(starMask(i) & STAR_CLEAR)) ?? wd.levels[0];
    return `<button data-level="${first}" class="${wi === cur ? 'on' : ''}" style="${bg}" ${enabled && open ? '' : 'disabled'} title="${open ? '' : `Clear ${UNLOCK_NEED} levels of ${esc(WORLDS[wi - 1]?.name ?? '')} to open`}">
      ${open ? '' : '<span class="lock">🔒</span>'}${wi + 1}. ${esc(wd.name)}<span class="st">★ ${stars}/${wd.levels.length * 3}</span></button>`;
  }).join('');
  const wd = WORLDS[cur];
  const lv = wd.levels.map(i => {
    const l = LEVELS[i], m = starMask(i), best = bestTime(i);
    return `<button data-level="${i}" class="${i === selected ? 'on' : ''}" ${enabled ? '' : 'disabled'}>${i + 1}. ${esc(l.name)}
      <small><span class="stars">${starsHtml(m)}</span>${best !== undefined ? ` · ${fmtTime(best)}` : ''}</small></button>`;
  }).join('');
  const need = cur > 0 && !worldOpen(cur) ? `<p class="muted">🔒 Clear ${UNLOCK_NEED} levels of ${esc(WORLDS[cur - 1].name)} to open this world (${clearedIn(cur - 1)}/${UNLOCK_NEED}).</p>` : '';
  return `<div class="worlds">${cards}</div><div class="world">World ${cur + 1}: ${esc(wd.name)} <span class="total">★ ${totalStars()} total</span></div>
    <p class="muted" style="margin:2px 0">★ clear it · ★ no splats · ★ find the hidden golden spoon</p>${need}<div class="levels">${lv}</div>`;
}

/** Hat choices for one kaiju (locked ones show how many stars they need). */
export function hatRow(species: number, current = hatOf(species)): string {
  const open = new Set(unlockedHats().map(h => h.id));
  const btn = (id: string, label: string, inner: string, ok: boolean, need = 0) =>
    `<button data-hat="${id}" class="${current === id ? 'on' : ''}" ${ok ? '' : 'disabled'} title="${esc(label)}${ok ? '' : ` (needs ★ ${need})`}">${inner}${ok ? '' : `<small>★${need}</small>`}</button>`;
  return `<div class="hats"><span class="muted">Hat:</span>${btn('', 'No hat', '<span style="font-size:22px">✖</span>', true)}${HATS.map(h => btn(h.id, h.name, `<img src="art/hat-${h.id}.webp" alt="">`, open.has(h.id), h.stars)).join('')}</div>`;
}

export function seatRow(species: number, name: string, mine: boolean, extra = ''): string {
  const sp = SPECIES[species];
  return `<div class="seat" style="border-color:${sp.css}">
    <img src="art/kaiju-${species}.webp" alt="">
    <div class="k" style="color:${sp.css}">${sp.full}<div class="who">${esc(name)}${extra}</div></div>
    ${mine ? `<button data-pick="-1">◀</button><button data-pick="1">▶</button>` : ''}
  </div>`;
}

/** All 16 kaiju: tap one to pick it. `taken` maps species -> label of whoever has it. */
export function kaijuGrid(mine: number, taken: Map<number, string>): string {
  return `<div class="picker">${SPECIES.map((sp, k) => {
    const who = taken.get(k);
    const border = k === mine ? `border-color:${sp.css}` : '';
    const tag = who ? `<span class="who">${esc(who)}</span>` : '';
    return `<button data-kaiju="${k}" class="${k === mine ? 'mine' : who ? 'taken' : ''}" style="${border}" title="${esc(sp.full)}">
      <img src="art/kaiju-${k}.webp" alt="">${esc(sp.full)}${tag}</button>`;
  }).join('')}</div>`;
}

/** Next kaiju index after `from` (by dir) that isn't taken. */
export function cycleSpecies(from: number, dir: number, taken: Set<number>): number {
  let p = from;
  for (let n = 0; n < SPECIES.length; n++) {
    p = (p + dir + SPECIES.length) % SPECIES.length;
    if (!taken.has(p)) return p;
  }
  return from;
}
