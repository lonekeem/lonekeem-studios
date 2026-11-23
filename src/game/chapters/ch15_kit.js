// Shared helpers for Chapters 15-20 (owned by the ch15-20 builder). Story-side only: cutscene walking, cast placement,
// Harbor Authority troopers, ally gunfire, telegraphed blast rings, a hold timer, and small props (lobster suit, helicopter).
import * as THREE from 'three';
import { PI, V, dist2, follow } from './helpers.js';
import { act } from './ch12_acting.js';
import { dnState } from '../daynight.js';
export { act };

// ---------- cutscene movement (same pattern as ch14) ----------
export function walk(D, c, x, z, o = {}) { (D.mv = D.mv || []).push({ c, x, z, sp: o.sp || 1.5, anim: o.anim || 'Walk_Loop', end: o.end || 'Idle_Loop', face: o.face, cb: o.cb }); }
export function tickMv(g, D, dt) { if (!D.mv) return; D.mv = D.mv.filter(m => { if (!m.c || !m.c.root) return false; const p = m.c.root.position, dx = m.x - p.x, dz = m.z - p.z, d = Math.hypot(dx, dz);
  if (d < .06) { m.c.play(m.end); if (m.face != null) m.c.root.rotation.y = m.face; if (m.c === g.player && g.cut) { g.cut.anim = m.end; g.cut.animSpeed = 1; } m.cb && m.cb(g); return false; }
  const s = Math.min(d, m.sp * dt); p.x += dx / d * s; p.z += dz / d * s; m.c.root.rotation.y = Math.atan2(dx, dz); const ns = m.c.natSpeed ? m.c.natSpeed(m.anim) : 0, rate = ns ? Math.max(.5, Math.min(2.2, m.sp / ns)) : 1;
  m.c.play(m.anim, { speed: rate }); if (m.c === g.player && g.cut) { g.cut.anim = m.anim; g.cut.animSpeed = rate; } return true; }); }
export const cam = (g, c, l) => { g.cut = Object.assign(g.cut || { anim: 'Idle_Loop', flash: false }, { cam: c, look: l }); };
export const snap = (g) => { if (g.cut && g.cut.cam) g.camera.position.copy(g.cut.cam); g._lk = null; };
const cbq = (g, f) => g.dlgQ.push({ cb: f });
// items: [who, text] lines or (g) => {} callbacks, run in order
export function script(g, items) { items.forEach(it => typeof it === 'function' ? (g.dlgCur || g.dlgQ.length ? cbq(g, it) : it(g)) : g.say([it])); }
export const face = (c, x, z) => { if (c) c.root.rotation.y = Math.atan2(x - c.root.position.x, z - c.root.position.z); };

// ---------- the cast ----------
export const LOOK = {
  danny: { rig: 'genm', outfit: 'camo', hair: 'buzz', hairColor: '#5a3a22', skin: '#d9a98c', face: 'narrow', eyes: '#3a5a7a', beard: 'none', build: .94, seed: 151 },
  harlow: { rig: 'raider', outfit: 'tactical', hair: 'buzz', hairColor: '#aaa69e', skin: '#e6b89a', face: 'strong', eyes: '#5a6a8a', beard: 'mustache', build: 1.15, seed: 152 },
  director: { rig: 'genf', outfit: 'trench', hair: 'bun', hairColor: '#d8d4cc', skin: '#e6c4ac', face: 'narrow', eyes: '#5a6a8a', beard: 'none', build: 1, seed: 153 },
};
// places any of: dad nia mom reyes tuck danny dube around (x,z) facing rot; returns D with refs
export function cast(g, D, x, z, who = ['dad', 'nia', 'mom'], rot = PI) {
  const off = { dad: [1.6, 1.4], nia: [-1.4, 1.3], mom: [-2.4, 2.2], reyes: [2.6, 2.4], tuck: [3.4, 1.2], danny: [-3.4, 1.0], dube: [0.4, 3.0] };
  const id = { dad: ['marcus', 'marcus'], nia: ['nia', 'nia'], mom: ['dana', 'dana'], reyes: ['reyes', 'reyes'], tuck: ['tuck', 'tuck'], danny: ['danny', LOOK.danny], dube: ['dube', 'dube'] };
  who.forEach(k => { if (D[k]) return; const o = off[k], [key, look] = id[k]; D[k] = g.npc(key, look, x + o[0], z + o[1], rot, 'Idle_Loop', k === 'nia' ? .62 : .98); if (k === 'danny' && D.lobster !== false) lobsterSuit(D[k]); });
  return D;
}
const FOFF = { dad: [1.6, 1.2], nia: [-1.2, .9], mom: [-1.8, 1.7], reyes: [2.4, 2.0], tuck: [2.8, .4], danny: [-2.8, .6], dube: [.6, 2.6] };
export function followAll(g, D, who) { (who || Object.keys(FOFF)).forEach(k => { if (D[k]) follow(g, D[k], FOFF[k]); }); }
export function freeze(D, who) { (who || Object.keys(FOFF)).forEach(k => { if (D[k]) D[k].update = null; }); }
export function place(c, x, z, rot) { if (!c) return; c.update = null; c.root.position.set(x, 0, z); if (rot != null) c.root.rotation.y = rot; c.play('Idle_Loop'); }

// ---------- Harbor Authority ----------
export function paintAuth(z, shirt = '#c5ccd4', pants = '#2a3038') { const u = z.mat && z.mat.userData && z.mat.userData.u; if (!u) return; if (u.uShirt) u.uShirt.value.set(shirt); if (u.uJacket) u.uJacket.value.set(shirt); if (u.uPants) u.uPants.value.set(pants); if (u.uBlood) u.uBlood.value = .08; if (u.uGrime) u.uGrime.value = .15; }
export function shieldOn(z, big = false, col = '#c8ced6') { const T = THREE, gr = new T.Group(); const m = new T.MeshStandardMaterial({ color: col, metalness: .55, roughness: .35 });
  const plate = new T.Mesh(new T.BoxGeometry(big ? .55 : .42, big ? .9 : .75, .05), m); gr.add(plate);
  const rim = new T.Mesh(new T.BoxGeometry(big ? .6 : .46, big ? .96 : .8, .02), new T.MeshStandardMaterial({ color: '#3a4048', metalness: .6, roughness: .4 })); rim.position.z = -.02; gr.add(rim);
  const win = new T.Mesh(new T.BoxGeometry(big ? .3 : .24, .08, .055), new T.MeshStandardMaterial({ color: '#0c1a24', roughness: .15, metalness: .3 })); win.position.y = big ? .28 : .22; gr.add(win);
  gr.rotation.set(0, -.15, .15); gr.position.set(.02, .05, .12); z.attach && z.attach('DEF-hand.L', gr); z.shield = gr; return gr; }
export function helmOn(b, shellCol = '#2a3138') { const T = THREE, h = new T.Group();
  const shell = new T.MeshStandardMaterial({ color: shellCol, metalness: .72, roughness: .3 }), rimM = new T.MeshStandardMaterial({ color: '#1a1e22', metalness: .65, roughness: .4 });
  const visM = new T.MeshStandardMaterial({ color: '#081018', metalness: .25, roughness: .12, transparent: true, opacity: .78, emissive: '#153040', emissiveIntensity: .45 });
  const cap = new T.Mesh(new T.SphereGeometry(1, 20, 14, 0, PI * 2, 0, PI * .64), shell); cap.scale.set(.118, .092, .112); cap.position.set(0, -.012, .006); cap.rotation.x = -.32; h.add(cap);
  const brow = new T.Mesh(new T.TorusGeometry(1, .07, 6, 22, PI * 1.15), rimM); brow.scale.set(.1, .055, .055); brow.rotation.set(1.2, 0, 0); brow.position.set(0, -.028, .055); h.add(brow);
  const vis = new T.Mesh(new T.SphereGeometry(1, 18, 10, -0.9, 1.8, 0.52, 0.58), visM); vis.scale.set(.112, .082, .108); vis.position.set(0, -.02, .018); vis.rotation.x = -.22; h.add(vis);
  const hb = b.bone && b.bone('DEF-head'); if (hb) hb.add(h); else if (b.attach) b.attach('DEF-head', h); b.helm = h; return h; }
export function spawnAuth(g, x, z, o = {}) { const r = g.spawnZ(x, z, { raider: true, gun: o.gun || 'rifle', shirt: o.shirt || '#c5ccd4', hp: o.hp || 110 }); paintAuth(r, o.shirt || '#c5ccd4'); if (o.shield !== false) shieldOn(r, !!o.big); r.aggro = 40; return r; }
// a whole squad at points
export function squad(g, pts, o = {}) { const guns = ['rifle', 'smg', 'shotgun', 'rifle', 'smg', 'pistol']; return pts.map(([x, z], i) => spawnAuth(g, x, z, Object.assign({ gun: guns[i % guns.length], shield: i % 2 === 0 }, o))); }

// ---------- allies that shoot (Dad, Reyes, Tuck...) ----------
export function allyTick(g, D, key, dt, { dmg = 40, cd = 1, range = 20, stun = 0, sound = 'pistol', anim = 'Pistol_Aim_Neutral' } = {}) {
  const c = D[key]; if (!c || !c.root || g.cut) return; const k = '_acd_' + key; if ((D[k] = (D[k] || 0) - dt) > 0) return; D[k] = cd;
  const cp = c.root.position; let best = null, bd = range; g.alive().forEach(z => { if (z === c || z.ally) return; const d = z.root.position.distanceTo(cp); if (d < bd) { bd = d; best = z; } }); if (!best) return;
  const dir = best.root.position.clone().sub(cp).normalize(); c.root.rotation.y = Math.atan2(dir.x, dir.z); if (anim && c.lib && c.lib.clips && c.lib.clips[anim]) c.play(anim);
  g.damageZ(best, best.boss ? dmg * .35 : dmg, dir, { ai: true, head: Math.random() < .25 }); if (stun && !best.boss) best.stun = Math.max(best.stun || 0, stun); g.audio.shot && g.audio.shot(sound); }

// ---------- telegraphed blast ring: shows for `life`s then hits whoever is inside ----------
export function ring(g, D, x, z, { r = 2.2, life = 1.4, color = '#ff3a28', dmg = 22, onHit, boom = false } = {}) {
  const m = new THREE.Mesh(new THREE.RingGeometry(r * .7, r, 40), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .8, side: THREE.DoubleSide, depthWrite: false }));
  m.rotation.x = -PI / 2; m.position.set(x, .16, z); g.scene.add(m); g.props.push(m); (D.rings = D.rings || []).push({ m, x, z, r, t: 0, life, dmg, onHit, boom }); return m; }
export function tickRings(g, D, dt) { if (!D.rings) return; D.rings = D.rings.filter(R => { R.t += dt; R.m.material.opacity = .85 - (R.t / R.life) * .5; R.m.scale.setScalar(1 + R.t * .1);
  if (R.t < R.life) return true; g.scene.remove(R.m); const inside = dist2(g, R.x, R.z) < R.r && !(g.state.roll > 0);
  if (inside) { g.hurt(R.dmg, { x: R.x, z: R.z }); R.onHit && R.onHit(g); } g.shake(.25); (R.boom && g.audio.boom) ? g.audio.boom() : g.audio.thud && g.audio.thud(); return false; }); }

// ---------- hold-the-line timer ----------
export function holdTick(g, D, dt, secs, label, onDone) { if (D.held) return; D.ht = (D.ht || 0) + (g.cut || g.dlgCur ? 0 : dt); const left = Math.max(0, Math.ceil(secs - D.ht));
  if (left !== D._hl) { D._hl = left; g.objective(label + ' · ' + Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0'), D.holdHint || 'Stay alive. Keep them off the family.'); }
  if (D.ht >= secs) { D.held = true; onDone && onDone(); } }
// keep `n` enemies alive from spawn points while a hold runs
export function keepUp(g, D, dt, n, fn, every = 2.2) { D._ku = (D._ku || 0) - dt; if (D._ku > 0) return; D._ku = every; if (g.alive().filter(z => !z.boss && !z.ally).length < n) fn(); }

// ---------- props ----------
const red = () => new THREE.MeshStandardMaterial({ color: '#d0301e', roughness: .45 });
// Danny's lobster mascot suit: a red hood with eyes on stalks and two big foam claws
export function lobsterSuit(c, big = 1) { const T = THREE, M = red(), dark = new T.MeshStandardMaterial({ color: '#1a1a1a', roughness: .5 }), cream = new T.MeshStandardMaterial({ color: '#f2d9b0', roughness: .7 });
  const hood = new T.Group(); const cap = new T.Mesh(new T.SphereGeometry(1, 18, 12, 0, PI * 2, 0, PI * .6), M); cap.scale.set(.135, .12, .135); cap.position.set(0, .01, -.01); hood.add(cap);
  [-1, 1].forEach(s => { const st = new T.Mesh(new T.CylinderGeometry(.008, .01, .11, 6), M); st.position.set(s * .045, .13, .03); st.rotation.z = -s * .25; hood.add(st); const e = new T.Mesh(new T.SphereGeometry(.025, 10, 8), dark); e.position.set(s * .06, .19, .035); hood.add(e);
    const an = new T.Mesh(new T.CylinderGeometry(.004, .006, .32, 5), M); an.position.set(s * .03, .2, -.06); an.rotation.set(-.6, 0, -s * .5); hood.add(an); });
  const hb = c.bone && c.bone('DEF-head'); if (hb) hb.add(hood); else c.attach && c.attach('DEF-head', hood);
  ['L', 'R'].forEach(sd => { const cl = new T.Group(); const a = new T.Mesh(new T.SphereGeometry(1, 12, 8), M); a.scale.set(.07 * big, .05 * big, .13 * big); a.position.set(sd === 'L' ? .03 : -.03, 0, .06 * big); a.rotation.y = sd === 'L' ? .25 : -.25; cl.add(a);
    const b = new T.Mesh(new T.SphereGeometry(1, 10, 8), M); b.scale.set(.045 * big, .035 * big, .1 * big); b.position.set(sd === 'L' ? -.035 : .035, 0, .1 * big); cl.add(b);
    const ins = new T.Mesh(new T.SphereGeometry(1, 8, 6), cream); ins.scale.set(.03 * big, .028 * big, .07 * big); ins.position.set(0, -.012, .09 * big); cl.add(ins); c.attach && c.attach('DEF-hand.' + sd, cl); });
  // tail flap on the back
  const tail = new T.Mesh(new T.ConeGeometry(.16, .34, 8), M); tail.rotation.x = 2.6; tail.position.set(0, -.12, -.16); c.attach && c.attach('DEF-spine.003', tail); c.lobster = true; return hood; }
// a light utility helicopter (original design, no markings). returns { g, rotor, tail, spin(v) }
export function heli(g, x, z, rot = 0, col = '#3d4a3a') { const T = THREE, G = new T.Group(); const body = new T.MeshStandardMaterial({ color: col, roughness: .55, metalness: .25 }), dark = new T.MeshStandardMaterial({ color: '#1e2226', roughness: .6, metalness: .4 });
  const glass = new T.MeshStandardMaterial({ color: '#7fb2c8', roughness: .08, metalness: .3, transparent: true, opacity: .55, emissive: '#183040', emissiveIntensity: .3 }), stripe = new T.MeshStandardMaterial({ color: '#e0b020', roughness: .5 });
  const cab = new T.Mesh(new T.SphereGeometry(1, 24, 16), body); cab.scale.set(1.3, 1.15, 2.1); cab.position.y = 1.6; cab.castShadow = true; G.add(cab);
  const nose = new T.Mesh(new T.SphereGeometry(1, 20, 14, 0, PI * 2, 0, PI * .5), glass); nose.scale.set(1.2, 1.05, 1.5); nose.rotation.x = PI / 2.2; nose.position.set(0, 1.75, 1.05); G.add(nose);
  const side = new T.Mesh(new T.BoxGeometry(2.66, .7, 1.2), glass); side.position.set(0, 2.0, -.1); G.add(side);
  const band = new T.Mesh(new T.BoxGeometry(2.64, .14, 2.6), stripe); band.position.set(0, 1.25, -.2); G.add(band);
  const boom = new T.Mesh(new T.CylinderGeometry(.18, .38, 5.2, 12), body); boom.rotation.x = PI / 2; boom.position.set(0, 2.0, -4.2); G.add(boom);
  const fin = new T.Mesh(new T.BoxGeometry(.12, 1.4, .9), body); fin.position.set(0, 2.6, -6.6); fin.rotation.x = -.3; G.add(fin);
  const stab = new T.Mesh(new T.BoxGeometry(1.6, .08, .5), body); stab.position.set(0, 2.0, -6.2); G.add(stab);
  const tr = new T.Group(); tr.position.set(.18, 2.7, -6.7); [0, PI / 2].forEach(a => { const bl = new T.Mesh(new T.BoxGeometry(.04, 1.2, .14), dark); bl.rotation.x = a; tr.add(bl); }); G.add(tr);
  const mast = new T.Mesh(new T.CylinderGeometry(.14, .2, .55, 10), dark); mast.position.set(0, 2.95, 0); G.add(mast);
  const rotor = new T.Group(); rotor.position.set(0, 3.25, 0); for (let i = 0; i < 4; i++) { const bl = new T.Mesh(new T.BoxGeometry(.32, .05, 5.6), dark); bl.position.z = 2.8; const arm = new T.Group(); arm.rotation.y = i * PI / 2; arm.add(bl); rotor.add(arm); } G.add(rotor);
  [-1, 1].forEach(s => { const sk = new T.Mesh(new T.CylinderGeometry(.07, .07, 4.2, 8), dark); sk.rotation.x = PI / 2; sk.position.set(s * 1.05, .1, .1); G.add(sk); [-1, 1].forEach(f => { const st = new T.Mesh(new T.CylinderGeometry(.05, .05, .7, 6), dark); st.position.set(s * .95, .45, f * 1.1); st.rotation.z = s * .25; G.add(st); }); });
  const lamp = new T.Mesh(new T.SphereGeometry(.08, 8, 6), new T.MeshStandardMaterial({ color: '#300', emissive: '#ff2a1a', emissiveIntensity: 3 })); lamp.position.set(0, 3.0, -6.9); G.add(lamp);
  G.position.set(x, 0, z); G.rotation.y = rot; g.scene.add(G); g.props.push(G);
  const H = { g: G, rotor, tail: tr, v: 0, spin(v) { H.v = v; }, tick(dt) { rotor.rotation.y += H.v * dt; tr.rotation.x += H.v * 1.7 * dt; lamp.visible = (performance.now() / 600 | 0) % 2 === 0; } }; return H; }
// a short-lived gunfire streak from a to b
export function tracerLine(g, a, b) { const geo = new THREE.BufferGeometry().setFromPoints([a, b]); const l = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: '#ffd27a', transparent: true, opacity: .9 })); g.scene.add(l); g.props.push(l); setTimeout(() => { g.scene.remove(l); geo.dispose(); }, 110); }
// cheap blur disc shown when the rotor is fast
export function rotorBlur(H) { const m = new THREE.Mesh(new THREE.CircleGeometry(5.6, 32), new THREE.MeshBasicMaterial({ color: '#1a1e22', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide })); m.rotation.x = -PI / 2; m.position.y = 3.27; H.g.add(m); H.blur = m; return m; }

// ---------- dawn grade (used from Ch 19's end on): warm the sky + fill while a step runs. setLight() resets it on the next step. ----------
export function dawn(g, k = 1) { try { const S = g.scene, sky = g.world && g.world.env && g.world.env.sky, U = sky && sky.material.uniforms;
  if (!g._dawn0) { // remember the story night look once, and put it back the next time a step sets its light
    if (!g._rainL) S.traverse(o => { if (!g._rainL && o.isLineSegments && o.material && o.material.color && o.material.color.getHexString() === '9fb0b0') g._rainL = o; });
    g._dawn0 = { hor: U && U.uHor.value.clone(), zen: U && U.uZen.value.clone(), moon: U && U.uMoon.value.clone(), day: U && U.uDay ? U.uDay.value : 0, mc: g.moon && g.moon.color.clone(), exp: g.renderer.toneMappingExposure, rain: g._rainL ? g._rainL.material.opacity : 0 };
    if (!g._dawnPatched) { g._dawnPatched = true; const orig = g.setLight.bind(g); g.setLight = (m) => { const o = g._dawn0; if (o) { if (U) { U.uHor.value.copy(o.hor); U.uZen.value.copy(o.zen); U.uMoon.value.copy(o.moon); if (U.uDay) U.uDay.value = o.day; } if (g.moon && o.mc) g.moon.color.copy(o.mc); if (g._rainL) g._rainL.material.opacity = o.rain; g._dawn0 = null; } return orig(m); }; } }
  const D = dnState(.235 + .07 * k, g._dawnS || (g._dawnS = {}));
  if (U) { U.uHor.value.copy(D.hor); U.uZen.value.copy(D.zen); U.uMoon.value.copy(D.sunDir); if (U.uDay) U.uDay.value = D.dayK; }
  if (g._rainL) g._rainL.material.opacity = Math.max(0, .32 * (1 - k * 1.6));
  g.hemi.color.copy(D.hs); g.hemi.groundColor.copy(D.hg); g.hemi.intensity = .9 + 1.0 * D.dayK;
  if (g.moon) { g.moon.color.copy(D.sun); g.moon.intensity = .5 + 1.6 * Math.min(1, Math.max(0, (D.e + .05) / .35)); }
  if (S.fog) { S.fog.color.copy(D.fog); } S.environmentIntensity = .3 + .5 * D.dayK; } catch (e) { /* lighting only */ } }

// a big full-screen title card (finale + chapter beats)
export function card(lines, ms = 3200, sub = '') { let el = document.getElementById('atqCard'); if (!el) { el = document.createElement('div'); el.id = 'atqCard'; el.style.cssText = 'position:fixed;inset:0;z-index:41;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(6,6,8,.82);color:#f4ead8;font-family:Georgia,serif;text-align:center;pointer-events:none;opacity:0;transition:opacity .6s'; document.body.appendChild(el); }
  el.innerHTML = `<div style="font-size:clamp(26px,5vw,46px);letter-spacing:.06em;text-shadow:0 2px 10px #000">${lines}</div>${sub ? `<div style="margin-top:12px;font:600 clamp(12px,2.2vw,16px) system-ui;letter-spacing:.2em;color:#c9b89a">${sub}</div>` : ''}`; requestAnimationFrame(() => el.style.opacity = '1'); clearTimeout(el._t); el._t = setTimeout(() => el.style.opacity = '0', ms); }
export function hideCard() { const el = document.getElementById('atqCard'); if (el) el.style.opacity = '0'; }
export { PI, V, dist2 };
