import { client, ctxOpts, launch } from '../mpfix/lib.mjs';
const b = await launch(); const ctx = await b.newContext(ctxOpts); const p = await client(ctx);
const r = await p.evaluate(async () => { window.__MP_NOLOD = true; const T = window.__mpTown; const z = T.Z.spawnAt(0, 0, { rig: null }); await new Promise(r => setTimeout(r, 1500)); const hb = z.bone('DEF-head'); const out = { hs: hb.scale.toArray(), look: z.look, parts: (z.parts || []).map(m => [m.visible, m.parent.name, m.geometry.attributes.position.count, m.material.type, m.geometry.boundingSphere && m.geometry.boundingSphere.radius]) };
  const wp = new hb.position.constructor(); hb.getWorldPosition(wp); out.hw = wp.toArray(); out.root = z.root.position.toArray(); out.children = z.model.children.map(c => c.name + ':' + c.type); return out; });
console.log(JSON.stringify(r)); await b.close();
