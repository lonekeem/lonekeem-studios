// MP zombie variant proof: every rig (+ procedural) in a row, camera at distance D along the street. usage: TAG=before DIST=6 node variants.mjs
import { client, ctxOpts, launch } from '../mpfix/lib.mjs';
const TAG = process.env.TAG || 'after', OUT = process.env.OUT || '/workspace/atqzomb/docs/mp-zombies';
const dists = (process.env.DIST || '5,12,30').split(',').map(Number);
const ALL = [null, 'zombie2', 'zombie_male', 'zombie_office', 'zombie_elder', 'zombie_big', 'zombie_cop', 'zombie_worker']; const RIGS = process.env.ONLY ? process.env.ONLY.split(',').map(i => ALL[+i]) : ALL; const SEED = +(process.env.SEED || 0);
const b = await launch(); const ctx = await b.newContext({ ...ctxOpts, viewport: { width: 1000, height: 520 }, deviceScaleFactor: 1 }); const p = await client(ctx);
await p.evaluate((nl) => { window.__MP_NOLOD = nl; window.__mpTown.Z.killNear(0, 0, 400, 9999); document.querySelectorAll('canvas ~ *').forEach(()=>{}); }, !!process.env.NOLOD);
await p.evaluate(([RIGS, SEED]) => { const T = window.__mpTown, Z = T.Z; window.__vz = RIGS.map((r, i) => { const z = Z.spawnAt(0, 0, { rig: r, runner: false }); if (SEED) { /* nothing */ } z.speed = 0; z.hp = 1e9; return z; }); }, [RIGS, SEED]);
for (const D of dists) {
  await p.evaluate(([D, n]) => { const T = window.__mpTown; const gap = D < 8 ? 1.15 : D < 20 ? 1.5 : 2.4; window.__vz.forEach((z, i) => { z.__pin = [20 + (i - (n - 1) / 2) * gap * 0, 0, 0]; });
    window.__pin && clearInterval(window.__pin); const X0 = -40, Z0 = 22; // line along z, camera looks +x? keep simple: zombies at x=X0+D.. spaced in z
    window.__pin = setInterval(() => { window.__vz.forEach((z, i) => { z.root.position.set(X0 + D, 0, Z0 + (i - (n - 1) / 2) * gap); z.root.rotation.y = -Math.PI / 2; z.root.visible = true; }); }, 8); }, [D, RIGS.length]);
  await p.evaluate(([D]) => { const T = window.__mpTown; T.setPos && T.setPos(-47, 22); }, [D]);
  await p.waitForTimeout(2500);
  await p.evaluate(([D]) => { const T = window.__mpTown, cam = T.cam; if (!cam.__free) { cam.__free = 1; cam.position.copy = function () { return this; }; cam.lookAt = function () {}; } cam.fov = D < 8 ? 55 : 45; cam.position.set(-40, 1.55, 22); const V = cam.position.constructor; const m = new (cam.matrix.constructor)(); m.lookAt(cam.position, new V(-40 + D, 1.1, 22), cam.up.set(0, 1, 0)); cam.quaternion.setFromRotationMatrix(m); cam.updateProjectionMatrix(); }, [D]);
  await p.waitForTimeout(2500);
  const info = await p.evaluate(() => window.__vz.map(z => { let heads = 0, vis = []; z.root.traverse(o => { if (o.isMesh && /head|neck/i.test(o.name)) vis.push(o.name + ':' + o.visible); }); return { rig: z.look.rig, lv: z._lv, vis: vis.join(',') }; }));
  console.log(D, JSON.stringify(info)); await p.screenshot({ path: `${OUT}/variants_${TAG}_${D}m.png` });
}
await b.close();
