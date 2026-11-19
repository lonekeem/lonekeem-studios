// First-person proof frames (story): walking, aiming, near a wall. usage: node tools/proof_fp.mjs <port> <outdir> [tag]
import { openGame, stepShot } from './proof_lib.mjs';
import fs from 'fs';
const port = process.argv[2] || '4311', out = process.argv[3] || '/workspace/atqfp-proof', tag = process.argv[4] || 'fp'; fs.mkdirSync(out, { recursive: true });
const { b, p, errs } = await openGame(port, 1, { skip: true, w: 844, h: 390 });
await p.evaluate(() => { window.__lit = false; const g = window.__atq.game; g.god = true; g.cam.fp = true; g.settings.fp = true; g.zombies.forEach(z => { z.root.visible = false; }); });
const visible = () => p.evaluate(() => { const g = window.__atq.game, P = g.player, L = []; P.root.traverse(o => { if ((o.isMesh || o.isSkinnedMesh) && o.visible) { let v = true, a = o; while (a) { if (!a.visible) v = false; a = a.parent; } if (v) L.push(o.name || o.parent?.name || o.type); } }); const cp = g.camera.position, near = []; g.scene.traverse(o => { if (!(o.isMesh) || !o.visible) return; let v = true, a = o; while (a) { if (!a.visible) v = false; a = a.parent; } if (!v) return; if (!o.geometry.boundingBox) o.geometry.computeBoundingBox(); const bb = o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld); const d = Math.hypot(Math.max(bb.min.x - cp.x, 0, cp.x - bb.max.x), Math.max(bb.min.y - cp.y, 0, cp.y - bb.max.y), Math.max(bb.min.z - cp.z, 0, cp.z - bb.max.z)); if (d < .7) near.push([o.name || o.type, o.parent && o.parent.name, +d.toFixed(2), o.material && (o.material.name || o.material.type)]); });
 return { nearMeshes: near.slice(0, 12), n: L.length, sample: L.slice(0, 8), near: g.camera.near, pos: g.camera.position.toArray().map(x => +x.toFixed(2)) }; });
const go = (n) => p.evaluate((n) => { const g = window.__atq.game; g.paused = true; for (let i = 0; i < n; i++) { g.input.poll(1 / 30); g.update(1 / 30, 1 / 30); } }, n);
const key = (k, v) => p.evaluate(([k, v]) => { window.__atq.game.input.keys[k] = v; }, [k, v]);
const yawTo = (y) => p.evaluate((y) => { const g = window.__atq.game; g.cam.yaw = y; g.cam.pitch = -0.1; }, y);
const pos = () => p.evaluate(() => { const q = window.__atq.game.player.root.position; return [+q.x.toFixed(2), +q.z.toFixed(2)]; });
// open ground: pick the yaw with the longest free run so walking is unobstructed
const open = await p.evaluate(() => { const g = window.__atq.game, q = g.player.root.position; let best = [0, -1]; for (let a = 0; a < 48; a++) { const yaw = a / 48 * 6.2832, fx = -Math.sin(yaw), fz = -Math.cos(yaw); let d = 0; while (d < 12 && !g.inCol(q.x + fx * d, q.z + fz * d)) d += .25; if (d > best[1]) best = [yaw, d]; } return best; });
await yawTo(open[0]); await key('KeyW', true); await go(10); await stepShot(p, `${out}/${tag}-1-walk.png`, 0); const p1 = await pos(); await go(20); await stepShot(p, `${out}/${tag}-2-walk.png`, 0); console.log('walk', p1, await pos(), JSON.stringify(await visible()));
await key('KeyW', false); await go(5);
await p.evaluate(() => { window.__atq.game.cam.pitch = -0.85; }); await stepShot(p, `${out}/${tag}-3-look-down.png`, 0); console.log('down', JSON.stringify(await visible()));
await p.evaluate(() => { window.__atq.game.cam.pitch = -0.1; });
// aim (ADS) with the rifle
await p.evaluate(() => { const g = window.__atq.game; g.input.aim = true; }); await go(25); await stepShot(p, `${out}/${tag}-4-aim.png`, 0); console.log('aim', JSON.stringify(await visible()));
await p.evaluate(() => { window.__atq.game.input.aim = false; }); await go(15);
// near a wall: stand in front of the closest long building wall and walk into it until blocked
const wl = await p.evaluate(() => { const g = window.__atq.game, q = g.player.root.position; let best = null, bd = 1e9; for (const c of g.world.colliders) { if (c.car || c.skip) continue; const w = c.x1 - c.x0, d = c.z1 - c.z0; if (Math.max(w, d) < 6 || Math.min(w, d) > 1.2) continue; const dd = Math.hypot((c.x0 + c.x1) / 2 - q.x, (c.z0 + c.z1) / 2 - q.z); if (dd < bd) { bd = dd; best = c; } } if (!best) return null; const c = best, wide = (c.x1 - c.x0) > (c.z1 - c.z0); let x, z, yaw; if (wide) { x = (c.x0 + c.x1) / 2; z = c.z0 - 2.2; yaw = Math.PI; if (g.inCol(x, z)) { z = c.z1 + 2.2; yaw = 0; } } else { z = (c.z0 + c.z1) / 2; x = c.x0 - 2.2; yaw = -Math.PI / 2; if (g.inCol(x, z)) { x = c.x1 + 2.2; yaw = Math.PI / 2; } } q.x = x; q.z = z; g.cam.yaw = yaw; g.cam.pitch = -0.08; return { x, z, yaw, c: [c.x0, c.x1, c.z0, c.z1].map(v => +v.toFixed(1)) }; });
console.log('wall', JSON.stringify(wl)); await go(6); await stepShot(p, `${out}/${tag}-5-wall-far.png`, 0);
await key('KeyW', true); await go(22); await stepShot(p, `${out}/${tag}-6-wall-near.png`, 0); await go(40); await key('KeyW', false); await go(4);
console.log('wall pos', await pos(), JSON.stringify(await visible())); await stepShot(p, `${out}/${tag}-7-wall-touch.png`, 0); console.log('torch', JSON.stringify(await p.evaluate(() => { const g = window.__atq.game; return { l: g.flash.position.toArray().map(v => +v.toFixed(2)), t: g.flash.target.position.toArray().map(v => +v.toFixed(2)), c: g.camera.position.toArray().map(v => +v.toFixed(2)), wd: g._fpWallD, I: g.flash.intensity, a: g.flash.angle, vm: g.vm.position.toArray().map(v => +v.toFixed(2)) }; })));
await p.evaluate(() => { window.__atq.game.cam.pitch = 0.45; }); await go(8); await stepShot(p, `${out}/${tag}-8-wall-look-up.png`, 0);
await p.evaluate(() => { window.__atq.game.cam.pitch = -0.6; }); await go(8); await stepShot(p, `${out}/${tag}-9-wall-look-down.png`, 0);
await b.close(); console.log('errors', errs.length, errs.slice(0, 3));
