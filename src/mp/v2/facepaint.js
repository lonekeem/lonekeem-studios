// v2 painted face: crisp vector-style eyes, brows, mouth, freckles and make-up drawn into one canvas texture in head-local
// metres (front projection). Drawn once per look change; the head shader blends it over the skin.
import * as THREE from 'three';
import { FACE_SPAN, FACE_Y0 } from './head.js';

const S = 1024;
const P = (x, y) => [(x / FACE_SPAN + .5) * S, (1 - (.5 + (y - FACE_Y0) / FACE_SPAN)) * S];
const K = S / FACE_SPAN; // px per metre
const rgba = (hex, a = 1) => { const c = new THREE.Color(hex); return `rgba(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)},${a})`; };
const shade = (hex, k) => { const c = new THREE.Color(hex); c.multiplyScalar(k); return '#' + c.getHexString(); };
const mixc = (a, b, t) => '#' + new THREE.Color(a).lerp(new THREE.Color(b), t).getHexString();
function rnd(seed) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

// eye presets: [w, h, tilt(rad), upperArch(0..1), lowerFlat(0..1)]
export const EYE_SHAPES = { Almond: [.056, .04, .06, .55, .6], Round: [.052, .046, 0, .75, .35], Wide: [.06, .041, 0, .6, .5], Narrow: [.056, .03, .04, .45, .7], Upturned: [.056, .039, .16, .55, .6], Downturned: [.056, .039, -.12, .55, .55],
  Hooded: [.056, .034, 0, .4, .6], Big: [.062, .048, 0, .7, .4], Sleepy: [.056, .032, -.05, .35, .6], Cat: [.06, .035, .22, .5, .65], Small: [.048, .034, 0, .6, .5], 'Deep-set': [.054, .036, .03, .5, .6] };

function eyePath(g, cx, cy, w, h, tilt, arch, flat, side) { // in px, side=+1 left eye (screen right)
  const hw = w / 2, inn = [-hw * side, 0], out = [hw * side, 0];
  const a = -tilt * side, ca = Math.cos(a), sa = Math.sin(a); const pts = (x, y) => [cx + x * ca - y * sa, cy + x * sa + y * ca];
  const I = pts(...inn), O = pts(...out);
  const up1 = pts(-hw * .5 * side, -h * (1.25 + .2 * arch)), up2 = pts(hw * .5 * side, -h * (1.2 + .3 * arch));
  const lo1 = pts(hw * .45 * side, h * (1.0 - .3 * flat)), lo2 = pts(-hw * .45 * side, h * (.95 - .3 * flat));
  g.beginPath(); g.moveTo(...I); g.bezierCurveTo(...up1, ...up2, ...O); g.bezierCurveTo(...lo1, ...lo2, ...I); g.closePath();
  return { I, O, up1, up2, lo1, lo2 };
}
function drawEye(g, o, side) {
  const [ex, ey] = P(side * o.eyeX, o.eyeY); const w = o.w * K, h = o.h * K * .5;
  // soft socket shade + lid crease on the skin
  g.save(); const gr = g.createRadialGradient(ex, ey - h * .6, h * .5, ex, ey - h * .4, w * .85); gr.addColorStop(0, rgba(o.skinDark, .22)); gr.addColorStop(1, rgba(o.skinDark, 0)); g.fillStyle = gr; g.beginPath(); g.ellipse(ex, ey - h * .5, w * .78, h * 2.0, 0, 0, 7); g.fill(); g.restore();
  if (o.shadow > 0) { g.save(); const sg = g.createRadialGradient(ex + side * w * .1, ey - h * 1.1, h * .3, ex, ey - h, w * .75); sg.addColorStop(0, rgba(o.shadowCol, .25 + .2 * o.shadow)); sg.addColorStop(1, rgba(o.shadowCol, 0)); g.fillStyle = sg; g.beginPath(); g.ellipse(ex, ey - h * 1.0, w * .7, h * 1.5, 0, 0, 7); g.fill(); g.restore(); }
  // crease line
  g.save(); g.strokeStyle = rgba(o.skinDark, .32); g.lineWidth = Math.max(2, K * .001); g.lineCap = 'round'; g.beginPath(); g.moveTo(ex - side * w * .42, ey - h * 1.05); g.quadraticCurveTo(ex + side * w * .05, ey - h * (1.6 + .2 * o.arch), ex + side * w * .48, ey - h * .95); g.stroke(); g.restore();
  // sclera
  const E = eyePath(g, ex, ey, w, h, o.tilt, o.arch, o.flat, side); g.save(); g.clip();
  const sg = g.createLinearGradient(0, ey - h, 0, ey + h * .7); sg.addColorStop(0, '#d9d4d0'); sg.addColorStop(.35, '#fbfaf8'); sg.addColorStop(1, '#f1ece8'); g.fillStyle = sg; g.fillRect(ex - w, ey - h * 2, w * 2, h * 4);
  const cg = g.createRadialGradient(ex, ey, w * .25, ex, ey, w * .6); cg.addColorStop(0, 'rgba(0,0,0,0)'); cg.addColorStop(1, 'rgba(120,80,70,.18)'); g.fillStyle = cg; g.fillRect(ex - w, ey - h * 2, w * 2, h * 4);
  // iris
  const ir = h * .98 * o.irisK, ix = ex + side * w * .03, iy = ey - h * .12;
  const ig = g.createRadialGradient(ix, iy + ir * .25, ir * .1, ix, iy, ir); ig.addColorStop(0, mixc(o.eyeCol, '#ffffff', .25)); ig.addColorStop(.55, o.eyeCol); ig.addColorStop(.86, shade(o.eyeCol, .55)); ig.addColorStop(1, shade(o.eyeCol, .25));
  g.fillStyle = ig; g.beginPath(); g.arc(ix, iy, ir, 0, 7); g.fill();
  const R = rnd(7 + side); g.strokeStyle = rgba(shade(o.eyeCol, .5), .35); g.lineWidth = 1.2; for (let k = 0; k < 26; k++) { const a = R() * 6.283; g.beginPath(); g.moveTo(ix + Math.cos(a) * ir * .4, iy + Math.sin(a) * ir * .4); g.lineTo(ix + Math.cos(a) * ir * .9, iy + Math.sin(a) * ir * .9); g.stroke(); }
  g.fillStyle = '#0d0907'; g.beginPath(); g.arc(ix, iy, ir * .44, 0, 7); g.fill();
  // upper lid shadow on the eyeball
  const lg = g.createLinearGradient(0, ey - h * 1.1, 0, ey - h * .2); lg.addColorStop(0, 'rgba(40,20,15,.45)'); lg.addColorStop(1, 'rgba(40,20,15,0)'); g.fillStyle = lg; g.fillRect(ex - w, ey - h * 2, w * 2, h * 2);
  // highlights
  g.fillStyle = 'rgba(255,255,255,.95)'; g.beginPath(); g.ellipse(ix - ir * .38, iy - ir * .38, ir * .26, ir * .22, -.5, 0, 7); g.fill();
  g.fillStyle = 'rgba(255,255,255,.75)'; g.beginPath(); g.arc(ix + ir * .36, iy + ir * .34, ir * .1, 0, 7); g.fill();
  g.restore();
  // lash line (upper lid), thicker towards the outer corner, optional wing
  const lw = K * (.0016 + .0012 * o.liner + .0006 * o.lash);
  g.save(); g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = '#1a1210'; g.fillStyle = '#1a1210';
  g.beginPath(); g.moveTo(...E.I); g.bezierCurveTo(...E.up1, ...E.up2, ...E.O); g.lineWidth = lw; g.stroke();
  for (let k = 0; k < 12; k++) { const t0 = .45 + k * .046, t1 = t0 + .05; g.lineWidth = lw * (1 + .9 * (k / 11)); g.beginPath(); g.moveTo(bez(E.I[0], E.up1[0], E.up2[0], E.O[0], t0), bez(E.I[1], E.up1[1], E.up2[1], E.O[1], t0)); g.lineTo(bez(E.I[0], E.up1[0], E.up2[0], E.O[0], Math.min(1, t1)), bez(E.I[1], E.up1[1], E.up2[1], E.O[1], Math.min(1, t1))); g.stroke(); }
  if (o.liner >= 2 || o.wing) { const L = (o.liner >= 3 ? 1.3 : 1) * w * .32; g.beginPath(); g.moveTo(E.O[0] - side * w * .12, E.O[1] - lw * .55); g.lineTo(E.O[0] + side * L, E.O[1] - L * .55); g.lineTo(E.O[0] - side * w * .02, E.O[1] + lw * .45); g.closePath(); g.fill(); }
  if (o.lash > .05) { g.lineWidth = Math.max(2, lw * .55); for (let k = 0; k < 3; k++) { const t = .72 + k * .12; const bx = bez(E.I[0], E.up1[0], E.up2[0], E.O[0], t), by = bez(E.I[1], E.up1[1], E.up2[1], E.O[1], t); const L = h * (.22 + .25 * o.lash) * (.5 + .6 * t); g.beginPath(); g.moveTo(bx, by); g.quadraticCurveTo(bx + side * L * .7, by - L * .3, bx + side * L * 1.2, by - L * .75); g.stroke(); } }
  // lower lid
  g.lineWidth = Math.max(1.5, K * .0007); g.strokeStyle = rgba(o.skinDark, .6); g.beginPath(); g.moveTo(...E.O); g.bezierCurveTo(...E.lo1, ...E.lo2, ...E.I); g.stroke();
  if (o.liner >= 3) { g.strokeStyle = 'rgba(26,18,16,.7)'; g.lineWidth = lw * .5; g.beginPath(); g.moveTo(...E.O); g.bezierCurveTo(...E.lo1, ...E.lo2, E.I[0] + side * w * .2, E.I[1]); g.stroke(); }
  // inner corner (caruncle)
  g.fillStyle = 'rgba(214,140,130,.8)'; g.beginPath(); g.ellipse(E.I[0] + side * w * .035, E.I[1] + h * .05, w * .03, h * .14, 0, 0, 7); g.fill();
  g.restore();
}
const bez = (a, b, c, d, t) => { const u = 1 - t; return u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * d; };

// brow presets: [arch, tilt, taper, thick(m), len(m)]
export const BROW_SHAPES = { Soft: [.5, .12, .55, .0062, .05], Straight: [.12, 0, .35, .0065, .052], Arched: [.95, .2, .65, .0052, .05], Thick: [.42, .08, .4, .0095, .053], Thin: [.55, .14, .6, .0034, .048], Bushy: [.3, .05, .25, .011, .055],
  Angled: [.8, .38, .5, .0062, .05], Upswept: [.4, .45, .6, .006, .05], 'Flat thick': [.05, 0, .25, .0095, .054], Short: [.5, .1, .45, .0062, .036], Sparse: [.5, .12, .55, .0055, .05], Unibrow: [.3, .03, .2, .008, .058] };
function drawBrow(g, o, side) {
  const [bx, by] = P(side * (o.eyeX + .002), o.browY); const L = o.bLen * K, T = o.bThick * K; const arch = o.bArch, tilt = o.bTilt;
  const x0 = bx - side * L * .5, x1 = bx + side * L * .5; const y0 = by + T * .2 + tilt * L * .12, y1 = by + tilt * L * .1 - tilt * L * .3;
  const pk = [bx + side * L * .12, by - L * (.08 + .14 * arch)];
  g.save(); const col = o.browCol; const R = rnd(31 + side);
  // filled tapered shape
  g.fillStyle = rgba(col, o.bSparse ? .55 : .92); g.beginPath(); g.moveTo(x0, y0 - T * .55); g.quadraticCurveTo(pk[0], pk[1] - T * .6, x1, y1 - T * (.35 - .3 * o.bTaper)); g.quadraticCurveTo(x1 + side * T * .3, y1, x1, y1 + T * (.1)); g.quadraticCurveTo(pk[0], pk[1] + T * .6, x0, y0 + T * .55); g.quadraticCurveTo(x0 - side * T * .45, y0, x0, y0 - T * .55); g.fill();
  // hair strokes for texture
  g.strokeStyle = rgba(shade(col, 1.25), .45); g.lineWidth = 1.4; g.lineCap = 'round';
  for (let k = 0; k < 70; k++) { const t = R(); const qx = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * pk[0] + t * t * x1, qy = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * pk[1] + t * t * y1; const off = (R() - .5) * T * .9 * (1 - t * o.bTaper * .6); const a = -side * (t < .3 ? 1.0 : .35); g.beginPath(); g.moveTo(qx, qy + off); g.lineTo(qx + side * T * .9 * Math.cos(a), qy + off - T * .7 * Math.abs(Math.sin(a))); g.stroke(); }
  if (o.unibrow && side > 0) { g.fillStyle = rgba(col, .5); g.beginPath(); g.ellipse(P(0, o.browY)[0], by + T * .2, L * .2, T * .35, 0, 0, 7); g.fill(); }
  g.restore();
}
// mouth presets: [w(m), lip fullness, smile(0..1), open teeth(0/1)]
export const MOUTH_SHAPES = { Neutral: [.054, .5, .15, 0], Full: [.052, .85, .2, 0], Thin: [.05, .2, .15, 0], Smile: [.058, .5, .7, 1], Wide: [.064, .55, .45, 1], Small: [.04, .55, .1, 0], Pouty: [.045, .95, 0, 0], Smirk: [.052, .5, .45, 0], Grin: [.064, .55, .85, 1] };
function drawMouth(g, o) {
  const [mx, my] = P(0, o.mouthY); const w = o.mW * K, full = o.mFull, sm = o.mSmile; const lip = o.lipCol;
  g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
  if (o.mOpen) {
    const top = my - w * (.05 + .02 * sm), cY = my - w * .12 * sm, bot = my + w * (.3 + .1 * sm);
    // opening
    g.beginPath(); g.moveTo(mx - w * .5, cY); g.bezierCurveTo(mx - w * .25, top - w * .03, mx + w * .25, top - w * .03, mx + w * .5, cY); g.bezierCurveTo(mx + w * .36, bot, mx - w * .36, bot, mx - w * .5, cY); g.closePath();
    g.fillStyle = '#4a1418'; g.fill(); g.save(); g.clip();
    g.fillStyle = '#c4545e'; g.beginPath(); g.ellipse(mx, bot + w * .02, w * .3, w * .14, 0, 0, 7); g.fill(); // tongue
    // upper teeth row
    const tg = g.createLinearGradient(0, top, 0, top + w * .2); tg.addColorStop(0, '#ffffff'); tg.addColorStop(1, '#ece6df'); g.fillStyle = tg; g.beginPath(); g.moveTo(mx - w * .5, cY - 2); g.bezierCurveTo(mx - w * .25, top - w * .05, mx + w * .25, top - w * .05, mx + w * .5, cY - 2); g.lineTo(mx + w * .42, cY + w * .1); g.bezierCurveTo(mx + w * .2, top + w * .22, mx - w * .2, top + w * .22, mx - w * .42, cY + w * .1); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(160,140,130,.35)'; g.lineWidth = 1.2; for (const k of [-.24, -.08, .08, .24]) { g.beginPath(); g.moveTo(mx + w * k, top + w * .0); g.lineTo(mx + w * k * 1.04, top + w * .15); g.stroke(); }
    g.fillStyle = 'rgba(240,235,228,.9)'; g.beginPath(); g.ellipse(mx, bot - w * .02, w * .2, w * .05, 0, Math.PI, 0); g.fill();
    g.restore();
    // lips around the opening
    g.strokeStyle = rgba(shade(lip, .9), .9); g.lineWidth = w * (.05 + .03 * full); g.beginPath(); g.moveTo(mx - w * .5, cY); g.bezierCurveTo(mx - w * .36, bot + w * .03, mx + w * .36, bot + w * .03, mx + w * .5, cY); g.stroke();
    g.strokeStyle = rgba(shade(lip, .8), .85); g.lineWidth = w * (.035 + .02 * full); g.beginPath(); g.moveTo(mx - w * .5, cY); g.bezierCurveTo(mx - w * .25, top - w * .06, mx + w * .25, top - w * .06, mx + w * .5, cY); g.stroke();
    g.fillStyle = rgba(o.skinDark, .35); for (const sd of [-1, 1]) { g.beginPath(); g.ellipse(mx + sd * w * .56, cY - w * .02, w * .03, w * .06, sd * .4, 0, 7); g.fill(); }
  } else {
    const cY = my - w * .1 * sm, smirk = o.mSmirk ? w * .06 : 0;
    // lower lip
    const lh = w * (.12 + .14 * full), uh = w * (.08 + .1 * full);
    const lg = g.createLinearGradient(0, my - uh, 0, my + lh); lg.addColorStop(0, shade(lip, .85)); lg.addColorStop(1, lip); g.fillStyle = lg;
    g.beginPath(); g.moveTo(mx - w * .5, cY); g.bezierCurveTo(mx - w * .3, my + lh * 1.1, mx + w * .3, my + lh * 1.1, mx + w * .5, cY - smirk); g.bezierCurveTo(mx + w * .2, my + lh * .1, mx - w * .2, my + lh * .1, mx - w * .5, cY); g.fill();
    g.fillStyle = shade(lip, .8); g.beginPath(); g.moveTo(mx - w * .5, cY); g.bezierCurveTo(mx - w * .3, my - uh * .5, mx - w * .12, my - uh * 1.1, mx, my - uh * .7); g.bezierCurveTo(mx + w * .12, my - uh * 1.1, mx + w * .3, my - uh * .5, mx + w * .5, cY - smirk); g.bezierCurveTo(mx + w * .2, my + uh * .15, mx - w * .2, my + uh * .15, mx - w * .5, cY); g.fill();
    g.fillStyle = 'rgba(255,255,255,.22)'; g.beginPath(); g.ellipse(mx, my + lh * .55, w * .14, lh * .18, 0, 0, 7); g.fill();
    g.strokeStyle = 'rgba(60,20,20,.75)'; g.lineWidth = Math.max(2, K * .0011); g.beginPath(); g.moveTo(mx - w * .52, cY - w * .01); g.bezierCurveTo(mx - w * .2, my + uh * .2, mx + w * .2, my + uh * .2, mx + w * .52, cY - smirk - w * .01); g.stroke();
  }
  g.restore();
}
function freckles(g, o) { const R = rnd(99), n = [0, 26, 48, 80][o.freckles] || 0; g.save();
  for (let k = 0; k < n; k++) { const side = R() < .5 ? -1 : 1; const t = R(); const x = side * (.012 + t * .055), y = -.03 - .018 * R() + .012 * Math.sin(t * 3); const [px, py] = P(x, y); g.fillStyle = rgba(o.freckleCol, .35 + .35 * R()); g.beginPath(); g.ellipse(px, py, 2.4 + R() * 2.4, 2 + R() * 2, R() * 3, 0, 7); g.fill(); }
  for (let k = 0; k < n / 4; k++) { const [px, py] = P((R() - .5) * .02, -.02 - R() * .012); g.fillStyle = rgba(o.freckleCol, .35 + .3 * R()); g.beginPath(); g.arc(px, py, 2 + R() * 2, 0, 7); g.fill(); }
  g.restore(); }
function blush(g, o) { if (!o.blush) return; for (const sd of [-1, 1]) { const [px, py] = P(sd * .056, -.047); const r = K * .028; const gr = g.createRadialGradient(px, py, 0, px, py, r); gr.addColorStop(0, rgba('#e0506a', .1 + .08 * o.blush)); gr.addColorStop(1, 'rgba(224,80,106,0)'); g.fillStyle = gr; g.beginPath(); g.arc(px, py, r, 0, 7); g.fill(); } }
function nose(g, o) { // 3D-nose helper shading: bridge side shadows, nostril shadows, under-tip shadow, soft tip highlight (reads even in flat frontal light)
  const [nx, ny] = P(0, o.noseY - .007); const w = K * .011 * o.noseW; g.save();
  const grad = (x, y, rx, ry, col, a, rot = 0) => { g.save(); g.translate(x, y); g.rotate(rot); g.scale(rx, ry); const gr = g.createRadialGradient(0, 0, 0, 0, 0, 1); gr.addColorStop(0, rgba(col, a)); gr.addColorStop(1, rgba(col, 0)); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 1, 0, 7); g.fill(); g.restore(); };
  for (const sd of [-1, 1]) { grad(nx + sd * w * 1.55, ny - w * 1.9, w * .6, w * 2.4, o.skinDark, .3, sd * .12); grad(nx + sd * w * 1.3, ny + w * .1, w * .8, w * .9, o.skinDark, .22); }
  grad(nx, ny + w * 1.35, w * 1.6, w * .7, o.skinDark, .34);
  g.fillStyle = rgba(o.skinDark, .6); for (const sd of [-1, 1]) { g.beginPath(); g.ellipse(nx + sd * w * .52, ny + w * .55, w * .26, w * .14, sd * -.4, 0, 7); g.fill(); }
  grad(nx, ny - w * .35, w * .75, w * .65, '#fff0dd', .2); grad(nx, ny - w * 2.6, w * .35, w * 1.6, '#fff0dd', .1);
  g.restore(); }
function moles(g, o) { const spots = [[.05, -.075], [-.035, .055], [.065, -.01]]; for (let k = 0; k < (o.moles || 0); k++) { const [px, py] = P(...spots[k]); g.fillStyle = 'rgba(70,40,30,.85)'; g.beginPath(); g.arc(px, py, 3.2, 0, 7); g.fill(); } }
function beardShade(g, o) { return; /* v1.9.28: smooth underlay in headrig.js instead of a speckled halo */ if (!o.beardShade) return; const R = rnd(9); g.save(); // soft stubble halo just past the beard edge: skin -> stubble -> beard
  for (let k = 0; k < 9000; k++) { const x = (R() - .5) * .22, y = -.16 + R() * .14; const ax = Math.abs(x); const lineY = -.062 + ax * .5; const dy = y - lineY; if (dy > .02 || ax > .105) continue; if (Math.abs(y - o.mouthY) < .011 && ax < o.mW * .5) continue;
    const a = .45 * Math.min(1, Math.max(0, (.02 - dy) / .02)); const [px, py] = P(x, y); g.fillStyle = rgba(o.stubbleCol, a * (.5 + .5 * R())); g.fillRect(px, py, 2, 2); }
  g.restore(); }
function stubble(g, o) { return; /* v1.9.28: stubble is the smooth skin-shader shadow (face.js); the dotted paint read as a rash */ if (!o.stubble) return; const R = rnd(5); g.save(); g.fillStyle = rgba(o.stubbleCol, .35); // dotted shadow over jaw / upper lip
  for (let k = 0; k < 5000; k++) { const x = (R() - .5) * .2, y = -.15 + R() * .13; const ax = Math.abs(x); const inJaw = y < -.055 + ax * .5 && y > -.15 && !(Math.abs(y - o.mouthY) < .012 && ax < o.mW * .55) && ax < .1; const must = Math.abs(y - (o.mouthY + .02)) < .01 && ax < .03; if (!(inJaw || must)) continue; const [px, py] = P(x, y); g.fillRect(px, py, 2, 2); }
  g.restore(); }

export function paintFace(o, tex) {
  const cv = tex ? tex.image : document.createElement('canvas'); cv.width = cv.height = S; const g = cv.getContext('2d'); g.clearRect(0, 0, S, S);
  blush(g, o); freckles(g, o); moles(g, o); stubble(g, o); beardShade(g, o); nose(g, o);
  for (const sd of [-1, 1]) { drawEye(g, o, sd); drawBrow(g, o, sd); }
  drawMouth(g, o);
  if (!tex) { tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4; tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter; } else tex.needsUpdate = true;
  return tex;
}
