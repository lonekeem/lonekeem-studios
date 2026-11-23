# After the Quiet — v1.9.0 Story Mode
A free-roam third-person horror action shooter by **Lone Keem Studios** (Three.js + Vite + Capacitor).
You play **Keem**, a kid with a backpack, fighting out of **Riverside, Maine** on the night it falls.

**Rated MATURE 18+** — intense violence, strong blood and gore (dismemberment, zombies eating people), gunfire, frightening scenes, death of a parent. A *Gore* toggle in Settings turns blood/dismemberment off.

```
npm install
npm run dev            # local
npm run build          # dist/
npm run android:debug  # APK  (android/app/build/outputs/apk/debug/)
npm run android:release# AAB  (needs the private upload keystore, never committed)
```
Debug: `?step=0..6` jumps to a chapter, `&god` gives weapons and invulnerability.

**Controls** — Touch: left joystick, drag to look, FIRE/HIT, AIM, JUMP, ROLL, RUN, CRCH, reload, swap, grenade, use, first-person toggle.
Keyboard/mouse: WASD, mouse look (click to lock), LMB attack, RMB aim, Shift run, C crouch, Space jump, Ctrl roll, R reload, Q swap, G grenade, H heal, E/F use, V camera, Esc pause. Gamepad: standard mapping.

**Progression** (localStorage `atq3.save`): loot cash/ammo/meds/grenades/comic pages, XP and levels with perks, Armory (in-game cash only — **no real money, no IAP**) for guns, melee, upgrades (damage, magazine, reload, accuracy/scope) and supplies, inventory screen, checkpoints per chapter.

Quality presets Low/Med/High with auto-detect (High adds GTAO + bloom). See STORY.md and CREDITS.md.
The old cinematic movie version is preserved at tag `cinematic-final`.


## v1.9.0
- Nia partner: hands Keem ammo/meds when low (60s cooldown), spots nearby zombies (pink marker + af_heart callouts), and crawls through optional vents in Ch2, Ch3, Ch5, Ch6 for bonus supplies (never required, so no softlocks).
- Survival mode (main menu): endless waves on Haverford Main Street, current weapons/Armory/cash, wave counter, saved best wave.
- Continue button at the top of the menu; autosave at every checkpoint (with backup copy), survives restarts and updates.

## v1.8.3
- Nia restored to her pre-v1.6.1 little-sister scale (0.62); v1.6.1 had accidentally set her to 0.95.

## v1.8.2
- Restored the v1.7.1 wording and voice clips for Dad and the rest of the non-Keem cast; Keem keeps the realism rewrite.

## v1.8.1
- Landscape-first: Android sensorLandscape; web requests fullscreen + landscape lock on start; "Rotate your phone" overlay in portrait on mobile.

## v1.8.0
- Chapter 10 "Harbor Lights": searchlight stealth on Quarantine Row, swan-boat dock defense, boss THE SWAN KNIGHT (armored: aim for the head, use blades/fire/explosives).
- Chapter 11 "Swan Song": Ted Williams tunnel tanker blast, ambulance drive, Mass General ER waves, boss SUBJECT ONE. Ends "To be continued — Chapter 12 coming soon".
- New weapons: longsword (dismemberment + decapitation), katana upgraded to the same slice system, crossbow, flamethrower (burn DoT), grenade launcher, axe/tomahawk via shop.
- Pooled/capped gibs, pooled explosion light (no runtime shader recompiles), gib shadows off.
- Dialogue realism pass (Keem first, then the cast); regenerated Kokoro clips.

## v1.7.1
- Character customizer (title screen + Armory): 20+ outfits incl. original "The Boss", hair, faces, skin, backpacks; saved to `atq3.look`.
- Drivable player truck (Kenney Car Kit, CC0) with on-screen drive controls.
- Strong language with a Settings toggle (on / bleep / clean); voice lines regenerated (Kokoro stock voices).
- Heavier gore: bigger sprays, multi-limb dismemberment, gorier finishers.
- Feeding scenes: kneeling eaters with head dips and tearing, struggling victims, bite-synced spurts, growing pools, chew/tear SFX, eaters look up at Keem.

### v1.9.27
- Feeding victims (Mr. Walt, Mr. Dube, and people pulled down in town) now lie flat on their backs on the street, with arms and legs relaxed and on the ground. They no longer arch like a bridge, tumble through the asphalt, or leave a limb buried. The zombies feeding on them kneel and hunch forward over the body instead of standing stiff or bending backward.
- Trees stay out of buildings, the road, the spawn and objective areas, and foliage fades when it would block the camera.
- The opening cutscene "The Night Before" now plays automatically the first time you open the game, after the content warning and studio ident and before the title menu (still skippable). After that the game opens straight to the menu. New Game no longer replays it. A Watch Intro button on the title menu plays it again and returns to the menu.
- Keem's legs now move from the first step in every direction, including a light stick push or when sliding along a wall. Dad and Nia no longer glide when they follow you. Blood splats on walls fade at the edges so they no longer look like a solid red box.

### v1.9.26
- New opening cutscene "The Night Before" (about 65 s, plays on New Game, skippable: Skip button, tap twice, or Esc/Enter/Space). Filmed in-engine with the real Riverside map and the story models for Keem, Dad, Nia (with Biscuit) and the zombies. Keem, Dad and Nia talk in their in-game ElevenLabs voices, with an ElevenLabs narrator, original score, sound effects and subtitles. It hands straight off into Chapter 1.
- Zombies now each get their own ElevenLabs voice (idle groans, alerts, attack snarls, hurt and death sounds, feeding), matched to the zombie's gender and body type: men, women, teens, elders, big brutes, gurglers and bosses sound different, with several takes each so they do not repeat.
- Characters now face each other during conversations: the speaker turns to whoever they are talking to, listeners turn toward the speaker, and Keem stands in a normal idle pose instead of freezing mid-step. The opening cutscene keeps its own staging.

### v1.9.25
- Opening/feeding victim screams remade with ElevenLabs Sound Effects v3 so the people being eaten no longer sound like a synth. The last 10 spoken lines that were still on the old Kokoro voice (4 Dad lines, 3 Nia lines, plus Coach Brickman, Ronnie and Mall Santa) remade with ElevenLabs eleven_v3, using the same character voices as the rest of the game.

### v1.9.24
- New skippable Lone Keem Studios intro: a full-screen animated title card with an original ElevenLabs cinematic ident and a short deep voiceover. The portrait Dream Jar video ident was removed from the game.

### v1.9.23
- Lone Keem Studios video intro (Dream Jar ident) with original sting, looping menu theme and loading music, a full loading screen with real control tips, and a new store cover on the title screen, Android splash and social image.

### v1.9.22
- Multiplayer: new hair for the female and male bases (soft natural hair, no helmet look), respawn fixed (shoot and get hurt again after dying, death countdown screen, short spawn protection), and zombies in the multiplayer town now use all 7 story zombie types with heads.

### v1.9.21
- Mission glow: keys, keycards, fuses, notes and every item/spot you must find or use in chapters 1–13 now pulse and get a floating marker (visible through walls, fades up close), a light beam, sparkles and an edge arrow when off-screen. Only the current objective is highlighted; it turns off once collected/used. Gameplay unchanged.

### v1.9.20
- Multiplayer upgrade: new Bitmoji-style characters (full 360 creator spin), story controls/moves/driving (working reverse), story sounds (not Keem's voice), all story guns + grenades with story-style explosions, bat/pan in hand, hit flinch, iPhone audio unlock, Google sign-in in the multiplayer menu (admin unlocks Play as Keem), store moved off the road, minimap.

### v1.9.19
- Chapters 12 (Sublevel B) and 13 (Biscuit Goes Rogue) go live: fully voiced (114 new lines), the Mom/Nia reunion hug, Doreen the lunch lady boss, the Biscuit chase through the children's ward and cafeteria, and Chapter 14 (Every Bite) continues the story after the cafeteria alarm, with a new research-lab set, Harbor Authority troopers, and a new boss. Chapters 15-16 stay hidden. Multiplayer (Beta), first-person, gore and town NPCs unchanged.

### v1.9.18
- Multiplayer (Beta) goes live: Title > Multiplayer (Beta) > creator > Quiet Falls free-roam town (houses without doors until you buy one, gas station, KL cars with fuel, loot, roaming zombies, shop + bag). Guests play online now via Realtime rooms (falls back to solo); Google sign-in shows "coming soon" until it is set up. The story game is unchanged.

### v1.9.17
- First-person fix: your own body, head, hair and held weapon no longer block the view; camera sits at eye height with a 0.06 near plane; the gun pulls back near walls and the flashlight comes from the eye. Controls and voices unchanged.

### v1.9.16
- Gore and wounds: bite, bullet, claw and torn-flesh marks stay on anyone who gets hurt (player, Dad, NPCs, raiders, zombies); zombie mouths, chins and hands get bloodier with every bite and stay that way; spreading glossy blood pools; feeders really kneel with their knees on the ground, victims struggle, reach, then go limp with the odd twitch (supine, on their side or face down); blood droplets are small streaks and splats; bodies stay.
- Living town: townspeople panic and run from zombies, some make it into a house through a real hinged door and shut it, some get caught, pulled down and eaten (with the new gore), some get away. They spawn off-screen so nobody pops in, and bodies stay.
- Controls (v1.9.7) and voices (v1.9.15) unchanged.

### v1.9.15
- Voices: Dad's 86 lines re-voiced with ElevenLabs "Carlton C-Well" (older Black man); 4 Dad lines (037, 040, 045, 070) still blocked by the provider's filter and keep their old audio. Other speakers now have their own library voices: Reyes (Ashley), Tuck (Julius), Vance (Cecily), the Captain (Reginald), the King, Deacon (Drag Jackson), Sgt. Okafor (Michael Anthony), Mr. Dube (Joseph), broadcasts (Yusuf Hakeem Kiser), male townspeople (Dan), female townspeople (Kelli LaShae). All clips loudness-matched to about -18 LUFS, no pitch-shifting.
- Keem is now 100% Young Jamal: every Keem line and bark (190 audio files, audited) uses that voice. Lines the filter blocked were reworded to their clean variant (subtitle matches audio) and re-voiced; unused old-voice Keem files were removed.
- Keem now speaks in the opening chapter too (the Chapter 1 mute is removed). Fixed the overlong pause in "Mom would end me for this. If she… yeah. Later."
- Remaining old-voice lines: Nia 22, 44, 48 (blocked by the provider's filter). Those three, and Dad's four blocked lines, were later remade on `feat/voices` with ElevenLabs eleven_v3.

### v1.9.14
- New voices: 272 Keem and Nia lines (185 Keem, 87 Nia, dialogue and combat barks) re-voiced with ElevenLabs "Young Jamal" (Keem) and "Myriam" (Nia), loudness-matched to Dad's existing lines (-18 LUFS). Dad's voice is unchanged. 18 lines the voice provider's content filter refused to speak (strong-language lines) keep their previous voice for now.

### v1.9.13
- Grass: about half the height, thinned near the camera, and cleared from the camera-to-player line of sight and a patch around the player's feet, so Keem's whole body is always visible while the field stays lush at a distance.

### v1.9.12
- Environment: GPU grass/weed/fern field (never on roads, water or tunnels), ground splat shader with CC0 Poly Haven textures, cracked road overlays, pine/deciduous/dead trees and bushes, new sky and fog, window/grime detail on houses, rust/dirt on cars, more varied debris props and per-car tint/scale/rotation. Low preset uses fewer, larger instance chunks and fewer prop types.
- Zombies: six new rigged cartoon zombies (male, office, elder, big, cop, worker) mixed with the original cartoon zombie and the old v1.9.7 procedural look (~28%). Townspeople/victims keep ~35% of the old procedural look. Elder zombie darkened and flashlight softened so nearby zombies no longer glow.

### v1.9.11
- Camera look: the hidden dialogue box was an invisible ~700px-wide touch blocker at the bottom centre/right, and the dialogue box and the Run/Crouch wrapper swallowed look drags. They no longer block; every empty screen point outside the left stick now turns the camera, and a stuck look finger (touchend lost when an element disappeared) can no longer leave the camera dead.
- Melee: weapon reach is now the weapon's visible reach (about 1.2-1.6 m, was 1.6-2.7 m), narrower arc, soft-lock only on zombies in reach, and the hit lands when the swing reaches full extension (was late). Zombies now close in to ~1 m before attacking so fights happen at arm's length.
- Zombie variety: about 45% of zombies use the original v1.9.7 procedural look mixed in with the new cartoon zombie; wider size variation.

### v1.9.10
- Controls are back to exactly how v1.9.7 played: same button layout and sizes, stick behaviour, aim button and movement feel. The v1.9.8 thumb-arc layout (with Swap/Grenade buttons) and smooth movement are now opt-in under Settings -> Controls. Control settings saved by v1.9.8/v1.9.9 are reset to the classic default once (look sensitivity is kept).
- Lighting: removed the emissive lift, strong rim light and always-on face light that made characters look washed out and glowing white. Characters now sit in the scene's own lighting; hand and skin colours match their textures.
- New 3D models for the side cast: Walt, Ruth, Dube, Gus, Reyes, Tuck, Vance, plus generic male / female townspeople and victims (no more mannequins in the story).

### v1.9.9
- Fix: the player always uses the new Keem 3D model, including saves that have a custom-creator look stored (those used to fall back to the old mannequin, e.g. in the Chapter 1 bedroom). The creator look no longer overrides the model.

### v1.9.8
- Real 3D characters: Keem, Nia, Dad, the raiders and the zombies are now smooth, textured cartoon models (with clean mitten hands) instead of the old block mannequins. They are driven by the existing animation skeleton, so movement, aiming, shooting, melee, death and every other behaviour are unchanged. Biscuit the rabbit is a new model too. Custom-creator characters and townspeople keep the previous look for now.
- Slightly brighter character lighting; `?rig=0` in the URL switches back to the old mannequins (for comparison).

### v1.9.7
- Boss kills play out: ~1.3s slow-mo, the full death/collapse, then "BOSS DOWN" and a few seconds of free control before any dialogue, fade, cutscene or chapter-end screen. Applies to all 11 bosses (raider bosses included).
- Cleared fights wait ~2s for the last death to finish before "Area clear" appears; the Chapter 11 rooftop waves no longer cut straight to the final boss.

### v1.9.6
- Big melee bosses no longer hug Keem: they back off and pause after a slam, a charge, or every ~12% HP lost, wind up before charging, and stop short instead of walking into you. Gives clean head-shot windows. Health and resistance unchanged.
- Zombie kills can drop pickups: ammo for your equipped gun (~16%) or +25 health (~10%). Walk over to collect (toast shown). They vanish after 20s, max 8 on the ground.

### v1.9.5
- End-of-chapter screen: the Continue button now names and loads the real next chapter (it always said "Continue to Chapter 2").
- "Daddy" is now "Dad" in all dialogue and subtitles (those lines re-voiced).
- Boss health bars now go down as hits land for every boss, including the raider bosses (Deacon, Toll King, Captain). Boss resistance unchanged.

### v1.9.4
- Raiders act like real shooters: pick a firing spot (prefers cover), walk there, then hold and fire after a short aim-up. Muzzle flash and tracers come from their gun.
- Raiders and zombies fight each other. Zombies go for the nearest human (Keem, raiders, allies), but allies can't die. You only get cash/XP for kills you were part of.
- Nia helps where you can see it: a toast on every hand-off, more spotting callouts, and every ~25s a thrown bottle/rock that stuns a zombie near Keem.
- No more jumping to another spot after a fight. Cleared areas show "Area clear" with a marker and advance when you get there. Bigger story jumps fade to black with the next objective.
- Flamethrower and launcher now hurt tall zombies and bosses (resistance unchanged). Point-blank hits on big zombies register.

### v1.9.3
- Gun aim: shots go through the crosshair. Spread is now a true angle (it was stretched ~2x sideways on landscape phones); aimed single-bullet shots are dead-on, hip-fire cone is much tighter; shotgun pellets unchanged.
- Zombie torso hitbox reaches the neck (no dead gap under the head), and walls between the camera and Keem no longer eat shots.

### v1.9.2
- Movement put back to v1.9.0 (no acceleration lag, no layered upper body, no leg twist, original camera follow).
- Keem turns to face where he moves whenever you are not aiming, even with a gun out; faces the crosshair (strafe/backpedal) only while aiming or for 0.5s after a shot.
- Touch devices: objective hints say left stick / ✋ hand button instead of WASD / E.
- Kept from v1.9.1: shader prewarm, retry cleanup, 1.5s post-dialogue grace, barrier collision, death anims, HUD.

### v1.9.1
- Smoother movement: acceleration/deceleration, capped turn rate, strafe/backpedal legs, upper-body gun layer, gait speed matched to footfalls; smoothed camera.
- Zombies/Keem no longer pass through bridge barriers; corpses separate; hit-react before death ragdoll.
- Perf: shader/FX prewarm (no first-shot or grenade compile freeze), 1.5s grace after dialogue, actor disposal on retry.
- HUD: pages in health line, spaced RUN/CRCH, bigger death hint, reload bar.

## v2.0 (work in progress) — character art + controls
- **Characters**: every character (Keem, Nia, Dad, townspeople, zombies, raiders, bosses) uses the same stylized-avatar look: bigger heads, large glossy eyes, chunkier shoes, warm rim light. Built from original procedural geometry on the CC0 Quaternius rig — gameplay, hitboxes and levels are untouched. Review the cast with `npm run dev` → `/tools/lineup.html`.
- **Movement**: eased acceleration (same top speeds) and a Walk↔Jog↔Sprint blend tree whose cycle advances with real ground speed (no foot sliding; backpedal plays the cycle in reverse while aiming).
- **Settings → Control scheme, layout & sensitivity…**: Classic twin-stick or Simple (tap/hold to shoot + strong aim assist + optional auto-fire), floating/fixed joystick, left/right-handed layout, button size/opacity, look sensitivity, controller stick speed/dead-zone, invert-Y. Keyboard+mouse and gamepad work as before. Everything is saved in `atq3.settings`; defaults reproduce the previous behaviour (aim assist off).

### v2.0.1 — touch layout, interiors, gear
- Touch buttons sit in thumb arcs (fire/aim/reload/jump/roll/interact/swap/grenade on the right, run/crouch + move stick on the left), are ≥44 px on phones, and multitouch works (move + look + fire together). Aim: tap = toggle, hold = aim while held.
- Settings → Controls → *Move & resize buttons…*: drag any button, resize it, red outline warns about overlaps, *Reset to default*. Layout is saved with your settings and mirrors for left-handed mode.
- Keem's house now has a furnished, abandoned interior (decor only; no new collision) and all weapons/pickups use new realistic, logo-free procedural models.
