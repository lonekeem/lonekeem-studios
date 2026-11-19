// v2.1 conversations: when a scripted conversation starts, Keem and the NPC stand face to face at a natural distance (the player walks the last bit,
// the NPC turns toward him, nobody is ever behind the other), and the camera frames both faces from the side. Free-play lines only turn the two toward each other.
import * as THREE from 'three';
import { walkTo, turnTo, angDiff } from './motion.js';
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const DIST = 1.9, _a = V(), _b = V(), _u = V(), _s = V(), _c = V(), _l = V(), RC = new THREE.Raycaster();

function npcFor(g, who) { if (!who || who === 'keem') return null; let n = g.npcs[who]; if (!n) for (const k in g.npcs) { const c = g.npcs[k]; if (c.lookKey === who || (c.key || '').replace(/[\d.]+$/, '') === who) { n = c; break; } } return n && n.root.visible !== false && !n.isVictim && n.root.parent ? n : null; }
const headY = (c) => 1.62 * (c.scale || 1) * (c === undefined ? 1 : 1);

export function convoLine(g, it) { if (!it || !it.who) return; const P = g.player.root.position;
  const spk = npcFor(g, it.who); let C = g.convo;
  const near = (n) => n && Math.hypot(n.root.position.x - P.x, n.root.position.z - P.z) < 9;
  if (!C || !C.npc || !C.npc.root.parent || C.npc.root.visible === false) { C = null; g.convo = null; let first = near(spk) ? spk : null; if (!first) for (const l of g.dlgQ || []) { const n = near(npcFor(g, l.who)); if (n) { first = npcFor(g, l.who); break; } } if (!first || g.carSeq || g.truck.driving) return; C = g.convo = { npc: first, t: 0, walking: false, camT: 0, ownCut: false }; }
  C.focus = spk && near(spk) ? spk : C.npc; C.keem = it.who === 'keem'; C.hard = !!g.cut; C.camT = 0;
  if (C.hard) { if (!C.placed) { C.placed = true; const N = C.npc.root.position, d = Math.hypot(N.x - P.x, N.z - P.z); const fy = C.npc.root.rotation.y, fx = Math.sin(fy), fz = Math.cos(fy); const behind = (P.x - N.x) * fx + (P.z - N.z) * fz < 0; if (d > 2.6 || d < 1.3 || behind) { _u.set(P.x - N.x, 0, P.z - N.z); if (_u.lengthSq() < 0.01 || behind) _u.set(fx, 0, fz); _u.normalize(); /* never talk to someone's back: if Keem is behind them, meet them in front */
        for (let k = 0; k < 9; k++) { const ang = (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 0.5, c = Math.cos(ang), s = Math.sin(ang); const x = N.x + (_u.x * c - _u.z * s) * DIST, z = N.z + (_u.x * s + _u.z * c) * DIST; if (!g.inCol(x, z, 0.35)) { C.spot = [x, z]; C.walking = true; if (behind) { const sx = -fz, sz = fx, sg = ((P.x - N.x) * sx + (P.z - N.z) * sz) >= 0 ? 1 : -1; C.via = [N.x + sx * sg * 1.5, N.z + sz * sg * 1.5]; } break; } } } } } }
export function convoEnd(g) { g.convo = null; g.convoSoft = null; }

function frame(g, C) { const P = g.player.root, Pp = P.position, N = C.focus || C.npc, Np = N.root.position; _a.set(Pp.x, 0, Pp.z); _b.set(Np.x, 0, Np.z); _u.copy(_b).sub(_a); const sep = Math.max(0.6, _u.length()); _u.normalize();
  _s.set(-_u.z, 0, _u.x); const m = _c.copy(_a).add(_b).multiplyScalar(0.5); const hy = ((1.55 * g.player.scale) + (1.62 * N.scale)) / 2 - 0.05; const cur = g.camera.position; const sgn = ((cur.x - m.x) * _s.x + (cur.z - m.z) * _s.z) >= 0 ? 1 : -1;
  const spkSide = C.keem ? -1 : 1; // swing slightly toward the speaker's front so both faces read 3/4
  const D = Math.max(2.1, sep * 1.15 + 0.85);
  for (let tries = 0; tries < 2; tries++) { const sg = tries ? -sgn : sgn; const ca = Math.cos(0.14 * sg * spkSide), sa = Math.sin(0.14 * sg * spkSide); const dx = _s.x * sg, dz = _s.z * sg; const ux = dx * ca - dz * sa + _u.x * 0.0, uz = dx * sa + dz * ca;
    _l.set(m.x, hy, m.z); const dir = V(ux, 0.16, uz).normalize(); RC.set(_l, dir); RC.near = 0; RC.far = D; const h = RC.intersectObjects(g.world.walls, false)[0]; const dist = h ? h.distance - 0.3 : D; if (dist > D * 0.62 || tries) { const cam = _l.clone().addScaledVector(dir, Math.max(1.4, dist)); cam.y = hy + 0.25; return { cam, look: V(m.x, hy - 0.05, m.z) }; } }
}
export function convoUpdate(g, dt) { const C = g.convo; if (!C) return; const P = g.player, root = P.root, Pp = root.position; if (!C.npc.root.parent || C.npc.root.visible === false || g.dying) { g.convo = null; return; }
  const N = C.npc, Np = N.root.position; C.t += dt;
  if (C.hard) {
    if (C.walking && C.spot) { if (C.via) { if (walkTo(P, C.via[0], C.via[1], dt, { speed: 2.3, arrive: 0.15 })) C.via = null; } else if (walkTo(P, C.spot[0], C.spot[1], dt, { speed: 2.3 })) { C.walking = false; } if (g.dlgCur) g.dlgCur.t = Math.min(g.dlgCur.t, 0); }
    else if (!g.cut || !g.cut.anim || g.cut.anim === 'Idle_Loop' || g.cut.anim === 'Idle_Talking_Loop') { if (g.cut) g.cut.anim = C.keem ? 'Idle_Talking_Loop' : 'Idle_Loop'; }
    if (!C.walking) { const ang = Math.atan2(Np.x - Pp.x, Np.z - Pp.z); turnTo(root, ang, dt, 6); }
    // camera: both faces from the side
    C.camT -= dt; if (g.cut && !g.cut.fixed && C.camT <= 0) { C.camT = 0.1; const f = frame(g, C); if (f) { if (!g.cut.cam || !g.cut.cam.isVector3) g.cut.cam = V(); if (!g.cut.look || !g.cut.look.isVector3) g.cut.look = V(); g.cut.cam.copy(f.cam); g.cut.look.copy(f.look); } } }
  else { /* free play: just turn toward each other, never move or lock the player */ if (Math.hypot(Np.x - Pp.x, Np.z - Pp.z) < 5 && (g.state.spd || 0) < 0.3) turnTo(root, Math.atan2(Np.x - Pp.x, Np.z - Pp.z), dt, 4); }
  // NPC turns to face Keem (smooth), speaker uses the talking idle; bystanders glance over
  const face = (n, rate) => { if (!n || n.locoOn || n.oneShot) return; const p = n.root.position; turnTo(n.root, Math.atan2(Pp.x - p.x, Pp.z - p.z), dt, rate); };
  face(N, 4.5); for (const k in g.npcs) { const o = g.npcs[k]; if (o !== N && !o.isVictim && o.root.visible !== false && Math.hypot(o.root.position.x - Pp.x, o.root.position.z - Pp.z) < 6 && !o.locoOn) face(o, 2.5); }
  const spk = C.focus; for (const k in g.npcs) { const o = g.npcs[k]; if (!/^Idle/.test(o.curName || '') && o.curName !== '') continue; if (o.oneShot || o.locoOn || o.isVictim) continue; const talk = !C.keem && o === spk; if (/Idle/.test(o.curName || 'Idle_Loop') && (o.look && true)) { const want = (talk && !o.ax) ? 'Idle_Talking_Loop' : 'Idle_Loop'; if (o.curName !== want && o.curName !== 'Idle_Torch_Loop' && (o.curName === 'Idle_Loop' || o.curName === 'Idle_Talking_Loop')) o.play(want); } }
}
