// iPhone landscape proofs for Clans: menu entry, tab, create form, banner builder, board, nametag in a PRIVATE test town.
// Never joins the public lobby or posts scores.
import { chromium } from 'playwright';
import fs from 'fs';

const URL = process.argv[2] || 'http://127.0.0.1:4190/';
const OUT = process.argv[3] || '/workspace/atq-clan-proof';
fs.mkdirSync(OUT, { recursive: true });

const rec = (n, ok, d) => { console.log(ok ? 'PASS' : 'FAIL', n, d != null ? JSON.stringify(d) : ''); return ok; };
const b = await chromium.launch({
  executablePath: '/usr/bin/google-chrome',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--autoplay-policy=no-user-gesture-required'],
});
const opts = { viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true };
const ctx = await b.newContext(opts);
await ctx.addInitScript(() => {
  try {
    localStorage.setItem('atq3.settings', JSON.stringify({ qual: 'low' }));
    localStorage.setItem('atq_prologue_seen', '1');
    localStorage.setItem('atq.profile.v1', JSON.stringify({ v: 1, name: 'ZzClanProof', uid: null, createdAt: Date.now() }));
    localStorage.setItem('atq.guest', JSON.stringify({ id: crypto.randomUUID(), secret: crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, ''), name: 'ZzClanProof' }));
  } catch (e) { /* ignore */ }
});
const p = await ctx.newPage();
p.setDefaultTimeout(90000);
const errs = [], net404 = [];
p.on('pageerror', e => errs.push(e.message.slice(0, 200)));
p.on('response', r => { if (r.status() === 404) net404.push(r.url()); });

async function shot(name) {
  const path = `${OUT}/${name}.png`;
  await p.screenshot({ path, fullPage: false });
  return path;
}

await p.goto(URL, { waitUntil: 'domcontentloaded' });
await p.click('#btnWarn').catch(() => {});
await p.waitForSelector('#title:not(.hidden)', { timeout: 60000 });
await p.waitForTimeout(400);

const foot = await p.evaluate(() => document.querySelector('#foot')?.textContent || '');
const lobby = await p.evaluate(() => !!document.querySelector('#btnLobby'));
const playKeem = await p.evaluate(() => /Play as Keem/i.test(document.body.innerText) || !!document.querySelector('#btnCustom, #btnKeem'));
rec('title has #btnLobby', lobby);
rec('footer mentions version', /v\d+\.\d+/.test(foot), foot);
await shot('01-title');

await p.click('#btnOnline');
await p.waitForTimeout(300);
const hasClansBtn = await p.evaluate(() => !!document.querySelector('#btnClans'));
rec('Online pane has #btnClans', hasClansBtn);
await shot('02-online-pane');

await p.click('#btnClans');
await p.waitForSelector('#online:not(.hidden)', { timeout: 30000 });
await p.waitForTimeout(1200);
const tabSel = await p.evaluate(() => {
  const b = document.querySelector('#online .wseg:not(.wsort) button[data-t="clans"]');
  return { exists: !!b, sel: !!(b && b.classList.contains('sel')), text: document.querySelector('#cMain')?.innerText?.slice(0, 240) || '' };
});
rec('Clans tab opens', tabSel.exists && tabSel.sel && /Clan/.test(tabSel.text), tabSel);
await shot('03-clans-home');

// Create form + live banner preview (guest can open the form; save requires sign-in)
await p.click('#cCreate');
await p.waitForTimeout(400);
rec('create form shows', await p.evaluate(() => !!document.querySelector('#cName') && !!document.querySelector('#cDraftBan')));
await p.fill('#cName', 'Quiet Falls Crew');
await p.fill('#cTag', 'qfc');
await p.waitForTimeout(200);
const tagVal = await p.evaluate(() => document.querySelector('#cTag').value);
rec('tag uppercases to QFC', tagVal === 'QFC', tagVal);
await shot('04-create-form');

await p.click('#cEditBan');
await p.waitForSelector('#cban', { timeout: 10000 });
await p.waitForTimeout(400);
await shot('05-banner-builder');

// Cycle a few parts and take close-ups
const clicks = [
  ['shape', 'Shield'],
  ['pattern', 'Chevron'],
  ['emblem', 'Bunny'],
  ['emblem', 'Flame'],
  ['emblem', 'Wolf'],
  ['emblem', 'Outbreak'],
  ['emblem', 'Skull'],
];
for (const [k, lab] of clicks) {
  const btn = p.locator(`#cban .cban-row[data-k="${k}"] button`, { hasText: lab }).first();
  if (await btn.count()) { await btn.tap(); await p.waitForTimeout(180); }
}
await shot('06-banner-skull-close');
// color swatches
const sw = p.locator('#cban .cswatches[data-k="bg"] button').nth(2);
if (await sw.count()) { await sw.tap(); await p.waitForTimeout(150); }
await shot('07-banner-red-close');
await p.locator('#cban .cban-row[data-k="emblem"] button', { hasText: 'Bunny' }).first().tap();
await p.waitForTimeout(200);
await shot('08-banner-bunny');
await p.click('#cban .cban-save');
await p.waitForTimeout(300);
rec('banner builder saved back to create', await p.evaluate(() => !document.querySelector('#cban') && !!document.querySelector('#cDraftBan')));
await shot('09-create-after-banner');

await p.click('#cCreateBack');
await p.waitForTimeout(200);
await p.click('#cBrowse');
await p.waitForTimeout(1500);
rec('browse view loads', await p.evaluate(() => !!document.querySelector('#cFind') && !!document.querySelector('#cBrowseList')));
await shot('10-browse');

await p.click('#cBrowseBack').catch(async () => { await p.click('#online .wseg [data-t="clans"]'); });
await p.waitForTimeout(200);
await p.click('#cBoardBtn');
await p.waitForTimeout(1500);
rec('clan board loads', await p.evaluate(() => !!document.querySelector('#cBoardSort') || /clan board|No clans/i.test(document.querySelector('#cMain')?.innerText || '')));
await shot('11-clan-board');

// Leaderboard tab -> Clans
await p.click('#online .wseg:not(.wsort) button[data-t="board"]');
await p.waitForTimeout(800);
await p.click('#wBoardKind button[data-kind="clans"]');
await p.waitForTimeout(1200);
rec('leaderboard clans sort', await p.evaluate(() => document.querySelector('#wBoardKind button[data-kind="clans"]')?.classList.contains('sel')));
await shot('12-leaderboard-clans');

// Private test town with a preview clan on the nametag — never listed in the public lobby
await p.evaluate(() => { document.querySelector('#online .wback')?.click(); });
await p.waitForTimeout(300);
const joined = await p.evaluate(async () => {
  window.__atqClanPreview = {
    id: 'preview', name: 'Quiet Falls Crew', tag: 'QFC',
    banner: { v: 1, shape: 'shield', bg: '#8b1e1e', bg2: '#d9b44a', pattern: 'chevron', emblem: 'bunny', emblemColor: '#f4f0e6', trim: '#d9b44a', trimStyle: 'thick' },
  };
  if (!window.__atqWorld || !window.__atqWorld.joinTestRoom) {
    const m = await import('/src/mp/world.js');
    if (m.openOnline) m.openOnline('games');
    await new Promise(r => setTimeout(r, 400));
  }
  const room = 'w-test-clan-' + Math.random().toString(36).slice(2, 8);
  await window.__atqWorld.joinTestRoom(room, 'Clan proof (private)', null);
  return room;
});
rec('joined private test room', typeof joined === 'string' && joined.startsWith('w-test-'), joined);
try {
  await p.waitForFunction(() => !!window.__mpTown, { timeout: 180000 });
} catch (e) {
  rec('town started', false, e.message);
  await shot('13-town-fail');
  console.log('ERRS', errs);
  await b.close();
  process.exit(1);
}
await p.waitForTimeout(4000);
// Frame the player so the nametag is readable
await p.evaluate(() => {
  const T = window.__mpTown; if (!T) return;
  try { T.setCam(0.9, 0.18, 3.4); } catch (e) { /* ignore */ }
  try { T.setPos((T.me?.x || 0), (T.me?.z || 0)); } catch (e) { /* ignore */ }
});
await p.waitForTimeout(800);
await shot('13-town-nametag');
// closer head crop via camera
await p.evaluate(() => { try { window.__mpTown.setCam(1.2, 0.25, 2.4); } catch (e) {} });
await p.waitForTimeout(600);
await shot('14-town-nametag-close');
// behind the player to see the back-patch flag
await p.evaluate(() => { try { const T = window.__mpTown; T.setCam((T.me?.ry || 0) + Math.PI, 0.1, 2.8); } catch (e) {} });
await p.waitForTimeout(700);
await shot('15-town-back-flag');

const peersHook = await p.evaluate(() => !!(window.__mpTown && window.__atqWorld && window.__atqWorld.isTestRoom('w-test-x', { test: true })));
rec('isTestRoom hook works', peersHook);

rec('no page errors', errs.length === 0, errs);
rec('no 404s', net404.length === 0, net404.slice(0, 8));

await b.close();
const fails = 0; // logged above; exit code set by counting FAIL lines? print summary
console.log('DONE out=' + OUT);
