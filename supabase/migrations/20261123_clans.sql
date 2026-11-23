-- After the Quiet: clans + preset banner + clan leaderboard (sum of real member scores).
-- Additive only: creates new tables/functions. Does not drop or truncate existing data.
create extension if not exists pgcrypto with schema extensions;

create table if not exists atq_mp.clans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  tag text not null,
  banner jsonb not null default '{}'::jsonb,
  join_mode text not null default 'request' check (join_mode in ('invite','request')),
  leader_id uuid not null references auth.users(id) on delete restrict,
  member_count int not null default 1 check (member_count >= 0 and member_count <= 30),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint clans_name_len check (char_length(name) between 3 and 24),
  constraint clans_tag_len check (char_length(tag) between 2 and 5),
  constraint clans_banner_size check (pg_column_size(banner) <= 2048)
);
create unique index if not exists clans_name_ux on atq_mp.clans (lower(name));
create unique index if not exists clans_tag_ux on atq_mp.clans (upper(tag));
create index if not exists clans_leader_idx on atq_mp.clans (leader_id);
create index if not exists clans_created_idx on atq_mp.clans (created_at desc);

create table if not exists atq_mp.clan_members (
  clan_id uuid not null references atq_mp.clans(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('leader','officer','member')),
  joined_at timestamptz not null default now(),
  primary key (clan_id, user_id)
);
create unique index if not exists clan_members_one_clan on atq_mp.clan_members (user_id);
create index if not exists clan_members_role_idx on atq_mp.clan_members (clan_id, role);

create table if not exists atq_mp.clan_invites (
  id uuid primary key default gen_random_uuid(),
  clan_id uuid not null references atq_mp.clans(id) on delete cascade,
  inviter_id uuid not null references auth.users(id) on delete cascade,
  invitee_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','declined','cancelled')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  constraint clan_invite_not_self check (inviter_id <> invitee_id)
);
create unique index if not exists clan_invites_pending_ux on atq_mp.clan_invites (clan_id, invitee_id) where status = 'pending';
create index if not exists clan_invites_inbox_idx on atq_mp.clan_invites (invitee_id, status, created_at desc);

create table if not exists atq_mp.clan_requests (
  id uuid primary key default gen_random_uuid(),
  clan_id uuid not null references atq_mp.clans(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','declined','cancelled')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create unique index if not exists clan_requests_pending_ux on atq_mp.clan_requests (clan_id, user_id) where status = 'pending';
create index if not exists clan_requests_clan_idx on atq_mp.clan_requests (clan_id, status, created_at desc);

-- rate-limit helper table for clan creates (no existing data touched)
create table if not exists atq_mp.clan_create_log (
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists clan_create_log_idx on atq_mp.clan_create_log (user_id, created_at desc);

alter table atq_mp.clans enable row level security;
alter table atq_mp.clan_members enable row level security;
alter table atq_mp.clan_invites enable row level security;
alter table atq_mp.clan_requests enable row level security;
alter table atq_mp.clan_create_log enable row level security;

revoke all on atq_mp.clans, atq_mp.clan_members, atq_mp.clan_invites, atq_mp.clan_requests, atq_mp.clan_create_log from anon, authenticated, public;

-- Public may list clans and see who is in them (names/roles only, via RPCs). No direct writes.
create policy "clans readable" on atq_mp.clans for select to anon, authenticated using (true);
create policy "clan members readable" on atq_mp.clan_members for select to anon, authenticated using (true);
-- Invites/requests: only the people involved (plus we still prefer RPCs)
create policy "own clan invites" on atq_mp.clan_invites for select to authenticated
  using (invitee_id = auth.uid() or inviter_id = auth.uid()
    or exists (select 1 from atq_mp.clan_members m where m.clan_id = clan_invites.clan_id and m.user_id = auth.uid() and m.role in ('leader','officer')));
create policy "own clan requests" on atq_mp.clan_requests for select to authenticated
  using (user_id = auth.uid()
    or exists (select 1 from atq_mp.clan_members m where m.clan_id = clan_requests.clan_id and m.user_id = auth.uid() and m.role in ('leader','officer')));

grant select on atq_mp.clans, atq_mp.clan_members to anon, authenticated;
grant select on atq_mp.clan_invites, atq_mp.clan_requests to authenticated;

-- ---------- helpers ----------
create or replace function atq_mp.clan_is_bad(t text) returns boolean
language plpgsql immutable set search_path = pg_catalog as $$
declare n text; w text;
  words text[] := array[
    'fuck','fck','fuk','shit','sh1t','asshole','bitch','btch','cunt','nigger','nigga','faggot','fag',
    'retard','rape','rapist','porn','p0rn','nsfw','kkk','slur','whore','slut','dick','d1ck','cock',
    'pussy','penis','vagina','anal','cum','jizz','bastard','douche','twat','wank','horny','onlyfans',
    'pedo','paedo','molest','nazi','hitler','goebbels','swastika','killmyself','kys'
  ];
begin
  n := lower(regexp_replace(coalesce(t,''), '[^a-z0-9]', '', 'g'));
  n := replace(replace(replace(replace(replace(replace(replace(replace(n,'0','o'),'1','i'),'3','e'),'4','a'),'5','s'),'7','t'),'@','a'),'$','s');
  if n is null or n = '' then return false; end if;
  foreach w in array words loop
    if n = w or position(w in n) > 0 then
      -- allow longer innocent words that only contain a short stem (none of the stems above are that short except 'fag' / 'cum' / 'kys')
      if w in ('fag','cum') and n <> w and n not like w || '%' and n not like '%' || w then
        continue;
      end if;
      return true;
    end if;
  end loop;
  return false;
end $$;

create or replace function atq_mp.clan_clean_name(n text) returns text
language plpgsql immutable set search_path = pg_catalog as $$
declare s text;
begin
  s := btrim(regexp_replace(regexp_replace(coalesce(n,''), '[^[:alnum:] _.\-]', '', 'g'), '\s+', ' ', 'g'));
  s := left(s, 24);
  if char_length(s) < 3 then raise exception 'rejected: name length' using errcode = '22023'; end if;
  if atq_mp.clan_is_bad(s) then raise exception 'rejected: name not allowed' using errcode = '22023'; end if;
  return s;
end $$;

create or replace function atq_mp.clan_clean_tag(t text) returns text
language plpgsql immutable set search_path = pg_catalog as $$
declare s text;
begin
  s := upper(regexp_replace(coalesce(t,''), '[^A-Za-z0-9]', '', 'g'));
  s := left(s, 5);
  if char_length(s) < 2 then raise exception 'rejected: tag length' using errcode = '22023'; end if;
  if s in ('ADM','ADMIN','MOD','MODS','STAFF','DEV','GM','SYS','ATQ','NULL','CSS') then
    raise exception 'rejected: tag reserved' using errcode = '22023';
  end if;
  if atq_mp.clan_is_bad(s) then raise exception 'rejected: tag not allowed' using errcode = '22023'; end if;
  return s;
end $$;

create or replace function atq_mp.clan_clean_banner(b jsonb) returns jsonb
language plpgsql immutable set search_path = pg_catalog as $$
declare
  shapes text[] := array['standard','swallowtail','gonfalon','shield','pennant','square','rounded','scallop'];
  patterns text[] := array['solid','stripes-h','stripes-v','stripes-d','chevron','split-h','split-v','split-d','cross','saltire','quarters','rays','diamonds','zigzag'];
  emblems text[] := array['skull','bunny','flame','wolf','crown','crossbones','star','hazard','moon','raven','axe','shield','tree','bolt','heart','eye','sun','mountain'];
  trims text[] := array['none','thin','thick','rope'];
  hx text := '^#[0-9a-fA-F]{6}$';
  o jsonb := '{}'::jsonb;
  pick text;
begin
  if b is null or jsonb_typeof(b) <> 'object' then b := '{}'::jsonb; end if;
  if pg_column_size(b) > 2048 then raise exception 'rejected: banner too big' using errcode = '22023'; end if;
  pick := coalesce(b->>'shape','standard'); if not (pick = any (shapes)) then pick := 'standard'; end if; o := o || jsonb_build_object('shape', pick);
  pick := coalesce(b->>'pattern','solid'); if not (pick = any (patterns)) then pick := 'solid'; end if; o := o || jsonb_build_object('pattern', pick);
  pick := coalesce(b->>'emblem','star'); if not (pick = any (emblems)) then pick := 'star'; end if; o := o || jsonb_build_object('emblem', pick);
  pick := coalesce(b->>'trimStyle','thin'); if not (pick = any (trims)) then pick := 'thin'; end if; o := o || jsonb_build_object('trimStyle', pick);
  pick := coalesce(b->>'bg','#1e4d3a'); if pick !~ hx then pick := '#1e4d3a'; end if; o := o || jsonb_build_object('bg', lower(pick));
  pick := coalesce(b->>'bg2','#d9b44a'); if pick !~ hx then pick := '#d9b44a'; end if; o := o || jsonb_build_object('bg2', lower(pick));
  pick := coalesce(b->>'emblemColor','#f4f0e6'); if pick !~ hx then pick := '#f4f0e6'; end if; o := o || jsonb_build_object('emblemColor', lower(pick));
  pick := coalesce(b->>'trim','#d9b44a'); if pick !~ hx then pick := '#d9b44a'; end if; o := o || jsonb_build_object('trim', lower(pick));
  o := o || jsonb_build_object('v', 1);
  return o;
end $$;

create or replace function atq_mp.clan_role(p_clan uuid, p_user uuid default auth.uid()) returns text
language sql stable set search_path = atq_mp, pg_catalog as $$
  select role from clan_members where clan_id = p_clan and user_id = p_user
$$;

create or replace function atq_mp.clan_is_officer(p_clan uuid, p_user uuid default auth.uid()) returns boolean
language sql stable set search_path = atq_mp, pg_catalog as $$
  select exists (select 1 from clan_members where clan_id = p_clan and user_id = p_user and role in ('leader','officer'))
$$;

create or replace function atq_mp.clan_need_auth() returns uuid
language plpgsql stable set search_path = pg_catalog as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'sign in first' using errcode = '42501'; end if;
  return uid;
end $$;

-- public row shape for a clan (no internal ids leaked beyond clan id + leader id)
create or replace function atq_mp.clan_public_row(c atq_mp.clans) returns json
language sql stable set search_path = atq_mp, public, pg_catalog as $$
  select json_build_object(
    'id', c.id, 'name', c.name, 'tag', c.tag, 'banner', c.banner, 'join_mode', c.join_mode,
    'leader_id', c.leader_id, 'members', c.member_count, 'created_at', c.created_at,
    'score_kills', coalesce((
      select sum(coalesce(lb.total_kills, 0)) from clan_members m
      left join leaderboard lb on lb.pid = m.user_id
      where m.clan_id = c.id), 0),
    'score_wave', coalesce((
      select coalesce(max(lb.best_wave), 0) from clan_members m
      left join leaderboard lb on lb.pid = m.user_id
      where m.clan_id = c.id), 0),
    'score_hs', coalesce((
      select sum(coalesce(lb.total_hs, 0)) from clan_members m
      left join leaderboard lb on lb.pid = m.user_id
      where m.clan_id = c.id), 0)
  )
$$;

create or replace function atq_mp.clan_members_json(p_clan uuid) returns json
language sql stable set search_path = atq_mp, public, pg_catalog as $$
  select coalesce(json_agg(json_build_object(
    'id', m.user_id, 'name', coalesce(nullif(p.display_name,''), 'Survivor'),
    'avatar', p.avatar_url, 'role', m.role, 'joined_at', m.joined_at,
    'kills', coalesce(lb.total_kills, 0), 'wave', coalesce(lb.best_wave, 0), 'hs', coalesce(lb.total_hs, 0)
  ) order by case m.role when 'leader' then 0 when 'officer' then 1 else 2 end, m.joined_at), '[]'::json)
  from clan_members m
  left join profiles p on p.user_id = m.user_id
  left join leaderboard lb on lb.pid = m.user_id
  where m.clan_id = p_clan
$$;

-- keep member_count in sync
create or replace function atq_mp.clan_touch_count() returns trigger
language plpgsql security definer set search_path = atq_mp, pg_catalog as $$
begin
  if tg_op = 'INSERT' then
    update clans set member_count = (select count(*) from clan_members where clan_id = new.clan_id), updated_at = now() where id = new.clan_id;
    return new;
  elsif tg_op = 'DELETE' then
    update clans set member_count = (select count(*) from clan_members where clan_id = old.clan_id), updated_at = now() where id = old.clan_id;
    return old;
  else
    return new;
  end if;
end $$;
drop trigger if exists clan_touch_count on atq_mp.clan_members;
create trigger clan_touch_count after insert or delete on atq_mp.clan_members
  for each row execute function atq_mp.clan_touch_count();

-- ---------- RPCs ----------
create or replace function public.clan_create(p_name text, p_tag text, p_banner jsonb default '{}'::jsonb, p_join text default 'request')
returns json language plpgsql security definer set search_path = atq_mp, public, pg_catalog as $$
declare uid uuid; nm text; tg text; bn jsonb; jm text; c clans;
begin
  uid := atq_mp.clan_need_auth();
  nm := atq_mp.clan_clean_name(p_name); tg := atq_mp.clan_clean_tag(p_tag); bn := atq_mp.clan_clean_banner(p_banner);
  jm := case when p_join = 'invite' then 'invite' else 'request' end;
  if exists (select 1 from clan_members where user_id = uid) then raise exception 'rejected: already in a clan' using errcode = '22023'; end if;
  if (select count(*) from clan_create_log where user_id = uid and created_at > now() - interval '1 day') >= 3 then
    raise exception 'rejected: create limit' using errcode = '22023';
  end if;
  if exists (select 1 from clans where lower(name) = lower(nm)) then raise exception 'rejected: name taken' using errcode = '23505'; end if;
  if exists (select 1 from clans where upper(tag) = tg) then raise exception 'rejected: tag taken' using errcode = '23505'; end if;
  insert into clans (name, tag, banner, join_mode, leader_id, member_count) values (nm, tg, bn, jm, uid, 0) returning * into c;
  insert into clan_members (clan_id, user_id, role) values (c.id, uid, 'leader');
  insert into clan_create_log (user_id) values (uid);
  select * into c from clans where id = c.id;
  return json_build_object('clan', atq_mp.clan_public_row(c), 'members', atq_mp.clan_members_json(c.id), 'role', 'leader');
end $$;

create or replace function public.clan_update(p_id uuid, p_name text default null, p_tag text default null, p_banner jsonb default null, p_join text default null)
returns json language plpgsql security definer set search_path = atq_mp, public, pg_catalog as $$
declare uid uuid; r text; c clans; nm text; tg text;
begin
  uid := atq_mp.clan_need_auth();
  select * into c from clans where id = p_id for update;
  if not found then raise exception 'rejected: no clan' using errcode = 'P0002'; end if;
  r := atq_mp.clan_role(p_id, uid);
  if r is null or r not in ('leader','officer') then raise exception 'rejected: officers only' using errcode = '42501'; end if;
  -- name / tag / join mode: leader only; banner: officers too
  if (p_name is not null or p_tag is not null or p_join is not null) and r <> 'leader' then
    raise exception 'rejected: leader only' using errcode = '42501';
  end if;
  if p_name is not null then
    nm := atq_mp.clan_clean_name(p_name);
    if exists (select 1 from clans where lower(name) = lower(nm) and id <> p_id) then raise exception 'rejected: name taken' using errcode = '23505'; end if;
    c.name := nm;
  end if;
  if p_tag is not null then
    tg := atq_mp.clan_clean_tag(p_tag);
    if exists (select 1 from clans where upper(tag) = tg and id <> p_id) then raise exception 'rejected: tag taken' using errcode = '23505'; end if;
    c.tag := tg;
  end if;
  if p_banner is not null then c.banner := atq_mp.clan_clean_banner(p_banner); end if;
  if p_join is not null then c.join_mode := case when p_join = 'invite' then 'invite' else 'request' end; end if;
  update clans set name = c.name, tag = c.tag, banner = c.banner, join_mode = c.join_mode, updated_at = now() where id = p_id returning * into c;
  return atq_mp.clan_public_row(c);
end $$;

create or replace function public.clan_disband(p_id uuid)
returns json language plpgsql security definer set search_path = atq_mp, public, pg_catalog as $$
declare uid uuid; c clans;
begin
  uid := atq_mp.clan_need_auth();
  select * into c from clans where id = p_id for update;
  if not found then raise exception 'rejected: no clan' using errcode = 'P0002'; end if;
  if c.leader_id <> uid then raise exception 'rejected: leader only' using errcode = '42501'; end if;
  delete from clans where id = p_id;
  return json_build_object('ok', true, 'id', p_id);
end $$;

create or replace function public.clan_leave(p_id uuid)
returns json language plpgsql security definer set search_path = atq_mp, public, pg_catalog as $$
declare uid uuid; r text; c clans;
begin
  uid := atq_mp.clan_need_auth();
  select * into c from clans where id = p_id for update;
  if not found then raise exception 'rejected: no clan' using errcode = 'P0002'; end if;
  r := atq_mp.clan_role(p_id, uid);
  if r is null then raise exception 'rejected: not a member' using errcode = '42501'; end if;
  if r = 'leader' then raise exception 'rejected: transfer or disband first' using errcode = '22023'; end if;
  delete from clan_members where clan_id = p_id and user_id = uid;
  return json_build_object('ok', true);
end $$;

create or replace function public.clan_transfer(p_id uuid, p_user uuid)
returns json language plpgsql security definer set search_path = atq_mp, public, pg_catalog as $$
declare uid uuid; c clans; tr text;
begin
  uid := atq_mp.clan_need_auth();
  select * into c from clans where id = p_id for update;
  if not found then raise exception 'rejected: no clan' using errcode = 'P0002'; end if;
  if c.leader_id <> uid then raise exception 'rejected: leader only' using errcode = '42501'; end if;
  if p_user is null or p_user = uid then raise exception 'rejected: pick a member' using errcode = '22023'; end if;
  select role into tr from clan_members where clan_id = p_id and user_id = p_user;
  if tr is null then raise exception 'rejected: not a member' using errcode = '22023'; end if;
  update clan_members set role = 'officer' where clan_id = p_id and user_id = uid;
  update clan_members set role = 'leader' where clan_id = p_id and user_id = p_user;
  update clans set leader_id = p_user, updated_at = now() where id = p_id returning * into c;
  return json_build_object('clan', atq_mp.clan_public_row(c), 'members', atq_mp.clan_members_json(c.id));
end $$;

create or replace function public.clan_kick(p_id uuid, p_user uuid)
returns json language plpgsql security definer set search_path = atq_mp, public, pg_catalog as $$
declare uid uuid; r text; tr text;
begin
  uid := atq_mp.clan_need_auth();
  if p_user is null or p_user = uid then raise exception 'rejected: cannot kick yourself' using errcode = '22023'; end if;
  r := atq_mp.clan_role(p_id, uid); tr := atq_mp.clan_role(p_id, p_user);
  if r is null or r not in ('leader','officer') then raise exception 'rejected: officers only' using errcode = '42501'; end if;
  if tr is null then raise exception 'rejected: not a member' using errcode = '22023'; end if;
  if tr = 'leader' then raise exception 'rejected: cannot kick the leader' using errcode = '42501'; end if;
  if tr = 'officer' and r <> 'leader' then raise exception 'rejected: leader only' using errcode = '42501'; end if;
  delete from clan_members where clan_id = p_id and user_id = p_user;
  -- cancel their pending invites/requests involving this clan
  update clan_invites set status = 'cancelled', resolved_at = now() where clan_id = p_id and invitee_id = p_user and status = 'pending';
  update clan_requests set status = 'cancelled', resolved_at = now() where clan_id = p_id and user_id = p_user and status = 'pending';
  return json_build_object('ok', true, 'members', atq_mp.clan_members_json(p_id));
end $$;

create or replace function public.clan_promote(p_id uuid, p_user uuid, p_role text)
returns json language plpgsql security definer set search_path = atq_mp, public, pg_catalog as $$
declare uid uuid; r text; tr text; nr text;
begin
  uid := atq_mp.clan_need_auth();
  r := atq_mp.clan_role(p_id, uid);
  if r <> 'leader' then raise exception 'rejected: leader only' using errcode = '42501'; end if;
  if p_user is null or p_user = uid then raise exception 'rejected: pick a member' using errcode = '22023'; end if;
  tr := atq_mp.clan_role(p_id, p_user);
  if tr is null or tr = 'leader' then raise exception 'rejected: not a member' using errcode = '22023'; end if;
  nr := case when p_role = 'officer' then 'officer' else 'member' end;
  update clan_members set role = nr where clan_id = p_id and user_id = p_user;
  return json_build_object('ok', true, 'members', atq_mp.clan_members_json(p_id));
end $$;

create or replace function public.clan_invite(p_id uuid, p_user uuid)
returns json language plpgsql security definer set search_path = atq_mp, public, pg_catalog as $$
declare uid uuid; c clans; inv clan_invites;
begin
  uid := atq_mp.clan_need_auth();
  select * into c from clans where id = p_id for update;
  if not found then raise exception 'rejected: no clan' using errcode = 'P0002'; end if;
  if not atq_mp.clan_is_officer(p_id, uid) then raise exception 'rejected: officers only' using errcode = '42501'; end if;
  if p_user is null or p_user = uid then raise exception 'rejected: pick a player' using errcode = '22023'; end if;
  if exists (select 1 from clan_members where user_id = p_user) then raise exception 'rejected: already in a clan' using errcode = '22023'; end if;
  if c.member_count >= 30 then raise exception 'rejected: clan full' using errcode = '22023'; end if;
  if exists (select 1 from clan_invites where clan_id = p_id and invitee_id = p_user and status = 'pending') then
    raise exception 'rejected: already invited' using errcode = '22023';
  end if;
  if (select count(*) from clan_invites where clan_id = p_id and inviter_id = uid and created_at > now() - interval '1 minute') >= 10 then
    raise exception 'rejected: too fast' using errcode = '22023';
  end if;
  insert into clan_invites (clan_id, inviter_id, invitee_id) values (p_id, uid, p_user) returning * into inv;
  return json_build_object('id', inv.id, 'clan_id', p_id, 'invitee_id', p_user, 'status', 'pending');
end $$;

create or replace function public.clan_invite_by_name(p_id uuid, p_name text)
returns json language plpgsql security definer set search_path = atq_mp, public, pg_catalog as $$
declare q text; hits uuid[];
begin
  perform atq_mp.clan_need_auth();
  q := btrim(coalesce(p_name,''));
  if char_length(q) < 2 then raise exception 'rejected: name length' using errcode = '22023'; end if;
  select array_agg(user_id) into hits from (
    select user_id from profiles where display_name ilike q limit 5
  ) s;
  if hits is null or array_length(hits, 1) is null then raise exception 'rejected: player not found' using errcode = 'P0002'; end if;
  if array_length(hits, 1) > 1 then
    return json_build_object('ambiguous', true, 'players', (
      select json_agg(json_build_object('id', p.user_id, 'name', p.display_name, 'avatar', p.avatar_url))
      from profiles p where p.user_id = any (hits)
    ));
  end if;
  return public.clan_invite(p_id, hits[1]);
end $$;

create or replace function public.clan_invite_respond(p_invite uuid, p_accept boolean)
returns json language plpgsql security definer set search_path = atq_mp, public, pg_catalog as $$
declare uid uuid; inv clan_invites; c clans;
begin
  uid := atq_mp.clan_need_auth();
  select * into inv from clan_invites where id = p_invite for update;
  if not found or inv.invitee_id <> uid then raise exception 'rejected: not your invite' using errcode = '42501'; end if;
  if inv.status <> 'pending' then raise exception 'rejected: already resolved' using errcode = '22023'; end if;
  if not coalesce(p_accept, false) then
    update clan_invites set status = 'declined', resolved_at = now() where id = p_invite;
    return json_build_object('ok', true, 'status', 'declined');
  end if;
  if exists (select 1 from clan_members where user_id = uid) then raise exception 'rejected: already in a clan' using errcode = '22023'; end if;
  select * into c from clans where id = inv.clan_id for update;
  if not found then raise exception 'rejected: no clan' using errcode = 'P0002'; end if;
  if c.member_count >= 30 then raise exception 'rejected: clan full' using errcode = '22023'; end if;
  insert into clan_members (clan_id, user_id, role) values (c.id, uid, 'member');
  update clan_invites set status = 'accepted', resolved_at = now() where id = p_invite;
  update clan_requests set status = 'cancelled', resolved_at = now() where user_id = uid and status = 'pending';
  update clan_invites set status = 'cancelled', resolved_at = now() where invitee_id = uid and status = 'pending' and id <> p_invite;
  select * into c from clans where id = c.id;
  return json_build_object('ok', true, 'status', 'accepted', 'clan', atq_mp.clan_public_row(c), 'members', atq_mp.clan_members_json(c.id), 'role', 'member');
end $$;

create or replace function public.clan_invite_cancel(p_invite uuid)
returns json language plpgsql security definer set search_path = atq_mp, public, pg_catalog as $$
declare uid uuid; inv clan_invites;
begin
  uid := atq_mp.clan_need_auth();
  select * into inv from clan_invites where id = p_invite for update;
  if not found then raise exception 'rejected: no invite' using errcode = 'P0002'; end if;
  if inv.status <> 'pending' then raise exception 'rejected: already resolved' using errcode = '22023'; end if;
  if inv.inviter_id <> uid and not atq_mp.clan_is_officer(inv.clan_id, uid) then
    raise exception 'rejected: officers only' using errcode = '42501';
  end if;
  update clan_invites set status = 'cancelled', resolved_at = now() where id = p_invite;
  return json_build_object('ok', true);
end $$;

create or replace function public.clan_request(p_id uuid)
returns json language plpgsql security definer set search_path = atq_mp, public, pg_catalog as $$
declare uid uuid; c clans; req clan_requests;
begin
  uid := atq_mp.clan_need_auth();
  select * into c from clans where id = p_id for update;
  if not found then raise exception 'rejected: no clan' using errcode = 'P0002'; end if;
  if exists (select 1 from clan_members where user_id = uid) then raise exception 'rejected: already in a clan' using errcode = '22023'; end if;
  if c.join_mode <> 'request' then raise exception 'rejected: invite only' using errcode = '42501'; end if;
  if c.member_count >= 30 then raise exception 'rejected: clan full' using errcode = '22023'; end if;
  if exists (select 1 from clan_requests where clan_id = p_id and user_id = uid and status = 'pending') then
    raise exception 'rejected: already requested' using errcode = '22023';
  end if;
  if (select count(*) from clan_requests where user_id = uid and created_at > now() - interval '1 minute') >= 5 then
    raise exception 'rejected: too fast' using errcode = '22023';
  end if;
  insert into clan_requests (clan_id, user_id) values (p_id, uid) returning * into req;
  return json_build_object('id', req.id, 'clan_id', p_id, 'status', 'pending');
end $$;

create or replace function public.clan_request_respond(p_request uuid, p_accept boolean)
returns json language plpgsql security definer set search_path = atq_mp, public, pg_catalog as $$
declare uid uuid; req clan_requests; c clans;
begin
  uid := atq_mp.clan_need_auth();
  select * into req from clan_requests where id = p_request for update;
  if not found then raise exception 'rejected: no request' using errcode = 'P0002'; end if;
  if req.status <> 'pending' then raise exception 'rejected: already resolved' using errcode = '22023'; end if;
  if req.user_id = uid and not coalesce(p_accept, false) then
    update clan_requests set status = 'cancelled', resolved_at = now() where id = p_request;
    return json_build_object('ok', true, 'status', 'cancelled');
  end if;
  if not atq_mp.clan_is_officer(req.clan_id, uid) then raise exception 'rejected: officers only' using errcode = '42501'; end if;
  if not coalesce(p_accept, false) then
    update clan_requests set status = 'declined', resolved_at = now() where id = p_request;
    return json_build_object('ok', true, 'status', 'declined');
  end if;
  if exists (select 1 from clan_members where user_id = req.user_id) then
    update clan_requests set status = 'cancelled', resolved_at = now() where id = p_request;
    raise exception 'rejected: already in a clan' using errcode = '22023';
  end if;
  select * into c from clans where id = req.clan_id for update;
  if not found then raise exception 'rejected: no clan' using errcode = 'P0002'; end if;
  if c.member_count >= 30 then raise exception 'rejected: clan full' using errcode = '22023'; end if;
  insert into clan_members (clan_id, user_id, role) values (c.id, req.user_id, 'member');
  update clan_requests set status = 'accepted', resolved_at = now() where id = p_request;
  update clan_invites set status = 'cancelled', resolved_at = now() where invitee_id = req.user_id and status = 'pending';
  update clan_requests set status = 'cancelled', resolved_at = now() where user_id = req.user_id and status = 'pending' and id <> p_request;
  return json_build_object('ok', true, 'status', 'accepted', 'members', atq_mp.clan_members_json(c.id));
end $$;

create or replace function public.clan_get(p_id uuid)
returns json language plpgsql stable security definer set search_path = atq_mp, public, pg_catalog as $$
declare c clans; uid uuid := auth.uid();
begin
  select * into c from clans where id = p_id;
  if not found then return null; end if;
  return json_build_object(
    'clan', atq_mp.clan_public_row(c),
    'members', atq_mp.clan_members_json(c.id),
    'role', case when uid is null then null else atq_mp.clan_role(c.id, uid) end
  );
end $$;

create or replace function public.clan_mine()
returns json language plpgsql stable security definer set search_path = atq_mp, public, pg_catalog as $$
declare uid uuid := auth.uid(); mid uuid; c clans; r text;
begin
  if uid is null then return json_build_object('signed_in', false, 'clan', null, 'inbox', '[]'::json); end if;
  select clan_id, role into mid, r from clan_members where user_id = uid;
  if mid is not null then select * into c from clans where id = mid; end if;
  return json_build_object(
    'signed_in', true,
    'role', r,
    'clan', case when c.id is null then null else atq_mp.clan_public_row(c) end,
    'members', case when c.id is null then '[]'::json else atq_mp.clan_members_json(c.id) end,
    'inbox', coalesce((
      select json_agg(json_build_object(
        'id', i.id, 'clan_id', i.clan_id, 'name', cl.name, 'tag', cl.tag, 'banner', cl.banner,
        'inviter', coalesce(p.display_name, 'Survivor'), 'created_at', i.created_at
      ) order by i.created_at desc)
      from clan_invites i
      join clans cl on cl.id = i.clan_id
      left join profiles p on p.user_id = i.inviter_id
      where i.invitee_id = uid and i.status = 'pending'
    ), '[]'::json),
    'outbox', case when r in ('leader','officer') then coalesce((
      select json_agg(json_build_object(
        'id', i.id, 'invitee_id', i.invitee_id, 'name', coalesce(p.display_name, 'Survivor'),
        'avatar', p.avatar_url, 'created_at', i.created_at
      ) order by i.created_at desc)
      from clan_invites i
      left join profiles p on p.user_id = i.invitee_id
      where i.clan_id = c.id and i.status = 'pending'
    ), '[]'::json) else '[]'::json end,
    'requests', case when r in ('leader','officer') then coalesce((
      select json_agg(json_build_object(
        'id', q.id, 'user_id', q.user_id, 'name', coalesce(p.display_name, 'Survivor'),
        'avatar', p.avatar_url, 'created_at', q.created_at
      ) order by q.created_at)
      from clan_requests q
      left join profiles p on p.user_id = q.user_id
      where q.clan_id = c.id and q.status = 'pending'
    ), '[]'::json) else '[]'::json end,
    'my_request', (
      select json_build_object('id', q.id, 'clan_id', q.clan_id, 'name', cl.name, 'tag', cl.tag, 'created_at', q.created_at)
      from clan_requests q join clans cl on cl.id = q.clan_id
      where q.user_id = uid and q.status = 'pending' limit 1
    )
  );
end $$;

create or replace function public.clan_search(p_q text default '', p_limit int default 30)
returns json language plpgsql stable security definer set search_path = atq_mp, public, pg_catalog as $$
declare q text := btrim(coalesce(p_q,'')); n int := least(greatest(coalesce(p_limit, 30), 1), 50);
begin
  if char_length(q) > 24 then q := left(q, 24); end if;
  return coalesce((
    select json_agg(s.j)
    from (
      select atq_mp.clan_public_row(c) as j
      from clans c
      where q = '' or c.name ilike '%' || q || '%' or c.tag ilike '%' || q || '%'
      order by c.member_count desc, c.created_at
      limit n
    ) s
  ), '[]'::json);
end $$;

-- Clan leaderboard: sum of real member Survival scores. Never invents scores.
create or replace function public.clan_board(p_sort text default 'kills', p_limit int default 50, p_me uuid default null)
returns json language sql stable security definer set search_path = atq_mp, public, pg_catalog as $$
  with scored as (
    select c.id, c.name, c.tag, c.banner, c.member_count,
      coalesce(sum(lb.total_kills), 0)::int as score_kills,
      coalesce(max(lb.best_wave), 0)::int as score_wave,
      coalesce(sum(lb.total_hs), 0)::int as score_hs
    from clans c
    left join clan_members m on m.clan_id = c.id
    left join leaderboard lb on lb.pid = m.user_id
    group by c.id, c.name, c.tag, c.banner, c.member_count
  ), ranked as (
    select *, row_number() over (
      order by case p_sort when 'wave' then score_wave when 'hs' then score_hs else score_kills end desc,
               case p_sort when 'kills' then score_wave else score_kills end desc, name
    ) as rank
    from scored
  ), mine as (
    select cm.clan_id from clan_members cm where cm.user_id = coalesce(auth.uid(), p_me) limit 1
  )
  select json_build_object(
    'rows', coalesce((
      select json_agg(json_build_object(
        'rank', r.rank, 'id', r.id, 'name', r.name, 'tag', r.tag, 'banner', r.banner,
        'members', r.member_count, 'score_kills', r.score_kills, 'score_wave', r.score_wave, 'score_hs', r.score_hs,
        'me', r.id = (select clan_id from mine)
      ) order by r.rank)
      from ranked r where r.rank <= least(greatest(coalesce(p_limit, 50), 1), 100)
    ), '[]'::json),
    'me', (select json_build_object(
      'rank', r.rank, 'id', r.id, 'name', r.name, 'tag', r.tag, 'banner', r.banner,
      'members', r.member_count, 'score_kills', r.score_kills, 'score_wave', r.score_wave, 'score_hs', r.score_hs
    ) from ranked r where r.id = (select clan_id from mine)),
    'clans', (select count(*) from ranked)
  )
$$;

-- For town nametags: resolve tags + banners for a list of user ids (Google accounts).
create or replace function public.clan_tags(p_ids uuid[] default '{}'::uuid[])
returns json language sql stable security definer set search_path = atq_mp, public, pg_catalog as $$
  select coalesce(json_agg(json_build_object(
    'user_id', m.user_id, 'id', c.id, 'tag', c.tag, 'name', c.name, 'banner', c.banner, 'role', m.role
  )), '[]'::json)
  from clan_members m
  join clans c on c.id = m.clan_id
  where m.user_id = any (coalesce(p_ids, '{}'::uuid[]))
     or m.user_id = auth.uid()
$$;

-- Grants
do $$
declare fn text;
begin
  foreach fn in array array[
    'clan_create(text,text,jsonb,text)',
    'clan_update(uuid,text,text,jsonb,text)',
    'clan_disband(uuid)',
    'clan_leave(uuid)',
    'clan_transfer(uuid,uuid)',
    'clan_kick(uuid,uuid)',
    'clan_promote(uuid,uuid,text)',
    'clan_invite(uuid,uuid)',
    'clan_invite_by_name(uuid,text)',
    'clan_invite_respond(uuid,boolean)',
    'clan_invite_cancel(uuid)',
    'clan_request(uuid)',
    'clan_request_respond(uuid,boolean)',
    'clan_get(uuid)',
    'clan_mine()',
    'clan_search(text,int)',
    'clan_board(text,int,uuid)',
    'clan_tags(uuid[])'
  ] loop
    execute 'revoke all on function public.' || fn || ' from public';
  end loop;
end $$;

grant execute on function public.clan_get(uuid), public.clan_search(text,int), public.clan_board(text,int,uuid), public.clan_tags(uuid[]) to anon, authenticated;
grant execute on function
  public.clan_create(text,text,jsonb,text),
  public.clan_update(uuid,text,text,jsonb,text),
  public.clan_disband(uuid),
  public.clan_leave(uuid),
  public.clan_transfer(uuid,uuid),
  public.clan_kick(uuid,uuid),
  public.clan_promote(uuid,uuid,text),
  public.clan_invite(uuid,uuid),
  public.clan_invite_by_name(uuid,text),
  public.clan_invite_respond(uuid,boolean),
  public.clan_invite_cancel(uuid),
  public.clan_request(uuid),
  public.clan_request_respond(uuid,boolean),
  public.clan_mine()
to authenticated;
