// Fresh kills (real pistol path) lying on the road: measure lowest vertex vs the ground after settling, close-up + top-down shots
import { boot, freecam } from '../mpfix/lib.mjs'; import fs from 'fs';
const OUT = '/workspace/atq1919/docs/mp-fix2/surv'; fs.mkdirSync(OUT, { recursive: true });
const { b, p } = await boot(); const fr = n => p.evaluate(n => new Promise(r => { let k = 0; const f = () => { if (++k >= n) r(); else requestAnimationFrame(f); }; requestAnimationFrame(f); }), n);
await p.evaluate(() => { const T = window.__mpTown; T.Z.killNear(0, 0, 400, 9999); T.setPos(-6, 21.5); T.me.ry = -Math.PI / 2; T.camYaw(-Math.PI / 2 + Math.PI); window.__zs = [0, 1, 2].map(i => { const q = T.Z.spawnAt(-1 - i * 1.6, 21.3 + (i - 1) * .9, {}); q.st = 'idle'; q.hp = 20; q.root.rotation.y = i * 2.1; return q; }); T.bag.pref = 'pistol'; });
await fr(4);
// shoot each: aim straight at each zombie from the player (they stand roughly on the firing line)
for (let i = 0; i < 3; i++) { await p.evaluate(i => { const T = window.__mpTown, q = window.__zs[i]; T.me.ry = Math.atan2(q.root.position.x - T.me.x, q.root.position.z - T.me.z); T.hit(); }, i); await fr(6); }
const kills = await p.evaluate(() => window.__zs.map(q => ({ dead: q.dead, hp: Math.round(q.hp) })));
console.log('kills', JSON.stringify(kills));
for (let k = 0; k < 40; k++) { await fr(2); if (await p.evaluate(() => window.__zs.every(q => q.dead && q.settled))) break; }
const info = await p.evaluate(() => window.__zs.map(q => { q.root.updateMatrixWorld(true); let minY = 9; const v = new (q.root.position.constructor)(); q.root.traverse(o => { if (o.isSkinnedMesh) { o.skeleton.update(); const pp = o.geometry.attributes.position; for (let i = 0; i < pp.count; i += 7) { v.fromBufferAttribute(pp, i); if (o.applyBoneTransform) o.applyBoneTransform(i, v); v.applyMatrix4(o.matrixWorld); if (v.y < minY) minY = v.y; } } }); return { dead: q.dead, deadT: +q.deadT.toFixed(1), settled: !!q.settled, rootY: +q.root.position.y.toFixed(3), lowestVertexY: +minY.toFixed(3), poolOnRoad: !!q.pool }; }));
console.log('corpses', JSON.stringify(info)); fs.writeFileSync(OUT + '/corpses.json', JSON.stringify(info, null, 1));
await freecam(p, [-0.5, 1.1, 24.2], [-2.2, 0.15, 21.4]); await fr(4); await p.screenshot({ path: OUT + '/corpse_fresh_close.png' });
await freecam(p, [-2.4, 5.2, 23.6], [-2.4, 0, 21.4]); await fr(4); await p.screenshot({ path: OUT + '/corpse_fresh_top.png' });
await b.close();
