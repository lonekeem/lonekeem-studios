// Weapon-bar smoke: Survival + isolated town at 844x390.
// Switch via slots and keys 1-9, confirm equipped weapon + ammoTxt, 0 page errors.
// usage: node tools/smoke_wbar.mjs <url> <outdir>
import { chromium } from 'playwright';
import fs from 'fs';

const URL = process.argv[2] || 'http://127.0.0.1:5350/';
const OUT = process.argv[3] || '/workspace/atq-wbar-proof';
fs.mkdirSync(OUT, { recursive: true });

const b = await chromium.launch({
  executablePath: '/usr/bin/google-chrome',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'],
});
const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await ctx.addInitScript(() => {
  localStorage.setItem('atq3.settings', JSON.stringify({ qual: 'low', gore: true, hints: false, ctl: 'twin', hudv2: false }));
  localStorage.setItem('atq_prologue_seen', '1');
});
const p = await ctx.newPage();
p.setDefaultTimeout(180000);
const errs = [];
p.on('pageerror', e => errs.push(String(e.message || e).slice(0, 300)));
p.on('console', m => { if (m.type() === 'error' && !/404 \(Not Found\)/.test(m.text())) errs.push('CE ' + m.text().slice(0, 240)); });
p.on('dialog', d => d.accept());

const results = [];
const rec = (n, ok, d) => { results.push(!!ok); console.log(ok ? 'PASS' : 'FAIL', n, d != null ? JSON.stringify(d).slice(0, 400) : ''); return !!ok; };
const shot = async (n, w = 600) => { await p.waitForTimeout(w); await p.screenshot({ path: `${OUT}/${n}.png` }); console.log('SHOT', n); };
const barState = () => p.evaluate(() => {
  const bar = document.getElementById('wbar');
  const slots = [...document.querySelectorAll('#wbar .wslot')].map(s => ({
    id: s.dataset.id, eq: s.classList.contains('eq'), off: s.classList.contains('off'),
    empty: s.classList.contains('empty'), name: (s.querySelector('.wn') || {}).textContent,
    ammo: (s.querySelector('.wa') || {}).textContent,
  }));
  const r = bar && bar.getBoundingClientRect();
  const boxes = (sel) => [...document.querySelectorAll(sel)].filter(e => e.offsetParent !== null || e.id === 'mini' || e.id === 'stickBase').map(e => {
    const b = e.getBoundingClientRect();
    return { id: e.id || e.className, x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) };
  });
  return {
    on: !!(bar && bar.classList.contains('on')),
    hiddenHud: !!(document.getElementById('hud') && document.getElementById('hud').classList.contains('hidden')),
    n: slots.length, owned: slots.filter(s => !s.off).length, eq: slots.find(s => s.eq) || null, slots,
    rect: r ? { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right) } : null,
    ammoTxt: (document.getElementById('ammoTxt') || {}).textContent || '',
    swapHidden: !!(document.getElementById('btnSwap') && getComputedStyle(document.getElementById('btnSwap')).display === 'none'),
    invExists: !!document.getElementById('inv') && !!document.getElementById('btnPInv'),
    open: !!(bar && bar.classList.contains('open')),
    toggle: !!document.getElementById('wbarToggle'),
    vis: [...document.querySelectorAll('#wbar .wslot')].filter(s => {
      const st = getComputedStyle(s); const b = s.getBoundingClientRect();
      return st.display !== 'none' && st.visibility !== 'hidden' && b.width > 0;
    }).map(s => s.dataset.id),
    eqVisible: (() => {
      const eq = document.querySelector('#wbar .wslot.eq');
      const bar = document.getElementById('wbar');
      if (!eq || !bar) return false;
      const st = getComputedStyle(eq);
      if (st.display === 'none') return false;
      const a = eq.getBoundingClientRect(), b = bar.getBoundingClientRect();
      return a.left >= b.left - 2 && a.right <= b.right + 2 && a.width > 0;
    })(),
    toast: (() => {
      const e = document.getElementById('toast');
      if (!e) return null;
      const r = e.getBoundingClientRect();
      return { on: e.classList.contains('on'), wep: e.classList.contains('wep'), text: e.textContent,
        y: Math.round(r.y + r.height / 2), x: Math.round(r.x + r.width / 2), top: Math.round(r.top), bottom: Math.round(r.bottom) };
    })(),
  };
});

await p.goto(URL, { waitUntil: 'domcontentloaded', timeout: 180000 });
const warn = p.locator('#btnWarn');
if (await warn.count()) { await warn.click(); await p.waitForTimeout(400); }
await p.locator('#studio').click({ timeout: 5000 }).catch(() => {});
await p.waitForSelector('#title:not(.hidden)', { timeout: 120000 });

// ---------- Survival ----------
await p.click('#title .mtabs button[data-tab="survival"]');
await p.click('#btnSurvival');
await p.waitForFunction(() => window.__atq && window.__atq.game && window.__atq.game.running && window.__atq.game.survival, null, { timeout: 180000 });
await p.waitForTimeout(1500);
await p.evaluate(() => {
  const g = window.__atq.game, S = g.save;
  for (const id of ['fists', 'pan', 'pistol', 'shotgun', 'rifle', 'bat']) {
    if (!S.owned.includes(id)) S.owned.push(id);
  }
  S.ammo = Object.assign({}, S.ammo || {}, { light: 48, shell: 16, rifle: 60 });
  S.mags = Object.assign({}, S.mags || {}, { pistol: 12, shotgun: 6, rifle: 30 });
  S.cur = 'pistol';
  g.equip && g.equip('pistol', true);
  g.paused = false;
  try { for (let i = 0; i < 40; i++) g.skipLine && g.skipLine(); } catch (e) { /* ignore */ }
  if (g.zombies) g.zombies.forEach(z => { z.dead = true; if (z.root) z.root.visible = false; });
});
await p.waitForTimeout(400);
await p.evaluate(() => { const g = window.__atq.game; if (g && g.hud) g.hud(); });
const s0 = await barState();
rec('survival bar visible collapsed', s0.on && s0.toggle && !s0.open && s0.vis.length === 1 && s0.vis[0] === 'pistol', { on: s0.on, open: s0.open, vis: s0.vis, eq: s0.eq, swapHidden: s0.swapHidden });
rec('survival pistol equipped + ammo label', s0.eq && s0.eq.id === 'pistol' && /9mm|Pistol/i.test(s0.ammoTxt) && /12\s*\/\s*48/.test(s0.ammoTxt), { eq: s0.eq, ammo: s0.ammoTxt, eqVisible: s0.eqVisible });
rec('survival equipped slot is on screen', s0.eqVisible, s0.rect);
rec('pause-menu Inventory still present', s0.invExists);
await shot('surv_closed', 500);

await p.click('#wbarToggle');
await p.waitForTimeout(250);
const sOpen = await barState();
rec('survival toggle opens the full bar', sOpen.open && sOpen.vis.length >= 6 && sOpen.toggle, { open: sOpen.open, vis: sOpen.vis });
rec('unowned slots are dimmed', sOpen.slots.some(s => s.off) && sOpen.slots.filter(s => s.off).every(s => s.id !== 'pistol'), { off: sOpen.slots.filter(s => s.off).map(s => s.id).slice(0, 8) });
await shot('surv_open', 400);

const rifle = p.locator('#wbar .wslot[data-id="rifle"]');
rec('rifle slot is owned', await rifle.count() > 0);
await rifle.click();
await p.waitForTimeout(300);
await p.evaluate(() => { const g = window.__atq.game; if (g && g.hud) g.hud(); });
const s1 = await barState();
rec('pick rifle updates ammo and closes the bar', s1.eq && s1.eq.id === 'rifle' && !s1.open && /Rifle/i.test(s1.ammoTxt) && /30/.test(s1.ammoTxt), { eq: s1.eq, ammo: s1.ammoTxt, open: s1.open, cur: await p.evaluate(() => window.__atq.game.save.cur) });
await shot('surv_rifle', 400);

// key 1 should select the first owned (fists)
await p.keyboard.press('Digit1');
await p.waitForTimeout(200);
await p.evaluate(() => { const g = window.__atq.game; if (g && g.hud) g.hud(); });
const s2 = await barState();
rec('key 1 equips first owned (fists) while closed', s2.eq && s2.eq.id === 'fists' && !s2.open && /Fists/i.test(s2.ammoTxt), { eq: s2.eq, ammo: s2.ammoTxt, open: s2.open });
await shot('surv_fists_key1', 300);

// key 3 (pan is 2, pistol is 3 if order is fists,pan,bat,pistol? WEAPON_ORDER: fists, pan, bat, ... pistol)
// owned: fists, pan, bat, pistol, shotgun, rifle -> 1 fists, 2 pan, 3 bat
await p.keyboard.press('Digit4');
await p.waitForTimeout(200);
await p.evaluate(() => { const g = window.__atq.game; if (g && g.hud) g.hud(); });
const s3 = await barState();
rec('key 4 equips pistol (4th owned) while closed', s3.eq && s3.eq.id === 'pistol' && !s3.open, { eq: s3.eq, ammo: s3.ammoTxt, open: s3.open, ownedOrder: s3.slots.filter(s => !s.off).map(s => s.id) });
await shot('surv_pistol_key4', 300);

// wheel down should go to next owned after pistol (shotgun)
await p.mouse.move(420, 300);
await p.waitForTimeout(50);
await p.evaluate(() => window.dispatchEvent(new WheelEvent('wheel', { deltaY: 120, bubbles: true, cancelable: true })));
await p.waitForTimeout(250);
await p.evaluate(() => { const g = window.__atq.game; if (g && g.hud) g.hud(); });
const s4 = await barState();
rec('wheel switches to next owned (shotgun) while closed', s4.eq && s4.eq.id === 'shotgun' && !s4.open && /Shotgun|Shotty|Pump/i.test(s4.ammoTxt), { eq: s4.eq, ammo: s4.ammoTxt, open: s4.open, toast: s4.toast });
rec('switch toast is not over the crosshair', !s4.toast || !s4.toast.on || (s4.toast.wep && s4.toast.y > 260), s4.toast);
await shot('surv_shotgun_wheel', 300);

await p.keyboard.press('KeyQ');
await p.waitForTimeout(250);
const sQ1 = await barState();
rec('Q opens the weapon bar', sQ1.open, { open: sQ1.open, vis: sQ1.vis });
await p.keyboard.press('KeyQ');
await p.waitForTimeout(250);
const sQ2 = await barState();
rec('Q closes the weapon bar', !sQ2.open, { open: sQ2.open });

// pause inventory still works
await p.click('#btnPause');
await p.waitForSelector('#pause:not(.hidden)', { timeout: 10000 });
await p.click('#btnPInv');
await p.waitForSelector('#inv:not(.hidden)', { timeout: 10000 });
const inv = await p.evaluate(() => ({
  shown: !document.getElementById('inv').classList.contains('hidden'),
  html: (document.getElementById('invList') || {}).innerText || '',
}));
rec('pause Inventory & Stats opens and lists weapons', inv.shown && /Pistol|Rifle|Shotgun|Fists/i.test(inv.html), { text: inv.html.slice(0, 220) });
await shot('surv_pause_inv', 300);
await p.click('#inv .back');
await p.waitForTimeout(200);
await p.click('#btnResume').catch(() => {});
await p.waitForTimeout(300);

const overlap = await p.evaluate(() => {
  const bar = document.getElementById('wbar');
  if (!bar) return { ok: false };
  const br = bar.getBoundingClientRect();
  const ids = ['mini', 'stickBase', 'tAtk', 'tRoll', 'tJump', 'tAim', 'pfp', 'xhair'];
  const hits = [];
  for (const id of ids) {
    const e = document.getElementById(id);
    if (!e) continue;
    const st = getComputedStyle(e);
    if (st.display === 'none' || st.visibility === 'hidden') continue;
    const r = e.getBoundingClientRect();
    const overlap = !(br.right <= r.left + 2 || br.left >= r.right - 2 || br.bottom <= r.top + 2 || br.top >= r.bottom - 2);
    if (overlap) hits.push({ id, bar: [Math.round(br.left), Math.round(br.top), Math.round(br.right), Math.round(br.bottom)], other: [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)] });
  }
  return { ok: hits.length === 0, hits, bar: [Math.round(br.left), Math.round(br.top), Math.round(br.right), Math.round(br.bottom)] };
});
rec('survival bar does not cover mini / stick / FIRE / ROLL / JUMP', overlap.ok, overlap);

const survErrs = errs.slice();
rec('survival 0 page errors', survErrs.length === 0, survErrs);

// leave survival so we can enter town cleanly
await p.evaluate(() => {
  try { if (window.__atq && window.__atq.game) window.__atq.game.paused = true; } catch (e) { /* ignore */ }
  const pause = document.getElementById('pause'); if (pause) pause.classList.add('hidden');
  const inv = document.getElementById('inv'); if (inv) inv.classList.add('hidden');
});

// ---------- Town ----------
const entered = await p.evaluate(async () => {
  const title = document.getElementById('title'); if (title) title.classList.add('hidden');
  const town = await import('/src/mp/town/town.js');
  const look = { v: 1, name: 'WbarTest', base: 'mp_m1', skin: { t: .26, u: .2 }, height: 0, morph: {},
    eyes: { s: 0, col: '#3a7a52', size: .1, space: 0, tilt: 0, lash: 0 }, brows: { s: 3, thick: .3, arch: 0, col: '#3a2616' },
    nose: { s: 0 }, mouth: { s: 8, full: 0, width: 0, col: null }, makeup: { shadow: 0, shadowCol: '#7a4a8a', liner: 0, blush: 0, lip: 0, lipCol: '#b2264a' },
    skinx: { freckles: 0, moles: 0, scar: 0, scarSide: 1, tattoo: 0, tattooCol: '#1c2a3a', age: 0 },
    hair: { id: 'messy', c: '#5a3b22', c2: '#8a6238', hl: .45 }, beard: { id: 'full', c: '#6a4f38', len: .55, dens: .9 }, stache: { id: 'chevron', c: '#6a4f38', len: .5, dens: .9 }, mask: null,
    worn: { top: { id: 'tee', c: '#17181b', c2: '#ffffff', p: 0 }, jacket: null, pants: { id: 'cargojog', c: '#a9adb2', c2: '#ffffff', p: 0 }, shoes: { id: 'clog', c: '#1b1c1f', c2: '#2a2b2f', p: 0, sole: '#1b1c1f' }, gloves: null },
    acc: { hat: null, glasses: null, earL: null, earR: null, pierce: [], neck: null, wristL: null, wristR: null, ringL: null, ringR: null, bag: null, belt: null } };
  await town.enterTown({ look, room: 'wbartest-local', solo: true, onExit() {} });
  return !!(window.__mpTown && window.__mpTown.me);
});
rec('enter isolated solo town', entered);
await p.waitForFunction(() => window.__mpTown && window.__mpTown.me && window.__mpTown.cam, null, { timeout: 180000 });
await p.waitForTimeout(1200);
await p.evaluate(() => {
  const T = window.__mpTown;
  try { T.Z && T.Z.killNear(0, 0, 400, 9999); } catch (e) { /* ignore */ }
  T.bag.cap = 99;
  for (const k of ['pistol', 'shotgun', 'rifle', 'bat', 'pan', 'smg']) T.bag.add(k, 1);
  T.bag.add('ammo_light', 48); T.bag.add('ammo_shell', 16); T.bag.add('ammo_rifle', 60);
  T.GS.mag = Object.assign({}, T.GS.mag, { pistol: 12, shotgun: 6, rifle: 30, smg: 30 });
  T.bag.pref = 'pistol';
  T.equipWeapon && T.equipWeapon('pistol');
  try { T.scene.traverse(o => { if (o.isSprite) o.visible = false; }); } catch (e) { /* ignore */ }
});
await p.waitForTimeout(500);
const t0 = await barState();
rec('town bar visible collapsed with pistol', t0.on && t0.toggle && !t0.open && t0.eq && t0.eq.id === 'pistol' && /9mm|Pistol/i.test(t0.ammoTxt) && /12/.test(t0.ammoTxt), { on: t0.on, open: t0.open, vis: t0.vis, eq: t0.eq, ammo: t0.ammoTxt, eqVisible: t0.eqVisible });
rec('town equipped slot is on screen', t0.eqVisible, t0.rect);
await shot('town_closed', 500);

await p.click('#wbarToggle');
await p.waitForTimeout(250);
const tOpen = await barState();
rec('town toggle opens the full bar', tOpen.open && tOpen.vis.includes('smg'), { open: tOpen.open, vis: tOpen.vis });
await shot('town_open', 400);

await p.locator('#wbar .wslot[data-id="smg"]').click();
await p.waitForTimeout(400);
const t1 = await barState();
rec('town pick SMG updates ammo and closes the bar', t1.eq && t1.eq.id === 'smg' && !t1.open && /SMG/i.test(t1.ammoTxt) && await p.evaluate(() => window.__mpTown.bag.pref) === 'smg', { eq: t1.eq, ammo: t1.ammoTxt, open: t1.open });
await shot('town_smg', 400);

await p.keyboard.press('Digit1');
await p.waitForTimeout(300);
const t2 = await barState();
rec('town key 1 equips fists while closed', t2.eq && t2.eq.id === 'fists' && !t2.open && /Fists/i.test(t2.ammoTxt), { eq: t2.eq, ammo: t2.ammoTxt, open: t2.open, pref: await p.evaluate(() => window.__mpTown.bag.pref), eqVisible: t2.eqVisible });
await shot('town_fists_key1', 300);

await p.mouse.move(420, 300);
await p.evaluate(() => window.dispatchEvent(new WheelEvent('wheel', { deltaY: 120, bubbles: true, cancelable: true })));
await p.waitForTimeout(300);
const t3 = await barState();
rec('town wheel switches off fists while closed', t3.eq && t3.eq.id !== 'fists' && !t3.open, { eq: t3.eq, ammo: t3.ammoTxt, open: t3.open });
await shot('town_wheel', 300);

const townOverlap = await p.evaluate(() => {
  const bar = document.getElementById('wbar');
  if (!bar) return { ok: false };
  const br = bar.getBoundingClientRect();
  const ids = ['mini', 'stickBase', 'tAtk', 'tRoll', 'tJump', 'xhair'];
  const hits = [];
  for (const id of ids) {
    const e = document.getElementById(id);
    if (!e) continue;
    const st = getComputedStyle(e);
    if (st.display === 'none' || st.visibility === 'hidden') continue;
    const r = e.getBoundingClientRect();
    const overlap = !(br.right <= r.left + 2 || br.left >= r.right - 2 || br.bottom <= r.top + 2 || br.top >= r.bottom - 2);
    if (overlap) hits.push({ id, other: [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)] });
  }
  return { ok: hits.length === 0, hits, bar: [Math.round(br.left), Math.round(br.top), Math.round(br.right), Math.round(br.bottom)] };
});
rec('town bar does not cover mini / stick / FIRE / ROLL / JUMP', townOverlap.ok, townOverlap);

const newErrs = errs.slice(survErrs.length);
rec('town 0 page errors', newErrs.length === 0, newErrs);
rec('all 0 page errors', errs.length === 0, errs);

fs.writeFileSync(`${OUT}/results.json`, JSON.stringify({ results, errs, s0, s1, s2, s3, s4, t0, t1, t2, t3, overlap, townOverlap }, null, 2));
const failed = results.filter(x => !x).length;
console.log('DONE', results.filter(x => x).length + '/' + results.length, 'failed=' + failed);
await b.close();
process.exit(failed ? 1 : 0);
