# feat/realism-anim-v2 — progress (draft PR #10, DO NOT merge/release; audio untouched)

Merged main v1.9.15 (voice update) at 8b4c180 — resolved game.js nextLine conflict by keeping main's voice call + `convoLine`/`ACT.cueLine`.

## Done (committed + pushed)
- Face-to-face conversations (convo.js), tighter two-shot camera
- Boarded/lit window artifact fixed (world.js trim, mullions, wall lift; roofs/line/fence opacity restored)
- Dad sleeve roll + bite overlay, held-out arm shot, smaller mitten hands (avatar.js)
- Smooth loading bar (main.js eased/creeping)
- Exact-object interaction: `src/game/useseq.js` (walk to object, face, reach, then fire). Proof: docs/realism-proof/use_*.jpg
- Measured arm axes (tools/arm_probe.mjs): upper arm X+=forward, Z+(L)/Z-(R)=out, Y=twist; forearm X+=bend. `arm()` helper + new poses in actions.js (UNVERIFIED visually: pointR/L, offerR, shrug, hugArms, coverEars, headHands, haltBoth, wheel, grabBoth, reachBoth, mouthR, aimBoth)
- Leg axes (tools/leg_probe.mjs): thigh X+=leg back, Z-(L)=out; shin X+=knee bend

## Next (in order)
1. Verify new poses visually (tools/proof_pose2.mjs), then add RULES for the 30 uncued lines (docs/realism-proof/ACTION_AUDIT.md)
2. Raider tactics module raidai.js: cover points from AABB colliders, crouch (Crouch_Idle_Loop), peek/strafe-while-aiming (procedural leg shuffle), flank, Pistol_Reload behind cover; proof tools/proof_raider.mjs
3. Real doors (hinged house doors; people/zombies open, pass, close)
4. No pop-in: spawn/despawn from off-screen / doorways / woods
5. Gore: feeding poses, pools/splatter, blood on zombie faces/hands
6. Persistent bite/wound marks on anyone hurt
7. Living-town NPC events (flee / eaten / escape)

## Notes / flaws
- Read tool caches images by path: write proof frames to fresh filenames.
- zBones gives raiders zombie arm posture too (check when doing raiders).
- First load on SwiftShader sits ~35 s on 15% (main thread blocked).

---
# feat/gore-wounds (draft PR, branched from feat/realism-anim-v2; DO NOT merge/release; audio untouched)
Done (src/game/gore.js + hooks in game.js):
- Lasting wound marks on the avatar skin shader (bite w/ tooth punctures + bruise, bullet hole, claw slashes, torn flesh, blood runs). `g.woundFrom(char, fromPos, 'melee'|'bullet'|'claw')` is called when the player is hurt, a zombie/raider is shot or cut, and when a zombie hits an NPC/Dad. Max 10 marks/char (oldest small one replaced). Dad's forearm sleeve bite (actions.js) is untouched.
- Zombie mouth/chin/chest blood + bloody hands that grow with every bite and persist (`bloodyMouth`, `setHandBlood`).
- Spreading glossy blood pools (victims grow while fed on; dead zombies leave a pool). Splatter decals pool raised 70 -> 180.
- Feeders really kneel (hips down, shins folded) and hunch over the victim; victims struggle/scream/reach, weaken, then lie limp with occasional death twitches; bites enlarge a torn belly wound.
- Bodies stay: dead zombies only culled after 90s AND >70 zombies in the scene.
Proof: docs/gore-proof/*.png (844x390, phone size). Tools: tools/proof_gore.mjs, tools/proof_wounds.mjs.
Flaws: victim is often partly hidden by feeders; feeding legs/feet clip slightly into ground; falling blood droplet particles still look like big red balls; player wounds are not saved across checkpoint reload; mannequin-only (no-rig) NPCs get no wound marks; prone/side victim poses not done (all supine).
