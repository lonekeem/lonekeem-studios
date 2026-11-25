// Playwright check: classic v1.9.7 touch HUD stays locked (Keem's request, v1.9.106).
// Fails if left buttons (hand, RUN, CRCH) drift, sit under a 59px iPhone safe-area, or if
// cloud-style reloadSettings({ hudv2:true }) can turn the thumb-arc layout back on.
import { chromium } from 'playwright';
import fs from 'fs';

const URL = process.env.ATQ_URL || 'http://127.0.0.1:4176/?step=0&god';
const OUT = process.env.ATQ_PROOF || '/workspace/atq-controls-proof';
fs.mkdirSync(OUT, { recursive: true });

const SAFE = 59;
const VW = 852, VH = 393;
const fails = [];
const ok = (name, pass, extra) => {
  if (!pass) fails.push({ name, extra });
  console.log(pass ? 'OK  ' : 'FAIL', name, extra != null ? JSON.stringify(extra) : '');
};
const near = (a, b, t = 8) => Math.abs(a - b) <= t;

const b = await chromium.launch({
  executablePath: '/usr/bin/google-chrome',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--autoplay-policy=no-user-gesture-required'],
});
const ctx = await b.newContext({ viewport: { width: VW, height: VH }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
// Simulate Keem's broken phone: thumb-arc on, ctlRev already at the old lock (2).
await ctx.addInitScript(() => {
  localStorage.setItem('atq3.settings', JSON.stringify({
    qual: 'low', gore: true, voices: false, lang: 'explicit', music: 0, sfxVol: 0, voiceVol: 0,
    hudv2: true, ctlRev: 2, btnLay: {}, hints: false,
  }));
  localStorage.setItem('atq_prologue_seen', '1');
  localStorage.setItem('atq.tut.seen', '1');
  localStorage.setItem('atq.gate', JSON.stringify({ birthYear: 1990, agreedVersion: 1, agreedAt: Date.now() - 86400000 }));
});
const p = await ctx.newPage();
const errs = [], notFounds = [];
p.on('pageerror', e => errs.push(String(e.message || e)));
p.on('response', r => { if (r.status() === 404) notFounds.push(r.url()); });

await p.goto(URL, { waitUntil: 'load', timeout: 180000 });
await p.waitForFunction(() => window.__atq && window.__atq.game && window.__atq.game.running, null, { timeout: 180000 });
await p.evaluate(() => {
  const g = window.__atq.game;
  for (let i = 0; i < 80; i++) g.skipLine && g.skipLine();
  g.cut = null; g.paused = false; g.god = true;
  document.getElementById('hud')?.classList.remove('hidden');
  document.getElementById('touch')?.classList.remove('hidden');
});
await p.waitForTimeout(800);

const boot = await p.evaluate(() => {
  let s = {};
  try { s = JSON.parse(localStorage.getItem('atq3.settings') || '{}'); } catch (e) {}
  const st = id => {
    const e = document.getElementById(id.replace('#', ''));
    if (!e) return null;
    const r = e.getBoundingClientRect(), cs = getComputedStyle(e);
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height),
      text: (e.textContent || '').trim(), display: cs.display, visible: cs.display !== 'none' && r.width > 0 };
  };
  return {
    hudv2Class: document.body.classList.contains('hudv2'),
    hudv2: !!s.hudv2,
    ctlRev: s.ctlRev,
    tUse: st('tUse'), tAim: st('tAim'), tRun: st('tRun'), tCrouch: st('tCrouch'),
    tJump: st('tJump'), tRoll: st('tRoll'), tAtk: st('tAtk'), tReload: st('tReload'),
    tGren: st('tGren'), tSwap: st('tSwap'), btnGren: st('btnGren'), btnView: st('btnView'),
    btnPause: st('btnPause'), stick: st('stickBase'),
  };
});
console.log('boot', JSON.stringify(boot, null, 2));
ok('ctlRev bumped to 3', boot.ctlRev === 3, boot.ctlRev);
ok('hudv2 setting forced off despite saved true', boot.hudv2 === false, boot.hudv2);
ok('body.hudv2 class off', boot.hudv2Class === false);
ok('tUse is the yellow hand, not USE', boot.tUse && boot.tUse.text.includes('✋') && !/USE/i.test(boot.tUse.text), boot.tUse && boot.tUse.text);
ok('tAim is the target, not AIM', boot.tAim && boot.tAim.text.includes('◎') && !/^AIM$/i.test(boot.tAim.text), boot.tAim && boot.tAim.text);
ok('mid-right tGren hidden', boot.tGren && boot.tGren.display === 'none', boot.tGren);
ok('top-right btnGren visible', boot.btnGren && boot.btnGren.visible, boot.btnGren);
ok('hand is on the right of JUMP', boot.tUse && boot.tJump && boot.tUse.x > boot.tJump.x, { use: boot.tUse && boot.tUse.x, jump: boot.tJump && boot.tJump.x });
ok('RUN is on the left half', boot.tRun && boot.tRun.x < VW / 3, boot.tRun);
ok('CRCH is under RUN', boot.tCrouch && boot.tRun && boot.tCrouch.y > boot.tRun.y, { run: boot.tRun, crch: boot.tCrouch });

await p.screenshot({ path: `${OUT}/after-classic.png`, timeout: 120000 });

// Cloud must not turn thumb-arc back on.
const afterCloud = await p.evaluate(() => {
  window.__atq.reloadSettings({ hudv2: true, ctlRev: 2, vol: 0.5 });
  let s = {};
  try { s = JSON.parse(localStorage.getItem('atq3.settings') || '{}'); } catch (e) {}
  return { hudv2: !!s.hudv2, ctlRev: s.ctlRev, cls: document.body.classList.contains('hudv2'), use: (document.getElementById('tUse') || {}).textContent };
});
ok('reloadSettings(hudv2:true) cannot enable thumb-arc', afterCloud.hudv2 === false && afterCloud.cls === false, afterCloud);
ok('hand label stays ✋ after cloud merge', afterCloud.use && afterCloud.use.includes('✋'), afterCloud.use);

// Broken (hudv2) reference shot — only for the before/after proof, then restore classic.
await p.evaluate(() => {
  const S = JSON.parse(localStorage.getItem('atq3.settings') || '{}');
  S.hudv2 = true; localStorage.setItem('atq3.settings', JSON.stringify(S));
  document.body.classList.add('hudv2');
  const u = document.getElementById('tUse'), a = document.getElementById('tAim');
  if (u) u.textContent = 'USE';
  if (a) a.textContent = 'AIM';
});
await p.waitForTimeout(200);
await p.screenshot({ path: `${OUT}/before-hudv2.png`, timeout: 120000 });
await p.evaluate(() => {
  const S = JSON.parse(localStorage.getItem('atq3.settings') || '{}');
  S.hudv2 = false; S.ctlRev = 3; localStorage.setItem('atq3.settings', JSON.stringify(S));
  document.body.classList.remove('hudv2');
  const u = document.getElementById('tUse'), a = document.getElementById('tAim');
  if (u) u.textContent = '✋';
  if (a) a.textContent = '◎';
});

// Simulated iPhone landscape safe-area (Dynamic Island ~59px).
await p.evaluate((SAFE) => {
  document.documentElement.style.setProperty('--atq-safe-left', SAFE + 'px');
  document.documentElement.style.setProperty('--atq-safe-right', SAFE + 'px');
}, SAFE);
await p.waitForTimeout(200);
const inset = await p.evaluate(() => {
  const st = id => {
    const e = document.getElementById(id);
    if (!e) return null;
    const r = e.getBoundingClientRect();
    return { x: r.x, y: r.y, r: r.right, b: r.bottom, w: r.width, h: r.height };
  };
  return { tRun: st('tRun'), tCrouch: st('tCrouch'), tUse: st('tUse'), tJump: st('tJump'), stick: st('stickBase'), btnGren: st('btnGren') };
});
console.log('inset', JSON.stringify(inset));
ok('RUN clears left safe-area', inset.tRun && inset.tRun.x + 0.5 >= SAFE, inset.tRun);
ok('CRCH clears left safe-area', inset.tCrouch && inset.tCrouch.x + 0.5 >= SAFE, inset.tCrouch);
ok('hand stays in the right cluster, not under the left cutout', inset.tUse && inset.tUse.x > VW * 0.6, inset.tUse);
ok('hand clears right safe-area', inset.tUse && inset.tUse.r <= VW - SAFE + 1, inset.tUse);
ok('joystick clears left safe-area', inset.stick && inset.stick.x + 0.5 >= SAFE, inset.stick);
// Classic positions with a 59px inset, 852x393 (lbtns top 104, gap 22, buttons 52).
ok('RUN at classic inset position', inset.tRun && near(inset.tRun.x, SAFE, 2) && near(inset.tRun.y, 104, 4), inset.tRun);
ok('CRCH under RUN at classic gap', inset.tCrouch && near(inset.tCrouch.x, SAFE, 2) && near(inset.tCrouch.y, 104 + inset.tRun.h + 22, 4), inset.tCrouch);
await p.screenshot({ path: `${OUT}/after-classic-safe59.png`, timeout: 120000 });

// 844x390 was the usual test size — reload at that viewport too, still with the lock.
await p.setViewportSize({ width: 844, height: 390 });
await p.waitForTimeout(400);
const v2 = await p.evaluate(() => {
  const r = id => { const e = document.getElementById(id), b = e.getBoundingClientRect(); return { x: b.x, y: b.y, r: b.right, text: (e.textContent || '').trim() }; };
  return { hudv2: document.body.classList.contains('hudv2'), tRun: r('tRun'), tCrouch: r('tCrouch'), tUse: r('tUse') };
});
ok('844x390 still classic', v2.hudv2 === false && v2.tUse.text.includes('✋'), v2);
ok('844x390 RUN/CRCH still in safe area', v2.tRun.x + 0.5 >= SAFE && v2.tCrouch.x + 0.5 >= SAFE, v2);
await p.screenshot({ path: `${OUT}/after-classic-844x390.png`, timeout: 120000 });

ok('0 page errors', errs.length === 0, errs.slice(0, 5));
ok('0 404s', notFounds.length === 0, notFounds.slice(0, 5));

const report = { ok: fails.length === 0, fails, boot, inset, afterCloud, errs, notFounds };
fs.writeFileSync(`${OUT}/ctl-lock-results.json`, JSON.stringify(report, null, 2));
console.log(fails.length ? 'FAILED ' + fails.length : 'ALL OK');
await b.close();
process.exit(fails.length ? 1 : 0);
