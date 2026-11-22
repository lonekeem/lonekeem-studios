// Always-visible in-game weapon bar: icons, short names, ammo, tap / 1-9 / wheel.
import { WEAPONS, WEAPON_ORDER } from '../game/data.js';

export const SHORT = {
  fists: 'Fists', pan: 'Pan', bat: 'Bat', machete: 'Mach', axe: 'Axe', chainsaw: 'Saw',
  pistol: '9mm', revolver: '.44', smg: 'SMG', shotgun: 'Shotty', rifle: 'Rifle', saw: 'SAW',
  lever: '.30-30', auto12: 'Auto-12', handcannon: '.50', harpoon: 'Harpoon', minigun: 'Mini',
  katana: 'Katana', tomahawk: 'Hawk', longsword: 'Sword', crossbow: 'Xbow', flamer: 'Flame',
  launcher: 'M32', sniper: 'Sniper', crowbar: 'Crow',
};

const $ = (s) => document.querySelector(s);

function svg(inner) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" aria-hidden="true">${inner}</svg>`;
}
const S = (d, f, w = 2, extra = '') => `<path d="${d}" fill="${f}" stroke="#1a1410" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round" ${extra}/>`;
const C = (cx, cy, r, f, w = 1.6) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${f}" stroke="#1a1410" stroke-width="${w}"/>`;
const R = (x, y, w, h, rx, f, sw = 1.6) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${f}" stroke="#1a1410" stroke-width="${sw}"/>`;

const ICONS = {
  fists: () => svg(S('M16 36c0-6 4-10 9-10 2 0 3 1 4 2 1-3 4-6 8-6 5 0 8 4 8 9v2c2-2 5-3 8-1 4 2 5 8 2 14-3 7-10 12-20 12-9 0-17-6-19-14-1-4 0-6 0-6z', '#e8c4a0') + C(24, 30, 3.2, '#e8c4a0') + C(34, 26, 3.2, '#e8c4a0') + C(44, 30, 3, '#e8c4a0')),
  pan: () => svg(C(28, 34, 16, '#6a6e74', 2.2) + C(28, 34, 11, '#3a3d42', 0) + S('M42 30h18c2 0 3 2 2 4l-2 3c-1 1-2 1-3 1H42', '#c9a227', 2)),
  bat: () => svg(S('M12 50c2-2 4-3 7-3 3 0 6 2 8 4 8-10 22-28 29-38 2-3-1-6-4-4C44 18 28 36 18 46c0-2-2-5-6-6-3 0-5 3-3 6 1 2 3 4 3 4z', '#c4a36a') + S('M48 10l6 5', '#d8c08a', 2)),
  machete: () => svg(S('M10 48l8-8 34-22c3-2 6 1 4 4L28 48l-8 8c-2 2-6 1-8-1l-2-7z', '#c5d0d8') + R(8, 46, 12, 8, 2, '#6b3a22')),
  axe: () => svg(S('M18 54L48 14', '#8a5a32', 5) + S('M40 8c8 2 16 10 16 18-8-2-14-2-20 2-4-8-4-16 4-20z', '#b8c0c6') + R(14, 50, 10, 7, 2, '#5a3a22')),
  chainsaw: () => svg(R(8, 28, 22, 16, 4, '#c9a227') + S('M28 32h26c2 0 4 2 4 4v4c0 2-2 4-4 4H28', '#8a9098') + S('M32 30l3 4-3 4 3 4-3 4', 'none', 2) + R(10, 44, 10, 8, 2, '#4a4a4a')),
  pistol: () => svg(S('M8 28h34c2 0 3 1 3 3v6c0 2-1 3-3 3H28l-2 14c0 2-2 3-4 3h-6c-2 0-3-2-2-4l4-13H8c-2 0-3-1-3-3v-6c0-2 1-3 3-3z', '#4a5560') + R(10, 24, 18, 5, 1.5, '#2f3640') + S('M36 30h8v6h-8', '#2f3640', 1.4)),
  revolver: () => svg(S('M6 30h30c2 0 3 1 3 3v5c0 2-1 3-3 3H24l-1 13c0 2-2 3-4 3h-5c-2 0-3-2-2-4l3-12H6c-2 0-3-1-3-3v-5c0-2 1-3 3-3z', '#5a5048') + C(24, 36, 7, '#3a342e') + C(24, 36, 2.4, '#c9a227') + S('M36 31h16v7H36', '#3a342e', 1.5)),
  smg: () => svg(S('M8 26h28l4 4v8H28l-2 16h-8l2-16H8c-2 0-3-1-3-3v-6c0-2 1-3 3-3z', '#4a5a4a') + R(36, 24, 18, 8, 2, '#3a4a3a') + S('M40 32v10h4', '#3a4a3a', 2) + R(12, 22, 14, 4, 1, '#2a3a2a')),
  shotgun: () => svg(S('M4 30h48c2 0 3 1 3 3v5c0 2-1 3-3 3H28l-2 14h-8l2-14H4c-2 0-3-1-3-3v-5c0-2 1-3 3-3z', '#6a4a2a') + S('M18 38h28', '#d8c08a', 2) + R(8, 26, 16, 5, 1, '#4a3220')),
  rifle: () => svg(S('M4 30h36l6 2v6H28l-2 16h-7l2-16H4c-2 0-3-1-3-3v-4c0-2 1-3 3-3z', '#3e4a3a') + S('M40 30h18v6H40', '#2a3228', 1.6) + R(14, 24, 16, 6, 1.5, '#2a3228') + C(22, 27, 1.6, '#7fd49a', 1)),
  saw: () => svg(S('M4 28h32l4 3v8H26l-2 16h-8l2-16H4c-2 0-3-1-3-3v-5c0-2 1-3 3-3z', '#4a4a42') + R(36, 26, 22, 12, 3, '#5a5a50') + S('M40 32h16', '#c9a227', 2) + R(10, 22, 18, 6, 1, '#2f2f2a')),
  lever: () => svg(S('M4 32h42c2 0 3 1 3 3v4c0 2-1 3-3 3H26l-1 12h-7l1-12H4c-2 0-3-1-3-3v-4c0-2 1-3 3-3z', '#6a4a28') + S('M22 42c8 2 16 1 20-6', 'none', 2.4) + R(36, 28, 20, 6, 1, '#3a2a18')),
  auto12: () => svg(S('M4 28h40c3 0 5 2 5 5v7c0 3-2 5-5 5H26l-2 12h-9l2-12H4c-2 0-3-1-3-3v-9c0-2 1-5 3-5z', '#4a3a32') + R(40, 26, 18, 14, 3, '#3a2e28') + S('M16 40h22', '#c9a227', 2)),
  handcannon: () => svg(S('M6 26h32c3 0 5 2 5 5v8c0 3-2 5-5 5H26l-3 16h-9l4-16H6c-2 0-3-2-3-4v-9c0-3 1-5 3-5z', '#3a3430') + R(10, 22, 16, 5, 1.5, '#c9a227') + S('M36 28h14v10H36', '#2a2622', 1.6)),
  harpoon: () => svg(S('M6 30h38v8H24l-1 14h-7l1-14H6c-2 0-3-1-3-3v-2c0-2 1-3 3-3z', '#4a6a6e') + S('M44 28l16-8-4 12 4 8-16-6z', '#d8e0e4') + R(10, 26, 14, 4, 1, '#2a4448')),
  minigun: () => svg(S('M8 28h22v16H22l-1 12h-7l1-12H8c-2 0-3-1-3-3V31c0-2 1-3 3-3z', '#4a4a48') + S('M30 26h26v4H30M30 32h26v4H30M30 38h26v4H30', '#6a6a68', 1.4) + C(20, 36, 3, '#c9a227')),
  katana: () => svg(S('M8 50L52 12c3-2 6 1 4 4L16 54c-2 2-6 1-8-1z', '#dfe6ec') + S('M14 48l6 6', '#8a1a1a', 4) + R(10, 46, 12, 6, 1, '#2a2a2a')),
  tomahawk: () => svg(S('M18 54L46 16', '#8a5a32', 4) + S('M40 8c10 4 16 14 14 20-8 0-14-2-20 2 0-8 0-16 6-22z', '#b8c0c6') + R(14, 50, 9, 6, 2, '#5a3a22')),
  longsword: () => svg(S('M30 8c2-1 4-1 4 2v36c0 2-2 3-4 3s-4-1-4-3V10c0-3 2-3 4-2z', '#d5dce2') + S('M16 42h28', '#c9a227', 3) + R(27, 46, 6, 12, 1.5, '#6a4a28')),
  crossbow: () => svg(S('M8 24c16 4 20 4 24 0 0 8-2 14-8 20', 'none', 2.4) + S('M56 24c-16 4-20 4-24 0 0 8 2 14 8 20', 'none', 2.4) + S('M32 14v34', '#6a4a28', 3) + S('M32 20l22 4M32 20L10 24', '#c4a36a', 2) + S('M32 48l4 8h-8z', '#4a3220')),
  flamer: () => svg(R(10, 22, 18, 28, 5, '#4a4a42') + S('M28 30h16c3 0 6 3 8 8 1 4-2 8-6 8H28', '#5a5a52') + S('M50 34c6-4 12-2 12 6-4 0-8 2-12 0', '#ff8a2a', 1.6) + C(19, 36, 4, '#c44', 1.4)),
  launcher: () => svg(S('M6 26h36c4 0 8 4 8 8s-4 8-8 8H22l-2 12h-8l2-12H6c-2 0-4-2-4-4V30c0-2 2-4 4-4z', '#3e4a32') + C(28, 34, 8, '#2a3222') + C(28, 34, 3, '#c9a227') + R(40, 24, 18, 20, 6, '#4a553c')),
  sniper: () => svg(S('M4 32h44c2 0 3 1 3 3v4c0 2-1 3-3 3H26l-1 12h-7l1-12H4c-2 0-3-1-3-3v-4c0-2 1-3 3-3z', '#3a3a36') + R(18, 24, 20, 8, 3, '#2a2a28') + C(28, 28, 2.4, '#7fd49a', 1) + S('M48 32h14v6H48', '#2a2a28', 1.5)),
  crowbar: () => svg(S('M14 54c-4-2-6-8-2-12L42 10c2-2 6-1 8 2 2 2 1 6-2 8L22 48c-2 3-4 6-8 6z', '#8a9098') + S('M48 10c4 0 8 4 6 8', 'none', 2.4)),
};

export function weaponIcon(id) { return (ICONS[id] || ICONS.pistol)(); }
export function shortName(id) { return SHORT[id] || (WEAPONS[id] && WEAPONS[id].name) || id; }

let adapter = null, kind = null, lastSig = '', onKey, onWheel;

function ensureRoot() {
  let el = document.getElementById('wbar');
  if (!el) {
    el = document.createElement('div');
    el.id = 'wbar';
    const hud = document.getElementById('hud');
    if (hud) hud.appendChild(el);
    else document.body.appendChild(el);
  }
  return el;
}

function playing() {
  if (!adapter) return false;
  if (document.body.classList.contains('cine')) return false;
  const hud = document.getElementById('hud');
  if (hud && hud.classList.contains('hidden')) return false;
  for (const id of ['pause', 'inv', 'shop', 'title', 'settings', 'custom', 'warning', 'loading', 'studio', 'chapters', 'ending', 'dead']) {
    const s = document.getElementById(id);
    if (s && !s.classList.contains('hidden') && s.classList.contains('screen')) return false;
  }
  const studio = document.getElementById('studio');
  if (studio && !studio.classList.contains('hidden')) return false;
  const loading = document.getElementById('loading');
  if (loading && !loading.classList.contains('hidden')) return false;
  if (adapter.blocked && adapter.blocked()) return false;
  return true;
}

function bindInput() {
  if (onKey) return;
  onKey = (e) => {
    if (e.repeat || e.altKey || e.ctrlKey || e.metaKey) return;
    if (!playing()) return;
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    const m = /^Digit([1-9])$/.exec(e.code);
    if (m) {
      const owned = (adapter.slots() || []).filter(s => s.owned);
      const slot = owned[+m[1] - 1];
      if (slot) { e.preventDefault(); adapter.equip(slot.id); }
    }
  };
  onWheel = (e) => {
    if (!playing()) return;
    const t = e.target;
    if (t && (t.closest && t.closest('#wbar'))) return; // let the bar scroll itself
    if (t && (t.closest && (t.closest('.panel') || t.closest('.screen') || t.closest('#mpt .panel') || t.closest('#mpt .pausep')))) return;
    const owned = (adapter.slots() || []).filter(s => s.owned);
    if (owned.length < 2) return;
    const cur = adapter.cur();
    const i = Math.max(0, owned.findIndex(s => s.id === cur));
    const dir = e.deltaY > 0 || e.deltaX > 0 ? 1 : -1;
    const next = owned[(i + dir + owned.length) % owned.length];
    if (next) { e.preventDefault(); adapter.equip(next.id); }
  };
  addEventListener('keydown', onKey);
  addEventListener('wheel', onWheel, { passive: false });
}

function unbindInput() {
  if (onKey) removeEventListener('keydown', onKey);
  if (onWheel) removeEventListener('wheel', onWheel);
  onKey = onWheel = null;
}

function render(force) {
  const el = ensureRoot();
  const hud = document.getElementById('hud');
  if (!adapter) {
    el.classList.remove('on');
    if (hud) hud.classList.remove('wbar-on');
    el.innerHTML = '';
    lastSig = '';
    return;
  }
  const slots = adapter.slots() || [];
  const sig = slots.map(s => `${s.id}:${s.owned | 0}:${s.empty | 0}:${s.eq | 0}:${s.ammo || ''}`).join('|') + (document.getElementById('boss') && !document.getElementById('boss').classList.contains('hidden') ? ':b' : '');
  if (!force && sig === lastSig) return;
  lastSig = sig;
  el.classList.add('on');
  if (hud) hud.classList.add('wbar-on');
  el.classList.toggle('boss', !!(document.getElementById('boss') && !document.getElementById('boss').classList.contains('hidden')));
  const owned = slots.filter(s => s.owned);
  el.innerHTML = slots.map((s) => {
    const ki = s.owned ? owned.findIndex(o => o.id === s.id) : -1;
    const key = ki >= 0 && ki < 9 ? `<span class="wk">${ki + 1}</span>` : '';
    const cls = `wslot${s.eq ? ' eq' : ''}${s.owned ? '' : ' off'}${s.empty && s.owned ? ' empty' : ''}`;
    return `<button type="button" class="${cls}" data-id="${s.id}" ${s.owned ? '' : 'disabled tabindex="-1"'} aria-label="${s.name || shortName(s.id)}">${key}<span class="wi">${weaponIcon(s.id)}</span><span class="wn">${shortName(s.id)}</span><span class="wa">${s.ammo || (s.owned ? '—' : '')}</span></button>`;
  }).join('');
  el.querySelectorAll('.wslot:not(.off)').forEach(b => {
    b.addEventListener('click', ev => { ev.preventDefault(); ev.stopPropagation(); adapter.equip(b.dataset.id); });
    b.addEventListener('pointerdown', ev => ev.stopPropagation());
    b.addEventListener('touchstart', ev => ev.stopPropagation(), { passive: true });
  });
  const eq = el.querySelector('.wslot.eq');
  if (eq && eq.scrollIntoView) eq.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
}

export function syncWeaponBar(force) { render(!!force); }

export function setWeaponBarAdapter(next, name) {
  adapter = next;
  kind = next ? name : null;
  lastSig = '';
  if (next) bindInput();
  else unbindInput();
  render(true);
}

export function weaponBarKind() { return kind; }

function gameSlots(g) {
  const s = g.save || {};
  const owned = s.owned || [];
  return WEAPON_ORDER.map(id => {
    const w = WEAPONS[id];
    const have = owned.includes(id);
    const eq = s.cur === id;
    let ammo = '', empty = false;
    if (w && w.type === 'gun') {
      const mag = s.mags && s.mags[id] != null ? s.mags[id] : 0;
      const res = (s.ammo && s.ammo[w.ammo]) || 0;
      ammo = have ? `${mag}/${res}` : '';
      empty = have && mag <= 0 && res <= 0;
    } else {
      ammo = have ? 'Melee' : '';
    }
    return { id, owned: have, eq, ammo, empty, name: w && w.name };
  });
}

export function attachGameWeaponBar(game) {
  if (!game) return;
  setWeaponBarAdapter({
    slots: () => gameSlots(game),
    cur: () => game.save && game.save.cur,
    equip: (id) => { if (game.equip) game.equip(id); },
    blocked: () => !!(game.paused || game.cut || game.dying),
  }, 'game');
}

export function attachTownWeaponBar(ctx) {
  const { bag, ITEMS, WEAPONS: WPN, GS, ammoCount, equipWeapon, pauseOpen } = ctx;
  const order = ['fists', ...WEAPON_ORDER.filter(id => id !== 'fists')];
  for (const k in ITEMS) if ((ITEMS[k].gun || ITEMS[k].melee) && !order.includes(k)) order.push(k);
  setWeaponBarAdapter({
    slots: () => order.map(id => {
      const it = id === 'fists' ? { n: 'Fists' } : ITEMS[id];
      if (id !== 'fists' && !it) return null;
      const have = id === 'fists' || !!(bag.count && bag.count(id));
      const eq = (bag.pref || 'fists') === id;
      const gun = it && it.gun;
      const w = gun && (WPN[gun] || WPN[id]);
      let ammo = '', empty = false;
      if (gun && w) {
        const mag = (GS.mag && (GS.mag[gun] || GS.mag[id])) || 0;
        const res = ammoCount ? ammoCount(gun) : 0;
        ammo = have ? `${mag}/${res}` : '';
        empty = have && mag <= 0 && res <= 0;
      } else {
        ammo = have ? 'Melee' : '';
      }
      return { id, owned: have, eq, ammo, empty, name: (it && it.n) || (w && w.name) || id };
    }).filter(Boolean),
    cur: () => bag.pref || 'fists',
    equip: (id) => equipWeapon && equipWeapon(id),
    blocked: () => !!(pauseOpen && pauseOpen()),
  }, 'town');
}

export function detachWeaponBar(name) {
  if (!name || kind === name) setWeaponBarAdapter(null, null);
}
