-- After the Quiet: worldwide leaderboard (Survival). Free tier, no login required.
-- Players are either a Google account (auth.uid()) or a guest (random uuid + secret kept on the device; only its sha256 is stored).
-- The table is not reachable through the Data API at all (RLS on, no policies, no grants). Clients only use the two functions below,
-- which sanitise names, cap values and rate-limit submissions.
create extension if not exists pgcrypto with schema extensions;

create table if not exists atq_mp.leaderboard (
  pid uuid primary key,                      -- auth.users.id for Google players, device uuid for guests
  kind text not null check (kind in ('google','guest')),
  secret_hash text,                          -- guests only
  name text not null,
  avatar text,                               -- Google profile photo URL (https only), null for guests
  best_wave int not null default 0,
  best_kills int not null default 0,         -- most kills in one run
  total_kills int not null default 0,
  total_hs int not null default 0,
  runs int not null default 0,
  last_submit timestamptz,
  hour_start timestamptz,
  hour_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists leaderboard_wave_idx on atq_mp.leaderboard (best_wave desc, total_kills desc);
create index if not exists leaderboard_kills_idx on atq_mp.leaderboard (total_kills desc);
create index if not exists leaderboard_hs_idx on atq_mp.leaderboard (total_hs desc);
alter table atq_mp.leaderboard enable row level security;
revoke all on atq_mp.leaderboard from anon, authenticated;

create or replace function atq_mp.lb_clean_name(n text) returns text language sql immutable as $$
  select coalesce(nullif(left(btrim(regexp_replace(regexp_replace(coalesce(n,''), '[^[:alnum:] _.\-]', '', 'g'), '\s+', ' ', 'g')), 16), ''), 'Survivor') $$;

-- Submit one finished Survival run. Returns the player's row (public fields).
create or replace function public.lb_submit(p_guest uuid, p_secret text, p_name text, p_kills int, p_wave int, p_hs int, p_secs int)
returns json language plpgsql security definer set search_path = atq_mp, extensions, public as $$
declare uid uuid := auth.uid(); v_pid uuid; v_kind text; v_avatar text; v_name text; r atq_mp.leaderboard; meta jsonb;
begin
  -- sanity caps (a wave takes real time; kills per run scale with waves; headshots <= kills)
  p_wave := greatest(0, least(coalesce(p_wave,0), 300));
  p_kills := greatest(0, least(coalesce(p_kills,0), 10000));
  p_hs := greatest(0, least(coalesce(p_hs,0), p_kills));
  p_secs := greatest(0, coalesce(p_secs,0));
  if p_kills > 30 + p_wave * 40 then raise exception 'rejected: kills' using errcode = '22023'; end if;
  if p_kills > 10 + p_secs * 4 then raise exception 'rejected: pace' using errcode = '22023'; end if;
  if p_wave > 1 + p_secs / 8 then raise exception 'rejected: pace' using errcode = '22023'; end if;
  if uid is not null then
    v_pid := uid; v_kind := 'google';
    select raw_user_meta_data into meta from auth.users where id = uid;
    v_name := atq_mp.lb_clean_name(coalesce(nullif(p_name,''), meta->>'full_name', meta->>'name'));
    v_avatar := coalesce(meta->>'avatar_url', meta->>'picture'); if v_avatar !~ '^https://' then v_avatar := null; end if;
  else
    if p_guest is null or p_secret is null or length(p_secret) < 16 or length(p_secret) > 128 then raise exception 'rejected: guest id' using errcode = '22023'; end if;
    v_pid := p_guest; v_kind := 'guest'; v_name := atq_mp.lb_clean_name(p_name); v_avatar := null;
  end if;
  select * into r from leaderboard where pid = v_pid for update;
  if found then
    if r.kind = 'guest' and (v_kind <> 'guest' or r.secret_hash <> encode(digest(p_secret, 'sha256'), 'hex')) then raise exception 'rejected: not yours' using errcode = '42501'; end if;
    if r.last_submit > now() - interval '15 seconds' then raise exception 'rejected: too fast' using errcode = '22023'; end if;
    if r.hour_start > now() - interval '1 hour' and r.hour_count >= 60 then raise exception 'rejected: hourly limit' using errcode = '22023'; end if;
    update leaderboard set name = v_name, avatar = v_avatar, best_wave = greatest(best_wave, p_wave), best_kills = greatest(best_kills, p_kills),
      total_kills = least(total_kills + p_kills, 2000000000), total_hs = least(total_hs + p_hs, 2000000000), runs = runs + 1, last_submit = now(),
      hour_start = case when hour_start > now() - interval '1 hour' then hour_start else now() end,
      hour_count = case when hour_start > now() - interval '1 hour' then hour_count + 1 else 1 end, updated_at = now()
      where pid = v_pid returning * into r;
  else
    if (select count(*) from leaderboard where created_at > now() - interval '1 minute') > 60 then raise exception 'rejected: busy' using errcode = '22023'; end if;
    insert into leaderboard (pid, kind, secret_hash, name, avatar, best_wave, best_kills, total_kills, total_hs, runs, last_submit, hour_start, hour_count)
      values (v_pid, v_kind, case when v_kind = 'guest' then encode(digest(p_secret, 'sha256'), 'hex') end, v_name, v_avatar, p_wave, p_kills, p_kills, p_hs, 1, now(), now(), 1)
      returning * into r;
  end if;
  return json_build_object('name', r.name, 'avatar', r.avatar, 'best_wave', r.best_wave, 'best_kills', r.best_kills, 'total_kills', r.total_kills, 'total_hs', r.total_hs, 'runs', r.runs,
    'rank', (select count(*) + 1 from leaderboard o where o.best_wave > r.best_wave or (o.best_wave = r.best_wave and o.total_kills > r.total_kills)));
end $$;

-- Top players. sort: 'wave' | 'kills' | 'hs'. me: the caller's pid (guest uuid or auth uid) to get its own rank.
create or replace function public.lb_top(p_sort text default 'wave', p_limit int default 50, p_me uuid default null)
returns json language sql stable security definer set search_path = atq_mp, public as $$
  with ranked as (
    select pid, name, avatar, kind, best_wave, best_kills, total_kills, total_hs, runs,
      row_number() over (order by case p_sort when 'kills' then total_kills when 'hs' then total_hs else best_wave end desc,
                                  case p_sort when 'wave' then total_kills else best_wave end desc, created_at) as rank
    from leaderboard where runs > 0)
  select json_build_object(
    'rows', coalesce((select json_agg(json_build_object('rank', rank, 'name', name, 'avatar', avatar, 'kind', kind, 'best_wave', best_wave, 'best_kills', best_kills, 'total_kills', total_kills, 'total_hs', total_hs, 'me', pid = coalesce(auth.uid(), p_me)) order by rank)
                      from ranked where rank <= least(greatest(coalesce(p_limit, 50), 1), 100)), '[]'::json),
    'me', (select json_build_object('rank', rank, 'name', name, 'avatar', avatar, 'best_wave', best_wave, 'best_kills', best_kills, 'total_kills', total_kills, 'total_hs', total_hs, 'runs', runs) from ranked where pid = coalesce(auth.uid(), p_me)),
    'players', (select count(*) from ranked))
$$;

revoke all on function public.lb_submit(uuid, text, text, int, int, int, int) from public;
revoke all on function public.lb_top(text, int, uuid) from public;
grant execute on function public.lb_submit(uuid, text, text, int, int, int, int) to anon, authenticated;
grant execute on function public.lb_top(text, int, uuid) to anon, authenticated;

-- advisor: pin search_path
alter function atq_mp.lb_clean_name(text) set search_path = pg_catalog;
