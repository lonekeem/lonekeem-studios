// audit: for every story step, list what the glow system picks up (objective vs loot) + whether a wp marker exists. node tools/audit_glow.mjs <port>
import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const ctx = await b.newContext({ viewport: { width: 640, height: 300 }, hasTouch: true, isMobile: true }); await ctx.addInitScript(() => localStorage.setItem('atq3.settings', JSON.stringify({ qual: 'low', gore: true, voices: false })));
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 150))); p.on('console', m => { if (/glow/.test(m.text())) errs.push(m.text().slice(0, 150)); });
await p.goto(`http://localhost:${process.argv[2]}/?step=0&god`); await p.waitForFunction(() => window.__atq?.game?.running, null, { timeout: 180000 }); await p.waitForTimeout(1500);
const n = await p.evaluate(() => window.__atq.game.constructor && 70);
for (let i = 0; i < 66; i++) { await p.evaluate((i) => { const g = window.__atq.game; g.god = true; g.paused = false; g.start(i); }, i); await p.waitForTimeout(2200);
  const r = await p.evaluate((i) => { const g = window.__atq.game; g.paused = true; 
    for (let k = 0; k < 40; k++) { if (g.dlgCur) g.skipLine(); g.update(1 / 30, 1 / 30); } g.cut = null; g.update(1 / 30, 1 / 30);
    const L = g.glow.list; const D = g.stepData || {}; return { i, id: g.step, obj: (document.querySelector('#objt').textContent || '').slice(0, 40), hard: L.filter(e => e.hard).map(e => e.icon + (e.wp ? '(wp)' : '')).join(','), loot: L.filter(e => !e.hard).length, wp: !!g.wpTarget, uses: (D.uses || []).length }; }, i);
  console.log(JSON.stringify(r)); await p.waitForTimeout(200); }
console.log('errors', JSON.stringify(errs)); await b.close();
