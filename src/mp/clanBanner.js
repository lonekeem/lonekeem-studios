// Clan banner: preset parts only (no uploads). Original cartoon emblems, Lone Keem Studios.
// Used by the banner builder, clan screens, the clan leaderboard, nametags and the back-patch flag.
export const SHAPES = [
  ['standard', 'Standard'], ['swallowtail', 'Swallowtail'], ['gonfalon', 'Gonfalon'],
  ['shield', 'Shield'], ['pennant', 'Pennant'], ['square', 'Square'], ['rounded', 'Rounded'], ['scallop', 'Scallop'],
];
export const PATTERNS = [
  ['solid', 'Solid'], ['stripes-h', 'H-Stripes'], ['stripes-v', 'V-Stripes'], ['stripes-d', 'Diagonal'],
  ['chevron', 'Chevron'], ['split-h', 'Split'], ['split-v', 'Halved'], ['split-d', 'Diagonal split'],
  ['cross', 'Cross'], ['saltire', 'Saltire'], ['quarters', 'Quarters'], ['rays', 'Rays'],
  ['diamonds', 'Diamonds'], ['zigzag', 'Zigzag'],
];
export const EMBLEMS = [
  ['skull', 'Skull'], ['bunny', 'Bunny'], ['flame', 'Flame'], ['wolf', 'Wolf'], ['crown', 'Crown'],
  ['crossbones', 'Crossbones'], ['star', 'Star'], ['hazard', 'Outbreak'], ['moon', 'Moon'], ['raven', 'Raven'],
  ['axe', 'Axe'], ['shield', 'Shield'], ['tree', 'Tree'], ['bolt', 'Bolt'], ['heart', 'Heart'],
  ['eye', 'Eye'], ['sun', 'Sun'], ['mountain', 'Peaks'],
];
export const TRIMS = [['none', 'None'], ['thin', 'Thin'], ['thick', 'Thick'], ['rope', 'Rope']];
export const COLORS = [
  '#1a1a1a', '#f4f0e6', '#8b1e1e', '#c43c2c', '#e8a317', '#2e6b3a', '#1e4d3a', '#1c3d6e',
  '#3d6fb0', '#5c2d8a', '#c45c9a', '#6b4a2a', '#c4a574', '#3a3a3a', '#7a1f2b', '#0e7a6b',
  '#d9b44a', '#8a9a7a', '#2a1a12', '#e8e0c8', '#4a90a4', '#b85c38', '#6e1a1a', '#2c2c4a',
];
export const DEFAULT_BANNER = { v: 1, shape: 'standard', bg: '#1e4d3a', bg2: '#d9b44a', pattern: 'chevron', emblem: 'skull', emblemColor: '#f4f0e6', trim: '#d9b44a', trimStyle: 'thin' };

const setOf = a => new Set(a.map(x => x[0]));
const SHAPE_IDS = setOf(SHAPES), PATTERN_IDS = setOf(PATTERNS), EMBLEM_IDS = setOf(EMBLEMS), TRIM_IDS = setOf(TRIMS);
const HEX = /^#[0-9a-fA-F]{6}$/;
export const DRAW_SHAPES = [
  ['circle', 'Circle'], ['square', 'Square'], ['triangle', 'Triangle'],
  ['star', 'Star'], ['heart', 'Heart'], ['line', 'Line'],
];
export const BRUSH_SIZES = [[0.018, 'S'], [0.032, 'M'], [0.055, 'L'], [0.09, 'XL']];
export const MAX_DRAW_OPS = 80, MAX_STROKE_PTS = 160, MAX_DRAW_BYTES = 12000;
const DRAW_SHAPE_IDS = setOf(DRAW_SHAPES);
const q01 = n => Math.max(0, Math.min(1, Math.round((+n || 0) * 1000) / 1000));
const qW = n => Math.max(0.01, Math.min(0.2, Math.round((+n || 0.032) * 1000) / 1000));
function downsamplePts(arr) {
  const out = [];
  if (!Array.isArray(arr)) return out;
  let lx = 99, ly = 99;
  for (let i = 0; i + 1 < arr.length && out.length < MAX_STROKE_PTS * 2; i += 2) {
    const x = q01(arr[i]), y = q01(arr[i + 1]);
    if (out.length && Math.hypot(x - lx, y - ly) < 0.012) continue;
    out.push(x, y); lx = x; ly = y;
  }
  if (arr.length >= 2) {
    const x = q01(arr[arr.length - 2]), y = q01(arr[arr.length - 1]);
    if (!out.length || out[out.length - 2] !== x || out[out.length - 1] !== y) { out.push(x, y); }
  }
  return out;
}
function cleanOp(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const t = raw.t;
  if (t === 'stroke' || t === 'erase') {
    const p = downsamplePts(raw.p);
    if (p.length < 2) return null;
    const o = { t, w: qW(raw.w), p };
    if (t === 'stroke') { const c = HEX.test(raw.c) ? String(raw.c).toLowerCase() : '#f4f0e6'; o.c = c; }
    return o;
  }
  if (t === 'fill') {
    if (!HEX.test(raw.c)) return null;
    return { t: 'fill', c: String(raw.c).toLowerCase(), x: q01(raw.x), y: q01(raw.y) };
  }
  if (t === 'shape') {
    if (!DRAW_SHAPE_IDS.has(raw.k) || !HEX.test(raw.c)) return null;
    return {
      t: 'shape', k: raw.k, c: String(raw.c).toLowerCase(),
      x: q01(raw.x), y: q01(raw.y),
      s: Math.max(0.02, Math.min(1, Math.round((+raw.s || 0.18) * 1000) / 1000)),
      r: Math.round(((+raw.r || 0) % (Math.PI * 2)) * 1000) / 1000,
      fill: raw.fill !== false,
      w: qW(raw.w || 0.025),
    };
  }
  return null;
}
export function cleanDraw(d) {
  if (!d || typeof d !== 'object') return null;
  const ops = [];
  const src = Array.isArray(d.ops) ? d.ops : [];
  for (const raw of src) {
    const op = cleanOp(raw); if (op) ops.push(op);
    if (ops.length >= MAX_DRAW_OPS) break;
  }
  let out = ops.length ? { v: 1, ops } : null;
  while (out && JSON.stringify(out).length > MAX_DRAW_BYTES) {
    out.ops.shift();
    if (!out.ops.length) out = null;
  }
  return out;
}
export function cleanBanner(b) {
  const o = (b && typeof b === 'object') ? b : {};
  const hex = (v, d) => (HEX.test(v) ? v.toLowerCase() : d);
  const draw = cleanDraw(o.draw);
  const rec = {
    v: 1,
    shape: SHAPE_IDS.has(o.shape) ? o.shape : 'standard',
    bg: hex(o.bg, '#1e4d3a'),
    bg2: hex(o.bg2, '#d9b44a'),
    pattern: PATTERN_IDS.has(o.pattern) ? o.pattern : 'solid',
    emblem: EMBLEM_IDS.has(o.emblem) ? o.emblem : 'star',
    emblemColor: hex(o.emblemColor, '#f4f0e6'),
    trim: hex(o.trim, '#d9b44a'),
    trimStyle: TRIM_IDS.has(o.trimStyle) ? o.trimStyle : 'thin',
  };
  if (draw) rec.draw = draw;
  return rec;
}

function shapePath(g, w, h, shape) {
  const m = Math.max(2, Math.min(w, h) * .04);
  const x = m, y = m, W = w - m * 2, H = h - m * 2;
  g.beginPath();
  if (shape === 'shield') {
    g.moveTo(x, y + H * .08); g.lineTo(x + W * .12, y); g.lineTo(x + W * .88, y); g.lineTo(x + W, y + H * .08);
    g.lineTo(x + W, y + H * .52); g.quadraticCurveTo(x + W, y + H * .82, x + W / 2, y + H); g.quadraticCurveTo(x, y + H * .82, x, y + H * .52); g.closePath();
  } else if (shape === 'swallowtail') {
    g.moveTo(x, y); g.lineTo(x + W, y); g.lineTo(x + W, y + H); g.lineTo(x + W / 2, y + H * .72); g.lineTo(x, y + H); g.closePath();
  } else if (shape === 'gonfalon') {
    g.moveTo(x, y); g.lineTo(x + W, y); g.lineTo(x + W, y + H * .72); g.lineTo(x + W / 2, y + H); g.lineTo(x, y + H * .72); g.closePath();
  } else if (shape === 'pennant') {
    g.moveTo(x, y); g.lineTo(x + W, y + H / 2); g.lineTo(x, y + H); g.closePath();
  } else if (shape === 'square') {
    const s = Math.min(W, H), ox = x + (W - s) / 2, oy = y + (H - s) / 2; g.rect(ox, oy, s, s);
  } else if (shape === 'rounded') {
    const r = Math.min(W, H) * .16;
    if (g.roundRect) g.roundRect(x, y, W, H, r); else g.rect(x, y, W, H);
  } else if (shape === 'scallop') {
    g.moveTo(x, y); g.lineTo(x + W, y); g.lineTo(x + W, y + H * .7);
    const n = 3, step = W / n;
    for (let i = n; i >= 0; i--) { const cx = x + i * step, cy = y + H * .7; g.quadraticCurveTo(cx - step / 2, y + H, cx - step, cy); }
    g.closePath();
  } else {
    // standard: slight swallow at the bottom
    g.moveTo(x, y); g.lineTo(x + W, y); g.lineTo(x + W, y + H * .88); g.lineTo(x + W / 2, y + H); g.lineTo(x, y + H * .88); g.closePath();
  }
  return { x, y, W, H };
}

function fillPattern(g, box, b) {
  const { x, y, W, H } = box, c1 = b.bg, c2 = b.bg2, p = b.pattern;
  g.fillStyle = c1; g.fill();
  g.save(); g.clip();
  g.fillStyle = c2;
  if (p === 'stripes-h') { const s = H / 7; for (let i = 0; i < 7; i += 2) g.fillRect(x, y + i * s, W, s); }
  else if (p === 'stripes-v') { const s = W / 7; for (let i = 0; i < 7; i += 2) g.fillRect(x + i * s, y, s, H); }
  else if (p === 'stripes-d') { g.translate(x + W / 2, y + H / 2); g.rotate(-Math.PI / 4); const s = Math.max(W, H) / 8, L = Math.max(W, H) * 1.6; for (let i = -8; i < 8; i += 2) g.fillRect(-L, i * s - L / 8, L * 2, s); }
  else if (p === 'chevron') {
    g.beginPath(); g.moveTo(x, y + H); g.lineTo(x + W / 2, y + H * .28); g.lineTo(x + W, y + H); g.lineTo(x + W, y + H * .62); g.lineTo(x + W / 2, y + H * .08); g.lineTo(x, y + H * .62); g.closePath(); g.fill();
  } else if (p === 'split-h') g.fillRect(x, y + H / 2, W, H / 2);
  else if (p === 'split-v') g.fillRect(x + W / 2, y, W / 2, H);
  else if (p === 'split-d') { g.beginPath(); g.moveTo(x, y + H); g.lineTo(x + W, y); g.lineTo(x + W, y + H); g.closePath(); g.fill(); }
  else if (p === 'cross') { const t = Math.min(W, H) * .22; g.fillRect(x + (W - t) / 2, y, t, H); g.fillRect(x, y + (H - t) / 2, W, t); }
  else if (p === 'saltire') { g.lineWidth = Math.min(W, H) * .2; g.strokeStyle = c2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + W, y + H); g.moveTo(x + W, y); g.lineTo(x, y + H); g.stroke(); }
  else if (p === 'quarters') { g.fillRect(x + W / 2, y, W / 2, H / 2); g.fillRect(x, y + H / 2, W / 2, H / 2); }
  else if (p === 'rays') {
    const cx = x + W / 2, cy = y + H * .46, R = Math.max(W, H);
    for (let i = 0; i < 12; i++) { if (i % 2) continue; const a = (i / 12) * Math.PI * 2 - Math.PI / 2, a2 = ((i + 1) / 12) * Math.PI * 2 - Math.PI / 2; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); g.lineTo(cx + Math.cos(a2) * R, cy + Math.sin(a2) * R); g.closePath(); g.fill(); }
  } else if (p === 'diamonds') {
    const s = Math.min(W, H) / 5;
    for (let j = -1; j < 6; j++) for (let i = -1; i < 6; i++) { if ((i + j) % 2) continue; const cx = x + (i + .5) * s, cy = y + (j + .5) * s; g.beginPath(); g.moveTo(cx, cy - s * .45); g.lineTo(cx + s * .45, cy); g.lineTo(cx, cy + s * .45); g.lineTo(cx - s * .45, cy); g.closePath(); g.fill(); }
  } else if (p === 'zigzag') {
    const s = H / 6; g.beginPath();
    for (let i = 0; i < 6; i++) { const yy = y + i * s; g.moveTo(x, yy + (i % 2 ? 0 : s * .7)); for (let k = 0; k <= 6; k++) g.lineTo(x + (k / 6) * W, yy + ((k + i) % 2 ? 0 : s * .7)); g.lineTo(x + W, yy + s); g.lineTo(x, yy + s); }
    g.fill();
  }
  g.restore();
}

function drawEmblem(g, cx, cy, s, kind, color) {
  g.save(); g.translate(cx, cy); g.scale(s, s); g.fillStyle = color; g.strokeStyle = color; g.lineJoin = 'round'; g.lineCap = 'round';
  const stroke = (w = .08) => { g.lineWidth = w; g.stroke(); };
  if (kind === 'skull') {
    g.beginPath(); g.ellipse(0, -.12, .42, .4, 0, 0, 7); g.fill();
    g.fillRect(-.22, .18, .44, .22);
    g.fillStyle = '#111'; g.beginPath(); g.ellipse(-.18, -.14, .12, .14, .2, 0, 7); g.ellipse(.18, -.14, .12, .14, -.2, 0, 7); g.fill();
    g.beginPath(); g.moveTo(0, -.02); g.lineTo(-.08, .16); g.lineTo(.08, .16); g.closePath(); g.fill();
    g.fillStyle = color; for (let i = -2; i <= 2; i++) g.fillRect(i * .08 - .025, .28, .05, .12);
  } else if (kind === 'bunny') {
    g.beginPath(); g.ellipse(-.22, -.55, .12, .38, -.25, 0, 7); g.ellipse(.22, -.55, .12, .38, .25, 0, 7); g.fill();
    g.fillStyle = shade(color, .7); g.beginPath(); g.ellipse(-.22, -.52, .06, .26, -.25, 0, 7); g.ellipse(.22, -.52, .06, .26, .25, 0, 7); g.fill();
    g.fillStyle = color; g.beginPath(); g.ellipse(0, .05, .4, .38, 0, 0, 7); g.fill();
    g.fillStyle = '#111'; g.beginPath(); g.arc(-.14, 0, .07, 0, 7); g.arc(.14, 0, .07, 0, 7); g.fill();
    g.fillStyle = shade(color, .75); g.beginPath(); g.ellipse(0, .16, .1, .07, 0, 0, 7); g.fill();
  } else if (kind === 'flame') {
    g.beginPath(); g.moveTo(0, .5); g.bezierCurveTo(-.55, .2, -.5, -.2, -.15, -.55); g.bezierCurveTo(-.35, -.15, -.1, -.1, 0, -.7); g.bezierCurveTo(.12, -.1, .4, -.2, .18, -.5); g.bezierCurveTo(.6, -.15, .55, .25, 0, .5); g.fill();
    g.fillStyle = shade(color, 1.35); g.beginPath(); g.moveTo(0, .38); g.bezierCurveTo(-.22, .15, -.12, -.05, 0, -.25); g.bezierCurveTo(.14, 0, .2, .18, 0, .38); g.fill();
  } else if (kind === 'wolf') {
    g.beginPath(); g.moveTo(-.55, .15); g.lineTo(-.35, -.15); g.lineTo(-.45, -.5); g.lineTo(-.15, -.28); g.lineTo(.05, -.55); g.lineTo(.2, -.22); g.lineTo(.55, -.05); g.lineTo(.35, .08); g.lineTo(.5, .35); g.lineTo(.15, .22); g.lineTo(-.1, .5); g.lineTo(-.2, .2); g.closePath(); g.fill();
    g.fillStyle = '#111'; g.beginPath(); g.arc(.22, -.02, .05, 0, 7); g.fill();
  } else if (kind === 'crown') {
    g.beginPath(); g.moveTo(-.5, .25); g.lineTo(-.5, -.05); g.lineTo(-.28, .12); g.lineTo(0, -.4); g.lineTo(.28, .12); g.lineTo(.5, -.05); g.lineTo(.5, .25); g.closePath(); g.fill();
    g.fillRect(-.55, .22, 1.1, .18);
    g.beginPath(); g.arc(0, -.42, .08, 0, 7); g.arc(-.5, -.08, .07, 0, 7); g.arc(.5, -.08, .07, 0, 7); g.fill();
  } else if (kind === 'crossbones') {
    g.save(); g.rotate(.45); g.fillRect(-.7, -.1, 1.4, .2); g.beginPath(); g.arc(-.7, 0, .12, 0, 7); g.arc(.7, 0, .12, 0, 7); g.fill(); g.restore();
    g.save(); g.rotate(-.45); g.fillRect(-.7, -.1, 1.4, .2); g.beginPath(); g.arc(-.7, 0, .12, 0, 7); g.arc(.7, 0, .12, 0, 7); g.fill(); g.restore();
    g.beginPath(); g.arc(0, 0, .18, 0, 7); g.fill();
  } else if (kind === 'star') {
    g.beginPath(); for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * Math.PI * 2 / 5, a2 = a + Math.PI / 5; const cmd = i ? 'lineTo' : 'moveTo'; g[cmd](Math.cos(a) * .55, Math.sin(a) * .55); g.lineTo(Math.cos(a2) * .22, Math.sin(a2) * .22); } g.closePath(); g.fill();
  } else if (kind === 'hazard') {
    // original "outbreak" trefoil: three fat comma-blades around a ring, not the official biohazard mark
    for (let i = 0; i < 3; i++) { g.save(); g.rotate(i * Math.PI * 2 / 3); g.beginPath(); g.moveTo(.08, -.08); g.bezierCurveTo(.5, -.45, .55, .15, .12, .2); g.bezierCurveTo(.35, .05, .28, -.2, .08, -.08); g.fill(); g.restore(); }
    g.beginPath(); g.arc(0, 0, .16, 0, 7); g.fill(); g.fillStyle = shade(color, .35); g.beginPath(); g.arc(0, 0, .08, 0, 7); g.fill();
  } else if (kind === 'moon') {
    g.beginPath(); g.arc(0, 0, .5, 0, Math.PI * 2); g.arc(.22, -.08, .42, 0, Math.PI * 2, true); g.fill();
  } else if (kind === 'raven') {
    g.beginPath(); g.moveTo(-.15, .1); g.bezierCurveTo(-.6, -.3, -.2, -.7, .15, -.35); g.lineTo(.45, -.2); g.lineTo(.2, -.12); g.bezierCurveTo(.55, .05, .5, .4, .05, .25); g.bezierCurveTo(-.05, .55, -.35, .45, -.2, .15); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(.15, -.28); g.lineTo(.62, -.18); g.lineTo(.15, -.12); g.closePath(); g.fill();
  } else if (kind === 'axe') {
    g.save(); g.rotate(-.5); g.fillRect(-.08, -.55, .16, 1.15); g.beginPath(); g.moveTo(.05, -.5); g.lineTo(.6, -.25); g.quadraticCurveTo(.7, 0, .2, .15); g.lineTo(.05, -.05); g.closePath(); g.fill(); g.restore();
  } else if (kind === 'shield') {
    g.beginPath(); g.moveTo(0, -.55); g.lineTo(.48, -.35); g.lineTo(.42, .15); g.quadraticCurveTo(.2, .55, 0, .6); g.quadraticCurveTo(-.2, .55, -.42, .15); g.lineTo(-.48, -.35); g.closePath(); g.fill();
    g.fillStyle = shade(color, .7); g.beginPath(); g.moveTo(0, -.4); g.lineTo(.3, -.28); g.lineTo(.26, .1); g.quadraticCurveTo(.12, .38, 0, .42); g.quadraticCurveTo(-.12, .38, -.26, .1); g.lineTo(-.3, -.28); g.closePath(); g.fill();
  } else if (kind === 'tree') {
    g.fillRect(-.08, .15, .16, .4);
    g.beginPath(); g.arc(0, -.15, .38, 0, 7); g.arc(-.25, .05, .28, 0, 7); g.arc(.25, .05, .28, 0, 7); g.fill();
  } else if (kind === 'bolt') {
    g.beginPath(); g.moveTo(.1, -.6); g.lineTo(-.15, -.05); g.lineTo(.08, -.05); g.lineTo(-.1, .6); g.lineTo(.2, .05); g.lineTo(-.05, .05); g.closePath(); g.fill();
  } else if (kind === 'heart') {
    g.beginPath(); g.moveTo(0, .48); g.bezierCurveTo(-.7, .1, -.55, -.5, 0, -.18); g.bezierCurveTo(.55, -.5, .7, .1, 0, .48); g.fill();
  } else if (kind === 'eye') {
    g.beginPath(); g.ellipse(0, 0, .55, .32, 0, 0, 7); g.fill();
    g.fillStyle = '#111'; g.beginPath(); g.arc(0, 0, .18, 0, 7); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(.06, -.06, .07, 0, 7); g.fill();
  } else if (kind === 'sun') {
    for (let i = 0; i < 8; i++) { g.save(); g.rotate(i * Math.PI / 4); g.fillRect(-.06, -.7, .12, .28); g.restore(); }
    g.beginPath(); g.arc(0, 0, .32, 0, 7); g.fill();
  } else if (kind === 'mountain') {
    g.beginPath(); g.moveTo(-.7, .4); g.lineTo(-.25, -.25); g.lineTo(0, .05); g.lineTo(.2, -.5); g.lineTo(.75, .4); g.closePath(); g.fill();
    g.fillStyle = shade(color, 1.4); g.beginPath(); g.moveTo(.2, -.5); g.lineTo(.32, -.22); g.lineTo(.08, -.22); g.closePath(); g.fill();
  }
  g.restore();
}

function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16); const r = Math.max(0, Math.min(255, Math.round(((n >> 16) & 255) * f))); const g = Math.max(0, Math.min(255, Math.round(((n >> 8) & 255) * f))); const b = Math.max(0, Math.min(255, Math.round((n & 255) * f)));
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

export function drawBanner(g, banner, w, h) {
  const b = cleanBanner(banner);
  g.clearRect(0, 0, w, h);
  const box = shapePath(g, w, h, b.shape);
  fillPattern(g, box, b);
  // trim
  if (b.trimStyle !== 'none') {
    shapePath(g, w, h, b.shape);
    g.strokeStyle = b.trim; g.lineJoin = 'round';
    g.lineWidth = b.trimStyle === 'thick' ? Math.max(3, Math.min(w, h) * .07) : Math.max(2, Math.min(w, h) * .035);
    g.stroke();
    if (b.trimStyle === 'rope') {
      g.save(); g.clip();
      g.strokeStyle = shade(b.trim, .65); g.lineWidth = Math.max(1, Math.min(w, h) * .018); g.setLineDash([6, 6]);
      shapePath(g, w, h, b.shape); g.stroke(); g.restore();
    }
  }
  // emblem
  g.save(); shapePath(g, w, h, b.shape); g.clip();
  const s = Math.min(box.W, box.H) * (b.shape === 'pennant' ? .28 : .32);
  const cx = box.x + box.W * (b.shape === 'pennant' ? .38 : .5);
  const cy = box.y + box.H * (b.shape === 'swallowtail' ? .42 : b.shape === 'pennant' ? .5 : .46);
  drawEmblem(g, cx, cy, s, b.emblem, b.emblemColor);
  if (b.draw && b.draw.ops && b.draw.ops.length) paintDraw(g, b.draw, w, h);
  g.restore();
}

function glyphPath(g, k, s) {
  g.beginPath();
  if (k === 'circle') g.arc(0, 0, s, 0, Math.PI * 2);
  else if (k === 'square') { g.rect(-s, -s, s * 2, s * 2); }
  else if (k === 'triangle') { g.moveTo(0, -s); g.lineTo(s, s); g.lineTo(-s, s); g.closePath(); }
  else if (k === 'star') {
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + i * Math.PI * 2 / 5, b = a + Math.PI / 5;
      const cmd = i ? g.lineTo.bind(g) : g.moveTo.bind(g);
      cmd(Math.cos(a) * s, Math.sin(a) * s); g.lineTo(Math.cos(b) * s * .4, Math.sin(b) * s * .4);
    }
    g.closePath();
  } else if (k === 'heart') {
    const u = s * 1.05;
    g.moveTo(0, u * .7);
    g.bezierCurveTo(-u * 1.15, u * .05, -u * .55, -u * .85, 0, -u * .28);
    g.bezierCurveTo(u * .55, -u * .85, u * 1.15, u * .05, 0, u * .7);
    g.closePath();
  } else if (k === 'line') { g.moveTo(-s, 0); g.lineTo(s, 0); }
}

function floodAt(g, w, h, nx, ny, hex) {
  const x0 = Math.max(0, Math.min(w - 1, Math.round(nx * w)));
  const y0 = Math.max(0, Math.min(h - 1, Math.round(ny * h)));
  const img = g.getImageData(0, 0, w, h), d = img.data;
  const i0 = (y0 * w + x0) * 4;
  const tr = d[i0], tg = d[i0 + 1], tb = d[i0 + 2], ta = d[i0 + 3];
  const n = parseInt(hex.slice(1), 16);
  const fr = (n >> 16) & 255, fg = (n >> 8) & 255, fb = n & 255;
  if (tr === fr && tg === fg && tb === fb && ta === 255) return;
  const match = (i) => Math.abs(d[i] - tr) + Math.abs(d[i + 1] - tg) + Math.abs(d[i + 2] - tb) + Math.abs(d[i + 3] - ta) < 48;
  const stack = [[x0, y0]], seen = new Uint8Array(w * h);
  while (stack.length) {
    const [x, y] = stack.pop();
    if (x < 0 || y < 0 || x >= w || y >= h) continue;
    const p = y * w + x; if (seen[p]) continue; seen[p] = 1;
    const i = p * 4; if (!match(i)) continue;
    d[i] = fr; d[i + 1] = fg; d[i + 2] = fb; d[i + 3] = 255;
    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  g.putImageData(img, 0, 0);
}

export function paintDraw(g, draw, w, h) {
  const ops = (draw && draw.ops) || [];
  for (const op of ops) {
    if (op.t === 'stroke' || op.t === 'erase') {
      const p = op.p || []; if (p.length < 2) continue;
      g.save();
      g.lineJoin = 'round'; g.lineCap = 'round';
      g.lineWidth = Math.max(1, (op.w || 0.032) * Math.min(w, h));
      if (op.t === 'erase') { g.globalCompositeOperation = 'destination-out'; g.strokeStyle = '#000'; }
      else g.strokeStyle = op.c || '#fff';
      g.beginPath(); g.moveTo(p[0] * w, p[1] * h);
      for (let i = 2; i + 1 < p.length; i += 2) g.lineTo(p[i] * w, p[i + 1] * h);
      if (p.length === 2) g.lineTo(p[0] * w + 0.2, p[1] * h);
      g.stroke(); g.restore();
    } else if (op.t === 'fill') {
      floodAt(g, w, h, op.x, op.y, op.c || '#f4f0e6');
    } else if (op.t === 'shape') {
      const s = (op.s || 0.18) * Math.min(w, h);
      g.save(); g.translate(op.x * w, op.y * h); g.rotate(op.r || 0);
      glyphPath(g, op.k, s);
      if (op.k === 'line') {
        g.strokeStyle = op.c; g.lineCap = 'round'; g.lineWidth = Math.max(1, (op.w || 0.025) * Math.min(w, h)); g.stroke();
      } else if (op.fill !== false) { g.fillStyle = op.c; g.fill(); }
      else { g.strokeStyle = op.c; g.lineWidth = Math.max(1, (op.w || 0.025) * Math.min(w, h)); g.stroke(); }
      g.restore();
    }
  }
}

export function bannerCanvas(banner, w = 256, h = 320) {
  const c = (typeof document !== 'undefined') ? document.createElement('canvas') : null;
  if (!c) return null; c.width = w; c.height = h; drawBanner(c.getContext('2d'), banner, w, h); return c;
}
export function bannerDataURL(banner, w = 256, h = 320) { const c = bannerCanvas(banner, w, h); return c ? c.toDataURL('image/png') : ''; }

export function makeFlagMesh(THREE, banner) {
  const c = bannerCanvas(banner, 256, 320);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4; tex.needsUpdate = true;
  const mat = new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: .7, metalness: .05, side: THREE.DoubleSide, alphaTest: .15 });
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(.22, .275), mat); flag.position.set(.02, .12, 0); flag.castShadow = false;
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(.008, .01, .34, 6), new THREE.MeshStandardMaterial({ color: '#3a2a18', roughness: .8 }));
  pole.position.set(-.09, .02, 0);
  const g = new THREE.Group(); g.name = 'clanBadge'; g.add(pole); g.add(flag); flag.position.set(.02, .08, 0); return g;
}

export function attachClanBadge(av, clan, THREE) {
  if (!av) return;
  const drop = o => { if (!o) return; if (o.parent) o.parent.remove(o); o.traverse(m => { if (m.geometry) m.geometry.dispose(); if (m.material) { const ms = [].concat(m.material); ms.forEach(x => { x.map && x.map.dispose(); x.dispose && x.dispose(); }); } }); };
  if (av.root) av.root.traverse(o => { if (o.name === 'clanBadge') drop(o); });
  if (av.bones) { for (const k in av.bones) { const b = av.bones[k]; const old = b && b.getObjectByName && b.getObjectByName('clanBadge'); if (old) drop(old); } }
  if (!clan || !clan.banner || !av.root) return null;
  const mesh = makeFlagMesh(THREE, clan.banner);
  // Parent to the avatar root on the upper back (local -Z). Binding to Spine02 put the flag through the hat because of bind-pose axes.
  mesh.position.set(.12, 1.16, -.14); mesh.rotation.set(.06, .3, .08); mesh.scale.setScalar(.78);
  av.root.add(mesh);
  return mesh;
}

// Head nametag canvas: name plus optional [TAG] and a tiny banner.
function drawStaffBadge(g, x, y, role) {
  const admin = role === 'admin';
  g.save(); g.translate(x, y);
  g.fillStyle = admin ? '#f0c14b' : '#c5d0dc';
  g.strokeStyle = admin ? '#8a5a12' : '#5b6570';
  g.lineWidth = 1.2;
  if (admin) {
    // small crown
    g.beginPath();
    g.moveTo(-8, 6); g.lineTo(-8, -1); g.lineTo(-4, 3); g.lineTo(0, -6); g.lineTo(4, 3); g.lineTo(8, -1); g.lineTo(8, 6);
    g.closePath(); g.fill(); g.stroke();
    g.beginPath(); g.arc(0, -7, 1.6, 0, Math.PI * 2); g.fill();
  } else {
    // small shield
    g.beginPath();
    g.moveTo(0, -7); g.lineTo(7, -4); g.lineTo(6, 3); g.lineTo(0, 8); g.lineTo(-6, 3); g.lineTo(-7, -4);
    g.closePath(); g.fill(); g.stroke();
  }
  g.restore();
}

export function drawNameTag(g, w, h, name, clan, role) {
  g.clearRect(0, 0, w, h);
  const tag = clan && String(clan.tag || '').slice(0, 5);
  const two = !!tag;
  const staff = role === 'admin' || role === 'moderator';
  const nm = String(name || 'Player').slice(0, 16);
  g.fillStyle = '#000c';
  const y0 = two ? Math.max(4, (h - 70) / 2) : 10, hh = two ? 70 : 44, rr = 14;
  if (g.roundRect) { g.beginPath(); g.roundRect(8, y0, w - 16, hh, rr); g.fill(); } else g.fillRect(8, y0, w - 16, hh);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  const shift = staff && !two ? 10 : 0;
  if (two) {
    if (clan.banner) {
      g.save(); g.translate(16, y0 + 10); drawBanner(g, clan.banner, 28, 36); g.restore();
    }
    if (staff) drawStaffBadge(g, w - 26, y0 + hh / 2, role);
    g.fillStyle = '#d9b44a'; g.font = '700 22px system-ui,sans-serif'; g.fillText('[' + tag + ']', w / 2 + 10, y0 + 24);
    g.fillStyle = role === 'admin' ? '#f6d36a' : (role === 'moderator' ? '#d5e4f2' : '#fff');
    g.font = '600 26px system-ui,sans-serif'; g.fillText(nm, w / 2 + 10, y0 + 50);
  } else {
    if (staff) drawStaffBadge(g, 28, y0 + hh / 2, role);
    g.fillStyle = role === 'admin' ? '#f6d36a' : (role === 'moderator' ? '#d5e4f2' : '#fff');
    g.font = '600 28px system-ui,sans-serif'; g.fillText(nm, w / 2 + shift, y0 + hh / 2 + 1);
  }
}

export function nameTagSprite(THREE, name, clan, role) {
  const two = !!(clan && clan.tag) || role === 'admin' || role === 'moderator';
  const c = document.createElement('canvas'); c.width = 256; c.height = two ? 80 : 64;
  drawNameTag(c.getContext('2d'), c.width, c.height, name, clan, role);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  s.scale.set(.55, two ? .172 : .125, 1); s.renderOrder = 20; s.userData.clanTag = two; s.userData.role = role || null; return s;
}
