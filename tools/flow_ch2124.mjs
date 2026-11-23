// Menus / settings / survival / shop / inventory / death sweep with real touch taps (local only; Supabase blocked, nothing posted).
import { chromium } from 'playwright'; import fs from 'fs';
const URL = process.env.URL || 'http://127.0.0.1:4471/', OUT = process.env.OUT || '/workspace/atq-ch2124-proof/flow'; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--autoplay-policy=no-user-gesture-required', '--enable-precise-memory-info', '--js-flags=--expose-gc'] });
const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await ctx.route(/supabase\.co/, r => r.abort());
await ctx.addInitScript(() => { if (!localStorage.getItem('atq3.settings')) localStorage.setItem('atq3.settings', JSON.stringify({ qual: 'low', gore: true, voices: true })); localStorage.setItem('atq_prologue_seen', '1'); localStorage.setItem('atq.gate', JSON.stringify({ birthYear: 1990, agreedVersion: 1 }));
  if (!localStorage.getItem('atq3_save')) localStorage.setItem('atq3_save', JSON.stringify({ v: 3, maxCh: 21, done: true, done2: true, step: 0, cash: 5000, played: true })); });
const p = await ctx.newPage(); p.setDefaultTimeout(120000); const errs = [], nf = [], log = [];
p.on('pageerror', e => errs.push('PE ' + String(e.stack || e.message || e).slice(0, 500))); p.on('console', m => { if (m.type() === 'error' && !/supabase|ERR_FAILED|Failed to load resource/i.test(m.text())) errs.push(m.text().slice(0, 400)); });
p.on('response', r => { if (r.status() >= 400) nf.push(r.status() + ' ' + r.url()); });
await p.goto(URL, { waitUntil: 'domcontentloaded' });
for (let i = 0; i < 80; i++) { const r = await p.evaluate(() => { const s = document.getElementById('gateSkip'); if (s && s.offsetParent) { s.click(); return ''; } const w = document.getElementById('btnWarn'); if (w && w.offsetParent) { w.click(); return ''; } const t = document.getElementById('title'); const l = document.getElementById('loading'); return t && !t.classList.contains('hidden') && (!l || l.classList.contains('hidden')) ? 'ok' : ''; }); if (r) break; await p.waitForTimeout(500); }
const step = async (name, fn) => { const e0 = errs.length; try { await fn(); log.push([name, 'ok', errs.slice(e0)]); } catch (e) { log.push([name, 'FAIL ' + String(e.message).slice(0, 250), errs.slice(e0)]); await p.screenshot({ path: `${OUT}/FAIL-${name}.png` }).catch(() => {}); } console.log(JSON.stringify(log[log.length - 1])); };
async function tap(sel, nth = 0) { await p.waitForFunction(() => { const l = document.getElementById('loading'); return !l || l.classList.contains('hidden'); }, null, { timeout: 180000 });
  await p.waitForFunction(([s, n]) => { const e = [...document.querySelectorAll(s)].filter(e => e.offsetParent && e.getBoundingClientRect().width > 0)[n]; return !!e; }, [sel, nth], { timeout: 20000 });
  const q = await p.evaluate(([s, n]) => { const e = [...document.querySelectorAll(s)].filter(e => e.offsetParent && e.getBoundingClientRect().width > 0)[n]; e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2; const h = document.elementFromPoint(x, y); return { x, y, ok: h === e || e.contains(h), hit: h && (h.id || String(h.className) || h.tagName) }; }, [sel, nth]);
  if (!q.ok) throw new Error(`tap ${sel} blocked by ${q.hit}`); await p.touchscreen.tap(q.x, q.y); await p.waitForTimeout(350); }
const shown = id => p.evaluate(id => { const e = document.getElementById(id); return !!e && !e.classList.contains('hidden') && getComputedStyle(e).display !== 'none'; }, id);
const must = async (id, want = true) => { for (let i = 0; i < 30; i++) { if (await shown(id) === want) return; await p.waitForTimeout(200); } throw new Error(`#${id} ${want ? 'not shown' : 'still shown'}`); };
const back = async id => { await tap(`#${id} .back, #${id} .back2`); await must(id, false); await must('title'); };
const shot = n => p.screenshot({ path: `${OUT}/${n}.png` });
// Chapters 21-24: chapter select + unlock, start each chapter from the menu with real taps, voices play, quit stops audio, mode switching
const st = () => p.evaluate(() => { const g = window.__atq.game, a = g && g.audio, s = g && window.__atq.story[g.step]; return { state: window.__atq.state, id: s && s.id, ch: s && s.ch, voice: !!(a && a.ctx && a.ctx.currentTime < (a.vEnd || 0)), vs: !!(a && a.vSrc), vEnd: a && a.vEnd, now: a && a.ctx && a.ctx.currentTime, sv: a && a.s && a.s.voices, ctx: a && a.ctx && a.ctx.state, dlg: !!(g && g.dlgCur) }; });
const vreq = []; p.on('response', r => { if (/\/sfx\/v\/[0-9a-z]+\.mp3/.test(r.url())) vreq.push(r.status()); });
const toTitle = async () => { if (await shown('title')) return; if (await shown('ending')) { await tap('#ending .back, #btnEndTitle, #btnEndMenu').catch(() => {}); } if (!(await shown('title'))) { await tap('#btnPause'); await tap('#btnQuit'); } await must('title'); };
const openCh = async () => { if (!(await p.evaluate(() => !!document.querySelector('#btnChapters')?.offsetParent))) await tap('#btnStory'); await tap('#btnChapters'); await must('chapters'); };
const enabled = () => p.evaluate(() => [21, 22, 23, 24].map(c => { const b = document.getElementById('btnCh' + c); return b ? (b.disabled ? 0 : 1) : -1; }));
const unlock = (n) => p.evaluate((n) => { const k = 'atq3_save'; const s = JSON.parse(localStorage.getItem(k)); s.maxCh = n; localStorage.setItem(k, JSON.stringify(s)); }, n);
await step('tut-offer-skip', async () => { if (await p.evaluate(() => !!document.querySelector('#tutSkip')?.offsetParent)) { await tap('#tutSkip'); if (await p.evaluate(() => !!document.querySelector('#tutSkip')?.offsetParent)) throw new Error('tutorial offer did not close'); } });
await step('select-locked', async () => { await openCh(); const e = await enabled(); log.push(['enabled@21', e]); await shot('20-chapters-21'); if (e.join() !== '1,0,0,0') throw new Error('unlock state ' + e); await tap('#chapters .back, #chapters .back2'); await must('title'); });
for (const c of [21, 22, 23, 24]) {
  await step('play-ch' + c, async () => { await unlock(c); await openCh(); const v0 = (await st()).vEnd || 0; await tap('#btnCh' + c); await p.waitForFunction(() => window.__atq.state === 'play' && window.__atq.game.running, null, { timeout: 240000 });
    let s0 = await st(), heard = false; for (let i = 0; i < 24 && !heard; i++) { const s = await st(); if (s.voice || (s.vEnd || 0) > v0) heard = true; s0 = s; if (!heard) await p.waitForTimeout(500); }
    await shot(`3${c - 20}-ch${c}-start`); log.push(['ch' + c, s0, 'voice', heard]);
    await tap('#btnPause'); await must('pause'); await tap('#btnQuit'); await must('title'); await p.waitForTimeout(400); const s1 = await st(); log.push(['after-quit', s1]); if (s0.ch !== c) throw new Error('wrong chapter ' + JSON.stringify(s0)); if (!heard) throw new Error('no voice heard'); if (s1.vs) throw new Error('voice source still live after quit'); });
}
await step('ending-unlocks-next', async () => { await unlock(21); await openCh(); await tap('#btnCh21'); await p.waitForFunction(() => window.__atq.state === 'play' && window.__atq.game.running, null, { timeout: 240000 });
  await p.evaluate(() => window.__atq.game.onComplete(21)); await must('ending'); const t = await p.evaluate(() => document.getElementById('endNext').textContent); log.push(['end21', t]); await shot('40-end21');
  const sv = await p.evaluate(() => JSON.parse(localStorage.getItem('atq3_save'))); if (sv.maxCh < 22) throw new Error('maxCh not 22: ' + sv.maxCh);
  await tap('#btnEndNext'); await p.waitForFunction(() => window.__atq.state === 'play' && window.__atq.game.running && window.__atq.story[window.__atq.game.step].ch === 22, null, { timeout: 240000 }); await shot('41-continue22');
  await tap('#btnPause'); await tap('#btnQuit'); await must('title'); await openCh(); const e = await enabled(); log.push(['enabled@22', e]); if (e.join() !== '1,1,0,0') throw new Error('unlock ' + e); await tap('#chapters .back, #chapters .back2'); await must('title'); });
await step('mode-switch', async () => { await unlock(24); for (const [what, sel] of [['ch24', '#btnCh24'], ['survival', '#btnSurvival'], ['ch22', '#btnCh22'], ['ch1', '#btnCh1'], ['ch23', '#btnCh23']]) {
    if (/Ch/.test(sel)) await openCh(); else if (!(await p.evaluate(() => !!document.querySelector('#btnSurvival')?.offsetParent))) await tap('#btnStory'); await tap(sel); await p.waitForFunction(() => window.__atq.state === 'play' && window.__atq.game.running, null, { timeout: 240000 }); await p.waitForTimeout(1500);
    const s = await st(); log.push(['switch', what, s.id]); const want = { ch24: 24, ch22: 22, ch1: 1, ch23: 23 }[what]; if (want && s.ch !== want && !(want === 1 && (s.ch || 1) === 1)) throw new Error(what + ' loaded ' + JSON.stringify(s));
    await tap('#btnPause'); await tap('#btnQuit'); await must('title'); } await shot('50-after-switches'); });
const okv = vreq.filter(x => x === 200 || x === 206).length; log.push(['voice-requests', vreq.length, 'ok', okv]);
fs.writeFileSync(`${OUT}/flow.json`, JSON.stringify({ log, errs: [...new Set(errs)], bad: [...new Set(nf)] }, null, 1));
for (const l of log) console.log(JSON.stringify(l).slice(0, 300)); console.log('ERRS', JSON.stringify([...new Set(errs)].slice(0, 10)), 'BAD', JSON.stringify([...new Set(nf)].slice(0, 10))); await b.close();
