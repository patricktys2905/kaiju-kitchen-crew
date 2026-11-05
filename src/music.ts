// Background music: a tiny looping synth band (bass, chords, a bouncy melody). Each world has its own
// key, tempo and sound. No audio files. Mute with M / the ♪ button (remembered between visits).
import { audioOut } from './audio';

interface Song { bpm: number; root: number; minor: boolean; prog: number[]; lead: OscillatorType; bass: OscillatorType; swing: number; tune: number[] }

// prog = chord roots (scale degrees) per bar; tune = 16 eighth-note scale degrees (-1 = rest)
const SONGS: Record<string, Song> = {
  menu: { bpm: 104, root: 60, minor: false, prog: [0, 5, 3, 4], lead: 'triangle', bass: 'sine', swing: 0.1, tune: [4, -1, 2, 4, 5, -1, 4, 2, 0, -1, 2, -1, 4, 2, 1, -1] },
  'Counter Top': { bpm: 118, root: 62, minor: false, prog: [0, 3, 4, 3], lead: 'triangle', bass: 'triangle', swing: 0.12, tune: [0, 2, 4, -1, 4, 5, 4, 2, 7, -1, 5, 4, 2, -1, 1, -1] },
  'The Fridge': { bpm: 96, root: 64, minor: true, prog: [0, 5, 3, 6], lead: 'sine', bass: 'sine', swing: 0, tune: [4, -1, 7, -1, 6, 4, -1, 2, 4, -1, 2, 1, 0, -1, -1, -1] },
  'The Pantry': { bpm: 110, root: 57, minor: false, prog: [0, 4, 5, 3], lead: 'square', bass: 'triangle', swing: 0.15, tune: [0, -1, 0, 2, 4, -1, 2, 0, 5, -1, 4, -1, 2, 1, 2, -1] },
  'Stove & Oven': { bpm: 132, root: 59, minor: true, prog: [0, 0, 5, 4], lead: 'sawtooth', bass: 'square', swing: 0, tune: [0, 2, 3, -1, 4, -1, 3, 2, 0, -1, 4, 3, 2, -1, 0, -1] },
  'The Sink': { bpm: 100, root: 65, minor: false, prog: [0, 3, 5, 4], lead: 'sine', bass: 'triangle', swing: 0.08, tune: [4, 5, 4, -1, 2, -1, 0, -1, 2, 4, 5, 7, 5, -1, 4, -1] },
  'Dinner Service': { bpm: 124, root: 60, minor: false, prog: [0, 5, 1, 4], lead: 'triangle', bass: 'sawtooth', swing: 0.18, tune: [7, -1, 5, 4, 5, -1, 4, 2, 4, 2, 0, -1, 2, -1, 4, -1] },
};
const MAJOR = [0, 2, 4, 5, 7, 9, 11], MINOR = [0, 2, 3, 5, 7, 8, 10];

let current = '';
let timer = 0;
let step = 0;
let nextTime = 0;
let bus: GainNode | null = null;
export let musicOn = typeof localStorage !== 'undefined' ? localStorage.getItem('kkc-music') !== 'off' : true;

const hz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);
function note(s: Song, degree: number, octave = 0): number {
  const sc = s.minor ? MINOR : MAJOR;
  const d = ((degree % 7) + 7) % 7, o = Math.floor(degree / 7);
  return s.root + sc[d] + 12 * (o + octave);
}

function play(ac: AudioContext, out: AudioNode, freq: number, t: number, dur: number, type: OscillatorType, vol: number): void {
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(out);
  o.start(t);
  o.stop(t + dur + 0.05);
}

function tick(): void {
  const a = audioOut();
  const s = SONGS[current];
  if (!a || !s || !musicOn) return;
  if (!bus) { bus = a.ac.createGain(); bus.gain.value = 0.55; bus.connect(a.master); }
  const eighth = 60 / s.bpm / 2;
  if (nextTime < a.ac.currentTime) nextTime = a.ac.currentTime + 0.05;
  while (nextTime < a.ac.currentTime + 0.3) {
    const i = step % 16, bar = Math.floor(step / 8) % s.prog.length;
    const chord = s.prog[bar];
    const t = nextTime + (i % 2 ? s.swing * eighth : 0);
    if (i % 4 === 0) play(a.ac, bus, hz(note(s, chord, -2)), t, eighth * 1.8, s.bass, 0.09);
    if (i % 4 === 2) play(a.ac, bus, hz(note(s, chord + 4, -2)), t, eighth * 0.9, s.bass, 0.05);
    if (i % 8 === 0) for (const d of [0, 2, 4]) play(a.ac, bus, hz(note(s, chord + d, -1)), t, eighth * 3, 'sine', 0.025);
    const m = s.tune[(i + (bar % 2) * 3) % 16];
    if (m >= 0) play(a.ac, bus, hz(note(s, chord + m)), t, eighth * 0.85, s.lead, s.lead === 'sawtooth' || s.lead === 'square' ? 0.018 : 0.035);
    nextTime += eighth;
    step++;
  }
}

/** Switch to a world's tune ('menu' for the menus). Safe to call every scene start. */
export function playMusic(song: string): void {
  if (song === current) return;
  current = SONGS[song] ? song : 'Counter Top';
  step = 0;
  if (!timer && typeof window !== 'undefined') timer = window.setInterval(tick, 90);
}

export function toggleMusic(): boolean {
  musicOn = !musicOn;
  localStorage.setItem('kkc-music', musicOn ? 'on' : 'off');
  if (bus && audioOut()) bus.gain.setTargetAtTime(musicOn ? 0.55 : 0, audioOut()!.ac.currentTime, 0.05);
  return musicOn;
}
