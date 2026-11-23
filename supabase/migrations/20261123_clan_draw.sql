-- Additive: banner drawing (vector ops), report/auto-hide, and admin reset.
-- Does not drop tables or delete existing clan rows.

alter table atq_mp.clans add column if not exists banner_hidden boolean not null default false;
alter table atq_mp.clans add column if not exists banner_reports int not null default 0;

create table if not exists atq_mp.clan_banner_reports (
  clan_id uuid not null references atq_mp.clans(id) on delete cascade,
  user_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (clan_id, user_id)
);
alter table atq_mp.clan_banner_reports enable row level security;
revoke all on atq_mp.clan_banner_reports from public, anon, authenticated;

create or replace function atq_mp.clan_clean_draw(d jsonb) returns jsonb
language plpgsql immutable set search_path = pg_catalog as $$
declare
  ops jsonb := '[]'::jsonb;
  raw jsonb;
  t text;
  k text;
  col text;
  hx text := '^#[0-9a-fA-F]{6}$';
  p jsonb;
  out_pts jsonb;
  i int;
  n int;
  x numeric;
  y numeric;
  w numeric;
  s numeric;
  rot numeric;
  shapes text[] := array['circle','square','triangle','star','heart','line'];
  o jsonb;
  op jsonb;
begin
  if d is null or jsonb_typeof(d) <> 'object' then return null; end if;
  if d->'ops' is null or jsonb_typeof(d->'ops') <> 'array' then return null; end if;
  for raw in select value from jsonb_array_elements(d->'ops') loop
    if jsonb_array_length(ops) >= 80 then exit; end if;
    if jsonb_typeof(raw) <> 'object' then continue; end if;
    t := raw->>'t';
    if t in ('stroke','erase') then
      p := raw->'p';
      if jsonb_typeof(p) <> 'array' then continue; end if;
      out_pts := '[]'::jsonb;
      n := jsonb_array_length(p);
      i := 0;
      while i + 1 < n and jsonb_array_length(out_pts) < 320 loop
        begin
          x := least(1, greatest(0, round((p->>i)::numeric, 3)));
          y := least(1, greatest(0, round((p->>(i+1))::numeric, 3)));
          out_pts := out_pts || to_jsonb(x) || to_jsonb(y);
        exception when others then null;
        end;
        i := i + 2;
      end loop;
      if jsonb_array_length(out_pts) < 2 then continue; end if;
      begin w := least(0.2, greatest(0.01, round(coalesce((raw->>'w')::numeric, 0.032), 3))); exception when others then w := 0.032; end;
      if t = 'stroke' then
        col := lower(coalesce(raw->>'c', '#f4f0e6'));
        if col !~ hx then col := '#f4f0e6'; end if;
        op := jsonb_build_object('t','stroke','c',col,'w',w,'p',out_pts);
      else
        op := jsonb_build_object('t','erase','w',w,'p',out_pts);
      end if;
      ops := ops || jsonb_build_array(op);
    elsif t = 'fill' then
      col := lower(coalesce(raw->>'c', '#f4f0e6'));
      if col !~ hx then continue; end if;
      begin x := least(1, greatest(0, round(coalesce((raw->>'x')::numeric, 0.5), 3))); exception when others then x := 0.5; end;
      begin y := least(1, greatest(0, round(coalesce((raw->>'y')::numeric, 0.5), 3))); exception when others then y := 0.5; end;
      ops := ops || jsonb_build_array(jsonb_build_object('t','fill','c',col,'x',x,'y',y));
    elsif t = 'shape' then
      k := raw->>'k';
      if k is null or not (k = any (shapes)) then continue; end if;
      col := lower(coalesce(raw->>'c', '#f4f0e6'));
      if col !~ hx then continue; end if;
      begin x := least(1, greatest(0, round(coalesce((raw->>'x')::numeric, 0.5), 3))); exception when others then x := 0.5; end;
      begin y := least(1, greatest(0, round(coalesce((raw->>'y')::numeric, 0.5), 3))); exception when others then y := 0.5; end;
      begin s := least(1, greatest(0.02, round(coalesce((raw->>'s')::numeric, 0.18), 3))); exception when others then s := 0.18; end;
      begin rot := round(coalesce((raw->>'r')::numeric, 0), 3); exception when others then rot := 0; end;
      begin w := least(0.2, greatest(0.01, round(coalesce((raw->>'w')::numeric, 0.025), 3))); exception when others then w := 0.025; end;
      ops := ops || jsonb_build_array(jsonb_build_object(
        't','shape','k',k,'c',col,'x',x,'y',y,'s',s,'r',rot,'fill', coalesce((raw->>'fill')::boolean, true),'w',w
      ));
    end if;
  end loop;
  if jsonb_array_length(ops) = 0 then return null; end if;
  o := jsonb_build_object('v', 1, 'ops', ops);
  while pg_column_size(o) > 16000 and jsonb_array_length(ops) > 0 loop
    ops := ops - 0;
    o := jsonb_build_object('v', 1, 'ops', ops);
  end loop;
  if jsonb_array_length(ops) = 0 then return null; end if;
  return o;
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
  dr jsonb;
begin
  if b is null or jsonb_typeof(b) <> 'object' then b := '{}'::jsonb; end if;
  if pg_column_size(b) > 16384 then raise exception 'rejected: banner too big' using errcode = '22023'; end if;
  pick := coalesce(b->>'shape','standard'); if not (pick = any (shapes)) then pick := 'standard'; end if; o := o || jsonb_build_object('shape', pick);
  pick := coalesce(b->>'pattern','solid'); if not (pick = any (patterns)) then pick := 'solid'; end if; o := o || jsonb_build_object('pattern', pick);
  pick := coalesce(b->>'emblem','star'); if not (pick = any (emblems)) then pick := 'star'; end if; o := o || jsonb_build_object('emblem', pick);
  pick := coalesce(b->>'trimStyle','thin'); if not (pick = any (trims)) then pick := 'thin'; end if; o := o || jsonb_build_object('trimStyle', pick);
  pick := coalesce(b->>'bg','#1e4d3a'); if pick !~ hx then pick := '#1e4d3a'; end if; o := o || jsonb_build_object('bg', lower(pick));
  pick := coalesce(b->>'bg2','#d9b44a'); if pick !~ hx then pick := '#d9b44a'; end if; o := o || jsonb_build_object('bg2', lower(pick));
  pick := coalesce(b->>'emblemColor','#f4f0e6'); if pick !~ hx then pick := '#f4f0e6'; end if; o := o || jsonb_build_object('emblemColor', lower(pick));
  pick := coalesce(b->>'trim','#d9b44a'); if pick !~ hx then pick := '#d9b44a'; end if; o := o || jsonb_build_object('trim', lower(pick));
  dr := atq_mp.clan_clean_draw(b->'draw');
  o := o || jsonb_build_object('v', 1);
  if dr is not null then o := o || jsonb_build_object('draw', dr); end if;
  return o;
end $$;

create or replace function atq_mp.clan_safe_banner(c atq_mp.clans) returns jsonb
language sql stable set search_path = atq_mp, pg_catalog as $$
  select case
    when c.banner_hidden and not (atq_mp.is_admin() or atq_mp.clan_is_officer(c.id, auth.uid()))
      then coalesce(c.banner, '{}'::jsonb) - 'draw'
    else c.banner
  end
$$;

create or replace function atq_mp.clan_public_row(c atq_mp.clans) returns json
language sql stable set search_path = atq_mp, public, pg_catalog as $$
  select json_build_object(
    'id', c.id, 'name', c.name, 'tag', c.tag, 'banner', atq_mp.clan_safe_banner(c), 'join_mode', c.join_mode,
    'leader_id', c.leader_id, 'members', c.member_count, 'created_at', c.created_at,
    'banner_hidden', c.banner_hidden,
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

-- officers submitting a new banner get a fresh start (unhide + clear reports)
create or replace function public.clan_update(p_id uuid, p_name text default null, p_tag text default null, p_banner jsonb default null, p_join text default null)
returns json language plpgsql security definer set search_path = atq_mp, public, pg_catalog as $$
declare uid uuid; r text; c clans; nm text; tg text;
begin
  uid := atq_mp.clan_need_auth();
  select * into c from clans where id = p_id for update;
  if not found then raise exception 'rejected: no clan' using errcode = 'P0002'; end if;
  r := atq_mp.clan_role(p_id, uid);
  if r is null or r not in ('leader','officer') then raise exception 'rejected: officers only' using errcode = '42501'; end if;
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
  if p_banner is not null then
    c.banner := atq_mp.clan_clean_banner(p_banner);
    c.banner_hidden := false;
    c.banner_reports := 0;
    delete from clan_banner_reports where clan_id = p_id;
  end if;
  if p_join is not null then c.join_mode := case when p_join = 'invite' then 'invite' else 'request' end; end if;
  update clans set name = c.name, tag = c.tag, banner = c.banner, join_mode = c.join_mode,
    banner_hidden = c.banner_hidden, banner_reports = c.banner_reports, updated_at = now()
    where id = p_id returning * into c;
  return atq_mp.clan_public_row(c);
end $$;

create or replace function public.clan_board(p_sort text default 'kills', p_limit int default 50, p_me uuid default null)
returns json language sql stable security definer set search_path = atq_mp, public, pg_catalog as $$
  with scored as (
    select c.id, c.name, c.tag, atq_mp.clan_safe_banner(c) as banner, c.member_count, c.banner_hidden,
      coalesce(sum(lb.total_kills), 0)::int as score_kills,
      coalesce(max(lb.best_wave), 0)::int as score_wave,
      coalesce(sum(lb.total_hs), 0)::int as score_hs
    from clans c
    left join clan_members m on m.clan_id = c.id
    left join leaderboard lb on lb.pid = m.user_id
    group by c.id, c.name, c.tag, c.banner, c.member_count, c.banner_hidden
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
        'rank', r.rank, 'id', r.id, 'name', r.name, 'tag', r.tag, 'banner', r.banner, 'banner_hidden', r.banner_hidden,
        'members', r.member_count, 'score_kills', r.score_kills, 'score_wave', r.score_wave, 'score_hs', r.score_hs,
        'me', r.id = (select clan_id from mine)
      ) order by r.rank)
      from ranked r where r.rank <= least(greatest(coalesce(p_limit, 50), 1), 100)
    ), '[]'::json),
    'me', (select json_build_object(
      'rank', r.rank, 'id', r.id, 'name', r.name, 'tag', r.tag, 'banner', r.banner, 'banner_hidden', r.banner_hidden,
      'members', r.member_count, 'score_kills', r.score_kills, 'score_wave', r.score_wave, 'score_hs', r.score_hs
    ) from ranked r where r.id = (select clan_id from mine)),
    'clans', (select count(*) from ranked)
  )
$$;

create or replace function public.clan_tags(p_ids uuid[] default '{}'::uuid[])
returns json language sql stable security definer set search_path = atq_mp, public, pg_catalog as $$
  select coalesce(json_agg(json_build_object(
    'user_id', m.user_id, 'clan_id', c.id, 'name', c.name, 'tag', c.tag,
    'banner', atq_mp.clan_safe_banner(c), 'banner_hidden', c.banner_hidden, 'role', m.role
  )), '[]'::json)
  from clan_members m
  join clans c on c.id = m.clan_id
  where m.user_id = any (coalesce(p_ids, '{}'::uuid[]))
$$;

create or replace function public.clan_report_banner(p_id uuid)
returns json language plpgsql security definer set search_path = atq_mp, public, pg_catalog as $$
declare uid uuid; c clans; n int; hidden boolean;
begin
  uid := atq_mp.clan_need_auth();
  select * into c from clans where id = p_id for update;
  if not found then raise exception 'rejected: no clan' using errcode = 'P0002'; end if;
  if atq_mp.clan_is_officer(p_id, uid) then raise exception 'rejected: own banner' using errcode = '42501'; end if;
  if exists (select 1 from clan_banner_reports where clan_id = p_id and user_id = uid) then
    raise exception 'rejected: already reported' using errcode = '22023';
  end if;
  insert into clan_banner_reports (clan_id, user_id) values (p_id, uid);
  select count(*)::int into n from clan_banner_reports where clan_id = p_id;
  hidden := n >= 3;
  update clans set banner_reports = n, banner_hidden = hidden, updated_at = now() where id = p_id;
  return json_build_object('ok', true, 'reports', n, 'hidden', hidden);
end $$;

create or replace function public.clan_admin_reset_banner(p_id uuid)
returns json language plpgsql security definer set search_path = atq_mp, public, pg_catalog as $$
declare c clans;
begin
  if not atq_mp.is_admin() then raise exception 'rejected: admin only' using errcode = '42501'; end if;
  if auth.uid() is null then raise exception 'sign in first' using errcode = '42501'; end if;
  select * into c from clans where id = p_id for update;
  if not found then raise exception 'rejected: no clan' using errcode = 'P0002'; end if;
  delete from clan_banner_reports where clan_id = p_id;
  update clans set
    banner = atq_mp.clan_clean_banner('{"v":1,"shape":"standard","bg":"#1e4d3a","bg2":"#d9b44a","pattern":"chevron","emblem":"skull","emblemColor":"#f4f0e6","trim":"#d9b44a","trimStyle":"thin"}'::jsonb),
    banner_hidden = false, banner_reports = 0, updated_at = now()
    where id = p_id returning * into c;
  return atq_mp.clan_public_row(c);
end $$;

revoke all on function public.clan_report_banner(uuid), public.clan_admin_reset_banner(uuid) from public, anon;
grant execute on function public.clan_report_banner(uuid), public.clan_admin_reset_banner(uuid) to authenticated;
