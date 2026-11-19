# PROGRESS — Chapters 12–13 (branch feat/chapters-12-13)

Built on feat/chapters-base. Chapters 14–16 are left unregistered (imports commented in chapters/index.js) so the game ends with "To be continued" after ch13.

## Playable
- ch12 (steps 55–59): c12_stairs, c12_boiler, c12_hold, c12_boss (Night Orderly), c12_mom (reunion cutscene).
- ch13 (steps 60–64): c13_pack, c13_gift, c13_ward, c13_cafe (Doreen), c13_end (finale).

## Files (chapter-owned)
- ch12.js, ch12_hospital.js (own hospital kit: Sublevel B + upper floors; richer than kit/basement/floors), ch12_acting.js (procedural hug/reach/clutch overlay), ch13.js, ch13_rabbit.js (Biscuit AI), tools/ch_lib.mjs + tools/ch_repl.mjs (proof harness).

## SHARED commits (reviewed separately)
- game.js: setLight(), step light modes, slowMul, idle det/hear/still, pickup mk hook.
- world.js: flags.indoor (hides rain/sky). interiors.js: export Decor. looks.js: CAST dana. chapters/index.js: only ch12+ch13 registered.

## Voices
Samples only (nothing wired in): /workspace/atq-voice/ch12_13_samples/. Subtitles are used until Keem approves the full batch.

## Known flaws
Rooms have no ceilings; Dad's seated pose and the Nia/Mom hug are approximate; gray eyes are flat discs; Orderly uses a worker rig with a hard hat; set dressing is sparse.
