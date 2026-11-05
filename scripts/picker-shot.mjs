// Screenshot of the same-screen setup (kaiju picker) on a phone.
import { spawn } from 'node:child_process';
import { chromium } from 'playwright-core';
const PORT = 5301, url = `http://localhost:${PORT}/`;
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'pipe' });
const wait = ms => new Promise(r => setTimeout(r, ms));
await wait(2500);
const b = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
const p = await (await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })).newPage();
const errs = []; p.on('pageerror', e => errs.push(String(e)));
await p.goto(url);
for (let i = 0; i < 60; i++) { if (await p.evaluate(() => window.__game?.scene.isActive('menu')).catch(() => false)) break; await wait(250); }
await p.screenshot({ path: 'shots/picker-menu.png' });
await p.locator('button[data-act="local"]').tap();
await p.locator('button[data-count="3"]').tap();
await p.locator('.seat[data-seat="1"]').tap();
await p.locator('button[data-kaiju="11"]').tap();
const species = await p.evaluate(() => [...document.querySelectorAll('.seat .k')].map(e => e.firstChild.textContent.trim()));
await p.screenshot({ path: 'shots/picker.png' });
await p.locator('.panel').evaluate(e => e.scrollTo(0, 400));
await p.screenshot({ path: 'shots/picker2.png' });
console.log('seats:', species.join(' | '), 'errors:', errs);
await b.close(); server.kill();
