// Profile cloud sync for Google accounts (guests stay local-only). Owns: Supabase auth -> profile pull/push.
//
// LOCAL PROFILE INTERFACE: fix/customize ships src/mp/profile.js with
//   getProfile() -> profile|null, saveProfile(p) -> profile, hasProfile(), onProfileChange(cb), registerProfileSync({ pull, push })
//   profile = { v:1, name, uid, email, avatarUrl, sel, look, cash, owned, stats, createdAt, updatedAt }
// Cloud: public.profile_load / public.profile_save (supabase/migrations/20261121_profile_sync.sql, own-row RLS). The cloud copy holds
// the whole story save (cash, weapons, outfits, progress), selections, character, name, photo and Survival best.
import { sb, getUser } from './online.js';
const LSx = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } }, del: k => { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } } };
const rd = k => { try { return JSON.parse(LSx.get(k) || 'null'); } catch (e) { return null; } }, wr = (k, v) => LSx.set(k, JSON.stringify(v));
const META = 'atq.profile.v1', SEL = 'atq3.look', LOOK = 'atq.mp.look.v1', SAVE = 'atq3_save', BEST = 'atq3.survBest';
const revKey = uid => 'atq.profile.rev.' + uid;

// ONE profile data layer: fix/customize's src/mp/profile.js (used by profileui.js, the new creator, My Character and the town).
// This module only adds the cloud: it registers itself as profile.js's sync hook (pull after Google sign-in, push after every save).
import * as PROFILE from './profile.js';
let P = PROFILE; PROFILE.registerProfileSync({ pull: (u) => pull(u), push: (p) => push(p) });
const ready = Promise.resolve(PROFILE);
export const profiles = () => ready;
export const profileScreen = () => import('./profileui.js');
/** The profile screen (welcome / create / edit) with Google sign-in that comes back to the Online tab. Resolves with the profile or null. */
export async function openProfileScreen(mode = 'auto') { await autoSync().catch(() => {}); const { openProfile } = await import('./profileui.js'); return openProfile({ mode, onSignIn: async () => { const o = await import('./online.js'); await o.signInGoogle('online'); } }); }
/** Signed in with Google but this device has not loaded that account's profile yet (e.g. right after the redirect): do it now. */
let autoP = null;
export function autoSync() { if (autoP) return autoP; autoP = (async () => { const u = await getUser().catch(() => null); if (!u || !u.id) return { state: 'guest' }; const cur = PROFILE.getProfile(); if (cur && cur.uid === u.id) return { state: 'synced' }; return syncOnSignIn(); })().finally(() => { setTimeout(() => { autoP = null; }, 3000); }); return autoP; }

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
export async function signedOut() { try { localStorage.removeItem('atq.profile.owner'); } catch (e) { /* ignore */ } const PR = await ready; const cur = PR.getProfile(); if (cur && cur.uid) PR.saveProfile(Object.assign({}, cur, { uid: null, email: null, avatarUrl: null }), { silent: true }); }
// push whenever the title screen comes back (after a run, the shop, the character screen) and something changed
export function watchTitle() {
  const t = document.getElementById('title'); if (!t || t.__pw) return; t.__pw = true; let last = null;
  new MutationObserver(async () => { if (t.classList.contains('hidden')) return; const s = (LSx.get(SAVE) || '') + (LSx.get(LOOK) || '') + (LSx.get(SEL) || '') + (LSx.get(BEST) || ''); if (last !== null && s !== last) { const PR = await ready; const p = PR.getProfile(); if (p && p.uid) push(p).catch(() => {}); } last = s; }).observe(t, { attributes: true, attributeFilter: ['class'] });
}
