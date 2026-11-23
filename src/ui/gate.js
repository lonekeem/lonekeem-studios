// First-launch age check + terms of use, then the backstory video on every launch.
// Under-13 policy: strong language forced off, no Google sign-in, no online play/chat/leaderboard.
// Story and Survival stay available. Keem should review the agreement wording before treating it as legal text.

import './gate.css';
import { playIntroVideo, preloadIntro, skipIntroIfOpen, isIntroPlaying, gateToast } from './introVideo.js';

export const AGREEMENT_VERSION = 1;
export const GATE_KEY = 'atq.gate';

// Plain-language terms. Credit: Lone Keem Studios only. No fake legal claims.
export const AGREEMENT_TITLE = 'Terms of Use';
export const AGREEMENT_HTML = `
  <h3>After the Quiet — Terms of Use</h3>
  <p>This game is made by <b>Lone Keem Studios</b>. By tapping accept, you agree to play by these terms.</p>
  <p>After the Quiet is a <b>fiction</b> story about a zombie outbreak. It includes cartoon-style violence, scary scenes, and an optional strong-language setting. None of it is real, and it is not meant to encourage violence or harm.</p>
  <p><b>Play fair.</b> Do not cheat, hack, or use bugs to get an unfair edge in online play. Do not harass, bully, or threaten other players. Lone Keem Studios may remove people who break these rules from online features.</p>
  <p><b>What is stored.</b> On this device we store your birth year (so we can apply age settings), that you accepted these terms, and your game save. If you choose a profile name, that name is stored too. If you sign in with Google, your profile name, scores, and save can be synced to your account so they come back on another device. We use this only to run the game. We do not sell this information. Google sign-in is handled by Google; we only receive what we need to save your profile.</p>
  <p>These terms may change in a later update. If they do, we will ask you to read and accept the new version before you keep playing.</p>
  <p>Questions: contact Lone Keem Studios.</p>
  <p></p>
`;

const nowYear = () => new Date().getFullYear();
const ageFromYear = (y) => nowYear() - (y | 0);

const lsGet = () => { try { return JSON.parse(localStorage.getItem(GATE_KEY) || 'null') || {}; } catch (e) { return {}; } };
const lsSet = (p) => { try { localStorage.setItem(GATE_KEY, JSON.stringify(Object.assign(lsGet(), p))); } catch (e) { /* private mode */ } };

export function getGate() { return lsGet(); }
export function hasBirthYear() { const y = lsGet().birthYear | 0; return y >= 1900 && y <= nowYear(); }
export function hasAgreed() { return (lsGet().agreedVersion | 0) >= AGREEMENT_VERSION; }
export function isUnder13() { if (!hasBirthYear()) return false; return ageFromYear(lsGet().birthYear) < 13; }
export function onlineAllowed() { return !isUnder13(); }
export function googleAllowed() { return !isUnder13(); }

export function applySafeDefaults(settings, saveS) {
  const kid = isUnder13();
  try { document.body.classList.toggle('atq-kid', kid); } catch (e) { /* ignore */ }
  const sel = document.getElementById('sLang');
  const lock = document.getElementById('gLangLock');
  if (kid) {
    if (settings && settings.lang !== 'clean') {
      settings.lang = 'clean';
      try { saveS && saveS(); } catch (e) { /* ignore */ }
    }
    if (sel) {
      sel.value = 'clean';
      sel.disabled = true;
      sel.title = 'Strong language stays off with this age setting.';
    }
    if (lock) lock.classList.remove('hidden');
  } else {
    if (sel) { sel.disabled = false; sel.removeAttribute('title'); }
    if (lock) lock.classList.add('hidden');
  }
}

function el(html, id) {
  let n = document.getElementById(id);
  if (n) return n;
  n = document.createElement('div');
  n.id = id;
  n.className = 'hidden';
  n.innerHTML = html;
  document.body.appendChild(n);
  return n;
}

function show(id) {
  ['gateAge', 'gateAgree', 'gateKids', 'warning'].forEach(x => {
    const n = document.getElementById(x); if (n) n.classList.add('hidden');
  });
  const n = document.getElementById(id); if (n) n.classList.remove('hidden');
}
function hideGates() {
  ['gateAge', 'gateAgree', 'gateKids'].forEach(x => {
    const n = document.getElementById(x); if (n) n.classList.add('hidden');
  });
  document.body.classList.remove('atq-gating');
}

function buildAge() {
  const years = [];
  const y0 = nowYear();
  for (let y = y0; y >= y0 - 110; y--) years.push(`<option value="${y}">${y}</option>`);
  return el(`<div class="panel">
    <div class="studio">LONE KEEM STUDIOS</div>
    <h2>Before you play</h2>
    <div class="glead">
      <p>After the Quiet is a zombie action game. It has violence, scary scenes, and an optional strong-language setting.</p>
      <p>Enter the year you were born. We remember this on this device and use it only to set age options.</p>
    </div>
    <label class="grow">Birth year <select id="gYear"><option value="" selected disabled>Year</option>${years.join('')}</select></label>
    <p class="small hidden" id="gAgeNote"></p>
    <button id="gAgeGo" class="primary" disabled>Continue</button>
  </div>`, 'gateAge');
}

function buildAgree() {
  return el(`<div class="panel">
    <div class="studio">LONE KEEM STUDIOS</div>
    <h2>${AGREEMENT_TITLE}</h2>
    <p class="small gscroll">Scroll to read all of the terms.</p>
    <div class="gbody" id="gAgreeBody">${AGREEMENT_HTML}</div>
    <label class="chk"><input type="checkbox" id="gAgreeChk"> I have read and I accept these terms.</label>
    <button id="gAgreeGo" class="primary" disabled>Accept and continue</button>
  </div>`, 'gateAgree');
}

function buildKids() {
  return el(`<div class="panel">
    <div class="studio">LONE KEEM STUDIOS</div>
    <h2>Online isn't available</h2>
    <p class="gnote">Because of the birth year on this device, online play, chat, the worldwide leaderboard, and Google sign-in are turned off. Strong language also stays off.</p>
    <p>You can still play <b>Story</b> and <b>Survival</b> from the menu.</p>
    <button id="gKidsBack" class="primary back">Back to menu</button>
  </div>`, 'gateKids');
}

function waitAge() {
  return new Promise(resolve => {
    const root = buildAge();
    document.body.classList.add('atq-gating');
    show('gateAge');
    const sel = root.querySelector('#gYear');
    const note = root.querySelector('#gAgeNote');
    const go = root.querySelector('#gAgeGo');
    const update = () => {
      const y = sel.value | 0;
      go.disabled = !y;
      if (!y) { note.classList.add('hidden'); return; }
      if (ageFromYear(y) < 13) {
        note.classList.remove('hidden');
        note.textContent = 'Because of this age, strong language stays off, and online play, chat, and Google sign-in are turned off. You can still play Story and Survival.';
      } else {
        note.classList.add('hidden');
        note.textContent = '';
      }
    };
    sel.onchange = update;
    go.onclick = () => {
      const y = sel.value | 0;
      if (!y) return;
      lsSet({ birthYear: y, birthSetAt: Date.now() });
      runLaunchFlow._gestured = true;
      resolve(y);
    };
    update();
  });
}

function waitAgree({ mustAccept = true } = {}) {
  return new Promise(resolve => {
    const root = buildAgree();
    document.body.classList.add('atq-gating');
    show('gateAgree');
    const chk = root.querySelector('#gAgreeChk');
    const go = root.querySelector('#gAgreeGo');
    if (!mustAccept) {
      chk.checked = true;
      chk.disabled = true;
      go.disabled = false;
      go.textContent = 'Done';
      go.onclick = () => resolve('viewed');
      return;
    }
    chk.checked = false;
    chk.disabled = false;
    go.disabled = true;
    go.textContent = 'Accept and continue';
    chk.onchange = () => { go.disabled = !chk.checked; };
    go.onclick = () => {
      if (!chk.checked) return;
      lsSet({ agreedVersion: AGREEMENT_VERSION, agreedAt: Date.now() });
      runLaunchFlow._gestured = true;
      resolve('accepted');
    };
  });
}

export function showKidsOnlineBlock() {
  const root = buildKids();
  root.classList.remove('hidden');
  const back = root.querySelector('#gKidsBack');
  back.onclick = () => { root.classList.add('hidden'); };
}

export function showAgreementFromSettings() {
  return waitAgree({ mustAccept: false }).then(() => { hideGates(); });
}

export function installGateSettings() {
  if (!document.getElementById('btnAgreement')) {
    const more = document.querySelector('#settings .sMore');
    const b = document.createElement('button');
    b.id = 'btnAgreement';
    b.type = 'button';
    b.textContent = 'User agreement';
    if (more) {
      const after = document.getElementById('btnCredits');
      if (after && after.parentNode === more) after.after(b);
      else more.appendChild(b);
    }
    b.onclick = () => { showAgreementFromSettings(); };
  }
  if (!document.getElementById('gLangLock')) {
    const note = document.createElement('p');
    note.id = 'gLangLock';
    note.className = 'small hidden';
    note.textContent = 'Strong language stays off with this age setting.';
    const panel = document.querySelector('#settings .panel');
    const before = document.getElementById('btnCtlSet');
    if (panel && before) panel.insertBefore(note, before);
    else if (panel) panel.appendChild(note);
  }
}

/**
 * First launch: age → agreement → video → onDone.
 * Later launches: video → onDone.
 * hasGesture is true after the player taps through the gate (or when skipped because already done? false on cold start).
 */
export async function runLaunchFlow({ audio, onDone, applySettings } = {}) {
  try { const w = document.getElementById('warning'); if (w) w.classList.add('hidden'); } catch (e) { /* ignore */ }

  if (!hasBirthYear()) await waitAge();
  try { applySettings && applySettings(); } catch (e) { /* ignore */ }

  if (!hasAgreed()) await waitAgree({ mustAccept: true });
  hideGates();
  try { preloadIntro(); } catch (e) { /* ignore */ }

  // Unlock audio from the last tap when we have one (age/agreement). Cold returns may not.
  const tapped = hasBirthYear() && hasAgreed(); // always true here
  try { audio && audio.init && audio.init(); audio && audio.unlock && audio.unlock(); } catch (e) { /* ignore */ }

  // Returning visits did not just tap; first-launch just did (accept / continue).
  // We cannot perfectly know, so: if agreement or age was shown this session, we have a gesture.
  // runLaunchFlow is called at boot. Use a flag:
  return playAndFinish({ audio, onDone, hasGesture: !!runLaunchFlow._gestured });
}

function playAndFinish({ onDone, hasGesture }) {
  return new Promise(resolve => {
    playIntroVideo({
      hasGesture,
      onDone: why => { try { onDone && onDone(why); } catch (e) { /* ignore */ } resolve(why); },
    });
  });
}

export function playIntroThen({ hasGesture = true, onDone } = {}) {
  hideGates();
  return playAndFinish({ onDone, hasGesture });
}

/** Android/hardware back. Returns true if consumed. */
export function handleGateBack() {
  if (skipIntroIfOpen()) return true;
  if (document.getElementById('gateKids') && !document.getElementById('gateKids').classList.contains('hidden')) {
    document.getElementById('gateKids').classList.add('hidden');
    return true;
  }
  if (document.getElementById('gateAgree') && !document.getElementById('gateAgree').classList.contains('hidden')) {
    // Viewing from Settings: close. First-launch accept: stay (must accept).
    const go = document.getElementById('gAgreeGo');
    if (go && go.textContent === 'Done') { hideGates(); return true; }
    return true; // don't leave the app mid-agreement
  }
  if (document.getElementById('gateAge') && !document.getElementById('gateAge').classList.contains('hidden')) {
    return false; // first screen: OS may leave / minimize
  }
  return false;
}

export { isIntroPlaying, gateToast, preloadIntro };

if (typeof window !== 'undefined') {
  window.__atqGate = { getGate, hasBirthYear, hasAgreed, isUnder13, onlineAllowed, googleAllowed, AGREEMENT_VERSION, GATE_KEY, runLaunchFlow, playIntroThen, showKidsOnlineBlock, applySafeDefaults, handleGateBack };
}
