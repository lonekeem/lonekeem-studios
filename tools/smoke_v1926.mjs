// v1.9.26 smoke: footer, New Game -> opening cutscene plays (audio + subtitles) -> tap-twice skip -> Chapter 1;
// every story step loads (chapters 1-13); zombie voice files return 200; no page/console errors.
// usage: node tools/smoke_v1926.mjs <url> <outdir>
import { chromium } from 'playwright';
import fs from 'fs';
const URL = process.argv[2] || 'http://127.0.0.1:4173/';
const OUT = process.argv[3] || '/tmp/v1926';
fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
const res = []; const rec = (n, ok, d) => { res.push({ n, ok, d }); console.log(ok ? 'PASS' : 'FAIL', n, JSON.stringify(d)); };
const ctx = await b.newContext({ viewport: { width: 1280, height: 720 }, hasTouch: true });
await ctx.addInitScript(() => localStorage.setItem('atq3.settings', JSON.stringify({ qual: 'low', gore: true, hints: false })));
const p = await ctx.newPage(); const errs = [];
p.on('pageerror', e => errs.push(e.message.slice(0, 200)));
p.on('console', m => { if (m.type() === 'error' && !/supabase|WebSocket/.test(m.text())) errs.push(m.text().slice(0, 200)); });
p.on('response', r => { if (r.status() >= 400) errs.push('HTTP ' + r.status() + ' ' + r.url()); });
await p.goto(URL, { waitUntil: 'domcontentloaded' });
await p.waitForSelector('#btnWarn');
const foot = await p.evaluate(() => document.querySelector('#foot')?.textContent || '');
rec('footer is v1.9.26', /v1\.9\.26/.test(foot), { foot });
await p.click('#btnWarn');
await p.waitForSelector('#studio:not(.hidden)', { timeout: 15000 }).catch(() => {});
await p.waitForTimeout(800); await p.click('#studio').catch(() => {});
await p.waitForSelector('#btnNew', { state: 'visible', timeout: 15000 });
await p.click('#btnNew');
await p.waitForFunction(() => window.__atq.game && window.__atq.game.pro, null, { timeout: 180000, polling: 250 });
await p.waitForTimeout(5000);
const pl = await p.evaluate(() => { const g = window.__atq.game; const c = document.querySelector('#cine'); return { t: +g.pro.t.toFixed(2), cine: document.body.classList.contains('cine'), overlay: !!c && getComputedStyle(c).display !== 'none', sub: (c?.querySelector('.cap')?.textContent || c?.innerText || '').slice(0, 120), hud: getComputedStyle(document.getElementById('hud')).display, ctx: window.__atq.audio.ctx?.state, faceActive: !!(g.dlgFace && g.dlgFace.active), noFace: !!(g.cut && g.cut.noFace) }; });
await p.screenshot({ path: `${OUT}/1_prologue_playing.png` });
rec('New Game plays the prologue (time advancing, letterbox, captions)', pl.t > 1 && pl.cine && pl.overlay && !pl.faceActive && pl.noFace, pl);
await p.mouse.click(640, 360); await p.waitForTimeout(200);
const armed = await p.evaluate(() => document.querySelector('#cine .hint')?.classList.contains('on'));
await p.mouse.click(640, 360);
await p.waitForFunction(() => !window.__atq.game.pro, null, { timeout: 10000 }).catch(() => {});
await p.waitForTimeout(2500);
const after = await p.evaluate(() => { const g = window.__atq.game; return { pro: !!g.pro, step: g.step, ch: g.save.ch, running: g.running, cine: document.body.classList.contains('cine'), hud: getComputedStyle(document.getElementById('hud')).display, dlg: g.dlgCur && g.dlgCur.text }; });
await p.screenshot({ path: `${OUT}/2_after_skip_ch1.png` });
rec('tap twice skips into Chapter 1', armed && !after.pro && after.step === 0 && after.ch === 1 && !after.cine && after.hud !== 'none', { armed, ...after });
// every story step loads
const steps = await p.evaluate(async () => { const g = window.__atq.game; g.running = false; g.god = true; const out = []; for (let i = 0; i < 400; i++) { try { g.loadStep(i); } catch (e) { if (/undefined|null/.test(e.message) && i > 30) break; out.push({ i, err: e.message }); continue; } for (let k = 0; k < 10; k++) g.update(1 / 30, 1 / 30); g.render(.03); out.push({ i, ch: g.save.ch }); await new Promise(r => setTimeout(r, 0)); } return out; });
const chs = [...new Set(steps.filter(s => s.ch).map(s => s.ch))].sort((a, b) => a - b), bad = steps.filter(s => s.err);
rec('all story steps load (chapters)', !bad.length && chs.includes(1) && chs.includes(13), { steps: steps.filter(s => !s.err).length, chapters: chs, bad: bad.slice(0, 3) });
await p.screenshot({ path: `${OUT}/3_last_step.png` });
// zombie voice assets
const zvo = await p.evaluate(async () => { const n = ['zvo_male_idle1', 'zvo_female_attack1', 'zvo_brute_death1', 'zvo_teen_m_idle1', 'zvo_gurgler_hurt1']; const r = {}; for (const f of n) { const x = await fetch('sfx/' + f + '.mp3'); r[f] = x.status + ' ' + (x.headers.get('content-type') || ''); } const pr = await fetch('music/atq-prologue.mp3'); r.prologue = pr.status; return r; });
rec('zvo + prologue audio return 200', Object.values(zvo).every(v => String(v).startsWith('200')), zvo);
rec('no page or console errors', !errs.length, errs.slice(0, 8));
fs.writeFileSync(`${OUT}/smoke.json`, JSON.stringify(res, null, 2));
await b.close(); process.exit(res.some(r => !r.ok) ? 1 : 0);
