// Worldwide lobby + leaderboard (Online tab). Backend: the existing Supabase project (free tier).
//  - Open games: Supabase Realtime *presence* on one global channel. Everyone inside a game tracks {room, name, avatar};
//    the list is built from who is present, so games vanish by themselves when the last player leaves (no table, no cleanup job).
//  - Joining a game = entering the existing multiplayer town (src/mp/town/town.js) with that room id (Realtime broadcast room).
//  - Leaderboard: public.lb_top / public.lb_submit (supabase/migrations/20261121_world_lobby_leaderboard.sql). Guests need no login.
import { sb, getUser, signInGoogle, signOut, googleEnabled, installNativeAuth } from './online.js';
import { profiles, openProfileScreen, syncOnSignIn, signedOut, onSyncStatus, watchTitle } from './cloud.js';
const $ = s => document.querySelector(s);
const LS = (() => { try { localStorage.setItem('__w', 1); localStorage.removeItem('__w'); return localStorage; } catch (e) { const m = {}; return { getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, removeItem: k => { delete m[k]; } }; } })();
const MAX_PLAYERS = 8;
const esc = t => String(t == null ? '' : t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = (crypto.getRandomValues(new Uint8Array(1))[0] & 15); return (c === 'x' ? r : (r & 3) | 8).toString(16); }));
const MOCK = () => /^(localhost|127\.0\.0\.1)$/.test(location.hostname) && new URLSearchParams(location.search).has('worldmock'); // screenshot hook, localhost only
const isLocal = () => /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
export const isTestRoom = (room, meta) => !!(meta && meta.test) || /^(w-test-|test-)/i.test(String(room || ''));

// ---------- identity: Google profile or guest (device id + secret + nickname) ----------
export function guest() {
  let g = null; try { g = JSON.parse(LS.getItem('atq.guest') || 'null'); } catch (e) { /* ignore */ }
  if (!g || !g.id || !g.secret) { g = { id: uuid(), secret: uuid().replace(/-/g, '') + uuid().replace(/-/g, ''), name: '' }; LS.setItem('atq.guest', JSON.stringify(g)); }
  return g;
}
export const cleanName = n => (String(n || '').replace(/[^\p{L}\p{N} _.\-]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 16));
export async function profile() {
  if (MOCK()) return { kind: 'guest', name: 'Keem', avatar: null, id: 'mock' };
  const u = await getUser().catch(() => null); const lp = (await profiles()).getProfile() || {};
  if (u && u.id) { const m = u.user_metadata || {}; return { kind: 'google', id: u.id, name: cleanName(lp.name) || cleanName(m.full_name || m.name || (u.email || '').split('@')[0]) || 'Survivor', avatar: lp.avatarUrl || (/^https:\/\//.test(m.avatar_url || m.picture || '') ? (m.avatar_url || m.picture) : null), email: u.email }; }
  const g = guest(); return { kind: 'guest', id: g.id, name: cleanName(lp.name || g.name) || '', avatar: null };
}
async function setName(p, n) { n = cleanName(n); if (!n) return; const PR = await profiles(); PR.saveProfile(Object.assign({}, PR.getProfile() || {}, { name: n })); }
const avatarHTML = (name, url, cls = 'wav') => url ? `<img class="${cls}" src="${esc(url)}" alt="" referrerpolicy="no-referrer">` : `<span class="${cls} wini" style="background:hsl(${[...String(name || '?')].reduce((a, c) => a + c.charCodeAt(0), 0) * 47 % 360} 35% 32%)">${esc((String(name || '?').trim()[0] || '?').toUpperCase())}</span>`;

// ---------- leaderboard ----------
export async function submitRun(run) {
  const p = await profile(); if (!p.name && p.kind === 'guest') { const g = guest(); g.name = 'Survivor' + String(Math.abs([...g.id].reduce((a, c) => a * 31 + c.charCodeAt(0) | 0, 7)) % 10000).padStart(4, '0'); LS.setItem('atq.guest', JSON.stringify(g)); p.name = g.name; }
  const g = guest(); const c = await sb();
  const args = { p_guest: p.kind === 'guest' ? g.id : null, p_secret: p.kind === 'guest' ? g.secret : null, p_name: p.name, p_kills: run.kills | 0, p_wave: run.wave | 0, p_hs: run.hs | 0, p_secs: Math.round(run.secs || 0) };
  const { data, error } = await c.rpc('lb_submit', args); if (error) throw new Error(error.message); return data;
}
const MOCK_ROWS = [['Nia_Rose', 34, 1611, 402], ['quietfalls', 29, 1380, 515], ['Keem', 27, 1204, 330], ['BigGus77', 22, 990, 120], ['DadMode', 19, 845, 201], ['Survivor4821', 14, 512, 98], ['RiversideRuth', 11, 402, 77], ['MrWalt', 8, 260, 31], ['zed_hunter', 6, 180, 44], ['LongNameSurvivor', 4, 96, 9]];
export async function topPlayers(sort = 'wave') {
  if (MOCK()) { const rows = MOCK_ROWS.map(([name, w, k, h], i) => ({ name, best_wave: w, total_kills: k, total_hs: h, avatar: null, me: name === 'Keem' })); const key = { wave: 'best_wave', kills: 'total_kills', hs: 'total_hs' }[sort]; rows.sort((a, b) => b[key] - a[key]); rows.forEach((r, i) => r.rank = i + 1); return { rows, me: rows.find(r => r.me), players: rows.length }; }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) throw new Error('You are offline. Check your connection and try again.');
  const p = await profile(); const c = await sb();
  const me = (p.kind === 'guest' && p.id && /^[0-9a-f-]{36}$/i.test(p.id)) ? p.id : null;
  const { data, error } = await c.rpc('lb_top', { p_sort: sort, p_limit: 50, p_me: me }); if (error) throw new Error(error.message);
  let d = data; if (typeof d === 'string') { try { d = JSON.parse(d); } catch (e) { throw new Error('Bad leaderboard response'); } }
  if (Array.isArray(d)) d = d[0] || {};
  if (!d || typeof d !== 'object') throw new Error('Bad leaderboard response');
  if (!Array.isArray(d.rows)) d.rows = [];
  return d;
}

// ---------- lobby presence ----------
let lob = null; // { ch, key, ready, rooms, onChange }
async function dropLobby() { const L = lob; lob = null; if (!L) return; try { L.ch && L.client && L.client.removeChannel(L.ch); } catch (e) { /* ignore */ } }
async function lobbyChannel() {
  if (lob && lob.ready) return lob; if (lob) await dropLobby();
  if (typeof navigator !== 'undefined' && navigator.onLine === false) throw new Error('You are offline.');
  const c = await sb(); const key = guest().id.slice(0, 8) + Math.random().toString(36).slice(2, 6);
  lob = { ch: c.channel('atq-world-lobby', { config: { presence: { key } } }), key, ready: false, rooms: [], viewers: 0, onChange: null, client: c };
  const L = lob;
  L.ch.on('presence', { event: 'sync' }, () => {
    const st = L.ch.presenceState(); const rooms = new Map(); let people = 0;
    for (const k in st) for (const m of st[k]) {
      if (isTestRoom(m.room, m)) continue;
      people++; if (!m.room) continue;
      const r = rooms.get(m.room) || { room: m.room, players: [], at: Infinity, host: '', avatar: null };
      r.players.push(m.name || 'Survivor'); if ((m.at || 0) < r.at) { r.at = m.at || 0; r.host = m.name || 'Survivor'; r.avatar = m.avatar || null; r.title = m.title || ''; }
      rooms.set(m.room, r);
    }
    L.rooms = [...rooms.values()].sort((a, b) => b.players.length - a.players.length || a.at - b.at); L.people = people; L.onChange && L.onChange();
  });
  try {
    await new Promise((res, rej) => { const t = setTimeout(() => rej(new Error('lobby timed out')), 10000); L.ch.subscribe(s => { if (s === 'SUBSCRIBED') { clearTimeout(t); L.ready = true; res(); } else if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT' || s === 'CLOSED') { clearTimeout(t); rej(new Error(s)); } }); });
  } catch (e) { await dropLobby(); throw e; }
  L.ch.on('system', { event: 'close' }, () => { L.ready = false; });
  return L;
}
const MOCK_ROOMS = [{ room: 'w-a1', host: 'Nia_Rose', title: "Nia_Rose's game", players: ['a', 'b', 'c', 'd', 'e'], avatar: null }, { room: 'w-b2', host: 'BigGus77', title: "BigGus77's game", players: ['a', 'b'], avatar: null }, { room: 'w-c3', host: 'LongNameSurvivor', title: "LongNameSurvivor's game", players: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'], avatar: null }];

// ---------- joining: character creator (existing) -> town in that room ----------
async function joinRoom(room, title, ui, opts = {}) {
  const test = !!(opts.test || isTestRoom(room));
  const PR = await profiles(); if (ui) ui.hide(); $('#title').classList.add('hidden');
  const back = (msg) => { try { window.__atq && window.__atq.hideLoading && window.__atq.hideLoading(); } catch (e) { /* ignore */ } $('#title').classList.remove('hidden'); if (ui) { ui.open('games'); if (msg) { const s = document.querySelector('#wGamesInfo'); if (s) { s.textContent = msg; s.classList.add('warn'); } } } };
  try {
    if (!PR.hasProfile()) { const made = await openProfileScreen('auto'); if (!made) { back(); return; } }
    const p = PR.getProfile(); const look = Object.assign({}, p.look, { name: p.name });
    let L = null;
    if (!test) {
      try { L = await lobbyChannel(); await L.ch.track({ room, title: title || (p.name + "'s game"), name: p.name, avatar: p.avatarUrl || null, at: Date.now() }); } catch (e) { console.warn('[world] could not list this game in the lobby:', e.message); }
    }
    const tw = await import('./town/town.js');
    await tw.enterTown({ look, room, onExit: () => { try { L && L.ch.untrack(); } catch (e) { /* ignore */ } back(); } });
  } catch (e) { console.warn('[world] join failed:', e && e.message); back("Couldn't start the game. " + (e && e.message ? e.message : 'Please try again.')); }
}

// ---------- UI ----------
let UI = null;
export function openOnline(tab = 'games') { if (!UI) UI = buildUI(); UI.open(tab); watchTitle(); return UI; }
function buildUI() {
  const root = document.createElement('div'); root.id = 'online'; root.className = 'screen hidden';
  root.innerHTML = `<div class="panel wpanel">
    <div class="whead"><button class="wback" aria-label="Back">‹ Back</button><h2>ONLINE</h2><span class="wnet" id="wNet">○ connecting…</span></div>
    <div class="wprof" id="wProf"></div>
    <div class="wflash hidden" id="wFlash" role="status"></div>
    <div class="wwel hidden" id="wWel"></div>
    <div class="wseg" role="tablist"><button data-t="games" role="tab">World Lobby</button><button data-t="board" role="tab">Leaderboard</button></div>
    <div class="wbody" id="wGames">
      <div class="wact"><button class="primary wbig" id="btnQuickJoin">Quick Join</button><button class="wbig" id="btnCreateGame">Create Game</button><button class="wbig" id="btnPractice">Practice Alone</button></div>
      <div class="wsub small" id="wGamesInfo">Open games from players anywhere in the world</div>
      <div class="wlist" id="wRooms"></div>
    </div>
    <div class="wbody hidden" id="wBoard">
      <div class="wseg wsort"><button data-s="wave">Best Wave</button><button data-s="kills">Kills</button><button data-s="hs">Headshots</button></div>
      <div class="wme" id="wMe"></div>
      <div class="wtable" id="wRows"></div>
      <div class="wsub small">Survival runs only · updates when a run ends</div>
    </div></div>`;
  document.body.append(root);
  const q = s => root.querySelector(s); let tab = 'games', sort = 'wave', prof = null;
  const ui = {
    show: () => { $('#title').classList.add('hidden'); root.classList.remove('hidden'); refreshProf(); if (tab === 'board') loadBoard(); installHook(ui); },
    hide: () => root.classList.add('hidden'),
    open: t => { setTab(t); ui.show(); connect(); },
    askName: then => editName(then),
  };
  q('.wback').onclick = () => { ui.hide(); $('#title').classList.remove('hidden'); };
  root.querySelectorAll('.wseg:not(.wsort) button').forEach(b => b.onclick = () => setTab(b.dataset.t));
  root.querySelectorAll('.wsort button').forEach(b => b.onclick = () => { sort = b.dataset.s; loadBoard(); });
  function setTab(t) { tab = t === 'board' ? 'board' : 'games'; root.querySelectorAll('.wseg:not(.wsort) button').forEach(b => b.classList.toggle('sel', b.dataset.t === tab)); const games = q('#wGames'), board = q('#wBoard'); if (games) games.classList.toggle('hidden', tab !== 'games'); if (board) board.classList.toggle('hidden', tab !== 'board'); if (tab === 'board') loadBoard(); }
  let syncing = false, pendingNew = null;
  onSyncStatus(w => { const e = q('#wSync'); if (e && w === 'saving') e.textContent = '☁ Saving…'; if (e && w === 'saved') e.textContent = '☁ Signed in with Google · synced'; if (w === 'conflict') flash('Loaded newer progress from your other device'); });
  function markOwner(id) { if (!id) return; try { localStorage.setItem('atq.profile.owner', id); } catch (e) { /* ignore */ } }
  function clearOwner() { try { localStorage.removeItem('atq.profile.owner'); } catch (e) { /* ignore */ } }
  async function refreshProf() {
    const el = q('#wProf'); if (!el) return;
    let gOn = false;
    try {
      prof = await profile(); gOn = MOCK() ? true : await googleEnabled();
      // just came back from Google: load the saved profile, or start a new one for this account
      if (prof.kind === 'google' && !MOCK() && !syncing && localStorage.getItem('atq.profile.owner') !== prof.id) {
        syncing = true; el.innerHTML = '<div class="wpn"><b>Loading your profile…</b><span class="small">Signed in with Google</span></div>';
        let r = null;
        try {
          // localhost-only hook so we can test the signed-in load path without a real Google session
          if (isLocal() && window.__ATQ_TEST_SYNC) {
            r = window.__ATQ_TEST_SYNC;
            if (r.applySave) { try { window.__atq && window.__atq.reloadSave && window.__atq.reloadSave(); } catch (e) { /* ignore */ } }
          } else r = await syncOnSignIn();
        } catch (e) { r = { state: 'error', msg: e.message }; }
        syncing = false;
        prof = await profile();
        if (r && r.state === 'new') { pendingNew = r; welcome('new'); return; }
        if (r && (r.state === 'loaded' || r.state === 'uploaded')) markOwner(prof.id);
        if (r && r.state === 'loaded') flash('Profile loaded: ' + (r.name || prof.name));
        if (r && r.state === 'error') flash('Could not load your cloud profile: ' + r.msg);
      }
      if (!MOCK() && !(await profiles()).hasProfile()) {
        q('#wWel') && q('#wWel').classList.add('hidden'); root.classList.remove('wfirst');
        el.innerHTML = `${avatarHTML('?', null)}<div class="wpn"><b>Guest</b><span class="small">Create a profile to join games.</span></div>
          <div class="wpb">${gOn ? '<button id="wGoogle" class="wg"><span class="gdot">G</span> Sign in</button>' : ''}<button id="wMakeProf" class="primary">Create profile</button></div>`;
        const go = q('#wGoogle'); if (go) go.onclick = () => google(go);
        const mk = q('#wMakeProf'); if (mk) mk.onclick = () => welcome(prof.kind === 'google' ? 'new' : 'first', gOn);
        return;
      }
      q('#wWel') && q('#wWel').classList.add('hidden'); root.classList.remove('wfirst');
      const nm = prof.name || 'Pick a name';
      el.innerHTML = `${avatarHTML(prof.name, prof.avatar)}<div class="wpn"><b>${esc(nm)}</b><span class="small" id="wSync">${prof.kind === 'google' ? '☁ Signed in with Google · synced' : 'Guest · saved on this device'}</span></div>
        <div class="wpb"><button id="wChar">Character</button><button id="wName">Name</button>${prof.kind === 'google' ? '<button id="wOut">Sign out</button>' : (gOn ? '<button id="wGoogle" class="wg"><span class="gdot">G</span> Sign in</button>' : '')}</div>`;
      const nmBtn = q('#wName'); if (nmBtn) nmBtn.onclick = () => editName();
      const chBtn = q('#wChar'); if (chBtn) chBtn.onclick = () => makeCharacter();
      const go = q('#wGoogle'); if (go) go.onclick = () => google(go);
      const out = q('#wOut'); if (out) out.onclick = async () => { clearOwner(); await signedOut(); await signOut().catch(() => {}); refreshProf(); };
    } catch (e) {
      syncing = false;
      try {
        el.innerHTML = `${avatarHTML((prof && prof.name) || '?', prof && prof.avatar)}<div class="wpn"><b>${esc((prof && prof.name) || 'Signed in')}</b><span class="small">Could not finish loading your profile${e && e.message ? ': ' + esc(e.message) : ''}</span></div>
          <div class="wpb"><button id="wRetryProf" class="primary">Retry</button>${gOn ? '<button id="wGoogle" class="wg"><span class="gdot">G</span> Sign in</button>' : ''}</div>`;
        const rb = q('#wRetryProf'); if (rb) rb.onclick = () => refreshProf();
        const go = q('#wGoogle'); if (go) go.onclick = () => google(go);
      } catch (e2) { /* keep whatever is on screen rather than crash */ }
    }
  }
  async function google(btn) { if (btn) { btn.disabled = true; btn.textContent = 'Opening Google…'; } try { await signInGoogle('online'); } catch (e) { if (btn) { btn.disabled = false; btn.textContent = 'Sign in with Google'; } flash('Google sign-in unavailable: ' + (e.message || e)); } }
  function flash(t) {
    const a = q('#wFlash');
    if (a) { a.textContent = t; a.classList.remove('hidden'); a.classList.add('warn'); clearTimeout(a._t); a._t = setTimeout(() => { a.classList.add('hidden'); a.classList.remove('warn'); a.textContent = ''; }, 5000); }
  }
  // first time in Online: Sign in (load a saved profile) or Create profile; 'new' = signed in but this account has no profile yet
  async function welcome(kind, gOn = true) {
    { // the profile screen from fix/customize (welcome, Google button, step-by-step creator)
      ui.hide(); const p = await openProfileScreen(kind === 'new' ? 'create' : 'auto');
      if (p && pendingNew) { const PR = await profiles(); PR.saveProfile(Object.assign({}, p, { uid: pendingNew.uid, email: pendingNew.email, avatarUrl: p.avatarUrl || pendingNew.avatarUrl })); pendingNew = null; }
      if (p) ui.show(); else $('#title').classList.remove('hidden'); return;
    }
    const w = q('#wWel'); w.classList.remove('hidden'); root.classList.add('wfirst');
    const nameStep = (signedIn) => {
      w.innerHTML = `<h3>${signedIn ? 'Create your profile' : 'Create a profile'}</h3><p class="small">${signedIn ? 'It saves to your Google account, so it loads on any phone or computer.' : 'Guest profile: it saves on this device only. You can sign in with Google later to keep it.'}</p>
        <form class="wnameform"><input id="wNewName" maxlength="16" placeholder="Nickname" value="${esc((pendingNew && pendingNew.suggest) || (prof && prof.name) || '')}" autocomplete="off"><button class="primary" type="submit">Next</button></form>
        <button class="wlink" id="wWelBack">‹ Other options</button>`;
      const f = w.querySelector('form'), inp = w.querySelector('input'); setTimeout(() => inp.focus(), 50);
      f.onsubmit = async e => { e.preventDefault(); const n = cleanName(inp.value); if (n.length < 2) { inp.classList.add('bad'); return; } const PR = await profiles(); PR.saveProfile(Object.assign({ name: n }, pendingNew ? { uid: pendingNew.uid, email: pendingNew.email, avatarUrl: pendingNew.avatarUrl } : {})); pendingNew = null; charStep(); };
      w.querySelector('#wWelBack').onclick = () => signedIn ? (signOut().catch(() => {}).then(() => { pendingNew = null; refreshProf(); })) : welcome('first', gOn);
    };
    const charStep = () => {
      w.innerHTML = `<h3>Make your character</h3><p class="small">Pick skin, face, hair and outfit for the character you play online. You can change it any time.</p>
        <div class="wact"><button class="primary wbig" id="wMake">Make my character</button><button class="wbig" id="wSkip">Later</button></div>`;
      w.querySelector('#wMake').onclick = () => makeCharacter(); w.querySelector('#wSkip').onclick = () => refreshProf();
    };
    if (kind === 'new') { nameStep(true); return; }
    w.innerHTML = `<h3>Your profile</h3><p class="small">Your name, character, cash, stats and leaderboard rank.</p>
      <div class="wwbtns">${gOn ? `<button class="wg wbig" id="wWelG"><span class="gdot">G</span><span><b>Sign in with Google</b><small>Load your saved profile on any device</small></span></button>` : ''}
      <button class="primary wbig" id="wWelNew"><span><b>Create profile</b><small>${gOn ? 'Play as a guest · saves on this device' : 'Saves on this device'}</small></span></button></div>`;
    const g = w.querySelector('#wWelG'); if (g) g.onclick = () => google(g);
    w.querySelector('#wWelNew').onclick = () => nameStep(false);
  }
  // existing multiplayer character creator; the result becomes the profile's character (and syncs if signed in)
  async function makeCharacter() {
    ui.hide(); $('#title').classList.add('hidden'); await openProfileScreen('edit'); $('#title').classList.remove('hidden'); ui.show();
  }
  function editName(then) {
    const el = q('#wProf'); el.innerHTML = `<form class="wnameform"><input id="wNameIn" maxlength="16" placeholder="Your nickname" value="${esc(prof && prof.name || '')}" autocomplete="off"><button class="primary" type="submit">Save</button><button type="button" id="wNameX">Cancel</button></form>`;
    const f = el.querySelector('form'), inp = el.querySelector('input'); setTimeout(() => inp.focus(), 50);
    f.onsubmit = e => { e.preventDefault(); const n = cleanName(inp.value); if (n.length < 2) { inp.classList.add('bad'); return; } setName(prof, n); refreshProf().then(() => then && then()); };
    el.querySelector('#wNameX').onclick = () => refreshProf();
  }
  function toast(t) { const s = q('#wGamesInfo'); s.textContent = t; s.classList.add('warn'); setTimeout(() => s.classList.remove('warn'), 4000); }
  function renderRooms(rooms) {
    const el = q('#wRooms');
    if (!rooms.length) { el.innerHTML = `<div class="wempty">No open games right now.<br><span class="small">Tap <b>Create Game</b> and others can join you.</span></div>`; return; }
    el.innerHTML = rooms.map(r => { const n = r.players.length, full = n >= MAX_PLAYERS; return `<div class="wroom">${avatarHTML(r.host, r.avatar)}<div class="wrn"><b>${esc(r.title || r.host + "'s game")}</b><span class="small">Quiet Falls · free roam</span></div><span class="wcnt${full ? ' full' : ''}">${n}/${MAX_PLAYERS}</span><button data-room="${esc(r.room)}" ${full ? 'disabled' : ''}>${full ? 'Full' : 'Join'}</button></div>`; }).join('');
    el.querySelectorAll('button[data-room]').forEach(b => b.onclick = () => { const r = rooms.find(x => x.room === b.dataset.room); joinRoom(r.room, r.title, ui); });
  }
  let rooms = [];
  async function connect() {
    const net = q('#wNet'); net.textContent = '○ Connecting…'; net.classList.remove('on');
    const roomsEl = q('#wRooms'); if (roomsEl) roomsEl.innerHTML = '<div class="wempty small">Connecting…</div>';
    if (MOCK()) { rooms = MOCK_ROOMS; net.textContent = '● Online · 23 players'; net.classList.add('on'); renderRooms(rooms); return; }
    try {
      const L = await lobbyChannel();
      L.onChange = () => { rooms = L.rooms; const n = L.people || 0; net.textContent = n ? ('● Online · ' + n + ' player' + (n === 1 ? '' : 's')) : '● Online · no one else yet'; net.classList.add('on'); renderRooms(rooms); };
      try {
        await Promise.race([
          L.ch.track({ name: (prof && prof.name) || 'Survivor', at: Date.now() }),
          new Promise((_, rej) => setTimeout(() => rej(new Error('presence timed out')), 8000))
        ]);
      } catch (te) { /* subscribed but presence track hung or failed — still show the lobby */ }
      L.onChange();
    }
    catch (e) { net.textContent = '○ Offline'; net.classList.remove('on'); q('#wRooms').innerHTML = `<div class="wempty">Can't reach the online lobby.<br><span class="small">${esc(e.message || 'Check your connection and try again.')}</span><br><button id="wRetry">Retry</button></div>`; const rb = q('#wRetry'); if (rb) rb.onclick = connect; }
  }
  q('#btnCreateGame').onclick = async () => { const p = await profile(); joinRoom('w-' + Math.random().toString(36).slice(2, 8), (p.name || 'Survivor') + "'s game", ui); };
  q('#btnQuickJoin').onclick = async () => { const open = rooms.filter(r => r.players.length < MAX_PLAYERS); if (open.length) { const r = open[0]; joinRoom(r.room, r.title, ui); } else { const p = await profile(); joinRoom('w-' + Math.random().toString(36).slice(2, 8), (p.name || 'Survivor') + "'s game", ui); } };
  q('#btnPractice').onclick = async () => {
    const PR = await profiles(); if (!PR.hasProfile()) { ui.hide(); const made = await openProfileScreen('auto'); if (!made) { $('#title').classList.remove('hidden'); ui.open('games'); return; } ui.show(); }
    const p = PR.getProfile(); ui.hide(); $('#title').classList.add('hidden');
    try { const tw = await import('./town/town.js'); await tw.enterTown({ look: Object.assign({}, p.look, { name: p.name }), solo: true, onExit: () => { $('#title').classList.remove('hidden'); ui.open('games'); } }); }
    catch (e) { $('#title').classList.remove('hidden'); ui.open('games'); const s = q('#wGamesInfo'); if (s) { s.textContent = "Couldn't start practice. " + (e.message || 'Please try again.'); s.classList.add('warn'); } }
  };
  async function loadBoard() {
    root.querySelectorAll('.wsort button').forEach(b => b.classList.toggle('sel', b.dataset.s === sort));
    const rowsEl = q('#wRows'), meEl = q('#wMe'); rowsEl.innerHTML = '<div class="wempty small">Loading…</div>';
    try {
      const d = await topPlayers(sort); const rows = d.rows || [];
      const head = `<div class="wtr wth"><span class="wrk">#</span><span class="wnm">Player</span><span class="${sort === 'wave' ? 'on' : ''}">Wave</span><span class="${sort === 'kills' ? 'on' : ''}">Kills</span><span class="${sort === 'hs' ? 'on' : ''}">Head</span></div>`;
      rowsEl.innerHTML = rows.length ? head + rows.map(r => `<div class="wtr${r.me ? ' me' : ''}"><span class="wrk">${r.rank <= 3 ? ['🥇', '🥈', '🥉'][r.rank - 1] : r.rank}</span><span class="wnm">${avatarHTML(r.name, r.avatar, 'wav sm')}<b>${esc(r.name)}</b></span><span>${r.best_wave}</span><span>${r.total_kills}</span><span>${r.total_hs}</span></div>`).join('') : '<div class="wempty">No scores yet.<br><span class="small">Finish a Survival run to be the first on the board.</span></div>';
      const m = d.me; meEl.innerHTML = m ? `<div class="wstat"><b>#${m.rank}</b><span>Your rank</span></div><div class="wstat"><b>${m.best_wave}</b><span>Best wave</span></div><div class="wstat"><b>${m.total_kills}</b><span>Kills</span></div><div class="wstat"><b>${m.total_hs}</b><span>Headshots</span></div>` : `<div class="wstat wide"><span>Play Survival and your kills, best wave and headshots show up here.</span></div>`;
    } catch (e) { rowsEl.innerHTML = `<div class="wempty">Can't load the leaderboard.<br><span class="small">${esc(e.message || e)}</span><br><button id="wBoardRetry">Retry</button></div>`; meEl.innerHTML = ''; const rb = q('#wBoardRetry'); if (rb) rb.onclick = loadBoard; }
  }
  installHook(ui);
  return ui;
}

function installHook(ui) {
  if (typeof window === 'undefined' || !isLocal()) return;
  window.__atqWorld = Object.assign(window.__atqWorld || {}, {
    openOnline, joinRoom, topPlayers, isTestRoom, ui,
    joinTestRoom: (room, title) => { if (!UI) UI = buildUI(); return joinRoom(room, title || 'Test game', UI, { test: true }); },
  });
}

// Called once at boot: Android sign-in return + reopen the Online screen after a Google redirect.
export function bootOnline() {
  watchTitle();
  installNativeAuth(() => { try { LS.removeItem('atq.online.resume'); } catch (e) { /* ignore */ } if (UI) UI.show(); else if (!$('#title').classList.contains('hidden')) openOnline(); }).catch(() => {});
  try { const t = +LS.getItem('atq.online.resume'); if (t) { LS.removeItem('atq.online.resume'); if (Date.now() - t < 10 * 60e3) { let n = 0; const iv = setInterval(() => { const ti = $('#title'); if (++n > 120) clearInterval(iv); if (ti && !ti.classList.contains('hidden')) { clearInterval(iv); openOnline(); } }, 500); } } } catch (e) { /* ignore */ }
}

// localhost-only hook so smokes can join a private test room that is never listed in the public lobby
if (typeof window !== 'undefined') installHook(null);
