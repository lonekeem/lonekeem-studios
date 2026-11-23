// Cloud save client test with a MOCKED Supabase (no real database, no lobby). Fake signed-in user via the localhost-only __MP_FAKE_AUTH hook;
// /rest/v1/rpc/profile_load + profile_save answered by an in-test server that mirrors the SQL rules (rev conflict, progress floor, cash allowance).
import { chromium } from 'playwright'; import fs from 'fs';
const URL = process.env.URL || 'http://127.0.0.1:5497/'; const OUT = '/workspace/atq-cloud-proof'; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const DB = { row: null, saves: [], loads: 0 }; const R = [];
const num = v => (typeof v === 'number' ? v : 0);
function guard(o, n, lastAt) { if (!n || !n.save) return n; n = JSON.parse(JSON.stringify(n)); const os = (o && o.save) || {}, ns = n.save; const allow = lastAt == null ? 250000 : Math.min(250000, 3000 + 400 * Math.max(0, (Date.now() - lastAt) / 60000));
  if (num(ns.cash) > num(os.cash) + allow) ns.cash = Math.floor(num(os.cash) + allow); if (!o) return n; if (num(os.maxCh) > num(ns.maxCh)) ns.maxCh = os.maxCh;
  for (const k of ['owned', 'outfits']) ns[k] = [...new Set([...(ns[k] || []), ...(os[k] || [])])]; if (os.done) ns.done = true; return n; }
await ctx.route('**/*', async route => { const u = route.request().url();
  if (u.includes('/rest/v1/rpc/profile_load')) { DB.loads++; console.log('LOAD'); const r = DB.row; return route.fulfill({ json: r ? { exists: true, name: 'Keem', data: r.data, rev: r.rev, updated_at: new Date(r.at).toISOString() } : { exists: false } }); }
  if (u.includes('/rest/v1/rpc/profile_save')) { const a = JSON.parse(route.request().postData()); DB.saves.push(a); console.log('SAVE rev', a.p_rev, 'dbrev', DB.row && DB.row.rev, 'owned', JSON.stringify(a.p_data.save && a.p_data.save.owned), 'cash', a.p_data.save && a.p_data.save.cash, 'at', a.p_data.at);
    if (DB.row && a.p_rev < DB.row.rev) return route.fulfill({ json: { conflict: true, rev: DB.row.rev, data: DB.row.data, updated_at: new Date(DB.row.at).toISOString() } });
    const d = guard(DB.row && DB.row.data, a.p_data, DB.row && DB.row.at); DB.row = { data: d, rev: (DB.row ? DB.row.rev : 0) + 1, at: Date.now() };
    const adj = JSON.stringify(d) !== JSON.stringify(a.p_data); return route.fulfill({ json: { conflict: false, rev: DB.row.rev, adjusted: adj, data: adj ? d : null } }); }
  if (/supabase\.co/.test(u)) return route.abort(); return route.continue(); });
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
const LOCAL = { v: 3, step: 60, ch: 9, maxCh: 9, done: true, done2: true, cash: 500, owned: ['fists', 'rifle'], outfits: ['classic'], level: 5, xp: 10, up: { rifle: { dmg: 2 } }, played: true };
await p.addInitScript(([L]) => { if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', 1); localStorage.setItem('atq.gate', JSON.stringify({ accepted: 1, year: 1995, v: 1 })); localStorage.setItem('atq3_save', JSON.stringify(L)); localStorage.setItem('atq3.settings', JSON.stringify({ qual: 'low', vol: 1, voices: true }));
  localStorage.setItem('atq.profile.v1', JSON.stringify({ v: 1, name: 'Keem', uid: 'u-test', email: 'k@test' })); window.__MP_FAKE_AUTH = { id: 'u-test', email: 'k@test', name: 'Keem' }; }, [LOCAL]);
await p.addInitScript(() => { window.__MP_FAKE_AUTH = { id: 'u-test', email: 'k@test', name: 'Keem' }; });
// cloud copy: older progress (Ch4) but saved LATER with less cash (spent) + a different weapon + other settings
DB.row = { rev: 7, at: Date.now() + 60000, data: { v: 1, at: Date.now() + 60000, save: { v: 3, step: 20, ch: 4, maxCh: 4, done: true, cash: 80, owned: ['fists', 'bat'], outfits: ['classic'], level: 3, xp: 99, up: { rifle: { dmg: 1, mag: 1 } } }, settings: { vol: .3, voices: false, qual: 'high' }, survBest: 12 } };
await p.goto(URL); await p.waitForFunction(() => window.__atq, null, { timeout: 120000 });
const C = () => p.evaluate(async () => (await import('/src/mp/cloud.js')));
// 1) sign-in pull on a device that has its own progress -> merge
await p.evaluate(async () => { await import('/src/mp/cloud.js'); const PR = await import('/src/mp/profile.js'); window.__r1 = await PR.pullProfile({ id: 'u-test', email: 'k@test' }); });
const s1 = await p.evaluate(() => ({ save: JSON.parse(localStorage.getItem('atq3_save')), set: JSON.parse(localStorage.getItem('atq3.settings')), mem: window.__atq.save.maxCh }));
R.push(['1 pull+merge', { maxCh: s1.save.maxCh, cash: s1.save.cash, owned: s1.save.owned, level: s1.save.level, up: s1.save.up, step: s1.save.step, settings: s1.set, memMaxCh: s1.mem }]);
await p.waitForTimeout(4500); R.push(['1b merged copy pushed', { saves: DB.saves.length, cloudMaxCh: DB.row.data.save.maxCh, cloudOwned: DB.row.data.save.owned, rev: DB.row.rev }]);
// 2) offline: buy something while offline -> queued, then synced when back online
await ctx.setOffline(true); await p.evaluate(async () => { const s = window.__atq.save; s.cash += 150; s.owned.push('shotgun'); localStorage.setItem('atq3_save', JSON.stringify(s)); const PR = await import('/src/mp/profile.js'); PR.saveProfile(PR.getProfile()); });
await p.waitForTimeout(1500); const n0 = DB.saves.length; console.log('-- offline done'); const pend = await p.evaluate(async () => (await import('/src/mp/cloud.js'))._cloudTest.pending());
await ctx.setOffline(false); await p.evaluate(() => window.dispatchEvent(new Event('online'))); await p.waitForTimeout(4000);
R.push(['2 offline queue', { pendingWhileOffline: pend, savesWhileOffline: DB.saves.length - n0, afterOnline: DB.saves.length - n0, cloudHasShotgun: DB.row.data.save.owned.includes('shotgun'), cloudCash: DB.row.data.save.cash }]);
// 3) another device saved meanwhile (rev bump, it unlocked Ch10 and a pistol) -> conflict -> merge -> re-push
DB.row = { rev: DB.row.rev + 5, at: Date.now(), data: Object.assign({}, DB.row.data, { at: Date.now() - 5000, save: Object.assign({}, DB.row.data.save, { maxCh: 10, owned: [...DB.row.data.save.owned, 'pistol'], cash: 999 }) }) };
await p.waitForTimeout(2500); await p.evaluate(async () => { const s = window.__atq.save; s.kills = (s.kills || 0) + 5; localStorage.setItem('atq3_save', JSON.stringify(s)); const PR = await import('/src/mp/profile.js'); PR.saveProfile(PR.getProfile()); });
await p.waitForTimeout(7000); const s3 = await p.evaluate(() => JSON.parse(localStorage.getItem('atq3_save')));
R.push(['3 conflict merge', { localMaxCh: s3.maxCh, localPistol: s3.owned.includes('pistol'), localShotgun: s3.owned.includes('shotgun'), cloudMaxCh: DB.row.data.save.maxCh, cloudKills: DB.row.data.save.kills, cloudRev: DB.row.rev }]);
// 4) cash inflation from a hacked client is clamped by the server and the clamp comes back to the device
await p.waitForTimeout(2500); await p.evaluate(async () => { const s = window.__atq.save; s.cash = 9999999; localStorage.setItem('atq3_save', JSON.stringify(s)); const PR = await import('/src/mp/profile.js'); PR.saveProfile(PR.getProfile()); });
await p.waitForTimeout(4000); const s4 = await p.evaluate(() => JSON.parse(localStorage.getItem('atq3_save')).cash);
R.push(['4 cash clamp', { cloudCash: DB.row.data.save.cash, localCashAfter: s4 }]);
// 5) guest: no account -> nothing sent
const g = await ctx.newPage(); await g.addInitScript(() => { localStorage.setItem('atq.profile.v1', JSON.stringify({ v: 1, name: 'Guest', uid: null })); window.__MP_FAKE_AUTH = null; });
const before = DB.saves.length + DB.loads; await g.goto(URL); await g.waitForFunction(() => window.__atq, null, { timeout: 120000 }); await g.evaluate(async () => { await import('/src/mp/cloud.js'); const PR = await import('/src/mp/profile.js'); PR.saveProfile(PR.getProfile()); }); await g.waitForTimeout(3000);
R.push(['5 guest stays local', { cloudCalls: DB.saves.length + DB.loads - before }]);
R.push(['errors', errs]); fs.writeFileSync(OUT + '/t_cloud.json', JSON.stringify(R, null, 1)); for (const r of R) console.log(r[0], JSON.stringify(r[1])); await b.close();
