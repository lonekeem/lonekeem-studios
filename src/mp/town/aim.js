// Multiplayer aiming / shooting / melee, ported from the story game (game.js: aimRay, fire, meleeHit, attack soft-lock, aimAssist, hitMark, render() aim camera).
// Same numbers: FOV 62 -> 62/zoom (1.35 default) when aiming, over-the-shoulder arm 2.7 m / 1.6 m aimed, shoulder 0.5 / 0.62, ray through the on-screen crosshair,
// head sphere 0.17 m (x2.5 damage) + body capsule, story spread, recoil, hit marker, melee reach / 0.5-dot cone / lock-on / combo.
import * as THREE from 'three';
import { WEAPONS } from '../../game/data.js';

const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const rnd = (a, b) => a + Math.random() * (b - a);
const _hp = V3(), _tmp = V3();

export const STORY_FOV = 62, SHOULDER = { hip: .5, aim: .62 }, ARM = { hip: 2.7, aim: 1.6 };
export const zoomOf = g => (g && WEAPONS[g] && WEAPONS[g].zoom) || 1.35;
export const fovFor = (aiming, g) => aiming ? STORY_FOV / zoomOf(g) : STORY_FOV;

// where the on-screen crosshair sits in NDC (the gun ray is cast through it, like story)
export function crosshairNDC(canvas, xh = document.getElementById('xhair')) {
  const cr = canvas.getBoundingClientRect(); let xr = null; if (xh && !xh.classList.contains('hidden')) xr = xh.getBoundingClientRect();
  const cy = (xr && xr.width && cr.height) ? 1 - 2 * ((xr.top + xr.height / 2 - cr.top) / cr.height) : .08, cx = (xr && xr.width && cr.width) ? 2 * ((xr.left + xr.width / 2 - cr.left) / cr.width) - 1 : 0;
  return { cx, cy };
}
// ray from the camera through the crosshair; spread is an angle (story v1.9.3), `near` skips geometry between camera and the player (over-the-shoulder cam)
export function aimRay(cam, ndc, playerPos, spread = 0) {
  cam.updateMatrixWorld(true); const r = new THREE.Raycaster(); r.setFromCamera(new THREE.Vector2(ndc.cx, ndc.cy), cam);
  if (spread > 0) { const th = Math.random() * 6.283, m = Math.sqrt(Math.random()) * spread * Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2); const up = V3(0, 1, 0).applyQuaternion(cam.quaternion), rt = V3(1, 0, 0).applyQuaternion(cam.quaternion); r.ray.direction.addScaledVector(rt, Math.cos(th) * m).addScaledVector(up, Math.sin(th) * m).normalize(); }
  const o = r.ray.origin, d = r.ray.direction; r.ray.near = Math.max(0, playerPos.clone().setY(o.y).sub(o).dot(d) - .4); return r.ray;
}
export function spreadFor(w, pellets, aiming, fp) { return pellets > 1 ? (aiming ? w.spread * .45 : w.spread * (fp ? .8 : 1.4)) * 4 : (aiming ? 0 : w.spread * .35 * 4); }

// distance along the ray to the first wall / prop (2-D collision grid, tall things only) or the ground
export function wallDist(col, ray, range, nr) {
  const o = ray.origin, d = ray.direction; let wall = range + nr;
  for (let t = nr + .3; t < range + nr; t += .35) { const x = o.x + d.x * t, y = o.y + d.y * t, z = o.z + d.z * t; if (y < 0) { wall = t; break; } if (y < 3.2 && col.hit(x, z, .06)) { wall = t; break; } }
  return wall;
}
// story hitboxes: head sphere (headshot) + body capsule from the feet up to under the head. zs = zombie list, returns { z, head, t } or null
export function pickZombie(zs, ray, bd) {
  let best = null; const o = ray.origin;
  for (const z of zs) { if (z.dead || !z.z || z.victim || !z.root.visible) continue; const sc = z.scale || 1;
    z.worldOf('DEF-head', _hp); _hp.y += .08 * sc; const hr = .17 * Math.max(1, z.root.scale.x);
    const t = _tmp.copy(_hp).sub(o).dot(ray.direction); if (t > 0 && t < bd) { const c = ray.at(t, V3()); if (c.distanceTo(_hp) < hr) { bd = t; best = { z, head: true, t }; continue; } }
    const a = z.root.position.clone(); a.y = .15; const b = z.root.position.clone(); b.y = Math.max(1.35 * sc, _hp.y - hr - .02); const pr = V3(), ps = V3(); const d2 = ray.distanceSqToSegment(a, b, pr, ps); const dd = pr.distanceTo(o);
    if (d2 < .13 * sc * sc && dd < bd) { bd = dd; best = { z, head: false, t: dd }; } }
  return best;
}

// ---- melee: story numbers (WEAPONS stats of the same weapon) ----
const MELEE_MAP = { fists: 'fists', pan: 'pan', bat: 'bat', crowbar: 'bat' };
export function meleeStats(name) { const k = MELEE_MAP[name] || 'fists'; const w = WEAPONS[k]; const x = name === 'crowbar' ? { dmg: 56, rate: .65, range: 2.0 } : w; return { id: k, name, dmg: x.dmg, rate: x.rate, range: x.range, reach: Math.max(1.2, x.range * .74), fists: name === 'fists', bonk: !!w.bonk, heavy: name !== 'fists' }; }
// soft lock-on: nearest living zombie within reach + .9 -> yaw that faces it (or null)
export function lockOn(zs, px, pz, reach) { let best = null, bd = reach + .9; for (const z of zs) { if (z.dead || !z.z || z.victim) continue; const d = Math.hypot(z.root.position.x - px, z.root.position.z - pz); if (d < bd) { bd = d; best = z; } } return best ? Math.atan2(best.root.position.x - px, best.root.position.z - pz) : null; }
// every zombie inside reach and in front (dot > .5; anything closer than .45 m always counts)
export function meleeTargets(zs, px, pz, ry, ms) { const fx = Math.sin(ry), fz = Math.cos(ry), out = [];
  for (const z of zs) { if (z.dead || !z.z || z.victim) continue; let dx = z.root.position.x - px, dz = z.root.position.z - pz; const dist = Math.hypot(dx, dz); if (dist > ms.reach + Math.max(0, (z.scale || 1) - 1) * .5) continue; if (dist > .01) { dx /= dist; dz /= dist; } if (dist > .45 && dx * fx + dz * fz < .5) continue; out.push({ z, dx, dz, dist }); }
  return out; }

// ---- aim assist (opt-in like story: Simple control scheme or the assist slider) ----
// st: { yaw (story convention = camYaw + PI), pitch (story convention) } -> returns { dyaw, pitch, auto } ; zs/zombie heads vs the camera
export function assist({ SET, firing, aiming, gun, zs, cam, ndc, st, dt, lastLook, los, mag, reloading }) {
  const str = SET.ctl === 'simple' ? Math.max(SET.assist || 0, .8) : (SET.assist || 0); if (!(str > 0) || !gun) return null; const auto = !!SET.autoFire; if (!firing && !auto) return null;
  const w = WEAPONS[gun], cp = cam.position, th = Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2), yo = Math.atan(ndc.cx * th * cam.aspect), po = Math.atan(ndc.cy * th);
  const cone = (firing ? .22 : .12) + .4 * str; let best = null, ba = cone;
  for (const z of zs) { if (z.dead || !z.z || z.victim || !z.root.visible) continue; z.worldOf('DEF-head', _hp); _hp.y -= .2 * (z.scale || 1); const f = _hp.clone().sub(cp), len = f.length(); if (len < 1.5 || len > Math.min(32, w.range || 30)) continue;
    const yd = Math.atan2(-f.x, -f.z) + yo, pd = Math.asin(f.y / len) - po; const ey = Math.abs(((yd - st.yaw + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI), ep = Math.abs(pd - st.pitch), a = Math.hypot(ey, ep * .8);
    if (a < ba) { ba = a; best = { z, yd, pd, a, len, head: _hp.clone() }; } }
  if (!best) return null; const ul = Math.min(1, lastLook * 45); const rate = (firing ? 4 + 9 * str : 1.2 + 2 * str) * (1 - ul * .85); const dy = ((best.yd - st.yaw + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
  const res = { dyaw: dy * Math.min(1, dt * rate), pitch: Math.max(-1.1, Math.min(.9, st.pitch + (best.pd - st.pitch) * Math.min(1, dt * rate))), auto: false };
  if (auto && best.a < .075 + .02 * str && !reloading && mag > 0 && los(best.head)) res.auto = true; return res;
}

// ---- effects: muzzle flash sprite + light, pooled blood spray, hit marker ----
export function makeFx(scene) {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,240,1)'); gr.addColorStop(.35, 'rgba(255,200,90,.9)'); gr.addColorStop(1, 'rgba(255,120,20,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const muzzle = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: '#ffd27a', blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, depthTest: false })); muzzle.scale.setScalar(.55); muzzle.visible = false; muzzle.renderOrder = 30; scene.add(muzzle);
  const mLight = new THREE.PointLight('#ffc070', 0, 12, 2); scene.add(mLight);
  const N = 260, geo = new THREE.SphereGeometry(1, 5, 4), mat = new THREE.MeshStandardMaterial({ color: '#7a0808', roughness: .25 }), inst = new THREE.InstancedMesh(geo, mat, N); inst.instanceMatrix.setUsage(THREE.DynamicDrawUsage); inst.frustumCulled = false; scene.add(inst);
  const pd = []; for (let i = 0; i < N; i++) pd.push({ p: V3(0, -99, 0), v: V3(), life: 0, s: 0 }); let pI = 0; const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S3 = V3();
  const fx = { mT: 0, mz: V3(), hmT: 0, gore: true,
    flash(pos) { muzzle.position.copy(pos); muzzle.visible = true; muzzle.material.rotation = rnd(0, 6); muzzle.scale.setScalar(rnd(.45, .7)); mLight.position.copy(pos); mLight.intensity = 30; fx.mT = .05; },
    blood(pos, dir, n = 12, speed = 3, size = 1) { if (!fx.gore) n = Math.ceil(n / 3); else { n = Math.ceil(n * .8); speed *= 1.1; } for (let i = 0; i < n; i++) { const d = pd[pI = (pI + 1) % N]; d.p.copy(pos); d.v.set(dir.x * speed + rnd(-1.5, 1.5), rnd(.5, 3) + (dir.y || 0) * speed, dir.z * speed + rnd(-1.5, 1.5)); d.life = rnd(.3, .65); d.s = rnd(.018, .05) * size; } },
    update(dt) { if (fx.mT > 0) { fx.mT -= dt; if (fx.mT <= 0) { muzzle.visible = false; mLight.intensity = 0; } }
      for (let i = 0; i < N; i++) { const d = pd[i]; if (d.life > 0) { d.life -= dt; d.v.y -= 9 * dt; d.p.addScaledVector(d.v, dt); if (d.p.y < .03) { d.p.y = .03; d.v.multiplyScalar(.2); } if (d.life <= 0) d.p.y = -99; } const k = d.life > 0 ? d.s * 3 : 0; M.compose(d.p, Q, S3.set(k, k, k)); inst.setMatrixAt(i, M); } inst.instanceMatrix.needsUpdate = true;
      if (fx.hmT > 0) { fx.hmT -= dt; if (fx.hmT <= 0) { const x = document.getElementById('xhair'); if (x) x.style.color = '#fff'; } } },
    hitMark(head) { const x = document.getElementById('xhair'); if (x) x.style.color = head ? '#f44' : '#fc8'; fx.hmT = .12; } };
  return fx;
}
