import { launch, client, ctxOpts } from './townlib.mjs';
const out = '/workspace/atqtown/docs/mp-town-proof/loot';
const b = await launch(); const ctx = await b.newContext(ctxOpts); const p = await client(ctx, 'A');
// pick an enterable house; stand at its fridge/cabinet
const r = await p.evaluate(() => { const T = window.__mpTown; const bd = T.W.enterable.find(b => b.kind === 'house'); const c = bd.containers.find(k => k.kind === 'fridge') || bd.containers[0]; window.__c = c; T.setPos(c.x + c.fx * 1.0, c.z + c.fz * 1.0); T.setCam(Math.atan2(-c.fx, -c.fz), .75, 3.4); return { id: c.id, label: c.label, table: c.table, pos: [c.x, c.z] }; });
console.log(JSON.stringify(r)); await p.waitForTimeout(3500); console.log("acts", await p.evaluate(() => window.__mpTown.acts()));
await p.screenshot({ path: out + '_1_prompt.png' });
await p.evaluate(() => window.__mpTown.useHold(true)); await p.waitForTimeout(4000); await p.evaluate(() => window.__mpTown.useHold(false)); await p.waitForTimeout(2500);
await p.screenshot({ path: out + '_2_panel.png' });
console.log('items', JSON.stringify(await p.evaluate(() => window.__c.items)));
await p.evaluate(() => { const T = window.__mpTown; for (const it of window.__c.items.slice()) T.take(window.__c, it); T.closePanel(); }); await p.waitForTimeout(500);
console.log('bag', JSON.stringify(await p.evaluate(() => window.__mpTown.bag.items)), 'looted', await p.evaluate(() => window.__c.looted));
await p.evaluate(() => window.__mpTown.togglePanel('bag')); await p.waitForTimeout(300); await p.screenshot({ path: out + '_3_bag.png' });
await b.close();
