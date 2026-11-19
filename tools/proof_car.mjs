// Proof: visible car enter + exit sequence (phone size, low preset). Usage: node tools/proof_car.mjs <port> <outdir> [enter|exit|both]
import { openGame, stepShot, sheet } from './proof_lib.mjs';
import fs from 'fs';
const [,, port = '4301', out = '/workspace/atqr-proof/car', mode = 'both'] = process.argv; fs.mkdirSync(out, { recursive: true });
const { b, p, errs } = await openGame(port, 4);
await p.evaluate(() => { const g = window.__atq.game; g.dlgQ = []; g.dlgCur = null; g.cut = null; g.stepData.canDrive = true; g.state.crouch = false; for (const k in g.npcs) g.npcs[k].root.visible = false; const P = g.player.root; P.position.set(27.5, 0, -58.5); P.rotation.y = 0; g.alive().forEach(z => { z.root.position.set(900, 0, 900); z.st = 'idle'; }); });
await p.waitForTimeout(800);
const files = [];
if (mode !== 'exit') {
  // pre-shot from the normal gameplay camera, then press USE
  await stepShot(p, `${out}/enter_00_gameplay.png`, 2); files.push(`${out}/enter_00_gameplay.png`);
  await p.evaluate(() => { const g = window.__atq.game; const P = g.player.root.position; g.board(); });
  for (let i = 1; i <= 26; i++) { const f = `${out}/enter_${String(i).padStart(2, '0')}.png`; await stepShot(p, f, 7); files.push(f); const done = await p.evaluate(() => { const g = window.__atq.game; return g.truck.driving; }); if (done) { await stepShot(p, `${out}/enter_${String(i + 1).padStart(2, '0')}_driving.png`, 6); files.push(`${out}/enter_${String(i + 1).padStart(2, '0')}_driving.png`); break; } }
  sheet(files, `${out}/ENTER_sheet.png`, 4, 0.62);
}
if (mode !== 'enter') {
  const ef = [];
  if (mode === 'exit') await p.evaluate(() => { const g = window.__atq.game; g.enterTruck(); });
  await p.evaluate(() => { const g = window.__atq.game; g.truck.v = 0; window.__exitDone = false; g.leave(() => { window.__exitDone = true; }, { walkTo: [27.5, -60.5] }); });
  for (let i = 1; i <= 30; i++) { const f = `${out}/exit_${String(i).padStart(2, '0')}.png`; await stepShot(p, f, 7); ef.push(f); if (await p.evaluate(() => window.__exitDone)) break; }
  sheet(ef, `${out}/EXIT_sheet.png`, 4, 0.62);
}
console.log(files.length, errs.slice(0, 5), await p.evaluate(() => { const g = window.__atq.game; return [g.player.root.rotation.y, g.truck.g.rotation.y]; })); await b.close();
