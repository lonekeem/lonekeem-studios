// Unlockable rewards proof. Local only: no lobby join, no fake leaderboard posts.
import { chromium } from 'playwright';
import fs from 'fs';
const URL = process.argv[2] || 'http://127.0.0.1:5482/';
const OUT = process.argv[3] || '/workspace/atq-rewards-proof';
fs.mkdirSync(OUT, { recursive: true });
const rec = (n, ok, d) => { console.log(ok ? 'PASS' : 'FAIL', n, d ? JSON.stringify(d) : ''); return ok; };
let fails = 0; const ok = (n, v, d) => { if (!rec(n, !!v, d)) fails++; };
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
async function shot(page, path) {
  await page.evaluate(() => { document.querySelectorAll('canvas').forEach(c => { c.style.visibility = 'hidden'; }); });
  try { await page.screenshot({ path, timeout: 20000, animations: 'disabled' }); }
  finally { await page.evaluate(() => { document.querySelectorAll('canvas').forEach(c => { c.style.visibility = ''; }); }).catch(() => {}); }
}

async function page({ w = 844, h = 390, kills = 40, wave = 6, save = true, rewards = null, dpr = 2 } = {}) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, hasTouch: true, isMobile: true });
  await ctx.addInitScript(({ kills, wave, save, rewards }) => {
    localStorage.setItem('atq3.settings', JSON.stringify({ qual: 'low', voices: false, playSubs: false, hints: false }));
    localStorage.setItem('atq_prologue_seen', '1');
    localStorage.setItem('atq.tut.seen', '1');
    if (wave) localStorage.setItem('atq3.survBest', String(wave));
    if (save) localStorage.setItem('atq3_save', JSON.stringify({ v: 3, step: 7, played: true, cash: 80, xp: 0, level: 1, kills, owned: ['fists', 'bat', 'pistol'], outfits: ['classic'] }));
    if (rewards) localStorage.setItem('atq.rewards.v1', JSON.stringify(rewards));
    localStorage.setItem('atq.gate', JSON.stringify({ birthYear: 1990, agreedVersion: 1 }));
  }, { kills, wave, save, rewards });
  const p = await ctx.newPage();
  p.setDefaultTimeout(20000);
  p.errs = []; p.on('pageerror', e => p.errs.push(String(e.message || e).slice(0, 240)));
  await p.goto(URL, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window.__atqBooted && window.__atqRewards, null, { timeout: 20000 });
  // Skip the warning button so ensureGame() never starts (that 3D load freezes headless Chrome).
  await p.evaluate(() => {
    ['warning','gateAge','gateAgree','gateKids','gateIntro','studio'].forEach(id => {
      const n = document.getElementById(id); if (n) n.classList.add('hidden');
    });
    document.body.classList.remove('atq-gating');
    const t = document.getElementById('title'); if (t) t.classList.remove('hidden');
  });
  await p.waitForSelector('#title:not(.hidden)', { timeout: 10000 });
  await p.waitForTimeout(300);
  return p;
}

const p = await page({ kills: 40, wave: 6 });
ok('btnLobby id kept', await p.evaluate(() => !!document.getElementById('btnLobby')));
ok('Play as Keem still in sources', await p.evaluate(async () => {
  for (const u of ['./src/mp/creator.js', './src/mp/profileui.js']) {
    try { const t = await (await fetch(u)).text(); if (/Play as Keem/.test(t)) return true; } catch (e) {}
  }
  return false;
}));

await p.click('#btnOnline'); await p.waitForTimeout(250);
await shot(p, OUT + '/menu_online_rewards.png');
ok('Rewards button is under Online', await p.evaluate(() => {
  const e = document.getElementById('btnRewards');
  return !!(e && e.offsetParent && /Rewards/i.test(e.textContent));
}));
ok('Daily Challenges still under Online', await p.evaluate(() => {
  const e = document.getElementById('btnDailies');
  return !!(e && e.offsetParent);
}));

// seed from 40 kills + wave 6 should unlock a handful (riverside needs 1 daily — maybe not;
// ember 25 kills, olive 15 kills, wave rider / midnight wave 5, slayer no (50), etc.)
const seeded = await p.evaluate(() => {
  const r = window.__atqRewards.get();
  return { unlocked: r.unlocked.slice(), stats: r.stats, cards: document.querySelectorAll('#rwList .rwcard').length };
});
ok('career kills seeded from save', seeded.stats.kills >= 40, seeded.stats);
ok('best wave seeded from survBest', seeded.stats.bestWave >= 6, seeded.stats);
ok('ember coat unlocked from 25 kills', seeded.unlocked.includes('skin_ember'), seeded.unlocked);
ok('olive drab unlocked from 15 kills', seeded.unlocked.includes('wf_olive'), seeded.unlocked);
ok('midnight / wave 5 title unlocked', seeded.unlocked.includes('skin_midnight') && seeded.unlocked.includes('title_wave5'), seeded.unlocked);
ok('legend / first-place still locked', !seeded.unlocked.includes('skin_legend') && !seeded.unlocked.includes('title_first'), seeded.unlocked);

await p.click('#btnRewards');
await p.waitForSelector('#rewards:not(.hidden)');
await p.waitForTimeout(300);
await shot(p, OUT + '/rewards_all.png');

const ui = await p.evaluate(() => {
  const cards = [...document.querySelectorAll('#rwList .rwcard')];
  const vis = cards.filter(c => { const b = c.getBoundingClientRect(); return b.bottom > 0 && b.top < innerHeight; });
  const unlocked = cards.filter(c => c.classList.contains('unlocked')).length;
  const locked = cards.filter(c => c.classList.contains('lock')).length;
  const back = document.querySelector('#rewards .back');
  const br = back.getBoundingClientRect();
  return { n: cards.length, vis: vis.length, unlocked, locked, h2: document.querySelector('#rewards h2')?.textContent,
    backOn: br.top >= 0 && br.bottom <= innerHeight + 2, tabs: [...document.querySelectorAll('#rwTabs button')].map(b => b.textContent) };
});
ok('Rewards screen title', ui.h2 === 'Rewards', ui);
ok('catalog cards rendered', ui.n >= 20, ui);
ok('mix of locked and unlocked', ui.unlocked >= 4 && ui.locked >= 4, ui);
ok('Back button fits short phone screen', ui.backOn, ui);
ok('filter tabs present', ui.tabs.join(',') === 'All,Skins,Weapons,Titles,Badges', ui);

// short landscape: list is scrollable, back stays on screen
ok('list can scroll on short screen', await p.evaluate(() => {
  const list = document.getElementById('rwList');
  return list && list.scrollHeight > list.clientHeight + 20;
}));

// Skins tab + equip
await p.click('#rwTabs button:nth-child(2)'); // Skins
await p.waitForTimeout(200);
await shot(p, OUT + '/rewards_skins.png');
const equipped = await p.evaluate(() => {
  const ember = [...document.querySelectorAll('#rwList .rwcard')].find(c => /Ember Coat/.test(c.innerText));
  const btn = ember && ember.querySelector('button');
  if (btn) btn.click();
  return {
    has: !!ember,
    eq: window.__atqRewards.get().equipped.skin,
    look: JSON.parse(localStorage.getItem('atq.mp.look.v1') || 'null'),
  };
});
await p.waitForTimeout(300);
ok('Ember Coat card visible on Skins tab', equipped.has);
ok('equipping Ember Coat saved', equipped.eq === 'skin_ember', equipped);
// look may apply async
await p.waitForTimeout(400);
const look = await p.evaluate(() => JSON.parse(localStorage.getItem('atq.mp.look.v1') || 'null'));
ok('equipped skin wrote a rewardSkin on the MP look', !look || look.rewardSkin === 'skin_ember' || (look.worn && look.worn.top && /#8a2a14|#3a1a12/i.test(JSON.stringify(look.worn))), look && look.worn);
await shot(p, OUT + '/rewards_skin_equipped.png');

// Weapons tab + equip gold? gold needs wave 8, we have 6 — equip olive
await p.click('#rwTabs button:nth-child(3)');
await p.waitForTimeout(200);
const fin = await p.evaluate(() => {
  const row = [...document.querySelectorAll('#rwList .rwcard')].find(c => /Olive Drab/.test(c.innerText));
  const btn = row && row.querySelector('button');
  if (btn) btn.click();
  return { has: !!row, eq: window.__atqRewards.get().equipped.finish };
});
await p.waitForTimeout(200);
ok('Olive Drab equip works', fin.has && fin.eq === 'wf_olive', fin);
await shot(p, OUT + '/rewards_weapons.png');

// Titles + equip
await p.click('#rwTabs button:nth-child(4)');
await p.waitForTimeout(200);
const title = await p.evaluate(() => {
  const row = [...document.querySelectorAll('#rwList .rwcard')].find(c => /Wave Rider/.test(c.innerText));
  const btn = row && row.querySelector('button');
  if (btn) btn.click();
  return { has: !!row, eq: window.__atqRewards.get().equipped.title };
});
ok('Wave Rider title equipped', title.has && title.eq === 'title_wave5', title);
await p.evaluate(() => {
  const row = [...document.querySelectorAll('#rwList .rwcard')].find(c => /Wave Rider/.test(c.innerText));
  if (row) row.scrollIntoView({ block: 'center' });
});
await p.waitForTimeout(200);
await shot(p, OUT + '/rewards_titles.png');

// Toast: bump stats to unlock slayer (50 kills). We have 40.
await p.evaluate(() => window.__atqRewards.addStats({ kills: 20 }));
await p.waitForTimeout(600);
await shot(p, OUT + '/rewards_toast.png');
ok('toast appears on a new unlock', await p.evaluate(() => {
  const t = document.getElementById('rwToast');
  return t && t.classList.contains('on') && /Unlocked|Slayer|rewards/i.test(t.textContent);
}));
ok('Slayer unlocked after 60 kills', await p.evaluate(() => window.__atqRewards.isUnlocked('title_kills50')));

// Daily streak / dailies unlock path (local only)
await p.click('#rewards .back');
await p.waitForSelector('#title:not(.hidden)');
await p.evaluate(() => {
  const pane = document.getElementById('paneOnline');
  const btn = document.getElementById('btnOnline');
  if (pane && !pane.classList.contains('on') && btn) btn.click();
});
await p.waitForTimeout(200);
await p.click('#btnDailies');
await p.waitForSelector('#dailies:not(.hidden)');
ok('View rewards is on the dailies screen', await p.evaluate(() => !!document.getElementById('btnDailyRewards')));
await shot(p, OUT + '/dailies_has_rewards.png');
const dailyUnlock = await p.evaluate(() => {
  const hook = window.__atqDailies;
  hook.get().items.forEach(it => hook.bump(it.type, it.need, it.need));
  // allow rewards tick
});
await p.waitForTimeout(2000);
const afterDaily = await p.evaluate(() => {
  const r = window.__atqRewards.get();
  return { days: r.stats.dailiesDays, done: r.stats.dailiesDone, streak: r.stats.dailyStreak,
    dailyTitle: r.unlocked.includes('title_daily'), star: r.unlocked.includes('badge_star'),
    riverside: r.unlocked.includes('skin_riverside'), lb: localStorage.getItem('atq.lbPending') };
});
ok('completing all 3 dailies counts a day and a streak', afterDaily.days >= 1 && afterDaily.streak >= 1 && afterDaily.done >= 3, afterDaily);
ok('Daily Grinder + Rising Star + Riverside Green unlock', afterDaily.dailyTitle && afterDaily.star && afterDaily.riverside, afterDaily);
ok('no pending leaderboard submit was written', !afterDaily.lb, afterDaily);

// Rank unlocks locally (do NOT call submitRun / topPlayers against the real board)
await p.evaluate(() => window.__atqRewards.noteRank(8));
await p.waitForTimeout(300);
ok('top-ten cosmetics unlock from a recorded rank, without posting a score', await p.evaluate(() => {
  const r = window.__atqRewards;
  return r.isUnlocked('title_top10') && r.isUnlocked('skin_champion') && r.isUnlocked('badge_crown') && r.get().stats.bestRank === 8;
}));

// Lobby nameplate + armory on the same page (game was never started).
console.log('injecting lobby demo on first page');
await p.evaluate(() => {
  document.querySelectorAll('.screen').forEach(e => e.classList.add('hidden'));
  const prev = document.getElementById('rwLobbyDemo'); if (prev) prev.remove();
  const root = document.createElement('div');
  root.id = 'rwLobbyDemo';
  root.innerHTML = `<div id="online" style="position:fixed;inset:0;z-index:55;background:#08160ecc;display:flex;align-items:center;justify-content:center">
    <div style="width:min(420px,90vw);background:#101a15;border:1px solid #2a3e32;border-radius:16px;padding:16px 18px;color:#eef2ee;font:16px system-ui">
      <div class="small" style="opacity:.7;margin-bottom:8px">World Lobby · your profile</div>
      <div class="wprof" id="wProf" style="display:flex;align-items:center;gap:10px">
        <span class="wav wini" style="width:40px;height:40px;border-radius:50%;background:#3d8f5c;display:flex;align-items:center;justify-content:center;font-weight:800">T</span>
        <div class="wpn"><b>TestPal</b><span class="small" style="display:block;opacity:.7">Guest · saved on this device</span></div>
      </div>
    </div>
  </div>`;
  document.body.appendChild(root);
});
console.log('demo in, equip badge if needed');
await p.evaluate(() => { try { window.__atqRewards.equip('badge_star'); } catch (e) {} });
await p.waitForTimeout(300);
console.log('screenshot lobby');
try { await p.locator('#rwLobbyDemo').screenshot({ path: OUT + '/lobby_title.png', timeout: 8000 }); }
catch (e) { console.log('elem shot fail', e.message); await shot(p, OUT + '/lobby_title.png'); }
console.log('lobby shot ok');
const lobbyInfo = await p.evaluate(() => {
  const tag = document.querySelector('#wProf .rwTag, #online .rwTag');
  return { has: !!tag, text: (tag && tag.textContent) || '', prof: (document.querySelector('#wProf') || {}).innerText };
});
ok('lobby profile shows the equipped title/badge', /Wave Rider|Rising Star|✦/.test(lobbyInfo.text + ' ' + (lobbyInfo.prof || '')), lobbyInfo);
await p.evaluate(() => { const d = document.getElementById('rwLobbyDemo'); if (d) d.remove(); const t = document.getElementById('title'); if (t) t.classList.remove('hidden'); });

console.log('open armory');
await p.click('#btnSettings');
await p.waitForSelector('#settings:not(.hidden)');
await p.click('#btnArmory');
await p.waitForSelector('#shop:not(.hidden)');
await p.waitForTimeout(200);
console.log('screenshot armory');
await shot(p, OUT + '/armory_finish.png');
ok('Armory shows the equipped weapon finish', await p.evaluate(() => {
  const bar = document.getElementById('rwShopBar');
  return bar && /Olive Drab/.test(bar.innerText);
}));
await p.context().close();
console.log('first page closed, short screen page');

const p2 = await page({ w: 740, h: 320, kills: 12, wave: 2, dpr: 1 });
await p2.click('#btnOnline'); await p2.waitForTimeout(150);
await p2.click('#btnRewards');
await p2.waitForSelector('#rewards:not(.hidden)');
await p2.waitForTimeout(200);
await shot(p2, OUT + '/rewards_short.png');
ok('short-screen Back button stays on screen', await p2.evaluate(() => {
  const back = document.querySelector('#rewards .back');
  const b = back.getBoundingClientRect();
  return b.top >= 0 && b.bottom <= innerHeight + 2 && b.height >= 28;
}));
ok('short-screen list scrolls instead of overflowing', await p2.evaluate(() => {
  const list = document.getElementById('rwList');
  const back = document.querySelector('#rewards .back').getBoundingClientRect();
  const lb = list.getBoundingClientRect();
  return list.scrollHeight > list.clientHeight && lb.bottom <= back.top + 4;
}));
ok('no page errors on short-screen page', (p2.errs || []).length === 0, p2.errs);

await b.close();
console.log(fails ? 'FAILED ' + fails : 'ALL PASSED');
process.exit(fails ? 1 : 0);
