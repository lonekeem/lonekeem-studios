// Title menu v2 (v1.9.28): one big Play/Continue button + five tabs (Story, Survival, Online, Keem, Settings).
// Every original button keeps its id, so all handlers in main.js work unchanged; this file only adds tab switching,
// the Play button (= New Game when there is no save), the Online buttons and Survival run tracking for the leaderboard.
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const LSget = k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, LSset = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } };
const world = () => import('../mp/world.js');

export function initMenu() {
  const tabs = $$('#title .mtabs button');
  const setTab = t => { if (!$('#title [data-pane="' + t + '"]')) t = 'story'; tabs.forEach(b => { const on = b.dataset.tab === t; b.classList.toggle('sel', on); b.setAttribute('aria-selected', on); }); $$('#title .mpane').forEach(p => p.classList.toggle('on', p.dataset.pane === t)); LSset('atq.menuTab', t); };
  tabs.forEach(b => b.addEventListener('click', () => setTab(b.dataset.tab)));
  setTab(LSget('atq.menuTab') || 'story');
  $('#btnPlay').addEventListener('click', () => $('#btnNew').click());
  $('#btnLobby').addEventListener('click', () => world().then(m => m.openOnline('games')));
  $('#btnBoard').addEventListener('click', () => world().then(m => m.openOnline('board')));
  const best = () => { const b = +(LSget('atq3.survBest') || 0); $('#survBestTxt').textContent = b ? 'Endless waves · your best: wave ' + b : 'Endless waves'; };
  best(); new MutationObserver(best).observe($('#title'), { attributes: true, attributeFilter: ['class'] });
  // finish a Google sign-in (web redirect or Android app link) and reopen the Online screen
  if ((window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) || LSget('atq.online.resume')) world().then(m => m.bootOnline()).catch(() => {});
}

// Survival stats for the worldwide leaderboard: kills, headshots and wave of each run (counted here, no game.js changes).
export function trackGame(g, isSurvivalStep) {
  if (!g || g.__lbTracked) return; g.__lbTracked = true; let run = null; g.__lbRun = () => run; // (debug/test hook)
  const finish = why => { if (!run || run.sent) return; const r = { kills: Math.max(0, (g.save.kills || 0) - run.k0), hs: run.hs, wave: (g.stepData && g.stepData.wave) || 0, secs: (performance.now() - run.t0) / 1000 }; run.sent = true;
    if (r.kills <= 0 && r.wave <= 0) return;
    world().then(m => m.submitRun(r)).then(d => { LSset('atq.lbLast', JSON.stringify({ at: Date.now(), ...r, rank: d && d.rank })); }).catch(e => { console.warn('[leaderboard] submit failed (' + why + '):', e.message); LSset('atq.lbPending', JSON.stringify(r)); }); };
  const ls = g.loadStep.bind(g); g.loadStep = function (i, ...a) { if (run) finish('restart'); run = null; const out = ls(i, ...a); if (isSurvivalStep(i)) run = { k0: g.save.kills || 0, hs: 0, t0: performance.now(), sent: false }; return out; };
  const kz = g.killZ.bind(g); g.killZ = function (z, dir, o = {}) { if (run && !run.sent && z && !z.dead && (o || {}).head && (!(o || {}).ai || z.playerHit)) run.hs++; return kz(z, dir, o); };
  const od = g.onDeath; g.onDeath = function (...a) { if (g.survival) finish('death'); return od && od.apply(this, a); };
  $('#btnQuit').addEventListener('click', () => { if (g.survival) finish('quit'); }, true);
  // retry a run that could not be sent last time (offline)
  try { const p = JSON.parse(LSget('atq.lbPending') || 'null'); if (p) { localStorage.removeItem('atq.lbPending'); world().then(m => m.submitRun(p)).catch(() => LSset('atq.lbPending', JSON.stringify(p))); } } catch (e) { /* ignore */ }
}
