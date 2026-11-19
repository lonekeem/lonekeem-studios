# Multiplayer character polish: progress (branch feat/multiplayer)

Direction from Keem: keep the existing generated bases and polish them (no new bases, no Fal spend). Only 2 bases in the creator: `mp_m1` (man) and `mp_f1` (woman). `mp_m2` / `mp_f2` GLBs stay on disk but are hidden; old saves map to m1/f1.

## Done
- Clothing pass v3 (procedural garment detail, real shoe geometry, neckline/hem fixes): `docs/mp-proof-v3/`
- Creator reduced to 2 bases, legacy saves mapped (`catalog.js` LEGACY_BASE, `look.normalize`)
- Face v3 (WIP): baked eyes/brows/lips erased and repainted in `src/mp/face.js` (almond eyes, liner + wing, lashes, crease, iris/limbal ring/2 highlights, tapered brows, smile mouth with teeth, `look.mouth.smile` 0-3)

## Next
1. Tune face v3 (lash/liner weight, brow strength, teeth contrast, eye spacing per base, freckles option denser on nose/cheeks)
2. Creator UI: smile level, eye style/size/spacing/tilt/lash controls back in Eyes tab, freckles
3. Head/body ratio slightly toward Keem's (default head scale up a little)
4. Separated fingers (shader grooves/normal bump on hand mesh; real geometry only if feasible)
5. Shoe silhouette polish
6. Side-by-side proofs in `docs/mp-proof-v4/` next to refs (`/workspace/atqmp-refs`) and Keem; honest flaws list; update docs/multiplayer.md §17 and PR #9 text suggestion
Constraints: no merge/deploy; Supabase untouched; Fal $0 this phase; originals only, no logos.
