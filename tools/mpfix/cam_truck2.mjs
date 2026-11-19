import { boot, OUT } from './lib.mjs';
const tag = process.argv[2] || 'before'; const { b, p } = await boot();
// camera ends at the truck middle: player 4.7 m (+ on the x axis) past the middle, looking -> camera at -x; yaw = pi/2
const cases = [['endmid', 41 + 4.7, -15.9, .12], ['endmid_off', 41 + 4.7, -15.0, .12], ['endmid_hi', 41 + 4.7, -15.9, .5]];
for (const [name, x, z, pitch] of cases) {
  await p.evaluate(([x, z, pitch]) => { const T = window.__mpTown; T.setPos(x, z); T.me.ry = Math.PI/2; T.setCam(Math.PI/2, pitch, 4.8); }, [x, z, pitch]);
  await p.waitForTimeout(3000);
  const r = await p.evaluate(() => { const T = window.__mpTown, c = T.W.cars.find(k => k.id === 'c7'), cp = T.cam.position; return { me: [T.me.x, T.me.z], cam: [+cp.x.toFixed(2), +cp.y.toFixed(2), +cp.z.toFixed(2)], car: [c.x, c.z, c.ry] }; });
  console.log(name, JSON.stringify(r)); await p.screenshot({ path: `${OUT}/cam_${tag}_${name}.png` });
}
await b.close();
