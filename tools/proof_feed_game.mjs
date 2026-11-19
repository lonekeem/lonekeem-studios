// feeding scene from the real gameplay camera (third person, crouched player ~5m away). usage: node tools/proof_feed_game.mjs <port> <outdir> <n> <stepsPer> [dist] [step]
import { openGame, stepShot, sheet } from './proof_lib.mjs';
import fs from 'fs';
const [,, port = '4310', out = '/workspace/atqg-proof/game', n = '6', stepsPer = '60', dist = '5', step = '1'] = process.argv; fs.mkdirSync(out, { recursive: true });
const { b, p, errs } = await openGame(port, +step, { skip: false });
await p.addStyleTag({ content: '#touch,#dlg,#prompt,#wp{display:none!important}' });
await p.evaluate(([D]) => { const g = window.__atq.game; g.dlgQ = []; g.dlgCur = null; g.cut = null; g.god = true; g.horde = () => {};
  g.alive().forEach(z => { if (z.st !== 'eat') z.root.position.set(900, 0, 900); }); Object.values(g.npcs).forEach(n => { if (!n.isVictim) n.root.visible = false; });
  const ou = g.update.bind(g); g.update = (a, c) => { g.cut = null; g.dlgQ = []; g.convo = null; const P = g.player; P.root.position.set(1.6, 0, 43.6 + D); P.root.rotation.y = Math.PI; g.cam.yaw = 0; g.cam.pitch = -.3; g.state.crouch = true; ou(a, c); }; }, [+dist]);
const files = [];
for (let i = 0; i < +n; i++) { const f = `${out}/g${String(i).padStart(2, '0')}.png`; await stepShot(p, f, +stepsPer, 1 / 30, 600); files.push(f); }
sheet(files, `${out}/sheet.png`, 3, .8); console.log(errs.slice(0, 3)); await b.close();
