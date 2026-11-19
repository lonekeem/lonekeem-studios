// Sampling heap allocation profile of the fixed-step simulation (which functions allocate the most per frame). Usage: node tools/allocprof.mjs <port> [step]
import { chromium } from 'playwright';
const [,, port = '4301', step = '14'] = process.argv;
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
await ctx.addInitScript(() => localStorage.setItem('atq3.settings', JSON.stringify({ qual: 'low', gore: true })));
const p = await ctx.newPage(); await p.goto(`http://localhost:${port}/?step=${step}&god`);
await p.waitForFunction(() => window.__atq && window.__atq.game && window.__atq.game.running, null, { timeout: 90000 }); await p.waitForTimeout(4000);
await p.evaluate(() => { const g = window.__atq.game; g.god = true; for (let i = 0; i < 40; i++) g.skipLine && g.skipLine(); g.cut = null; const P = g.player.root.position; for (let i = 0; i < 14; i++) { const a = i / 14 * 6.28; g.spawnZ(P.x + Math.cos(a) * 9, P.z + Math.sin(a) * 9, { runner: i % 3 === 0, aggro: 99 }); } g.spawnZ(P.x + 6, P.z + 6, { raider: true, gun: 'rifle' }); if (!g.npcs.marcus) g.npc('marcus', 'marcus', P.x + 2, P.z + 2); g.paused = true; });
await p.waitForTimeout(600);
const c = await ctx.newCDPSession(p); await c.send('HeapProfiler.enable'); await c.send('HeapProfiler.startSampling', { samplingInterval: 1024, includeObjectsCollectedByMajorGC: true, includeObjectsCollectedByMinorGC: true });
await p.evaluate(() => { const g = window.__atq.game, I = g.input; I.run = true; for (let i = 0; i < 400; i++) { const a = i / 300; I.move.set(Math.sin(a), -Math.cos(a)); g.update(1 / 60, 1 / 60); g.render(1 / 60); } });
const { profile } = await c.send('HeapProfiler.stopSampling'); const tot = {}; const walk = (n) => { const f = n.callFrame; const k = `${f.functionName || '(anon)'} ${f.url.split('/').slice(-2).join('/')}:${f.lineNumber + 1}`; tot[k] = (tot[k] || 0) + n.selfSize; n.children.forEach(walk); }; walk(profile.head);
const rows = Object.entries(tot).sort((a, b) => b[1] - a[1]).slice(0, 25); const sum = Object.values(tot).reduce((a, c) => a + c, 0); console.log('total KB/frame', (sum / 1024 / 400).toFixed(1)); rows.forEach(([k, v]) => console.log((v / 1024 / 400).toFixed(2).padStart(7), k)); await b.close();
