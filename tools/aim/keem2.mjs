import { launch, ctxOpts, client, fr, OUT } from './lib.mjs';
const b = await launch(); const ctx = await b.newContext(ctxOpts); const p = await client(ctx, { keem: true });
await p.evaluate(() => { window.__MP_DTCAP = .05; window.__mpTown.Z.killNear(0, 0, 400, 9999); });
await p.screenshot({ path: OUT + '/keem/idle_chase.png' });
await p.evaluate(() => { const T = window.__mpTown; T.inp.keys.KeyW = true; }); await fr(p, 40);
await p.screenshot({ path: OUT + '/keem/walking_prod.png' });
console.log(await p.evaluate(() => { const T = window.__mpTown, P = T.me.av.motion; let skinned = 0; P.model.traverse(o => { if (o.isSkinnedMesh) skinned++; }); return JSON.stringify({ cur: P.curName, loco: P.locoOn, spd: T.S.spd, skinned, gunParent: T.GS.mesh && T.GS.mesh.parent && T.GS.mesh.parent.name, gunVis: T.GS.mesh && T.GS.mesh.visible, t: P.mixer.time }); }));
await b.close();
