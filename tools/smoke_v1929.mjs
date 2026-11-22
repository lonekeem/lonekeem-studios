// v1.9.29 preview smoke: menu tabs; Online first open -> profile welcome -> Create profile -> new creator -> Finish -> lobby;
// Create Game -> town with the profile's character; leaderboard loads; no page errors. usage: node tools/smoke_v1929.mjs <url> <outdir>
import { chromium } from 'playwright'; import fs from 'fs';
const URL = process.argv[2] || 'http://localhost:5173/', OUT = process.argv[3] || '/workspace/atq-menu-proof/v1929'; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await ctx.addInitScript(() => { if (sessionStorage.getItem('_i')) return; sessionStorage.setItem('_i', 1); localStorage.setItem('atq3.settings', JSON.stringify({ qual: 'low' })); localStorage.setItem('atq_prologue_seen', '1'); localStorage.setItem('atq3_save', JSON.stringify({ v: 3, step: 3, cash: 1500, xp: 0, level: 2, owned: ['fists'], outfits: ['classic'] })); });
const p = await ctx.newPage(); p.setDefaultTimeout(180000); const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 200))); p.on('dialog', d => d.accept());
const res = []; const rec = (n, ok, d) => { res.push(ok); console.log(ok ? 'PASS' : 'FAIL', n, d ? JSON.stringify(d).slice(0, 300) : ''); };
const shot = async (n, w = 1500) => { await p.waitForTimeout(w); await p.screenshot({ path: `${OUT}/${n}.png` }); };
const clickText = (sel, t) => p.evaluate(([sel, t]) => { const e = [...document.querySelectorAll(sel)].find(b => b.textContent.trim().startsWith(t)); if (!e) return 'missing ' + t; e.click(); return 'ok'; }, [sel, t]);
await p.goto(URL, { waitUntil: 'domcontentloaded' }); await p.click('#btnWarn'); await p.waitForTimeout(700); await p.click('#studio').catch(() => {}); await p.waitForSelector('#title:not(.hidden)');
for (const t of ['story', 'survival', 'online', 'keem', 'settings']) { await p.click({story:"#btnStory",survival:"#btnSurvival",online:"#btnOnline",keem:"#btnOnline",settings:"#btnSettings"}[t]); await shot('menu_' + t, 300); }
rec('footer reads v1.9.29', (await p.textContent('#foot')).startsWith('v1.9.29'));
rec('Keem tab has My Character', (await p.textContent('#btnCustom')).trim() === 'My Character');
await p.click('#btnOnline'); await p.click('#btnLobby');
await p.waitForSelector('#prof .welcome'); await shot('profile_welcome', 1200); rec('Online first open shows the profile welcome (Sign in / Create profile)', await p.evaluate(() => /Google/.test(document.querySelector('#prof .welcome').textContent) && /Create profile/.test(document.querySelector('#prof .welcome').textContent)));
rec('create profile: ' + await clickText('#prof .welcome button', 'Create profile'), true); await p.waitForSelector('#prof canvas'); await p.fill('#prof input.name', 'SmokeTest'); await shot('creator_name', 4000);
for (let i = 0; i < 2; i++) await clickText('#prof .foot button', 'Next'); await shot('creator_face', 3000);
for (let i = 0; i < 3; i++) await clickText('#prof .foot button', 'Next');
rec('creator finish: ' + await clickText('#prof .foot button', 'Finish'), true);
await p.waitForSelector('#online:not(.hidden) #wGames', { timeout: 60000 }); await shot('lobby_after_profile', 3000);
const prof = await p.evaluate(() => { const pr = window.__atqProfile.getProfile(); return { name: pr.name, uid: pr.uid, cash: pr.cash, hasLook: !!pr.look }; });
rec('guest profile saved in the one profile layer (profile.js)', prof.name === 'SmokeTest' && !prof.uid && prof.hasLook && prof.cash === 1500, prof);
rec('lobby chip shows the profile name', (await p.textContent('#wProf')).includes('SmokeTest'));
await p.click('#btnCreateGame');
await p.waitForFunction(() => window.__mpTown && window.__mpTown.me && window.__mpTown.me.av, null, { timeout: 240000 }); await p.waitForTimeout(6000);
rec('joined town without the old creator', await p.evaluate(() => !document.querySelector('.mpc, #mpCreator') && !window.__mpCreatorOpen), null);
rec('town room is a lobby room + name tag', await p.evaluate(() => /^w-/.test(window.__mpTown.net.room) && window.__mpTown.net.me.name === 'SmokeTest'), await p.evaluate(() => [window.__mpTown.net.room, window.__mpTown.net.me.name]));
await p.evaluate(() => { const T = window.__mpTown; T.setCam && T.setCam(Math.PI + (T.me.ry || 0), 0.15, 2.6); }); await shot('town_character', 3000);
await p.evaluate(() => [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Exit' && b.offsetParent)?.click()); await p.waitForTimeout(3000);
const back = await p.evaluate(() => !document.querySelector('#online').classList.contains('hidden')); rec('Exit returns to the Online screen', back);
if (back) { await p.click('#online .wseg button[data-t="board"]'); await p.waitForTimeout(4000); await shot('leaderboard', 500); rec('leaderboard loads', await p.evaluate(() => !/Can't load/.test(document.querySelector('#wRows').textContent) && !!document.querySelector('#wRows .wtr, #wRows .wempty'))); }
rec('no page errors', !errs.length, errs); console.log(res.every(Boolean) ? 'ALL PASS' : 'SOME FAILED'); await b.close();
