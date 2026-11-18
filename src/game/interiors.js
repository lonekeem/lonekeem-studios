// v2.0 abandoned-home interiors (original procedural furniture, © Lone Keem Studios).
// Everything is decoration only: NO colliders are added, existing walls/doors/colliders are untouched.
// All static furniture is merged into ONE vertex-coloured mesh (+ a few special meshes) so it costs ~10 draw calls on phones.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { canvasTex, bloodTex } from './util.js';

const M4 = THREE.Matrix4, V3 = THREE.Vector3, Q4 = THREE.Quaternion, E3 = THREE.Euler;
class Decor {
  constructor(seed = 5) { this.geos = []; this.stack = [new M4()]; this.s = seed; }
  r() { this.s = (this.s * 1664525 + 1013904223) >>> 0; return this.s / 4294967296; }
  push(x = 0, y = 0, z = 0, ry = 0, rx = 0, rz = 0) { const m = new M4().compose(new V3(x, y, z), new Q4().setFromEuler(new E3(rx, ry, rz, 'YXZ')), new V3(1, 1, 1)); this.stack.push(this.stack[this.stack.length - 1].clone().multiply(m)); return this; }
  pop() { this.stack.pop(); return this; }
  add(geo, col, x, y, z, rx = 0, ry = 0, rz = 0, dust = 1) { let g = geo.index ? geo.toNonIndexed() : geo.clone(); const m = this.stack[this.stack.length - 1].clone().multiply(new M4().compose(new V3(x, y, z), new Q4().setFromEuler(new E3(rx, ry, rz, 'YXZ')), new V3(1, 1, 1))); g.applyMatrix4(m); g.deleteAttribute('uv');
    const c = new THREE.Color(col); const k = (.78 + this.r() * .16) * dust; c.multiplyScalar(k); const n = g.attributes.position.count, a = new Float32Array(n * 3); const pos = g.attributes.position;
    for (let i = 0; i < n; i++) { const dirt = 1 - Math.max(0, .35 - pos.getY(i)) * .5; a[i * 3] = c.r * dirt; a[i * 3 + 1] = c.g * dirt; a[i * 3 + 2] = c.b * dirt; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); this.geos.push(g); }
  box(x, y, z, w, h, d, col, rx = 0, ry = 0, rz = 0) { this.add(new THREE.BoxGeometry(w, h, d), col, x, y, z, rx, ry, rz); }
  cyl(x, y, z, r, h, col, rx = 0, ry = 0, rz = 0, rt = r, seg = 10) { this.add(new THREE.CylinderGeometry(rt, r, h, seg), col, x, y, z, rx, ry, rz); }
  sph(x, y, z, rx, ry, rz, col) { const g = new THREE.SphereGeometry(1, 10, 8); g.scale(rx, ry, rz); this.add(g, col, x, y, z); }
  build() { const g = mergeGeometries(this.geos); const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .88, metalness: .04 })); m.castShadow = true; m.receiveShadow = true; return m; }
}

// ----- furniture builders (local frame: front = +z) -----
function chair(D, x, z, ry, tip = 0, col = '#5a4630') { D.push(x, tip ? .2 : 0, z, ry, 0, tip); D.box(0, .45, 0, .42, .045, .42, col); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => D.box(a * .18, .22, b * .18, .04, .44, .04, col)); D.box(0, .72, -.2, .42, .5, .035, col); D.box(0, .66, -.2, .34, .05, .04, '#3a2c20'); D.pop(); }
function book(D, x, y, z, ry = 0, rz = 0) { const c = ['#6a2a2a', '#2a4a6a', '#3a5a3a', '#7a6a3a', '#4a3a5a', '#8a8070', '#2a2a30'][Math.floor(D.r() * 7)]; D.box(x, y, z, .04 + D.r() * .025, .21 + D.r() * .05, .15, c, 0, ry, rz); }

export function furnishKeemHouse(scene, updaters) {
  const D = new Decor(11), root = new THREE.Group(); scene.add(root);
  const W1 = '#5b4a38', W2 = '#6b5338', STEEL = '#8b8f92', BASE = '#2a2620';
  // baseboards + door trims
  D.box(16, .08, 35.12, 7.8, .16, .04, BASE); D.box(16, .08, 44.88, 7.8, .16, .04, BASE); D.box(12.12, .08, 40, .04, .16, 9.8, BASE); D.box(19.88, .08, 40, .04, .16, 9.8, BASE);
  D.box(15.1, 1.05, 39.0, .1, 2.1, .2, '#3a2c22'); D.box(17.1, 1.05, 39.0, .1, 2.1, .2, '#3a2c22'); D.box(16.1, 2.1, 39.0, 1.1, .1, .2, '#3a2c22'); // doorway trim
  // ===== KITCHEN (north wall) =====
  D.box(14.8, .43, 35.42, 3.2, .85, .62, W1); D.box(14.8, .875, 35.43, 3.25, .05, .66, '#3b3a38'); // base cabinets + counter
  for (let i = 0; i < 5; i++) D.box(13.5 + i * .64, .43, 35.745, .01, .74, .012, '#241c14'); // door seams
  D.box(14.8, .905, 35.45, .7, .02, .45, STEEL); D.cyl(14.8, 1.03, 35.25, .018, .26, '#9aa0a6'); D.box(14.8, 1.15, 35.33, .02, .02, .16, '#9aa0a6'); // sink + tap
  D.box(18.0, .43, 35.42, 1.6, .85, .62, W1); D.box(18.0, .875, 35.43, 1.65, .05, .66, '#3b3a38');
  D.box(16.9, .45, 35.43, .7, .9, .64, '#b9b5aa'); D.box(16.9, .91, 35.43, .7, .03, .64, '#2a2a2c'); [[-.17, -.14], [.17, -.14], [-.17, .14], [.17, .14]].forEach(([a, b]) => D.cyl(16.9 + a, .94, 35.43 + b, .08, .02, '#111', 0, 0, 0, .08, 14));
  D.box(16.9, .5, 35.77, .56, .4, .02, '#1a1c1e'); D.box(16.9, .73, 35.78, .6, .025, .03, '#aab0b4'); D.box(16.9, 1.95, 35.38, .8, .22, .5, '#9a968c'); D.box(16.9, 2.5, 35.3, .28, .8, .28, '#8a867c'); // stove, oven door, hood
  D.box(14.8, 1.9, 35.28, 3.2, .7, .35, W1); D.box(14.1, 1.9, 35.46, .78, .66, .02, '#4a3a2c'); D.push(15.5, 1.55, 35.46, 0, 0, .0); D.box(.2, 0, .04, .78, .66, .02, '#4a3a2c', 0, .5, 0); D.pop(); // upper cabinets, one door hanging open
  D.box(15.0, 1.18, 35.12, 5.4, .55, .02, '#b8b2a2'); // tile backsplash (grimy)
  // fridge, door ajar
  D.box(19.35, .93, 35.5, .9, 1.86, .75, '#c8c2b0'); D.box(19.35, .93, 35.89, .8, 1.7, .02, '#0b0b0b'); D.push(18.92, .93, 35.9, .0, 0, 0); D.box(.42, 0, .22, .86, 1.8, .06, '#c8c2b0', 0, .85, 0); D.pop(); D.box(19.35, 1.55, 35.87, .74, .02, .6, '#6a6a68'); D.box(19.35, 1.15, 35.87, .74, .02, .6, '#6a6a68');
  // ===== DINING =====
  const tx = 18.35, tz = 37.75; D.box(tx, .73, tz, 1.3, .05, .85, W2); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => D.box(tx + a * .6, .36, tz + b * .37, .06, .72, .06, W2));
  chair(D, tx - .95, tz, Math.PI / 2); chair(D, tx, tz + .85, Math.PI); chair(D, tx + 1.2, tz - .2, -1.2, 1.5707);
  [[-.3, .1], [.35, -.15]].forEach(([a, b]) => D.cyl(tx + a, .765, tz + b, .12, .02, '#cfcabc', 0, 0, 0, .1, 14)); D.cyl(tx + .1, .8, tz + .22, .035, .09, '#d8d4c8'); D.cyl(tx - .55, .81, tz - .2, .03, .11, '#2a5a3a'); D.box(tx + .35, .77, tz - .15, .12, .02, .1, '#4a5a2a', 0, .3, 0); D.box(tx, .757, tz + .05, .5, .008, .4, '#bdb6a2', 0, .2, 0); // plates, cup, bottle, rotten food, newspaper
  D.cyl(tx + .9, .035, tz + .5, .035, .1, '#d8d4c8', 1.5707, 0.6); D.box(tx + .7, .03, tz + .6, .12, .005, .1, '#cfcabc', .3, .6, 0); // dropped cup, shards
  // ===== LIVING ROOM =====
  D.box(14.6, .045, 42.2, 2.4, .012, 1.7, '#5b3a34', 0, .1, 0); D.box(14.6, .05, 42.2, 2.1, .012, 1.4, '#6e4a3c', 0, .1, 0); // rug
  D.push(14.6, 0, 44.38, Math.PI); // couch facing -z (towards the room) -> front is +z after flip
  D.box(0, .22, 0, 2.4, .4, .95, '#4a5560'); D.box(0, .72, .38, 2.4, .6, .22, '#445059'); D.box(-1.1, .52, 0, .22, .62, .95, '#4a5560'); D.box(1.1, .52, 0, .22, .62, .95, '#4a5560');
  [-.62, 0, .62].forEach((a, i) => D.box(a, .47, -.04, .62, .14, .7, i === 1 ? '#566470' : '#505c68', i === 2 ? .15 : 0, 0, 0)); D.box(-.3, .6, .1, .4, .2, .2, '#2a1814'); D.sph(.3, .56, -.1, .12, .06, .1, '#d8d0b8'); D.sph(.45, .54, -.2, .09, .05, .08, '#d8d0b8'); D.pop(); // couch, blood stain on cushion, torn stuffing
  D.box(13.55, .09, 43.1, .55, .13, .55, '#566470', .6, .5, .3); // cushion thrown on the floor
  D.box(14.6, .38, 42.3, 1.1, .04, .55, '#3a2c20'); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => D.box(14.6 + a * .5, .18, 42.3 + b * .22, .04, .36, .04, '#3a2c20')); D.box(14.45, .41, 42.3, .3, .015, .22, '#6a2a2a', 0, .3, 0); D.box(14.9, .43, 42.4, .06, .06, .16, '#111', 0, .5, 0); D.cyl(14.8, .5, 42.15, .03, .15, '#3a5a2a'); D.cyl(14.25, .08, 41.9, .03, .15, '#3a5a2a', 1.5707, .8); // coffee table, magazine, remote, bottles
  D.box(13.8, .26, 39.3, 1.3, .5, .4, '#3a3028'); D.push(13.8, .52, 39.28, .06); D.box(0, .35, 0, 1.05, .62, .07, '#0e0e10'); D.box(0, .07, .04, .3, .06, .1, '#0e0e10'); D.pop(); // TV on its stand
  D.push(12.5, 0, 40.8, 0, 0, -.2); D.box(0, .95, 0, .32, 1.9, 1.1, '#5a4630'); for (let i = 0; i < 5; i++) D.box(.05, .3 + i * .36, 0, .3, .03, 1.06, '#4a3a28'); for (let i = 0; i < 4; i++) for (let j = 0; j < 9; j++) if ((i * 3 + j) % 4) book(D, .1, .42 + i * .36, -.45 + j * .105); D.pop(); // leaning bookcase
  for (let i = 0; i < 9; i++) book(D, 13.1 + D.r() * 1.1, .06, 40.1 + D.r() * 1.5, D.r() * 3, D.r() < .5 ? 1.5707 : 0); // fallen books
  D.cyl(13.5, .05, 43.95, .018, 1.5, '#2a2a2a', 0, .4, 1.5707); D.cyl(14.3, .1, 43.6, .02, .2, '#3a3028', 0, 0, 1.5707, .1); D.cyl(13.1, .14, 44.15, .015, .3, '#2a2a2a'); // toppled floor lamp
  // ===== BEDROOM =====
  D.box(18.9, .66, 42.2, 1.1, .07, 1.25, '#38465a', .05, .08, 0); D.box(18.9, .64, 43.3, 1.0, .05, .6, '#c8c0ae', 0, 0, .05); D.box(18.9, .67, 42.0, .5, .02, .5, '#3a0a0a', 0, .4, 0); // torn blanket, bloodied sheet
  D.box(19.65, .27, 41.1, .4, .54, .42, '#4a3a2a'); D.cyl(19.65, .6, 41.1, .05, .1, '#222'); D.box(19.65, .6, 41.3, .14, .02, .1, '#888', 0, .3, 0);
  D.box(18.7, 1.0, 44.62, 1.15, 2.0, .5, '#4a3a2a'); D.box(18.35, 1.0, 44.35, .5, 1.9, .03, '#3a2c20', 0, .7, 0); D.box(19.05, .12, 44.15, .5, .12, .4, '#6a6a7a', 0, .3, 0); D.box(18.6, .1, 43.95, .35, .1, .3, '#3a4a6a', 0, .8, 0); // wardrobe, door open, clothes
  chair(D, 18.5, 40.0, 1.9, 1.5707); D.box(19.62, .77, 40.3, .3, .02, .22, '#222', 0, .2, 0); D.box(19.62, .76, 39.8, .3, .01, .22, '#cfcabc', 0, .5, 0); D.cyl(19.65, .82, 39.6, .035, .09, '#6a2a2a'); // desk clutter
  // ===== clutter & trash =====
  const trash = [[12.55, 35.45], [12.9, 35.7], [13.3, 38.4], [16.3, 38.2], [19.6, 38.6], [17.3, 40.2], [15.6, 44.1], [12.6, 44.5], [19.3, 41.0]];
  trash.forEach(([x, z], i) => { if (i < 3) { D.sph(x, .17, z, .26, .2, .24, '#1a1a1c'); D.sph(x + .2, .1, z + .1, .16, .12, .15, '#222226'); } D.box(x + D.r() * .6, .012, z + D.r() * .6, .25, .004, .18, '#cfcabc', 0, D.r() * 3, 0); D.cyl(x + .3, .06, z - .1, .03, .12, ['#2a5a3a', '#6a4a2a', '#8a8a8a'][i % 3], 1.5707, D.r() * 3); });
  for (let i = 0; i < 6; i++) D.cyl(13.1 + D.r() * 3, .05, 35.9 + D.r() * 2.6, .033, .1, ['#8a8a8a', '#6a2a2a', '#c8a030'][i % 3], 1.5707, D.r() * 3); // cans
  D.box(12.9, .06, 44.4, .26, .1, .09, '#222', 0, .3, 0); D.box(13.2, .06, 44.5, .26, .1, .09, '#222', 0, -.4, 0); // shoes
  D.box(14.1, .035, 37.2, .5, .02, .35, '#6a6a60', 0, .5, 0); // doormat
  const room = D.build(); root.add(room);

  // ===== decals: blood, drag trail =====
  const bm = new THREE.MeshStandardMaterial({ map: bloodTex(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, roughness: .35 }); const bg = [];
  const decal = (x, y, z, s, rx, ry, sy = 1) => { const g = new THREE.PlaneGeometry(s, s * sy); g.rotateX(rx); g.rotateY(ry); g.translate(x, y, z); bg.push(g); };
  decal(16.1, .04, 39.7, 1.3, -Math.PI / 2, .4); decal(15.2, .04, 38.0, .9, -Math.PI / 2, 1.2); decal(14.0, .04, 37.2, 1.0, -Math.PI / 2, .1, 1.8); decal(13.0, .04, 36.9, .8, -Math.PI / 2, .9); decal(17.9, .04, 38.8, .7, -Math.PI / 2, 2); decal(14.4, .047, 43.8, 1.1, -Math.PI / 2, 0);
  decal(18.9, .68, 42.0, .8, -Math.PI / 2, 1);  // bed
  decal(19.85, 1.1, 36.6, .9, 0, -Math.PI / 2); decal(12.14, 1.2, 38.3, .8, 0, Math.PI / 2); decal(16.0, 1.0, 38.92, .9, 0, Math.PI); decal(16.0, .8, 39.09, .8, 0, 0);
  const blood = new THREE.Mesh(mergeGeometries(bg), bm); blood.renderOrder = 2; root.add(blood);

  // ===== wall pictures (some crooked / fallen), clock, TV screen, cobwebs, window light =====
  const pic = (kind) => canvasTex(128, 96, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); if (kind === 0) { gr.addColorStop(0, '#6a7a8a'); gr.addColorStop(1, '#4a5a3a'); } else if (kind === 1) { gr.addColorStop(0, '#8a6a4a'); gr.addColorStop(1, '#3a2a1a'); } else { gr.addColorStop(0, '#4a5a6a'); gr.addColorStop(1, '#2a3a3a'); }
    g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(20,30,20,.7)'; g.beginPath(); g.moveTo(0, h); g.lineTo(w * .3, h * .5); g.lineTo(w * .55, h * .8); g.lineTo(w * .8, h * .4); g.lineTo(w, h * .9); g.lineTo(w, h); g.fill(); if (kind === 2) { g.fillStyle = '#d8c8a0'; g.beginPath(); g.arc(w * .75, h * .25, 10, 0, 7); g.fill(); }
    g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 1; g.beginPath(); g.moveTo(w * .6, 0); g.lineTo(w * .45, h * .5); g.lineTo(w * .55, h); g.moveTo(w * .45, h * .5); g.lineTo(w * .2, h * .4); g.stroke(); for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(60,50,40,${Math.random() * .12})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); } });
  const frameM = new THREE.MeshStandardMaterial({ color: '#2a2018', roughness: .8 });
  const hang = (x, y, z, ry, kind, tilt = 0, w = .6, h = .45) => { const g = new THREE.Group(); g.add(new THREE.Mesh(new THREE.BoxGeometry(w + .06, h + .06, .03), frameM)); const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: pic(kind), roughness: .4 })); p.position.z = .017; g.add(p); g.position.set(x, y, z); g.rotation.set(0, ry, tilt); root.add(g); return g; };
  hang(17.9, 1.75, 39.1, 0, 0, .08); hang(14.0, 1.7, 39.1, 0, 1, 0, .5, .4); hang(12.13, 1.65, 38.2, Math.PI / 2, 2, -.04); hang(19.87, 1.7, 37.2, -Math.PI / 2, 1, .35, .5, .4); hang(15.2, 1.7, 44.86, Math.PI, 0, 0, .7, .5);
  const fallen = hang(18.2, .05, 38.3, 0, 2, 0, .5, .4); fallen.rotation.set(-Math.PI / 2 + .05, .6, 0);
  const tvM = new THREE.MeshStandardMaterial({ color: '#05070a', emissive: '#6a8aa8', emissiveIntensity: .05, roughness: .15 }); const tv = new THREE.Mesh(new THREE.PlaneGeometry(.94, .52), tvM); tv.position.set(13.8, .86, 39.32); tv.rotation.y = .06; root.add(tv);
  const clock = new THREE.Mesh(new THREE.CircleGeometry(.15, 20), new THREE.MeshStandardMaterial({ map: canvasTex(64, 64, (g) => { g.fillStyle = '#d8d0b8'; g.fillRect(0, 0, 64, 64); g.strokeStyle = '#222'; g.lineWidth = 3; g.beginPath(); g.moveTo(32, 32); g.lineTo(32, 14); g.moveTo(32, 32); g.lineTo(46, 38); g.stroke(); }) })); clock.position.set(17.9, 2.35, 35.12); clock.rotation.y = 0; root.add(clock);
  // cobwebs in the ceiling corners
  const webT = canvasTex(64, 64, (g, w, h) => { g.clearRect(0, 0, w, h); g.strokeStyle = 'rgba(235,235,225,.55)'; g.lineWidth = 1; for (let i = 1; i < 7; i++) { g.beginPath(); g.moveTo(0, 0); g.lineTo(w, i * h / 6); g.stroke(); g.beginPath(); g.moveTo(0, 0); g.lineTo(i * w / 6, h); g.stroke(); } for (let r = 12; r < 70; r += 13) { g.beginPath(); g.arc(0, 0, r, 0, Math.PI / 2); g.stroke(); } });
  const webM = new THREE.MeshBasicMaterial({ map: webT, transparent: true, depthWrite: false, side: THREE.DoubleSide, opacity: .8 });
  [[12.12, 2.9, 35.12, 0], [19.88, 2.9, 35.12, 1], [12.12, 2.9, 44.88, 2], [19.88, 2.9, 44.88, 3]].forEach(([x, y, z, k]) => { const w = new THREE.Mesh(new THREE.PlaneGeometry(.6, .6), webM); w.position.set(x + (k % 2 ? -.2 : .2), y - .2, z + (k > 1 ? -.2 : .2)); w.rotation.set(0, k % 2 ? Math.PI / 4 : -Math.PI / 4, 0); root.add(w); });
  // cold light slipping through the boarded bedroom window (additive, no real light => cheap)
  const shaftM = new THREE.MeshBasicMaterial({ color: '#9fb4d0', transparent: true, opacity: .1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  [[1.0, 42.1], [1.35, 42.5], [1.7, 42.9]].forEach(([y, z], i) => { const g = new THREE.BufferGeometry(); const x0 = 12.15, x1 = 14.4 + i * .5, zz = z + .05; const v = [x0, y, z - .035, x0, y, z + .035, x1, 0.04, zz + 1.2 - .06, x1, 0.04, zz + 1.2 + .1]; g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); g.setIndex([0, 1, 2, 1, 3, 2]); const m = new THREE.Mesh(g, shaftM); root.add(m); });
  // dust motes + flickering TV glow
  updaters.push((dt, t) => { tvM.emissiveIntensity = Math.random() < .08 ? .35 + Math.random() * .4 : tvM.emissiveIntensity * .9 + .005; shaftM.opacity = .08 + Math.sin(t * .7) * .02; });
  return root;
}
