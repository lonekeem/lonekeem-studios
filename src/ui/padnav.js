// v1.9.86: controller (Gamepad API) navigation for menus, overlays and the character creator.
// D-pad / left stick moves a focus ring between the visible buttons of the top-most menu, A presses,
// B goes back, LB/RB switch tabs, right stick scrolls, Start resumes. While a menu is up the gameplay
// Input ignores the pad (window.__padMenu). body.pad is set while the pad is the last thing used, which
// swaps on-screen prompts to controller glyphs and fades the touch buttons; any touch / mouse / key flips it back.
import { handleHardwareBack } from './hwBack.js';

const CAND = 'button, [role=button], input:not([type=hidden]), select, textarea, a[href], #mpc .sw i, [data-pad]';
// Gameplay HUD: never a menu, never focusable by the pad.
const HUD = '#hud, #touch, #hudr, #drive, #dlg, #lookRing, #wbar, #skipObj, #tutHud, #rwToast, #toast, #cine, #mpt .top, #mpt .btns, #mpt .stick, #mpt .chatui, #mpt .infbar, #mpt .mini, #mpl, .chold';
const CSS = `.padfocus{outline:3px solid #ffd54a !important;outline-offset:2px !important;box-shadow:0 0 0 6px #ffd54a44,0 0 14px #ffd54acc !important;position:relative;z-index:2}
body.pad #touch, body.pad #mpt .btns, body.pad #mpt .stick{opacity:0 !important;transition:opacity .25s}
kbd.pg{display:inline-flex;align-items:center;justify-content:center;min-width:1.35em;height:1.35em;padding:0 .2em;border-radius:50%;font:700 .78em system-ui,sans-serif;color:#fff;background:#3b3f48;border:1px solid #fff6;vertical-align:.05em;margin:0 .15em}
kbd.pg.a{background:#2e8b3e}kbd.pg.b{background:#b8332e}kbd.pg.x{background:#2f62c4}kbd.pg.y{background:#c9a21e;color:#111}kbd.pg.sh{border-radius:.4em;font-size:.68em;padding:0 .35em}`;

const st = { on: false, focus: null, prev: {}, rep: {}, menu: false, last: 0 };
const vis = el => { if (!el || !el.isConnected) return false; const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return false; const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0) return false; if (el.disabled) return false; for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) { const c = getComputedStyle(p); if (c.display === 'none' || c.visibility === 'hidden' || +c.opacity === 0) return false; } return true; };
const scroller = el => { for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) { const c = getComputedStyle(p); if (/(auto|scroll)/.test(c.overflowY + c.overflowX) && (p.scrollHeight > p.clientHeight + 2 || p.scrollWidth > p.clientWidth + 2)) return p; } return null; };
const hitIs = (el, x, y) => { const h = document.elementFromPoint(x, y); return !!h && (h === el || el.contains(h) || (h.closest && h.closest('label') && h.closest('label').contains(el))); };
// An element counts if a point of it is on top, or it is scrolled out of view inside a scroller that is itself on top.
function onTop(el) { const r = el.getBoundingClientRect(), W = innerWidth, H = innerHeight;
  const x = Math.min(W - 2, Math.max(1, r.left + r.width / 2)), y = Math.min(H - 2, Math.max(1, r.top + r.height / 2));
  const inView = r.bottom > 1 && r.top < H - 1 && r.right > 1 && r.left < W - 1;
  if (inView && (hitIs(el, x, y) || hitIs(el, r.left + 3, r.top + 3) || hitIs(el, r.right - 3, r.bottom - 3))) return true;
  const s = scroller(el); if (!s) return false; const q = s.getBoundingClientRect(); const sx = Math.min(W - 2, Math.max(1, q.left + q.width / 2)), sy = Math.min(H - 2, Math.max(1, q.top + q.height / 2));
  const hit = document.elementFromPoint(sx, sy); if (!hit || !(hit === s || s.contains(hit))) return false;
  // clipped by its scroller (not the viewport): reachable by scrolling
  return r.bottom <= q.top + 2 || r.top >= q.bottom - 2 || r.right <= q.left + 2 || r.left >= q.right - 2 || inView; }
export function candidates() { return [...document.querySelectorAll(CAND)].filter(el => !el.closest(HUD) && vis(el) && onTop(el)); }

const rc = el => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, r }; };
function pickDefault(list) { return list.find(e => e.matches('[autofocus], #btnContinue, #btnResume, #btnRetry, #btnEndNext, .tabs button.on')) || list.slice().sort((a, b) => { const A = rc(a), B = rc(b); return (A.y - B.y) * 3 + (A.x - B.x) * .5; })[0]; }
function setFocus(el) { if (st.focus === el) return; if (st.focus) st.focus.classList.remove('padfocus'); st.focus = el; if (!el) return; el.classList.add('padfocus'); try { el.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (e) { } }
function move(dx, dy, list) { if (!st.focus || !list.includes(st.focus)) return setFocus(pickDefault(list));
  const a = rc(st.focus); let best = null, bs = 1e9;
  for (const el of list) { if (el === st.focus) continue; const b = rc(el); const vx = b.x - a.x, vy = b.y - a.y; const along = vx * dx + vy * dy; if (along <= 4) continue; const ortho = Math.abs(vx * dy - vy * dx);
    // overlap on the cross axis counts as aligned
    const ov = dx ? Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top) : Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left);
    const s = along + (ov > 0 ? 0 : ortho * 2.2); if (s < bs) { bs = s; best = el; } }
  if (best) setFocus(best); }
function press(el) { if (!el) return; if (el.matches('input[type=text], input:not([type]), input[type=search], textarea')) { el.focus(); return; } if (el.matches('input[type=range]')) return; if (el.matches('select')) { cycle(el, 1); return; }
  try { el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true })); } catch (e) { }
  el.click(); }
function cycle(sel, d) { const n = sel.options.length; if (!n) return; sel.selectedIndex = (sel.selectedIndex + d + n) % n; sel.dispatchEvent(new Event('input', { bubbles: true })); sel.dispatchEvent(new Event('change', { bubbles: true })); }
function nudge(el, d) { const mn = +el.min || 0, mx = el.max === '' ? 100 : +el.max, step = +el.step || 1; let inc = Math.max(step, (mx - mn) / 20); inc = Math.round(inc / step) * step || step; el.value = Math.min(mx, Math.max(mn, +el.value + d * inc)); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }
const BACK = /^(?:[✕×✖←⟵]|x|back|close|cancel|done|resume|‹\s*back|←\s*back)$/i;
function back(list) {
  // town panels / pause first, then any obvious back/close button in the top menu, then the Android back logic
  const tp = document.querySelector('#mpt .pausep'); if (tp && vis(tp)) { const r = [...tp.querySelectorAll('button')].find(b => /resume|back|close/i.test(b.textContent)); if (r) { r.click(); return; } }
  const lab = list.filter(b => BACK.test((b.textContent || b.getAttribute('aria-label') || '').trim()) || b.matches('.back, .back2, .x, .close, .wback, [id$=Back], [id$=Close], [id$=Cancel]'));
  if (lab.length) { lab.sort((a, b) => rc(a).y - rc(b).y); lab[0].click(); return; }
  try { handleHardwareBack(); } catch (e) { } }
function tabs(d) { const f = st.focus; let bar = null;
  const bars = [...document.querySelectorAll('.tabs, [id$=Tabs], .ctabs, .stabs')].filter(b => vis(b) && b.querySelectorAll('button').length > 1 && onTop(b.querySelector('button')));
  if (!bars.length) return false; bar = (f && bars.find(b => b.contains(f))) || bars[0];
  const bs = [...bar.querySelectorAll('button')].filter(vis); let i = bs.findIndex(b => b.matches('.on, .sel, .active, [aria-selected=true]')); if (i < 0) i = 0;
  const n = bs[(i + d + bs.length) % bs.length]; n.click(); setTimeout(() => { setFocus(null); }, 0); return true; }

function markPad(on) { if (on === st.on) return; st.on = on; document.body.classList.toggle('pad', on); window.dispatchEvent(new CustomEvent('atq:padmode', { detail: on })); if (!on) setFocus(null); }
export const padMode = () => st.on;
// Prompt helpers shared by story + town: the hand/use glyph and objective hints.
export const useGlyph = () => st.on ? 'Ⓧ' : '✋';
export const padHint = h => h.replace(/\(WASD \/ left stick\)/g, '(left stick)').replace(/\bE \/ ✋/g, 'Ⓧ').replace(/\bPress E\b/g, 'Press Ⓧ').replace(/\bTap ✋/g, 'Press Ⓧ').replace(/✋ hand button/g, 'Ⓧ').replace(/GAS\/BRAKE \+ ◀ ▶ \([^)]*\)/g, 'RT gas / LT brake + left stick').replace(/\bWASD\b/g, 'left stick');

function frame() {
  requestAnimationFrame(frame);
  const pads = navigator.getGamepads ? [...navigator.getGamepads()] : []; const p = pads.find(q => q && q.connected);
  if (!p) { st.menu = window.__padMenu = false; return; }
  const B = i => !!(p.buttons[i] && (p.buttons[i].pressed || p.buttons[i].value > .5)); const ax = p.axes || [];
  const anyB = p.buttons.some((b, i) => i !== 16 && b && b.pressed), anyA = ax.some(v => Math.abs(v) > .5);
  if (anyB || anyA) markPad(true);
  const now = performance.now();
  let list = null;
  if (now - (st.lc || 0) > 150 || anyB || anyA) { st.lc = now; list = candidates(); st.list = list; st.menu = list.length > 0; } else list = st.list || [];
  window.__padMenu = st.menu;
  if (!st.menu) { if (st.focus) setFocus(null); st.prev = Object.fromEntries(p.buttons.map((b, i) => [i, B(i)])); return; }
  if (st.on && (!st.focus || !st.focus.isConnected || !list.includes(st.focus))) setFocus(pickDefault(list));
  const edge = i => { const v = B(i); const e = v && !st.prev[i]; st.prev[i] = v; return e; };
  // repeat for held directions
  const dir = (key, held) => { if (!held) { st.rep[key] = 0; return false; } const t = st.rep[key]; if (!t) { st.rep[key] = now + 380; return true; } if (now >= t) { st.rep[key] = now + 120; return true; } return false; };
  const lx = ax[0] || 0, ly = ax[1] || 0;
  const L = dir('l', B(14) || lx < -.55), R = dir('r', B(15) || lx > .55), U = dir('u', B(12) || ly < -.55), D = dir('d', B(13) || ly > .55);
  const f = st.focus;
  if (f && f.matches('input[type=range]') && (L || R)) nudge(f, L ? -1 : 1);
  else if (f && f.matches('select') && (L || R)) cycle(f, L ? -1 : 1);
  else if (L) move(-1, 0, list); else if (R) move(1, 0, list);
  if (U) move(0, -1, list); else if (D) move(0, 1, list);
  const ry = ax[3] || 0; if (Math.abs(ry) > .25) { const s = (f && scroller(f)) || document.querySelector('#mpc .body'); if (s) s.scrollTop += ry * 14; }
  const rx = ax[2] || 0; if (Math.abs(rx) > .3) { const cv = document.querySelector('#mpc .stage canvas'); if (cv && vis(cv)) { const r = cv.getBoundingClientRect(), y = r.top + r.height / 2, x = r.left + r.width / 2; const o = { bubbles: true, clientX: x, clientY: y, pointerId: 77, pointerType: 'mouse', isPrimary: true, buttons: 1 }; try { cv.dispatchEvent(new PointerEvent('pointerdown', o)); cv.dispatchEvent(new PointerEvent('pointermove', { ...o, clientX: x + rx * 9 })); cv.dispatchEvent(new PointerEvent('pointerup', { ...o, clientX: x + rx * 9, buttons: 0 })); } catch (e) { } } }
  if (edge(0)) press(st.focus || pickDefault(list));
  if (edge(1)) back(list);
  if (edge(4)) tabs(-1); if (edge(5)) tabs(1);
  if (edge(9)) { const r = document.querySelector('#btnResume'); if (r && vis(r)) r.click(); else back(list); }
  for (let i = 0; i < p.buttons.length; i++) if (![0, 1, 4, 5, 9].includes(i)) st.prev[i] = B(i);
}

let inst = false;
export function installPadNav() { if (inst) return; inst = true;
  const s = document.createElement('style'); s.textContent = CSS; document.head.append(s);
  const off = () => markPad(false);
  addEventListener('touchstart', off, { capture: true, passive: true }); addEventListener('mousedown', off, true); addEventListener('keydown', off, true);
  addEventListener('gamepadconnected', () => markPad(true));
  addEventListener('gamepaddisconnected', () => { if (!(navigator.getGamepads && [...navigator.getGamepads()].some(q => q && q.connected))) markPad(false); });
  requestAnimationFrame(frame);
  window.__padNav = { candidates, get focus() { return st.focus; }, get menu() { return st.menu; }, get on() { return st.on; } };
}
