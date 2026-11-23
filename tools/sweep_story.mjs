// Full story sweep (local only): starts each chapter from the real Chapter Select menu with touch taps, drives it to the end card
// (skips lines, uses USE points, clears enemies, walks to waypoints), then returns to the title via the end card / pause menu.
// usage: CH=1-10 URL=http://127.0.0.1:5495/ OUT=/workspace/atq-sweep-proof/story node tools/sweep_story.mjs
import { chromium } from 'playwright'; import fs from 'fs';
const URL = process.env.URL || 'http://127.0.0.1:5495/', OUT = process.env.OUT || '/workspace/atq-sweep-proof/story'; fs.mkdirSync(OUT, { recursive: true });
const [c0, c1] = (process.env.CH || '1-20').split('-').map(Number);
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--autoplay-policy=no-user-gesture-required', '--enable-precise-memory-info', '--js-flags=--expose-gc'] });
const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await ctx.route(/supabase\.co/, r => r.abort());
await ctx.addInitScript(() => { if (!localStorage.getItem('atq3.settings')) localStorage.setItem('atq3.settings', JSON.stringify({ qual: 'low', gore: true, voices: true })); localStorage.setItem('atq_prologue_seen', '1'); localStorage.setItem('atq.tut.seen', '1'); localStorage.setItem('atq.gate', JSON.stringify({ birthYear: 1990, agreedVersion: 1 }));
  if (!localStorage.getItem('atq3_save')) localStorage.setItem('atq3_save', JSON.stringify({ v: 3, maxCh: 20, done: true, done2: true, step: 0, cash: 100, played: true }));
  const ce = console.error; console.error = (...a) => { try { for (const x of a) if (x && x.stack) ce.call(console, 'STACK ' + x.stack.split('\n').slice(0, 4).join(' | ')); } catch (e) {} ce.apply(console, a); }; });
const p = await ctx.newPage(); p.setDefaultTimeout(180000); let errs = [], nf = [];
p.on('pageerror', e => errs.push('PE ' + String(e.message || e).slice(0, 300))); p.on('console', m => { if (m.type() === 'error' && !/supabase|ERR_FAILED|Failed to load resource/i.test(m.text())) errs.push(m.text().slice(0, 400)); });
p.on('response', r => { if (r.status() >= 400) nf.push(r.status() + ' ' + r.url()); });
await p.goto(URL, { waitUntil: 'domcontentloaded' });
for (let i = 0; i < 80; i++) { const r = await p.evaluate(() => { const s = document.getElementById('gateSkip'); if (s && s.offsetParent) { s.click(); return ''; } const w = document.getElementById('btnWarn'); if (w && w.offsetParent) { w.click(); return ''; } const t = document.getElementById('title'); const l = document.getElementById('loading'); return t && !t.classList.contains('hidden') && (!l || l.classList.contains('hidden')) ? 'ok' : ''; }); if (r) break; await p.waitForTimeout(500); }
const vis = s => p.evaluate(s => { const e = document.querySelector(s); return !!(e && e.offsetParent && e.getBoundingClientRect().width > 0); }, s);
async function tap(sel) { await p.waitForFunction(() => { const l = document.getElementById('loading'); return !l || l.classList.contains('hidden'); }, null, { timeout: 180000 }); await p.waitForFunction(s => { const e = document.querySelector(s); return e && e.offsetParent && e.getBoundingClientRect().width > 0; }, sel, { timeout: 30000 });
  const q = await p.evaluate(s => { const e = document.querySelector(s); e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2; const h = document.elementFromPoint(x, y); return { x, y, ok: h === e || e.contains(h), hit: h && (h.id || String(h.className) || h.tagName) }; }, sel);
  if (!q.ok) throw new Error(`tap ${sel} blocked by ${q.hit}`); await p.touchscreen.tap(q.x, q.y); }
const tick = (n = 30, dt = 1 / 30) => p.evaluate(([n, dt]) => { const g = window.__atq.game; const was = g.paused; g.paused = true; for (let i = 0; i < n; i++) { try { g.update(dt, dt); } catch (e) { console.error('tick ' + e.message); break; } } g.paused = was; }, [n, dt]);
const heap = () => p.evaluate(() => { try { window.gc && window.gc(); } catch (e) {} return performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null; });
const R = [];
const LIST = process.env.LIST ? process.env.LIST.split(',').map(Number) : Array.from({ length: c1 - c0 + 1 }, (_, i) => c0 + i);
for (const c of LIST) { errs = []; nf = []; const t0 = Date.now(); const rec = { ch: c };
  try {
    if (!(await vis('#btnChapters'))) await tap('#btnStory'); await tap('#btnChapters'); await tap('#btnCh' + c);
    await p.waitForFunction(() => window.__atq.state === 'play' && window.__atq.game && window.__atq.game.running, null, { timeout: 240000 });
    rec.loadS = Math.round((Date.now() - t0) / 1000); rec.first = await p.evaluate(() => { const g = window.__atq.game; return window.__atq.story[g.step] && window.__atq.story[g.step].id; });
    await p.waitForTimeout(1200); await p.screenshot({ path: `${OUT}/ch${String(c).padStart(2, '0')}-start.png` });
    let last = null, stuck = 0, steps = [], tS = Date.now();
    for (let i = 0; i < 900; i++) {
      const inf = await p.evaluate(() => { const g = window.__atq.game; g.hp = g.maxHp = 9999; g.god = true; g.grace = 2;
        if (g.dlgCur || (g.dlgQ && g.dlgQ.length)) { g.skipLine && g.skipLine(); }
        g.__sw = (g.__sw || 0) + 1; if (!g.dlgCur && !g.cut && g.__sw % 3 === 0) { try { g.skipObjective(); } catch (e) { console.error('skip ' + (e.stack || e.message)); } }
        if (g.wpTarget && !g.cut) g.player.root.position.set(g.wpTarget[0], 0, g.wpTarget[2]);
        const ending = !document.querySelector('#ending')?.classList.contains('hidden'); const s = window.__atq.story[g.step];
        return { step: g.step, id: s && s.id, ending, obj: document.querySelector('#objt')?.textContent, alive: g.alive().length, state: window.__atq.state }; });
      await tick(30); await p.waitForTimeout(250);
      const occ = await p.evaluate(async () => { const g = window.__atq.game; if (!g.cut || !g.cut.cam) return null; if (!window.__T3) window.__T3 = await import('/node_modules/three/build/three.module.js');
        const c = g.camera, P = c.position.clone(), L = g.cut.look || g._lk; if (!L) return null; const d = L.clone().sub(P); const len = d.length(); if (len < 1.5) return null; d.normalize();
        const rc = new window.__T3.Raycaster(P, d, 0, len - .8); rc.camera = c; const h = rc.intersectObjects(g.scene.children, true).filter(x => x.object.visible && x.object.type === 'Mesh' && !x.object.material.transparent && !x.object.isSkinnedMesh);
        let vis = true; for (let o = h[0] && h[0].object; o; o = o.parent) if (!o.visible) vis = false;
        if (h.length && h[0].distance < 1.2 && vis) { const gp = h[0].object.geometry.parameters; return { cam: P.toArray().map(v => +v.toFixed(2)), look: L.toArray().map(v => +v.toFixed(2)), hit: +h[0].distance.toFixed(2), geo: gp ? JSON.stringify(gp).slice(0, 80) : h[0].object.geometry.type, at: h[0].object.getWorldPosition(new window.__T3.Vector3()).toArray().map(v => +v.toFixed(1)) }; } return null; });
      if (occ) { const key = occ.cam.join(','); if (!rec.occ) rec.occ = {}; if (!rec.occ[key]) { rec.occ[key] = { step: inf.id, ...occ }; await p.screenshot({ path: `${OUT}/occ-ch${c}-${inf.id}-${Object.keys(rec.occ).length}.png` }); } }
      if (inf.ending) { rec.ending = true; break; }
      if (inf.state === 'dead') { rec.died = inf.id; break; }
      if (/Boss down/.test(inf.obj || '')) await p.waitForTimeout(1200);
      if (inf.id !== last) steps.push(inf.id);
      if (inf.id !== last) tS = Date.now(); last = inf.id;
      if (Date.now() - tS > 45000) { rec.stuck = inf; await p.screenshot({ path: `${OUT}/ch${String(c).padStart(2, '0')}-STUCK.png` }); break; }
    }
    rec.steps = steps.length; rec.lastStep = last;
    await p.waitForTimeout(700); await p.screenshot({ path: `${OUT}/ch${String(c).padStart(2, '0')}-end.png` });
    if (rec.ending) { rec.endH = await p.evaluate(() => document.querySelector('#endH')?.textContent); await tap('#btnEndTitle'); }
    else { await tap('#btnPause'); await p.waitForFunction(() => window.__atq.state === 'paused', null, { timeout: 15000 }); await tap('#btnQuit'); }
    await p.waitForFunction(() => !document.querySelector('#title').classList.contains('hidden'), null, { timeout: 20000 });
  } catch (e) { rec.fail = String(e.message || e).slice(0, 300); await p.screenshot({ path: `${OUT}/ch${String(c).padStart(2, '0')}-FAIL.png` }).catch(() => {}); try { await p.evaluate(() => { document.querySelector('#btnQuit')?.click(); }); } catch (x) {} }
  rec.secs = Math.round((Date.now() - t0) / 1000); rec.heapMB = await heap(); rec.errs = [...new Set(errs)].slice(0, 6); rec.bad = [...new Set(nf)].slice(0, 6);
  console.log('CH', JSON.stringify(rec)); R.push(rec); }
fs.writeFileSync(`${OUT}/story-${c0}-${c1}.json`, JSON.stringify(R, null, 1)); await b.close();
