// Local-only Quiet Falls road/lawn + HUD proofs. Never joins the public lobby.
import { launch, context, page, enter, frames, freecam } from '../coop/lib.mjs';
import { mkdirSync, writeFileSync } from 'fs';

const OUT = process.env.OUT || '/workspace/atq-road-proof/after';
mkdirSync(OUT, { recursive: true });

const shots = [
  // Willow Park lawn used to cover the N-S roads at x=±24 (z=45..65)
  { n: 'park-east-road', x: 24, z: 55, yaw: 0, pitch: .28, dist: 8, note: 'NS road x=24 through Willow Park' },
  { n: 'park-east-road-along', x: 24, z: 48, yaw: 0, pitch: .18, dist: 10, note: 'looking north along x=24' },
  { n: 'park-west-road', x: -24, z: 55, yaw: Math.PI, pitch: .28, dist: 8, note: 'NS road x=-24 through Willow Park' },
  { n: 'park-west-road-along', x: -24, z: 48, yaw: 0, pitch: .18, dist: 10, note: 'looking north along x=-24' },
  { n: 'park-from-lawn', x: 0, z: 55, yaw: Math.PI / 2, pitch: .35, dist: 12, note: 'center of park looking east at road' },
  { n: 'park-from-lawn-west', x: 0, z: 55, yaw: -Math.PI / 2, pitch: .35, dist: 12, note: 'center of park looking west at road' },
  { n: 'xing-24-72', x: 24, z: 72, yaw: 3.9, pitch: .3, dist: 9, note: 'intersection x=24 z=72 (north of park)' },
  { n: 'xing-24-24', x: 24, z: 24, yaw: 0.7, pitch: .3, dist: 9, note: 'intersection x=24 z=24 (south of park)' },
  { n: 'xing--24-24', x: -24, z: 24, yaw: 2.4, pitch: .3, dist: 9, note: 'intersection x=-24 z=24' },
  { n: 'xing-0-24', x: 0, z: 24, yaw: 1.2, pitch: .25, dist: 10, note: 'core EW road near spawn' },
  { n: 'school-parking', x: 0, z: -67, yaw: Math.PI, pitch: .3, dist: 9, note: 'school parking vs EW road z=-72' },
  { n: 'school-playground', x: 21, z: -54, yaw: Math.PI / 2, pitch: .3, dist: 8, note: 'school blacktop vs NS road x=24' },
  { n: 'mall-front', x: -108, z: 0, yaw: -Math.PI / 2, pitch: .28, dist: 9, note: 'Cedar Plaza vs NS road x=-104' },
  { n: 'field', x: -136, z: -104, yaw: 0.4, pitch: .4, dist: 16, note: 'Falls Field lawn vs nearby roads' },
  { n: 'xing-104-72', x: 104, z: 72, yaw: 3.6, pitch: .3, dist: 9, note: 'outer intersection' },
  { n: 'xing-168-136', x: 168, z: 136, yaw: 4, pitch: .3, dist: 10, note: 'far outer intersection' },
  { n: 'civic-drive', x: 111, z: 56, yaw: -Math.PI / 2, pitch: .3, dist: 9, note: 'police/fire driveway vs road x=104' },
];

function dataUrlToBuf(url) { return Buffer.from(String(url).split(',')[1] || '', 'base64'); }

const b = await launch();
const ctx = await context(b);
const p = await page(ctx, 'Road');
await enter(p, { name: 'RoadTest', room: 'local-road-grass' });
await frames(p, 16);
await p.evaluate(() => {
  const T = window.__mpTown;
  if (T.ACT && T.ACT.TUT && T.ACT.TUT.skip) T.ACT.TUT.skip();
  T.setWeather && T.setWeather('clear');
  T.setDay && T.setDay(.42);
  try { T.Z && T.Z.killNear && T.Z.killNear(0, 0, 400, 9999); } catch (e) {}
});
await frames(p, 10);
await p.waitForTimeout(400);

const hudText = await p.evaluate(() => {
  const ob = document.querySelector('#obj');
  return { html: ob ? ob.innerHTML : null, text: ob ? ob.innerText : null };
});
writeFileSync(`${OUT}/hud.json`, JSON.stringify(hudText, null, 2));

// Street-level + HUD shots with the real game HUD visible
for (const s of shots) {
  await p.evaluate(([x, z, yaw, pitch, dist]) => {
    const T = window.__mpTown;
    T.setPos(x, z); T.me.ry = yaw; T.setCam(yaw, pitch, dist);
  }, [s.x, s.z, s.yaw, s.pitch, s.dist]);
  await frames(p, 10);
  await p.waitForTimeout(280);
  await p.screenshot({ path: `${OUT}/${s.n}.png` });
}

// Close-up of the top-bar objective / player line
const objBox = await p.evaluate(() => {
  const el = document.querySelector('#obj');
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: r.x, y: r.y, width: r.width, height: r.height };
});
await p.screenshot({ path: `${OUT}/hud-full.png` });
if (objBox && objBox.width > 2 && objBox.height > 2) {
  const pad = 8;
  await p.screenshot({
    path: `${OUT}/hud-obj-closeup.png`,
    clip: {
      x: Math.max(0, objBox.x - pad),
      y: Math.max(0, objBox.y - pad),
      width: Math.min(844, objBox.width + pad * 2),
      height: Math.min(80, objBox.height + pad * 2),
    },
  });
}

// Hide HUD for clean top-downs
await p.evaluate(() => {
  for (const id of ['hud', 'obj', 'mini', 'joy', 'pad', 'pause', 'toast']) {
    const el = document.getElementById(id) || document.querySelector('.' + id);
    if (el) el.style.visibility = 'hidden';
  }
  const hud = document.getElementById('hud'); if (hud) hud.style.display = 'none';
  document.querySelectorAll('#hud, .hud, #mini, #obj').forEach(e => { e.style.visibility = 'hidden'; });
});

async function topDown(name, cx, cz, hw) {
  const url = await p.evaluate(async ([cx, cz, hw]) => {
    const T = window.__mpTown, r = T.renderer, sc = T.scene;
    const fog = sc.fog; sc.fog = null;
    const B = T.W.bounds;
    const hx = hw || B.x + 20, hz = hx * 1000 / 1200;
    const THREE = await import('/node_modules/three/build/three.module.js');
    const O = new THREE.OrthographicCamera(-hx, hx, hz, -hz, 1, 2000);
    O.position.set(cx, 600, cz); O.up.set(0, 0, -1); O.lookAt(cx, 0, cz); O.updateMatrixWorld();
    sc.traverse(o => { if (o.isMesh || o.isInstancedMesh) o.frustumCulled = false; });
    T.W.closed && T.W.closed.update(cx, cz);
    const old = [];
    sc.traverse(o => { if (!o.visible && (o.isMesh || o.isGroup) && !o.isLight) { old.push(o); o.visible = true; } });
    const prev = r.getSize(new THREE.Vector2());
    r.setSize(1200, 1000, false); r.render(sc, O);
    const d = r.domElement.toDataURL('image/png');
    r.setSize(prev.x, prev.y, false);
    sc.fog = fog;
    for (const o of old) o.visible = false;
    return d;
  }, [cx, cz, hw]);
  writeFileSync(`${OUT}/${name}.png`, dataUrlToBuf(url));
}

await topDown('top-full', 0, 0, 0);
await topDown('top-park', 0, 55, 50);
await topDown('top-school', 0, -58, 45);
await topDown('top-mall', -116, 0, 40);
await topDown('top-core-xing', 0, 0, 55);
await topDown('top-field', -136, -104, 50);

// Vertex scan: thin ground-ish geometry (y < 0.9) overlapping the roadway interior
const scan = await p.evaluate(async () => {
  const T = window.__mpTown;
  const { CFG, ROAD_HALF, BOUNDS } = await import('/src/mp/town/map.js');
  const R = ROAD_HALF, MX = BOUNDS.x + 30, MZ = BOUNDS.z + 30, MARGIN = 0.2;
  const roads = [];
  for (const z of CFG.ZR) roads.push({ n: 'EW z=' + z, x0: -MX, x1: MX, z0: z - R + MARGIN, z1: z + R - MARGIN });
  for (const x of CFG.XR) roads.push({ n: 'NS x=' + x, x0: x - R + MARGIN, x1: x + R - MARGIN, z0: -MZ, z1: MZ });
  const V = T.scene.position.constructor, v = new V();
  const M4 = T.scene.matrixWorld.constructor, im = new M4();
  T.scene.updateMatrixWorld(true);
  const cars = new Set();
  for (const c of (T.cars || [])) c.g && c.g.traverse(o => cars.add(o));
  const out = { offenders: {}, meshes: 0, lawns: [] };
  const colOf = (o) => {
    const m = o.material;
    const mat = Array.isArray(m) ? m[0] : m;
    if (!mat) return '';
    if (mat.color) return '#' + mat.color.getHexString();
    return '';
  };
  T.W.root.traverse(o => {
    if (!o.isMesh || cars.has(o) || !o.geometry || !o.geometry.attributes.position || !o.visible) return;
    out.meshes++;
    const pos = o.geometry.attributes.position;
    const n = o.isInstancedMesh ? o.count : 1;
    const color = colOf(o);
    const keyBase = (o.name || o.geometry.type) + '|' + color + '|' + (o.isInstancedMesh ? 'inst' : 'mesh');
    for (let k = 0; k < n; k++) {
      if (o.isInstancedMesh) { o.getMatrixAt(k, im); im.premultiply(o.matrixWorld); }
      else im.copy(o.matrixWorld);
      for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i).applyMatrix4(im);
        if (v.y < -0.05 || v.y > 0.9) continue;
        for (const rd of roads) {
          if (v.x > rd.x0 && v.x < rd.x1 && v.z > rd.z0 && v.z < rd.z1) {
            const key = keyBase + '|' + rd.n;
            const e = out.offenders[key] || (out.offenders[key] = { verts: 0, y0: 1e9, y1: -1e9, x0: 1e9, x1: -1e9, z0: 1e9, z1: -1e9, color });
            e.verts++;
            e.y0 = Math.min(e.y0, v.y); e.y1 = Math.max(e.y1, v.y);
            e.x0 = Math.min(e.x0, v.x); e.x1 = Math.max(e.x1, v.x);
            e.z0 = Math.min(e.z0, v.z); e.z1 = Math.max(e.z1, v.z);
          }
        }
      }
    }
  });
  for (const e of Object.values(out.offenders)) for (const k of ['y0', 'y1', 'x0', 'x1', 'z0', 'z1']) e[k] = +e[k].toFixed(3);
  // classify: asphalt (dark, y~0.02), paint, sidewalks (concrete thick), green lawns
  const green = [], otherLow = [];
  for (const [k, e] of Object.entries(out.offenders)) {
    const hex = (e.color || '').replace('#', '');
    const r = parseInt(hex.slice(0, 2), 16) || 0, g = parseInt(hex.slice(2, 4), 16) || 0, b = parseInt(hex.slice(4, 6), 16) || 0;
    const isGreen = g > r + 20 && g > b + 20 && g > 80;
    const isAsphalt = r < 90 && g < 90 && b < 90 && e.y1 < 0.08;
    const isPaint = (r > 160 && g > 140 && b < 130) || (r > 180 && g > 180 && b > 160);
    const rec = { key: k, ...e, isGreen, isAsphalt, isPaint };
    if (isGreen) green.push(rec);
    else if (!isAsphalt && !isPaint) otherLow.push(rec);
  }
  return { green, otherLow, offenderCount: Object.keys(out.offenders).length, meshes: out.meshes, hud: document.querySelector('#obj') && document.querySelector('#obj').innerText };
});
writeFileSync(`${OUT}/scan.json`, JSON.stringify(scan, null, 2));

const info = {
  errs: p.errs, nf: p.nf, hud: hudText, greenOverlaps: scan.green, otherOverlaps: scan.otherLow,
};
writeFileSync(`${OUT}/info.json`, JSON.stringify(info, null, 2));
console.log(JSON.stringify({ out: OUT, errs: p.errs, nf: p.nf.length, hud: hudText.text, green: scan.green.length, other: scan.otherLow.length }, null, 2));
await b.close();
