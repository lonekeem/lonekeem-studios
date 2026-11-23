import { chromium } from 'playwright'; import { writeFileSync, mkdirSync } from 'fs';
const dir = process.env.OUT || '/workspace/atq-sweep-proof/neck'; mkdirSync(dir, { recursive: true });
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 800, height: 600 } })).newPage(); p.on('pageerror', e => console.log('PAGEERR', e.message));
await p.goto((process.env.URL || 'http://127.0.0.1:5495/') + 'tools/neck_review.html' + (process.env.Q || ''));
await p.waitForFunction(() => window.__READY, null, { timeout: 700000, polling: 2000 });
const err = await p.evaluate(() => window.__ERROR); if (err) console.log('ERR', err);
const shots = await p.evaluate(() => window.__SHOTS); for (const [k, v] of Object.entries(shots)) writeFileSync(`${dir}/${k}.png`, Buffer.from(v.split(',')[1], 'base64'));
console.log((await p.evaluate(() => window.__MS || [])).join('\n')); console.log('shots', Object.keys(shots).length); await b.close();
