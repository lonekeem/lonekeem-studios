// Dev-only: render Story Keem (exact story-mode code path) and the multiplayer Story Keem base side by side.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { CharLib, Char } from '../../src/game/chars.js';
import { loadRigs } from '../../src/game/avatar.js';
import { DEFAULT_LOOK } from '../../src/game/looks.js';
import { makeKeemChar } from '../../src/mp/motion.js';
import { applyStoryTints } from '../../src/mp/keemStory.js';
const q = new URLSearchParams(location.search); const W = +q.get('w') || 844, H = +q.get('h') || 390;
const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); r.setSize(W, H); r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping; r.shadowMap.enabled = true; document.body.appendChild(r.domElement);
const sc = new THREE.Scene(); sc.background = new THREE.Color('#2b2c30');
sc.add(new THREE.HemisphereLight('#c8d0e0', '#403830', 1.2)); const key = new THREE.DirectionalLight('#fff2e0', 2.6); key.position.set(2, 4, 5); key.castShadow = true; sc.add(key); const rimL = new THREE.DirectionalLight('#8fb0ff', 1.2); rimL.position.set(-3, 3, -4); sc.add(rimL);
const floor = new THREE.Mesh(new THREE.CircleGeometry(8, 40), new THREE.MeshStandardMaterial({ color: '#34353a', roughness: 1 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; sc.add(floor);
const gltf = await new GLTFLoader().loadAsync('/models/AnimationLibrary_Godot_Standard.gltf'); const lib = new CharLib(gltf);
lib.rigs = await loadRigs('/', ['keem']);
const cam = new THREE.PerspectiveCamera(28, W / H, .1, 50);
window.__atq = { game: { lib } }; // share the lib like the real game does
window.__H = { THREE, sc, r, cam, lib, Char, DEFAULT_LOOK, makeKeemChar, applyStoryTints, chars: [],
  clear() { for (const c of this.chars) sc.remove(c.root); this.chars = []; },
  add(c, x, rot = 0, anim = 'Idle_Loop', t = .3) { c.root.position.x = x; c.root.rotation.y = rot; sc.add(c.root); c.play(anim, { fade: 0 }); c.mixer.update(t); this.chars.push(c); return c; },
  shot(mode, tx = 0) { const ty = mode === 'full' ? .85 : mode === 'torso' ? 1.15 : 1.33, d = mode === 'full' ? 4.6 : mode === 'torso' ? 2.2 : 1.25; cam.position.set(tx, ty + .05, d); cam.lookAt(tx, ty, 0); cam.updateProjectionMatrix(); this.chars.forEach(c => c.mixer.update(0)); r.render(sc, cam); return r.domElement.toDataURL('image/png'); } };
window.__ready = true;
