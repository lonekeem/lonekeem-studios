-- Fix json concatenation (this Postgres build has no json || json operator). Additive: replace functions only.

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
      select to_json(atq_mp.player_brief(p.user_id)::jsonb || jsonb_build_object(
        'granted_by', ur.granted_by,
        'granted_at', ur.granted_at
      )) as row_json,
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
    select json_agg(to_json(atq_mp.player_brief(ur.user_id)::jsonb || jsonb_build_object(
      'granted_by', ur.granted_by,
      'granted_at', ur.granted_at
    )) order by ur.role, p.display_name)
    from user_roles ur
    left join profiles p on p.user_id = ur.user_id
    where ur.role in ('admin','moderator')
  ), '[]'::json);
end $$;

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
  return to_json(atq_mp.player_brief(p_user)::jsonb || jsonb_build_object('mute_ends', now() + make_interval(mins => mins), 'reason', reason));
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
  insert into kicks (user_id, reason, kicked_by) values (p_user, 'banned', uid);
  perform atq_mp.audit('ban', p_user, 'user', p_user, json_build_object('minutes', mins, 'permanent', mins = 0, 'reason', reason)::jsonb);
  return to_json(atq_mp.player_brief(p_user)::jsonb || jsonb_build_object('ban_ends', ends, 'reason', reason));
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
  return to_json(atq_mp.player_brief(p_user)::jsonb || jsonb_build_object('reason', reason, 'room', p_room));
end $$;
