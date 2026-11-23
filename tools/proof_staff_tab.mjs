// iPhone landscape proofs: Staff tab on a restored session and after a late role load.
// Private/local only — never joins the public lobby or posts scores.
import { chromium } from 'playwright';
import fs from 'fs';

const URL = process.argv[2] || 'http://127.0.0.1:4297/';
const OUT = process.argv[3] || '/workspace/atq-admin-proof/fix';
fs.mkdirSync(OUT, { recursive: true });

const rec = (n, ok, d) => { console.log(ok ? 'PASS' : 'FAIL', n, d != null ? JSON.stringify(d) : ''); return ok; };
let failed = 0;
const need = (n, ok, d) => { if (!rec(n, ok, d)) failed++; };

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
    localStorage.setItem('atq.profile.v1', JSON.stringify({ v: 1, name: 'ZzStaffFix', createdAt: Date.now() }));
  } catch (e) { /* ignore */ }
});
const p = await ctx.newPage();
p.setDefaultTimeout(60000);
const errs = [], net404 = [];
p.on('pageerror', e => errs.push(String(e.message || e).slice(0, 200)));
p.on('response', r => { if (r.status() === 404) net404.push(r.url()); });

async function shot(name) {
  await p.screenshot({ path: `${OUT}/${name}.png`, fullPage: false });
}

async function toTitle() {
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
  await p.locator('#tutSkip').click({ timeout: 1500 }).catch(() => {});
  await p.waitForTimeout(200);
}

async function openLobby() {
  await p.evaluate(() => {
    const pane = document.getElementById('paneOnline');
    const btn = document.getElementById('btnOnline');
    if (pane) pane.classList.add('on');
    if (btn) btn.classList.add('open');
  });
  await p.waitForSelector('#btnLobby', { state: 'visible', timeout: 10000 });
  await p.click('#btnLobby');
  await p.waitForSelector('#online:not(.hidden)', { timeout: 30000 });
  await p.waitForTimeout(400);
}

function tabInfo() {
  return p.evaluate(() => {
    const tab = document.querySelector('#wStaffTab');
    const hidden = !tab || tab.classList.contains('hidden') || !(tab.offsetWidth || tab.offsetHeight);
    const title = document.querySelector('#stTitle')?.textContent || '';
    const mods = document.querySelector('#stModsTab');
    const log = document.querySelector('#stLogTab');
    const vis = el => !!(el && !el.classList.contains('hidden') && (el.offsetWidth || el.offsetHeight));
    const tabs = [...document.querySelectorAll('#wTabs button')].map(b => ({ t: b.dataset.t, text: b.textContent, hidden: b.classList.contains('hidden') || !(b.offsetWidth || b.offsetHeight) }));
    return { exists: !!tab, hidden, text: tab?.textContent || '', title, modsVisible: vis(mods), logVisible: vis(log), tabs };
  });
}

async function signFake(role, { notify = false } = {}) {
  await p.evaluate(({ role, notify }) => {
    if (!role) {
      window.__MP_FAKE_AUTH = {};
      if (notify) window.dispatchEvent(new CustomEvent('atq-auth', { detail: { event: 'SIGNED_OUT' } }));
      return;
    }
    window.__MP_FAKE_AUTH = {
      id: role === 'admin' ? '2d01296e-14f9-46af-b328-b4755eb33a6d' : (role === 'moderator' ? 'mod-1' : 'player-1'),
      email: role === 'admin' ? 'admin@localhost' : (role === 'moderator' ? 'mod@localhost' : 'player@localhost'),
      name: role === 'admin' ? 'Nova' : (role === 'moderator' ? 'Riley' : 'Alex'),
      role,
    };
    if (notify) window.dispatchEvent(new CustomEvent('atq-auth', { detail: { event: 'SIGNED_IN' } }));
  }, { role, notify });
}

// --- 1. Guest / unsigned: no Staff tab ---
await toTitle();
await openLobby();
let info = await tabInfo();
need('guest cannot see Staff tab', info.hidden === true, info);
await shot('01-guest-no-staff');

// --- 2. Late admin sign-in without reopen ---
await signFake('admin', { notify: true });
await p.waitForTimeout(600);
info = await tabInfo();
need('late admin sign-in shows Staff tab without reopen', info.hidden === false && info.text === 'Staff', info);
await shot('02-late-admin-tab');
await p.click('#wStaffTab');
await p.waitForTimeout(400);
info = await tabInfo();
need('late admin panel is Admin with Moderators and Log', info.title === 'Admin' && info.modsVisible && info.logVisible, info);
await shot('03-late-admin-panel');

// --- 3. Sign out hides the tab without reopen ---
await signFake(null, { notify: true });
await p.waitForTimeout(500);
info = await tabInfo();
need('sign-out hides Staff tab without reopen', info.hidden === true, info);
await shot('04-signout-hides-tab');

// --- 4. Late player sign-in must never show Staff ---
await signFake('player', { notify: true });
await p.waitForTimeout(600);
info = await tabInfo();
need('late player sign-in does not show Staff tab', info.hidden === true, info);
await shot('05-late-player-no-staff');

// --- 5. Restored admin session at startup ---
await signFake('admin', { notify: false });
await toTitle();
await openLobby();
info = await tabInfo();
need('restored admin session shows Staff tab', info.hidden === false && info.text === 'Staff', info);
await p.click('#wStaffTab');
await p.waitForTimeout(400);
info = await tabInfo();
need('restored admin panel is Admin with Moderators and Log', info.title === 'Admin' && info.modsVisible && info.logVisible, info);
await shot('06-restored-admin-panel');

// --- 6. Restored player session ---
await signFake('player', { notify: false });
await toTitle();
await openLobby();
info = await tabInfo();
need('restored player session does not show Staff tab', info.hidden === true, info);
await shot('07-restored-player-no-staff');

// --- 7. Restored moderator session ---
await signFake('moderator', { notify: false });
await toTitle();
await openLobby();
info = await tabInfo();
need('restored moderator session shows Staff tab', info.hidden === false, info);
await p.click('#wStaffTab');
await p.waitForTimeout(400);
info = await tabInfo();
need('restored mod panel is Moderator without Moderators/Log', info.title === 'Moderator' && !info.modsVisible && !info.logVisible, info);
await shot('08-restored-mod-panel');

const unique404 = [...new Set(net404)].filter(u => !/favicon|sourcemap/i.test(u));
need('no page errors', errs.length === 0, errs.slice(0, 5));
need('no 404s', unique404.length === 0, unique404.slice(0, 8));
need('#btnLobby still present', !!(await p.evaluate(() => document.querySelector('#btnLobby'))));
console.log('PROOF_DIR', OUT);
await b.close();
process.exit(failed ? 1 : 0);
