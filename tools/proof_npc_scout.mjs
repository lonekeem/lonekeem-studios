import { openGame, stepShot } from './proof_lib.mjs';
const [,, port = '5391', out = '/workspace/atqnpc-proof/scout', step = '1'] = process.argv;
const { b, p, errs } = await openGame(port, +step, { skip: true });
await p.evaluate(() => { const g = window.__atq.game; g.dlgQ = []; g.dlgCur = null; g.cut = null; g.player.root.position.set(0, 0, 30); g.cam.yaw = 0; });
await stepShot(p, `${out}/a.png`, 10, 1/30, 800);
await p.evaluate(() => { const g = window.__atq.game; g.player.root.position.set(0, 0, 0); g.cam.yaw = 0; });
await stepShot(p, `${out}/b.png`, 10, 1/30, 800);
console.log(await p.evaluate(() => { const g = window.__atq.game; return JSON.stringify({ step: g.step, zs: g.zombies.length, npcs: Object.keys(g.npcs), preset: g.preset && g.preset.name, cols: g.world.colliders.length }); }), errs.slice(0, 3));
await b.close();
