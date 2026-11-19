# Multiplayer online: status and what Keem must do

**Done (2026-11-19, approved by Keem; free plan, no cost):** project `lonekeem-studios` (`wwdwbnhswynjcxeerdgz`) restored; migrations `mp_phase1`, `mp_online_access`, `mp_my_role_rpc` applied (files in `supabase/migrations/`).
* The town joins a Supabase **Realtime broadcast** room (`atq-mp-town`) with the public publishable key (`src/mp/online.js`). If it cannot connect within a few seconds it plays **solo** (BroadcastChannel, same browser only). HUD shows "Online" / "Solo".
* RLS self-test (rolled back): a normal player cannot insert/update a character with `skin.keem_story`, cannot promote themselves; an allow-listed admin can.
* Admin = `atq_mp.admin_emails` allow-list: **empty until Keem gives his Google e-mail** (insert it with the SQL editor or ask the bot); the sign-up trigger (and the allow-list trigger for people who already signed in) sets role `admin`.

**Keem must do (cannot be done through the connector):**
1. Google Cloud Console → APIs & Services → Credentials → *Create OAuth client ID* (Web application). Authorized redirect URI: `https://wwdwbnhswynjcxeerdgz.supabase.co/auth/v1/callback`.
2. Supabase dashboard → Authentication → Providers → Google: enable, paste Client ID + Secret.
3. Supabase dashboard → Authentication → URL Configuration: Site URL `https://lonekeem.github.io/lonekeem-studios/`, add it (and `http://localhost:5210/`) to Redirect URLs. (The Android app needs its own deep link later.)
4. Tell the bot which Google e-mail is the admin. Until step 2 the pause menu says "Guest · Google sign-in coming soon" (the button appears automatically once Google is enabled).

**Not wired yet:** choosing "Original Keem" in the creator (the `exclusive` look + server lock exist, no client UI); saving characters/wallets/houses to the account (tables exist, the town still keeps these in memory); zombies, cars, loot and doors are simulated per client (doors/loot/car events are broadcast, zombies are not synced). Free-tier Realtime limit: ~100 msgs/s per project (about 6–8 players at the current send rate); a game server is the next step for more.
Pre-existing advisor warnings belong to the other app in this project (clip/credit functions callable by anon/authenticated); not touched.
