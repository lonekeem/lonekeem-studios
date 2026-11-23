import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true });
await ctx.addInitScript(() => { localStorage.setItem('atq3.settings', JSON.stringify({ qual: 'low' })); localStorage.setItem('atq_prologue_seen', '1'); localStorage.setItem('atq.gate', JSON.stringify({ birthYear: 1990, agreedVersion: 1 })); });
const p = await ctx.newPage(); p.on('pageerror', e => console.log('PE', e.message));
await p.goto('http://127.0.0.1:5495/?step=75&god'); await p.waitForFunction(() => window.__atq?.game?.running, null, { timeout: 180000 });
for (let k = 0; k < 40; k++) { const r = await p.evaluate((k) => { const g = window.__atq.game; g.paused = true; const D = g.stepData; while (g.dlgCur) g.skipLine(); if (k === 2) D.ht = 50;
  const dir = { x: 0, y: 0, z: 1, clone() { return this; }, normalize() { return this; } };
  if (k > 4) g.alive().forEach(z => { try { g.damageZ(z, 1e7, dir, { head: true }); } catch (e) { console.log(e.message); } });
  for (let i = 0; i < 30; i++) g.update(1 / 30, 1 / 30);
  const A = g.alive(); return { k, id: window.__atq.story[g.step].id, held: D.held, clear: D.clear, n: A.length, info: A.slice(0, 4).map(z => ({ hp: z.hp, dead: z.dead, st: z.st, ally: z.ally, boss: z.boss, y: +z.root.position.y.toFixed(1), x: +z.root.position.x.toFixed(0), z: +z.root.position.z.toFixed(0) })) }; }, k);
  console.log(JSON.stringify(r)); await p.waitForTimeout(300); if (r.id !== 'c15_hold') break; }
await b.close();
