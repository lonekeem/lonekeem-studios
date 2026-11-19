// v1.9.17 acting overlay: the animation library has no hug / reach / cower / clutch clips, so named arm poses are layered on top of
// whatever clip is playing. Each arm bone is re-aimed (world-space "point this bone along that direction"), blended in/out smoothly.
// Directions are in the character's own frame: +x = its left, +y = up, +z = forward.  ARM[name] = [upperArmDir, forearmDir] for the LEFT arm (x is mirrored for the right).
import * as THREE from 'three';
const V = THREE.Vector3, Q = THREE.Quaternion, Y = new V(0, 1, 0), ID = new Q();
const tq = new Q(), bp = new V(), cp = new V(), cur = new V(), dw = new V(), bq = new Q(), pq = new Q(), dq = new Q(), root_q = new Q();
const n = (x, y, z) => new V(x, y, z).normalize();
export const ARM = {
  hug:    [n(.62, -.12, .78), n(-.55, .05, .84)],   // arms wrapped round a person in front
  reach:  [n(.12, .04, 1), n(.08, .06, 1)],         // one arm straight out at chest height (hatch, glass, handshake)
  glass:  [n(.1, .22, 1), n(.05, .35, 1)],          // hand raised flat on a window
  clutch: [n(.78, .18, .32), n(-.62, .85, .5)],        // hands pressed to the head
  hold:   [n(.3, -.45, .72), n(-.05, -.25, 1)],     // holding someone's wrists in front
  cradle: [n(.3, -.6, .55), n(-.5, .3, .85)],      // arms in front, carrying a small thing (Biscuit)
  baby:   [n(.12, -.62, .5), n(-.12, .12, 1), n(-.3, -.5, .55), n(.8, .12, .45)],   // babyhold: left forearm flat under the bottom, right hand round onto the back (4 dirs = left arm then right arm, not mirrored)
  embrace:[n(.3, -.35, .88), n(-.85, .1, .5)],     // an adult's arms closing round a small person's back
  neckhug:[n(.55, .4, .72), n(-.75, .45, .5)],     // arms up and round someone's neck (a small child hugging a kneeling adult)
  point:  [n(.2, .12, 1), n(.1, .12, 1)],           // pointing the way
  wave:   [n(.75, .55, .25), n(.2, 1, .1)],         // waving overhead
  shrug:  [n(.55, -.25, .25), n(.2, .55, .5)],      // palms up
  scoop:  [n(.3, -.55, .7), n(.0, -.45, .95)],      // reaching down-forward to pick something up
  fistUp: [n(.35, .1, .9), n(.1, .95, .3)],         // fist up, triumphant
};
export const KNEE = { front: [n(0, -.06, 1), n(0, -1, -.12)], back: [n(0, -1, .02), n(0, .06, -1)] };
function aim(bone, child, dir, w) {
  if (!bone || !child || w <= .001) return;
  bone.updateWorldMatrix(true, true); bone.getWorldPosition(bp); child.getWorldPosition(cp); cur.copy(cp).sub(bp).normalize();
  tq.setFromUnitVectors(cur, dir); if (w < 1) dq.copy(ID).slerp(tq, w); else dq.copy(tq);
  bone.getWorldQuaternion(bq); bq.premultiply(dq); bone.parent.getWorldQuaternion(pq); bone.quaternion.copy(pq.invert().multiply(bq)); bone.updateWorldMatrix(false, true);
}
function apply(c, dt) {
  const a = c.ap; if (!a) return; a.k += (a.kt - a.k) * Math.min(1, dt * (a.rate || 7)); if (a.kt === 0 && a.k < .01) { a.k = 0; if (!a.head && !a.lean && !a.kneel && !a.kk) return; }
  c.root.updateWorldMatrix(true, true); c.root.getWorldQuaternion(root_q);
  const P = a.pose && ARM[a.pose];
  if (P && a.k > .01) for (const side of ['L', 'R']) {
    const sd = side === 'L' ? 1 : -1, mine = a.sides === 'L' ? side === 'L' : a.sides === 'R' ? side === 'R' : true; if (!mine) continue;
    const ua = c.bone('DEF-upper_arm.' + side), fa = c.bone('DEF-forearm.' + side), ha = c.bone('DEF-hand.' + side); if (!ua || !fa) continue;
    // an optional second pose for the other arm (a.pose2 / a.sides2)
    const two = P.length === 4 && side === 'R'; const pp = two ? [P[2], P[3]] : P; const sd2 = two ? 1 : sd; dw.set(pp[0].x * sd2, pp[0].y, pp[0].z).applyQuaternion(root_q); aim(ua, fa, dw.clone(), a.k);
    if (ha) { dw.set(pp[1].x * sd2, pp[1].y, pp[1].z).applyQuaternion(root_q); aim(fa, ha, dw.clone(), a.k); } }
  // one knee on the floor: front leg thigh forward / shin down, back leg thigh down / shin along the floor, hips dropped by one shin length
  a.kk = (a.kk || 0) + ((a.kneel ? 1 : 0) - (a.kk || 0)) * Math.min(1, dt * (a.rate || 7)); if (a.kk > .995) a.kk = 1;
  if (a.kk > .01 && a.kneel) { const back = a.kneel, front = back === 'R' ? 'L' : 'R'; const sd = s => s === 'L' ? 1 : -1;
    const th = c.bone('DEF-thigh.' + front), sh = c.bone('DEF-shin.' + front), ft = c.bone('DEF-foot.' + front), th2 = c.bone('DEF-thigh.' + back), sh2 = c.bone('DEF-shin.' + back), ft2 = c.bone('DEF-foot.' + back);
    if (th && sh && ft && th2 && sh2 && ft2) { sh.getWorldPosition(bp); ft.getWorldPosition(cp); const S = bp.distanceTo(cp); a.S = a.S || S;
      c.root.updateWorldMatrix(true, true); c.root.getWorldQuaternion(root_q);
      const put = (b0, b1, d, w, sx) => { dw.set(d.x * sx, d.y, d.z).applyQuaternion(root_q); aim(b0, b1, dw.clone(), w); };
      put(th, sh, KNEE.front[0], a.kk, 1); put(sh, ft, KNEE.front[1], a.kk, 1); put(th2, sh2, KNEE.back[0], a.kk, 1); put(sh2, ft2, KNEE.back[1], a.kk, 1);
      c.root.position.y = -a.S * a.kk * (a.drop ?? 1); } }
  else if (c.root.position.y < 0 && a.S) c.root.position.y = 0;
  if (a.lean) { const sp = c.bone('DEF-spine.001'), sp2 = c.bone('DEF-spine.003'); if (sp) sp.rotateX(a.lean * .5); if (sp2) sp2.rotateX(a.lean * .5); }
  if (a.head) { const h = c.bone('DEF-head'); if (h) { h.rotateX(a.head[0] || 0); h.rotateY(a.head[1] || 0); h.rotateZ(a.head[2] || 0); } }
}
// act(c, 'hug') starts the pose (strength 1, fades in); act(c, 'hug', {sides:'R'}) uses one arm; act(c, null) fades out. opts: head [x,y,z] radians, lean (spine forward), rate.
export function act(c, pose, o = {}) {
  if (!c || !c.mixer) return; let a = c.ap; if (!a) { a = c.ap = { k: 0, kt: 0 }; const mu = c.mixer.update; c.mixer.update = function (dt) { const r = mu.call(this, dt); apply(c, dt); return r; }; }
  a.pose = pose || a.pose; a.kt = pose ? (o.k ?? 1) : 0; a.sides = o.sides || null; a.head = o.head || null; a.lean = o.lean || 0; a.rate = o.rate || 7; a.kneel = o.kneel || null; a.drop = o.drop; if (o.snap) { a.k = a.kt; a.kk = o.kneel ? 1 : 0; } }
