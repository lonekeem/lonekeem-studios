// Bind-space collar/yoke/lapels (and a robe belt), rigidly skinned like other accessories so they cover shader neck cuts.
import * as THREE from 'three';
import { Builder, rigid } from './build.js';
import { makeCtx } from './acc.js';

const _m = new Map();
function mat(c) {
  if (_m.has(c)) return _m.get(c);
  const m = new THREE.MeshStandardMaterial({ color: c, roughness: 0.84, metalness: 0, side: THREE.DoubleSide });
  _m.set(c, m); return m;
}
function bindAcc(av, mesh) {
  const s = av.skin;
  mesh.position.copy(s.position); mesh.quaternion.copy(s.quaternion); mesh.scale.copy(s.scale);
  s.parent.add(mesh); mesh.bind(s.skeleton, s.bindMatrix);
  mesh.frustumCulled = false; mesh.renderOrder = 3; mesh.castShadow = false;
  return mesh;
}

function horseshoe(y, zc, rIn, rOut, ht, zScale, gap, nu = 48, rows = 5, zOf) {
  // Open at +Z (the chest). ang = 0 is +X, ang = PI/2 is +Z.
  const pos = [], idx = [];
  const span = Math.PI * 2 - 2 * gap;
  for (let j = 0; j <= rows; j++) {
    const v = j / rows, r = rIn + (rOut - rIn) * Math.sin(v * Math.PI);
    const yy = y + (v - 0.5) * ht;
    for (let i = 0; i <= nu; i++) {
      const t = i / nu, ang = Math.PI / 2 + gap + t * span;
      const x = Math.cos(ang) * r;
      let z = zc + Math.sin(ang) * r * zScale;
      // Pull the front of the yoke onto the chest so the rim isn't a torn plane.
      if (zOf && Math.sin(ang) > 0.15) {
        const zWant = zOf(yy) + 0.010 + (r - rIn) * 0.15;
        const k = Math.min(1, (Math.sin(ang) - 0.15) / 0.85);
        z = z + (zWant - z) * k;
      }
      pos.push(x, yy, z);
    }
  }
  for (let j = 0; j < rows; j++) for (let i = 0; i < nu; i++) {
    const a = j * (nu + 1) + i, b = a + nu + 1;
    idx.push(a, b, a + 1, a + 1, b, b + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx); g.computeVertexNormals(); return g;
}

// Soft, chest-following lapel panel (not a flat box).
function lapel(side, y0, y1, xIn, xOut, zOf, thick) {
  const nv = 8, pos = [], idx = [];
  for (let j = 0; j <= nv; j++) {
    const v = j / nv;
    const y = y0 + (y1 - y0) * v;
    const taper = 1 - v * 0.22;
    const xi = xIn * side;
    const xo = (xIn + (xOut - xIn) * taper) * side;
    const z = zOf(y);
    pos.push(xi, y, z, xo, y, z, xi, y, z - thick, xo, y, z - thick);
  }
  for (let j = 0; j < nv; j++) {
    const a = j * 4;
    idx.push(a, a + 1, a + 4, a + 1, a + 5, a + 4);
    idx.push(a + 2, a + 6, a + 3, a + 3, a + 6, a + 7);
    idx.push(a, a + 4, a + 2, a + 2, a + 4, a + 6);
    idx.push(a + 1, a + 3, a + 5, a + 3, a + 7, a + 5);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx); g.computeVertexNormals(); return g;
}

export function clearCollar(av) {
  const a = av._collar; if (!a) return;
  for (const m of a) { m.parent && m.parent.remove(m); m.geometry && m.geometry.dispose(); }
  av._collar = null;
}

export function mountCollar(av, piece, kind, row) {
  clearCollar(av);
  if (!piece || kind !== 3 || !av.boneIdx || av.boneIdx.Spine02 == null) return;
  const id = piece.id || '';
  const ctx = makeCtx(av);
  const P = av.tpl.P;
  const yN = P.neck.y;
  const zc = (P.neck && typeof P.neck.z === 'number') ? P.neck.z : 0;
  const zOf = (y) => ctx.torsoZ(y) + 0.016;
  const oh = Math.max(0.04, (row && row[6]) || 0.05);
  const hooded = !!(row && row[9]);
  const c = piece.c || '#888';
  const out = [];
  const add = (geo) => out.push(bindAcc(av, rigid(av, geo, 'Spine02', mat(c))));

  if (id === 'robe' || id === 'poncho' || id === 'kimono') {
    add(horseshoe(yN - 0.01, zc, 0.055, 0.11, 0.052, 0.92, 0.32, 48, 5, zOf));
    if (id !== 'kimono') {
      const belt = new THREE.TorusGeometry(0.13, 0.016, 8, 28);
      belt.rotateX(Math.PI / 2);
      belt.translate(0, P.Hips.y + 0.16, (ctx.torsoZ(P.Hips.y + 0.16) + ctx.torsoZ(P.Hips.y + 0.16, true)) / 2);
      add(belt);
    }
    av._collar = out; return;
  }

  // Hoodies, puffers, bombers: a smooth stand collar, no boxy lapels.
  const stand = hooded || /^(zip|cropzip|puffer|puffervest|parka|fleece|raincoat|windbreaker|bomber|varsity)$/.test(id);
  if (stand) {
    add(horseshoe(yN - 0.002, zc, 0.050, 0.108, 0.055, 0.94, 0.28, 52, 6, zOf));
    av._collar = out; return;
  }

  // Tailored jackets: smooth yoke + chest-following lapels that meet it cleanly.
  add(horseshoe(yN - 0.006, zc, 0.050, 0.118, 0.052, 0.94, 0.55, 52, 6, zOf));
  const xIn = oh + 0.001, xOut = oh + 0.032;
  add(lapel(1, yN - 0.004, yN - 0.20, xIn, xOut, zOf, 0.008));
  add(lapel(-1, yN - 0.004, yN - 0.20, xIn, xOut, zOf, 0.008));
  av._collar = out;
}
