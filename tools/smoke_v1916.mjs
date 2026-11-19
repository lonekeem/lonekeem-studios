// smoke: load several story steps, let the sim run (god mode, lines skipped), force a town event + a feeding, report console/page errors
import { openGame } from './proof_lib.mjs';
const port = process.argv[2] || '4310'; const steps = (process.argv[3] || '0,1,2,6,7').split(',').map(Number); let bad = 0;
for (const st of steps) { const { b, p, errs } = await openGame(port, st, { skip: true });
  const r = await p.evaluate(() => { const g = window.__atq.game; g.hp = g.maxHp = 9999; g.paused = true; let maxMs = 0; for (let i = 0; i < 600; i++) { const a = performance.now(); g.update(1 / 30, 1 / 30); maxMs = Math.max(maxMs, performance.now() - a); if (i % 20 === 0) g.skipLine && g.skipLine(); }
    let town = null; if (g.town && g.step > 0 && !g.boss) { g.cut = null; g.dlgCur = null; g.dlgQ = []; const ok = g.town.force('caught'); for (let i = 0; i < 700 && g.town.ev; i++) g.update(1 / 30, 1 / 30); town = { ok, bodies: g.town.bodies.length }; }
    return { step: g.step, hp: g.hp, zs: g.zombies.length, pools: g.pools.length, eat: g.zombies.filter(z => z.st === 'eat').length, maxStepMs: +maxMs.toFixed(1), town }; });
  console.log(st, JSON.stringify(r), 'errors:', errs.length, errs.slice(0, 3)); bad += errs.length; await b.close(); }
console.log(bad ? 'FAIL' : 'SMOKE OK'); process.exit(bad ? 1 : 0);
