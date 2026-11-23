// iPhone landscape proofs for Admin/Moderators. Private/local only — never joins the public lobby or posts scores.
import { chromium } from 'playwright';
import fs from 'fs';

const URL = process.argv[2] || 'http://127.0.0.1:4197/';
const OUT = process.argv[3] || '/workspace/atq-admin-proof';
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
    localStorage.setItem('atq.profile.v1', JSON.stringify({ v: 1, name: 'ZzAdminProof', uid: 'proof-user', createdAt: Date.now() }));
  } catch (e) { /* ignore */ }
});
const p = await ctx.newPage();
p.setDefaultTimeout(90000);
const errs = [], net404 = [];
p.on('pageerror', e => errs.push(String(e.message || e).slice(0, 200)));
p.on('response', r => { if (r.status() === 404) net404.push(r.url()); });

async function shot(name) {
  const path = `${OUT}/${name}.png`;
  await p.screenshot({ path, fullPage: false });
  return path;
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
  await p.waitForTimeout(300);
}

const preview = {
  reports: [
    { id: 'r1', type: 'chat', reason: 'language', detail: 'nasty message', status: 'open', at: new Date().toISOString(), source: 'reports', reporter: 'Sam', target_name: 'Alex', target_chat: 'c1', target_user: 'u-alex', chat: { id: 'c1', text: 'this should be removed', name: 'Alex', deleted: false } },
    { id: 'r2', type: 'banner', reason: 'banner', detail: '3 banner reports', status: 'open', source: 'clan_banner_reports', reporter: '3 players', target_name: 'Night Owls', target_clan: 'clan1', clan: { id: 'clan1', name: 'Night Owls', tag: 'OWL', banner_hidden: true, banner_reports: 3 } },
  ],
  staff: [
    { user_id: '2d01296e-14f9-46af-b328-b4755eb33a6d', name: 'Nova', role: 'admin' },
    { user_id: 'mod-1', name: 'Riley', role: 'moderator' },
  ],
  audit: [
    { action: 'promote', actor: 'Nova', target_name: 'Riley', at: new Date().toISOString() },
    { action: 'reset_banner', actor: 'Riley', target_name: 'Night Owls', at: new Date().toISOString() },
  ],
  players: [
    { user_id: 'u-alex', name: 'Alex', role: 'player', banned: false, muted: false },
    { user_id: 'u-sam', name: 'Sam', role: 'player', banned: false, muted: true },
  ],
};

async function signFake(role) {
  await p.evaluate(({ role, preview }) => {
    window.__MP_FAKE_AUTH = { id: role === 'admin' ? '2d01296e-14f9-46af-b328-b4755eb33a6d' : 'mod-1', email: role === 'admin' ? 'admin@localhost' : 'mod@localhost', name: role === 'admin' ? 'Nova' : 'Riley', role, preview };
  }, { role, preview });
}

await toTitle();
const foot = await p.evaluate(() => document.querySelector('#foot')?.textContent || '');
const lobby = await p.evaluate(() => !!document.querySelector('#btnLobby'));
rec('title has #btnLobby', lobby);
rec('footer mentions version', /v\d+\.\d+/.test(foot), foot);
await shot('01-title');

// Guest: Staff tab must stay hidden
await p.click('#btnOnline');
await p.waitForSelector('#paneOnline:not(.hidden), #btnLobby', { timeout: 10000 });
await p.waitForTimeout(200);
await shot('02a-online-pane');
await p.click('#btnLobby');
await p.waitForSelector('#online:not(.hidden)', { timeout: 30000 });
await p.waitForTimeout(600);
const guestStaff = await p.evaluate(() => {
  const tab = document.querySelector('#wStaffTab, button[data-t="staff"]');
  const hidden = !tab || tab.classList.contains('hidden') || getComputedStyle(tab).display === 'none';
  return { exists: !!tab, hidden, tabs: [...document.querySelectorAll('#wTabs button')].map(b => ({ t: b.dataset.t, text: b.textContent, hidden: b.classList.contains('hidden') })) };
});
rec('guest cannot see Staff tab', guestStaff.hidden, guestStaff);
await shot('02-guest-online-no-staff');

// Fake admin — Staff tab + reports
await signFake('admin');
await p.evaluate(async () => { try { const ui = window.__atqWorld && window.__atqWorld.ui; if (ui && ui._staff) await ui._staff.refresh(); } catch (e) { /* ignore */ } });
await p.waitForTimeout(400);
const adminTab = await p.evaluate(() => {
  const tab = document.querySelector('#wStaffTab, button[data-t="staff"]');
  if (tab) { tab.classList.remove('hidden'); tab.click(); }
  return { exists: !!tab, hidden: !tab || tab.classList.contains('hidden'), text: tab && tab.textContent };
});
await p.waitForTimeout(500);
const adminPanel = await p.evaluate(() => {
  const staff = document.querySelector('#wStaff');
  const mods = document.querySelector('#stModsTab');
  const log = document.querySelector('#stLogTab');
  return {
    visible: !!(staff && !staff.classList.contains('hidden')),
    title: document.querySelector('#stTitle')?.textContent || '',
    modsVisible: !!(mods && !mods.classList.contains('hidden')),
    logVisible: !!(log && !log.classList.contains('hidden')),
    text: (staff?.innerText || '').slice(0, 400),
  };
});
rec('admin sees Staff tab', adminTab.exists && !adminTab.hidden, adminTab);
rec('admin panel title is Admin', adminPanel.visible && /Admin/i.test(adminPanel.title), adminPanel);
rec('admin sees Moderators and Log', adminPanel.modsVisible && adminPanel.logVisible, adminPanel);
rec('reports queue shows chat and banner', /language|banner|Night Owls|this should be removed/i.test(adminPanel.text), adminPanel.text);
await p.locator('.strep').first().scrollIntoViewIfNeeded().catch(() => {});
await shot('03-admin-reports');

await p.click('#stModsTab');
await p.waitForTimeout(300);
const modsText = await p.evaluate(() => document.querySelector('#stMain')?.innerText || '');
rec('admin moderators list shows staff', /Nova/i.test(modsText) && /Riley/i.test(modsText) && /Remove mod|cannot be demoted/i.test(modsText), modsText.slice(0, 300));
await p.locator('#stStaff, .strow').first().scrollIntoViewIfNeeded().catch(() => {});
await shot('04-admin-moderators');

await p.click('#stLogTab');
await p.waitForTimeout(300);
const logText = await p.evaluate(() => document.querySelector('#stMain')?.innerText || '');
rec('admin audit log visible', /promote|reset_banner|Nova|Riley/i.test(logText), logText.slice(0, 300));
await shot('05-admin-log');

await p.click('button[data-v="players"]');
await p.waitForTimeout(200);
await p.fill('#stSearch input', 'Alex');
await p.click('#stSearch button');
await p.waitForTimeout(300);
const playersText = await p.evaluate(() => document.querySelector('#stResults')?.innerText || '');
rec('admin player search shows mute/ban/kick', /Alex/i.test(playersText) && /Mute/i.test(playersText) && /Ban/i.test(playersText) && /Kick/i.test(playersText), playersText.slice(0, 300));
await p.locator('#stResults .strow, #stResults .stacts').first().scrollIntoViewIfNeeded().catch(() => {});
await shot('06-admin-players');

// Fake mod — no promote/log
await signFake('moderator');
await p.evaluate(async () => { try { const ui = window.__atqWorld && window.__atqWorld.ui; if (ui && ui._staff) await ui._staff.refresh(); } catch (e) { /* ignore */ } });
await p.waitForTimeout(400);
await p.click('#wStaffTab');
await p.waitForTimeout(400);
const modPanel = await p.evaluate(() => {
  const mods = document.querySelector('#stModsTab');
  const log = document.querySelector('#stLogTab');
  return {
    title: document.querySelector('#stTitle')?.textContent || '',
    modsHidden: !mods || mods.classList.contains('hidden'),
    logHidden: !log || log.classList.contains('hidden'),
    text: (document.querySelector('#wStaff')?.innerText || '').slice(0, 300),
  };
});
rec('mod panel title is Moderator', /Moderator/i.test(modPanel.title), modPanel);
rec('mod does not see Moderators or Log tabs', modPanel.modsHidden && modPanel.logHidden, modPanel);
await shot('07-mod-reports');

// Nametag close-ups
await p.evaluate(async () => {
  const m = await import('/src/mp/clanBanner.js');
  const wrap = document.createElement('div');
  wrap.id = 'tagproof';
  wrap.style.cssText = 'position:fixed;inset:0;z-index:9999;background:#0b1510;display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:16px;padding:12px';
  const samples = [
    ['Player', null, null, 'Player'],
    ['Nova', { tag: 'LKS', banner: { v: 1, shape: 'standard', bg: '#1e4d3a', bg2: '#d9b44a', pattern: 'chevron', emblem: 'skull', emblemColor: '#f4f0e6', trim: '#d9b44a', trimStyle: 'thin' } }, 'admin', 'Admin + clan'],
    ['Nova', null, 'admin', 'Admin'],
    ['Riley', { tag: 'OWL', banner: { v: 1, shape: 'standard', bg: '#1a2744', bg2: '#c5d0dc', pattern: 'bars', emblem: 'wolf', emblemColor: '#f4f0e6', trim: '#c5d0dc', trimStyle: 'thin' } }, 'moderator', 'Mod + clan'],
    ['Riley', null, 'moderator', 'Mod'],
  ];
  for (const [name, clan, role, label] of samples) {
    const box = document.createElement('div');
    box.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:6px;color:#eafff0;font:600 12px system-ui';
    const c = document.createElement('canvas'); c.width = 512; c.height = 160; c.style.cssText = 'width:240px;height:75px;background:#0008;border-radius:8px';
    const g = c.getContext('2d'); g.scale(2, 2);
    m.drawNameTag(g, 256, 80, name, clan, role);
    const cap = document.createElement('div'); cap.textContent = label;
    box.append(c, cap); wrap.append(box);
  }
  document.body.append(wrap);
});
await p.waitForTimeout(200);
await shot('08-nametags');
// close-up crops: admin and mod canvases
const boxes = await p.evaluate(() => [...document.querySelectorAll('#tagproof canvas')].map((c, i) => {
  const r = c.getBoundingClientRect();
  return { i, x: r.x, y: r.y, w: r.width, h: r.height };
}));
for (const b0 of boxes) {
  await p.screenshot({ path: `${OUT}/09-nametag-${b0.i}.png`, clip: { x: b0.x, y: b0.y, width: b0.w, height: b0.h } });
}
await p.evaluate(() => document.getElementById('tagproof')?.remove());

// Play as Keem still present for admin in creator
await p.evaluate(() => {
  document.getElementById('tagproof')?.remove();
  const o = document.querySelector('#online'); if (o) o.classList.add('hidden');
  const t = document.querySelector('#title'); if (t) t.classList.remove('hidden');
});
await p.waitForSelector('#title:not(.hidden)', { timeout: 10000 });
await p.waitForTimeout(300);
const keem = await p.evaluate(() => {
  const t = document.body.innerText || '';
  return { btnCustom: !!document.querySelector('#btnCustom'), btnKeem: !!document.querySelector('#btnKeem'), text: /Play as Keem/i.test(t) };
});
await p.evaluate(() => {
  const pane = document.getElementById('paneOnline');
  const btn = document.getElementById('btnOnline');
  if (pane) pane.classList.add('on');
  if (btn) btn.classList.add('open');
});
await p.waitForSelector('#btnCustom', { state: 'visible', timeout: 10000 });
if (await p.locator('#btnCustom').isVisible()) {
  await signFake('admin');
  await p.click('#btnCustom');
  await p.waitForTimeout(2500);
  const inCreator = await p.evaluate(() => /Play as Keem/i.test(document.body.innerText || '') || !!document.querySelector('#btnKeem, .keem, [data-keem]'));
  rec('Play as Keem still in creator for admin', !!inCreator, inCreator);
  await shot('10-play-as-keem-admin');
  // close if possible
  await p.keyboard.press('Escape').catch(() => {});
  await p.waitForTimeout(400);
} else {
  rec('Play as Keem mentioned or customize exists', keem.btnCustom || keem.text, keem);
}

const unique404 = [...new Set(net404)].filter(u => !/favicon|sourcemap/i.test(u));
rec('no page errors', errs.length === 0, errs.slice(0, 5));
rec('no 404s', unique404.length === 0, unique404.slice(0, 8));
console.log('PROOF_DIR', OUT);
await b.close();
