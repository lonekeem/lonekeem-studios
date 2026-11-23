// Infested enterable buildings in the Quiet Falls online town.
// Some interiors start (or later become) infested with a mix of walkers, runners, tanks and spitters.
// Players clear them for cash and loot. Infested / cleared state and indoor packs sync over net.evt.
// A wall-clock slot plus snapshots keep clients aligned. Packs spawn lazily when someone is nearby (phone perf).
import * as THREE from 'three';
import { mulberry } from './kit.js';
import { hash } from './building.js';
import { rollTable, ITEMS } from './loot.js';

export const RESET_MS = 5 * 60 * 1000;
export const FILL_MS = 45 * 1000; // if the town drops below the target, infest a fresh idle building
export const INFEST_COUNT = 8;
export const SPAWN_RANGE = 26;
export const SLEEP_RANGE = 52;
export const PAY_RANGE = 22;

const PACK_N = { shed: [2, 3], house: [3, 5], kiosk: [3, 5], store: [4, 6] };
const CASH_BASE = { shed: 22, house: 38, kiosk: 44, store: 58 };

export function prettyName(bd) {
  if (!bd) return 'Building';
  const id = bd.id || '';
  if (id === 'school') return 'Quiet Falls School';
  if (id === 'mall1') return "Ott's Hardware";
  if (id === 'mall0') return 'Cedar Laundry';
  if (id === 'store') return 'Corner Store';
  if (id === 'kiosk') return 'Gas Kiosk';
  if (id.startsWith('shed')) return 'Shed';
  return 'House';
}

export function slotNow(t = Date.now()) { return Math.floor(t / RESET_MS); }

function rng(seed) { return mulberry(typeof seed === 'number' ? seed : hash(String(seed))); }

function shuffle(arr, r) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

export function pickIds(buildings, slot, n = INFEST_COUNT) {
  const list = (buildings || []).filter(b => b && b.id && b.rect);
  if (!list.length) return [];
  const r = rng('infest-pick:' + slot);
  const sheds = list.filter(b => b.kind === 'shed');
  const rest = list.filter(b => b.kind !== 'shed');
  const out = [];
  if (sheds.length && n > 1) out.push(shuffle(sheds, r)[0].id);
  for (const b of shuffle(rest, r)) { if (out.length >= n) break; out.push(b.id); }
  return out;
}

function packSize(kind, r) { const [a, b] = PACK_N[kind] || PACK_N.house; return a + Math.floor(r() * (b - a + 1)); }

export function rollKinds(n, r, buildingKind) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const x = r();
    if (buildingKind === 'shed') out.push(x < .35 ? 'runner' : 'walker');
    else if (x < .1) out.push('tank');
    else if (x < .26) out.push('spitter');
    else if (x < .52) out.push('runner');
    else out.push('walker');
  }
  if (n >= 4 && buildingKind !== 'shed' && !out.includes('tank') && !out.includes('spitter')) out[n - 1] = r() < .45 ? 'tank' : 'spitter';
  return out;
}

export function spotsIn(bd, n, r, col) {
  const rec = bd.rect, pad = bd.kind === 'shed' ? .55 : .9;
  const x0 = rec.x0 + pad, x1 = rec.x1 - pad, z0 = rec.z0 + pad, z1 = rec.z1 - pad;
  const spots = [];
  for (let k = 0; k < n * 28 && spots.length < n; k++) {
    const x = x0 + r() * Math.max(.2, x1 - x0), z = z0 + r() * Math.max(.2, z1 - z0);
    if (col && col.hit(x, z, .4)) continue;
    if (spots.some(s => Math.hypot(s.x - x, s.z - z) < 1.05)) continue;
    spots.push({ x, z });
  }
  while (spots.length < n) { // last-resort: grid in the middle
    const i = spots.length, g = Math.ceil(Math.sqrt(n));
    const x = (x0 + x1) / 2 + ((i % g) - (g - 1) / 2) * 1.2;
    const z = (z0 + z1) / 2 + (Math.floor(i / g) - (g - 1) / 2) * 1.2;
    if (!spots.some(s => Math.hypot(s.x - x, s.z - z) < .4)) spots.push({ x, z });
    else spots.push({ x: (x0 + x1) / 2, z: (z0 + z1) / 2 });
  }
  return spots;
}

function signTex(label, bg, fg = '#f4efe4') {
  const c = document.createElement('canvas'); c.width = 512; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = bg; g.roundRect ? g.roundRect(8, 12, 496, 104, 18) : g.fillRect(8, 12, 496, 104); g.fill();
  g.strokeStyle = '#0006'; g.lineWidth = 6; g.stroke();
  g.fillStyle = fg; g.font = '800 64px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(label, 256, 66);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.needsUpdate = true; return t;
}

function makeMarker() {
  const mat = new THREE.SpriteMaterial({ transparent: true, depthTest: true, depthWrite: false });
  const s = new THREE.Sprite(mat); s.scale.set(2.4, .6, 1); s.renderOrder = 8; s.visible = false; s.userData.st = '';
  return s;
}

function setMarker(spr, st) {
  if (!spr || spr.userData.st === st) return;
  spr.userData.st = st;
  if (!st) { spr.visible = false; return; }
  const tex = st === 'cleared' ? signTex('CLEARED', '#1f6a3a') : signTex('INFESTED', '#7a1d1d', '#f3d2c8');
  if (spr.material.map) spr.material.map.dispose();
  spr.material.map = tex; spr.material.needsUpdate = true; spr.visible = true;
}

export function attachInfest(T) {
  const { W, net, me, bag, toast, scene } = T;
  const buildings = W.enterable || W.buildings || [];
  const byId = new Map(buildings.map(b => [b.id, b]));
  const states = new Map(); // id -> { st, wave, seed, spots, spawned, zeds, paid, at, kinds }
  const markers = new Map();
  let snapT = 0, fillT = 2, lastIndoor = null, barEl = null;

  for (const bd of buildings) {
    const spr = makeMarker();
    spr.position.set(0, (bd.Hh || 2.8) + 1.15, 0);
    bd.grp.add(spr); markers.set(bd.id, spr);
    states.set(bd.id, { st: 'idle', wave: 0, seed: 0, spots: null, spawned: false, zeds: [], paid: false, at: 0, kinds: null });
  }

  function getZ() { return T.Z ? T.Z() : (typeof window !== 'undefined' && window.__mpTown && window.__mpTown.Z) || null; }

  function players() {
    const list = [{ x: me.x, z: me.z, me: true }];
    try { const rem = T.remotes; if (rem) for (const r of rem.values()) if (r && r.av) list.push({ x: r.x, z: r.z }); } catch (e) { /* ignore */ }
    return list;
  }
  const nearAny = (x, z, r) => players().some(p => Math.hypot(p.x - x, p.z - z) < r);
  const inside = (bd, x, z) => { const r = bd.rect; return x > r.x0 - .15 && x < r.x1 + .15 && z > r.z0 - .15 && z < r.z1 + .15; };
  const cxz = bd => [(bd.rect.x0 + bd.rect.x1) / 2, (bd.rect.z0 + bd.rect.z1) / 2];

  function applyMark(id) { const s = states.get(id); setMarker(markers.get(id), s && s.st !== 'idle' ? s.st : ''); }

  function infest(id, o = {}) {
    const bd = byId.get(id), s = states.get(id); if (!bd || !s) return null;
    if (s.st === 'infested' && s.spawned && !o.force) return s;
    if (s.zeds && s.zeds.length) despawn(id, true);
    s.st = 'infested'; s.wave = (o.wave | 0) || (s.wave + 1) || 1; s.seed = o.seed || (hash(id + ':' + s.wave + ':' + (o.salt || slotNow())) || 1);
    s.spots = o.spots || null; s.kinds = o.kinds || null; s.spawned = false; s.zeds = []; s.paid = false; s.at = Date.now();
    applyMark(id); return s;
  }

  function idle(id) {
    const s = states.get(id); if (!s) return;
    despawn(id, true); s.st = 'idle'; s.spawned = false; s.spots = null; s.kinds = null; s.paid = false; applyMark(id);
  }

  function seedTown(slot = slotNow()) {
    const want = new Set(pickIds(buildings, slot, INFEST_COUNT));
    for (const bd of buildings) {
      const s = states.get(bd.id);
      if (want.has(bd.id)) { if (s.st !== 'infested') infest(bd.id, { wave: 1, salt: slot }); }
      else if (s.st === 'infested' && !s.spawned) idle(bd.id);
    }
  }

  function planPack(id) {
    const bd = byId.get(id), s = states.get(id); if (!bd || !s) return;
    if (s.spots && s.spots.length) {
      if (!s.kinds || !s.kinds.length) s.kinds = s.spots.map(p => p.kind || 'walker');
      return;
    }
    const r = rng(s.seed || hash(id));
    if (!s.kinds || !s.kinds.length) s.kinds = rollKinds(packSize(bd.kind, r), r, bd.kind);
    s.spots = spotsIn(bd, s.kinds.length, r, W.col).map((p, i) => ({ x: +p.x.toFixed(3), z: +p.z.toFixed(3), kind: s.kinds[i] || 'walker' }));
  }

  function spawnPack(id, fromNet) {
    const bd = byId.get(id), s = states.get(id), Z = getZ(); if (!bd || !s || s.st !== 'infested' || s.spawned) return 0;
    if (!Z || !Z.spawnAt) return 0;
    planPack(id);
    const home = { x0: bd.rect.x0, x1: bd.rect.x1, z0: bd.rect.z0, z1: bd.rect.z1 };
    s.zeds = [];
    for (let i = 0; i < s.spots.length; i++) {
      const p = s.spots[i];
      const z = Z.spawnAt(p.x, p.z, { kind: p.kind || (s.kinds && s.kinds[i]) || 'walker', chase: false, home, bid: id, packI: i });
      if (z) { z.home = home; z.bid = id; z.packI = i; z.st = 'wander'; z.lose = 0; s.zeds.push(z); }
    }
    s.spawned = true; s.at = Date.now();
    if (!fromNet && net) net.evt({ t: 'infZ', id, wave: s.wave, seed: s.seed, spots: s.spots, kinds: s.kinds });
    return s.zeds.length;
  }

  function despawn(id, dropBodies) {
    const s = states.get(id); if (!s || !s.zeds) return;
    for (const z of s.zeds) {
      if (!z || !z.root) continue;
      if (!dropBodies && z.dead) continue;
      try { if (z.root.parent) z.root.parent.remove(z.root); } catch (e) { /* ignore */ }
      z.dead = true; z._gone = true;
    }
    s.zeds = []; s.spawned = false;
  }

  function cashFor(id) {
    const bd = byId.get(id), s = states.get(id);
    let n = CASH_BASE[(bd && bd.kind) || 'house'] || 38;
    const kinds = (s && (s.kinds || (s.spots || []).map(p => p.kind))) || [];
    for (const k of kinds) { if (k === 'tank') n += 14; else if (k === 'spitter') n += 9; else if (k === 'runner') n += 4; }
    return n;
  }

  function grant(id) {
    const bd = byId.get(id), s = states.get(id); if (!s || s.paid) return 0;
    if (!nearAny(...cxz(bd), PAY_RANGE) && !(bd && inside(bd, me.x, me.z))) return 0;
    s.paid = true;
    const cash = cashFor(id);
    if (bag && cash) bag.add('cash', cash);
    let extra = '';
    try {
      const items = rollTable('clear', rng((s.seed || 1) + 17));
      if (bag && items) for (const it of items) {
        if (it.id === 'cash') { bag.add('cash', it.n); continue; }
        const got = bag.add(it.id, it.n);
        if (got) { const nm = (ITEMS[it.id] && ITEMS[it.id].n) || it.id; extra += (extra ? ', ' : '') + (got > 1 ? got + '× ' : '') + nm; }
      }
    } catch (e) { /* table optional */ }
    const msg = 'Cleared ' + prettyName(bd) + ' · +$' + cash + (extra ? ' · ' + extra : '');
    try { toast(msg, 3.2); } catch (e) { /* ignore */ }
    return cash;
  }

  function markCleared(id, fromNet, payload) {
    const s = states.get(id), bd = byId.get(id); if (!s || s.st === 'cleared') { if (s && !s.paid && !fromNet) grant(id); return; }
    // finish any leftover local zeds so clients agree
    if (s.zeds) for (const z of s.zeds) { if (z && !z.dead && getZ() && getZ().killNear) try { getZ().killNear(z.root.position.x, z.root.position.z, .2, 999, { x: 0, z: 1 }); } catch (e) { z.dead = true; } }
    s.st = 'cleared'; s.at = Date.now(); s.spawned = true; applyMark(id);
    const cash = grant(id);
    if (!fromNet && net) net.evt({ t: 'infC', id, wave: s.wave, cash, by: net.id });
    try { updateBar(bd); } catch (e) { /* hud */ }
    return cash;
  }

  function isLead() {
    if (!net || !net.peers || !net.peers.size) return true;
    let min = net.id; for (const id of net.peers.keys()) if (String(id) < String(min)) min = id;
    return net.id === min;
  }

  function maybeFill() {
    if (!isLead()) return;
    const live = [...states.values()].filter(s => s.st === 'infested').length;
    if (live >= INFEST_COUNT) return;
    const idleIds = buildings.filter(b => states.get(b.id).st === 'idle' && !nearAny(...cxz(b), 16)).map(b => b.id);
    if (!idleIds.length) return;
    const id = idleIds[Math.floor((rng(slotNow() + live + idleIds.length)()) * idleIds.length)];
    infest(id, { salt: slotNow() + ':' + id });
    if (net) { const s = states.get(id); net.evt({ t: 'infR', id, wave: s.wave, seed: s.seed }); }
  }

  function maybeReset(id) {
    if (!isLead()) return;
    const s = states.get(id), bd = byId.get(id); if (!s || s.st !== 'cleared') return;
    if (Date.now() - s.at < RESET_MS) return;
    if (bd && (inside(bd, me.x, me.z) || nearAny(...cxz(bd), 8))) return;
    infest(id, { salt: slotNow() + ':r:' + id });
    if (net) { const n = states.get(id); net.evt({ t: 'infR', id, wave: n.wave, seed: n.seed }); }
  }

  function snapshot() {
    const list = [];
    for (const [id, s] of states) list.push({ id, st: s.st, wave: s.wave, seed: s.seed, spots: s.spawned ? s.spots : null, kinds: s.spawned ? s.kinds : null, at: s.at });
    return list;
  }

  function applySnap(list) {
    if (!Array.isArray(list)) return;
    const seen = new Set();
    for (const row of list) {
      if (!row || !states.has(row.id)) continue; seen.add(row.id);
      const s = states.get(row.id);
      if (row.st === 'cleared') { if (s.st !== 'cleared') markCleared(row.id, true, row); }
      else if (row.st === 'infested') {
        if (s.st !== 'infested' || (row.wave && row.wave !== s.wave)) infest(row.id, row);
        if (row.spots && !s.spawned) { s.spots = row.spots; s.kinds = row.kinds; if (nearAny(...cxz(byId.get(row.id)), SPAWN_RANGE + 8)) spawnPack(row.id, true); }
      } else if (row.st === 'idle' && s.st === 'infested' && !s.spawned) idle(row.id);
    }
  }

  function onEvt(e) {
    if (!e || !e.t) return;
    if (e.t === 'infS') applySnap(e.list);
    else if (e.t === 'infZ') { const s = states.get(e.id); if (!s) return; if (s.st !== 'infested' || e.wave !== s.wave) infest(e.id, e); s.spots = e.spots || s.spots; s.kinds = e.kinds || s.kinds; spawnPack(e.id, true); }
    else if (e.t === 'infC') markCleared(e.id, true, e);
    else if (e.t === 'infR') infest(e.id, e);
    else if (e.t === 'infK') {
      const s = states.get(e.id); if (!s || !s.zeds) return;
      const z = s.zeds[e.i]; if (z && !z.dead) {
        const Z = getZ(); const p = z.root.position;
        if (Z && Z.killNear) Z.killNear(p.x, p.z, .25, 999, { x: 0, z: 1 });
        else z.dead = true;
      }
    }
  }

  function sendSnap() { if (net) net.evt({ t: 'infS', list: snapshot() }); }

  // hook net
  const prevEvt = net && net.onEvt;
  if (net) net.onEvt = (e, id) => { if (e && typeof e.t === 'string' && e.t.slice(0, 3) === 'inf') return onEvt(e, id); return prevEvt && prevEvt(e, id); };
  const prevHello = net && net.onHello;
  if (net) net.onHello = function (p) { try { sendSnap(); } catch (e) { /* ignore */ } return prevHello && prevHello.apply(this, arguments); };

  seedTown();

  function ensureBar() {
    if (barEl && barEl.isConnected) return barEl;
    const root = document.getElementById('mpt'); if (!root) return null;
    barEl = document.createElement('div'); barEl.className = 'infbar'; barEl.style.display = 'none'; root.append(barEl); return barEl;
  }

  function updateBar(inb) {
    const el = ensureBar(); if (!el) return;
    if (!inb) { if (lastIndoor) lastIndoor = null; el.style.display = 'none'; return; }
    const s = states.get(inb.id);
    const name = prettyName(inb);
    let cls = 'idle', text = name;
    if (s && s.st === 'infested') {
      const left = s.spawned ? s.zeds.filter(z => z && !z.dead).length : (s.spots || s.kinds || []).length || '?';
      cls = 'hot'; text = name + ' · Infested' + (s.spawned ? ' · ' + left + ' left' : '');
    } else if (s && s.st === 'cleared') { cls = 'ok'; text = name + ' · Cleared'; }
    else text = name;
    el.className = 'infbar ' + cls; el.textContent = text; el.style.display = 'block';
    if (lastIndoor !== inb.id) {
      lastIndoor = inb.id;
      if (s && s.st === 'infested') try { toast(name + ' is infested — clear it out', 2.2); } catch (e) { /* ignore */ }
      else if (s && s.st === 'cleared') try { toast(name + ' is cleared', 1.4); } catch (e) { /* ignore */ }
    }
  }

  const seenDead = new WeakSet();

  function update(dt, inb) {
    const now = Date.now();
    // lazy spawn / sleep
    for (const bd of buildings) {
      const s = states.get(bd.id); if (!s || s.st !== 'infested') continue;
      const [cx, cz] = cxz(bd);
      const close = nearAny(cx, cz, SPAWN_RANGE);
      if (!s.spawned && close) spawnPack(bd.id, false);
      else if (s.spawned && !nearAny(cx, cz, SLEEP_RANGE) && !(inb && inb.id === bd.id)) {
        const chasing = s.zeds.some(z => z && !z.dead && z.st === 'chase');
        if (!chasing) despawn(bd.id, true);
      }
    }
    // clear check + kill sync
    for (const [id, s] of states) {
      if (s.st !== 'infested' || !s.spawned) continue;
      let live = 0;
      for (let i = 0; i < s.zeds.length; i++) {
        const z = s.zeds[i]; if (!z) continue;
        if (z.dead) {
          if (!seenDead.has(z)) { seenDead.add(z); if (net) net.evt({ t: 'infK', id, i, wave: s.wave }); }
        } else live++;
      }
      if (s.zeds.length && live === 0) markCleared(id, false);
    }
    if ((fillT -= dt) <= 0) { fillT = 2; maybeFill(); for (const id of states.keys()) maybeReset(id); }
    if ((snapT -= dt) <= 0) { snapT = 8; if (net && net.peers && net.peers.size) sendSnap(); }
    // markers: hide when you're inside (HUD covers it) or far away
    for (const bd of buildings) {
      const spr = markers.get(bd.id); if (!spr) continue;
      const [cx, cz] = cxz(bd);
      const show = spr.userData.st && !(inb && inb.id === bd.id) && Math.hypot(me.x - cx, me.z - cz) < 42;
      spr.visible = !!show;
    }
    updateBar(inb);
  }

  function drawMini(g, X, Z2) {
    for (const bd of buildings) {
      const s = states.get(bd.id); if (!s || s.st === 'idle') continue;
      const [cx, cz] = cxz(bd); const x = X(cx), z = Z2(cz);
      g.beginPath(); g.arc(x, z, 4.2, 0, 7);
      g.fillStyle = s.st === 'cleared' ? '#3dcc7a' : '#e0443a'; g.fill();
      g.strokeStyle = '#111c'; g.lineWidth = 1; g.stroke();
    }
  }

  function force(id, o = {}) {
    const bd = byId.get(id) || buildings[0]; if (!bd) return null;
    infest(bd.id, { force: true, salt: o.salt || ('force' + Date.now()), kinds: o.kinds, spots: o.spots });
    if (o.kinds) states.get(bd.id).kinds = o.kinds;
    spawnPack(bd.id, !!o.fromNet);
    return statusOf(bd.id);
  }

  function clearNow(id) {
    const s = states.get(id); if (!s) return null;
    if (s.st !== 'infested') infest(id, { salt: 'clearNow' });
    if (!s.spawned) spawnPack(id, true);
    const Z = getZ();
    if (s.zeds) for (const z of s.zeds) { if (!z || z.dead) continue; const p = z.root.position; if (Z && Z.killNear) Z.killNear(p.x, p.z, .3, 999, { x: 0, z: 1 }); else z.dead = true; }
    markCleared(id, false);
    return statusOf(id);
  }

  function statusOf(id) {
    const s = states.get(id), bd = byId.get(id); if (!s) return null;
    return { id, name: prettyName(bd), st: s.st, wave: s.wave, kind: bd && bd.kind, spawned: s.spawned, left: s.zeds.filter(z => z && !z.dead).length, total: s.zeds.length, paid: s.paid, cx: bd ? cxz(bd)[0] : 0, cz: bd ? cxz(bd)[1] : 0, rect: bd && bd.rect, cash: cashFor(id) };
  }

  const api = {
    update, drawMini, onEvt, force, clearNow, statusOf, seedTown, sendSnap, snapshot,
    list: () => buildings.map(b => statusOf(b.id)),
    enterable: () => buildings.map(b => ({ id: b.id, kind: b.kind, name: prettyName(b), cx: b.cfg.cx, cz: b.cfg.cz, rect: b.rect, st: states.get(b.id).st })),
    RESET_MS, INFEST_COUNT
  };
  W.infest = api;
  return api;
}
