// Interactive Draw tab for the clan banner builder. Vector strokes/shapes sit on top of the preset.
// Touch, mouse, and a gamepad cursor (left stick + A). Select/Move can drag, resize, stretch, rotate.
// No uploads.
import { COLORS, DRAW_SHAPES, BRUSH_SIZES, cleanBanner, drawBanner, emblemGeom } from './clanBanner.js';

function evXY(canvas, e) {
  const r = canvas.getBoundingClientRect();
  const t = (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]) || e;
  const x = (t.clientX - r.left) / Math.max(1, r.width);
  const y = (t.clientY - r.top) / Math.max(1, r.height);
  return { x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)), cx: t.clientX, cy: t.clientY };
}
function canXY(canvas, e) {
  const r = canvas.getBoundingClientRect();
  const t = e;
  const nx = (t.clientX - r.left) / Math.max(1, r.width);
  const ny = (t.clientY - r.top) / Math.max(1, r.height);
  return { x: nx * canvas.width, y: ny * canvas.height, nx, ny, css: Math.max(1, canvas.width / Math.max(1, r.width)) };
}
const clone = o => JSON.parse(JSON.stringify(o));
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

function strokeCentroid(p) {
  let x = 0, y = 0, n = 0;
  for (let i = 0; i + 1 < p.length; i += 2) { x += p[i]; y += p[i + 1]; n++; }
  return n ? { x: x / n, y: y / n } : { x: 0.5, y: 0.5 };
}
function distSeg(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
  const t = l2 ? clamp(((px - ax) * dx + (py - ay) * dy) / l2, 0, 1) : 0;
  return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
}
function strokeHit(op, x, y, w, h) {
  const p = op.p || []; if (p.length < 2) return false;
  const pad = Math.max(10, (op.w || 0.032) * Math.min(w, h) * 0.6 + 8);
  if (p.length === 2) return Math.hypot(x - p[0] * w, y - p[1] * h) <= pad;
  for (let i = 0; i + 3 < p.length; i += 2) {
    if (distSeg(x, y, p[i] * w, p[i + 1] * h, p[i + 2] * w, p[i + 3] * h) <= pad) return true;
  }
  return false;
}
function localOf(cx, cy, r, x, y) {
  const dx = x - cx, dy = y - cy, c = Math.cos(-r), s = Math.sin(-r);
  return { lx: dx * c - dy * s, ly: dx * s + dy * c };
}
function shapeHit(op, x, y, w, h) {
  const min = Math.min(w, h);
  const s = (op.s || 0.18) * min;
  const sx = op.sx || 1, sy = op.sy || 1;
  const loc = localOf(op.x * w, op.y * h, op.r || 0, x, y);
  const u = loc.lx / (s * sx), v = loc.ly / (s * sy);
  if (op.k === 'line') {
    const thick = Math.max(8, (op.w || 0.025) * min * 0.7 + 6) / Math.max(1, s * sy);
    return Math.abs(u) <= 1.08 && Math.abs(v) <= Math.max(0.35, thick);
  }
  if (op.k === 'circle') return u * u + v * v <= 1.12;
  if (op.k === 'square') return Math.abs(u) <= 1.08 && Math.abs(v) <= 1.08;
  if (op.k === 'triangle') return v <= 1.08 && v >= -1.08 && Math.abs(u) <= (v + 1) * 0.6 + 0.15;
  if (op.k === 'heart') return Math.abs(u) <= 1.2 && Math.abs(v) <= 1.2;
  return Math.abs(u) <= 1.12 && Math.abs(v) <= 1.12;
}
function emblemHit(b, x, y, w, h) {
  const E = emblemGeom(b, w, h);
  const loc = localOf(E.cx, E.cy, E.r, x, y);
  const hx = E.half * E.ew, hy = E.half * E.eh;
  return Math.abs(loc.lx) <= hx + 6 && Math.abs(loc.ly) <= hy + 6;
}

// Axis-aligned (in the item's rotated frame) half-extents, in canvas pixels.
function itemFrame(sel, banner, w, h) {
  if (!sel) return null;
  if (sel.kind === 'emblem') {
    const E = emblemGeom(banner, w, h);
    return { cx: E.cx, cy: E.cy, hx: E.half * E.ew, hy: E.half * E.eh, r: E.r };
  }
  const op = ((banner.draw && banner.draw.ops) || [])[sel.i];
  if (!op) return null;
  if (op.t === 'shape') {
    const min = Math.min(w, h);
    const s = (op.s || 0.18) * min;
    const pad = op.k === 'heart' ? 1.2 : op.k === 'line' ? 1 : 1.08;
    const hx = s * (op.sx || 1) * pad;
    let hy = s * (op.sy || 1) * pad;
    if (op.k === 'line') hy = Math.max(8, (op.w || 0.025) * min * 0.5 + 6);
    return { cx: op.x * w, cy: op.y * h, hx, hy, r: op.r || 0 };
  }
  if (op.t === 'stroke' || op.t === 'erase') {
    const p = op.p || []; if (p.length < 2) return null;
    let x0 = 1, y0 = 1, x1 = 0, y1 = 0;
    for (let i = 0; i + 1 < p.length; i += 2) {
      x0 = Math.min(x0, p[i]); y0 = Math.min(y0, p[i + 1]);
      x1 = Math.max(x1, p[i]); y1 = Math.max(y1, p[i + 1]);
    }
    const pad = Math.max(0.02, (op.w || 0.032) * 0.6);
    return {
      cx: ((x0 + x1) / 2) * w, cy: ((y0 + y1) / 2) * h,
      hx: Math.max(10, (x1 - x0) / 2 * w + pad * Math.min(w, h)),
      hy: Math.max(10, (y1 - y0) / 2 * h + pad * Math.min(w, h)),
      r: 0,
    };
  }
  return null;
}

const HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
function handlePts(fr, w, h) {
  if (!fr) return [];
  const { cx, cy, hx, hy, r } = fr;
  const c = Math.cos(r), s = Math.sin(r);
  const pt = (lx, ly, id) => ({ id, x: cx + lx * c - ly * s, y: cy + lx * s + ly * c });
  const out = [
    pt(-hx, -hy, 'nw'), pt(0, -hy, 'n'), pt(hx, -hy, 'ne'), pt(hx, 0, 'e'),
    pt(hx, hy, 'se'), pt(0, hy, 's'), pt(-hx, hy, 'sw'), pt(-hx, 0, 'w'),
    pt(0, -hy - 22, 'rot'),
  ];
  // Keep handles on the canvas so large items stay editable on a small preview.
  if (w && h) {
    const m = 12;
    for (const p of out) { p.x = clamp(p.x, m, w - m); p.y = clamp(p.y, m, h - m); }
  }
  return out;
}

export function mountDrawTools({ tools, canvas, getBanner, setBanner, hint }) {
  let tool = 'brush'; // brush | erase | fill | shape | move
  let shape = 'star';
  let color = '#f4f0e6';
  let size = 0.032;
  let undo = [], redo = [];
  let painting = false, curPts = [], shapeStart = null;
  let cursor = { x: 0.5, y: 0.5, on: false };
  let sel = null; // {kind:'op', i} | {kind:'emblem'}
  let drag = null; // active transform
  const pointers = new Map();

  const opsOf = () => ((getBanner() || {}).draw && (getBanner().draw.ops)) ? getBanner().draw.ops.slice() : [];
  const pushBanner = (b, keepRedo) => {
    if (!keepRedo) { undo.push(clone(getBanner())); if (undo.length > 40) undo.shift(); redo = []; }
    setBanner(b);
    paint();
    syncSelUi();
  };
  const pushOps = (ops, keepRedo) => {
    pushBanner(cleanBanner({ ...getBanner(), draw: ops.length ? { v: 1, ops } : null }), keepRedo);
  };

  const paint = () => {
    const b = getBanner();
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(80, Math.round((r.width || 160) * dpr)), h = Math.max(100, Math.round((r.height || 200) * dpr));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    const g = canvas.getContext('2d');
    drawBanner(g, b, w, h, { live: true });
    if (tool === 'move' && sel) drawSel(g, b, w, h);
  };
  const drawSel = (g, b, w, h) => {
    const fr = itemFrame(sel, b, w, h); if (!fr) return;
    const pts = handlePts(fr, w, h);
    const box = pts.filter(p => p.id !== 'rot');
    g.save();
    g.strokeStyle = '#ffd54a'; g.lineWidth = Math.max(1.5, w * 0.006); g.setLineDash([6, 4]);
    g.beginPath();
    box.forEach((p, i) => i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y));
    g.closePath(); g.stroke();
    g.setLineDash([]);
    const rot = pts.find(p => p.id === 'rot');
    const n = pts.find(p => p.id === 'n');
    if (rot && n) {
      g.beginPath(); g.moveTo(n.x, n.y); g.lineTo(rot.x, rot.y); g.stroke();
      g.beginPath(); g.arc(rot.x, rot.y, 7, 0, 7); g.fillStyle = '#08160e'; g.fill(); g.stroke();
    }
    const hs = 6;
    for (const p of pts) {
      if (p.id === 'rot') continue;
      g.fillStyle = (p.id.length === 1) ? '#eafff0' : '#ffd54a';
      g.strokeStyle = '#08160e'; g.lineWidth = 1.5;
      g.beginPath(); g.rect(p.x - hs, p.y - hs, hs * 2, hs * 2); g.fill(); g.stroke();
    }
    g.restore();
  };

  const html = `
    <div class="cd-scroll">
    <div class="clbl">Tool</div>
    <div class="cban-row" id="cdTools">
      <button type="button" data-tool="move">Move</button>
      <button type="button" data-tool="brush" class="sel">Brush</button>
      <button type="button" data-tool="erase">Eraser</button>
      <button type="button" data-tool="fill">Fill</button>
    </div>
    <div class="clbl">Shapes</div>
    <div class="cban-row" id="cdShapes"></div>
    <div class="clbl">Size</div>
    <div class="cban-row" id="cdSize"></div>
    <div class="clbl">Color</div>
    <div class="cswatches" id="cdCols"></div>
    <div class="cd-pickrow"><label>Custom <input type="color" id="cdPick" value="${color}" aria-label="Color picker"></label></div>
    <p class="cban-hint" id="cdHint">Draw on top of the preset. Use Move to drag, resize, stretch or rotate anything on the banner.</p>
    </div>
    <div class="cban-row cd-sticky" id="cdSticky">
      <span class="cd-selacts" id="cdSelActs">
        <button type="button" id="cdFront">Front</button>
        <button type="button" id="cdBack">Back</button>
        <button type="button" id="cdDup">Copy</button>
        <button type="button" id="cdDel">Delete</button>
      </span>
      <button type="button" id="cdUndo">Undo</button>
      <button type="button" id="cdRedo">Redo</button>
      <button type="button" id="cdClear">Clear drawing</button>
    </div>`;
  tools.innerHTML = html;
  const q = s => tools.querySelector(s);
  q('#cdShapes').innerHTML = DRAW_SHAPES.map(([id, lab]) => `<button type="button" data-shape="${id}">${lab}</button>`).join('');
  q('#cdSize').innerHTML = BRUSH_SIZES.map(([v, lab]) => `<button type="button" data-sz="${v}" class="${v === size ? 'sel' : ''}">${lab}</button>`).join('');
  q('#cdCols').innerHTML = COLORS.map(c => `<button type="button" class="csw${c === color ? ' sel' : ''}" data-v="${c}" style="background:${c}" aria-label="${c}"></button>`).join('');
  if (hint) hint.textContent = 'Draw or Move · no uploads';

  const selTool = () => {
    q('#cdTools').querySelectorAll('button').forEach(b => b.classList.toggle('sel', b.dataset.tool === tool));
    q('#cdShapes').querySelectorAll('button').forEach(b => b.classList.toggle('sel', tool === 'shape' && b.dataset.shape === shape));
    canvas.classList.toggle('cd-move', tool === 'move');
    syncSelUi();
    paint();
  };
  const selectedOp = () => (sel && sel.kind === 'op') ? opsOf()[sel.i] : null;
  const canColor = () => {
    if (sel && sel.kind === 'emblem') return true;
    const op = selectedOp();
    return !!(op && (op.t === 'stroke' || op.t === 'shape' || op.t === 'fill'));
  };
  const canThick = () => {
    const op = selectedOp();
    return !!(op && (op.t === 'stroke' || op.t === 'erase' || (op.t === 'shape' && (op.k === 'line' || op.fill === false))));
  };
  const syncSelUi = () => {
    const on = tool === 'move' && !!sel;
    q('#cdSelActs').classList.toggle('show', on);
    const noDupDel = !!(sel && sel.kind === 'emblem');
    q('#cdDup').disabled = !on || noDupDel;
    q('#cdDel').disabled = !on || noDupDel;
    q('#cdFront').disabled = !on || noDupDel;
    q('#cdBack').disabled = !on || noDupDel;
    const hintEl = q('#cdHint');
    if (hintEl) {
      if (tool !== 'move') hintEl.textContent = 'Draw on top of the preset. Drag to paint or place a shape. Fill dumps a color into an area.';
      else if (!sel) hintEl.textContent = 'Tap a shape, stroke or the emblem, then drag, pinch, or use the handles to resize, stretch and rotate.';
      else if (canThick()) hintEl.textContent = 'Drag to move. Corners resize, sides stretch, top handle rotates. Size changes the line thickness.';
      else hintEl.textContent = 'Drag to move. Corner handles resize, side handles stretch wider or taller, top handle rotates.';
    }
  };

  const applyColor = (c) => {
    color = c;
    q('#cdPick').value = c;
    q('#cdCols').querySelectorAll('button').forEach(x => x.classList.toggle('sel', x.dataset.v === c));
    if (!(tool === 'move' && sel)) return;
    if (sel.kind === 'emblem') {
      pushBanner({ ...getBanner(), emblemColor: c });
      return;
    }
    const ops = opsOf(); const op = ops[sel.i]; if (!op || op.t === 'erase') return;
    ops[sel.i] = { ...op, c }; pushOps(ops);
  };
  const applySize = (v) => {
    size = v;
    q('#cdSize').querySelectorAll('button').forEach(x => x.classList.toggle('sel', +x.dataset.sz === v));
    if (!(tool === 'move' && sel && canThick())) return;
    const ops = opsOf(); const op = ops[sel.i]; if (!op) return;
    ops[sel.i] = { ...op, w: v }; pushOps(ops);
  };

  q('#cdTools').querySelectorAll('button').forEach(b => b.onclick = () => { tool = b.dataset.tool; if (tool !== 'move') sel = null; selTool(); });
  q('#cdShapes').querySelectorAll('button').forEach(b => b.onclick = () => { tool = 'shape'; shape = b.dataset.shape; sel = null; selTool(); });
  q('#cdSize').querySelectorAll('button').forEach(b => b.onclick = () => applySize(+b.dataset.sz));
  q('#cdCols').querySelectorAll('button').forEach(b => b.onclick = () => applyColor(b.dataset.v));
  q('#cdPick').oninput = ev => { q('#cdCols').querySelectorAll('button').forEach(x => x.classList.remove('sel')); applyColor(ev.target.value); };
  q('#cdUndo').onclick = () => {
    if (!undo.length) return;
    redo.push(clone(getBanner()));
    setBanner(undo.pop());
    sel = null; drag = null; paint(); syncSelUi();
  };
  q('#cdRedo').onclick = () => {
    if (!redo.length) return;
    undo.push(clone(getBanner()));
    setBanner(redo.pop());
    sel = null; drag = null; paint(); syncSelUi();
  };
  q('#cdClear').onclick = () => { if (!opsOf().length) return; sel = null; pushOps([]); };
  q('#cdFront').onclick = () => {
    if (!sel || sel.kind !== 'op') return;
    const ops = opsOf(); if (sel.i >= ops.length - 1) return;
    const [op] = ops.splice(sel.i, 1); ops.push(op); sel = { kind: 'op', i: ops.length - 1 }; pushOps(ops);
  };
  q('#cdBack').onclick = () => {
    if (!sel || sel.kind !== 'op') return;
    const ops = opsOf(); if (sel.i <= 0) return;
    const [op] = ops.splice(sel.i, 1); ops.unshift(op); sel = { kind: 'op', i: 0 }; pushOps(ops);
  };
  q('#cdDup').onclick = () => {
    if (!sel || sel.kind !== 'op') return;
    const ops = opsOf(); const op = ops[sel.i]; if (!op) return;
    const copy = clone(op);
    if (copy.t === 'shape' || copy.t === 'fill') { copy.x = clamp((copy.x || 0) + 0.07, 0, 1); copy.y = clamp((copy.y || 0) + 0.07, 0, 1); }
    if ((copy.t === 'stroke' || copy.t === 'erase') && copy.p) {
      copy.p = copy.p.map((v, i) => (i % 2 === 0) ? clamp(v + 0.07, 0, 1) : clamp(v + 0.07, 0, 1));
    }
    ops.splice(sel.i + 1, 0, copy); sel = { kind: 'op', i: sel.i + 1 }; pushOps(ops);
  };
  q('#cdDel').onclick = () => {
    if (!sel || sel.kind !== 'op') return;
    const ops = opsOf(); ops.splice(sel.i, 1); sel = null; pushOps(ops);
  };

  const pickAt = (nx, ny) => {
    const b = getBanner();
    const w = canvas.width, h = canvas.height;
    const x = nx * w, y = ny * h;
    const ops = opsOf();
    for (let i = ops.length - 1; i >= 0; i--) {
      const op = ops[i];
      if (op.t === 'fill') continue;
      if (op.t === 'shape' && shapeHit(op, x, y, w, h)) return { kind: 'op', i };
      if ((op.t === 'stroke' || op.t === 'erase') && strokeHit(op, x, y, w, h)) return { kind: 'op', i };
    }
    if (emblemHit(b, x, y, w, h)) return { kind: 'emblem' };
    return null;
  };
  const handleAt = (x, y) => {
    const fr = itemFrame(sel, getBanner(), canvas.width, canvas.height);
    if (!fr) return null;
    const slop = 14 * (canvas.width / Math.max(1, canvas.getBoundingClientRect().width));
    let best = null, bd = slop;
    for (const p of handlePts(fr, canvas.width, canvas.height)) {
      const d = Math.hypot(x - p.x, y - p.y);
      if (d <= bd) { bd = d; best = p.id; }
    }
    if (best) return best;
    const loc = localOf(fr.cx, fr.cy, fr.r, x, y);
    if (Math.abs(loc.lx) <= fr.hx + slop && Math.abs(loc.ly) <= fr.hy + slop) return 'move';
    return null;
  };

  const beginMove = (nx, ny, hid) => {
    const snap = clone(getBanner());
    drag = { hid: hid || 'move', nx, ny, start: snap, sel: clone(sel), pin: { x: nx, y: ny } };
  };
  const applyDrag = (nx, ny) => {
    if (!drag || !sel) return;
    const start = drag.start;
    const w = canvas.width, h = canvas.height;
    const dx = nx - drag.nx, dy = ny - drag.ny;
    const hid = drag.hid;
    let next = clone(start);
    const fr0 = itemFrame(drag.sel, start, w, h);
    if (hid === 'rot' && fr0) {
      const a0 = Math.atan2(drag.ny * h - fr0.cy, drag.nx * w - fr0.cx);
      const a1 = Math.atan2(ny * h - fr0.cy, nx * w - fr0.cx);
      const da = a1 - a0;
      next = rotateSel(next, drag.sel, da);
    } else if (hid === 'move') {
      next = translateSel(next, drag.sel, dx, dy);
    } else if (fr0) {
      const loc = localOf(fr0.cx, fr0.cy, fr0.r, nx * w, ny * h);
      const uniform = hid.length === 2; // corner
      if (uniform) {
        const startLoc = localOf(fr0.cx, fr0.cy, fr0.r, drag.nx * w, drag.ny * h);
        const d0 = Math.max(8, Math.hypot(startLoc.lx, startLoc.ly));
        const d1 = Math.max(8, Math.hypot(loc.lx, loc.ly));
        next = scaleSel(next, drag.sel, d1 / d0, d1 / d0, true);
      } else {
        // side: stretch on that axis
        const startLoc = localOf(fr0.cx, fr0.cy, fr0.r, drag.nx * w, drag.ny * h);
        let kx = 1, ky = 1;
        if (hid === 'e' || hid === 'w') {
          const den = Math.max(8, Math.abs(startLoc.lx));
          kx = Math.abs(loc.lx) / den;
        } else {
          const den = Math.max(8, Math.abs(startLoc.ly));
          ky = Math.abs(loc.ly) / den;
        }
        next = scaleSel(next, drag.sel, kx, ky, false);
      }
    }
    setBanner(next, true);
    paint();
  };
  const endMove = () => {
    if (!drag) return;
    // re-clean and record undo from the snapshot
    const before = drag.start;
    const after = cleanBanner(getBanner());
    drag = null;
    if (JSON.stringify(before) === JSON.stringify(after)) { setBanner(after); paint(); return; }
    undo.push(before); if (undo.length > 40) undo.shift(); redo = [];
    setBanner(after);
    paint(); syncSelUi();
  };

  function translateSel(b, s, dx, dy) {
    if (s.kind === 'emblem') {
      if (Math.hypot(dx, dy) < 0.002 && b.ex == null) return b;
      const E = emblemGeom(b, canvas.width, canvas.height);
      return { ...b, ex: clamp(E.cx / canvas.width + dx, 0, 1), ey: clamp(E.cy / canvas.height + dy, 0, 1) };
    }
    const ops = ((b.draw && b.draw.ops) || []).map(o => clone(o));
    const op = ops[s.i]; if (!op) return b;
    if (op.t === 'shape' || op.t === 'fill') { op.x = clamp((op.x || 0) + dx, 0, 1); op.y = clamp((op.y || 0) + dy, 0, 1); }
    if ((op.t === 'stroke' || op.t === 'erase') && op.p) {
      op.p = op.p.map((v, i) => clamp(v + (i % 2 === 0 ? dx : dy), 0, 1));
    }
    return { ...b, draw: { v: 1, ops } };
  }
  function rotateSel(b, s, da) {
    if (s.kind === 'emblem') {
      const E = emblemGeom(b, canvas.width, canvas.height);
      return { ...b, ex: E.cx / canvas.width, ey: E.cy / canvas.height, er: (b.er || 0) + da, ew: b.ew, eh: b.eh };
    }
    const ops = ((b.draw && b.draw.ops) || []).map(o => clone(o));
    const op = ops[s.i]; if (!op) return b;
    if (op.t === 'shape') op.r = (op.r || 0) + da;
    if ((op.t === 'stroke' || op.t === 'erase') && op.p) {
      const c = strokeCentroid(op.p), cos = Math.cos(da), sin = Math.sin(da);
      const p = [];
      for (let i = 0; i + 1 < op.p.length; i += 2) {
        const x = op.p[i] - c.x, y = op.p[i + 1] - c.y;
        p.push(clamp(c.x + x * cos - y * sin, 0, 1), clamp(c.y + x * sin + y * cos, 0, 1));
      }
      op.p = p;
    }
    return { ...b, draw: { v: 1, ops } };
  }
  function scaleSel(b, s, kx, ky, uniform) {
    kx = clamp(kx, 0.15, 8); ky = clamp(ky, 0.15, 8);
    if (s.kind === 'emblem') {
      const E = emblemGeom(b, canvas.width, canvas.height);
      const ew = clamp((b.ew || 1) * kx, 0.2, 4), eh = clamp((b.eh || 1) * ky, 0.2, 4);
      return { ...b, ex: E.cx / canvas.width, ey: E.cy / canvas.height, er: b.er || 0, ew, eh };
    }
    const ops = ((b.draw && b.draw.ops) || []).map(o => clone(o));
    const op = ops[s.i]; if (!op) return b;
    if (op.t === 'shape') {
      if (op.k === 'line' && !uniform && ky !== 1 && kx === 1) {
        op.w = clamp((op.w || 0.025) * ky, 0.01, 0.2);
      } else if (uniform) {
        op.s = clamp((op.s || 0.18) * kx, 0.02, 1);
        if (op.k === 'line') op.w = clamp((op.w || 0.025) * kx, 0.01, 0.2);
      } else {
        op.sx = clamp((op.sx || 1) * kx, 0.2, 5);
        op.sy = clamp((op.sy || 1) * ky, 0.2, 5);
      }
    }
    if ((op.t === 'stroke' || op.t === 'erase') && op.p) {
      const c = strokeCentroid(op.p);
      const p = [];
      for (let i = 0; i + 1 < op.p.length; i += 2) {
        p.push(clamp(c.x + (op.p[i] - c.x) * kx, 0, 1), clamp(c.y + (op.p[i + 1] - c.y) * ky, 0, 1));
      }
      op.p = p;
      if (uniform) op.w = clamp((op.w || 0.032) * ((kx + ky) / 2), 0.01, 0.2);
      else if (ky !== 1 && kx === 1) op.w = clamp((op.w || 0.032) * ky, 0.01, 0.2);
    }
    return { ...b, draw: { v: 1, ops } };
  }

  // Two-finger pinch / rotate while moving
  const pinchApply = () => {
    if (pointers.size !== 2 || !drag || !drag.pinch || !sel) return;
    const [a, b] = [...pointers.values()];
    const d0 = drag.pinch.dist, d1 = Math.hypot(a.nx - b.nx, a.ny - b.ny);
    const ang0 = drag.pinch.ang, ang1 = Math.atan2(b.ny - a.ny, b.nx - a.nx);
    const mid0 = drag.pinch.mid, mid1 = { x: (a.nx + b.nx) / 2, y: (a.ny + b.ny) / 2 };
    let next = clone(drag.start);
    next = translateSel(next, drag.sel, mid1.x - mid0.x, mid1.y - mid0.y);
    const k = (d1 / Math.max(0.02, d0));
    next = scaleSel(next, drag.sel, k, k, true);
    next = rotateSel(next, drag.sel, ang1 - ang0);
    setBanner(next, true); paint();
  };

  const commitStroke = () => {
    if (curPts.length < 2) { painting = false; curPts = []; return; }
    const op = tool === 'erase' ? { t: 'erase', w: size, p: curPts } : { t: 'stroke', c: color, w: size, p: curPts };
    pushOps(opsOf().concat(op));
    painting = false; curPts = [];
  };
  const commitShape = (a, b) => {
    const dx = b.x - a.x, dy = b.y - a.y;
    if (shape === 'line') {
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const len = Math.max(0.02, Math.hypot(dx, dy) / 2);
      const r = Math.atan2(dy, dx);
      pushOps(opsOf().concat({ t: 'shape', k: 'line', c: color, x: mid.x, y: mid.y, s: Math.min(1, len), r, fill: false, w: size }));
    } else {
      const s = Math.max(0.04, Math.hypot(dx, dy));
      pushOps(opsOf().concat({ t: 'shape', k: shape, c: color, x: a.x, y: a.y, s: Math.min(1, s), r: 0, fill: true, w: size }));
    }
    shapeStart = null;
  };

  const onDown = e => {
    if (e.pointerType !== 'touch' && e.button != null && e.button !== 0) return;
    e.preventDefault();
    if (e.pointerId != null && canvas.setPointerCapture) try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
    const p = evXY(canvas, e);
    const c = canXY(canvas, e);
    if (e.pointerId != null) pointers.set(e.pointerId, { nx: p.x, ny: p.y });
    if (tool === 'move') {
      if (pointers.size === 2 && sel) {
        const [a, b] = [...pointers.values()];
        drag = {
          hid: 'pinch', start: clone(getBanner()), sel: clone(sel),
          pinch: {
            dist: Math.hypot(a.nx - b.nx, a.ny - b.ny),
            ang: Math.atan2(b.ny - a.ny, b.nx - a.nx),
            mid: { x: (a.nx + b.nx) / 2, y: (a.ny + b.ny) / 2 },
          },
        };
        return;
      }
      if (sel) {
        const hid = handleAt(c.x, c.y);
        if (hid) { beginMove(p.x, p.y, hid); return; }
      }
      sel = pickAt(p.x, p.y);
      if (sel) beginMove(p.x, p.y, 'move');
      paint(); syncSelUi();
      return;
    }
    if (tool === 'fill') { pushOps(opsOf().concat({ t: 'fill', c: color, x: p.x, y: p.y })); return; }
    if (tool === 'shape') { shapeStart = p; painting = true; return; }
    painting = true; curPts = [p.x, p.y];
  };
  const onMove = e => {
    if (e.pointerId != null && pointers.has(e.pointerId)) {
      const p = evXY(canvas, e);
      pointers.set(e.pointerId, { nx: p.x, ny: p.y });
    }
    if (tool === 'move' && drag) {
      e.preventDefault();
      if (drag.pinch) { pinchApply(); return; }
      const p = evXY(canvas, e);
      applyDrag(p.x, p.y);
      return;
    }
    if (!painting) return;
    e.preventDefault();
    const p = evXY(canvas, e);
    if (tool === 'shape') return;
    curPts.push(p.x, p.y);
    const b = getBanner();
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(80, Math.round((r.width || 160) * dpr)), h = Math.max(100, Math.round((r.height || 200) * dpr));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    const g = canvas.getContext('2d');
    const tmp = cleanBanner({ ...b, draw: { v: 1, ops: opsOf().concat([{ t: tool === 'erase' ? 'erase' : 'stroke', w: size, c: color, p: curPts }]) } });
    drawBanner(g, tmp, w, h);
  };
  const onUp = e => {
    if (e.pointerId != null) pointers.delete(e.pointerId);
    if (tool === 'move' && drag) {
      if (drag.pinch && pointers.size >= 2) return;
      endMove();
      return;
    }
    if (!painting) return;
    if (tool === 'shape' && shapeStart) {
      const p = evXY(canvas, e);
      commitShape(shapeStart, p);
      painting = false;
      return;
    }
    commitStroke();
  };

  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);
  canvas.style.touchAction = 'none';
  canvas.classList.add('cd-drawcan');

  // gamepad cursor
  let curEl = document.getElementById('cbanCursor');
  if (!curEl) {
    curEl = document.createElement('div'); curEl.id = 'cbanCursor';
    curEl.style.cssText = 'position:fixed;width:18px;height:18px;margin:-9px 0 0 -9px;border:2px solid #ffd54a;border-radius:50%;pointer-events:none;z-index:80;display:none;box-shadow:0 0 0 2px #0008';
    document.body.append(curEl);
  }
  const showCur = on => { cursor.on = on; curEl.style.display = on ? 'block' : 'none'; };
  const placeCur = () => {
    const r = canvas.getBoundingClientRect();
    curEl.style.left = (r.left + cursor.x * r.width) + 'px';
    curEl.style.top = (r.top + cursor.y * r.height) + 'px';
  };
  const synth = (type, x, y, buttons) => {
    const r = canvas.getBoundingClientRect();
    const ev = { clientX: r.left + x * r.width, clientY: r.top + y * r.height, pointerId: 9, pointerType: 'mouse', isPrimary: true, buttons, bubbles: true, cancelable: true };
    canvas.dispatchEvent(new PointerEvent(type, ev));
  };

  window.__atqBannerPad = (pad, H) => {
    if (!tools.isConnected || !canvas.isConnected) return false;
    if (!document.body.classList.contains('pad')) { showCur(false); return false; }
    const ax = H.ax || pad.axes || [];
    const lx = ax[0] || 0, ly = ax[1] || 0;
    if (Math.hypot(lx, ly) > 0.18) {
      cursor.x = Math.max(0, Math.min(1, cursor.x + lx * 0.028));
      cursor.y = Math.max(0, Math.min(1, cursor.y + ly * 0.028));
    }
    showCur(true); placeCur();
    const A = !!(pad.buttons[0] && (pad.buttons[0].pressed || pad.buttons[0].value > .5));
    if (A && !painting && !drag) { synth('pointerdown', cursor.x, cursor.y, 1); return true; }
    if (A && (painting || drag)) { synth('pointermove', cursor.x, cursor.y, 1); return true; }
    if (!A && (painting || drag) && (tool === 'brush' || tool === 'erase' || tool === 'shape' || tool === 'move')) { synth('pointerup', cursor.x, cursor.y, 0); return true; }
    if (H.edge && H.edge(0) && tool === 'fill') { synth('pointerdown', cursor.x, cursor.y, 1); synth('pointerup', cursor.x, cursor.y, 0); return true; }
    // bumper / Y helpers while a Move selection is active
    if (tool === 'move' && sel && H.edge) {
      if (H.edge(3)) { q('#cdDel').click(); return true; } // Y delete
      if (H.edge(4)) { q('#cdBack').click(); return true; } // LB back
      if (H.edge(5)) { q('#cdFront').click(); return true; } // RB front
    }
    if (Math.hypot(lx, ly) > 0.18) return true; // left stick is the cursor; d-pad still moves tools
    return false;
  };

  const api = {
    paint, dispose() {
      if (drag) endMove();
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
      canvas.classList.remove('cd-drawcan', 'cd-move');
      canvas.style.touchAction = '';
      showCur(false);
      if (window.__atqBannerPad) delete window.__atqBannerPad;
      if (curEl && curEl.parentNode) curEl.remove();
    },
  };
  requestAnimationFrame(paint);
  syncSelUi();
  return api;
}
