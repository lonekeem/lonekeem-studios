// lifecycle audit of town survivors (story): node tools/proof_survivors.mjs <port> <fate> [seconds]
import { openGame } from './proof_lib.mjs';
const [,, port = '5330', fate = 'caught', secs = '60'] = process.argv;
const { b, p, errs } = await openGame(port, 1, { skip: true });
const r = await p.evaluate(([fate, secs]) => { const g = window.__atq.game; g.dlgQ = []; g.dlgCur = null; g.cut = null; g.wpTarget = null; g.alive().forEach(z => z.root.position.set(900, 0, 900)); g.player.root.position.set(6.5, 0, 9); g.hp = g.maxHp = 9999; g.paused = true; for (let i = 0; i < 12; i++) g.update(1 / 30, 1 / 30);
  g.town.force(fate, { near: false, dir: -1 }); const T = g.town; const log = []; let last = ''; const inScene = o => { let a = o; while (a) { if (a === g.scene) return true; a = a.parent; } return false; };
  const first = T.npcs[0]; if (!first) return { err: 'no event started', log };
  const CP = g.camera.position; let spawnD = Math.hypot(first.root.position.x - g.player.root.position.x, first.root.position.z - g.player.root.position.z);
  for (let t = 0; t < secs; t += 1 / 30) { g.update(1 / 30, 1 / 30); const st = first.tn ? first.tn.state + (first.tn.frozen ? ':frozen' : '') : '?'; const info = `${st}|inScene=${inScene(first.root)}|vis=${first.root.visible}|npcs=${T.npcs.length}|bodies=${T.bodies.length}`; if (info !== last) { last = info; const P = first.root.position; log.push(t.toFixed(1) + 's ' + info + ` pos=${P.x.toFixed(0)},${P.z.toFixed(0)} dist=${Math.hypot(P.x - g.player.root.position.x, P.z - g.player.root.position.z).toFixed(0)}`); } }
  return { spawnD, log, fate }; }, [fate, +secs]);
console.log(JSON.stringify(r, null, 1)); console.log('errors', errs.slice(0, 3)); await b.close();
