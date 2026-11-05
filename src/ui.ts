// HTML panels (menu, local setup, online lobby). HTML so typing and tapping work the same on phones
// and computers, and text stays crisp at any screen size.
import { SPECIES } from './sim/constants';
import { LEVELS } from './sim/levels';

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
.panel .levels button small { display: block; font-family: Nunito, Arial, sans-serif; font-weight: 800; font-size: 12px; opacity: 0.8; letter-spacing: 0; }
.panel .status { margin-top: 12px; font-size: 16px; }
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

// ------------------------------------------------------------------ progress
const KEY = 'kkc-progress';
export function loadProgress(): Record<number, number> {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<number, number>; } catch { return {}; }
}
export function saveClear(level: number, time: number): boolean {
  const p = loadProgress();
  const best = p[level] === undefined || time < p[level];
  if (best) { p[level] = Math.round(time * 10) / 10; localStorage.setItem(KEY, JSON.stringify(p)); }
  return best;
}
export function fmtTime(t: number): string {
  const m = Math.floor(t / 60), s = Math.floor(t % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function levelGrid(selected: number, enabled = true): string {
  const prog = loadProgress();
  return `<div class="levels">${LEVELS.map((l, i) => `<button data-level="${i}" class="${i === selected ? 'on' : ''}" ${enabled ? '' : 'disabled'}>
    ${i + 1}. ${esc(l.name)}<small>${prog[i] !== undefined ? `✓ best ${fmtTime(prog[i])}` : esc(l.world)}</small></button>`).join('')}</div>`;
}

export function seatRow(species: number, name: string, mine: boolean, extra = ''): string {
  const sp = SPECIES[species];
  return `<div class="seat" style="border-color:${sp.css}">
    <img src="art/kaiju-${species}.webp" alt="">
    <div class="k" style="color:${sp.css}">${sp.full}<div class="who">${esc(name)}${extra}</div></div>
    ${mine ? `<button data-pick="-1">◀</button><button data-pick="1">▶</button>` : ''}
  </div>`;
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
