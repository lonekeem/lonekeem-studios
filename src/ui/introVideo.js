// After the Quiet backstory video. Plays on every app open (after the age/agreement
// gate on first launch) and from Settings → Watch Intro. Not the Dream Jar intro.
// Built for iOS standalone (home-screen), Android WebView, and desktop:
// playsinline, muted autoplay fallback, tap-to-play / tap-to-unmute, poster so the
// screen is never a black stall, timeout → menu + toast, and a hard audio stop on skip.

import './gate.css';

const VIDEO_SRC = './video/atq-backstory.mp4';
const POSTER_SRC = './video/atq-backstory-poster.jpg';
const START_MS = 15000;   // no playback started (poster is visible)
const STALL_MS = 12000;   // mid-play stall

let root = null, video = null, hint = null, skipBtn = null, doneCb = null, finished = false;
let startTimer = 0, stallTimer = 0, preloadEl = null;

export function introSrc() { return VIDEO_SRC; }

export function preloadIntro() {
  try {
    if (preloadEl) return preloadEl;
    const v = document.createElement('video');
    v.preload = 'auto';
    v.muted = true;
    v.playsInline = true;
    v.setAttribute('playsinline', '');
    v.setAttribute('webkit-playsinline', 'true');
    v.setAttribute('preload', 'auto');
    v.src = VIDEO_SRC;
    v.load();
    preloadEl = v;
    return v;
  } catch (e) { return null; }
}

export function isIntroPlaying() { return !!(root && !root.classList.contains('hidden') && !finished); }

export function gateToast(msg, sec = 3.2) {
  let t = document.getElementById('gateToast');
  if (!t) { t = document.createElement('div'); t.id = 'gateToast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
  t.textContent = msg;
  t.classList.add('on');
  clearTimeout(t._tm);
  t._tm = setTimeout(() => t.classList.remove('on'), sec * 1000);
}

function clearTimers() { clearTimeout(startTimer); clearTimeout(stallTimer); startTimer = stallTimer = 0; }

/** Hard-stop so skipped audio cannot keep playing in the background (iOS especially). */
export function stopIntroVideo() {
  clearTimers();
  const v = video;
  video = null;
  if (v) {
    try { v.pause(); } catch (e) { /* ignore */ }
    try { v.muted = true; v.volume = 0; v.defaultMuted = true; } catch (e) { /* ignore */ }
    try {
      v.removeAttribute('src');
      while (v.firstChild) v.removeChild(v.firstChild);
      v.load();
    } catch (e) { /* ignore */ }
    try { v.remove(); } catch (e) { /* ignore */ }
  }
  if (root) { root.classList.add('hidden'); root.setAttribute('aria-hidden', 'true'); }
}

function finish(why) {
  if (finished) return;
  finished = true;
  const cb = doneCb; doneCb = null;
  stopIntroVideo();
  if (why === 'timeout') gateToast("The intro couldn't play, so we skipped it.");
  try { cb && cb(why || 'ended'); } catch (e) { console.warn(e); }
}

function showHint(text) {
  if (!hint) return;
  hint.textContent = text;
  hint.classList.remove('hidden');
}
function hideHint() { if (hint) hint.classList.add('hidden'); }

async function tryPlay(v, withSound) {
  if (!v) return false;
  try {
    v.muted = !withSound;
    v.defaultMuted = !withSound;
    if (!withSound) v.volume = 0;
    const p = v.play();
    if (p && typeof p.then === 'function') await p;
    return !v.paused;
  } catch (e) { return false; }
}

function onPlaying() {
  clearTimeout(startTimer); startTimer = 0;
  clearTimeout(stallTimer); stallTimer = 0;
  if (video && !video.muted) hideHint();
}

function onWaiting() {
  clearTimeout(stallTimer);
  stallTimer = setTimeout(() => finish('timeout'), STALL_MS);
}

function onError() { finish('timeout'); }
function onEnded() { finish('ended'); }

function onHintTap() {
  if (!video || finished) return;
  const v = video;
  (async () => {
    // Prefer sound once the player has tapped.
    if (await tryPlay(v, true)) { hideHint(); return; }
    if (await tryPlay(v, false)) { showHint('Tap for sound'); return; }
  })();
}

function ensureDom() {
  let el = document.getElementById('gateIntro');
  if (el) return el;
  el = document.createElement('div');
  el.id = 'gateIntro';
  el.className = 'hidden';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-label', 'After the Quiet opening');
  el.innerHTML = `<div class="iv-box">
    <video id="gateVideo" playsinline webkit-playsinline preload="auto" poster="${POSTER_SRC}" disablepictureinpicture></video>
    <button type="button" class="iv-skip" id="gateSkip">Skip</button>
    <div class="iv-hint hidden" id="gateHint"></div>
  </div>`;
  document.body.appendChild(el);
  return el;
}

/**
 * Play the backstory video, then call onDone(why).
 * @param {{ hasGesture?: boolean, onDone?: (why: string) => void }} opts
 *   hasGesture: true when this was started from a tap (agreement accept, Watch Intro),
 *   so unmuted autoplay may be allowed.
 */
export function playIntroVideo(opts = {}) {
  const { hasGesture = false, onDone } = opts;
  stopIntroVideo();
  finished = false;
  doneCb = onDone || null;

  root = ensureDom();
  video = root.querySelector('video');
  if (!video) {
    const box = root.querySelector('.iv-box') || root;
    video = document.createElement('video');
    video.id = 'gateVideo';
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', 'true');
    video.setAttribute('preload', 'auto');
    video.setAttribute('poster', POSTER_SRC);
    video.setAttribute('disablepictureinpicture', '');
    box.insertBefore(video, box.firstChild);
  }
  skipBtn = root.querySelector('#gateSkip');
  hint = root.querySelector('#gateHint');

  video.setAttribute('playsinline', '');
  video.setAttribute('webkit-playsinline', 'true');
  video.playsInline = true;
  video.preload = 'auto';
  video.controls = false;
  video.disablePictureInPicture = true;
  video.setAttribute('controlslist', 'nodownload nofullscreen noremoteplayback');
  video.poster = POSTER_SRC;
  video.src = VIDEO_SRC;
  // Start muted so iOS/Android autoplay policies have a path; we unmute if the gesture allows it.
  video.muted = !hasGesture;
  video.defaultMuted = !hasGesture;
  video.loop = false;

  hideHint();
  skipBtn.classList.remove('hidden');
  root.classList.remove('hidden');
  root.setAttribute('aria-hidden', 'false');

  const skip = ev => { if (ev) ev.preventDefault(); finish('skip'); };
  skipBtn.onclick = skip;
  const onKey = ev => {
    if (ev.key === 'Escape' || ev.key === 'Enter' || ev.key === ' ' || ev.key === 'Spacebar') {
      ev.preventDefault(); finish('skip');
    }
  };
  addEventListener('keydown', onKey);
  const prevCb = doneCb;
  doneCb = why => { removeEventListener('keydown', onKey); prevCb && prevCb(why); };

  video.addEventListener('playing', onPlaying);
  video.addEventListener('waiting', onWaiting);
  video.addEventListener('stalled', onWaiting);
  video.addEventListener('error', onError);
  video.addEventListener('ended', onEnded);
  hint.onclick = onHintTap;

  video.load();

  startTimer = setTimeout(() => { if (!finished && video && video.paused) finish('timeout'); }, START_MS);

  (async () => {
    if (hasGesture) {
      if (await tryPlay(video, true)) { hideHint(); return; }
      if (await tryPlay(video, false)) { showHint('Tap for sound'); return; }
      showHint('Tap to play'); clearTimeout(startTimer); startTimer = 0;
      return;
    }
    if (await tryPlay(video, false)) { showHint('Tap for sound'); return; }
    // Autoplay blocked even while muted: keep the poster on screen and wait for a tap.
    showHint('Tap to play'); clearTimeout(startTimer); startTimer = 0;
  })();
}

/** Hardware / Android back: skip the video if it's up. */
export function skipIntroIfOpen() {
  if (!isIntroPlaying()) return false;
  finish('skip');
  return true;
}
