// exact-object interaction proof: player 1.6 m from a story use-point presses the hand button -> walks to it, faces it, reaches, then it fires
import { openGame, stepShot } from './proof_lib.mjs';
import fs from 'fs';
const [,, port = '4301', out = '/workspace/atqr-proof/use', step = '15'] = process.argv; fs.mkdirSync(out, { recursive: true });
const { b, p, errs } = await openGame(port, +step, { skip: false });
const info = await p.evaluate(() => { const g = window.__atq.game; g.dlgQ = []; g.dlgCur = null; g.cut = null; g.alive().forEach(z => z.root.position.set(900, 0, 900)); const u = g.stepData.uses[0]; window.__fired = 0; const f = u.fn; u.fn = (gg) => { window.__fired++; /* record only, do not start the story beat */ }; g.player.root.position.set(u.x - 1.6, 0, u.z + 0.2); g.player.root.rotation.y = -1.2; g.camera.position.set(u.x - 4, 2.2, u.z + 3); g.paused = true; for (let i = 0; i < 20; i++) g.update(1 / 30, 1 / 30); return { u: [u.x, u.z, u.label], P: [g.player.root.position.x, g.player.root.position.z] }; });
console.log(JSON.stringify(info)); const log = [];
await p.evaluate(() => window.__atq.game.use());
for (let i = 0; i < 12; i++) { await stepShot(p, `${out}/use_${String(i).padStart(2, '0')}.png`, 8, 1 / 30, 500); log.push(await p.evaluate(() => { const g = window.__atq.game, P = g.player.root.position, u = g.stepData.uses[0]; return [+Math.hypot(u.x - P.x, u.z - P.z).toFixed(2), g.useSeq ? g.useSeq.ph : '-', window.__fired, g.player.curName]; })); }
console.log(JSON.stringify(log), errs.slice(0, 3)); await b.close();
