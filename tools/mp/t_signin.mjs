// Google sign-in UI in the multiplayer menu: guest default, real OAuth redirect URL, admin -> Play as Keem, sign-out. (Real Google login can't be done headless; admin/player states use the localhost-only __MP_FAKE_AUTH hook.)
import { launch, ctxOpts, URL } from '../mpfix/lib.mjs'; import fs from 'fs';
const OUT = '/workspace/atq1919/docs/mp-fix3/signin'; fs.mkdirSync(OUT, { recursive: true });
const b = await launch(); const ctx = await b.newContext(ctxOpts); const p = await ctx.newPage(); p.on('pageerror', e => console.log('ERR', e.message));
const log = []; const rec = (n, ok, d) => { log.push({ n, ok, d }); console.log(ok ? 'PASS' : 'FAIL', n, JSON.stringify(d)); };
const reqs = []; p.on('request', r => { if (/auth\/v1\/authorize/.test(r.url())) reqs.push(r.url()); }); await p.route(/auth\/v1\/authorize/, r => r.abort());
await p.goto(URL); await p.waitForSelector('#btnWarn'); await p.click('#btnWarn'); await p.waitForSelector('#btnMP'); await p.click('#btnMP'); await p.waitForFunction(() => window.__mpCreator && window.__mpCreator.av(), null, { timeout: 120000 }); await p.waitForTimeout(1200);
const st = () => p.evaluate(() => ({ acct: window.__mpAcct.innerText.replace(/\n/g, ' | '), keem: getComputedStyle(window.__mpKeemBtn).display !== 'none' }));
let s = await st(); rec('guest: shows Guest + Sign in with Google, no Keem button', /Guest/.test(s.acct) && /Sign in with Google/.test(s.acct) && !s.keem, s); await p.screenshot({ path: `${OUT}/1_guest.png` });
// signed-in as a normal player
await p.evaluate(() => { window.__MP_FAKE_AUTH = { email: 'someone@example.com', name: 'Someone', role: 'player' }; return window.__mpRefreshAcct(); }); await p.waitForTimeout(500); s = await st(); rec('signed in (player): name + Sign out, NO Keem', /Someone/.test(s.acct) && /Sign out/.test(s.acct) && !s.keem, s);
await p.evaluate(() => { window.__MP_FAKE_AUTH = { email: 'lillykemoy1@gmail.com', name: 'Keem', role: 'admin' }; return window.__mpRefreshAcct(); }); await p.waitForTimeout(500); s = await st(); rec('signed in (admin lillykemoy1@gmail.com): admin tag + Play as Keem', /admin/.test(s.acct) && s.keem, s); await p.screenshot({ path: `${OUT}/2_admin.png` });
await p.click('#mpc .acct button'); await p.waitForTimeout(600); s = await st(); rec('sign out: back to guest, Keem hidden', /Guest/.test(s.acct) && !s.keem, s);
// admin plays as Keem
await p.evaluate(() => { window.__MP_FAKE_AUTH = { email: 'lillykemoy1@gmail.com', role: 'admin' }; return window.__mpRefreshAcct(); }); await p.waitForTimeout(400); await p.evaluate(() => window.__mpKeemBtn.click()); await p.waitForFunction(() => window.__mpTown, null, { timeout: 120000 }); await p.waitForTimeout(2500);
const k = await p.evaluate(() => { const t = window.__mpTown; return { isKeem: !!(t.me.av && t.me.av.isKeem), noKeem: t.aud.noKeem }; }); rec('Play as Keem enters the town as story Keem, voice not blocked', k.isKeem && !k.noKeem, k); await p.screenshot({ path: `${OUT}/3_keem_in_town.png` });
const p2 = await ctx.newPage(); p2.on('request', r => { if (/auth\/v1\/authorize/.test(r.url())) reqs.push(r.url()); }); await p2.goto(URL); await p2.waitForSelector('#btnWarn'); await p2.click('#btnWarn'); await p2.waitForSelector('#btnMP'); await p2.click('#btnMP'); await p2.waitForSelector('#mpc .acct .gsi', { timeout: 120000 });
// real click -> redirect to Supabase authorize (aborted so we stay on the page)
await p2.click('#mpc .acct .gsi'); for (let i = 0; i < 20 && !reqs.length; i++) await p.waitForTimeout(500);
const u = reqs[0] ? new globalThis.URL(reqs[0]) : null; rec('click -> Supabase Google authorize with redirect_to = this page', !!u && u.searchParams.get('provider') === 'google' && /localhost|127\.0\.0\.1|lonekeem/.test(u.searchParams.get('redirect_to') || ''), u ? { host: u.host, provider: u.searchParams.get('provider'), redirect_to: u.searchParams.get('redirect_to') } : 'no request');
fs.writeFileSync(`${OUT}/signin.json`, JSON.stringify(log, null, 1)); await b.close();
