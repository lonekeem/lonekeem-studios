import { boot, freecam } from '../mpfix/lib.mjs';
const { b, p } = await boot(); const fr = n => p.evaluate(n => new Promise(r => { let k = 0; const f = () => { if (++k >= n) r(); else requestAnimationFrame(f); }; requestAnimationFrame(f); }), n);
await p.evaluate(() => { const t = window.__mpTown; t.scene.fog = null; t.cam.far = 600; t.cam.updateProjectionMatrix(); });
for (const [n, cx, cz, h] of [['all', 0, 0, 215], ['center', 0, 0, 100]]) { await freecam(p, [cx, h, cz + .01], [cx, 0, cz]); await fr(3); await p.evaluate(() => { const c = window.__mpTown.cam; c.fov = 55; c.updateProjectionMatrix(); }); await fr(2); await p.screenshot({ path: `/workspace/atq1919/docs/mp-fix3/town_topdown_${n}.png` }); }
await b.close();
