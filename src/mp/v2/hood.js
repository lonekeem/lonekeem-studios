// v2 hood: a soft hood lying down behind the neck for hoodies / zip hoodies. Original procedural geometry, © Lone Keem Studios.
import * as THREE from 'three';
import { skinTo, bindMesh } from './headrig.js';
export const HOODED = new Set(['cropzip', 'zip', 'hoodie', 'parka']);
function backZ(av, y, xr) { const p = av.skin.geometry.attributes.position, n = p.count; let zb = 9, zf = -9, xm = 0; for (let i = 0; i < n; i++) { const yy = p.getY(i); if (Math.abs(yy - y) > .016) continue; const x = p.getX(i); if (Math.abs(x) > xr) continue; const w = av.tpl.aW; if (w[i * 8 + 4] > .5 || av.tpl.headW[i] > .4) continue; const z = p.getZ(i); zb = Math.min(zb, z); zf = Math.max(zf, z); xm = Math.max(xm, Math.abs(x)); } return { zb, zf, xm }; }
export function buildHood(av, piece, mat) {
  if (av.hood2) { av.hood2.parent && av.hood2.parent.remove(av.hood2); av.hood2.geometry.dispose(); av.hood2 = null; }
  if (!piece || !HOODED.has(piece.id)) return; const P = av.tpl.P; const ny = P.neck.y; const f = av.look && av.look.base === 'mp_f1';
  const yR = ny - .022, b = backZ(av, yR, .06); const cz = (b.zb + b.zf) / 2, rx = b.xm + .03, rzb = cz - b.zb + .036, rzf = b.zf - cz + .03;
  const pts = []; for (let i = 0; i <= 20; i++) { const a = (-1 + 2 * i / 20) * 2.2; const back = Math.cos(a) > 0; const rz = back ? rzb : rzf; pts.push(new THREE.Vector3(Math.sin(a) * rx, yR - .016 * (1 - Math.cos(a)) * .5 - (Math.abs(a) > 1.6 ? (Math.abs(a) - 1.6) * .04 : 0), cz - Math.cos(a) * rz)); }
  const curve = new THREE.CatmullRomCurve3(pts); const roll = new THREE.TubeGeometry(curve, 48, f ? .014 : .016, 12, false);
  // flatten the tube a bit (soft fabric roll) and fatten it at the back
  const rp = roll.attributes.position; for (let i = 0; i < rp.count; i++) { const x = rp.getX(i), y = rp.getY(i), z = rp.getZ(i); const back = Math.max(0, cz - z) / rzb; rp.setY(i, yR + (y - yR) * (.8 + .25 * back)); }
  // the hood bag resting on the upper back
  const yB = ny - .1, bb = backZ(av, yB, .05); const bag = new THREE.SphereGeometry(1, 24, 16); const bp = bag.attributes.position;
  for (let i = 0; i < bp.count; i++) { const x = bp.getX(i), y = bp.getY(i), z = bp.getZ(i); const w = .085 - .02 * Math.max(0, -y); bp.setXYZ(i, x * w, yB + .015 + y * .068, bb.zb - .03 + z * .018 - (y + 1) * .006 + Math.min(0, z) * 0); }
  const g = mergeG([roll, bag]); g.computeVertexNormals();
  skinTo(av, g, (i, x, y) => { const k = Math.min(1, Math.max(0, (y - (ny - .09)) / .07)); return [['Spine02', 1 - k * .4], ['neck', k * .4]]; });
  const m = new THREE.SkinnedMesh(g, mat); bindMesh(av, m, 2); av.hood2 = m; { const p = av.skin.geometry.attributes.position, H = {}; for (let i = 0; i < p.count; i++) { if (av.tpl.headW[i] > .4) continue; const x = Math.abs(p.getX(i)), y = p.getY(i); if (x > .13) continue; const k = (Math.round(y / .01) * .01).toFixed(2); if (y > 1.15 && y < 1.45) H[k] = Math.max(H[k] || 0, +x.toFixed(3)); } window.hoodInfo = { H, par: m.parent && m.parent.type, vis: m.visible, bb: (g.computeBoundingBox(), g.boundingBox) }; }
}
function mergeG(gs) { let n = 0; const pos = [], idx = []; for (const g of gs) { const ng = g.index ? g : g; const p = ng.attributes.position; for (let i = 0; i < p.count; i++) pos.push(p.getX(i), p.getY(i), p.getZ(i)); const ix = ng.index; for (let i = 0; i < ix.count; i++) idx.push(ix.getX(i) + n); n += p.count; } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); return g; }
