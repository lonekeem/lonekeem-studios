// town NPC proof: forces an event (door | caught | away) and shoots a phone-size (844x390) frame sheet with a chase camera
// usage: node tools/proof_town.mjs port outDir fate step px pz dir sd frames simStepsPerFrame
import { openGame, sheet } from './proof_lib.mjs';
import fs from 'fs';
const [,, port = '5391', out = '/workspace/atqnpc-proof/run', fate = 'door', step = '1', px = '3', pz = '4', dir = '1', sd = '22', n = '12', every = '8', side = '1'] = process.argv; fs.mkdirSync(out, { recursive: true });
const { b, p, errs } = await openGame(port, +step, { skip: true });
await p.evaluate(([px, pz]) => { const g = window.__atq.game; g.dlgQ = []; g.dlgCur = null; g.cut = null; g.alive().forEach(z => z.root.position.set(900, 0, 900)); g.player.root.position.set(+px, 0, +pz); g.hp = g.maxHp = 9999; g.paused = true; for (let i = 0; i < 10; i++) g.update(1 / 30, 1 / 30); g.player.root.visible = false; }, [px, pz]);
let ok = false; for (let i = 0; i < 6 && !ok; i++) ok = await p.evaluate(([f, d, s]) => window.__atq.game.town.force(f, { near: true, sd: +s, dir: +d }), [fate, dir, sd]); console.log('started', ok);
const files = []; let last = [0, 0, 0];
for (let i = 0; i < +n; i++) {
  const f = `${out}/${fate}_${String(i).padStart(2, '0')}.png`;
  await p.evaluate(([every, side]) => { const g = window.__atq.game, T = g.town; for (let k = 0; k < every; k++) g.update(1 / 30, 1 / 30);
    const c = T.npcs[0] || T.bodies[T.bodies.length - 1]; if (c) { const q = c.root.position; window.__last = [q.x, q.z, c.root.rotation.y]; } const [x, z, yw] = window.__last || [0, 0, 0];
    const V = g.camera.position.constructor; const px = Math.cos(yw) * 3.6 * side, pz = -Math.sin(yw) * 3.6 * side; g.camShot = { cam: new V(x + px - Math.sin(yw) * 1.2, 1.5, z + pz - Math.cos(yw) * 1.2), look: new V(x + Math.sin(yw) * .6, 1.0, z + Math.cos(yw) * .6) };
    if (!g.__pl) { g.__pl = new g.faceL.constructor('#fff0dc', 2.2, 12, 1.4); g.scene.add(g.__pl); } g.__pl.position.copy(g.camera.position); g.__pl.visible = true; }, [+every, +side]);
  await p.waitForTimeout(900); await p.screenshot({ path: f, timeout: 120000 }); files.push(f);
  console.log(i, await p.evaluate(() => { const g = window.__atq.game, T = g.town; return JSON.stringify({ npc: T.npcs.map(c => [c.tn.state, c.curName, +c.root.position.x.toFixed(1), +c.root.position.z.toFixed(1), c.root.visible]), door: T.doors.filter(d => d.k > 0).map(d => +d.k.toFixed(2)), eat: g.zombies.filter(z => z.st === 'eat' && z.eat && z.eat.tn).length, log: T.log, bodies: T.bodies.length }); }));
}
sheet(files, `${out}/${fate}_sheet.jpg`, 3, 0.75); console.log(errs.slice(0, 5)); await b.close();
