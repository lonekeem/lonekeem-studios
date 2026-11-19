import { boot, OUT } from './lib.mjs';
const tag = process.argv[2] || 'before'; const { b, p } = await boot();
for (const [i, [bx, bz]] of [[-4, 23], [5, 23.5], [12, -22], [-1, 25.5]].entries()) {
  await p.evaluate(([bx, bz]) => { const T = window.__mpTown; T.setPos(bx, bz + 0.3); T.me.ry = 0; T.setCam(0, .75, 3.0); }, [bx, bz]);
  await p.waitForTimeout(3500); await p.screenshot({ path: `${OUT}/_body_${tag}_${i}.png` });
}
await b.close();
