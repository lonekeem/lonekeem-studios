import * as THREE from 'three';
import { buildTown } from '../../src/mp/town/map.js';
const q = new URLSearchParams(location.search); const W0 = +q.get('w') || 1000, H0 = +q.get('h') || 800;
const r = new THREE.WebGLRenderer({ antialias: true }); r.setSize(W0, H0); document.body.append(r.domElement); r.shadowMap.enabled = true; r.toneMapping = THREE.ACESFilmicToneMapping;
const s = new THREE.Scene(); s.background = new THREE.Color('#9aa5aa'); s.add(new THREE.HemisphereLight('#dfe8f0', '#5f6a4c', 1.4)); const sun = new THREE.DirectionalLight('#fff0d8', 2.2); sun.position.set(40, 80, 30); s.add(sun);
const W = buildTown(s); window.W = W; W.closed.update(0, 0);
let cam; if (q.get('top')) { const e = +q.get('top'); cam = new THREE.OrthographicCamera(-e * W0 / H0, e * W0 / H0, e, -e, 1, 500); cam.position.set(+q.get('cx') || 0, 200, (+q.get('cz') || 0) + .01); cam.lookAt(+q.get('cx') || 0, 0, +q.get('cz') || 0); }
else { cam = new THREE.PerspectiveCamera(55, W0 / H0, .1, 500); cam.position.set(+q.get('x'), +q.get('y') || 6, +q.get('z')); cam.lookAt(+q.get('lx'), +q.get('ly') || 1.5, +q.get('lz')); }
setTimeout(() => { r.render(s, cam); window.info = { statics: Object.keys(W.statics), doors: W.doors.length, containers: W.containers.length, enterable: W.enterable.length, lots: W.lots.length, closedShown: W.closed.shown, calls: r.info.render.calls, tris: r.info.render.triangles }; document.title = 'done'; }, 1500);
