import * as THREE from 'three';
import { loadBase, Avatar } from '../src/mp/avatar.js';
import { dress } from '../src/mp/dress.js';
import * as K from '../src/mp/look.js';
import * as SL from '../src/mp/storeLook.js';
import * as C from '../src/mp/catalog.js';
import { MOUTH_SHAPES } from '../src/mp/v2/facepaint.js';

const outEl = document.getElementById('out');
const view = document.getElementById('view');
const renderer = new THREE.WebGLRenderer({ canvas: view, antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.setPixelRatio(1);
renderer.setClearColor('#2a3038', 1);
const scene = new THREE.Scene();
scene.background = new THREE.Color('#2a3038');
scene.add(new THREE.HemisphereLight('#e8f0ff', '#4a5248', 0.95));
const key = new THREE.DirectionalLight('#fff4e6', 1.7); key.position.set(1.4, 2.5, 3); scene.add(key);
const fill = new THREE.DirectionalLight('#c9e4ff', 0.55); fill.position.set(-2.2, 1.8, 1.6); scene.add(fill);
const cam = new THREE.PerspectiveCamera(28, 1, 0.05, 40);

const cache = {};
window.__SHOTS = {};
// neckline review: every top on both bases, chest-up close-up (front + 3/4)
async function start() {
  const tops = (new URLSearchParams(location.search).get('tops') || C.TOPS.map(t => t[0]).join(',')).split(',');
  const bases = (new URLSearchParams(location.search).get('bases') || 'mp_f1,mp_m1').split(',');
  for (const base of bases) { cache[base] = await loadBase(base); }
  const W = +(new URLSearchParams(location.search).get("w") || 360), H = W;
  for (const base of bases) for (const top of tops) {
    const L = K.defaultLook(base); L.hair = Object.assign({}, L.hair, { id: base === 'mp_f1' ? 'bob' : 'crew', c: '#1a110b' }); L.skin = Object.assign({}, L.skin, { t: .45 });
    SL.applyParts(L, { pierce: [], earL: 'none', earR: 'none', jacket: 'none', hat: 'none', top: { id: top, c: '#222' }, pants: { id: 'jeans', c: '#333' }, shoes: { id: 'sneaker', c: '#eee' } });
    const look = K.normalize(L); const av = new Avatar(cache[base]); dress(av, look); scene.add(av.root); av.root.updateMatrixWorld(true);
    const h2 = av.head2; const y = h2 ? h2.C.y - .2 * h2.s / (h2.s || 1) : 1.2;
    for (const [tag, yaw] of [['f', 0.12], ['q', 0.7]]) {
      renderer.setSize(W, H, false); av.root.rotation.y = yaw; av.root.updateMatrixWorld(true);
      cam.fov = 26; cam.aspect = 1; cam.updateProjectionMatrix(); cam.position.set(0, y + .02, +(new URLSearchParams(location.search).get("z") || .9)); cam.lookAt(0, y - .08, 0);
      renderer.render(scene, cam); window.__SHOTS[`${base}-${top}-${tag}`] = view.toDataURL('image/png');
    }
    if (new URLSearchParams(location.search).get('probe')) { const ms = []; av.root.traverse(o => { if (o.isMesh && o.visible) ms.push(o); }); window.__MS = ms.map((o, i) => i + ' ' + o.type + ' ' + (o.name || '') + ' v' + o.geometry.attributes.position.count + ' ro' + o.renderOrder + ' ' + (o.material.type || '') + ' ' + (o.material.name || '')); av.root.rotation.y = +(new URLSearchParams(location.search).get('py') || .12); av.root.updateMatrixWorld(true);
      for (let i = 0; i < ms.length; i++) { ms[i].visible = false; renderer.render(scene, cam); window.__SHOTS[`hide${i}-${top}`] = view.toDataURL('image/png'); ms[i].visible = true; } }
    scene.remove(av.root);
  }
  window.__READY = 1;
}
start().catch(e => { window.__ERROR = String(e && e.stack || e); window.__READY = 1; });
