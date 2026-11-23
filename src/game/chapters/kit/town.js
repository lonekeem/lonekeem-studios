// KIT · small-town Maine pieces for Chapters 17-20 (Riverside streets, porches, picket fences, trees, street lamps,
// a radio tower, a river bridge). Pure geometry, NO story logic. Original shapes, no brands.
import { mats, floor, prop, lamp } from './common.js';

const M = (ctx, c, o = {}) => new ctx.THREE.MeshStandardMaterial({ color: c, roughness: .82, ...o });
// a two-storey clapboard house. (x,z) = centre, facing = 'e' (+x) or 'w' (-x) — the side with the porch/door.
// Solid walls + gable roof + lit windows + porch. Returns anchors { door:[x,z], porch:[x,z], side:[x,z] }.
export function house(ctx, x, z, { w = 9, d = 11, h = 5.6, col = '#c9c1ad', roof = '#4a3a32', trim = '#f2eee4', facing = 'e', lit = .6, porch = true, seed = 1, light = false } = {}) {
  const T = ctx.THREE, K = mats(ctx), sgn = facing === 'e' ? 1 : -1, wallM = M(ctx, col), trimM = M(ctx, trim), roofM = M(ctx, roof, { roughness: .9 });
  ctx.wallBox(w, h, d, wallM, x, h / 2, z, true);
  // gable roof (prism along z)
  const sh = new T.Shape(); sh.moveTo(-w / 2 - .45, 0); sh.lineTo(w / 2 + .45, 0); sh.lineTo(0, 2.5); sh.closePath();
  const rg = new T.ExtrudeGeometry(sh, { depth: d + .8, bevelEnabled: false }); rg.translate(0, 0, -(d + .8) / 2); const r = new T.Mesh(rg, roofM); r.position.set(x, h + .1, z); r.castShadow = true; ctx.scene.add(r);
  const r2 = new T.Mesh(new T.BoxGeometry(w + .4, .16, d + .9), roofM); r2.position.set(x, h + .05, z); ctx.scene.add(r2);
  // chimney
  prop(ctx, .8, 2.2, .8, K.brick, x - sgn * w * .22, h + 1.6, z - d * .3);
  // front face: door + windows (both floors)
  const fx = x + sgn * (w / 2 + .03), rotY = sgn > 0 ? Math.PI / 2 : -Math.PI / 2;
  const plane = (pw, ph, mat, py, pz) => { const m = new T.Mesh(new T.PlaneGeometry(pw, ph), mat); m.position.set(fx, py, pz); m.rotation.y = rotY; ctx.scene.add(m); return m; };
  const doorM = M(ctx, ['#6a2a22', '#2a4a6a', '#3a5a3a', '#5a3a6a'][seed % 4]);
  plane(1.3, 2.3, doorM, 1.15, z); plane(1.6, .14, trimM, 2.36, z);
  const winOn = new T.MeshStandardMaterial({ color: '#2a2418', emissive: '#ffcf8a', emissiveIntensity: 1.1 }), winOff = new T.MeshStandardMaterial({ color: '#1a2228', roughness: .2, metalness: .3 });
  [[-2.8, 1.6], [2.8, 1.6], [-2.8, 4.1], [0, 4.1], [2.8, 4.1]].forEach(([dz, py], i) => { if (Math.abs(dz) > d / 2 - .8) return; const on = ((seed * 7 + i * 3) % 10) / 10 < lit; plane(1.2, 1.3, on ? winOn : winOff, py, z + dz); plane(1.4, .1, trimM, py - .72, z + dz); });
  // side windows
  [-1, 1].forEach(s => { const m = new T.Mesh(new T.PlaneGeometry(1.1, 1.2), ((seed + s) % 3) ? winOff : winOn); m.position.set(x, 4.1, z + s * (d / 2 + .03)); m.rotation.y = s > 0 ? 0 : Math.PI; ctx.scene.add(m); });
  // corner trim
  [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([a, b]) => prop(ctx, .18, h, .18, trimM, x + a * (w / 2 + .02), h / 2, z + b * (d / 2 + .02)));
  const A = { door: [fx + sgn * .6, z], side: [x, z + d / 2 + 1] };
  if (porch) { const px = x + sgn * (w / 2 + 1.3); prop(ctx, 2.6, .3, d * .7, K.wood, px, .15, z, true); prop(ctx, 2.9, .14, d * .74, roofM, px, 2.9, z); [-1, 1].forEach(s => prop(ctx, .16, 2.75, .16, trimM, px + sgn * 1.1, 1.45, z + s * d * .33));
    // steps + rail
    prop(ctx, .7, .16, 1.6, K.woodDark, px + sgn * 1.6, .08, z); A.porch = [px, z]; A.door = [px + sgn * 2.2, z];
    if (light && ctx.Z_pl) ctx.Z_pl(px, 2.6, z, '#ffd9a0', 6, 10); const bulb = new T.Mesh(new T.SphereGeometry(.12, 8, 6), new T.MeshStandardMaterial({ color: '#222', emissive: '#ffe0a8', emissiveIntensity: 2 })); bulb.position.set(px, 2.7, z + d * .2); ctx.scene.add(bulb); }
  return A;
}
// low white picket fence along z at x, from z0 to z1, with an optional gate gap centred at gz
export function picket(ctx, x, z0, z1, gz = null, col = '#eeeae0') { const m = M(ctx, col); const a = Math.max(z0, z1), b = Math.min(z0, z1);
  for (let z = a; z > b; z -= .5) { if (gz != null && Math.abs(z - gz) < 1.2) continue; prop(ctx, .08, .9, .1, m, x, .45, z); }
  const segs = gz == null ? [[a, b]] : [[a, gz + 1.2], [gz - 1.2, b]]; segs.forEach(([p, q]) => { if (p - q < .2) return; prop(ctx, .06, .08, p - q, m, x, .7, (p + q) / 2); prop(ctx, .06, .08, p - q, m, x, .3, (p + q) / 2); ctx.colliders.push({ x0: x - .1, x1: x + .1, z0: q, z1: p }); }); }
// a soft round tree (trunk + 3 blobs). solid trunk.
export function tree(ctx, x, z, s = 1, col = '#2f4a2a') { const T = ctx.THREE; const trunk = M(ctx, '#4a3626'), leaf = M(ctx, col, { roughness: .95 });
  ctx.wallBox(.35 * s, 2.6 * s, .35 * s, trunk, x, 1.3 * s, z, true);
  [[0, 3.4, 0, 1.6], [.7, 2.9, .3, 1.1], [-.6, 3.0, -.4, 1.2]].forEach(([dx, y, dz, r]) => { const b = new T.Mesh(new T.IcosahedronGeometry(r * s, 1), leaf); b.position.set(x + dx * s, y * s, z + dz * s); b.castShadow = true; ctx.scene.add(b); }); }
// a straight two-lane street along z from z0 to z1 at x (asphalt + sidewalks + curb), centre line dashes
export function street(ctx, x, z0, z1, w = 10) { const T = ctx.THREE, K = mats(ctx), L = Math.abs(z0 - z1), cz = (z0 + z1) / 2;
  floor(ctx, x, cz, w, L, M(ctx, '#2c2e30', { roughness: .95 }), .025);
  [-1, 1].forEach(s => { floor(ctx, x + s * (w / 2 + 1.4), cz, 2.8, L, M(ctx, '#8a8a84'), .05); prop(ctx, .2, .14, L, M(ctx, '#a8a8a0'), x + s * (w / 2 + .05), .07, cz); });
  const dash = new T.MeshStandardMaterial({ color: '#d8c040', emissive: '#d8c040', emissiveIntensity: .25 }); for (let z = Math.max(z0, z1) - 2; z > Math.min(z0, z1); z -= 6) floor(ctx, x, z, .18, 2.6, dash, .04); }
// a street lamp with a real light (use few)
export function streetLamp(ctx, x, z, real = true, color = '#ffcf90') { const K = mats(ctx); prop(ctx, .14, 5.6, .14, K.steelDark, x, 2.8, z, true); prop(ctx, 1.2, .1, .14, K.steelDark, x + (x > 0 ? -.55 : .55), 5.55, z); lamp(ctx, x + (x > 0 ? -1 : 1), z, { y: 5.45, real, color, intensity: 9, range: 20, size: [.5, .14, .32] }); }
// a lattice radio tower with a blinking red light (Signal Hill)
export function radioTower(ctx, x, z, h = 46, base = 0) { const T = ctx.THREE, K = mats(ctx), G = new T.Group(); const leg = M(ctx, '#b8b8b0', { metalness: .4, roughness: .5 }), red = M(ctx, '#c03020');
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => { const l = new T.Mesh(new T.CylinderGeometry(.12, .2, h, 6), leg); l.position.set(a * 1.2, h / 2, b * 1.2); l.rotation.set(-b * .022, 0, a * .022); G.add(l); });
  for (let y = 3; y < h; y += 3.2) { const r = new T.Mesh(new T.BoxGeometry(2.6 - y / h * 1.2, .1, .1), (y / 3.2 | 0) % 2 ? red : leg); r.position.y = y; G.add(r); const r2 = r.clone(); r2.rotation.y = Math.PI / 2; G.add(r2); }
  const tip = new T.Mesh(new T.SphereGeometry(.35, 10, 8), new T.MeshStandardMaterial({ color: '#300', emissive: '#ff2a1a', emissiveIntensity: 3 })); tip.position.y = h + .4; G.add(tip);
  G.position.set(x, base, z); ctx.scene.add(G); ctx.updaters.push((dt, t) => { tip.visible = (t * 1.2 | 0) % 2 === 0; }); return { g: G, tip }; }
// a simple pickup truck (original, boxy) — visual + collider
export function pickup(ctx, x, z, rot = 0, col = '#7a2a22') { const T = ctx.THREE, G = new T.Group(), b = M(ctx, col, { metalness: .3, roughness: .5 }), dk = M(ctx, '#1a1a1a'), gl = M(ctx, '#203038', { roughness: .1, metalness: .4 });
  const add = (w, h, d, m, px, py, pz) => { const mm = new T.Mesh(new T.BoxGeometry(w, h, d), m); mm.position.set(px, py, pz); mm.castShadow = true; G.add(mm); return mm; };
  add(2, .8, 5.2, b, 0, .85, 0); add(1.9, .8, 1.9, b, 0, 1.65, .6); add(1.92, .55, 1.7, gl, 0, 1.75, .62); add(2.02, .5, 2.2, dk, 0, 1.0, -1.4);
  [[-1, 1.6], [1, 1.6], [-1, -1.6], [1, -1.6]].forEach(([a, c]) => { const wh = new T.Mesh(new T.CylinderGeometry(.42, .42, .3, 14), dk); wh.rotation.z = Math.PI / 2; wh.position.set(a * .95, .42, c); G.add(wh); });
  [-1, 1].forEach(s => { const hl = new T.Mesh(new T.BoxGeometry(.4, .2, .05), new T.MeshStandardMaterial({ color: '#222', emissive: '#fff2c8', emissiveIntensity: 1.6 })); hl.position.set(s * .65, 1.0, 2.62); G.add(hl); });
  G.position.set(x, 0, z); G.rotation.y = rot; ctx.scene.add(G); const c = Math.abs(Math.cos(rot)), s = Math.abs(Math.sin(rot)); const hw = c * 1.05 + s * 2.6, hd = s * 1.05 + c * 2.6; ctx.colliders.push({ x0: x - hw, x1: x + hw, z0: z - hd, z1: z + hd }); return G; }
