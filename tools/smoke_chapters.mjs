// smoke for the chapter registry: loads every stub/real step of chapters 12+ (step indices passed or auto 55..), screenshots the spawn view,
// teleports to the end marker to prove the step chain + end card. usage: node tools/smoke_chapters.mjs <port> [firstStep] [lastStep] [outDir]
import { openGame, stepShot } from './proof_lib.mjs';
const port = process.argv[2] || '4377', a = +(process.argv[3] || 55), z = +(process.argv[4] || 64), out = process.argv[5] || '/tmp'; let bad = 0;
for (let st = a; st <= z; st++) { const { b, p, errs } = await openGame(port, st, { skip: true });
  const info = await p.evaluate(() => { const g = window.__atq.game; return { step: g.step, ch: g.save.ch, obj: document.querySelector('#obj')?.textContent, pos: [g.player.root.position.x, g.player.root.position.z], wp: g.wpTarget }; });
  await stepShot(p, `${out}/step${st}.png`, 12);
  // walk the player to the waypoint (if any) and let the step logic fire
  const nx = await p.evaluate(() => { const g = window.__atq.game; g.hp = g.maxHp = 9999; if (g.wpTarget) { g.player.root.position.set(g.wpTarget[0], 0, g.wpTarget[2]); } g.cut = null; for (let i = 0; i < 90; i++) { g.update(1 / 30, 1 / 30); } return { step: g.step, state: window.__atq.state, ending: !document.querySelector('#ending')?.classList.contains('hidden') }; });
  console.log(st, JSON.stringify(info), '->', JSON.stringify(nx), 'errors:', errs.length, errs.slice(0, 2)); bad += errs.length; await b.close(); }
console.log(bad ? 'FAIL' : 'CHAPTERS SMOKE OK'); process.exit(bad ? 1 : 0);
