// Player profile: local data + cloud sync for Google accounts (guests stay local-only).
//
// LOCAL INTERFACE (shared with fix/customize): getProfile() -> profile, saveProfile(profile) -> profile.
//   profile = { v: 1, name, avatar, look, sel, save, survBest, updatedAt }
//     name      nickname (<= 16 chars)            avatar   Google photo URL or null
//     look      multiplayer character (mp look JSON, 'atq.mp.look.v1')
//     sel       character-screen selections ('atq3.look'; outfits/hair/face/skin picks)
//     save      the story save ('atq3_save': cash, owned weapons, outfits, items, kills, progress)
//     survBest  best Survival wave
// If fix/customize ships its own getProfile/saveProfile, register it with setLocalProfileAdapter({ getProfile, saveProfile })
// and the cloud sync below keeps working unchanged. Cloud: public.profile_load / public.profile_save
// (supabase/migrations/20261121_profile_sync.sql, own-row RLS).
import { sb, getUser } from './online.js';
const LSx = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } }, del: k => { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } } };
const J = (k, d = null) => { try { const v = JSON.parse(LSx.get(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } };
const K = { name: 'atq.profile.name', avatar: 'atq.profile.avatar', created: 'atq.profile.created', look: 'atq.mp.look.v1', sel: 'atq3.look', save: 'atq3_save', best: 'atq3.survBest', upd: 'atq.profile.updatedAt', owner: 'atq.profile.owner' };
const revKey = uid => 'atq.profile.rev.' + uid;

function localGet() {
  const g = J('atq.guest', {});
  return { v: 1, name: LSx.get(K.name) || g.name || '', avatar: LSx.get(K.avatar) || null, look: J(K.look), sel: J(K.sel), save: J(K.save), survBest: +(LSx.get(K.best) || 0), updatedAt: +(LSx.get(K.upd) || 0) };
}
function localSave(p) {
  if (p.name != null) { LSx.set(K.name, p.name); const g = J('atq.guest', null); if (g) { g.name = p.name; LSx.set('atq.guest', JSON.stringify(g)); } }
  if (p.avatar !== undefined) p.avatar ? LSx.set(K.avatar, p.avatar) : LSx.del(K.avatar);
  if (p.look) LSx.set(K.look, JSON.stringify(p.look));
  if (p.sel) LSx.set(K.sel, JSON.stringify(p.sel));
  if (p.save) { const j = JSON.stringify(p.save); LSx.set(K.save, j); LSx.set(K.save + '.bak', j); }
  if (p.survBest != null) LSx.set(K.best, String(Math.max(+(LSx.get(K.best) || 0), p.survBest | 0)));
  return localGet();
}
let adapter = { getProfile: localGet, saveProfile: localSave };
export function setLocalProfileAdapter(a) { if (a && a.getProfile && a.saveProfile) adapter = a; }
export const hasProfile = () => LSx.get(K.created) === '1';
export function getProfile() { return adapter.getProfile(); }
/** Save locally; if signed in with Google, also push to the cloud (debounced). */
export function saveProfile(p) { const out = adapter.saveProfile(Object.assign({}, p)); LSx.set(K.upd, String(Date.now())); LSx.set(K.created, '1'); schedulePush(); return out; }
export function markCreated(name) { if (name) localSave({ name }); LSx.set(K.created, '1'); schedulePush(); }

// ---------- cloud ----------
let pushT = 0, busy = false; const listeners = new Set();
export const onProfileChange = fn => { listeners.add(fn); return () => listeners.delete(fn); };
const emit = (what, d) => listeners.forEach(fn => { try { fn(what, d); } catch (e) { /* ignore */ } });
function schedulePush() { clearTimeout(pushT); pushT = setTimeout(() => pushProfile().catch(e => console.warn('[profile] push failed', e.message)), 1500); }
const payload = p => ({ save: p.save, sel: p.sel, survBest: p.survBest, v: 1 });
/** After Google sign-in: load the saved cloud profile onto this device, or create one from this device's data. */
export async function syncOnSignIn() {
  const u = await getUser(); if (!u || !u.id) return { state: 'guest' };
  const c = await sb(); const { data, error } = await c.rpc('profile_load'); if (error) throw new Error(error.message);
  const m = u.user_metadata || {}; const gAvatar = /^https:\/\//.test(m.avatar_url || m.picture || '') ? (m.avatar_url || m.picture) : null;
  if (data && data.exists) {
    adapter.saveProfile({ name: data.name || '', avatar: data.avatar || gAvatar, look: data.look || null, sel: data.data.sel || null, save: data.data.save || null, survBest: data.data.survBest || 0 });
    LSx.set(revKey(u.id), String(data.rev || 0)); LSx.set(K.owner, u.id); LSx.set(K.created, '1'); LSx.set(K.upd, String(Date.now()));
    try { window.__atq && window.__atq.reloadSave && window.__atq.reloadSave(); } catch (e) { /* ignore */ }
    emit('loaded', data); return { state: 'loaded', name: data.name };
  }
  // no cloud profile yet for this Google account
  if (!LSx.get(K.name)) localSave({ name: (m.full_name || m.name || '').replace(/[^\p{L}\p{N} _.\-]/gu, '').trim().slice(0, 16) });
  localSave({ avatar: gAvatar }); LSx.set(K.owner, u.id); LSx.set(revKey(u.id), '0');
  return { state: 'new', name: LSx.get(K.name) };
}
export async function pushProfile(force = false) {
  const u = await getUser(); if (!u || !u.id || LSx.get(K.owner) !== u.id || !hasProfile()) return null; if (busy) { schedulePush(); return null; } busy = true;
  try {
    const p = adapter.getProfile(); const c = await sb();
    const { data, error } = await c.rpc('profile_save', { p_name: p.name || 'Survivor', p_avatar: p.avatar || null, p_look: p.look || null, p_data: payload(p), p_rev: +(LSx.get(revKey(u.id)) || 0), p_force: force });
    if (error) throw new Error(error.message);
    if (data.conflict) { // another device saved since we loaded: newest copy wins -> load it
      adapter.saveProfile({ sel: data.data.sel || null, save: data.data.save || null, survBest: data.data.survBest || 0 }); LSx.set(revKey(u.id), String(data.rev));
      try { window.__atq && window.__atq.reloadSave && window.__atq.reloadSave(); } catch (e) { /* ignore */ }
      emit('conflict', data); return data;
    }
    LSx.set(revKey(u.id), String(data.rev)); emit('saved', data); return data;
  } finally { busy = false; }
}
/** Signing out keeps this device's data as a local guest profile, but stops syncing it. */
export function signedOut() { LSx.del(K.owner); LSx.del(K.avatar); emit('signedout'); }
// keep the cloud copy fresh: whenever the title screen comes back (after a run, shop, character screen) push changes
export function watchTitle() {
  const t = document.getElementById('title'); if (!t || t.__pw) return; t.__pw = true; let last = '';
  new MutationObserver(() => { if (t.classList.contains('hidden')) return; const s = (LSx.get(K.save) || '') + (LSx.get(K.look) || '') + (LSx.get(K.sel) || '') + (LSx.get(K.best) || ''); if (s !== last) { last = s; if (LSx.get(K.owner)) schedulePush(); } }).observe(t, { attributes: true, attributeFilter: ['class'] });
}
