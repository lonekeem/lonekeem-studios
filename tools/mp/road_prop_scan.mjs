// Local-only: scan Quiet Falls for props/fences/signs/cars on the roadway. Never joins the public lobby.
import { launch, context, page, enter, frames } from '../coop/lib.mjs';
import { mkdirSync, writeFileSync } from 'fs';

const OUT = process.env.OUT || '/workspace/atq-road-proof/prop-before';
mkdirSync(OUT, { recursive: true });
process.env.COOP_URL = process.env.COOP_URL || 'http://127.0.0.1:5571/';

function dataUrlToBuf(url) { return Buffer.from(String(url).split(',')[1] || '', 'base64'); }

const b = await launch();
const ctx = await context(b);
const p = await page(ctx, 'PropScan');
await enter(p, { name: 'PropScan', room: 'local-road-props' });
await frames(p, 16);
await p.evaluate(() => {
  const T = window.__mpTown;
  if (T.ACT && T.ACT.TUT && T.ACT.TUT.skip) T.ACT.TUT.skip();
  T.setWeather && T.setWeather('clear');
  T.setDay && T.setDay(.42);
  try { T.Z && T.Z.killNear && T.Z.killNear(0, 0, 400, 9999); } catch (e) {}
});
await frames(p, 10);

const scan = await p.evaluate(async () => {
  const T = window.__mpTown;
  const { CFG, ROAD_HALF, BOUNDS } = await import('/src/mp/town/map.js');
  const R = ROAD_HALF, MX = BOUNDS.x + 30, MZ = BOUNDS.z + 30, MARGIN = 0.15;
  const roads = [];
  for (const z of CFG.ZR) roads.push({ n: 'EW z=' + z, x0: -MX, x1: MX, z0: z - R + MARGIN, z1: z + R - MARGIN });
  for (const x of CFG.XR) roads.push({ n: 'NS x=' + x, x0: x - R + MARGIN, x1: x + R - MARGIN, z0: -MZ, z1: MZ });
  const gas = { x0: 28, x1: 64, z0: -30, z1: 0 };
  const isHex = (c) => {
    if (!c) return null;
    if (typeof c === 'string') return c;
    if (c.isColor || c.r != null) {
      const r = Math.round(c.r * 255), g = Math.round(c.g * 255), b = Math.round(c.b * 255);
      return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
    }
    return null;
  };
  const matColor = (m) => {
    if (!m) return null;
    if (Array.isArray(m)) return matColor(m[0]);
    return isHex(m.color) || isHex(m.emissive);
  };
  const isRoadish = (hex, name, y0, y1) => {
    if (!hex) return false;
    const h = hex.toLowerCase();
    // asphalt / yellow / white road paint / sidewalk-ish thin slabs we already treat separately
    if (/#2[0-9a-f]2[0-9a-f]3|#1[0-9a-f]1[0-9a-f]2|#333|#2a2d|#3a3|#444|#555|#1a1|#0f0|#ffd|#ffc|#f4d|#e8e|#f5f|#eee|#ddd|#ccc|#c[89a]c[4-8a]b|#b[7-9]b[3-8]a|#d[0-9a]c|#c5c1b6|#c2b79a|#bdb8ac|#c9c4b8/.test(h)) {
      if (y1 < 0.25) return true;
    }
    if (/road|asphalt|lane|paint|sidewalk|kerb|curb/i.test(name || '') && y1 < 0.35) return true;
    return false;
  };

  const V = T.scene.position.constructor;
  const v = new V();
  const M4 = T.scene.matrixWorld.constructor;
  const im = new M4();
  T.scene.updateMatrixWorld(true);
  const carObjs = new Set();
  for (const c of (T.cars || [])) c.g && c.g.traverse(o => carObjs.add(o));

  const loot = (T.W.containers || []).map(c => ({ id: c.id, kind: c.kind || c.table, x: +c.x.toFixed(2), z: +c.z.toFixed(2), label: c.label }));

  const offenders = {};
  let meshes = 0;
  T.W.root.traverse(o => {
    if (!o.isMesh || !o.geometry || !o.geometry.attributes.position || !o.visible) return;
    meshes++;
    const pos = o.geometry.attributes.position;
    const n = o.isInstancedMesh ? o.count : 1;
    const hex = matColor(o.material);
    const name = o.name || '';
    const isCar = carObjs.has(o) || /car|wheel|sedan|van|truck|bus/i.test(name);
    for (let k = 0; k < n; k++) {
      if (o.isInstancedMesh) { o.getMatrixAt(k, im); im.premultiply(o.matrixWorld); }
      else im.copy(o.matrixWorld);
      for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i).applyMatrix4(im);
        if (v.y < 0.02 || v.y > 8) continue;
        if (v.x > gas.x0 && v.x < gas.x1 && v.z > gas.z0 && v.z < gas.z1) continue;
        for (const rd of roads) {
          if (v.x > rd.x0 && v.x < rd.x1 && v.z > rd.z0 && v.z < rd.z1) {
            const key = [isCar ? 'CAR' : 'PROP', name || o.geometry.type, hex || 'nocolor', rd.n].join('|');
            const e = offenders[key] || (offenders[key] = { verts: 0, y0: 1e9, y1: -1e9, x0: 1e9, x1: -1e9, z0: 1e9, z1: -1e9, color: hex, name, isCar, road: rd.n, geom: o.geometry.type });
            e.verts++; e.y0 = Math.min(e.y0, v.y); e.y1 = Math.max(e.y1, v.y);
            e.x0 = Math.min(e.x0, v.x); e.x1 = Math.max(e.x1, v.x);
            e.z0 = Math.min(e.z0, v.z); e.z1 = Math.max(e.z1, v.z);
          }
        }
      }
    }
  });
  const list = Object.values(offenders).map(e => {
    for (const k of ['y0', 'y1', 'x0', 'x1', 'z0', 'z1']) e[k] = +e[k].toFixed(3);
    e.roadish = isRoadish(e.color, e.name, e.y0, e.y1);
    e.cx = +((e.x0 + e.x1) / 2).toFixed(2);
    e.cz = +((e.z0 + e.z1) / 2).toFixed(2);
    e.span = +Math.hypot(e.x1 - e.x0, e.z1 - e.z0).toFixed(2);
    return e;
  });
  const props = list.filter(e => !e.roadish && !e.isCar).sort((a, b) => b.verts - a.verts);
  const cars = list.filter(e => e.isCar && !e.roadish).sort((a, b) => b.verts - a.verts);
  const roadish = list.filter(e => e.roadish);
  return { meshes, loot, props, cars, roadishCount: roadish.length };
});

writeFileSync(`${OUT}/scan.json`, JSON.stringify(scan, null, 2));
console.log('loot', JSON.stringify(scan.loot, null, 2));
console.log('props', scan.props.length);
for (const e of scan.props) console.log(JSON.stringify(e));
console.log('cars-on-road', scan.cars.length, 'roadish-ignored', scan.roadishCount, 'meshes', scan.meshes);

// Street-level before shots of the known crate and any other prop hits
const shots = [
  { n: 'crate-ew24', x: 86, z: 22, yaw: Math.PI, pitch: .22, dist: 7 },
  { n: 'crate-along', x: 82, z: 24, yaw: Math.PI / 2, pitch: .18, dist: 9 },
  { n: 'crate-close', x: 86, z: 20.5, yaw: 0.2, pitch: .35, dist: 5 },
  { n: 'crate-new', x: 79, z: 18.5, yaw: 0.3, pitch: .32, dist: 5.5 },
];
for (const e of scan.props.slice(0, 8)) {
  shots.push({ n: `hit-${e.cx}_${e.cz}`, x: e.cx, z: e.cz, yaw: 0.6, pitch: .3, dist: 8 });
}
for (const s of shots) {
  await p.evaluate(([x, z, yaw, pitch, dist]) => {
    const T = window.__mpTown;
    T.setPos(x, z); T.me.ry = yaw; T.setCam(yaw, pitch, dist);
  }, [s.x, s.z, s.yaw, s.pitch, s.dist]);
  await frames(p, 8);
  await p.waitForTimeout(200);
  await p.screenshot({ path: `${OUT}/${s.n}.png` });
}

await p.evaluate(() => {
  document.querySelectorAll('#hud, #obj, #mini, #touch, #joy, #pad').forEach(e => { e.style.visibility = 'hidden'; e.style.display = 'none'; });
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
await topDown('top-crate', 86, 24, 28);
await topDown('top-core', 0, 0, 55);
await topDown('top-park', 0, 55, 50);
await topDown('top-school', 0, -58, 45);
await topDown('top-mall', -116, 0, 40);
await topDown('top-east', 104, 24, 45);
await topDown('top-west', -104, 24, 45);
await topDown('top-north', 0, 136, 50);
await topDown('top-south', 0, -136, 50);
await topDown('top-field', -136, -104, 50);

await b.close();
console.log('wrote', OUT);
