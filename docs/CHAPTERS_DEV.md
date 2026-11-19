# CHAPTERS_DEV.md — how to build chapters 12–16 in parallel without conflicts

Branch: `feat/chapters-base` (this plumbing). Each builder branches from it (`feat/ch12`, `feat/ch13`, …), opens a **draft PR**, never merges to main, never deploys. Design source: `docs/CHAPTERS_PLAN.md`.

## Golden rule: one file per chapter
| Chapter | You OWN (edit freely) | Voices / audio |
|---|---|---|
| 12 Sublevel B | `src/game/chapters/ch12.js` | — (voice helper handles audio) |
| 13 Biscuit Goes Rogue | `src/game/chapters/ch13.js` | |
| 14 Every Bite | `src/game/chapters/ch14.js` | |
| 15 PFC Danny Is So Sorry | `src/game/chapters/ch15.js` | |
| 16 Last Light Out | `src/game/chapters/ch16.js` | |

Need more than one file (a trap system, a boss model, a rabbit AI)? **Create new files named after your chapter**, e.g. `src/game/chapters/ch13_rabbit.js`, `ch15_traps.js`, and import them from your `chNN.js`. Nobody else touches those.

**Do NOT edit** (shared; changes go through the integrator = whoever owns `feat/chapters-base`): `src/game/story.js`, `src/game/world.js`, `src/game/game.js`, `src/main.js`, `index.html`, `src/game/chapters/index.js`, `helpers.js`, `stub.js`, `core_meta.js`, and the other chapters' files.
If you really need a change in a shared file (a new hook in `game.js`, a new weapon in `data.js`, a gore tweak), put the **exact diff in your PR description** under "Shared changes requested" (keep it tiny) — or make the change in a separate commit titled `SHARED: …` so it can be cherry-picked into the base. Weapons/data: `src/game/data.js` is shared, so ask for new weapons the same way (name, stats, ch number).

The kit files (`src/game/chapters/kit/*.js`) are shared **read-mostly**. Chapter 12/13/14/15/16 builders may *extend* the piece their chapter uses (see below) in their own commits, but keep the function signature and the returned anchors (others use them). If you need a different layout, **copy the piece to `kit/chNN_<name>.js`** and edit your copy.

## What the plumbing does (so you don't have to)
* `src/game/chapters/index.js` registers every chapter module. A chapter module exports:
  * `meta` — `{ n, title, endQuote, stub?, nextTeaser? }` → chapter select, end card ("End of Chapter N · Title" + quote), footer, title "Continue" button. **Delete `stub: true` when real.** `nextTeaser` (last chapter only) = the "To be continued" text.
  * `speakers` — `{ danny: 'PFC Danny', dana: 'Mom' }` display names for the dialogue box. Only NEW speaker ids. `tools/extract_lines.mjs` also reads this list, so lines `['danny', '…']` get picked up for voicing automatically.
  * `steps` — array of story steps (same format as `story.js`; see Ch 2–11 for examples). They are inserted before the Survival step; step indices are computed at load, so **never hard-code a step number**: use ids — `goto(g, 'c12_er', 200)`, `clearThen(g, D, 'c12_boss', …)`.
  * `loot` — `[{id, kind, pos, at: 'c12_boss', …}]`. Use `at:` (a step id) instead of `minStep`. Comic pages: `pg(x, z, 'Captain Riverside #21: "…"', 'c12_stub1')` (helper exported from `helpers.js`). The "x/20" counter is now computed (total pages in the game).
  * `buildZone(ctx)` — your 3D set. Runs once inside a hidden `Group` that is visible only during your chapter (`step.ch`), at your own z band.
* `helpers.js` exports the story helpers used by every chapter (moved out of `story.js`): `fam` (Dad+Nia follow), `dadGun`, `dadTick`, `boss`, `raiders`, `follow`, `goto`, `afterBoss`, `clearThen`, `dist2`, `V`, `PI`, `rnd`, `$q`, `stepIndex(id)`.
* End of chapter: call `g.onComplete(N)` (same as chapters 1–11). main.js handles unlocking N+1, saving, end card. Last chapter gets the "To be continued" card. Nothing to edit.
* Survival mode keeps working (it is found by flag, not index).

## Your world band (don't build outside it)
Each chapter owns a 300 m strip, x −48…48, zones are hidden outside their chapter, boundary colliders are pre-built:

| Ch | z band | first stub spawn |
|---|---|---|
| 12 | −2900 … −3200 | −2938 |
| 13 | −3300 … −3600 | −3326 |
| 14 | −3700 … −4000 | −3766 |
| 15 | −4100 … −4400 | −4166 |
| 16 | −4500 … −4800 | −4576 |

Grass is automatically off in these bands (z < −2760), and the ground is a plain dark plane under your kit floors. There are **no ceilings** (the over-the-shoulder camera would clip). Interior atmosphere: use `lamp()` (flicker option) and `ctx.Z_pl` point lights sparingly (≤ 6 real lights per piece for phones). Set `mood:` per step, `g.audio.setMood(...)`.

## The `ctx` your `buildZone(ctx)` receives
`{ THREE, scene, Q, box(x0,x1,z0,z1) collider, wallBox(w,h,d,mat,x,y,z,solid=true), sign(lines,x,y,z,rotY,w,h,bg), road, Z_pl(x,y,z,color,intensity,range), Z_lamp, fire(x,y,z,scale), car(...), plankMat, swMat, groundMat, signTex, lights, walls, updaters(push (dt,t,cam)=>…), colliders }`.
`updaters` run every frame (even hidden), so make them cheap and guard with `if (!group.visible) return` if needed.

## The kit (reusable pieces, each in its own file; place with `{x, z}` = start, runs toward −z)
| File | Exports | Anchors you get back (selection) |
|---|---|---|
| `kit/common.js` | `mats, floor, prop, wallX, wallZ, room, lamp, slabDoor, table, crate, shelfUnit, bloodPool` | `slabDoor()` → `{mesh, setOpen(bool)}` (blocks movement/shots when closed) |
| `kit/basement.js` (Ch 12) | `buildBasement(ctx,{x,z,length})` | `start,end, morgue, boiler, generator, fuses[3], storage, cells[3]{door,center}, momCell, cellHall, exit`; flickering corridor lights |
| `kit/floors.js` (Ch 13) | `buildGiftShop, buildKidsWard, buildCafeteria` | each: `rect, rabbitSpots[], door.n/.s`; cafeteria also `tables[], kitchen, kettle, kettleTopY, bossSpot` |
| `kit/lab.js` (Ch 14) | `buildLab` | `benches[], analyzer, fridge, sealedLab{door}, elevator{door,pos}, alarmLamp` |
| `kit/market.js` (Ch 15) | `buildMarket, buildFreezer` | market: `stalls[], trapSlots[]{x,z,kind}, lobster, rooftopStairs`; freezer: `door, hideout` |
| `kit/roof.js` (Ch 16, also usable in 14) | `buildRoofHelipad` | `stairs, stairDoor, pad/helicopterSpot, vents[], floods[], edge` |

Chapter 12/13/14/15/16 builders: the kit is **placeholder-quality dressing** (boxes + a few lights) that proves the layout works. Improving the look of your chapter's pieces is part of your job; do it in your chapter's own copy if you change layout.

## Rules (same as the rest of the game)
Smooth cartoon, original characters/props only, no brand logos or real brand names, **clean language** (no `{explicit|clean}` pairs; the Strong-language setting doesn't change chapters 12–16), characters **visibly act out what they say** (use `Interact`, `Idle_Talking_Loop`, `PickUp_Table`, movement; there is no hug/wave/shrug clip — fake it and show close-up proof), visible gore is fine (use the gore helpers), v1.9.7 controls untouched, no voices (the voice helper renders audio from your lines).

## Workflow
1. `git fetch && git worktree add /workspace/atqchNN -b feat/chNN origin/feat/chapters-base`; `ln -s /workspace/atqg/node_modules node_modules` (not committed).
2. Commit + push often. Keep a `PROGRESS_chNN.md` (not `PROGRESS.md` — that file is shared).
3. Smoke test: `npx vite build && npx vite preview --port 43NN &` then `node tools/smoke_chapters.mjs 43NN <firstStep> <lastStep> <outDir>` (loads each step, screenshots the spawn view, jumps to the waypoint, checks chain/end card). Step indices: chapter 12 starts at **55**, then +2 per stub; real chapters change the counts (ids are stable, indices are not): in the browser console, `__atq.game.step`; with `?step=N&god` you can jump.
4. Proof screenshots at phone size (`tools/proof_lib.mjs`, `openGame(port, step)`). Check them up close before anyone sees them.
5. Draft PR into `feat/chapters-base` (not main). List: files touched, shared changes requested, lines needing voices (the voice helper runs `node tools/extract_lines.mjs`).

## Known limits
* Step indices shift when a chapter changes its step count; saves store the step index, so don't ship test saves. (Existing chapter 1–11 indices are unchanged: new steps sit after step 54.)
* `tools/t*.mjs` old test scripts use fixed step numbers for Ch 1–11 only; they still work.
* The market freezer, lab etc. have no enemies or logic yet; that is the builder's job.
