// Face parts the base mesh lacks: a real, smooth nose (bridge + rounded tip + nostril wings) and curled eyelashes. Original geometry, built from the
// avatar's measured head landmarks (ctx), rigidly bound to the Head bone like every other accessory. Sizes follow the look's nose / eye sliders.
import * as THREE from 'three';
const PI = Math.PI;
export function faceParts(B, ctx, look, fem, morph = {}) {
  const hw = ctx.hw, fz = ctx.faceZ, ey = ctx.eyeY, ny = ctx.noseY, cy = ctx.chinY;
  const nW = 1 + (morph.noseW || 0) * .5, nL = (morph.noseLen || 0) * .5, nB = 1 + (morph.noseBridge || 0) * .4;
  // ---- nose ----
  const tipY = cy + 1.12 * hw, baseY = ny - .01 * hw, topY = ey - .1 * hw;
  const zTip = fz(0, tipY) + hw * (.105 + .06 * nL);
  B.taper([[0, topY, fz(0, topY) + hw * .01], [0, (topY + tipY) / 2, fz(0, (topY + tipY) / 2) + hw * .06 * nB], [0, tipY + hw * .01, zTip - hw * .05]], hw * .045 * nB, hw * .085 * nW, 'a', 10, 10);
  B.sphere(hw * .1 * nW, [0, tipY, zTip - hw * .025], [1, .9, .95], 'a');
  for (const s of [1, -1]) { B.sphere(hw * .06 * nW, [s * hw * .1 * nW, baseY + hw * .035, fz(s * hw * .1, baseY) + hw * .035 + hw * .02 * nL], [1, .95, .9], 'a');
    B.sphere(hw * .016, [s * hw * .06 * nW, baseY - hw * .005, zTip - hw * .045], [1, .6, 1.1], 'k'); } // nostrils
  // ---- eyelashes (upper lid arcs with a little flick; longer + thicker on the feminine bases) ----
  const sp = look.eyes ? look.eyes.space * .06 : 0, sz = 1 + .35 * (look.eyes ? look.eyes.size : 0), ex = (.41 + sp) * hw, rx = .21 * hw * sz, ry = .16 * hw * sz;
  const n = look.eyes ? .3 + look.eyes.lash * .5 : .5, L = (fem ? 1 : .55) * (.7 + n), th = hw * (fem ? .017 : .011);
  for (const s of [1, -1]) { const pts = []; for (let i = 0; i <= 6; i++) { const t = i / 6, a = PI * (.04 + .92 * t); const x = s * (ex - rx * Math.cos(a)), y = ey + ry * (.55 + .55 * Math.sin(a)) + (t > .85 ? hw * .015 * L : 0); pts.push([x - s * (t > .8 ? -hw * .02 * L : 0), y, fz(x, y) + hw * .012]); }
    B.tube(pts, th, 'k', false, 20, 5);
    if (fem) for (let i = 1; i <= 5; i++) { const t = i / 6, a = PI * (.04 + .92 * t); const x = s * (ex - rx * Math.cos(a)), y = ey + ry * (.55 + .55 * Math.sin(a)); const dx = s * Math.cos(a) * hw * .035 * L, dy = hw * .06 * L; B.tube([[x, y, fz(x, y) + hw * .012], [x + dx * .6, y + dy * .6, fz(x, y) + hw * .02], [x + dx, y + dy, fz(x, y) + hw * .03]], th * .6, 'k', false, 6, 4); } }
}
