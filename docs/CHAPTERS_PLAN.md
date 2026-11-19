# After the Quiet — Chapters 12–16 plan (PLANNING ONLY, nothing built)

Branch `feat/chapters-plan`, based on `origin/main` (v1.9.16, a4396c3). Written 2026-11-19.
Rules this plan follows: smooth cartoon original characters, v1.9.7 controls untouched, clean language in all new lines (no `{explicit|clean}` pairs, which also keeps Fal's filter happy), no brand names, characters visibly act out what they say, visible gore is fine, nothing gets built or spent without Keem's okay.

---------------------------------------------------------------------------

## 1. Where the story ends right now

**It ends at the end of Chapter 11 · Swan Song** (`c11_end`, step 54, Mass General Hospital, Boston). The end screen reads "To be continued — Chapter 12 coming soon." (`src/main.js` caps everything at chapter 11.)

Chapter 11 recap: Keem, Dad and Nia go through the harbor tunnel, ram an ambulance to Mass General, clear the ER, and kill **Subject One** (Vance's "first volunteer", a firefighter) on the helipad. Last scene: Dr. Ada Vance says "You're as stubborn as she said you'd be." She reveals **Volunteer #2 is Dana Pell, Keem and Nia's mother**, "signed up the first week." Dad: "…Dana's alive?" Nia: "Mommy?" Vance: "Your mother is downstairs. Whether she's still your mother is a longer conversation." Keem: "…Take me to her. Now." Cut.

How we got here (all 11 chapters are in `src/game/story.js`, 55 steps; `STORY.md` is stale and only covers 1–6, so it should be updated when we build):
1. Riverside, Maine: the outbreak. Dad (Marcus) holds the bridge gate. 2. Haverford: the "safe zone" is overrun, the evac left early (sign signed "PFC Danny, I am so sorry"), Dad is bitten. 3. Route 1: Keem finds the bite. 4. Toll plaza: raiders (Tollmen) grab Dad and Nia, Keem kills Deacon. 5. Maine Mall: Reyes and Tuck join, antivirals, "Navy" cure-trial broadcast. 6. Fort Williams: Toll King dies ("The Captain… he doesn't cure them…"), Dad goes gray-eyed and says "run", one gunshot off-screen. 7–9. Dad survived (the Captain's men took him), truck run to Cape Marina, ferry, Peaks Island: Keem kills the "not actually Navy" Captain, finds Dad alive (subject eleven, "responding"). A radio asks "Peaks Island, this is Boston. Is the Pell specimen ready?" 10. Boston: Quarantine Row, Keem talks Dad down, swan-boat gag, Swan Knight, Vance calls: "He has maybe a day." 11. Tunnel, ambulance, ER, Subject One, Dana.

### Open story threads (what the new chapters can pick up)
1. **Dana (Mom)** is alive, "volunteer #2", and what state she is in is the cliffhanger. Mom has been mentioned all game ("Mom would end me for this. If she… yeah. Later.") but never explained.
2. **Dr. Vance:** ruthless but useful. "I could come down and help." / "I could. I won't." (Ch 11 ER) is a ready-made payoff. What does she really want?
3. **"Boston knows":** the Captain said "others like him", and a radio voice asked the Captain for the "Pell specimen". Someone above Vance and the Captain (the automated Quarantine Row watch, the Boston broadcast) is unresolved.
4. **Dad's clock:** "maybe a day", "responding", half-zombie, the Captain's serum.
5. **Reyes and Tuck vanish after Ch 9:** they are in the Ch 9 ending scene and absent from Ch 10–11 with no explanation (loose end, and a gift for a reunion gag).
6. **PFC Danny**, the evac pilot who left early, and the Ch 2 scoreboard apology. Nia: "Danny is a big dummy."
7. **Biscuit** the rabbit (Nia's hoodie) has been a joke the whole game and has never had a plot of his own.
8. **Captain Riverside comics:** 20 pages found in the game, titles are all in-universe puns (Lobster Men, Chowder of Doom, Food Court of the Dead). New chapters can add pages #21–25 and call back to them.
9. Smaller: Toll King's unfinished "he doesn't cure them… he…" (answer: he sells them), Ruth, Mr. Dube and Mr. Walt (Ch 1 neighbours).

### Existing cast and voices (ElevenLabs via Fal; IDs from `/workspace/atq-voice/v7/items.json`)
| Character | Voice | ID |
|---|---|---|
| Keem | Young Jamal | `6OzrBCQf8cjERkYgzSg8` |
| Dad / Marcus | Carlton C-Well | `riqnCDqBJCxuKuDEeenv` |
| Nia | Myriam | (ID in the voice-run files, not in the repo) |
| Reyes | Ashley | `vzb1D7zjti0h5u8StSra` |
| Tuck | Julius | `VlUmeC1Uzj3NnwiVR9K9` |
| Vance | Cecily | `NQMJRVvPew6HsaebYnZj` |
| Captain | Reginald | `QUOYMor9zfZEmffKPlfx` |
| Toll King | Villain | `TDTTIZEngvvWARkECefs` |
| Deacon | Drag Jackson | `SHiZvifpX6NOyojATxRy` |
| Sgt Okafor | Michael Anthony | `TZm7HjaUJvnddH9mIVOE` |
| Dube | Joseph | `oFoV1sxkPgfSMBqWZKyp` |
| Broadcasts / radio | Yusuf | `nJvj5shg2xu1GKGxqfkE` |
| Townspeople | Dan / Kelli LaShae | `1cuDPO8sIMatoOE4Z2Zv` / `Z5JpFCNFIz8Nhe4KEikq` |

Fal's filter blocked a few lines before (Nia 22/44/48, Dad 037/040/045/070), so new lines should be written clean from the start and any blocked line gets a reworded retry.

### What already exists that we can reuse
- **Step engine** (`story.js`): `enter/update`, `g.say([[who,text]…], cb)`, `g.npc(...)`, `fam()` (Dad+Nia follow), `dadGun` (Dad shoots), cutscene camera `g.cut`, `g.horde`, `raiders`, `boss()` (HP, scale, armor), hold-the-line waves (Ch 5/8/10), search-points `D.uses`, driving (`D.canDrive`, truck is reused as ambulance), searchlight stealth (Ch 10), fade `goto()`, `afterBoss`, loot and comic pages (`LOOT`, `pg()`).
- **World**: Boston strip x ±48, z −1990…−2700 (Mass General at z ≈ −2600…−2700). z < −2700 is free for new strips (each chapter is a hidden Group in `world.js`, shown only for that chapter).
- **Models and animations:** Quaternius rig with ~46 clips: Idle, Idle_Talking, Walk/Jog/Sprint, Crouch, Interact, PickUp, Push, Sitting, Dance, Fixing_Kneeling, Hit/Death, pistol/sword/punch. **No hug, wave, shrug, point or cower clip.** Where a beat needs one, we fake it with Interact / Idle_Talking plus movement, or a small procedural arm overlay (`townlife.js` already has a local arm-reach helper). Biscuit exists as a model (`EXTRA.biscuit`). 6 zombie bodies + raiders, gore system, town-NPC panic events.
- **Weapons** already unlock per chapter (`ch:` in `WEAPONS`); the last is the M32 launcher (Ch 11).
- **Audio:** Kokoro/ElevenLabs line pipeline keyed by a hash of `who|text` (`tools/extract_lines.mjs`). New speakers must be added to its regex.

### Shared code that every new chapter touches (do once, up front)
`src/main.js` has chapter 11 hard-coded in several places (`Math.min(11,…)`, `ST` step table, `E` end-card table, "Continue to Chapter"), `index.html` chapter-select buttons (`btnCh2..11`) and footer, `game.js` speaker-name table (`names`), `tools/extract_lines.mjs` speaker regex, "Comic pages x/20" (main.js, game.js), `STORY.md`. New steps must be inserted **before** the `survival` step (it is found by flag, not index, so that is safe). Doing this plumbing in one small PR first avoids merge fights.

---------------------------------------------------------------------------

## 2. The five new chapters (12–16)

Pacing: intense → funny → big twist → funny → intense finale. Each chapter is about 12–18 minutes of play, with a boss, a collectible comic page, and one small reward weapon.

### Chapter 12 · Sublevel B — INTENSE (emotional horror)
- **Location:** Mass General sub-basement: morgue, boiler room, a dark research wing (new strip at z ≈ −2700…−2850).
- **Plot:** Keem, Dad and Nia go down to find Mom. The hospital's power is failing, and the earlier volunteers (Subjects 3–10) are loose in the dark, kept in check only by Vance's lights and sound-locks. Mom is alive, awake, and holding on, but she is clearly changing: her eyes go gray when she's angry, she can smell people, and she's scared of herself. The reunion is warm and also frightening. It ends with alarms, and the lab speaker says "Vance, they're here" before the line cuts.
- **Gameplay beats:** (1) flashlight crawl through the morgue, the "volunteers" notice light and noise (reuse zombie AI with a light/sound aggro tweak, crouch to slip past, same idea as Ch 10's stealth); (2) restore power: find 3 fuel cans/fuses in boiler room, boiler room fight; (3) hold the corridor 45 s while Nia (small, fits through vents like her Ch 2/3/5/6 vent trips) opens Mom's cell door; (4) boss **Subject Two, "the Night Orderly"**, a huge zombie in scrubs with a floor buffer/mop cart that charges (reskin of an existing boss, dodge-roll pattern like Ch 3); (5) the reunion scene: Dad and Mom see each other, Mom takes Nia's face in her hands, Biscuit pokes out of the hoodie.
- **Characters:** Keem, Dad, Nia, Vance (voice over intercom), **Dana (Mom, new)**, volunteers, Subject Two.
- **New:** **Dana Pell** (new voice needed), Subject Two boss, hospital sub-basement kit.
- **Reward / page:** Stun baton (hospital security, short melee, light stun) — optional S. Captain Riverside #21 "Sublevel Zero".
- **Visible acting:** Mom reaches through the cell hatch, Nia puts her hand on the glass, Dad leans on the wall and slides down, Mom clutches her head when the "gray" hits and Keem holds her wrists. Hug is faked with Interact + the characters walking into each other.
- **Build size: M** (new interior and darker lighting, volunteer-sense tweak, new reskinned boss, Mom model/look).

### Chapter 13 · Biscuit Goes Rogue — FUNNY (slapstick chase)
- **Location:** Mass General upper floors: gift shop, children's ward (balloons, painted walls), cafeteria and kitchens.
- **Plot:** The family needs ten minutes to pack Mom's medicine for the road. In the chaos Biscuit jumps out of Nia's hoodie and bolts. Nia refuses to leave without him ("He's my emotional support… everything"), so Keem is sent to catch a rabbit through a hospital full of zombies. Nia guides him by radio ("He's by the vending machines! No, the OTHER vending machines!"). The chase ends in the cafeteria with the kitchen's boss, **Lunch Lady Doreen**, a giant zombie with a ladle and a soup-pot lid, while Biscuit calmly sits on the lid of the biggest soup kettle.
- **Gameplay beats:** (1) rabbit chase: Biscuit runs between waypoints, pauses and nibbles when Keem is far, bolts when a zombie or Keem rushes it; Keem has to clear the room (not rush) and approach slowly, crouching, with a carrot as bait (new pickup, a few lines of AI); (2) gift-shop slapstick: stacked balloons and a rolling gurney "delivery" take out a few zombies; (3) kid's-ward rooms as short mini-arenas; (4) cafeteria boss fight with spilled-soup slow zones; (5) Nia over the radio gives funny, accurate hints so it's never a dead end.
- **Characters:** Keem, Nia (radio and ending), Dad and Mom (brief, packing and arguing about the cooler), Reyes (reappears here with a joke about where she's been, see Ch 15 for Tuck), Doreen.
- **New:** **Lunch Lady Doreen** (boss; voice reuse of Kelli LaShae or one new voice), Biscuit chase AI.
- **Reward / page:** the Ladle (melee, big knockback, funny sound) — optional S. Captain Riverside #22 "Meatloaf Monday".
- **Visible acting:** Nia on the radio is shown in a small insert (she stands at the window pointing the way with Interact); when Keem says "got him!" he actually kneels and picks Biscuit up (PickUp_Table); Doreen swings the ladle when she says "Seconds?".
- **Build size: S–M** (reuses hospital kit from Ch 12, one simple AI, one reskinned boss).

### Chapter 14 · Every Bite — BIG UNEXPECTED TWIST
- **Location:** Vance's research floor (labs, blood bank, a sealed lab) and the hospital roof/helipad where it started.
- **Plot:** Vance finally runs the family's blood work, and the result stops everyone: **Keem is immune.** Every bite, claw and scratch he has taken tonight should have turned him. Mom confesses she has always known, because she is the source: she is the first person in the world who carried the virus without turning, and it passed to Keem. Vance's "first volunteer" experiment on Subject One failed because it tried to copy Mom without her actual immunity. Then the second twist: Vance is not handing anyone over. **The "Harbor Authority"** (the people above the Captain, who asked for the "Pell specimen") storm the lab to take Keem, and Vance, who said "I could. I won't," comes down and helps. She stays behind to burn the samples and buy the family time.
- **Gameplay beats:** (1) a short interactive "Every Bite" montage: the game shows a replay slideshow of this save's real hurt/bite moments ("Bitten: N times, Turned: 0"; the count is tracked from now on, and old saves just show the story's scripted bites); (2) the family's reaction scenes (Dad laughs like a kid, Nia: "So you're basically a cheat code?"); (3) lab breach: Authority troopers (reuse raiders with a new gray/white uniform and shields) storm in, fight room to room with Vance helping with a tranq-rifle (new, S); (4) boss **the Warden**, an armored trooper in a riot suit (reuses the Swan Knight's armor rule: only headshots, blades, fire or explosions get through); (5) Vance holds the door, the elevator carries the family down.
- **Characters:** Keem, Dad, Nia, Mom, Vance, Reyes (helping with the blood work), the Warden, **Authority troopers (new)**.
- **New:** Harbor Authority troopers (reskin), the Warden boss, "immune" bite counter, Vance fight with the tranq rifle.
- **Reward / page:** Tranq rifle (Vance's, one-shot stun, quiet) — optional S. Captain Riverside #23 "The Boy Who Wouldn't Turn".
- **Visible acting:** Vance sets the blood vial in the analyzer and steps back with a hand over her mouth; Mom presses her sleeve to Keem's arm; when Vance says "I'm coming down" she actually walks out the lab door and takes the pistol off the table; Dad slaps his knee and laughs while he says it.
- **Build size: M** (lab interior set from the shared hospital kit, one montage UI screen, one boss reskin, one ally weapon).

### Chapter 15 · PFC Danny Is So Sorry — FUNNY (booby-trap comedy)
- **Location:** The Harborside Market food hall on the waterfront (a made-up market: fish stalls, cheese stalls, a giant fiberglass lobster out front), with its roof used as a landing pad.
- **Plot:** The only way out of Boston is a helicopter, and the only pilot Keem knows of is PFC Danny, the guy who left Haverford early. They find him hiding in the market's walk-in freezer, wearing a lobster mascot costume, having rigged the whole building with home-made zombie traps and written 40 apology letters ("Dear Haverford, I'm so sorry"). **Tuck** is there too (the searchlights separated him from the group at Quarantine Row), so the two of them bicker like an old married couple. The booby traps are very good against zombies and very bad for Keem, and the mascot problem comes from a second zombie in a lobster costume.
- **Gameplay beats:** (1) navigate Danny's trap-filled market: pressure plates, tripwires, swinging fish crates, rubber-chicken "alarms" that Keem can trigger on purpose to funnel zombies; (2) a short "trap defence" where Danny and Tuck loudly narrate and Keem triggers traps at the right moment to clear a horde (reuses the hold-the-line waves, adds 4–5 trigger objects); (3) a fetch: three helicopter parts/keys (like the Ch 2 fuses and Ch 5 antivirals); (4) boss **Larry the Lobster**, a giant zombie in a mascot costume, claws swing for the head, hit its soft spot after it charges and gets stuck in a stall; (5) the helicopter is on the roof, but it needs gas.
- **Characters:** Keem, Nia, Dad, Mom, Tuck (back), PFC Danny (new), Reyes optional.
- **New:** **PFC Danny** (new voice needed), Larry the Lobster boss, trap system.
- **Reward / page:** Fish cannon? No: keep it simple, a Flare Gun (fire, S) — optional. Captain Riverside #24 "Lobster Men Return" (callback to page #1).
- **Visible acting:** Danny cringes and covers his head in the freezer, then points at the cheese stall to explain traps (Idle_Talking + arm overlay); Tuck pushes the cart; when Danny says "Don't step there!" a plate clicks and a crate swings on screen.
- **Build size: M** (trap triggers are the one new system; the mascot boss is a reskin; location is mostly set dressing).

### Chapter 16 · Last Light Out — INTENSE (finale with a cliffhanger)
- **Location:** Mass General roof/helipad and the Boston skyline (air segment), landing at a new coast strip.
- **Plot:** The family fights through the hospital's top floors with the Authority closing in from every side. Danny gets the helicopter running; Vance, seen one last time on the roof, gives Keem the tranq-rifle and the last sample of Mom's blood, then hands Nia a drawing. The helicopter takes off under fire. Final scene: Danny's radio picks up a broadcast from **Riverside, Maine — Keem's house, where the story started**. It's Mr. Dube's voice (the Joseph voice from Chapter 1), alive. "Keem? Is that you? I'm in the basement. It's… still quiet here." Dad's gray-eyed moment passes; Mom holds his hand. Cut to "To be continued — Chapter 17".
- **Gameplay beats:** (1) top-floor fight to the roof with Dad and Mom both fighting (Mom is faster and "smells" enemies before they show up: a pink out-of-sight ping like Nia's callouts); (2) **hold the helipad 60 s** while the helicopter spins up (reuse hold-the-line waves) with Authority troopers and volunteers from both sides; (3) boss **Commander Harlow**, the Authority's commander with a riot shield and a flare-resistant suit, who is rescued from or killed by one of his own volunteers if the player waits too long (a mini-surprise, no choice needed); (4) a scripted flight cutscene (camera on the skyline, tracer fire, Danny screaming and flying straight). Optional upgrade: door-gunner on-rails section (L).
- **Characters:** Keem, Dad, Nia, Mom, Vance, Danny, Tuck, Reyes, Commander Harlow, Dube (voice only, end).
- **New:** **Commander Harlow** (new voice), helicopter model + flight scene.
- **Reward / page:** Captain Riverside #25 "To Be Continued…". No new weapon.
- **Visible acting:** Danny pulls levers and flips switches while narrating the pre-flight check; Mom stands in front of Nia with her arms out; Vance pushes the sample case into Keem's hands.
- **Build size: M** (L if we add the door-gunner flight; the helicopter itself is the biggest new asset).

---------------------------------------------------------------------------

## 3. Honest build-time estimate (5 chapters, several helpers working in parallel)

Assumptions: one helper per chapter, one more for shared plumbing and the shared hospital kit, one for voices, one for QA and proofs. Everything is in draft PRs, nothing merges without Keem. New helpers follow the same rules as before (commit and push often, PROGRESS.md, proofs checked up close).

| Piece | Helper-hours | Notes |
|---|---|---|
| Plumbing (chapter 12–16 unlock, end cards, chapter select, speaker names, STORY.md) | 1 | do first, avoids conflicts |
| Shared hospital kit (sub-basement, upper floors, lab, roof) | 3 | Ch 12/13/14 depend on it, so it goes first |
| Ch 12 Sublevel B | 3.5 | M |
| Ch 13 Biscuit Goes Rogue | 2.5 | S–M |
| Ch 14 Every Bite | 3.5 | M |
| Ch 15 PFC Danny | 3.5 | M |
| Ch 16 Last Light Out | 4.5 (6+ with door-gunner) | M, L if on-rails |
| Voices | 2–3 | see below |
| Integration, phone-performance pass, proofs, bug fixing | 2–3 | after builds land |

**Overall: about 8 hours of real time for all five playable and checked (range 6–10 hours).** The two most likely delays are merge conflicts in `story.js`/`world.js` and the finale's helicopter. First playable chapter (13, if the hospital kit goes first) in about 3–4 hours, then 12, 14, 15, and the finale last. That assumes the weekly usage holds out: five or more parallel helpers burn through it fast and the multiplayer work is also running, so check usage before starting.

### Voice lines (ElevenLabs via Fal)
- **Volume:** about 35 story lines per chapter (about 175) plus about 30 new barks (the rabbit chase, trap narration, Mom/Danny/Doreen one-liners) so roughly **200 new lines**.
- **Existing voices (no new spend decision needed beyond credits):** Keem, Dad, Nia, Vance, Reyes, Tuck, Captain (radio only), Dube (one end line), Broadcasts/radio.
- **New voices to pick** (Keem should okay each sample before we spend on all lines): **Dana (Mom)**, **PFC Danny** (young, nervous), **Lunch Lady Doreen** (or reuse Kelli LaShae), **Commander Harlow / the Warden** (deep, calm), plus procedural growls for the volunteers.
- **Time:** about 2–3 hours including a first sample round for new voices, loudness-matching to the existing −18 LUFS lines (same step as v1.9.14), and re-wording lines the filter blocks (some will be blocked; the new script is written clean, so fewer than before). Lines can't start until the scripts are locked, which should take about 45 minutes after Keem approves the pitches.
- **Cost:** not estimated here. Fal credits are spent per line, so we should ask Keem before running the full batch.

### Risks and decisions for Keem
1. **Mom's backstory is new** (she was a nurse at Mass General and was there the first week). The game never explains why she wasn't at home in Riverside, so this is a new fact, not a retcon of anything written.
2. **The immune twist** also reinterprets the earlier bites (Dad's got infected, Keem's didn't). That is consistent with how the game plays, and it gives Keem a reason to matter beyond being the boy with the bat.
3. **Reyes and Tuck** being missing in Ch 10–11 gets a quick explanation scene (they were separated by the Quarantine Row searchlights).
4. **Missing animations** (hug, wave, shrug, cower) are faked, so the emotional scenes need close-up proofs and may need a small procedural arm overlay (about 1 helper-hour if we want it good).
5. **Cliffhanger:** chapter 16 ends with "To be continued — Chapter 17" and Mr. Dube's call from Riverside. If Keem wants a closed ending instead, ch 16 swaps the Dube call for a "the end" scene.
6. **Language:** all new lines are written clean (no swearing), which differs from the existing chapters' `{explicit|clean}` pairs, so the "Strong language" setting won't change anything in chapters 12–16.

### Next step (waiting on Keem)
Keem okays or tweaks the 5 pitches → one pass writing the full scripts → build helpers start. Nothing is built, merged, or spent until then.
