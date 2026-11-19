import { open } from './pshot.mjs';
const { b, p } = await open(); const out = '/workspace/atqtown2/docs/mp-props-proof';
await p.evaluate(() => { H.mkZ({ target: 0 }); });
for (const [n, c] of Object.entries({ gas_shop: [48, 2.2, -12.3, 46, 1.6, -5.5], gas_sign: [30, 5, -30, 29, 8, -20.2], loot_spots: [31, 3, -2, 34, .5, -6.2] })) { await p.evaluate((c) => H.look(...c), c); await p.waitForTimeout(300); await p.screenshot({ path: `${out}/${n}.png` }); }
await b.close();
