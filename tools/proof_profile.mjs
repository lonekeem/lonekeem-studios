// Profile + creator proof: Online first-time gate (welcome), step-by-step create, buy an outfit, finish -> town; reopen in edit mode; reload persistence.
import { chromium } from 'playwright';
const PORT = process.env.PORT || 4191, OUT = process.env.OUT || '/workspace/atq-custom-proof/profile'; const [VW, VH] = (process.env.VP || '844x390').split('x').map(Number); const tag = process.env.TAG || 'l';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const ctx = await b.newContext({ viewport: { width: VW, height: VH }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
await ctx.addInitScript(() => { if (sessionStorage.getItem('_init')) return; sessionStorage.setItem('_init', 1); localStorage.setItem('atq3.settings', JSON.stringify({ qual: 'low', gore: true })); localStorage.setItem('atq_prologue_seen', '1');
  localStorage.setItem('atq3_save', JSON.stringify({ v: 3, step: 3, cash: 3000, xp: 0, level: 3, owned: ['fists'], outfits: ['classic'] })); window.__MP_FAKE_AUTH = {}; });
await ctx.route(/supabase\.co/, r => r.abort()); // never join the live town from a test
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); p.on('dialog', d => d.accept());
const shot = async (n, w = 1800) => { await p.waitForTimeout(w); await p.screenshot({ path: `${OUT}/${tag}_${n}.png` }); };
const clickText = (sel, t) => p.evaluate(([sel, t]) => { const e = [...document.querySelectorAll(sel)].find(b => b.textContent.trim().startsWith(t)); if (!e) return 'missing ' + t; e.click(); return 'ok'; }, [sel, t]);
await p.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load' }); await p.waitForTimeout(1500);
await p.evaluate(() => { document.querySelector('#warning').classList.add('hidden'); document.querySelector('#btnMP').click(); }); await p.waitForSelector('#prof .welcome', { timeout: 60000 }); await shot('01_welcome', 800);
console.log(await clickText('#prof .welcome button', 'Create profile')); await p.waitForSelector('#prof canvas'); await p.fill('#prof input.name', 'Zuri'); await p.evaluate(() => window.__profUI.rot(0.3)); await shot('02_name', 4000);
await clickText('#prof .foot button', 'Next'); await p.evaluate(() => document.querySelectorAll('#prof .sws')[0].children[2].click()); await p.evaluate(() => document.querySelectorAll('#prof .sws')[1].children[4].click()); await shot('03_skin', 2500);
await clickText('#prof .foot button', 'Next'); await clickText('#prof .card', 'Round'); await clickText('#prof .card', 'Goatee'); await shot('04_face', 2500);
await clickText('#prof .foot button', 'Next'); await clickText('#prof .card', 'Box braids'); await p.evaluate(() => document.querySelectorAll('#prof .sws')[0].children[7].click()); await shot('05_hair', 2500);
await clickText('#prof .foot button', 'Next'); await shot('06_outfit_list', 2500); console.log('buy', await clickText('#prof .card', 'Tactical Gear')); await shot('07_outfit_bought', 2500);
console.log('cash after buy', await p.evaluate(() => [window.__atq.save.cash, JSON.parse(localStorage.getItem('atq3_save')).cash, document.querySelector('#profCash').textContent]));
console.log('locked', await clickText('#prof .card', 'Hazmat Suit'), await p.evaluate(() => document.querySelector('#prof .sub').textContent));
await clickText('#prof .foot button', 'Next'); await clickText('#prof .card', 'Backpack'); await p.evaluate(() => window.__profUI.rot(Math.PI * .8)); await shot('08_extras_back', 2500);
await clickText('#prof .foot button', 'Finish');
await p.waitForFunction(() => window.__mpTown && window.__mpTown.me && window.__mpTown.me.av, null, { timeout: 180000 }); await p.waitForTimeout(6000);
await p.evaluate(() => { const T = window.__mpTown; T.setCam && T.setCam(Math.PI + (T.me.ry || 0), 0.15, 2.6); }); await shot('09_ingame_front', 2500);
console.log('profile', await p.evaluate(() => { const pr = window.__atqProfile.getProfile(); return JSON.stringify({ name: pr.name, cash: pr.cash, owned: pr.owned, sel: pr.sel, top: pr.look.worn.top.id, hair: pr.look.hair.id }); }));
await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(1500);
await p.evaluate(() => document.querySelector('#btnCustom').click()); await p.waitForSelector('#prof canvas', { timeout: 60000 }); await p.evaluate(() => window.__profUI.rot(0.3)); await shot('10_edit_after_reload', 4000);
await p.evaluate(() => window.__profUI.setStep(4)); await shot('11_edit_outfits', 2000);
console.log('errors:', errs.filter(e => !/supabase|realtime|websocket|Failed to load resource/i.test(e)).slice(0, 6)); await b.close();
