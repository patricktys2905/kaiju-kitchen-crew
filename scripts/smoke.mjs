// Smoke test in a real browser: menu → same-screen setup → every level loads and runs.
// Usage: npm run build && npm run smoke   (screenshots go to shots/)
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { chromium } from 'playwright-core';

const PORT = 5296, url = `http://localhost:${PORT}/`;
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'pipe' });
const errors = [];
const wait = ms => new Promise(r => setTimeout(r, ms));
const exe = [process.env.CHROME_PATH, 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe', '/opt/pw-browsers/chromium'].filter(Boolean).find(p => existsSync(p));
function check(cond, msg) { if (!cond) { console.error('page errors:', errors.slice(0, 8)); throw new Error('CHECK FAILED: ' + msg); } console.log('ok -', msg); }
async function until(fn, ms = 15000) { const t0 = Date.now(); while (Date.now() - t0 < ms) { const v = await fn().catch(() => null); if (v) return v; await wait(200); } return null; }

let browser;
try {
  for (let i = 0; i < 60; i++) { try { if ((await (await fetch(url)).text()).includes('Kaiju Kitchen Crew')) break; } catch { /* starting */ } await wait(250); }
  check((await (await fetch(url)).text()).includes('Kaiju Kitchen Crew'), `preview server on ${PORT}`);
  browser = await chromium.launch({ executablePath: exe, headless: true });
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(url);
  check(await until(() => page.evaluate(() => window.__game?.scene.isActive('menu'))), 'menu opens');
  await wait(600);
  await page.screenshot({ path: 'shots/1-menu.png' });
  await page.locator('button[data-act="local"]').click();
  check(await until(() => page.evaluate(() => window.__game.scene.isActive('local'))), 'same-screen setup opens');
  await page.locator('button[data-count="2"]').click();
  await page.screenshot({ path: 'shots/2-local.png' });
  await page.getByText('Start cooking').click();
  check(await until(() => page.evaluate(() => window.__game.scene.isActive('game'))), 'level 1 starts');
  // drive: both keyboard sides walk right and hop
  await page.keyboard.down('KeyD'); await page.keyboard.down('ArrowRight');
  for (let k = 0; k < 6; k++) { await page.keyboard.press('KeyW'); await page.keyboard.press('ArrowUp'); await wait(250); }
  await page.keyboard.up('KeyD'); await page.keyboard.up('ArrowRight');
  await wait(300);
  await page.screenshot({ path: 'shots/3-level1.png' });
  const moved = await page.evaluate(() => window.__game.scene.getScene('game').world.players.map(p => Math.round(p.x)));
  check(moved.some(x => x > 200), 'kaiju moved with the keyboard: ' + moved.join(','));
  // full screen can be switched on and off mid-level
  await page.keyboard.press('KeyF');
  check(await until(() => page.evaluate(() => !!document.fullscreenElement), 4000), 'F switches to full screen during the game');
  check(await page.evaluate(() => window.__game.scene.isActive('game')), 'still in the level after going full screen');
  await page.keyboard.press('KeyF');
  check(await until(() => page.evaluate(() => !document.fullscreenElement), 4000), 'F switches full screen off again');
  // every level loads and renders
  const nLevels = await page.evaluate(() => document.querySelectorAll("x").length + 18);
  for (let lv = 1; lv < nLevels; lv++) {
    await page.evaluate(n => { const s = window.__game.scene.getScene('game'); s.scene.restart({ ...s.d, level: n }); }, lv);
    await wait(900);
    const ok = await page.evaluate(n => { const s = window.__game.scene.getScene('game'); return s.world && s.d.level === n; }, lv);
    check(ok, `level ${lv + 1} loads`);
    await page.screenshot({ path: `shots/4-level${lv + 1}.png` });
  }
  // scroll across level 6 by moving the team
  await page.evaluate(() => { const w = window.__game.scene.getScene('game').world; w.players.forEach((p, i) => { p.x = 52 * 40 + i * 40; p.y = 15 * 40 - 40; }); });
  await wait(900);
  await page.screenshot({ path: 'shots/5-level6-mid.png' });
  check(errors.length === 0, 'no page errors');
} catch (e) {
  console.error(e);
  process.exitCode = 1;
} finally {
  await browser?.close();
  server.kill();
}
