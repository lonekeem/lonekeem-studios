import * as THREE from 'three';
export const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const rnd = (a, b) => a + Math.random() * (b - a);
export function angLerp(a, b, t) { let d = ((b - a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI; return a + d * t; }
export function canvasTex(w, h, draw, srgb = true) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }
export function signTex(lines, bg = '#1d3b26', fg = '#e8efe4', w = 512, h = 192) {
  return canvasTex(w, h, (g) => { g.fillStyle = bg; g.fillRect(0, 0, w, h); g.strokeStyle = fg; g.lineWidth = 8; g.strokeRect(10, 10, w - 20, h - 20);
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle'; const n = lines.length;
    // v1.9.28: shrink each line until it fits inside the border (long names like RIVERSIDE MARKET / HANK'S GAS & GARAGE were cut off at both edges)
    lines.forEach((l, i) => { let fs = Math.floor(h / (n + 1.4)); const font = () => (i === 0 ? 'bold ' : '') + fs + 'px Georgia'; g.font = font();
      while (fs > 8 && g.measureText(l).width > w - 52) { fs--; g.font = font(); } g.fillText(l, w / 2, h * (i + 1) / (n + 1)); });
    // grime
    for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(40,30,20,${Math.random() * .25})`; g.fillRect(Math.random() * w, Math.random() * h, 2 + Math.random() * 8, 2 + Math.random() * 8); } });
}
export function bloodTex() {
  return canvasTex(256, 256, (g, w, h) => { const cx = w / 2, cy = h / 2;
    for (let i = 0; i < 26; i++) { const r = 10 + Math.random() * 50, a = Math.random() * 6.28, d = Math.random() * 60; const x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d;
      const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(70,0,0,.95)'); gr.addColorStop(.7, 'rgba(90,4,4,.85)'); gr.addColorStop(1, 'rgba(90,4,4,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
    for (let i = 0; i < 40; i++) { const a = Math.random() * 6.28, d = 60 + Math.random() * 60; g.fillStyle = 'rgba(80,0,0,.9)'; g.beginPath(); g.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 1 + Math.random() * 5, 0, 7); g.fill(); }
    // v1.9.26: fade everything out before the canvas edge, so a splat never shows the square edge of its decal plane (the boxy dark-red patch on
    // the wall by the starting room's doorway read as a solid red block next to the HUD buttons)
    g.globalCompositeOperation = 'destination-in'; const m = g.createRadialGradient(cx, cy, 0, cx, cy, w / 2); m.addColorStop(0, 'rgba(0,0,0,1)'); m.addColorStop(.72, 'rgba(0,0,0,1)'); m.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = m; g.fillRect(0, 0, w, h); g.globalCompositeOperation = 'source-over'; });
}
export function grassBladeTex() {
  return canvasTex(128, 128, (g, w, h) => { g.clearRect(0, 0, w, h);
    for (let i = 0; i < 22; i++) { const x = 8 + Math.random() * (w - 16), hh = h * (0.45 + Math.random() * 0.55), lean = (Math.random() - .5) * 30;
      const c = 60 + Math.random() * 50; g.strokeStyle = `rgb(${c * .75 | 0},${c + 25 | 0},${c * .45 | 0})`; g.lineWidth = 2 + Math.random() * 3; g.beginPath(); g.moveTo(x, h); g.quadraticCurveTo(x + lean * .3, h - hh * .5, x + lean, h - hh); g.stroke(); } });
}
