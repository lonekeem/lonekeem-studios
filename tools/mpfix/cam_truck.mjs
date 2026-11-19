import { boot, OUT } from './lib.mjs';
const tag = process.argv[2] || 'before'; const { b, p } = await boot();
// truck c7 (41,-15.9) along x. Stand on its +z side, camera pushed to the truck side (yaw 0: camera at -z of player)
const cases = [['mid', 41, -14.0, 0, .22, 4.8], ['rear', 38.0, -14.1, 0, .22, 4.8], ['front', 44.0, -14.2, 0, .3, 4.8], ['end', 36.0, -15.9, Math.PI / 2, .25, 4.8]];
for (const [name, x, z, yaw, pitch, dist] of cases) {
  await p.evaluate(([x, z, yaw, pitch, dist]) => { const T = window.__mpTown; T.setPos(x, z); T.me.ry = yaw; T.setCam(yaw, pitch, dist); }, [x, z, yaw, pitch, dist]);
  await p.waitForTimeout(3000);
  const r = await p.evaluate(() => { const T = window.__mpTown, c = T.W.cars.find(k => k.id === 'c7'), cp = T.cam.position; const dx = cp.x - c.x, dz = cp.z - c.z; const s = Math.sin(c.ry), co = Math.cos(c.ry); const lx = dx * co - dz * s, lz = dx * s + dz * co; return { cam: [+cp.x.toFixed(2), +cp.y.toFixed(2), +cp.z.toFixed(2)], local: [+lx.toFixed(2), +lz.toFixed(2)], L: c.L }; });
  console.log(name, JSON.stringify(r)); await p.screenshot({ path: `${OUT}/cam_${tag}_${name}.png` });
}
await b.close();
