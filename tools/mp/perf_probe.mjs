import { launch, client, ctxOpts } from './townlib.mjs';
const b = await launch(); const ctx = await b.newContext(ctxOpts); const p = await client(ctx, 'A'); await p.evaluate(() => { window.__MP_DTCAP = .15; });
await p.waitForTimeout(3000);
const r = await p.evaluate(() => { const T = window.__mpTown; const R = T.renderer, S = T.scene, C = T.cam; const m = () => { R.info.autoReset = false; R.info.reset(); R.render(S, C); const i = R.info.render; const o = [i.calls, i.triangles]; R.info.autoReset = true; return o; };
  const out = { all: m() }; const kids = S.children.map(c => ({ c, v: c.visible })); const zs = new Set(T.Z.zombies.map(z => z.root));
  const hideSet = (pred) => { for (const k of kids) if (pred(k.c)) k.c.visible = false; }; const restore = () => { for (const k of kids) k.c.visible = k.v; };
  hideSet(c => zs.has(c)); out.noZombies = m(); restore();
  const sh = R.shadowMap.enabled; R.shadowMap.enabled = false; out.noShadow = m(); R.shadowMap.enabled = sh;
  const lights = []; S.traverse(o => { if (o.isDirectionalLight && o.castShadow) lights.push(o); }); lights.forEach(l => l.castShadow = false); out.lightsNoShadowCast = m(); lights.forEach(l => l.castShadow = true);
  hideSet(c => !zs.has(c) && !c.isLight); const only = m(); restore(); out.zombiesOnlyApprox = only;
  out.zombieCount = T.Z.zombies.length; out.zombieVisible = T.Z.zombies.filter(z => z.root.visible).length;
  // top-level scene children by tris
  const tri = o => { let n = 0, d = 0; o.traverse(m => { if (m.isMesh && m.visible) { const g = m.geometry; n += (g.index ? g.index.count : g.attributes.position.count) / 3 * (m.isInstancedMesh ? m.count : 1); d++; } }); return [d, Math.round(n)]; };
  out.top = S.children.filter(c => !zs.has(c)).map(c => [c.type, c.name || c.children.length, ...tri(c)]).filter(x => x[3] > 8000).sort((a, b) => b[3] - a[3]).slice(0, 14);
  return out; });
console.log(JSON.stringify(r)); await b.close();
