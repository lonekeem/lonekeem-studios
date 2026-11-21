// Admin-only 'Play as Keem' proof: admin sees the button in the profile creator and enters town as story Keem; a normal player never sees it.
import { chromium } from 'playwright';
const PORT = process.env.PORT || 4191, OUT = '/workspace/atq-custom-proof/keem_admin';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
for (const role of ['player', 'admin']) {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } });
  await ctx.addInitScript(r => { localStorage.setItem('atq3.settings', JSON.stringify({ qual: 'low', gore: true })); localStorage.setItem('atq_prologue_seen', '1'); window.__MP_FAKE_AUTH = { email: r + '@test', role: r }; }, role);
  await ctx.route(/supabase\.co/, r => r.abort());
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load' }); await p.waitForTimeout(1500);
  await p.evaluate(() => { document.querySelector('#warning').classList.add('hidden'); document.querySelector('#btnMP').click(); }); await p.waitForSelector('#prof', { timeout: 60000 });
  await p.evaluate(() => { const w = [...document.querySelectorAll('#prof .welcome button')].find(b => b.textContent === 'Create profile'); w && w.click(); });
  await p.waitForSelector('#prof canvas', { timeout: 60000 }); await p.waitForTimeout(3000);
  const vis = await p.evaluate(() => !!window.__profKeemBtn && window.__profKeemBtn.style.display !== 'none');
  await p.screenshot({ path: `${OUT}/${role}_creator.png` }); console.log(role, 'keem button visible:', vis);
  if (vis) { await p.evaluate(() => window.__profKeemBtn.click()); await p.waitForTimeout(15000); await p.screenshot({ path: `${OUT}/${role}_town_as_keem.png` }); }
  console.log(role, 'errors', errs.slice(0, 3)); await ctx.close();
}
await b.close();
