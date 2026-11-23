// Enter/exit the solo town N times (local room), count live three.js objects + heap after GC via CDP.
import { chromium } from 'playwright'; import fs from 'fs';
import { context, page, enter, frames } from '../coop/lib.mjs';
const N = +(process.env.N || 3), SNAP = process.env.SNAP;
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--enable-precise-memory-info', '--js-flags=--expose-gc'] });
const ctx = await context(b); await ctx.addInitScript(() => localStorage.setItem('atq.town.tut', '1')); const p = await page(ctx, 'A');
const cdp = await ctx.newCDPSession(p);
async function count() { await p.evaluate(() => { window.gc && window.gc(); }); await cdp.send('HeapProfiler.collectGarbage');
  const out = {}; for (const [k, expr] of [['Object3D', "window.__T3.Object3D.prototype"], ['BufferGeometry', "window.__T3.BufferGeometry.prototype"], ['Material', "window.__T3.Material.prototype"]]) {
    const { result } = await cdp.send('Runtime.evaluate', { expression: expr, objectGroup: 'leak' }); const q = await cdp.send('Runtime.queryObjects', { prototypeObjectId: result.objectId, objectGroup: 'leak' }); const { result: n } = await cdp.send('Runtime.callFunctionOn', { objectId: q.objects.objectId, functionDeclaration: 'function(){return this.length}', returnByValue: true }); out[k] = n.value; await cdp.send('Runtime.releaseObjectGroup', { objectGroup: 'leak' }); }
  await cdp.send('HeapProfiler.collectGarbage'); out.heap = await p.evaluate(() => Math.round(performance.memory.usedJSHeapSize / 1048576)); return out; }
await p.evaluate(async () => { window.__T3 = await import('/node_modules/three/build/three.module.js'); });
console.log('base', JSON.stringify(await count()));
for (let i = 0; i < N; i++) { await enter(p, { name: 'Leak', room: 'test-leak-' + i }); await frames(p, 20);
  console.log('in', i, JSON.stringify(await count()));
  await p.evaluate(() => window.__mpTown.exit()); await p.waitForFunction(() => !window.__mpTown, null, { timeout: 60000 }); await p.waitForTimeout(1500);
  console.log('out', i, JSON.stringify(await count())); }
if (SNAP) { const chunks = []; cdp.on('HeapProfiler.addHeapSnapshotChunk', e => chunks.push(e.chunk)); await cdp.send('HeapProfiler.takeHeapSnapshot', { reportProgress: false }); fs.writeFileSync(SNAP, chunks.join('')); console.log('snap', SNAP); }
await b.close();
