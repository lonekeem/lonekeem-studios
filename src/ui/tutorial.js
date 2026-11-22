// Short first-time tutorial: optional, skippable, remembered in localStorage, replayable from Settings.
// Hooks the running game from the outside — no game.js / animation-file changes.
import { WEAPONS } from '../game/data.js';

const SEEN = 'atq.tut.seen';
const $ = s => document.querySelector(s);
const LS = {
  get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } },
};
export const hasSeenTutorial = () => LS.get(SEEN) === '1';
export const markTutorialSeen = () => LS.set(SEEN, '1');

const STEPS = [
  { id: 'move', title: 'Move', kbd: 'Move around with WASD or the arrow keys.', touch: 'Move around with the left stick.' },
  { id: 'shoot', title: 'Aim & shoot', kbd: 'Aim with the mouse and click to shoot. You have a 9mm for this lesson.', touch: 'Aim and tap Fire to shoot. You have a 9mm for this lesson.' },
  { id: 'melee', title: 'Melee', kbd: 'Switch to your fists, then click to attack up close.', touch: 'Switch to your fists, then tap Fire to attack up close.' },
  { id: 'roll', title: 'Roll', kbd: 'Roll to dodge — hold Ctrl.', touch: 'Roll to dodge — tap the Roll button.' },
  { id: 'wep', title: 'Switch weapons', kbd: 'Press Q or the small weapon tab to open your weapon bar, then pick another weapon.', touch: 'Tap the small weapon tab on the edge of the screen to open your weapon bar, then pick another weapon.' },
  { id: 'loot', title: 'Pickups', kbd: 'Walk over the glowing pickup in front of you to collect it.', touch: 'Walk over the glowing pickup in front of you to collect it.' },
];

let active = false, step = 0, loaned = null, playFn = null, toTitleFn = null, pollId = 0;
const isTouch = () => matchMedia('(pointer:coarse)').matches || 'ontouchstart' in window;

function ensureHud() {
  let el = $('#tutHud');
  if (!el) {
    el = document.createElement('div'); el.id = 'tutHud'; el.className = 'hidden';
    el.innerHTML = `<div class="tbox"><div class="tstep"></div><h3></h3><p></p><div class="trow"><button type="button" class="tskip">Skip</button><span class="tprog"></span></div></div>`;
    document.body.appendChild(el);
    el.querySelector('.tskip').onclick = () => skipTutorial({ stay: true });
  }
  return el;
}
function setObjHidden(on) {
  const hud = $('#hud'); if (hud) hud.classList.toggle('tuton', !!on);
}
function paint() {
  const el = ensureHud();
  if (!active) { el.classList.add('hidden'); setObjHidden(false); return; }
  const s = STEPS[Math.min(step, STEPS.length - 1)];
  el.classList.remove('hidden');
  setObjHidden(true);
  el.querySelector('h3').textContent = s.title;
  el.querySelector('p').textContent = isTouch() ? s.touch : s.kbd;
  el.querySelector('.tstep').textContent = 'Tutorial';
  el.querySelector('.tprog').textContent = (Math.min(step, STEPS.length - 1) + 1) + ' / ' + STEPS.length;
}

export function complete(id) {
  if (!active) return false;
  const s = STEPS[step]; if (!s || s.id !== id) return false;
  step++;
  if (step >= STEPS.length) { finish(true); return true; }
  if (STEPS[step].id === 'loot') placePickup();
  paint();
  return true;
}

function finish(done) {
  stopPoll();
  active = false; paint();
  markTutorialSeen();
  restoreLoan();
  const el = $('#tutHud'); if (el) el.classList.add('hidden');
  if (done) {
    try { const g = window.__atq && window.__atq.game; g && g.toast && g.toast('Tutorial complete. Keep playing, or pause to quit.', 3); } catch (e) { /* ignore */ }
    showDone();
  }
}

function showDone() {
  const offer = ensureOffer();
  offer.classList.remove('hidden');
  offer.innerHTML = `<div class="tcard"><h2>You're ready</h2><p>That's the basics: move, shoot, melee, roll, weapons, and pickups. You can replay this any time from Settings.</p>
    <div class="tbtns"><button type="button" class="primary" id="tutStay">Keep playing</button><button type="button" id="tutMenu">Back to menu</button></div></div>`;
  offer.querySelector('#tutStay').onclick = () => offer.classList.add('hidden');
  offer.querySelector('#tutMenu').onclick = () => { offer.classList.add('hidden'); if (typeof toTitleFn === 'function') toTitleFn(); };
}

function hideOffer() { const o = $('#tutOffer'); if (o) o.classList.add('hidden'); }
function ensureOffer() {
  let el = $('#tutOffer');
  if (!el) { el = document.createElement('div'); el.id = 'tutOffer'; el.className = 'hidden'; document.body.appendChild(el); }
  return el;
}

export function skipTutorial(opts = {}) {
  markTutorialSeen();
  hideOffer();
  if (active) finish(false);
  if (!opts.stay) hideOffer();
  try { const g = window.__atq && window.__atq.game; g && g.toast && g.toast('Tutorial skipped. Replay it from Settings any time.', 2.4); } catch (e) { /* ignore */ }
}

export function offerTutorial(opts = {}) {
  if (opts.play) playFn = opts.play;
  if (opts.toTitle) toTitleFn = opts.toTitle;
  if (hasSeenTutorial() || active) { hideOffer(); return false; }
  const el = ensureOffer();
  el.classList.remove('hidden');
  el.innerHTML = `<div class="tcard"><h2>Quick tutorial</h2><p>A short, skippable lesson: move, aim and shoot, melee, roll, switch weapons, and pick things up.</p>
    <div class="tbtns"><button type="button" class="primary" id="tutStart">Start</button><button type="button" id="tutSkip">Skip for now</button></div></div>`;
  el.querySelector('#tutStart').onclick = () => { hideOffer(); startTutorial(opts); };
  el.querySelector('#tutSkip').onclick = () => skipTutorial();
  return true;
}

export function startTutorial(opts = {}) {
  if (opts.play) playFn = opts.play;
  if (opts.toTitle) toTitleFn = opts.toTitle;
  hideOffer();
  active = true; step = 0; paint();
  if (typeof playFn === 'function') playFn();
}

export function onGameReady(g) {
  if (!g) return;
  installHooks(g);
  if (!active) return;
  loanKit(g);
  startPoll(g);
  paint();
}

function isMelee(id) { const w = WEAPONS[id]; return !!(w && w.type === 'melee'); }
function isGun(id) { const w = WEAPONS[id]; return !!(w && w.type === 'gun'); }

function loanKit(g) {
  if (!g.save) return;
  const owned = g.save.owned || (g.save.owned = ['fists']);
  loaned = { owned: owned.slice(), cur: g.save.cur, ammo: Object.assign({}, g.save.ammo || {}), mags: Object.assign({}, g.save.mags || {}) };
  if (!owned.includes('fists')) owned.push('fists');
  if (!owned.includes('pistol')) owned.push('pistol');
  g.save.ammo = g.save.ammo || {};
  g.save.ammo.light = Math.max(g.save.ammo.light || 0, 24);
  g.save.mags = g.save.mags || {};
  if (g.save.mags.pistol == null) g.save.mags.pistol = 12;
  try { g.equip && g.equip('pistol', true); } catch (e) { g.save.cur = 'pistol'; }
}

function restoreLoan() {
  const g = window.__atq && window.__atq.game; if (!g || !loaned || !g.save) { loaned = null; return; }
  const keepPistol = loaned.owned.includes('pistol');
  g.save.owned = loaned.owned.slice();
  if (keepPistol && !g.save.owned.includes('pistol')) g.save.owned.push('pistol');
  g.save.ammo = Object.assign({}, loaned.ammo);
  g.save.mags = Object.assign({}, loaned.mags);
  try { g.equip && g.equip(loaned.cur || 'fists', true); } catch (e) { g.save.cur = loaned.cur || 'fists'; }
  loaned = null;
}

function placePickup() {
  const g = window.__atq && window.__atq.game; if (!g || !g.addPickup || !g.player) return;
  const P = g.player.root.position, yaw = g.player.root.rotation.y;
  const pos = [P.x + Math.sin(yaw) * 3.2, 0.35, P.z + Math.cos(yaw) * 3.2];
  try { g.addPickup({ kind: 'cash', n: 15, pos, label: 'Cash' }); } catch (e) { /* ignore */ }
}

function installHooks(g) {
  if (g.__tutHooks) return; g.__tutHooks = true;
  const fire = g.fire.bind(g);
  g.fire = function (...a) { const out = fire(...a); complete('shoot'); return out; };
  const atk = g.attack.bind(g);
  g.attack = function (...a) {
    const id = this.save && this.save.cur;
    const out = atk(...a);
    if (isGun(id)) complete('shoot'); else if (isMelee(id)) complete('melee');
    return out;
  };
  const roll = g.roll.bind(g);
  g.roll = function (...a) { const out = roll(...a); complete('roll'); return out; };
  const swap = g.swap && g.swap.bind(g);
  if (swap) g.swap = function (...a) { const out = swap(...a); complete('wep'); return out; };
  const equip = g.equip.bind(g);
  g.equip = function (id, silent) { const out = equip(id, silent); if (!silent) complete('wep'); return out; };
  const take = g.takePickup.bind(g);
  g.takePickup = function (p) { const out = take(p); complete('loot'); return out; };
}

function startPoll(g) {
  stopPoll();
  let moved = 0;
  pollId = setInterval(() => {
    if (!active || !g) return stopPoll();
    const I = g.input;
    if (I && I.move && I.move.lengthSq && I.move.lengthSq() > 0.08) { moved++; if (moved >= 2) complete('move'); }
    try { const bar = document.getElementById('wbar'); if (bar && bar.classList.contains('open')) complete('wep'); } catch (e) { /* ignore */ }
    if (g.state && g.state.roll > 0) complete('roll');
  }, 120);
}
function stopPoll() { if (pollId) { clearInterval(pollId); pollId = 0; } }

export function initTutorial(opts = {}) {
  if (opts.play) playFn = opts.play;
  if (opts.toTitle) toTitleFn = opts.toTitle;
  ensureHud(); ensureOffer();
  const b = $('#btnReplayTut'); if (b) b.addEventListener('click', () => { const st = document.getElementById('settings'); if (st) st.classList.add('hidden'); startTutorial(opts); });
  if (typeof window !== 'undefined' && /^(localhost|127\.0\.0\.1)$/.test(location.hostname)) {
    window.__atqTut = {
      start: () => startTutorial(opts), skip: skipTutorial, offer: () => offerTutorial(opts),
      seen: hasSeenTutorial, mark: markTutorialSeen, active: () => active, step: () => (STEPS[step] ? STEPS[step].id : 'done'),
      complete, steps: STEPS.map(s => s.id), reset: () => { LS.set(SEEN, ''); active = false; step = 0; hideOffer(); paint(); },
    };
  }
}
