-- After the Quiet: cloud profiles for Google-signed-in players (guests stay local-only).
-- Name -> atq_mp.profiles.display_name, character -> atq_mp.characters slot 0 (existing look_allowed() check), everything else
-- (story save with cash / owned weapons + outfits / progress, outfit selections, survival best) -> atq_mp.profile_saves.data.
-- Functions are SECURITY INVOKER, so the row-level-security policies below decide what a caller can read and write: own row only.
create table if not exists atq_mp.profile_saves (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  rev int not null default 0,
  updated_at timestamptz not null default now(),
  constraint profile_saves_size check (pg_column_size(data) <= 65536),
  constraint profile_saves_cash check (coalesce((data #>> '{save,cash}')::numeric, 0) between 0 and 10000000)
);
alter table atq_mp.profile_saves enable row level security;
drop policy if exists "own save" on atq_mp.profile_saves;
create policy "own save" on atq_mp.profile_saves for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke all on atq_mp.profile_saves from anon, authenticated;
grant select, insert, update on atq_mp.profile_saves to authenticated;
alter table atq_mp.profiles add column if not exists avatar_url text;
grant select, insert, update on atq_mp.profiles, atq_mp.characters to authenticated;

-- Load my profile (null when signed out; exists=false when this Google account has no profile yet).
create or replace function public.profile_load() returns json language plpgsql stable security invoker set search_path = atq_mp, public as $$
declare uid uuid := auth.uid(); p atq_mp.profiles; s atq_mp.profile_saves; c atq_mp.characters;
begin
  if uid is null then return null; end if;
  select * into p from atq_mp.profiles where user_id = uid; select * into s from atq_mp.profile_saves where user_id = uid; select * into c from atq_mp.characters where user_id = uid and slot = 0;
  return json_build_object('exists', s.user_id is not null, 'name', p.display_name, 'avatar', p.avatar_url, 'look', c.look, 'data', coalesce(s.data, '{}'::jsonb), 'rev', coalesce(s.rev, 0), 'updated_at', s.updated_at);
end $$;

-- Save my profile. p_rev = the rev this device last loaded; if the cloud is newer (another device saved), nothing is written and
-- the cloud copy comes back with conflict=true so the client can decide.
create or replace function public.profile_save(p_name text, p_avatar text, p_look jsonb, p_data jsonb, p_rev int, p_force boolean default false)
returns json language plpgsql security invoker set search_path = atq_mp, public as $$
declare uid uuid := auth.uid(); cur atq_mp.profile_saves; nm text;
begin
  if uid is null then raise exception 'sign in first' using errcode = '42501'; end if;
  if p_data is null or jsonb_typeof(p_data) <> 'object' then raise exception 'bad data' using errcode = '22023'; end if;
  if p_look is not null and pg_column_size(p_look) > 16384 then raise exception 'look too big' using errcode = '22023'; end if;
  select * into cur from atq_mp.profile_saves where user_id = uid for update;
  if found and not coalesce(p_force, false) and coalesce(p_rev, 0) < cur.rev then
    return json_build_object('conflict', true, 'rev', cur.rev, 'data', cur.data, 'updated_at', cur.updated_at);
  end if;
  if found and cur.updated_at > now() - interval '2 seconds' then raise exception 'too fast' using errcode = '22023'; end if;
  nm := coalesce(nullif(left(btrim(regexp_replace(coalesce(p_name, ''), '[^[:alnum:] _.\-]', '', 'g')), 16), ''), 'Survivor');
  insert into atq_mp.profiles (user_id, display_name, avatar_url) values (uid, nm, case when p_avatar ~ '^https://' then left(p_avatar, 500) end)
    on conflict (user_id) do update set display_name = excluded.display_name, avatar_url = excluded.avatar_url;
  if p_look is not null then
    insert into atq_mp.characters (user_id, slot, look, updated_at) values (uid, 0, p_look, now()) on conflict (user_id, slot) do update set look = excluded.look, updated_at = now();
  end if;
  insert into atq_mp.profile_saves (user_id, data, rev, updated_at) values (uid, p_data, 1, now())
    on conflict (user_id) do update set data = excluded.data, rev = atq_mp.profile_saves.rev + 1, updated_at = now() returning * into cur;
  return json_build_object('conflict', false, 'rev', cur.rev, 'updated_at', cur.updated_at);
end $$;
revoke all on function public.profile_load() from public; revoke all on function public.profile_save(text, text, jsonb, jsonb, int, boolean) from public;
grant execute on function public.profile_load() to authenticated; grant execute on function public.profile_save(text, text, jsonb, jsonb, int, boolean) to authenticated;
