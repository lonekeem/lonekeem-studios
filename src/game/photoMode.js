// v1.9.88 Photo mode: opened from the pause menu. The game stays frozen; a free orbit camera (one finger / left mouse to
// orbit, pinch / wheel to zoom, two fingers / right mouse / WASD to move) frames the shot, the HUD is hidden, and a few
// filters preview live (CSS) and are baked into the saved picture per pixel so the file matches what you saw.
// Saving: native app -> Filesystem + Share sheet; browsers with file sharing (iPhone Safari / home-screen app) -> share
// sheet ("Save Image"); everything else -> a normal download.
import * as THREE from 'three';

export const FILTERS = [
  { id: 'none', name: 'Original', ops: [] },
  { id: 'vivid', name: 'Vivid', ops: [['saturate', 1.55], ['contrast', 1.12]] },
  { id: 'warm', name: 'Warm', ops: [['sepia', .32], ['saturate', 1.35], ['brightness', 1.05]] },
  { id: 'cold', name: 'Cold', ops: [['sepia', .38], ['hue-rotate', 175], ['saturate', 1.25], ['brightness', 1.04]] },
  { id: 'bw', name: 'B&W', ops: [['grayscale', 1], ['contrast', 1.1]] },
  { id: 'noir', name: 'Noir', ops: [['grayscale', 1], ['contrast', 1.35], ['brightness', 1.02]], vig: true },
  { id: 'sepia', name: 'Sepia', ops: [['sepia', .9], ['contrast', 1.05]] },
];
const cssOf = (f) => f.ops.map(([k, v]) => k === 'hue-rotate' ? `hue-rotate(${v}deg)` : `${k}(${v})`).join(' ');

// CSS filter-effects matrices (sRGB), applied in order with clamping, like the browser preview
function mats(f) {
  return f.ops.map(([k, v]) => {
    if (k === 'brightness') return { m: [v, 0, 0, 0, v, 0, 0, 0, v], b: 0 };
    if (k === 'contrast') return { m: [v, 0, 0, 0, v, 0, 0, 0, v], b: (.5 - .5 * v) * 255 };
    if (k === 'grayscale') { const a = 1 - v; return { m: [.2126 + .7874 * a, .7152 - .7152 * a, .0722 - .0722 * a, .2126 - .2126 * a, .7152 + .2848 * a, .0722 - .0722 * a, .2126 - .2126 * a, .7152 - .7152 * a, .0722 + .9278 * a], b: 0 }; }
    if (k === 'sepia') { const a = 1 - v; return { m: [.393 + .607 * a, .769 - .769 * a, .189 - .189 * a, .349 - .349 * a, .686 + .314 * a, .168 - .168 * a, .272 - .272 * a, .534 - .534 * a, .131 + .869 * a], b: 0 }; }
    if (k === 'saturate') return { m: [.213 + .787 * v, .715 - .715 * v, .072 - .072 * v, .213 - .213 * v, .715 + .285 * v, .072 - .072 * v, .213 - .213 * v, .715 - .715 * v, .072 + .928 * v], b: 0 };
    if (k === 'hue-rotate') { const r = v * Math.PI / 180, c = Math.cos(r), s = Math.sin(r); return { m: [.213 + c * .787 - s * .213, .715 - c * .715 - s * .715, .072 - c * .072 + s * .928, .213 - c * .213 + s * .143, .715 + c * .285 + s * .140, .072 - c * .072 - s * .283, .213 - c * .213 - s * .787, .715 - c * .715 + s * .715, .072 + c * .928 + s * .072], b: 0 }; }
    return null;
  }).filter(Boolean);
}
export function bake(ctx, w, h, f, vig) {
  const M = mats(f);
  if (M.length) { const id = ctx.getImageData(0, 0, w, h), d = id.data;
    for (let i = 0; i < d.length; i += 4) { let r = d[i], g = d[i + 1], b = d[i + 2];
      for (const { m, b: o } of M) { const R = m[0] * r + m[1] * g + m[2] * b + o, G = m[3] * r + m[4] * g + m[5] * b + o, B = m[6] * r + m[7] * g + m[8] * b + o; r = R < 0 ? 0 : R > 255 ? 255 : R; g = G < 0 ? 0 : G > 255 ? 255 : G; b = B < 0 ? 0 : B > 255 ? 255 : B; }
      d[i] = r; d[i + 1] = g; d[i + 2] = b; }
    ctx.putImageData(id, 0, 0); }
  if (vig || f.vig) { const gr = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * .35, w / 2, h / 2, Math.hypot(w, h) * .56); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.62)'); ctx.fillStyle = gr; ctx.fillRect(0, 0, w, h); }
}

let ui = null;
const $ = (s) => document.querySelector(s);
function stamp() { const d = new Date(), p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`; }

export function photoOpen(g, onExit) {
  const cam = g.camera, P = g.player.root.position, tgt = new THREE.Vector3(P.x, P.y + 1.1, P.z);
  const off = cam.position.clone().sub(tgt); let dist = Math.max(1, off.length());
  const S = g.photo = { tgt, home: tgt.clone(), dist, yaw: Math.atan2(off.x, off.z), pitch: Math.asin(Math.max(-.99, Math.min(.99, off.y / dist))), fov0: cam.fov, filter: FILTERS[0], vig: false, keys: {}, onExit, roll0: cam.rotation.z };
  S.home0 = { dist: S.dist, yaw: S.yaw, pitch: S.pitch }; S.fdir = new THREE.Vector3(); cam.getWorldDirection(S.fdir);
  document.body.classList.add('photo');
  if (!ui) build(g); ui.root.classList.remove('hidden'); setFilter(g, FILTERS[0]); ui.vig.classList.remove('on'); $('#phVig').classList.add('hidden');
  ui.hint.classList.remove('fade'); clearTimeout(ui.ht); ui.ht = setTimeout(() => ui.hint.classList.add('fade'), 4200);
  photoApply(g);
}
export function photoClose(g) {
  const S = g.photo; if (!S) return; g.photo = null; document.body.classList.remove('photo'); if (ui) ui.root.classList.add('hidden'); const gl = $('#gl'); if (gl) gl.style.filter = ''; $('#phVig')?.classList.add('hidden');
  S.onExit && S.onExit();
}
// called every rendered frame while photo mode is open (after the game's own camera code, before render)
export function photoApply(g) {
  const S = g.photo; if (!S) return; const cam = g.camera, k = S.keys, sp = .08 * Math.max(1, S.dist * .25);
  if (k.w || k.s || k.a || k.d || k.q || k.e) { const fx = -Math.sin(S.yaw), fz = -Math.cos(S.yaw); S.tgt.x += (fx * ((k.w ? 1 : 0) - (k.s ? 1 : 0)) + -fz * ((k.d ? 1 : 0) - (k.a ? 1 : 0))) * sp; S.tgt.z += (fz * ((k.w ? 1 : 0) - (k.s ? 1 : 0)) + fx * ((k.d ? 1 : 0) - (k.a ? 1 : 0))) * sp; S.tgt.y += ((k.e ? 1 : 0) - (k.q ? 1 : 0)) * sp * .6; clampT(g); }
  const cp = Math.cos(S.pitch); cam.position.set(S.tgt.x + Math.sin(S.yaw) * cp * S.dist, S.tgt.y + Math.sin(S.pitch) * S.dist, S.tgt.z + Math.cos(S.yaw) * cp * S.dist);
  const floor = g.player.root.position.y + .15; if (cam.position.y < floor) cam.position.y = floor;
  cam.up.set(0, 1, 0); cam.lookAt(S.tgt);
}
function clampT(g) { const S = g.photo, h = S.home, dx = S.tgt.x - h.x, dz = S.tgt.z - h.z, d = Math.hypot(dx, dz), R = 9; if (d > R) { S.tgt.x = h.x + dx / d * R; S.tgt.z = h.z + dz / d * R; } S.tgt.y = Math.max(h.y - 1, Math.min(h.y + 4, S.tgt.y)); }
function orbit(g, dx, dy) { const S = g.photo; S.yaw -= dx * .0085; S.pitch = Math.max(-.35, Math.min(1.35, S.pitch + dy * .0065)); }
function zoom(g, f) { const S = g.photo; S.dist = Math.max(.7, Math.min(14, S.dist * f)); }
function pan(g, dx, dy) { const S = g.photo, k = .0028 * Math.max(1.2, S.dist); const rx = Math.cos(S.yaw), rz = -Math.sin(S.yaw); S.tgt.x -= rx * dx * k; S.tgt.z -= rz * dx * k; S.tgt.y += dy * k; clampT(g); }
function setFilter(g, f) { g.photo.filter = f; const gl = $('#gl'); if (gl) gl.style.filter = cssOf(f); ui.chips.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.f === f.id)); $('#phVig').classList.toggle('hidden', !(f.vig || g.photo.vig)); }

function build(g) {
  const root = document.createElement('div'); root.id = 'photo'; root.className = 'hidden';
  root.innerHTML = `<div id="phVig" class="hidden"></div><div id="phFlash"></div><div id="phPad"></div>
  <div class="phTop"><div class="phChips">${FILTERS.map(f => `<button data-f="${f.id}">${f.name}</button>`).join('')}</div></div>
  <div class="phHint">Drag to orbit · pinch to zoom · two fingers to move</div>
  <div class="phBot"><button id="phDone">✕ Done</button><button id="phShot" aria-label="Take photo"><span></span></button><div class="phR"><button id="phVigB">Vignette</button><button id="phReset">Reset</button></div></div>
  <div id="phMsg"></div>`;
  document.body.appendChild(root);
  ui = { root, chips: root.querySelector('.phChips'), hint: root.querySelector('.phHint'), vig: root.querySelector('#phVigB') };
  ui.chips.onclick = (e) => { const b = e.target.closest('button'); if (b && g.photo) setFilter(g, FILTERS.find(f => f.id === b.dataset.f)); };
  ui.vig.onclick = () => { if (!g.photo) return; g.photo.vig = !g.photo.vig; ui.vig.classList.toggle('on', g.photo.vig); setFilter(g, g.photo.filter); };
  root.querySelector('#phReset').onclick = () => { const S = g.photo; if (!S) return; S.tgt.copy(S.home); Object.assign(S, S.home0); };
  root.querySelector('#phDone').onclick = () => photoClose(g);
  root.querySelector('#phShot').onclick = () => { if (g.photo) snap(g); };
  // free camera input on the pad (pointer events cover touch + mouse)
  const pad = root.querySelector('#phPad'), pts = new Map(); let last2 = null;
  const two = () => { const [a, b] = [...pts.values()]; return { d: Math.hypot(a.x - b.x, a.y - b.y), x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; };
  pad.addEventListener('pointerdown', (e) => { if (!g.photo) return; pad.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY, btn: e.button, sh: e.shiftKey }); last2 = pts.size === 2 ? two() : null; ui.hint.classList.add('fade'); e.preventDefault(); });
  pad.addEventListener('pointermove', (e) => { const p = pts.get(e.pointerId); if (!p || !g.photo) return; const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
    if (pts.size >= 2) { const t = two(); if (last2) { if (t.d > 10 && last2.d > 10) zoom(g, last2.d / t.d); pan(g, t.x - last2.x, t.y - last2.y); } last2 = t; }
    else if (p.btn === 2 || p.btn === 1 || p.sh) pan(g, dx, dy); else orbit(g, dx, dy); e.preventDefault(); });
  const up = (e) => { pts.delete(e.pointerId); last2 = pts.size === 2 ? two() : null; };
  pad.addEventListener('pointerup', up); pad.addEventListener('pointercancel', up); pad.addEventListener('contextmenu', (e) => e.preventDefault());
  pad.addEventListener('wheel', (e) => { if (!g.photo) return; zoom(g, Math.exp(e.deltaY * .0012)); e.preventDefault(); }, { passive: false });
  addEventListener('keydown', (e) => { if (!g.photo) return; const k = e.key.toLowerCase(); if ('wasdqe'.includes(k) && k.length === 1) { g.photo.keys[k] = true; e.stopPropagation(); } if (k === ' ' || k === 'enter') { snap(g); e.preventDefault(); } }, true);
  addEventListener('keyup', (e) => { if (g.photo) g.photo.keys[e.key.toLowerCase()] = false; }, true);
}

function msg(t) { const m = $('#phMsg'); if (!m) return; m.textContent = t; m.classList.add('on'); clearTimeout(m._t); m._t = setTimeout(() => m.classList.remove('on'), 2600); }
// Render a fresh frame at full device resolution and read it back in the same task (no preserveDrawingBuffer needed)
export function capture(g) {
  const S = g.photo, R = g.renderer, pr0 = R.getPixelRatio(), want = Math.min(3, Math.max(pr0, window.devicePixelRatio || 1));
  const w0 = innerWidth, h0 = innerHeight; let out;
  try { if (want !== pr0) { R.setPixelRatio(want); g.resize(); } photoApply(g); g.scene.updateMatrixWorld(); if (g.composer) g.composer.render(); else R.render(g.scene, g.camera);
    const src = R.domElement, c = document.createElement('canvas'); c.width = src.width; c.height = src.height; const ctx = c.getContext('2d', { willReadFrequently: true }); ctx.drawImage(src, 0, 0); bake(ctx, c.width, c.height, S.filter, S.vig); out = c;
  } finally { if (want !== pr0) { R.setPixelRatio(pr0); g.resize(); } }
  void w0; void h0; return out;
}
function dataBlob(url) { const [h, b64] = url.split(','), bin = atob(b64), n = bin.length, u = new Uint8Array(n); for (let i = 0; i < n; i++) u[i] = bin.charCodeAt(i); return new Blob([u], { type: h.slice(5).split(';')[0] }); }
export function snap(g) {
  const fl = $('#phFlash'); if (fl) { fl.classList.remove('go'); void fl.offsetWidth; fl.classList.add('go'); }
  try { g.audio && g.audio.click && g.audio.click(); } catch (e) { /* ignore */ }
  let c; try { c = capture(g); } catch (e) { console.warn('photo capture', e); msg('Could not take the photo'); return; }
  const url = c.toDataURL('image/jpeg', .92), name = `AfterTheQuiet-${stamp()}.jpg`; window.__atqLastPhoto = { name, w: c.width, h: c.height, url };
  const cap = window.Capacitor; if (cap && cap.isNativePlatform && cap.isNativePlatform()) { saveNative(url, name); return; }
  const blob = dataBlob(url), file = typeof File !== 'undefined' ? new File([blob], name, { type: 'image/jpeg' }) : null;
  // share sheet (iPhone: "Save Image" puts it in Photos). Called synchronously inside the tap so Safari allows it.
  if (file && navigator.canShare && navigator.share && !window.__atqNoShare) { let ok = false; try { ok = navigator.canShare({ files: [file] }); } catch (e) { ok = false; }
    if (ok) { navigator.share({ files: [file], title: 'After the Quiet' }).then(() => msg('Photo shared'), (e) => { if (e && e.name === 'AbortError') msg('Photo not saved'); else download(blob, name); }); return; } }
  download(blob, name);
}
function download(blob, name) { const u = URL.createObjectURL(blob), a = document.createElement('a'); a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000); msg('Photo saved to Downloads'); window.__atqLastSave = 'download:' + name; }
async function saveNative(url, name) {
  try { const [{ Filesystem, Directory }, { Share }] = await Promise.all([import('@capacitor/filesystem'), import('@capacitor/share')]);
    const r = await Filesystem.writeFile({ path: name, data: url.split(',')[1], directory: Directory.Cache });
    await Share.share({ title: 'After the Quiet', files: [r.uri] }); msg('Photo ready to save or share'); window.__atqLastSave = 'native:' + name;
  } catch (e) { if (String(e && (e.message || e)).match(/cancel/i)) msg('Photo not saved'); else { console.warn('photo native save', e); msg('Could not save the photo'); } }
}
if (typeof window !== 'undefined') window.__atqPhoto = { FILTERS, bake };
