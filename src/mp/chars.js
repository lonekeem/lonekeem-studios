// Online character roster: multiple saved survivors + a built-in Story Keem option.
// Story mode is unchanged (always canon Keem). This file is data only — no three.js.
import * as K from './look.js';
import { applySel, ALL_PARTS } from './storeLook.js';
import { OUTFIT } from '../game/looks.js';
import { DEFAULT_SEL, hasProfile, getProfile, saveProfile } from './profile.js';
import { KEEM_SKIN, storyTints } from './keemStory.js';

export const KEEM_ID = 'keem';
export const MAX_CHARS = 8;
const ROSTER = 'atq.mp.chars.v1';
const ACTIVE = 'atq.mp.activeChar';

const rd = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };
const wr = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* quota / private mode */ } };
const rid = () => 'c-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-3);

export function keemLook() { return { exclusive: 'skin.keem_story', name: 'Keem', base: 'mp_m1' }; }

function clone(o) { try { return JSON.parse(JSON.stringify(o)); } catch (e) { return o; } }
// v1.9.103: a saved character can use the real Story Keem model as its body (sel.story, admin's Character screen only; the server
// still locks the flag to the admin account). Its colour edits live in sel.sk. The regular-body look stays in the slot, so switching back is lossless.
function withStory(L, sel) {
  if (sel && sel.story) { L.exclusive = KEEM_SKIN; const t = storyTints({ sk: sel.sk }); if (Object.keys(t).length) L.sk = t; else delete L.sk; }
  else { delete L.exclusive; delete L.sk; }
  return L;
}

function readRoster() {
  const r = rd(ROSTER);
  if (r && Array.isArray(r.slots)) return { v: 1, slots: r.slots, active: r.active || null };
  return null;
}

function writeRoster(r) { wr(ROSTER, { v: 1, slots: r.slots, active: r.active || null }); }

function lookFromSel(sel, name, baseLook) {
  const base = clone(baseLook || K.defaultLook('mp_m1'));
  const L = applySel(base, Object.assign({}, DEFAULT_SEL, sel || {}), ALL_PARTS, OUTFIT);
  L.name = name || L.name || 'Survivor';
  withStory(L, sel); // custom slots are Story Keem only when the admin picked that body for them
  if (!L.base) L.base = 'mp_m1';
  return L;
}

/** One-time: fold the existing single profile look + old creator slots into the roster. */
export function migrateRoster() {
  const cur = readRoster();
  if (cur && cur.slots && cur.slots.length) {
    if (!cur.active) { cur.active = cur.slots[0].id; writeRoster(cur); }
    return cur;
  }
  const slots = [];
  try {
    if (hasProfile()) {
      const p = getProfile();
      if (p) {
        const look = p.look && !p.look.exclusive ? p.look : lookFromSel(p.sel, p.name, p.look);
        slots.push({ id: 'c-profile', name: p.name || look.name || 'Survivor', sel: Object.assign({}, DEFAULT_SEL, p.sel || {}), look: clone(look), createdAt: p.createdAt || Date.now(), updatedAt: Date.now() });
      }
    }
  } catch (e) { /* ignore */ }
  try {
    const old = K.loadSlots() || [];
    for (const l of old) {
      if (!l || typeof l !== 'object') continue;
      const name = l.name || 'Survivor';
      // skip near-duplicates of the profile look we already added
      if (slots.some(s => s.name === name && s.look && s.look.hair && l.hair && s.look.hair.id === l.hair.id)) continue;
      if (slots.length >= MAX_CHARS) break;
      slots.push({ id: rid(), name, sel: Object.assign({}, DEFAULT_SEL), look: K.normalize(clone(l)), createdAt: Date.now(), updatedAt: Date.now() });
    }
  } catch (e) { /* ignore */ }
  const active = slots[0] ? slots[0].id : KEEM_ID;
  const r = { v: 1, slots, active };
  writeRoster(r);
  return r;
}

function roster() { return migrateRoster(); }

export function listSlots() { return roster().slots.slice(); }

export function listPlayable() {
  const r = roster();
  const keem = { id: KEEM_ID, kind: 'keem', name: 'Keem', look: keemLook() };
  return [keem, ...r.slots.map(s => ({ id: s.id, kind: 'custom', story: !!(s.sel && s.sel.story), name: s.name, sel: s.sel, look: s.look }))];
}

export function getActiveId() {
  const r = roster();
  const id = r.active || (typeof localStorage !== 'undefined' && localStorage.getItem(ACTIVE)) || null;
  if (id === KEEM_ID) return KEEM_ID;
  if (id && r.slots.some(s => s.id === id)) return id;
  return r.slots[0] ? r.slots[0].id : KEEM_ID;
}

export function setActiveId(id) {
  const r = roster();
  if (id !== KEEM_ID && !r.slots.some(s => s.id === id)) return getActiveId();
  r.active = id;
  writeRoster(r);
  try { localStorage.setItem(ACTIVE, id); } catch (e) { /* ignore */ }
  // keep the single-look keys in sync with the chosen custom (not Keem), so older code paths stay correct
  if (id !== KEEM_ID) {
    const s = r.slots.find(x => x.id === id);
    if (s) {
      try { K.saveLook(Object.assign({}, s.look, { name: s.name })); } catch (e) { /* ignore */ }
      try { if (s.sel) saveProfile({ sel: s.sel, look: s.look }, { silent: true }); } catch (e) { /* ignore */ }
    }
  }
  return id;
}

export function getChar(id) { return listPlayable().find(c => c.id === id) || null; }

/** Look actually spawned in town and sent to peers. Custom looks never carry the Story Keem exclusive flag. */
export function getPlayLook(id) {
  const cid = id || getActiveId();
  if (cid === KEEM_ID) return keemLook();
  const s = roster().slots.find(x => x.id === cid);
  if (!s) return keemLook(); // no custom character saved — fall back to Keem
  const name = s.name || 'Survivor';
  const L = s.sel ? lookFromSel(s.sel, name, s.look) : K.normalize(clone(s.look || K.defaultLook('mp_m1')));
  L.name = name;
  withStory(L, s.sel);
  if (!L.base) L.base = 'mp_m1';
  return L;
}

export function upsertChar({ id, name, sel, look } = {}) {
  const r = roster();
  const n = String(name || 'Survivor').replace(/[<>]/g, '').trim().slice(0, 18) || 'Survivor';
  const L = look ? clone(look) : lookFromSel(sel, n, null);
  L.name = n;
  const prev = id && id !== KEEM_ID ? r.slots.find(x => x.id === id) : null;
  withStory(L, sel || (prev && prev.sel));
  if (!L.base) L.base = 'mp_m1';
  if (id && id !== KEEM_ID) {
    const i = r.slots.findIndex(s => s.id === id);
    if (i >= 0) {
      r.slots[i] = Object.assign({}, r.slots[i], { name: n, sel: Object.assign({}, DEFAULT_SEL, sel || r.slots[i].sel || {}), look: L, updatedAt: Date.now() });
      writeRoster(r);
      return r.slots[i];
    }
  }
  if (r.slots.length >= MAX_CHARS) return null;
  const slot = { id: id && id !== KEEM_ID ? id : rid(), name: n, sel: Object.assign({}, DEFAULT_SEL, sel || {}), look: L, createdAt: Date.now(), updatedAt: Date.now() };
  r.slots.push(slot);
  if (!r.active || r.active === KEEM_ID) r.active = slot.id;
  writeRoster(r);
  return slot;
}

export function removeChar(id) {
  if (!id || id === KEEM_ID) return false;
  const r = roster();
  const n = r.slots.length;
  r.slots = r.slots.filter(s => s.id !== id);
  if (r.slots.length === n) return false;
  if (r.active === id) r.active = r.slots[0] ? r.slots[0].id : KEEM_ID;
  writeRoster(r);
  return true;
}

/** Snapshot for cloud sync (inside profile p_data). */
export function exportRoster() {
  const r = roster();
  return { v: 1, slots: r.slots, active: r.active || getActiveId() };
}

export function importRoster(data) {
  if (!data || !Array.isArray(data.slots)) return roster();
  const have = new Map((readRoster() && readRoster().slots || []).map(s => [s.id, s]));
  for (const s of data.slots) {
    if (!s || !s.id || s.id === KEEM_ID) continue;
    have.set(s.id, {
      id: s.id,
      name: String(s.name || 'Survivor').slice(0, 18),
      sel: Object.assign({}, DEFAULT_SEL, s.sel || {}),
      look: s.look ? clone(s.look) : lookFromSel(s.sel, s.name),
      createdAt: s.createdAt || Date.now(),
      updatedAt: s.updatedAt || Date.now()
    });
  }
  const slots = [...have.values()].slice(0, MAX_CHARS);
  const active = (data.active === KEEM_ID || slots.some(s => s.id === data.active)) ? data.active : (slots[0] ? slots[0].id : KEEM_ID);
  const r = { v: 1, slots, active };
  writeRoster(r);
  return r;
}

if (typeof window !== 'undefined') window.__atqChars = { KEEM_ID, listPlayable, listSlots, getActiveId, setActiveId, getPlayLook, upsertChar, removeChar, migrateRoster, exportRoster, importRoster };
