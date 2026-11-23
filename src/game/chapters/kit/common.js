// Shared building blocks for the hospital / lab / market / roof kit. Pure geometry helpers, NO story logic.
// Convention: a piece is placed with {x, z} = its START (the end nearest the player's spawn) and extends toward -z.
// ctx comes from world.js (see docs/CHAPTERS_DEV.md). Everything solid goes through ctx.wallBox so collisions + shot blocking just work.
export function mats(ctx) {
  if (ctx._km) return ctx._km; const T = ctx.THREE; const M = (c, o = {}) => new T.MeshStandardMaterial({ color: c, roughness: .85, ...o });
  return ctx._km = {
    tile: M('#a7aea9'), tileDark: M('#4b5251'), tileGreen: M('#7f9c8a'), lino: M('#b9b19a'), concrete: M('#6f6d68'), floorWhite: M('#d4d8d4', { roughness: .5 }),
    wall: M('#d8dbd4'), wallGreen: M('#93b39f'), wallBlue: M('#8fb0c9'), wallYellow: M('#e6d08a'), wallPink: M('#e5a9b8'), wallDark: M('#3c4240'), brick: M('#8a4a3a'),
    steel: M('#9aa1a6', { metalness: .6, roughness: .4 }), steelDark: M('#50565a', { metalness: .6, roughness: .5 }), rust: M('#7a4a34', { metalness: .3, roughness: .9 }),
    wood: M('#8a6a44'), woodDark: M('#5a4228'), white: M('#f0f0ec'), red: M('#a8261c'), yellow: M('#e0b020'), blue: M('#2a56a0'), green: M('#2f8a4a'), pink: M('#e57aa0'), black: M('#1a1a1a'), fabric: M('#4a6a8a'),
    blood: M('#5a0c0c', { roughness: .4 }),
    lamp: new T.MeshStandardMaterial({ color: '#222', emissive: '#fff4d8', emissiveIntensity: 2.4 }), lampCold: new T.MeshStandardMaterial({ color: '#222', emissive: '#cfe8ff', emissiveIntensity: 2.4 }), lampRed: new T.MeshStandardMaterial({ color: '#222', emissive: '#ff3020', emissiveIntensity: 2.6 }),
    glass: new T.MeshStandardMaterial({ color: '#9fd0e0', transparent: true, opacity: .28, roughness: .1, metalness: .2 }),
  };
}
export function floor(ctx, x, z, w, d, mat, y = .03) { const m = new ctx.THREE.Mesh(new ctx.THREE.PlaneGeometry(w, d), mat); m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.receiveShadow = true; ctx.scene.add(m); return m; }
export function prop(ctx, w, h, d, mat, x, y, z, solid = false) { return ctx.wallBox(w, h, d, mat, x, y, z, solid); } // visual prop; pass solid=true for collision
// straight wall along X at depth z from x0..x1, with door gaps [{c: centreX, w: width}]
export function wallX(ctx, x0, x1, z, h, mat, gaps = [], t = .4) { let a = x0; [...gaps].sort((p, q) => p.c - q.c).forEach(g => { const g0 = g.c - g.w / 2, g1 = g.c + g.w / 2; if (g0 > a) ctx.wallBox(g0 - a, h, t, mat, (a + g0) / 2, h / 2, z); a = g1; if (g.lintel !== false) ctx.wallBox(g.w, Math.max(.01, h - 2.6), t, mat, g.c, 2.6 + (h - 2.6) / 2, z, false); }); if (x1 > a) ctx.wallBox(x1 - a, h, t, mat, (a + x1) / 2, h / 2, z); }
// straight wall along Z at x from z0..z1 (z0 > z1 is fine), with door gaps [{c: centreZ, w}]
export function wallZ(ctx, z0, z1, x, h, mat, gaps = [], t = .4) { let a = Math.max(z0, z1); const b = Math.min(z0, z1); [...gaps].sort((p, q) => q.c - p.c).forEach(g => { const g0 = g.c + g.w / 2, g1 = g.c - g.w / 2; if (a > g0) ctx.wallBox(t, h, a - g0, mat, x, h / 2, (a + g0) / 2); a = g1; if (g.lintel !== false) ctx.wallBox(t, Math.max(.01, h - 2.6), g.w, mat, x, 2.6 + (h - 2.6) / 2, g.c, false); }); if (a > b) ctx.wallBox(t, h, a - b, mat, x, h / 2, (a + b) / 2); }
// 4-wall room centred on (x,z), size w (x) by d (z). doors: {n:[centreX..], s:[centreX..], e:[centreZ..], w:[centreZ..]} (n = toward +z, s = toward -z), each opening is doorW wide
export function room(ctx, { x, z, w, d, h = 3.6, mat, doors = {}, doorW = 2.4 }) { const G = (a = []) => a.map(c => ({ c, w: doorW }));
  wallX(ctx, x - w / 2, x + w / 2, z + d / 2, h, mat, G(doors.n)); wallX(ctx, x - w / 2, x + w / 2, z - d / 2, h, mat, G(doors.s)); wallZ(ctx, z + d / 2, z - d / 2, x + w / 2, h, mat, G(doors.e)); wallZ(ctx, z + d / 2, z - d / 2, x - w / 2, h, mat, G(doors.w)); }
// ceiling light panel. real=true adds a PointLight (use sparingly: <= 6 per piece for phones). flicker=0..1 makes it stutter.
export function lamp(ctx, x, z, { y = 3.4, mat, real = false, color = '#fff0d0', intensity = 8, range = 16, flicker = 0, size = [1.2, .12, .5] } = {}) {
  const K = mats(ctx), mm0 = mat || K.lamp, mm = flicker > 0 ? mm0.clone() : mm0; const m = new ctx.THREE.Mesh(new ctx.THREE.BoxGeometry(...size), mm); m.position.set(x, y, z); ctx.scene.add(m); let L = null;
  if (real) L = ctx.Z_pl(x, y - .4, z, color, intensity, range);
  if (flicker > 0) { let seed = Math.abs(x * 13 + z * 7) % 6; ctx.updaters.push((dt, t) => { const k = Math.sin(t * 17 + seed) * Math.sin(t * 5.3 + seed * 2) > 1 - flicker * 1.4 ? .12 : 1; if (L) L.intensity = intensity * k; m.material.emissiveIntensity = (mm.emissiveIntensity || 2.4) * k; }); }
  return { mesh: m, light: L }; }
// an openable/lockable door slab. returns { mesh, setOpen(bool), isOpen }. Closed doors block movement and shots; open ones don't.
export function slabDoor(ctx, { x, z, w = 2.4, h = 2.8, along = 'x', mat, open = false, glass = false }) {
  const K = mats(ctx), mm = mat || (glass ? K.glass : K.steel); const dx = along === 'x' ? w : .3, dz = along === 'x' ? .3 : w; const m = new ctx.THREE.Mesh(new ctx.THREE.BoxGeometry(dx, h, dz), mm); m.position.set(x, h / 2, z); m.castShadow = true; ctx.scene.add(m);
  const col = { x0: x - dx / 2, x1: x + dx / 2, z0: z - dz / 2, z1: z + dz / 2 }; const H = { mesh: m, isOpen: false, setOpen(v) { H.isOpen = !!v; m.visible = !v; const i = ctx.colliders.indexOf(col); if (v && i >= 0) ctx.colliders.splice(i, 1); if (!v && i < 0) ctx.colliders.push(col); const j = ctx.walls.indexOf(m); if (v && j >= 0) ctx.walls.splice(j, 1); if (!v && j < 0 && !glass) ctx.walls.push(m); } };
  H.isOpen = false; ctx.colliders.push(col); if (!glass) ctx.walls.push(m); if (open) H.setOpen(true); return H; }
// simple furniture
export function table(ctx, x, z, { w = 2, d = 1, h = .85, mat, legMat } = {}) { const K = mats(ctx); prop(ctx, w, .08, d, mat || K.wood, x, h, z, true); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => prop(ctx, .08, h, .08, legMat || K.steelDark, x + a * (w / 2 - .08), h / 2, z + b * (d / 2 - .08))); }
export function crate(ctx, x, z, s = 1, mat, ry = 0) { const K = mats(ctx); const m = prop(ctx, s, s * .8, s, mat || K.wood, x, s * .4, z, true); m.rotation.y = ry; return m; }
export function shelfUnit(ctx, x, z, { w = 3, d = .6, h = 2.2, rows = 4, mat, goods = ['#c04a3a', '#3a7ac0', '#d8b030', '#4aa05a'], along = 'x' } = {}) { const K = mats(ctx); const sx = along === 'x' ? w : d, sz = along === 'x' ? d : w; prop(ctx, sx, h, sz, mat || K.steelDark, x, h / 2, z, true);
  for (let r = 0; r < rows; r++) for (let i = 0; i < 5; i++) { const t = (i / 4 - .5) * (w - .5); const gm = new ctx.THREE.MeshStandardMaterial({ color: goods[(r + i) % goods.length], roughness: .7 }); const gx = along === 'x' ? x + t : x + (along === 'x' ? 0 : (d / 2 + .1)); const gz = along === 'x' ? z + d / 2 + .1 : z + t; prop(ctx, .3, .28, .22, gm, gx, .35 + r * (h - .5) / rows, gz); } }
// blood splash decal on the floor (visual only)
export function bloodPool(ctx, x, z, r = 1, y = .045) { const K = mats(ctx); const m = new ctx.THREE.Mesh(new ctx.THREE.CircleGeometry(r, 18), K.blood); m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.scale.y = .8 + (Math.abs(x * 7 + z) % 5) * .08; ctx.scene.add(m); return m; }
