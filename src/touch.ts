// On-screen touch controls: an HTML overlay above the canvas, so buttons stay thumb-sized at any scale.
// Left thumb: one wide pad (left half = ◀, right half = ▶, slide between). Right thumb: JUMP + GRAB.

export const isTouchDevice =
  new URLSearchParams(location.search).has('touch') || 'ontouchstart' in window || navigator.maxTouchPoints > 0;

export type TouchMode = 'off' | 'game' | 'end';

let mx = 0;
const held = { jump: false, grab: false, swap: false };
const latched = { jump: false, grab: false, swap: false };
let inject: (code: string) => void = () => {};
let layers: Record<Exclude<TouchMode, 'off'>, HTMLElement> | null = null;
let mode: TouchMode = 'off';

export interface TouchRead { mx: number; jump: boolean; grab: boolean; swap: boolean }

export function readTouch(): TouchRead {
  const out = { mx, jump: held.jump || latched.jump, grab: held.grab || latched.grab, swap: held.swap || latched.swap };
  latched.jump = latched.grab = latched.swap = false;
  return out;
}

const CSS = `
#tc { position: fixed; inset: 0; pointer-events: none; z-index: 10; font-family: 'Luckiest Guy', 'Arial Black', Impact, sans-serif; letter-spacing: 0.04em; }
#tc .layer { position: absolute; inset: 0; display: none; }
#tc .layer.on { display: block; }
#tc .btn { position: absolute; pointer-events: auto; border-radius: 50%; display: flex; align-items: center; justify-content: center;
  color: #fff; text-shadow: 0 2px 0 #0008; border: 3px solid #fff6; background: #0005; touch-action: none; box-sizing: border-box; user-select: none; -webkit-user-select: none; }
#tc .btn.down { background: #fff4; transform: scale(0.94); }
#tc #t-pad { left: calc(2vmin + env(safe-area-inset-left)); bottom: 3vmin; width: 40vmin; height: 20vmin; border-radius: 10vmin; display: flex; padding: 0 3vmin;
  justify-content: space-between; font-size: 7vmin; }
#tc #t-pad span { opacity: 0.85; }
#tc #t-pad.l span:first-child, #tc #t-pad.r span:last-child { color: #ffcf8a; transform: scale(1.2); }
#tc #t-jump { width: 22vmin; height: 22vmin; right: calc(3vmin + env(safe-area-inset-right)); bottom: 4vmin; font-size: 4vmin; border-color: #ffcf8a; background: #ff9a3c55; }
#tc #t-grab { width: 15vmin; height: 15vmin; right: calc(27vmin + env(safe-area-inset-right)); bottom: 3vmin; font-size: 3vmin; border-color: #9fe0ff; background: #4fd1ff44; }
#tc #t-swap { width: 12vmin; height: 12vmin; right: calc(7vmin + env(safe-area-inset-right)); bottom: 29vmin; font-size: 2.4vmin; }
#tc #t-swap.hide { display: none; }
#tc .small { position: absolute; pointer-events: auto; top: calc(1.5vmin + env(safe-area-inset-top)); padding: 1.2vmin 2vmin; border-radius: 1.5vmin; background: #2a1408cc; color: #ffe9c7;
  border: 2px solid #ffcf8a; font-size: 2.6vmin; touch-action: none; }
#tc .row { position: absolute; left: 0; right: 0; bottom: calc(3vmin + env(safe-area-inset-bottom)); display: flex; justify-content: center; gap: 2vmin; }
#tc .row .pill { pointer-events: auto; padding: 2vmin 3vmin; border-radius: 2vmin; background: #2a1408e6; color: #ffe9c7; border: 3px solid #ffcf8a; font-size: 3vmin; touch-action: none; }
#tc .row .pill.go { background: #ff9a3c; color: #2a1408; }
#tc .small.hide { display: none; }
#fs-guide { position: fixed; inset: 0; z-index: 30; background: #140e0aee; color: #ffe9c7; display: none; align-items: center; justify-content: center; font-family: Nunito, Arial, sans-serif; font-weight: 800; }
#fs-guide.on { display: flex; }
#fs-guide .card { max-width: 80vw; background: #2a1408; border: 3px solid #ffcf8a; border-radius: 3vmin; padding: 3vmin 4vmin; font-size: 3.2vmin; line-height: 1.45; }
#fs-guide h2 { font-family: 'Luckiest Guy', 'Arial Black', sans-serif; font-weight: 400; letter-spacing: 0.04em; margin: 0 0 1vmin; font-size: 5vmin; color: #ffb347; }
#fs-guide .ok { display: inline-block; padding: 1.4vmin 4vmin; border-radius: 2vmin; background: #ff9a3c; color: #2a1408; font-family: 'Luckiest Guy', sans-serif; font-size: 3.4vmin; }
#tc-rotate { position: fixed; inset: 0; z-index: 20; background: #140e0a; color: #ffe9c7; display: none; align-items: center; justify-content: center;
  flex-direction: column; font-family: 'Luckiest Guy', 'Arial Black', Impact, sans-serif; letter-spacing: 0.04em; font-size: 6vw; text-align: center; gap: 4vw; }
@media (orientation: portrait) { body.touch #tc-rotate { display: flex; } }
`;

function hold(el: HTMLElement, onDown: () => void, onUp: () => void): void {
  const ids = new Set<number>();
  el.addEventListener('pointerdown', e => { e.preventDefault(); ids.add(e.pointerId); el.setPointerCapture?.(e.pointerId); el.classList.add('down'); onDown(); });
  const up = (e: PointerEvent) => { ids.delete(e.pointerId); if (!ids.size) { el.classList.remove('down'); onUp(); } };
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', up);
  el.addEventListener('lostpointercapture', up);
}

function tapBtn(el: HTMLElement, code: string): void {
  el.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); inject(code); });
}

export function initTouch(injectFn: (code: string) => void): void {
  inject = injectFn;
  if (isTouchDevice) document.body.classList.add('touch');
  const st = document.createElement('style');
  st.textContent = CSS;
  document.head.appendChild(st);
  const root = document.createElement('div');
  root.id = 'tc';
  root.innerHTML = `
    <div class="layer" id="tl-game">
      <div class="btn" id="t-pad"><span>◀</span><span>▶</span></div>
      <div class="btn" id="t-grab">GRAB</div>
      <div class="btn" id="t-jump">JUMP</div>
      <div class="btn" id="t-swap">SWAP</div>
      <div class="small" id="t-retry" style="left: calc(1.5vmin + env(safe-area-inset-left))">⟲ RETRY</div>
      <div class="small" id="t-menu" style="right: calc(1.5vmin + env(safe-area-inset-right))">✕ MENU</div>
      <div class="small" id="t-fs" style="right: calc(17vmin + env(safe-area-inset-right))">⛶ FULL</div>
    </div>
    <div class="layer" id="tl-end">
      <div class="row"><div class="pill go" id="t-next">NEXT LEVEL ▶</div><div class="pill" id="t-replay">⟲ REPLAY</div><div class="pill" id="t-emenu">MENU</div></div>
    </div>`;
  document.body.appendChild(root);
  const rot = document.createElement('div');
  rot.id = 'tc-rotate';
  rot.innerHTML = '<div style="font-size:16vw">⟳</div><div>Turn your phone sideways</div>';
  document.body.appendChild(rot);

  const $ = (id: string) => root.querySelector<HTMLElement>('#' + id)!;
  layers = { game: $('tl-game'), end: $('tl-end') };

  // movement pad: direction follows the finger
  const pad = $('t-pad');
  const fingers = new Map<number, number>();
  const recompute = () => {
    const vals = [...fingers.values()];
    mx = vals.length ? Math.sign(vals[vals.length - 1]) : 0;
    pad.classList.toggle('l', mx < 0);
    pad.classList.toggle('r', mx > 0);
  };
  const dirOf = (e: PointerEvent) => { const r = pad.getBoundingClientRect(); return e.clientX < r.left + r.width / 2 ? -1 : 1; };
  pad.addEventListener('pointerdown', e => { e.preventDefault(); pad.setPointerCapture?.(e.pointerId); fingers.set(e.pointerId, dirOf(e)); recompute(); });
  pad.addEventListener('pointermove', e => { if (fingers.has(e.pointerId)) { fingers.set(e.pointerId, dirOf(e)); recompute(); } });
  const lift = (e: PointerEvent) => { fingers.delete(e.pointerId); recompute(); };
  pad.addEventListener('pointerup', lift);
  pad.addEventListener('pointercancel', lift);
  pad.addEventListener('lostpointercapture', lift);

  for (const b of ['jump', 'grab', 'swap'] as const) hold($('t-' + b), () => { held[b] = true; latched[b] = true; }, () => { held[b] = false; });
  tapBtn($('t-retry'), 'KeyR');
  tapBtn($('t-menu'), 'Escape');
  // full screen must be requested inside the tap itself
  const fs = $('t-fs');
  fs.addEventListener('pointerup', e => { e.preventDefault(); e.stopPropagation(); toggleFullscreen(); });
  fs.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); });
  const syncFs = () => { fs.textContent = isFullscreen() ? '⛶ EXIT FULL' : '⛶ FULL'; fs.classList.toggle('hide', isInstalledApp() && !isFullscreen()); };
  document.addEventListener('fullscreenchange', syncFs);
  document.addEventListener('webkitfullscreenchange', syncFs);
  syncFs();
  tapBtn($('t-next'), 'KeyN');
  tapBtn($('t-replay'), 'KeyR');
  tapBtn($('t-emenu'), 'Escape');
}

/** Which controls to show. `opts` hides buttons that do nothing right now. */
export function setTouchMode(m: TouchMode, opts: { swap?: boolean; host?: boolean } = {}): void {
  if (!layers) return;
  if (!isTouchDevice) m = 'off';
  mode = m;
  layers.game.classList.toggle('on', m === 'game');
  layers.end.classList.toggle('on', m === 'end');
  document.getElementById('t-swap')?.classList.toggle('hide', !opts.swap);
  const hostOnly = opts.host !== false;
  for (const id of ['t-retry', 't-next', 't-replay']) {
    const el = document.getElementById(id);
    if (el) el.style.display = hostOnly ? '' : 'none';
  }
  if (m !== 'game') { mx = 0; held.jump = held.grab = held.swap = false; }
}

export function touchMode(): TouchMode {
  return mode;
}

type FsDoc = Document & { webkitFullscreenElement?: Element; webkitExitFullscreen?: () => void; webkitFullscreenEnabled?: boolean };
type FsEl = HTMLElement & { webkitRequestFullscreen?: () => void };

/** Already running as an installed app (it is full screen by itself). */
export function isInstalledApp(): boolean {
  return matchMedia('(display-mode: fullscreen)').matches || matchMedia('(display-mode: standalone)').matches
    || (navigator as unknown as { standalone?: boolean }).standalone === true;
}
export function isFullscreen(): boolean {
  const d = document as FsDoc;
  return !!(document.fullscreenElement || d.webkitFullscreenElement);
}
function canFullscreen(): boolean {
  const d = document as FsDoc;
  return !!(document.fullscreenEnabled || d.webkitFullscreenEnabled);
}

/** Best-effort full screen + landscape lock. Where pages can't go full screen (iPhone), shows how to install. */
export function goFullscreen(): void {
  if (!canFullscreen()) { showFsGuide(); return; }
  const el = document.documentElement as FsEl;
  try {
    const p = el.requestFullscreen ? el.requestFullscreen({ navigationUI: 'hide' }) : (el.webkitRequestFullscreen?.(), undefined);
    void p?.then(() => (screen.orientation as unknown as { lock?: (o: string) => Promise<void> }).lock?.('landscape').catch(() => {})).catch(() => showFsGuide());
  } catch { showFsGuide(); }
}

export function exitFullscreen(): void {
  const d = document as FsDoc;
  try { if (document.exitFullscreen) void document.exitFullscreen().catch(() => {}); else d.webkitExitFullscreen?.(); } catch { /* ignore */ }
}

/** Switch full screen on/off (works mid-game). */
export function toggleFullscreen(): void {
  if (isFullscreen()) exitFullscreen(); else goFullscreen();
}

function showFsGuide(): void {
  let g = document.getElementById('fs-guide');
  if (!g) {
    g = document.createElement('div');
    g.id = 'fs-guide';
    g.innerHTML = `<div class="card"><h2>Full screen</h2>
      <p>This browser can't make a web page full screen. Install the game instead, and it opens full screen like an app:</p>
      <ol><li><b>iPhone / iPad (Safari):</b> tap Share <span style="font-size:1.2em">⎋</span> → <b>Add to Home Screen</b>.</li>
      <li><b>Android (Chrome):</b> tap ⋮ → <b>Install app</b> / Add to Home screen.</li></ol>
      <p>Then open Kaiju Kitchen Crew from your home screen.</p><div class="ok">OK</div></div>`;
    document.body.appendChild(g);
    g.addEventListener('pointerdown', e => { e.preventDefault(); g!.classList.remove('on'); });
  }
  g.classList.add('on');
}
