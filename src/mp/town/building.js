// Enterable buildings (houses, store, gas kiosk, sheds): real hinged doors, furniture, lootable containers, roofs that can cut away, a ceiling so the sky never shows through, and warm hanging lamps.
import * as THREE from 'three';
import { boxGeo, mulberry } from './kit.js';

export const H = 2.8, T = .22;
export const FACE_ROT = { S: 0, E: Math.PI / 2, N: Math.PI, W: -Math.PI / 2 };
export const COLORS = ['#d4cdb2', '#b3c4ae', '#c4ad96', '#9aa9bd', '#d2b9a8', '#dcdad0', '#b4b69e', '#c2a893', '#a9bbbb', '#d0be82', '#c9a79b', '#a7b3a0'];
export const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const plainCache = {};
export function plain(M, key, color) { const k = key + color; if (plainCache[k]) return plainCache[k]; const m = M[key].clone(); m.vertexColors = false; m.color = new THREE.Color(color); return plainCache[k] = m; }
export function gableGeo(len, span, rise, uvs = 3) { // prism: ridge along x, centred at origin, base at y=0
  const a = len / 2, s = span / 2, P = [[-a, 0, s], [a, 0, s], [a, rise, 0], [-a, rise, 0], [-a, 0, -s], [a, 0, -s]];
  const tri = (i, j, k) => [...P[i], ...P[j], ...P[k]]; const pos = [...tri(0, 1, 2), ...tri(0, 2, 3), ...tri(5, 4, 3), ...tri(5, 3, 2), ...tri(4, 0, 3), ...tri(1, 5, 2)]; // two slopes + gable ends
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); const uv = []; for (let t = 0; t < pos.length; t += 9) { const slope = t < 18; for (let k = 0; k < 3; k++) { const x = pos[t + k * 3], y = pos[t + k * 3 + 1], z = pos[t + k * 3 + 2]; if (slope) uv.push(x / uvs, Math.hypot(z, y - rise) / uvs * 1.2); else uv.push(z / uvs, y / uvs); } } g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.computeVertexNormals(); return g;
}
const FURN = { // [w, h, d, material, colour]
  fridge: [.8, 1.8, .75, 'metal', '#d7d9d2'], counter: [1.7, .9, .6, 'plank', '#8d7a5e'], wardrobe: [1.3, 2.0, .6, 'plank', '#7b6247'], nightstand: [.5, .55, .45, 'plank', '#6e5a43'], cabinet: [1.4, .95, .5, 'plank', '#85705a'],
  shelf: [1.8, 1.9, .45, 'metal', '#8c9298'], crate: [.9, .7, .9, 'plank', '#9b8460'], toolbox: [.75, .55, .42, 'rust', '#b0553a'], register: [1.8, 1.0, .7, 'plank', '#6c5a49'], pumpbox: [.9, .8, .6, 'metal', '#a8a8a0'],
  bed: [1.6, .5, 2.0, 'fabric', '#8a7468'], couch: [2.0, .5, .9, 'fabric', '#6d5f55'], table: [1.3, .75, .85, 'plank', '#8b7458'], tv: [1.2, .55, .35, 'dark', '#2a2c30'], desk: [1.2, .75, .6, 'plank', '#7d6a50'],
};
const LABEL = { fridge: 'Fridge', counter: 'Kitchen cupboard', wardrobe: 'Wardrobe', nightstand: 'Nightstand', cabinet: 'Cabinet', shelf: 'Shelves', crate: 'Crate', toolbox: 'Toolbox', register: 'Counter' };

export function makeBuilding(W, cfg) {
  const { M, B, col, root } = W; const th = FACE_ROT[cfg.face], cs = Math.cos(th), sn = Math.sin(th);
  const grp = new THREE.Group(); grp.position.set(cfg.cx, 0, cfg.cz); grp.rotation.y = th; root.add(grp);
  const toW = (lx, lz) => [cfg.cx + lx * cs + lz * sn, cfg.cz - lx * sn + lz * cs]; const rr = mulberry(hash(cfg.id));
  const { w, d } = cfg, hw = w / 2, hd = d / 2; const kind = cfg.kind, big = kind === 'store' || kind === 'kiosk'; const Hh = big ? 3.2 : kind === 'shed' ? 2.3 : H;
  const siding = cfg.color || COLORS[cfg.ci % COLORS.length]; const bd = { id: cfg.id, kind, cfg, grp, toW, doors: [], containers: [], roof: null, rect: null, Hh };
  const wb = (x0, x1, z0, z1) => { const a = toW(x0, z0), b = toW(x1, z1); return [Math.min(a[0], b[0]), Math.max(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[1], b[1])]; };
  const box = (mat, x0, x1, y0, y1, z0, z1, color, scale = 2) => { if (x1 - x0 < .004 || y1 - y0 < .004 || z1 - z0 < .004) return; const r = wb(x0, x1, z0, z1); B.bounds(mat, r[0], r[1], y0, y1, r[2], r[3], color, scale); };
  const colL = (x0, x1, z0, z1, tag = 'wall') => { const r = wb(x0, x1, z0, z1); return col.add(r[0], r[1], r[2], r[3], tag, true); };
  const bmat = kind === 'store' ? 'brick' : 'siding'; const R = bd.rect = (() => { const r = wb(-hw, hw, -hd, hd); return { x0: r[0], x1: r[1], z0: r[2], z1: r[3] }; })();
  // generic wall: axis 'x' (runs along local x at z=f) or 'z'. ops: [{c,w,y0,y1,k}] ; inn: interior side (+1/-1) or 0 (both sides interior)
  const wall = (axis, f, a, b, ops, o = {}) => {
    ops = ops.slice().sort((p, q) => p.c - q.c); const inn = o.inn || 0, mat = o.mat || bmat, colr = o.color || siding;
    const rect = (u0, u1, t0, t1, y0, y1, m, c) => axis === 'x' ? box(m, u0, u1, y0, y1, t0, t1, c) : box(m, t0, t1, y0, y1, u0, u1, c);
    const piece = (u0, u1, y0, y1) => { if (u1 - u0 < .01 || y1 - y0 < .01) return; if (inn === 0) rect(u0, u1, f - T / 2, f + T / 2, y0, y1, 'plaster', '#d2c9b2'); else { rect(u0, u1, f - T / 2, f + T / 2, y0, y1, mat, colr); const t0 = inn > 0 ? f + T / 2 - .02 : f - T / 2, t1 = inn > 0 ? f + T / 2 : f - T / 2 + .02; rect(u0, u1, t0, t1, y0, y1, 'plaster', '#d2c9b2'); } };
    let s = a; for (const op of ops) { const u0 = op.c - op.w / 2, u1 = op.c + op.w / 2; piece(s, u0, 0, Hh); piece(u0, u1, 0, op.y0); piece(u0, u1, op.y1, Hh); s = u1;
      if (op.k === 'win' && inn !== 0) { const wr = rr(); const ext = -inn; // outward side
        const ft = (u0, u1, y0, y1, t0, t1) => axis === 'x' ? box('trim', u0, u1, y0, y1, t0, t1, '#6b5a48') : box('trim', t0, t1, y0, y1, u0, u1, '#6b5a48'); const eo = f + ext * (T / 2 + .015);
        ft(u0 - .06, u0, op.y0 - .06, op.y1 + .06, eo - .03, eo + .03); ft(u1, u1 + .06, op.y0 - .06, op.y1 + .06, eo - .03, eo + .03); ft(u0 - .06, u1 + .06, op.y1, op.y1 + .06, eo - .03, eo + .03); ft(u0 - .08, u1 + .08, op.y0 - .06, op.y0, eo - .05, eo + .05);
        if (wr < .42) { const n = 3, bh = (op.y1 - op.y0) / n; for (let k = 0; k < n; k++) { const jit = (rr() - .5) * .25; ft(u0 - .1 + jit * .3, u1 + .1 - jit * .2, op.y0 + k * bh + .05 + jit * .05, op.y0 + k * bh + bh * .8 + jit * .05, eo + ext * .03 - .03, eo + ext * .03 + .03); } }
        else if (wr < .68) { /* broken: nothing */ } else { const pane = (axis === 'x') ? [u0, u1, op.y0, op.y1, f - .02, f + .02] : [f - .02, f + .02, op.y0, op.y1, u0, u1]; const r = axis === 'x' ? wb(pane[0], pane[1], pane[4], pane[5]) : wb(pane[0], pane[1], pane[4], pane[5]); B.bounds('glass', r[0], r[1], op.y0, op.y1, r[2], r[3], '#ffffff', 2); } } }
    piece(s, b, 0, Hh);
    let c0 = a; const gaps = ops.filter(p => p.k === 'door'); const cr = (u0, u1) => { if (u1 - u0 > .01) axis === 'x' ? colL(u0, u1, f - T / 2, f + T / 2) : colL(f - T / 2, f + T / 2, u0, u1); };
    for (const g of gaps) { cr(c0, g.c - g.w / 2); c0 = g.c + g.w / 2; } cr(c0, b);
  };
  const win = (c, ww = 1.3, y0 = .95, y1 = 2.15) => ({ c, w: ww, y0, y1, k: 'win' }), dr = (c, ww = 1.05) => ({ c, w: ww, y0: 0, y1: 2.15, k: 'door' });
  const door = (name, c, f, ww, swing, locked, axis = 'x') => { // hinged door at wall z=f (axis x)
    const inst = kind !== 'house'; /* houses ship with open doorways: a Door is bought in the shop */ if (!inst) locked = false; const id = cfg.id + ':' + name; const pivot = new THREE.Group(); pivot.position.set(c - ww / 2, 0, f); grp.add(pivot); const col0 = plain(M, 'plank', locked ? '#6d5236' : '#7c6446');
    const panel = new THREE.Mesh(boxGeo(ww - .04, 2.1, .06, 1.2), col0); pivot.visible = inst; panel.position.set(ww / 2, 1.07, 0); panel.castShadow = true; pivot.add(panel); const knob = new THREE.Mesh(new THREE.SphereGeometry(.04, 6, 4), plain(M, 'metal', '#b9a24a')); knob.position.set(ww - .14, 1.0, swing * .05); pivot.add(knob);
    const frameT = (x0, x1, y0, y1) => box('trim', x0, x1, y0, y1, f - T / 2 - .02, f + T / 2 + .02, '#5a4a3a'); frameT(c - ww / 2 - .06, c - ww / 2, 0, 2.2); frameT(c + ww / 2, c + ww / 2 + .06, 0, 2.2); frameT(c - ww / 2 - .06, c + ww / 2 + .06, 2.15, 2.22);
    const r = wb(c - ww / 2, c + ww / 2, f - .08, f + .08); const cc = col.add(r[0], r[1], r[2], r[3], 'door:' + id, inst); const wp = toW(c, f); const D = { id, bid: cfg.id, name, pivot, swing, ww, locked, open: 0, target: 0, state: !inst ? 'none' : locked ? 'locked' : 'closed', installed: inst, col: cc, x: wp[0], z: wp[1], ang: th, hp: 3, panel, side: swing, interior: (inn) => 0 }; D.nx = Math.sin(th) * 0; W.doors.push(D); bd.doors.push(D); return D; };
  const furn = (kind, lx, lz, fa, table, label) => { const [fw, fh, fd, mat, c] = FURN[kind]; const sw = fa % 2 ? fd : fw, sd = fa % 2 ? fw : fd; box(mat, lx - sw / 2, lx + sw / 2, 0, fh, lz - sd / 2, lz + sd / 2, c, 1.5);
    if (kind === 'couch') box('fabric', lx - sw / 2 - (fa % 2 ? 0 : 0), lx + sw / 2, fh, fh + .45, lz - sd / 2 + (fa === 0 ? -.1 : 0), lz + sd / 2, c); if (kind === 'bed') box('fabric', lx - sw / 2 + .08, lx + sw / 2 - .08, fh, fh + .12, lz - sd / 2 + .08, lz + sd / 2 - .08, '#b9b0a2');
    colL(lx - sw / 2, lx + sw / 2, lz - sd / 2, lz + sd / 2, 'furn'); if (!table) return null;
    const id = cfg.id + ':' + kind + ':' + bd.containers.length; const g = new THREE.Group(); g.position.set(lx, 0, lz); g.rotation.y = fa * Math.PI / 2; grp.add(g); const lid = new THREE.Group(); lid.position.set(-fw / 2, 0, fd / 2 + .01); g.add(lid);
    const pm = new THREE.Mesh(boxGeo(fw - .04, fh * .86, .04, 1.2), plain(M, mat, kind === 'fridge' ? '#bfc1ba' : '#6a5640')); pm.position.set(fw / 2, fh * .5, .02); lid.add(pm); pm.castShadow = true;
    const wp = toW(lx, lz); const fx = Math.sin(th + fa * Math.PI / 2), fz = Math.cos(th + fa * Math.PI / 2); const Cn = { id, table, label: label || LABEL[kind] || 'Container', x: wp[0], z: wp[1], fx, fz, reach: Math.max(fw, fd) / 2 + 1.0, looted: false, lid, open: 0, bid: cfg.id, kind }; W.containers.push(Cn); bd.containers.push(Cn); return Cn; };
  // floor + a real ceiling (added after the walls; lamps hang from it)
  box('floor', -hw, hw, 0, .06, -hd, hd, kind === 'store' ? '#8a8578' : '#a08c70', 2);
  const lockedF = rr() < (cfg.locked ? .75 : .1);
  if (kind === 'house') {
    const dxF = hw / 2 + .1, dxA = -hw / 2, dxB = hw / 3, nW = w > 8.5 ? 1.4 : 1.15;
    wall('x', hd, -hw, hw, [dr(dxF), win(-hw / 2, nW)], { inn: -1 }); door('front', dxF, hd, 1.05, 1, lockedF);
    wall('x', -hd, -hw, hw, [cfg.back ? dr(dxA) : win(dxA, nW), win(hw / 2, nW)], { inn: 1 }); if (cfg.back) door('back', dxA, -hd, 1.05, -1, rr() < .5);
    wall('x', 0, -hw, hw, [dr(dxA), dr(dxB)], { inn: 0 }); door('kitchen', dxA, 0, 1.0, 1, false); door('bedroom', dxB, 0, 1.0, 1, rr() < .2);
    wall('z', -hw, -hd, hd, [win(hd / 2, nW), win(-hd / 2, nW)], { inn: 1 }); wall('z', hw, -hd, hd, [win(hd / 2, nW), win(-hd / 2, nW)], { inn: -1 }); wall('z', hw / 6, -hd, 0, [], { inn: 0 });
    furn('cabinet', hw - .35, hd / 2 + .4, 3, 'living'); furn('couch', -hw / 2 - .3, hd - .7, 2); furn('table', -.3, hd / 2 + .2, 0); furn('tv', -hw + .35, 1.1, 1);
    furn('fridge', -hw + .45, -hd + .5, 0, 'kitchen'); furn('counter', -hw + .35, -hd / 2 + .5, 1, 'kitchen'); furn('table', -hw / 3 - .6, -hd / 2 - .3, 0);
    furn('bed', hw - 1.0, -hd + 1.15, 0); furn('wardrobe', hw / 2 - .1, -hd + .35, 0, 'bedroom'); furn('nightstand', hw - 2.15, -hd + .3, 0, 'bedroom');
    if (rr() < .55) furn('toolbox', hw - .45, .7, 3, 'garage', 'Toolbox'); if (rr() < .4) furn('desk', -hw + .4, hd - 2.6, 1);
  } else if (kind === 'store') {
    const df = -hw / 3; wall('x', hd, -hw, hw, [dr(df, 1.8), win(hw / 5, 3.2, .6, 2.5), win(hw / 1.8, 3, .6, 2.5), win(-hw / 1.5, 1.2, .6, 2.5)], { inn: -1 }); door('front', df, hd, 1.8, 1, false);
    wall('x', -hd, -hw, hw, [dr(hw / 2.4)], { inn: 1 }); door('back', hw / 2.4, -hd, 1.05, -1, true); wall('z', -hw, -hd, hd, [win(-1, 1.6)], { inn: 1 }); wall('z', hw, -hd, hd, [win(2, 1.6)], { inn: -1 });
    wall('x', -hd + 3.6, -hw, hw, [dr(hw / 3)], { inn: 0 }); door('stock', hw / 3, -hd + 3.6, 1.05, 1, true);
    for (const x of [-7.2, -5.2, -3.2, 1.9, 3.9, 5.9]) furn('shelf', x, .4, 0, 'store', 'Shelves'); furn('register', hw - 2.2, hd - 1.6, 3, 'store', 'Checkout counter'); furn('shelf', -hw + .4, 3.6, 1, 'store', 'Shelves');
    for (const [x, z] of [[-6.5, -4.9], [-3.4, -5.2], [6.7, -4.9]]) furn('crate', x, z, 0, 'stockroom', 'Stock crate'); furn('shelf', hw - .35, -4, 3, 'stockroom', 'Stock shelves');
  } else if (kind === 'kiosk') {
    wall('x', hd, -hw, hw, [dr(hw / 2, 1.1), win(-hw / 4, 3.2, .6, 2.5)], { inn: -1 }); door('front', hw / 2, hd, 1.1, 1, true); wall('x', -hd, -hw, hw, [], { inn: 1 }); wall('z', -hw, -hd, hd, [win(.4, 1.4)], { inn: 1 }); wall('z', hw, -hd, hd, [win(.4, 1.4)], { inn: -1 });
    wall('x', -hd + 2.2, -hw, hw, [dr(-hw / 3)], { inn: 0 }); door('back', -hw / 3, -hd + 2.2, 1.0, 1, false);
    furn('register', hw - 1.6, hd - 1.5, 0, 'station', 'Counter'); furn('shelf', -hw + .35, 1.7, 1, 'station', 'Shelves'); furn('shelf', -hw + .35, .1, 1, 'station', 'Shelves'); furn('crate', 1.3, -hd + .7, 0, 'station', 'Crate'); furn('toolbox', hw - .5, -hd + .6, 3, 'station', 'Toolbox');
  } else { wall('x', hd, -hw, hw, [dr(0, 1.05)], { inn: -1 }); door('front', 0, hd, 1.05, 1, lockedF); wall('x', -hd, -hw, hw, [], { inn: 1 }); wall('z', -hw, -hd, hd, [], { inn: 1 }); wall('z', hw, -hd, hd, [win(0, .8)], { inn: -1 }); furn('crate', -1.0, -hd + .65, 0, 'shed', 'Crate'); furn('toolbox', hw - .55, -hd + .5, 3, 'shed', 'Toolbox'); }
  // ceiling + warm hanging lamps. The ceiling stays put when a wall is cut away, so the sky never shows through.
  { const cm = plain(M, 'plaster', '#f0e6d4'); const ceil = new THREE.Mesh(new THREE.PlaneGeometry(Math.max(.5, w - .1), Math.max(.5, d - .1)), cm); ceil.rotation.x = Math.PI / 2; ceil.position.y = Hh - .04; ceil.receiveShadow = true; grp.add(ceil); bd.ceiling = ceil;
    if (!plainCache._lamp) { const lm = new THREE.MeshStandardMaterial({ color: '#f3e2bf', emissive: '#ffd19a', emissiveIntensity: 2.6, roughness: .4, metalness: .06 }); const sm = new THREE.MeshStandardMaterial({ color: '#cbb898', roughness: .7 }); plainCache._lamp = lm; plainCache._shade = sm; }
    const nL = kind === 'store' ? 3 : (kind === 'shed' || kind === 'kiosk' ? 1 : 2);
    const spots = []; if (nL === 1) spots.push([0, 0]); else if (nL === 2) spots.push([-w * .2, d * .2], [w * .2, -d * .18]); else for (let i = 0; i < nL; i++) spots.push([-w * .32 + (w * .64) * (i / (nL - 1)), (i % 2 ? .4 : -.3)]);
    bd.lampPos = spots.map(([lx, lz]) => { const [x, z] = toW(lx, lz); const g = new THREE.Group(); g.position.set(lx, Hh - .12, lz); grp.add(g); const shade = new THREE.Mesh(new THREE.BoxGeometry(.42, .07, .42), plainCache._shade); g.add(shade); const bulb = new THREE.Mesh(new THREE.BoxGeometry(.32, .04, .32), plainCache._lamp); bulb.position.y = -.06; g.add(bulb); return [x, Hh - .22, z]; }); }

  // roof (separate mesh: lifts off when you stand inside)
  const rg = new THREE.Group(); grp.add(rg); bd.roof = rg; const rm = plain(M, 'roofmat', kind === 'house' ? ['#b7a89a', '#a3a39c', '#b08c78', '#97a090'][cfg.ci % 4] : '#8f8e8a');
  if (kind === 'house') { const len = Math.max(w, d) + .8, span = Math.min(w, d) + 1.0; const m = new THREE.Mesh(gableGeo(len, span, span * .3), rm); m.position.y = Hh; if (d > w) m.rotation.y = Math.PI / 2; m.castShadow = true; rg.add(m); }
  else { const m = new THREE.Mesh(boxGeo(w + .5, .3, d + .5, 2), plain(M, 'concrete', '#6e6c66')); m.position.y = Hh + .15; m.castShadow = true; rg.add(m); const par = new THREE.Mesh(boxGeo(w + .5, .5, d + .5, 2), plain(M, 'concrete', '#7a7872')); par.visible = false; rg.add(m); }
  W.buildings.push(bd); return bd;
}
