import { chromium } from 'playwright';
const URL = process.env.TOWN_URL || 'http://127.0.0.1:5210/'; const out = process.argv[2] || '/workspace/atqtown/docs/mp-town-proof/hud_story.png';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1.5, hasTouch: true, isMobile: true }); const p = await ctx.newPage();
p.on('pageerror', e => console.log('ERR', e.message));
await p.goto(URL); await p.waitForSelector('#btnWarn'); await p.click('#btnWarn'); await p.waitForSelector('#btnSurvival', { state: 'visible' });
await p.click('#btnSurvival'); await p.waitForFunction(() => window.__atq.state === 'play', null, { timeout: 150000 }).catch(e => console.log('no play', e.message)); await p.waitForTimeout(6000);
console.log(await p.evaluate(() => window.__atq.state)); await p.screenshot({ path: out }); await b.close();
