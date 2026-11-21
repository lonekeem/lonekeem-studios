import { chromium } from 'playwright'; import fs from 'fs';
const [,, port, file, w = '844', h = '390', shot = ''] = process.argv;
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const mobile = +w < 1000; const ctx = await b.newContext({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1, hasTouch: mobile, isMobile: mobile });
await ctx.addInitScript(() => localStorage.setItem('atq3.settings', JSON.stringify({ qual: 'low', gore: true })));
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => console.log('LOG', m.text().slice(0, 300)));
await p.goto(`http://localhost:${port}/?step=3&god${process.env.Q || ""}`, { waitUntil: 'load' });
await p.waitForFunction(() => window.__atq && window.__atq.game && window.__atq.game.running, null, { timeout: 120000 }); await p.waitForTimeout(2000);
const r = await p.evaluate(fs.readFileSync(file, 'utf8')); console.log(JSON.stringify(r, null, 0));
if (shot) { await p.waitForTimeout(400); try { await p.screenshot({ path: shot, timeout: 150000 }); } catch (e) { console.log('shotfail', e.message.slice(0, 80)); } }
console.log('errs', errs.slice(0, 3)); await b.close();
