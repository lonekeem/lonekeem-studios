// v1.9.20 MISSION GLOW — one central system that makes whatever you have to find/use easy to spot.
// Reads game state each frame (no per-chapter code needed):
//   g.pickups (story pickups = OBJECTIVE tier; loot pages/cash/ammo = soft tier; kill drops are left alone)
//   g.stepData.uses (search spots, doors, talk-to, switches...) · g.wpTarget (go-here) · the truck when the step wants you to drive
// Visuals (all cheap, no lights, no post passes): emissive pulse on the item, additive halo, light beam (objective only),
// sparkles, a constant-size floating marker you can see through walls, and an edge arrow when an objective is off-screen.
// Fades out when you are close so it never blocks the first-person view. Does NOT change gameplay.
import * as THREE from 'three';

const GOLD = new THREE.Color('#ffd54a'), SOFT = new THREE.Color('#bfeaff');
const _v = new THREE.Vector3(), _w = new THREE.Vector3();
const texCache = {};

function canvasTex(draw, s = 96) { const c = document.createElement('canvas'); c.width = c.height = s; draw(c.getContext('2d'), s); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
function glyph(ctx, kind, s) {
  ctx.strokeStyle = '#2a1a00'; ctx.fillStyle = '#2a1a00'; ctx.lineWidth = s * .07; ctx.lineCap = ctx.lineJoin = 'round'; const c = s / 2;
  if (kind === 'key') { ctx.beginPath(); ctx.arc(c - s * .12, c - s * .02, s * .1, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.moveTo(c - s * .02, c - s * .02); ctx.lineTo(c + s * .2, c - s * .02); ctx.moveTo(c + s * .13, c - s * .02); ctx.lineTo(c + s * .13, c + s * .08); ctx.moveTo(c + s * .2, c - s * .02); ctx.lineTo(c + s * .2, c + s * .08); ctx.stroke(); }
  else if (kind === 'card') { ctx.strokeRect(c - s * .2, c - s * .12, s * .4, s * .26); ctx.fillRect(c - s * .2, c - s * .05, s * .4, s * .06); ctx.fillRect(c - s * .14, c + s * .05, s * .12, s * .04); }
  else if (kind === 'note') { ctx.strokeRect(c - s * .14, c - s * .19, s * .28, s * .38); ctx.beginPath(); ctx.moveTo(c - s * .07, c - s * .07); ctx.lineTo(c + s * .07, c - s * .07); ctx.moveTo(c - s * .07, c + s * .02); ctx.lineTo(c + s * .07, c + s * .02); ctx.moveTo(c - s * .07, c + s * .11); ctx.lineTo(c + s * .03, c + s * .11); ctx.stroke(); }
  else if (kind === 'talk') { ctx.beginPath(); ctx.moveTo(c - s * .2, c - s * .12); ctx.lineTo(c + s * .2, c - s * .12); ctx.lineTo(c + s * .2, c + s * .1); ctx.lineTo(c - s * .02, c + s * .1); ctx.lineTo(c - s * .12, c + s * .2); ctx.lineTo(c - s * .12, c + s * .1); ctx.lineTo(c - s * .2, c + s * .1); ctx.closePath(); ctx.stroke(); }
  else if (kind === 'drive') { ctx.beginPath(); ctx.arc(c, c, s * .17, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.moveTo(c - s * .17, c); ctx.lineTo(c + s * .17, c); ctx.moveTo(c, c); ctx.lineTo(c, c + s * .17); ctx.stroke(); }
  else if (kind === 'dest') { ctx.beginPath(); ctx.moveTo(c, c - s * .2); ctx.lineTo(c + s * .15, c); ctx.lineTo(c, c + s * .2); ctx.lineTo(c - s * .15, c); ctx.closePath(); ctx.fill(); }
  else if (kind === 'use') { ctx.fillRect(c - s * .035, c - s * .2, s * .07, s * .24); ctx.beginPath(); ctx.arc(c, c + s * .14, s * .05, 0, 7); ctx.fill(); }
  else { /* star = findable item */ ctx.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? s * .08 : s * .2, a = -Math.PI / 2 + i * Math.PI / 5; ctx[i ? 'lineTo' : 'moveTo'](c + Math.cos(a) * r, c + Math.sin(a) * r); } ctx.closePath(); ctx.fill(); } }
function markerTex(kind, soft) { const k = kind + (soft ? '_s' : ''); if (texCache[k]) return texCache[k];
  return texCache[k] = canvasTex((ctx, s) => { const c = s / 2; const col = soft ? '#d8f2ff' : '#ffd54a';
    ctx.shadowColor = soft ? '#6cf' : '#ffb000'; ctx.shadowBlur = s * .1; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(c, c - s * .04, s * .33, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.moveTo(c - s * .12, c + s * .22); ctx.lineTo(c + s * .12, c + s * .22); ctx.lineTo(c, c + s * .38); ctx.closePath(); ctx.fill(); ctx.shadowBlur = 0;
    ctx.save(); ctx.translate(0, -s * .04); glyph(ctx, kind, s); ctx.restore(); }); }
function softTex() { return texCache.soft || (texCache.soft = canvasTex((ctx, s) => { const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.35, 'rgba(255,255,255,.45)'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, s, s); }, 64)); }

// models for findable items that did not exist before (used by addPickup kind 'key' / 'keycard' and by card search spots)
export function keyModel() { const g = new THREE.Group(), m = new THREE.MeshStandardMaterial({ color: '#d9b030', metalness: .6, roughness: .35, emissive: '#3a2600' });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.07, .018, 8, 16), m); ring.position.x = -.12; const sh = new THREE.Mesh(new THREE.BoxGeometry(.24, .03, .03), m); sh.position.x = .03;
  const t1 = new THREE.Mesh(new THREE.BoxGeometry(.03, .08, .03), m); t1.position.set(.1, -.04, 0); const t2 = t1.clone(); t2.position.x = .15; t2.scale.y = .7; g.add(ring, sh, t1, t2); g.rotation.z = .3; return g; }
export function cardModel() { const g = new THREE.Group(); const m = new THREE.MeshStandardMaterial({ color: '#dfe6ee', roughness: .5, emissive: '#102a44' });
  const c = new THREE.Mesh(new THREE.BoxGeometry(.3, .018, .19), m); const stripe = new THREE.Mesh(new THREE.BoxGeometry(.3, .02, .045), new THREE.MeshStandardMaterial({ color: '#1b2a3a' })); stripe.position.z = -.04;
  const chip = new THREE.Mesh(new THREE.BoxGeometry(.06, .02, .05), new THREE.MeshStandardMaterial({ color: '#d4a838', metalness: .7, roughness: .3 })); chip.position.set(-.08, 0, .04); g.add(c, stripe, chip); g.rotation.x = .5; return g; }

function pickupIcon(l) { const k = l.kind; if (k === 'key' || k === 'keycard') return k === 'key' ? 'key' : 'card'; if (k === 'page') return 'note'; if (k === 'fuse') return 'star'; const lab = (l.label || '').toLowerCase(); if (/key/.test(lab)) return 'key'; if (/card/.test(lab)) return 'card'; if (/note|letter/.test(lab)) return 'note'; return 'star'; }
function useIcon(u) { if (u.icon) return u.icon; if (u.model) return u.model === 'key' ? 'key' : 'card'; const l = (u.label || '').toLowerCase(); if (/key/.test(l)) return 'key'; if (/card/.test(l)) return 'card'; if (/talk|knock|answer|say |radio/.test(l)) return 'talk'; return 'use'; }

export function glowInit(g) {
  if (g.glow) return g.glow; const root = new THREE.Group(); root.name = 'mission-glow'; g.scene.add(root);
  const G = g.glow = { root, ents: new Map(), pool: [], t: 0, on: true, arrows: [], list: [] };
  const N = 14, pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 6 * 3), 3)); 
  G.sparkN = N; G.spark = new THREE.Points(pg, new THREE.PointsMaterial({ map: softTex(), color: '#ffe27a', size: .16, transparent: true, opacity: .95, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); G.spark.frustumCulled = false; G.spark.renderOrder = 5; root.add(G.spark);
  const hud = document.getElementById('hud') || document.body; for (let i = 0; i < 3; i++) { const e = document.createElement('div'); e.className = 'glowArrow'; e.innerHTML = '<i>▶</i><b></b>'; e.style.display = 'none'; hud.appendChild(e); G.arrows.push(e); }
  return G; }

function makeEnt(G, hard) { const e = G.pool.pop() || (() => { const o = {};
  o.grp = new THREE.Group();
  o.halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTex(), color: '#ffcf40', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); o.halo.renderOrder = 4;
  o.beam = new THREE.Mesh(new THREE.CylinderGeometry(.05, .16, 9, 8, 1, true), new THREE.MeshBasicMaterial({ color: '#ffd54a', transparent: true, opacity: .2, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false })); o.beam.renderOrder = 3;
  o.mark = new THREE.Sprite(new THREE.SpriteMaterial({ map: null, transparent: true, depthTest: false, depthWrite: false, sizeAttenuation: false, fog: false })); o.mark.renderOrder = 999;
  o.grp.add(o.halo, o.beam, o.mark); return o; })(); G.root.add(e.grp); e.grp.visible = true; return e; }
function freeEnt(G, e) { G.root.remove(e.grp); if (e.model) { e.grp.remove(e.model); e.model = null; } G.pool.push(e); }

// emissive pulse on a pickup's own meshes (materials are cloned once, so shared pickup materials stay untouched)
function pulseMeshes(root, k, col) { root.traverse(o => { if (!o.isMesh || o.userData.glowSkip) return; const m = o.material; if (!m || !m.emissive) return;
  if (!o.userData.glowMat) { o.material = m.clone(); o.userData.glowMat = true; o.userData.glowBase = [m.emissive.clone(), m.emissiveIntensity]; }
  const [b, bi] = o.userData.glowBase; o.material.emissive.copy(b).lerp(col, .75 * k); o.material.emissiveIntensity = bi + .9 * k; }); }
function pulseOff(root) { root.traverse(o => { if (o.userData && o.userData.glowMat) { const [b, bi] = o.userData.glowBase; o.material.emissive.copy(b); o.material.emissiveIntensity = bi; } }); }

export function glowUpdate(g) {
  const G = g.glow || glowInit(g); const t = G.t = g.t || 0; const P = g.player && g.player.root.position; if (!P) return;
  const show = G.on && !g.cut && !g.dying && g.running !== false && !g.survival && !(g.stepData && g.stepData.noGlow);
  const cam = g.camera, T = g.truck, list = G.list; list.length = 0;
  if (show) {
    const D = g.stepData || {}, py = Math.max(0, P.y || 0);
    // 1. pickups
    for (const p of g.pickups) { const l = p.l; if (l.drop || !p.mesh.parent) continue; const obj = !!(l.story || l.obj || l.kind === 'key' || l.kind === 'keycard' || l.kind === 'fuse'); const wp = p.mesh.position;
      list.push({ id: p, x: wp.x, y: wp.y, z: wp.z, hard: obj, icon: pickupIcon(l), pk: p, top: .75 }); }
    // 2. interact spots (search / use / talk / door / switch)
    (D.uses || []).forEach(u => { if (u.done || u.glow === false) return; const y = u.y != null ? u.y : (Math.hypot(u.x - P.x, u.z - P.z) < 40 ? py : (g.wpTarget && Math.hypot(g.wpTarget[0] - u.x, g.wpTarget[2] - u.z) < 4 ? Math.max(0, g.wpTarget[1] - 1.2) : py));
      list.push({ id: u, x: u.x, y: y + (u.model ? 1.0 : 0), z: u.z, hard: true, icon: useIcon(u), model: u.model, top: u.model ? .6 : 1.5, ground: y }); });
    // 3. go-here waypoint (skip when an interact spot already marks it)
    const w = g.wpTarget; if (w && !list.some(e => e.hard && Math.hypot(e.x - w[0], e.z - w[2]) < 3.5)) list.push({ id: 'wp', x: w[0], y: Math.max(0, (w[1] || 1.2) - 1.2), z: w[2], hard: true, icon: 'dest', top: 1.7, wp: true });
    // 4. the truck, when this step wants you to drive it
    if (D.canDrive && !T.driving && T.g) list.push({ id: 'truck', x: T.g.position.x, y: 0, z: T.g.position.z, hard: true, icon: 'drive', top: 2.6 });
  }
  // keep soft (loot) markers to the nearest 8
  let soft = list.filter(e => !e.hard).sort((a, b) => (a.x - P.x) ** 2 + (a.z - P.z) ** 2 - (b.x - P.x) ** 2 - (b.z - P.z) ** 2); soft.slice(8).forEach(e => e.skip = true);
  // retire entities that are gone
  const seen = new Set(list.filter(e => !e.skip).map(e => e.id)); for (const [id, e] of G.ents) if (!seen.has(id)) { if (id && id.m) pulseOff(id.m); freeEnt(G, e); G.ents.delete(id); }
  let si = 0; const sp = G.spark.geometry.attributes.position; const camPos = cam.position;
  const arrows = []; const W = innerWidth, H = innerHeight;
  for (const it of list) { if (it.skip) continue;
    let e = G.ents.get(it.id); if (!e) { e = makeEnt(G, it.hard); G.ents.set(it.id, e); e.icon = null; }
    const dx = it.x - P.x, dz = it.z - P.z, dist = Math.hypot(dx, dz, 0), far = it.hard ? 400 : 28; const vis = dist < far;
    e.grp.visible = vis; if (!vis) continue; e.grp.position.set(it.x, it.y, it.z);
    const pulse = .5 + .5 * Math.sin(t * 3.2 + (it.x + it.z) * .7), near = Math.min(1, Math.max(0, (dist - 1.4) / 2.6)); // 0 when on top of it
    const col = it.hard ? GOLD : SOFT;
    if (it.pk) pulseMeshes(it.pk.m, (it.hard ? .35 + .65 * pulse : .15 + .35 * pulse), col);
    // spinning model for search spots that hide a card / key
    if (it.model && !e.model) { e.model = it.model === 'key' ? keyModel() : cardModel(); e.model.scale.setScalar(1.7); e.model.userData.glowSkip = false; e.grp.add(e.model); e.model.position.y = 0; }
    if (e.model) { e.model.rotation.y = t * 1.8; e.model.position.y = Math.sin(t * 2) * .05; pulseMeshes(e.model, .4 + .6 * pulse, GOLD); }
    // halo around the item (fades when you are on top of it so the first-person view stays clear)
    const hs = it.model ? 1.1 : it.hard ? 1.35 : .8; e.halo.position.y = it.pk ? 0 : (it.model ? 0 : .2); e.halo.scale.setScalar(hs * (.9 + .25 * pulse)); e.halo.material.color.copy(col).multiplyScalar(1); e.halo.material.opacity = (it.hard ? .5 : .3) * (.6 + .4 * pulse) * (.15 + .85 * near);
    e.halo.visible = !it.wp && !(it.icon === 'use' || it.icon === 'talk') || !!it.model; // plain interact spots get the ground ring instead
    // light beam for objectives (not near, so it never fills the view)
    e.beam.visible = it.hard && dist > 5; if (it.hard) { e.beam.position.y = it.pk ? 4.1 : it.model ? 3.4 : 4.5; e.beam.material.opacity = .16 + .1 * pulse; }
    // floating marker (constant screen size, drawn over walls)
    if (e.icon !== it.icon + it.hard) { e.icon = it.icon + it.hard; e.mark.material.map = markerTex(it.icon, !it.hard); e.mark.material.needsUpdate = true; }
    const bob = Math.sin(t * 3) * .08; e.mark.position.y = it.top + (it.pk ? .25 : .1) + bob;
    const msz = (it.hard ? .13 : .085) * (.35 + .65 * Math.min(1, dist / 5)); e.mark.scale.set(msz, msz, 1); e.mark.material.opacity = (it.hard ? 1 : .8) * Math.min(1, Math.max(0, (dist - 1.2) / 2)); e.mark.visible = e.mark.material.opacity > .02;
    // sparkles
    if (it.hard && dist < 90 && si < G.sparkN) { for (let k = 0; k < 6; k++) { const a = t * 1.3 + k * 1.047, ph = ((t * .45 + k / 6) % 1), r = .42 * (1 - ph * .4); const i3 = (si * 6 + k) * 3;
        sp.array[i3] = it.x + Math.cos(a) * r; sp.array[i3 + 1] = it.y + (it.pk ? .1 : it.model ? 0 : .3) + ph * .9; sp.array[i3 + 2] = it.z + Math.sin(a) * r; } si++; }
    // edge arrow when off-screen (not for the go-here marker: the HUD waypoint already does that)
    if (it.hard && !it.wp && dist > 2) { _v.set(it.x, it.y + 1.2, it.z); _w.copy(_v).applyMatrix4(cam.matrixWorldInverse); const behind = _w.z > 0; _v.project(cam);
      if (behind || Math.abs(_v.x) > .93 || Math.abs(_v.y) > .9) arrows.push({ it, dist, dir: behind ? [-_w.x, -_w.y] : [_w.x, _w.y], d: dist }); } }
  // zero the unused sparkle slots
  for (let i = si * 6 * 3; i < sp.array.length; i++) sp.array[i] = 9999; sp.needsUpdate = true;
  arrows.sort((a, b) => a.d - b.d); G.arrows.forEach((el, i) => { const a = arrows[i]; if (!a) { el.style.display = 'none'; return; }
    let [dx, dy] = a.dir; const m = Math.hypot(dx, dy) || 1; dx /= m; dy /= m; const mx = 46, my = 58, s = Math.min((W / 2 - mx) / Math.max(.001, Math.abs(dx)), (H / 2 - my) / Math.max(.001, Math.abs(dy)));
    el.style.display = ''; el.style.left = (W / 2 + dx * s) + 'px'; el.style.top = (H / 2 - dy * s) + 'px'; el.firstChild.style.transform = `rotate(${Math.atan2(-dy, dx)}rad)`; el.lastChild.textContent = Math.round(a.d) + ' m'; });
}
