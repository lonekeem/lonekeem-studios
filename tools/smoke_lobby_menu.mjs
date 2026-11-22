// v1.9.39 menu + lobby + leaderboard smoke.
// Does NOT submit scores to the real leaderboard. Private test rooms are never listed publicly.
import { chromium } from 'playwright';
import fs from 'fs';
const URL = process.argv[2] || 'http://127.0.0.1:5374/';
const OUT = process.argv[3] || '/tmp/lobby-menu';
fs.mkdirSync(OUT, { recursive: true });
const rec = (n, ok, d) => { console.log(ok ? 'PASS' : 'FAIL', n, d ? JSON.stringify(d) : ''); return ok; };
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
async function page({ name = null, save = false, mock = false } = {}) {
  const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  await ctx.addInitScript(({ name, save }) => {
    localStorage.setItem('atq3.settings', JSON.stringify({ qual: 'low', voices: false, playSubs: false }));
    localStorage.setItem('atq_prologue_seen', '1');
    if (name) {
      localStorage.setItem('atq.profile.v1', JSON.stringify({ v: 1, name }));
      localStorage.setItem('atq.guest', JSON.stringify({ id: crypto.randomUUID(), secret: crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, ''), name }));
    }
    if (save) {
      localStorage.setItem('atq3_save', JSON.stringify({ v: 3, step: 7, played: true, cash: 40, xp: 0, level: 1, owned: ['fists', 'bat'], outfits: ['classic'] }));
    }
  }, { name, save });
  const p = await ctx.newPage();
  p.setDefaultTimeout(120000);
  p.errs = []; p.nf = [];
  p.on('pageerror', e => p.errs.push(String(e.message || e).slice(0, 180)));
  p.on('response', r => { if (r.status() === 404) p.nf.push(r.url()); });
  const url = mock ? URL + (URL.includes('?') ? '&' : '?') + 'worldmock' : URL;
  await p.goto(url, { waitUntil: 'domcontentloaded' });
  await p.click('#btnWarn');
  await p.waitForSelector('#title:not(.hidden)', { timeout: 30000 });
  await p.waitForTimeout(400);
  return p;
}

let fails = 0;
const ok = async (n, v, d) => { if (!rec(n, !!v, d)) fails++; };

const menu = await page({ save: true });
const ids = await menu.evaluate(() => [...document.querySelectorAll('#title .mm > .mplay, #title .mm > .mpane.on button, #title .mm > button')].filter(e => e.offsetParent && e.id !== 'btnPlay').map(e => ({ id: e.id, t: e.innerText.replace(/\s+/g, ' ').trim(), r: (({ x, y, w, h } = {}) => 0)() || (() => { const r = e.getBoundingClientRect(); return { id: e.id, t: e.innerText.replace(/\s+/g,' ').trim(), x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), off: r.right > innerWidth + 1 || r.bottom > innerHeight + 1 || r.left < -1 || r.top < -1 }; })() })));
await menu.screenshot({ path: OUT + '/menu_continue.png' });
await ok('continue visible when a save exists', await menu.evaluate(() => { const b = document.querySelector('#btnContinue'); return b && !b.classList.contains('hidden') && b.offsetParent; }));
await ok('main list has Story Survival Online Settings', await menu.evaluate(() => ['btnStory', 'btnSurvival', 'btnOnline', 'btnSettings'].every(id => { const e = document.getElementById(id); return e && e.offsetParent; })));
await ok('no tab row', await menu.evaluate(() => !document.querySelector('#title .mtabs')));
await menu.click('#btnStory'); await menu.waitForTimeout(200);
await menu.screenshot({ path: OUT + '/menu_story.png' });
await ok('Story opens New Game and Chapter Select', await menu.evaluate(() => ['btnNew', 'btnChapters'].every(id => { const e = document.getElementById(id); return e && e.offsetParent; })));
await menu.click('#btnOnline'); await menu.waitForTimeout(200);
await menu.screenshot({ path: OUT + '/menu_online.png' });
await ok('Online opens Lobby, Leaderboard, My Character', await menu.evaluate(() => ['btnLobby', 'btnBoard', 'btnCustom'].every(id => { const e = document.getElementById(id); return e && e.offsetParent; })));
await ok('btnLobby id kept', await menu.evaluate(() => !!document.getElementById('btnLobby')));
await menu.click('#btnSettings'); await menu.waitForTimeout(300);
await menu.screenshot({ path: OUT + '/menu_settings.png' });
await ok('Settings screen opens with Controls, Intro, Credits, Armory, Inventory and Done visible', await menu.evaluate(() => {
  const s = document.querySelector('#settings');
  if (!s || s.classList.contains('hidden')) return false;
  const ids = ['btnControls', 'btnWatchIntro', 'btnCredits', 'btnArmory', 'btnInvT'];
  const done = s.querySelector('.back');
  const vis = el => { if (!el) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.bottom <= innerHeight + 1 && r.top >= -1; };
  const inv = document.getElementById('btnInvT');
  const invCut = inv && inv.scrollWidth > inv.clientWidth + 1;
  return ids.every(id => vis(document.getElementById(id))) && vis(done) && !invCut;
}));
// back to title
await menu.click('#settings .back'); await menu.waitForTimeout(200);
await ok('menu no page errors', !menu.errs.length, menu.errs);
const menuErrs = menu.errs.slice(); const menuNf = menu.nf.slice();
await menu.close();

// Leaderboard without a profile (the old gate hid this)
const board = await page(); // no profile
await board.click('#btnOnline'); await board.click('#btnBoard');
await board.waitForSelector('#wRows', { timeout: 20000 });
await board.waitForFunction(() => { const t = (document.querySelector('#wRows') || {}).textContent || ''; return t && !/Loading/.test(t); }, null, { timeout: 20000 });
await board.waitForTimeout(500);
await board.screenshot({ path: OUT + '/board_noprofile.png' });
const boardTxt = await board.evaluate(() => (document.querySelector('#wRows') || {}).textContent || '');
await ok('leaderboard loads without a profile', !/Can't load/.test(boardTxt) && (/Dex/.test(boardTxt) || /Wave/.test(boardTxt) || /No scores yet/.test(boardTxt)), boardTxt.slice(0, 180));
await ok('leaderboard shows a real row or empty state, not an error', !/Can't load/.test(boardTxt), boardTxt.slice(0, 180));
await ok('board no page errors', !board.errs.length, board.errs);

// World lobby list (no profile required to view)
await board.click('#online .wseg button[data-t="games"]');
await board.waitForTimeout(4000);
await board.screenshot({ path: OUT + '/lobby_list.png' });
const lobbyTxt = await board.evaluate(() => ({ net: (document.querySelector('#wNet') || {}).textContent, rooms: (document.querySelector('#wRooms') || {}).textContent, wel: !!document.querySelector('#wWelNew') }));
await ok('lobby is visible without being forced into the profile welcome', !lobbyTxt.wel && !/Can't reach the online lobby/.test(lobbyTxt.rooms || ''), lobbyTxt);
await ok('Practice Alone is in the World Lobby', await board.evaluate(() => { const e = document.querySelector('#btnPractice'); return !!(e && e.offsetParent); }));
await ok('online overlay hides the title menu', await board.evaluate(() => document.querySelector('#title').classList.contains('hidden')));
const boardErrs = board.errs.slice(); const boardNf = board.nf.slice();
await board.close();

// Filled lobby/board layout with localhost-only mock data (no live scores posted)
const mock = await page({ mock: true });
await mock.click('#btnOnline'); await mock.click('#btnLobby');
await mock.waitForTimeout(800);
await mock.screenshot({ path: OUT + '/lobby_filled.png' });
await mock.click('#online .wseg button[data-t="board"]'); await mock.waitForTimeout(500);
await mock.screenshot({ path: OUT + '/board_filled.png' });
const filled = await mock.evaluate(() => ({
  rooms: [...document.querySelectorAll('#wRooms .wroom')].length,
  leak: !document.querySelector('#title').classList.contains('hidden'),
  rows: (document.querySelector('#wRows') || {}).textContent || '',
}));
await ok('mock lobby shows open games', filled.rooms >= 2, filled);
await ok('mock overlay does not leak the title menu', !filled.leak, filled);
await ok('mock leaderboard shows names', /Nia_Rose|Keem|BigGus77/.test(filled.rows), filled.rows.slice(0, 180));
await mock.close();

// Two clients in a private test room (not listed publicly). No fake scores.
const room = 'w-test-' + Date.now().toString(36);
const host = await page({ name: 'HostTest' });
const join = await page({ name: 'JoinTest' });
async function joinTest(p, room, title) {
  await p.waitForFunction(() => !!(window.__atqWorld && window.__atqWorld.joinTestRoom), null, { timeout: 15000 });
  await p.evaluate(({ room, title }) => window.__atqWorld.joinTestRoom(room, title), { room, title });
}
await joinTest(host, room, 'HostTest game');
await joinTest(join, room, 'JoinTest game');
const hostIn = await host.waitForFunction(() => !!window.__mpTown, null, { timeout: 180000 }).then(() => true).catch(() => false);
const joinIn = await join.waitForFunction(() => !!window.__mpTown, null, { timeout: 180000 }).then(() => true).catch(() => false);
await ok('host entered private test room', hostIn);
await ok('joiner entered private test room', joinIn);
let peers = [0, 0];
if (hostIn && joinIn) {
  for (let i = 0; i < 24 && !(peers[0] >= 1 && peers[1] >= 1); i++) {
    await host.waitForTimeout(1500);
    peers = [await host.evaluate(() => window.__mpTown.peers()), await join.evaluate(() => window.__mpTown.peers())];
  }
}
await ok('host and joiner see each other', peers[0] >= 1 && peers[1] >= 1, peers);
if (hostIn) {
  await host.evaluate(() => window.__mpTown.sendChat('hello from host'));
  await host.waitForTimeout(2500);
  const seen = await join.evaluate(() => (window.__mpChat && window.__mpChat.log() || []).map(m => m.text).join(' | '));
  await ok('joiner receives chat', /hello from host/.test(seen), seen);
  await host.screenshot({ path: OUT + '/town_host.png' });
  await join.screenshot({ path: OUT + '/town_join.png' });
}

// Public lobby must not list the test room. Close the town clients first so the machine has room.
const hostErrs = host.errs.slice(); const hostNf = host.nf.slice();
const joinErrs = join.errs.slice(); const joinNf = join.nf.slice();
await host.close(); await join.close();
const pub = await page();
await pub.click('#btnOnline'); await pub.click('#btnLobby');
await pub.waitForTimeout(5000);
const pubRooms = await pub.evaluate(() => [...document.querySelectorAll('#wRooms .wroom')].map(r => r.textContent));
await ok('private test room is not listed in the public lobby', !pubRooms.some(t => /w-test-|HostTest game|JoinTest game/.test(t)), pubRooms);
await pub.screenshot({ path: OUT + '/lobby_public_no_test.png' });

const allErrs = [...menuErrs, ...boardErrs, ...hostErrs, ...joinErrs, ...pub.errs];
const all404 = [...menuNf, ...boardNf, ...hostNf, ...joinNf, ...pub.nf].filter(u => !/favicon|voice\/ellipsis/.test(u));
await ok('zero page errors', !allErrs.length, allErrs);
await ok('zero 404s', !all404.length, all404.slice(0, 8));

console.log(fails ? ('LOBBY-MENU SMOKE FAIL ' + fails) : 'LOBBY-MENU SMOKE OK');
await b.close();
process.exit(fails ? 1 : 0);
