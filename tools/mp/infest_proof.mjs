// Local-only proof: enter Quiet Falls buildings, clear an infested interior.
// Never joins the public lobby / Supabase. Chromium + WebKit, iPhone landscape.
import { chromium, webkit } from 'playwright';
import { mkdirSync, writeFileSync } from 'fs';
import { context as makeCtx, page as openPage, enter, frames } from '../coop/lib.mjs';

const URL = process.env.COOP_URL || 'http://127.0.0.1:5513/';
const OUT = process.env.OUT || '/workspace/atq-interiors-proof';
mkdirSync(OUT, { recursive: true });

async function launch(kind) {
  const args = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--autoplay-policy=no-user-gesture-required'];
  if (kind === 'chromium') return chromium.launch({ executablePath: '/usr/bin/google-chrome', args });
  return webkit.launch();
}

async function go(p, x, z, yaw, pitch = .38, wait = 600) {
  await p.evaluate(([x, z, yaw, pitch]) => {
    const T = window.__mpTown; T.setPos(x, z); T.me.ry = yaw; T.setCam(yaw, pitch, 2.6); T.setLook && T.setLook(yaw, pitch);
  }, [x, z, yaw, pitch]);
  await frames(p, 16);
  await p.waitForTimeout(wait);
}

async function titleBits(p) {
  return p.evaluate(() => {
    const foot = document.getElementById('foot');
    const lobby = document.getElementById('btnLobby');
    const html = document.documentElement.innerHTML || '';
    const txt = (document.body && document.body.innerText) || '';
    return {
      footer: foot ? foot.textContent.trim() : '',
      hasLobby: !!lobby,
      lobbyVisible: !!(lobby && lobby.offsetParent !== null),
      lobbyText: lobby ? (lobby.textContent || '').trim() : '',
      playAsKeem: /Play as Keem/i.test(txt) || /Play as Keem/.test(html),
    };
  });
}

async function run(kind) {
  const dir = `${OUT}/${kind}`; mkdirSync(dir, { recursive: true });
  const b = await launch(kind);
  const iphone = { viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true };
  const ctx = await makeCtx(b, iphone);
  await ctx.route(/\.(mp4|webm|mov)(\?|$)/i, r => r.abort());
  await ctx.addInitScript(() => {
    const ev = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
    if (ev && ev.set) Object.defineProperty(Element.prototype, 'innerHTML', { configurable: true, get: ev.get, set(v) { ev.set.call(this, typeof v === 'string' ? v.replace(/<video\b/gi, '<div data-was-video') : v); } });
    const orig = Document.prototype.createElement;
    Document.prototype.createElement = function (name, opts) {
      if (String(name).toLowerCase() === 'video') {
        const el = orig.call(this, 'div', opts);
        el.play = () => Promise.resolve(); el.pause = () => {}; el.load = () => {};
        el.canPlayType = () => ''; el.paused = true; el.muted = true; el.currentTime = 0;
        return el;
      }
      return orig.call(this, name, opts);
    };
  });
  const p = await openPage(ctx, kind[0].toUpperCase());
  await p.waitForFunction(() => {
    const load = document.getElementById('loading');
    const title = document.getElementById('title');
    const loadOn = load && !load.classList.contains('hidden') && load.offsetParent;
    return title && !title.classList.contains('hidden') && !loadOn;
  }, null, { timeout: 90000 });
  await p.waitForTimeout(400);
  const title = await titleBits(p);
  title.playAsKeemSrc = await p.evaluate(async () => {
    try { const r = await fetch('./src/mp/charselect.js'); return /Play as Keem/.test(await r.text()); } catch (e) { return false; }
  });
  await p.screenshot({ path: `${dir}/00-title.png` });
  await p.click('#btnOnline');
  await p.waitForTimeout(300);
  title.lobbyVisible = await p.evaluate(() => { const b = document.getElementById('btnLobby'); return !!(b && b.offsetParent !== null); });
  await p.screenshot({ path: `${dir}/00b-online-pane.png` });

  const t0 = Date.now();
  await enter(p, { name: 'ClearTest', room: 'local-infest-proof', mission: null });
  const loadMs = Date.now() - t0;
  await frames(p, 24);

  const info = await p.evaluate(() => {
    const T = window.__mpTown, W = T.W, I = T.infest;
    const enterable = (I && I.enterable()) || W.enterable.map(b => ({ id: b.id, kind: b.kind, cx: b.cfg.cx, cz: b.cfg.cz, rect: b.rect }));
    const houses = enterable.filter(b => b.kind === 'house');
    const spawn = { x: T.me.x, z: T.me.z };
    const near = houses.slice().sort((a, b) => Math.hypot(a.cx - spawn.x, a.cz - spawn.z) - Math.hypot(b.cx - spawn.x, b.cz - spawn.z))[0];
    const infested = (I && I.list()) ? I.list().filter(s => s.st === 'infested') : [];
    const ids = { school: !!W.school, mall: !!W.mall, store: W.enterable.some(b => b.id === 'store'), laundry: W.enterable.some(b => b.id === 'mall0') };
    return {
      enterableN: enterable.length, houses: houses.length, near, spawn,
      kinds: enterable.reduce((m, b) => (m[b.kind] = (m[b.kind] || 0) + 1, m), {}),
      ids, infestedN: infested.length, infested: infested.map(s => ({ id: s.id, name: s.name, kind: s.kind })),
      cash: T.bag.count('cash'), bounds: W.bounds, lots: W.lots.length,
    };
  });

  const h = info.near;
  const rec = h.rect;
  const midX = (rec.x0 + rec.x1) / 2, midZ = (rec.z0 + rec.z1) / 2;

  const door = await p.evaluate((id) => {
    const b = (window.__mpTown.W.enterable || []).find(x => x.id === id);
    const d = b && b.doors && b.doors[0];
    if (!d) return null;
    const cx = (b.rect.x0 + b.rect.x1) / 2, cz = (b.rect.z0 + b.rect.z1) / 2;
    const fx = d.x - cx, fz = d.z - cz, fl = Math.hypot(fx, fz) || 1;
    const x = d.x + fx / fl * 7.2, z = d.z + fz / fl * 7.2;
    return { x, z, yaw: Math.atan2(cx - x, cz - z), cx, cz };
  }, h.id);

  await go(p, midX - 1.2, midZ + 1.0, 0.55, .55, 800);
  const inside = await p.evaluate(() => {
    const T = window.__mpTown, b = T.insideB(T.me.x, T.me.z);
    const roofHidden = !!(b && b.roof && b.roof.visible === false);
    const bar = document.querySelector('#mpt .infbar');
    return { id: b && b.id, kind: b && b.kind, roofHidden, bar: bar ? { text: bar.textContent, cls: bar.className, on: bar.style.display !== 'none' } : null, inside: !!b };
  });
  await p.screenshot({ path: `${dir}/01-inside-house.png` });

  if (door) await go(p, door.x, door.z, door.yaw, .18, 900);
  else await go(p, midX, rec.z0 - 7, 0, .18, 900);
  await p.screenshot({ path: `${dir}/02-house-outside.png` });

  const forced = await p.evaluate((id) => {
    const T = window.__mpTown;
    const cash0 = T.bag.count('cash');
    const st = T.infest.force(id, { kinds: ['walker', 'runner', 'spitter', 'tank'] });
    return { cash0, st, zeds: (T.Z && T.Z.zombies || []).filter(z => z.bid === id && !z.dead).map(z => z.kind) };
  }, h.id);

  // look toward a living indoor zombie if we can
  const look = await p.evaluate((id) => {
    const T = window.__mpTown;
    const zeds = (T.Z && T.Z.zombies || []).filter(z => z.bid === id && !z.dead);
    if (!zeds.length) return null;
    const z = zeds[0].root.position;
    const b = T.insideB(z.x, z.z) || T.W.enterable.find(x => x.id === id);
    const r = b && b.rect;
    let x = z.x - 2.2, zz = z.z + 2.0;
    if (r) { x = Math.min(r.x1 - .8, Math.max(r.x0 + .8, x)); zz = Math.min(r.z1 - .8, Math.max(r.z0 + .8, zz)); }
    return { x, z: zz, yaw: Math.atan2(z.x - x, z.z - zz) };
  }, h.id);
  if (look) await go(p, look.x, look.z, look.yaw, .48, 1100);
  else await go(p, midX - 1.6, midZ + 1.4, 0.7, .52, 1100);
  await frames(p, 20);
  const infestedView = await p.evaluate((id) => {
    const T = window.__mpTown, b = T.insideB(T.me.x, T.me.z);
    const zeds = (T.Z && T.Z.zombies || []).filter(z => z.bid === id && !z.dead);
    const bar = document.querySelector('#mpt .infbar');
    return {
      inside: !!(b && b.id === id), roofHidden: !!(b && b.roof && !b.roof.visible),
      zedN: zeds.length, kinds: zeds.map(z => z.kind),
      bar: bar ? bar.textContent : '', st: T.infest.statusOf(id),
    };
  }, h.id);
  await p.screenshot({ path: `${dir}/03-infested-inside.png` });

  const cleared = await p.evaluate((id) => {
    const T = window.__mpTown;
    const before = T.bag.count('cash');
    const st = T.infest.clearNow(id);
    const after = T.bag.count('cash');
    const bar = document.querySelector('#mpt .infbar');
    const left = (T.Z && T.Z.zombies || []).filter(z => z.bid === id && !z.dead).length;
    return { before, after, gained: after - before, st, bar: bar ? { text: bar.textContent, cls: bar.className } : null, left };
  }, h.id);
  await frames(p, 20);
  await p.waitForTimeout(700);
  await p.screenshot({ path: `${dir}/04-cleared-inside.png` });

  const school = await p.evaluate(() => {
    const b = window.__mpTown.W.school; if (!b) return null;
    return { id: b.id, rect: b.rect, cx: b.cfg.cx, cz: b.cfg.cz };
  });
  if (school) {
    const sx = (school.rect.x0 + school.rect.x1) / 2, sz = (school.rect.z0 + school.rect.z1) / 2;
    await go(p, sx - 2, sz + 1.5, 0.6, .5, 800);
    await p.screenshot({ path: `${dir}/05-inside-school.png` });
  }

  const err404 = { pageErrors: p.errs.slice(), notFound: p.nf.filter(u => !/favicon|sourcemap|\.map$/i.test(u)).slice(0, 20) };
  const summary = { kind, loadMs, title, info, inside, forced, infestedView, cleared, school: !!school, err404 };
  writeFileSync(`${dir}/summary.json`, JSON.stringify(summary, null, 2));
  await b.close();
  return summary;
}

const kinds = process.argv.slice(2);
const want = kinds.length ? kinds : ['chromium', 'webkit'];
const all = {};
for (const k of want) {
  console.log('running', k);
  all[k] = await run(k);
  console.log(k, 'enterable', all[k].info.enterableN, 'inside', all[k].inside, 'forced', all[k].forced && all[k].forced.zeds, 'cleared', all[k].cleared && { gained: all[k].cleared.gained, bar: all[k].cleared.bar }, 'title', all[k].title, 'errs', all[k].err404);
}
writeFileSync(`${OUT}/summary.json`, JSON.stringify(all, null, 2));
console.log('done', OUT);
