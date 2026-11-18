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
