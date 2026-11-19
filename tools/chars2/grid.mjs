import { chromium } from 'playwright';
const [,, k, cat, out, cols = '8'] = process.argv;
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 400, height: 300 } }); p.on('pageerror', e => console.log('ERR', e.message)); p.on('console', m => { if (m.type() === 'error') console.log('CE', m.text().slice(0, 300)); });
await p.goto(`http://127.0.0.1:${process.env.PORT||5262}/tools/chars2/grid.html?k=${k}&cat=${cat}&cols=${cols}`); await p.waitForFunction(() => document.title === 'done', null, { timeout: 600000 });
const info = await p.evaluate(() => window.info); await p.setViewportSize({ width: info.W, height: info.H }); await p.locator('canvas').screenshot({ path: out }); console.log(cat, k, JSON.stringify(info)); await b.close();
