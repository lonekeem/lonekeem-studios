// Phase-1 shared free-roam lobby: a small street block, your avatar + every other tab that joins, and one drivable KL-badge car.
// Remote players arrive through net.js (BroadcastChannel now, Supabase Realtime / game server later). No zombies yet: see docs/multiplayer.md.
import * as THREE from 'three';
import { loadBase, Avatar } from './avatar.js';
import { dress } from './dress.js';
import { animate } from './anim.js';
import { Net } from './net.js';

const CSS = `#mpl{position:fixed;inset:0;z-index:61;background:#9cc4e8;touch-action:none;user-select:none;font-family:system-ui,sans-serif;color:#fff}#mpl canvas{width:100%;height:100%;display:block}
#mpl .top{position:absolute;left:8px;right:8px;top:8px;display:flex;gap:6px;align-items:center;pointer-events:none}#mpl .top>*{pointer-events:auto}
#mpl button{font:inherit;color:#fff;background:#1c2029cc;border:1px solid #ffffff44;border-radius:10px;padding:8px 12px;font-size:13px}#mpl .info{flex:1;text-align:center;text-shadow:0 1px 3px #000;font-size:13px}
#mpl .stick{position:absolute;left:18px;bottom:26px;width:130px;height:130px;border-radius:50%;background:#ffffff22;border:2px solid #ffffff55}#mpl .stick i{position:absolute;left:45px;top:45px;width:40px;height:40px;border-radius:50%;background:#ffffffaa}
#mpl .btns{position:absolute;right:16px;bottom:30px;display:flex;flex-direction:column;gap:10px}#mpl .btns button{width:74px;height:54px;font-weight:600}#mpl .tip{position:absolute;left:0;right:0;bottom:170px;text-align:center;font-size:13px;text-shadow:0 1px 3px #000;pointer-events:none}`;
const el = (t, p = {}, ...k) => { const e = document.createElement(t); for (const a in p) { if (a === 'cls') e.className = p[a]; else if (a === 'on') for (const ev in p.on) e.addEventListener(ev, p.on[ev]); else e.setAttribute(a, p[a]); } e.append(...k.filter(Boolean)); return e; };

function tex(draw, w = 256, h = 256, rep = 1) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep); t.anisotropy = 4; return t; }
function klBadge() { return tex((g, w, h) => { g.fillStyle = '#0d0f14'; g.fillRect(0, 0, w, h); g.strokeStyle = '#d9b44a'; g.lineWidth = 14; g.beginPath(); g.arc(w / 2, h / 2, w * .42, 0, 7); g.stroke(); g.fillStyle = '#d9b44a'; g.font = 'bold 120px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('KL', w / 2, h / 2 + 6); }, 128, 128); }
function nameTag(text) { const c = document.createElement('canvas'); c.width = 256; c.height = 64; const g = c.getContext('2d'); g.fillStyle = '#000a'; g.roundRect ? g.roundRect(8, 10, 240, 44, 14) : g.rect(8, 10, 240, 44); g.fill(); g.fillStyle = '#fff'; g.font = '600 28px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text.slice(0, 16), 128, 33); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true })); s.scale.set(.5, .125, 1); s.renderOrder = 20; return s; }

function buildWorld(scene) {
  scene.background = new THREE.Color('#9cc4e8'); scene.fog = new THREE.Fog('#9cc4e8', 40, 160);
  scene.add(new THREE.HemisphereLight('#e6f1ff', '#6c7a5a', 1.5)); const sun = new THREE.DirectionalLight('#fff1d6', 2.4); sun.position.set(30, 50, 20); scene.add(sun);
  const grass = tex((g, w, h) => { g.fillStyle = '#6f8f4a'; g.fillRect(0, 0, w, h); for (let i = 0; i < 2200; i++) { g.fillStyle = `hsl(${85 + Math.random() * 25},35%,${32 + Math.random() * 16}%)`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); } }, 256, 256, 60);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.MeshStandardMaterial({ map: grass, roughness: 1 })); ground.rotation.x = -Math.PI / 2; scene.add(ground);
  const asphalt = tex((g, w, h) => { g.fillStyle = '#3b3e44'; g.fillRect(0, 0, w, h); for (let i = 0; i < 1800; i++) { g.fillStyle = `rgba(${90 + Math.random() * 40},${90 + Math.random() * 40},${95 + Math.random() * 40},.25)`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); } g.fillStyle = '#d8d2a0'; g.fillRect(w / 2 - 3, 0, 6, h * .5); }, 256, 256, 1);
  const mats = new THREE.MeshStandardMaterial({ color: '#46494f', roughness: .95 }); const road = (x, z, w, d, rot) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ map: rot ? asphalt : asphalt, roughness: .95 })); m.material.map = asphalt.clone(); m.material.map.needsUpdate = true; m.material.map.repeat.set(1, d / 10); m.rotation.x = -Math.PI / 2; m.rotation.z = rot ? Math.PI / 2 : 0; m.position.set(x, .02, z); if (rot) m.material.map.repeat.set(1, w / 10); scene.add(m); return m; };
  road(0, 0, 9, 240, false); road(0, 0, 9, 240, true); const walk = new THREE.MeshStandardMaterial({ color: '#a9a69c', roughness: 1 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const b = new THREE.Mesh(new THREE.BoxGeometry(46, .12, 46), walk); b.position.set(sx * 29, .06, sz * 29); scene.add(b); }
  // buildings
  const facade = (col) => tex((g, w, h) => { g.fillStyle = col; g.fillRect(0, 0, w, h); for (let y = 16; y < h - 16; y += 48) for (let x = 14; x < w - 14; x += 44) { g.fillStyle = '#2b3a4a'; g.fillRect(x, y, 26, 30); g.fillStyle = '#9fc2e0'; g.fillRect(x + 2, y + 2, 22, 12); } }, 256, 256, 1);
  const cols = ['#b5483a', '#c9b88a', '#7e8fa6', '#9a6f4e', '#8b9a7c', '#c68a5b']; let n = 0; const solid = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) { const w = 12 + (n * 7 % 5), d = 12 + (n * 3 % 4), h = 8 + (n * 5 % 14); const t = facade(cols[n % cols.length]); t.repeat.set(w / 8, h / 8); const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ map: t, roughness: .9 })); const x = sx * (12 + i * 15), z = sz * (12 + j * 20); m.position.set(x + sx * w / 2 - sx * 4, h / 2, z + sz * d / 2 - sz * 4); scene.add(m); solid.push({ x: m.position.x, z: m.position.z, hw: w / 2 + .4, hd: d / 2 + .4 }); n++; }
  // trees + lamps
  const trunk = new THREE.MeshStandardMaterial({ color: '#5a3d26' }), leaf = new THREE.MeshStandardMaterial({ color: '#3f7a3a', roughness: 1 }); for (let i = 0; i < 90; i++) { const a = i * 2.399, r = 90 + (i * 13 % 70); const x = Math.cos(a) * r, z = Math.sin(a) * r; const t = new THREE.Mesh(new THREE.CylinderGeometry(.3, .45, 3, 7), trunk); t.position.set(x, 1.5, z); const c = new THREE.Mesh(new THREE.ConeGeometry(2.6, 7, 8), leaf); c.position.set(x, 6, z); scene.add(t, c); }
  for (let i = -5; i <= 5; i++) if (i) for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(.08, .1, 6, 6), new THREE.MeshStandardMaterial({ color: '#2a2d33' })); p.position.set(s * 6, 3, i * 20); scene.add(p); }
  return solid;
}
function buildCar() {
  const g = new THREE.Group(); const paint = new THREE.MeshStandardMaterial({ color: '#b3202a', roughness: .35, metalness: .15 }), dark = new THREE.MeshStandardMaterial({ color: '#15181d', roughness: .6 }), glass = new THREE.MeshStandardMaterial({ color: '#7fa6c6', roughness: .1, metalness: .2, transparent: true, opacity: .75 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.9, .62, 4.3), paint); body.position.y = .72; g.add(body); const hood = new THREE.Mesh(new THREE.BoxGeometry(1.84, .12, 1.5), paint); hood.position.set(0, 1.06, 1.25); hood.rotation.x = .06; g.add(hood);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(1.7, .58, 2.0), glass); cab.position.set(0, 1.28, -.25); g.add(cab); const roof = new THREE.Mesh(new THREE.BoxGeometry(1.74, .08, 2.1), paint); roof.position.set(0, 1.6, -.25); g.add(roof);
  for (const [x, z] of [[-.95, 1.35], [.95, 1.35], [-.95, -1.35], [.95, -1.35]]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(.38, .38, .28, 18), dark); w.rotation.z = Math.PI / 2; w.position.set(x, .38, z); g.add(w); const hub = new THREE.Mesh(new THREE.CylinderGeometry(.2, .2, .3, 10), new THREE.MeshStandardMaterial({ color: '#cfd3d8', roughness: .3, metalness: .6 })); hub.rotation.z = Math.PI / 2; hub.position.set(x * 1.01, .38, z); g.add(hub); }
  const badge = new THREE.MeshBasicMaterial({ map: klBadge() }); const kl1 = new THREE.Mesh(new THREE.PlaneGeometry(.32, .32), badge); kl1.position.set(0, .86, 2.16); g.add(kl1); const kl2 = kl1.clone(); kl2.position.set(0, .95, -2.16); kl2.rotation.y = Math.PI; g.add(kl2);
  for (const s of [-1, 1]) { const hl = new THREE.Mesh(new THREE.BoxGeometry(.4, .16, .06), new THREE.MeshStandardMaterial({ color: '#f1f1e6', roughness: .3 })); hl.position.set(s * .65, .86, 2.17); g.add(hl); const tl = new THREE.Mesh(new THREE.BoxGeometry(.4, .14, .06), new THREE.MeshStandardMaterial({ color: '#7a0f16', roughness: .4 })); tl.position.set(s * .65, .88, -2.17); g.add(tl); }
  g.userData = { v: 0, steer: 0, driver: null }; return g;
}

export async function enterLobby({ look, onExit } = {}) {
  if (!document.getElementById('mpl-css')) document.head.append(el('style', { id: 'mpl-css' }, CSS));
  const root = el('div', { id: 'mpl' }); const canvas = el('canvas'); const info = el('div', { cls: 'info' }, 'Connecting…'); const tip = el('div', { cls: 'tip' }); const stickKnob = el('i'); const stick = el('div', { cls: 'stick' }, stickKnob);
  let run = false, wantUse = false; const runB = el('button', { on: { click: e => { run = !run; e.target.style.background = run ? '#d98a2b' : ''; } } }, 'Run'); const useB = el('button', { on: { click: () => wantUse = true } }, 'Car');
  root.append(canvas, el('div', { cls: 'top' }, el('button', { on: { click: exit } }, '‹ Exit'), info, el('button', { on: { click: () => { net.me.look.__edit = 1; exit(true); } } }, 'Look')), stick, el('div', { cls: 'btns' }, useB, runB), tip); document.body.append(root);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true }); renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const scene = new THREE.Scene(); const solids = buildWorld(scene); const cam = new THREE.PerspectiveCamera(55, 1, .1, 400);
  const car = buildCar(); car.position.set(6, 0, -8); car.rotation.y = Math.PI / 2; scene.add(car);
  const net = new Net('lobby'); net.me = { name: look.name || 'Survivor', look }; net.hello();
  const me = { av: null, x: 0, z: 6, ry: 0, sp: 0, drv: false, vx: 0 }; const remotes = new Map();
  const mkAvatar = async (lk) => { const tpl = await loadBase(lk.base); const av = new Avatar(tpl); dress(av, lk); return av; };
  me.av = await mkAvatar(look); scene.add(me.av.root); const myTag = nameTag(net.me.name); scene.add(myTag);
  net.onHello = async p => { let r = remotes.get(p.id); if (!r) { r = { x: 0, z: 0, ry: 0, sp: 0, tx: 0, tz: 0, tr: 0, t: 0 }; remotes.set(p.id, r); } if (!p.look) return; const av = await mkAvatar(p.look); if (r.av) { scene.remove(r.av.root); r.av.dispose(); } r.av = av; scene.add(av.root); if (r.tag) scene.remove(r.tag); r.tag = nameTag(p.name || 'Player'); scene.add(r.tag); };
  net.onLeave = p => { const r = remotes.get(p.id); if (r) { r.av && (scene.remove(r.av.root), r.av.dispose()); r.tag && scene.remove(r.tag); remotes.delete(p.id); } };
  net.onCar = c => { if (car.userData.driver === 'me') return; car.userData.net = c; };
  // input
  const keys = {}; const kd = e => { keys[e.code] = true; if (e.code === 'KeyE') wantUse = true; }, ku = e => { keys[e.code] = false; }; addEventListener('keydown', kd); addEventListener('keyup', ku);
  const joy = { x: 0, y: 0, id: null }; const jr = () => stick.getBoundingClientRect();
  stick.addEventListener('pointerdown', e => { joy.id = e.pointerId; stick.setPointerCapture(e.pointerId); mv(e); }); const mv = e => { const r = jr(); let x = (e.clientX - r.left - r.width / 2) / (r.width / 2), y = (e.clientY - r.top - r.height / 2) / (r.height / 2); const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; } joy.x = x; joy.y = y; stickKnob.style.transform = `translate(${x * 40}px,${y * 40}px)`; };
  stick.addEventListener('pointermove', e => { if (e.pointerId === joy.id) mv(e); }); const rel = () => { joy.id = null; joy.x = joy.y = 0; stickKnob.style.transform = ''; }; stick.addEventListener('pointerup', rel); stick.addEventListener('pointercancel', rel);
  let camYaw = 0, drag = null; canvas.addEventListener('pointerdown', e => { drag = e.clientX; }); canvas.addEventListener('pointermove', e => { if (drag !== null) { camYaw -= (e.clientX - drag) * .006; drag = e.clientX; } }); canvas.addEventListener('pointerup', () => drag = null);
  const collide = (x, z, r) => { for (const b of solids) { const dx = x - b.x, dz = z - b.z; if (Math.abs(dx) < b.hw + r && Math.abs(dz) < b.hd + r) { const px = b.hw + r - Math.abs(dx), pz = b.hd + r - Math.abs(dz); if (px < pz) x += Math.sign(dx || 1) * px; else z += Math.sign(dz || 1) * pz; } } return [x, z]; };
  let running = true, last = performance.now(), t = 0, sendAcc = 0, carAcc = 0; const sp = { v: 0 };
  function frame(now) {
    if (!running) return; const dt = Math.min(.05, (now - last) / 1000); last = now; t += dt; const w = innerWidth, h = innerHeight; if (canvas.width !== Math.floor(w * renderer.getPixelRatio())) { renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
    let ix = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0) + joy.x, iy = (keys.KeyS || keys.ArrowDown ? 1 : 0) - (keys.KeyW || keys.ArrowUp ? 1 : 0) + joy.y; const il = Math.hypot(ix, iy); if (il > 1) { ix /= il; iy /= il; }
    const cu = car.userData; const dist = Math.hypot(car.position.x - me.x, car.position.z - me.z);
    if (wantUse) { wantUse = false; if (cu.driver === 'me') { cu.driver = null; me.drv = false; me.x = car.position.x + Math.cos(car.rotation.y) * 2.4; me.z = car.position.z - Math.sin(car.rotation.y) * 2.4; } else if (dist < 4 && !cu.driver) { cu.driver = 'me'; me.drv = true; cu.net = null; } }
    if (me.drv) { const gas = -iy, steer = ix; cu.v += (gas * (gas > 0 ? 9 : 12) - Math.sign(cu.v) * 3 * (Math.abs(gas) < .05)) * dt; cu.v = Math.max(-6, Math.min(22, cu.v)); if (Math.abs(gas) < .05 && Math.abs(cu.v) < .3) cu.v = 0; car.rotation.y -= steer * Math.min(1, Math.abs(cu.v) / 5) * Math.sign(cu.v) * 1.3 * dt; car.position.x += Math.sin(car.rotation.y) * cu.v * dt; car.position.z += Math.cos(car.rotation.y) * cu.v * dt;
      const [cx, cz] = collide(car.position.x, car.position.z, 1.4); if (cx !== car.position.x || cz !== car.position.z) { cu.v *= -.2; car.position.x = cx; car.position.z = cz; } me.x = car.position.x; me.z = car.position.z; me.ry = car.rotation.y; me.sp = Math.abs(cu.v) / 6; tip.textContent = 'Driving · stick to steer/accelerate · E / Car to exit'; }
    else { const spd = (run ? 4.6 : 2.0) * il; if (il > .05) { const ang = Math.atan2(ix, iy) + camYaw; const dx = Math.sin(ang) * spd * dt, dz = -Math.cos(ang) * spd * dt * -1; // camera looks along +z when camYaw=0 => forward = -iy maps to +z
        const fx = Math.sin(camYaw), fz = Math.cos(camYaw); const vx = (-iy) * fx + ix * fz, vz = (-iy) * fz - ix * fx; me.x += vx * (run ? 4.6 : 2.0) * dt; me.z += vz * (run ? 4.6 : 2.0) * dt; me.ry = Math.atan2(vx, vz); }
      [me.x, me.z] = collide(me.x, me.z, .35); sp.v += (il * (run ? 2 : 1) - sp.v) * Math.min(1, dt * 8); me.sp = sp.v; tip.textContent = dist < 4 && !cu.driver ? 'Tap Car (or E) to get in' : ''; }
    me.av.root.visible = !me.drv; me.av.root.position.set(me.x, 0, me.z); me.av.root.rotation.y = me.ry; animate(me.av, t, me.sp); myTag.position.set(me.x, 1.95, me.z); myTag.visible = !me.drv;
    if (!me.drv && cu.net) { const c = cu.net; car.position.x += (c.x - car.position.x) * Math.min(1, dt * 10); car.position.z += (c.z - car.position.z) * Math.min(1, dt * 10); let d = c.ry - car.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); car.rotation.y += d * Math.min(1, dt * 10); }
    // remotes
    for (const [id, p] of net.peers) { const r = remotes.get(id); if (!r || !r.av || !p.s) continue; const s = p.s; r.tx = s.x; r.tz = s.z; r.tr = s.ry; r.x += (r.tx - r.x) * Math.min(1, dt * 10); r.z += (r.tz - r.z) * Math.min(1, dt * 10); let d = r.tr - r.ry; d = Math.atan2(Math.sin(d), Math.cos(d)); r.ry += d * Math.min(1, dt * 10); r.sp += ((s.sp || 0) - r.sp) * Math.min(1, dt * 8); r.av.root.visible = !s.drv; r.av.root.position.set(r.x, 0, r.z); r.av.root.rotation.y = r.ry; animate(r.av, t + id.length, r.sp); r.tag.position.set(r.x, 1.95, r.z); r.tag.visible = !s.drv; }
    sendAcc += dt; if (sendAcc > .08) { sendAcc = 0; net.state({ x: me.x, z: me.z, ry: me.ry, sp: me.sp, drv: me.drv }); } carAcc += dt; if (cu.driver === 'me' ? carAcc > .08 : carAcc > .6) { carAcc = 0; if (cu.driver === 'me' || cu.lastDriven) { net.car({ x: car.position.x, z: car.position.z, ry: car.rotation.y, v: cu.v }); } if (cu.driver === 'me') cu.lastDriven = true; }
    // camera
    const tgt = new THREE.Vector3(me.x, me.drv ? 1.6 : 1.45, me.z), dd = me.drv ? 8.5 : 4.2; const camYawEff = me.drv ? me.ry + Math.PI : camYaw + Math.PI; const want = new THREE.Vector3(tgt.x + Math.sin(camYawEff) * dd, tgt.y + (me.drv ? 2.6 : 1.1), tgt.z + Math.cos(camYawEff) * dd); cam.position.lerp(want, Math.min(1, dt * (me.drv ? 4 : 8))); cam.lookAt(tgt);
    if (me.drv) camYaw = me.ry; info.textContent = 'Players online: ' + (net.peers.size + 1) + ' · KL street test';
    renderer.render(scene, cam); requestAnimationFrame(frame);
  }
  function exit(edit) { running = false; removeEventListener('keydown', kd); removeEventListener('keyup', ku); net.close(); renderer.dispose(); root.remove(); delete window.__mpLobby; if (edit === true) { import('./creator.js').then(m => m.openCreator({ onClose: onExit, onPlay: l => enterLobby({ look: l, onExit }) })).then(c => { window.__mpCreator = c; }); } else onExit && onExit(); }
  window.__mpLobby = { me, net, remotes, car, cam, scene, setPos: (x, z) => { me.x = x; me.z = z; }, key: (k, v) => { keys[k] = v; }, peers: () => net.peers.size, camYaw: v => { camYaw = v; } };
  requestAnimationFrame(frame); return window.__mpLobby;
}
