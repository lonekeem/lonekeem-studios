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

function horseshoe(y, zc, rIn, rOut, ht, zScale, gap, nu = 36) {
  // Open at +Z (the chest). ang = 0 is +X, ang = PI/2 is +Z.
  const pos = [], idx = [];
  const rows = 3, span = Math.PI * 2 - 2 * gap;
  for (let j = 0; j <= rows; j++) {
    const v = j / rows, r = rIn + (rOut - rIn) * Math.sin(v * Math.PI);
    const yy = y + (v - 0.5) * ht;
    for (let i = 0; i <= nu; i++) {
      const t = i / nu, ang = Math.PI / 2 + gap + t * span;
      pos.push(Math.cos(ang) * r, yy, zc + Math.sin(ang) * r * zScale);
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

function lapel(side, y0, y1, xIn, xOut, z, thick) {
  const pos = [
    side * xIn, y0, z,  side * xOut, y0, z,
    side * xIn, y1, z,  side * (xOut * 0.85 + xIn * 0.15), y1, z,
    side * xIn, y0, z - thick,  side * xOut, y0, z - thick,
    side * xIn, y1, z - thick,  side * (xOut * 0.85 + xIn * 0.15), y1, z - thick,
  ];
  const idx = [0,1,2, 1,3,2,  4,6,5, 5,6,7,  0,2,4, 2,6,4,  1,5,3, 3,5,7];
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
  const zChest = ctx.torsoZ(yN - 0.08) + 0.018;
  const oh = Math.max(0.04, (row && row[6]) || 0.05);
  const c = piece.c || '#888';
  const out = [];
  const add = (geo) => out.push(bindAcc(av, rigid(av, geo, 'Spine02', mat(c))));

  if (id === 'robe' || id === 'poncho') {
    add(horseshoe(yN - 0.01, zc, 0.055, 0.10, 0.05, 0.92, 0.35));
    const belt = new THREE.TorusGeometry(0.13, 0.016, 8, 28);
    belt.rotateX(Math.PI / 2);
    belt.translate(0, P.Hips.y + 0.16, (ctx.torsoZ(P.Hips.y + 0.16) + ctx.torsoZ(P.Hips.y + 0.16, true)) / 2);
    add(belt);
    av._collar = out; return;
  }

  // Yoke covers the shader neck rim. Lapels sit on the jacket placket, not in the shirt gap.
  add(horseshoe(yN - 0.008, zc, 0.052, 0.112, 0.048, 0.92, 0.62));
  const xIn = oh + 0.002, xOut = oh + 0.034;
  add(lapel(1, yN - 0.002, yN - 0.18, xIn, xOut, zChest, 0.01));
  add(lapel(-1, yN - 0.002, yN - 0.18, xIn, xOut, zChest, 0.01));
  av._collar = out;
}
