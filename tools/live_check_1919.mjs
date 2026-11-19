// Live check for v1.9.19 (chapters 12+13): story loads, ch11 -> ch12 flow, checkpoints 55-64 with voice fetches, ch13 end card. usage: node tools/live_check_1919.mjs <url> <outdir>
import { chromium } from 'playwright'; import fs from 'fs';
const URL = process.argv[2] || 'https://lonekeem.github.io/lonekeem-studios/', OUT = process.argv[3] || '/workspace/live1919'; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
const opts = { viewport: { width: 844, height: 390 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true };
const log = (...a) => console.log(...a);
async function page(n) { const ctx = await b.newContext(opts); await ctx.addInitScript(() => localStorage.setItem('atq3.settings', JSON.stringify({ qual: 'low', gore: true }))); const p = await ctx.newPage(); p.errs = []; p.v = [];
  p.on('pageerror', e => p.errs.push('PAGEERR ' + e.message.slice(0, 160))); p.on('console', m => { if (m.type() === 'error') p.errs.push('CONSOLE ' + m.text().slice(0, 160)); });
  p.on('response', r => { const u = r.url(); if (/\/sfx\/v\//.test(u)) p.v.push([r.status(), u.split('/').pop()]); }); p.on('dialog', d => d.accept()); return p; }
const ready = p => p.waitForFunction(() => window.__atq && window.__atq.game && window.__atq.game.running, null, { timeout: 120000 });
// 1. story New Game
{ const p = await page('s'); await p.goto(URL); await p.waitForSelector('#btnWarn'); await p.click('#btnWarn'); await p.waitForTimeout(800); await p.screenshot({ path: OUT + '/01_title.png' });
  log('foot:', await p.evaluate(() => document.querySelector('#foot')?.textContent)); await p.click('#btnNew'); await ready(p); await p.waitForTimeout(5000); await p.screenshot({ path: OUT + '/02_story_new_game.png' }); log('story new game: errors', JSON.stringify(p.errs)); await p.context().close(); }
// 2. ch11 ending -> ch12 (real UI continue button)
{ const p = await page('c'); await p.goto(URL + '?step=54&god'); await ready(p); await p.waitForTimeout(3000);
  for (let i = 0; i < 12; i++) { await p.evaluate(() => { const g = window.__atq.game; g.skipLine && g.skipLine(); }); await p.waitForTimeout(500); }
  await p.waitForSelector('#btnEndNext:visible', { timeout: 20000 }); await p.waitForTimeout(500); await p.screenshot({ path: OUT + '/03_ch11_end_card.png' });
  log('ch11 end card:', (await p.evaluate(() => document.querySelector('#endH').textContent + ' | ' + document.querySelector('#endNext').textContent + ' | btn: ' + document.querySelector('#btnEndNext').textContent)));
  await p.click('#btnEndNext'); await p.waitForTimeout(500);
  await p.waitForFunction(() => window.__atq.game.step === 55 && window.__atq.game.running, null, { timeout: 120000 }).catch(() => {}); await p.waitForTimeout(6000);
  const st = await p.evaluate(() => ({ step: window.__atq.game.step, obj: document.querySelector('#obj')?.textContent.replace(/\s+/g, ' ') })); log('after continue:', JSON.stringify(st)); await p.screenshot({ path: OUT + '/04_ch12_start.png' }); log('ch11->12 errors', JSON.stringify(p.errs), 'voice fetches', JSON.stringify(p.v)); await p.context().close(); }
// 3. checkpoints 55-64 (voices play, no skipping on the first 2 lines)
for (let st = 55; st <= 64; st++) { const p = await page('k'); await p.goto(URL + `?step=${st}&god`); await ready(p); await p.waitForTimeout(9000);
  const info = await p.evaluate(() => { const g = window.__atq.game; return { step: g.step, ch: g.save.ch, obj: document.querySelector('#obj')?.textContent.replace(/\s+/g, ' ').slice(0, 70), sub: document.querySelector('#sub, .subtitle, #speech')?.textContent?.slice(0, 60) }; });
  await p.screenshot({ path: `${OUT}/cp${st}.png` }); const bad = p.v.filter(x => x[0] !== 200); log(`cp${st}`, JSON.stringify(info), 'voice 200s:', p.v.filter(x => x[0] === 200).length, 'non-200:', JSON.stringify(bad), 'files:', p.v.map(x => x[1]).slice(0, 3).join(','), 'errors:', JSON.stringify(p.errs.slice(0, 2))); await p.context().close(); }
// 4. ch13 end card via the finale
{ const p = await page('e'); await p.goto(URL + '?step=64&god'); await ready(p); await p.waitForTimeout(3000);
  await p.evaluate(() => { const g = window.__atq.game; g.cut = null; g.player.root.position.set(3, 0, -3490.5); });
  await p.waitForTimeout(6000); await p.evaluate(() => { const g = window.__atq.game; g.cut = null; const u = g.stepData.uses && g.stepData.uses[0]; if (u) { g.player.root.position.set(3, 0, -3491); u.fn(g); } });
  await p.waitForTimeout(2000); await p.screenshot({ path: OUT + '/05_finale_start.png' });
  for (let i = 0; i < 40; i++) { await p.evaluate(() => { const g = window.__atq.game; g.skipLine && g.skipLine(); }); await p.waitForTimeout(700); if (await p.locator('#ending:visible').count()) break; }
  await p.waitForTimeout(2500); await p.screenshot({ path: OUT + '/06_ch13_end_card.png' });
  log('ch13 end card:', await p.evaluate(() => [document.querySelector('#endH').textContent, document.querySelector('#endQ').textContent, document.querySelector('#endNext').textContent, 'continue-btn hidden: ' + document.querySelector('#btnEndNext').classList.contains('hidden')].join(' | ')), 'errors', JSON.stringify(p.errs), 'voices', p.v.length); await p.context().close(); }
await b.close();
