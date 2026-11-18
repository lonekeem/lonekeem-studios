// Dev-only: studio-lit character lineup for art review (npm run dev, open /tools/lineup.html?w=1400&h=600&cam=full|keem|zed ...)
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { CharLib, Char, weaponMesh } from '../src/game/chars.js';
import { CAST, randomLook, raiderLook } from '../src/game/looks.js';
const q = new URLSearchParams(location.search); const W = +q.get('w') || innerWidth, H = +q.get('h') || innerHeight;
const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); r.setSize(W, H); r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping; r.shadowMap.enabled = true; document.body.appendChild(r.domElement);
const sc = new THREE.Scene(); sc.background = new THREE.Color('#2b2c30');
sc.add(new THREE.HemisphereLight('#c8d0e0', '#403830', 1.2)); const key = new THREE.DirectionalLight('#fff2e0', 2.6); key.position.set(2, 4, 5); key.castShadow = true; sc.add(key); const rimL = new THREE.DirectionalLight('#8fb0ff', 1.2); rimL.position.set(-3, 3, -4); sc.add(rimL);
const floor = new THREE.Mesh(new THREE.CircleGeometry(8, 40), new THREE.MeshStandardMaterial({ color: '#34353a', roughness: 1 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; sc.add(floor);
const gltf = await new GLTFLoader().loadAsync('/models/AnimationLibrary_Godot_Standard.gltf'); const lib = new CharLib(gltf);
const list = (q.get('who') || 'keem,nia,marcus,zed,raider').split(','); const spacing = +q.get('sp') || 1.25; const chars = [];
list.forEach((k, i) => { let L, sc0 = .98, anim = 'Idle_Loop';
  if (k === 'zed') { L = Object.assign(randomLook(+q.get('zs') || 21, true), { grime: 1, blood: .9 }); L.outfit = 'flannel'; anim = 'Walk_Loop'; }
  else if (k === 'raider') { L = Object.assign(raiderLook(+q.get('rs') || 4), { grime: .6, blood: .1 }); anim = 'Pistol_Aim_Neutral'; }
  else { L = CAST[k]; sc0 = k === 'nia' ? .62 : k === 'keem' ? .9 : .98; }
  const c = new Char(lib, L, sc0); c.root.rotation.y = +q.get('rot') || 0; c.root.position.x = (i - (list.length - 1) / 2) * spacing; sc.add(c.root); c.play(anim); c.mixer.update(0.3 + i * .1);
  if (k === 'raider') { const h = new THREE.Group(); h.add(weaponMesh('rifle')); h.rotation.set(Math.PI / 2, 0, 0); h.position.set(0, .08, .02); c.attach('DEF-hand.R', h); }
  chars.push(c); });
const cam = new THREE.PerspectiveCamera(+q.get('fov') || 28, W / H, .1, 50); const mode = q.get('cam') || 'full';
const tx = +q.get('x') || 0, ty = +q.get('y') || (mode === 'full' ? .85 : 1.45), dist = +q.get('d') || (mode === 'full' ? 7.5 : 1.4);
cam.position.set(tx + (+q.get('ax') || 0), ty + .1, dist); cam.lookAt(tx, ty, 0);
chars.forEach(c => c.mixer.update(0)); r.render(sc, cam); window.__ready = true;
