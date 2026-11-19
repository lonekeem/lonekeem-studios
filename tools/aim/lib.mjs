import { chromium } from 'playwright';
export const URL = process.env.TOWN_URL || 'http://127.0.0.1:5241/';
export const OUT = '/workspace/atqaim/docs/mp-aim';
export async function launch() { return chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] }); }
export const ctxOpts = { viewport: { width: 844, height: 390 }, deviceScaleFactor: 1.5, hasTouch: true, isMobile: true };
export async function client(ctx, { name = 'A', keem = false, quiet = false } = {}) {
  await ctx.route(/supabase\.co/, r => r.abort()); const p = await ctx.newPage(); p.on('pageerror', e => console.log(name, 'ERR', e.message, (e.stack || '').split('\n').slice(1, 4).join('|'))); p.on('console', m => { if (!quiet && (m.type() === 'error')) console.log(name, 'CE', m.text().slice(0, 240)); });
  if (keem) await p.addInitScript(() => { window.__MP_FORCE_ADMIN = 1; });
  await p.goto(URL); await p.waitForSelector('#btnWarn'); await p.click('#btnWarn'); await p.waitForSelector('#btnMP'); await p.click('#btnMP');
  await p.waitForFunction(() => window.__mpCreator && window.__mpCreator.av(), null, { timeout: 120000 }); await p.waitForTimeout(1200);
  if (keem) await p.evaluate(() => window.__mpKeemBtn.click()); else await p.evaluate(() => window.__mpCreator.close(true));
  await p.waitForFunction(() => window.__mpTown, null, { timeout: 120000 }); await p.waitForTimeout(1500); return p;
}
export const fr = (p, n) => p.evaluate(n => new Promise(r => { let k = 0; const f = () => { if (++k >= n) r(); else requestAnimationFrame(f); }; requestAnimationFrame(f); }), n);
