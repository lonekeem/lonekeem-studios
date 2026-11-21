// companions (Dad + Nia following Keem on the bridge step): per-frame speed + planted-foot slide, and a frame sequence.
// usage: node tools/proof_companions.mjs <port> <outdir> [step] [frames] [shots]
import { chromium } from 'playwright';
import { sheet } from './proof_lib.mjs';
import fs from 'fs';
const [,, port = '5191', out = '/workspace/atq-glide-proof/companions', step = '6', frames = '150', shots = '1'] = process.argv; fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
await ctx.addInitScript(() => localStorage.setItem('atq3.settings', JSON.stringify({ qual: 'low', gore: true })));
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(`http://localhost:${port}/?step=${step}`, { waitUntil: 'load' });
await p.waitForFunction(() => window.__atq && window.__atq.game && window.__atq.game.running, null, { timeout: 120000 }); await p.waitForTimeout(2500);
await p.evaluate(() => { const g = window.__atq.game; g.paused = true; g.god = true; const dt = 1 / 60; for (let i = 0; i < 80; i++) g.skipLine && g.skipLine(); g.cut = null; g.alive().forEach(z => z.root.position.set(900, 0, 900));
  g.cam.yaw += Math.PI; for (let i = 0; i < 60; i++) { g.input.poll(dt); g.update(dt, dt); } g.__st = {}; });
const files = [];
const chunk = async (n, mx, my) => p.evaluate(([n, mx, my]) => { const g = window.__atq.game, dt = 1 / 60; g.input.stick.set(mx, my); const rows = [];
  const who = ['marcus', 'nia'].map(k => g.npcs[k]).filter(Boolean); const V = g.player.root.position.constructor;
  for (let i = 0; i < n; i++) { g.alive().forEach(z => z.root.position.set(900, 0, 900)); g.input.poll(dt); g.update(dt, dt);
    for (const c of who) { c.root.updateMatrixWorld(true); const fl = c.bone('DEF-foot.L').getWorldPosition(new V()), fr = c.bone('DEF-foot.R').getWorldPosition(new V()); const S = g.__st[c.key] || (g.__st[c.key] = { slide: 0, n: 0, mv: 0 });
      const rp = c.root.position; if (S.pl) { const v = Math.min(fl.distanceTo(S.pl), fr.distanceTo(S.pr)) / dt, sp = Math.hypot(rp.x - S.rx, rp.z - S.rz) / dt; if (sp > .3) { S.slide += v; S.n++; S.mv += sp; } }
      S.pl = fl; S.pr = fr; S.rx = rp.x; S.rz = rp.z; } }
  return who.map(c => { const S = g.__st[c.key]; return `${c.key}: anim=${c.curName} moving-frames=${S.n} avgSpeed=${(S.mv / Math.max(1, S.n)).toFixed(2)} avgPlantedFootSlide=${(S.slide / Math.max(1, S.n)).toFixed(2)}`; }).join(' | '); }, [n, mx, my]);
let last = '';
const plan = [[40, 0, 0.5], [40, 0, 0.5], [30, 0, 1], [30, 0, 1], [30, 0, 0], [30, 0, 0]];
for (let i = 0; i < plan.length; i++) { last = await chunk(...plan[i]); console.log(`chunk ${i} stick=${plan[i][1]},${plan[i][2]} ${last}`);
  if (shots === '1') { await p.waitForTimeout(350); const f = `${out}/c${i}.png`; await p.screenshot({ path: f }); files.push(f); } }
if (files.length) sheet(files, `${out}/sheet.png`, 3, .5); fs.writeFileSync(`${out}/log.txt`, last + '\n'); console.log('errs', errs.slice(0, 3)); await b.close();
