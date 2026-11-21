// v1.9.28 Player profile: ONE local object for the player's online identity + character + wallet. Pure data, no three.js, no network.
//
//   getProfile()        -> profile | null   (null = no profile created yet on this device)
//   saveProfile(p)      -> profile          (validates, writes everything locally, notifies listeners, then calls the sync hook's push)
//   hasProfile()        -> boolean
//   onProfileChange(cb) -> unsubscribe fn   (cb(profile) after every save)
//   registerProfileSync({ pull(user) => Promise<profile|null>, push(profile) => Promise<void> })
//        the online/lobby code (Supabase auth + cloud sync) plugs in here. pull() is called after Google sign-in to load a saved
//        profile; push() is called (fire-and-forget) after every local save. Guests never call it (profile.uid == null).
//   pullProfile(user)   -> Promise<profile|null>  (runs the hook's pull and saves the result locally)
//
// profile = { v: 1, name, uid (Supabase user id or null for guests), email, avatarUrl, sel, look, cash, owned, stats, createdAt, updatedAt }
//   sel   : the simple choices from the profile screen { outfit, hair, hairColor, face, beard, skin, eyes, pack, glasses, build }
//   look  : the full multiplayer avatar look (src/mp/look.js format) that is rendered and sent to other players
//   cash  : the shared wallet (same number as story / Survival / town cash), owned: bought outfit ids, stats: free-form (kills etc.)
// Storage: cash + owned live in the story save (atq3_save) so every mode spends the same money; sel in atq3.look; look in atq.mp.look.v1;
// identity/meta in atq.profile.v1. The in-memory story save (window.__atq.save) is updated too, so the story never overwrites it.
import * as K from './look.js';

const META = 'atq.profile.v1', SAVE = 'atq3_save', SEL = 'atq3.look';
const rd = (k) => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } };
const wr = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage full / private mode */ } };
const listeners = new Set(); let sync = null;
export const DEFAULT_SEL = { outfit: 'classic', hair: 'crop', hairColor: '#0b0806', face: 'keem', beard: 'none', skin: '#6a4430', eyes: '#2a1608', pack: false, glasses: false, build: 1 };

function storySave() { const live = typeof window !== 'undefined' && window.__atq && window.__atq.save; return live || rd(SAVE) || { v: 3, step: 0, cash: 0, xp: 0, level: 1, owned: ['fists'], outfits: ['classic'] }; }
function writeStory(s) { const j = JSON.stringify(s); try { localStorage.setItem(SAVE, j); localStorage.setItem(SAVE + '.bak', j); } catch (e) { /* ignore */ } }

export function hasProfile() { return !!rd(META); }
export function getProfile() {
  const m = rd(META); if (!m) return null; const s = storySave();
  return { v: 1, name: m.name || 'Survivor', uid: m.uid || null, email: m.email || null, avatarUrl: m.avatarUrl || null,
    sel: Object.assign({}, DEFAULT_SEL, rd(SEL) || {}), look: K.loadLook() || K.defaultLook('mp_m1'), cash: s.cash | 0, owned: [...new Set(['classic', ...(s.outfits || [])])],
    level: s.level || 1, stats: Object.assign({ kills: s.kills || 0 }, m.stats || {}), createdAt: m.createdAt || Date.now(), updatedAt: m.updatedAt || 0 };
}
export function saveProfile(p, { silent = false } = {}) {
  if (!p) return null; const now = Date.now(); const old = rd(META) || {};
  const name = String(p.name || old.name || 'Survivor').replace(/[<>]/g, '').trim().slice(0, 18) || 'Survivor';
  wr(META, { v: 1, name, uid: p.uid ?? old.uid ?? null, email: p.email ?? old.email ?? null, avatarUrl: p.avatarUrl ?? old.avatarUrl ?? null, stats: p.stats || old.stats || {}, createdAt: old.createdAt || p.createdAt || now, updatedAt: now });
  if (p.sel) wr(SEL, Object.assign({}, DEFAULT_SEL, p.sel));
  if (p.look) K.saveLook(Object.assign({}, p.look, { name }));
  const s = storySave(); if (p.cash != null && isFinite(p.cash)) s.cash = Math.max(0, Math.floor(p.cash)); if (Array.isArray(p.owned)) s.outfits = [...new Set(['classic', ...(s.outfits || []), ...p.owned])]; writeStory(s);
  const out = getProfile(); if (!silent) { listeners.forEach(cb => { try { cb(out); } catch (e) { console.warn(e); } }); if (out.uid && sync && sync.push) Promise.resolve().then(() => sync.push(out)).catch(e => console.warn('profile push', e)); }
  return out;
}
export function onProfileChange(cb) { listeners.add(cb); return () => listeners.delete(cb); }
export function registerProfileSync(hooks) { sync = hooks || null; }
export async function pullProfile(user) { if (!sync || !sync.pull || !user) return null; const p = await sync.pull(user); if (!p) return null; return saveProfile(Object.assign({}, p, { uid: p.uid || user.id || null }), { silent: true }); }
export function deleteLocalProfile() { try { localStorage.removeItem(META); } catch (e) { /* ignore */ } } // keeps cash / items (they belong to the device save)
if (typeof window !== 'undefined') window.__atqProfile = { getProfile, saveProfile, hasProfile, onProfileChange, registerProfileSync, pullProfile };
