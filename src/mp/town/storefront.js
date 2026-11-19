// Lit, readable front for the KL Fuel shop (the kiosk building): glowing "KL MART" sign band, lit windows with shelves and an OPEN sign,
// a light-coloured glass door with a push bar, and a soft light spill on the ground. Original art, no real brand marks.
// All pieces are cheap unlit/emissive meshes (no extra scene lights) so it stays fast on phones.
import * as THREE from 'three';
import { klTex } from './kit.js';

const cvs = (w, h, fn) => { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
const rr = (g, x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };

function signBandTex() { return cvs(2048, 144, (g, w, h) => { g.fillStyle = '#17653f'; g.fillRect(0, 0, w, h); g.fillStyle = '#f2c230'; g.fillRect(0, 0, w, 12); g.fillRect(0, h - 12, w, 12);
  g.fillStyle = '#fff6d6'; g.textBaseline = 'middle'; g.textAlign = 'center'; g.font = 'bold 104px system-ui,sans-serif'; g.fillText('KL MART', w / 2, h / 2 + 4); g.font = 'bold 42px system-ui,sans-serif'; g.fillText('SNACKS · DRINKS', 430, h / 2 + 4); g.fillText('OPEN 24 HRS', w - 430, h / 2 + 4);
  g.strokeStyle = '#fff6d6'; g.lineWidth = 4; g.beginPath(); g.moveTo(760, 30); g.lineTo(760, h - 30); g.moveTo(w - 760, 30); g.lineTo(w - 760, h - 30); g.stroke(); }); } // 2048x144 matches the band's 14:1 shape (no stretching)

// warm lit shop interior seen through the glass: shelves with colourful goods, a drinks fridge, an OPEN neon sign
function windowTex(open = true) { return cvs(608, 360, (g, W0, H0) => { g.scale(W0 / 512, H0 / 384); const w = 512, h = 384; const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#ffe9b0'); gr.addColorStop(1, '#f3c878'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.fillStyle = '#6e5a43'; g.fillRect(0, h - 60, w, 60); // floor
  const cols = ['#d8392f', '#2f6fb0', '#f2c230', '#3c9d5b', '#e98a2f', '#8b4fb0', '#f4f1e8'];
  for (let s = 0; s < 3; s++) { const y = 150 + s * 62; g.fillStyle = '#7a5a3a'; g.fillRect(30, y + 40, 270, 10); for (let i = 0; i < 12; i++) { g.fillStyle = cols[(i * 3 + s * 2) % cols.length]; const bh = 22 + ((i * 7 + s * 5) % 5) * 3; rr(g, 38 + i * 22, y + 40 - bh, 17, bh, 3); g.fill(); } }
  g.fillStyle = '#cfe6ee'; rr(g, 330, 90, 150, 270, 10); g.fill(); g.fillStyle = '#9ec7d8'; for (let i = 0; i < 3; i++) { g.fillRect(340, 105 + i * 80, 130, 4); } for (let r = 0; r < 3; r++) for (let i = 0; i < 6; i++) { g.fillStyle = cols[(i + r) % cols.length]; rr(g, 342 + i * 21, 120 + r * 80, 14, 40, 3); g.fill(); }
  if (open) { g.fillStyle = '#1b1f27'; rr(g, 80, 30, 160, 62, 12); g.fill(); g.strokeStyle = '#ff5a4d'; g.lineWidth = 5; rr(g, 86, 36, 148, 50, 9); g.stroke(); g.fillStyle = '#ff7a6b'; g.font = 'bold 40px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('OPEN', 160, 62); }
  g.fillStyle = 'rgba(255,255,255,.12)'; g.beginPath(); g.moveTo(0, h); g.lineTo(150, 0); g.lineTo(230, 0); g.lineTo(80, h); g.fill(); }); } // soft glass sheen

function spillTex() { return cvs(128, 128, (g, w, h) => { const r = g.createRadialGradient(w / 2, h / 2, 4, w / 2, h / 2, w / 2); r.addColorStop(0, 'rgba(255,214,130,.55)'); r.addColorStop(1, 'rgba(255,214,130,0)'); g.fillStyle = r; g.fillRect(0, 0, w, h); }); }

/** Decorate the shop building `bd` (from makeBuilding, kind 'kiosk'). Local coords of bd.grp: +z is outward at the front wall. */
export function addStorefront(W, bd) {
  const { grp, cfg } = bd; const hw = cfg.w / 2, hd = cfg.d / 2, FZ = hd + .11 /* outer wall face */;
  const unlit = (map, extra) => new THREE.MeshBasicMaterial(Object.assign({ map, toneMapped: false }, extra));
  // lit sign band across the whole front, under the roof edge
  const band = new THREE.Mesh(new THREE.BoxGeometry(cfg.w - .1, .62, .12), (() => { const side = new THREE.MeshStandardMaterial({ color: '#17653f' }); return [side, side, side, side, unlit(signBandTex()), side]; })()); band.position.set(0, 2.88, FZ + .06); grp.add(band);
  // KL badge on the sign (the shop's own mark)
  const badge = new THREE.Mesh(new THREE.CircleGeometry(.27, 24), new THREE.MeshBasicMaterial({ map: klTex() })); badge.position.set(cfg.w / 2 - 1.35, 2.88, FZ + .125); badge.visible = false; grp.add(badge);
  // lit windows (front wall window: local x -hw/4, width 3.2, y .6..2.5)
  const win = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.9), unlit(windowTex(true))); win.position.set(-hw / 4, 1.55, hd + .045); grp.add(win);
  const sideTex = windowTex(false); for (const sx of [-1, 1]) { const w2 = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.1), unlit(sideTex)); w2.rotation.y = sx * Math.PI / 2; w2.position.set(sx * (hw + .045), 1.6, .4); grp.add(w2); }
  // door: light teal panel with glass + push bar (both sides), replaces the dark brown plank
  const D = bd.doors.find(d => d.name === 'front'); if (D && D.panel) { const pm = new THREE.MeshStandardMaterial({ color: '#2f9b78', roughness: .6, emissive: '#0d3a2b', emissiveIntensity: .6 }); D.panel.material = pm; const gl = windowTex(false);
    for (const sd of [1, -1]) { const g = new THREE.Mesh(new THREE.PlaneGeometry(.66, 1.15), unlit(gl)); g.position.set(0, .22, sd * .034); if (sd < 0) g.rotation.y = Math.PI; D.panel.add(g);
      const bar = new THREE.Mesh(new THREE.BoxGeometry(.05, .55, .05), new THREE.MeshStandardMaterial({ color: '#d9dde0', metalness: .6, roughness: .35 })); bar.position.set(.36, -.1, sd * .06); D.panel.add(bar); }
    const op = new THREE.Mesh(new THREE.PlaneGeometry(.3, .12), unlit(cvs(128, 48, (g, w, h) => { g.fillStyle = '#ff5a4d'; rr(g, 2, 2, w - 4, h - 4, 8); g.fill(); g.fillStyle = '#fff'; g.font = 'bold 30px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('OPEN', w / 2, h / 2 + 2); }))); op.position.set(0, -.5, .036); D.panel.add(op); }
  // warm light spill on the forecourt in front of the window and the door
  const sp = new THREE.Mesh(new THREE.PlaneGeometry(9, 4.2).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: spillTex(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); sp.position.set(0, .085, FZ + 1.7); sp.renderOrder = 3; grp.add(sp);
  return { band, win };
}
