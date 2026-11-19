import { boot, OUT } from './lib.mjs';
const { b, p } = await boot();
const cases = [['truck_side', 41, -13.5, 0, .12, 4.8], ['truck_side2', 40, -13.5, 0, .2, 4.8], ['wall_kiosk', 44, -9.7, Math.PI, .3, 4.8], ['house_wall', 20.5, 17.2, Math.PI, .3, 4.8], ['pillar', 40, -14.0, -Math.PI/2, .6, 5.5]];
for (const [name, x, z, yaw, pitch, dist] of cases) {
  await p.evaluate(([x, z, yaw, pitch, dist]) => { const T = window.__mpTown; T.setPos(x, z); T.me.ry = yaw; T.setCam(yaw, pitch, dist); }, [x, z, yaw, pitch, dist]);
  await p.waitForTimeout(3000);
  const r = await p.evaluate(() => { const T = window.__mpTown, cp = T.cam.position; return { me: [+T.me.x.toFixed(2), +T.me.z.toFixed(2)], cam: [+cp.x.toFixed(2), +cp.y.toFixed(2), +cp.z.toFixed(2)], dist: +Math.hypot(cp.x - T.me.x, cp.z - T.me.z).toFixed(2) }; });
  console.log(name, JSON.stringify(r)); await p.screenshot({ path: `${OUT}/cam_proof_${name}.png` });
}
await b.close();
