// Local-only Quiet Falls expansion proof. Never joins the public lobby.
import { chromium, webkit } from 'playwright';
import { mkdirSync, writeFileSync } from 'fs';
import { context as makeCtx, page as openPage, enter, frames, freecam, unfreecam } from '../coop/lib.mjs';

const URL = process.env.COOP_URL || 'http://127.0.0.1:5490/';
const OUT = process.env.OUT || '/workspace/atq-map-proof';
mkdirSync(OUT, { recursive: true });

const MISSION = {
  evac: [-6, 24], spawn: [-6, 21.5], storeLot: [0, -1.5], storeClear: [0, -8],
  marcus: [36.4, 6], radio: [70, -31],
  crates: [[-41, 4.4], [-14, 3.6], [46, -0.4], [30, -28.5], [-30, -28.5], [6, 30.5]],
  sheds: [[-40, 1], [40, 6], [-14, 0]], gas: [46, -5.5],
};

async function launch(kind) {
  const opts = { args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--autoplay-policy=no-user-gesture-required'] };
  if (kind === 'chromium') return chromium.launch({ executablePath: '/usr/bin/google-chrome', args: opts.args });
  return webkit.launch();
}

async function shotMini(p, path) {
  const h = await p.$('#mini');
  if (h) await h.screenshot({ path });
  else await p.screenshot({ path });
}

async function go(p, x, z, yaw, pitch = .32, dist = 7, wait = 700) {
  await p.evaluate(([x, z, yaw, pitch, dist]) => {
    const T = window.__mpTown; T.setPos(x, z); T.me.ry = yaw; T.setCam(yaw, pitch, dist);
  }, [x, z, yaw, pitch, dist]);
  await frames(p, 12);
  await p.waitForTimeout(wait);
}

async function run(kind) {
  const dir = `${OUT}/${kind}`; mkdirSync(dir, { recursive: true });
  const b = await launch(kind);
  const iphone = { viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true };
  const ctx = await makeCtx(b, iphone);
  // This Playwright WebKit build crashes on any real <video> element (intro).
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
  const t0 = Date.now();
  await enter(p, { name: 'MapTest', room: 'local-map-expand', mission: null });
  const loadMs = Date.now() - t0;
  await frames(p, 20);
  const info = await p.evaluate((MISSION) => {
    const T = window.__mpTown, W = T.W, col = W.col;
    const walk = (x, z, r = .5) => !col.hit(x, z, r);
    const coreLots = W.lots.filter(l => !l.outer);
    const outerLots = W.lots.filter(l => l.outer);
    const zoneIds = (W.zones || []).map(z => z.id);
    const buildings = W.buildings.map(b => ({ id: b.id || b.cfg?.id, kind: b.kind, cx: b.cfg?.cx, cz: b.cfg?.cz }));
    const check = {};
    for (const [k, p] of Object.entries(MISSION)) {
      if (k === 'crates' || k === 'sheds') check[k] = p.map(([x, z]) => ({ x, z, walk: walk(x, z, .45) }));
      else check[k] = { x: p[0], z: p[1], walk: walk(p[0], p[1], k === 'radio' ? .8 : .5) };
    }
    const roads = { zr: null, xr: null };
    return {
      loadNote: 'see host timer',
      bounds: W.bounds, lots: W.lots.length, coreLots: coreLots.length, outerLots: outerLots.length,
      enterable: W.enterable.length, buildings: buildings.length, zones: zoneIds,
      treeCount: W.treeCount, cars: (T.cars || []).length,
      school: !!W.school, mall: !!W.mall,
      loot: (W.containers || []).length,
      ids: buildings.map(b => b.id),
      check,
      pageErrs: 0,
    };
  }, MISSION);
  info.kind = kind; info.loadMs = loadMs; info.pageErrs = p.errs.slice(); info.nf = p.nf.slice();

  // start street + minimap (core still looks like Quiet Falls)
  await go(p, -6, 21.5, Math.PI / 2, .35, 7, 900);
  await p.screenshot({ path: `${dir}/01-spawn.png` });
  await shotMini(p, `${dir}/01-spawn-mini.png`);

  // store still there
  await go(p, 0, -3, Math.PI, .3, 8, 800);
  await p.screenshot({ path: `${dir}/02-store.png` });

  // Willow Park
  await go(p, 0, 73.5, Math.PI, .22, 12, 900);
  await p.screenshot({ path: `${dir}/03-park-sign.png` });
  await shotMini(p, `${dir}/03-park-mini.png`);
  await go(p, 0, 49, 0, .32, 8, 800);
  await p.screenshot({ path: `${dir}/04-park-fountain.png` });
  await go(p, -16, 48, 0, .3, 7, 700);
  await p.screenshot({ path: `${dir}/05-park-playground.png` });

  // Quiet Falls School
  await go(p, -6, -71, 0, .22, 14, 900);
  await p.screenshot({ path: `${dir}/06-school-front.png` });
  await shotMini(p, `${dir}/06-school-mini.png`);
  await go(p, 18, -54, -Math.PI / 2, .28, 9, 800);
  await p.screenshot({ path: `${dir}/07-school-yard.png` });

  // Cedar Plaza
  await go(p, -106, 0, -Math.PI / 2, .28, 11, 900);
  await p.screenshot({ path: `${dir}/08-plaza.png` });
  await shotMini(p, `${dir}/08-plaza-mini.png`);
  await go(p, -106, -9, -Math.PI / 2, .28, 8, 800);
  await p.screenshot({ path: `${dir}/09-otts-hardware.png` });

  // new houses + new streets
  await go(p, 52, 72, Math.PI / 2, .25, 10, 800);
  await p.screenshot({ path: `${dir}/10-north-houses.png` });
  await go(p, 104, 24, 0, .25, 10, 800);
  await p.screenshot({ path: `${dir}/11-east-road.png` });
  await shotMini(p, `${dir}/11-east-mini.png`);
  await go(p, 80, -72, 0, .24, 10, 800);
  await p.screenshot({ path: `${dir}/12-south-houses.png` });

  // radio keep still open (no building on the pad)
  await go(p, 70, -20, Math.PI, .3, 9, 700);
  await p.screenshot({ path: `${dir}/13-radio-keep.png` });

  // top-down overview with fog lifted (proof of the whole ring)
  // lock the camera after the follow-cam step (H.frame runs just before renderer.render)
  const aerial = async (pos, look, file) => {
    await p.evaluate(([pos, look]) => {
      const T = window.__mpTown; T.scene.fog = null;
      T.cam.near = 2; T.cam.far = 900; T.cam.updateProjectionMatrix();
      T.H = T.H || {}; T.H._prevFrame = T.H._prevFrame || T.H.frame;
      T.H.frame = () => { T.cam.position.set(...pos); T.cam.up.set(0, 1, 0); T.cam.lookAt(...look); T.cam.updateMatrixWorld(true); };
    }, [pos, look]);
    await frames(p, 16); await p.waitForTimeout(500);
    await p.screenshot({ path: `${dir}/${file}` });
  };
  await aerial([30, 210, 190], [0, 0, 0], '14-overview.png');
  await aerial([-20, 140, 20], [0, 2, 0], '15-overview-core.png');
  await p.evaluate(() => { const T = window.__mpTown; T.H.frame = T.H._prevFrame || null; });

  // report any NaN geometries
  info.nan = await p.evaluate(() => {
    const bad = [];
    window.__mpTown.scene.traverse(o => {
      if (!o.geometry || !o.geometry.attributes || !o.geometry.attributes.position) return;
      o.geometry.computeBoundingSphere();
      const r = o.geometry.boundingSphere && o.geometry.boundingSphere.radius;
      if (r != r) bad.push({ name: o.name || o.type, mat: o.material && (o.material.name || o.material.type) });
    });
    return bad;
  });

  // drive a stretch of the new north road
  const drive = await p.evaluate(async () => {
    const T = window.__mpTown; const c = T.cars.find(k => k.id === 'c21') || T.cars[T.cars.length - 1];
    if (!c) return { ok: false };
    T.setPos(c.x - 2.2, c.z); T.me.ry = Math.PI / 2;
    return { ok: true, id: c.id, x: c.x, z: c.z };
  });
  info.driveCar = drive;

  writeFileSync(`${dir}/info.json`, JSON.stringify(info, null, 2));
  console.log(kind, 'loadMs', loadMs, 'lots', info.lots, 'core', info.coreLots, 'outer', info.outerLots, 'errs', info.pageErrs, '404s', info.nf.length);
  console.log(kind, 'mission', JSON.stringify(info.check));
  await b.close();
  return info;
}

const kinds = process.argv.slice(2).length ? process.argv.slice(2) : ['chromium', 'webkit'];
const out = {};
for (const k of kinds) {
  try { out[k] = await run(k); }
  catch (e) { console.error(k, 'FAIL', e); out[k] = { error: String(e && e.stack || e) }; writeFileSync(`${OUT}/${k}-error.txt`, String(e && e.stack || e)); }
}
writeFileSync(`${OUT}/summary.json`, JSON.stringify(out, null, 2));
console.log('done', OUT);
