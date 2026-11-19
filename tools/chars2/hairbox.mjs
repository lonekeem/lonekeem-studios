import { chromium } from 'playwright';
const [,, k, id] = process.argv;
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 300, height: 200 } });
await p.goto(`http://127.0.0.1:${process.env.PORT || 5263}/tools/chars2/av.html?k=${k}&views=front&w=300&h=200&look=${encodeURIComponent(JSON.stringify({ hair: { id, c: '#222', c2: '#444', hl: .3 } }))}`); await p.waitForFunction(() => document.title === 'done');
console.log(await p.evaluate(() => { const av = window.av, g = av._hair.geometry, pos = g.attributes.position; const C = av.head2.C, s = av.head2.s; let mn = 9, mx = -9; for (let i = 0; i < pos.count; i++) { const y = (pos.getY(i) - C.y) / s; mn = Math.min(mn, y); mx = Math.max(mx, y); } return JSON.stringify({ mn, mx, s, Cy: C.y, tris: g.index.count / 3 }); })); await b.close();
