# feat/town-npcs — living town events (draft PR, DO NOT merge/release; audio untouched)
Branched from feat/realism-anim-v2. All logic in `src/game/townlife.js`; game.js only: import, `townReset(this)` in clearActors, `townUpdate(this, dt)` once per frame. world.js only exposes `world.houses` / `world.cars` registries.

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
`docs/town-proof/*.jpg` (844x390 phone-size frames), tools: `tools/proof_town.mjs`, `tools/test_town.mjs`.

## Known flaws
- Bodies are cleared when the step reloads (clearActors) — they stay while you play the step.
- NPCs/zombies use simple whisker steering, no pathfinding: a parked car can briefly snag them.
- Zombies that lose their NPC (door shut / escaped) then go after the player.
- Caught animation is Hit_Chest + Death01 (no custom drag); gore worker can enhance via hooks.
- Only generic neighbourhood/town houses have doors; Keem's house door is unchanged.
