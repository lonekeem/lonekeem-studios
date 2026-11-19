# mp hair pass (feat/mp-hair)
Keem: "Make it look like normal hair" (shoulder length looked like a stiff striped helmet: hard shell, vertical stripes, dark band/gap at the forehead, flat side panels).

## What changed (src/mp/v2/hair.js only, plus tools)
- **Shading**: no more high-frequency stripe pattern; soft strand texture (smooth value noise, +-4%), broad soft highlights instead of thin spec lines, a little ambient so dark hair keeps its form from the back.
- **Hairline**: no skin-tone blend / discarded gap. The cap now ends in a rolled lip (a few mm thick) with a soft shadow, so it reads as hair meeting skin. Only buzz / fades / undercut / mohawk keep the soft skin fade (they are meant to look like stubble).
- **Long styles (bob, long bob, shoulder, long straight/waves/curls, curtain bangs)**: the old drop was a separate flat sheet floating under the cap. Now it starts exactly on the cap's lip (same thickness, no seam) and leaves it along the cap's own slope (cubic Hermite), hangs behind the back and in front of the collarbones, feathers out at the front edge, scalloped hem, rounded cross-section. Body keep-out (measured from the base body) so hair does not sink into the jacket.
- **Hairlines** for long styles drop down the temple (frames the face); nape lowered for short styles.
- **Afro / mini afro**: rounded ellipsoid volume instead of a mushroom brim. **Cornrows**: visible rows. **Locs**: thicker tapered locs with sway. **Twists**: short rope twists lying on the scalp (was stud-like beads). **Pixie**: swept textured tufts.
- Phone budget: shoulder ~18k tris, long ~18k, twists ~12k, pixie ~12k (hair mesh, one draw call).
- Hats: hatCut path unchanged, hair under hats still hidden (docs/mp-hair/hats/).

## Proofs
- before: docs/mp-hair/before/
- full grids (front / 3/4 / back, both bodies): docs/mp-hair/grids/grid_mp_{f1,m1}_{hf,hq,hb}.png (+ older-size grid_*_front.png)
- close-ups: docs/mp-hair/closeups/ (girl shoulder length, girl long straight, guy default tousled; front, 3/4, side, back)
- real creator UI: docs/mp-hair/creator/ (4 spin angles + face zoom)

## Known flaws
- Hood-up hat has a hole at the crown (pre-existing accessory); hair currently fills it.
- Short men's styles still end at ear level at the back (clean nape, but a little "bowl" from behind).
- Long hair is a closed slab: no individual strands/transparency, so very close-ups of the hem look like a clean cut with scallops.
- Pigtails / ponytails are single tapered tubes (stylised, thin).
- Long curls are lumpy but still read as curls.
- Hair crossing body from side-to-front can clip slightly into very puffy tops.
