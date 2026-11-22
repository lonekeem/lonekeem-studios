// Title menu: one vertical list of big buttons (Continue, Story, Survival, Online, Settings).
// Every original button keeps its id, so handlers in main.js work unchanged.
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const LSget = k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, LSset = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } };
const world = () => import('../mp/world.js');

export function initMenu() {
  const toggle = t => {
    const pane = $('#title [data-pane="' + t + '"]'); if (!pane) return;
    const on = !pane.classList.contains('on');
    $$('#title .mpane').forEach(p => p.classList.remove('on'));
    $$('#title .mplay.open').forEach(b => b.classList.remove('open'));
    if (on) { pane.classList.add('on'); const btn = t === 'story' ? $('#btnStory') : t === 'online' ? $('#btnOnline') : null; if (btn) btn.classList.add('open'); }
  };
  $('#btnStory').addEventListener('click', () => toggle('story'));
  $('#btnOnline').addEventListener('click', () => toggle('online'));
  const play = $('#btnPlay'); if (play) play.addEventListener('click', () => $('#btnNew').click());
  $('#btnLobby').addEventListener('click', () => world().then(m => m.openOnline('games')));
  $('#btnBoard').addEventListener('click', () => world().then(m => m.openOnline('board')));
  const best = () => { const b = +(LSget('atq3.survBest') || 0); const el = $('#survBestTxt'); if (el) el.textContent = b ? 'Endless waves · your best: wave ' + b : 'Endless waves'; };
  best(); new MutationObserver(best).observe($('#title'), { attributes: true, attributeFilter: ['class'] });
  setTimeout(() => import('../mp/cloud.js').then(m => { m.watchTitle(); m.autoSync().catch(() => {}); }).catch(() => {}), 1500);
  if ((window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) || LSget('atq.online.resume')) world().then(m => m.bootOnline()).catch(() => {});
  // localhost: preload the online module so test hooks (private rooms) are ready
  if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) world().catch(() => {});

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
  try { const p = JSON.parse(LSget('atq.lbPending') || 'null'); if (p) { localStorage.removeItem('atq.lbPending'); world().then(m => m.submitRun(p)).catch(() => LSset('atq.lbPending', JSON.stringify(p))); } } catch (e) { /* ignore */ }
}
