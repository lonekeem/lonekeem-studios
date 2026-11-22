// Daily challenges: 3 per local calendar day, stored only on this device. No server writes, no fake scores.
import { defaultSave, loadSave, writeSave, WEAPONS } from '../game/data.js';

const KEY = 'atq.dailies.v1';
const $ = s => document.querySelector(s);
const LS = () => { try { return localStorage; } catch (e) { return { getItem: () => null, setItem: () => {}, removeItem: () => {} }; } };

export const dayKey = (d = new Date()) => {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
};
function rng(seed) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return (h >>> 0) / 4294967296; };
}

const POOL = [
  { type: 'kills', need: 10, reward: 40, label: 'Get 10 kills' },
  { type: 'kills', need: 20, reward: 70, label: 'Get 20 kills' },
  { type: 'headshots', need: 5, reward: 50, label: 'Land 5 headshots' },
  { type: 'headshots', need: 8, reward: 80, label: 'Land 8 headshots' },
  { type: 'melee', need: 6, reward: 50, label: 'Get 6 melee kills' },
  { type: 'gun', need: 8, reward: 50, label: 'Get 8 gun kills' },
  { type: 'wave', need: 3, reward: 45, label: 'Reach wave 3 in Survival' },
  { type: 'wave', need: 5, reward: 80, label: 'Reach wave 5 in Survival' },
  { type: 'pickups', need: 4, reward: 35, label: 'Collect 4 pickups' },
];

function pickThree(day) {
  const r = rng('atq-daily-' + day);
  const bag = POOL.map((p, i) => ({ ...p, id: p.type + '-' + p.need + '-' + i }));
  // prefer unique types
  const used = new Set(), out = [];
  const order = bag.map((_, i) => i).sort((a, b) => r() - r());
  for (const i of order) {
    const p = bag[i]; if (used.has(p.type)) continue;
    used.add(p.type); out.push({ id: p.id, type: p.type, need: p.need, label: p.label, reward: p.reward, have: 0, done: false });
    if (out.length === 3) break;
  }
  while (out.length < 3) {
    const p = bag[Math.floor(r() * bag.length)];
    if (out.some(x => x.id === p.id)) continue;
    out.push({ id: p.id + '-x' + out.length, type: p.type, need: p.need, label: p.label, reward: p.reward, have: 0, done: false });
  }
  return out;
}

let state = null;
function load(day) {
  let d = null; try { d = JSON.parse(LS().getItem(KEY) || 'null'); } catch (e) { d = null; }
  if (!d || d.day !== day || !Array.isArray(d.items) || d.items.length !== 3) {
    d = { day, items: pickThree(day) };
    save(d);
  }
  state = d; return d;
}
function save(d) { state = d; try { LS().setItem(KEY, JSON.stringify(d)); } catch (e) { /* ignore */ } }

export function getDailies(day) { return load(day || dayKey()); }

function wallet() {
  const s = (typeof window !== 'undefined' && window.__atq && window.__atq.save) || loadSave(LS()) || defaultSave();
  return s;
}
function addCash(n) {
  if (!n) return;
  const s = wallet();
  s.cash = (s.cash || 0) + n;
  try { writeSave(LS(), s); } catch (e) { /* ignore */ }
  try { if (window.__atq && window.__atq.game && window.__atq.game.save) window.__atq.game.save.cash = s.cash; } catch (e) { /* ignore */ }
  return s.cash;
}

function bump(types, n = 1, extra = 0) {
  if (typeof types === 'string') types = [types];
  const set = new Set(types);
  const d = getDailies(); let changed = 0, awarded = 0;
  for (const it of d.items) {
    if (it.done) continue;
    if (it.type === 'wave') {
      if (!set.has('wave')) continue;
      it.have = Math.max(it.have, extra || n);
      if (it.have >= it.need) { it.have = it.need; it.done = true; awarded += it.reward; }
      changed++; continue;
    }
    if (!set.has(it.type) && !(it.type === 'kills' && (set.has('melee') || set.has('gun') || set.has('headshots') || set.has('kills')))) continue;
    it.have = Math.min(it.need, (it.have || 0) + n);
    if (it.have >= it.need) { it.have = it.need; it.done = true; awarded += it.reward; }
    changed++;
  }
  if (changed) {
    save(d);
    if (awarded) {
      const cash = addCash(awarded);
      toast('Daily challenge complete · +$' + awarded, cash);
    }
    render();
  }
}

function toast(msg, cash) {
  try {
    const g = window.__atq && window.__atq.game;
    if (g && g.toast) g.toast(msg + (cash != null ? ' · wallet $' + cash : ''), 2.4);
  } catch (e) { /* ignore */ }
}

export function attachDailies(g) {
  if (!g || g.__dailyTracked) return; g.__dailyTracked = true;
  const kz = g.killZ.bind(g);
  g.killZ = function (z, dir, o = {}) {
    const wasDead = z && z.dead;
    const out = kz(z, dir, o);
    if (z && !wasDead && z.dead && (!(o || {}).ai || z.playerHit)) {
      const id = (this.save && this.save.cur) || '';
      const w = WEAPONS[id] || {};
      const types = ['kills'];
      if ((o || {}).head) types.push('headshots');
      if (w.type === 'melee') types.push('melee');
      else if (w.type === 'gun') types.push('gun');
      bump(types, 1);
    }
    return out;
  };
  const tp = g.takePickup.bind(g);
  g.takePickup = function (p) { const out = tp(p); bump('pickups', 1); return out; };
  let lastW = 0;
  const tick = () => {
    if (!g || !g.survival) return;
    const w = (g.stepData && g.stepData.wave) || 0;
    if (w > lastW) { lastW = w; bump('wave', 1, w); }
  };
  const iv = setInterval(() => { if (!g.running && !g.survival) { clearInterval(iv); return; } tick(); }, 800);
}

export function renderDailies() { render(); }
function render() {
  const d = getDailies();
  const done = d.items.filter(i => i.done).length;
  const badge = done + '/3';
  const el = $('#survDailyTxt'); if (el) el.textContent = done === 3 ? 'Dailies done' : 'Daily ' + badge;
  const b2 = $('#dailyPaneTxt'); if (b2) b2.textContent = done === 3 ? 'All done today' : badge + ' today';
  $$badge(done);
  const cash = (wallet().cash || 0);
  const box = $('#dailyList');
  if (box) {
    box.innerHTML = d.items.map(it => {
      const pct = Math.round((it.have / it.need) * 100);
      return `<div class="drow${it.done ? ' done' : ''}"><div class="dtop"><b>${esc(it.label)}</b><span>${it.have}/${it.need}</span></div>
        <div class="dbar"><i style="width:${pct}%"></i></div>
        <div class="dmeta">${it.done ? 'Complete · +$' + it.reward + ' added to your wallet' : 'Reward $' + it.reward}</div></div>`;
    }).join('');
  }
  const wal = $('#dailyWallet');
  if (wal) wal.innerHTML = 'Shared wallet · <b>$' + cash + '</b> · Resets at midnight, your time';
  const dayEl = $('#dailyDay'); if (dayEl) dayEl.textContent = 'Today · ' + d.day;
}
function $$badge(done) {
  document.querySelectorAll('.dbadge').forEach(b => {
    b.textContent = done === 3 ? '✓' : String(3 - done);
    b.classList.toggle('ok', done === 3);
    if (b.hasAttribute('hidden')) b.removeAttribute('hidden');
  });
}
const esc = t => String(t == null ? '' : t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function openDailies() {
  render();
  const s = $('#dailies'); if (s) { document.querySelectorAll('.screen').forEach(e => e.classList.add('hidden')); s.classList.remove('hidden'); }
}

export function initDailies() {
  load(dayKey());
  render();
  const btn = $('#btnDailies'); if (btn) btn.addEventListener('click', openDailies);
  if (typeof window !== 'undefined' && /^(localhost|127\.0\.0\.1)$/.test(location.hostname)) {
    window.__atqDailies = {
      get: getDailies, dayKey, render,
      bump: (type, n, extra) => bump(type, n, extra),
      addCash, reset: (day) => { LS().removeItem(KEY); load(day || dayKey()); render(); return getDailies(); },
    };
  }
}
