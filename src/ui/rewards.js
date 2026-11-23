// Unlockable rewards: skins, weapon finishes, titles and badges.
// Stored locally (atq.rewards.v1) and copied into the signed-in profile so they sync.
// Story Keem is never recolored. No server score posts, no fake lobby players.
import { WEAPONS } from '../game/data.js';
import { getDailies, dayKey } from './dailies.js';
import { CATALOG, BY_ID, KINDS, DEFAULT_EQ } from './rewardsCatalog.js';

const KEY = 'atq.rewards.v1';
const $ = s => document.querySelector(s);
const LS = () => { try { return localStorage; } catch (e) { return { getItem: () => null, setItem: () => {}, removeItem: () => {} }; } };
const esc = t => String(t == null ? '' : t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function empty() {
  return { v: 1, unlocked: ['title_survivor', 'wf_stock'], seen: ['title_survivor', 'wf_stock'],
    equipped: { ...DEFAULT_EQ }, stats: { kills: 0, headshots: 0, melee: 0, gun: 0, bestWave: 0, dailiesDone: 0, dailiesDays: 0, dailyStreak: 0, lastDailyDay: null, countedDays: {}, bestRank: null, lastRank: null },
    lookBackup: null, updatedAt: 0 };
}

let state = null, tab = 'all', fromSel = '#title', pushT = 0, seedNoted = false;
function load() {
  if (state) return state;
  let d = null; try { d = JSON.parse(LS().getItem(KEY) || 'null'); } catch (e) { d = null; }
  const base = empty();
  if (!d || d.v !== 1) d = base;
  d.unlocked = [...new Set([...(d.unlocked || []), 'title_survivor', 'wf_stock'])];
  d.seen = Array.isArray(d.seen) ? d.seen : d.unlocked.slice();
  d.equipped = Object.assign({}, DEFAULT_EQ, d.equipped || {});
  d.stats = Object.assign(empty().stats, d.stats || {});
  d.stats.countedDays = d.stats.countedDays || {};
  state = d; return d;
}
function writeLocal() { try { LS().setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignore */ } }
function persist(sync) {
  if (!state) load();
  state.updatedAt = Date.now();
  writeLocal();
  if (sync === false) return;
  clearTimeout(pushT);
  pushT = setTimeout(syncToProfile, 2000);
}

function seedFromDevice(st) {
  try {
    const s = (typeof window !== 'undefined' && window.__atq && window.__atq.save) || JSON.parse(LS().getItem('atq3_save') || 'null') || {};
    st.kills = Math.max(st.kills || 0, s.kills | 0);
  } catch (e) { /* ignore */ }
  try { st.bestWave = Math.max(st.bestWave || 0, +(LS().getItem('atq3.survBest') || 0)); } catch (e) { /* ignore */ }
  try {
    const lb = JSON.parse(LS().getItem('atq.lbLast') || 'null');
    if (lb && lb.rank > 0) noteRank(lb.rank, st, true);
  } catch (e) { /* ignore */ }
}

function prevDay(day) {
  const [y, m, d] = String(day).split('-').map(Number);
  return dayKey(new Date(y, (m || 1) - 1, (d || 1) - 1));
}

function applyDailyProgress(st) {
  let d; try { d = getDailies(); } catch (e) { return; }
  if (!d || !Array.isArray(d.items)) return;
  const done = d.items.filter(i => i.done).length;
  const today = d.day || dayKey();
  // lifetime challenge count: once a challenge id is counted for this day, keep it
  const counted = st.countedDays[today] || [];
  const ids = d.items.filter(i => i.done).map(i => i.id);
  const fresh = ids.filter(id => !counted.includes(id));
  if (fresh.length) {
    st.dailiesDone = (st.dailiesDone || 0) + fresh.length;
    st.countedDays[today] = [...counted, ...fresh];
    // drop very old day keys
    const keys = Object.keys(st.countedDays);
    if (keys.length > 40) keys.sort().slice(0, keys.length - 30).forEach(k => { delete st.countedDays[k]; });
  }
  if (done === 3 && st.lastDailyDay !== today) {
    st.dailyStreak = (st.lastDailyDay === prevDay(today)) ? (st.dailyStreak || 0) + 1 : 1;
    st.lastDailyDay = today;
    st.dailiesDays = (st.dailiesDays || 0) + 1;
  }
  if (st.lastDailyDay && st.lastDailyDay !== today && st.lastDailyDay !== prevDay(today)) st.dailyStreak = 0;
}

function noteRank(n, st, silent) {
  n = +n; if (!n || n < 1) return;
  const s = st || load().stats;
  s.lastRank = n;
  if (!s.bestRank || n < s.bestRank) s.bestRank = n;
  if (!silent && state) { persist(false); evaluate({ toast: true }); }
}

function evaluate({ toast = false, summary = false } = {}) {
  const d = load();
  const st = d.stats;
  const fresh = [];
  for (const it of CATALOG) {
    if (d.unlocked.includes(it.id)) continue;
    let ok = false;
    try { ok = !!(it.test && it.test(st)); } catch (e) { ok = false; }
    if (ok) { d.unlocked.push(it.id); fresh.push(it); }
  }
  if (fresh.length) {
    persist();
    render();
    updateBadge();
    if (toast) {
      if (summary || fresh.length > 2) showToast(fresh.length === 1 ? ('Unlocked · ' + fresh[0].name) : (fresh.length + ' rewards unlocked from your progress'));
      else fresh.forEach(it => showToast('Unlocked · ' + it.name, it));
    }
  }
  return fresh;
}

export function addStats(delta) {
  const d = load(); const st = d.stats;
  if (delta.kills) st.kills += delta.kills;
  if (delta.headshots) st.headshots += delta.headshots;
  if (delta.melee) st.melee += delta.melee;
  if (delta.gun) st.gun += delta.gun;
  if (delta.bestWave) st.bestWave = Math.max(st.bestWave || 0, delta.bestWave);
  if (delta.rank) noteRank(delta.rank, st, true);
  persist(false);
  evaluate({ toast: true });
}

function itemOf(id) { return id ? BY_ID[id] : null; }

export function getRewards() { return load(); }
export function getEquipped() { return load().equipped; }
export function isUnlocked(id) { return load().unlocked.includes(id); }

export function equipReward(id) {
  const it = itemOf(id);
  if (!it || !isUnlocked(id)) return false;
  const d = load();
  if (it.kind === 'skin') {
    if (d.equipped.skin === id) { unequipSkin(); return true; }
    applySkin(id); d.equipped.skin = id;
  } else if (it.kind === 'finish') {
    d.equipped.finish = id;
    paintOpenWeapons();
  } else if (it.kind === 'title') {
    d.equipped.title = id;
  } else if (it.kind === 'badge') {
    d.equipped.badge = d.equipped.badge === id ? null : id;
  }
  persist();
  decorateLobby();
  render();
  return true;
}

function unequipSkin() {
  const d = load();
  restoreLook();
  d.equipped.skin = null;
  persist();
}

function snapshotWorn(look) { try { return JSON.parse(JSON.stringify((look && look.worn) || {})); } catch (e) { return {}; } }
function applySkin(id) {
  const it = itemOf(id); if (!it || !it.colors) return;
  import('../mp/look.js').then(K => {
    const look = K.loadLook() || K.defaultLook();
    const d = load();
    if (!d.lookBackup) d.lookBackup = snapshotWorn(look);
    else { try { look.worn = JSON.parse(JSON.stringify(d.lookBackup)); } catch (e) { /* keep */ } }
    paintWorn(look, it.colors);
    look.rewardSkin = id;
    K.saveLook(look);
    writeLookToProfile(look);
    persist();
  }).catch(() => {});
}
function restoreLook() {
  const d = load();
  import('../mp/look.js').then(K => {
    const look = K.loadLook(); if (!look) return;
    if (d.lookBackup) { try { look.worn = JSON.parse(JSON.stringify(d.lookBackup)); } catch (e) { /* ignore */ } }
    delete look.rewardSkin;
    K.saveLook(look);
    writeLookToProfile(look);
    d.lookBackup = null;
    persist();
  }).catch(() => {});
}
function paintWorn(look, colors) {
  look.worn = look.worn || {};
  const set = (k, c, c2, extra) => {
    if (!c || !look.worn[k]) return;
    look.worn[k].c = c;
    if (c2) look.worn[k].c2 = c2;
    if (extra) Object.assign(look.worn[k], extra);
  };
  set('top', colors.top, colors.top2);
  set('jacket', colors.jacket, colors.jacket2);
  set('pants', colors.pants, colors.pants2);
  set('shoes', colors.shoes, colors.sole, colors.sole ? { sole: colors.sole } : null);
}

function writeLookToProfile(look) {
  import('../mp/profile.js').then(P => {
    const p = P.getProfile && P.getProfile(); if (!p) return;
    p.look = look;
    const copy = rewardsPayload();
    p.stats = Object.assign({}, p.stats || {}, { rewards: copy });
    P.saveProfile(p);
  }).catch(() => {});
}

function rewardsPayload() {
  const d = load();
  return { unlocked: d.unlocked, equipped: d.equipped, stats: {
    kills: d.stats.kills, headshots: d.stats.headshots, melee: d.stats.melee, gun: d.stats.gun,
    bestWave: d.stats.bestWave, dailiesDone: d.stats.dailiesDone, dailiesDays: d.stats.dailiesDays,
    dailyStreak: d.stats.dailyStreak, lastDailyDay: d.stats.lastDailyDay, bestRank: d.stats.bestRank, lastRank: d.stats.lastRank,
  }, updatedAt: d.updatedAt };
}

function syncToProfile() {
  import('../mp/profile.js').then(P => {
    const p = P.getProfile && P.getProfile(); if (!p) return;
    const next = rewardsPayload();
    const cur = p.stats && p.stats.rewards;
    if (cur && JSON.stringify(cur) === JSON.stringify(next)) return;
    p.stats = Object.assign({}, p.stats || {}, { rewards: next });
    if (p.look) {
      p.look = Object.assign({}, p.look, { title: (dEq().title || null), badge: (dEq().badge || null), rewardSkin: dEq().skin || null });
    }
    P.saveProfile(p);
  }).catch(() => {});
}
const dEq = () => load().equipped;

function mergeFromProfile(p) {
  const r = p && p.stats && p.stats.rewards; if (!r) return;
  const d = load();
  const remoteAt = r.updatedAt || 0;
  // union unlocks; take the better stats; prefer newer equipped if remote is newer
  d.unlocked = [...new Set([...(d.unlocked || []), ...(r.unlocked || [])])];
  const st = d.stats, rs = r.stats || {};
  st.kills = Math.max(st.kills || 0, rs.kills || 0);
  st.headshots = Math.max(st.headshots || 0, rs.headshots || 0);
  st.melee = Math.max(st.melee || 0, rs.melee || 0);
  st.gun = Math.max(st.gun || 0, rs.gun || 0);
  st.bestWave = Math.max(st.bestWave || 0, rs.bestWave || 0);
  st.dailiesDone = Math.max(st.dailiesDone || 0, rs.dailiesDone || 0);
  st.dailiesDays = Math.max(st.dailiesDays || 0, rs.dailiesDays || 0);
  st.dailyStreak = Math.max(st.dailyStreak || 0, rs.dailyStreak || 0);
  if (rs.lastDailyDay && (!st.lastDailyDay || rs.lastDailyDay > st.lastDailyDay)) st.lastDailyDay = rs.lastDailyDay;
  if (rs.bestRank && (!st.bestRank || rs.bestRank < st.bestRank)) st.bestRank = rs.bestRank;
  if (remoteAt > (d.updatedAt || 0) && r.equipped) d.equipped = Object.assign({}, d.equipped, r.equipped);
  persist(false);
  evaluate({ toast: false });
}

// ---------- weapon finishes (clone materials so shared gear mats stay clean) ----------
export function paintWeapon(root, finishId) {
  if (!root || !root.traverse) return;
  const it = itemOf(finishId) || itemOf('wf_stock');
  const paint = (it && it.paint) || { mix: 0 };
  root.traverse(o => {
    if (!o.isMesh || !o.material) return;
    if (o.isSprite || (o.material.transparent && o.material.opacity < 1 && o.material.depthWrite === false)) return;
    const list = Array.isArray(o.material) ? o.material : [o.material];
    const out = list.map((mat, i) => tintMat(o, mat, i, paint));
    o.material = Array.isArray(o.material) ? out : out[0];
  });
}
function tintMat(o, mat, i, paint) {
  if (!mat || !mat.color) return mat;
  if (!o.userData._rwBase) o.userData._rwBase = [];
  if (!o.userData._rwMat) o.userData._rwMat = [];
  if (!o.userData._rwBase[i]) {
    const c = mat.clone();
    o.userData._rwBase[i] = {
      color: mat.color.clone(),
      metalness: mat.metalness, roughness: mat.roughness,
      emissive: mat.emissive ? mat.emissive.clone() : null,
    };
    o.userData._rwMat[i] = c;
    applyTint(c, o.userData._rwBase[i], paint);
    return c;
  }
  const working = o.userData._rwMat[i] || mat;
  applyTint(working, o.userData._rwBase[i], paint);
  return working;
}
function applyTint(mat, base, paint) {
  const mix = paint && paint.mix != null ? paint.mix : 0;
  mat.color.copy(base.color);
  if (mix > 0 && paint.color && typeof mat.color.lerp === 'function') {
    const tgt = base.color.clone();
    if (typeof tgt.set === 'function') tgt.set(paint.color);
    mat.color.lerp(tgt, mix);
  }
  if (paint && paint.metalness != null && mix > 0) mat.metalness = base.metalness * (1 - mix) + paint.metalness * mix;
  else mat.metalness = base.metalness;
  if (paint && paint.roughness != null && mix > 0) mat.roughness = base.roughness * (1 - mix) + paint.roughness * mix;
  else mat.roughness = base.roughness;
  if (mat.emissive) {
    if (base.emissive) mat.emissive.copy(base.emissive);
    else mat.emissive.setRGB(0, 0, 0);
    if (paint && paint.emissive && mix > 0) {
      const e = mat.emissive.clone();
      if (typeof e.set === 'function') e.set(paint.emissive);
      mat.emissive.lerp(e, mix);
    }
  }
}

export function paintLocalWeapon(root) {
  if (!root) return;
  paintWeapon(root, (load().equipped.finish) || 'wf_stock');
}
if (typeof window !== 'undefined') window.__atqPaintWeapon = (m) => { try { paintLocalWeapon(m); } catch (e) { /* ignore */ } };

function shouldPaintGame(g) { return !!(g && g.survival); }
function paintOpenWeapons() {
  try {
    const g = window.__atq && window.__atq.game;
    if (g) {
      const id = shouldPaintGame(g) ? (load().equipped.finish || 'wf_stock') : 'wf_stock';
      const meshes = g.weaponMeshes || {};
      Object.values(meshes).forEach(m => m && paintWeapon(m, id));
      if (g.vmMesh) paintWeapon(g.vmMesh, id);
      if (g.hand) paintWeapon(g.hand, id);
    }
  } catch (e) { /* ignore */ }
  try {
    // town local gun, if the hook didn't fire
    const t = window.__mpTown || window.__atqTown;
    if (t && t.GS && t.GS.mesh) paintLocalWeapon(t.GS.mesh);
  } catch (e) { /* ignore */ }
}

export function attachRewards(g) {
  if (!g || g.__rwTracked) return; g.__rwTracked = true;
  const kz = g.killZ.bind(g);
  g.killZ = function (z, dir, o = {}) {
    const wasDead = z && z.dead;
    const out = kz(z, dir, o);
    if (z && !wasDead && z.dead && (!(o || {}).ai || z.playerHit)) {
      const types = { kills: 1 };
      if ((o || {}).head) types.headshots = 1;
      const id = (this.save && this.save.cur) || '';
      const w = WEAPONS[id] || {};
      if (w.type === 'melee') types.melee = 1;
      else if (w.type === 'gun') types.gun = 1;
      addStats(types);
    }
    return out;
  };
  const eq = g.equip.bind(g);
  g.equip = function (id, silent) {
    const out = eq(id, silent);
    try { paintOpenWeapons(); } catch (e) { /* ignore */ }
    return out;
  };
  let lastW = 0;
  const iv = setInterval(() => {
    if (!g) return;
    if (g.survival) {
      const w = (g.stepData && g.stepData.wave) || 0;
      if (w > lastW) { lastW = w; addStats({ bestWave: w }); }
      paintOpenWeapons();
    } else { lastW = 0; paintOpenWeapons(); }
  }, 900);
  try { paintOpenWeapons(); } catch (e) { /* ignore */ }
  void iv;
}

// ---------- UI ----------
const CSS = `
#rewards{z-index:40}
#rewards .panel{display:flex;flex-direction:column;max-height:calc(100vh - 16px);width:min(560px,94vw);padding:12px 14px 10px;overflow:hidden;gap:6px}
#rewards h2{margin:0;font:700 20px system-ui,sans-serif;color:var(--g);letter-spacing:.08em}
#rewards .rwsub{margin:0;font:12.5px/1.35 system-ui,sans-serif;opacity:.82}
#rewards .rwstats{display:flex;flex-wrap:wrap;gap:6px 10px;font:12px system-ui,sans-serif;opacity:.9}
#rewards .rwstats b{color:#ffd77a}
#rewards .rwtabs{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;flex:none;padding:2px 0}
#rewards .rwtabs::-webkit-scrollbar{display:none}
#rewards .rwtabs button{flex:none;min-height:36px;padding:6px 12px;border-radius:999px;font:600 13px system-ui,sans-serif;background:#14201a;border:1px solid #2a3e32;color:#b9cbbf}
#rewards .rwtabs button.on{background:#3d8f5c;border-color:#5fc086;color:#fff}
#rewards .rwlist{display:flex;flex-direction:column;gap:7px;overflow-y:auto;flex:1;min-height:0;-webkit-overflow-scrolling:touch;overscroll-behavior:contain}
#rewards .rwcard{display:flex;gap:10px;align-items:center;padding:8px 10px;border-radius:12px;background:rgba(0,0,0,.28);border:1.5px solid #1d3a28;text-align:left;min-height:64px}
#rewards .rwcard.unlocked{border-color:#2f6b45}
#rewards .rwcard.eq{border-color:#6fd394;background:#1d3526;box-shadow:0 0 0 2px #6fd39433}
#rewards .rwcard.lock{opacity:.78}
#rewards .rwsw{width:44px;height:44px;border-radius:10px;flex:none;display:flex;overflow:hidden;border:1px solid #0007;align-items:center;justify-content:center;font-size:22px;background:#0c1812;color:#ffe08a}
#rewards .rwsw i{flex:1;height:100%}
#rewards .rwbody{flex:1;min-width:0}
#rewards .rwbody b{display:block;font:700 14px/1.2 system-ui,sans-serif}
#rewards .rwbody .how{font:11.5px/1.3 system-ui,sans-serif;opacity:.78;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#rewards .rwbar{height:5px;border-radius:4px;background:#0008;overflow:hidden;margin-top:4px}
#rewards .rwbar i{display:block;height:100%;background:linear-gradient(90deg,#2f6b45,#7fd49a)}
#rewards .rwact{flex:none}
#rewards .rwact button{min-height:40px;min-width:72px;padding:6px 10px;font:700 13px system-ui,sans-serif;border-radius:10px}
#rewards .rwact .lockn{font:11px system-ui,sans-serif;opacity:.7;text-align:center;max-width:80px}
#rewards .back{flex-shrink:0}
#rwToast{position:fixed;left:max(10px,env(safe-area-inset-left));right:auto;top:max(10px,env(safe-area-inset-top));bottom:auto;transform:translateY(-8px);z-index:90;background:rgba(8,22,14,.96);border:1px solid #c9a227;color:#f4ead4;padding:8px 12px;border-radius:12px;font:700 13px system-ui,sans-serif;opacity:0;pointer-events:none;transition:opacity .25s,transform .25s;max-width:min(46vw,260px);text-align:left;box-shadow:0 8px 28px #0008}
#rwToast.on{opacity:1;transform:translateY(0)}
#rwToast small{display:block;font:600 11px system-ui,sans-serif;opacity:.8;margin-top:2px;letter-spacing:.04em;text-transform:uppercase;color:#c9a227}
#title #btnRewards{position:relative}
#title .mpane #btnDailies,#title .mpane #btnRewards{grid-column:auto}
#title #rwBadge{position:absolute;right:6px;top:6px;min-width:18px;height:18px;padding:0 4px;border-radius:9px;background:#c9a227;color:#1a1408;font:800 10px/18px system-ui,sans-serif}
#title #rwBadge:empty{display:none}
@media (max-height:560px){
  #title .menu.mm{max-height:calc(100dvh - 10px);overflow-y:auto;-webkit-overflow-scrolling:touch}
}
.rwTag{display:inline-block;margin-left:6px;padding:1px 7px;border-radius:999px;background:#1d3526;border:1px solid #6fd394;color:#c8f0d4;font:600 11px system-ui,sans-serif;vertical-align:middle}
#wProf .rwTag{margin-left:0;margin-top:3px;display:inline-block}
#shop .rwShop{margin:6px 0 8px;padding:8px 10px;border-radius:10px;background:#0c1812;border:1px solid #2f6b45;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
#shop .rwShop b{color:#ffd77a;font:700 13px system-ui}
#shop .rwShop button{min-height:36px;padding:5px 10px;font:600 13px system-ui}
@media (max-height:560px){
  #rewards{align-items:stretch;padding:8px;overflow:hidden}
  #rewards .panel{height:100%;max-height:100%;min-height:0;width:min(640px,96vw);margin:0 auto;padding:8px 12px;gap:5px}
  #rewards h2{font-size:17px}
  #rewards .rwsub{display:none}
  #rewards .rwcard{min-height:54px;padding:6px 8px}
  #rewards .rwsw{width:36px;height:36px}
  #rewards .rwtabs button{min-height:32px;padding:4px 10px;font-size:12px}
}
@media (max-height:400px){
  #rewards .rwstats{font-size:11px;gap:4px 8px}
  #rewards .rwcard{min-height:48px;padding:4px 8px}
  #rewards .rwbody b{font-size:13px}
}
`;

function ensureDom() {
  if ($('#rewards')) return;
  const st = document.createElement('style'); st.id = 'rwCss'; st.textContent = CSS; document.head.appendChild(st);
  const root = document.createElement('div');
  root.id = 'rewards'; root.className = 'screen hidden';
  root.innerHTML = `<div class="panel">
    <h2>Rewards</h2>
    <p class="rwsub">Unlock skins, weapon colors, titles and badges by playing. Story Keem keeps his original look — these only change your multiplayer character, and weapons in Survival and Online.</p>
    <div class="rwstats" id="rwStats"></div>
    <div class="rwtabs" id="rwTabs"></div>
    <div class="rwlist" id="rwList"></div>
    <button class="back primary" type="button">Back</button>
  </div>`;
  document.body.appendChild(root);
  root.querySelector('.back').addEventListener('click', closeRewards);
  const toast = document.createElement('div'); toast.id = 'rwToast'; document.body.appendChild(toast);
}

function injectMenu() {
  const pane = $('#paneOnline'); if (!pane || $('#btnRewards')) return;
  const btn = document.createElement('button');
  btn.id = 'btnRewards';
  btn.innerHTML = 'Rewards<small id="rwPaneTxt">Unlocks</small><span id="rwBadge"></span>';
  const after = $('#btnDailies');
  if (after) after.classList.remove('wide');
  if (after && after.nextSibling) pane.insertBefore(btn, after.nextSibling);
  else pane.appendChild(btn);
  btn.addEventListener('click', () => openRewards('#title'));
}

function injectExtras() {
  // Daily Challenges: a Rewards shortcut
  const d = $('#dailies .panel');
  if (d && !$('#btnDailyRewards')) {
    const b = document.createElement('button');
    b.id = 'btnDailyRewards'; b.type = 'button';
    b.textContent = 'View rewards';
    b.style.cssText = 'margin:4px 0;min-height:40px';
    const back = d.querySelector('.back');
    if (back) d.insertBefore(b, back); else d.appendChild(b);
    b.addEventListener('click', () => openRewards('#dailies'));
  }
  // Armory: current finish + link
  const shop = $('#shop .panel');
  if (shop && !$('#rwShopBar')) {
    const bar = document.createElement('div');
    bar.id = 'rwShopBar'; bar.className = 'rwShop';
    const cash = $('#shopCash');
    if (cash && cash.nextSibling) shop.insertBefore(bar, cash.nextSibling);
    else shop.insertBefore(bar, shop.querySelector('.tabs') || shop.querySelector('.back'));
  }
  refreshShopBar();
}

function refreshShopBar() {
  const bar = $('#rwShopBar'); if (!bar) return;
  const eq = load().equipped;
  const fin = itemOf(eq.finish);
  bar.innerHTML = `<b>Weapon finish</b><span class="small">${esc(fin ? fin.name : 'Stock')} · Survival &amp; Online only</span>`;
  const b = document.createElement('button'); b.textContent = 'Change…'; b.onclick = () => { tab = 'finish'; openRewards('#shop'); };
  bar.appendChild(b);
}

export function openRewards(from) {
  fromSel = from || '#title';
  ensureDom(); injectExtras();
  const d = load();
  d.seen = [...new Set([...(d.seen || []), ...d.unlocked])];
  writeLocal();
  updateBadge();
  render();
  document.querySelectorAll('.screen').forEach(e => e.classList.add('hidden'));
  $('#rewards').classList.remove('hidden');
}

function closeRewards() {
  const s = $('#rewards'); if (s) s.classList.add('hidden');
  const dest = fromSel || '#title';
  const el = $(dest);
  if (el) el.classList.remove('hidden');
  else { const t = $('#title'); if (t) t.classList.remove('hidden'); }
  if (dest === '#shop') refreshShopBar();
}

function render() {
  const list = $('#rwList'); if (!list) return;
  const d = load();
  const st = d.stats;
  const stats = $('#rwStats');
  if (stats) {
    const rank = st.bestRank ? '#' + st.bestRank : '—';
    stats.innerHTML = `<span>Kills <b>${st.kills || 0}</b></span><span>Headshots <b>${st.headshots || 0}</b></span><span>Best wave <b>${st.bestWave || 0}</b></span><span>Dailies <b>${st.dailiesDone || 0}</b></span><span>Streak <b>${st.dailyStreak || 0}</b></span><span>Best rank <b>${rank}</b></span>`;
  }
  const tabs = $('#rwTabs');
  if (tabs) {
    tabs.innerHTML = '';
    const all = [{ id: 'all', label: 'All' }, ...KINDS];
    all.forEach(t => {
      const b = document.createElement('button');
      b.textContent = t.label; if (tab === t.id) b.className = 'on';
      b.onclick = () => { tab = t.id; render(); };
      tabs.appendChild(b);
    });
  }
  const items = CATALOG.filter(it => tab === 'all' || it.kind === tab);
  list.innerHTML = items.map(it => cardHTML(it, d)).join('');
  list.querySelectorAll('[data-eq]').forEach(b => b.addEventListener('click', ev => { ev.preventDefault(); equipReward(b.getAttribute('data-eq')); }));
  const pane = $('#rwPaneTxt');
  if (pane) {
    const n = d.unlocked.length, tot = CATALOG.length;
    pane.textContent = n + '/' + tot + ' unlocked';
  }
}

function cardHTML(it, d) {
  const on = d.unlocked.includes(it.id);
  const eq = d.equipped;
  const equipped = (it.kind === 'skin' && eq.skin === it.id) || (it.kind === 'finish' && eq.finish === it.id) || (it.kind === 'title' && eq.title === it.id) || (it.kind === 'badge' && eq.badge === it.id);
  let have = 0, need = 1, label = it.blurb, pct = on ? 100 : 0;
  try {
    const p = it.progress && it.progress(d.stats);
    if (p) {
      have = p.have; need = p.need; label = on ? it.blurb : p.label;
      const hn = typeof have === 'number' && typeof need === 'number' && need > 0 ? Math.min(1, have / need) : (on ? 1 : 0);
      pct = Math.round(hn * 100);
    }
  } catch (e) { /* ignore */ }
  const sw = it.swatch && it.swatch.length
    ? `<span class="rwsw">${it.swatch.map(c => `<i style="background:${c}"></i>`).join('')}</span>`
    : `<span class="rwsw">${it.icon || '★'}</span>`;
  const act = on
    ? `<div class="rwact"><button class="${equipped ? 'primary' : ''}" data-eq="${esc(it.id)}">${equipped ? (it.kind === 'badge' || it.kind === 'skin' ? 'Unequip' : 'Equipped') : 'Equip'}</button></div>`
    : `<div class="rwact"><div class="lockn">Locked</div></div>`;
  return `<div class="rwcard ${on ? 'unlocked' : 'lock'}${equipped ? ' eq' : ''}">${sw}<div class="rwbody"><b>${esc(it.name)}${it.icon ? ' ' + it.icon : ''}</b><div class="how">${esc(label)}</div><div class="rwbar"><i style="width:${pct}%"></i></div></div>${act}</div>`;
}

function updateBadge() {
  const d = load();
  const n = d.unlocked.filter(id => !(d.seen || []).includes(id)).length;
  const b = $('#rwBadge');
  if (b) { b.textContent = n ? String(n) : ''; b.hidden = !n; }
}

let toastQ = [], toastOn = false;
function showToast(msg, it) {
  toastQ.push({ msg, sub: it ? (it.kind === 'skin' ? 'New skin' : it.kind === 'finish' ? 'New weapon finish' : it.kind === 'title' ? 'New title' : 'New badge') : '' });
  if (!toastOn) nextToast();
}
function nextToast() {
  const el = $('#rwToast'); if (!el) { toastOn = false; return; }
  const x = toastQ.shift();
  if (!x) { toastOn = false; el.classList.remove('on'); return; }
  toastOn = true;
  el.innerHTML = esc(x.msg) + (x.sub ? '<small>' + esc(x.sub) + '</small>' : '');
  el.classList.add('on');
  setTimeout(() => { el.classList.remove('on'); setTimeout(nextToast, 280); }, 2400);
}

let decorating = false;
function decorateLobby() {
  if (decorating) return;
  decorating = true;
  try {
    const eq = load().equipped;
    const title = itemOf(eq.title);
    const badge = itemOf(eq.badge);
    const tagText = [badge && badge.icon, title && title.name].filter(Boolean).join('  ');
    const put = (host, after) => {
      if (!host) return;
      let tag = host.querySelector(':scope > .rwTag');
      if (!tagText) { if (tag) tag.remove(); return; }
      if (!tag) { tag = document.createElement('span'); tag.className = 'rwTag'; if (after && after.after) after.after(tag); else host.appendChild(tag); }
      if (tag.textContent !== tagText) tag.textContent = tagText;
    };
    const b = document.querySelector('#wProf .wpn b');
    if (b) put(b.parentElement, b);
    document.querySelectorAll('#wBoard .wtr.me .wnm').forEach(nm => {
      const nb = nm.querySelector('b'); if (nb) put(nm, nb);
    });
  } finally { decorating = false; }
}

function watchLobby() {
  const online = () => $('#online');
  const hook = () => {
    const root = online(); if (!root || root.__rwObs) return;
    root.__rwObs = true;
    new MutationObserver(() => decorateLobby()).observe(root, { childList: true, subtree: true });
    decorateLobby();
  };
  hook();
  new MutationObserver(hook).observe(document.body, { childList: true, subtree: true });
  setInterval(() => { try { hook(); decorateLobby(); } catch (e) { /* ignore */ } }, 2000);
}

function hookLeaderboard() {
  import('../mp/world.js').then(m => {
    if (m.__rwWrapped) return; m.__rwWrapped = true;
    if (m.submitRun) {
      const orig = m.submitRun.bind(m);
      m.submitRun = async function (run) {
        const d = await orig(run);
        try {
          const rank = d && (d.rank || (d.me && d.me.rank));
          if (rank) noteRank(rank);
        } catch (e) { /* ignore */ }
        return d;
      };
    }
    if (m.topPlayers) {
      const orig = m.topPlayers.bind(m);
      m.topPlayers = async function (...a) {
        const d = await orig(...a);
        try {
          const rank = d && d.me && d.me.rank;
          if (rank) noteRank(rank);
        } catch (e) { /* ignore */ }
        return d;
      };
    }
  }).catch(() => {});
}

function hookProfile() {
  import('../mp/profile.js').then(P => {
    if (P.onProfileChange) P.onProfileChange(p => { mergeFromProfile(p); decorateLobby(); });
    const p = P.getProfile && P.getProfile();
    if (p) mergeFromProfile(p);
  }).catch(() => {});
}

function tickDailies() {
  const d = load();
  const before = JSON.stringify(d.stats);
  applyDailyProgress(d.stats);
  if (JSON.stringify(d.stats) !== before) persist(false);
  evaluate({ toast: true });
}

export function initRewards() {
  ensureDom();
  injectMenu();
  injectExtras();
  const d = load();
  seedFromDevice(d.stats);
  applyDailyProgress(d.stats);
  persist(false);
  const fresh = evaluate({ toast: false, summary: true });
  if (fresh.length && !seedNoted) { seedNoted = true; showToast(fresh.length === 1 ? ('Unlocked · ' + fresh[0].name) : (fresh.length + ' rewards unlocked from your progress')); }
  render();
  updateBadge();
  if (d.equipped && d.equipped.skin) applySkin(d.equipped.skin);
  hookLeaderboard();
  hookProfile();
  watchLobby();
  setInterval(tickDailies, 1500);
  // shop bar when the armory opens
  const shop = $('#shop');
  if (shop) new MutationObserver(() => { if (!shop.classList.contains('hidden')) { injectExtras(); refreshShopBar(); } }).observe(shop, { attributes: true, attributeFilter: ['class'] });
  const title = $('#title');
  if (title) new MutationObserver(() => { if (!title.classList.contains('hidden')) { persist(); updateBadge(); } }).observe(title, { attributes: true, attributeFilter: ['class'] });
  if (typeof window !== 'undefined' && /^(localhost|127\.0\.0\.1)$/.test(location.hostname)) {
    window.__atqRewards = {
      get: getRewards, catalog: CATALOG, equip: equipReward, isUnlocked, evaluate,
      addStats, setStat: (k, v) => { const st = load().stats; st[k] = v; persist(false); return evaluate({ toast: true }); },
      noteRank: n => noteRank(n),
      open: openRewards, render, paintWeapon, paintLocalWeapon,
      reset: () => { LS().removeItem(KEY); state = null; load(); render(); updateBadge(); return getRewards(); },
    };
  }
}
