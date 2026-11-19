# Phase 2: small town map (branch `feat/mp-town`, worktree /workspace/atqtown, based on origin/feat/multiplayer @ 5fabe98)
Owner: this worker. The character polish lives on `feat/multiplayer-polish-wip` and is NOT part of this branch (Keem keeps the original four bases). **Do not edit** creator / body / avatar / face / dress / hair / shoes / garments / morph / look / catalog files.
All new code lives in `src/mp/town/`. `src/mp/entry.js` is re-pointed from the test lobby (`lobby.js`) to the town. `src/mp/net.js` gets a generic `evt` channel only.
Docs/SQL carried over from the polish branch (docs + draft SQL only): Google sign-in, admin role, admin-only Keem skin, multiplayer-only, admin picks Original Keem or a custom character (`docs/multiplayer.md`, `supabase/migrations/20261118_mp_phase1.sql`, draft, NOT applied).
Scope: one small town (~Kemy Pal Street size): 3 streets, ~10 enterable houses with hinged doors, store + gas station, KL cars (fuel gauge, break-in, loot), lootable gas/wood/supplies, endless zombies from the edges (no pop-in), persistent bodies. 844x390 landscape. No Supabase, no spend, no merge/deploy.
## Steps
- [x] rebased onto 5fabe98, admin docs + SQL cherry-picked
