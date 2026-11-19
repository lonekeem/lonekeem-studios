import { launch, client, ctxOpts } from './townlib.mjs';
const out = (process.env.OUT || '/workspace/atqtown/docs/mp-town-proof/') + 'house';
const b = await launch(); const ctx = await b.newContext(ctxOpts); const p = await client(ctx, 'A');
const info = await p.evaluate(() => { const T = window.__mpTown; const bd = T.W.enterable.find(b => b.kind === 'house'); const D = bd.doors.find(d => d.name === 'front'); const th = bd.cfg; const ang = { S: 0, E: Math.PI / 2, N: Math.PI, W: -Math.PI / 2 }[bd.cfg.face]; const ox = Math.sin(ang), oz = Math.cos(ang); window.__h = { bd, D, ox, oz }; return { id: bd.id, face: bd.cfg.face, door: [D.x, D.z], out: [ox, oz], nd: bd.doors.map(d => d.name + ':' + d.installed), nc: bd.containers.length }; });
console.log(JSON.stringify(info));
const place = (dx, dz, back = 3.2) => p.evaluate(([dx, dz, back]) => { const T = window.__mpTown, { D, ox, oz } = window.__h; T.setPos(D.x + ox * back + dx, D.z + oz * back + dz); T.setCam(Math.atan2(-ox, -oz), .3, 4.2); }, [dx, dz, back]);
await place(0, 0, 3.4); await p.waitForTimeout(1200); await p.screenshot({ path: out + '_1_doorway_open.png' });
// shop: buy door
await p.evaluate(() => { const T = window.__mpTown; T.bag.add('cash', 20); T.togglePanel('shop'); }); await p.waitForTimeout(400); await p.screenshot({ path: out + '_2_shop.png' });
await p.evaluate(() => { const T = window.__mpTown; T.buyDoor(window.__h.D); T.closePanel(); }); await p.waitForTimeout(800); await p.screenshot({ path: out + '_3_door_bought.png' });
console.log('after buy', JSON.stringify(await p.evaluate(() => ({ st: window.__h.D.state, inst: window.__h.D.installed, cash: window.__mpTown.bag.count('cash'), col: window.__h.D.col.active }))));
await place(0, 0, 1.4); await p.waitForTimeout(300); console.log('acts', JSON.stringify(await p.evaluate(() => window.__mpTown.acts()))); await p.evaluate(() => window.__mpTown.use()); await p.waitForTimeout(1100); await p.screenshot({ path: out + '_4_door_open.png' });
console.log('door', JSON.stringify(await p.evaluate(() => ({ st: window.__h.D.state, open: window.__h.D.open, col: window.__h.D.col.active }))));
// walk inside
await p.evaluate(() => { const T = window.__mpTown, { D, ox, oz } = window.__h; T.setPos(D.x - ox * 1.6, D.z - oz * 1.6); T.setCam(Math.atan2(-ox, -oz), .9, 5); }); await p.waitForTimeout(1500); await p.screenshot({ path: out + '_5_inside.png' });
console.log('inside roof hidden', await p.evaluate(() => !window.__h.bd.roof.visible));
await b.close();
