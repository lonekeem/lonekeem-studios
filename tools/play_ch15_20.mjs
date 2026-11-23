// Playthrough for chapters 15-20. usage: node tools/play_ch15_20.mjs <url> <outDir> <firstStepId> [shotEveryLoop]
// Boots ?step=<index of firstStepId>&god, then drives the chapter: skips dialogue, uses the next USE point, clears enemies,
// walks to waypoints, and screenshots each new step plus mid-step frames, until the end card shows.
import { chromium } from 'playwright';
import fs from 'fs';
const URL = process.argv[2] || 'http://127.0.0.1:4415/';
const OUT = process.argv[3] || '/workspace/atq-ch15-20-proof';
const FIRST = process.argv[4] || 'c15_dock';
const FAST = process.argv[5] === 'fast'; const CINE = process.argv[5] === 'cine'; let lastTxt = '', nl = 0;
fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await ctx.addInitScript(() => { localStorage.setItem('atq3.settings', JSON.stringify({ qual: 'low', gore: true, voices: true, lang: 'explicit' })); localStorage.setItem('atq_prologue_seen', '1'); localStorage.setItem('atq_age_ok', '1'); });
const p = await ctx.newPage();
const errs = [], nf = [];
p.on('pageerror', e => errs.push(String(e.message || e)));
p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
p.on('response', r => { if (r.status() === 404) nf.push(r.url()); });
const shot = async (n) => { await p.screenshot({ path: `${OUT}/${n}.png`, timeout: 120000 }); console.log('SHOT', n); };
const tick = (n = 30, dt = 1 / 30) => p.evaluate(([n, dt]) => { const g = window.__atq.game; const was = g.paused; g.paused = true; for (let i = 0; i < n; i++) { try { g.update(dt, dt); } catch (e) { console.error('tick ' + e.message); } } g.paused = was; }, [n, dt]);
await p.goto(URL + '?step=0&god', { waitUntil: 'load', timeout: 120000 });
await p.waitForFunction(() => window.__atq && window.__atq.game && window.__atq.game.running, null, { timeout: 180000 });
const idx = await p.evaluate((id) => window.__atq.story.findIndex(s => s.id === id), FIRST);
console.log('first index', FIRST, idx);
await p.goto(URL + `?step=${idx}&god`, { waitUntil: 'load', timeout: 120000 });
await p.waitForFunction(() => window.__atq && window.__atq.game && window.__atq.game.running, null, { timeout: 180000 });
await p.waitForTimeout(1500);
const foot = await p.evaluate(() => document.querySelector('#foot')?.textContent || '');
console.log('FOOT', foot);
let last = null, stuck = 0, lines = [];
for (let i = 0; i < 160; i++) {
  // let a few dialogue lines show on screen (mid-cutscene proof), then skip
  const st = await p.evaluate(() => { const g = window.__atq.game, s = window.__atq.story[g.step]; return { id: s && s.id, dlg: !!g.dlgCur, txt: g.dlgCur && g.dlgCur.text ? (g.dlgCur.who + ': ' + g.dlgCur.text) : '', cut: !!g.cut }; });
  if (st.txt) lines.push(st.id + ' | ' + st.txt);
  if (CINE && st.txt && st.txt !== lastTxt) { lastTxt = st.txt; await tick(20); await p.evaluate(() => { const g = window.__atq.game; if (g.cut && g.cut.cam) { g.camera.position.copy(g.cut.cam); g._lk = g.cut.look.clone(); } }); await p.waitForTimeout(700); await shot(`L${String(nl++).padStart(3, '0')}_${st.id}`); }
  if (st.id !== last) { await tick(20); await shot(`${String(i).padStart(3, '0')}_${st.id}_start`); }
  else if (!FAST && i % 6 === 0) await shot(`${String(i).padStart(3, '0')}_${st.id}_mid`);
  const inf = await p.evaluate(() => {
    const g = window.__atq.game; g.hp = g.maxHp = 9999; g.god = true; g.grace = 2;
    if (g.dlgCur || (g.dlgQ && g.dlgQ.length)) { g.skipLine && g.skipLine(); }
    const D = g.stepData || {};
    if (D.uses && D.uses.length && !g.dlgCur) { const u = D.uses.find(x => !/chicken|lever/i.test(x.label || '')) || null; if (u && u.fn) { g.player.root.position.x = u.x; g.player.root.position.z = u.z + .4; try { u.fn(g); } catch (e) { console.error('use ' + e.message); } } }
    if (D.ht != null && !D.held) D.ht += 4; // fast-forward holds
    const A = g.alive ? g.alive() : []; const dir = { x: 0, y: 0, z: 1, clone() { return this; }, normalize() { return this; } };
    if (!g.dlgCur) A.forEach(z => { if (z.ally) return; try { g.damageZ(z, z.boss ? z.maxHp * .34 : 1e7, dir, { head: true, boom: true }); } catch (e) {} });
    if (g.wpTarget && !g.cut) g.player.root.position.set(g.wpTarget[0], 0, g.wpTarget[2]);
    const ending = !document.querySelector('#ending')?.classList.contains('hidden'); const s = window.__atq.story[g.step];
    return { step: g.step, id: s && s.id, ending, obj: document.querySelector('#objt')?.textContent, alive: g.alive().length };
  });
  await tick(30);
  if (inf.ending) { await p.waitForTimeout(600); await shot(`${String(i).padStart(3, '0')}_end_card`); console.log('ENDING', inf); break; }
  if (/Boss down/.test(inf.obj || '')) await p.waitForTimeout(1200); // afterBoss runs on real-time setInterval
  if (inf.id === last) stuck++; else stuck = 0; last = inf.id;
  if (stuck > 70) { console.log('STUCK', inf); await shot(`${String(i).padStart(3, '0')}_STUCK_${inf.id}`); break; }
}
const endTxt = await p.evaluate(() => ({ h: document.querySelector('#endH')?.textContent, q: document.querySelector('#endQ')?.textContent, n: document.querySelector('#endNext')?.textContent }));
console.log('END', JSON.stringify(endTxt));
fs.writeFileSync(`${OUT}/lines_${FIRST}.txt`, [...new Set(lines)].join('\n'));
console.log('ERRORS', errs.length, JSON.stringify(errs.slice(0, 12)));
console.log('404s', nf.length, JSON.stringify(nf.slice(0, 12)));
await b.close();
