// v2.1 environment textures — all procedural (no external files, no brand marks).
// Alpha-cutout plant cards are painted as an opaque colour canvas + a separate white-on-black mask canvas and
// then merged into a non-premultiplied RGBA DataTexture, so transparent texels keep the leaf colour (no black fringes in mips).
import * as THREE from 'three';

export function prng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const cv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

function merge(w, h, paint) {
  const cc = cv(w, h), mc = cv(w, h), cg = cc.getContext('2d', { willReadFrequently: true }), mg = mc.getContext('2d', { willReadFrequently: true });
  paint(cg, mg, w, h);
  const A = cg.getImageData(0, 0, w, h).data, B = mg.getImageData(0, 0, w, h).data, out = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = (y * w + x) * 4, o = ((h - 1 - y) * w + x) * 4; out[o] = A[i]; out[o + 1] = A[i + 1]; out[o + 2] = A[i + 2]; out[o + 3] = B[i]; }
  return { w, h, data: out };
}
export function toTex(r, srgb = true) {
  const t = new THREE.DataTexture(r.data, r.w, r.h, THREE.RGBAFormat); t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; t.anisotropy = 4; t.needsUpdate = true; return t; }

const hsl = (h, s, l) => `hsl(${h | 0},${s | 0}%,${l | 0}%)`;

// ---- grass clump: dense tapered blades, dark roots -> bright tips, some dry straw blades and seed heads
export function grassClump(seed = 1) {
  const R = prng(seed);
  return merge(256, 256, (c, m, w, h) => {
    c.fillStyle = '#4c5c2a'; c.fillRect(0, 0, w, h); m.fillStyle = '#000'; m.fillRect(0, 0, w, h);
    const blades = []; for (let i = 0; i < 78; i++) { const g = (R() + R() + R() - 1.5) / 1.5; blades.push({ x: w * .5 + g * w * .3, hh: h * (.3 + Math.pow(R(), .8) * .68), lean: (R() - .5) * w * .5, bw: 4 + R() * 6, dry: R() < .16, hue: 78 + R() * 24 }); }
    blades.sort((a, b) => a.hh - b.hh);
    for (const b of blades) {
      const x = b.x, H = h, tx = x + b.lean, ty = H - b.hh; const path = (g) => { g.beginPath(); g.moveTo(x - b.bw / 2, H + 2); g.quadraticCurveTo(x + b.lean * .15 - b.bw * .45, H - b.hh * .55, tx, ty); g.quadraticCurveTo(x + b.lean * .15 + b.bw * .45, H - b.hh * .55, x + b.bw / 2, H + 2); g.closePath(); };
      const gr = c.createLinearGradient(0, H, 0, ty);
      if (b.dry) { gr.addColorStop(0, hsl(50, 28, 22)); gr.addColorStop(.5, hsl(46, 38, 44)); gr.addColorStop(1, hsl(42, 42, 62)); }
      else { gr.addColorStop(0, hsl(b.hue + 10, 45, 14)); gr.addColorStop(.35, hsl(b.hue, 48, 28)); gr.addColorStop(1, hsl(b.hue - 14, 55, 52)); }
      c.fillStyle = gr; path(c); c.fill(); c.strokeStyle = 'rgba(210,230,150,.22)'; c.lineWidth = 1; c.beginPath(); c.moveTo(x, H); c.quadraticCurveTo(x + b.lean * .15, H - b.hh * .55, tx, ty); c.stroke();
      m.fillStyle = '#fff'; path(m); m.fill();
    }
    for (let i = 0; i < 3; i++) { const x = w * (.3 + R() * .4), hh = h * (.7 + R() * .25), lean = (R() - .5) * 30; c.strokeStyle = hsl(44, 35, 40); c.lineWidth = 2; m.strokeStyle = '#fff'; m.lineWidth = 2;
      for (const g of [c, m]) { g.beginPath(); g.moveTo(x, h); g.quadraticCurveTo(x + lean * .3, h - hh * .5, x + lean, h - hh); g.stroke(); }
      c.fillStyle = hsl(42, 40, 52); m.fillStyle = '#fff'; for (const g of [c, m]) { g.beginPath(); g.ellipse(x + lean, h - hh - 8, 3.5, 12, lean * .01, 0, 7); g.fill(); } }
  });
}

// ---- broadleaf weeds (plantain / dock rosette)
export function weedPlant(seed = 2) {
  const R = prng(seed);
  return merge(256, 256, (c, m, w, h) => {
    c.fillStyle = '#41592a'; c.fillRect(0, 0, w, h); m.fillStyle = '#000'; m.fillRect(0, 0, w, h);
    const L = []; for (let i = 0; i < 9; i++) L.push({ a: (R() - .5) * 2.0, len: h * (.38 + R() * .46), wd: 14 + R() * 12 });
    L.sort((a, b) => a.len - b.len);
    for (const l of L) {
      c.save(); m.save(); for (const g of [c, m]) { g.translate(w / 2 + (R() - .5) * 24, h); g.rotate(l.a * .7); }
      const path = (g) => { g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(-l.wd, -l.len * .3, -l.wd * .9, -l.len * .72, 0, -l.len); g.bezierCurveTo(l.wd * .9, -l.len * .72, l.wd, -l.len * .3, 0, 0); g.closePath(); };
      const gr = c.createLinearGradient(0, 0, 0, -l.len); gr.addColorStop(0, hsl(95, 40, 18)); gr.addColorStop(.5, hsl(98 + R() * 12, 46, 30)); gr.addColorStop(1, hsl(90, 50, 44));
      c.fillStyle = gr; path(c); c.fill(); c.strokeStyle = 'rgba(190,215,130,.55)'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -l.len * .96); c.stroke();
      c.strokeStyle = 'rgba(30,50,15,.35)'; c.lineWidth = 1; for (let k = 1; k < 6; k++) { const y = -l.len * k / 6.2; c.beginPath(); c.moveTo(0, y); c.lineTo(-l.wd * .6, y - l.len * .06); c.moveTo(0, y); c.lineTo(l.wd * .6, y - l.len * .06); c.stroke(); }
      m.fillStyle = '#fff'; path(m); m.fill(); c.restore(); m.restore();
    }
  });
}

// ---- fern frond fan
export function fernPlant(seed = 3) {
  const R = prng(seed);
  return merge(256, 256, (c, m, w, h) => {
    c.fillStyle = '#3d5a28'; c.fillRect(0, 0, w, h); m.fillStyle = '#000'; m.fillRect(0, 0, w, h);
    for (let f = 0; f < 7; f++) {
      const a = (f - 3) * .36 + (R() - .5) * .12, len = h * (.62 + R() * .32);
      c.save(); m.save(); for (const g of [c, m]) { g.translate(w / 2, h); g.rotate(a); }
      for (const g of [c, m]) { g.strokeStyle = g === c ? hsl(88, 35, 28) : '#fff'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(a * 18, -len * .5, a * 36, -len); g.stroke(); }
      const n = 22; for (let k = 1; k < n; k++) { const t = k / n, y = -len * t, x = a * 36 * t * t, ll = (1 - t * .85) * 44 + 4, wd = 5;
        for (const sd of [-1, 1]) { const g = c; g.fillStyle = hsl(100 + R() * 14, 46, 26 + t * 24); g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + sd * ll * .5, y - wd - 4, x + sd * ll, y - 12 * (1 - t) - 4); g.quadraticCurveTo(x + sd * ll * .5, y + wd - 6, x, y); g.fill();
          m.fillStyle = '#fff'; m.beginPath(); m.moveTo(x, y); m.quadraticCurveTo(x + sd * ll * .5, y - wd - 4, x + sd * ll, y - 12 * (1 - t) - 4); m.quadraticCurveTo(x + sd * ll * .5, y + wd - 6, x, y); m.fill(); } }
      c.restore(); m.restore();
    }
  });
}

// ---- pine bough card: twig along the middle (x = 0 at trunk -> 1 at tip), thousands of needle strokes
export function pineBough(seed = 4) {
  const R = prng(seed);
  return merge(256, 192, (c, m, w, h) => {
    c.fillStyle = '#23361f'; c.fillRect(0, 0, w, h); m.fillStyle = '#000'; m.fillRect(0, 0, w, h);
    const mid = h / 2;
    for (const g of [c, m]) { g.strokeStyle = g === c ? '#3a2a1c' : '#fff'; g.lineWidth = 4; g.lineCap = 'round'; g.beginPath(); g.moveTo(0, mid); g.lineTo(w, mid + (R() - .5) * 8); g.stroke(); }
    // side twigs
    const tw = []; for (let i = 0; i < 9; i++) { const t = .05 + i / 9 * .85, sd = i % 2 ? 1 : -1; tw.push({ x: w * t, sd, len: h * (.32 + .12 * (1 - t) + R() * .1) }); }
    for (const T of tw) for (const g of [c, m]) { g.strokeStyle = g === c ? '#3a2a1c' : '#fff'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(T.x, mid); g.lineTo(T.x + T.len * .55, mid + T.sd * T.len); g.stroke(); }
    const needle = (x, y, ang, len, lt) => { const col = hsl(112 + R() * 16, 38 + R() * 12, 14 + lt * 22 + R() * 8);
      c.strokeStyle = col; c.lineWidth = 2.2; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len); c.stroke();
      m.strokeStyle = '#fff'; m.lineWidth = 2.4; m.beginPath(); m.moveTo(x, y); m.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len); m.stroke(); };
    c.lineCap = 'round'; m.lineCap = 'round';
    for (let i = 0; i < 1500; i++) { const T = R() < .55 ? null : tw[(R() * tw.length) | 0]; let x, y, base;
      if (!T) { x = R() * w; y = mid + (R() - .5) * 6; base = 0; } else { const s = R(); x = T.x + T.len * .55 * s; y = mid + T.sd * T.len * s; base = T.sd; }
      const side = R() < .5 ? -1 : 1, ang = side * (.5 + R() * .7) + (R() - .5) * .4 + Math.PI * .0, a2 = (base || side) > 0 ? Math.atan2(1, .8) + (R() - .5) * 1.1 : Math.atan2(-1, .8) + (R() - .5) * 1.1;
      needle(x, y, a2, 26 + R() * 24, x / w); }
  });
}

// ---- deciduous / bush leaf cluster (near-neutral leaves so instance colour sets green / yellow / rust / dead)
export function leafCluster(seed = 5) {
  const R = prng(seed);
  return merge(256, 256, (c, m, w, h) => {
    c.fillStyle = '#6f7d4a'; c.fillRect(0, 0, w, h); m.fillStyle = '#000'; m.fillRect(0, 0, w, h);
    const tw = []; for (let i = 0; i < 8; i++) { const a = R() * 6.28, d = 40 + R() * 62; tw.push([w / 2 + Math.cos(a) * d, h / 2 + Math.sin(a) * d]); }
    for (const [x, y] of tw) for (const g of [c, m]) { g.strokeStyle = g === c ? '#4a3a26' : '#fff'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(w / 2, h / 2); g.lineTo(x, y); g.stroke(); }
    const leaves = []; for (let i = 0; i < 130; i++) { const t = tw[(R() * tw.length) | 0], a = R() * 6.28, d = R() * 46; leaves.push({ x: t[0] + Math.cos(a) * d * .8, y: t[1] + Math.sin(a) * d * .8, a: R() * 6.28, l: 26 + R() * 22, wd: 9 + R() * 6, v: R() }); }
    for (const l of leaves) { c.save(); m.save(); for (const g of [c, m]) { g.translate(l.x, l.y); g.rotate(l.a); }
      const p = (g) => { g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(l.l * .25, -l.wd, l.l * .75, -l.wd * .8, l.l, 0); g.bezierCurveTo(l.l * .75, l.wd * .8, l.l * .25, l.wd, 0, 0); g.closePath(); };
      c.fillStyle = hsl(78 + l.v * 22, 22 + l.v * 12, 40 + l.v * 22); p(c); c.fill(); c.strokeStyle = 'rgba(230,240,190,.45)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(0, 0); c.lineTo(l.l * .92, 0); c.stroke();
      c.strokeStyle = 'rgba(40,50,20,.25)'; c.lineWidth = .8; for (let k = 1; k < 4; k++) { c.beginPath(); c.moveTo(l.l * k / 4.4, 0); c.lineTo(l.l * k / 4.4 + 6, -l.wd * .7); c.moveTo(l.l * k / 4.4, 0); c.lineTo(l.l * k / 4.4 + 6, l.wd * .7); c.stroke(); }
      m.fillStyle = '#fff'; p(m); m.fill(); c.restore(); m.restore(); }
  });
}

// ---- road overlay: crack network, patch repairs, oil stains, faded cracks (transparent dark decal)
export function roadDecal(seed = 6, size = 512) {
  const R = prng(seed), c = cv(size, size), g = c.getContext('2d'); g.clearRect(0, 0, size, size);
  const wrapDraw = (fn) => { for (const ox of [-size, 0, size]) for (const oy of [-size, 0, size]) { g.save(); g.translate(ox, oy); fn(); g.restore(); } };
  // patches
  for (let i = 0; i < 3; i++) { const x = R() * size, y = R() * size, w = 60 + R() * 120, h = 40 + R() * 100; wrapDraw(() => { g.fillStyle = `rgba(8,9,9,${.18 + R() * .1})`; g.fillRect(x, y, w, h); g.strokeStyle = 'rgba(0,0,0,.5)'; g.lineWidth = 2; g.strokeRect(x, y, w, h); }); }
  // oil stains
  for (let i = 0; i < 4; i++) { const x = R() * size, y = R() * size, r = 20 + R() * 40; wrapDraw(() => { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(4,4,5,.55)'); gr.addColorStop(.6, 'rgba(6,6,6,.3)'); gr.addColorStop(1, 'rgba(6,6,6,0)'); g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, r, r * (.5 + R() * .4), R() * 3, 0, 7); g.fill(); }); }
  // cracks (random walks with branches)
  const crack = (x, y, a, len, w, depth) => { wrapDraw(() => { }); let px = x, py = y; const pts = [[px, py]]; for (let s = 0; s < len; s++) { a += (R() - .5) * .7; px += Math.cos(a) * (4 + R() * 6); py += Math.sin(a) * (4 + R() * 6); pts.push([px, py]); if (depth < 2 && R() < .06) crack(px, py, a + (R() < .5 ? 1 : -1) * (.6 + R() * .7), len * .45 | 0, w * .6, depth + 1); }
    wrapDraw(() => { g.strokeStyle = `rgba(2,2,3,${.85 - depth * .15})`; g.lineWidth = w; g.lineJoin = 'round'; g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.stroke(); g.strokeStyle = 'rgba(120,120,115,.18)'; g.lineWidth = Math.max(.6, w * .35); g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0] + 1.2, p[1] + 1.2) : g.moveTo(p[0] + 1.2, p[1] + 1.2)); g.stroke(); }); };
  for (let i = 0; i < 7; i++) crack(R() * size, R() * size, R() * 6.28, 36 + R() * 50 | 0, 2.4 + R() * 1.6, 0);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return t;
}

// ---- house wall grime: bottom dirt, rain streaks, mould blotches, peeling patches (transparent decal)
export function grimeDecal(seed = 7) {
  const R = prng(seed), W = 256, H = 256, c = cv(W, H), g = c.getContext('2d'); g.clearRect(0, 0, W, H);
  const gr = g.createLinearGradient(0, H, 0, H * .45); gr.addColorStop(0, 'rgba(22,16,10,.62)'); gr.addColorStop(1, 'rgba(22,16,10,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 26; i++) { const x = R() * W, y0 = R() * H * .55, l = 40 + R() * 150, a = .06 + R() * .16, w = 2 + R() * 7; const sg = g.createLinearGradient(0, y0, 0, y0 + l); sg.addColorStop(0, `rgba(14,10,6,0)`); sg.addColorStop(.2, `rgba(14,10,6,${a})`); sg.addColorStop(1, `rgba(14,10,6,0)`); g.fillStyle = sg; g.fillRect(x, y0, w, l); }
  for (let i = 0; i < 12; i++) { const x = R() * W, y = H * (.35 + R() * .65), r = 10 + R() * 34; const rg = g.createRadialGradient(x, y, 0, x, y, r); const gc = R() < .6 ? '34,50,24' : '12,14,12'; rg.addColorStop(0, `rgba(${gc},.5)`); rg.addColorStop(1, `rgba(${gc},0)`); g.fillStyle = rg; g.beginPath(); g.ellipse(x, y, r, r * .8, R() * 3, 0, 7); g.fill(); }
  for (let i = 0; i < 6; i++) { const x = R() * W, y = R() * H, w = 12 + R() * 40, h = 8 + R() * 24; g.fillStyle = `rgba(200,195,180,${.03 + R() * .05})`; g.beginPath(); g.moveTo(x, y); g.lineTo(x + w, y + R() * 6); g.lineTo(x + w * .8, y + h); g.lineTo(x + R() * 6, y + h * .9); g.closePath(); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}

// ---- window panes: 0 grimy intact, 1 cracked, 2 smashed (cut-out holes), returns {map, alpha?}
export function windowPane(kind, seed = 8) {
  const R = prng(seed + kind * 31), W = 128, H = 128;
  return merge(W, H, (c, m) => {
    const gr = c.createLinearGradient(0, 0, W, H); gr.addColorStop(0, '#0d1417'); gr.addColorStop(.5, '#1b262a'); gr.addColorStop(1, '#0a0f12'); c.fillStyle = gr; c.fillRect(0, 0, W, H);
    m.fillStyle = '#fff'; m.fillRect(0, 0, W, H);
    for (let i = 0; i < 14; i++) { c.fillStyle = `rgba(90,100,90,${R() * .10})`; c.fillRect(R() * W, R() * H * .8, 2 + R() * 6, 20 + R() * 70); }
    c.fillStyle = 'rgba(120,135,140,.12)'; c.beginPath(); c.moveTo(0, 0); c.lineTo(W * .5, 0); c.lineTo(0, H * .6); c.fill();
    if (kind >= 1) { const ox = W * (.3 + R() * .4), oy = H * (.3 + R() * .4); for (let i = 0; i < 12; i++) { const a = i / 12 * 6.28 + R() * .3; let x = ox, y = oy; c.strokeStyle = 'rgba(190,205,205,.75)'; c.lineWidth = 1.1; c.beginPath(); c.moveTo(x, y); for (let k = 0; k < 6; k++) { x += Math.cos(a + (R() - .5) * .5) * (8 + R() * 14); y += Math.sin(a + (R() - .5) * .5) * (8 + R() * 14); c.lineTo(x, y); } c.stroke(); }
      for (let r = 8; r < 50; r += 14) { c.beginPath(); c.strokeStyle = 'rgba(180,195,195,.4)'; c.lineWidth = .8; for (let i = 0; i <= 10; i++) { const a = i / 10 * 6.28, rr = r + (R() - .5) * 6; const px = ox + Math.cos(a) * rr, py = oy + Math.sin(a) * rr; i ? c.lineTo(px, py) : c.moveTo(px, py); } c.stroke(); } }
    if (kind === 2) { m.fillStyle = '#000'; const holes = 3; for (let k = 0; k < holes; k++) { const cx = W * (.2 + R() * .6), cy = H * (.2 + R() * .6), n = 9, rr = 14 + R() * 26; m.beginPath(); for (let i = 0; i < n; i++) { const a = i / n * 6.28, r2 = rr * (.45 + R() * .75); const px = cx + Math.cos(a) * r2, py = cy + Math.sin(a) * r2; i ? m.lineTo(px, py) : m.moveTo(px, py); } m.closePath(); m.fill(); }
      m.fillRect(0, H * .72 + R() * H * .1, W, H); // lower pane gone
      m.fillStyle = '#fff'; for (let i = 0; i < 5; i++) { const x = R() * W; m.beginPath(); m.moveTo(x, H * .74); m.lineTo(x + 8 + R() * 8, H * .74); m.lineTo(x + 4, H * (.74 + .1 + R() * .12)); m.fill(); } }
  });
}

// ---- soft mist puff + circle + misc
export function mistTex() { const c = cv(128, 128), g = c.getContext('2d'); const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(.5, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); const t = new THREE.CanvasTexture(c); return t; }
export function edgeAlpha() { const c = cv(8, 64), g = c.getContext('2d'); const gr = g.createLinearGradient(0, 0, 0, 64); gr.addColorStop(0, '#000'); gr.addColorStop(.35, '#fff'); gr.addColorStop(.65, '#fff'); gr.addColorStop(1, '#000'); g.fillStyle = gr; g.fillRect(0, 0, 8, 64); const t = new THREE.CanvasTexture(c); t.wrapS = THREE.RepeatWrapping; return t; }
export function paperTex(seed = 9) { const R = prng(seed), c = cv(64, 64), g = c.getContext('2d'); g.fillStyle = '#c9c4b3'; g.fillRect(0, 0, 64, 64); for (let i = 0; i < 10; i++) { g.fillStyle = `rgba(30,30,30,${.15 + R() * .2})`; g.fillRect(6 + R() * 40, 6 + i * 5.5, 16 + R() * 36, 1.5); } g.fillStyle = 'rgba(80,60,30,.25)'; g.fillRect(0, 0, 64, 6); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
