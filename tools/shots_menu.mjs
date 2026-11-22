// v1.9.28 menu/lobby/leaderboard: phone screenshots + every title button still opens its screen.
// usage: node tools/shots_menu.mjs <url> <outdir>
import { chromium } from 'playwright';
import fs from 'fs';
const URL = process.argv[2] || 'http://127.0.0.1:4188/'; const OUT = process.argv[3] || '/tmp/menu'; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
const res = []; const rec = (n, ok, d) => { res.push({ n, ok }); console.log(ok ? 'PASS' : 'FAIL', n, d ? JSON.stringify(d) : ''); };
async function page(w, h, { save = false, mock = false } = {}) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  await ctx.addInitScript(([save]) => { localStorage.setItem('atq3.settings', JSON.stringify({ qual: 'low' })); localStorage.setItem('atq_prologue_seen', '1'); localStorage.setItem('atq3.survBest', '12'); if (save && !localStorage.getItem('__seeded')) { localStorage.setItem('__seeded', '1'); } }, [save]);
  const p = await ctx.newPage(); p.setDefaultTimeout(90000); p.errs = []; p.on('pageerror', e => p.errs.push(e.message.slice(0, 200)));
  await p.goto(URL + (mock ? '?worldmock' : ''), { waitUntil: 'domcontentloaded' });
  await p.waitForSelector('#btnWarn', { timeout: 30000 }); await p.click('#btnWarn'); await p.waitForTimeout(700); await p.click('#studio').catch(() => {});
  await p.waitForSelector('#title:not(.hidden)', { timeout: 30000 }); await p.waitForTimeout(800);
  if (save) await p.evaluate(() => { const b = document.querySelector('#btnContinue'); b.classList.remove('hidden'); b.textContent = 'Continue · Chapter 3 · The Bridge'; });
  return p;
}
const tabs = ['story', 'survival', 'online'];
for (const [w, h, tag] of [[844, 390, 'iphone'], [667, 375, 'small'], [915, 412, 'android'], [1280, 720, 'desktop']].filter(s => !process.argv[4] || process.argv[4].split(',').includes(s[2]))) {
  const p = await page(w, h);
  for (const t of tabs) { await p.click({story:"#btnStory",survival:"#btnSurvival",online:"#btnOnline"}[t]); await p.waitForTimeout(250); await p.screenshot({ path: `${OUT}/menu_${tag}_${t}.png` }); }
  await p.click('#btnSettings'); await p.waitForTimeout(250); await p.screenshot({ path: `${OUT}/menu_${tag}_settings.png` });
  await p.click('#settings .back'); await p.waitForTimeout(200);
  // overlap / cutoff check on every visible menu button (Settings opens a screen, so skip it here)
  const bad = await p.evaluate(() => { const out = []; for (const t of ['story', 'survival', 'online']) { document.querySelector({story:'#btnStory',survival:'#btnSurvival',online:'#btnOnline'}[t]).click(); for (const el of document.querySelectorAll('#title .mm button')) { const r = el.getBoundingClientRect(); if (!r.width || el.id === 'btnPlay' || el.id === 'btnMP') continue; if (el.scrollWidth > el.clientWidth + 1) out.push(t + ':' + (el.id || el.textContent.trim()) + ' text cut'); if (r.right > innerWidth + 1 || r.bottom > innerHeight + 1 || r.left < -1 || r.top < -1) out.push(t + ':' + (el.id || el.textContent.trim()) + ' off-screen'); if (r.height < 32) out.push(t + ':' + (el.id || el.textContent.trim()) + ' small ' + r.height); } } return out; });
  rec(tag + ': menu buttons fit, no cut text, >=32px tall', !bad.length, bad);
  await p.close();
  const p2 = await page(w, h, { save: true }); await p2.click('#btnStory'); await p2.waitForTimeout(200); await p2.screenshot({ path: `${OUT}/menu_${tag}_continue.png` }); { const c = await p2.evaluate(() => { const e = document.querySelector('#btnContinue'); return { cut: e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 1, h: e.clientHeight }; }); rec(tag + ': Continue label fits', !c.cut, c); } await p2.close();
  // live online screens (real Supabase)
  const p3 = await page(w, h); await p3.click('#btnOnline'); await p3.click('#btnLobby'); await p3.waitForTimeout(2500);
  await p3.screenshot({ path: `${OUT}/lobby_${tag}_live.png` }); rec(tag + ': lobby/board visible on first open', await p3.evaluate(() => !!document.querySelector('#wRooms, #wRows') && !document.querySelector('#wWelNew')));
  rec(tag + ': live lobby connects', await p3.evaluate(() => document.querySelector('#wNet').textContent.includes('Online')), await p3.evaluate(() => document.querySelector('#wNet').textContent));
  await p3.click('#online .wseg button[data-t="board"]'); await p3.waitForTimeout(3000); await p3.screenshot({ path: `${OUT}/board_${tag}_live.png` });
  rec(tag + ': live leaderboard loads', await p3.evaluate(() => !!document.querySelector('#wRows .wtr, #wRows .wempty') && !/Can't load/.test(document.querySelector('#wRows').textContent)), await p3.evaluate(() => document.querySelector('#wRows').textContent.slice(0, 120)));
  await p3.close();
  // filled layouts (localhost-only mock data, same UI code)
  const p4 = await page(w, h, { mock: true }); await p4.click('#btnOnline'); await p4.click('#btnLobby'); await p4.waitForTimeout(1500); await p4.screenshot({ path: `${OUT}/lobby_${tag}_filled.png` });
  await p4.click('#online .wseg button[data-t="board"]'); await p4.waitForTimeout(800); await p4.screenshot({ path: `${OUT}/board_${tag}_filled.png` });
  const cut = await p4.evaluate(() => [...document.querySelectorAll('#online button')].filter(e => e.offsetParent && e.scrollWidth > e.clientWidth + 1).map(e => e.textContent.trim()));
  rec(tag + ': online buttons not cut', !cut.length, cut); await p4.close();
}
// every original title button still opens its screen
const p = await page(844, 390);
const map = [['story', '#btnChapters', '#chapters'], ['settings', '#btnArmory', '#shop'], ['online', '#btnCustom', '#custom'], ['settings', '#btnInvT', '#inv'], ['settings', '#btnControls', '#controls'], ['settings', '#btnCredits', '#credits']];
for (const [tab, btn, scr] of map) {
  await p.evaluate(() => { document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden')); document.querySelector('#title').classList.remove('hidden'); });
  if (tab === 'settings') await p.click('#btnSettings');
  else if (tab === 'online') await p.click('#btnOnline');
  else if (tab === 'story') await p.click('#btnStory');
  await p.click(btn); await p.waitForTimeout(400);
  const vis = await p.evaluate(s => { const v = [...document.querySelectorAll('.screen')].filter(e => !e.classList.contains('hidden')).map(e => e.id); return v; }, scr);
  rec(btn + ' opens ' + scr, vis.includes(scr.slice(1)), vis);
}
await p.evaluate(() => { document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden')); document.querySelector('#title').classList.remove('hidden'); });
await p.click('#btnSettings');
rec('Settings screen opens from the main list', await p.evaluate(() => !document.querySelector('#settings').classList.contains('hidden')));
await p.evaluate(() => { document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden')); document.querySelector('#title').classList.remove('hidden'); });
await p.click('#btnOnline'); await p.click('#btnLobby'); await p.waitForTimeout(800);
const practice = await p.$('#btnPractice'); rec('Practice Alone is in the World Lobby', !!practice && await practice.isVisible());
rec('no page errors', !p.errs.length, p.errs);
const ok = res.every(r => r.ok); console.log(ok ? 'ALL PASS' : 'SOME FAILED', res.filter(r => !r.ok).map(r => r.n)); await b.close();
