// Screenshot of the lights-out ticket in Order Chaos.
import { spawn } from 'node:child_process';
import { chromium } from 'playwright-core';
const PORT = 5300, url = `http://localhost:${PORT}/`;
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'pipe' });
const wait = ms => new Promise(r => setTimeout(r, ms));
await wait(2500);
const b = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
const errs = []; p.on('pageerror', e => errs.push(String(e)));
await p.goto(url);
for (let i = 0; i < 60; i++) { if (await p.evaluate(() => window.__game?.scene.isActive('menu')).catch(() => false)) break; await wait(250); }
await p.locator('button[data-act="local"]').click();
await p.locator('button[data-level="16"]').click();
await p.getByText('Start cooking').click();
await wait(1500);
await p.evaluate(() => { const s = window.__game.scene.getScene('game'); s.introT = 0; s.world.players.forEach((q, i) => { q.x = 39 * 40 + i * 40; q.y = 16 * 40 - q.h - 1; }); });
await wait(1200);
await p.screenshot({ path: 'shots/ticket-popup.png' });
await wait(3500);
await p.screenshot({ path: 'shots/ticket-dark.png' });
console.log('rule:', await p.evaluate(() => window.__game.scene.getScene('game').world.rule), 'errors:', errs);
await b.close(); server.kill();
