// Orthographic top-down map render of the whole town (local solo room, Supabase blocked). OUT=png path, PHASE=day phase
import { launch, context, page, enter, frames } from '../coop/lib.mjs';
import { writeFileSync } from 'fs';
const OUT = process.env.OUT || '/workspace/atq-world-proof/top.png';
const b = await launch(); const ctx = await context(b, { viewport: { width: 1200, height: 1000 }, deviceScaleFactor: 1 }); const p = await page(ctx, 'A');
await enter(p, { name: 'Top', room: 'test-world-top' }); await frames(p, 10);
const url = await p.evaluate(async ([ph, cx, cz, hw]) => { const T = window.__mpTown; T.setDay(ph); 
  const r = T.renderer, sc = T.scene; const fog = sc.fog; sc.fog = null; const B = T.W.bounds; const hx = hw || B.x + 20, hz = hx * 1000 / 1200;

  const O = new (await import('/node_modules/three/build/three.module.js')).OrthographicCamera(-hx, hx, hz, -hz, 1, 2000); O.position.set(cx, 600, cz); O.up.set(0, 0, -1); O.lookAt(cx, 0, cz); O.updateMatrixWorld();
  // show everything (LOD/gates hide far things)
  sc.traverse(o => { if (o.isMesh || o.isInstancedMesh) o.frustumCulled = false; }); T.W.closed.update(cx, cz); const old = []; sc.traverse(o => { if (!o.visible && (o.isMesh || o.isGroup) && !o.isLight) { old.push(o); o.visible = true; } });
  r.setSize(1200, 1000, false); r.render(sc, O); const d = r.domElement.toDataURL('image/png'); sc.fog = fog; return d; }, [Number(process.env.PHASE || .5), Number(process.env.CX || 0), Number(process.env.CZ || 0), Number(process.env.HW || 0)]);
writeFileSync(OUT, Buffer.from(url.split(',')[1], 'base64')); console.log('ok', OUT, p.errs); await b.close();
