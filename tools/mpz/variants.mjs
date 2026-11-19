// MP zombie variant proof: every rig (+ procedural) in a row, camera at distance D along the street.
// usage: TAG=after DIST=3,12,35 [POSE=punch|death|hit|head] [ONLY=0,1,..] [OUT=dir] TOWN_URL=http://localhost:5271/ node variants.mjs
import { client, ctxOpts, launch } from '../mpfix/lib.mjs';
const TAG = process.env.TAG || 'after', OUT = process.env.OUT || '/workspace/atqzomb/docs/mp-zombies', POSE = process.env.POSE || '';
const dists = (process.env.DIST || '3,12,35').split(',').map(Number);
const ALL = [null, 'zombie2', 'zombie_male', 'zombie_office', 'zombie_elder', 'zombie_big', 'zombie_cop', 'zombie_worker']; const RIGS = process.env.ONLY ? process.env.ONLY.split(',').map(i => ALL[+i]) : ALL;
const b = await launch(); const ctx = await b.newContext({ ...ctxOpts, viewport: { width: 1000, height: 520 }, deviceScaleFactor: 1 }); const p = await client(ctx);
await p.evaluate(() => { window.__MP_NOLOD = !!0; window.__mpTown.Z.killNear(0, 0, 400, 9999); });
// hide the HUD (keep only the canvas chain)
await p.evaluate(() => { const c = [...document.querySelectorAll('canvas')].sort((a, b) => b.width * b.height - a.width * a.height)[0]; let n = c; while (n && n !== document.body) { [...n.parentElement.children].forEach(s => { if (s !== n && s.tagName !== 'SCRIPT') s.style.visibility = 'hidden'; }); n = n.parentElement; } });
await p.evaluate(([RIGS]) => { const T = window.__mpTown, Z = T.Z; window.__vz = RIGS.map((r, i) => { const z = Z.spawnAt(0, 0, { rig: r, runner: false }); z.speed = 0; z.hp = z.hp0 = 1e9; return z; }); }, [RIGS]);
for (const D of dists) {
  await p.evaluate(([D, n]) => { const gap = D < 8 ? 1.15 : D < 20 ? 1.5 : 2.4; const X0 = -40, Z0 = 22; window.__pin && clearInterval(window.__pin);
    window.__pin = setInterval(() => { window.__vz.forEach((z, i) => { if (z.dead) { z.root.position.x = X0 + D; return; } z.root.position.set(X0 + D, 0, Z0 + (i - (n - 1) / 2) * gap); z.root.rotation.y = -Math.PI / 2; z.root.visible = true; }); }, 8); }, [D, RIGS.length]);
  await p.evaluate(() => { const T = window.__mpTown; T.setPos && T.setPos(-47, 22); });
  await p.waitForTimeout(2200);
  await p.evaluate(([D]) => { const T = window.__mpTown, cam = T.cam; if (!cam.__free) { cam.__free = 1; cam.position.copy = function () { return this; }; cam.lookAt = function () {}; } cam.fov = D < 8 ? 55 : 45; cam.position.set(-40, 1.55, 22); const V = cam.position.constructor; const m = new (cam.matrix.constructor)(); m.lookAt(cam.position, new V(-40 + D, 1.1, 22), cam.up.set(0, 1, 0)); cam.quaternion.setFromRotationMatrix(m); cam.updateProjectionMatrix(); }, [D]);
  await p.waitForTimeout(1500);
  if (POSE === 'punch') await p.evaluate(() => { window.__vz.forEach(z => { z.play('Punch_Jab', { once: true, force: true, speed: .35, cb: () => { z.curName = ''; } }); z.mixer.update(.55); }); });
  if (POSE === 'hit') await p.evaluate(() => { window.__vz.forEach(z => { z.play('Hit_Chest', { once: true, force: true, speed: .3 }); z.mixer.update(.25); }); });
  if (POSE === 'death') { await p.evaluate(() => { window.__vz.forEach(z => { z.hp = z.hp0 = 1; }); window.__mpTown.Z.killNear(-40 + 0, 22, 100, 50); }); await p.waitForTimeout(1300); }
  const info = await p.evaluate(() => window.__vz.map(z => { const hp = window.__mpTown.Z.headPos(z, new (window.__mpTown.cam.position.constructor)()); return { rig: z.look.rig, lv: z._lv, dead: z.dead, head: hp.toArray().map(v => +v.toFixed(2)), noHead: z.noHead }; }));
  console.log(D, JSON.stringify(info)); await p.screenshot({ path: `${OUT}/mp_${TAG}_${D}m.png`, timeout: 180000 });
}
await b.close();
