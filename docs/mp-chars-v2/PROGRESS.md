# MP characters v2 (branch feat/mp-chars-v2) — progress notes

Goal: Bitmoji-style original guy + girl (refs: /workspace/keem-vids/ref_guy.jpg, ref_girl.jpg), full customization that fits,
360° creator spin + face zoom, same skeleton/animations as story Keem (src/mp/motion.js retarget), no logos, phone-friendly.

## Done
- src/mp/v2/head.js: analytic SDF egg head (soft jaw, chin, cheeks, small nose), ray-meshed, ears; landmarks for accessories.
- src/mp/v2/facepaint.js: painted face texture (eyes w/ iris gradient, highlights, lids, lashes, liner; brows; closed / toothy mouths; freckles, blush, stubble).
- src/mp/v2/headrig.js: head/ears/neck tube skinned to Head/neck/Spine; body head + neck stripped; neck tube fitted to the body neck (no jagged collar);
  hair cap / extras, beards / staches, masks; headCtx feeds hats/glasses/earrings from the new head.
- src/mp/v2/hair.js: 28 guy / girl-appropriate hair styles as smooth caps with a curved hairline + braids, buns, locs, twists coils; anisotropic hair shader.
- src/mp/garments.js: garment cuts now from continuous bind-space coords (no triangle-jagged edges), anti-aliased edges (alpha-to-coverage),
  crew/V necklines as a hole around the neck, folds (elbow/knee/hem), seams, ribbed cuffs/hems, zipper, cargo pockets, jogger cuffs.
- src/mp/v2/shoes.js: real lofted shoe meshes fitted per foot (sneaker laces, canvas toecaps, clog holes + heel strap, boots = mesh + shaft shell).
- src/mp/v2/hood.js: lying hood for hoodies / zip hoodies.
- New items: cropzip (cropped zip hoodie), cargojog (cargo joggers), clog. Defaults = the two reference looks.
- Removed (could not fit cleanly): goggles, visor shades, mutton chops (old saves alias to chin strap), balaclava, ski mask, old extra bases.
- src/mp/anim.js: procedural creator pose is now root-relative -> the creator body spins the full 360 (before, bones kept world orientation, so the body never turned).
- Creator head view targets the new head.

## Proofs (docs/mp-chars-v2/)
- ref/mp_m1_ref_vs_model.png, ref/mp_f1_ref_vs_model.png (front, 3/4, face close-up next to the reference)
- grids/<base>_<category>.png for hair, beard, stache, eyes, brows, nose, mouth, skin, tops, jackets, pants, shoes, masks, hats, glasses, earrings, pierce, necklaces
- creator/<guy|girl>_spin_{0,90,180,270}.png + _spin_sheet.png + _facezoom.png, spin_log.json (real pointer drags, measured root yaw)
- motion/<base>_run.png, motion/<base>_roll.png (story clips via makeMotion; side + 3/4 rows)
- Tools: tools/chars2/{av.html,grid.html,grid.mjs,anim.html,anim.mjs,creator_spin.mjs,shot.mjs}. Dev server: vite on 127.0.0.1:5240.

## Known flaws / next
- Hair caps still read slightly helmet-like on some short styles; many fades look alike.
- Hands are the base mesh hands: thumb + fingers but the fingers are fused (no separate finger meshes).
- Girl lashes a little spiky; guy full beard is a solid cartoon mass (no strand detail).
- Turtleneck collar stops at the neck tube base (no high collar mesh).
- Sun visor band hides inside big hair; rider helmet visor is opaque black.
- Garment folds are procedural bump only (no real geometry wrinkles).

## Perf pass (final)
- Garment shells now use per-layer index subsets (LAYER_REG in dress.js) and skip head triangles.
- Hair cap 160x40 -> 128x36, braid lumps 12x8 -> 9x6 spheres.
- Default looks: guy ~83k tris, girl ~91k tris (down from ~100k / ~122k).
- Grids for tops/jackets/pants/shoes/hair/hats and the ref views were re-rendered after the pass.

## Polish pass (Nov 19 2026, ~06:40 EST) — done
- Heads 1.20x (guy) / 1.18x (girl), neck + shoulders unchanged; creator/grid cameras reframed.
- Guy beard: lighter brown, wispy skin-blended edge + stubble halo on cheeks, separate mustache over the open smile.
- Guy hair: 26 tousled clumps (blunt tips, no straw spikes), natural temples + sideburns; clumps removed under hats.
- Cargo joggers: baggier, real side pockets, blousing at shin, tight cuffs; tops now cover the waistband.
- Separated fingers on both base bodies (rings follow the finger).
- Girl: neck triangles kept so the analytic neck hole cuts the collar smoothly; dress closes between the legs, hip line gone.
- Perf: guy ~86k tris, girl ~91k tris. Run/roll checked, limbs intact.

### Honest flaws left
- Guy forehead hairline is still a fairly crisp edge with small steps, not a true soft fade.
- Beard underside reads as a rounded solid edge against the neck in close-up; small dark specks at the shirt neckline sides.
- Girl's jacket collar edge is smoother but still slightly wavy up close; a faint tone step where the head neck meets the body neck.
- Wide-brim hats (bucket/sun/western) have thin, slightly see-through brims; hard hat shows a stray thin red strip.
- Fingers are separated but sit close together and are fairly straight (no knuckle detail).

## Fix pass 2 (Nov 19 2026, ~06:30-06:50 EST)
Done:
- Guy full beard: thinner (T .0075 -> .0046), trimmed to the jaw (floor line follows the jawline, chin underside + neck stay skin), cheeks left clear (top line dropped ~1.3 cm), outer edges now fade by *surface distance to the cut* (new `aE` vertex attribute, 3 cm feather, stippled strand fade + skin blend) so the bottom edge tapers softly into the neck. Mustache uses a 7 mm feather.
- Nose: guy nose 1.22x with a slightly longer tip; painted bridge-side shadows, nostril shadows, under-tip shadow and tip highlight (reads in flat frontal light).
- Scalp hairline: same distance-to-edge feather (`aE`, 2 cm) + 3 smoothing passes on the boundary; edge is a stippled fade, not a hard cut. (`aE` is zero-filled for parts without it, see headrig.js merge.)
- Hats: bucket / sun / fedora / western brims are now closed drooping frustums with real thickness (`brim()` in acc.js), underside normals bent up so they do not render black; bucket hat raised off the eyes. Hard hat: full short solid brim, dome only (the floating red strip is gone).
- Girl/guy neckline: inner (back) faces of the collar lip beside the neck no longer render (dark specks gone). Neck tube now uses a `plain` skin material lit exactly like the body skin (no extra self-light) -> the tone step where neck meets chest is much smaller.
- Fingers: slightly stronger natural curl (curls .6/.5/.42/.34 pinky->index, curl .16), tris unchanged.
- Tools: `PORT` env for tools/chars2/*.mjs (default 5262), `hatshots.sh`, extra camera views (hatfr/hatup/hatdn/neckL/neckF) in av.html.
- Perf: guy 86,029 tris, girl 90,683 tris (unchanged).

Honest flaws left:
- Beard is still one opaque, strand-shaded shell with a feathered edge; it reads cartoon-thick on the jaw sides and has a straight vertical cut at the mouth corners.
- Hairline feather is a stippled dither (a little grainy up close, especially on the girl's dark hair where the skin blend reads slightly orange).
- Small pointed shell tips remain at the top of the collar on both sides of the neck (the base body mesh has jagged triangles there); girl's cropped-jacket collar edge is still slightly wavy.
- A faint tone/shading step remains where the neck meets the chest (blotchy flat shading from the base body normals), much weaker than before but visible on the girl up close.
- Brim undersides are lit flat/pale rather than shaded; baseball-cap bills and the sun visor are still thin partial shells.
- Fingers are only slightly curled (bind-pose rotation, no knuckle detail).

## Fix pass 3 (Nov 19 2026, ~06:45-07:05 EST)
- Guy full beard rebuilt as a close-trimmed beard: stubble is painted in the head skin shader (3D head-local mask: curved cheek line from sideburn down to the mouth corners, lip + lip-to-chin gap kept bare, jaw-hugging bottom edge, fine stipple density + tint) with only a ~1.6 mm fuzzy shell on top (stippled, thins toward the edges). Lighter, less saturated default beard colour (#6a4f38, hair-matched). The vertical wall at the mouth corners is gone (no LIP_CUT for this beard). Other beard styles keep the old opaque shell.
- Scalp hairline: dither removed; hair colour now blends smoothly into the skin tone over ~2 cm (no discard, no grain).
- Hats: each now has its own silhouette (acc.js): beanie = knit ribbed dome + folded cuff (+pom), baseball cap = rounded crown with panel seams + button + curved bill, bucket = tapered crown + downward brim, fedora = pinched crown + band + snap brim, western = dented crown + band + brim curled up at the sides, sun hat = low crown + wide flat brim + ribbon, beret = flat floppy disc pulled to one side + rim band + stalk, hard hat = ridged shell + brim with a front peak. Per-hat default colours (`HAT_DEFAULTS` in catalog.js, applied by the creator when a hat style is picked); brim undersides are lit (no black).
- Tris unchanged: guy 86,029, girl 90,683.
### Honest flaws left
- Collar tips beside the neck are NOT fixed (jagged triangles in the base body mesh under the shirt; hiding the shell just exposes skin spikes).
- Beard is shorter/lighter than the Snap ref's full beard on purpose; the stubble grain is visible up close and the shell sideburn near the ear still ends with a fairly straight cut.
- Hairline is a smooth gradient, so it reads airbrushed rather than strand-by-strand.
- Cap bills are flat-ish fans; hat underside shading is flat; hats do not yet resize for very wide hair (afro), and hat/hair clipping was only checked on default hair.
- Faint tone step at neck/chest on the girl remains.
