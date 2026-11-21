// LIVE smoke (read-only: no town join, no leaderboard submit). usage: node tools/smoke_live.mjs <url> <outdir>
import { chromium } from 'playwright'; import fs from 'fs';
const URL = process.argv[2] || 'https://lonekeem.github.io/lonekeem-studios/', OUT = process.argv[3] || '/workspace/atq-menu-proof/live1929'; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await ctx.addInitScript(() => { if (sessionStorage.getItem('_i')) return; sessionStorage.setItem('_i', 1); localStorage.setItem('atq3.settings', JSON.stringify({ qual: 'low' })); localStorage.setItem('atq_prologue_seen', '1'); });
const p = await ctx.newPage(); p.setDefaultTimeout(180000); const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 200)));
const ok = []; const rec = (n, v, d) => { ok.push(v); console.log(v ? 'PASS' : 'FAIL', n, d ? JSON.stringify(d) : ''); };
await p.goto(URL + '?nc=' + Date.now(), { waitUntil: 'domcontentloaded' }); await p.click('#btnWarn'); await p.waitForTimeout(700); await p.click('#studio').catch(() => {}); await p.waitForSelector('#title:not(.hidden)');
await p.waitForTimeout(2500); await p.screenshot({ path: `${OUT}/live_menu.png` });
rec('footer', (await p.textContent('#foot')).startsWith('v1.9.29'), (await p.textContent('#foot')).slice(0, 30));
for (const t of ['story', 'survival', 'online', 'keem', 'settings']) { await p.click(`#title .mtabs button[data-tab="${t}"]`); await p.waitForTimeout(300); }
await p.click('#title .mtabs button[data-tab="online"]'); await p.click('#btnLobby'); await p.waitForSelector('#prof .welcome'); await p.waitForTimeout(1500);
await p.screenshot({ path: `${OUT}/live_online_welcome.png` });
rec('Online opens welcome (Google + Create profile)', await p.evaluate(() => { const t = document.querySelector('#prof .welcome').textContent; return /Google/.test(t) && /Create profile/.test(t); }));
await p.evaluate(() => [...document.querySelectorAll('#prof .welcome button')].find(b => b.textContent.trim().startsWith('Create profile')).click());
await p.waitForSelector('#prof canvas'); await p.waitForFunction(() => window.__profUI && window.__profUI.av(), null, { timeout: 120000 }); await p.waitForTimeout(4000);
await p.screenshot({ path: `${OUT}/live_creator.png` });
rec('creator model loaded', true);
rec('no page errors', errs.length === 0, [...new Set(errs)].slice(0, 5));
console.log(ok.every(Boolean) ? 'ALL PASS' : 'SOME FAIL'); await b.close();
