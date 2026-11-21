// Character look proof: default new character + a set of looks, each shot full-body and head close-up in the profile preview.
import { chromium } from 'playwright';
const PORT = process.env.PORT || 4191, OUT = process.env.OUT || '/workspace/atq-custom-proof/v2'; const looks = JSON.parse(process.argv[2]);
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const ctx = await b.newContext({ viewport: { width: 1100, height: 620 }, deviceScaleFactor: 1 });
await ctx.addInitScript(() => { localStorage.setItem('atq3.settings', JSON.stringify({ qual: 'low', gore: true })); localStorage.setItem('atq_prologue_seen', '1'); window.__MP_FAKE_AUTH = {}; });
await ctx.route(/supabase\.co/, r => r.abort());
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load' }); await p.waitForTimeout(1200);
await p.evaluate(() => { document.querySelector('#warning').classList.add('hidden'); document.querySelector('#btnCustom').click(); }); await p.waitForSelector('#prof .welcome', { timeout: 60000 });
await p.evaluate(() => [...document.querySelectorAll('#prof .welcome button')].find(b => b.textContent === 'Create profile').click()); await p.waitForSelector('#prof canvas');
for (const L of looks) {
  if (L.sel) await p.evaluate((o) => window.__profUI.apply(o), L.sel);
  for (const [view, step] of [['body', 4], ['head', 3]]) { await p.evaluate(([st, r]) => { window.__profUI.setStep(st); window.__profUI.rot(r); }, [step, L.rot ?? 0.35]); await p.waitForTimeout(view === 'body' ? 3500 : 3500);
    const el = await p.$('#prof .stage'); await el.screenshot({ path: `${OUT}/${L.name}_${view}.png` }); }
}
console.log('errors:', errs.filter(e => !/supabase|Failed to load resource|ERR_FAILED/i.test(e)).slice(0, 5)); await b.close();
