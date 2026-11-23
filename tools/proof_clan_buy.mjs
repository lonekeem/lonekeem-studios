// iPhone landscape touch proofs for buying a clan with in-game cash.
// Never joins the public lobby or posts scores.
import { chromium } from 'playwright';
import fs from 'fs';

const URL = process.argv[2] || 'http://127.0.0.1:4193/';
const OUT = process.argv[3] || '/workspace/atq-clan-proof/buy';
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
    localStorage.setItem('atq.gate', JSON.stringify({ birthYear: 1990, agreedVersion: 1 }));
    localStorage.setItem('atq.tut.seen', '1');
    localStorage.setItem('atq.town.tut', '1');
    localStorage.setItem('atq3_save', JSON.stringify({ v: 3, step: 3, played: true, cash: 400, xp: 0, level: 3, owned: ['fists'], outfits: ['classic'] }));
    localStorage.setItem('atq.profile.v1', JSON.stringify({ v: 1, name: 'ZzBuyProof', uid: null, createdAt: Date.now() }));
    localStorage.setItem('atq.guest', JSON.stringify({ id: crypto.randomUUID(), secret: crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, ''), name: 'ZzBuyProof' }));
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
async function close(name, sel) {
  const loc = p.locator(sel).first();
  if (!(await loc.count())) return null;
  const path = `${OUT}/${name}.png`;
  await loc.screenshot({ path });
  return path;
}

await p.goto(URL, { waitUntil: 'domcontentloaded' });
for (let i = 0; i < 80; i++) {
  const r = await p.evaluate(() => {
    const s = document.getElementById('gateSkip'); if (s && s.offsetParent) { s.click(); return ''; }
    const ts = document.getElementById('tutSkip'); if (ts && ts.offsetParent) { ts.click(); return ''; }
    const w = document.getElementById('btnWarn'); if (w && w.offsetParent) { w.click(); return ''; }
    const t = document.getElementById('title'); const l = document.getElementById('loading');
    return t && !t.classList.contains('hidden') && (!l || l.classList.contains('hidden')) ? 'ok' : '';
  });
  if (r === 'ok') break;
  await p.waitForTimeout(400);
}
await p.waitForSelector('#title:not(.hidden)', { timeout: 30000 });
await p.locator('#tutSkip').tap({ timeout: 1500 }).catch(() => {});
await p.waitForTimeout(300);

const foot = await p.evaluate(() => document.querySelector('#foot')?.textContent || '');
rec('title has #btnLobby', await p.evaluate(() => !!document.querySelector('#btnLobby')));
rec('footer mentions version', /v\d+\.\d+/.test(foot), foot);
await shot('01-title');

await p.locator('#btnOnline').tap();
await p.waitForTimeout(300);
await p.locator('#btnClans').tap();
await p.waitForSelector('#online:not(.hidden)', { timeout: 30000 });
await p.waitForSelector('#cCreate', { timeout: 20000 });
const home = await p.evaluate(() => {
  const btn = document.querySelector('#cCreate');
  const text = (document.querySelector('#cMain')?.innerText || '');
  return { btn: btn && btn.textContent, text, priceOnBtn: /\$2,500/.test(btn && btn.textContent || ''), joinFree: /joining someone else's clan is free/i.test(text) };
});
rec('home Create button shows $2,500', home.priceOnBtn, home.btn);
rec('home copy says joining is free', home.joinFree, home.text.slice(0, 280));
await shot('02-clans-home-price');
await close('02b-create-btn-close', '#cCreate');

await p.locator('#cCreate').tap();
await p.waitForSelector('#cCreateGo, #cCashNeed', { timeout: 10000 });
await p.waitForTimeout(250);
const short = await p.evaluate(() => {
  const go = document.querySelector('#cCreateGo');
  const need = document.querySelector('#cCashNeed');
  const wal = document.querySelector('#cWallet');
  return {
    wal: wal && wal.textContent,
    need: need && need.textContent,
    needVisible: !!(need && !need.classList.contains('hidden')),
    go: go && go.textContent,
    needcash: !!(go && go.classList.contains('needcash')),
  };
});
rec('wallet shows $400', /\$400\b/.test(short.wal || ''), short.wal);
rec('not-enough message visible', short.needVisible && /Not enough cash/i.test(short.need || '') && /\$2,500/.test(short.need || '') && /\$400/.test(short.need || ''), short.need);
rec('Create button is not-enough state', short.needcash && /Need \$2,500/.test(short.go || '') && /\$400/.test(short.go || ''), short.go);
await shot('03-not-enough');
await close('03b-form-close', '#cMain .cform, #cMain');

// Name/tag first so the short-funds path is the one that runs.
await p.locator('#cName').tap();
await p.fill('#cName', 'Quiet Falls Crew');
await p.locator('#cTag').tap();
await p.fill('#cTag', 'qfc');
await p.waitForTimeout(150);

// Tap the short-funds button: should flash, no confirm, no sign-in navigation.
let dialogs = [];
p.on('dialog', async d => { dialogs.push(d.message()); await d.dismiss(); });
await p.locator('#cCreateGo').tap();
await p.waitForTimeout(500);
const flash = await p.evaluate(() => {
  const n = document.querySelector('#cCashNeed');
  const go = document.querySelector('#cCreateGo');
  return { need: n && n.textContent, needVisible: !!(n && !n.classList.contains('hidden')), go: go && go.textContent };
});
rec('short-funds tap does not open confirm', dialogs.length === 0, dialogs);
rec('short-funds feedback mentions cash', flash.needVisible && /not enough cash/i.test(flash.need || '') && /Need \$2,500/.test(flash.go || ''), flash);
await shot('04-not-enough-tap');

// Give the player enough cash and reopen the form so the wallet / button update.
await p.evaluate(() => {
  if (window.__atq && window.__atq.save) window.__atq.save.cash = 5000;
  const raw = JSON.parse(localStorage.getItem('atq3_save') || '{}');
  raw.cash = 5000; localStorage.setItem('atq3_save', JSON.stringify(raw));
});
await p.locator('#cCreateBack').tap();
await p.waitForTimeout(250);
await p.locator('#cCreate').tap();
await p.waitForSelector('#cCreateGo', { timeout: 10000 });
await p.waitForTimeout(200);
const rich = await p.evaluate(() => ({
  wal: document.querySelector('#cWallet')?.textContent,
  go: document.querySelector('#cCreateGo')?.textContent,
  needHidden: document.querySelector('#cCashNeed')?.classList.contains('hidden'),
  needcash: document.querySelector('#cCreateGo')?.classList.contains('needcash'),
}));
rec('wallet shows $5,000 when funded', /\$5,000/.test(rich.wal || ''), rich.wal);
rec('Create button shows price, not short', /Create clan · \$2,500/.test(rich.go || '') && !rich.needcash && rich.needHidden, rich);
await shot('05-enough-cash');
await close('05b-form-close', '#cMain .cform, #cMain');

await p.locator('#cName').tap();
await p.fill('#cName', 'Quiet Falls Crew');
await p.locator('#cTag').tap();
await p.fill('#cTag', 'qfc');
await p.evaluate(() => { window.__atqClanProofSignIn = true; });
dialogs = [];
await p.locator('#cCreateGo').tap();
await p.waitForTimeout(600);
rec('confirm step names the $2,500 price', dialogs.some(m => /\$2,500/.test(m) && /in-game cash/i.test(m) && /free/i.test(m) && /Quiet Falls Crew/i.test(m) && /QFC/.test(m)), dialogs);
await shot('06-confirm-dismissed');

// Client cash-display helper used after a successful purchase (server already tested separately).
const after = await p.evaluate(() => {
  window.__atqClans.applySharedCash(2500);
  return {
    save: window.__atq && window.__atq.save && window.__atq.save.cash,
    ls: JSON.parse(localStorage.getItem('atq3_save') || '{}').cash,
    wal: document.querySelector('#cWallet')?.textContent,
  };
});
rec('cash display updates after applySharedCash', after.save === 2500 && after.ls === 2500 && /\$2,500/.test(after.wal || ''), after);
await shot('07-cash-updated');
await close('07b-wallet-close', '#cWallet');

// Join path still has no price on join buttons (browse tab if present).
const joinBtns = await p.evaluate(() => {
  const texts = [...document.querySelectorAll('#wClans button, #cMain button')].map(b => (b.textContent || '').trim());
  return texts;
});
rec('no join-price on create view buttons', !joinBtns.some(t => /join.*\$/i.test(t)), joinBtns);

rec('0 page errors', errs.length === 0, errs);
rec('0 404s', net404.length === 0, net404.slice(0, 5));

await b.close();
const fails = [];
// recount from this process logs is implicit; exit 0 if we reached here — the rec() lines are the audit
console.log('OUT', OUT);
