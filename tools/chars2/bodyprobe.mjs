import { chromium } from 'playwright';
const k = process.argv[2] || 'mp_f1';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 300, height: 200 } });
await p.goto(`http://127.0.0.1:${process.env.PORT || 5263}/tools/chars2/av.html?k=${k}&views=front&w=300&h=200`); await p.waitForFunction(() => document.title === 'done');
const r = await p.evaluate(() => { const av = window.av, g = av.skin.geometry, pos = g.attributes.position; const C = av.head2.C, s = av.head2.s; const rows = {};
  for (let i = 0; i < pos.count; i++) { const x = (pos.getX(i) - C.x) / s, y = (pos.getY(i) - C.y) / s, z = (pos.getZ(i) - C.z) / s; if (y > -.1 || y < -.6) continue; const kk = Math.round(y / .04) * .04; const o = rows[kk.toFixed(2)] || (rows[kk.toFixed(2)] = { xmax: 0, zmax: -9, zmin: 9, xz: {} }); o.xmax = Math.max(o.xmax, Math.abs(x)); o.zmax = Math.max(o.zmax, z); o.zmin = Math.min(o.zmin, z); const xb = (Math.round(Math.abs(x) / .04) * .04).toFixed(2); const q = o.xz[xb] || (o.xz[xb] = [9, -9]); q[0] = Math.min(q[0], z); q[1] = Math.max(q[1], z); }
  return { s, C: C.toArray(), rows }; });
console.log(JSON.stringify(r.rows, (k, v) => typeof v === 'number' ? +v.toFixed(3) : v)); console.log(r.s); await b.close();
