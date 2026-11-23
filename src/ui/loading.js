import tipsData from '../data/tips-and-quotes.json';

let rot = 0;

function $(s, el) { return (el || document).querySelector(s); }

function pick(arr) { return arr[(Math.random() * arr.length) | 0]; }

function rotateTip(root) {
  const tipEl = $('.ltip', root);
  if (!tipEl) return;
  const lab = tipEl.querySelector('b');
  const span = tipEl.querySelector('span');
  if (lab) lab.textContent = 'TIP';
  if (span) span.textContent = pick(tipsData.tips);
}

/** Show the full-screen loading overlay. ch/title for story chapters; message+title for other modes. */
export function showLoading({ ch, title, message } = {}) {
  const el = document.getElementById('loading'); if (!el) return;
  el.classList.remove('hidden');
  const kick = $('.lkick', el), name = $('.lname', el), quote = $('.lquote', el), lt = $('.lt', el);
  if (ch) {
    if (kick) kick.textContent = 'CHAPTER ' + ch;
    if (name) name.textContent = title || '';
    if (lt) lt.textContent = 'Loading Riverside…';
  } else {
    if (kick) kick.textContent = message || 'LOADING';
    if (name) name.textContent = title || 'Riverside';
    if (lt) lt.textContent = message ? 'Loading…' : 'Loading Riverside…';
  }
  if (quote) {
    const q = pick(tipsData.quotes);
    quote.textContent = '“' + q + '”';
  }
  setProgress(0);
  rotateTip(el);
  clearInterval(rot);
  rot = setInterval(() => rotateTip(el), 4500);
  try { const a = window.__atq && window.__atq.audio; a && a.setMood && a.setMood('loading'); } catch (e) { /* ignore */ }
}

export function setProgress(p) {
  const i = document.querySelector('#loading .lb i');
  if (i) i.style.width = Math.round(Math.max(0, Math.min(1, +p || 0)) * 100) + '%';
}

export function hideLoading() {
  const el = document.getElementById('loading');
  if (el) el.classList.add('hidden');
  clearInterval(rot); rot = 0;
}

/** Two animation frames so the loading overlay can paint before heavy work. */
export function yieldPaint() {
  return new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
}

/** One animation frame — used to slice long load work so the loader stays animated. */
export function yieldOnce() {
  return new Promise((r) => requestAnimationFrame(r));
}

let _budgetT = 0;
export function resetBudget() { _budgetT = performance.now(); }
/** Yield a frame if the current slice has already run longer than `ms`. */
export function yieldIfNeeded(ms = 8) {
  const now = performance.now();
  if (!_budgetT) _budgetT = now;
  if (now - _budgetT >= ms) {
    return new Promise((r) => requestAnimationFrame(() => { _budgetT = performance.now(); r(); }));
  }
  return Promise.resolve();
}
