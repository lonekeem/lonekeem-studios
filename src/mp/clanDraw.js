// Interactive Draw tab for the clan banner builder. Vector strokes/shapes sit on top of the preset.
// Touch, mouse, and a gamepad cursor (left stick + A). No uploads.
import { COLORS, DRAW_SHAPES, BRUSH_SIZES, cleanBanner, cleanDraw, drawBanner } from './clanBanner.js';

const el = (html) => { const d = document.createElement('div'); d.innerHTML = html; return d.firstElementChild; };

function evXY(canvas, e) {
  const r = canvas.getBoundingClientRect();
  const t = (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]) || e;
  const x = (t.clientX - r.left) / Math.max(1, r.width);
  const y = (t.clientY - r.top) / Math.max(1, r.height);
  return { x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) };
}

export function mountDrawTools({ tools, canvas, getBanner, setBanner, hint }) {
  let tool = 'brush'; // brush | erase | fill | shape
  let shape = 'star';
  let color = '#f4f0e6';
  let size = 0.032;
  let undo = [], redo = [];
  let painting = false, curPts = [], shapeStart = null;
  let cursor = { x: 0.5, y: 0.5, on: false };

  const opsOf = () => ((getBanner() || {}).draw && (getBanner().draw.ops)) ? getBanner().draw.ops.slice() : [];
  const pushOps = (ops, keepRedo) => {
    const b = cleanBanner({ ...getBanner(), draw: ops.length ? { v: 1, ops } : null });
    if (!keepRedo) { undo.push(getBanner()); if (undo.length > 40) undo.shift(); redo = []; }
    setBanner(b);
    paint();
  };
  const paint = () => {
    const b = getBanner();
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(80, Math.round((r.width || 160) * dpr)), h = Math.max(100, Math.round((r.height || 200) * dpr));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    drawBanner(canvas.getContext('2d'), b, w, h);
  };

  const html = `
    <div class="clbl">Tool</div>
    <div class="cban-row" id="cdTools">
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
    <div class="cban-row cd-acts">
      <button type="button" id="cdUndo">Undo</button>
      <button type="button" id="cdRedo">Redo</button>
      <button type="button" id="cdClear">Clear drawing</button>
    </div>
    <p class="cban-hint" id="cdHint">Draw on top of the preset. Drag to paint or place a shape. Fill dumps a color into an area.</p>`;
  tools.innerHTML = html;
  const q = s => tools.querySelector(s);
  q('#cdShapes').innerHTML = DRAW_SHAPES.map(([id, lab]) => `<button type="button" data-shape="${id}">${lab}</button>`).join('');
  q('#cdSize').innerHTML = BRUSH_SIZES.map(([v, lab]) => `<button type="button" data-sz="${v}" class="${v === size ? 'sel' : ''}">${lab}</button>`).join('');
  q('#cdCols').innerHTML = COLORS.map(c => `<button type="button" class="csw${c === color ? ' sel' : ''}" data-v="${c}" style="background:${c}" aria-label="${c}"></button>`).join('');
  if (hint) hint.textContent = 'Draw on the banner · no uploads';

  const selTool = () => {
    q('#cdTools').querySelectorAll('button').forEach(b => b.classList.toggle('sel', b.dataset.tool === tool));
    q('#cdShapes').querySelectorAll('button').forEach(b => b.classList.toggle('sel', tool === 'shape' && b.dataset.shape === shape));
  };
  q('#cdTools').querySelectorAll('button').forEach(b => b.onclick = () => { tool = b.dataset.tool; selTool(); });
  q('#cdShapes').querySelectorAll('button').forEach(b => b.onclick = () => { tool = 'shape'; shape = b.dataset.shape; selTool(); });
  q('#cdSize').querySelectorAll('button').forEach(b => b.onclick = () => { size = +b.dataset.sz; q('#cdSize').querySelectorAll('button').forEach(x => x.classList.toggle('sel', x === b)); });
  q('#cdCols').querySelectorAll('button').forEach(b => b.onclick = () => { color = b.dataset.v; q('#cdPick').value = color; q('#cdCols').querySelectorAll('button').forEach(x => x.classList.toggle('sel', x === b)); });
  q('#cdPick').oninput = ev => { color = ev.target.value; q('#cdCols').querySelectorAll('button').forEach(x => x.classList.remove('sel')); };
  q('#cdUndo').onclick = () => {
    if (!undo.length) return;
    redo.push(getBanner());
    setBanner(undo.pop());
    paint();
  };
  q('#cdRedo').onclick = () => {
    if (!redo.length) return;
    undo.push(getBanner());
    setBanner(redo.pop());
    paint();
  };
  q('#cdClear').onclick = () => { if (!opsOf().length) return; pushOps([]); };

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
    e.preventDefault();
    const p = evXY(canvas, e);
    if (tool === 'fill') { pushOps(opsOf().concat({ t: 'fill', c: color, x: p.x, y: p.y })); return; }
    if (tool === 'shape') { shapeStart = p; painting = true; return; }
    painting = true; curPts = [p.x, p.y];
  };
  const onMove = e => {
    if (!painting) return;
    e.preventDefault();
    const p = evXY(canvas, e);
    if (tool === 'shape') return;
    curPts.push(p.x, p.y);
    // live preview
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
    if (!painting) return;
    if (tool === 'shape' && shapeStart) {
      const p = evXY(canvas, e);
      commitShape(shapeStart, p);
      painting = false;
      return;
    }
    commitStroke();
  };

  const opts = { passive: false };
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);
  canvas.addEventListener('touchstart', onDown, opts);
  canvas.addEventListener('touchmove', onMove, opts);
  canvas.addEventListener('touchend', onUp, opts);
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
    if (A && !painting) { synth('pointerdown', cursor.x, cursor.y, 1); return true; }
    if (A && painting) { synth('pointermove', cursor.x, cursor.y, 1); return true; }
    if (!A && painting && (tool === 'brush' || tool === 'erase' || tool === 'shape')) { synth('pointerup', cursor.x, cursor.y, 0); return true; }
    if (H.edge && H.edge(0) && tool === 'fill') { synth('pointerdown', cursor.x, cursor.y, 1); synth('pointerup', cursor.x, cursor.y, 0); return true; }
    if (Math.hypot(lx, ly) > 0.18) return true; // left stick is the cursor; d-pad still moves tools
    return false;
  };

  // live preview hook used by parent when parts change
  const api = {
    paint, dispose() {
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
      canvas.removeEventListener('touchstart', onDown);
      canvas.removeEventListener('touchmove', onMove);
      canvas.removeEventListener('touchend', onUp);
      canvas.classList.remove('cd-drawcan');
      canvas.style.touchAction = '';
      showCur(false);
      if (window.__atqBannerPad) delete window.__atqBannerPad;
      if (curEl && curEl.parentNode) curEl.remove();
    },
  };
  // import paintDraw lazily was leftover; paint() uses drawBanner which already paints ops
  requestAnimationFrame(paint);
  return api;
}
