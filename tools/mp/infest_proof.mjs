// Local-only proof: enter Quiet Falls buildings, clear an infested interior.
// Never joins the public lobby / Supabase. Chromium + WebKit, iPhone landscape.
import { chromium, webkit } from 'playwright';
import { mkdirSync, writeFileSync } from 'fs';
import { context as makeCtx, page as openPage, enter, frames } from '../coop/lib.mjs';

const URL = process.env.COOP_URL || 'http://127.0.0.1:5520/';
const OUT = process.env.OUT || '/workspace/atq-interiors-proof';
mkdirSync(OUT, { recursive: true });

async function launch(kind) {
  const args = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--autoplay-policy=no-user-gesture-required'];
  if (kind === 'chromium') return chromium.launch({ executablePath: '/usr/bin/google-chrome', args });
  return webkit.launch();
}

async function setDay(p, phase) {
  await p.evaluate((phase) => {
    const T = window.__mpTown;
    if (T && T.setDay) T.setDay(phase);
    else window.__dnP = phase;
  }, phase);
  await frames(p, 8);
}

async function go(p, x, z, yaw, pitch = -0.22, wait = 700) {
  await p.evaluate(([x, z, yaw, pitch]) => {
    const T = window.__mpTown;
    T.setPos(x, z);
    T.me.ry = yaw;
    T.setCam(yaw, pitch, 2.4);
    T.setLook && T.setLook(yaw, pitch);
  }, [x, z, yaw, pitch]);
  await frames(p, 24);
  await p.waitForTimeout(wait);
}

async function clearSpot(p, x, z, r = .45) {
  return p.evaluate(([x, z, r]) => {
    const T = window.__mpTown, col = T.W.col;
    if (!col.hit(x, z, r)) return { x, z };
    const b = T.insideB(x, z); const rec = b && b.rect;
    const tries = [];
    for (let a = 0; a < 16; a++) { const ang = a * .4, d = .6 + (a % 4) * .35; tries.push([x + Math.cos(ang) * d, z + Math.sin(ang) * d]); }
    if (rec) tries.push([(rec.x0 + rec.x1) / 2, (rec.z0 + rec.z1) / 2], [rec.x0 + 1.2, rec.z0 + 1.2], [rec.x1 - 1.2, rec.z1 - 1.2], [rec.x0 + 1.2, rec.z1 - 1.2], [rec.x1 - 1.2, rec.z0 + 1.2]);
    for (const [tx, tz] of tries) {
      if (rec && (tx < rec.x0 + .7 || tx > rec.x1 - .7 || tz < rec.z0 + .7 || tz > rec.z1 - .7)) continue;
      if (!col.hit(tx, tz, r)) return { x: tx, z: tz };
    }
    return { x, z, fallback: true };
  }, [x, z, r]);
}

async function shotInfo(p, extra = {}) {
  return p.evaluate((extra) => {
    const T = window.__mpTown, cam = T.cam, me = T.me;
    const b = T.insideB(me.x, me.z);
    const bar = document.querySelector('#mpt .infbar');
    const br = bar && bar.style.display !== 'none' ? bar.getBoundingClientRect() : null;
    const dx = cam.position.x - me.x, dy = cam.position.y - (me.y || 0) - 1.2, dz = cam.position.z - me.z;
    const dist = Math.hypot(dx, dy, dz);
    const nightK = (window.__dnP != null) ? window.__dnP : null;
    return {
      inside: !!(b && b.id), id: b && b.id, kind: b && b.kind,
      roofOn: !!(b && b.roof && b.roof.visible), hasCeiling: !!(b && b.ceiling),
      lamps: b && b.lampPos ? b.lampPos.length : 0,
      cam: { x: +cam.position.x.toFixed(2), y: +cam.position.y.toFixed(2), z: +cam.position.z.toFixed(2), dist: +dist.toFixed(2) },
      me: { x: +me.x.toFixed(2), z: +me.z.toFixed(2) },
      bar: bar ? { text: bar.textContent, cls: bar.className, on: bar.style.display !== 'none', w: br ? Math.round(br.width) : 0, h: Math.round(br ? br.height : 0) } : null,
      dnP: nightK, ...extra,
    };
  }, extra);
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
    const loadVis = !!(load && !load.classList.contains('hidden') && load.offsetParent && getComputedStyle(load).visibility !== 'hidden' && Number(getComputedStyle(load).opacity) > 0.05);
    const online = document.getElementById('btnOnline');
    const txt = (document.body && document.body.innerText) || '';
    return !loadVis && online && online.offsetParent && /STORY|Story|ONLINE|Online/.test(txt) && !/\bLOADING\b/.test(txt);
  }, null, { timeout: 120000 });
  await p.waitForTimeout(600);
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
  await p.evaluate(() => { const T = window.__mpTown; T.me.hp = 100; T.me.prot = 1e6; T.me.dead = 0; });
  await frames(p, 24);
  await setDay(p, 0.5);

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

  // stand just inside the front door, looking into the rooms (player + furniture + doorway)
  const insideDoor = await p.evaluate((id) => {
    const b = window.__mpTown.W.enterable.find(x => x.id === id);
    const d = b && b.doors && b.doors.find(x => x.name === 'front') || (b && b.doors && b.doors[0]);
    const cx = (b.rect.x0 + b.rect.x1) / 2, cz = (b.rect.z0 + b.rect.z1) / 2;
    if (!d) return { x: cx, z: cz + 1.2, yaw: Math.PI };
    const fx = d.x - cx, fz = d.z - cz, fl = Math.hypot(fx, fz) || 1;
    const x = d.x - fx / fl * 2.15, z = d.z - fz / fl * 2.15;
    return { x, z, yaw: Math.atan2(-fx, -fz) };
  }, h.id);
  const insidePos = await clearSpot(p, insideDoor.x, insideDoor.z);
  await go(p, insidePos.x, insidePos.z, insideDoor.yaw, -0.22, 900);
  const insideDay = await shotInfo(p);
  await p.screenshot({ path: `${dir}/01-inside-house-day.png` });

  await setDay(p, 0.0);
  await frames(p, 12);
  await p.waitForTimeout(400);
  const insideNight = await shotInfo(p);
  await p.screenshot({ path: `${dir}/01b-inside-house-night.png` });
  await setDay(p, 0.5);

  const door = await p.evaluate((id) => {
    const b = (window.__mpTown.W.enterable || []).find(x => x.id === id);
    const d = b && b.doors && b.doors[0];
    if (!d) return null;
    const cx = (b.rect.x0 + b.rect.x1) / 2, cz = (b.rect.z0 + b.rect.z1) / 2;
    const fx = d.x - cx, fz = d.z - cz, fl = Math.hypot(fx, fz) || 1;
    // stand on the street, far enough that the follow camera cannot clip a neighbor
    const x = d.x + fx / fl * 9.4, z = d.z + fz / fl * 9.4;
    return { x, z, yaw: Math.atan2(cx - x, cz - z), cx, cz, doorX: d.x, doorZ: d.z };
  }, h.id);
  if (door) await go(p, door.x, door.z, door.yaw, -0.16, 900);
  else await go(p, midX, rec.z1 + 9, Math.PI, -0.16, 900);
  const outside = await shotInfo(p);
  await p.screenshot({ path: `${dir}/02-house-outside.png` });

  const forced = await p.evaluate((id) => {
    const T = window.__mpTown;
    const cash0 = T.bag.count('cash');
    const st = T.infest.force(id, { kinds: ['walker', 'runner', 'spitter', 'tank'] });
    return { cash0, st, zeds: (T.Z && T.Z.zombies || []).filter(z => z.bid === id && !z.dead).map(z => z.kind) };
  }, h.id);

  // same doorway vantage as the day/night interiors so the pack is in the room, not in the lens
  await go(p, insidePos.x, insidePos.z, insideDoor.yaw, -0.22, 1100);
  await frames(p, 20);
  const infestedView = await shotInfo(p, {
    zedN: await p.evaluate((id) => (window.__mpTown.Z && window.__mpTown.Z.zombies || []).filter(z => z.bid === id && !z.dead).length, h.id),
    kinds: forced.zeds,
    st: forced.st && forced.st.st,
  });
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
  await p.evaluate(() => {
    const T = window.__mpTown;
    T.me.hp = 100; T.me.prot = 1e6;
    if (T.me.dead > 0 && T.respawn) T.respawn();
    T.me.dead = 0;
    const el = T.deadEl; if (el) el.style.display = 'none';
  });
  await go(p, insidePos.x, insidePos.z, insideDoor.yaw, -0.22, 800);
  await frames(p, 20);
  const clearedView = await shotInfo(p);
  await p.screenshot({ path: `${dir}/04-cleared-inside.png` });

  const school = await p.evaluate(() => {
    const b = window.__mpTown.W.school; if (!b) return null;
    return { id: b.id, rect: b.rect, cx: b.cfg.cx, cz: b.cfg.cz, Hh: b.Hh };
  });
  let schoolView = null;
  if (school) {
    const sx = (school.rect.x0 + school.rect.x1) / 2, sz = (school.rect.z0 + school.rect.z1) / 2;
    await p.evaluate(() => { const T = window.__mpTown; T.me.hp = 100; T.me.prot = 1e6; T.me.dead = 0; const el = T.deadEl; if (el) el.style.display = 'none'; });
    const spot = await clearSpot(p, sx, sz);
    await go(p, spot.x, spot.z, 0.5, -0.3, 900);
    schoolView = await shotInfo(p);
    await p.screenshot({ path: `${dir}/05-inside-school.png` });
  }

  const err404 = { pageErrors: p.errs.slice(), notFound: p.nf.filter(u => !/favicon|sourcemap|\.map$/i.test(u)).slice(0, 20) };
  const summary = { kind, loadMs, title, info, insideDay, insideNight, outside, forced, infestedView, cleared, clearedView, school: schoolView, err404 };
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
  const s = all[k];
  console.log(k, 'enterable', s.info.enterableN,
    'day', s.insideDay && { cam: s.insideDay.cam, bar: s.insideDay.bar, roofOn: s.insideDay.roofOn, ceil: s.insideDay.hasCeiling },
    'night', s.insideNight && { cam: s.insideNight.cam, bar: s.insideNight.bar },
    'infested', s.infestedView && { cam: s.infestedView.cam, bar: s.infestedView.bar, zedN: s.infestedView.zedN },
    'cleared', s.cleared && { gained: s.cleared.gained, bar: s.cleared.bar },
    'school', s.school && { cam: s.school.cam, bar: s.school.bar },
    'title', s.title, 'errs', s.err404);
}
writeFileSync(`${OUT}/summary.json`, JSON.stringify(all, null, 2));
console.log('done', OUT);
