// Screenshots of the world map, hat picker and a hatted crew in game (desktop size).
import { spawn } from 'node:child_process';
import { chromium } from 'playwright-core';
const PORT = 5302, url = `http://localhost:${PORT}/`;
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'pipe' });
const wait = ms => new Promise(r => setTimeout(r, ms));
await wait(2500);
const b = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
const p = await (await b.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 })).newPage();
const errs = []; p.on('pageerror', e => errs.push(String(e)));
await p.goto(url);
// a save with some progress: World 1 cleared with a few stars, so World 2 is open and some hats are unlocked
await p.evaluate(() => localStorage.setItem('kkc-save', JSON.stringify({ best: { 0: 41, 1: 63, 2: 80, 3: 52, 4: 95 }, stars: { 0: 1, 1: 3, 2: 1, 3: 5, 4: 3, 6: 1 }, hats: { 0: 'party', 9: 'beanie', 2: 'flower' } })));
await p.reload();
for (let i = 0; i < 60; i++) { if (await p.evaluate(() => window.__game?.scene.isActive('menu')).catch(() => false)) break; await wait(250); }
await p.locator('button[data-act="local"]').click();
await p.locator('button[data-count="3"]').click();
await wait(400);
await p.screenshot({ path: 'shots/rewards-setup.png', fullPage: false });
await p.locator('.panel').evaluate(e => e.scrollTo(0, 9999));
await wait(300);
await p.screenshot({ path: 'shots/rewards-map.png' });
await p.locator('button[data-act="start"]').click();
await wait(4500);
await p.screenshot({ path: 'shots/rewards-game.png' });
// force a clean clear with the spoon (level 6 not cleared yet, so it opens up the stars + maybe a hat)
await p.evaluate(() => { const g = window.__game.scene.getScene('game'); g.world.spoonGot = true; g.world.phase = 'clear'; g.world.phaseT = 0; });
await wait(1200);
await p.screenshot({ path: 'shots/rewards-clear.png' });
console.log('errors:', errs);
await b.close(); server.kill();
