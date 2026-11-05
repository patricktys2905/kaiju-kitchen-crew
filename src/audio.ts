// Tiny synth sound effects: no audio files needed.
let ac: AudioContext | null = null;
let master: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;

/** The shared audio output (null until the first tap/keypress unlocks audio). */
export function audioOut(): { ac: AudioContext; master: GainNode } | null {
  return ac && master ? { ac, master } : null;
}

export function unlockAudio(): void {
  if (ac) {
    if (ac.state === 'suspended') void ac.resume();
    return;
  }
  try {
    ac = new AudioContext();
    master = ac.createGain();
    master.gain.value = 0.7;
    master.connect(ac.destination);
    const n = ac.sampleRate;
    noiseBuf = ac.createBuffer(1, n, ac.sampleRate);
    const ch = noiseBuf.getChannelData(0);
    for (let i = 0; i < n; i++) ch[i] = Math.random() * 2 - 1;
  } catch {
    ac = null;
  }
}

function tone(freq: number, dur: number, type: OscillatorType = 'square', vol = 0.06, slide = 0, delay = 0): void {
  if (!ac || !master) return;
  const t = ac.currentTime + delay;
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noise(dur: number, vol = 0.15, filter = 2000, delay = 0): void {
  if (!ac || !master || !noiseBuf) return;
  const t = ac.currentTime + delay;
  const s = ac.createBufferSource(), g = ac.createGain(), f = ac.createBiquadFilter();
  s.buffer = noiseBuf;
  f.type = 'lowpass';
  f.frequency.value = filter;
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f).connect(g).connect(master);
  s.start(t, Math.random() * 0.5);
  s.stop(t + dur + 0.02);
}

export const sfx = {
  ui: () => tone(660, 0.06, 'triangle', 0.05),
  join: (i: number) => tone(440 + i * 110, 0.12, 'triangle', 0.07),
  leave: () => tone(300, 0.1, 'triangle', 0.05, -120),
  jump: () => tone(330, 0.12, 'square', 0.035, 380),
  land: () => { tone(110, 0.08, 'sine', 0.08, -40); noise(0.05, 0.05, 900); },
  pickup: () => { tone(880, 0.06, 'triangle', 0.05); tone(1320, 0.08, 'triangle', 0.05, 0, 0.05); },
  throw: () => { noise(0.1, 0.06, 3500); tone(500, 0.1, 'triangle', 0.04, 300); },
  catch: () => { tone(1200, 0.05, 'square', 0.04); tone(1800, 0.1, 'triangle', 0.05, 0, 0.04); },
  lever: () => { tone(1500, 0.03, 'square', 0.05); tone(700, 0.06, 'square', 0.05, 0, 0.04); },
  scaleOn: () => { tone(988, 0.1, 'triangle', 0.06); tone(1319, 0.14, 'triangle', 0.06, 0, 0.09); },
  scaleOff: () => tone(500, 0.18, 'triangle', 0.05, -200),
  tick: () => tone(2000, 0.02, 'square', 0.025),
  door: () => { noise(0.3, 0.06, 700); tone(160, 0.3, 'sine', 0.05, 80); },
  toast: () => { tone(900, 0.05, 'square', 0.06); tone(300, 0.2, 'triangle', 0.09, 900); noise(0.12, 0.1, 3000); },
  good: () => { tone(523, 0.09, 'triangle', 0.07); tone(784, 0.14, 'triangle', 0.07, 0, 0.08); noise(0.25, 0.04, 1200, 0.02); },
  wrong: () => { tone(200, 0.12, 'square', 0.06, -60); tone(150, 0.2, 'square', 0.05, -40, 0.1); },
  burn: () => { noise(0.4, 0.1, 2500); tone(400, 0.3, 'sawtooth', 0.03, -250); },
  recipeDone: () => { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.14, 'triangle', 0.07, 0, i * 0.08)); },
  splat: () => { noise(0.3, 0.18, 1400); tone(240, 0.35, 'square', 0.07, -200); },
  respawn: () => tone(500, 0.2, 'sine', 0.05, 500),
  check: () => { tone(784, 0.08, 'triangle', 0.06); tone(1175, 0.16, 'triangle', 0.06, 0, 0.07); },
  burnerHot: () => noise(0.5, 0.05, 1600),
  grow: () => { tone(160, 0.35, 'square', 0.06, -60); tone(110, 0.4, 'sine', 0.1, -30, 0.05); },
  shrink: () => tone(700, 0.3, 'sine', 0.06, 600),
  spicy: () => { noise(0.4, 0.12, 2500); tone(300, 0.3, 'sawtooth', 0.04, 500); },
  fizz: () => { noise(0.35, 0.06, 6000); tone(1400, 0.2, 'sine', 0.03, 600); },
  fizzJump: () => { noise(0.3, 0.1, 5000); tone(400, 0.35, 'triangle', 0.07, 900); },
  bounce: () => tone(200, 0.18, 'sine', 0.09, 420),
  melt: () => { noise(0.6, 0.1, 1200); tone(900, 0.4, 'sine', 0.04, -600); },
  smash: () => { noise(0.35, 0.2, 2200); tone(140, 0.2, 'square', 0.08, -60); },
  board: () => { tone(220, 0.08, 'square', 0.06); tone(330, 0.1, 'square', 0.05, 0, 0.07); noise(0.1, 0.05, 2000, 0.05); },
  exit: () => tone(500, 0.12, 'triangle', 0.05, -200),
  robotJump: () => { noise(0.25, 0.1, 900); tone(120, 0.3, 'square', 0.07, 160); },
  robotLand: () => { tone(70, 0.3, 'square', 0.12, -30); noise(0.2, 0.14, 600); },
  ticket: () => { [1200, 900, 1200, 1500].forEach((f, i) => tone(f, 0.06, 'square', 0.04, 0, i * 0.07)); noise(0.3, 0.05, 6000, 0.3); },
  ticketEnd: () => tone(700, 0.2, 'triangle', 0.05, -300),
  drip: () => { tone(500, 0.2, 'sine', 0.05, -300); noise(0.15, 0.05, 900); },
  handWarn: () => { tone(160, 0.5, 'sawtooth', 0.05, 80); tone(160, 0.5, 'sawtooth', 0.04, 80, 0.6); },
  handSlam: () => { tone(55, 0.4, 'square', 0.18, -20); noise(0.35, 0.22, 700); },
  pop: () => { tone(1400, 0.05, 'sine', 0.05, -800); noise(0.04, 0.05, 6000); },
  swim: () => { noise(0.15, 0.06, 1500); tone(300, 0.12, 'sine', 0.03, 200); },
  clear: () => { [523, 659, 784, 1046, 784, 1046, 1318].forEach((f, i) => tone(f, 0.2, 'triangle', 0.07, 0, i * 0.11)); },
};
