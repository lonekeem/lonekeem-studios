// In-game proof: pick options on My Character, save, open Multiplayer, Save & enter the town, screenshot the local player + HUD cash; also story Keem.
import { chromium } from 'playwright';
const PORT = process.env.PORT || 4191, OUT = process.env.OUT || '/workspace/atq-custom-proof'; const picks = JSON.parse(process.argv[2] || '[]'), tag = process.argv[3] || 'town';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1 });
await ctx.addInitScript(() => { if (sessionStorage.getItem('_init')) return; sessionStorage.setItem('_init', 1); localStorage.setItem('atq3.settings', JSON.stringify({ qual: 'low', gore: true })); localStorage.setItem('atq_prologue_seen', '1');
  localStorage.setItem('atq3_save', JSON.stringify({ v: 3, step: 3, cash: 5000, xp: 0, level: 6, owned: ['fists'], outfits: ['classic'] })); });
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
await p.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load' }); await p.waitForTimeout(1500);
await p.evaluate(() => document.querySelector('#btnCustom').click()); await p.waitForFunction(() => document.querySelector('#cList button'), null, { timeout: 120000 });
for (const [t, c] of picks) { await p.evaluate(([t, c]) => { [...document.querySelectorAll('#cTabs button')].find(b => b.textContent === t).click(); [...document.querySelectorAll('#cList button')].find(b => b.innerHTML.includes(c)).click(); }, [t, c]); await p.waitForTimeout(600); }
await p.waitForTimeout(2000); await (await p.$('#cPrev')).screenshot({ path: `${OUT}/${tag}_preview.png` });
await p.evaluate(() => document.querySelector('#cSave').click()); await p.waitForTimeout(500);
await p.evaluate(() => document.querySelector('#btnMP').click()); await p.waitForFunction(() => window.__mpCreator, null, { timeout: 120000 }); await p.waitForTimeout(2500);
await p.screenshot({ path: `${OUT}/${tag}_mpcreator.png` });
await p.evaluate(() => [...document.querySelectorAll('#mpc button')].find(b => b.textContent === 'Save & enter').click());
await p.waitForFunction(() => window.__mpTown && window.__mpTown.me && window.__mpTown.me.av, null, { timeout: 180000 }); await p.waitForTimeout(6000);
await p.screenshot({ path: `${OUT}/${tag}_ingame_back.png` });
await p.evaluate(() => { const T = window.__mpTown; T.setCam && T.setCam(Math.PI + (T.me.ry || 0), 0.15, 2.6); }); await p.waitForTimeout(2500);
await p.screenshot({ path: `${OUT}/${tag}_ingame_front.png` });
console.log('hud', await p.evaluate(() => document.querySelector('#hpTxt')?.textContent), 'save cash', await p.evaluate(() => window.__atq.save.cash));
await p.evaluate(() => { window.__mpTown.bag.add('cash', 25); }); await p.waitForTimeout(1200);
console.log('after +25 in town: save cash', await p.evaluate(() => [window.__atq.save.cash, JSON.parse(localStorage.getItem('atq3_save')).cash]));
console.log('errors:', errs.slice(0, 6)); await b.close();
