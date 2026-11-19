// v1.9.17 acting overlay: the animation library has no hug / reach / cower / clutch clips, so named arm poses are layered on top of
// whatever clip is playing. Each arm bone is re-aimed (world-space "point this bone along that direction"), blended in/out smoothly.
// Directions are in the character's own frame: +x = its left, +y = up, +z = forward.  ARM[name] = [upperArmDir, forearmDir] for the LEFT arm (x is mirrored for the right).
import * as THREE from 'three';
const V = THREE.Vector3, Q = THREE.Quaternion, Y = new V(0, 1, 0), ID = new Q();
const bp = new V(), cp = new V(), cur = new V(), dw = new V(), bq = new Q(), pq = new Q(), dq = new Q(), root_q = new Q();
const n = (x, y, z) => new V(x, y, z).normalize();
export const ARM = {
  hug:    [n(.62, -.12, .78), n(-.55, .05, .84)],   // arms wrapped round a person in front
  reach:  [n(.12, .04, 1), n(.08, .06, 1)],         // one arm straight out at chest height (hatch, glass, handshake)
  glass:  [n(.1, .22, 1), n(.05, .35, 1)],          // hand raised flat on a window
  clutch: [n(.9, .38, .12), n(-.2, 1, .42)],        // hands pressed to the head
  hold:   [n(.3, -.45, .72), n(-.05, -.25, 1)],     // holding someone's wrists in front
  cradle: [n(.45, -.5, .7), n(-.35, -.1, .9)],      // arms in front, carrying a small thing (Biscuit)
  point:  [n(.2, .12, 1), n(.1, .12, 1)],           // pointing the way
  wave:   [n(.75, .55, .25), n(.2, 1, .1)],         // waving overhead
  shrug:  [n(.55, -.25, .25), n(.2, .55, .5)],      // palms up
  scoop:  [n(.3, -.55, .7), n(.0, -.45, .95)],      // reaching down-forward to pick something up
  fistUp: [n(.35, .1, .9), n(.1, .95, .3)],         // fist up, triumphant
};
function aim(bone, child, dir, w) {
  if (!bone || !child || w <= .001) return;
  bone.updateWorldMatrix(true, true); bone.getWorldPosition(bp); child.getWorldPosition(cp); cur.copy(cp).sub(bp).normalize();
  dq.setFromUnitVectors(cur, dir); if (w < 1) dq.copy(ID).slerp(dq, w);
  bone.getWorldQuaternion(bq); bq.premultiply(dq); bone.parent.getWorldQuaternion(pq); bone.quaternion.copy(pq.invert().multiply(bq)); bone.updateWorldMatrix(false, true);
}
function apply(c, dt) {
  const a = c.ap; if (!a) return; a.k += (a.kt - a.k) * Math.min(1, dt * (a.rate || 7)); if (a.kt === 0 && a.k < .01) { a.k = 0; if (!a.head && !a.lean) return; }
  c.root.updateWorldMatrix(true, true); c.root.getWorldQuaternion(root_q);
  const P = a.pose && ARM[a.pose];
  if (P && a.k > .01) for (const side of ['L', 'R']) {
    const sd = side === 'L' ? 1 : -1, mine = a.sides === 'L' ? side === 'L' : a.sides === 'R' ? side === 'R' : true; if (!mine) continue;
    const ua = c.bone('DEF-upper_arm.' + side), fa = c.bone('DEF-forearm.' + side), ha = c.bone('DEF-hand.' + side); if (!ua || !fa) continue;
    // an optional second pose for the other arm (a.pose2 / a.sides2)
    const pp = P; dw.set(pp[0].x * sd, pp[0].y, pp[0].z).applyQuaternion(root_q); aim(ua, fa, dw.clone(), a.k);
    if (ha) { dw.set(pp[1].x * sd, pp[1].y, pp[1].z).applyQuaternion(root_q); aim(fa, ha, dw.clone(), a.k); } }
  if (a.lean) { const sp = c.bone('DEF-spine.001'), sp2 = c.bone('DEF-spine.003'); if (sp) sp.rotateX(a.lean * .5); if (sp2) sp2.rotateX(a.lean * .5); }
  if (a.head) { const h = c.bone('DEF-head'); if (h) { h.rotateX(a.head[0] || 0); h.rotateY(a.head[1] || 0); h.rotateZ(a.head[2] || 0); } }
}
// act(c, 'hug') starts the pose (strength 1, fades in); act(c, 'hug', {sides:'R'}) uses one arm; act(c, null) fades out. opts: head [x,y,z] radians, lean (spine forward), rate.
export function act(c, pose, o = {}) {
  if (!c || !c.mixer) return; let a = c.ap; if (!a) { a = c.ap = { k: 0, kt: 0 }; const mu = c.mixer.update; c.mixer.update = function (dt) { const r = mu.call(this, dt); apply(c, dt); return r; }; }
  a.pose = pose || a.pose; a.kt = pose ? (o.k ?? 1) : 0; a.sides = o.sides || null; a.head = o.head || null; a.lean = o.lean || 0; a.rate = o.rate || 7; if (o.snap) a.k = a.kt; }
