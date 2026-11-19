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
