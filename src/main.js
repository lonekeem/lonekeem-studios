import { initLayout } from './game/layout.js';
import { showLoading, hideLoading, setProgress } from './ui/loading.js';
import { AudioSys } from './audio.js';
import { initMenu, trackGame } from './ui/menu.js';
import { SURVIVAL_STEP, chOf, CH_START, CHAPTERS, LAST_CH, LAST_STORY_STEP, TOTAL_PAGES } from './game/story.js';
import { WEAPONS, WEAPON_ORDER, UPGRADES, upCost, AMMO_SHOP, PERKS, xpFor, defaultSave, loadSave, writeSave, clearSave, stat } from './game/data.js';
import { installBgListeners, onAppLeave, onAppReturn, leaveApp, returnApp, isAway } from './bgPause.js';
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const sleep = ms => new Promise(r => setTimeout(r, ms));
const DEF = { vol: 0.9, auto: true, music: 0.6, text: 1, subs: true, gore: true, lang: 'on', qteEasy: false, still: false, hints: true, qual: 'auto', sens: 1, fp: false, sfxVol: 1, voiceVol: 1, voices: true,
  ctl: 'twin', autoFire: false, assist: 0, stick: 'float', hand: 'right', btnScale: 1, btnOp: 1, invertY: false, padSens: 1, padDead: 0.15, btnLay: {}, hudv2: false, smoothMove: false, ctlRev: 0 };
const LS = (() => { try { const k = '__t'; localStorage.setItem(k, 1); localStorage.removeItem(k); return localStorage; } catch { const m = {}; return { getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, removeItem: k => { delete m[k]; } }; } })();
let _saved = {}; try { _saved = JSON.parse(LS.getItem('atq3.settings') || '{}') || {}; } catch {}
const S = Object.assign({}, DEF, _saved); const saveS = () => LS.setItem('atq3.settings', JSON.stringify(S));
// v1.9.10: controls go back to exactly how v1.9.7 played (classic HUD layout, stick, aim button, movement). One-time reset of every control setting saved by v1.9.8/v1.9.9; the new layout / smooth movement / schemes are opt-in under Settings -> Control scheme. Look sensitivity is kept.
if (S.ctlRev !== 2) { Object.assign(S, { ctl: 'twin', autoFire: false, assist: 0, stick: 'float', hand: 'right', btnScale: 1, btnOp: 1, invertY: false, padSens: 1, padDead: 0.15, btnLay: {}, hudv2: false, smoothMove: false, ctlRev: 2 }); try { saveS(); } catch (e) { } }
const audio = new AudioSys(S);
let save = loadSave(LS) || defaultSave(); let game = null, gamePromise = null; let state = 'boot', back = '#title';
window.__atq = { get audio() { return audio; }, get game() { return game; }, get state() { return state; }, get save() { return save; }, showLoading, hideLoading, setProgress,
  leaveApp, returnApp, isAway,
  reloadSave: () => { save = loadSave(LS) || save; if (state === 'title') toTitle(); } }; // profile cloud sync (src/mp/profile.js) calls this after loading a saved profile
try { audio.loadTracks(); } catch (e) { /* ignore */ }

function showScreen(id) { $$('.screen').forEach(s => s.classList.add('hidden')); if (id) $(id).classList.remove('hidden'); }
function fadeIn() { $('#fade').style.opacity = 0; }
const prologueSeen = () => LS.getItem('atq_prologue_seen') === '1';
async function playPrologueToMenu() {
  goLandscape(); showScreen(null); $('#stage').classList.remove('hidden'); state = 'loading';
  showLoading({ message: 'THE NIGHT BEFORE', title: 'Riverside' });
  import('./game/prologue.js').then(m => m.preloadPrologue(audio)).catch(() => {});
  try {
    const g = await ensureGame(); g.save = save; g.settings = S; audio.init(); hideLoading();
    $('#hud').classList.add('hidden'); $('#touch').classList.add('hidden');
    try { const m = await import('./game/prologue.js'); await Promise.race([m.preloadPrologue(audio), new Promise(r => setTimeout(r, 6000))]); } catch (e) {}
    g.onPrologueEnd = () => { g.cut = null; g._lk = null; g.holdSave = false; g.paused = true; toTitle(); };
    g.holdSave = true; g.wantPrologue = true; g.start(0); if (isAway()) pause();
  } catch (e) { console.error(e); hideLoading(); toTitle(); }
}

function toTitle() { state = 'title'; if (game) { game.paused = true; } $('#stage').classList.add('hidden'); $('#hud').classList.add('hidden'); $('#touch').classList.add('hidden'); try { audio.resumeAll(); } catch (e) {} audio.beat && audio.beat(0); audio.setMood('menu'); save = loadSave(LS) || save; { const sv = loadSave(LS), has = !!(sv && (sv.played || sv.step > 0)); const b = $('#btnContinue'); b.classList.toggle('hidden', !has); if (has) b.textContent = 'Continue · Chapter ' + chOf(sv.step || 0) + (CHN[chOf(sv.step || 0)] ? ' · ' + CHN[chOf(sv.step || 0)] : ''); } showScreen('#title'); back = '#title'; }

async function ensureGame() { if (game) return game; if (gamePromise) return gamePromise;
  const studioOn = $('#studio') && !$('#studio').classList.contains('hidden');
  if (!studioOn && (!$('#loading') || $('#loading').classList.contains('hidden'))) showLoading({ message: 'LOADING', title: 'Riverside' });
  gamePromise = (async () => { const { Game } = await import('./game/game.js'); const g = new Game({ settings: S, audio, LS, save }); { const NM = { keem: 'Keem', marcus: 'Dad', nia: 'Nia', npcf: 'Neighbor', npcm: 'Neighbor', walt: 'Mr. Walt', ruth: 'Ruth', gus: 'Big Gus' }; let bk = document.getElementById('bark'); if (!bk) { bk = document.createElement('div'); bk.id = 'bark'; bk.style.cssText = 'position:fixed;left:50%;bottom:22%;transform:translateX(-50%);max-width:80vw;padding:4px 10px;border-radius:8px;background:rgba(0,0,0,.55);color:#eee;font:14px Georgia,serif;pointer-events:none;opacity:0;transition:opacity .25s;z-index:30;text-align:center'; document.body.appendChild(bk); } let bt; audio.onBark = (who, t) => { if (!t || S.subs === false || (g.dlgCur)) return; bk.textContent = (NM[who] || who) + ': ' + t.replace(/\{([^|}]*)\|([^}]*)\}/g, (m, a, b) => S.lang === 'off' ? b : a); bk.style.opacity = 1; clearTimeout(bt); bt = setTimeout(() => bk.style.opacity = 0, 2600); }; }
    await g.load(p => setProgress(p));
    g.onDeath = () => { state = 'dead'; $('#deadMsg').textContent = g.survival ? 'Survived to wave ' + (g.stepData.wave || 0) + ' · Best: wave ' + (LS.getItem('atq3.survBest') || 0) : ['They got you.', 'Keem didn\'t make it.', 'Torn apart in Riverside.', 'Should\'ve rolled.'][(Math.random() * 4) | 0]; showScreen('#dead'); };
    g.onPause = () => { if (state === 'play') pause(); else if (state === 'paused') resume(); };
    g.onComplete = (ch = 1) => { const C = CHAPTERS, last = ch >= LAST_CH, nx = Math.min(LAST_CH, ch + 1); // chapter table comes from src/game/chapters (no hard-coded last chapter)
      save.done = true; if (ch >= 2) save.done2 = true; save.maxCh = Math.max(save.maxCh || 1, nx); save.ch = nx; save.step = last ? LAST_STORY_STEP : CH_START[nx]; writeSave(LS, save); state = 'ending'; g.paused = true; $('#endStats').innerHTML = `Kills: ${save.kills} · Level ${save.level} · Cash $${save.cash} · Comic pages ${save.pages.length}/${TOTAL_PAGES}`;
      $('#endH').textContent = 'End of Chapter ' + ch + ' · ' + C[ch].title; $('#endQ').textContent = C[ch].endQuote; $('#endNext').textContent = last ? (C[ch].nextTeaser || 'To be continued — Chapter ' + (ch + 1) + ' coming soon.') : 'Chapter ' + (ch + 1) + ' · ' + C[ch + 1].title + ' is unlocked. Your level, cash and weapons carry over.'; $('#btnEndNext').textContent = 'Continue to Chapter ' + nx; $('#btnEndNext').classList.toggle('hidden', last); showScreen('#ending'); audio.setMood('sad'); };
    try { trackGame(g, i => i === SURVIVAL_STEP); } catch (e) { console.warn('leaderboard tracking off', e); }
    game = g; hideLoading(); return g; })();
  return gamePromise; }
function goLandscape() { if (document.body.dataset.dev !== 'touch' || window.Capacitor?.isNativePlatform?.()) return; try { const d = document.documentElement, rq = d.requestFullscreen || d.webkitRequestFullscreen; const p = !document.fullscreenElement && rq ? rq.call(d, { navigationUI: 'hide' }) : null; Promise.resolve(p).then(() => screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape')).catch(() => {}); } catch (e) {} }
async function play(step, o = {}) { if (o.prologue) import('./game/prologue.js').then(m => m.preloadPrologue(audio)).catch(() => {}); goLandscape(); showScreen(null); $('#stage').classList.remove('hidden'); state = 'loading';
  if (step === SURVIVAL_STEP) showLoading({ message: 'SURVIVAL', title: 'Endless waves' });
  else { const ch = chOf(step || 0); showLoading({ ch, title: (CHAPTERS[ch] && CHAPTERS[ch].title) || 'Riverside' }); }
  const g = await ensureGame(); g.save = save; g.settings = S; state = 'play'; audio.init(); hideLoading(); $('#hud').classList.remove('hidden'); $('#touch').classList.toggle('hidden', !(matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window)); if (o.prologue) { g.wantPrologue = true; try { const m = await import('./game/prologue.js'); await Promise.race([m.preloadPrologue(audio), new Promise(r => setTimeout(r, 6000))]); } catch (e) { } } g.start(step); if (isAway()) pause(); }
function inGameplay() { if (state === 'play') return true; if (game && game.running && (game.pro || state === 'loading')) return true; return false; }
function fromPauseMenu() { return state === 'paused' || (['shop', 'inv', 'settings', 'custom'].includes(state) && back === '#pause'); }
function pause() {
  if (!game) return;
  if (state === 'paused' || fromPauseMenu()) { game.paused = true; return; }
  if (!inGameplay()) return;
  state = 'paused'; game.paused = true;
  if (document.pointerLockElement) document.exitPointerLock();
  try { writeSave(LS, save); } catch (e) {}
  showScreen('#pause'); back = '#pause';
}
function resume() { state = 'play'; showScreen(null); try { audio.resumeAll(); } catch (e) {} if (game) { game.paused = false; game.last = performance.now(); } }
addEventListener('keydown', e => { audio.init(); if ((e.key === 'Escape' || e.key === 'p' || e.key === 'P') && state !== 'play') { if (state === 'paused') resume(); else if (['shop', 'inv', 'settings'].includes(state) && back === '#pause') { state = 'paused'; showScreen('#pause'); } }
  if ((e.key === 'i' || e.key === 'I' || e.key === 'Tab') && state === 'play') { e.preventDefault(); pause(); openInv(); } });
addEventListener('pointerdown', () => audio.init());
// v1.5.1 tap-to-unlock: iOS only unlocks Web Audio from touchend/click, so resume (plus a 1-sample buffer) on each tap until 'running'. Respects the silent switch.
function unlockAudio() { if (audio._bgSuspended) return; try { audio.init(); const c = audio.ctx; if (!c || c.state === 'running') return; c.resume().catch(() => {}); const src = c.createBufferSource(); src.buffer = c.createBuffer(1, 1, 22050); src.connect(c.destination); src.start(0); } catch (e) {} }
['touchend', 'click', 'keydown'].forEach(ev => addEventListener(ev, unlockAudio, { capture: true, passive: true }));
// v1.9.31: pause + mute when the app is backgrounded (visibility, pagehide/blur, Capacitor pause).
const MENU_STATES = ['title', 'settings', 'credits', 'chapters', 'controls', 'boot', 'ending', 'dead'];
onAppLeave(() => {
  try { audio.suspendAll(); } catch (e) {}
  if (inGameplay()) pause();
  else if (fromPauseMenu() && game) game.paused = true;
});
onAppReturn(() => {
  if (game && game.paused) game.last = performance.now();
  const menu = MENU_STATES.includes(state) || (['shop', 'inv', 'custom', 'settings'].includes(state) && back !== '#pause');
  if (menu) {
    try { audio.resumeAll(); if (state === 'title' || state === 'settings' || state === 'credits' || state === 'chapters' || state === 'controls' || state === 'boot') audio.setMood('menu'); } catch (e) {}
  }
});
installBgListeners();

// ---------- shop ----------
let shopTab = 'guns';
function openShop() { state = 'shop'; renderShop(); showScreen('#shop'); }
function renderShop() { $('#shopCash').textContent = `Cash: $${save.cash}  ·  Level ${save.level}`;
  const tabs = [['guns', 'Guns'], ['melee', 'Melee'], ['up', 'Upgrades'], ['sup', 'Ammo & supplies']]; $('#shopTabs').innerHTML = ''; tabs.forEach(([k, n]) => { const b = document.createElement('button'); b.textContent = n; b.className = shopTab === k ? 'on' : ''; b.onclick = () => { shopTab = k; renderShop(); }; $('#shopTabs').appendChild(b); });
  const L = $('#shopList'); L.innerHTML = ''; const card = (html, btns, eq) => { const d = document.createElement('div'); d.className = 'gi' + (eq ? ' eq' : ''); d.innerHTML = html; btns.forEach(([t, fn, dis]) => { const b = document.createElement('button'); b.textContent = t; b.disabled = !!dis; b.onclick = () => { fn(); writeSave(LS, save); audio.pickup(); renderShop(); }; d.appendChild(b); }); L.appendChild(d); };
  const buy = (n) => { if (save.cash < n) return false; save.cash -= n; return true; };
  if (shopTab === 'guns' || shopTab === 'melee') WEAPON_ORDER.filter(id => (WEAPONS[id].type === 'gun') === (shopTab === 'guns') && id !== 'fists').forEach(id => { const w = WEAPONS[id], s = stat(save, id), own = save.owned.includes(id);
    const st = w.type === 'gun' ? `DMG ${Math.round(s.dmg)}${w.pellets ? '×' + w.pellets : ''} · MAG ${s.mag} · RLD ${s.reload.toFixed(1)}s · ${w.auto ? 'auto' : 'semi'}` : `DMG ${Math.round(s.dmg)} · ${w.sever ? 'can sever limbs' : 'blunt'}${w.bonk ? ' · BONK' : ''}`;
    const lockCh = w.ch && !(save.done || (save.ch || 1) >= w.ch); const btns = lockCh ? [['Chapter ' + w.ch + ' unlock', () => {}, true]] : own ? [[save.cur === id ? 'Equipped' : 'Equip', () => { save.cur = id; if (game && state !== 'title') game.equip(id, true); }, save.cur === id]] : [[w.price ? `Buy $${w.price}` : 'Story unlock', () => { if (buy(w.price)) { save.owned.push(id); if (w.type === 'gun') save.mags[id] = s.mag; } }, !w.price || save.cash < w.price]];
    card(`<b>${w.name}</b><div class="st">${st}</div><div class="small">${w.desc || ''}</div>`, btns, save.cur === id); });
  if (shopTab === 'up') { const owned = WEAPON_ORDER.filter(id => save.owned.includes(id) && id !== 'fists'); if (!owned.length) L.innerHTML = '<p class="small">Find or buy a weapon first.</p>';
    owned.forEach(id => { const w = WEAPONS[id]; const u = save.up[id] = save.up[id] || {}; const keys = w.type === 'gun' ? ['dmg', 'mag', 'rel', 'acc'] : ['dmg'];
      card(`<b>${w.name}</b><div class="st">${keys.map(k => `${UPGRADES[k].name} ${u[k] || 0}/${UPGRADES[k].max}`).join(' · ')}</div>`, keys.map(k => { const lv = u[k] || 0, c = upCost(id, k, lv); return [lv >= UPGRADES[k].max ? `${UPGRADES[k].name} MAX` : `${UPGRADES[k].name} $${c}`, () => { if (buy(c)) { u[k] = lv + 1; if (game) game.ws = stat(save, save.cur); } }, lv >= UPGRADES[k].max || save.cash < c]; })); }); }
  if (shopTab === 'sup') Object.entries(AMMO_SHOP).forEach(([k, a]) => { const have = k === 'grenade' ? save.grenades : k === 'med' ? save.meds : save.ammo[k] || 0;
    card(`<b>${a.name}</b><div class="st">You have: ${have}</div>`, [[`Buy $${a.price}`, () => { if (buy(a.price)) { if (k === 'grenade') save.grenades += a.n; else if (k === 'med') save.meds += a.n; else save.ammo[k] = (save.ammo[k] || 0) + a.n; } }, save.cash < a.price]]); }); }
// ---------- customizer ----------
// v1.9.28: story Keem always keeps his canon look. "My Character" opens the player PROFILE + character creator (src/mp/profileui.js):
// the player's own multiplayer survivor, paid for with the shared cash. Data lives behind src/mp/profile.js (getProfile / saveProfile).
async function openCustom(from) { back = from; state = 'profile';
  const { openProfileScreen } = await import('./mp/cloud.js'); await openProfileScreen('auto'); // same profile screen + Google cloud sync save = loadSave(LS) || save;
  if (from === '#pause') { state = 'paused'; showScreen('#pause'); } else if (from === '#shop') openShop(); else { state = 'title'; showScreen('#title'); } }
// ---------- inventory ----------
function openInv() { state = 'inv'; renderInv(); showScreen('#inv'); }
function renderInv() { const s = save; const need = xpFor(s.level);
  $('#invStats').innerHTML = `Level ${s.level} · XP ${s.xp}/${need} · Cash $${s.cash} · Kills ${s.kills} · Comic pages ${s.pages.length}/${TOTAL_PAGES}`;
  const L = $('#invList'); L.innerHTML = ''; const add = (h, btns = [], eq) => { const d = document.createElement('div'); d.className = 'gi' + (eq ? ' eq' : ''); d.innerHTML = h; btns.forEach(([t, fn]) => { const b = document.createElement('button'); b.textContent = t; b.onclick = () => { fn(); writeSave(LS, save); renderInv(); }; d.appendChild(b); }); L.appendChild(d); };
  WEAPON_ORDER.filter(id => s.owned.includes(id)).forEach(id => { const w = WEAPONS[id]; add(`<b>${w.name}</b><div class="st">${w.type === 'gun' ? `Mag ${s.mags[id] ?? 0} · Reserve ${s.ammo[w.ammo] || 0} ${w.ammo}` : 'Melee'}</div>`, s.cur === id ? [] : [['Equip', () => { s.cur = id; if (game) game.equip(id, true); }]], s.cur === id); });
  add(`<b>Supplies</b><div class="st">Med kits ${s.meds} · Pipe grenades ${s.grenades}<br>9mm/.44 ${s.ammo.light || 0} · Shells ${s.ammo.shell || 0} · Rifle ${s.ammo.rifle || 0}</div>`, s.meds && game && back === '#pause' ? [['Use med kit (+50 HP)', () => game.heal()]] : []);
  add(`<b>Gear</b><div class="st">${s.items.includes('backpack') ? 'Backpack ✔' : 'No backpack yet'}</div>`);
  add(`<b>Perks</b><div class="st">${PERKS.map((p, i) => p ? `${s.level >= i ? '✔' : '🔒'} Lv${i} ${p.name}: ${p.desc}` : '').filter(Boolean).join('<br>')}</div>`);
  add(`<b>Collectibles</b><div class="st">${s.pages.length ? s.pages.length + ' Captain Riverside comic pages found' : 'Find the ' + TOTAL_PAGES + ' Captain Riverside comic pages hidden around the story.'}</div>`); }

// ---------- buttons ----------
$$('.back').forEach(b => b.onclick = () => { if (state === 'custom' && back === '#shop') { openShop(); return; } if (back === '#pause') { state = 'paused'; showScreen('#pause'); return; } state = 'title'; showScreen('#title'); });
$('#btnWarn').onclick = async () => {
  try { audio.init(); audio.unlock && audio.unlock(); } catch (e) {}
  showScreen(null); const st = $('#studio'); st.classList.remove('hidden'); fadeIn();
  const tracks = audio.loadTracks().then(() => { try { audio.playSting(); } catch (e) {} });
  let done = false;
  const finish = () => { if (done) return; done = true; st.classList.add('hidden'); if (!prologueSeen()) playPrologueToMenu(); else toTitle(); };
  const onSkip = () => finish();
  st.addEventListener('pointerdown', onSkip, { once: true });
  addEventListener('keydown', onSkip, { once: true });
  let left = 7000, then = performance.now();
  const studioTick = () => { if (done) return; const now = performance.now(); if (!isAway()) left -= now - then; then = now; if (left <= 0) finish(); else requestAnimationFrame(studioTick); };
  requestAnimationFrame(studioTick);
  ensureGame().catch(e => console.error(e));
  hideLoading(); // preload quietly behind the intro
  await tracks.catch(() => {});
};
$('#btnNew').onclick = () => { if (loadSave(LS) && loadSave(LS).step > 0 && !confirm('Start a new game? Your current progress (level, cash, weapons) will be reset.')) return; clearSave(LS); save = defaultSave(); writeSave(LS, save); play(0); };
$('#btnWatchIntro').onclick = () => playPrologueToMenu();
$('#btnEndNext').onclick = () => { save = loadSave(LS) || save; const nc = Math.min(LAST_CH, Math.max(2, save.ch || 2)); if (chOf(save.step || 0) !== nc) save.step = CH_START[nc]; writeSave(LS, save); play(save.step); };
var CHN = CHAPTERS.map(c => (c ? c.title : '')), CHS = CHAPTERS.map(c => (c ? c.start : 0)); // derived from the chapter registry
const unlockedCh = (s) => Math.max(s.maxCh || 1, s.done || (s.step || 0) >= 7 ? 2 : 1, s.done2 ? 3 : 1, CHS.findLastIndex(v => (s.step || 0) >= v) || 1);
// chapter-select buttons are generated from the registry (src/game/chapters), so adding a chapter needs no HTML/menu edits
{ const ft = $('#foot'); if (ft) ft.textContent = 'v1.9.30 · Story Mode · Chapters 1–' + LAST_CH + ' · ' + CHAPTERS[LAST_CH].title + ' · Multiplayer (Beta)'; }
const chList = $('#chList'); for (let c = 1; c <= LAST_CH; c++) { const b = document.createElement('button'); b.id = 'btnCh' + c; b.textContent = 'Chapter ' + c + ' · ' + CHN[c]; chList.appendChild(b); }
$('#btnChapters').onclick = () => { const s = loadSave(LS) || defaultSave(); const u = unlockedCh(s); for (let c = 2; c <= LAST_CH; c++) { const b = $('#btnCh' + c); b.disabled = c > u; b.textContent = 'Chapter ' + c + ' · ' + CHN[c] + (c > u ? ' (finish Chapter ' + (c - 1) + ')' : ''); } showScreen('#chapters'); };
$('#btnCh1').onclick = () => { save = loadSave(LS) || defaultSave(); writeSave(LS, save); play(0); };
for (let c = 2; c <= LAST_CH; c++) $('#btnCh' + c).onclick = () => { save = loadSave(LS) || defaultSave(); save.ch = c; writeSave(LS, save); play(CHS[c]); };
$('#btnSurvival').onclick = () => { save = loadSave(LS) || defaultSave(); writeSave(LS, save); play(SURVIVAL_STEP); };
$('#btnContinue').onclick = () => { save = loadSave(LS) || defaultSave(); play(save.step || 0); };
$('#btnCustom').textContent = 'My Character'; $('#btnCustom').onclick = () => openCustom('#title'); $('#btnShopCustom').onclick = () => openCustom(back === '#pause' ? '#pause' : '#shop');
$('#btnArmory').onclick = () => { back = '#title'; openShop(); }; $('#btnInvT').onclick = () => { back = '#title'; openInv(); };
$('#btnPShop').onclick = () => { back = '#pause'; openShop(); }; $('#btnPInv').onclick = () => { back = '#pause'; openInv(); };
$('#btnSettings').onclick = () => { back = '#title'; state = 'settings'; showScreen('#settings'); }; $('#btnControls').onclick = () => showScreen('#controls'); $('#btnCredits').onclick = () => showScreen('#credits');
$('#btnPauseSettings').onclick = () => { back = '#pause'; state = 'settings'; showScreen('#settings'); };
$('#btnResume').onclick = resume; $('#btnPause').onclick = e => { e.stopPropagation(); pause(); };
$('#skipObj').onclick = () => game && game.skipObjective();
$('#btnRestartCp').onclick = () => { resume(); game.restartCheckpoint(); };
$('#btnQuit').onclick = () => { writeSave(LS, save); toTitle(); };
$('#btnRetry').onclick = () => { showScreen(null); state = 'play'; save = loadSave(LS) || save; game.save = save; game.paused = false; game.last = performance.now(); if (!game.survival) game.step = save.step; game.restartCheckpoint(); };
$('#btnDeadQuit').onclick = toTitle; $('#btnEndTitle').onclick = toTitle;
// ---------- settings ----------
const bindS = (id, k, kind) => { const el = $(id); if (!el) return; if (kind === 'chk') { el.checked = !!S[k]; el.onchange = () => { S[k] = el.checked; saveS(); applyS(k); }; } else if (kind === 'sel') { el.value = S[k]; el.onchange = () => { S[k] = el.value; saveS(); applyS(k); }; } else { el.value = S[k]; el.oninput = () => { S[k] = +el.value; saveS(); applyS(k); }; } };
function applyCtl() { try { layoutApi && layoutApi.refresh(); } catch (e) { } const b = document.body; b.classList.toggle('lefty', S.hand === 'left'); b.classList.toggle('simple', S.ctl === 'simple'); b.classList.toggle('hudv2', !!S.hudv2); { const u = document.getElementById('tUse'), a = document.getElementById('tAim'); if (u) u.textContent = S.hudv2 ? 'USE' : '✋'; if (a) a.textContent = S.hudv2 ? 'AIM' : '⌖'; } b.style.setProperty('--tbs', S.btnScale || 1); b.style.setProperty('--tbo', S.btnOp ?? 1); }
function applyS(k) { applyCtl(); audio.applyVolumes(); document.body.classList.toggle('still', S.still); if (game && k === 'fp') game.cam.fp = S.fp; if (k === 'qual' && game) game.toast?.('Quality change applies after reloading the app', 2.5); }
bindS('#sVol', 'vol'); bindS('#sMusic', 'music'); bindS('#sSfx', 'sfxVol'); bindS('#sVoiceVol', 'voiceVol'); bindS('#sVoices', 'voices', 'chk'); bindS('#sText', 'text'); bindS('#sAuto', 'auto', 'chk'); bindS('#sGore', 'gore', 'chk'); bindS('#sQte', 'qteEasy', 'chk'); bindS('#sMotion', 'still', 'chk'); bindS('#sHints', 'hints', 'chk');
bindS('#sQual', 'qual', 'sel'); bindS('#sLang', 'lang', 'sel'); bindS('#sSens', 'sens'); bindS('#sFP', 'fp', 'chk'); applyS();
// control settings screen (scheme, joystick, layout, sensitivity)
const CTL_BINDS = () => { bindS('#cCtl', 'ctl', 'sel'); bindS('#cAuto', 'autoFire', 'chk'); bindS('#cAssist', 'assist'); bindS('#cStick', 'stick', 'sel'); bindS('#cHand', 'hand', 'sel'); bindS('#cBtn', 'btnScale'); bindS('#cOp', 'btnOp'); bindS('#cSens', 'sens'); bindS('#cPad', 'padSens'); bindS('#cDead', 'padDead'); bindS('#cInv', 'invertY', 'chk'); bindS('#cHud', 'hudv2', 'chk'); bindS('#cSmooth', 'smoothMove', 'chk'); };
CTL_BINDS();
$('#cCtl').addEventListener('change', () => { if (S.ctl === 'simple') { S.autoFire = true; S.assist = Math.max(S.assist || 0, 0.8); } else { S.autoFire = false; S.assist = 0; } saveS(); CTL_BINDS(); applyCtl(); });
const padName = () => { const p = navigator.getGamepads ? [...navigator.getGamepads()].find(q => q && q.connected) : null; $('#cPadState').textContent = (p ? 'Controller connected: ' + p.id.slice(0, 48) + '. ' : 'No controller detected (plug in / pair one and press a button). ') + 'Keyboard + mouse: WASD, mouse (click to lock), left click fire, right click aim.'; };
addEventListener('gamepadconnected', padName); addEventListener('gamepaddisconnected', padName);
const layoutApi = initLayout(S, saveS, () => showScreen('#ctlset'));
$('#btnLayEdit').onclick = () => { if (!S.hudv2) { S.hudv2 = true; saveS(); applyCtl(); } showScreen(null); layoutApi.open(); };
$('#btnCtlSet').onclick = () => { CTL_BINDS(); padName(); showScreen('#ctlset'); };
$('#btnCtlRef').onclick = () => { showScreen('#controls'); back = back; };
$('#btnCtlReset').onclick = () => { Object.assign(S, { ctl: 'twin', autoFire: false, assist: 0, stick: 'float', hand: 'right', btnScale: 1, btnOp: 1, invertY: false, padSens: 1, padDead: 0.15, sens: 1, btnLay: {}, hudv2: false, smoothMove: false }); saveS(); CTL_BINDS(); applyCtl(); };
$$('.back2').forEach(b => b.onclick = () => { $('#sSens').value = S.sens; showScreen('#settings'); });

// boot
document.body.dataset.dev = 'ontouchstart' in window ? 'touch' : 'kbd'; fadeIn();
const qs = new URLSearchParams(location.search);
if (qs.has('prologue')) { $('#warning').classList.add('hidden'); save = defaultSave(); play(0, { prologue: true }); }
else if (qs.has('step')) { $('#warning').classList.add('hidden'); save = defaultSave(); if (qs.has('god')) Object.assign(save, { owned: ['fists', 'bat', 'pistol', 'rifle', 'shotgun'], items: ['backpack'], ammo: { light: 99, shell: 30, rifle: 200 }, grenades: 3, cash: 2000, cur: 'rifle' }); play(+qs.get('step')); }
initMenu();
window.__atqBooted = true;
// (title background image removed in v1.3.1)

// Multiplayer (Beta): separate module, adds one title-menu button (see docs/multiplayer.md)
import('./mp/entry.js').then(m => m.install()).catch(e => console.warn('mp entry failed', e));
Promise.all([import('./mp/storeLook.js'), import('./game/looks.js')]).then(([SL, LK]) => SL.migrateOnce(LK.OUTFIT)).catch(() => {}); // v1.9.28: old Customize Keem look -> multiplayer character (once)
