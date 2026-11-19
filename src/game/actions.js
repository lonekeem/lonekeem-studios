// v2.1 story actions: characters visibly ACT OUT what the dialogue says. Three parts:
//  1) procedural arm/head poses layered on the mannequin skeleton after the animation mixer (so they ride on any clip and retarget onto the avatar),
//  2) a rolled-sleeve + bite-wound overlay hung on the avatar's forearm (the sleeve cuff really rolls up, bare skin and the bite appear),
//  3) line cues: text rules + explicit tags map each spoken line to an action for its speaker (and sometimes the listener).
import * as THREE from 'three';
import { sampleColor } from './avatar.js';
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const sstep = (t) => { t = Math.min(1, Math.max(0, t)); return t * t * (3 - 2 * t); };

// ---------- 1. procedural poses (rotations in mannequin bone-local space, [x,y,z] radians at full weight) ----------
export const POSES = {
  // left arm presented forward with the elbow bent, palm up: "show me the arm"
  showL: { 'DEF-upper_arm.L': [-0.35, 0, 0.1], 'DEF-forearm.L': [-2.1, 0, 0] },
  // right hand working the left sleeve: both forearms up in front of the chest
  rollL: { 'DEF-upper_arm.L': [-0.5, 0, 0.1], 'DEF-forearm.L': [-1.6, 0, 0], 'DEF-upper_arm.R': [-0.6, 0, -0.15], 'DEF-forearm.R': [-1.7, 0, 0] },
  // hiding the injured left arm against the belly
  guardL: { 'DEF-upper_arm.L': [-0.25, 0, 0.1], 'DEF-forearm.L': [-1.25, 0, 0.3] },
  pointR: { 'DEF-upper_arm.R': [-1.45, 0, -0.1], 'DEF-forearm.R': [-0.12, 0, 0] },
  pointL: { 'DEF-upper_arm.L': [-1.45, 0, 0.1], 'DEF-forearm.L': [-0.12, 0, 0] },
  offerR: { 'DEF-upper_arm.R': [-0.95, 0, -0.1], 'DEF-forearm.R': [-0.7, 0, 0] },
  shrug: { 'DEF-upper_arm.L': [-0.2, 0, 0.5], 'DEF-upper_arm.R': [-0.2, 0, -0.5], 'DEF-forearm.L': [-0.9, 0, 0], 'DEF-forearm.R': [-0.9, 0, 0] },
  hugArms: { 'DEF-upper_arm.L': [-1.0, 0, 0.45], 'DEF-upper_arm.R': [-1.0, 0, -0.45], 'DEF-forearm.L': [-0.8, 0, 0], 'DEF-forearm.R': [-0.8, 0, 0] },
  coverEars: { 'DEF-upper_arm.L': [-0.3, 0, 0.35], 'DEF-upper_arm.R': [-0.3, 0, -0.35], 'DEF-forearm.L': [-2.2, 0, 0], 'DEF-forearm.R': [-2.2, 0, 0] },
  headHands: { 'DEF-upper_arm.L': [-0.4, 0, 0.3], 'DEF-upper_arm.R': [-0.4, 0, -0.3], 'DEF-forearm.L': [-2.3, 0, 0], 'DEF-forearm.R': [-2.3, 0, 0] },
};
// head-only behaviours (yaw sweeps etc.): fn(t) -> [pitch, yaw]
export const HEADS = {
  look: (t) => [0.02, Math.sin(t * 1.5) * 0.85],
  scan: (t) => [0.05, Math.sin(t * 2.1) * 1.0],
  down: () => [0.45, 0],
  up: () => [-0.3, 0],
  nod: (t) => [0.15 + Math.sin(t * 7) * 0.14, 0],
  shake: (t) => [0.02, Math.sin(t * 8) * 0.35],
};
const _q = new THREE.Quaternion(), _e = new THREE.Euler();
// act = { pose, head, w (current weight), to (target), t, yawTo }
export function actStart(c, o) { const a = c.ax || (c.ax = { w: 0, to: 0, t: 0 }); a.pose = o.pose || null; a.head = o.head || null; a.to = 1; a.t = 0; a.dur = o.dur || 0; a.hold = o.hold || false; a.sp = o.sp || 1; return a; }
export function actStop(c) { if (c.ax) c.ax.to = 0; }
export function actTick(c, dt) { const a = c.ax; if (!a) return; a.t += dt; if (a.dur && a.t > a.dur && !a.hold) a.to = 0; a.w += (a.to - a.w) * Math.min(1, dt * (a.to > a.w ? 5 * a.sp : 4));
  if (a.w < 0.004 && a.to === 0) { a.pose = a.head = null; c.ax = null; return; }
  const w = sstep(a.w), b = c.bones; if (!b) return;
  if (a.pose) { const P = POSES[a.pose]; if (P) for (const n in P) { const bn = c.bone(n); if (!bn) continue; const r = P[n]; bn.rotateX(r[0] * w); bn.rotateY(r[1] * w); bn.rotateZ(r[2] * w); } }
  if (a.head && HEADS[a.head]) { const [px, yw] = HEADS[a.head](a.t); const h = c.bone('DEF-head'), n = c.bone('DEF-neck'); if (h) { h.rotateX(px * w * 0.7); h.rotateY(yw * w * 0.7); } if (n) { n.rotateX(px * w * 0.3); n.rotateY(yw * w * 0.3); } } }

// ---------- 2. rolled sleeve + bite wound overlay on the avatar forearm ----------
const mat = (c, r = 0.85, e = 0) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: 0, emissive: e ? new THREE.Color(c) : 0x000000, emissiveIntensity: e });
function profile(ch, side) {
  const skin = ch.skin; if (!skin) return null; const sk = skin.skeleton, g = skin.geometry; const nm = side + 'ForeArm', hn = side + 'Hand';
  const bi = sk.bones.findIndex(b => b.name === nm), hb = sk.bones.find(b => b.name === hn); if (bi < 0 || !hb) return null;
  const M = new THREE.Matrix4().multiplyMatrices(sk.boneInverses[bi], skin.bindMatrix); const si = g.attributes.skinIndex, sw = g.attributes.skinWeight, pos = g.attributes.position, uv = g.attributes.uv;
  const a = hb.position.clone().normalize(), L = hb.position.length(); const p = V(), BIN = 12; const rs = Array.from({ length: BIN }, () => []), cs = Array.from({ length: BIN }, () => V()), cn = new Array(BIN).fill(0), uvs = [];
  for (let i = 0; i < pos.count; i++) { let w = 0; for (let k = 0; k < 4; k++) if (si.getComponent(i, k) === bi) w += sw.getComponent(i, k); if (w < 0.5) continue;
    p.fromBufferAttribute(pos, i).applyMatrix4(M); const t = p.dot(a); if (t < 0.02 * L || t > 1.0 * L) continue; const q = p.clone().addScaledVector(a, -t); const b = Math.min(BIN - 1, Math.floor(t / L * BIN)); rs[b].push(q.length()); cs[b].add(q); cn[b]++;
    if (uv && t > 0.3 * L && t < 0.9 * L) uvs.push([uv.getX(i), uv.getY(i)]); }
  const R = [], C = []; for (let b = 0; b < BIN; b++) { const s = rs[b].sort((x, y) => x - y); R.push(s.length ? s[Math.floor(s.length * .85)] : (R[b - 1] || L * .1)); C.push(cn[b] ? cs[b].clone().divideScalar(cn[b]) : (C[b - 1] ? C[b - 1].clone() : V())); }
  let sleeve = new THREE.Color('#5a5f6a'); try { if (uvs.length) sleeve = sampleColor(skin.material.map, uvs.slice(0, 160)); } catch (e) { }
  return { a, L, R, C, bone: sk.bones[bi], sleeve, skin: (ch.handMats && ch.handMats[side] ? ch.handMats[side].color.clone() : new THREE.Color('#9a6b4f')) };
}
const rAt = (P, y) => { const f = Math.min(P.R.length - 1.001, Math.max(0, y / P.L * P.R.length - 0.5)), i = Math.floor(f), t = f - i; return P.R[i] * (1 - t) + P.R[i + 1] * t; };
const cAt = (P, y, out) => { const f = Math.min(P.C.length - 1.001, Math.max(0, y / P.L * P.C.length - 0.5)), i = Math.floor(f), t = f - i; return out.copy(P.C[i]).multiplyScalar(1 - t).addScaledVector(P.C[i + 1], t); };

export function makeSleeve(ch, side = 'Left', phi = 0) {
  if (ch['_sl' + side]) return ch['_sl' + side]; const P = profile(ch, side); if (!P) return null;
  const grp = new THREE.Group(); const Y = V(0, 1, 0); grp.quaternion.setFromUnitVectors(Y, P.a); P.bone.add(grp); // local Y == bone axis
  const inv = grp.quaternion.clone().invert(); const Pc = P.C.map(c => c.clone().applyQuaternion(inv));
  const L = P.L, SEG = 20, N = 16, y1 = 0.94 * L, yTop = 0.27 * L; const skinM = ch.handMats && ch.handMats[side] ? ch.handMats[side].clone() : mat(P.skin, 0.62, 0.12), clothM = mat(P.sleeve, 0.95);
  // skin tube (bare forearm), rebuilt as the roll travels
  const geo = new THREE.BufferGeometry(); const pos = new Float32Array((N + 1) * (SEG + 1) * 3), nor = new Float32Array(pos.length), idx = [];
  for (let i = 0; i < N; i++) for (let j = 0; j < SEG; j++) { const a = i * (SEG + 1) + j, b = a + SEG + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  geo.setIndex(idx); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  skinM.side = THREE.DoubleSide; const tube = new THREE.Mesh(geo, skinM); tube.frustumCulled = false; tube.castShadow = true; grp.add(tube);
  const roll = new THREE.Mesh(new THREE.TorusGeometry(1, 0.2, 10, 24), clothM); roll.rotation.x = Math.PI / 2; roll.castShadow = true; const rollG = new THREE.Group(); rollG.add(roll); grp.add(rollG);
  const roll2 = new THREE.Mesh(new THREE.TorusGeometry(1, 0.17, 10, 24), clothM); roll2.rotation.x = Math.PI / 2; rollG.add(roll2);
  // bite wound: bruise halo, torn flesh, two arcs of tooth punctures, blood runs
  const wound = new THREE.Group(); wound.visible = false; grp.add(wound);
  const yw = 0.6 * L, rw = rAt(P, yw), cw = cAt(P, yw, V()).applyQuaternion(inv);
  const place = (m, ang, lift, y) => { const rr = rAt(P, y) * (1.0 + lift); m.position.set(Math.sin(ang) * rr + cw.x, y, Math.cos(ang) * rr + cw.z); m.lookAt(m.position.x * 2 - cw.x, y, m.position.z * 2 - cw.z); m.rotateY(Math.PI); wound.add(m); return m; };
  const blob = (col, sx, sy, sz, em = 0) => { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), mat(col, 0.45, em)); m.scale.set(sx, sy, sz); m.castShadow = false; return m; };
  place(blob('#6b3a4a', rw * 1.1, L * 0.19, rw * 0.05), phi, 0.052, yw);
  place(blob('#4a0808', rw * 0.65, L * 0.115, rw * 0.07), phi, 0.07, yw);
  place(blob('#8e1212', rw * 0.4, L * 0.065, rw * 0.06, 0.15), phi, 0.085, yw);
  for (let k = -3; k <= 3; k++) { const ang = phi + k * 0.2 / 1; place(blob('#2a0404', rw * 0.07, rw * 0.07, rw * 0.05), ang, 0.09, yw + L * (0.075 - Math.abs(k) * 0.006)); place(blob('#2a0404', rw * 0.07, rw * 0.07, rw * 0.05), ang, 0.09, yw - L * (0.075 - Math.abs(k) * 0.006)); }
  for (const [da, len] of [[-0.12, 0.3], [0.1, 0.4], [0.28, 0.2]]) { const m = blob('#6e0e0e', rw * 0.07, L * len * 0.5, rw * 0.04, 0.1); place(m, phi + da, 0.09, yw + L * len * 0.5 + L * 0.02); }
  // blood soaked through the sleeve (before it is rolled up)
  const stain = new THREE.Group(); stain.visible = false; grp.add(stain); { const rs = rAt(P, 0.55 * L), cc = cAt(P, 0.55 * L, V()).applyQuaternion(inv); const sb = (col, sx, sy, sz, y, ang) => { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), mat(col, 0.6)); m.scale.set(sx, sy, sz); m.position.set(Math.sin(ang) * rs * 1.07 + cc.x, y, Math.cos(ang) * rs * 1.07 + cc.z); m.lookAt(m.position.x * 2 - cc.x, y, m.position.z * 2 - cc.z); stain.add(m); }; sb('#4a0a0a', rs * 0.7, L * 0.2, rs * 0.04, 0.55 * L, phi); sb('#5e0c0c', rs * 0.35, L * 0.28, rs * 0.04, 0.5 * L, phi + 0.3); sb('#3a0707', rs * 0.45, L * 0.1, rs * 0.04, 0.7 * L, phi - 0.25); }
  const S = { ch, side, stain, P, grp, tube, rollG, wound, pos, nor, geo, k: 0, wk: 0, phi, update: null };
  S.set = (k, wk, st) => { S.k = k; S.wk = wk === undefined ? S.wk : wk; if (st !== undefined) S.st = st; stain.visible = (S.st || 0) > 0.01 && k < 0.6; const kk = sstep(k); grp.visible = k > 0.001 || S.wk > 0.01 || stain.visible; tube.visible = rollG.visible = k > 0.001; wound.visible = S.wk > 0.01 && k > 0.6; if (k <= 0.001) return;
    const yr = y1 + (yTop - y1) * kk; const v = V(), nn = V(); for (let i = 0; i <= N; i++) { const y = yr + (y1 - yr) * (i / N); const r = rAt(P, y) * 1.045, c = cAt(P, y, V()).applyQuaternion(inv);
      for (let j = 0; j <= SEG; j++) { const a = j / SEG * Math.PI * 2, o = (i * (SEG + 1) + j) * 3; nn.set(Math.sin(a), 0, Math.cos(a)); pos[o] = c.x + nn.x * r; pos[o + 1] = y; pos[o + 2] = c.z + nn.z * r; nor[o] = nn.x; nor[o + 1] = 0; nor[o + 2] = nn.z; } }
    geo.attributes.position.needsUpdate = true; geo.attributes.normal.needsUpdate = true; const rr = rAt(P, yr), c0 = cAt(P, yr, V()).applyQuaternion(inv);
    rollG.position.set(c0.x, yr, c0.z); rollG.scale.setScalar(rr * 1.07); };
  roll2.position.y = 0.33; roll2.scale.setScalar(0.97);
  ch['_sl' + side] = S; S.set(0, 0); return S;
}

// ---------- 3. cues: which spoken lines trigger which action ----------
const npcOf = (g, w) => { if (!w) return null; if (w === 'keem') return g.player; let n = g.npcs[w]; if (!n) for (const k in g.npcs) { const c = g.npcs[k]; if ((c.lookKey || c.key || '').replace(/[\d.]+$/, '') === w) { n = c; break; } } return n && n.root.parent && n.root.visible !== false ? n : null; };
const J = { line: [], sticky: new Set(), job: null, turns: [], covered: {} };
export const COVERED = J.covered; // action id -> times fired (used by the test report)
const mark = (id) => { J.covered[id] = (J.covered[id] || 0) + 1; };
const on = (c, o, stick) => { if (!c) return; actStart(c, o); J.line.push(c); if (stick) J.sticky.add(c); };
const turnToward = (c, tx, tz) => { if (c && c !== undefined) J.turns.push({ c, tx, tz, t: 1.6 }); };
export const RULES = [
  // --- Dad's bitten arm (story: motel scene) ---
  { id: 'dad_sleeve_wet', w: 'nia', re: /sleeve.*wet/i, fn: (g, s, l, d) => { const dad = npcOf(g, 'marcus'); if (dad) { const S = makeSleeve(dad, 'Left', -1.57); S && S.set(0, 0, 1); g.save && (g.save.dadStain = 1); on(s, { pose: 'pointR', dur: 2.2 }); turnToward(s, dad.root.position.x, dad.root.position.z); on(dad, { pose: 'guardL' }, true); } } },
  { id: 'dad_hides_arm', w: 'marcus', re: /it'?s nothing|just (a )?(glass|scratch)|glass\. from the gate/i, fn: (g, s) => { on(s, { pose: 'guardL', head: 'down', hold: true }, true); } },
  { id: 'show_me_arm', w: 'keem', re: /(lemme|let me) see (your|that) arm/i, fn: (g, s, l) => { on(s, { pose: 'offerR', dur: 2.4 }); on(npcOf(g, 'marcus'), { pose: 'guardL', head: 'down', hold: true }, true); } },
  { id: 'dad_roll_prompt', w: 'keem', re: /^\s*dad\.\s*roll up the sleeve/i, fn: (g, s) => { on(s, { pose: 'offerR', dur: 2.4 }); on(npcOf(g, 'marcus'), { pose: 'guardL', head: 'down', hold: true }, true); } },
  { id: 'dad_rolls_sleeve', w: 'keem', re: /^\s*roll it up/i, fn: (g, s) => { const dad = npcOf(g, 'marcus'); if (dad) startRoll(g, dad); on(s, { pose: 'offerR', dur: 2.6 }); } },
  { id: 'dad_holds_bite_out', w: 'marcus', re: /haverford|soldier|teeth/i, fn: (g, s) => { if (J.job && J.job.done) on(s, { pose: 'showL', hold: true, head: 'down' }, true); } },
  { id: 'keem_points_bite', w: 'keem', re: /that'?s a bite/i, fn: (g, s) => { on(s, { pose: 'pointR', dur: 2.4 }); const d = npcOf(g, 'marcus'); if (d && d.ax) { d.ax.pose = 'showL'; d.ax.to = 1; d.ax.hold = true; } } },
  { id: 'dad_dont_tell', w: 'marcus', re: /don'?t tell your sister/i, fn: (g, s) => { const d = npcOf(g, 'marcus'); if (d) { d.ax = d.ax || null; on(s, { pose: 'showL', hold: true, head: 'down' }, true); } } },
  { id: 'dad_cant_feel', w: 'marcus', re: /can'?t feel my hand/i, fn: (g, s) => { on(s, { pose: 'guardL', head: 'down', hold: true }, true); const S = s.root && s._slLeft; } },
  // --- group / comfort ---
  { id: 'group_hug', w: 'nia', re: /group hug/i, fn: (g, s) => { on(s, { pose: 'hugArms', dur: 3.2 }); on(g.player, { pose: 'hugArms', dur: 3.2 }); on(npcOf(g, 'marcus'), { pose: 'hugArms', dur: 3.2 }); } },
  { id: 'biscuit_cradle', w: 'nia', re: /biscuit/i, fn: (g, s) => { on(s, { pose: 'hugArms', head: 'down', dur: 2.6 }); } },
  // --- pointing / showing things ---
  { id: 'point_there', w: '*', re: /(over there|that way|up there|down there|right there|look at that|look, |there'?s a |there it is|that building|that one|the (gate|bridge|tower|motel|marina|truck|boat))/i, fn: (g, s) => { if (s === g.player) on(s, { pose: 'pointR', dur: 2.2 }); else { on(s, { pose: 'pointR', dur: 2.4 }); const t = g.wpTarget; if (t) turnToward(s, t[0], t[2]); } } },
  { id: 'hand_over', w: '*', re: /^\s*(here\b|take (this|it|these)|catch\b|got you (a|some)|hold (this|onto this))/i, fn: (g, s) => { on(s, { pose: 'offerR', dur: 2.2 }); } },
  { id: 'come_on_wave', w: '*', re: /(come on|this way|follow me|hurry|let'?s go|move it|move your)/i, fn: (g, s) => { if (s !== g.player) on(s, { pose: 'pointL', dur: 1.6 }); else on(s, { pose: 'pointR', dur: 1.6 }); } },
  // --- looking around / listening ---
  { id: 'look_around', w: '*', re: /(it'?s so quiet|too quiet|listen|hear that|did you hear|somebody was here|anyone (there|here)|stay (quiet|low)|shh|something'?s (wrong|off)|watch (it|out|your)|careful)/i, fn: (g, s) => { on(s, { head: 'scan', dur: 3 }); } },
  { id: 'head_down_sad', w: '*', re: /(sorry|he'?s gone|she'?s gone|didn'?t make it|they'?re dead|i couldn'?t|mom|your mother|your mom|i'?m scared|i'?m so scared|can'?t feel)/i, fn: (g, s) => { on(s, { head: 'down', dur: 2.6 }); } },
  { id: 'shake_no', w: '*', re: /^\s*(no\b|nah\b|nope|don'?t\b|not (yet|now|a chance)|never)/i, fn: (g, s) => { on(s, { head: 'shake', dur: 1.6 }); } },
  { id: 'nod_yes', w: '*', re: /^\s*(yeah\b|yes\b|okay\b|ok\b|alright\b|right\b|got it|fine\b|deal\b)/i, fn: (g, s) => { on(s, { head: 'nod', dur: 1.5 }); } },
  { id: 'shrug', w: '*', re: /(i don'?t know|no idea|who knows|whatever|maybe|guess so|dunno)/i, fn: (g, s) => { on(s, { pose: 'shrug', dur: 1.8 }); } },
  { id: 'cover_ears', w: 'nia', re: /(ears (are )?ringing|too loud|so loud)/i, fn: (g, s) => { on(s, { pose: 'coverEars', dur: 2.2 }); } },
  { id: 'hold_head', w: '*', re: /(i can'?t do this|oh my god|oh no|no no no|this is (bad|insane)|what have we done)/i, fn: (g, s) => { on(s, { pose: 'headHands', dur: 2.2, head: 'down' }); } },
];
export function cueLine(g, it) {
  for (const c of J.line) if (!J.sticky.has(c)) actStop(c); J.line = J.line.filter(c => J.sticky.has(c));
  if (!it || !it.who || it.cb) return; const txt = (it.raw || it.text || '').replace(/\{[^}]*\}/g, ''); const s = npcOf(g, it.who); if (!s) return; const l = it.who === 'keem' ? (g.convo && g.convo.npc) : g.player;
  for (const r of RULES) { if (r.w !== '*' && r.w !== it.who) continue; if (!r.re.test(txt)) continue; try { r.fn(g, s, l, it); mark(r.id); } catch (e) { console.warn('cue', r.id, e); } if (r.id.startsWith('dad_') || r.id === 'show_me_arm') break; }
}
export function cueEnd(g) { for (const c of J.line) actStop(c); J.line = []; J.sticky.forEach(c => actStop(c)); J.sticky.clear(); J.turns.length = 0; if (J.job) { J.job = null; g.camShot = null; } }
// the roll itself: Dad grips the cuff with his free hand, the cuff rolls up the forearm, bare skin and the bite appear, then the arm is held out
export function startRoll(g, dad) { const S = makeSleeve(dad, 'Left', -1.57); if (!S) return; actStart(dad, { pose: 'rollL', hold: true, head: 'down' }); J.sticky.add(dad); J.job = { dad, S, t: 0, done: false }; g.save && (g.save.dadBite = 1); mark('dad_sleeve_rolls_up'); }
const _a = V(), _b = V(), _c = V();
export function actUpdate(g, dt) {
  const j = J.job;
  if (j) { j.t += dt; const k = sstep((j.t - 0.5) / 2.0); j.S.set(k, j.t > 2.6 ? Math.min(1, (j.t - 2.6) / 0.6) : 0, 1);
    if (!j.done && j.t > 2.7) { j.done = true; const a = j.dad.ax; if (a) a.pose = 'showL'; mark('dad_shows_bite'); }
    // close-up camera on the forearm while the sleeve rolls and the bite is shown
    const bs = j.dad.skin && j.dad.skin.skeleton.bones, fb = bs && bs.find(x => x.name === 'LeftForeArm'), hb = bs && bs.find(x => x.name === 'LeftHand');
    if (fb && hb && j.t < 6.5) { fb.getWorldPosition(_a); hb.getWorldPosition(_b); _c.copy(_a).add(_b).multiplyScalar(0.5); { const hd = bs.find(x => x.name === 'Head'); if (hd) { hd.getWorldPosition(_a); _c.lerp(_a, 0.2); } } const P = g.player.root.position, d = j.dad.root.position; _a.set(P.x - d.x, 0, P.z - d.z); if (_a.lengthSq() < 0.01) _a.set(0, 0, 1); _a.normalize();
      const cs = g.camShot || (g.camShot = { cam: V(), look: V() }); cs.look.copy(_c); cs.cam.set(_c.x + _a.x * 0.3 + _a.z * 0.62, _c.y + 0.3, _c.z + _a.z * 0.3 - _a.x * 0.62); } else if (j.t >= 6.5) g.camShot = null; }
  for (let i = J.turns.length - 1; i >= 0; i--) { const t = J.turns[i]; t.t -= dt; if (t.t <= 0 || !t.c.root.parent) { J.turns.splice(i, 1); continue; } const r = t.c.root, y = Math.atan2(t.tx - r.position.x, t.tz - r.position.z); let dd = ((y - r.rotation.y + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI; r.rotation.y += dd * Math.min(1, dt * 5); }
}
export function restoreBite(g, ch) { if (!ch || !g.save) return; if (g.save.dadBite) { const S = makeSleeve(ch, 'Left', -1.57); S && S.set(1, 1, 1); } else if (g.save.dadStain) { const S = makeSleeve(ch, 'Left', -1.57); S && S.set(0, 0, 1); } }
