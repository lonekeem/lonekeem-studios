// mission-glow proofs. node tools/proof_glow.mjs <port> <outdir> <step[:fp][:x,z[:yaw]]>...   e.g. 41  57:fp  41:tp:-10,-1575:0
import { chromium } from 'playwright'; import fs from 'fs';
const [port, OUT, ...specs] = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
for (const spec of specs) { const [step, mode = 'tp', pos, yaw, extra] = spec.split(':');
  const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
  await ctx.addInitScript(() => localStorage.setItem('atq3.settings', JSON.stringify({ qual: 'med', gore: true, voices: false })));
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push('PAGEERR ' + e.message)); p.on('console', m => { if (m.type() === 'error' || /glow/.test(m.text())) errs.push(m.text().slice(0, 200)); });
  await p.goto(`http://localhost:${port}/?step=${step}&god`, { waitUntil: 'load' });
  await p.waitForFunction(() => window.__atq && window.__atq.game && window.__atq.game.running, null, { timeout: 180000 }); await p.waitForTimeout(2500);
  const info = await p.evaluate(([mode, pos, yaw, extra]) => { const g = window.__atq.game; g.god = true; g.paused = true; for (let i = 0; i < 60; i++) { if (g.dlgCur) g.skipLine(); g.update(1 / 30, 1 / 30); } g.cut = null; g.dlgCur = null;
    g.zombies && g.zombies.forEach(z => { if (z.root) z.root.visible = false; }); if (extra === 'nz') g.zombies.length = 0; if (extra === 'key') { const q = g.player.root.position; g.addPickup({ kind: 'key', story: true, label: 'Rusty key', pos: [q.x - 2.5, 1.0, q.z - 5] }); g.addPickup({ kind: 'keycard', story: true, label: 'Security keycard', pos: [q.x + 3, 1.0, q.z - 7] }); }
    if (pos) { const [x, z] = pos.split(',').map(Number); g.player.root.position.set(x, g.player.root.position.y, z); }
    if (yaw !== undefined && yaw !== '') g.cam.yaw = +yaw; g.cam.fp = mode === 'fp';
    for (let i = 0; i < 20; i++) g.update(1 / 30, 1 / 30);
    const L = g.glow ? g.glow.list.map(e => [e.icon, e.hard ? 'obj' : 'loot', Math.round(e.x), Math.round(e.z)]) : null; return { step: g.step, obj: document.querySelector('#objt').textContent, targets: L, pos: g.player.root.position.toArray().map(x => +x.toFixed(1)), yaw: g.cam.yaw }; }, [mode, pos, yaw, extra]);
  await p.waitForTimeout(500); const f = `${OUT}/s${step}_${mode}${pos ? '_' + pos.replace(',', '_') : ''}.png`; await p.screenshot({ path: f, timeout: 120000 }); console.log(f, JSON.stringify(info), errs.length ? JSON.stringify(errs.slice(0, 3)) : 'no errors'); await ctx.close(); }
await b.close();
