// Frame-time / hitch profiler (phone size, low preset). Usage: node tools/perf.mjs <port> <label> [step=14] [seconds=25]
// Wraps Game.update()/render() with timers (CPU ms), samples rAF deltas and JS heap (GC = heap drop) while the player runs around a horde.
import { chromium } from 'playwright';
import fs from 'fs';
const [,, port = '4301', label = 'run', step = '14', secs = '25'] = process.argv;
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--enable-precise-memory-info', '--js-flags=--expose-gc'] });
const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
await ctx.addInitScript(() => localStorage.setItem('atq3.settings', JSON.stringify({ qual: 'low', gore: true })));
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(`http://localhost:${port}/?step=${step}&god`, { waitUntil: 'load' }); await p.waitForFunction(() => window.__atq && window.__atq.game && window.__atq.game.running, null, { timeout: 90000 }); await p.waitForTimeout(4000);
await p.evaluate(() => { const g = window.__atq.game; g.god = true; for (let i = 0; i < 40; i++) g.skipLine && g.skipLine(); g.cut = null;
  const P = g.player.root.position; for (let i = 0; i < 14; i++) { const a = i / 14 * 6.28; g.spawnZ(P.x + Math.cos(a) * 9, P.z + Math.sin(a) * 9, { runner: i % 3 === 0, aggro: 99 }); }
  g.spawnZ(P.x + 6, P.z + 6, { raider: true, gun: 'rifle' }); g.spawnZ(P.x - 6, P.z + 6, { raider: true, gun: 'smg' });
  if (!g.npcs.marcus) g.npc('marcus', 'marcus', P.x + 2, P.z + 2); if (!g.npcs.nia) g.npc('nia', 'nia', P.x - 2, P.z + 2, 0, 'Idle_Loop', .62);
  window.__perf = { up: [], rd: [], dt: [], heap: [], t0: performance.now() }; const R = window.__perf;
  const u0 = g.update.bind(g), r0 = g.render.bind(g); g.update = function (a, b) { const t = performance.now(); u0(a, b); R.up.push(performance.now() - t); }; g.render = function (a) { const t = performance.now(); r0(a); R.rd.push(performance.now() - t); };
  let last = performance.now(); const tick = (n) => { R.dt.push(n - last); last = n; R.heap.push(performance.memory ? performance.memory.usedJSHeapSize : 0); requestAnimationFrame(tick); }; requestAnimationFrame(tick); });
const keys = ['KeyW', 'KeyD', 'KeyW', 'KeyA']; await p.keyboard.down('ShiftLeft'); const t0 = Date.now(); let k = 0;
while (Date.now() - t0 < +secs * 1000 / 2) { const key = keys[k++ % 4]; await p.keyboard.down(key); await p.waitForTimeout(1500); await p.keyboard.up(key); }
const R = await p.evaluate(() => window.__perf);
// phase B: deterministic fixed-step simulation (no GPU): 1800 updates @60Hz + the skinning/retarget work render would do (skeleton.update of visible rigs), player running in a circle
const B = await p.evaluate(async () => { const g = window.__atq.game; g.paused = true; await new Promise(r => setTimeout(r, 600)); const I = g.input; I.run = true; const up = [], sk = [], heap = []; const rigs = [];
  g.scene.traverse(o => { if (o.isSkinnedMesh) rigs.push(o); }); const vis = (o) => { for (; o; o = o.parent) if (!o.visible) return false; return true; };
  for (let i = 0; i < 1800; i++) { const a = i / 300; I.move.set(Math.sin(a), -Math.cos(a)); const t = performance.now(); g.update(1 / 60, 1 / 60); const t1 = performance.now(); g.scene.updateMatrixWorld(); for (const m of rigs) if (m.parent && vis(m)) m.skeleton.update(); const t2 = performance.now(); up.push(t1 - t); sk.push(t2 - t1); heap.push(performance.memory.usedJSHeapSize); }
  g.paused = false; return { up, sk, heap }; });
R.simUp = B.up; R.simSk = B.sk; R.simHeap = B.heap;
const st = a => { const s = [...a].sort((x, y) => x - y); const q = f => s[Math.min(s.length - 1, Math.floor(s.length * f))]; return { n: a.length, avg: +(a.reduce((x, y) => x + y, 0) / a.length).toFixed(2), p50: +q(.5).toFixed(2), p95: +q(.95).toFixed(2), p99: +q(.99).toFixed(2), max: +s[s.length - 1].toFixed(2) }; };
let gcs = 0, alloc = 0, prev = R.heap[0]; for (const h of R.heap) { if (h < prev - 300000) gcs++; else alloc += Math.max(0, h - prev); prev = h; }
let gcB = 0, allocB = 0, pv = R.simHeap[0]; for (const h of R.simHeap) { if (h < pv - 300000) gcB++; else allocB += Math.max(0, h - pv); pv = h; }
const out = { sim_update_ms: st(R.simUp), sim_skeleton_ms: st(R.simSk), sim_gc_events_per_30s: gcB, sim_alloc_kb_per_update: +(allocB / 1024 / R.simUp.length).toFixed(1), sim_updates_over_4ms: R.simUp.filter(x => x > 4).length, label, step, update_ms: st(R.up), render_cpu_ms: st(R.rd), raf_dt_ms: st(R.dt), hitches_over_100ms: R.dt.filter(x => x > 100).length, update_over_8ms: R.up.filter(x => x > 8).length, gc_events: gcs, alloc_kb_per_update: +(alloc / 1024 / Math.max(1, R.up.length)).toFixed(1), errs: errs.slice(0, 3) };
console.log(JSON.stringify(out)); fs.mkdirSync('/workspace/atqr-proof/perf', { recursive: true }); fs.writeFileSync(`/workspace/atqr-proof/perf/${label}.json`, JSON.stringify(out, null, 1)); await b.close();
