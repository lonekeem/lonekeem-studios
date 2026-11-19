import { boot, OUT, freecam } from './lib.mjs';
const tag = process.argv[2] || 'after'; const { b, p } = await boot();
await p.evaluate(() => { const T = window.__mpTown; const c = T.W.cars.find(k => k.id === 'c1'); c.x = -14; c.z = 26.0; c.ry = Math.PI / 2; c.fuel = 50; c.hp = 100; window.__car = c; T.setPos(-14, 26.0);
  window.__zs = [[0, 25.8], [3.5, 26.4], [7, 25.7]].map(([x, z]) => { const q = T.Z.spawnAt(x, z, { runner: false }); q.st = 'idle'; q.speed = 0; q.node = -1; return q; }); T.enter(c); T.key('KeyW', true); });
await freecam(p, [4, 3.4, 31.2], [4, .6, 26]);
let shot = 0, log = [];
for (let i = 0; i < 80; i++) { await p.waitForTimeout(500); const r = await p.evaluate(() => { const c = window.__car; return { x: +c.x.toFixed(1), v: +c.v.toFixed(1), hp: +c.hp.toFixed(0), dead: window.__zs.filter(q => q.dead).length, st: window.__zs.map(q => q.dead ? 'D' : q.st).join(''), me: window.__mpTown.me.drv ? 1 : 0 }; }); log.push(r);
  if (r.dead >= 1 && shot === 0) { shot = 1; await p.screenshot({ path: `${OUT}/runover_${tag}_1_hit.png` }); }
  if (r.x > 12 && shot < 2) { shot = 2; await p.screenshot({ path: `${OUT}/runover_${tag}_2_bodies.png` }); break; } }
console.log(JSON.stringify(log.filter((_, i) => i % 4 === 0))); console.log('final', JSON.stringify(log[log.length - 1]));
await p.evaluate(() => window.__mpTown.key('KeyW', false));
await b.close();
