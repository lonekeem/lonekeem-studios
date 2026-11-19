// Proof: face-to-face conversations (player placed BEHIND the NPC; NPC + player turn, camera frames both faces). Usage: node tools/proof_convo.mjs <port> <outdir>
import { openGame, stepShot, sheet } from './proof_lib.mjs';
import fs from 'fs';
const [,, port = '4301', out = '/workspace/atqr-proof/convo'] = process.argv; fs.mkdirSync(out, { recursive: true });
const { b, p, errs } = await openGame(port, 2, { skip: false });
// finish the opening cutscene quickly, then stage: Keem 3.4 m BEHIND Dad (Dad faces +x), Nia off to the side
await p.evaluate(() => { const g = window.__atq.game; for (let i = 0; i < 60; i++) g.skipLine(); g.cut = null; g.convo = null; g.dlgQ = []; g.dlgCur = null; const d = g.npcs.marcus, n = g.npcs.nia, P = g.player.root; d.root.visible = n.root.visible = true; d.update = n.update = null;
  d.root.position.set(-11, 0, 19.2); d.root.rotation.y = Math.PI / 2; n.root.position.set(-10.2, 0, 21.4); n.root.rotation.y = Math.PI / 2; P.position.set(-14.6, 0, 19.0); P.rotation.y = Math.PI / 2; g.alive().forEach(z => z.root.position.set(900, 0, 900));
  g.cam.yaw = Math.PI / 2 + Math.PI; const V = g.camera.position.constructor; g.cut = { anim: 'Idle_Loop', cam: new V(-16.5, 1.7, 19), look: new V(-11, 1.2, 19.2), flash: true }; g.camera.position.copy(g.cut.cam); g.cut.look && (g._lk = null);
  g.say([['marcus', "Keem. Come here. Look at me when I'm talking to you."], ['keem', "I'm right here, Dad."], ['nia', "He was behind you the whole time."], ['marcus', 'Then why am I talking to nothing?']]); });
await p.waitForTimeout(500);
const files = [];
for (let i = 0; i < 16; i++) { const f = `${out}/convo_${String(i).padStart(2, '0')}.png`; await stepShot(p, f, 8, 1 / 30, 600); files.push(f); if (i === 0) await p.evaluate(() => { window.__atq.game.dlgCur && (window.__atq.game.dlgCur.t = 0); }); }
sheet(files, `${out}/CONVO_sheet.png`, 4, 0.62);
console.log(errs.slice(0, 5), await p.evaluate(() => { const g = window.__atq.game; return [g.player.root.position.toArray().map(v => +v.toFixed(2)), g.npcs.marcus.root.position.toArray().map(v => +v.toFixed(2)), g.player.root.rotation.y, g.npcs.marcus.root.rotation.y]; })); await b.close();
