// Dev-only: studio view of the real-3D avatars with a weapon + animation, for close-up review of faces / hands / grip.
// /tools/avatar.html?who=keem&anim=Idle_Loop&gun=rifle&w=915&h=412&cam=face|hands|full&t=0.6
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { CharLib, Char, weaponMesh } from '../src/game/chars.js';
import { CAST, raiderLook, randomLook } from '../src/game/looks.js';
import { loadRigs } from '../src/game/avatar.js';
import { makeRabbit } from '../src/game/chars.js';
const q = new URLSearchParams(location.search); const W = +q.get('w') || 915, H = +q.get('h') || 412;
const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); r.setPixelRatio(+q.get('pr') || 1); r.setSize(W, H); r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.1; document.body.appendChild(r.domElement);
const sc = new THREE.Scene(); sc.background = new THREE.Color(q.get('bg') || '#3a3e46'); sc.add(new THREE.HemisphereLight('#cfd8ea', '#4a4038', 1.1));
const key = new THREE.DirectionalLight('#fff0dc', 2.4); key.position.set(2, 3, 4); sc.add(key); const rim = new THREE.DirectionalLight('#9ec0ff', 1.6); rim.position.set(-3, 2.5, -3); sc.add(rim); const fill = new THREE.DirectionalLight('#ffd9b0', .6); fill.position.set(-3, 1, 3); sc.add(fill);
const gltf = await new GLTFLoader().loadAsync('/models/AnimationLibrary_Godot_Standard.gltf'); const lib = new CharLib(gltf); lib.rigs = await loadRigs('/');
const whoList = (q.get('who') || 'keem').split(','); const anim = q.get('anim') || 'Idle_Loop'; const gun = q.get('gun'); const rot = +q.get('rot') || 0; const sp = +q.get('sp') || 1.1;
const floor = new THREE.Mesh(new THREE.CircleGeometry(9, 40), new THREE.MeshStandardMaterial({ color: '#2c2f34', roughness: 1 })); floor.rotation.x = -Math.PI / 2; sc.add(floor);
let c = null; const all = [];
for (let i = 0; i < whoList.length; i++) { const who = whoList[i]; const L = who === 'raider' ? raiderLook(4) : who === 'zed' ? randomLook(21, true) : CAST[who]; const ch = new Char(lib, L, who === 'nia' ? .62 : who === 'keem' ? .9 : .98);
  sc.add(ch.root); ch.root.position.x = (i - (whoList.length - 1) / 2) * sp; ch.root.rotation.y = rot; const an = who === 'zed' ? 'Walk_Loop' : who === 'raider' ? (q.get('ranim') || 'Pistol_Aim_Neutral') : anim; ch.play(an); ch.mixer.update(+q.get('t') || 0.5);
  const g = who === 'raider' ? 'rifle' : who === 'zed' ? null : gun; if (g) { const h = new THREE.Group(); h.add(weaponMesh(g)); h.rotation.set(Math.PI / 2, 0, 0); h.position.set(0, .08, .02); ch.attach('DEF-hand.R', h); }
  if (who === 'nia') { await new Promise(r => setTimeout(r, 600)); const rb = makeRabbit(); ch.attach('DEF-spine.003', rb); rb.position.set(0.1, 0.1, -0.02); }
  all.push(ch); if (i === 0) c = ch; }
all.forEach(x => x.mixer.update(0)); sc.updateMatrixWorld(true);
const cam = new THREE.PerspectiveCamera(+q.get('fov') || 30, W / H, .05, 50); const mode = q.get('cam') || 'full'; const hp = new THREE.Vector3(); c.root.updateMatrixWorld(true);
const bn = { face: 'DEF-head', hands: 'DEF-hand.' + (q.get('side') || 'R'), full: 'DEF-spine.002' }[mode]; c.worldOf(bn, hp); if (whoList.length > 1) hp.x = 0; const d = +q.get('d') || ({ face: .9, hands: .55, full: 4 }[mode]);
const az = (+q.get('az') || 0) * Math.PI / 180; cam.position.set(hp.x + Math.sin(az) * d, hp.y + (+q.get('dy') || .05), hp.z + Math.cos(az) * d); cam.lookAt(hp.x, hp.y + (mode === 'full' ? -.1 : 0) + (+q.get('ly') || 0), hp.z);
all.forEach(x => x.skin && x.syncSkin && x.syncSkin()); r.render(sc, cam); window.__c = c; window.__ready = true;
