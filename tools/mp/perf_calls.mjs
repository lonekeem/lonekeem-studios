import { launch, client, ctxOpts } from './townlib.mjs';
const b = await launch(); const ctx = await b.newContext(ctxOpts); const p = await client(ctx, 'A'); await p.evaluate(() => { window.__MP_DTCAP = .15; }); await p.waitForTimeout(3000);
const r = await p.evaluate(() => { const T = window.__mpTown; const R = T.renderer, S = T.scene, C = T.cam; const m = () => { R.info.autoReset = false; R.info.reset(); R.render(S, C); const i = R.info.render; const o = [i.calls, i.triangles]; R.info.autoReset = true; return o; };
  const base = m(); const out = { base, parts: [] };
  const walk = (o, depth, path) => { if (!o.isObject3D) return; for (const c of o.children) { if (c.isLight) continue; const was = c.visible; c.visible = false; const x = m(); c.visible = was; const dc = base[0] - x[0], dt = base[1] - x[1]; if (dc >= 4) { out.parts.push([path + '/' + (c.name || c.type + c.children.length), dc, dt]); if (depth < 2 && c.children.length > 1) walk(c, depth + 1, path + '/' + (c.name || c.type + c.children.length)); } } };
  walk(S, 0, ''); return out; });
console.log(JSON.stringify(r.base)); for (const x of r.parts) console.log(x.join(' ')); await b.close();
