// Co-op mission test helpers. Local only: solo rooms use BroadcastChannel (pages of ONE browser context), never the public lobby / Supabase.
import { chromium } from 'playwright';
export const URL = process.env.COOP_URL || 'http://127.0.0.1:5481/';
export async function launch() { return chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--autoplay-policy=no-user-gesture-required'] }); }
export const ctxOpts = { viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true };
export async function context(b, opts = ctxOpts) {
  const ctx = await b.newContext(opts);
  await ctx.addInitScript(() => { if (!localStorage.getItem('atq3.settings')) localStorage.setItem('atq3.settings', JSON.stringify({ qual: 'low', voices: false, playSubs: false })); localStorage.setItem('atq_prologue_seen', '1'); localStorage.setItem('atq.tut.seen', '1'); localStorage.setItem('atq.gate', JSON.stringify({ birthYear: 1990, agreedVersion: 1 })); });
  await ctx.route(/supabase\.co/, r => r.abort()); // never touch the real backend from tests
  return ctx;
}
export async function page(ctx, name = 'A') {
  const p = await ctx.newPage(); p.errs = []; p.nf = []; p.setDefaultTimeout(180000);
  p.on('pageerror', e => { p.errs.push(String(e.message || e).slice(0, 200)); console.log(name, 'ERR', e.message); });
  p.on('console', m => { if (m.type() === 'error' && !/supabase|Failed to load resource|ERR_FAILED/i.test(m.text())) console.log(name, 'CE', m.text().slice(0, 200)); });
  p.on('response', r => { if (r.status() === 404) p.nf.push(r.url()); });
  await p.goto(URL, { waitUntil: 'domcontentloaded' });
  // skip age/terms (already stored) and the backstory video that now plays on every open
  for (let i = 0; i < 40; i++) {
    const ready = await p.evaluate(() => {
      const skip = document.getElementById('gateSkip');
      if (skip && skip.offsetParent) { skip.click(); return 'skip'; }
      const t = document.getElementById('title');
      if (t && !t.classList.contains('hidden')) return 'title';
      const w = document.getElementById('btnWarn');
      if (w && w.offsetParent) { w.click(); return 'warn'; }
      return '';
    });
    if (ready === 'title') break;
    await p.waitForTimeout(250);
  }
  await p.waitForSelector('#title:not(.hidden)', { timeout: 90000 }); await p.waitForTimeout(300);
  return p;
}
export async function enter(p, { name = 'Ava', room = 'test-coop-1', mission = null } = {}) {
  await p.evaluate(async ({ name, room, mission }) => {
    const PR = await import('/src/mp/profile.js'); if (!PR.hasProfile()) PR.saveProfile({ name });
    const pr = PR.getProfile(); const tw = await import('/src/mp/town/town.js');
    document.querySelector('#title') && document.querySelector('#title').classList.add('hidden'); window.__exited = 0; tw.enterTown({ look: Object.assign({}, pr.look, { name: name || pr.name }), solo: true, room, mission, onExit: () => { window.__exited = 1; } });
  }, { name, room, mission });
  await p.waitForFunction(() => window.__mpTown, null, { timeout: 240000 }); await p.waitForTimeout(800);
}
export const frames = (p, n) => p.evaluate(n => new Promise(r => { let k = 0; const f = () => { if (++k >= n) r(); else requestAnimationFrame(f); }; requestAnimationFrame(f); }), n);
export async function freecam(p, pos, look) {
  await p.evaluate(([pos, look]) => { const T = window.__mpTown, cam = T.cam; if (!cam.__free) { cam.__free = 1; cam.__cp = cam.position.copy; cam.position.copy = function () { return this; }; cam.__la = cam.lookAt; cam.lookAt = function () {}; } cam.position.set(...pos); const V = cam.position.constructor; cam.up.set(0, 1, 0); const l = new V(...look); const m = new (cam.matrix.constructor)(); m.lookAt(cam.position, l, cam.up); cam.quaternion.setFromRotationMatrix(m); cam.updateProjectionMatrix(); }, [pos, look]);
}
export async function unfreecam(p) { await p.evaluate(() => { const cam = window.__mpTown.cam; if (cam.__free) { cam.position.copy = cam.__cp; cam.lookAt = cam.__la; cam.__free = 0; } }); }
