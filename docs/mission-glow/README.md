# Mission glow (feat/mission-glow)
Central system in `src/game/glow.js`, called once per frame from `game.js` (before render). No per-chapter edits needed.
Reads: `g.pickups` (story/key/keycard/fuse = objective; pages/cash/ammo = soft loot, nearest 8; kill drops ignored), `g.stepData.uses` (search/use/talk spots), `g.wpTarget`, the truck when `canDrive`.
Visuals: emissive pulse on the item, additive halo, light beam (objective), sparkles, constant-size marker through walls (key / keycard / note / star / talk / use / drive / dest icons), edge arrow when an objective is off-screen. Fades near the item so first person stays clear. Gameplay untouched.
Gone as soon as the item is taken / the use spot is done (it reads live state). Tools: `tools/proof_glow.mjs`, `tools/audit_glow.mjs`.
NOTE: the story has no real "key" item; `key`/`keycard` pickup kinds were added to the engine and the key shots (ch1_*) use a test pickup injected by the proof tool. The ch9 keycards are real (search spots now show a spinning keycard).
- Collect test (ch12 fuses, step 56): 3 objective markers -> 2 -> after the last fuse it switches to the breaker panel spot. Smoke: tools/smoke_chapters.mjs 55-64 OK, 0 errors. Audit shows steps 0-57 (list lags where a cutscene was active; boss steps have no item to find).
