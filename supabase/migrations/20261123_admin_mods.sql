-- Admin + moderators for After the Quiet online play.
-- REUSES atq_mp.user_roles (do not create a second player_roles table).
-- Additive only: no drops of existing tables or live data.
-- Keem (lillykemoy1@gmail.com, already on atq_mp.admin_emails and confirmed
-- as the admin account) stays the only admin. Moderators are granted by him.

-- ---------- extend roles ----------
do $$
declare r record;
begin
  for r in
    select c.conname
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'atq_mp' and t.relname = 'user_roles' and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ~* 'role'
  loop
    execute format('alter table atq_mp.user_roles drop constraint %I', r.conname);
  end loop;
end $$;
alter table atq_mp.user_roles add constraint user_roles_role_check
  check (role in ('player','moderator','admin'));
alter table atq_mp.user_roles add column if not exists granted_by uuid references auth.users(id) on delete set null;

create or replace function atq_mp.is_admin() returns boolean
language sql stable security definer set search_path = atq_mp, pg_catalog as $$
  select exists (select 1 from user_roles where user_id = auth.uid() and role = 'admin')
$$;

create or replace function atq_mp.is_mod() returns boolean
language sql stable security definer set search_path = atq_mp, pg_catalog as $$
  select exists (select 1 from user_roles where user_id = auth.uid() and role in ('admin','moderator'))
$$;

create or replace function atq_mp.role_of(p_user uuid) returns text
language sql stable security definer set search_path = atq_mp, pg_catalog as $$
  select coalesce((select role from user_roles where user_id = p_user), 'player')
$$;

-- Only addresses on atq_mp.admin_emails (currently Keem) may hold role = admin.
-- The admin row cannot be demoted through this table.
create or replace function atq_mp.user_roles_guard() returns trigger
language plpgsql security definer set search_path = atq_mp, pg_catalog as $$
begin
  if tg_op = 'UPDATE' and old.role = 'admin' and new.role is distinct from 'admin' then
    raise exception 'rejected: admin cannot be demoted' using errcode = '42501';
  end if;
  if new.role = 'admin' and not exists (
    select 1 from admin_emails a
    join auth.users u on lower(u.email) = lower(a.email)
    where u.id = new.user_id
  ) then
    raise exception 'rejected: admin is reserved' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists user_roles_guard on atq_mp.user_roles;
create trigger user_roles_guard before insert or update on atq_mp.user_roles
  for each row execute function atq_mp.user_roles_guard();

create or replace function atq_mp.handle_new_user() returns trigger
language plpgsql security definer set search_path = atq_mp, pg_catalog as $$
declare r text;
begin
  r := case when exists (select 1 from admin_emails a where lower(a.email) = lower(new.email)) then 'admin' else 'player' end;
  insert into profiles (user_id, display_name)
    values (new.id, greatest(left(coalesce(new.raw_user_meta_data->>'name', 'Survivor'), 20), 'Survivor'))
    on conflict do nothing;
  insert into user_roles (user_id, role, granted_by)
    values (new.id, r, case when r = 'admin' then new.id else null end)
    on conflict (user_id) do update
      set role = excluded.role,
          granted_by = coalesce(user_roles.granted_by, excluded.granted_by)
      where user_roles.role not in ('admin','moderator') or excluded.role = 'admin';
  return new;
end $$;

-- ---------- new tables ----------
create table if not exists atq_mp.mod_audit (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null,
  action text not null,
  target_user uuid,
  target_type text,
  target_id uuid,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists mod_audit_at_idx on atq_mp.mod_audit (created_at desc);

create table if not exists atq_mp.bans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reason text not null default '',
  banned_by uuid not null,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists bans_user_idx on atq_mp.bans (user_id, ends_at);

create table if not exists atq_mp.mutes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reason text not null default '',
  muted_by uuid not null,
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists mutes_user_idx on atq_mp.mutes (user_id, ends_at);

create table if not exists atq_mp.kicks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  room text,
  reason text not null default '',
  kicked_by uuid not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '2 minutes')
);
create index if not exists kicks_user_idx on atq_mp.kicks (user_id, expires_at);

create table if not exists atq_mp.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null,
  target_type text not null check (target_type in ('player','chat','name','banner','clan_name')),
  target_user uuid,
  target_chat uuid,
  target_clan uuid,
  reason text not null default '',
  detail text not null default '',
  status text not null default 'open' check (status in ('open','resolved','dismissed')),
  resolved_by uuid,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists reports_status_idx on atq_mp.reports (status, created_at desc);
create index if not exists reports_reporter_idx on atq_mp.reports (reporter_id, created_at desc);

create table if not exists atq_mp.chat_messages (
  id uuid primary key default gen_random_uuid(),
  room text not null,
  user_id uuid not null,
  name text not null default 'Survivor',
  body text not null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by uuid
);
create index if not exists chat_room_idx on atq_mp.chat_messages (room, created_at desc);

alter table atq_mp.mod_audit enable row level security;
alter table atq_mp.bans enable row level security;
alter table atq_mp.mutes enable row level security;
alter table atq_mp.kicks enable row level security;
alter table atq_mp.reports enable row level security;
alter table atq_mp.chat_messages enable row level security;
revoke all on atq_mp.mod_audit, atq_mp.bans, atq_mp.mutes, atq_mp.kicks, atq_mp.reports, atq_mp.chat_messages
  from public, anon, authenticated;

-- ---------- helpers ----------
create or replace function atq_mp.is_banned(p_user uuid) returns boolean
language sql stable security definer set search_path = atq_mp, pg_catalog as $$
  select exists (
    select 1 from bans where user_id = p_user and (ends_at is null or ends_at > now())
  )
$$;

create or replace function atq_mp.is_muted(p_user uuid) returns boolean
language sql stable security definer set search_path = atq_mp, pg_catalog as $$
  select exists (
    select 1 from mutes where user_id = p_user and ends_at > now()
  )
$$;

create or replace function atq_mp.active_ban(p_user uuid)
returns table(reason text, ends_at timestamptz)
language sql stable security definer set search_path = atq_mp, pg_catalog as $$
  select b.reason, b.ends_at from bans b
  where b.user_id = p_user and (b.ends_at is null or b.ends_at > now())
  order by b.created_at desc limit 1
$$;

create or replace function atq_mp.active_mute(p_user uuid)
returns table(reason text, ends_at timestamptz)
language sql stable security definer set search_path = atq_mp, pg_catalog as $$
  select m.reason, m.ends_at from mutes m
  where m.user_id = p_user and m.ends_at > now()
  order by m.created_at desc limit 1
$$;

create or replace function atq_mp.active_kick(p_user uuid)
returns table(reason text, room text, expires_at timestamptz)
language sql stable security definer set search_path = atq_mp, pg_catalog as $$
  select k.reason, k.room, k.expires_at from kicks k
  where k.user_id = p_user and k.expires_at > now()
  order by k.created_at desc limit 1
$$;

create or replace function atq_mp.need_user() returns uuid
language plpgsql stable set search_path = pg_catalog as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'sign in first' using errcode = '42501'; end if;
  return uid;
end $$;

create or replace function atq_mp.need_staff() returns uuid
language plpgsql stable security definer set search_path = atq_mp, pg_catalog as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'sign in first' using errcode = '42501'; end if;
  if not is_mod() then raise exception 'rejected: staff only' using errcode = '42501'; end if;
  return uid;
end $$;

create or replace function atq_mp.need_admin() returns uuid
language plpgsql stable security definer set search_path = atq_mp, pg_catalog as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'sign in first' using errcode = '42501'; end if;
  if not is_admin() then raise exception 'rejected: admin only' using errcode = '42501'; end if;
  return uid;
end $$;

-- Banned players cannot use clan writes (create / join / invite / update / ...).
create or replace function atq_mp.clan_need_auth() returns uuid
language plpgsql stable security definer set search_path = atq_mp, pg_catalog as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'sign in first' using errcode = '42501'; end if;
  if is_banned(uid) then raise exception 'rejected: banned' using errcode = '42501'; end if;
  return uid;
end $$;

create or replace function atq_mp.audit(
  p_action text,
  p_target_user uuid default null,
  p_target_type text default null,
  p_target_id uuid default null,
  p_detail jsonb default '{}'::jsonb
) returns void
language plpgsql security definer set search_path = atq_mp, pg_catalog as $$
begin
  insert into mod_audit (actor_id, action, target_user, target_type, target_id, detail)
  values (auth.uid(), p_action, p_target_user, p_target_type, p_target_id, coalesce(p_detail, '{}'::jsonb));
end $$;

create or replace function atq_mp.protect_target(p_target uuid, p_action text) returns void
language plpgsql stable security definer set search_path = atq_mp, pg_catalog as $$
declare r text;
begin
  if p_target is null then raise exception 'rejected: no player' using errcode = '22023'; end if;
  if p_target = auth.uid() and p_action in ('ban','kick','mute','demote') then
    raise exception 'rejected: cannot % yourself', p_action using errcode = '42501';
  end if;
  r := role_of(p_target);
  if r = 'admin' then
    raise exception 'rejected: cannot moderate the admin' using errcode = '42501';
  end if;
  if r = 'moderator' and not is_admin() then
    raise exception 'rejected: moderators cannot moderate staff' using errcode = '42501';
  end if;
end $$;

create or replace function atq_mp.player_brief(p_user uuid) returns json
language sql stable security definer set search_path = atq_mp, pg_catalog as $$
  select json_build_object(
    'user_id', p_user,
    'name', coalesce((select display_name from profiles where user_id = p_user), 'Survivor'),
    'role', role_of(p_user),
    'banned', is_banned(p_user),
    'muted', is_muted(p_user)
  )
$$;

-- ---------- status / badges ----------
create or replace function public.mp_my_role() returns text
language sql stable security definer set search_path = atq_mp, pg_catalog as $$
  select coalesce((select role from user_roles where user_id = auth.uid()),
                  case when auth.uid() is null then null else 'player' end)
$$;

create or replace function public.mp_my_status() returns json
language plpgsql stable security definer set search_path = atq_mp, public, pg_catalog as $$
declare uid uuid := auth.uid();
  ban_reason text; ban_ends timestamptz;
  mute_reason text; mute_ends timestamptz;
  kick_reason text; kick_room text; kick_ends timestamptz;
begin
  if uid is null then return json_build_object('role', null, 'signed_in', false); end if;
  select b.reason, b.ends_at into ban_reason, ban_ends from atq_mp.active_ban(uid) b;
  select m.reason, m.ends_at into mute_reason, mute_ends from atq_mp.active_mute(uid) m;
  select k.reason, k.room, k.expires_at into kick_reason, kick_room, kick_ends from atq_mp.active_kick(uid) k;
  return json_build_object(
    'signed_in', true,
    'user_id', uid,
    'role', atq_mp.role_of(uid),
    'banned', ban_reason is not null,
    'ban_reason', ban_reason,
    'ban_ends', ban_ends,
    'muted', mute_reason is not null,
    'mute_reason', mute_reason,
    'mute_ends', mute_ends,
    'kicked', kick_reason is not null,
    'kick_reason', kick_reason,
    'kick_room', kick_room,
    'kick_ends', kick_ends
  );
end $$;

-- Public badges for name tags: only admin / moderator, only for ids the caller already has.
create or replace function public.mp_staff_badges(p_ids uuid[] default '{}'::uuid[])
returns json language sql stable security definer set search_path = atq_mp, pg_catalog as $$
  select coalesce(json_agg(json_build_object('user_id', user_id, 'role', role)), '[]'::json)
  from user_roles
  where user_id = any (coalesce(p_ids, '{}'::uuid[]))
    and role in ('admin','moderator')
$$;

-- ---------- admin: promote / demote / search / audit ----------
create or replace function public.mp_admin_search(p_q text, p_limit int default 20)
returns json language plpgsql stable security definer set search_path = atq_mp, public, pg_catalog as $$
declare uid uuid; q text; lim int;
begin
  uid := atq_mp.need_staff();
  q := btrim(coalesce(p_q, ''));
  lim := least(greatest(coalesce(p_limit, 20), 1), 50);
  if char_length(q) < 1 then return '[]'::json; end if;
  return coalesce((
    select json_agg(row_json order by rank, name)
    from (
      select atq_mp.player_brief(p.user_id) || json_build_object(
        'granted_by', ur.granted_by,
        'granted_at', ur.granted_at
      ) as row_json,
      p.display_name as name,
      case when lower(p.display_name) = lower(q) then 0 else 1 end as rank
      from profiles p
      left join user_roles ur on ur.user_id = p.user_id
      where p.display_name ilike '%' || q || '%'
      order by rank, p.display_name
      limit lim
    ) s
  ), '[]'::json);
end $$;

create or replace function public.mp_admin_list_staff()
returns json language plpgsql stable security definer set search_path = atq_mp, public, pg_catalog as $$
begin
  perform atq_mp.need_admin();
  return coalesce((
    select json_agg(atq_mp.player_brief(ur.user_id) || json_build_object(
      'granted_by', ur.granted_by,
      'granted_at', ur.granted_at
    ) order by ur.role, p.display_name)
    from user_roles ur
    left join profiles p on p.user_id = ur.user_id
    where ur.role in ('admin','moderator')
  ), '[]'::json);
end $$;

create or replace function public.mp_admin_set_role(p_user uuid, p_role text)
returns json language plpgsql security definer set search_path = atq_mp, public, pg_catalog as $$
declare uid uuid; r text;
begin
  uid := atq_mp.need_admin();
  r := lower(btrim(coalesce(p_role, '')));
  if r not in ('player','moderator') then
    raise exception 'rejected: role' using errcode = '22023';
  end if;
  if p_user is null or not exists (select 1 from auth.users where id = p_user) then
    raise exception 'rejected: no player' using errcode = 'P0002';
  end if;
  if atq_mp.role_of(p_user) = 'admin' then
    raise exception 'rejected: cannot moderate the admin' using errcode = '42501';
  end if;
  if p_user = uid then raise exception 'rejected: cannot change your own role' using errcode = '42501'; end if;
  insert into user_roles (user_id, role, granted_by, granted_at)
    values (p_user, r, uid, now())
    on conflict (user_id) do update set role = excluded.role, granted_by = uid, granted_at = now();
  perform atq_mp.audit(case when r = 'moderator' then 'promote' else 'demote' end, p_user, 'role', p_user, json_build_object('role', r)::jsonb);
  return atq_mp.player_brief(p_user);
end $$;

create or replace function public.mp_mod_audit(p_limit int default 80)
returns json language plpgsql stable security definer set search_path = atq_mp, public, pg_catalog as $$
declare lim int;
begin
  perform atq_mp.need_admin();
  lim := least(greatest(coalesce(p_limit, 80), 1), 200);
  return coalesce((
    select json_agg(json_build_object(
      'id', a.id,
      'actor_id', a.actor_id,
      'actor', coalesce((select display_name from profiles where user_id = a.actor_id), 'Staff'),
      'action', a.action,
      'target_user', a.target_user,
      'target_name', coalesce((select display_name from profiles where user_id = a.target_user), null),
      'target_type', a.target_type,
      'target_id', a.target_id,
      'detail', a.detail,
      'at', a.created_at
    ) order by a.created_at desc)
    from (select * from mod_audit order by created_at desc limit lim) a
  ), '[]'::json);
end $$;

-- ---------- mute / ban / kick / names ----------
create or replace function public.mp_mod_mute(p_user uuid, p_minutes int, p_reason text default '')
returns json language plpgsql security definer set search_path = atq_mp, public, pg_catalog as $$
declare uid uuid; mins int; reason text;
begin
  uid := atq_mp.need_staff();
  perform atq_mp.protect_target(p_user, 'mute');
  mins := coalesce(p_minutes, 0);
  if mins < 1 or mins > 60 * 24 * 90 then raise exception 'rejected: mute length' using errcode = '22023'; end if;
  reason := left(btrim(coalesce(p_reason, '')), 200);
  update mutes set ends_at = now() where user_id = p_user and ends_at > now();
  insert into mutes (user_id, reason, muted_by, ends_at) values (p_user, reason, uid, now() + make_interval(mins => mins));
  perform atq_mp.audit('mute', p_user, 'user', p_user, json_build_object('minutes', mins, 'reason', reason)::jsonb);
  return atq_mp.player_brief(p_user) || json_build_object('mute_ends', now() + make_interval(mins => mins), 'reason', reason);
end $$;

create or replace function public.mp_mod_unmute(p_user uuid)
returns json language plpgsql security definer set search_path = atq_mp, public, pg_catalog as $$
begin
  perform atq_mp.need_staff();
  perform atq_mp.protect_target(p_user, 'unmute');
  update mutes set ends_at = now() where user_id = p_user and ends_at > now();
  perform atq_mp.audit('unmute', p_user, 'user', p_user, '{}'::jsonb);
  return atq_mp.player_brief(p_user);
end $$;

create or replace function public.mp_mod_ban(p_user uuid, p_minutes int, p_reason text default '')
returns json language plpgsql security definer set search_path = atq_mp, public, pg_catalog as $$
declare uid uuid; mins int; reason text; ends timestamptz;
begin
  uid := atq_mp.need_staff();
  perform atq_mp.protect_target(p_user, 'ban');
  mins := coalesce(p_minutes, 0);
  if mins < 0 or mins > 60 * 24 * 365 then raise exception 'rejected: ban length' using errcode = '22023'; end if;
  reason := left(btrim(coalesce(p_reason, '')), 200);
  if mins = 0 then ends := null; else ends := now() + make_interval(mins => mins); end if;
  update bans set ends_at = now() where user_id = p_user and (ends_at is null or ends_at > now());
  insert into bans (user_id, reason, banned_by, ends_at) values (p_user, reason, uid, ends);
  -- a ban also kicks them out of the current session
  insert into kicks (user_id, reason, kicked_by) values (p_user, 'banned', uid);
  perform atq_mp.audit('ban', p_user, 'user', p_user, json_build_object('minutes', mins, 'permanent', mins = 0, 'reason', reason)::jsonb);
  return atq_mp.player_brief(p_user) || json_build_object('ban_ends', ends, 'reason', reason);
end $$;

create or replace function public.mp_mod_unban(p_user uuid)
returns json language plpgsql security definer set search_path = atq_mp, public, pg_catalog as $$
begin
  perform atq_mp.need_staff();
  perform atq_mp.protect_target(p_user, 'unban');
  update bans set ends_at = now() where user_id = p_user and (ends_at is null or ends_at > now());
  perform atq_mp.audit('unban', p_user, 'user', p_user, '{}'::jsonb);
  return atq_mp.player_brief(p_user);
end $$;

create or replace function public.mp_mod_kick(p_user uuid, p_room text default null, p_reason text default '')
returns json language plpgsql security definer set search_path = atq_mp, public, pg_catalog as $$
declare uid uuid; reason text;
begin
  uid := atq_mp.need_staff();
  perform atq_mp.protect_target(p_user, 'kick');
  reason := left(btrim(coalesce(p_reason, '')), 200);
  insert into kicks (user_id, room, reason, kicked_by)
    values (p_user, nullif(btrim(coalesce(p_room, '')), ''), reason, uid);
  perform atq_mp.audit('kick', p_user, 'room', null, json_build_object('room', p_room, 'reason', reason)::jsonb);
  return atq_mp.player_brief(p_user) || json_build_object('reason', reason, 'room', p_room);
end $$;

create or replace function public.mp_mod_reset_name(p_user uuid)
returns json language plpgsql security definer set search_path = atq_mp, public, pg_catalog as $$
declare old text;
begin
  perform atq_mp.need_staff();
  perform atq_mp.protect_target(p_user, 'reset_name');
  select display_name into old from profiles where user_id = p_user;
  if not found then raise exception 'rejected: no player' using errcode = 'P0002'; end if;
  update profiles set display_name = 'Survivor' where user_id = p_user;
  perform atq_mp.audit('reset_name', p_user, 'name', p_user, json_build_object('old', old)::jsonb);
  return atq_mp.player_brief(p_user);
end $$;

-- ---------- chat ----------
create or replace function public.mp_chat_send(p_room text, p_text text, p_name text default null)
returns json language plpgsql security definer set search_path = atq_mp, public, pg_catalog as $$
declare uid uuid; room text; body text; nm text; id uuid;
begin
  uid := atq_mp.need_user();
  if atq_mp.is_banned(uid) then raise exception 'rejected: banned' using errcode = '42501'; end if;
  if atq_mp.is_muted(uid) then raise exception 'rejected: muted' using errcode = '42501'; end if;
  room := left(btrim(coalesce(p_room, '')), 40);
  if room = '' or room !~ '^[A-Za-z0-9._-]+$' then raise exception 'rejected: room' using errcode = '22023'; end if;
  -- never persist or fan out chat from the public lobby listing
  if room in ('lobby','atq-world-lobby') or room like 'atq-world-%' then
    raise exception 'rejected: room' using errcode = '22023';
  end if;
  body := left(btrim(regexp_replace(coalesce(p_text, ''), '\s+', ' ', 'g')), 80);
  if body = '' then raise exception 'rejected: empty' using errcode = '22023'; end if;
  if atq_mp.clan_is_bad(body) then raise exception 'rejected: language' using errcode = '22023'; end if;
  if (select count(*) from chat_messages where user_id = uid and created_at > now() - interval '10 seconds') >= 5 then
    raise exception 'rejected: too fast' using errcode = '22023';
  end if;
  nm := left(coalesce(nullif(btrim(p_name), ''), (select display_name from profiles where user_id = uid), 'Survivor'), 16);
  if atq_mp.clan_is_bad(nm) then nm := 'Survivor'; end if;
  insert into chat_messages (room, user_id, name, body) values (room, uid, nm, body) returning chat_messages.id into id;
  return json_build_object('id', id, 'room', room, 'user_id', uid, 'name', nm, 'text', body, 'at', now());
end $$;

create or replace function public.mp_chat_recent(p_room text, p_limit int default 12)
returns json language plpgsql stable security definer set search_path = atq_mp, public, pg_catalog as $$
declare v_room text; lim int;
begin
  perform atq_mp.need_user();
  v_room := left(btrim(coalesce(p_room, '')), 40);
  lim := least(greatest(coalesce(p_limit, 12), 1), 30);
  return coalesce((
    select json_agg(json_build_object(
      'id', c.id, 'user_id', c.user_id, 'name', c.name, 'text', c.body, 'at', c.created_at
    ) order by c.created_at)
    from (
      select * from chat_messages
      where chat_messages.room = v_room and deleted_at is null and created_at > now() - interval '2 hours'
      order by created_at desc
      limit lim
    ) c
  ), '[]'::json);
end $$;

create or replace function public.mp_mod_delete_chat(p_id uuid)
returns json language plpgsql security definer set search_path = atq_mp, public, pg_catalog as $$
declare uid uuid; m chat_messages;
begin
  uid := atq_mp.need_staff();
  select * into m from chat_messages where id = p_id;
  if not found then raise exception 'rejected: no message' using errcode = 'P0002'; end if;
  if m.deleted_at is not null then return json_build_object('ok', true, 'id', p_id, 'already', true); end if;
  update chat_messages set deleted_at = now(), deleted_by = uid where id = p_id;
  perform atq_mp.audit('delete_chat', m.user_id, 'chat', p_id, json_build_object('room', m.room, 'text', left(m.body, 80))::jsonb);
  return json_build_object('ok', true, 'id', p_id, 'room', m.room, 'user_id', m.user_id);
end $$;

-- ---------- reports ----------
create or replace function public.mp_report(
  p_type text,
  p_reason text default '',
  p_user uuid default null,
  p_chat uuid default null,
  p_clan uuid default null,
  p_detail text default null
) returns json language plpgsql security definer set search_path = atq_mp, public, pg_catalog as $$
declare uid uuid; typ text; reason text; detail text; id uuid;
  n int; hidden boolean; c clans; msg chat_messages;
begin
  uid := atq_mp.need_user();
  if atq_mp.is_banned(uid) then raise exception 'rejected: banned' using errcode = '42501'; end if;
  typ := lower(btrim(coalesce(p_type, '')));
  if typ not in ('player','chat','name','banner','clan_name') then
    raise exception 'rejected: type' using errcode = '22023';
  end if;
  reason := left(btrim(coalesce(p_reason, 'inappropriate')), 200);
  detail := left(btrim(coalesce(p_detail, '')), 400);
  if typ = 'chat' then
    if p_chat is null then raise exception 'rejected: no message' using errcode = '22023'; end if;
    select * into msg from chat_messages where id = p_chat;
    if not found then raise exception 'rejected: no message' using errcode = 'P0002'; end if;
    p_user := coalesce(p_user, msg.user_id);
    if detail = '' then detail := left(msg.body, 80); end if;
  end if;
  if typ in ('player','name') and p_user is null then
    raise exception 'rejected: no player' using errcode = '22023';
  end if;
  if typ in ('banner','clan_name') and p_clan is null then
    raise exception 'rejected: no clan' using errcode = '22023';
  end if;
  if p_user is not null and p_user = uid then
    raise exception 'rejected: own account' using errcode = '42501';
  end if;
  if exists (
    select 1 from reports
    where reporter_id = uid and status = 'open'
      and target_type = typ
      and target_user is not distinct from p_user
      and target_chat is not distinct from p_chat
      and target_clan is not distinct from p_clan
      and created_at > now() - interval '1 day'
  ) then
    raise exception 'rejected: already reported' using errcode = '22023';
  end if;
  if typ = 'banner' and p_clan is not null then
    select * into c from clans where id = p_clan for update;
    if not found then raise exception 'rejected: no clan' using errcode = 'P0002'; end if;
    if atq_mp.clan_is_officer(p_clan, uid) then raise exception 'rejected: own banner' using errcode = '42501'; end if;
    if not exists (select 1 from clan_banner_reports where clan_id = p_clan and user_id = uid) then
      insert into clan_banner_reports (clan_id, user_id) values (p_clan, uid);
      select count(*)::int into n from clan_banner_reports where clan_id = p_clan;
      hidden := n >= 3;
      update clans set banner_reports = n, banner_hidden = hidden, updated_at = now() where id = p_clan;
    end if;
  end if;
  insert into reports (reporter_id, target_type, target_user, target_chat, target_clan, reason, detail)
    values (uid, typ, p_user, p_chat, p_clan, reason, detail)
    returning reports.id into id;
  return json_build_object('ok', true, 'id', id, 'type', typ);
end $$;

create or replace function public.mp_mod_reports(p_status text default 'open', p_limit int default 50)
returns json language plpgsql stable security definer set search_path = atq_mp, public, pg_catalog as $$
declare st text; lim int;
begin
  perform atq_mp.need_staff();
  st := lower(coalesce(nullif(p_status, ''), 'open'));
  if st not in ('open','resolved','dismissed','all') then st := 'open'; end if;
  lim := least(greatest(coalesce(p_limit, 50), 1), 100);
  return coalesce((
    select json_agg(q.row_json order by q.at desc)
    from (
      select * from (
        select json_build_object(
          'id', r.id,
          'type', r.target_type,
          'reason', r.reason,
          'detail', r.detail,
          'status', r.status,
          'at', r.created_at,
          'source', 'reports',
          'reporter_id', r.reporter_id,
          'reporter', coalesce((select display_name from profiles where user_id = r.reporter_id), 'Player'),
          'target_user', r.target_user,
          'target_name', coalesce((select display_name from profiles where user_id = r.target_user), null),
          'target_chat', r.target_chat,
          'chat', (select json_build_object('id', m.id, 'text', m.body, 'name', m.name, 'deleted', m.deleted_at is not null) from chat_messages m where m.id = r.target_chat),
          'target_clan', r.target_clan,
          'clan', (select json_build_object('id', c.id, 'name', c.name, 'tag', c.tag, 'banner_hidden', c.banner_hidden, 'banner_reports', c.banner_reports) from clans c where c.id = r.target_clan)
        ) as row_json,
        r.created_at as at
        from reports r
        where (st = 'all' or r.status = st)
        union all
        select json_build_object(
          'id', c.id,
          'type', 'banner',
          'reason', 'banner',
          'detail', (count(*)::text || ' banner report' || case when count(*) = 1 then '' else 's' end),
          'status', 'open',
          'at', max(br.created_at),
          'source', 'clan_banner_reports',
          'reporter_id', null,
          'reporter', count(*)::text || ' player' || case when count(*) = 1 then '' else 's' end,
          'target_user', c.leader_id,
          'target_name', c.name,
          'target_chat', null,
          'chat', null,
          'target_clan', c.id,
          'clan', json_build_object('id', c.id, 'name', c.name, 'tag', c.tag, 'banner_hidden', c.banner_hidden, 'banner_reports', c.banner_reports)
        ),
        max(br.created_at)
        from clan_banner_reports br
        join clans c on c.id = br.clan_id
        where st in ('open','all')
          and not exists (
            select 1 from reports r2
            where r2.target_type = 'banner' and r2.target_clan = br.clan_id and r2.status = 'open'
          )
        group by c.id
      ) u
      order by u.at desc
      limit lim
    ) q
  ), '[]'::json);
end $$;

create or replace function public.mp_mod_resolve_report(p_id uuid, p_status text)
returns json language plpgsql security definer set search_path = atq_mp, public, pg_catalog as $$
declare uid uuid; st text; r reports;
begin
  uid := atq_mp.need_staff();
  st := lower(btrim(coalesce(p_status, '')));
  if st not in ('resolved','dismissed') then raise exception 'rejected: status' using errcode = '22023'; end if;
  select * into r from reports where id = p_id;
  if not found then
    -- resolve an aggregated clan_banner_reports row (id is the clan id)
    if exists (select 1 from clan_banner_reports where clan_id = p_id) then
      insert into reports (reporter_id, target_type, target_clan, reason, detail, status, resolved_by, resolved_at)
        values (uid, 'banner', p_id, 'banner', 'closed from banner report queue', st, uid, now())
        returning * into r;
      perform atq_mp.audit('resolve_report', r.target_user, 'banner', r.target_clan, json_build_object('status', st, 'source', 'clan_banner_reports')::jsonb);
      return json_build_object('ok', true, 'id', r.id, 'status', r.status, 'target_clan', p_id);
    end if;
    raise exception 'rejected: no report' using errcode = 'P0002';
  end if;
  update reports set status = st, resolved_by = uid, resolved_at = now() where id = p_id returning * into r;
  perform atq_mp.audit('resolve_report', r.target_user, r.target_type, r.id, json_build_object('status', st)::jsonb);
  return json_build_object('ok', true, 'id', r.id, 'status', r.status);
end $$;

-- ---------- clan resets (extend existing admin banner reset so mods can use it) ----------
create or replace function public.clan_admin_reset_banner(p_id uuid)
returns json language plpgsql security definer set search_path = atq_mp, public, pg_catalog as $$
declare c clans;
begin
  if not atq_mp.is_mod() then raise exception 'rejected: staff only' using errcode = '42501'; end if;
  if auth.uid() is null then raise exception 'sign in first' using errcode = '42501'; end if;
  select * into c from clans where id = p_id for update;
  if not found then raise exception 'rejected: no clan' using errcode = 'P0002'; end if;
  delete from clan_banner_reports where clan_id = p_id;
  update clans set
    banner = atq_mp.clan_clean_banner('{"v":1,"shape":"standard","bg":"#1e4d3a","bg2":"#d9b44a","pattern":"chevron","emblem":"skull","emblemColor":"#f4f0e6","trim":"#d9b44a","trimStyle":"thin"}'::jsonb),
    banner_hidden = false, banner_reports = 0, updated_at = now()
    where id = p_id returning * into c;
  perform atq_mp.audit('reset_banner', c.leader_id, 'banner', c.id, json_build_object('clan', c.name)::jsonb);
  return atq_mp.clan_public_row(c);
end $$;

create or replace function public.mp_mod_reset_clan_banner(p_id uuid)
returns json language plpgsql security definer set search_path = public, atq_mp, pg_catalog as $$
begin
  return public.clan_admin_reset_banner(p_id);
end $$;

create or replace function public.mp_mod_reset_clan_name(p_id uuid)
returns json language plpgsql security definer set search_path = atq_mp, public, pg_catalog as $$
declare c clans; nm text; tg text; i int := 0;
begin
  if not atq_mp.is_mod() then raise exception 'rejected: staff only' using errcode = '42501'; end if;
  if auth.uid() is null then raise exception 'sign in first' using errcode = '42501'; end if;
  select * into c from clans where id = p_id for update;
  if not found then raise exception 'rejected: no clan' using errcode = 'P0002'; end if;
  loop
    i := i + 1;
    nm := 'Clan ' || substr(replace(c.id::text, '-', ''), 1, 4);
    if i > 1 then nm := nm || i::text; end if;
    tg := 'C' || upper(substr(replace(c.id::text, '-', ''), 1, 3));
    if i > 1 then tg := left(tg || i::text, 5); end if;
    exit when not exists (select 1 from clans where id <> c.id and (lower(name) = lower(nm) or tag = tg));
    if i > 20 then raise exception 'rejected: name taken' using errcode = '23505'; end if;
  end loop;
  update clans set name = nm, tag = tg, updated_at = now() where id = p_id returning * into c;
  perform atq_mp.audit('reset_clan_name', c.leader_id, 'clan_name', c.id, json_build_object('name', nm, 'tag', tg)::jsonb);
  return atq_mp.clan_public_row(c);
end $$;

-- ---------- grants ----------
revoke all on function atq_mp.is_banned(uuid), atq_mp.is_muted(uuid), atq_mp.role_of(uuid),
  atq_mp.need_user(), atq_mp.need_staff(), atq_mp.need_admin(), atq_mp.audit(text, uuid, text, uuid, jsonb),
  atq_mp.protect_target(uuid, text), atq_mp.player_brief(uuid),
  atq_mp.active_ban(uuid), atq_mp.active_mute(uuid), atq_mp.active_kick(uuid)
  from public, anon, authenticated;
grant execute on function atq_mp.is_admin(), atq_mp.is_mod() to anon, authenticated;

revoke all on function
  public.mp_my_status(),
  public.mp_staff_badges(uuid[]),
  public.mp_admin_search(text, int),
  public.mp_admin_list_staff(),
  public.mp_admin_set_role(uuid, text),
  public.mp_mod_audit(int),
  public.mp_mod_mute(uuid, int, text),
  public.mp_mod_unmute(uuid),
  public.mp_mod_ban(uuid, int, text),
  public.mp_mod_unban(uuid),
  public.mp_mod_kick(uuid, text, text),
  public.mp_mod_reset_name(uuid),
  public.mp_chat_send(text, text, text),
  public.mp_chat_recent(text, int),
  public.mp_mod_delete_chat(uuid),
  public.mp_report(text, text, uuid, uuid, uuid, text),
  public.mp_mod_reports(text, int),
  public.mp_mod_resolve_report(uuid, text),
  public.mp_mod_reset_clan_banner(uuid),
  public.mp_mod_reset_clan_name(uuid)
  from public, anon;
grant execute on function
  public.mp_my_role(),
  public.mp_my_status(),
  public.mp_staff_badges(uuid[]),
  public.mp_admin_search(text, int),
  public.mp_admin_list_staff(),
  public.mp_admin_set_role(uuid, text),
  public.mp_mod_audit(int),
  public.mp_mod_mute(uuid, int, text),
  public.mp_mod_unmute(uuid),
  public.mp_mod_ban(uuid, int, text),
  public.mp_mod_unban(uuid),
  public.mp_mod_kick(uuid, text, text),
  public.mp_mod_reset_name(uuid),
  public.mp_chat_send(text, text, text),
  public.mp_chat_recent(text, int),
  public.mp_mod_delete_chat(uuid),
  public.mp_report(text, text, uuid, uuid, uuid, text),
  public.mp_mod_reports(text, int),
  public.mp_mod_resolve_report(uuid, text),
  public.mp_mod_reset_clan_banner(uuid),
  public.mp_mod_reset_clan_name(uuid),
  public.clan_admin_reset_banner(uuid)
  to authenticated;

-- ---------- bootstrap: keep Keem as the only admin (verified: Google name "Just keem",
-- email already on atq_mp.admin_emails from 20261119_mp_admin_keem.sql) ----------
insert into atq_mp.admin_emails (email) values ('lillykemoy1@gmail.com') on conflict (email) do nothing;
insert into atq_mp.user_roles (user_id, role, granted_by, granted_at)
  select u.id, 'admin', u.id, now()
  from auth.users u
  where lower(u.email) = 'lillykemoy1@gmail.com'
  on conflict (user_id) do update set role = 'admin', granted_by = coalesce(atq_mp.user_roles.granted_by, excluded.granted_by);
