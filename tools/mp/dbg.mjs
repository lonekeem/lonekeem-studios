import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 600, height: 400 } }); p.on('pageerror', e => console.log('ERR', e.stack)); p.on('console', m => console.log('C', m.type(), m.text().slice(0,200)));
p.on('requestfailed', r => console.log('RF', r.url()));
await p.goto('http://127.0.0.1:5211/tools/mp/props.html?w=600&h=400'); await p.waitForTimeout(20000); console.log(await p.title(), await p.evaluate(() => typeof window.H + ' ' + (window.H && Object.keys(window.H).join(','))));
await b.close();
