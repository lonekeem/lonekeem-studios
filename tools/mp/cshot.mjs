import { chromium } from 'playwright'; import fs from 'fs';
const out = process.argv[2] || '/tmp/cs'; const url = process.env.U || 'http://127.0.0.1:5330/'; fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true }); const p = await ctx.newPage(); p.on('pageerror', e => console.log('ERR', e.message.slice(0, 200)));
await p.goto(url); await p.waitForSelector('#btnWarn'); await p.click('#btnWarn'); await p.click('#btnMP'); await p.waitForFunction(() => window.__mpCreator && window.__mpCreator.av(), null, { timeout: 120000 }); await p.waitForTimeout(2000);
await p.screenshot({ path: out + '/full.png' });
for (const v of ['Head', 'Upper']) { await p.getByText(v, { exact: true }).click(); await p.waitForTimeout(1200); await p.screenshot({ path: out + '/' + v + '.png' }); }
await b.close();
