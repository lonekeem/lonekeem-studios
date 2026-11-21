// Profile cloud sync for Google accounts (guests stay local-only). Owns: Supabase auth -> profile pull/push.
//
// LOCAL PROFILE INTERFACE: fix/customize ships src/mp/profile.js with
//   getProfile() -> profile|null, saveProfile(p) -> profile, hasProfile(), onProfileChange(cb), registerProfileSync({ pull, push })
//   profile = { v:1, name, uid, email, avatarUrl, sel, look, cash, owned, stats, createdAt, updatedAt }
// When that file is in the build it is used (found with import.meta.glob, so this branch also builds without it) and this module
// registers itself as its sync hook. Until then FALLBACK below implements the same interface on the same storage keys
// (atq.profile.v1 meta, atq3.look selections, atq.mp.look.v1 character, atq3_save cash/outfits), so profiles made now carry over.
// Cloud: public.profile_load / public.profile_save (supabase/migrations/20261121_profile_sync.sql, own-row RLS). The cloud copy holds
// the whole story save (cash, weapons, outfits, progress), selections, character, name, photo and Survival best.
import { sb, getUser } from './online.js';
const LSx = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } }, del: k => { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } } };
const rd = k => { try { return JSON.parse(LSx.get(k) || 'null'); } catch (e) { return null; } }, wr = (k, v) => LSx.set(k, JSON.stringify(v));
const META = 'atq.profile.v1', SEL = 'atq3.look', LOOK = 'atq.mp.look.v1', SAVE = 'atq3_save', BEST = 'atq3.survBest';
const revKey = uid => 'atq.profile.rev.' + uid;

const FALLBACK = (() => {
  const listeners = new Set(); let sync = null;
  const story = () => (window.__atq && window.__atq.save) || rd(SAVE) || { v: 3, step: 0, cash: 0, xp: 0, level: 1, owned: ['fists'], outfits: ['classic'] };
  const hasProfile = () => !!rd(META);
  const getProfile = () => { const m = rd(META); if (!m) return null; const s = story(); return { v: 1, name: m.name || 'Survivor', uid: m.uid || null, email: m.email || null, avatarUrl: m.avatarUrl || null, sel: rd(SEL), look: rd(LOOK), cash: s.cash | 0, owned: [...new Set(['classic', ...(s.outfits || [])])], level: s.level || 1, stats: Object.assign({ kills: s.kills || 0 }, m.stats || {}), createdAt: m.createdAt || Date.now(), updatedAt: m.updatedAt || 0 }; };
  const saveProfile = (p, { silent = false } = {}) => {
    if (!p) return null; const now = Date.now(), old = rd(META) || {}; const name = String(p.name || old.name || 'Survivor').replace(/[<>]/g, '').trim().slice(0, 18) || 'Survivor';
    wr(META, { v: 1, name, uid: p.uid !== undefined ? p.uid : (old.uid || null), email: p.email !== undefined ? p.email : (old.email || null), avatarUrl: p.avatarUrl !== undefined ? p.avatarUrl : (old.avatarUrl || null), stats: p.stats || old.stats || {}, createdAt: old.createdAt || now, updatedAt: now });
    if (p.sel) wr(SEL, p.sel); if (p.look) wr(LOOK, Object.assign({}, p.look, { name }));
    if (p.cash != null || Array.isArray(p.owned)) { const s = story(); if (p.cash != null && isFinite(p.cash)) s.cash = Math.max(0, Math.floor(p.cash)); if (Array.isArray(p.owned)) s.outfits = [...new Set(['classic', ...(s.outfits || []), ...p.owned])]; const j = JSON.stringify(s); LSx.set(SAVE, j); LSx.set(SAVE + '.bak', j); }
    const out = getProfile(); if (!silent) { listeners.forEach(cb => { try { cb(out); } catch (e) { /* ignore */ } }); if (out.uid && sync && sync.push) Promise.resolve().then(() => sync.push(out)).catch(e => console.warn('profile push', e)); }
    return out;
  };
  const pullProfile = async user => { if (!sync || !sync.pull || !user) return null; const p = await sync.pull(user); if (!p) return null; return saveProfile(Object.assign({}, p, { uid: p.uid || user.id || null }), { silent: true }); };
  return { hasProfile, getProfile, saveProfile, onProfileChange: cb => { listeners.add(cb); return () => listeners.delete(cb); }, registerProfileSync: h => { sync = h || null; }, pullProfile, deleteLocalProfile: () => LSx.del(META) };
})();

// fix/customize's module when it is in the build, else the fallback
const found = import.meta.glob(['./profile.js', './profileui.js']);
let P = null; const ready = (async () => { try { P = found['./profile.js'] ? await found['./profile.js']() : FALLBACK; } catch (e) { P = FALLBACK; } P.registerProfileSync({ pull, push }); return P; })();
export const profiles = () => ready;
/** fix/customize's full profile screen (welcome + step-by-step character) if it is in the build, else null */
export const profileScreen = async () => (found['./profileui.js'] ? found['./profileui.js']() : null);

// ---------- cloud hooks ----------
const status = new Set(); export const onSyncStatus = fn => { status.add(fn); return () => status.delete(fn); };
const emit = (w, d) => status.forEach(fn => { try { fn(w, d); } catch (e) { /* ignore */ } });
const payload = () => ({ v: 1, save: rd(SAVE), sel: rd(SEL), survBest: +(LSx.get(BEST) || 0), stats: (rd(META) || {}).stats || {} });
function applyCloudData(d) { if (!d) return; if (d.save && typeof d.save === 'object') { const j = JSON.stringify(d.save); LSx.set(SAVE, j); LSx.set(SAVE + '.bak', j); } if (d.sel) wr(SEL, d.sel); if (d.survBest) LSx.set(BEST, String(Math.max(+(LSx.get(BEST) || 0), d.survBest | 0))); try { window.__atq && window.__atq.reloadSave && window.__atq.reloadSave(); } catch (e) { /* ignore */ } }
const gAvatar = u => { const m = (u && u.user_metadata) || {}; const a = m.avatar_url || m.picture || ''; return /^https:\/\//.test(a) ? a : null; };
/** pull(user): the saved cloud profile for this Google account, or null when it has none yet. */
async function pull(user) {
  const c = await sb(); const { data, error } = await c.rpc('profile_load'); if (error) throw new Error(error.message);
  if (!data || !data.exists) { LSx.set(revKey(user.id), '0'); return null; }
  applyCloudData(data.data); LSx.set(revKey(user.id), String(data.rev || 0)); emit('loaded', data);
  return { name: data.name || 'Survivor', uid: user.id, email: user.email || null, avatarUrl: data.avatar || gAvatar(user), look: data.look || null, sel: data.data.sel || null, stats: data.data.stats || {} };
}
let busy = false, again = false, pushT = 0;
/** push(profile): save this device's profile to the cloud (newest wins: if another device saved first, its copy is loaded instead). */
async function push(p) {
  if (!p || !p.uid) return; const u = await getUser(); if (!u || u.id !== p.uid) return; if (busy) { again = true; return; } busy = true; emit('saving');
  try {
    const c = await sb(); const { data, error } = await c.rpc('profile_save', { p_name: p.name || 'Survivor', p_avatar: p.avatarUrl || null, p_look: p.look || null, p_data: payload(), p_rev: +(LSx.get(revKey(u.id)) || 0), p_force: false });
    if (error) throw new Error(error.message);
    if (data.conflict) { applyCloudData(data.data); LSx.set(revKey(u.id), String(data.rev)); emit('conflict', data); } else { LSx.set(revKey(u.id), String(data.rev)); emit('saved', data); }
  } catch (e) { emit('error', e.message); if (/too fast/.test(e.message)) again = true; else throw e; }
  finally { busy = false; if (again) { again = false; clearTimeout(pushT); pushT = setTimeout(() => { const q = P && P.getProfile(); q && push(q).catch(() => {}); }, 2500); } }
}
/** After Google sign-in: load the saved profile ('loaded'), or tell the UI to create one ('new'). */
export async function syncOnSignIn() {
  const u = await getUser(); if (!u || !u.id) return { state: 'guest' }; const PR = await ready;
  const got = await PR.pullProfile(u);
  if (got) return { state: 'loaded', name: got.name };
  const cur = PR.getProfile(); const m = u.user_metadata || {};
  if (cur) { PR.saveProfile(Object.assign({}, cur, { uid: u.id, email: u.email || null, avatarUrl: cur.avatarUrl || gAvatar(u) })); return { state: 'uploaded', name: cur.name }; } // device profile becomes this account's profile
  return { state: 'new', suggest: String(m.full_name || m.name || '').replace(/[^\p{L}\p{N} _.\-]/gu, '').trim().slice(0, 16), uid: u.id, email: u.email || null, avatarUrl: gAvatar(u) };
}
/** Signing out: this device keeps the profile as a guest copy, but it stops syncing. */
export async function signedOut() { const PR = await ready; const cur = PR.getProfile(); if (cur && cur.uid) PR.saveProfile(Object.assign({}, cur, { uid: null, email: null, avatarUrl: null }), { silent: true }); }
// push whenever the title screen comes back (after a run, the shop, the character screen) and something changed
export function watchTitle() {
  const t = document.getElementById('title'); if (!t || t.__pw) return; t.__pw = true; let last = null;
  new MutationObserver(async () => { if (t.classList.contains('hidden')) return; const s = (LSx.get(SAVE) || '') + (LSx.get(LOOK) || '') + (LSx.get(SEL) || '') + (LSx.get(BEST) || ''); if (last !== null && s !== last) { const PR = await ready; const p = PR.getProfile(); if (p && p.uid) push(p).catch(() => {}); } last = s; }).observe(t, { attributes: true, attributeFilter: ['class'] });
}
