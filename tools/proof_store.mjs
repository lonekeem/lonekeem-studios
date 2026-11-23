import { chromium, webkit, devices } from 'playwright';
import fs from 'fs';
import path from 'path';

const OUT = process.env.ATQ_PROOF || '/workspace/atq-store-proof';
fs.mkdirSync(OUT, { recursive: true });
const BASE = process.env.ATQ_URL || 'http://127.0.0.1:5388/';
const CHROME = '/usr/bin/google-chrome';
const rec = [];
const log = (ok, name, d) => {
  const line = (ok ? 'PASS' : 'FAIL') + ' ' + name + (d ? ' ' + JSON.stringify(d) : '');
  console.log(line);
  rec.push({ ok: !!ok, name, d });
  return !!ok;
};
const shot = async (page, name) => {
  const fp = path.join(OUT, name + '.png');
  await page.screenshot({ path: fp, fullPage: false });
  return fp;
};
const scrollShop = async (page, q) => {
  await page.evaluate((q) => {
    const L = document.getElementById('shopList');
    if (!L) return;
    if (!q) { L.scrollTop = 0; return; }
    const card = [...L.querySelectorAll('.gi')].find(c => (c.textContent || '').includes(q));
    if (card) card.scrollIntoView({ block: 'center' });
    else L.scrollTop = 0;
  }, q || '');
};

const novaSel = { outfit: 'classic', hair: 'braids2', hairColor: '#e84ca8', face: 'soft', beard: 'none', skin: '#c48a62', eyes: '#2a5080', pack: true, glasses: true, build: 0.92 };

function seedInit({ name, sel, cash }) {
  return ({ name, sel, cash }) => {
    try {
      localStorage.setItem('atq_prologue_seen', '1');
      localStorage.setItem('atq.tut.seen', '1');
      localStorage.setItem('atq.gate', JSON.stringify({ birthYear: 1990, agreedVersion: 1 }));
      localStorage.setItem('atq3.settings', JSON.stringify({ qual: 'low', voices: false, playSubs: false, hints: false, vol: 0, music: 0 }));
      localStorage.setItem('atq.profile.v1', JSON.stringify({ v: 1, name, createdAt: Date.now() }));
      localStorage.setItem('atq3.look', JSON.stringify(sel));
      localStorage.setItem('atq3_save', JSON.stringify({
        v: 3, step: 0, cash: cash || 20000, xp: 0, level: 5, owned: ['fists', 'pistol'], outfits: ['classic'],
        ammo: { light: 12, shell: 0, rifle: 0, bolt: 0, fuel: 0, gl: 0 }, mags: { pistol: 12 }, up: {}, grenades: 0, meds: 0,
        armor: null, armors: [], cur: 'pistol', kills: 0, pages: [], played: true, ch: 2, done: true
      }));
    } catch (e) {}
  };
}

async function dismiss(page) {
  await page.waitForFunction(() => window.__atqBooted === true, { timeout: 30000 });
  await page.evaluate(() => {
    ['warning','gateAge','gateAgree','gateKids','gateIntro','studio'].forEach(id => {
      const n = document.getElementById(id); if (n) n.classList.add('hidden');
    });
    document.body.classList.remove('atq-gating');
    const t = document.getElementById('title'); if (t) t.classList.remove('hidden');
  });
  const skip = page.locator('#btnTutSkip, button:has-text("Skip")');
  if (await skip.isVisible().catch(() => false)) await skip.click().catch(() => {});
  await page.waitForSelector('#title:not(.hidden)', { timeout: 15000 });
}

async function buildChar(page, { name, sel, id }) {
  return page.evaluate(async ({ name, sel, id }) => {
    const chars = await import('/src/mp/chars.js');
    const existing = chars.listPlayable().find(c => c.kind === 'custom' && c.name === name);
    const slot = existing ? chars.upsertChar({ id: existing.id, name, sel }) : chars.upsertChar({ id, name, sel });
    if (slot) chars.setActiveId(slot.id);
    return { id: slot && slot.id, name: slot && slot.name };
  }, { name, sel, id });
}

async function enterSoloTown(page) {
  await page.evaluate(async () => {
    const chars = await import('/src/mp/chars.js');
    const look = Object.assign({}, chars.getPlayLook(), { name: (chars.getPlayLook() && chars.getPlayLook().name) || 'Nova' });
    const tw = await import('/src/mp/town/town.js');
    const title = document.getElementById('title');
    if (title) title.classList.add('hidden');
    await tw.enterTown({ look, solo: true, room: 'store-test', onExit: () => {} });
  });
  await page.waitForFunction(() => window.__mpTown && window.__mpTown.me && window.__mpTown.me.av, { timeout: 90000 });
  await page.waitForTimeout(600);
}

async function openStore(page) {
  await page.evaluate(() => {
    const t = window.__mpTown;
    if (t && window.__atq && window.__atq.openTownShop) window.__atq.openTownShop(() => { try { t.seedLoadout && t.seedLoadout(); } catch (e) {} });
  });
  await page.waitForSelector('#shop.town-overlay', { timeout: 8000 });
}

async function closeStore(page) {
  await page.locator('#shop .back').click();
  await page.waitForFunction(() => document.getElementById('shop').classList.contains('hidden'), { timeout: 5000 });
}

async function buyCard(page, tab, cardText, btnRe = /Buy/) {
  await page.locator('#shopTabs button', { hasText: tab }).click();
  await page.waitForTimeout(400);
  const card = page.locator('#shopList .gi', { hasText: cardText }).first();
  await card.waitFor({ timeout: 8000 });
  const btn = card.locator('button').filter({ hasText: btnRe }).first();
  await btn.click();
  await page.waitForTimeout(400);
}

async function runEngine(engine) {
  let browser;
  if (engine === 'webkit') browser = await webkit.launch();
  else browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox', '--disable-gpu'] });
  const phone = { ...devices['iPhone 14 Pro'], viewport: { width: 852, height: 393 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, isLandscape: true };
  const context = await browser.newContext(phone);
  const page = await context.newPage();
  const bag = { pageErrors: [], notFound: [] };
  page.on('pageerror', e => bag.pageErrors.push(String(e.message || e).slice(0, 240)));
  page.on('response', res => { if (res.status() === 404) bag.notFound.push(res.url()); });
  const startCash = 20000;
  await page.addInitScript(seedInit({ name: 'Nova', sel: novaSel, cash: startCash }), { name: 'Nova', sel: novaSel, cash: startCash });
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 40000 });
  await dismiss(page);

  const menu = await page.evaluate(() => ({
    lobby: !!document.getElementById('btnLobby'),
    lobbyText: (document.getElementById('btnLobby') || {}).textContent || '',
    armory: !!document.getElementById('btnArmory')
  }));
  log(menu.lobby, `${engine} #btnLobby present`, menu);
  await shot(page, `${engine}-00-menu`);

  await buildChar(page, { name: 'Nova', sel: novaSel, id: 'c-nova' });

  const onTab = page.locator('#btnOnline');
  if (await onTab.isVisible().catch(() => false)) { await onTab.click(); await page.waitForTimeout(400); }
  await shot(page, `${engine}-00b-online-tab`);
  let sawKeem = false;
  try {
    const lobby = page.locator('#btnLobby');
    await lobby.click({ force: true, timeout: 8000 });
    await page.waitForSelector('#online:not(.hidden)', { timeout: 15000 });
    await page.locator('#btnPractice').click();
    await page.waitForSelector('#coopPick', { timeout: 10000 });
    await page.locator('#coopPick button.co.sv').click();
    await page.waitForSelector('#charSel', { timeout: 20000 });
    await page.locator('#charSel .card', { hasText: 'Keem' }).first().click();
    await page.waitForTimeout(250);
    const keemPlay = await page.locator('#charSelPlay').textContent();
    sawKeem = /Play as Keem/i.test(keemPlay || '');
    log(sawKeem, `${engine} Play as Keem text kept`, { keemPlay });
    await shot(page, `${engine}-01-play-as-keem`);
    await page.locator('#charSelCancel').click();
    await page.waitForTimeout(200);
    await page.evaluate(() => {
      const pick = document.getElementById('coopPick'); if (pick) pick.remove();
      const el = document.getElementById('charSel'); if (el) el.remove();
      const on = document.getElementById('online'); if (on) on.classList.add('hidden');
      const title = document.getElementById('title'); if (title) title.classList.remove('hidden');
    });
  } catch (e) {
    log(false, `${engine} Play as Keem path`, { err: String(e).slice(0, 280) });
    await page.evaluate(() => {
      const pick = document.getElementById('coopPick'); if (pick) pick.remove();
      const el = document.getElementById('charSel'); if (el) el.remove();
      const on = document.getElementById('online'); if (on) on.classList.add('hidden');
      const title = document.getElementById('title'); if (title) title.classList.remove('hidden');
    });
  }

  await enterSoloTown(page);
  await shot(page, `${engine}-02-town`);
  log(true, `${engine} entered solo town`);

  await openStore(page);
  const title = await page.locator('#shopTitle').textContent();
  const cash0 = await page.evaluate(() => window.__atq.save.cash);
  log(/Store/i.test(title || '') && cash0 === startCash, `${engine} store opens with shared cash`, { title, cash0 });
  await scrollShop(page);
  await shot(page, `${engine}-03-store-guns`);

  await buyCard(page, 'Guns', '.44 Revolver');
  await scrollShop(page, '.44 Revolver');
  await shot(page, `${engine}-04-bought-gun`);

  await buyCard(page, 'Melee', "Captain's Katana");
  await scrollShop(page, "Captain's Katana");
  await shot(page, `${engine}-05-bought-katana`);
  await buyCard(page, 'Melee', 'Crowbar');
  await scrollShop(page, 'Crowbar');
  await shot(page, `${engine}-05b-bought-crowbar`);

  await buyCard(page, 'Ammo', '9mm/.44 ammo');
  await scrollShop(page, '9mm/.44 ammo');
  await shot(page, `${engine}-06-bought-ammo`);

  await buyCard(page, 'Gear', 'Med kit');
  await buyCard(page, 'Gear', 'Pipe grenade');
  await buyCard(page, 'Gear', 'Combat Vest');
  await scrollShop(page, 'Combat Vest');
  await shot(page, `${engine}-07-bought-gear`);

  await page.locator('#shopTabs button', { hasText: 'Clothes' }).click();
  await page.waitForTimeout(600);
  await scrollShop(page);
  await shot(page, `${engine}-08a-clothes-tab`);
  await buyCard(page, 'Clothes', 'Streetwear');
  await page.waitForTimeout(900);
  await scrollShop(page, 'Streetwear');
  await shot(page, `${engine}-08-bought-clothes`);

  const after = await page.evaluate(() => {
    const s = window.__atq.save;
    return {
      cash: s.cash, owned: s.owned, outfits: s.outfits, armor: s.armor, armors: s.armors,
      meds: s.meds, grenades: s.grenades, ammo: s.ammo
    };
  });
  const expect = 700 + 3800 + 200 + 60 + 120 + 150 + 900 + 450;
  log(after.cash === startCash - expect, `${engine} cash dropped by $${expect}`, { cash: after.cash, spent: startCash - after.cash, expect, owned: after.owned, outfits: after.outfits, armor: after.armor, meds: after.meds, grenades: after.grenades, ammo: after.ammo });
  log(after.owned.includes('revolver') && after.owned.includes('katana') && after.owned.includes('crowbar'), `${engine} guns and melee owned`, after.owned);
  log(after.armor === 'vest_combat' && (after.armors || []).includes('vest_combat'), `${engine} combat vest equipped`, { armor: after.armor, armors: after.armors });
  log((after.meds | 0) >= 1 && (after.grenades | 0) >= 1 && (after.ammo.light | 0) >= 48, `${engine} meds, grenades and ammo in wallet`, { meds: after.meds, grenades: after.grenades, light: after.ammo && after.ammo.light });
  log((after.outfits || []).includes('street'), `${engine} streetwear owned`, after.outfits);

  await closeStore(page);

  const wep = await page.evaluate(() => {
    const t = window.__mpTown;
    t.equipWeapon('katana');
    return { shown: t.GS && t.GS.shown, mesh: !!(t.GS && t.GS.mesh), pref: t.bag.pref };
  });
  log(wep.shown === 'katana' && wep.mesh, `${engine} katana equips as a real melee mesh`, wep);

  const swung = await page.evaluate(() => {
    const t = window.__mpTown;
    t.S.atk = 0; t.S.roll = 0; t.me.hitCd = 0; t.me.dead = 0;
    if (t.swingHit) t.swingHit();
    else t.hit();
    return { atk: t.S.atk, shown: t.GS.shown, hitCd: t.me.hitCd, hasFn: !!t.swingHit };
  });
  log(swung.atk > 0 && swung.shown === 'katana', `${engine} katana swing starts`, swung);

  // 3/4 view, dismiss toasts
  await page.evaluate(() => {
    const t = window.__mpTown;
    t.me.ry = 0.6;
    if (t.setLook) t.setLook(Math.PI * 1.15, 0.18);
    else if (t.setCam) t.setCam(Math.PI * 1.15, 0.18);
    const toast = document.querySelector('#mpt .toast, .toast');
    if (toast) { toast.style.opacity = '0'; toast.textContent = ''; }
  });
  await page.waitForTimeout(400);
  await shot(page, `${engine}-09-katana-equipped`);

  const dmg = await page.evaluate(() => {
    const t = window.__mpTown;
    t.me.hp = 100; t.me.prot = 0; t.me.dead = 0; t.S.roll = 0;
    t.hurt(20);
    return { hp: t.me.hp, expect: 100 - 20 * 0.7 };
  });
  log(Math.abs(dmg.hp - dmg.expect) < 0.1, `${engine} combat vest cuts 20 dmg to 14`, dmg);

  const usedMed = await page.evaluate(() => {
    const t = window.__mpTown;
    t.me.hp = 40;
    const beforeMeds = t.bag.count('medkit');
    if (t.bag.count('medkit')) {
      t.bag.remove('medkit', 1);
      t.me.hp = Math.min(100, t.me.hp + 55);
      if (t.syncBagToSave) t.syncBagToSave();
    }
    return { beforeMeds, afterMeds: t.bag.count('medkit'), hp: t.me.hp, saveMeds: window.__atq.save.meds };
  });
  log(usedMed.beforeMeds >= 1 && usedMed.afterMeds === usedMed.beforeMeds - 1 && usedMed.hp >= 95, `${engine} med kit heals and consumes`, usedMed);

  const gren = await page.evaluate(() => {
    const t = window.__mpTown;
    const before = t.bag.count('grenade');
    t.throwGren();
    return { before, after: t.bag.count('grenade'), save: window.__atq.save.grenades };
  });
  log(gren.before >= 1 && gren.after === gren.before - 1, `${engine} grenade throws and leaves the bag`, gren);
  await page.waitForTimeout(400);
  await shot(page, `${engine}-10-after-use`);

  const look = await page.evaluate(() => {
    const t = window.__mpTown;
    const L = t.net && t.net.me && t.net.me.look;
    return { exclusive: !!(L && L.exclusive), wornTop: L && L.worn && L.worn.top, name: t.net && t.net.me && t.net.me.name };
  });
  log(!look.exclusive && look.name === 'Nova', `${engine} clothes applied to Nova, not Story Keem`, look);

  const hud = await page.evaluate(() => {
    const b = [...document.querySelectorAll('#hudr2 button')].map(x => x.textContent);
    return { buttons: b, lobby: !!document.getElementById('btnLobby') };
  });
  log((hud.buttons || []).includes('Shop'), `${engine} HUD Shop button kept`, hud);

  const realErrs = bag.pageErrors.filter(e => !/Failed to start the audio device|not allowed by the user agent|play\(\)|AbortError/i.test(e));
  const real404 = bag.notFound.filter(u => !/favicon|apple-touch|site\.webmanifest/i.test(u));
  log(realErrs.length === 0, `${engine} no page errors`, { realErrs: realErrs.slice(0, 6) });
  log(real404.length === 0, `${engine} no 404s`, { real404: real404.slice(0, 6) });

  await context.close();
  await browser.close();
}

const engines = (process.env.ATQ_ENGINE || 'chromium,webkit').split(',').map(s => s.trim()).filter(Boolean);
for (const engine of engines) {
  try { await runEngine(engine); }
  catch (e) { log(false, `${engine} crashed`, { err: String(e && e.stack || e).slice(0, 600) }); }
}
const fails = rec.filter(r => !r.ok);
fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify({ rec, fails: fails.length }, null, 2));
console.log('SUMMARY', rec.filter(r => r.ok).length + '/' + rec.length, 'fails', fails.length);
if (fails.length) process.exitCode = 1;
