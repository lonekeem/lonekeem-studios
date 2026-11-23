// Outer ring of Quiet Falls: new streets and districts around the original 2x2 town.
// Existing houses, the store, sheds, gas lot, loot spots and co-op mission points stay put
// (genLots still uses CORE roads). This module only adds new lots and props in the ring.
import * as THREE from 'three';
import { mulberry, signTex } from './kit.js';
import { makeBuilding, COLORS } from './building.js';

// Keep a clear pad around the Radio Tower mission (only spawned during that mission).
export const RADIO_KEEP = { x: 70, z: -31, r: 12 };

// Coloured minimap zones (drawn in town.js).
export const ZONES = [
  { id: 'park', name: 'Willow Park', x0: -28, x1: 28, z0: 45, z1: 65, fill: '#6fa85a' },
  { id: 'school', name: 'Quiet Falls School', x0: -22, x1: 22, z0: -68, z1: -46, fill: '#c4a66a' },
  { id: 'mall', name: 'Cedar Plaza', x0: -128, x1: -108, z0: -16, z1: 16, fill: '#d9895c' },
];

export function inKeep(x, z, pad = 0) {
  return Math.hypot(x - RADIO_KEEP.x, z - RADIO_KEEP.z) < RADIO_KEEP.r + pad;
}
export function inZone(x, z, pad = 0) {
  return ZONES.some(v => x > v.x0 - pad && x < v.x1 + pad && z > v.z0 - pad && z < v.z1 + pad);
}

// Hand-placed outer houses so the original 25 lots never shift. Faces point at the new roads.
// 3 enterable, 16 closed (instanced).
export const OUTER_HOUSES = [
  { cx: -80, cz: 57.5, w: 9, d: 9, face: 'S', road: 72, side: -1, enterable: true },
  { cx: -56, cz: 57.5, w: 9, d: 9, face: 'S', road: 72, side: -1 },
  { cx: 52, cz: 57.5, w: 9, d: 9, face: 'S', road: 72, side: -1 },
  { cx: 76, cz: 57.5, w: 9, d: 9, face: 'S', road: 72, side: -1, enterable: true },
  { cx: -64, cz: 86.5, w: 9, d: 9, face: 'N', road: 72, side: 1 },
  { cx: 64, cz: 86.5, w: 9, d: 9, face: 'N', road: 72, side: 1 },
  { cx: -80, cz: -57.5, w: 9, d: 9, face: 'N', road: -72, side: 1 },
  { cx: -56, cz: -57.5, w: 9, d: 9, face: 'N', road: -72, side: 1, enterable: true },
  { cx: 48, cz: -57.5, w: 9, d: 9, face: 'N', road: -72, side: 1 },
  { cx: 80, cz: -57.5, w: 9, d: 9, face: 'N', road: -72, side: 1 },
  { cx: -64, cz: -86.5, w: 9, d: 9, face: 'S', road: -72, side: -1 },
  { cx: 64, cz: -86.5, w: 9, d: 9, face: 'S', road: -72, side: -1 },
  { cx: 89.5, cz: 16, w: 9, d: 9, face: 'E', road: 104 },
  { cx: 89.5, cz: 40, w: 9, d: 9, face: 'E', road: 104 },
  { cx: 89.5, cz: -56, w: 9, d: 9, face: 'E', road: 104 },
  { cx: -89.5, cz: 40, w: 9, d: 9, face: 'W', road: -104 },
  { cx: -89.5, cz: 56, w: 9, d: 9, face: 'W', road: -104 },
  { cx: -89.5, cz: -48, w: 9, d: 9, face: 'W', road: -104 },
  { cx: -89.5, cz: -72, w: 9, d: 9, face: 'W', road: -104 },
];

const VDIMS = [[9, 8], [8.6, 8], [11, 7], [9, 8]];

/** Add the outer houses to W.lots / closed / enterable. Call BEFORE W.closed.init(). */
export function placeOuterHouses(W) {
  const { col } = W; const rr = mulberry(91);
  OUTER_HOUSES.forEach((src, i) => {
    const l = Object.assign({ outer: true }, src); l.id = 'O' + i; l.ci = Math.floor(rr() * COLORS.length);
    if (inKeep(l.cx, l.cz, 8)) return;
    l.enterable = !!src.enterable;
    if (l.enterable) {
      const bd = makeBuilding(W, { id: l.id, kind: 'house', cx: l.cx, cz: l.cz, w: l.w, d: l.d, face: l.face, ci: l.ci, locked: rr() < .45 ? 1 : 0, back: rr() < .5 ? 1 : 0 });
      l.bd = bd; W.enterable.push(bd);
    } else {
      const v = Math.floor(rr() * 4); const dims = VDIMS[v]; l.v = v;
      const tint = new THREE.Color(COLORS[l.ci]).multiplyScalar(.55 + rr() * .3);
      W.closed.add(l, v, tint, new THREE.Color(['#d0c0b0', '#a8a8a2', '#c8a08c', '#9aa296'][Math.floor(rr() * 4)]));
      const swap = l.face === 'E' || l.face === 'W';
      const hx = (swap ? dims[1] : dims[0]) / 2, hz = (swap ? dims[0] : dims[1]) / 2;
      col.add(l.cx - hx, l.cx + hx, l.cz - hz, l.cz + hz, 'wall', true);
    }
    W.lots.push(l);
  });
}

function poleSign(W, x, z, ry, lines, bg = '#1d3b26') {
  const { B, col, root } = W;
  B.bounds('dark', x - .08, x + .08, 0, 2.4, z - .08, z + .08, '#2a2d33', 1);
  const t = signTex(lines, bg, '#e8efe4', 512, 160);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(2.8, .88), new THREE.MeshStandardMaterial({ map: t, roughness: .85 }));
  const back = new THREE.Mesh(new THREE.BoxGeometry(2.9, .95, .08), new THREE.MeshStandardMaterial({ color: bg, roughness: .9 }));
  const g = new THREE.Group(); g.position.set(x, 2.85, z); g.rotation.y = ry; g.add(back); m.position.z = .05; g.add(m); root.add(g);
  col.add(x - .2, x + .2, z - .2, z + .2, 'sign', true);
  return g;
}

function bench(W, x, z, ry) {
  const { B, col } = W; const cs = Math.cos(ry), sn = Math.sin(ry);
  const box = (lx, ly0, ly1, lz, w, d, mat, c) => {
    const wx = x + lx * cs + lz * sn, wz = z - lx * sn + lz * cs;
    B.bounds(mat, wx - w / 2, wx + w / 2, ly0, ly1, wz - d / 2, wz + d / 2, c, 1);
  };
  box(0, .42, .52, 0, 1.6, .42, 'plank', '#7a6248');
  box(-.7, 0, .72, 0, .12, .42, 'plank', '#6a543c');
  box(.7, 0, .72, 0, .12, .42, 'plank', '#6a543c');
  box(0, .62, 1.02, -.16, 1.6, .1, 'plank', '#7a6248');
  col.add(x - .9, x + .9, z - .4, z + .4, 'prop', true);
}

function addPark(W) {
  const { B, col, root, M } = W; const rr = mulberry(202);
  // slightly greener lawn (one cheap plane, shared grass look)
  const lawn = new THREE.Mesh(new THREE.PlaneGeometry(56, 20), new THREE.MeshStandardMaterial({ color: '#6f9a4e', roughness: 1 }));
  lawn.rotation.x = -Math.PI / 2; lawn.position.set(0, .03, 55); lawn.receiveShadow = true; root.add(lawn);
  // gravel paths (merged)
  const path = (x0, x1, z0, z1) => B.bounds('concrete', x0, x1, .04, .1, z0, z1, '#c2b79a', 2);
  path(-1.1, 1.1, 45.2, 64.6);
  path(-22, 22, 54.2, 56.2);
  path(-18, -16.2, 48, 55);
  path(16.2, 18, 49, 55);
  // fountain
  B.bounds('concrete', -2.2, 2.2, 0, .35, 53.8, 58.2, '#d5d0c4', 2);
  { const g = new THREE.CylinderGeometry(1.5, 1.7, .45, 12); g.translate(0, .55, 55); B.addGeo('concrete', g, null, '#d8d4c8');
    const r = new THREE.CylinderGeometry(.18, .18, 1.1, 8); r.translate(0, 1.2, 55); B.addGeo('concrete', r, null, '#cfc9ba');
    const b = new THREE.SphereGeometry(.35, 10, 8); b.translate(0, 1.85, 55); B.addGeo('concrete', b, null, '#e8e4d8'); }
  col.add(-2.2, 2.2, 53.8, 58.2, 'prop', true);
  // playground (west): frame, slide, two swings
  const px = -16, pz = 51.5;
  B.bounds('metal', px - 2.4, px + 2.4, 0, .08, pz - 2.0, pz + 2.0, '#8a9080', 1);
  B.bounds('metal', px - 2.0, px - 1.85, 0, 2.2, pz - 1.4, pz - 1.25, '#c45a3a', 1);
  B.bounds('metal', px + 1.85, px + 2.0, 0, 2.2, pz - 1.4, pz - 1.25, '#c45a3a', 1);
  B.bounds('metal', px - 2.0, px + 2.0, 2.15, 2.3, pz - 1.4, pz - 1.25, '#c45a3a', 1);
  B.bounds('plank', px - 1.1, px - .5, .35, .48, pz - 1.55, pz - 1.1, '#6a543c', 1);
  B.bounds('plank', px + .5, px + 1.1, .35, .48, pz - 1.55, pz - 1.1, '#6a543c', 1);
  B.bounds('metal', px + 2.6, px + 2.75, 0, 1.8, pz + .2, pz + .35, '#c45a3a', 1);
  B.bounds('paint', px + 1.1, px + 2.7, .9, 1.0, pz + .1, pz + .5, '#f0c44a', 1);
  B.bounds('paint', px + .4, px + 1.2, 0, .12, pz + .05, pz + .7, '#f0c44a', 1);
  col.add(px - 2.5, px + 2.9, pz - 2.1, pz + 1.0, 'prop', true);
  // basketball pad (east)
  B.bounds('concrete', 12, 22, .04, .1, 50, 58, '#b9b3a4', 2);
  B.bounds('metal', 21.3, 21.5, 0, 3.1, 53.7, 53.9, '#d8dde0', 1);
  B.bounds('paint', 20.4, 21.5, 2.85, 3.05, 53.2, 54.4, '#e8efe4', 1);
  col.add(21.2, 21.6, 53.6, 54.0, 'prop', true);
  // benches along the path
  for (const [x, z, ry] of [[-6, 49.5, 0], [6, 49.5, 0], [-6, 60.5, Math.PI], [6, 60.5, Math.PI], [-22, 55, Math.PI / 2], [22, 55, -Math.PI / 2]]) bench(W, x, z, ry);
  // a few park trees (instanced with the town set later is hard; cheap unique cones, merged)
  for (let i = 0; i < 10; i++) {
    const a = rr() * 6.28, r = 18 + rr() * 8; const x = Math.cos(a) * r, z = 55 + Math.sin(a) * (8 + rr() * 4);
    if (Math.abs(x) < 4 && Math.abs(z - 55) < 4) continue;
    if (Math.abs(x) < 2 && (z < 48 || z > 62)) continue;
    const tr = new THREE.CylinderGeometry(.18, .28, 2.4, 5); tr.translate(x, 1.2, z); B.addGeo('plank', tr, null, '#5a4030');
    const cn = new THREE.ConeGeometry(1.4 + rr() * .4, 2.6 + rr() * .5, 6); cn.translate(x, 3.0, z); B.addGeo('siding', cn, null, '#4a7a3a');
    col.add(x - .3, x + .3, z - .3, z + .3, 'tree', true);
  }
  poleSign(W, 0, 64.2, 0, ['WILLOW', 'PARK'], '#2d5a28');
}

function addSchool(W) {
  const { B, col, root } = W;
  // brick school (store kit: enterable office / halls), door faces the new south road
  const bd = makeBuilding(W, { id: 'school', kind: 'store', cx: -6, cz: -54, w: 20, d: 12, face: 'N', ci: 3, locked: 0, color: '#c9b896' });
  W.enterable.push(bd); W.school = bd;
  { const t = signTex(['QUIET FALLS', 'SCHOOL'], '#3a4a6a', '#f4efe4', 768, 160);
    const side = new THREE.MeshStandardMaterial({ color: '#3a4a6a', roughness: .8 });
    const band = new THREE.Mesh(new THREE.BoxGeometry(10, .85, .14), [side, side, side, side, new THREE.MeshStandardMaterial({ map: t, roughness: .7 }), side]);
    band.position.set(0, (bd.Hh || 3.2) - .45, bd.cfg.d / 2 + .13); bd.grp.add(band); }
  // front walk + parking lot between the building and the new south road (z = -72)
  B.bounds('concrete', -18, 16, .03, .09, -67.5, -60.2, '#c5c1b6', 2);
  for (let k = -3; k <= 2; k++) B.bounds('paint', k * 4.2 - .06, k * 4.2 + .06, .09, .12, -67.2, -60.6, '#d8c15a', 1);
  // playground blacktop + frame to the east
  B.bounds('concrete', 8, 21, .03, .09, -60, -48, '#b7b3a8', 2);
  B.bounds('metal', 9.2, 9.4, 0, 2.3, -58.6, -58.4, '#c45a3a', 1);
  B.bounds('metal', 19.0, 19.2, 0, 2.3, -58.6, -58.4, '#c45a3a', 1);
  B.bounds('metal', 9.2, 19.2, 2.2, 2.35, -58.6, -58.4, '#c45a3a', 1);
  B.bounds('metal', 10.2, 17.8, 1.5, 1.6, -52.2, -50.4, '#3a6ea0', 1);
  col.add(9, 19.4, -59, -50.2, 'prop', true);
  // flagpole
  B.bounds('metal', 12.85, 13.05, 0, 5.4, -61.1, -60.9, '#d8dde0', 1);
  B.bounds('paint', 13.05, 14.3, 4.5, 5.2, -61.15, -60.85, '#3a6ea0', 1);
  col.add(12.8, 13.1, -61.2, -60.8, 'prop', true);
  poleSign(W, 8, -61.6, Math.PI, ['QUIET FALLS', 'SCHOOL'], '#3a4a6a');
}

function shopSign(bd, text, bg) {
  const { grp, cfg } = bd; const hw = cfg.w / 2, hd = cfg.d / 2;
  const t = signTex(text, bg, '#f4efe4', 512, 128);
  const m = new THREE.Mesh(new THREE.BoxGeometry(cfg.w - .4, .7, .12), new THREE.MeshStandardMaterial({ map: t, roughness: .7 }));
  // band across the front wall, just under the roof
  m.position.set(0, (bd.Hh || 3.2) - .45, hd + .12);
  // use only the front face texture: replace with a box whose front is the sign
  const side = new THREE.MeshStandardMaterial({ color: bg, roughness: .8 });
  m.material = [side, side, side, side, new THREE.MeshStandardMaterial({ map: t, roughness: .7 }), side];
  grp.add(m);
}

function closedShop(W, cx, cz, w, d, name, bg) {
  // axis-aligned shop facade facing east (the west road). Merged into the static builder.
  const { B, col, root, M } = W; const hw = w / 2, hd = d / 2;
  const x0 = cx - hd, x1 = cx + hd, z0 = cz - hw, z1 = cz + hw;
  B.bounds('brick', x0, x1, 0, 3.2, z0, z1, '#c8bfae', 2);
  B.bounds('concrete', x0 - .2, x1 + .2, 3.2, 3.5, z0 - .2, z1 + .2, '#8a8880', 2);
  // window glass + door panel on the east face (no cave-like holes)
  B.bounds('trim', x1, x1 + .05, .7, 2.4, cz - hw * .62, cz - hw * .08, '#5a4a3a', 1);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(hw * .5, 1.5), M.glass);
  glass.position.set(x1 + .07, 1.55, cz - hw * .35); glass.rotation.y = Math.PI / 2; root.add(glass);
  B.bounds('paint', x1, x1 + .06, 0, 2.15, cz + hw * .12, cz + hw * .42, '#4a3a32', 1);
  B.bounds('metal', x1 + .06, x1 + .1, .9, 1.1, cz + hw * .24, cz + hw * .32, '#c8cdd0', 1);
  col.add(x0, x1, z0, z1, 'wall', true);
  const t = signTex(name, bg, '#f4efe4', 512, 128);
  const side = new THREE.MeshStandardMaterial({ color: bg, roughness: .8 });
  const band = new THREE.Mesh(new THREE.BoxGeometry(w - .3, .7, .12), [side, side, side, side, new THREE.MeshStandardMaterial({ map: t, roughness: .7 }), side]);
  band.position.set(x1 + .08, 2.75, cz); band.rotation.y = Math.PI / 2; root.add(band);
}

function addMall(W) {
  const { B } = W;
  // Ott's is enterable (kiosk kit, no KL Fuel storefront). The other two bays are closed facades (phone perf).
  const bd = makeBuilding(W, { id: 'mall1', kind: 'kiosk', cx: -116, cz: -9, w: 9, d: 10, face: 'E', ci: 4, locked: 0, color: '#c8bfae' });
  W.enterable.push(bd); W.mall = bd; shopSign(bd, ["OTT'S", 'HARDWARE'], '#6a3b28');
  closedShop(W, -116, 0, 8.6, 10, ['CEDAR', 'LAUNDRY'], '#2a4a6a');
  closedShop(W, -116, 9, 8.6, 10, ['FALLS', 'VIDEO'], '#3a2a4a');
  B.bounds('concrete', -110.2, -107.6, .03, .09, -15.5, 15.5, '#c5c1b6', 2);
  for (let k = -3; k <= 3; k++) B.bounds('paint', -110.0, -107.8, .09, .12, k * 4.2 - .06, k * 4.2 + .06, '#d8c15a', 1);
  poleSign(W, -107.2, 0, Math.PI / 2, ['CEDAR', 'PLAZA'], '#5a2e1e');
}

/** Landmarks and props. Call BEFORE B.build() and before addLoot, after specials. */
export function addDistricts(W) {
  W.zones = ZONES;
  addPark(W);
  addSchool(W);
  addMall(W);
}
