# feat/gore-wounds — progress (draft PR, DO NOT merge/release; audio untouched; based on main v1.9.15)

Done (src/game/gore.js + hooks in game.js):
- Lasting wound marks on the avatar skin shader (bite w/ tooth punctures + bruise, bullet hole, claw slashes, torn flesh, blood runs). `g.woundFrom(char, fromPos, 'melee'|'bullet'|'claw')` is called when the player is hurt, a zombie/raider is shot or cut, and when a zombie hits an NPC/Dad. Max 10 marks/char (oldest small one replaced). Dad's forearm sleeve bite (actions.js) is untouched.
- Zombie mouth/chin/chest blood + bloody hands that grow with every bite and persist (`bloodyMouth`, `setHandBlood`).
- Spreading glossy blood pools (victims grow while fed on; dead zombies leave a pool). Splatter decals pool raised 70 -> 180.
- Feeders really kneel (hips down, shins folded) and hunch over the victim; victims struggle/scream/reach, weaken, then lie limp with occasional death twitches; bites enlarge a torn belly wound.
- Bodies stay: dead zombies only culled after 90s AND >70 zombies in the scene.
Proof: docs/gore-proof/*.png (844x390, phone size). Tools: tools/proof_gore.mjs, tools/proof_wounds.mjs.
Flaws: victim is often partly hidden by feeders; feeding legs/feet clip slightly into ground; falling blood droplet particles still look like big red balls; player wounds are not saved across checkpoint reload; mannequin-only (no-rig) NPCs get no wound marks; prone/side victim poses not done (all supine).

## Round 2 fixes (base is now main v1.9.15, branch feat/gore-main)
- Base check: the gore does NOT depend on feat/realism-anim-v2 (only textual merge conflicts in game.js; resolved, builds clean on main). actions.js is untouched.
- Blood droplets are now small streaks stretched along flight, ~half as many, shorter-lived, more landing splats; flesh gibs are small chunks, not cubes.
- Victims lie broadside to the player's approach with feeders kneeling on the far side + flanks; supine / on-side / face-down poses; pool + feeders centred on the body.
- Feeders kneel with knees on the ground (hip drop measured from the visible skinned body; fixes floating/clipping and a negative-dt ramp bug).
- Proofs retaken (docs/gore-proof): gameplay camera, close-ups, low-camera feet, kill droplets, wounds on a clear road. Tools: tools/proof_feed_game.mjs, proof_gore.mjs (ROLL/ADJ/KILL env), proof_wounds.mjs.

---
# feat/town-npcs — living town events (draft PR, DO NOT merge/release; audio untouched)
Rebased onto main (v1.9.15) — no dependency on feat/realism-anim-v2 (checked: townlife.js imports only three, chars.js, looks.js; arm-reach and locomotion helpers are local). All logic in `src/game/townlife.js`; game.js only: import, `townReset(this)` in clearActors, `townUpdate(this, dt)` once per frame. world.js only exposes `world.houses` / `world.cars` registries.

## Done
- Real hinged house doors (all generic houses): swing out on the porch, dark doorway behind, frame, knob. Old static slab hidden.
- Townspeople events (scheduler: first ~10 s after a step starts in a town, then every 40-70 s, one at a time, never during cutscenes/dialogue/boss/driving/step 0):
  - `door`: runs from off-screen, looks back at the zombies, screams, opens a real door, goes in, door shuts.
  - `caught`: a runner zombie catches them, they are pulled down (Hit_Chest then Death01), eaten (existing eat state + victim struggle), then lie still: body stays for the rest of the step.
  - `away`: runs through and away (road or woods), removed only when off-screen.
- No pop-in: spawn points are tested against the camera frustum (and >30 m away); people leave only through a shut door or when off-screen.
- Gore hook: `g.town.hooks.grab/down/body` (see TOWN_HOOKS at the top of townlife.js) — defaults are tiny blood/decal calls.
- Perf: max 1 event (1 NPC + 2-3 zombies) at a time, no new lights, 1 spare NPC built ahead of time, <=14 ms worst sim step in test.

## Skipped on purpose (Keem: keep it simple)
Fence climbing, cars, helping others, stumbling variety.

## Proof
`docs/town-proof/1_door_flee_open_in_shut.jpg`, `2_caught_grab_ground_eaten.jpg`, `3_run_away.jpg` (+ single frames in `frames/`), 844x390, shoulder camera at gameplay height with wall/car clip protection, HUD markers/pickups hidden. Tools: `tools/proof_town2.mjs`, `tools/proof_sheet.py`, `tools/test_town.mjs` (proof_lib.mjs copied from the realism branch, dev tool only).

## Known flaws
- Bodies are cleared when the step reloads (clearActors) — they stay while you play the step.
- Whisker steering only, no pathfinding: a parked car can briefly snag NPCs/zombies.
- Zombies that lose their NPC (door shut / escaped) then go after the player.
- Caught animation is Hit_Chest + Death01 (no custom drag); the gore worker can enhance via g.town.hooks.
- Door-opening reach is a simple two-arm raise; only generic neighbourhood/town houses get doors (Keem's house door unchanged); tuned/tested in Riverside only.
- Proof camera is a close shoulder cam (not the stock follow cam) so the NPC is readable.

---

# Phase 2: small town map (branch `feat/mp-town`, worktree /workspace/atqtown, based on origin/feat/multiplayer @ 5fabe98)
Owner: this worker. The character polish lives on `feat/multiplayer-polish-wip` and is NOT part of this branch (Keem keeps the original four bases). **Do not edit** creator / body / avatar / face / dress / hair / shoes / garments / morph / look / catalog files.
All new code lives in `src/mp/town/`. `src/mp/entry.js` is re-pointed from the test lobby (`lobby.js`) to the town. `src/mp/net.js` gets a generic `evt` channel only.
Docs/SQL carried over from the polish branch (docs + draft SQL only): Google sign-in, admin role, admin-only Keem skin, multiplayer-only, admin picks Original Keem or a custom character (`docs/multiplayer.md`, `supabase/migrations/20261118_mp_phase1.sql`, draft, NOT applied).
Scope: one small town (~Kemy Pal Street size): 3 streets, ~10 enterable houses with hinged doors, store + gas station, KL cars (fuel gauge, break-in, loot), lootable gas/wood/supplies, endless zombies from the edges (no pop-in), persistent bodies. 844x390 landscape. No Supabase, no spend, no merge/deploy.
## Steps
- [x] rebased onto 5fabe98, admin docs + SQL cherry-picked
- [x] step 1: kit.js (grimy textures), loot.js (items/tables/bag), building.js (enterable houses/store/kiosk/shed with hinged doors, furniture, containers), map.js (colliders, nav, grid roads, 25 lots = 7 enterable + 18 instanced closed w/ LOD, gas canopy, forest). Proof: docs/mp-town-proof/step1_map_top.png
- [x] DECISION (Keem): houses have **no doors by default** (open doorways, door frames only). A `Door` is a shop / house-upgrade item (`DOOR_PRICE` $40 in `loot.js`); buying it installs a hinged door (closed, lockable/breakable) on that house's doorway (front first, then back/interior ones). Store, gas kiosk and sheds keep their doors. Cash (`cash` item) is found in containers. Door installs are synced to other players with an `evt`. Ownership persistence (accounts) comes with Supabase later; for now an installed door is just saved in the session/room.

## Team split (two helpers on the town)
* **Houses/streets/town assembly (this branch `feat/mp-town`)**: `kit.js` `building.js` `map.js` + `town.js` (game loop, HUD, input, doors, shop, loot UI, net).
* **Props helper (`feat/mp-town-props`, /workspace/atqtown2)**: `gas.js`, `cars.js`, `loot.js`, `zombies.js`. Start from the working drafts of `cars.js` and `loot.js` already on this branch (they are the contract); keep their exports.
### Layout contract (src/mp/town/map.js)
* Streets: east-west roads at z=-24 and z=24, north-south roads at x=-24 and x=24, half-width 4 (asphalt z/x +-4), sidewalks 2.2 m beyond. World bounds BOUNDS = x +-118, z +-88 (forest outside |x|>~96). Roads run into the fog at the bounds.
* GAS_LOT (exported from map.js): x 31..62, z -20..-1, road at z=-24, pumps at z about -13.5, kiosk about (46,-5.5). **Free: houses skip it.** `gas.js` exports `addGas(W)`; the town calls it via `buildTown(scene,{hooks:[addGas]})` before statics are merged. `W` has `B` (merging Builder: `B.bounds(mat,x0,x1,y0,y1,z0,z1,color)`), `M` mats, `col` (rect colliders: `col.add(x0,x1,z0,z1,tag,active)`), `root`, `containers[]`, `doors[]`, and `makeBuilding(W,{id,kind:'kiosk'|...})` from `building.js`. Remove the kiosk by owning it in gas.js (it is no longer in SPECIAL).
* Containers (`W.containers[]`: `{id, table, label, x, z, reach, looted, lid}`) use tables from `loot.js` (`TABLES`). Push your own into `W.containers` and they work in the UI (loot panel, `evt` sync by id).
* Spawn points: player SPAWN (map.js). CAR_SPAWNS and BODIES arrays live in map.js (props helper may edit those arrays). Zombie edge spawns: choose points on the world perimeter (|x|~BOUNDS.x-4 or |z|~BOUNDS.z-4, outside the 1 m nav grid blockers) that are outside the camera frustum or beyond fog far (105); nav: `W.nav.field(px,pz)` once per ~0.4 s then `W.nav.dir(x,z)` per zombie; `W.col.push(x,z,r)` for collision.
* Zombies module contract: `createZombies({scene, W, camera, getPlayers: () => [{x,z,ry,drv}], onHitPlayer(dmg), models})` returns `{update(dt), killNear(x,z,r,dmg)->n, runOver(car)->n, stats}`; bodies stay (cap 120 rendered by distance). Reuse story `Char`/`CharLib`/`loadRigs` (src/game/chars.js, avatar.js, zombie2 rig) as in game.js `spawnZ`.
- [x] step 2: town.js assembly (renderer, HUD, input, camera, interactions: doors/loot/cars/shop, net evt), ui.js, cars.js draft; entry.js now enters the town. Smoke proof docs/mp-town-proof/smoke_start.png (844x390)
- [x] step 3: tested in 844x390 headless: house doorway + shop door purchase + door open, interior (roof lifts), loot panel, car enter/drive/fuel gauge/out of fuel/refuel. Proofs docs/mp-town-proof/{house,loot,car}_*.png (headless software GL runs ~2 fps, so holds/timers are scaled in tests)

## Props helper (branch `feat/mp-town-props`, /workspace/atqtown2) — gas station, cars, loot spots, zombies
Files (all in `src/mp/town/`): `gas.js` (new), `cars.js` (draft kept + `createCars` manager), `loot.js` (tables kept + `addLoot`/`updateLoot`/outdoor tables), `zombies.js` (new). Also edited the `c7`/`c8` entries of `CAR_SPAWNS` in map.js (parked at the pumps). Proof harness: `tools/mp/props.html|js`, scripts `tools/mp/proof_*.mjs`, images in `docs/mp-props-proof/`.
- [x] **gas.js** `addGas(W)`: "KL Fuel" station on `GAS_LOT` — forecourt slab, canopy (green/yellow fascia), 2 islands x 2 pumps (`W.pumps[]` `{id,x,z,stock,max,reach}`), shop = kiosk building (door faces the pumps), pole sign + KL badge (original mark), `W.pumps[]` `{id,x,z,fuel,max}` (same `fuel` field town.js siphons), tyre stack, drums. Helpers: `pumpNear(W,x,z)`, `refuelCar(pump,car,dt,{pay})` (7 L/s, needs car stopped), `fillCan(pump,bag,{pay})`, `pourCan(bag,car)` (+5 L, returns empty can). `PRICE` = 0 (free fill-ups for now). **`gasActions(W,{me,bag,cars,toast})`** returns prompt entries in the town's gather() format (hold-to-refuel the car parked at / sitting at the pump) — NOT wired into town.js yet: add `L.push(...gasActions(W,{me,bag,cars,toast}))` in gather(), also inside the `if (me.drv)` branch.
- [x] **cars.js** `createCars({scene,W,models,onCrash})` -> `{cars, byId, nearest(x,z), canEnter(car), breakIn(car,bag), enter(car,'me'), exit(car)->{x,z}, update(dt,ctl), pushOut(x,z,r)}`. No hotwire: `enter` starts the engine at once if there is fuel; the engine restarts by itself after you refuel. Locked car (`lock:1`): `breakIn` needs a crowbar (`bag.hasPry()`), then it is open. Fuel: ~0.06 L/s at 12 m/s (55 L tank). `ctl = {gas -1..1, steer -1..1, brake}`. Sets `W.cars`, `W.carPush(x,z,r)` (zombies use it).
- [x] **loot.js** `addLoot(W)` (hook, before statics merge): 12 outdoor spots (`LOOT_SPOTS`, gas-can stacks, supply crates, dumpsters, duffel bags). Normal `W.containers` entries (`kind:'prop-*'`), tables `gascache/supply/dumpster/duffel`. `updateLoot(W,dt)` eases the little lids (call each frame; `container.looted` or `open>0` opens them).
- [x] **zombies.js** `await createZombies({scene,W,camera,getPlayers,onHitPlayer(dmg,from),bodies:BODIES,fogFar,onNoise})` (async, loads its own models; this is exactly how town.js already calls it) -> `{update(dt), killNear(x,z,r,dmg,dir), runOver(car), near(x,z,r), noise(x,z,r), list(), stats()->{alive,...}, spawnAt, zombies}`; map `BODIES` become persistent corpses (human / zombie). Tip: set `W.cars = cars` in town.js so zombies walk around parked cars. Story `Char`/`CharLib`/zombie2 rig + zombie looks, same clips. Wander the road graph -> notice (14 m, 7 m crouched; LOS) -> chase by nav flow field -> punch (11 dmg via `onHitPlayer(dmg,x,z,playerIdx)`, never while `drv`). Count kept up by edge spawns only when out of view; bodies stay (nearest 120 drawn) with blood pools.
### Wiring (town worker)
```js
import { addGas } from './gas.js'; import { addLoot, updateLoot } from './loot.js'; import { loadCarModels, createCars } from './cars.js'; import { loadZombieModels, createZombies } from './zombies.js';
const W = buildTown(scene, { hooks: [addGas, addLoot] });
const [cm, zm] = await Promise.all([loadCarModels(), loadZombieModels()]);
const cars = createCars({ scene, W, models: cm, onCrash: (car, speed) => {/* hurt driver? sfx */} });
const Z = createZombies({ scene, W, camera, getPlayers: () => [{ x, z, ry, drv, crouch }, ...remote], onHitPlayer: (dmg, zx, zz, idx) => hurt(dmg), models: zm });
// per frame: cars.update(dt, ctl); driven car -> Z.runOver(cars.byId[id]); melee -> Z.killNear(x,z,reach,dmg); Z.update(dt); updateLoot(W, dt);
// E near a car: cars.enter / breakIn / exit; E near a pump: refuelCar / fillCan; players[0] pos = car pos while driving.
```
Notes: zombies are simulated per client (no net sync yet); `getPlayers()[0]` must be the local player (nav flow field targets it). Audio hooks: `createZombies({onEvent})` fires `'notice'` and `'kill'`.
- [x] step 2: town.js assembly (renderer, HUD, input, camera, interactions: doors/loot/cars/shop, net evt), ui.js, cars.js draft; entry.js now enters the town. Smoke proof docs/mp-town-proof/smoke_start.png (844x390)
- [x] step 3: tested in 844x390 headless: house doorway + shop door purchase + door open, interior (roof lifts), loot panel, car enter/drive/fuel gauge/out of fuel/refuel. Proofs docs/mp-town-proof/{house,loot,car}_*.png (headless software GL runs ~2 fps, so holds/timers are scaled in tests)

## Integration status (town worker, final pass)
- [x] Merged `feat/mp-town-props` (637258e) and wired it in `town.js`: `addGas`+`addLoot` as build hooks, `gasActions` (on foot and while in the car), `createZombies` (bodies from `BODIES`, `onHitPlayer`, `onEvent` -> story-game AudioSys groan/squelch, door and swing sounds), `createCars` (sets `W.cars`/`W.carPush`), `updateLoot`. Free fuel at the pumps (`gas.PRICE = 0`).
- [x] Perf: zombie skinned meshes are frustum-culled, shadows only within 22 m, corpses hidden past 45 m. Still heavy in the worst spot (spawn street with bodies: ~750k tris headless before cull tuning; see flaws).
- [x] Kenney car tint made stronger (palette multiply); cars show red/green/blue/dark variants.
- [x] Docs: `docs/multiplayer.md` map line updated (25 houses -> 50 houses + 50 house items; doors are a shop item).
- Proofs (844x390): `docs/mp-town-proof/` zombie_*.png (notice, chase, melee kill, bodies stay), place_*.png (store, gas forecourt/kiosk, pump refuel, streets), sync_*.png + log (two clients: door install/open, loot, car), house_*.png (retaken), cars_colors.png.
- Measured: wiped all zombies -> 3 spawned back at road ends in 45 s (headless runs ~0.5x game speed); 9 edge spawns checked, 0 on-screen/inside fog (no pop-in).
- Still owed: 50 houses (grow `CFG`) + 50 house customization items; zombies are simulated per client (not synced); no sound for car engine/pumps.

## Round 3 (controls + perf hand-off)
- Controls/HUD: MP town now uses the story v1.9.7 DOM HUD (`#hud`, `#touch`, `#drive`) and the story `Input` class (reuses `game.input` if the story game is loaded, else a standalone Input on a shim). Extra round buttons Bag / Shop / Exit in `#hudr2` under the story top-right buttons. Mapping: stick, FIRE=hit, RUN, CRCH, JUMP, ROLL, hand=use, ⟳=alt action, swap=cycle melee, eye=first person, AIM=zoom, pause=MP pause panel. Test: `tools/mp/town_ctl.mjs`, `town_hud.mjs`.
- Perf hand-off (to feat/mp-town-perf): already in tree and NOT re-measured: `src/mp/town/lod.js` (decimated zombie/corpse LOD), chunked cheaper trees w/o shadows (map.js), container-lid and car distance gating, fewer bodies near spawn. Last measured before these: ~404 calls / 554k tris (probe), 391 / 755k (smoke). Probes: tools/mp/perf_probe*.mjs, tri_probe*.mjs.
- Camera collision is implemented in town.js (untested) – feat/mp-town-fix owns testing.

## Round 4: perf done on feat/mp-town (renderer.info incl. shadow pass, 844x390, headless)
Before (start street): 404 calls / 554k tris (probe), 391 / 755k (smoke).
After: start street 124 calls / 144k tris (`docs/mp-town-final/start_street.png`, `tools/mp/town_final2.mjs`); `tools/mp/perf_spots.mjs`: spawn 106, crossing 115, gas station 167 (worst), east end 68, west 113, north street 123 calls; 116k–160k tris everywhere.
What did it: decimated zombie/corpse LOD (lod.js), tree chunks w/o shadows, container-lid + prop-group distance gating (small props 30 m, buildings' detail 36 m), cars: blob shadow instead of 10 shadow-casting meshes, wheels/lights/emblems hidden beyond 30 m, cars culled beyond 62 m, zombies/bodies culled beyond 64/48 m, zombie target 14->12, fewer bodies near spawn.
Known: gas station ~167 calls (pumps/special buildings), avatar is 63k tris (not decimated), car shadows are blobs, merged-statics instancing of building detail not done.
Merged feat/mp-town-fix c43b28d (camera spring arm, double-sided pole sign). Store front sign/windows and human victim bodies still pending from that helper.
## Fix helper (branch `feat/mp-town-fix`, /workspace/atqtown3) — camera, signs, store front, bodies, run-over
Based on `feat/mp-town` a091c98. New files: `src/mp/town/camcol.js`, `src/mp/town/storefront.js`. Edited: `gas.js` (pole sign + one `addStorefront` call), `zombies.js` (body looks), `town.js` (one import + the camera-collision lines only). Proofs: `docs/mp-fix-proof/`, scripts: `tools/mpfix/` (`lib.mjs` has a `freecam` helper; run vite on :5230).
- [x] **Camera**: tested the a091c98 collision. Cars were two circles (gap between them and thin sides) and anything above 2.7 m was ignored, so the camera could end up in/over the middle of a truck or inside the tall canopy pillars/sign pole. Now `armSolve()` in camcollide: car = real oriented box (+ margin), tall thin props (pillars, poles) are tall, walls up to 3.2 m; if the arm is blocked it first TILTS UP over the car/low wall, then shortens. Own car still ignored. Proof `cam_before_endmid_off.png` vs `cam_after_endmid_off.png`, `cam_proof_truck_side.png`, `cam_proof_wall_kiosk.png`, `cam_proof_pillar.png`.
- [x] **KL FUEL pole sign**: was one DoubleSide plane (mirrored from behind). Now two single-sided faces back to back on a slab, text measured to fit (the old text clipped "GAS · SNACKS"). `sign_road_side.png`, `sign_lot_side.png`, `sign_both_sides_pair.png`.
- [x] **Store front**: lit "KL MART" sign band, lit windows (shelves, fridge, OPEN sign), light teal glass door with push bar, soft light spill. Unlit/emissive meshes only (no new scene lights). `store_front_close.png`, `store_front_wide.png`.
- [x] **Bodies**: pre-placed `k:'h'` bodies already used the genm/genf human rigs; made it explicit and deterministic (fixed seed per body, never zombie rig or skin, `victim` flag, less blood). `body_human_closeup.png`, `bodies_*_sheet.png`.
- [x] **Run-over**: car through 3 idle zombies on the main street: all 3 killed, thrown over the hood, bodies stay, car slowed a little and lost ~2 hp. `runover_after_*.png`. (An earlier run hit the parked SUV c2 in the lane, not a bug.)
- Known: with a wall right behind you, the camera comes in very close to the player (min 0.7 m).

## Round 5: solo + online
- Solo works from the live menu (title -> "Multiplayer (Beta)" -> creator -> town); verified against the production build served statically (`docs/mp-town-final/prod_build_start.png`).
- Online: Supabase restored (free plan), migrations applied, Realtime broadcast transport with solo fallback, 2 clients in separate browser contexts see each other (`docs/mp-town-final/online_A.png`, `tools/mp/town_online.mjs` with TWO=1). Setup/TODO for Keem: docs/mp-online-setup.md.
- Perf at the final merge: spawn ~100 calls/139k tris, gas station ~175 (KL MART added).

---

## v1.9.18 release (multiplayer live, guests only)
- Merged `feat/mp-town` into main (only conflict: PROGRESS.md, both sections kept; v1.9.17 first-person + v1.9.16 gore/town NPC code untouched). Bumped to 1.9.18 (versionCode 46).
- Google sign-in not configured: the pause panel shows "Guest · Google sign-in coming soon" (button only appears once the provider is enabled in Supabase). No Keem character option exists in the creator yet, so guests cannot pick it (admin-only picker still to do).
- Release: https://github.com/lonekeem/lonekeem-studios/releases/tag/v1.9.18-debug (debug APK + AAB, built locally with gradle assembleDebug bundleDebug like earlier releases). Pages deploy run 44484296210 succeeded.
- Live check (`tools/live_check.mjs`, headless Chrome on the live URL): story New Game starts, first-person has 0 visible player meshes, near 0.06; Title > Multiplayer (Beta) > creator > Save & enter > town; two guest sessions (GuestA/GuestB) see each other, positions sync. Frames in `docs/live-1918/`.
- Known issues: zombies are not synced between players; Google sign-in + saving characters/wallets/houses to accounts not done; "Original Keem" picker not done; store interior is dark brick; remote name tags float at hip height; favicon 404 in console; the shared room can hold stray sessions (a leftover client showed once as a 3rd player).
