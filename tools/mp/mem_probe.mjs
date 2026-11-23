// Local-only memory probe of the free-roam town (solo room). Prints GPU resource counts for the town and story renderers.
import { launch, context, page, enter, frames } from '../coop/lib.mjs';
const b = await launch(); const ctx = await context(b); const p = await page(ctx, 'A');
const snap = () => p.evaluate(() => { const T = window.__mpTown; const out = {}; const est = r => { let px = 0, n = 0; const seen = new Set(); const sc = T && T.scene; return null; };
  if (T) { const r = T.renderer || (T.AG && T.AG.renderer); }
  const g = window.__atq && window.__atq.game; if (g && g.renderer) out.story = { mem: g.renderer.info.memory, calls: g.renderer.info.render.calls, ctx: !g.renderer.getContext().isContextLost(), running: !!g.running };
  if (T && T.stats) out.town = T.stats();
  // texture pixel estimate in town scene
  if (T && T.scene) { const tx = new Set(); let geoB = 0; const gs = new Set(); T.scene.traverse(o => { if (o.geometry && !gs.has(o.geometry)) { gs.add(o.geometry); for (const k in o.geometry.attributes) { const a = o.geometry.attributes[k]; geoB += (a.array && a.array.byteLength) || 0; } if (o.geometry.index) geoB += o.geometry.index.array.byteLength; } const ms = Array.isArray(o.material) ? o.material : [o.material]; for (const m of ms) if (m) for (const k in m) { const v = m[k]; if (v && v.isTexture) tx.add(v); } });
    let texPx = 0; for (const t of tx) { const im = t.image; if (im && im.width) texPx += im.width * im.height; } out.scene = { geos: gs.size, geoMB: +(geoB / 1048576).toFixed(1), texs: tx.size, texMBest: +(texPx * 4 * 1.33 / 1048576).toFixed(1) }; }
  out.heapMB = performance.memory ? +(performance.memory.usedJSHeapSize / 1048576).toFixed(0) : null; out.canvases = [...document.querySelectorAll('canvas')].map(c => (c.id || c.className) + ':' + c.width + 'x' + c.height); return out; });
console.log('title', JSON.stringify(await snap()));
await enter(p, { name: 'MemTest', room: 'test-mem-1' }); await frames(p, 30);
console.log('town', JSON.stringify(await snap()));
await p.evaluate(() => { const T = __mpTown; T.setDay(.05); T.setWeather('storm'); }); await frames(p, 60);
console.log('night', JSON.stringify(await snap()));
await b.close();
