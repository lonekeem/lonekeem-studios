// Gore proof: feeding scene close-up at phone size. usage: node tools/proof_gore.mjs <port> <outdir> <nframes> <stepsPer> [camJSON]
import { openGame, stepShot, sheet } from './proof_lib.mjs';
import fs from 'fs';
const [,, port = '4310', out = '/workspace/atqg-proof/feed', n = '8', stepsPer = '20', cam = '[3.5,43.6,2.6,1.9,2.2]'] = process.argv; fs.mkdirSync(out, { recursive: true });
const C = JSON.parse(cam); // [tx,tz, camdx, camdy, camdz] relative cam offset from target
const STEP = +(process.env.STEP || 1), HUD = process.env.HUD === '1';
const { b, p, errs } = await openGame(port, STEP, { skip: false });
if (!HUD) await p.addStyleTag({ content: '#hud,#touch,#dlg,#xhair,#vignette,#lowhp,#prompt,#wp{display:none!important}' });
await p.evaluate(([C]) => { const g = window.__atq.game; g.dlgQ = []; g.dlgCur = null; g.god = true; g.horde = () => {};
  g.alive().forEach(z => { if (z.st !== 'eat') z.root.position.set(900, 0, 900); }); Object.values(g.npcs).forEach(n => { if (!n.isVictim) n.root.visible = false; });
  g.player.root.position.set(-30, 0, 60); const V = g.camera.position.constructor; const mc = { anim: 'Idle_Loop', cam: new V(), look: new V(), flash: false }; g.cut = mc; g.player.root.visible = false;
  const ou = g.update.bind(g); g.update = (a, c) => { ou(a, c); g.cut = mc; g.dlgQ = []; g.convo = null; mc.look.set(C[0], 0.35, C[1]); mc.cam.set(C[0] + C[2], C[3], C[1] + C[4]); g.camera.position.copy(mc.cam); g.camera.lookAt(mc.look); g._lk = mc.look.clone(); g.player.root.visible = false; }; }, [C]);
if (process.env.ROLL !== undefined) await p.evaluate((r) => { const g = window.__atq.game; Object.values(g.npcs).filter(n => n.isVictim).forEach(v => { v.roll = +r; v.root.rotation.z = +r; v.root.position.y = +r ? .09 : 0; }); }, process.env.ROLL);
if (process.env.ADJ) await p.evaluate((a) => { window.__atq.game.kneelAdj = +a; }, process.env.ADJ);
const files = [];
for (let i = 0; i < +n; i++) { const f = `${out}/f${String(i).padStart(2, '0')}.png`; await stepShot(p, f, +stepsPer, 1 / 30, 500); files.push(f); }
sheet(files, `${out}/sheet.png`, 4, 0.7); console.log(errs.slice(0, 3)); await b.close();
