// Real in-game flow: ch3 motel scene -> Keem knocks -> dialogue -> Dad rolls up his sleeve and shows the bite.
import { openGame, stepShot, sheet } from './proof_lib.mjs';
import fs from 'fs';
const [,, port = '4301', out = '/workspace/atqr-proof/sleeve', N = '34'] = process.argv; fs.mkdirSync(out, { recursive: true });
const { b, p, errs } = await openGame(port, 15, { skip: false });
await p.evaluate(() => { const g = window.__atq.game; g.dlgQ = []; g.dlgCur = null; g.cut = null; g.alive().forEach(z => z.root.position.set(900, 0, 900)); g.player.root.position.set(21.3, 0, -385.6); g.player.root.rotation.y = Math.PI / 2; const u = g.stepData.uses[0]; u.fn(); });
const files = [], log = [];
for (let i = 0; i < +N; i++) { if ([3, 5, 19, 22, 25, 27, 29].includes(i)) await p.evaluate(() => window.__atq.game.nextLine()); const f = `${out}/s_${String(i).padStart(2, '0')}.png`; await stepShot(p, f, 9, 1 / 30, 450); files.push(f);
  log.push(await p.evaluate(() => { const g = window.__atq.game, d = g.npcs.marcus; const J = g.ACT.COVERED; return [(g.dlgCur && g.dlgCur.text || '').slice(0, 34), d && d.ax && d.ax.pose, d && d._slLeft && +d._slLeft.k.toFixed(2), g.camShot ? 'shot' : '-']; })); }
fs.writeFileSync(`${out}/log.json`, JSON.stringify(log)); sheet(files, `${out}/SLEEVE_sheet.png`, 6, 0.5);
console.log(errs.slice(0, 5), JSON.stringify(await p.evaluate(() => window.__atq.game.ACT.COVERED))); log.forEach((l, i) => console.log(i, JSON.stringify(l))); await b.close();
