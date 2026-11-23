// v1.9.87 Biscuit moments: in story gameplay, when Nia is with Keem, Biscuit (Nia's bunny) hops out of her hoodie and
// travels with the family. He hops a little ahead of Keem, sniffs out hidden supply crates in calm moments, and rears up
// and thumps when a fresh zombie threat closes in, with a small HUD cue that points at it. He has no collider and is not
// a target (he can't block Keem, can't be hurt), and he blinks back to Keem's side if he ever falls behind or gets boxed in.
// Cutscenes, scripted Biscuit scenes (Ch13 chase, stepData.B) and survival leave him in the hoodie.
import * as THREE from 'three';
import { makeRabbit } from './chars.js';
import { STORY, chOf } from './story.js';

const SC = 2.0, HOP = 5.4, FAST = 7.5, WARN_R = 13, CALM_R = 15;
const _v = new THREE.Vector3(), _f = new THREE.Vector3(), _rc = new THREE.Raycaster();
let cueEl = null, cueT = 0, tipShown = false;

function niaWithBunny(g) { for (const k in g.npcs) { const n = g.npcs[k]; if (n && n.biscuit && n.root && n.root.parent && n.root.visible !== false && !n.down && !n.isVictim) return n; } return null; }
function allowed(g) {
  const st = STORY[g.step]; if (!st || st.survival || g.pro || g.cut || g.dying || g.dead || (g.truck && g.truck.driving)) return null;
  const ch = chOf(g.step); if (ch === 13) return null; const D = g.stepData || {}; if (D.B || D.noBuddy) return null;
  const n = niaWithBunny(g); if (!n) return null; const P = g.player.root.position, q = n.root.position; if (Math.hypot(P.x - q.x, P.z - q.z) > 25) return null; return n;
}
function ground(g, x, z, y0) { // walkable floor near the player's height (rejects water, voids and roofs)
  _rc.camera = g.camera; _rc.set(_v.set(x, y0 + 2.2, z), _f.set(0, -1, 0)); _rc.far = 3.4; let hits; try { hits = _rc.intersectObjects(g.scene.children, true); } catch (e) { return null; }
  for (const h of hits) { const o = h.object; if (!o.isMesh || o.isSkinnedMesh || o.visible === false || (o.material && o.material.transparent)) continue; let a = o, skip = false; while (a) { if (a.userData && (a.userData.bud || a.userData.char)) { skip = true; break; } a = a.parent; } if (skip) continue; return Math.abs(h.point.y - y0) < .6 ? h.point.y : null; }
  return null;
}
function clearLine(g, ax, az, bx, bz, r = .2) { const d = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.ceil(d / .5)); for (let i = 1; i <= n; i++) { const k = i / n; if (g.inCol(ax + (bx - ax) * k, az + (bz - az) * k, r)) return false; } return true; }
function fwdOf(g) { const P = g.player.root.position, w = g.wpTarget; if (w && Math.hypot(w[0] - P.x, w[2] - P.z) > 3) { const a = Math.atan2(w[0] - P.x, w[2] - P.z); return a; } return g.player.root.rotation.y; }
function nearZ(g, x, z, r) { let best = null, bd = r; for (const zz of g.zombies) { if (!zz || zz.dead || zz.hp <= 0 || !zz.root) continue; const q = zz.root.position, d = Math.hypot(q.x - x, q.z - z); if (d < bd) { bd = d; best = zz; } } return best; }

function spawn(g, n) {
  const grp = new THREE.Group(), r = makeRabbit(); r.scale.setScalar(SC); r.position.y = .085 * SC; grp.add(r); grp.userData.bud = true;
  const ring = new THREE.Mesh(new THREE.RingGeometry(.3, .38, 24), new THREE.MeshBasicMaterial({ color: '#e8e2d6', transparent: true, opacity: 0, depthWrite: false })); ring.rotation.x = -Math.PI / 2; ring.position.y = .03; grp.add(ring);
  const q = n.root.position; grp.position.set(q.x + .35, g.player.root.position.y, q.z + .35); g.scene.add(grp);
  n.biscuit.visible = false; const B = { grp, r, ring, nia: n, st: 'sit', t: 0, mode: 'follow', mt: 0, hop: 0, sx: 0, sz: 0, sy: 0, tx: 0, tz: 0, ty: 0, hd: 1, hn: 1, sp: HOP, stuck: 0, nib: 0, warned: new WeakSet(), wcd: 3, calmT: 0, seekT: 18 + Math.random() * 10, found: (g.stepData && g.stepData._budFound) || 0, crate: null, near0: false };
  if (!tipShown && !(g.LS && g.LS.getItem && g.LS.getItem('atq3.budTip'))) { tipShown = true; try { g.LS.setItem('atq3.budTip', '1'); } catch (e) { /* ignore */ } setTimeout(() => g.toast && g.toast('Biscuit hopped out of Nia\'s hoodie! He sniffs out supplies and thumps when zombies get close.', 4.5), 600); }
  return B;
}
export function buddyReset(g) { const B = g._bud; if (!B) return; g.scene.remove(B.grp); B.grp.traverse(o => { if (o.geometry) o.geometry.dispose(); }); if (B.nia && B.nia.biscuit) B.nia.biscuit.visible = true; g._bud = null; hideCue(); }

function hopTo(B, x, z, y, sp = HOP) { const p = B.grp.position; B.st = 'hop'; B.sx = p.x; B.sz = p.z; B.sy = p.y; B.tx = x; B.tz = z; B.ty = y; B.hop = 0; B.hd = Math.max(.05, Math.hypot(x - p.x, z - p.z)); B.hn = Math.max(1, Math.round(B.hd / 1.1)); B.sp = sp; }
function blink(g, B) { // reappear beside/behind Keem (never in a wall)
  const P = g.player.root.position, a = g.player.root.rotation.y; for (const [da, d] of [[Math.PI * .75, 1.3], [-Math.PI * .75, 1.3], [Math.PI, 1.4], [Math.PI / 2, 1], [-Math.PI / 2, 1]]) { const x = P.x + Math.sin(a + da) * d, z = P.z + Math.cos(a + da) * d; if (!g.inCol(x, z, .25)) { B.grp.position.set(x, P.y, z); B.st = 'sit'; B.t = 0; B.stuck = 0; return; } }
  B.grp.position.set(P.x, P.y, P.z); B.st = 'sit';
}
function sound(g, kind) { const a = g.audio; if (!a || !a.ctx) return; try { a.at && a.at(g._bud && g._bud.grp.position); } catch (e) { /* ignore */ }
  if (kind === 'thump') { a.tone(78, .16, 'sine', .32, a.sfx, .004); a.noise(.12, 240, .22, 'lowpass', 1.2); }
  else if (kind === 'sniff') { for (let i = 0; i < 3; i++) setTimeout(() => a.noise(.07, 2600, .05, 'bandpass', 2.5), i * 110); }
  else if (kind === 'found') { [880, 1320].forEach((f, i) => setTimeout(() => a.tone(f, .16, 'triangle', .06, a.sfx, .004), i * 80)); } }

// ---------- HUD cue ----------
const ICON = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><ellipse cx="8.6" cy="6" rx="2.2" ry="5.2" fill="#f3e9dc"/><ellipse cx="15.4" cy="6" rx="2.2" ry="5.2" fill="#f3e9dc"/><ellipse cx="8.6" cy="6.4" rx="1" ry="3.6" fill="#e9a7b0"/><ellipse cx="15.4" cy="6.4" rx="1" ry="3.6" fill="#e9a7b0"/><circle cx="12" cy="15" r="7" fill="#f3e9dc"/><circle cx="9.4" cy="14" r="1.1" fill="#222"/><circle cx="14.6" cy="14" r="1.1" fill="#222"/><ellipse cx="12" cy="17" rx="1.2" ry=".8" fill="#e9a7b0"/></svg>';
function cue(text, kind, ang) {
  if (!cueEl) { cueEl = document.createElement('div'); cueEl.id = 'budCue'; cueEl.innerHTML = `<span class="bi">${ICON}</span><span class="bt"></span><span class="ba">➤</span>`; (document.getElementById('hud') || document.body).appendChild(cueEl); }
  cueEl.className = 'on ' + kind; cueEl.querySelector('.bt').textContent = text; const ar = cueEl.querySelector('.ba'); ar.style.display = ang == null ? 'none' : ''; if (ang != null) ar.style.transform = `rotate(${(ang * 180 / Math.PI - 90).toFixed(0)}deg)`; cueT = kind === 'warn' ? 2.6 : 3.4;
}
function hideCue() { if (cueEl) cueEl.className = ''; cueT = 0; }
function screenAng(g, x, z) { const c = g.camera; c.getWorldDirection(_f); _f.y = 0; _f.normalize(); const rx = -_f.z, rz = _f.x; const vx = x - c.position.x, vz = z - c.position.z; return Math.atan2(vx * rx + vz * rz, vx * _f.x + vz * _f.z); }

// ---------- supply crates ----------
let crateGeo = null, crateMats = null;
function crateMesh() { if (!crateGeo) { crateGeo = new THREE.BoxGeometry(.46, .3, .34); crateMats = { w: new THREE.MeshStandardMaterial({ color: '#8a6238', roughness: .85 }), s: new THREE.MeshStandardMaterial({ color: '#5e4124', roughness: .9 }), t: new THREE.MeshStandardMaterial({ color: '#d9cfb8', roughness: .8 }) }; }
  const m = new THREE.Group(), b = new THREE.Mesh(crateGeo, crateMats.w); m.add(b); [-.2, .2].forEach(x => { const s = new THREE.Mesh(new THREE.BoxGeometry(.04, .31, .35), crateMats.s); s.position.x = x; m.add(s); }); const lid = new THREE.Mesh(new THREE.BoxGeometry(.47, .03, .35), crateMats.s); lid.position.y = .16; m.add(lid); const tag = new THREE.Mesh(new THREE.PlaneGeometry(.16, .1), crateMats.t); tag.position.set(0, 0, .175); m.add(tag); m.scale.setScalar(1.3); m.position.y = -.1; return m; }
function pickSpot(g) {
  const P = g.player.root.position, a0 = fwdOf(g);
  for (let i = 0; i < 26; i++) { const a = a0 + (Math.random() - .5) * 2.2, d = 4.5 + Math.random() * 4.5, x = P.x + Math.sin(a) * d, z = P.z + Math.cos(a) * d;
    if (g.inCol(x, z, .6) || !clearLine(g, P.x, P.z, x, z, .25) || nearZ(g, x, z, 6)) continue; if (g.pickups.some(p => Math.hypot(p.mesh.position.x - x, p.mesh.position.z - z) < 1.5)) continue;
    const y = ground(g, x, z, P.y); if (y == null) continue; return [x, y, z]; }
  return null;
}
function lootFor(g) { const W = g.save, r = Math.random(); const cur = g.save.cur, w = (g.weapons || null);
  if (r < .45) { const owned = W.owned || []; const am = owned.includes('rifle') ? 'rifle' : owned.includes('shotgun') ? 'shell' : 'light'; const n = am === 'shell' ? 8 : am === 'rifle' ? 24 : 16; return { kind: 'ammo', item: am, n, label: n + ' ' + am + ' ammo' }; }
  if (r < .75) return { kind: 'med', label: 'a med kit' }; const n = 40 + ((Math.random() * 5) | 0) * 15; return { kind: 'cash', n, label: '$' + n }; }

// ---------- per frame ----------
export function buddyUpdate(g, dt) {
  if (cueT > 0 && (cueT -= dt) <= 0) hideCue();
  const n = allowed(g); let B = g._bud;
  if (!n) { if (B) buddyReset(g); return; }
  if (B && B.nia !== n) { buddyReset(g); B = null; }
  if (!B) B = g._bud = spawn(g, n);
  const P = g.player.root.position, p = B.grp.position; B.t += dt; B.mt += dt; if (B.wcd > 0) B.wcd -= dt;
  const dP = Math.hypot(P.x - p.x, P.z - p.z);
  // hop motion
  if (B.st === 'hop') { B.hop += dt * B.sp / B.hd; const k = Math.min(1, B.hop), x = B.sx + (B.tx - B.sx) * k, z = B.sz + (B.tz - B.sz) * k; if (g.inCol(x, z, .08)) { B.stuck++; blink(g, B); } else { p.set(x, B.sy + (B.ty - B.sy) * k + Math.abs(Math.sin(k * B.hn * Math.PI)) * .22, z); B.grp.rotation.y = Math.atan2(B.tx - B.sx, B.tz - B.sz); } B.r.rotation.x = -.15; if (k >= 1) { B.st = 'sit'; B.t = 0; p.y = B.ty; B.r.rotation.x = 0; } }
  if (dP > 13 || Math.abs(p.y - P.y) > 1.2) blink(g, B);
  // thump warning: a fresh zombie closing in (not every zombie in an ongoing fight)
  if ((B._sc = (B._sc || 0) + dt) > .35) { B._sc = 0; const z = nearZ(g, P.x, P.z, WARN_R), calm = !nearZ(g, P.x, P.z, CALM_R);
    if (z && !B.near0 && B.mode !== 'warn' && B.wcd <= 0 && !B.warned.has(z)) { B.warned.add(z); B.mode = 'warn'; B.mt = 0; B.wz = z; B.thumps = 0; if (B.st === 'hop') { B.st = 'sit'; p.y = B.ty; } B.wcd = 8; const q = z.root.position; cue('Thump! Zombie close', 'warn', screenAng(g, q.x, q.z)); }
    B.near0 = !!z; B.calmT = calm ? B.calmT + .35 : 0; }
  if (B.mode === 'warn') { const q = B.wz && B.wz.root ? B.wz.root.position : P; B.grp.rotation.y = Math.atan2(q.x - p.x, q.z - p.z); const k = Math.min(1, B.mt / .18); B.r.rotation.x = -.55 * k; B.r.position.y = .085 * SC + .05 * k; if (B.r.ears) B.r.ears.forEach(e => { e.rotation.x = -.35 * k; });
    const th = [.35, .78]; if (B.thumps < 2 && B.mt > th[B.thumps]) { B.thumps++; sound(g, 'thump'); B.ring.scale.setScalar(.6); B.ring.material.opacity = .7; B.r.position.y = .085 * SC; }
    if (B.mt > 1.5) { B.mode = 'follow'; B.r.rotation.x = 0; B.r.position.y = .085 * SC; if (B.r.ears) B.r.ears.forEach(e => { e.rotation.x = 0; }); } }
  if (B.ring.material.opacity > 0) { B.ring.material.opacity = Math.max(0, B.ring.material.opacity - dt * 1.6); B.ring.scale.multiplyScalar(1 + dt * 3.2); }
  // supply sniffing in calm moments
  if (B.mode === 'follow') { B.seekT -= dt; if (B.seekT <= 0 && B.calmT > 4 && B.found < 2 && !g.dlgCur) { const s = pickSpot(g); if (s) { B.mode = 'seek'; B.mt = 0; B.spot = s; hopTo(B, s[0], s[2], s[1], FAST); cue('Biscuit smells something…', 'sniff', null); } else B.seekT = 6; } }
  if (B.mode === 'seek') { if (B.st === 'sit') { B.mode = 'sniff'; B.mt = 0; sound(g, 'sniff'); } else if (B.mt > 4) { B.mode = 'follow'; B.seekT = 20; } }
  if (B.mode === 'sniff') { B.r.rotation.x = Math.max(0, Math.sin(B.mt * 16)) * .25; if (B.r.head) B.r.head.rotation.y = Math.sin(B.mt * 5) * .4; if (B.mt > .45 && B.mt - dt <= .45) sound(g, 'sniff');
    if (B.mt > 1.4) { B.r.rotation.x = 0; if (B.r.head) B.r.head.rotation.y = 0; const s = B.spot, L = lootFor(g); const l = { kind: L.kind, item: L.item, n: L.n, pos: [s[0] + .35, s[1] + .27, s[2]], mk: crateMesh, bud: true }; g.addPickup(l); const pk = g.pickups[g.pickups.length - 1]; B.crate = pk; B.found++; if (g.stepData) g.stepData._budFound = B.found; sound(g, 'found'); cue('Biscuit found a supply crate!', 'found', screenAng(g, s[0], s[2])); B.mode = 'guard'; B.mt = 0; } }
  if (B.mode === 'guard') { const gone = !B.crate || !g.pickups.includes(B.crate); if (gone || B.mt > 22 || dP > 11 || nearZ(g, p.x, p.z, 5)) { if (gone && B.crate) { /* collected */ } B.crate = null; B.mode = 'follow'; B.seekT = 55 + Math.random() * 30; } else { B.grp.rotation.y = Math.atan2(P.x - p.x, P.z - p.z); B.nib += dt * 7; if (B.r.head) B.r.head.rotation.x = Math.max(0, Math.sin(B.nib)) * .2; } }
  // follow: hop to a spot a little ahead of Keem, off to the side so he never sits in the way
  if (B.mode === 'follow' && B.st === 'sit' && B.t > .2) { const a = fwdOf(g), side = ((B._side = B._side || (Math.random() < .5 ? -1 : 1))); let tx = P.x + Math.sin(a) * 2.2 + Math.sin(a + Math.PI / 2) * .9 * side, tz = P.z + Math.cos(a) * 2.2 + Math.cos(a + Math.PI / 2) * .9 * side;
    if (g.inCol(tx, tz, .25) || !clearLine(g, P.x, P.z, tx, tz)) { B._side = -side; tx = P.x + Math.sin(a + Math.PI * .8 * side) * 1.4; tz = P.z + Math.cos(a + Math.PI * .8 * side) * 1.4; }
    const d = Math.hypot(tx - p.x, tz - p.z);
    if (d > 1.1) { if (!clearLine(g, p.x, p.z, tx, tz, .1)) { if (++B.stuck > 2) blink(g, B); else B.t = -.3; } else { const k = Math.min(1, 4 / d); hopTo(B, p.x + (tx - p.x) * k, p.z + (tz - p.z) * k, P.y, dP > 5 ? FAST : HOP); B.stuck = 0; } }
    else { B.grp.rotation.y += (a - B.grp.rotation.y) * Math.min(1, dt * 2); B.nib += dt * 6; if (B.r.head) B.r.head.rotation.x = Math.max(0, Math.sin(B.nib)) * .18; } }
}
if (typeof window !== 'undefined') window.__atqBud = { reset: buddyReset };
