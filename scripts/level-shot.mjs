// Desktop screenshots of levels (opens everything with ?unlock). Usage: node scripts/level-shot.mjs 36 37 ...
import { spawn } from 'node:child_process';
import { chromium } from 'playwright-core';
const PORT = 5303, url = `http://localhost:${PORT}/?unlock`;
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'pipe' });
const wait = ms => new Promise(r => setTimeout(r, ms));
await wait(2500);
const b = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
const errs = []; p.on('pageerror', e => errs.push(String(e)));
for (const lv of process.argv.slice(2).map(Number)) {
  await p.goto(url);
  for (let i = 0; i < 60; i++) { if (await p.evaluate(() => window.__game?.scene.isActive('menu')).catch(() => false)) break; await wait(250); }
  await p.evaluate(() => localStorage.setItem('kkc-save', JSON.stringify({ best: {}, stars: {}, hats: { 0: 'chef', 9: 'party', 2: 'crown' } })));
  await p.locator('button[data-act="local"]').click();
  await p.locator('button[data-count="3"]').click();
  await p.locator('.worlds button').nth(Math.floor(lv / 6)).click(); // every world has 6 levels
  await wait(150);
  await p.evaluate(n => { const b = document.querySelector(`.levels button[data-level="${n}"]`); b?.click(); }, lv);
  await wait(150);
  await p.locator('button[data-act="start"]').click();
  await wait(4500);
  await p.screenshot({ path: `shots/level-${lv}.png` });
}
console.log('errors:', errs);
await b.close(); server.kill();
