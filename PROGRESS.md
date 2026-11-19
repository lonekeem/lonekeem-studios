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
