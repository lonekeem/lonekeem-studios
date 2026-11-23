// Real A-line skirt: a flared cloth tube skinned to the hips, not a pants shell.
import * as THREE from 'three';
import { skinTo } from './v2/headrig.js';
import { PATTERNS } from './garments.js';

function makeALine(yTop, len, waistRx, waistRz, hemRx, hemRz, nu = 56, nv = 14) {
  const pos = [], nrm = [], uv = [], idx = [];
  for (let j = 0; j <= nv; j++) {
    const v = j / nv, along = v < 0.42 ? 0 : Math.pow((v - 0.42) / 0.58, 1.35); // stay slim past the hands, then flare
    const y = yTop - len * v;
    const rx = waistRx + (hemRx - waistRx) * along;
    const rz = waistRz + (hemRz - waistRz) * along;
    for (let i = 0; i <= nu; i++) {
      const u = i / nu, a = u * Math.PI * 2;
      const x = Math.sin(a) * rx, z = Math.cos(a) * rz;
      pos.push(x, y, z);
      const nx = Math.sin(a) * rz, nz = Math.cos(a) * rx;
      const nl = Math.hypot(nx, nz) || 1;
      nrm.push(nx / nl, 0.12 * (1 - along), nz / nl);
      uv.push(u, 1 - v);
    }
  }
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
    const a = j * (nu + 1) + i, b = a + nu + 1;
    idx.push(a, b, a + 1, a + 1, b, b + 1);
  }
  // waistband + closed top so crop tops don't show a black tube
  const band = 0.01, bRx = waistRx * 1.01, bRz = waistRz * 1.01, b0 = pos.length / 3;
  for (let k = 0; k <= 1; k++) for (let i = 0; i <= nu; i++) {
    const a = i / nu * Math.PI * 2, y = yTop + (k ? band : 0);
    pos.push(Math.sin(a) * bRx, y, Math.cos(a) * bRz);
    nrm.push(Math.sin(a), k ? 1 : 0.2, Math.cos(a));
    uv.push(i / nu, 1 + k * 0.04);
  }
  for (let i = 0; i < nu; i++) {
    const a = b0 + i, b = a + nu + 1;
    idx.push(a, a + 1, b, a + 1, b + 1, b);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function patternTex(piece) {
  const id = piece.p || 0, c1 = piece.c || '#888', c2 = piece.c2 || '#ffffff';
  if (!id) return null;
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 256;
  const g = cv.getContext('2d');
  g.fillStyle = c1; g.fillRect(0, 0, 256, 256);
  g.fillStyle = c2;
  const name = PATTERNS[id] || '';
  if (/Zebra/i.test(name) || id === 17) {
    for (let y = 0; y < 256; y++) {
      const w = 18 + 8 * Math.sin(y * 0.08);
      for (let x = 0; x < 256; x++) {
        const n = (y * 1.35 + Math.sin(x * 0.09) * 28 + Math.sin(y * 0.04) * 10) / 36;
        if ((n % 2 + 2) % 2 < 1) g.fillRect(x, y, 1, 1);
      }
    }
  } else if (/Floral/i.test(name) || id === 16) {
    for (let i = 0; i < 24; i++) {
      const x = (i * 73 + 40) % 256, y = (i * 97 + 30) % 256, r = 8 + (i % 5);
      g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
      g.fillStyle = c1; g.beginPath(); g.arc(x, y, r * 0.35, 0, 7); g.fill(); g.fillStyle = c2;
    }
  } else if (/Checker|Plaid/i.test(name)) {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if ((x + y) % 2 === 0) g.fillRect(x * 16, y * 16, 16, 16);
  } else if (/Stripe/i.test(name)) {
    for (let y = 0; y < 256; y += 20) g.fillRect(0, y, 256, 10);
  } else {
    return null;
  }
  const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t;
}

const _mats = new Map();
function skirtMat(piece) {
  const key = JSON.stringify([piece.c, piece.c2, piece.p || 0]);
  if (_mats.has(key)) return _mats.get(key);
  const map = patternTex(piece);
  const m = new THREE.MeshStandardMaterial({
    color: map ? '#ffffff' : (piece.c || '#888888'),
    map, roughness: 0.86, metalness: 0, side: THREE.DoubleSide,
  });
  _mats.set(key, m); return m;
}

export function clearSkirt(av) {
  const m = av._skirt; if (!m) return;
  m.parent && m.parent.remove(m); m.geometry && m.geometry.dispose(); av._skirt = null;
}

export function mountSkirt(av, piece, row) {
  clearSkirt(av); if (!piece || !row) return;
  const P = av.tpl.P; const [id, nm, gd, le, wa, loose, fl, kb] = row;
  const yTop = P.Hips.y + 0.07 - (wa || 0) * 0.25;
  const leg = Math.max(0.4, P.Hips.y - ((P.LeftFoot && P.LeftFoot.y) || 0.08));
  const len = Math.max(0.18, leg * (0.22 + (le || 0.4) * 0.62));
  const hips = (av._morph && av._morph.hips) || 0;
  const waistRx = 0.110 + hips * 0.03 + (loose || 0) * 1.4;
  const waistRz = waistRx * 0.72;
  const flare = Math.max(fl || 0, (kb || 0) * 0.45, 0.045) * (le > 0.4 ? 1.15 : 1.0);
  const hemRx = waistRx + flare * 0.55 + 0.01, hemRz = waistRz + flare * 0.95 + 0.016;
  const geo = makeALine(yTop, len, waistRx, waistRz, hemRx, hemRz);
  skinTo(av, geo, () => [['Hips', 1]]);
  const mesh = new THREE.SkinnedMesh(geo, skirtMat(piece));
  const s = av.skin; mesh.position.copy(s.position); mesh.quaternion.copy(s.quaternion); mesh.scale.copy(s.scale);
  s.parent.add(mesh); mesh.bind(s.skeleton, s.bindMatrix); mesh.frustumCulled = false; mesh.renderOrder = 1; mesh.castShadow = false;
  av._skirt = mesh;
}
