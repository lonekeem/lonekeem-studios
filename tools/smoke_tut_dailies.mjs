// v1.9.40 tutorial + daily challenges. No server writes, no fake leaderboard scores, no real lobby join.
import { chromium } from 'playwright';
import fs from 'fs';
const URL = process.argv[2] || 'http://127.0.0.1:5376/';
const OUT = process.argv[3] || '/workspace/atq-daily-proof';
fs.mkdirSync(OUT, { recursive: true });
const rec = (n, ok, d) => { console.log(ok ? 'PASS' : 'FAIL', n, d ? JSON.stringify(d) : ''); return ok; };
let fails = 0; const ok = (n, v, d) => { if (!rec(n, !!v, d)) fails++; };
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
async function page({ save = false, seen = false } = {}) {
  const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  await ctx.addInitScript(({ save, seen }) => {
    localStorage.setItem('atq3.settings', JSON.stringify({ qual: 'low', voices: false, playSubs: false }));
    localStorage.setItem('atq_prologue_seen', '1');
    if (seen) localStorage.setItem('atq.tut.seen', '1');
    if (save) localStorage.setItem('atq3_save', JSON.stringify({ v: 3, step: 7, played: true, cash: 40, xp: 0, level: 1, owned: ['fists', 'bat'], outfits: ['classic'] }));
  }, { save, seen });
  const p = await ctx.newPage();
  p.setDefaultTimeout(120000);
  p.errs = []; p.on('pageerror', e => p.errs.push(String(e.message || e).slice(0, 200)));
  await p.goto(URL, { waitUntil: 'domcontentloaded' });
  await p.click('#btnWarn');
  await p.waitForSelector('#title:not(.hidden)', { timeout: 30000 });
  await p.waitForTimeout(500);
  return p;
}

const fresh = await page({ save: true, seen: false });
await fresh.waitForSelector('#tutOffer:not(.hidden)', { timeout: 8000 });
await fresh.screenshot({ path: OUT + '/offer.png' });
ok('first-time offer appears', await fresh.evaluate(() => !!document.querySelector('#tutOffer') && !document.querySelector('#tutOffer').classList.contains('hidden')));
ok('offer has Start and Skip', await fresh.evaluate(() => !!document.querySelector('#tutStart') && !!document.querySelector('#tutSkip')));
ok('main list still has Continue Story Survival Online Settings', await fresh.evaluate(() => ['btnContinue','btnStory','btnSurvival','btnOnline','btnSettings'].every(id => document.getElementById(id))));
ok('btnLobby id kept', await fresh.evaluate(() => !!document.getElementById('btnLobby')));
await fresh.click('#tutSkip');
await fresh.waitForTimeout(300);
ok('skip hides the offer and remembers it', await fresh.evaluate(() => document.querySelector('#tutOffer').classList.contains('hidden') && localStorage.getItem('atq.tut.seen') === '1'));
await fresh.screenshot({ path: OUT + '/menu_after_skip.png' });

// dailies on the menu
await fresh.click('#btnOnline'); await fresh.waitForTimeout(200);
await fresh.screenshot({ path: OUT + '/menu_online_dailies.png' });
ok('Daily Challenges is under Online', await fresh.evaluate(() => { const e = document.getElementById('btnDailies'); return e && e.offsetParent; }));
ok('Survival badge is visible', await fresh.evaluate(() => { const e = document.getElementById('survBadge'); return e && e.textContent && e.offsetParent; }));
await fresh.click('#btnDailies'); await fresh.waitForTimeout(300);
await fresh.screenshot({ path: OUT + '/dailies_panel.png' });
const daily = await fresh.evaluate(() => {
  const rows = [...document.querySelectorAll('#dailyList .drow')].map(r => r.innerText.replace(/\s+/g, ' ').trim());
  const wallet = (document.querySelector('#dailies .dwallet b') || {}).textContent || '';
  return { n: rows.length, rows, wallet, day: (document.querySelector('#dailyDay') || {}).textContent };
});
ok('three challenges shown', daily.n === 3, daily);
ok('wallet shows shared cash', /\$40/.test(daily.wallet), daily.wallet);
ok('wallet and all three rows are on screen', await fresh.evaluate(() => {
  const h = innerHeight;
  const rows = [...document.querySelectorAll('#dailyList .drow')];
  const wal = document.getElementById('dailyWallet');
  const back = document.querySelector('#dailies .back');
  if (rows.length !== 3 || !wal || !back) return false;
  return rows.every(r => { const b = r.getBoundingClientRect(); return b.top >= 0 && b.bottom <= h; })
    && wal.getBoundingClientRect().bottom <= h && back.getBoundingClientRect().bottom <= h + 2;
}));
ok('same-day hook returns 3 items', await fresh.evaluate(() => window.__atqDailies.get().items.length === 3));

// progress + cash reward (local only, no server)
const before = await fresh.evaluate(() => JSON.parse(localStorage.getItem('atq3_save') || '{}').cash);
await fresh.evaluate(() => {
  const it = window.__atqDailies.get().items[0];
  window.__atqDailies.bump(it.type, it.need, it.need);
});
await fresh.waitForTimeout(200);
await fresh.screenshot({ path: OUT + '/dailies_progress.png' });
const after = await fresh.evaluate(() => {
  const s = JSON.parse(localStorage.getItem('atq3_save') || '{}');
  const d = window.__atqDailies.get();
  return { cash: s.cash, done: d.items.filter(i => i.done).length, reward: d.items[0].reward, lb: localStorage.getItem('atq.lbPending') };
});
ok('completing a daily adds cash to the shared wallet', after.cash === before + after.reward, after);
ok('no pending leaderboard submit was written', !after.lb, after);
ok('one challenge marked complete', after.done === 1, after);
ok('panel no page errors', !fresh.errs.length, fresh.errs);

// Settings replay
await fresh.click('#dailies .back'); await fresh.waitForTimeout(200);
await fresh.click('#btnSettings'); await fresh.waitForTimeout(200);
await fresh.screenshot({ path: OUT + '/settings_replay.png' });
ok('Replay tutorial is visible in Settings', await fresh.evaluate(() => {
  const e = document.getElementById('btnReplayTut'); if (!e) return false;
  const r = e.getBoundingClientRect();
  return r.width > 0 && r.bottom <= innerHeight + 1;
}));
const freshErrs = fresh.errs.slice();
await fresh.close();

// Returning player: no offer. Replay starts the in-game coach.
const ret = await page({ save: true, seen: true });
ok('returning player is not shown the offer', await ret.evaluate(() => !document.querySelector('#tutOffer') || document.querySelector('#tutOffer').classList.contains('hidden')));
await ret.click('#btnSettings'); await ret.waitForTimeout(200);
await ret.click('#btnReplayTut');
const started = await ret.waitForFunction(() => window.__atqTut && window.__atqTut.active(), null, { timeout: 5000 }).then(() => true).catch(() => false);
ok('Replay tutorial starts the coach', started && await ret.evaluate(() => window.__atqTut.active() && window.__atqTut.step() === 'move'));
// wait for survival + hud (can take a while)
const inGame = await ret.waitForFunction(() => window.__atq && window.__atq.game && window.__atq.state === 'play' && document.querySelector('#tutHud') && !document.querySelector('#tutHud').classList.contains('hidden'), null, { timeout: 180000 }).then(() => true).catch(() => false);
ok('in-game tutorial HUD is on screen', inGame);
if (inGame) {
  await ret.waitForTimeout(600);
  await ret.screenshot({ path: OUT + '/tutorial_ingame.png' });
  ok('first step is Move', await ret.evaluate(() => window.__atqTut.step() === 'move'));
  await ret.evaluate(() => window.__atqTut.complete('move'));
  await ret.evaluate(() => window.__atqTut.complete('shoot'));
  await ret.evaluate(() => window.__atqTut.complete('melee'));
  await ret.evaluate(() => window.__atqTut.complete('roll'));
  await ret.evaluate(() => window.__atqTut.complete('wep'));
  await ret.waitForTimeout(400);
  await ret.screenshot({ path: OUT + '/tutorial_pickup.png' });
  ok('pickup step reached', await ret.evaluate(() => window.__atqTut.step() === 'loot'));
  await ret.evaluate(() => window.__atqTut.complete('loot'));
  await ret.waitForTimeout(400);
  await ret.screenshot({ path: OUT + '/tutorial_done.png' });
  ok('tutorial finishes and is remembered', await ret.evaluate(() => !window.__atqTut.active() && window.__atqTut.seen()));
  ok('done card offers keep playing', await ret.evaluate(() => !!document.querySelector('#tutStay') && !document.querySelector('#tutOffer').classList.contains('hidden')));
}
ok('replay session no page errors', !ret.errs.length, ret.errs);
ok('Play as Keem still in the client sources', await ret.evaluate(async () => {
  for (const u of ['/src/mp/profileui.js', '/src/mp/creator.js']) {
    try { const t = await (await fetch(u)).text(); if (/Play as Keem/.test(t)) return true; } catch (e) {}
  }
  const html = await (await fetch(location.pathname)).text();
  const assets = [...html.matchAll(/assets\/[A-Za-z0-9_.-]+\.js/g)].map(m => m[0]);
  for (const a of assets) { try { const t = await (await fetch(a)).text(); if (/Play as Keem/.test(t)) return true; } catch (e) {} }
  return false;
}));

await ret.close();
console.log(fails ? ('TUT-DAILIES SMOKE FAIL ' + fails) : 'TUT-DAILIES SMOKE OK');
await b.close();
process.exit(fails ? 1 : 0);
