import { launch, client, ctxOpts } from './townlib.mjs';
const b = await launch(); const ctx = await b.newContext(ctxOpts); const p = await client(ctx, 'A'); await p.evaluate(() => { window.__MP_DTCAP = .15; }); await p.waitForTimeout(2500);
const r = await p.evaluate(() => { const S = window.__mpTown.scene; const cnt = o => { let n = 0, inst = 0; o.traverse(m => { if (m.isMesh) { n++; if (m.isInstancedMesh) inst++; } }); return [n, inst]; };
  const sig = o => { const a = []; o.traverse(m => { if (m.isMesh && a.length < 4) a.push((m.isInstancedMesh ? 'I' : 'M') + (m.geometry.attributes.position.count)); }); return a.join(','); };
  const out = []; for (const c of S.children) { if (c.isLight) continue; out.push([c.type, c.name, c.visible, ...cnt(c), c.children.length, sig(c)]); if (c.children.length > 20) for (const d of c.children.slice(0, 85)) { const k = cnt(d); out.push(['   ', d.type, d.name, d.visible, ...k, d.children.length, sig(d), d.position.x.toFixed(0) + ',' + d.position.z.toFixed(0)]); } } return out; });
for (const x of r) console.log(x.join(' ')); await b.close();
