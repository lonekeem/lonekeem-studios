// Biscuit AI for Chapter 13: a shy rabbit that nibbles at a waypoint and hops to the next one when Keem gets close
// (crouching lets you sneak much closer), or when a zombie wanders near.  Pure scripting — no physics.
import * as THREE from 'three';
import { makeRabbit } from '../chars.js';

export function spawnBiscuit(g, x, z, o = {}) {
  const grp = new THREE.Group(), r = makeRabbit(); r.scale.setScalar(o.scale || 1.7); grp.add(r); grp.position.set(x, o.y || 0, z); g.scene.add(grp);
  const B = { grp, r, x, z, y0: o.y || 0, wps: [], i: 0, st: 'sit', t: 0, hop: 0, tx: x, tz: z, ty: o.y || 0, miss: 0, active: true, nib: Math.random() * 6 };
  B.go = (wps) => { B.wps = wps; B.i = 0; }; B.remove = () => { g.scene.remove(grp); B.active = false; };
  return B;
}
// hop to waypoint index j (also used for scripted jumps). h = hop count look: more hops for longer trips
export function hopTo(B, x, z, y = 0) { B.st = 'hop'; B.sx = B.grp.position.x; B.sz = B.grp.position.z; B.sy = B.grp.position.y; B.tx = x; B.tz = z; B.ty = y; B.hop = 0; B.hd = Math.hypot(x - B.sx, z - B.sz); B.hn = Math.max(1, Math.round(B.hd / 1.6)); }
export function tickBiscuit(g, B, dt, ev = {}) {
  if (!B || !B.active) return; const p = B.grp.position, P = g.player.root.position, crouch = g.state.crouch;
  const d = Math.hypot(P.x - p.x, P.z - p.z); B.t += dt; const last = B.i >= B.wps.length - 1;
  if (B.st === 'sit') {
    B.nib += dt * 7; B.r.head.rotation.x = Math.max(0, Math.sin(B.nib)) * .35 - .05; B.r.head.rotation.y = Math.sin(B.t * .6) * .5; // nibble + look around
    const thr = crouch ? 1.5 : 3.4; let near = d < thr; if (!near) g.zombies.forEach(z => { if (!z.dead && !near) { const q = z.root.position; if (Math.hypot(q.x - p.x, q.z - p.z) < 2.2) near = true; } });
    if (near && B.t > .6 && !B.held) { if (!last) { B.miss++; if (d < 1.6) { g.floatText && g.floatText('Missed him!', '#ffffff'); ev.onMiss && ev.onMiss(B); } B.i++; const w = B.wps[B.i]; hopTo(B, w[0], w[1], w[2] || 0); g.audio.click && g.audio.click(); ev.onHop && ev.onHop(B, B.i); } }
    if (last && d < (ev.reach || 2.6) && !B.done) { B.done = true; ev.onReach && ev.onReach(B); }
  } else if (B.st === 'hop') {
    const sp = 4.6; B.hop += dt * sp / Math.max(.1, B.hd); const k = Math.min(1, B.hop); const x = B.sx + (B.tx - B.sx) * k, z = B.sz + (B.tz - B.sz) * k;
    const ph = k * B.hn * Math.PI; p.set(x, B.sy + (B.ty - B.sy) * k + Math.abs(Math.sin(ph)) * .28, z); B.grp.rotation.y = Math.atan2(B.tx - B.sx, B.tz - B.sz); B.r.head.rotation.x = -.2;
    if (k >= 1) { B.st = 'sit'; B.t = 0; p.y = B.ty; }
  }
  if (ev.marker !== false && g.wpTarget !== undefined && !g.cut) g.wpTarget = [p.x, p.y + .9, p.z];
}
