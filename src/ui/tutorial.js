// Short first-time tutorial: optional, skippable, remembered in localStorage, replayable from Settings.
// Hooks the running game from the outside — no game.js / animation-file changes.
import { WEAPONS } from '../game/data.js';
import { CONTROLS, DEVICES, device, controlHtml, howHtml, touchTarget, touchName } from './controls.js';

const SEEN = 'atq.tut.seen';
const $ = s => document.querySelector(s);
const LS = {
  get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } },
};
export const hasSeenTutorial = () => LS.get(SEEN) === '1';
export const markTutorialSeen = () => LS.set(SEEN, '1');

// v1.9.90: one step per control, taught for the device in use right now (touch / controller / keyboard + mouse). Touch steps ring the real
// on-screen button, controller steps show the button glyph, keyboard steps show the key. Switching device mid-step repaints at once.
const STEPS = CONTROLS.map(c => ({ id: c.id, c }));
const STEP_KEY = 'atq.tut.step';
const AUTO = 35; // seconds before a step moves on by itself (a control that can't happen here never blocks the lesson)

let active = false, step = 0, loaned = null, playFn = null, toTitleFn = null, pollId = 0, doneFlash = 0, stepT = 0;
const isTouch = () => matchMedia('(pointer:coarse)').matches || 'ontouchstart' in window;
const savedStep = () => Math.max(0, Math.min(STEPS.length - 1, parseInt(LS.get(STEP_KEY) || '0', 10) || 0));

function ensureHud() {
  let el = $('#tutHud');
  if (!el) {
    el = document.createElement('div'); el.id = 'tutHud'; el.className = 'hidden';
    el.innerHTML = `<div class="tbox"><button type="button" class="tx" aria-label="Close tutorial">✕</button><div class="tstep"></div><h3><span class="tt"></span><span class="tk"></span></h3><p class="tw"></p><p class="th"></p><div class="trow"><span class="tprog"></span><span class="tdev"></span><button type="button" class="tskip">Skip</button><button type="button" class="tnext primary">Next</button></div></div>`;
    document.body.appendChild(el);
    // iOS: act on touchend so the stick / camera layers underneath never swallow the tap
    const tapped = (q, fn) => { let tt = 0; q.addEventListener('touchend', e => { e.preventDefault(); e.stopPropagation(); tt = performance.now(); fn(); }, { passive: false }); q.addEventListener('click', e => { e.stopPropagation(); if (performance.now() - tt < 700) return; fn(); }); };
    ['touchstart', 'touchmove', 'pointerdown', 'mousedown'].forEach(t => el.addEventListener(t, e => e.stopPropagation(), { passive: true }));
    tapped(el.querySelector('.tskip'), () => skipTutorial({ stay: true }));
    tapped(el.querySelector('.tx'), () => skipTutorial({ stay: true }));
    tapped(el.querySelector('.tnext'), () => { if (active) go(step + 1); });
  }
  if (!$('#tutRing')) { const r = document.createElement('div'); r.id = 'tutRing'; r.className = 'hidden'; r.innerHTML = '<i></i><b></b>'; document.body.appendChild(r); }
  return el;
}
function setObjHidden(on) {
  const hud = $('#hud'); if (hud) hud.classList.toggle('tuton', !!on);
}
function ring() {
  const r = $('#tutRing'); if (!r) return;
  const s = active && STEPS[step]; const d = device();
  if (!s || d !== 'touch' || doneFlash || (window.__atq && window.__atq.state !== 'play')) { r.classList.add('hidden'); return; }
  const c = s.c; let box = null;
  if (c.touch.area === 'look') { const W = innerWidth, H = innerHeight; box = { left: W * .52, top: H * .3, width: W * .26, height: H * .36, area: true }; }
  else { const t = touchTarget(c); if (t) { const q = t.getBoundingClientRect(); const pad = 7; box = { left: q.left - pad, top: q.top - pad, width: q.width + pad * 2, height: q.height + pad * 2 }; } }
  if (!box) { r.classList.add('hidden'); return; }
  r.classList.remove('hidden'); r.classList.toggle('area', !!box.area);
  Object.assign(r.style, { left: box.left + 'px', top: box.top + 'px', width: box.width + 'px', height: box.height + 'px' });
  const lab = r.querySelector('b'); lab.textContent = box.area ? 'drag here' : touchName(c);
  // label sits on whichever side has room (never under the finger, never off-screen)
  const above = box.top > 40; lab.style.top = above ? '-24px' : 'auto'; lab.style.bottom = above ? 'auto' : '-24px';
  const lw = lab.offsetWidth || 80, cx = box.left + box.width / 2; let dx = 0; if (cx - lw / 2 < 4) dx = 4 - (cx - lw / 2); else if (cx + lw / 2 > innerWidth - 4) dx = innerWidth - 4 - (cx + lw / 2); lab.style.transform = `translateX(calc(-50% + ${dx}px))`;
}
function paint() {
  const el = ensureHud();
  if (!active) { el.classList.add('hidden'); setObjHidden(false); ring(); return; }
  const i = Math.min(step, STEPS.length - 1), s = STEPS[i], d = device();
  el.classList.remove('hidden'); el.dataset.dev = d; el.dataset.step = s.id;
  setObjHidden(true);
  el.querySelector('.tt').textContent = s.c.title;
  el.querySelector('.tk').innerHTML = controlHtml(s.c, d);
  el.querySelector('.tw').textContent = s.c.what;
  el.querySelector('.th').innerHTML = doneFlash ? '<span class="tok">✓ Nice!</span>' : howHtml(s.c, d);
  el.querySelector('.tstep').textContent = 'Tutorial · ' + DEVICES[d];
  el.querySelector('.tprog').textContent = (i + 1) + ' / ' + STEPS.length;
  el.querySelector('.tnext').textContent = i === STEPS.length - 1 ? 'Done' : 'Next';
  ring();
}
addEventListener('atq:device', () => { if (active) paint(); });
addEventListener('resize', () => { if (active) ring(); });

function go(k) {
  doneFlash = 0; stepT = 0; step = k;
  if (step >= STEPS.length) { LS.set(STEP_KEY, '0'); finish(true); return; }
  LS.set(STEP_KEY, String(step)); paint();
}

export function complete(id) {
  if (!active || doneFlash) return false;
  const s = STEPS[step]; if (!s || s.id !== id) return false;
  doneFlash = 1; paint(); const at = step;
  setTimeout(() => { if (active && step === at) go(step + 1); }, 750);
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
  offer.innerHTML = `<div class="tcard"><h2>You're ready</h2><p>That's every control. Find them again any time under Pause → Controls or Settings → Controls, and replay this lesson from Settings.</p>
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
  const el = ensureOffer(); const resume = savedStep() > 0;
  el.classList.remove('hidden');
  el.innerHTML = `<div class="tcard"><h2>${resume ? 'Finish the tutorial' : 'Quick tutorial'}</h2><p>${resume ? `Pick up where you left off (step ${savedStep() + 1} of ${STEPS.length}).` : 'Learn every control, step by step, for whatever you play with: touch, controller or keyboard.'}</p>
    <div class="tbtns"><button type="button" class="primary" id="tutStart">Start</button><button type="button" id="tutSkip">Skip for now</button></div></div>`;
  el.querySelector('#tutStart').onclick = () => { hideOffer(); startTutorial(Object.assign({}, opts, { resume: true })); };
  el.querySelector('#tutSkip').onclick = () => skipTutorial();
  return true;
}

export function startTutorial(opts = {}) {
  if (opts.play) playFn = opts.play;
  if (opts.toTitle) toTitleFn = opts.toTitle;
  hideOffer();
  active = true; step = opts.resume ? savedStep() : 0; doneFlash = 0; stepT = 0; LS.set(STEP_KEY, String(step)); paint();
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
  loaned.meds = g.save.meds; loaned.gren = g.save.grenades; g.save.meds = Math.max(g.save.meds || 0, 1); g.save.grenades = Math.max(g.save.grenades || 0, 1);
  try { g.equip && g.equip('pistol', true); } catch (e) { g.save.cur = 'pistol'; }
}

function restoreLoan() {
  const g = window.__atq && window.__atq.game; if (!g || !loaned || !g.save) { loaned = null; return; }
  const keepPistol = loaned.owned.includes('pistol');
  g.save.owned = loaned.owned.slice();
  if (keepPistol && !g.save.owned.includes('pistol')) g.save.owned.push('pistol');
  g.save.ammo = Object.assign({}, loaned.ammo);
  g.save.mags = Object.assign({}, loaned.mags);
  if (loaned.meds != null) g.save.meds = Math.min(g.save.meds, loaned.meds); else g.save.meds = 0; if (loaned.gren != null) g.save.grenades = Math.min(g.save.grenades, loaned.gren); else g.save.grenades = 0;
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
  g.fire = function (...a) { const out = fire(...a); complete('fire'); return out; };
  const atk = g.attack.bind(g);
  g.attack = function (...a) { const out = atk(...a); complete('fire'); return out; };
  const roll = g.roll.bind(g);
  g.roll = function (...a) { const out = roll(...a); complete('roll'); return out; };
  const swap = g.swap && g.swap.bind(g);
  if (swap) g.swap = function (...a) { const out = swap(...a); complete('swap'); return out; };
  const equip = g.equip.bind(g);
  g.equip = function (id, silent) { const out = equip(id, silent); if (!silent) complete('swap'); return out; };
  // every one-shot action (any device) is consumed through input.pressed(): watch it
  const I = g.input; if (I && I.pressed && !I.__tutWrap) { I.__tutWrap = true; const pr = I.pressed.bind(I); const MAP = { jump: 'jump', roll: 'roll', crouch: 'crouch', reload: 'reload', swap: 'swap', gren: 'gren', use: 'use', heal: 'heal', view: 'camera' };
    I.pressed = k => { const v = pr(k); if (v && MAP[k]) complete(MAP[k]); return v; }; }
  const op = g.onPause; if (typeof op === 'function' && !g.__tutPause) { g.__tutPause = true; g.onPause = function (...a) { if (active && STEPS[step] && STEPS[step].id === 'pause') pauseSeen = true; return op.apply(this, a); }; }
}

let pauseSeen = false;
function startPoll(g) {
  stopPoll();
  let moved = 0, yaw0 = null, last = performance.now();
  pollId = setInterval(() => {
    if (!active || !g) return stopPoll();
    const now = performance.now(), dt = (now - last) / 1000; last = now;
    const st = window.__atq && window.__atq.state;
    if (st === 'play' && !doneFlash) { stepT += dt; if (stepT > AUTO) go(step + 1); }
    const id = STEPS[step] && STEPS[step].id, I = g.input, S = g.state || {};
    if (id !== 'look') yaw0 = null;
    if (id === 'move' && I && I.move && I.move.lengthSq() > 0.08) { if (++moved >= 3) complete('move'); }
    if (id === 'look' && g.cam) { if (yaw0 == null) yaw0 = g.cam.yaw; else if (Math.abs(g.cam.yaw - yaw0) > 0.6) complete('look'); }
    if (id === 'aim' && (S.aim || (I && I.aim))) complete('aim');
    if (id === 'run' && (S.run || (I && I.run)) && I && I.move && I.move.lengthSq() > 0.08) complete('run');
    if (id === 'crouch' && S.crouch) complete('crouch');
    if (id === 'reload' && S.reload > 0) complete('reload');
    if (id === 'swap') { try { const bar = document.getElementById('wbar'); if (bar && bar.classList.contains('open')) complete('swap'); } catch (e) { /* ignore */ } }
    if (id === 'pause' && st === 'paused') pauseSeen = true;
    if (id === 'pause' && pauseSeen && st === 'play') { pauseSeen = false; complete('pause'); }
    ring(); // buttons can move (HUD editor, rotation, safe areas)
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
      complete, flash: () => doneFlash, stepT: () => stepT, steps: STEPS.map(s => s.id), reset: () => { LS.set(SEEN, ''); active = false; step = 0; hideOffer(); paint(); },
    };
  }
}
