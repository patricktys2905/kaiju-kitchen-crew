// Screenshot of a level as a real phone (3x pixel density) sees it. Usage: node scripts/phone-shot.mjs [level]
import { spawn } from 'node:child_process';
import { chromium } from 'playwright-core';
const PORT = 5298, url = `http://localhost:${PORT}/`;
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'pipe' });
const wait = ms => new Promise(r => setTimeout(r, ms));
await wait(2500);
const b = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
const p = await ctx.newPage();
await p.goto(url);
for (let i = 0; i < 60; i++) { if (await p.evaluate(() => window.__game?.scene.isActive('menu')).catch(() => false)) break; await wait(250); }
await wait(800);
await p.screenshot({ path: 'shots/phone-menu.png' });
await p.locator('button[data-act="local"]').tap();
await p.locator(`button[data-level="${process.argv[2] ?? 0}"]`).tap();
await p.getByText('Start cooking').tap();
await wait(4500);
await p.screenshot({ path: 'shots/phone-game.png' });
await p.locator('#t-fs').tap();
await wait(800);
console.log('phone: full screen after tapping the button =', await p.evaluate(() => !!document.fullscreenElement), '| label:', await p.locator('#t-fs').textContent(), '| still in game =', await p.evaluate(() => window.__game.scene.isActive('game')));
await p.screenshot({ path: 'shots/phone-game-fs.png' });
await b.close(); server.kill();
