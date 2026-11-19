-- Keem's admin Google account (confirmed by Keem). Signing in with it gives role 'admin' -> unlocks the Original Keem character in multiplayer.
insert into atq_mp.admin_emails (email) values ('lillykemoy1@gmail.com') on conflict (email) do nothing;
