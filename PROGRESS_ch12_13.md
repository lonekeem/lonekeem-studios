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

## Voices (wired)
All 114 ch12/ch13 lines are voiced: public/sfx/v/<hash>.mp3 (hash = game vhash of who|text), mono 44.1k mp3, loudness-matched to -18 LUFS (radio -20, +-1 LU).
- Keem / Dad (marcus) / Nia: their established ElevenLabs voice IDs on fal-ai/elevenlabs/tts/multilingual-v2 with the same settings as the earlier lines (same voices carry over).
- Mom (dana), Dr. Vance, Doreen, Night Orderly: the approved samples' voices (eleven-v3 Matilda for Mom/Doreen/Orderly; Vance on multilingual-v2).
- Reyes: multilingual-v2 (same voice as ch10). Radio line: local Kokoro (bm_lewis, radio filter, same recipe as the older radio lines).
- 9 lines reuse the approved samples. 2 lines were blocked by the voice filter ("shotgun", "shooting") and reworded in-game: "Then close it again with that big gun of yours, Dad." and "I'm aiming at the zombies, Nia. Not the rabbit."
- Raw takes: /workspace/atq-voice/ch12_13_raw/. Samples: /workspace/atq-voice/ch12_13_samples/.

## Fixes this round
- ch12_acting.js: the pose blend never reached full strength in real frames (slerp bug), so arm poses did nothing at normal dt; fixed. Hug/reach/hold/cradle all play now.
- Ceilings: single-sided, down-facing (invisible from above).
- Finale: Biscuit hops to the open floor, Keem lifts and cradles him at chest height, facing away from the counter.

## Known flaws
Dad's seated pose and the Nia/Mom hug are approximate; gray eyes are flat discs; Orderly uses a worker rig with a hard hat; Doreen's apron is a simple panel; set dressing is sparse.

## Review round 3 (proofs c12v4 / c13v4 / c13v5)
- Reunion hug: Mom now drops onto one knee (procedural kneel in ch12_acting.js: `act(c,pose,{kneel:'R'})` aims thigh/shin/foot bones and drops the root by one shin length), both arms close round Nia's back (`ARM.embrace`), Nia stands on her right side with both arms round her neck (`ARM.neckhug`), heads together. Staged by `embrace()` in ch12.js. Any later `act(mom, ...)` clears the kneel.
- Biscuit carry: Keem holds him like a baby (`ARM.baby`, 4-direction pose: left forearm under the bottom, right hand round onto the back); Biscuit snuggles in facing Keem, tilted onto his chest.
- Doreen: hairnet is a skinned net + tight skull cap on the head bone; apron is a skinned overlay cut from the body mesh with a waist tie and shoulder straps; ladle is normal size and gripped in the right hand.
- Ceilings: every ch12/13 room gets a single-sided down-facing dark tile ceiling with crown trim (`K.ceil`, `ceilMat`) so it no longer reads as fog.
- Floors: tile checker toned right down (near-uniform colours).
