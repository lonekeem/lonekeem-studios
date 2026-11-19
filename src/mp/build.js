// Tiny procedural geometry builder: merge primitives per material key, then bind rigidly to a bone of the avatar skeleton.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3();
export class Builder {
  constructor() { this.parts = {}; }
  add(geo, mat, pos = [0, 0, 0], rot = [0, 0, 0], scl = [1, 1, 1]) { const g = geo.index ? geo.toNonIndexed() : geo; g.deleteAttribute('uv'); _e.set(rot[0], rot[1], rot[2]); _q.setFromEuler(_e); _m.compose(_v.set(pos[0], pos[1], pos[2]), _q, _s.set(scl[0], scl[1], scl[2])); g.applyMatrix4(_m); (this.parts[mat] = this.parts[mat] || []).push(g); return this; }
  sphere(r, pos, scl, mat = 'a', rot) { return this.add(new THREE.SphereGeometry(r, 14, 10), mat, pos, rot, scl || [1, 1, 1]); }
  box(w, h, d, pos, mat = 'a', rot) { return this.add(new THREE.BoxGeometry(w, h, d), mat, pos, rot); }
  cyl(rt, rb, h, pos, mat = 'a', rot, seg = 14) { return this.add(new THREE.CylinderGeometry(rt, rb, h, seg), mat, pos, rot); }
  torus(R, r, pos, mat = 'm', rot, arc = Math.PI * 2, scl) { return this.add(new THREE.TorusGeometry(R, r, 8, 28, arc), mat, pos, rot, scl); }
  cone(r, h, pos, mat = 'a', rot, seg = 10) { return this.add(new THREE.ConeGeometry(r, h, seg), mat, pos, rot); }
  tube(pts, r, mat = 'a', closed = false, seg = 24, rad = 6) { const c = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)), closed); return this.add(new THREE.TubeGeometry(c, seg, r, rad, closed), mat); }
  // tapered tube (ponytails / braids / dreads): radius from r0 to r1 along the curve
  taper(pts, r0, r1, mat = 'a', seg = 18, rad = 7) { const c = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p))); const g = new THREE.TubeGeometry(c, seg, 1, rad, false); const pa = g.attributes.position, fr = c.computeFrenetFrames(seg, false); const n = (rad + 1);
    for (let i = 0; i <= seg; i++) { const pt = c.getPointAt(i / seg), k = r0 + (r1 - r0) * (i / seg); for (let j = 0; j < n; j++) { const idx = i * n + j; _v.fromBufferAttribute(pa, idx).sub(pt).multiplyScalar(k).add(pt); pa.setXYZ(idx, _v.x, _v.y, _v.z); } } g.computeVertexNormals(); return this.add(g, mat); }
  // smooth sheet through several rows of points (rows[i][k]): solid hair panels, capes, ribbons
  loft(rows, mat = 'a') { const R = rows.length, K = rows[0].length; const pos = new Float32Array(R * K * 3), idx = []; for (let i = 0; i < R; i++) for (let k = 0; k < K; k++) { const p = rows[i][k]; pos.set([p.x ?? p[0], p.y ?? p[1], p.z ?? p[2]], (i * K + k) * 3); }
    for (let i = 0; i < R - 1; i++) for (let k = 0; k < K - 1; k++) { const a = i * K + k, b = (i + 1) * K + k, c = i * K + k + 1, d = (i + 1) * K + k + 1; idx.push(a, b, c, b, d, c); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return this.add(g, mat); }
  geos(mat) { return this.parts[mat] ? mergeGeometries(this.parts[mat]) : null; }
  keys() { return Object.keys(this.parts); }
}
// bind geometry to the skeleton: all verts weight 1 on boneIdx (or blended with a second bone below/above a y band)
export function rigid(av, geo, boneName, mat, opt = {}) {
  const sk = av.skin.skeleton; const bi = av.boneIdx[boneName]; const n = geo.attributes.position.count; const si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
  const b2 = opt.blendBone ? av.boneIdx[opt.blendBone] : -1;
  for (let i = 0; i < n; i++) { let w2 = 0; if (b2 >= 0) { const y = geo.attributes.position.getY(i); w2 = Math.min(1, Math.max(0, (opt.y0 - y) / (opt.y0 - opt.y1))); } si[i * 4] = bi; sw[i * 4] = 1 - w2; if (b2 >= 0) { si[i * 4 + 1] = b2; sw[i * 4 + 1] = w2; } }
  geo.setAttribute('skinIndex', new THREE.BufferAttribute(si, 4)); geo.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4));
  const m = new THREE.SkinnedMesh(geo, mat); m.bind(sk, av.skin.bindMatrix); m.frustumCulled = false; m.castShadow = true; return m;
}
