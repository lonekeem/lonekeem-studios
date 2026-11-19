// Proof harness for the props modules (gas station, cars, loot, zombies) on top of the town map. Drive it from playwright via window.H.
import * as THREE from 'three';
import { buildTown, SPAWN } from '../../src/mp/town/map.js';
import { addGas, pumpNear, refuelCar, fillCan, pourCan } from '../../src/mp/town/gas.js';
import { addLoot, updateLoot, Bag } from '../../src/mp/town/loot.js';
import { loadCarModels, createCars, CAP } from '../../src/mp/town/cars.js';
import { loadZombieModels, createZombies } from '../../src/mp/town/zombies.js';
const q = new URLSearchParams(location.search); const W0 = +q.get('w') || 1000, H0 = +q.get('h') || 700;
const r = new THREE.WebGLRenderer({ antialias: true }); r.setSize(W0, H0); document.body.append(r.domElement); r.shadowMap.enabled = true; r.toneMapping = THREE.ACESFilmicToneMapping;
const s = new THREE.Scene(); s.background = new THREE.Color('#9fb2bd'); s.fog = new THREE.Fog('#9fb2bd', 60, 160); s.add(new THREE.HemisphereLight('#dfe8f0', '#5f6a4c', 1.5)); const sun = new THREE.DirectionalLight('#fff0d8', 2.4); sun.position.set(40, 80, 30); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); const sc = sun.shadow.camera; sc.left = sc.bottom = -45; sc.right = sc.top = 45; sc.far = 220; s.add(sun, sun.target);
const W = buildTown(s, { hooks: [addGas, addLoot] }); W.closed.update(0, 0);
const cam = new THREE.PerspectiveCamera(55, W0 / H0, .1, 500);
const players = [{ x: SPAWN.x, z: SPAWN.z, ry: 0, drv: false }];
const H = window.H = { THREE, W, s, cam, r, players, Bag, pumpNear, refuelCar, fillCan, pourCan, CAP, updateLoot, SPAWN };
(async () => {
  const [cm, zm] = await Promise.all([loadCarModels(), loadZombieModels('/')]);
  H.cars = createCars({ scene: s, W, models: cm }); H.zm = zm;
  H.mkZ = async (o) => (H.Z = await createZombies(Object.assign({ scene: s, W, camera: cam, getPlayers: () => players, onHitPlayer: (d, from) => { H.hits = (H.hits || 0) + 1; }, models: zm, bodies: [] }, o)));
  H.step = (n, dt = 1 / 30, ctl = {}) => { for (let i = 0; i < n; i++) { H.cars.update(dt, ctl); H.Z && H.Z.update(dt); updateLoot(W, dt); if (players[0].car) { const c = players[0].car; players[0].x = c.x; players[0].z = c.z; } } };
  H.look = (x, y, z, lx, ly, lz) => { cam.position.set(x, y, z); cam.lookAt(lx, ly, lz); sun.position.set(lx + 40, 80, lz + 30); sun.target.position.set(lx, 0, lz); sun.target.updateMatrixWorld(); W.closed.update(lx, lz); r.render(s, cam); };
  H.ready = true; document.title = 'ready';
})();
