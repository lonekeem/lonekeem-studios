// Shared helpers for Chapters 21-24 (the Gray arc). Story-side only: the Gray infected (the Director's unfinished strain),
// Vance's Biscuit-dose dart rifle, small props (stop sign, lantern, strain tanks, floodlight generators, searchlights).
import * as THREE from 'three';
import { PI, rnd, dist2 } from './helpers.js';
import { ring } from './ch15_kit.js';

// ---------- the Gray: cool gray skin, pale eyes, a bit tougher and faster than the old infected ----------
const EYE = new THREE.MeshBasicMaterial({ color: '#dff4ff' }); const EYEG = new THREE.SphereGeometry(.011, 6, 5);
export function grayify(z, { eyes = true } = {}) { if (!z) return z; const u = z.mat && z.mat.userData && z.mat.userData.u;
  if (u) { if (u.uSkin) u.uSkin.value.set('#8e989e'); if (u.uGrime) u.uGrime.value = Math.max(u.uGrime.value, .55); if (u.uShirt && !z.boss) u.uShirt.value.lerp(new THREE.Color('#6a7076'), .5); if (u.uPants && !z.boss) u.uPants.value.lerp(new THREE.Color('#4a4e54'), .4); }
  if (eyes) { const hb = z.bone && z.bone('DEF-head'); if (hb) { [-1, 1].forEach(s => { const e = new THREE.Mesh(EYEG, EYE); e.position.set(s * .032, .045, .085); hb.add(e); }); } }
  z.gray = true; return z; }
export function spawnGray(g, x, z, o = {}) { const k = g.spawnZ(x, z, Object.assign({ runner: Math.random() < .45 }, o)); grayify(k); if (!o.boss) { k.hp = k.maxHp = Math.round((k.maxHp || k.hp) * 1.25); k.speed *= 1.08; } k.aggro = o.aggro || 60; return k; }
export function grayHorde(g, n, pts, o = {}) { const out = []; for (let i = 0; i < n; i++) { const p = pts[i % pts.length]; out.push(spawnGray(g, p[0] + rnd(-2.5, 2.5), p[1] + rnd(-2.5, 2.5), o)); } return out; }

// ---------- Vance's dart rifle: every `cd` s he darts the nearest Gray (stuns it); on a boss it opens a weak window ----------
export function dartTick(g, D, key, dt, { cd = 2.2, range = 22, stun = 2.2, dmg = 18, onBoss } = {}) { const c = D[key]; if (!c || !c.root || g.cut) return; const k = '_dcd_' + key; if ((D[k] = (D[k] || 0) - dt) > 0) return; D[k] = cd;
  const cp = c.root.position; let best = null, bd = range; g.alive().forEach(z => { if (z.ally) return; if (z.boss && !onBoss) return; const d = z.root.position.distanceTo(cp); if (d < bd) { bd = d; best = z; } }); if (!best) return;
  const dir = best.root.position.clone().sub(cp).normalize(); c.root.rotation.y = Math.atan2(dir.x, dir.z); if (c.lib && c.lib.clips && c.lib.clips.Pistol_Aim_Neutral) c.play('Pistol_Aim_Neutral');
  g.audio.shot && g.audio.shot('pistol'); if (best.boss) { onBoss && onBoss(best); return; } best.stun = Math.max(best.stun || 0, stun); g.damageZ(best, dmg, dir, { ai: true }); }

// ---------- props ----------
export function stopSign(c) { const T = THREE, G = new T.Group(); const pole = new T.Mesh(new T.CylinderGeometry(.012, .012, .9, 6), new T.MeshStandardMaterial({ color: '#c8c8c0', metalness: .5, roughness: .4 })); pole.position.y = .25; G.add(pole);
  const sign = new T.Mesh(new T.CylinderGeometry(.2, .2, .02, 8), new T.MeshStandardMaterial({ color: '#c8201a', roughness: .5 })); sign.rotation.x = PI / 2; sign.rotation.y = PI / 8; sign.position.y = .78; G.add(sign);
  const rim = new T.Mesh(new T.TorusGeometry(.19, .012, 4, 8), new T.MeshStandardMaterial({ color: '#f4f0e8', roughness: .5 })); rim.rotation.z = PI / 8; rim.position.set(0, .78, .012); G.add(rim);
  const bar = new T.Mesh(new T.BoxGeometry(.22, .05, .022), new T.MeshStandardMaterial({ color: '#f4f0e8', roughness: .5 })); bar.position.set(0, .78, .006); G.add(bar);
  G.rotation.set(-PI / 2, 0, 0); G.position.set(0, .04, .06); c.attach && c.attach('DEF-hand.R', G); return G; }
export function vest(c, col = '#f2d020') { const u = c.mat && c.mat.userData && c.mat.userData.u; if (u) { if (u.uShirt) u.uShirt.value.set(col); if (u.uJacket) u.uJacket.value.set(col); if (u.uStripe) u.uStripe.value = .6; } }
export function lantern(c) { const T = THREE, G = new T.Group(); const fr = new T.MeshStandardMaterial({ color: '#2a2a2a', metalness: .6, roughness: .5 });
  const glass = new T.Mesh(new T.CylinderGeometry(.06, .07, .16, 8), new T.MeshStandardMaterial({ color: '#ffb040', emissive: '#ff8a20', emissiveIntensity: 2.2, transparent: true, opacity: .85 })); G.add(glass);
  const top = new T.Mesh(new T.ConeGeometry(.08, .06, 8), fr); top.position.y = .11; G.add(top); const hd = new T.Mesh(new T.TorusGeometry(.05, .006, 4, 10, PI), fr); hd.position.y = .15; G.add(hd);
  G.position.set(0, -.12, .04); c.attach && c.attach('DEF-hand.L', G); return G; }
// a strain tank: steel cylinder with a sick gray-green glass window. returns {x,z,alive,kill()}
export function strainTank(ctx, x, z, { h = 2.4, r = .8 } = {}) { const T = ctx.THREE; const st = new T.MeshStandardMaterial({ color: '#7a8288', metalness: .6, roughness: .4 });
  const glow = new T.MeshStandardMaterial({ color: '#4a5a50', emissive: '#8ab0a0', emissiveIntensity: 1.1, roughness: .2, transparent: true, opacity: .85 });
  const body = new T.Mesh(new T.CylinderGeometry(r, r, h, 16), st); body.position.set(x, h / 2, z); ctx.scene.add(body); ctx.box(x - r, x + r, z - r, z + r);
  const win = new T.Mesh(new T.CylinderGeometry(r + .01, r + .01, h * .45, 16, 1, true, -.6, 1.2), glow); win.position.set(x, h * .5, z); ctx.scene.add(win);
  const cap = new T.Mesh(new T.SphereGeometry(r, 16, 8, 0, PI * 2, 0, PI / 2), st); cap.position.set(x, h, z); ctx.scene.add(cap);
  const valve = new T.Mesh(new T.TorusGeometry(.22, .04, 6, 14), new T.MeshStandardMaterial({ color: '#c8201a', roughness: .5 })); valve.position.set(x, 1.1, z + r + .08); ctx.scene.add(valve);
  const tk = { x, z, alive: true, body, win, valve, kill() { tk.alive = false; glow.emissiveIntensity = 0; glow.color.set('#1a1e1c'); valve.rotation.z = PI / 2; body.rotation.z = .06; } };
  ctx.updaters.push((dt, t) => { if (tk.alive) glow.emissiveIntensity = .9 + Math.sin(t * 2 + x) * .25; }); return tk; }
// a floodlight generator: box + mast + lamp head with a real light that starts OFF. returns {x,z,on,set(bool)}
export function floodGen(ctx, x, z, face = 0) { const T = ctx.THREE; const body = new T.MeshStandardMaterial({ color: '#c8a020', roughness: .6, metalness: .3 }), dk = new T.MeshStandardMaterial({ color: '#2a2a2a', metalness: .5, roughness: .5 });
  ctx.wallBox(1.6, 1, 1, body, x, .5, z); ctx.wallBox(.14, 5.2, .14, dk, x, 2.6, z - .3, false);
  const headM = new T.MeshStandardMaterial({ color: '#222', emissive: '#fff6e0', emissiveIntensity: 0 }); const head = new T.Mesh(new T.BoxGeometry(1.4, .5, .3), headM); head.position.set(x, 5.2, z - .3); head.rotation.y = face; head.rotation.x = .35; ctx.scene.add(head);
  const L = ctx.Z_pl(x + Math.sin(face) * 2, 4.6, z - .3 + Math.cos(face) * 2, '#fff2d8', 14, 30); if (L) L.intensity = 0; const G = { x, z, on: false, set(v) { G.on = v; headM.emissiveIntensity = v ? 3 : 0; if (L) L.intensity = v ? 14 : 0; } }; return G; }
// telegraphed line of rings from (x,z) toward (tx,tz) — a charge lane
export function lane(g, D, x, z, tx, tz, { n = 5, r = 1.6, life = 1.1, color = '#ff8a20', dmg = 22 } = {}) { const dx = tx - x, dz = tz - z, d = Math.hypot(dx, dz) || 1; for (let i = 1; i <= n; i++) { const k = i / n; ring(g, D, x + dx / d * Math.min(d + 3, 14) * k, z + dz / d * Math.min(d + 3, 14) * k, { r, life, color, dmg }); } }
// ---------- weather/air for a step: no rain lines, optional thinner fog. Both are put back by the next setLight() ----------
export function dry(g, fogK = 1) { try { const S = g.scene; if (!g._rainL) S.traverse(o => { if (!g._rainL && o.isLineSegments && o.material && o.material.color && o.material.color.getHexString() === '9fb0b0') g._rainL = o; });
  if (!g._dryPatched) { g._dryPatched = true; const orig = g.setLight.bind(g); g.setLight = (m) => { if (g._rainL) g._rainL.visible = true; return orig(m); }; }
  if (g._rainL) g._rainL.visible = false; if (fogK !== 1 && S.fog) S.fog.density *= fogK; } catch (e) { /* look only */ } }
export { PI, rnd, dist2 };
