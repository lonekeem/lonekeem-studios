import { boot, OUT } from './lib.mjs';
const { b, p } = await boot();
const tag = process.argv[2] || 'before';
const B = await p.evaluate(() => window.__mpTown.Z.zombies.filter(z => z.dead).slice(0, 8).map(z => ({ x: +z.root.position.x.toFixed(1), z: +z.root.position.z.toFixed(1), zed: z.z, rig: z.look && z.look.rig })));
console.log(JSON.stringify(B));
for (const [i, [bx, bz]] of [[-4, 23], [-1, 25.5]].entries()) {
  await p.evaluate(([bx, bz]) => { const T = window.__mpTown; T.setPos(bx + 2.2, bz - 1.2); T.me.ry = 0; T.setCam(Math.atan2(bx - (bx + 2.2), bz - (bz - 1.2)), .35, 3.2); }, [bx, bz]);
  await p.waitForTimeout(3500); await p.screenshot({ path: `${OUT}/_body_${tag}_${i}.png` });
}
await b.close();
