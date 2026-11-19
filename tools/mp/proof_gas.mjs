import { open } from './pshot.mjs';
const { b, p } = await open(); const out = process.argv[2] || '/workspace/atqtown2/docs/mp-props-proof';
await p.evaluate(async () => { await H.mkZ({ target: 0 }); });
for (const [n, c] of Object.entries({ gas_front: [34, 5.5, -26, 46, 1.5, -10], gas_pumps: [47, 3.2, -19, 44, 1.2, -13.5], gas_wide: [20, 14, -34, 46, 1, -8] })) { await p.evaluate((c) => H.look(...c), c); await p.waitForTimeout(400); await p.screenshot({ path: `${out}/${n}.png` }); }
await b.close();
