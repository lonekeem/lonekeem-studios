import { initLayout } from './game/layout.js';
import { showLoading, hideLoading, setProgress } from './ui/loading.js';
import { AudioSys } from './audio.js';
import { SURVIVAL_STEP, chOf, CH_START, CHAPTERS, LAST_CH, LAST_STORY_STEP, TOTAL_PAGES } from './game/story.js';
import { WEAPONS, WEAPON_ORDER, UPGRADES, upCost, AMMO_SHOP, PERKS, xpFor, defaultSave, loadSave, writeSave, clearSave, stat } from './game/data.js';
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
window.__atq = { get audio() { return audio; }, get game() { return game; }, get state() { return state; }, get save() { return save; }, showLoading, hideLoading, setProgress };
try { audio.loadTracks(); } catch (e) { /* ignore */ }

function showScreen(id) { $$('.screen').forEach(s => s.classList.add('hidden')); if (id) $(id).classList.remove('hidden'); }
function fadeIn() { $('#fade').style.opacity = 0; }
function toTitle() { state = 'title'; if (game) { game.paused = true; } $('#stage').classList.add('hidden'); $('#hud').classList.add('hidden'); $('#touch').classList.add('hidden'); audio.beat && audio.beat(0); audio.setMood('menu'); save = loadSave(LS) || save; { const sv = loadSave(LS), has = !!(sv && (sv.played || sv.step > 0)); const b = $('#btnContinue'); b.classList.toggle('hidden', !has); if (has) b.textContent = 'Continue · Chapter ' + chOf(sv.step || 0) + (CHN[chOf(sv.step || 0)] ? ' · ' + CHN[chOf(sv.step || 0)] : ''); } showScreen('#title'); back = '#title'; }

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
    game = g; hideLoading(); return g; })();
  return gamePromise; }
function goLandscape() { if (document.body.dataset.dev !== 'touch' || window.Capacitor?.isNativePlatform?.()) return; try { const d = document.documentElement, rq = d.requestFullscreen || d.webkitRequestFullscreen; const p = !document.fullscreenElement && rq ? rq.call(d, { navigationUI: 'hide' }) : null; Promise.resolve(p).then(() => screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape')).catch(() => {}); } catch (e) {} }
async function play(step) { goLandscape(); showScreen(null); $('#stage').classList.remove('hidden'); state = 'loading';
  if (step === SURVIVAL_STEP) showLoading({ message: 'SURVIVAL', title: 'Endless waves' });
  else { const ch = chOf(step || 0); showLoading({ ch, title: (CHAPTERS[ch] && CHAPTERS[ch].title) || 'Riverside' }); }
  const g = await ensureGame(); g.save = save; g.settings = S; state = 'play'; audio.init(); hideLoading(); $('#hud').classList.remove('hidden'); $('#touch').classList.toggle('hidden', !(matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window)); g.start(step); }
function pause() { if (state !== 'play' || !game) return; state = 'paused'; game.paused = true; if (document.pointerLockElement) document.exitPointerLock(); writeSave(LS, save); showScreen('#pause'); back = '#pause'; }
function resume() { state = 'play'; showScreen(null); if (game) { game.paused = false; game.last = performance.now(); } }
addEventListener('keydown', e => { audio.init(); if ((e.key === 'Escape' || e.key === 'p' || e.key === 'P') && state !== 'play') { if (state === 'paused') resume(); else if (['shop', 'inv', 'settings'].includes(state) && back === '#pause') { state = 'paused'; showScreen('#pause'); } }
  if ((e.key === 'i' || e.key === 'I' || e.key === 'Tab') && state === 'play') { e.preventDefault(); pause(); openInv(); } });
addEventListener('pointerdown', () => audio.init());
// v1.5.1 tap-to-unlock: iOS only unlocks Web Audio from touchend/click, so resume (plus a 1-sample buffer) on each tap until 'running'. Respects the silent switch.
function unlockAudio() { try { audio.init(); const c = audio.ctx; if (!c || c.state === 'running') return; c.resume().catch(() => {}); const src = c.createBufferSource(); src.buffer = c.createBuffer(1, 1, 22050); src.connect(c.destination); src.start(0); } catch (e) {} }
['touchend', 'click', 'keydown'].forEach(ev => addEventListener(ev, unlockAudio, { capture: true, passive: true }));
document.addEventListener('visibilitychange', () => { if (document.hidden && state === 'play') pause(); });

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
let cust = null;
async function openCustom(from) { back = from; state = 'custom'; showScreen('#custom'); $('#cList').innerHTML = '<p class="small">Loading…</p>';
  const g = await ensureGame(); const [{ OUTFITS, OUTFIT, HAIRS, HAIR_COLORS, SKINS, FACES, BEARDS, EYES, DEFAULT_LOOK }, { Char }, THREE] = await Promise.all([import('./game/looks.js'), import('./game/chars.js'), import('three')]);
  save.outfits = save.outfits || ['classic'];
  let L; try { L = Object.assign({}, DEFAULT_LOOK, JSON.parse(LS.getItem('atq3.look') || '{}')); } catch { L = Object.assign({}, DEFAULT_LOOK); }
  if (!cust) { const cv = $('#cPrev'); const r = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true }); r.setPixelRatio(Math.min(2, devicePixelRatio)); r.outputColorSpace = THREE.SRGBColorSpace;
    const sc = new THREE.Scene(); sc.add(new THREE.HemisphereLight('#dfe8ff', '#30281e', 1.3)); const d = new THREE.DirectionalLight('#fff2dc', 2.4); d.position.set(2, 3, 3); sc.add(d); const d2 = new THREE.DirectionalLight('#8fb4ff', 1); d2.position.set(-3, 2, -2); sc.add(d2);
    const cam = new THREE.PerspectiveCamera(30, 0.78, 0.1, 50); cust = { r, sc, cam, ch: null, rot: 0, zoom: 0, drag: null, clock: new THREE.Clock() };
    cv.addEventListener('pointerdown', e => { cust.drag = e.clientX; cv.setPointerCapture(e.pointerId); }); cv.addEventListener('pointermove', e => { if (cust.drag != null) { cust.rot += (e.clientX - cust.drag) * 0.012; cust.drag = e.clientX; } }); cv.addEventListener('pointerup', () => { cust.drag = null; });
    const loop = () => { if (state === 'custom') { const w = cv.clientWidth, h = cv.clientHeight; if (w && (cv.width !== w * cust.r.getPixelRatio() | 0)) { cust.r.setSize(w, h, false); cust.cam.aspect = w / h; cust.cam.updateProjectionMatrix(); }
        const dt = cust.clock.getDelta(); if (cust.ch) { cust.ch.mixer.update(dt); cust.ch.root.rotation.y = cust.rot; } const zf = cust.tab === 'hair' || cust.tab === 'face' || cust.tab === 'skin' ? 1 : 0; cust.zoom += (zf - cust.zoom) * Math.min(1, dt * 5);
        cust.cam.position.set(0, 1.0 + cust.zoom * 0.42, 4.6 - cust.zoom * 3.3); cust.cam.lookAt(0, 0.92 + cust.zoom * 0.52, 0); cust.r.render(cust.sc, cust.cam); } requestAnimationFrame(loop); }; loop(); }
  const rebuild = () => { if (cust.ch) cust.sc.remove(cust.ch.root); const c = cust.ch = new Char(g.lib, L, 0.9); cust.sc.add(c.root); c.play('Idle_Loop');
    const o = OUTFIT[L.outfit]; if (c.wantsPack || L.pack) { import('./game/chars.js').then(({ backpack }) => { const bp = backpack(); c.attach('DEF-spine.003', bp); bp.position.set(0, 0.12, -0.2); bp.rotation.x = .1; }); } };
  const owned = (o) => !o.price || save.outfits.includes(o.id);
  cust.tab = cust.tab || 'outfit';
  const render = () => { $('#cCash').textContent = `Cash: $${save.cash} · Level ${save.level}`; const T = $('#cTabs'); T.innerHTML = '';
    [['outfit', 'Outfits'], ['hair', 'Hair'], ['face', 'Face'], ['skin', 'Skin & eyes'], ['extra', 'Extras']].forEach(([k, n]) => { const b = document.createElement('button'); b.textContent = n; b.className = cust.tab === k ? 'on' : ''; b.onclick = () => { cust.tab = k; render(); }; T.appendChild(b); });
    const Lst = $('#cList'); Lst.innerHTML = ''; const btn = (html, on, fn, cls = '') => { const b = document.createElement('button'); b.innerHTML = html; b.className = (on ? 'on ' : '') + cls; b.onclick = () => { fn(); rebuild(); render(); }; Lst.appendChild(b); };
    const sw = (key, arr) => arr.forEach(c => btn(`<span class="sw" style="background:${c}"></span>`, L[key] === c, () => { L[key] = c; }, 'swb'));
    const head = (t) => { const h = document.createElement('div'); h.className = 'small'; h.style.gridColumn = '1/-1'; h.textContent = t; Lst.appendChild(h); };
    if (cust.tab === 'outfit') OUTFITS.forEach(o => { const own = owned(o), lockLv = o.lvl && save.level < o.lvl;
      btn(`<b>${o.name}</b><br><small>${own ? (L.outfit === o.id ? 'Wearing' : 'Owned') : lockLv ? `🔒 Level ${o.lvl} · $${o.price}` : `$${o.price}`}</small>`, L.outfit === o.id, () => {
        if (!own) { if (lockLv) { toastC(`Reach level ${o.lvl} to unlock ${o.name}.`); return; } if (save.cash < o.price) { toastC(`Need $${o.price} — loot more cash.`); return; } if (!confirm(`Buy ${o.name} for $${o.price} (in-game cash)?`)) return; save.cash -= o.price; save.outfits.push(o.id); writeSave(LS, save); audio.pickup && audio.pickup(); }
        L.outfit = o.id; }, own ? '' : 'lock'); });
    if (cust.tab === 'hair') { Object.entries(HAIRS).forEach(([k, n]) => btn(n, L.hair === k, () => { L.hair = k; })); head('Hair colour'); sw('hairColor', HAIR_COLORS); }
    if (cust.tab === 'face') { Object.entries(FACES).forEach(([k, f]) => btn(f.name, L.face === k, () => { L.face = k; })); head('Facial hair'); Object.entries(BEARDS).forEach(([k, n]) => btn(n, L.beard === k, () => { L.beard = k; })); }
    if (cust.tab === 'skin') { head('Skin tone'); sw('skin', SKINS); head('Eye colour'); sw('eyes', EYES); }
    if (cust.tab === 'extra') { btn(`Backpack: <b>${L.pack ? 'On' : 'Off'}</b>`, L.pack, () => { L.pack = !L.pack; }); btn(`Glasses: <b>${L.glasses ? 'On' : 'Off'}</b>`, L.glasses, () => { L.glasses = !L.glasses; });
      head('Build'); [[.92, 'Slim'], [1, 'Average'], [1.1, 'Stocky']].forEach(([v, n]) => btn(n, L.build === v, () => { L.build = v; })); }
  };
  const toastC = (t) => { $('#cCash').textContent = t; setTimeout(() => { if (state === 'custom') $('#cCash').textContent = `Cash: $${save.cash} · Level ${save.level}`; }, 2200); };
  $('#cSave').onclick = () => { LS.setItem('atq3.look', JSON.stringify(L)); writeSave(LS, save); if (back === '#pause') { g.makePlayer(); state = 'paused'; showScreen('#pause'); } else if (back === '#shop') openShop(); else { state = 'title'; showScreen('#title'); } };
  $('#cReset').onclick = () => { L = Object.assign({}, DEFAULT_LOOK); rebuild(); render(); };
  rebuild(); render(); }
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
  const finish = () => { if (done) return; done = true; st.classList.add('hidden'); toTitle(); };
  const onSkip = () => finish();
  st.addEventListener('pointerdown', onSkip, { once: true });
  addEventListener('keydown', onSkip, { once: true });
  setTimeout(finish, 7000);
  ensureGame().catch(e => console.error(e));
  hideLoading(); // preload quietly behind the intro
  await tracks.catch(() => {});
};
$('#btnNew').onclick = () => { if (loadSave(LS) && loadSave(LS).step > 0 && !confirm('Start a new game? Your current progress (level, cash, weapons) will be reset.')) return; clearSave(LS); save = defaultSave(); writeSave(LS, save); play(0); };
$('#btnEndNext').onclick = () => { save = loadSave(LS) || save; const nc = Math.min(LAST_CH, Math.max(2, save.ch || 2)); if (chOf(save.step || 0) !== nc) save.step = CH_START[nc]; writeSave(LS, save); play(save.step); };
var CHN = CHAPTERS.map(c => (c ? c.title : '')), CHS = CHAPTERS.map(c => (c ? c.start : 0)); // derived from the chapter registry
const unlockedCh = (s) => Math.max(s.maxCh || 1, s.done || (s.step || 0) >= 7 ? 2 : 1, s.done2 ? 3 : 1, CHS.findLastIndex(v => (s.step || 0) >= v) || 1);
// chapter-select buttons are generated from the registry (src/game/chapters), so adding a chapter needs no HTML/menu edits
{ const ft = $('#foot'); if (ft) ft.textContent = 'v1.9.24 · Story Mode · Chapters 1–' + LAST_CH + ' · ' + CHAPTERS[LAST_CH].title + ' · Multiplayer (Beta)'; }
const chList = $('#chList'); for (let c = 1; c <= LAST_CH; c++) { const b = document.createElement('button'); b.id = 'btnCh' + c; b.textContent = 'Chapter ' + c + ' · ' + CHN[c]; chList.appendChild(b); }
$('#btnChapters').onclick = () => { const s = loadSave(LS) || defaultSave(); const u = unlockedCh(s); for (let c = 2; c <= LAST_CH; c++) { const b = $('#btnCh' + c); b.disabled = c > u; b.textContent = 'Chapter ' + c + ' · ' + CHN[c] + (c > u ? ' (finish Chapter ' + (c - 1) + ')' : ''); } showScreen('#chapters'); };
$('#btnCh1').onclick = () => { save = loadSave(LS) || defaultSave(); writeSave(LS, save); play(0); };
for (let c = 2; c <= LAST_CH; c++) $('#btnCh' + c).onclick = () => { save = loadSave(LS) || defaultSave(); save.ch = c; writeSave(LS, save); play(CHS[c]); };
$('#btnSurvival').onclick = () => { save = loadSave(LS) || defaultSave(); writeSave(LS, save); play(SURVIVAL_STEP); };
$('#btnContinue').onclick = () => { save = loadSave(LS) || defaultSave(); play(save.step || 0); };
$('#btnCustom').onclick = () => openCustom('#title'); $('#btnShopCustom').onclick = () => openCustom(back === '#pause' ? '#pause' : '#shop');
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
if (qs.has('step')) { $('#warning').classList.add('hidden'); save = defaultSave(); if (qs.has('god')) Object.assign(save, { owned: ['fists', 'bat', 'pistol', 'rifle', 'shotgun'], items: ['backpack'], ammo: { light: 99, shell: 30, rifle: 200 }, grenades: 3, cash: 2000, cur: 'rifle' }); play(+qs.get('step')); }
window.__atqBooted = true;
// (title background image removed in v1.3.1)

// Multiplayer (Beta): separate module, adds one title-menu button (see docs/multiplayer.md)
import('./mp/entry.js').then(m => m.install()).catch(e => console.warn('mp entry failed', e));
