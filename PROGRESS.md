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
2. (MOVED TO OTHER WORKER) raider cover/flank/strafe/reload — tools/proof_raider.mjs + tools/leg_probe.mjs are starter tools only
3. Real doors (hinged house doors; people/zombies open, pass, close)
4. No pop-in: spawn/despawn from off-screen / doorways / woods
5./6. (MOVED TO OTHER WORKER) gore, feeding poses, blood on faces/hands, lasting wounds on everyone
7. (MOVED TO OTHER WORKER) living-town NPC events

## Notes / flaws
- Read tool caches images by path: write proof frames to fresh filenames.
- zBones gives raiders zombie arm posture too (check when doing raiders).
- First load on SwiftShader sits ~35 s on 15% (main thread blocked).
