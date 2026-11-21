// v1.9.30 local/live smoke: menu tabs, Online welcome, Survival mid-shot, 0 page errors.
// Does not join a town or post a score.
// usage: node tools/smoke_v1930.mjs <url> <outdir>
import { chromium } from 'playwright';
import fs from 'fs';

const URL = process.argv[2] || 'http://127.0.0.1:5330/';
const OUT = process.argv[3] || '/workspace/atq-perf-proof/v1930';
fs.mkdirSync(OUT, { recursive: true });

const b = await chromium.launch({
  executablePath: '/usr/bin/google-chrome',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'],
});
const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await ctx.addInitScript(() => {
  localStorage.setItem('atq3.settings', JSON.stringify({ qual: 'med', gore: true, hints: false }));
  localStorage.setItem('atq_prologue_seen', '1');
});
const p = await ctx.newPage();
p.setDefaultTimeout(180000);
const errs = [];
p.on('pageerror', e => errs.push(String(e.message || e).slice(0, 240)));
p.on('dialog', d => d.accept());

const res = [];
const rec = (n, ok, d) => { res.push(!!ok); console.log(ok ? 'PASS' : 'FAIL', n, d ? JSON.stringify(d).slice(0, 300) : ''); };
const shot = async (n, w = 800) => { await p.waitForTimeout(w); await p.screenshot({ path: `${OUT}/${n}.png` }); };

await p.goto(URL, { waitUntil: 'domcontentloaded', timeout: 180000 });
const warn = p.locator('#btnWarn');
if (await warn.count()) { await warn.click(); await p.waitForTimeout(500); }
await p.locator('#studio').click({ timeout: 5000 }).catch(() => {});
await p.waitForSelector('#title:not(.hidden)', { timeout: 120000 });

for (const t of ['story', 'survival', 'online', 'keem', 'settings']) {
  await p.click(`#title .mtabs button[data-tab="${t}"]`);
  await shot('menu_' + t, 350);
}
const foot = (await p.textContent('#foot')) || '';
rec('footer reads v1.9.30', foot.startsWith('v1.9.30'), foot);
rec('Play tab / btnLobby exist', await p.evaluate(() => !!document.querySelector('#btnLobby') && !!document.querySelector('#title .mtabs button[data-tab="online"]')));

await p.click('#title .mtabs button[data-tab="online"]');
await p.click('#btnLobby');
await p.waitForSelector('#prof .welcome, #online:not(.hidden)', { timeout: 60000 });
const welcome = await p.evaluate(() => {
  const w = document.querySelector('#prof .welcome');
  const t = w ? w.textContent : '';
  return { shown: !!w && w.offsetParent !== null, hasGoogle: /Google/i.test(t), hasCreate: /Create profile/i.test(t), text: t.slice(0, 200) };
});
await shot('online_welcome', 1200);
rec('Online welcome screen (Sign in / Create profile)', welcome.shown && welcome.hasGoogle && welcome.hasCreate, welcome);

// close profile if open, go back to title, start Survival and fire one mid-shot
await p.evaluate(() => {
  const x = document.querySelector('#prof .welcome button, #prof .x, #prof [data-close]');
  // stay on title: click the hidden close or go via menu Play/Survival
});
await p.keyboard.press('Escape').catch(() => {});
await p.waitForTimeout(300);
// If the profile overlay is still up, click the title backdrop / close without creating a profile
await p.evaluate(() => {
  const prof = document.querySelector('#prof');
  if (prof && !prof.classList.contains('hidden')) {
    const skip = [...prof.querySelectorAll('button')].find(b => /not now|skip|later|close|back/i.test(b.textContent));
    if (skip) skip.click();
    else prof.classList.add('hidden');
  }
  const online = document.querySelector('#online');
  if (online) online.classList.add('hidden');
  const title = document.querySelector('#title');
  if (title) title.classList.remove('hidden');
});
await p.click('#title .mtabs button[data-tab="survival"]');
await p.click('#btnSurvival');
await p.waitForFunction(() => window.__atq && window.__atq.game && window.__atq.game.running && window.__atq.game.survival, null, { timeout: 180000 });
await p.waitForTimeout(2000);
const mid = await p.evaluate(() => {
  const g = window.__atq.game, I = g.input, dt = 1 / 60;
  g.paused = true; g.god = true; g.dlgCur = null; g.cut = null;
  for (let i = 0; i < 40; i++) g.skipLine && g.skipLine();
  const S = g.save;
  if (!S.owned.includes('rifle')) S.owned.push('rifle');
  g.equip('rifle', true);
  S.mags.rifle = 999; S.ammo.rifle = 999;
  I.btn.atk = true; I.atk = true; I.edge.atk = true;
  g.state.fireCd = 0; g.state.reload = 0;
  I.poll(dt); g.update(dt, dt);
  g.mT = 0.4; g.trT = 0.4;
  if (g.mLight) g.mLight.intensity = Math.max(g.mLight.intensity, 6);
  g.render(dt);
  return { survival: !!g.survival, cur: g.save.cur, flash: !!(g.muzzle && g.muzzle.visible), verHint: document.querySelector('#foot')?.textContent };
});
await shot('survival_midshot', 200);
rec('Survival running with rifle flash visible', mid.survival && mid.cur === 'rifle' && mid.flash, mid);

rec('no page errors', !errs.length, errs);
const all = res.every(Boolean);
console.log(all ? 'ALL PASS' : 'SOME FAILED');
console.log(JSON.stringify({ out: OUT, errs, mid, foot }, null, 2));
await b.close();
process.exit(all ? 0 : 1);
