// v1.9.90: one table of every control for touch, controller (standard mapping, see game/input.js) and keyboard + mouse,
// plus "which device is the player using right now". Used by the tutorial, the Controls screen and the town tutorial.
const coarse = () => { try { return matchMedia('(pointer:coarse)').matches || 'ontouchstart' in window; } catch (e) { return false; } };
const padOn = () => document.body && document.body.classList.contains('pad');
let dev = null, lastTouch = 0;
export const DEVICES = { touch: 'Touch screen', pad: 'Controller', kbd: 'Keyboard & mouse' };
export function device() { if (padOn()) return 'pad'; return dev || (coarse() ? 'touch' : 'kbd'); }
function set(d) { const was = device(); dev = d; const now = device(); if (now !== was) window.dispatchEvent(new CustomEvent('atq:device', { detail: now })); }
let inst = false;
export function installDeviceWatch() { if (inst) return; inst = true;
  addEventListener('touchstart', () => { lastTouch = performance.now(); set('touch'); }, { capture: true, passive: true });
  addEventListener('keydown', e => { if (e.key && e.key.length && !e.repeat) set('kbd'); }, true);
  addEventListener('mousedown', e => { if (performance.now() - lastTouch > 900 && !(e.sourceCapabilities && e.sourceCapabilities.firesTouchEvents)) set('kbd'); }, true);
  addEventListener('atq:padmode', e => { if (e.detail) { const was = dev; dev = 'pad'; if (was !== 'pad') window.dispatchEvent(new CustomEvent('atq:device', { detail: 'pad' })); } else if (dev === 'pad') set(coarse() ? 'touch' : 'kbd'); });
}

// ---- glyphs ----
const P = { A: 'a', B: 'b', X: 'x', Y: 'y' };
export const pg = t => `<kbd class="pg${P[t] ? ' ' + P[t] : ' sh'}">${t}</kbd>`;
export const kk = t => `<kbd class="kk">${t}</kbd>`;
const or = ' <span class="or">or</span> ';

// sel: the real on-screen touch button(s) to point at (first visible one wins); area: a screen region instead of a button.
export const CONTROLS = [
  { id: 'move', title: 'Move', what: 'Walk around. Push the stick further to jog.', touch: { sel: '#stickBase, #stickZone', name: 'Left joystick', how: 'Drag the left joystick.' }, pad: pg('L-stick'), kbd: kk('W') + kk('A') + kk('S') + kk('D') + or + 'arrow keys' },
  { id: 'look', title: 'Look around', what: 'Turn the camera.', touch: { area: 'look', name: 'Drag right side', how: 'Drag anywhere on the right side of the screen.' }, pad: pg('R-stick'), kbd: 'Mouse <span class="or">(click the game to lock it)</span>' },
  { id: 'aim', title: 'Aim', what: 'Steady your gun and zoom in.', touch: { sel: '#tAim', name: '◎ Aim', how: 'Hold ◎ (tap to toggle).' }, pad: 'Hold ' + pg('LT'), kbd: 'Hold right mouse' },
  { id: 'fire', title: 'Fire / attack', what: 'Shoot, or swing and punch with a melee weapon.', touch: { sel: '#tAtk', name: 'FIRE', how: 'Press the big FIRE button.' }, pad: pg('RT'), kbd: 'Left click' + or + kk('J') },
  { id: 'jump', title: 'Jump', what: 'Hop over low things.', touch: { sel: '#tJump', name: 'JUMP', how: 'Tap JUMP.' }, pad: pg('A'), kbd: kk('Space') },
  { id: 'roll', title: 'Dodge roll', what: 'Roll out of a zombie’s reach.', touch: { sel: '#tRoll', name: 'ROLL', how: 'Tap ROLL.' }, pad: pg('B'), kbd: kk('Ctrl') },
  { id: 'crouch', title: 'Crouch', what: 'Sneak low and quiet. Press again to stand.', touch: { sel: '#tCrouch', name: 'CRCH', how: 'Tap CRCH.' }, pad: pg('R3') + ' <span class="or">(press the right stick)</span>', kbd: kk('C') },
  { id: 'run', title: 'Sprint', what: 'Run faster while moving.', touch: { sel: '#tRun', name: 'RUN', how: 'Tap RUN while you move (or push the joystick all the way).' }, pad: pg('L3') + ' <span class="or">(press the left stick while moving)</span>', kbd: 'Hold ' + kk('Shift') },
  { id: 'reload', title: 'Reload', what: 'Refill your gun’s magazine.', touch: { sel: '#tReload', name: '⟳ Reload', how: 'Tap ⟳.' }, pad: pg('Y'), kbd: kk('R') },
  { id: 'swap', title: 'Switch weapon', what: 'Cycle to your next weapon.', touch: { sel: '#tSwap, #btnSwap, #wbar', name: '⇄ Swap', how: 'Tap ⇄.', alt: { wbar: { name: 'Weapon bar', how: 'Tap another weapon in the weapon bar.' } } }, pad: pg('RB') + or + pg('D-pad ◀ ▶'), kbd: kk('1') + '–' + kk('9') + or + 'mouse wheel' + or + kk('Q') + ' for the weapon bar' },
  { id: 'gren', title: 'Grenade', what: 'Throw a grenade at a crowd.', touch: { sel: '#tGren, #btnGren', name: '💣', how: 'Tap 💣.' }, pad: pg('LB'), kbd: kk('G') },
  { id: 'use', title: 'Use / talk', what: 'Open doors, pick things up, get in vehicles and talk. Also skips a dialogue line.', touch: { sel: '#tUse', name: '✋ Hand', how: 'Tap the ✋ hand button.' }, pad: pg('X') + or + pg('D-pad ▲'), kbd: kk('E') + or + kk('F') },
  { id: 'heal', title: 'Heal', what: 'Use a med kit for +50 health.', touch: { sel: '#pfp', name: 'Your portrait', how: 'Tap your portrait (top left).' }, pad: pg('D-pad ▼'), kbd: kk('H') },
  { id: 'camera', title: 'Camera view', what: 'Switch between first and third person.', touch: { sel: '#btnView', name: '👁', how: 'Tap 👁.' }, pad: pg('View'), kbd: kk('V') },
  { id: 'pause', title: 'Pause', what: 'Open the pause menu (shop, settings, controls).', touch: { sel: '#btnPause', name: 'II', how: 'Tap II (top right).' }, pad: pg('Start'), kbd: kk('Esc') + or + kk('P') },
];
const MENUS = { pad: pg('D-pad') + ' move · ' + pg('A') + ' select · ' + pg('B') + ' back · ' + pg('LB') + pg('RB') + ' tabs', kbd: 'Mouse · ' + kk('Esc') + ' back', touch: 'Tap' };
const tAlt = c => { if (!c.touch.alt) return c.touch; const t = touchTarget(c); return (t && c.touch.alt[t.id]) || c.touch; };
export const touchName = c => tAlt(c).name;
export const controlHtml = (c, d = device()) => d === 'touch' ? tAlt(c).name : d === 'pad' ? c.pad : c.kbd;
export const howHtml = (c, d = device()) => d === 'touch' ? tAlt(c).how : d === 'pad' ? 'Press ' + c.pad + '.' : 'Press ' + c.kbd + '.';
// first visible element for a touch control (falls back to null if that button isn't on this HUD layout)
export function touchTarget(c) { if (!c.touch.sel) return null; for (const s of c.touch.sel.split(',')) { const e = document.querySelector(s.trim()); if (!e) continue; const r = e.getBoundingClientRect(); if (r.width > 4 && r.height > 4 && getComputedStyle(e).visibility !== 'hidden') return e; } return null; }

// ---- Controls screen (Settings → Controls, Pause → Controls) ----
let shown = null;
export function renderControls(d) { const box = document.getElementById('ctlRef'); if (!box) return; shown = d || device();
  const tabs = Object.keys(DEVICES).map(k => `<button type="button" data-dev="${k}" class="${k === shown ? 'on' : ''}">${DEVICES[k]}${k === device() ? ' ●' : ''}</button>`).join('');
  const rows = CONTROLS.map(c => `<tr><td>${c.title}</td><td class="ck">${controlHtml(c, shown)}</td><td class="cw">${c.what}</td></tr>`).join('') + `<tr><td>Menus</td><td class="ck">${MENUS[shown]}</td><td class="cw">Move around menus, the shop and the creator.</td></tr>`;
  box.innerHTML = `<div class="ctabs">${tabs}</div><p class="small cnow">You're using: <b>${DEVICES[device()]}</b>${shown !== device() ? ' · showing ' + DEVICES[shown] : ''}</p><table class="ctbl">${rows}</table>`;
  box.querySelectorAll('.ctabs button').forEach(b => b.onclick = () => renderControls(b.dataset.dev)); }
export function installControlsScreen() { const scr = document.getElementById('controls'); if (!scr) return;
  new MutationObserver(() => { if (!scr.classList.contains('hidden')) renderControls(); }).observe(scr, { attributes: true, attributeFilter: ['class'] });
  addEventListener('atq:device', () => { if (!scr.classList.contains('hidden')) renderControls(); }); }
