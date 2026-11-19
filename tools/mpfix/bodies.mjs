import { boot, OUT, freecam } from './lib.mjs';
const tag = process.argv[2] || 'before'; const { b, p } = await boot();
const list = [[-4, 23, 'h'], [12, -22, 'h'], [-24.5, 0, 'h'], [24.5, 12, 'h'], [44, -10, 'h'], [-7, -17, 'h'], [5, 23.5, 'h'], [-23.5, 33, 'h'], [-1, 25.5, 'z']];
for (const [i, [x, z, k]] of list.entries()) {
  await p.evaluate(([x, z]) => { window.__mpTown.setPos(x + 3, z + 3); }, [x, z]);
  await freecam(p, [x + 1.5, 1.7, z + 1.9], [x, .2, z]); await p.waitForTimeout(2200); await p.screenshot({ path: `${OUT}/_b_${tag}_${i}_${k}.png` });
  console.log(i, k, JSON.stringify(await p.evaluate(([x, z]) => { const q = window.__mpTown.Z.zombies.find(q => q.dead && Math.hypot(q.root.position.x - x, q.root.position.z - z) < .3); return q && { rig: q.look.rig, outfit: q.look.outfit, z: q.z, vis: q.root.visible }; }, [x, z])));
}
await b.close();
