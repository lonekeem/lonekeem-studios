// v1.9.29 preview smoke: menu tabs; Online first open -> profile welcome (profileui) -> guest Create profile -> step creator -> Finish
// -> back in Online; leaderboard loads (live Supabase); Create Game -> town with the profile's character; no page errors.
import { chromium } from 'playwright'; import fs from 'fs';
const URL = process.argv[2] || 'http://localhost:5173/', OUT = process.argv[3] || '/workspace/atq-menu-proof/v1929'; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await ctx.addInitScript(() => { if (sessionStorage.getItem('_i')) return; sessionStorage.setItem('_i', 1); localStorage.setItem('atq3.settings', JSON.stringify({ qual: 'low' })); localStorage.setItem('atq_prologue_seen', '1'); localStorage.setItem('atq3_save', JSON.stringify({ v: 3, step: 3, cash: 1500, xp: 0, level: 2, owned: ['fists'], outfits: ['classic'], played: true })); });
const p = await ctx.newPage(); p.setDefaultTimeout(180000); const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 200))); p.on('dialog', d => d.accept());
const res = []; const rec = (n, ok, d) => { res.push(ok); console.log(ok ? 'PASS' : 'FAIL', n, d ? JSON.stringify(d).slice(0, 300) : ''); };
const shot = async (n, w = 1200) => { await p.waitForTimeout(w); await p.screenshot({ path: `${OUT}/${n}.png` }); };
const clickText = (sel, t) => p.evaluate(([sel, t]) => { const e = [...document.querySelectorAll(sel)].find(x => x.offsetParent && x.textContent.trim().startsWith(t)); if (!e) return false; e.click(); return true; }, [sel, t]);
await p.goto(URL, { waitUntil: 'domcontentloaded' }); await p.click('#btnWarn'); await p.waitForTimeout(700); await p.click('#studio').catch(() => {}); await p.waitForSelector('#title:not(.hidden)'); await p.waitForTimeout(1500);
rec('footer is v1.9.29', (await p.textContent('#foot')).startsWith('v1.9.29'), await p.textContent('#foot'));
for (const t of ['story', 'survival', 'online', 'keem', 'settings']) { await p.click(`#title .mtabs button[data-tab="${t}"]`); await shot('menu_' + t, 300); }
const bad = await p.evaluate(() => { const o = []; for (const t of ['story', 'survival', 'online', 'keem', 'settings']) { document.querySelector(`#title .mtabs button[data-tab="${t}"]`).click(); for (const e of document.querySelectorAll('#title .mm button')) { const r = e.getBoundingClientRect(); if (!r.width) continue; if (e.scrollWidth > e.clientWidth + 1 || r.bottom > innerHeight || r.right > innerWidth || r.height < 40) o.push(t + ':' + e.textContent.trim()); } } return o; });
rec('menu tabs: all buttons fit (no cut text, >=40px)', !bad.length, bad);
// Online first open -> profile welcome
await p.click('#title .mtabs button[data-tab="online"]'); await p.click('#btnLobby'); await p.waitForSelector('#prof .welcome'); await shot('profile_welcome', 1500);
rec('Online first open shows profile welcome with Sign in + Create', await p.evaluate(() => { const t = document.querySelector('#prof .welcome').textContent; return /Google/.test(t) && /Create/.test(t); }));
await clickText('#prof .welcome button', 'Create'); await p.waitForSelector('#prof canvas'); await p.fill('#prof input.name', 'ZzSmoke'); await shot('creator_name', 4000);
await clickText('#prof .foot button', 'Next'); await shot('creator_skin', 2500);
for (let i = 0; i < 6; i++) { if (await clickText('#prof .foot button', 'Finish')) break; await clickText('#prof .foot button', 'Next'); await p.waitForTimeout(1200); if (i === 2) await shot('creator_hair', 1500); }
await p.waitForFunction(() => !document.querySelector('#prof'), null, { timeout: 60000 });
const prof = await p.evaluate(() => { const pr = window.__atqProfile.getProfile(); return pr && { name: pr.name, uid: pr.uid, cash: pr.cash, hasLook: !!pr.look }; });
rec('guest profile created locally (no uid, shared cash)', !!prof && prof.name === 'ZzSmoke' && !prof.uid && prof.cash === 1500 && prof.hasLook, prof);
await p.waitForSelector('#online:not(.hidden)'); await p.waitForTimeout(2500); await shot('online_after_create', 500);
rec('Online lobby shows the profile + connects', await p.evaluate(() => /ZzSmoke/.test(document.querySelector('#wProf').textContent) && /Online/.test(document.querySelector('#wNet').textContent)), await p.evaluate(() => document.querySelector('#wNet').textContent));
await p.click('#online .wseg button[data-t="board"]'); await p.waitForTimeout(3500); await shot('leaderboard', 300);
rec('leaderboard loads', await p.evaluate(() => !!document.querySelector('#wRows .wtr, #wRows .wempty') && !/Can't load/.test(document.querySelector('#wRows').textContent)), await p.evaluate(() => document.querySelector('#wRows').textContent.slice(0, 80)));
await p.click('#online .wseg button[data-t="games"]'); await p.click('#btnCreateGame');
const oldCreator = await p.waitForFunction(() => window.__mpTown || window.__mpCreator, null, { timeout: 240000 }).then(() => p.evaluate(() => !!window.__mpCreator && !window.__mpTown));
rec('Create Game goes straight to town (no old creator)', !oldCreator);
await p.waitForFunction(() => window.__mpTown && window.__mpTown.me && window.__mpTown.me.av, null, { timeout: 240000 }); await p.waitForTimeout(6000);
await p.evaluate(() => { const T = window.__mpTown; T.setCam && T.setCam(Math.PI + (T.me.ry || 0), 0.15, 2.6); }); await shot('town_character', 3000);
rec('in town as the profile character', await p.evaluate(() => window.__mpTown.net.me.name === 'ZzSmoke' && window.__mpTown.net.room.startsWith('w-')), await p.evaluate(() => [window.__mpTown.net.me.name, window.__mpTown.net.room]));
rec('no page errors', !errs.length, errs);
console.log(res.every(Boolean) ? 'ALL PASS' : 'SOME FAILED'); await b.close();
