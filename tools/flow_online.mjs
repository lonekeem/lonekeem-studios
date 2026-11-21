// End-to-end: (1) a Survival run is submitted to the real leaderboard on death (kills + headshots counted);
// (2) Create Game in one browser shows up in another browser's World Lobby, and the second one can join it.
import { chromium } from 'playwright';
const URL = process.argv[2] || 'http://127.0.0.1:4188/'; const OUT = process.argv[3] || '/tmp/flow';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
const rec = (n, ok, d) => console.log(ok ? 'PASS' : 'FAIL', n, d ? JSON.stringify(d) : '');
async function page(name) {
  const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  await ctx.addInitScript(n => { localStorage.setItem('atq3.settings', JSON.stringify({ qual: 'low' })); localStorage.setItem('atq_prologue_seen', '1'); if (n && !localStorage.getItem('atq.guest')) localStorage.setItem('atq.guest', JSON.stringify({ id: crypto.randomUUID(), secret: crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, ''), name: n })); }, name);
  const p = await ctx.newPage(); p.setDefaultTimeout(120000); p.errs = []; p.on('pageerror', e => p.errs.push(e.message.slice(0, 160)));
  await p.goto(URL, { waitUntil: 'domcontentloaded' }); await p.click('#btnWarn'); await p.waitForTimeout(700); await p.click('#studio').catch(() => {}); await p.waitForSelector('#title:not(.hidden)'); return p;
}
// (1) survival run -> leaderboard
const p = await page('ZzTestRun');
await p.click('#title .mtabs button[data-tab="survival"]'); await p.click('#btnSurvival');
await p.waitForFunction(() => window.__atq.game && window.__atq.game.survival && window.__atq.state === 'play', null, { timeout: 180000 });
await p.waitForFunction(() => (window.__atq.game.zombies || []).filter(z => !z.dead).length >= 2, null, { timeout: 120000 }).catch(() => {}); await p.waitForTimeout(16000);
const sim = await p.evaluate(async () => { const g = window.__atq.game; const zs = (g.zombies || []).filter(z => !z.dead); let hs = 0; for (const z of zs.slice(0, 3)) { g.killZ(z, null, { head: true }); hs++; } g.save.kills += 4; g.stepData.wave = Math.max(1, g.stepData.wave || 0); g.onDeath(); return { killed: hs, zs: zs.length, wave: g.stepData.wave }; });
await p.waitForTimeout(4000); const last = await p.evaluate(() => localStorage.getItem('atq.lbLast') || localStorage.getItem('atq.lbPending'));
rec('survival run submitted', !!last && !!JSON.parse(last).rank, { sim, last }); rec('headshot kills counted', JSON.parse(last).hs === sim.killed && sim.killed > 0, { hs: JSON.parse(last).hs, killed: sim.killed });
await p.screenshot({ path: OUT + '/flow_dead.png' });
await p.click('#btnDeadQuit'); await p.click('#title .mtabs button[data-tab="online"]'); await p.click('#btnBoard'); await p.waitForTimeout(3500); await p.screenshot({ path: OUT + '/flow_board_after_run.png' });
rec('my row is on the board', await p.evaluate(() => !!document.querySelector('#wRows .wtr.me') && document.querySelector('#wRows .wtr.me').textContent.includes('ZzTestRun')), await p.evaluate(() => document.querySelector('#wMe').textContent));
// (2) host creates a game, a second player sees + joins it
await p.click('#online .wseg button[data-t="games"]'); await p.click('#btnCreateGame');
await p.waitForFunction(() => !!window.__mpCreator, null, { timeout: 120000 }); await p.waitForTimeout(3000); await p.screenshot({ path: OUT + '/flow_creator.png' });
await p.evaluate(() => window.__mpCreator.close(true));
await p.waitForFunction(() => !!window.__mpTown, null, { timeout: 180000 }); await p.waitForTimeout(5000);
const q = await page('ZzJoiner'); await q.click('#title .mtabs button[data-tab="online"]'); await q.click('#btnLobby'); await q.waitForTimeout(6000); await q.screenshot({ path: OUT + '/flow_lobby_sees_game.png' });
const seen = await q.evaluate(() => [...document.querySelectorAll('#wRooms .wroom')].map(r => r.textContent));
rec('second player sees the host game', seen.some(t => t.includes("ZzTestRun's game")), seen);
await q.click('#btnQuickJoin'); await q.waitForFunction(() => !!window.__mpCreator, null, { timeout: 120000 }); await q.waitForTimeout(2000); await q.evaluate(() => window.__mpCreator.close(true));
await q.waitForFunction(() => !!window.__mpTown, null, { timeout: 180000 }); await q.waitForTimeout(8000);
let peers = [0, 0]; for (let i = 0; i < 20 && !(peers[0] >= 1 && peers[1] >= 1); i++) { await q.waitForTimeout(1500); peers = [await p.evaluate(() => window.__mpTown.peers()), await q.evaluate(() => window.__mpTown.peers())]; }
rec('host and joiner see each other in the same room', peers[0] >= 1 && peers[1] >= 1, peers);
await q.screenshot({ path: OUT + '/flow_joined_town.png' });
rec('no page errors', !p.errs.length && !q.errs.length, [...p.errs, ...q.errs]);
await b.close();
