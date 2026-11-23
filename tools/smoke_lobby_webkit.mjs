// WebKit iPhone-landscape: open World Lobby (read-only) and Practice Alone picker. Local only — no public join, no scores.
import { webkit } from 'playwright';
import fs from 'fs';
const URL = process.argv[2] || 'http://127.0.0.1:4178/';
const OUT = process.argv[3] || '/workspace/atq-stale-proof/lobby';
fs.mkdirSync(OUT, { recursive: true });
const rec = (n, ok, d) => { console.log(ok ? 'PASS' : 'FAIL', n, d != null ? JSON.stringify(d) : ''); return !!ok; };
let fails = 0;
const ok = (n, v, d) => { if (!rec(n, v, d)) fails++; };

const b = await webkit.launch();
const ctx = await b.newContext({
  viewport: { width: 844, height: 390 },
  deviceScaleFactor: 2,
  hasTouch: true,
  isMobile: true,
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
});
await ctx.addInitScript(() => {
  try {
    localStorage.setItem('atq3.settings', JSON.stringify({ qual: 'low', voices: false, playSubs: false }));
    localStorage.setItem('atq_prologue_seen', '1');
localStorage.setItem('atq3_save', JSON.stringify({ v: 3, step: 7, played: true, cash: 40, xp: 0, level: 1, owned: ['fists', 'bat'], outfits: ['classic'] }));
    localStorage.setItem('atq.profile.v1', JSON.stringify({ v: 1, name: 'LocalSmoke' }));
    localStorage.setItem('atq.guest', JSON.stringify({ id: crypto.randomUUID(), secret: crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, ''), name: 'LocalSmoke' }));
  } catch (e) {}
});
const p = await ctx.newPage();
p.setDefaultTimeout(60000);
const errs = [], nf = [], cons = [];
p.on('pageerror', e => errs.push(String(e.message || e).slice(0, 200)));
p.on('console', m => { if (m.type() === 'error') cons.push(m.text().slice(0, 200)); });
p.on('response', r => { if (r.status() === 404) nf.push(r.url()); });

p.on('crash', () => console.log('PAGE CRASHED'));
await p.goto(URL, { waitUntil: 'domcontentloaded' });
await p.waitForFunction(() => window.__atqBooted, null, { timeout: 30000 });
// Leave the age gate incomplete so the launch flow never starts the intro/3D engine
// (headless WebKit here crashes on that path). Force the title menu on top for UI checks.
await p.evaluate(() => {
  ['warning','gateAge','gateAgree','gateKids','gateIntro','studio'].forEach(id => {
    const n = document.getElementById(id); if (n) n.classList.add('hidden');
  });
  document.body.classList.remove('atq-gating');
  const t = document.getElementById('title'); if (t) t.classList.remove('hidden');
});
await p.waitForSelector('#title:not(.hidden)', { timeout: 15000 });
await p.waitForTimeout(400);

const helper = await p.evaluate(() => typeof window.__atqReloadStale === 'function');
ok('__atqReloadStale present after boot', helper);
ok('#btnLobby exists', await p.evaluate(() => !!document.getElementById('btnLobby')));
const foot = await p.evaluate(() => (document.querySelector('#foot, .foot') || {}).textContent || '');
ok('footer shows a version', /v1\.9\.\d+/.test(foot), foot);
await p.screenshot({ path: OUT + '/01_title.png' });

// Open Online → World Lobby — read-only: watch Connecting…, do not Join / Quick Join / Create Game into the public list.
await p.evaluate(() => {
  const online = document.getElementById('btnOnline'); if (online) online.click();
});
await p.waitForTimeout(300);
ok('#btnLobby visible after Online tab', await p.evaluate(() => { const e = document.getElementById('btnLobby'); return !!(e && e.offsetParent); }));
await p.evaluate(() => { const e = document.getElementById('btnLobby'); if (e) e.click(); });
await p.waitForSelector('#online:not(.hidden), #wNet', { timeout: 15000 });
await p.waitForTimeout(500);
await p.screenshot({ path: OUT + '/02_lobby_connecting.png' });
const early = await p.evaluate(() => ({ net: (document.querySelector('#wNet') || {}).textContent, rooms: (document.querySelector('#wRooms') || {}).textContent, practice: !!(document.querySelector('#btnPractice') && document.querySelector('#btnPractice').offsetParent) }));
ok('Practice Alone is visible in the World Lobby', early.practice, early);

// Wait up to 15s for Connecting… to resolve (Online or Offline). Hang would stay on Connecting.
const resolved = await p.waitForFunction(() => {
  const t = (document.querySelector('#wNet') || {}).textContent || '';
  return /Online|Offline/i.test(t) && !/Connecting/i.test(t);
}, null, { timeout: 15000 }).then(() => true).catch(() => false);
const late = await p.evaluate(() => ({ net: (document.querySelector('#wNet') || {}).textContent, rooms: ((document.querySelector('#wRooms') || {}).textContent || '').slice(0, 180) }));
ok('lobby leaves Connecting… (Online or Offline, not hung)', resolved, late);
await p.screenshot({ path: OUT + '/03_lobby_resolved.png' });

// Practice Alone: open the mode picker only, then cancel. Do not start a public game.
await p.click('#btnPractice');
await p.waitForTimeout(1200);
const picker = await p.evaluate(() => {
  const txt = (document.body.innerText || '');
  const vis = [...document.querySelectorAll('button,h2,[role=dialog],.panel')].filter(e => e.offsetParent).map(e => (e.innerText || '').replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 20);
  return { txt: txt.includes('Practice Alone') || /Survival|Supply Run|Rescue/i.test(txt), vis };
});
ok('Practice Alone opens a mode picker (not an import-failed banner)', picker.txt && !/Couldn't start/i.test(picker.vis.join(' ')), picker.vis);
await p.screenshot({ path: OUT + '/04_practice_picker.png' });

// Cancel picker if there's a back/cancel, else Escape
const cancelled = await p.evaluate(() => {
  const btns = [...document.querySelectorAll('button')].filter(e => e.offsetParent);
  const back = btns.find(b => /back|cancel|close/i.test(b.textContent || '') || (b.getAttribute('aria-label') || '').toLowerCase().includes('back'));
  if (back) { back.click(); return 'clicked'; }
  return 'none';
});
if (cancelled === 'none') await p.keyboard.press('Escape');
await p.waitForTimeout(400);

// Play as Keem string exists in the document/source path (char select / profile)
const keem = await p.evaluate(() => /Play as Keem/.test(document.documentElement.innerHTML) || /Play as Keem/.test(document.body.innerText || ''));
// It may only appear after opening char select; also accept it being in a loaded module later. Soft-check title path via a data attribute is not present, so just record.
const realErrs = errs.filter(e => !/Failed to start the audio device/i.test(e));
ok('no page errors (ignoring WebKit audio device)', realErrs.length === 0, realErrs);
ok('no 404s', nf.length === 0, nf);
console.log('console errors:', cons.slice(0, 8));
console.log('Play as Keem visible in DOM now:', keem);

await b.close();
console.log(fails ? `FAILED ${fails}` : 'ALL PASSED');
process.exit(fails ? 1 : 0);
