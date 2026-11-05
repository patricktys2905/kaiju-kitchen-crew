// Background music: original chiptune-style tunes (square-wave lead, oom-pah bass, off-beat chord
// stabs, little drums), one per world. All composed for this game; no audio files.
// Mute with M / the ♪ button (remembered between visits).
import { audioOut } from './audio';

interface Song {
  bpm: number; // in eighth-note steps per minute / 2 (i.e. a normal quarter-note tempo)
  steps: number; // steps (eighth notes) per bar: 8 = 4/4, 6 = 3/4 waltz
  swing: number;
  shift: number; // transpose (semitones)
  lead: OscillatorType;
  leadVol: number;
  bass: OscillatorType;
  chords: string[]; // one per bar
  tune: string[]; // one string per bar: tokens = note (E5, G#4), '.' hold, '-' rest
  drums: boolean;
}

const SONGS: Record<string, Song> = {
  // a cheerful title theme
  menu: {
    bpm: 128, steps: 8, swing: 0.08, shift: 7, lead: 'square', leadVol: 0.028, bass: 'triangle', drums: true,
    chords: ['C', 'Am', 'F', 'G', 'C', 'Am', 'G', 'C'],
    tune: ['G5 . E5 . C5 . E5 G5', 'A5 . . G5 E5 - - -', 'F5 . A5 . C6 . A5 F5', 'G5 . . . D5 - - -',
      'G5 . E5 . C5 . E5 G5', 'A5 . C6 . A5 G5 E5 C5', 'D5 . F5 . A5 . G5 F5', 'E5 . . . C5 - - -'],
  },
  // bouncy "overworld" tune
  'Counter Top': {
    bpm: 150, steps: 8, swing: 0.1, shift: 0, lead: 'square', leadVol: 0.028, bass: 'triangle', drums: true,
    chords: ['C', 'C', 'F', 'C', 'G7', 'G7', 'C', 'C', 'F', 'F', 'C', 'Am', 'Dm', 'G7', 'C', 'C'],
    tune: ['E5 - G5 - C6 . G5 E5', 'D5 E5 - C5 . . - -', 'F5 - A5 - C6 . A5 F5', 'G5 . E5 . C5 - - -',
      'D5 - F5 - B5 . A5 G5', 'F5 . D5 . B4 - - -', 'C5 E5 G5 C6 B5 G5 E5 D5', 'C5 . . - - - G4 -',
      'A4 C5 F5 . A5 . G5 F5', 'E5 . F5 . A5 - - -', 'G5 E5 C5 E5 G5 . C6 .', 'B5 . A5 . E5 - - -',
      'F5 - D5 - A5 . F5 D5', 'G5 . B5 . D6 . B5 G5', 'C6 - G5 - E5 - G5 -', 'C5 . . . - - - -'],
  },
  // icy music-box bells
  'The Fridge': {
    bpm: 112, steps: 8, swing: 0, shift: 5, lead: 'sine', leadVol: 0.05, bass: 'sine', drums: false,
    chords: ['C', 'Am', 'F', 'G', 'C', 'Am', 'Dm', 'G'],
    tune: ['E5 - G5 - C6 - B5 -', 'A5 . . - E5 - - -', 'F5 - A5 - C6 - D6 -', 'B5 . . - G5 - - -',
      'C6 - B5 - G5 - E5 -', 'A5 - C6 - E6 . . -', 'D6 - C6 - A5 - F5 -', 'G5 . . . . - - -'],
  },
  // swingy and playful
  'The Pantry': {
    bpm: 138, steps: 8, swing: 0.22, shift: -3, lead: 'square', leadVol: 0.026, bass: 'triangle', drums: true,
    chords: ['C', 'F', 'C', 'G', 'C', 'F', 'G', 'C'],
    tune: ['C5 C5 - E5 G5 - E5 C5', 'F5 - A5 - G5 F5 E5 D5', 'E5 E5 - G5 C6 - G5 E5', 'D5 - - B4 G4 - - -',
      'C5 C5 - E5 G5 - A5 G5', 'A5 - C6 - A5 G5 F5 A5', 'G5 - F5 - D5 - B4 D5', 'C5 - - - - - - -'],
  },
  // a driving minor-key "castle" feel
  'Stove & Oven': {
    bpm: 156, steps: 8, swing: 0, shift: 0, lead: 'square', leadVol: 0.024, bass: 'sawtooth', drums: true,
    chords: ['Am', 'Am', 'F', 'G', 'Am', 'Am', 'Dm', 'E'],
    tune: ['A4 - C5 E5 A5 - G5 E5', 'F5 - E5 - D5 - C5 -', 'F5 - A5 - C6 - A5 F5', 'G5 . . - D5 - - -',
      'A4 - C5 E5 A5 - B5 C6', 'B5 - A5 - G5 - E5 -', 'F5 - D5 - A5 - F5 D5', 'E5 - G#5 - B5 . . -'],
  },
  // a floaty waltz
  'The Sink': {
    bpm: 168, steps: 6, swing: 0, shift: 2, lead: 'triangle', leadVol: 0.05, bass: 'sine', drums: false,
    chords: ['C', 'F', 'G', 'C', 'Am', 'F', 'G', 'C'],
    tune: ['E5 . . G5 . .', 'A5 . . C6 . A5', 'G5 . . D5 . .', 'E5 . . . . -',
      'C6 . . B5 . A5', 'A5 . . F5 . .', 'G5 . A5 B5 . D6', 'C6 . . . . -'],
  },
  // jazzy swing for the restaurant
  'Dinner Service': {
    bpm: 132, steps: 8, swing: 0.25, shift: 0, lead: 'square', leadVol: 0.024, bass: 'triangle', drums: true,
    chords: ['C', 'Am7', 'Dm7', 'G7', 'C', 'A7', 'Dm7', 'G7'],
    tune: ['E5 - G5 A5 - G5 E5 -', 'C6 . . A5 - G5 - -', 'F5 - A5 C6 - A5 F5 -', 'B5 . . G5 - F5 - -',
      'E5 - G5 A5 - C6 D6 -', 'C#6 . . A5 - E5 - -', 'D6 - C6 A5 - F5 D5 -', 'G5 . . . - - - -'],
  },
};

const NOTE: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
/** "G#5" -> MIDI number */
function midi(tok: string): number {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(tok);
  if (!m) return 60;
  return 12 * (Number(m[3]) + 1) + NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
}
/** "Am7" -> root pitch class + chord tones (semitones above root) */
function chord(sym: string): { root: number; tones: number[] } {
  const m = /^([A-G])([#b]?)(m?)(7?)$/.exec(sym)!;
  const root = NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  const minor = m[3] === 'm';
  const tones = [0, minor ? 3 : 4, 7];
  if (m[4]) tones.push(minor ? 10 : 10);
  return { root, tones };
}

interface Compiled { song: Song; lead: { step: number; midi: number; len: number }[]; total: number }
const compiled = new Map<string, Compiled>();
function compile(name: string): Compiled {
  const c = compiled.get(name);
  if (c) return c;
  const song = SONGS[name];
  const toks = song.tune.flatMap(bar => bar.trim().split(/\s+/));
  const lead: Compiled['lead'] = [];
  toks.forEach((t, i) => {
    if (t === '.' || t === '-') return;
    let len = 1;
    while (toks[i + len] === '.') len++;
    lead.push({ step: i, midi: midi(t), len });
  });
  const out = { song, lead, total: song.chords.length * song.steps };
  compiled.set(name, out);
  return out;
}

let current = '';
let timer = 0;
let step = 0;
let nextTime = 0;
let bus: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;
export let musicOn = typeof localStorage !== 'undefined' ? localStorage.getItem('kkc-music') !== 'off' : true;

const hz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

function blip(ac: AudioContext, out: AudioNode, freq: number, t: number, dur: number, type: OscillatorType, vol: number, vibrato = 0): void {
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (vibrato && dur > 0.25) {
    const lfo = ac.createOscillator(), lg = ac.createGain();
    lfo.frequency.value = 6; lg.gain.value = freq * vibrato;
    lfo.connect(lg).connect(o.frequency);
    lfo.start(t + 0.12); lfo.stop(t + dur + 0.05);
  }
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.setValueAtTime(vol, t + Math.max(0.02, dur * 0.7));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(out);
  o.start(t);
  o.stop(t + dur + 0.05);
}

function hat(ac: AudioContext, out: AudioNode, t: number, vol: number, len: number, freq: number): void {
  if (!noiseBuf) {
    noiseBuf = ac.createBuffer(1, ac.sampleRate * 0.3, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
  s.buffer = noiseBuf;
  f.type = 'highpass'; f.frequency.value = freq;
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  s.connect(f).connect(g).connect(out);
  s.start(t); s.stop(t + len + 0.02);
}

function tick(): void {
  const a = audioOut();
  if (!a || !SONGS[current] || !musicOn) return;
  const { song: s, lead, total } = compile(current);
  if (!bus) { bus = a.ac.createGain(); bus.gain.value = 0.85; bus.connect(a.master); }
  const eighth = 60 / s.bpm / 2;
  if (nextTime < a.ac.currentTime) nextTime = a.ac.currentTime + 0.05;
  while (nextTime < a.ac.currentTime + 0.3) {
    const i = step % total, inBar = i % s.steps, bar = Math.floor(i / s.steps);
    const t = nextTime + (inBar % 2 ? s.swing * eighth : 0);
    const ch = chord(s.chords[bar]);
    const base = 36 + ch.root + s.shift; // bass octave
    // oom-pah bass (waltz: oom-pah-pah)
    if (s.steps === 6) {
      if (inBar === 0) blip(a.ac, bus, hz(base), t, eighth * 1.6, s.bass, 0.1);
      if (inBar === 2 || inBar === 4) for (const k of ch.tones) blip(a.ac, bus, hz(base + 24 + k), t, eighth * 0.6, 'triangle', 0.018);
    } else {
      if (inBar === 0 || inBar === 4) blip(a.ac, bus, hz(base), t, eighth * 0.9, s.bass, 0.1);
      if (inBar === 2 || inBar === 6) blip(a.ac, bus, hz(base + 7), t, eighth * 0.8, s.bass, 0.08);
      // off-beat chord stabs
      if (inBar % 2 === 1) for (const k of ch.tones) blip(a.ac, bus, hz(base + 24 + k), t, eighth * 0.45, 'square', 0.009);
    }
    // the tune
    for (const n of lead) if (n.step === i) blip(a.ac, bus, hz(n.midi + s.shift), t, eighth * n.len * 0.92, s.lead, s.leadVol, n.len > 2 ? 0.012 : 0);
    // little drums: ticks every step, a snappy "snare" on 2 and 4
    if (s.drums) {
      hat(a.ac, bus, t, inBar % 2 ? 0.012 : 0.02, 0.03, 7000);
      if (inBar === 2 || inBar === 6) hat(a.ac, bus, t, 0.05, 0.09, 1800);
    }
    nextTime += eighth;
    step++;
  }
}

/** Switch to a world's tune ('menu' for the menus). Safe to call every scene start. */
export function playMusic(song: string): void {
  const next = SONGS[song] ? song : 'Counter Top';
  if (next === current) return;
  current = next;
  step = 0;
  if (!timer && typeof window !== 'undefined') timer = window.setInterval(tick, 90);
}

export function toggleMusic(): boolean {
  musicOn = !musicOn;
  localStorage.setItem('kkc-music', musicOn ? 'on' : 'off');
  const a = audioOut();
  if (bus && a) bus.gain.setTargetAtTime(musicOn ? 0.85 : 0, a.ac.currentTime, 0.05);
  return musicOn;
}

/** For tests: every tune parses, and each bar has the right number of steps. */
export function checkSongs(): string[] {
  const errors: string[] = [];
  for (const [name, s] of Object.entries(SONGS)) {
    if (s.tune.length !== s.chords.length) errors.push(`${name}: ${s.tune.length} tune bars vs ${s.chords.length} chords`);
    s.tune.forEach((bar, b) => {
      const toks = bar.trim().split(/\s+/);
      if (toks.length !== s.steps) errors.push(`${name} bar ${b + 1}: ${toks.length} steps (want ${s.steps})`);
      for (const t of toks) if (t !== '.' && t !== '-' && !/^[A-G][#b]?-?\d$/.test(t)) errors.push(`${name} bar ${b + 1}: bad note ${t}`);
    });
    for (const c of s.chords) if (!/^[A-G][#b]?m?7?$/.test(c)) errors.push(`${name}: bad chord ${c}`);
  }
  return errors;
}
