// Chapters 19-20 helpers: Dad's hammer as a melee ally, jets, jammer masts, the river bridge.
import * as THREE from 'three';
import { mats, prop } from './common.js';
const PI = Math.PI;

// Dad walks up to the nearest zombie in range and swings the hammer (v1.9.59 hand grip; giveHammer is called by the chapter)
export function hammerTick(g, D, dt, { range = 11, dmg = 70, cd = 1.1, home = null } = {}) {
  const d = D.dad; if (!d || !d.root || g.cut) return; if (d.update && !D._hmFollow) D._hmFollow = d.update;
  D._hcd = (D._hcd || 0) - dt; const p = d.root.position; let best = null, bd = range;
  g.alive().forEach(z => { if (z.ally) return; const q = z.root.position, k = Math.hypot(q.x - p.x, q.z - p.z); if (k < bd) { bd = k; best = z; } });
  if (!best) { if (D._hm) { D._hm = false; if (D._hmFollow) d.update = D._hmFollow; } return; }
  if (!D._hm) { D._hm = true; d.update = null; }
  const q = best.root.position, dx = q.x - p.x, dz = q.z - p.z, k = Math.hypot(dx, dz) || 1; d.root.rotation.y = Math.atan2(dx, dz);
  if (k > 1.5) { const s = Math.min(k - 1.3, 4.2 * dt); p.x += dx / k * s; p.z += dz / k * s; d.play('Sprint_Loop'); }
  else if (D._hcd <= 0) { D._hcd = cd; d.play('Sword_Attack', { once: true, cb: () => d.play('Idle_Loop') }); setTimeout(() => { if (!best.dead) { g.damageZ(best, best.boss ? dmg * .6 : dmg, new THREE.Vector3(dx, 0, dz).normalize(), { ai: true, blade: true }); g.audio.thud && g.audio.thud(); } }, 260); }
}

// a small grey fighter jet; fly(g, J, from, to, secs)
export function jet(g, col = '#8a929a') { const T = THREE, G = new T.Group(), m = new T.MeshStandardMaterial({ color: col, metalness: .5, roughness: .4 }), dk = new T.MeshStandardMaterial({ color: '#2a3038', metalness: .4, roughness: .3 });
  const body = new T.Mesh(new T.CylinderGeometry(.45, .7, 9, 10), m); body.rotation.x = PI / 2; G.add(body);
  const nose = new T.Mesh(new T.ConeGeometry(.45, 2.4, 10), m); nose.rotation.x = PI / 2; nose.position.z = 5.7; G.add(nose);
  const wing = new T.Mesh(new T.BoxGeometry(9, .14, 3), m); wing.position.z = -.6; G.add(wing);
  const tail = new T.Mesh(new T.BoxGeometry(3.4, .12, 1.4), m); tail.position.z = -4; G.add(tail);
  const fin = new T.Mesh(new T.BoxGeometry(.12, 1.8, 1.6), m); fin.position.set(0, .9, -3.9); G.add(fin);
  const can = new T.Mesh(new T.SphereGeometry(.42, 10, 8), dk); can.scale.set(1, .8, 2.2); can.position.set(0, .45, 2.4); G.add(can);
  const glow = new T.Mesh(new T.CircleGeometry(.5, 12), new T.MeshBasicMaterial({ color: '#ffb060' })); glow.position.z = -4.55; glow.rotation.y = PI; G.add(glow);
  G.visible = false; g.scene.add(G); g.props.push(G); return G; }
export function fly(J, a, b, secs, onDone) { const t0 = performance.now(); J.visible = true; J.position.copy(a); J.lookAt(b); const iv = setInterval(() => { const k = Math.min(1, (performance.now() - t0) / (secs * 1000)); J.position.lerpVectors(a, b, k); if (k >= 1) { clearInterval(iv); J.visible = false; onDone && onDone(); } }, 16); }

// a jammer mast: steel lattice, a box, blinking red light. Returns {x, z, alive, kill()}
export function jammer(ctx, x, z) { const K = mats(ctx), T = ctx.THREE; prop(ctx, .3, 5, .3, K.steelDark, x, 2.5, z, true); prop(ctx, 1.4, 1, .9, K.steel, x, 1, z + .7, true);
  const red = new T.MeshStandardMaterial({ color: '#300', emissive: '#ff2a20', emissiveIntensity: 3 }); const tip = new T.Mesh(new T.SphereGeometry(.22, 10, 8), red); tip.position.set(x, 5.2, z); ctx.scene.add(tip);
  const dish = new T.Mesh(new T.CylinderGeometry(.7, .7, .12, 16), K.steel); dish.rotation.x = PI / 2; dish.position.set(x, 3.8, z + .3); ctx.scene.add(dish);
  const J = { x, z, alive: true, tip, red, kill() { J.alive = false; red.emissiveIntensity = 0; red.color.set('#222'); dish.rotation.z = .6; dish.position.y = 3.2; } };
  ctx.updaters.push((dt, t) => { if (J.alive) tip.visible = (t * 2.4 | 0) % 2 === 0; else tip.visible = true; }); return J; }
