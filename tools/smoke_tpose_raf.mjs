// Per-frame T-pose detector under real rAF (no clock stepping). Chapter 2, mobile 844x390,
// 2+ minutes: walk/sprint/crouch/roll/jump, weapon-bar switches, reload, background/resume,
// quality changes, far zombies running in. Never joins lobby or posts a score.
import { chromium } from 'playwright';
import fs from 'fs';

const URL = process.argv[2] || 'http://127.0.0.1:5375/';
const OUT = process.argv[3] || '/workspace/atq-arms-proof';
const SECS = +(process.argv[4] || 150);
fs.mkdirSync(OUT, { recursive: true });

const b = await chromium.launch({
  executablePath: '/usr/bin/google-chrome',
  args: ['--use-gl=angle', '--use-angle-swiftshader', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--autoplay-policy=no-user-gesture-required'],
});
const ctx = await b.newContext({
  viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
});
await ctx.addInitScript(() => {
  localStorage.setItem('atq3.settings', JSON.stringify({ qual: 'low', gore: true, hints: false, ctl: 'twin', hudv2: false, music: 0.3, vol: 0.4, voices: false, playSubs: false, fp: false }));
  localStorage.setItem('atq_prologue_seen', '1');
  localStorage.setItem('atq.profile.v1', JSON.stringify({ v: 1, name: 'Test', createdAt: Date.now() }));
  const save = { v: 3, step: 7, cash: 0, xp: 0, level: 1, owned: ['fists', 'bat', 'pistol', 'shotgun', 'rifle'], up: {}, ammo: { light: 48, shell: 24, rifle: 90 }, mags: { pistol: 12, shotgun: 6, rifle: 30 }, grenades: 0, meds: 1, pages: [], items: ['backpack'], loot: [], cur: 'rifle', kills: 0, done: true, ch: 2, done2: false, maxCh: 13, played: true };
  localStorage.setItem('atq3_save', JSON.stringify(save));
  localStorage.setItem('atq3_save.bak', JSON.stringify(save));
});
const p = await ctx.newPage();
p.setDefaultTimeout(180000);
const errs = [], notFounds = [];
p.on('pageerror', e => errs.push(String(e.message || e).slice(0, 300)));
p.on('console', m => { if (m.type() === 'error') errs.push('CE ' + m.text().slice(0, 240)); });
p.on('response', r => { if (r.status() === 404) notFounds.push(r.url()); });
p.on('dialog', d => d.accept());
await p.route(/leaderboard|postScore|submitScore|lb_submit|games\/score/i, route => route.abort());

const recs = [];
const rec = (n, ok, d) => { recs.push(!!ok); console.log(ok ? 'PASS' : 'FAIL', n, d != null ? JSON.stringify(d).slice(0, 900) : ''); return !!ok; };

await p.goto(URL, { waitUntil: 'domcontentloaded', timeout: 180000 });
const warn = p.locator('#btnWarn');
if (await warn.count()) { await warn.click(); await p.waitForTimeout(250); }
await p.locator('#studio').click({ timeout: 5000 }).catch(() => {});
await p.waitForSelector('#title:not(.hidden)', { timeout: 180000 });
await p.locator('.mtabs [data-tab="story"]').click().catch(() => {});
await p.locator('#btnStory').click().catch(() => {});
await p.locator('#btnChapters').click();
await p.waitForSelector('#chapters:not(.hidden), #chlist', { timeout: 15000 }).catch(() => {});
const clicked = await p.evaluate(() => {
  const btns = [...document.querySelectorAll('#chapters button, #chlist button, .chcard, [data-ch]')];
  const b = btns.find(x => /chapter\s*2|high water|the\s*shore|c2/i.test(x.textContent || '') || x.getAttribute('data-ch') === '2');
  if (b) { b.click(); return true; }
  return false;
});
if (!clicked) await p.evaluate(() => { const A = window.__atq; if (A && A.play) A.play(7); });
await p.waitForFunction(() => {
  const A = window.__atq || {};
  const el = document.getElementById('loading');
  const hidden = !el || el.classList.contains('hidden');
  return hidden && A.state === 'play' && A.game && A.game.running && A.game.player;
}, { timeout: 180000 });

await p.evaluate((secs) => {
  const g = window.__atq.game;
  try { g.cut = null; g.dlgCur = null; const d = document.getElementById('dlg'); if (d) d.classList.remove('on'); } catch (e) {}
  if (g.cam) g.cam.fp = false;
  const log = window.__armLog = { frames: 0, hits: [], byWho: { keem: 0, nia: 0, zombie: 0 }, first: null, last: null, boosted: 0, fixed: 0, nZmax: 0, started: performance.now(), secs };
  const Arms = () => window.__atqArms;
  const whoOf = (c, g) => {
    if (!c) return null;
    if (c === g.player) return 'keem';
    const nm = ((c.look && c.look.name) || c.name || c.id || '').toString().toLowerCase();
    if (c === (g.npcs && (g.npcs.nia || g.npcs.Nia)) || nm === 'nia') return 'nia';
    if ((g.zombies || []).includes(c) || (c.look && /zombie/.test(c.look.rig || ''))) return 'zombie';
    if (g.npcs && Object.values(g.npcs).includes(c) && /nia/.test(nm)) return 'nia';
    return (c.look && /zombie/.test(c.look.rig || '')) ? 'zombie' : 'npc';
  };
  const sample = () => {
    const A = Arms(); if (!A || !g.player) return;
    log.frames++;
    const zs = (g.zombies || []).filter(z => z && !z.dead);
    log.nZmax = Math.max(log.nZmax, zs.length);
    const list = [g.player, ...Object.values(g.npcs || {}), ...zs];
    const seen = new Set();
    for (const c of list) {
      if (!c || seen.has(c) || c._deadHeld || c.dead) continue; seen.add(c);
      if (!A.isTPoseArms(c)) continue;
      const who = whoOf(c, g);
      if (who === 'npc') continue;
      log.byWho[who] = (log.byWho[who] || 0) + 1;
      if (log.hits.length < 40) {
        log.hits.push({
          t: +((performance.now() - log.started) / 1000).toFixed(2),
          who, clip: c.curName, loco: !!c.locoOn,
          w: A.actionWeights(c),
          abdL: +A.armAbduction(c, 'L').toFixed(2),
          abdR: +A.armAbduction(c, 'R').toFixed(2),
          st: c.st || '', rig: (c.look && c.look.rig) || '',
        });
      }
    }
    log.boosted = (g.player && g.player._armBoost) || 0;
    log.fixed = (g.player && g.player._armFixed) || 0;
  };
  const orig = g.frame.bind(g);
  g.frame = function (now) { orig(now); try { sample(); } catch (e) { /* ignore */ } };

  // Drive inputs in game time from the same rAF, no clock stepping.
  const I = g.input;
  const start = performance.now();
  const at = (s, fn) => { const t0 = start + s * 1000; const iv = setInterval(() => { if (performance.now() >= t0) { clearInterval(iv); try { fn(); } catch (e) {} } }, 50); };
  const stick = (x, y) => { if (I.stick) I.stick.set(x, y); I.move && I.move.set(x, y); };
  const press = (k) => { I.keys[k] = 1; setTimeout(() => { I.keys[k] = 0; }, 80); };

  at(0.2, () => { stick(0, -1); I.run = false; g.state.crouch = false; g.equip && g.equip('rifle', true); });
  at(8, () => { I.run = true; stick(0, -1); });
  at(14, () => { I.run = false; g.state.crouch = true; stick(0, -0.7); });
  at(18, () => { g.state.crouch = false; stick(0, 0); });
  at(20, () => { g.roll && g.roll(); });
  at(22.2, () => { g.jump && g.jump(); });
  at(25, () => { stick(0, -0.6); g.equip && g.equip('pistol'); try { window.__wbar && window.__wbar.equip && window.__wbar.equip('pistol'); } catch (e) {} });
  at(30, () => { g.equip && g.equip('shotgun'); try { window.__wbar && window.__wbar.equip && window.__wbar.equip('shotgun'); } catch (e) {} });
  at(34, () => { g.reload && g.reload(); });
  at(38, () => { g.equip && g.equip('rifle', true); stick(0, -1); I.run = true; });
  at(45, () => { try { window.__atq.leaveApp(); } catch (e) {} });
  at(46.2, () => { try { window.__atq.returnApp(); } catch (e) {} stick(0, -1); });
  at(52, () => { if (g.settings) g.settings.qual = 'high'; g.applyQuality && g.applyQuality('high'); });
  at(58, () => { if (g.settings) g.settings.qual = 'low'; g.applyQuality && g.applyQuality('low'); });
  at(64, () => {
    // Run toward the farthest living zombie so far-spawned ones come on screen.
    const zs = (g.zombies || []).filter(z => z && !z.dead && z.root);
    if (zs.length) {
      zs.sort((a, b) => b.root.position.distanceTo(g.player.root.position) - a.root.position.distanceTo(g.player.root.position));
      const z = zs[0].root.position, me = g.player.root.position;
      const dx = z.x - me.x, dz = z.z - me.z, L = Math.hypot(dx, dz) || 1;
      // stick is in view/player space-ish; also teleport slightly closer but still far
      const dist = Math.max(14, Math.min(L, 28));
      g.player.root.position.set(z.x - dx / L * dist, 0, z.z - dz / L * dist);
      g.player.root.rotation.y = Math.atan2(dx, dz);
      if (g.cam) g.cam.yaw = g.player.root.rotation.y + Math.PI;
    }
    I.run = true; stick(0, -1);
  });
  at(80, () => { try { window.__atq.leaveApp(); } catch (e) {} });
  at(81.4, () => { try { window.__atq.returnApp(); } catch (e) {} });
  at(90, () => { I.run = true; stick(0, -1); g.jump && g.jump(); });
  at(93, () => { g.roll && g.roll(); });
  at(96, () => { g.equip && g.equip('pistol'); g.reload && g.reload(); });
  at(100, () => { g.equip && g.equip('rifle', true); g.swap && g.swap(1); });
  at(104, () => { g.swap && g.swap(1); stick(0, -0.5); I.run = false; g.state.crouch = false; });
  at(120, () => { stick(0, 0); I.run = false; });
  // skip dialogue / cuts the whole time
  setInterval(() => { try { g.cut = null; if (g.dlgCur) { g.dlgCur = null; const d = document.getElementById('dlg'); if (d) d.classList.remove('on'); } if (g.cam) g.cam.fp = false; } catch (e) {} }, 400);
}, SECS);

console.log('play hooked, waiting', SECS, 's of real rAF');
const tEnd = Date.now() + (SECS + 8) * 1000;
while (Date.now() < tEnd) {
  await p.waitForTimeout(5000);
  const snap = await p.evaluate(() => {
    const L = window.__armLog || {};
    return { frames: L.frames, hits: (L.hits || []).length, byWho: L.byWho, boosted: L.boosted, fixed: L.fixed, nZmax: L.nZmax, t: L.started ? +((performance.now() - L.started) / 1000).toFixed(1) : 0 };
  });
  console.log('tick', JSON.stringify(snap));
  if (snap.t >= SECS && snap.frames > 30) break;
}

await p.screenshot({ path: OUT + '/tpose_end.png' });
const crop = await p.evaluate(() => {
  const g = window.__atq && window.__atq.game; if (!g || !g.player) return;
  const p = g.player.root.position; if (g.cam) { g.cam.yaw = g.player.root.rotation.y + Math.PI; g.cam.pitch = 0.2; g.cam.dist = 3.2; }
});
await p.waitForTimeout(300);
await p.screenshot({ path: OUT + '/tpose_end_crop.png' });

const sum = await p.evaluate(() => {
  const L = window.__armLog || {};
  return {
    frames: L.frames, hits: L.hits, byWho: L.byWho, boosted: L.boosted, fixed: L.fixed, nZmax: L.nZmax,
    secs: L.started ? (performance.now() - L.started) / 1000 : 0,
    cur: window.__atq.game && window.__atq.game.player && window.__atq.game.player.curName,
    gun: window.__atq.game && window.__atq.game.save && window.__atq.game.save.cur,
    nia: !!(window.__atq.game && window.__atq.game.npcs && (window.__atq.game.npcs.nia || window.__atq.game.npcs.Nia || Object.values(window.__atq.game.npcs).some(n => /nia/i.test((n.look && n.look.name) || n.name || '')))),
  };
});
fs.writeFileSync(OUT + '/tpose_log.json', JSON.stringify(sum, null, 2));

const keemHits = (sum.byWho && sum.byWho.keem) || 0;
const niaHits = (sum.byWho && sum.byWho.nia) || 0;
const zHits = (sum.byWho && sum.byWho.zombie) || 0;
rec('ran real rAF for 2+ minutes', sum.secs >= 120 && sum.frames >= 1000, { secs: +sum.secs.toFixed(1), frames: sum.frames });
rec('sampled many zombies', sum.nZmax >= 1, { nZmax: sum.nZmax, nia: sum.nia });
rec('keem 0 T-pose frames', keemHits === 0, { keemHits, hits: (sum.hits || []).filter(h => h.who === 'keem').slice(0, 6) });
rec('nia 0 T-pose frames (or nia not in this chapter)', niaHits === 0, { niaHits, nia: sum.nia });
rec('zombies 0 T-pose frames', zHits === 0, { zHits, hits: (sum.hits || []).filter(h => h.who === 'zombie').slice(0, 8) });
rec('zero page errors', !errs.length, errs.slice(0, 8));
const nf = notFounds.filter(u => !/favicon|voice\/ellipsis/.test(u));
rec('zero 404s', !nf.length, nf.slice(0, 6));

const ok = recs.every(Boolean);
console.log(ok ? 'TPOSE-RAF SMOKE OK' : 'TPOSE-RAF SMOKE FAIL', 'hits', keemHits + niaHits + zHits, 'frames', sum.frames);
await b.close();
process.exit(ok ? 0 : 1);
