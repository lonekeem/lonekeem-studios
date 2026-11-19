import { chromium } from 'playwright';
import { client, ctxOpts, launch } from '../mpfix/lib.mjs';
const b = await launch(); const ctx = await b.newContext(ctxOpts); const p = await client(ctx);
const r = await p.evaluate(async () => { const T = window.__mpTown; await new Promise(r => setTimeout(r, 4000)); const out = [];
  for (const z of T.Z.zombies.filter(q => !q.dead).slice(0, 6)) { const ms = []; z.root.traverse(o => { if (o.isMesh) ms.push([o.name || o.parent?.name, o.isSkinnedMesh ? 'S' : 'M', ((o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3) | 0, o.visible, o.userData.g0 ? 'lod' : '']); }); out.push({ lv: z._lv, rig: z.look && z.look.rig, ms }); } return out; });
console.log(JSON.stringify(r, null, 0)); await b.close();
