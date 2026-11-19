// raider tactics proof: spawn raiders near cover boxes, let the AI run in stepped time, shoot phone-size frames with a chase camera
import { openGame, stepShot, sheet } from './proof_lib.mjs';
import fs from 'fs';
const [,, port = '4301', out = '/workspace/atqr-proof/raider', n = '24', stepsPer = '6'] = process.argv; fs.mkdirSync(out, { recursive: true });
const { b, p, errs } = await openGame(port, 2, { skip: false });
await p.evaluate(() => { const g = window.__atq.game; g.dlgQ = []; g.dlgCur = null; g.cut = null; g.god = true; g.alive().forEach(z => z.root.position.set(900, 0, 900)); g.npcs.nia && (g.npcs.nia.root.visible = false); g.npcs.marcus && (g.npcs.marcus.root.visible = false);
  g.player.root.position.set(0, 0, 30); g.player.root.rotation.y = Math.PI; window.__P = g.player.root.position;
  const r1 = g.spawnZ(-6, 8, { raider: true, gun: 'rifle', aggro: 99, hp: 400 }), r2 = g.spawnZ(7, 6, { raider: true, gun: 'smg', aggro: 99, hp: 400 }); window.__R = [r1, r2]; r1.rs = null; g.paused = true; });
await p.evaluate(() => { const g = window.__atq.game; for (let i = 0; i < 5; i++) g.update(1 / 30, 1 / 30); });
const files = [], log = [];
for (let i = 0; i < +n; i++) { await p.evaluate(() => { const g = window.__atq.game; const R = window.__R; const c = g.camera; /* follow cam on raider 0 with the player in view */ g.cut = { anim: 'Idle_Loop', cam: new c.position.constructor(), look: new c.position.constructor(), flash: false }; });
  await p.evaluate((sp) => { const g = window.__atq.game, R = window.__R, V = g.camera.position.constructor; const a = R[0].root.position, c = R[1].root.position; const mid = new V((a.x + c.x) / 2, 1.1, (a.z + c.z) / 2); const cut = g.cut; cut.look.copy(mid); cut.cam.set(mid.x + 9, 4.2, mid.z + 15); g.camera.position.copy(cut.cam); g._lk = mid; g.cut = null; g.player.root.visible = true; for (let k = 0; k < sp; k++) g.update(1 / 30, 1 / 30); }, +stepsPer);
  await p.evaluate(() => { const g = window.__atq.game, R = window.__R, V = g.camera.position.constructor; const a = R[0].root.position, c = R[1].root.position; g.cut = { anim: null, cam: new V((a.x + c.x) / 2 + 8, 4.0, (a.z + c.z) / 2 + 13), look: new V((a.x + c.x) / 2, 1.0, (a.z + c.z) / 2), flash: false }; });
  const f = `${out}/r_${String(i).padStart(2, '0')}.png`; await stepShot(p, f, 1, 1 / 30, 450); files.push(f);
  log.push(await p.evaluate(() => window.__R.map(r => [r.rs, r.curName, +r.root.position.x.toFixed(1), +r.root.position.z.toFixed(1), r.mag]))); }
sheet(files, `${out}/RAIDER_sheet.png`, 4, 0.5); console.log(JSON.stringify(log), errs.slice(0, 3)); await b.close();
