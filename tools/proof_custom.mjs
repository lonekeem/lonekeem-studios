// "My Character" proof: clicks options in the customizer, screenshots the mp-avatar preview after each, buys an outfit, saves, reloads.
import { chromium } from 'playwright';
const PORT = process.env.PORT || 4191, OUT = process.env.OUT || '/workspace/atq-custom-proof';
const steps = JSON.parse(process.argv[2] || '[]'); const tag = process.argv[3] || 'x'; const fresh = process.env.FRESH !== '0';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const ctx = await b.newContext({ viewport: { width: 844, height: 600 }, deviceScaleFactor: 1 });
await ctx.addInitScript((fresh) => { if (sessionStorage.getItem('_init')) return; sessionStorage.setItem('_init', 1); localStorage.setItem('atq3.settings', JSON.stringify({ qual: 'low', gore: true })); localStorage.setItem('atq_prologue_seen', '1');
  if (fresh) localStorage.setItem('atq3_save', JSON.stringify({ v: 3, step: 3, cash: 5000, xp: 0, level: 6, owned: ['fists'], outfits: ['classic'] })); }, fresh);
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); p.on('dialog', d => d.accept());
await p.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load' }); await p.waitForTimeout(1500);
const open = async () => { await p.evaluate(() => document.querySelector('#btnCustom').click()); await p.waitForFunction(() => document.querySelector('#cList button'), null, { timeout: 120000 }); await p.waitForTimeout(3000); };
await open(); console.log('label', await p.evaluate(() => [document.querySelector('#btnCustom').textContent, document.querySelector('#custom h2').textContent]));
for (const s of steps) {
  if (s.reload) { await p.evaluate(() => document.querySelector('#cSave').click()); await p.waitForTimeout(500); await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(1500); await open(); }
  if (s.tab) await p.evaluate((t) => [...document.querySelectorAll('#cTabs button')].find(b => b.textContent === t).click(), s.tab);
  if (s.click) { const r = await p.evaluate((t) => { const bt = [...document.querySelectorAll('#cList button')].find(b => b.textContent.startsWith(t) || b.innerHTML.includes(t)); if (!bt) return 'missing'; bt.click(); return 'ok'; }, s.click); if (r !== 'ok') console.log('missing', s.click); }
  await p.waitForTimeout(s.wait || 2500);
  if (s.name) { const el = await p.$('#cPrev'); await el.screenshot({ path: `${OUT}/${tag}_${s.name}.png` }); if (s.full) await p.screenshot({ path: `${OUT}/${tag}_${s.name}_screen.png` }); }
  if (s.log) console.log(s.name || s.click, await p.evaluate(() => ({ cash: window.__atq.save.cash, outfits: window.__atq.save.outfits, cashLine: document.querySelector('#cCash').textContent, sel: localStorage.getItem('atq3.look'), mp: (JSON.parse(localStorage.getItem('atq.mp.look.v1') || 'null') || {}).worn })));
}
if (process.env.SAVE) { await p.evaluate(() => document.querySelector('#cSave').click()); await p.waitForTimeout(500); }
console.log('errors:', errs.slice(0, 5)); await b.close();
