// Close-up screenshots of props in several levels (camera parked at given x). Usage: node scripts/prop-shots.mjs
import { spawn } from 'node:child_process';
import { chromium } from 'playwright-core';
const PORT = 5299, url = `http://localhost:${PORT}/`;
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'pipe' });
const wait = ms => new Promise(r => setTimeout(r, ms));
await wait(2500);
const b = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
const p = await (await b.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1.5 })).newPage();
await p.goto(url);
for (let i = 0; i < 60; i++) { if (await p.evaluate(() => window.__game?.scene.isActive('menu')).catch(() => false)) break; await wait(250); }
await p.locator('button[data-act="local"]').click();
await p.getByText('Start cooking').click();
await wait(1000);
// [level, team x tile, name, open door?]
const spots = [[24, 12, 'bath'], [25, 6, 'bubbles'], [26, 22, 'tapjet'], [30, 9, 'hand'], [31, 12, 'balance'], [32, 20, 'belts']];
for (const [lv, tx, name] of spots) {
  await p.evaluate(n => { const s = window.__game.scene.getScene('game'); s.scene.restart({ ...s.d, level: n }); }, lv);
  await wait(800);
  await p.evaluate(tx => { const s = window.__game.scene.getScene('game'); s.introT = 0; s.world.players.forEach((q, i) => { q.x = tx * 40 + i * 40; q.y = 16 * 40 - q.h - 1; }); }, tx);
  await wait(3600);
  await p.screenshot({ path: `shots/prop-${name}.png` });
}
await b.close(); server.kill();
