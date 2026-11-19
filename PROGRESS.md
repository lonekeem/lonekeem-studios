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
# feat/raider-ai — CANCELLED by Keem (WIP only, not finished, no PR opened)
Branched from feat/realism-anim-v2 @ 4d40d80. Work stopped at the design/exploration stage.

## Committed
- `src/game/chars.js`: body-part masked clips. `CharLib.mask('Name@ub'|'Name@lb')` builds upper-body-only or lower-body-only copies of a clip; `Char.act` uses it; `Char.locomote` honours `char.locoPart = 'lb'` (lower-body-only walk/jog/sprint) and `endLoco` fades both sets. Unused so far by game code (no behaviour change for anyone).

## Not done (design notes for whoever resumes)
- New `src/game/raidai.js` replacing `raiderAI` in game.js: cover from AABB colliders (cars = low cover, stand-up peek; walls = tall, side peek), route around cover via a ring of points, crouch (Crouch_Idle_Loop@lb), peek/shoot, strafe/backpedal by facing legs along travel and twisting spine.001-.003/head to aim, flank in pairs by angle separation, reload (Pistol_Reload@ub) behind cover, retreat at hp<40%, never idle in the open.
- `zBones` still gives raiders the zombie arm posture (needs `&& !z.raider`).
- Existing `raiderAI` ignores `z.stun`; hit pushback `z.vel` isn't applied to raiders.
- Proof: `tools/proof_raider.mjs` is poor (dialog overlay, far camera). Needs HUD hidden and a close camera. Collider list near start (x -50..50, z -40..80) has cars at (-4.2,28), (4.4,12), (8.5,33) etc.
- No proof frames, no draft PR.
