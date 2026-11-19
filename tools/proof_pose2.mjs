// Whole-body pose bench: node tools/proof_pose2.mjs <port> <outdir> '<json {name:{bone:[x,y,z]}}>' [views=front,side] [headName]
import { openGame, stepShot, sheet } from './proof_lib.mjs';
import fs from 'fs';
const [,, port = '4301', out = '/workspace/atqr-proof/pose2', js = '{}', views = 'front,side', hd = ''] = process.argv; fs.mkdirSync(out, { recursive: true });
const defs = JSON.parse(js); const names = Object.keys(defs);
const { b, p, errs } = await openGame(port, 2, { skip: false });
await p.evaluate(() => { const g = window.__atq.game; g.dlgQ = []; g.dlgCur = null; g.cut = null; const d = g.npcs.marcus; d.root.visible = true; d.update = null; g.alive().forEach(z => z.root.position.set(900, 0, 900)); g.npcs.nia.root.visible = false;
  d.root.position.set(-11, 0, 19.2); d.root.rotation.y = 0; g.player.root.position.set(-30, 0, 19); const V = g.camera.position.constructor; const mc = { anim: 'Idle_Loop', cam: new V(), look: new V(-11, 1.1, 19.2), flash: false }; g.cut = mc; g.world.walls.forEach(w => { w.visible = false; }); window.__view = 'front';
  const ou = g.update.bind(g); g.update = (a, c) => { ou(a, c); g.cut = mc; g.convo = null; g.dlgQ = []; d.root.rotation.y = 0; d.root.position.set(-11, 0, 19.2); const o = { front: [0.4, 0.2, 2.0], side: [2.0, 0.2, 0.2], back: [-0.6, 0.3, -2.0], right: [-2.0, 0.2, 0.3] }[window.__view]; mc.cam.set(-11 + o[0], 1.1 + o[1], 19.2 + o[2]); g.camera.position.copy(mc.cam); g._lk = mc.look.clone(); }; });
await p.evaluate(() => { const g = window.__atq.game; for (let i = 0; i < 20; i++) g.update(1 / 30, 1 / 30); });
const files = [];
for (const n of names) for (const view of views.split(',')) { await p.evaluate(([n, pose, view]) => { const g = window.__atq.game, d = g.npcs.marcus; window.__view = view; g.ACT.POSES['_t'] = typeof pose === 'string' ? g.ACT.POSES[pose] : pose; d.ax = null; const a = g.ACT.actStart(d, { pose: '_t', hold: true }); a.w = 1; }, [n, defs[n], view]);
  const f = `${out}/${n}_${view}.png`; await stepShot(p, f, 14, 1 / 30, 700); files.push(f); }
{ const { execFileSync } = await import('child_process'); fs.writeFileSync('/tmp/_c.py', `
import sys
from PIL import Image, ImageDraw
out=sys.argv[1]; cols=int(sys.argv[2]); fs=sys.argv[3:]
ims=[Image.open(f).convert('RGB').crop((272,30,572,330)) for f in fs]
rows=(len(ims)+cols-1)//cols; S=Image.new('RGB',(cols*300,rows*300)); d=ImageDraw.Draw(S)
for i,im in enumerate(ims):
    S.paste(im,((i%cols)*300,(i//cols)*300)); d.text(((i%cols)*300+6,(i//cols)*300+4),fs[i].split('/')[-1][:-4],fill=(255,255,0))
S.save(out)`); execFileSync('python3', ['/tmp/_c.py', `${out}/sheet_${Date.now()%100000}.png`, String(views.split(',').length * 2), ...files]); } console.log(errs.slice(0, 3), names.join(',')); await b.close();
