// Dev-only: studio view of weapon + pickup models (open /tools/gear.html?set=guns|melee|pick)
import * as THREE from 'three';
import { weaponMesh } from '../src/game/chars.js';
import { buildPickup } from '../src/game/gear.js';
const q = new URLSearchParams(location.search); const W = +q.get('w') || 1100, H = +q.get('h') || 560; const set = q.get('set') || 'guns';
const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); r.setSize(W, H); r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping; document.body.appendChild(r.domElement);
const sc = new THREE.Scene(); sc.background = new THREE.Color('#2b2c30'); sc.add(new THREE.HemisphereLight('#c8d0e0', '#403830', 1.6)); const k = new THREE.DirectionalLight('#fff2e0', 3); k.position.set(2, 4, 5); sc.add(k);
const sets = { guns: ['pistol', 'revolver', 'smg', 'shotgun', 'rifle', 'sniper', 'saw', 'lever', 'auto12', 'handcannon', 'harpoon', 'minigun', 'crossbow', 'flamer', 'launcher'], melee: ['pan', 'bat', 'machete', 'axe', 'chainsaw', 'katana', 'tomahawk', 'longsword'], pick: ['ammo', 'ammoD', 'hp', 'med', 'cash', 'grenade'] };
const list = sets[set]; const cols = set === 'pick' ? 3 : set === 'melee' ? 4 : 3, rows = Math.ceil(list.length / cols); const sc0 = set === 'pick' ? 3 : +q.get('s') || 1;
list.forEach((id, i) => { const m = id === 'ammoD' ? buildPickup('ammo', true) : set === 'pick' ? buildPickup(id) : weaponMesh(id); m.scale.setScalar(sc0); const bb = new THREE.Box3().setFromObject(m), c = bb.getCenter(new THREE.Vector3()); m.position.sub(c); const w = new THREE.Group(); w.add(m); w.position.set(((i % cols) - (cols - 1) / 2) * (set === 'pick' ? 1.5 : 1.7), ((rows - 1) / 2 - Math.floor(i / cols)) * (set === 'pick' ? 1.2 : .75), 0); w.rotation.y = set === 'pick' ? -.6 : -Math.PI / 2 + .25; w.rotation.x = set === 'pick' ? .3 : 0; sc.add(w); });
const cam = new THREE.PerspectiveCamera(34, W / H, .1, 50); cam.position.set(0, 0, +q.get('z') || (set === 'pick' ? 6.8 : 7.2)); cam.lookAt(0, 0, 0); r.render(sc, cam); window.__ready = true;
