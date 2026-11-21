# Credits & Licenses — After the Quiet v1.9.0 (Story Mode)
Lone Keem Studios · created by Keem

| Asset | Source | License |
|---|---|---|
| Rigged humanoid + animations (`public/models/`) | Quaternius — Universal Animation Library (quaternius.com) | CC0 |
| Vehicles: truck, sedan, SUV, police, ambulance, debris (`public/models/cars/`) | Kenney — Car Kit (kenney.nl) | CC0 (see `KENNEY_LICENSE.txt`) |
| PBR textures (asphalt, mud, forest ground, bark, rust, planks) and HDRI sky (`public/tex/`) | Poly Haven (polyhaven.com) | CC0 |
| Character portraits, title art | Removed in v1.3.1 (no photos ship with the game) | — |
| Footsteps, melee impacts, reload clicks/latches, shell casings, glass, metal, wood, door, cloth, coins (`public/sfx/step_*`, `punch*`, `bat*`, `flesh*`, `metal*`, `shell*`, `glass*`, `plank*`, `reload_*`, `cloth*`, `door_open`, `creak`, `knife`, `chop`, `coins`) | Kenney — Impact Sounds & RPG Audio (kenney.nl), converted to mp3 | CC0 (see `public/sfx/KENNEY_LICENSE.txt`) |
| Gunshots, explosion, thunder, rain loop, truck engine, zombie growls/moans/attacks/eating, boss roar (`public/sfx/gun_*`, `explosion`, `thunder*`, `rain_loop`, `truck_loop`, `z_*`, `boss_roar`) | Procedurally synthesized by `tools/make_audio.py` (numpy + ffmpeg) | © Lone Keem Studios |
| Victim screams in the opening and feeding scenes (`public/sfx/scream0`–`scream3`) | ElevenLabs Sound Effects v3, original human panic/attack vocals, loudness-matched to about −18 LUFS | © Lone Keem Studios |
| Music, wind, UI tones, synth fallbacks | Synthesized at runtime with Web Audio (`src/audio.js`) | © Lone Keem Studios |
| Engine / tools | three.js (MIT), Vite (MIT), Capacitor (MIT) | MIT |
| Voiced dialogue & shouts (`public/sfx/v/`) | In-game spoken lines and barks are ElevenLabs voices (Young Jamal, Myriam, Carlton C-Well, and the library voices listed in the README), loudness-matched to about −18 LUFS. A small number of unused leftover clips from an older Kokoro-82M pass may still sit in the folder but are not played. Subtitles stay on; voices can be turned off in Settings. No real person's voice was cloned. | Audio: © Lone Keem Studios |


## feat/voices audio pass
- Opening/feeding victim screams (`scream0`–`scream3`) remade with ElevenLabs Sound Effects v3. These replace the old procedural oscillator screams, which sounded robotic.
- The last 10 spoken lines that were still on Kokoro (4 Dad lines the old filter had blocked, 3 Nia lines, plus Coach Brickman, Ronnie and Mall Santa) remade with ElevenLabs eleven_v3, same character voices as the rest of the game (Dad = Carlton C-Well, Nia = Myriam).

## v2.0.0 character art pass
- Stylized-avatar look for every character (big expressive eyes, larger heads, chunky sneakers/boots, new outfits: Varsity "B", Purple Hoodie, Red Flannel, Raider mask/goggles, rectangular glasses, short jaw beard, backwards cap, cargo pants). All faces, outfits, decals (the "B" patch, the hoodie bunny) and accessories are original procedural geometry / canvas drawings made in-repo (`src/game/looks.js`, `src/game/chars.js`) — no third-party character models, textures, or reference images are used. Rig and animations remain the CC0 Quaternius set.
- `tools/lineup.html` is a dev-only studio lineup page for reviewing the cast.

## v1.8.0 audio additions
- New/rewritten lines for Ch10–11 and the dialogue pass, Kokoro stock voices (Dr. Vance: af_nicole).

## v1.7.1 audio additions
- Menu theme, studio ident, intro sting and loading music: original score generated with ElevenLabs Music v2.5 for Lone Keem Studios, instrumental. The v1.9.24 studio ident also uses a short ElevenLabs voiceover (Jake).
- Procedural SFX (footsteps mud/asphalt, zombie shuffles, breathing, jump/land, roll, squelches, car alarm, wind, tires) synthesized in-repo by `tools/sfx3d.py` — original, CC0.
- All voices: Kokoro-82M stock voices (Apache-2.0), rendered locally with free tools; no voice cloning, no paid TTS. All voice lines are subtitled.
