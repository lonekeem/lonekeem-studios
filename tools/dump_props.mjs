// usage: node dump.mjs <port> <out.json> [step]
import { chromium } from 'playwright';
import fs from 'fs';
const [port, out, step = 'street'] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
await ctx.addInitScript(() => { localStorage.setItem('atq3.settings', JSON.stringify({ qual: 'high', gore: true })); localStorage.setItem('atq_prologue_seen', '1'); });
const p = await ctx.newPage(); p.on('pageerror', e => console.log('ERR', e.message));
await p.goto(`http://127.0.0.1:${port}/?step=${step}&god`, { waitUntil: 'load' });
await p.waitForFunction(() => window.__atq && window.__atq.game && window.__atq.game.running, null, { timeout: 180000 }); await p.waitForTimeout(3000);
const data = await p.evaluate(() => {
  const g = window.__atq.game, S = g.scene, r = (v) => Math.round(v * 1000) / 1000; const res = [];
  const skinRoots = new Set(); S.traverse(o => { if (o.isSkinnedMesh) { let q = o; while (q.parent && q.parent !== S) q = q.parent; skinRoots.add(q); } });
  const top = (o) => { let q = o; while (q.parent && q.parent !== S) q = q.parent; return q; };
  const P = new o3().constructor; function o3() { return S.position.clone(); }
  const V = S.position.constructor, Q = S.quaternion.constructor, E = S.rotation.constructor, B3 = (new (S.position.constructor)()).constructor;
  let idx = 0;
  S.traverse(o => { idx++; if (!(o.isMesh || o.isSprite || o.isPoints || o.isLine)) return; if (skinRoots.has(top(o))) return;
    o.updateWorldMatrix(true, false); const p = new V(), q = new Q(), s = new V(); o.matrixWorld.decompose(p, q, s); const e = new E().setFromQuaternion(q);
    const gm = o.geometry; let gp = ''; if (gm) { gp = gm.type + JSON.stringify(gm.parameters || {}).slice(0, 80) + ':' + (gm.attributes.position ? gm.attributes.position.count : 0); }
    const m = Array.isArray(o.material) ? o.material[0] : o.material; const col = m && m.color ? m.color.getHexString() : ''; const tex = m && m.map ? (m.map.name || m.map.uuid.slice(0, 4)) : '';
    let vis = true; for (let q2 = o; q2; q2 = q2.parent) if (!q2.visible) { vis = false; break; }
    if (gm && !gm.boundingBox) gm.computeBoundingBox();
    const bb = gm && gm.boundingBox ? gm.boundingBox.clone().applyMatrix4(o.matrixWorld) : null;
    const rec = { i: idx, t: o.type, n: o.name || '', gp, col, tex, mtype: m ? m.type : '', vis, p: [r(p.x), r(p.y), r(p.z)], e: [r(e.x), r(e.y), r(e.z)], s: [r(s.x), r(s.y), r(s.z)], bb: bb && isFinite(bb.min.x) ? [r(bb.min.x), r(bb.min.y), r(bb.min.z), r(bb.max.x), r(bb.max.y), r(bb.max.z)] : null };
    if (o.isInstancedMesh) { rec.count = o.count; const M = new (o.matrixWorld.constructor)(); const ins = []; for (let k = 0; k < o.count; k++) { o.getMatrixAt(k, M); M.premultiply(o.matrixWorld); M.decompose(p, q, s); e.setFromQuaternion(q); ins.push([r(p.x), r(p.y), r(p.z), r(e.y), r(s.x), r(s.y)]); } rec.ins = ins; }
    res.push(rec); });
  return { n: res.length, ground: typeof g.groundAt === 'function', objs: res, zones: g.world && g.world.zones ? Object.keys(g.world.zones).length : null };
});
fs.writeFileSync(out, JSON.stringify(data)); console.log('dumped', data.n, 'zones', data.zones);
await b.close();
