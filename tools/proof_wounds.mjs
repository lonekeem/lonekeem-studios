// wound lineup: hurt Keem, Dad, a raider and a zombie in front of a close camera; then run time to prove marks persist
import { openGame, stepShot, sheet } from './proof_lib.mjs';
import fs from 'fs';
const [,, port = '4310', out = '/workspace/atqg-proof/wounds'] = process.argv; fs.mkdirSync(out, { recursive: true });
const { b, p, errs } = await openGame(port, 1, { skip: false });
await p.addStyleTag({ content: '#hud,#touch,#dlg,#xhair,#vignette,#lowhp,#prompt,#wp{display:none!important}' });
await p.evaluate(() => { const g = window.__atq.game; g.dlgQ = []; g.dlgCur = null; g.god = true; g.horde = () => {};
  g.alive().forEach(z => z.root.position.set(900, 0, 900)); Object.values(g.npcs).forEach(n => { n.root.visible = false; });
  const X0 = +(window.__X0 ?? 0), Z0 = +(window.__Z0 ?? -8); const pl = g.player; pl.root.position.set(X0 - 2.1, 0, Z0); pl.root.rotation.y = 0.3; pl.root.visible = true;
  const dad = g.npc('marcus', 'marcus', X0 - .7, Z0, 0.1); const ra = g.spawnZ(X0 + .7, Z0, { raider: true, idle: true }); ra.st = 'idle'; ra.root.rotation.y = -.1; const zb = g.spawnZ(X0 + 2.1, Z0, { idle: true }); zb.st = 'idle'; zb.root.rotation.y = -.3;
  const from = { x: X0, z: Z0 + 5 }; const D = (x) => { const v = new g.camera.position.constructor(0, 0, -1); return v; };
  const w = (c, k, n) => { for (let i = 0; i < n; i++) g.woundFrom(c, { x: c.root.position.x + (Math.random() - .5) * 2, z: c.root.position.z + 5 }, k); };
  w(pl, 'melee', 4); w(dad, 'melee', 3); [['chest', .1, 0], ['uarmL', .08, .4], ['belly', .09, -.3], ['head', .06, 0]].forEach(([part, size, nx]) => g.addWound(ra, { kind: part === 'head' ? 'bullet' : 'torn', part, size, nx, nz: 1, run: .3 })); g.addWound(ra, { kind: 'bullet', part: 'chest', size: .06, nx: -.5, nz: 1, t: .75 }); g.woundFrom(zb, null, 'bullet', new g.camera.position.constructor(0, 0, -1), true); w(zb, 'bullet', 2); w(zb, 'melee', 2);
  window.__W = [pl, dad, ra, zb]; ra.root.rotation.y = 0; g.skipSim = true;
  const mc = { anim: null, cam: new g.camera.position.constructor(), look: new g.camera.position.constructor(), flash: false }; g.cut = mc; const ou = g.update.bind(g); g.update = (a, c) => { ou(a, c); g.cut = mc; g.dlgQ = []; g.convo = null; const F = window.__F; if (F === undefined) { mc.look.set(X0, 1.0, Z0); mc.cam.set(X0, 1.5, Z0 + 9); } else { const c = window.__W[F]; mc.look.set(c.root.position.x, 1.1, c.root.position.z); mc.cam.set(c.root.position.x + .1, 1.25, c.root.position.z + 1.5); } g.camera.position.copy(mc.cam); g.camera.lookAt(mc.look); g._lk = mc.look.clone(); g.player.root.visible = true; [pl, dad, ra, zb].forEach((c, i) => { c.root.position.x = X0 - 4.5 + i * 3; c.root.position.z = Z0; c.root.rotation.y = [.15, .1, -.1, -.2][i]; }); }; });
const files = [];
await stepShot(p, `${out}/w_all.png`, 20, 1 / 30, 800); files.push(`${out}/w_all.png`);
for (const [i, c] of [[0, 'keem'], [1, 'dad'], [2, 'raider'], [3, 'zombie']]) { await p.evaluate((i) => { window.__F = i; }, i); const f = `${out}/w_${c}.png`; await stepShot(p, f, 50, 1 / 30, 800); files.push(f); }
sheet(files, `${out}/sheet.png`, 3, .8); console.log(errs.slice(0, 3)); await b.close();
