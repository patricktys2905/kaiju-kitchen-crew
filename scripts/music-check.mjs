// Checks the music engine really makes sound in a browser: measures the output level for each world's tune.
import { spawn } from 'node:child_process';
import { chromium } from 'playwright-core';
const PORT = 5302, url = `http://localhost:${PORT}/`;
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'pipe' });
const wait = ms => new Promise(r => setTimeout(r, ms));
await wait(2500);
const b = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
const p = await (await b.newContext()).newPage();
const errs = []; p.on('pageerror', e => errs.push(String(e)));
await p.addInitScript(() => {
  const orig = AudioNode.prototype.connect;
  AudioNode.prototype.connect = function (dest, ...rest) {
    if (dest instanceof AudioDestinationNode) { const an = this.context.createAnalyser(); an.fftSize = 2048; orig.call(this, an); (window.__ans ||= []).push(an); window.__an = an; }
    return orig.call(this, dest, ...rest);
  };
});
await p.goto(url);
for (let i = 0; i < 60; i++) { if (await p.evaluate(() => window.__game?.scene.isActive('menu')).catch(() => false)) break; await wait(250); }
await p.keyboard.press('KeyA'); // first gesture unlocks audio

const worlds = ['Counter Top', 'The Fridge', 'The Pantry', 'Stove & Oven', 'The Sink', 'Dinner Service'];
for (const [i, lv] of [0, 6, 12, 18, 24, 30].entries()) {
  await p.evaluate(n => { const m = window.__game.scene.getScene('menu'); m.scene.start('game', { mode: 'local', species: [0, 9], level: n }); }, lv);
  await wait(1800);
  const level = await p.evaluate(async () => {
    if (!window.__ans) return -1;
    let peak = 0;
    for (let k = 0; k < 20; k++) { for (const an of window.__ans) { const d = new Float32Array(an.fftSize); an.getFloatTimeDomainData(d); for (const v of d) peak = Math.max(peak, Math.abs(v)); } await new Promise(r => setTimeout(r, 50)); }
    return peak;
  });
  const st = await p.evaluate(async () => { const c = window.__an?.context; const t0 = c?.currentTime; await new Promise(r => setTimeout(r, 300)); return (c ? c.state + ' t ' + t0.toFixed(2) + '->' + c.currentTime.toFixed(2) : 'no ctx'); });
  console.log(worlds[i].padEnd(15), 'peak output', level.toFixed(3), st);
  await p.evaluate(() => { const g = window.__game.scene.getScene('game'); g.scene.start('menu'); });
  await wait(300);
}
console.log('errors:', errs);
await b.close(); server.kill();
