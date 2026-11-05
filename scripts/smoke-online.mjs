// Online smoke test: a desktop HOST and a phone GUEST (two separate browsers) over the real public
// matchmaking server. Checks join, kaiju pick, start, state sync, the phone's touch input reaching the
// host, retry/restart for everyone, and the guest being told when the host closes the room.
// Needs internet. Usage: npm run build && npm run smoke:online   (or: npm run smoke:online-backup)
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { chromium } from 'playwright-core';

const ROUTE = process.argv[2] === 'backup' ? 'backup' : 'direct';
const PORT = 5297, url = `http://localhost:${PORT}/`;
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'pipe' });
const errors = [];
const wait = ms => new Promise(r => setTimeout(r, ms));
const exe = [process.env.CHROME_PATH, 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe', '/opt/pw-browsers/chromium'].filter(Boolean).find(p => existsSync(p));
function check(cond, msg) { if (!cond) { console.error('page errors so far:', JSON.stringify(errors.slice(0, 6), null, 1)); throw new Error('CHECK FAILED: ' + msg); } console.log('ok -', msg); }
async function until(fn, ms = 20000, step = 250) { const t0 = Date.now(); while (Date.now() - t0 < ms) { const v = await fn().catch(() => null); if (v) return v; await wait(step); } return null; }

let b1, b2;
try {
  for (let i = 0; i < 60; i++) { try { if ((await (await fetch(url)).text()).includes('Kaiju Kitchen Crew')) break; } catch { /* starting */ } await wait(250); }
  if (!(await (await fetch(url)).text()).includes('Kaiju Kitchen Crew')) throw new Error('port ' + PORT + ' is serving something else');
  b1 = await chromium.launch({ executablePath: exe, headless: true });
  b2 = await chromium.launch({ executablePath: exe, headless: true });
  const host = await (await b1.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
  const gctx = await b2.newContext({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true });
  const guest = await gctx.newPage();
  for (const [name, pg] of [['host', host], ['guest', guest]]) {
    pg.on('pageerror', e => errors.push(`${name}: ${e}`));
    pg.on('console', m => { if (m.type() === 'error') errors.push(`${name}: ${m.text()}`); });
  }
  const menuReady = pg => until(() => pg.evaluate(() => !!window.__game && window.__game.scene.isActive('menu')));
  const inGame = pg => pg.evaluate(() => window.__game.scene.isActive('game'));
  const players = pg => pg.evaluate(() => window.__game.scene.getScene('game').world.players.map(p => ({ x: p.x, y: p.y, sp: p.species, name: p.name })));

  // Host opens a room
  await host.goto(url); await menuReady(host); await wait(300);
  await host.locator('button[data-act="online"]').click();
  await host.getByText('Host a game').click();
  const code = await until(async () => { const t = await host.locator('#lobby .code').textContent(); return /^[A-Z]{4}$/.test(t ?? '') ? t : null; });
  check(code, `host opened room ${code}`);

  // Phone joins
  await guest.goto(ROUTE === 'backup' ? url + '?net=backup' : url); await menuReady(guest); await wait(300);
  await guest.locator('button[data-act="online"]').tap();
  await guest.getByText('Join a game').tap();
  await guest.fill('#lb-code', code);
  await guest.fill('#lb-name', 'Phone');
  await guest.getByText('Join', { exact: true }).tap();
  check(await until(() => guest.getByText("You're in!").isVisible()), 'phone joined the room');
  check(await until(() => host.getByText(ROUTE === 'backup' ? 'backup route' : 'direct link', { exact: false }).first().isVisible()), `phone joined via the ${ROUTE} route`);

  // Phone changes kaiju, host picks level 4
  const before = await host.locator('#lobby .seat').nth(1).locator('.k').textContent();
  await guest.locator('#lobby .seat').nth(1).locator('button[data-pick="1"]').tap();
  check(await until(async () => (await host.locator('#lobby .seat').nth(1).locator('.k').textContent()) !== before), 'phone picked a different kaiju');
  await host.locator('button[data-level="3"]').click();
  check(await until(() => guest.getByText('Pop-Up').first().isVisible()), 'phone sees the chosen level');
  await host.getByText('Start cooking').click();
  check(await until(() => inGame(host)) && await until(() => inGame(guest)), 'both devices are in the level');
  await wait(1500);

  const [hs, gs] = [await players(host), await players(guest)];
  check(hs.length === 2 && gs.length === 2 && hs.every((p, i) => p.sp === gs[i].sp), 'same two kaiju on both screens');
  const drift = Math.max(...hs.map((p, i) => Math.hypot(p.x - gs[i].x, p.y - gs[i].y)));
  check(drift < 60, `positions in sync (max drift ${drift.toFixed(0)}px)`);

  // Phone holds ▶ on the touch pad and taps JUMP; its kaiju moves on the host
  const g0 = (await players(host))[1];
  const pad = await guest.locator('#t-pad').boundingBox();
  const cdp = await gctx.newCDPSession(guest);
  const px = pad.x + pad.width * 0.8, py = pad.y + pad.height / 2;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: px, y: py, id: 1 }] });
  await wait(900);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  const g1 = (await players(host))[1];
  check(g1.x - g0.x > 60, `phone's ▶ moved its kaiju on the host (dx=${(g1.x - g0.x).toFixed(0)})`);
  await host.screenshot({ path: 'shots/online-host.png' });
  await guest.screenshot({ path: 'shots/online-guest.png' });

  // Host retries: phone restarts too
  await host.keyboard.press('KeyR');
  await wait(1500);
  const g2 = (await players(guest))[1];
  check(Math.abs(g2.x - g0.x) < 50, 'retry restarted the level on the phone too');

  // Host goes back to the lobby, then closes the room: phone is told
  await host.keyboard.press('Escape');
  check(await until(() => host.evaluate(() => window.__game.scene.isActive('lobby'))), 'host is back in the lobby with the room still open');
  await host.getByText('Close room').click();
  check(await until(() => guest.evaluate(() => window.__game.scene.isActive('menu')), 10000), 'phone was told the host closed the room');
} finally {
  await b1?.close(); await b2?.close();
  server.kill();
}
const real = errors.filter(e => !/Could not connect to peer|Lost connection/.test(e));
if (real.length) { console.error('Console errors:\n' + real.join('\n')); process.exit(1); }
console.log(`ONLINE SMOKE OK via ${ROUTE} route`);
