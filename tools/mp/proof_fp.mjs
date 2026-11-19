// MP first-person proof: walking, near a house wall, looking down. TOWN_URL=http://127.0.0.1:5311/ OUT=/dir/ node tools/mp/proof_fp.mjs
import { launch, client, ctxOpts } from './townlib.mjs';
import fs from 'fs';
const out = process.env.OUT || '/workspace/atqfp-proof/'; const tag = process.env.TAG || 'mp'; fs.mkdirSync(out, { recursive: true });
const b = await launch(); const ctx = await b.newContext(ctxOpts); const p = await client(ctx, 'A');
await p.evaluate(() => { window.__mpTown.Z.killNear(0, 0, 400, 9999); });
await p.keyboard.press('KeyV'); await p.waitForTimeout(500);
const info = () => p.evaluate(() => { const T = window.__mpTown; const vis = []; T.me.av.root.traverse(o => { if ((o.isMesh || o.isSkinnedMesh)) { let v = true, a = o; while (a) { if (!a.visible) v = false; a = a.parent; } if (v) vis.push(o.name || 'mesh'); } }); return { x: +T.me.x.toFixed(2), z: +T.me.z.toFixed(2), near: T.cam.near, camY: +T.cam.position.y.toFixed(2), ownAvatarVisibleMeshes: vis.length }; });
// open ground: walk forward along the longest free street heading
await p.evaluate(() => { const T = window.__mpTown; T.setPos(0, 0); T.setCam(0, null, null); T.key('KeyW', true); });
await p.waitForTimeout(1200); await p.screenshot({ path: out + tag + '-1-walk.png' }); console.log('walk', JSON.stringify(await info()));
await p.waitForTimeout(1500); await p.screenshot({ path: out + tag + '-2-walk.png' });
await p.evaluate(() => window.__mpTown.key('KeyW', false));
// look down (would show body/head if visible)
await p.waitForTimeout(300);
// near a house wall
const wl = await p.evaluate(() => { const T = window.__mpTown; const bd = T.W.buildings.find(b => b.kind === 'house'); const r = bd.rect; const x = r.x0 + 1.2, z = r.z0 - 4; T.setPos(x, z); T.setCam(0, null, null); return { id: bd.id, r: [r.x0, r.x1, r.z0, r.z1] }; });
console.log('wall', JSON.stringify(wl)); await p.waitForTimeout(600); await p.screenshot({ path: out + tag + '-3-wall-far.png' });
await p.evaluate(() => window.__mpTown.key('KeyW', true)); await p.waitForTimeout(2600); await p.evaluate(() => window.__mpTown.key('KeyW', false)); await p.waitForTimeout(400);
console.log('wall touch', JSON.stringify(await info())); await p.screenshot({ path: out + tag + '-4-wall-touch.png' });
await b.close();
