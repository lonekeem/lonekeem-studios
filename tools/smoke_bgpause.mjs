// Headless check for fix/bg-pause: hide the tab during Survival and during the prologue cutscene.
// Confirms simulation (zombies, wave timer, cutscene clock) is frozen, AudioContext is suspended,
// the pause menu is showing, it stays paused after return, and there are 0 page errors.
// usage: node tools/smoke_bgpause.mjs <url> <outdir>
import { chromium } from 'playwright';
import fs from 'fs';

const URL = process.argv[2] || 'http://127.0.0.1:5191/';
const OUT = process.argv[3] || '/workspace/atq-bgpause-proof';
fs.mkdirSync(OUT, { recursive: true });

const b = await chromium.launch({
  executablePath: '/usr/bin/google-chrome',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--autoplay-policy=no-user-gesture-required'],
});

const errsAll = [];
const res = [];
const rec = (n, ok, d) => { res.push(!!ok); console.log(ok ? 'PASS' : 'FAIL', n, d ? JSON.stringify(d).slice(0, 400) : ''); };

function attach(p, bag) {
  p.on('pageerror', e => { const m = String(e.message || e).slice(0, 240); bag.push(m); errsAll.push(m); });
  p.on('dialog', d => d.accept());
}

async function setHidden(p, hidden) {
  await p.evaluate((hidden) => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => hidden ? 'hidden' : 'visible' });
    document.dispatchEvent(new Event('visibilitychange'));
    if (hidden) window.dispatchEvent(new Event('pagehide'));
    else window.dispatchEvent(new Event('pageshow'));
  }, hidden);
  await p.waitForTimeout(200);
}

async function snap(p) {
  return p.evaluate(() => {
    const A = window.__atq || {};
    const g = A.game;
    const zs = (g && g.zombies || []).filter(z => z && z.root && !z.dead).map(z => [+z.root.position.x.toFixed(4), +z.root.position.z.toFixed(4)]);
    const D = g && g.stepData || {};
    const pause = document.querySelector('#pause');
    const ctx = A.audio && A.audio.ctx;
    return {
      state: A.state,
      away: !!(A.isAway && A.isAway()),
      paused: !!(g && g.paused),
      running: !!(g && g.running),
      survival: !!(g && g.survival),
      wave: D.wave || 0,
      gap: D.gap == null ? null : +Number(D.gap).toFixed(4),
      left: D.left || 0,
      zCount: zs.length,
      zPos: zs.slice(0, 12),
      t: g ? +Number(g.t).toFixed(4) : null,
      proT: g && g.pro ? +Number(g.pro.t).toFixed(4) : null,
      hasPro: !!(g && g.pro),
      hasCut: !!(g && g.cut),
      pauseShown: !!(pause && !pause.classList.contains('hidden')),
      pauseText: pause && !pause.classList.contains('hidden') ? (pause.innerText || '').slice(0, 120) : '',
      ctx: ctx ? ctx.state : 'none',
      bgSus: !!(A.audio && A.audio._bgSuspended),
    };
  });
}

function frozen(a, b, keys) {
  const d = {};
  for (const k of keys) {
    if (k === 'zPos') {
      const same = JSON.stringify(a.zPos) === JSON.stringify(b.zPos);
      if (!same) d.zPos = { before: a.zPos, after: b.zPos };
    } else if (a[k] !== b[k]) d[k] = { before: a[k], after: b[k] };
  }
  return d;
}

async function bootToTitle(p) {
  await p.goto(URL, { waitUntil: 'domcontentloaded', timeout: 180000 });
  const warn = p.locator('#btnWarn');
  if (await warn.count()) { await warn.click(); await p.waitForTimeout(300); }
  await p.locator('#studio').click({ timeout: 5000 }).catch(() => {});
  await p.waitForSelector('#title:not(.hidden)', { timeout: 120000 });
}

// ---------- Survival ----------
const ctxS = await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await ctxS.addInitScript(() => {
  localStorage.setItem('atq3.settings', JSON.stringify({ qual: 'low', gore: false, hints: false, music: 0.6, vol: 0.9 }));
  localStorage.setItem('atq_prologue_seen', '1');
});
const pS = await ctxS.newPage();
pS.setDefaultTimeout(180000);
const errS = []; attach(pS, errS);

await bootToTitle(pS);
await pS.click('#btnSurvival');
await pS.click('#btnSurvival');
await pS.waitForFunction(() => window.__atq && window.__atq.game && window.__atq.game.running && window.__atq.game.survival, null, { timeout: 180000 });
// let the wave timer start and spawn a couple of zombies if the first wave has not yet
await pS.waitForTimeout(1500);
await pS.evaluate(() => {
  const g = window.__atq.game;
  g.god = true;
  g.audio && g.audio.init && g.audio.init();
  const D = g.stepData;
  if (D && (D.gap == null)) D.gap = 4;
  if (!g.alive || g.alive().length < 2) {
    const p = g.player.root.position;
    g.spawnZ(p.x + 6, p.z + 4, { idle: true, aggro: 0 });
    g.spawnZ(p.x - 5, p.z + 6, { idle: true, aggro: 0 });
  }
});
await pS.waitForTimeout(400);

// Existing pause button still works (and does not double-toggle on a second press)
await pS.evaluate(() => { const b = document.querySelector('#btnPause'); if (b) b.click(); });
await pS.waitForTimeout(300);
const manual = await snap(pS);
rec('pause button opens pause menu', manual.pauseShown && manual.paused && manual.state === 'paused', manual);
await pS.evaluate(() => { const b = document.querySelector('#btnPause'); if (b) b.click(); });
await pS.waitForTimeout(200);
const manual2 = await snap(pS);
rec('second pause-button press stays paused (no double-toggle)', manual2.pauseShown && manual2.paused && manual2.state === 'paused', manual2);
await pS.click('#btnResume');
await pS.waitForTimeout(300);
const unpaused = await snap(pS);
rec('Resume starts the game again', !unpaused.pauseShown && !unpaused.paused && unpaused.state === 'play', unpaused);

await pS.waitForTimeout(800);
const before = await snap(pS);
await setHidden(pS, true);
await pS.waitForTimeout(2200);
const hidden = await snap(pS);
const hidDiff = frozen(before, hidden, ['zPos', 'gap', 'wave', 't', 'left']);
rec('Survival hidden: pause menu shown', hidden.pauseShown && hidden.paused && hidden.state === 'paused' && /Paused/i.test(hidden.pauseText), hidden);
rec('Survival hidden: zombies and wave timer frozen', Object.keys(hidDiff).length === 0, hidDiff);
rec('Survival hidden: audio suspended', hidden.ctx === 'suspended' || hidden.bgSus, { ctx: hidden.ctx, bgSus: hidden.bgSus });

await setHidden(pS, false);
await pS.waitForTimeout(1500);
const back = await snap(pS);
const backDiff = frozen(hidden, back, ['zPos', 'gap', 'wave', 't']);
rec('Survival return: still paused until Resume', back.pauseShown && back.paused && back.state === 'paused' && !back.away, back);
rec('Survival return: still frozen, audio still suspended', Object.keys(backDiff).length === 0 && (back.ctx === 'suspended' || back.bgSus), { backDiff, ctx: back.ctx, bgSus: back.bgSus });
await pS.screenshot({ path: `${OUT}/survival_paused_after_return.png` });

await pS.click('#btnResume');
await pS.waitForTimeout(400);
const afterResume = await snap(pS);
rec('Survival Resume after bg: running again', !afterResume.pauseShown && !afterResume.paused && afterResume.state === 'play', afterResume);
rec('Survival page errors', errS.length === 0, errS);

await ctxS.close();

// ---------- Prologue cutscene ----------
const ctxC = await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await ctxC.addInitScript(() => {
  localStorage.setItem('atq3.settings', JSON.stringify({ qual: 'low', gore: false, hints: false, music: 0.6, vol: 0.9, subs: true }));
});
const pC = await ctxC.newPage();
pC.setDefaultTimeout(180000);
const errC = []; attach(pC, errC);

const proUrl = URL.replace(/\/?$/, '/') + '?prologue=1';
await pC.goto(proUrl, { waitUntil: 'domcontentloaded', timeout: 180000 });
await pC.waitForFunction(() => window.__atq && window.__atq.game && window.__atq.game.running && window.__atq.game.pro, null, { timeout: 180000 });
await pC.evaluate(() => { const a = window.__atq.audio; a && a.init && a.init(); });
await pC.waitForTimeout(1200);
const cBefore = await snap(pC);
await setHidden(pC, true);
await pC.waitForTimeout(2200);
const cHidden = await snap(pC);
const cDiff = frozen(cBefore, cHidden, ['zPos', 'proT']);
rec('Cutscene hidden: pause menu shown', cHidden.pauseShown && cHidden.paused && /Paused/i.test(cHidden.pauseText), cHidden);
rec('Cutscene hidden: clock and zombies frozen', Object.keys(cDiff).length === 0 && cHidden.hasPro, { cDiff, proT: cHidden.proT, hasPro: cHidden.hasPro, zCount: cHidden.zCount });
rec('Cutscene hidden: audio suspended', cHidden.ctx === 'suspended' || cHidden.bgSus, { ctx: cHidden.ctx, bgSus: cHidden.bgSus });

await setHidden(pC, false);
await pC.waitForTimeout(1500);
const cBack = await snap(pC);
const cBackDiff = frozen(cHidden, cBack, ['zPos', 'proT']);
rec('Cutscene return: still paused until Resume', cBack.pauseShown && cBack.paused && !cBack.away, cBack);
rec('Cutscene return: still frozen, audio still suspended', Object.keys(cBackDiff).length === 0 && (cBack.ctx === 'suspended' || cBack.bgSus), { cBackDiff, ctx: cBack.ctx, bgSus: cBack.bgSus });
await pC.screenshot({ path: `${OUT}/cutscene_paused_after_return.png` });
rec('Cutscene page errors', errC.length === 0, errC);

rec('all page errors', errsAll.length === 0, errsAll);

const all = res.every(Boolean);
const summary = { out: OUT, all, errsAll, before, hidden, back, cBefore, cHidden, cBack };
fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(summary, null, 2));
console.log(all ? 'ALL PASS' : 'SOME FAILED');
console.log(JSON.stringify(summary, null, 2));
await b.close();
process.exit(all ? 0 : 1);
