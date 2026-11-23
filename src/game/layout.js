// v2.0.1 touch layout: default thumb-friendly positions, per-button overrides saved in settings (btnLay),
// and a drag/resize editor. Positions are fractions of the screen (x: 0..1 left→right, y: 0..1 top→bottom).
export const DEF = {
  tAtk: { x: .90, y: .70, s: 1.5, n: 'Fire' }, tAim: { x: .80, y: .80, s: 1.1, n: 'Aim' }, tReload: { x: .82, y: .52, s: 1, n: 'Reload' },
  tJump: { x: .91, y: .43, s: 1, n: 'Jump' }, tRoll: { x: .72, y: .60, s: 1, n: 'Roll' }, tUse: { x: .72, y: .79, s: 1, n: 'Interact' },
  tSwap: { x: .72, y: .40, s: 1, n: 'Swap weapon' }, tGren: { x: .62, y: .66, s: 1, n: 'Grenade' },
  tRun: { x: .07, y: .37, s: 1, n: 'Run' }, tCrouch: { x: .07, y: .54, s: 1, n: 'Crouch' }, stick: { x: .11, y: .78, s: 1, n: 'Move stick' },
};
const LABEL = { tAtk: 'FIRE', tAim: 'AIM', tReload: '⟳', tJump: 'JUMP', tRoll: 'ROLL', tUse: 'USE', tSwap: '⇄', tGren: '💣', tRun: 'RUN', tCrouch: 'CRCH', stick: 'MOVE' };
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const unit = (S) => 56 * clamp(Math.min(innerWidth / 915, innerHeight / 412), .9, 1.25) * (S.btnScale || 1);
export const lay = (S, id) => Object.assign({}, DEF[id], (S.btnLay || {})[id]);
const mx = (S, x) => S.hand === 'left' ? 1 - x : x; // left-handed mirrors every position
export function applyLayout(S) {
  const bu = unit(S); document.body.style.setProperty('--bu', bu + 'px');
  for (const id in DEF) { const L = lay(S, id), el = document.getElementById(id === 'stick' ? 'stickBase' : id); if (!el) continue; el.style.setProperty('--x', mx(S, L.x)); el.style.setProperty('--y', L.y); if (id === 'stick') el.style.setProperty('--ss', (bu / 56) * L.s); else el.style.setProperty('--s', L.s); }
}
export function initLayout(S, saveS, closeTo) {
  applyLayout(S); addEventListener('resize', () => applyLayout(S)); addEventListener('orientationchange', () => setTimeout(() => applyLayout(S), 200));
  let root = null, sel = null;
  const build = () => {
    root = document.createElement('div'); root.id = 'layEdit'; root.className = 'hidden';
    const g = (cls, css, txt) => { const d = document.createElement('div'); d.className = 'ghost ' + cls; Object.assign(d.style, css); d.textContent = txt || ''; root.appendChild(d); return d; };
    const small = innerHeight <= 420;
    g('round hud', { left: 'max(92px,calc(env(safe-area-inset-left) + 92px))', top: '10px', width: small ? '72px' : '92px', height: small ? '72px' : '92px' }, 'map');
    g('hud', { left: '50%', top: '12px', transform: 'translateX(-50%)', width: '30%', height: '40px' }, 'objective');
    g('hud', { right: '10px', top: '10px', width: '100px', height: '44px' }, 'view · pause');
    g('hud', { left: '14px', bottom: '4px', width: '110px', height: '18px' }, 'health'); g('hud', { right: '14px', bottom: '4px', width: '150px', height: '18px' }, 'weapon · ammo');
    g('hud', { left: '168px', right: '250px', bottom: '24px', height: '44px' }, 'weapon bar');
    g('hud', { left: '50%', top: '50%', transform: 'translate(-50%,-50%)', width: '36px', height: '36px' }, '+');
    g('look', {}, 'LOOK / AIM: drag anywhere on this side');
    BTNS = {}; for (const id in DEF) { const b = document.createElement('div'); b.className = 'rb' + (id === 'tAtk' ? ' big' : '') + (id === 'stick' ? ' stk' : '') + ' ed_' + id; b.textContent = LABEL[id]; b.dataset.id = id; root.appendChild(b); BTNS[id] = b; }
    const bar = document.createElement('div'); bar.className = 'ledbar'; bar.innerHTML = '<b id="leName">Tap a button</b><input type="range" id="leSize" min="0.6" max="2.4" step="0.05" disabled><button id="leReset">Reset to default</button><button id="leDone" class="primary">Done</button>'; root.appendChild(bar);
    const hint = document.createElement('div'); hint.className = 'hint'; hint.textContent = 'Drag a button to move it. Select it, then use the slider to resize. Red outline = overlapping something.'; root.appendChild(hint);
    document.body.appendChild(root);
    root.addEventListener('pointerdown', e => { const b = e.target.closest('.rb'); if (!b) return; select(b.dataset.id); b.setPointerCapture(e.pointerId); b._drag = true; e.preventDefault(); });
    root.addEventListener('pointermove', e => { const b = e.target.closest && e.target.closest('.rb'); const d = Object.values(BTNS).find(x => x._drag); if (!d) return; const id = d.dataset.id, ex = clamp(e.clientX / innerWidth, .03, .97), ey = clamp(e.clientY / innerHeight, .06, .96); setL(id, { x: +(mx(S, ex)).toFixed(4), y: +ey.toFixed(4) }); e.preventDefault(); });
    const up = () => Object.values(BTNS).forEach(x => x._drag = false); root.addEventListener('pointerup', up); root.addEventListener('pointercancel', up);
    root.querySelector('#leSize').addEventListener('input', e => { if (sel) setL(sel, { s: +e.target.value }); });
    root.querySelector('#leReset').onclick = () => { S.btnLay = {}; saveS(); refresh(); };
    root.querySelector('#leDone').onclick = () => { root.classList.add('hidden'); saveS(); applyLayout(S); closeTo && closeTo(); };
  };
  let BTNS = {};
  const setL = (id, patch) => { S.btnLay = S.btnLay || {}; S.btnLay[id] = Object.assign({}, S.btnLay[id], patch); saveS(); refresh(); };
  const select = (id) => { sel = id; root.querySelector('#leName').textContent = DEF[id].n; const sl = root.querySelector('#leSize'); sl.disabled = false; sl.value = lay(S, id).s; refresh(); };
  const refresh = () => {
    applyLayout(S); const bu = unit(S);
    for (const id in BTNS) { const L = lay(S, id), b = BTNS[id]; b.style.setProperty('--x', mx(S, L.x)); b.style.setProperty('--y', L.y); b.style.setProperty('--s', L.s); b.classList.toggle('sel', id === sel); }
    if (sel) root.querySelector('#leSize').value = lay(S, sel).s;
    const rects = Object.entries(BTNS).map(([id, b]) => [id, b.getBoundingClientRect()]); const hud = [...root.querySelectorAll('.ghost.hud')].map(h => h.getBoundingClientRect());
    const hit = (a, b) => { const ax = (a.left + a.right) / 2, ay = (a.top + a.bottom) / 2, bx = (b.left + b.right) / 2, by = (b.top + b.bottom) / 2; return Math.hypot(ax - bx, ay - by) < (a.width + b.width) / 2 - 2; };
    const rect = (a, h) => !(a.right < h.left || a.left > h.right || a.bottom < h.top || a.top > h.bottom);
    for (const [id, r] of rects) { let bad = rects.some(([i2, r2]) => i2 !== id && hit(r, r2)) || hud.some(h => rect(r, h)); if (id === 'stick') bad = rects.some(([i2, r2]) => i2 !== id && rect(r, r2) && i2 !== 'stick' && hit({ left: r.left + r.width * .15, right: r.right - r.width * .15, top: r.top + r.height * .15, bottom: r.bottom - r.height * .15, width: r.width * .7, height: r.height * .7 }, r2)); BTNS[id].classList.toggle('bad', bad); }
  };
  return { open() { if (!root) build(); sel = null; root.querySelector('#leName').textContent = 'Tap a button'; root.querySelector('#leSize').disabled = true; root.classList.remove('hidden'); refresh(); }, refresh: () => applyLayout(S) };
}

// Keep off-screen objective markers off visible touch buttons and HUD, still on that screen side (v1.9.92).
// #stickZone is a large invisible hit pad, not a drawn control — only #stickBase is avoided.
const MARKER_HUD = '#touch .rb, #stickBase, #mini, #pfp, #obj, #hudr, #hpTxt, #ammoTxt, #wbar.on, #budCue, #boss, #prompt, #skipObj, #rld';
export function clampHudMarker(x, y, hw = 32, hh = 28, pad = 10) {
  const W = innerWidth, H = innerHeight;
  const minX = hw + pad, maxX = Math.max(minX, W - hw - pad);
  const minY = hh + pad, maxY = Math.max(minY, H - hh - pad);
  x = clamp(x, minX, maxX); y = clamp(y, minY, maxY);
  const rects = [];
  for (const el of document.querySelectorAll(MARKER_HUD)) {
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity === 0) continue;
    if (!el.getClientRects().length) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) continue;
    rects.push({ l: r.left - pad, r: r.right + pad, t: r.top - pad, b: r.bottom + pad });
  }
  const nHits = (nx, ny) => {
    const L = nx - hw, R = nx + hw, T = ny - hh, B = ny + hh;
    let n = 0; for (const u of rects) if (L < u.r && R > u.l && T < u.b && B > u.t) n++; return n;
  };
  if (!nHits(x, y)) return [x, y];
  const ox = x, oy = y;
  const leftD = ox - minX, rightD = maxX - ox, topD = oy - minY, botD = maxY - oy;
  const edge = (leftD <= rightD && leftD <= topD && leftD <= botD) ? 'left'
    : (rightD <= topD && rightD <= botD) ? 'right'
    : (topD <= botD) ? 'top' : 'bottom';
  const STEPS = 32;
  const cands = [];
  const push = (side, nx, ny) => cands.push([side, clamp(nx, minX, maxX), clamp(ny, minY, maxY)]);
  for (let i = 0; i <= STEPS; i++) {
    const ty = minY + (maxY - minY) * (i / STEPS);
    const tx = minX + (maxX - minX) * (i / STEPS);
    push('left', minX, ty); push('right', maxX, ty); push('top', tx, minY); push('bottom', tx, maxY);
  }
  // If the literal edge is covered (RUN/CRCH), search a shallow inset on that same side.
  const inset = Math.min(160, W * 0.28);
  for (let k = 8; k <= inset; k += 8) {
    for (let i = 0; i <= STEPS; i++) {
      const ty = minY + (maxY - minY) * (i / STEPS);
      const tx = minX + (maxX - minX) * (i / STEPS);
      if (edge === 'left') push('left', minX + k, ty);
      else if (edge === 'right') push('right', maxX - k, ty);
      else if (edge === 'top') push('top', tx, minY + k);
      else push('bottom', tx, maxY - k);
    }
  }
  const clear = cands.filter(([, nx, ny]) => nHits(nx, ny) === 0);
  if (clear.length) {
    const same = clear.filter(c => c[0] === edge);
    const pool = same.length ? same : clear;
    pool.sort((a, b) => (Math.hypot(a[1] - ox, a[2] - oy) - Math.hypot(b[1] - ox, b[2] - oy))
      || (Math.min(a[1] - minX, maxX - a[1], a[2] - minY, maxY - a[2]) - Math.min(b[1] - minX, maxX - b[1], b[2] - minY, maxY - b[2])));
    return [pool[0][1], pool[0][2]];
  }
  const dx = Math.sign(W / 2 - ox) || 1, dy = Math.sign(H / 2 - oy) || 1;
  for (let i = 1; i <= 48; i++) {
    const nx = clamp(ox + dx * 8 * i, minX, maxX);
    const ny = clamp(oy + dy * 8 * i, minY, maxY);
    if (!nHits(ox, ny)) return [ox, ny];
    if (!nHits(nx, oy)) return [nx, oy];
    if (!nHits(nx, ny)) return [nx, ny];
  }
  return [x, y];
}
