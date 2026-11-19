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
