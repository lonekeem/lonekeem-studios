// v1.9.62 "Quiet Falls grows": the second outer ring of the online town (roads z = +-136, x = +-168 live in map.js CFG).
// Landmarks: Main Street + Town Hall (north), Quiet Falls General hospital (west), water tower, Falls Freight Yard (south-east),
// Falls Field (south-west), police + fire station (east), Hollis Farm (far east), and rows of new houses (Maple Heights, Pine Hollow...).
// Everything static is merged into the shared Builder (few draw calls); closed houses are the instanced variants from map.js.
// Phone budget: no new lights, signs are small canvas textures, colliders are simple rects.
import * as THREE from 'three';
import { mulberry, signTex } from './kit.js';
import { makeBuilding, COLORS, gableGeo, FACE_ROT } from './building.js';

const RH = 5, SWK = 2.2, EDGE = RH + SWK; // road half width + sidewalk (must match map.js ROAD_HALF)
const ZR = [-136, -72, -24, 24, 72, 136], XR = [-168, -104, -24, 24, 104, 168]; const BX = 212, BZ = 176;

export const RING2_ZONES = [
  { id: 'main', name: 'Main Street', x0: -98, x1: 98, z0: 144, z1: 158, fill: '#c98f6a' },
  { id: 'hosp', name: 'Quiet Falls General', x0: -152, x1: -120, z0: -65, z1: -31, fill: '#d9d9d4' },
  { id: 'yard', name: 'Falls Freight Yard', x0: 111, x1: 161, z0: -129, z1: -79, fill: '#8f9188' },
  { id: 'field', name: 'Falls Field', x0: -158, x1: -114, z0: -122, z1: -86, fill: '#5f9a4a' },
  { id: 'farm', name: 'Hollis Farm', x0: 176, x1: 208, z0: 31, z1: 65, fill: '#b9a35d' },
  { id: 'civic', name: 'Police & Fire', x0: 111, x1: 131, z0: 31, z1: 65, fill: '#7d8aa0' },
  { id: 'tower', name: 'Water Tower', x0: -9, x1: 9, z0: 95, z1: 113, fill: '#8fa0a8' },
];
// parked cars of the new ring (ids continue after c22). m = model key in cars.js; noTint keeps the livery (police / taxi / ambulance).
export const RING2_CARS = [
  { id: 'c23', m: 'ambulance', x: -129, z: -35.6, ry: 0, fuel: .7, lock: 0, tint: '#ffffff', noTint: 1 },
  { id: 'c24', m: 'ambulance', x: -144, z: -35.6, ry: .08, fuel: .35, lock: 1, tint: '#ffffff', noTint: 1 },
  { id: 'c25', m: 'police', x: 107.4, z: 35, ry: 0, fuel: .6, lock: 1, tint: '#ffffff', noTint: 1 },
  { id: 'c26', m: 'police', x: 107.4, z: 44, ry: .04, fuel: .45, lock: 0, tint: '#ffffff', noTint: 1 },
  { id: 'c27', m: 'taxi', x: -40, z: 139.4, ry: Math.PI / 2, fuel: .5, lock: 0, tint: '#ffffff', noTint: 1 },
  { id: 'c28', m: 'taxi', x: 60, z: 132.6, ry: -Math.PI / 2, fuel: .25, lock: 1, tint: '#ffffff', noTint: 1 },
  { id: 'c29', m: 'truck', x: 118, z: -98, ry: Math.PI / 2, fuel: .8, lock: 0, tint: '#3d5a73' },
  { id: 'c30', m: 'truck', x: 150, z: -93, ry: -Math.PI / 2 + .1, fuel: .2, lock: 1, tint: '#7a2f28' },
  { id: 'c31', m: 'van', x: 140, z: -132.6, ry: -Math.PI / 2, fuel: .55, lock: 1, tint: '#e0ddd2' },
  { id: 'c32', m: 'truck', x: 172.6, z: 4, ry: 0, fuel: .6, lock: 0, tint: '#5d6b3a' },
  { id: 'c33', m: 'sedan', x: -120, z: 139.4, ry: Math.PI / 2, fuel: .4, lock: 1, tint: '#2f4f6f' },
  { id: 'c34', m: 'suv', x: 120, z: 132.6, ry: -Math.PI / 2, fuel: .65, lock: 0, tint: '#556052' },
  { id: 'c35', m: 'hatchback-sports', x: -171.4, z: 50, ry: Math.PI, fuel: .9, lock: 1, tint: '#d0d3d6' },
  { id: 'c36', m: 'sedan', x: 164.6, z: -50, ry: 0, fuel: .3, lock: 0, tint: '#8a3b34' },
  { id: 'c37', m: 'suv-luxury', x: -60, z: -139.4, ry: Math.PI / 2, fuel: .5, lock: 1, tint: '#1f2226' },
  { id: 'c38', m: 'van', x: -164.6, z: -100, ry: 0, fuel: .4, lock: 0, tint: '#4a6a8a' },
  { id: 'c39', m: 'police', x: -100.6, z: -46, ry: Math.PI + .06, fuel: .3, lock: 1, tint: '#ffffff', noTint: 1 },
  { id: 'c40', m: 'truck', x: 30, z: -139.4, ry: Math.PI / 2, fuel: .5, lock: 1, tint: '#c2a23a' },
  { id: 'c41', m: 'suv', x: 100.6, z: 110, ry: Math.PI, fuel: .7, lock: 1, tint: '#6b2f3f' },
  { id: 'c42', m: 'sedan', x: -27.4, z: 104, ry: 0, fuel: .45, lock: 0, tint: '#b8b3a6' },
];

// ---------- local-frame helpers (cx, cz, face) like makeBuilding: +z local = front ----------
const rot = (face, lx, lz) => face === 'N' ? [-lx, -lz] : face === 'E' ? [lz, -lx] : face === 'W' ? [-lz, lx] : [lx, lz];
function wrect(o, lx0, lx1, lz0, lz1) { const a = rot(o.face, lx0, lz0), b = rot(o.face, lx1, lz1); return [o.cx + Math.min(a[0], b[0]), o.cx + Math.max(a[0], b[0]), o.cz + Math.min(a[1], b[1]), o.cz + Math.max(a[1], b[1])]; }
function lbox(W, o, mat, lx0, lx1, y0, y1, lz0, lz1, color, scale = 2) { const r = wrect(o, lx0, lx1, lz0, lz1); W.B.bounds(mat, r[0], r[1], y0, y1, r[2], r[3], color, scale); return r; }
function lcol(W, o, lx0, lx1, lz0, lz1, tag = 'wall') { const r = wrect(o, lx0, lx1, lz0, lz1); W.col.add(r[0], r[1], r[2], r[3], tag, true); return r; }
function lgeo(W, o, mat, geo, lx, y, lz, ry = 0, color = '#ffffff') { const [rx, rz] = rot(o.face, lx, lz); const m = new THREE.Matrix4().compose(new THREE.Vector3(o.cx + rx, y, o.cz + rz), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), (FACE_ROT[o.face] || 0) + ry), new THREE.Vector3(1, 1, 1)); W.B.addGeo(mat, geo, m, color); }
const _sm = new Map();
function signMat(lines, bg, fg, w = 512, h = 128) { const k = lines.join('|') + bg + fg + w; if (_sm.has(k)) return _sm.get(k); const tx = signTex(lines, bg, fg, w, h); const m = new THREE.MeshStandardMaterial({ map: tx, emissiveMap: tx, roughness: .7, emissive: '#ffffff', emissiveIntensity: 0 }); m.userData.nightSign = 1; _sm.set(k, m); return m; }
function sign(W, o, lx, y, lz, w, h, lines, bg = '#24303a', fg = '#f4efe4', tw = 1024) { const one = [lines.join(' ')]; const th = Math.max(64, Math.min(256, Math.round(tw * h / w))); const t = signMat(one, bg, fg, tw, th); const g = new THREE.Group(); const [rx, rz] = rot(o.face, lx, lz); g.position.set(o.cx + rx, y, o.cz + rz); g.rotation.y = FACE_ROT[o.face] || 0; const side = new THREE.MeshStandardMaterial({ color: bg, roughness: .85 });
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, .12), [side, side, side, side, t, side]); g.add(m); m.castShadow = false; W.root.add(g); (W.nightSigns || (W.nightSigns = new Set())).add(t); return g; }
function poleSign(W, x, z, ry, lines, bg) { W.B.bounds('dark', x - .08, x + .08, 0, 2.5, z - .08, z + .08, '#2a2d33', 1); const g = new THREE.Group(); g.position.set(x, 2.95, z); g.rotation.y = ry; const side = new THREE.MeshStandardMaterial({ color: bg, roughness: .9 }); g.add(new THREE.Mesh(new THREE.BoxGeometry(3, .95, .1), [side, side, side, side, signMat(lines, bg, '#f2efe6', 512, 160), side])); W.root.add(g); W.col.add(x - .2, x + .2, z - .2, z + .2, 'sign', true); }
const vc = (g, c) => { const n = g.attributes.position.count, cc = new THREE.Color(c), a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = cc.r; a[i * 3 + 1] = cc.g; a[i * 3 + 2] = cc.b; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; };

// ---------- shopfront (closed, merged): brick/plaster box, parapet, display windows, door, awning, sign band ----------
function shopfront(W, o, w, d, name, c) { const hw = w / 2, hd = d / 2, Hh = c.h || 4.2;
  lbox(W, o, c.mat || 'brick', -hw, hw, 0, Hh, -hd, hd, c.wall || '#c8bfae'); lbox(W, o, 'concrete', -hw - .15, hw + .15, Hh, Hh + .5, -hd - .15, hd + .15, '#8a8880');
  lbox(W, o, 'concrete', -hw - .05, hw + .05, 0, .35, hd, hd + .08, '#9a968c'); // plinth
  const dx = c.doorX ?? hw * .55; lbox(W, o, 'trim', -hw + .5, dx - 1.0, .6, 2.7, hd, hd + .06, '#2b2a28'); lbox(W, o, 'paint', -hw + .6, dx - 1.1, .7, 2.6, hd + .06, hd + .09, '#3e5868', 1); lbox(W, o, 'paint', -hw + .7, dx - 1.2, 2.2, 2.45, hd + .09, hd + .1, '#7d97a6', 1); // display window (dark glass)
  for (let x = -hw + 1.6; x < dx - 1.2; x += 1.6) lbox(W, o, 'trim', x - .04, x + .04, .7, 2.6, hd + .06, hd + .1, '#2b2a28'); // mullions
  lbox(W, o, 'trim', dx - .65, dx + .65, 0, 2.35, hd, hd + .07, '#3b2f27'); lbox(W, o, 'paint', dx - .5, dx + .5, .05, 2.25, hd + .07, hd + .1, c.door || '#5a3a2a'); lbox(W, o, 'metal', dx + .28, dx + .36, 1.0, 1.2, hd + .1, hd + .14, '#c8cdd0');
  if (c.awning !== false) { const aw = c.awn || '#a8322d'; for (let k = 0; k < 7; k++) { const z0 = hd + .1 + k * .2; lbox(W, o, 'paint', -hw + .3, hw - .3, 2.95 - k * .09, 3.03 - k * .09, z0, z0 + .2, k % 2 ? '#f0ece2' : aw, 1); } }
  for (let x = -hw + 1.4; x < hw - 1; x += 2.4) lbox(W, o, 'dark', x - .55, x + .55, Hh - 1.25, Hh - .35, hd, hd + .04, '#26313a'); // upper windows
  sign(W, o, 0, 3.55, hd + .1, Math.min(w - .6, 9.5), 1.0, name, c.sign || '#2a2a2a', c.fg || '#f6efdf');
  lcol(W, o, -hw, hw, -hd, hd); }

// ---------- landmarks ----------
function waterTower(W, x, z) { const { B, col } = W; const legH = 16, s = 3.4, mat = new THREE.Matrix4();
  for (const [lx, lz] of [[-s, -s], [s, -s], [-s, s], [s, s]]) { const g = new THREE.CylinderGeometry(.28, .36, legH, 8); g.translate(x + lx, legH / 2, z + lz); B.addGeo('metal', g, null, '#9aa6ae'); col.add(x + lx - .4, x + lx + .4, z + lz - .4, z + lz + .4, 'pole', true);
    const f = new THREE.CylinderGeometry(.55, .65, .5, 8); f.translate(x + lx, .25, z + lz); B.addGeo('concrete', f, null, '#b8b4aa'); }
  for (const y of [5, 10.5]) for (const [ax, sx, sz] of [['x', 0, -s], ['x', 0, s], ['z', -s, 0], ['z', s, 0]]) { const len = Math.hypot(2 * s, 5.2); for (const sg of [1, -1]) { const g = new THREE.BoxGeometry(.12, len, .12); g.rotateZ(Math.atan2(2 * s, 5.2) * sg); if (ax === 'z') g.rotateY(Math.PI / 2); g.translate(x + sx, y, z + sz); B.addGeo('metal', g, null, '#8a969e'); }
    const r = ax === 'x' ? new THREE.BoxGeometry(2 * s, .14, .14) : new THREE.BoxGeometry(.14, .14, 2 * s); r.translate(x + sx, y + 2.6, z + sz); B.addGeo('metal', r, null, '#8a969e'); }
  { const g = new THREE.CylinderGeometry(.35, .35, 6.5, 8); g.translate(x, legH - 3.2, z); B.addGeo('metal', g, null, '#9aa6ae'); } // riser pipe
  { const g = new THREE.CylinderGeometry(6.1, 6.1, .18, 32); g.translate(x, legH + .05, z); B.addGeo('metal', g, null, '#7d878e'); const rl = new THREE.CylinderGeometry(6.05, 6.05, .08, 32, 1, true); rl.translate(x, legH + 1.0, z); B.addGeo('metal', rl, null, '#5d666c');
    for (let k = 0; k < 24; k++) { const a = k / 24 * Math.PI * 2; const p = new THREE.BoxGeometry(.06, 1, .06); p.translate(x + Math.cos(a) * 6.05, legH + .5, z + Math.sin(a) * 6.05); B.addGeo('metal', p, null, '#5d666c'); } }
  { const bowl = new THREE.SphereGeometry(5.3, 28, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2); bowl.scale(1, .42, 1); bowl.translate(x, legH + .35, z); B.addGeo('paint', bowl, null, '#cfd6db');
    const tank = new THREE.CylinderGeometry(5.3, 5.3, 5.4, 32, 1, true); tank.translate(x, legH + .35 + 2.7, z); B.addGeo('paint', tank, null, '#d6dde2');
    const roof = new THREE.ConeGeometry(5.55, 2.4, 32, 1, true); roof.translate(x, legH + 5.75 + 1.2, z); B.addGeo('paint', roof, null, '#a9b3ba'); const ball = new THREE.SphereGeometry(.4, 10, 8); ball.translate(x, legH + 8.25, z); B.addGeo('paint', ball, null, '#a9b3ba'); }
  // painted name band (two copies around the tank)
  { const c = document.createElement('canvas'); c.width = 1024; c.height = 160; const g = c.getContext('2d'); g.clearRect(0, 0, 1024, 160); g.fillStyle = '#21486e'; g.font = 'bold 104px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('QUIET FALLS', 512, 84);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.repeat.set(2, 1); t.anisotropy = 4;
    const m = new THREE.Mesh(new THREE.CylinderGeometry(5.33, 5.33, 1.9, 40, 1, true), new THREE.MeshStandardMaterial({ map: t, transparent: true, roughness: .6, depthWrite: false })); m.position.set(x, legH + 3.3, z); m.renderOrder = 2; W.root.add(m); }
  // ladder up one leg + fence around the base
  for (let y = .4; y < legH; y += .45) { const r = new THREE.BoxGeometry(.6, .05, .05); r.translate(x + s + .45, y, z + s); B.addGeo('metal', r, null, '#6d777e'); }
  for (const sx of [-.3, .3]) { const r = new THREE.BoxGeometry(.05, legH, .05); r.translate(x + s + .45 + sx, legH / 2, z + s); B.addGeo('metal', r, null, '#6d777e'); }
  chainFence(W, [[x - 8, z - 8], [x + 8, z - 8], [x + 8, z + 8], [x + 2, z + 8]], 1.9); chainFence(W, [[x - 2, z + 8], [x - 8, z + 8], [x - 8, z - 8]], 1.9);
  poleSign(W, x + 4, z + 9.5, 0, ['QUIET FALLS', 'EST. 1887'], '#21486e'); }

let _chainMat = null;
function chainMat() { if (_chainMat) return _chainMat; const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); g.clearRect(0, 0, 64, 64); g.strokeStyle = 'rgba(190,196,200,1)'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, 32); g.lineTo(32, 0); g.lineTo(64, 32); g.lineTo(32, 64); g.closePath(); g.stroke();
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return (_chainMat = new THREE.MeshStandardMaterial({ map: t, alphaTest: .5, side: THREE.DoubleSide, metalness: .4, roughness: .5, color: '#c8ccd0' })); }
const _fence = [];
function chainFence(W, pts, h = 2.0, collide = true) { for (let i = 0; i + 1 < pts.length; i++) { const [x0, z0] = pts[i], [x1, z1] = pts[i + 1]; const len = Math.hypot(x1 - x0, z1 - z0); const n = Math.max(1, Math.round(len / 3));
    for (let k = 0; k <= n; k++) { const x = x0 + (x1 - x0) * k / n, z = z0 + (z1 - z0) * k / n; const p = new THREE.CylinderGeometry(.04, .04, h + .1, 6); p.translate(x, (h + .1) / 2, z); W.B.addGeo('metal', p, null, '#8d969c'); }
    const g = new THREE.PlaneGeometry(len, h); const uv = g.attributes.uv; for (let j = 0; j < uv.count; j++) uv.setXY(j, uv.getX(j) * len / .12, uv.getY(j) * h / .12); g.rotateY(-Math.atan2(z1 - z0, x1 - x0)); g.translate((x0 + x1) / 2, h / 2 + .05, (z0 + z1) / 2); _fence.push(g);
    const r = new THREE.BoxGeometry(len, .05, .05); r.rotateY(-Math.atan2(z1 - z0, x1 - x0)); r.translate((x0 + x1) / 2, h + .05, (z0 + z1) / 2); W.B.addGeo('metal', r, null, '#8d969c');
    if (collide) { const m = 18; for (let k = 0; k < m; k++) { const x = x0 + (x1 - x0) * (k + .5) / m, z = z0 + (z1 - z0) * (k + .5) / m, hx = Math.abs(x1 - x0) / m / 2 + .08, hz = Math.abs(z1 - z0) / m / 2 + .08; W.col.add(x - hx, x + hx, z - hz, z + hz, 'fence', true); } } } }

function hospital(W) { const o = { cx: -136, cz: -45, face: 'S' }; const bd = makeBuilding(W, { id: 'hosp', kind: 'store', cx: o.cx, cz: o.cz, w: 22, d: 12, face: 'S', ci: 5, locked: 0, color: '#e6e4de' }); W.enterable.push(bd); W.hospital = bd;
  sign(W, o, -2, 2.75, 6.32, 12, .8, ['EMERGENCY DEPARTMENT'], '#f3f2ee', '#b3261e', 1024);
  // main 3-storey block behind the ER wing (closed), big rooftop name
  { const m = { cx: -136, cz: -58.5, face: 'S' }, w = 30, d = 12, hw = w / 2, hd = d / 2, Hh = 10.6;
    lbox(W, m, 'plaster', -hw, hw, 0, Hh, -hd, hd, '#e9e7e1'); lbox(W, m, 'concrete', -hw - .2, hw + .2, Hh, Hh + .6, -hd - .2, hd + .2, '#c9c6bf');
    for (const y of [3.5, 7.0]) lbox(W, m, 'concrete', -hw - .06, hw + .06, y - .12, y + .12, -hd - .06, hd + .06, '#c9c6bf');
    for (const y of [1.9, 5.3, 8.8]) { for (let x = -hw + 1.6; x < hw - 1; x += 2.5) { lbox(W, m, 'paint', x - .7, x + .7, y - .65, y + .65, hd, hd + .05, '#4f6f80', 1); lbox(W, m, 'concrete', x - .8, x + .8, y - .78, y - .66, hd, hd + .14, '#d4d1ca', 1); }
      for (let z = -hd + 1.6; z < hd - 1; z += 2.5) for (const sx of [-1, 1]) lbox(W, m, 'paint', sx * hw - (sx > 0 ? 0 : .05), sx * hw + (sx > 0 ? .05 : 0), y - .65, y + .65, z - .7, z + .7, '#4f6f80', 1); }
    lcol(W, m, -hw, hw, -hd, hd);
    sign(W, m, 0, Hh + 1.25, hd - .3, 17, 1.5, ['QUIET FALLS GENERAL'], '#f6f5f1', '#b3261e', 1024);
    lbox(W, m, 'concrete', -6, 6, Hh + .5, Hh + .6, hd - .5, hd - .1, '#9a9890'); for (const lx of [-7.5, 7.5]) lbox(W, m, 'metal', lx - .06, lx + .06, Hh + .5, Hh + 2.1, hd - .4, hd - .28, '#8d969c', 1); }
  // ER canopy + bay
  lbox(W, o, 'concrete', -11.5, 11.5, .03, .09, 6, 13.8, '#c9c6be'); for (let k = -4; k <= 0; k++) lbox(W, o, 'paint', k * 3 - 6 - .06, k * 3 - 6 + .06, .09, .11, 7, 11.5, '#e8e4d8', 1);
  for (const lx of [4, 10]) { lbox(W, o, 'concrete', lx - .2, lx + .2, 0, 3.6, 12.6, 13.0, '#d8d6d0'); lcol(W, o, lx - .25, lx + .25, 12.55, 13.05, 'pole'); }
  lbox(W, o, 'concrete', 3.4, 10.6, 3.6, 4.0, 5.9, 13.4, '#d8d6d0'); lbox(W, o, 'paint', 3.4, 10.6, 3.6, 4.0, 13.4, 13.45, '#b3261e', 1);
  sign(W, o, 7, 3.8, 13.5, 4.6, .36, ['EMERGENCY'], '#b3261e', '#ffffff');
  // red cross pole sign + benches by the door
  { const [x, z] = rot('S', -9, 13.2); const px = o.cx + x, pz = o.cz + z; W.B.bounds('dark', px - .08, px + .08, 0, 2.6, pz - .08, pz + .08, '#2a2d33', 1); const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); g.fillStyle = '#f4f3ef'; g.fillRect(0, 0, 128, 128); g.fillStyle = '#c0261e'; g.fillRect(48, 18, 32, 92); g.fillRect(18, 48, 92, 32); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.1, .1), new THREE.MeshStandardMaterial({ map: t, roughness: .7 })); m.position.set(px, 3.1, pz); W.root.add(m); W.col.add(px - .2, px + .2, pz - .2, pz + .2, 'sign', true); } }

function townHall(W) { const o = { cx: 0, cz: 151, face: 'N' }; const w = 26, d = 12, hw = w / 2, hd = d / 2;
  lbox(W, o, 'brick', -hw, hw, 0, 6.6, -hd, hd, '#c7b39a'); lbox(W, o, 'concrete', -hw - .2, hw + .2, 6.6, 7.2, -hd - .2, hd + .2, '#d8d2c4');
  lbox(W, o, 'concrete', -hw - .4, hw + .4, 0, .4, hd, hd + 2.2, '#cfcac0'); lbox(W, o, 'concrete', -hw - .4, hw + .4, 0, .2, hd + 2.2, hd + 3.0, '#cfcac0'); // steps
  for (let k = -3; k <= 3; k++) { const g = new THREE.CylinderGeometry(.32, .36, 5.4, 12); lgeo(W, o, 'concrete', g, k * 2.2, 3.1, hd + 1.4, 0, '#ece6da'); } // columns
  lbox(W, o, 'concrete', -8.2, 8.2, 5.8, 6.6, hd + .6, hd + 2.2, '#e4ddd0'); // portico beam
  { const g = gableGeo(17, 1.8, 1.6); lgeo(W, o, 'concrete', g, 0, 6.6, hd + 1.4, 0, '#e4ddd0'); }
  for (const lx of [-10, -6.5, 6.5, 10]) for (const y of [1.6, 4.4]) lbox(W, o, 'dark', lx - .6, lx + .6, y - .8, y + .8, hd, hd + .05, '#26313a');
  lbox(W, o, 'paint', -.9, .9, .4, 3.2, hd, hd + .08, '#4a3324');
  // clock tower
  lbox(W, o, 'brick', -2.2, 2.2, 7.2, 11.5, -2.2, 2.2, '#c7b39a'); { const g = new THREE.ConeGeometry(3.3, 3.2, 4); g.rotateY(Math.PI / 4); lgeo(W, o, 'roofmat', g, 0, 13.1, 0, 0, '#5d6f64'); }
  { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); g.fillStyle = '#f1ead8'; g.beginPath(); g.arc(64, 64, 60, 0, 7); g.fill(); g.strokeStyle = '#2a2a2a'; g.lineWidth = 5; g.stroke(); for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; g.fillStyle = '#2a2a2a'; g.fillRect(64 + Math.cos(a) * 48 - 3, 64 + Math.sin(a) * 48 - 3, 6, 6); } g.lineWidth = 6; g.beginPath(); g.moveTo(64, 64); g.lineTo(64, 26); g.moveTo(64, 64); g.lineTo(88, 72); g.stroke();
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; const mm = new THREE.MeshStandardMaterial({ map: t, transparent: true, alphaTest: .4, roughness: .6 });
    for (const [lx, lz, ry] of [[0, 2.23, 0], [0, -2.23, Math.PI], [2.23, 0, Math.PI / 2], [-2.23, 0, -Math.PI / 2]]) { const m = new THREE.Mesh(new THREE.CircleGeometry(1.3, 24), mm); const [rx, rz] = rot(o.face, lx, lz); m.position.set(o.cx + rx, 9.6, o.cz + rz); m.rotation.y = FACE_ROT[o.face] + ry; W.root.add(m); } }
  sign(W, o, 0, 5.2, hd + 2.25, 9, .7, ['TOWN HALL'], '#2b3b52', '#f3ecd8');
  for (const lx of [-12, 12]) { const g = new THREE.CylinderGeometry(.06, .08, 8, 6); lgeo(W, o, 'metal', g, lx, 4, hd + 3.4, 0, '#d0d4d6'); lcol(W, o, lx - .15, lx + .15, hd + 3.25, hd + 3.55, 'pole'); }
  lcol(W, o, -hw, hw, -hd, hd + 2.2); }

function mainStreet(W) { const cz = 136 + EDGE + 1 + 5.5; const shops = [
  [-92, 11, ['FALLS', 'DINER'], { sign: '#8c2f25', awn: '#8c2f25' }], [-79, 11, ['QUIET BEANS', 'COFFEE'], { sign: '#4a3528', awn: '#3f6a4a' }], [-66, 11, ['MAIN ST', 'PHARMACY'], { sign: '#2f6a4a', awn: '#2f6a4a', wall: '#d9d3c3', mat: 'plaster' }],
  [-53, 11, ["SAL'S", 'PIZZA'], { sign: '#a8322d', awn: '#2f7a3a' }], [-40, 11, ['BOOKS', '& BREW'], { sign: '#3a3f6a', awn: '#6a5a8a' }],
  [40, 11, ['LUCKY', 'LAUNDROMAT'], { sign: '#2a5a8a', awn: '#2a5a8a', wall: '#cfd6d8', mat: 'plaster' }], [53, 11, ['QF', 'BARBER'], { sign: '#7a2a2a', awn: '#3a5a9a' }], [66, 11, ['FIX-IT', 'HARDWARE'], { sign: '#c06a20', awn: '#c06a20' }],
  [79, 11, ['THE GAME', 'VAULT'], { sign: '#3a2a5a', awn: '#5a3a8a' }], [92, 11, ['CORNER', 'MARKET'], { sign: '#2f5a2f', awn: '#b8862a' }]];
  for (const [x, w, name, c] of shops) shopfront(W, { cx: x, cz, face: 'N' }, w - .6, 11, name, c);
  townHall(W);
  // planters + benches on the sidewalk in front of the shops
  for (let x = -96; x <= 96; x += 13) { if (Math.abs(x) < 30) continue; const z = 136 + RH + 1.1; W.B.bounds('concrete', x - .5, x + .5, 0, .55, z - .5, z + .5, '#a8a294', 1); const b = new THREE.SphereGeometry(.55, 8, 6); b.scale(1, .7, 1); b.translate(x, .85, z); W.B.addGeo('siding', b, null, '#4d7a3a'); W.col.add(x - .5, x + .5, z - .5, z + .5, 'prop', true); } }

function container(W, x, y, z, along, color) { const L = 6.1, w = 2.44, h = 2.6; const [x0, x1, z0, z1] = along === 'x' ? [x - L / 2, x + L / 2, z - w / 2, z + w / 2] : [x - w / 2, x + w / 2, z - L / 2, z + L / 2];
  W.B.bounds('metal', x0, x1, y, y + h, z0, z1, color, .6); W.B.bounds('dark', x0 - .03, x1 + .03, y, y + .12, z0 - .03, z1 + .03, '#2a2a2a', 1); W.B.bounds('dark', x0 - .03, x1 + .03, y + h - .1, y + h, z0 - .03, z1 + .03, '#2a2a2a', 1);
  if (y === 0) W.col.add(x0, x1, z0, z1, 'wall', true); }

function freightYard(W) { const bd = makeBuilding(W, { id: 'freight', kind: 'store', cx: 128, cz: -87.7, w: 20, d: 12, face: 'S', ci: 2, locked: 0, color: '#9ea5a8' }); W.enterable.push(bd);
  sign(W, { cx: 128, cz: -87.7, face: 'S' }, 0, 2.75, 6.32, 10, .8, ['FALLS FREIGHT'], '#29435c', '#f2f0e8', 1024);
  // big closed warehouse with roll-up doors + loading dock, facing the south road
  const o = { cx: 140, cz: -120.5, face: 'N' }; const w = 30, d = 14, hw = w / 2, hd = d / 2;
  lbox(W, o, 'metal', -hw, hw, 0, 7, -hd, hd, '#a9aea8', 1.2); lbox(W, o, 'metal', -hw - .3, hw + .3, 7, 7.4, -hd - .3, hd + .3, '#7d8580', 1);
  { const g = gableGeo(w + .6, d + .6, 1.5); lgeo(W, o, 'metal', g, 0, 7.2, 0, 0, '#7f8a86'); }
  lbox(W, o, 'concrete', -hw, hw, 0, 1.2, hd, hd + 2.4, '#b4b0a6'); // dock
  for (const lx of [-9, 0, 9]) { lbox(W, o, 'metal', lx - 2, lx + 2, 1.2, 5, hd, hd + .08, '#c9b64a', .5); for (let y = 1.4; y < 5; y += .35) lbox(W, o, 'dark', lx - 2, lx + 2, y, y + .04, hd + .08, hd + .1, '#6a6232', 1); lbox(W, o, 'dark', lx - 2.2, lx + 2.2, 1.2, 1.5, hd + 2.4, hd + 2.5, '#222', 1); }
  sign(W, o, 0, 6.2, hd + .1, 11, .9, ['QUIET FALLS DISTRIBUTION'], '#2c3e2c', '#efe8d0', 1024);
  lcol(W, o, -hw, hw, -hd, hd + 2.4);
  // shipping containers (some stacked), pallets, a parked semi trailer
  const C = ['#9c3a2c', '#2c5a8a', '#3f7a46', '#c8782a', '#6a6f74', '#8a2c4a'], rr = mulberry(611); let ci = 0;
  for (const [x, z, st] of [[116, -104, 2], [123, -104, 1], [116, -110, 1], [148, -100, 2], [148, -106, 1], [155, -100, 1]]) for (let k = 0; k < st; k++) container(W, x, k * 2.6, z, 'z', C[(ci++) % C.length]);
  for (let i = 0; i < 6; i++) { const x = 130 + rr() * 10, z = -112 + rr() * 6; W.B.bounds('plank', x - .6, x + .6, 0, .15, z - .5, z + .5, '#a0845a', 1); if (rr() < .6) W.B.bounds('fabric', x - .5, x + .5, .15, .9, z - .45, z + .45, '#c9c2b0', 1); }
  { const x0 = 134, z0 = -97; W.B.bounds('metal', x0 - 6.5, x0 + 6.5, 1.2, 4.2, z0 - 1.3, z0 + 1.3, '#e2e2dc', .8); for (const xx of [x0 + 3.6, x0 + 4.9]) for (const s of [-1, 1]) { const g = new THREE.CylinderGeometry(.5, .5, .35, 14); g.rotateX(Math.PI / 2); g.translate(xx, .5, z0 + s * 1.05); W.B.addGeo('dark', g, null, '#1d1d1d'); }
    W.B.bounds('dark', x0 - 6.4, x0 - 5.6, 0, 1.2, z0 - .1, z0 + .1, '#333', 1); W.col.add(x0 - 6.5, x0 + 6.5, z0 - 1.3, z0 + 1.3, 'wall', true); sign(W, { cx: x0, cz: z0 + 1.33, face: 'S' }, 0, 2.7, 0, 8, 1.1, ['FALLS FREIGHT'], '#e2e2dc', '#29435c', 1024); }
  // perimeter fence with gates toward the roads
  chainFence(W, [[111.5, -79.8], [121, -79.8]], 2.2); chainFence(W, [[135, -79.8], [160.5, -79.8], [160.5, -128.5], [156, -128.5]], 2.2); chainFence(W, [[124, -128.5], [111.5, -128.5], [111.5, -79.8]], 2.2); }

function field(W) { const cx = -136, cz = -104, fw = 26, fl = 42; // american football field (goal posts at the short ends), bleachers on the east side
  const lawn = new THREE.Mesh(new THREE.PlaneGeometry(fw + 4, fl + 6), new THREE.MeshStandardMaterial({ color: '#5f9446', roughness: 1 })); lawn.rotation.x = -Math.PI / 2; lawn.position.set(cx, .03, cz); lawn.receiveShadow = true; W.root.add(lawn);
  const line = (x0, x1, z0, z1) => W.B.bounds('paint', x0, x1, .035, .05, z0, z1, '#eef0ea', 1);
  line(cx - fw / 2, cx + fw / 2, cz - fl / 2 - .1, cz - fl / 2 + .1); line(cx - fw / 2, cx + fw / 2, cz + fl / 2 - .1, cz + fl / 2 + .1); line(cx - fw / 2 - .1, cx - fw / 2 + .1, cz - fl / 2, cz + fl / 2); line(cx + fw / 2 - .1, cx + fw / 2 + .1, cz - fl / 2, cz + fl / 2);
  for (let k = 1; k < 10; k++) { const z = cz - fl / 2 + k * fl / 10; line(cx - fw / 2, cx + fw / 2, z - .06, z + .06); }
  for (const s of [-1, 1]) { const z = cz + s * (fl / 2 + 1.2); W.B.bounds('paint', cx - .1, cx + .1, 0, 3, z - .1, z + .1, '#e8c33a', 1); W.B.bounds('paint', cx - 2.8, cx + 2.8, 3, 3.15, z - .08, z + .08, '#e8c33a', 1); for (const sx of [-2.8, 2.8]) W.B.bounds('paint', cx + sx - .07, cx + sx + .07, 3, 6.2, z - .07, z + .07, '#e8c33a', 1); W.col.add(cx - .2, cx + .2, z - .2, z + .2, 'pole', true); }
  // bleachers (stepped aluminium) east of the field
  const bx = cx + fw / 2 + 4; for (let r = 0; r < 5; r++) { W.B.bounds('metal', bx + r * .75, bx + r * .75 + .75, r * .45, r * .45 + .1, cz - 12, cz + 12, '#b9c0c4', .6); W.B.bounds('metal', bx + r * .75, bx + r * .75 + .05, 0, r * .45 + .1, cz - 12, cz + 12, '#8d969c', .6); }
  W.col.add(bx, bx + 3.8, cz - 12, cz + 12, 'wall', true);
  chainFence(W, [[cx - fw / 2 - 3, cz - fl / 2 - 4], [cx + fw / 2 + 3, cz - fl / 2 - 4]], 1.4); chainFence(W, [[cx - fw / 2 - 3, cz + fl / 2 + 4], [cx + fw / 2 + 3, cz + fl / 2 + 4]], 1.4);
  poleSign(W, cx - fw / 2 - 1.5, cz + fl / 2 + 5.5, 0, ['FALLS FIELD', 'HOME OF THE OTTERS'], '#2a4a2a'); }

function civic(W) { // police + fire station facing the east road x = 104 (front = -x)
  const pol = { cx: 104 + EDGE + 1.5 + 6, cz: 39.5, face: 'W' }; shopfront(W, pol, 14, 12, ['QUIET FALLS', 'POLICE'], { mat: 'brick', wall: '#b9b1a4', sign: '#22334d', awning: false, door: '#22334d', doorX: 0, h: 4.6 });
  for (const lz of [6.3]) { const g = new THREE.CylinderGeometry(.05, .07, 7, 6); lgeo(W, pol, 'metal', g, -5.5, 3.5, lz, 0, '#d0d4d6'); }
  const fire = { cx: 104 + EDGE + 1.5 + 10, cz: 56, face: 'W' }; const w = 14, d = 14, hw = w / 2, hd = d / 2;
  lbox(W, fire, 'brick', -hw, hw, 0, 5.6, -hd, hd, '#a8553f'); lbox(W, fire, 'concrete', -hw - .2, hw + .2, 5.6, 6.1, -hd - .2, hd + .2, '#d8d2c4');
  for (const lx of [-3.4, 3.4]) { lbox(W, fire, 'paint', lx - 2.6, lx + 2.6, 0, 4.2, hd, hd + .08, '#b52a22', .5); for (let y = .3; y < 4.2; y += .45) lbox(W, fire, 'dark', lx - 2.6, lx + 2.6, y, y + .05, hd + .08, hd + .1, '#6a1a14', 1); for (const x of [lx - 1.6, lx, lx + 1.6]) lbox(W, fire, 'dark', x - .45, x + .45, 2.6, 3.4, hd + .08, hd + .11, '#26313a', 1); }
  sign(W, fire, 0, 4.9, hd + .1, 8.5, .7, ['FIRE STATION 1'], '#f2ede2', '#b52a22'); lcol(W, fire, -hw, hw, -hd, hd);
  // driveway slabs to the road
  W.B.bounds('concrete', 104 + EDGE, fire.cx - hd, .03, .09, 49.5, 62.5, '#c5c1b6', 2);
  fireTruck(W, 113.6, 58); }

function fireTruck(W, x, z) { // static engine parked along the curb (front = -z), cartoon proportions
  const B = W.B, L = 8.4, wd = 2.5; const z0 = z - L / 2, z1 = z + L / 2, x0 = x - wd / 2, x1 = x + wd / 2;
  B.bounds('paint', x0, x1, .7, 3.0, z0, z0 + 2.6, '#c22a20', .6); B.bounds('dark', x0 + .05, x1 - .05, 1.85, 2.75, z0 - .02, z0 + .3, '#1f2c36', 1); // cab + windshield
  B.bounds('paint', x0, x1, .7, 2.8, z0 + 2.7, z1, '#c22a20', .6); B.bounds('metal', x0 - .02, x1 + .02, 1.3, 2.4, z0 + 3.2, z1 - .4, '#c9ccc8', .5);
  for (let k = 0; k < 4; k++) B.bounds('dark', x0 - .03, x1 + .03, 1.4 + k * .25, 1.43 + k * .25, z0 + 3.2, z1 - .4, '#8a8f90', 1);
  B.bounds('metal', x0 + .3, x1 - .3, 2.85, 3.05, z0 + 3, z1 - .2, '#d8dcdc', .6); B.bounds('metal', x0 + .55, x0 + .65, 3.05, 3.3, z0 + 3, z1 - .2, '#d8dcdc', 1); B.bounds('metal', x1 - .65, x1 - .55, 3.05, 3.3, z0 + 3, z1 - .2, '#d8dcdc', 1); // ladder
  for (let k = 0; k < 14; k++) B.bounds('metal', x0 + .6, x1 - .6, 3.1, 3.18, z0 + 3.2 + k * .38, z0 + 3.28 + k * .38, '#d8dcdc', 1);
  B.bounds('paint', x0 + .3, x1 - .3, 3.0, 3.18, z0 + .6, z0 + 1.2, '#e33a2a', 1); B.bounds('paint', x0 + .3, x0 + .8, 3.0, 3.2, z0 + .6, z0 + 1.2, '#3a6ae3', 1); // light bar
  B.bounds('metal', x0 - .05, x1 + .05, .45, .75, z0 - .25, z0 + .05, '#c9ccc8', .5); // bumper
  B.bounds('paint', x0 - .01, x1 + .01, 1.1, 1.25, z0, z1, '#f2e6b0', 1);
  for (const zz of [z0 + 1.3, z1 - 2.2, z1 - 1.0]) for (const s of [-1, 1]) { const g = new THREE.CylinderGeometry(.55, .55, .4, 16); g.rotateZ(Math.PI / 2); g.translate(x + s * (wd / 2 - .1), .55, zz); B.addGeo('dark', g, null, '#1b1b1b'); const h = new THREE.CylinderGeometry(.28, .28, .42, 10); h.rotateZ(Math.PI / 2); h.translate(x + s * (wd / 2 - .08), .55, zz); B.addGeo('metal', h, null, '#c9ccc8'); }
  W.col.add(x0, x1, z0 - .3, z1, 'wall', true); }

function farm(W) { const o = { cx: 194, cz: 0, face: 'W' }; const w = 14, d = 12, hw = w / 2, hd = d / 2; // red barn facing the east road (x = 168)
  lbox(W, o, 'plank', -hw, hw, 0, 5.2, -hd, hd, '#9c3326', 1.5); { const g = gableGeo(d + .8, w + 1.0, 4.4); g.rotateY(Math.PI / 2); lgeo(W, o, 'roofmat', g, 0, 5.2, 0, 0, '#6a6a64'); }
  { const tri = new THREE.BufferGeometry(); tri.setAttribute('position', new THREE.Float32BufferAttribute([-hw, 0, 0, hw, 0, 0, 0, 4.2, 0], 3)); tri.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, w / 1.5, 0, w / 3, 4.2 / 1.5], 2)); tri.computeVertexNormals(); const t2 = tri.clone(); tri.translate(0, 5.2, hd + .01); t2.rotateY(Math.PI); t2.translate(0, 5.2, -hd - .01); lgeo(W, o, 'plank', tri, 0, 0, 0, 0, '#9c3326'); lgeo(W, o, 'plank', t2, 0, 0, 0, 0, '#9c3326'); }
  lbox(W, o, 'plank', -2.6, 2.6, 0, 4.0, hd, hd + .08, '#8a2a1f', 1); for (const s of [-1, 1]) lbox(W, o, 'paint', s * 2.6 - .12, s * 2.6 + .12, 0, 4.0, hd + .08, hd + .14, '#f0ece2', 1); lbox(W, o, 'paint', -2.6, 2.6, 3.9, 4.1, hd + .08, hd + .14, '#f0ece2', 1); lbox(W, o, 'paint', -.08, .08, 0, 4.0, hd + .08, hd + .14, '#f0ece2', 1);
  for (const s of [-1, 1]) { const g = new THREE.BoxGeometry(.18, 4.6, .06); g.rotateZ(s * .6); lgeo(W, o, 'paint', g, s * 1.3, 2.0, hd + .13, 0, '#f0ece2'); } // X braces
  lbox(W, o, 'paint', -1.2, 1.2, 6.2, 7.4, hd, hd + .08, '#f0ece2'); lbox(W, o, 'dark', -.9, .9, 6.35, 7.25, hd + .08, hd + .1, '#2a1a14');
  lcol(W, o, -hw, hw, -hd, hd);
  { const x = 206, z = 12; const g = new THREE.CylinderGeometry(2.6, 2.6, 13, 20); g.translate(x, 6.5, z); W.B.addGeo('metal', g, null, '#b9c0c0'); const dm = new THREE.SphereGeometry(2.7, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2); dm.translate(x, 13, z); W.B.addGeo('metal', dm, null, '#8f9a9c'); for (let y = 1; y < 13; y += 2.2) { const r = new THREE.CylinderGeometry(2.64, 2.64, .12, 20, 1, true); r.translate(x, y, z); W.B.addGeo('dark', r, null, '#6d7576'); } W.col.add(x - 2.6, x + 2.6, z - 2.6, z + 2.6, 'wall', true); }
  for (const [x, z, r] of [[184, 12, .3], [186.5, 13, 1.2], [185, -13, .1], [187.5, -12.5, 1.6]]) { const g = new THREE.CylinderGeometry(.75, .75, 1.3, 14); g.rotateZ(Math.PI / 2); g.rotateY(r); g.translate(x, .75, z); W.B.addGeo('fabric', g, null, '#d8b25a'); W.col.add(x - .8, x + .8, z - .8, z + .8, 'prop', true); }
  // crop rows + scarecrow + rail fence (north-east block)
  for (let x = 178; x < 207; x += 1.6) W.B.bounds('siding', x - .35, x + .35, 0, .55, 33, 63, '#5f7f2f', 1);
  W.B.bounds('plank', 192.9, 193.1, 0, 2.4, 47.9, 48.1, '#6a5038', 1); W.B.bounds('plank', 192, 194, 1.7, 1.82, 47.95, 48.05, '#6a5038', 1); W.B.bounds('fabric', 192.6, 193.4, 1.2, 2.0, 47.8, 48.2, '#7a4a7a', 1); { const h = new THREE.SphereGeometry(.28, 10, 8); h.translate(193, 2.45, 48); W.B.addGeo('fabric', h, null, '#d8c27a'); const c = new THREE.ConeGeometry(.45, .4, 10); c.translate(193, 2.78, 48); W.B.addGeo('fabric', c, null, '#9a7a3a'); }
  for (const [x0, z0, x1, z1] of [[176, 32, 208, 32], [176, 64, 208, 64], [176, 32, 176, 64]]) { const len = Math.hypot(x1 - x0, z1 - z0), n = Math.round(len / 2.5); for (let k = 0; k <= n; k++) { const x = x0 + (x1 - x0) * k / n, z = z0 + (z1 - z0) * k / n; W.B.bounds('plank', x - .07, x + .07, 0, 1.15, z - .07, z + .07, '#8a6a48', 1); }
    for (const y of [.5, .95]) W.B.bounds('plank', Math.min(x0, x1) - .04, Math.max(x0, x1) + .04, y, y + .09, Math.min(z0, z1) - .04, Math.max(z0, z1) + .04, '#9a7a55', 1); }
  poleSign(W, 172.4 + 2, -14, Math.PI / 2, ['HOLLIS FARM', 'FRESH EGGS'], '#5a2a1e'); }

// ---------- houses along the new roads (closed instanced variants + a few enterable) ----------
const VDIMS = [[9, 8], [8.6, 8], [11, 7], [9, 8]];
function houseRows(W, reserve) { const rr = mulberry(1312), col = W.col, lots = [];
  const rectFree = (x0, x1, z0, z1) => { if (x0 < -BX + 6 || x1 > BX - 6 || z0 < -BZ + 6 || z1 > BZ - 6) return false; for (const r of reserve) if (x1 > r[0] && x0 < r[1] && z1 > r[2] && z0 < r[3]) return false;
    for (const z of ZR) if (z1 > z - EDGE - .3 && z0 < z + EDGE + .3) return false; for (const x of XR) if (x1 > x - EDGE - .3 && x0 < x + EDGE + .3) return false;
    for (const c of col.list) if (c.active && x1 > c.x0 && x0 < c.x1 && z1 > c.z0 && z0 < c.z1) return false; for (const l of lots) if (x1 > l.r[0] && x0 < l.r[1] && z1 > l.r[2] && z0 < l.r[3]) return false; return true; };
  const pitch = 12.5;
  const tryLot = (cx, cz, face, road, side) => { const swap = face === 'E' || face === 'W'; const hx = (swap ? 4.5 : 4.5) + 1.2, hz = 4.5 + 1.2; const r = [cx - (swap ? hz : hx), cx + (swap ? hz : hx), cz - (swap ? hx : hz), cz + (swap ? hx : hz)];
    if (Math.abs(cx) < 100 && Math.abs(cz) < 70) return; if (!rectFree(r[0], r[1], r[2], r[3])) return; lots.push({ cx, cz, w: 9, d: 9, face, road, side, r, outer: true, ring2: true }); };
  for (const z of ZR) for (const side of [-1, 1]) { const cz = z + side * 14.5, face = side > 0 ? 'N' : 'S'; for (let x = -BX + 14; x < BX - 14; x += pitch) tryLot(x, cz, face, z, side); }
  for (const x of XR) for (const side of [-1, 1]) { const cx = x + side * 14.5, face = side > 0 ? 'W' : 'E'; for (let z = -BZ + 14; z < BZ - 14; z += pitch) tryLot(cx, z, face, x, side); }
  // a few enterable houses spread around the new ring
  const ent = new Set(); { const step = Math.max(1, Math.floor(lots.length / 7)); for (let i = 3; i < lots.length && ent.size < 7; i += step) ent.add(i); }
  lots.forEach((l, i) => { l.id = 'R' + i; l.ci = Math.floor(rr() * COLORS.length); l.enterable = ent.has(i);
    if (l.enterable) { const bd = makeBuilding(W, { id: l.id, kind: 'house', cx: l.cx, cz: l.cz, w: 9, d: 9, face: l.face, ci: l.ci, locked: rr() < .5 ? 1 : 0, back: rr() < .5 ? 1 : 0 }); l.bd = bd; W.enterable.push(bd); }
    else { const v = Math.floor(rr() * 4); const dims = VDIMS[v]; l.v = v; const tint = new THREE.Color(COLORS[l.ci]).multiplyScalar(.6 + rr() * .3); W.closed.add(l, v, tint, new THREE.Color(['#d0c0b0', '#a8a8a2', '#c8a08c', '#9aa296', '#8f9aa8'][Math.floor(rr() * 5)]));
      const swap = l.face === 'E' || l.face === 'W'; const hx = (swap ? dims[1] : dims[0]) / 2, hz = (swap ? dims[0] : dims[1]) / 2; col.add(l.cx - hx, l.cx + hx, l.cz - hz, l.cz + hz, 'wall', true); }
    yard(W, l, rr); W.lots.push(l); });
  return lots; }

function yard(W, l, rr) { // driveway, front path, mailbox, hedges, sometimes a picket fence — all merged statics
  const o = { cx: l.cx, cz: l.cz, face: l.face }; const front = 4.5, curb = 14.5 - EDGE; // local +z = toward the road; sidewalk starts at local z = curb
  lbox(W, o, 'concrete', -.6, .6, .02, .06, front, curb, '#c9c4b8'); // path
  const dsx = rr() < .5 ? -1 : 1; if (rr() < .75) { lbox(W, o, 'concrete', dsx * 5.2 - 1.4, dsx * 5.2 + 1.4, .02, .07, -2, curb, '#bdb8ac'); }
  { const mx = -dsx * 1.6; lbox(W, o, 'plank', mx - .05, mx + .05, 0, 1.0, curb - .5, curb - .4, '#5a4632', 1); lbox(W, o, 'paint', mx - .14, mx + .14, 1.0, 1.24, curb - .65, curb - .25, ['#2a3a5a', '#7a2a24', '#2a2a2a', '#3a5a3a'][Math.floor(rr() * 4)], 1); }
  for (const s of [-1, 1]) if (rr() < .7) { const g = new THREE.SphereGeometry(.7, 8, 6); g.scale(1.5, .7, .8); lgeo(W, o, 'siding', g, s * 2.6, .45, front + .6, 0, '#4b7036'); }
  if (rr() < .35) { for (let k = -5; k <= 5; k++) { if (Math.abs(k) < 1) continue; const lx = k * .9; lbox(W, o, 'paint', lx - .05, lx + .05, 0, .9, curb - .2, curb - .14, '#ece8dc', 1); } lbox(W, o, 'paint', -4.6, -.7, .6, .68, curb - .22, curb - .12, '#ece8dc', 1); lbox(W, o, 'paint', .7, 4.6, .6, .68, curb - .22, curb - .12, '#ece8dc', 1); } }

/** Second ring. Call AFTER addDistricts and BEFORE W.closed.init / hooks / B.build. */
export function addRing2(W) {
  W.zones = (W.zones || []).concat(RING2_ZONES);
  hospital(W); mainStreet(W); waterTower(W, 0, 104); freightYard(W); field(W); civic(W); farm(W);
  const reserve = RING2_ZONES.map(z => [z.x0 - 2, z.x1 + 2, z.z0 - 2, z.z1 + 2]).concat([[-30, 30, 140, 166], [-164, -108, -67, -30], [170, 212, -22, 22], [104, 132, 64, 74]]);
  houseRows(W, reserve);
  W.noTree = (x, z) => RING2_ZONES.some(v => x > v.x0 - 3 && x < v.x1 + 3 && z > v.z0 - 3 && z < v.z1 + 3);
  W.ring2 = { fence: _fence.splice(0) };
}
export function ring2Fence(W, mergeGeometries) { const L = W.ring2 && W.ring2.fence; if (!L || !L.length) return; const m = new THREE.Mesh(mergeGeometries(L), chainMat()); m.castShadow = false; m.receiveShadow = true; m.name = 'static_fence'; W.root.add(m); }
