-- After the Quiet: cloud saves v2 (same profile_save signature, so older clients keep working).
-- Server-side rules on every save, so a modified client can't inflate cash or wipe progress:
--  * progress never goes backwards: save.maxCh / level / kills / survBest take the higher value, done / done2 stay true,
--    owned weapons, outfits, cosmetics, armors, pages, items are unioned, upgrades keep the higher tier.
--  * cash can only rise by a time-based allowance since the last save (3000 + 400/min, max 250000 per save);
--    a first upload is capped at 250000. Anything above is clamped and the clamped data is returned (adjusted=true).
create or replace function atq_mp.jarr_union(a jsonb, b jsonb) returns jsonb language sql immutable as $$
  select coalesce(jsonb_agg(distinct x), '[]'::jsonb) from (
    select x from jsonb_array_elements(case when jsonb_typeof(a) = 'array' then a else '[]'::jsonb end) x
    union select x from jsonb_array_elements(case when jsonb_typeof(b) = 'array' then b else '[]'::jsonb end) x) t
$$;
create or replace function atq_mp.num(j jsonb, k text) returns numeric language sql immutable as $$
  select case when jsonb_typeof(j -> k) = 'number' then (j ->> k)::numeric else 0 end
$$;
create or replace function atq_mp.save_guard(old_d jsonb, new_d jsonb, last_at timestamptz) returns jsonb language plpgsql immutable as $$
declare o jsonb := coalesce(old_d -> 'save', '{}'::jsonb); n jsonb := new_d -> 'save'; k text; allow numeric; up jsonb; w text; s text;
begin
  if n is null or jsonb_typeof(n) <> 'object' then return new_d; end if;
  if last_at is null then allow := 250000; else allow := least(250000, 3000 + 400 * greatest(0, extract(epoch from (now() - last_at)) / 60)); end if;
  if atq_mp.num(n, 'cash') > atq_mp.num(o, 'cash') + allow then n := jsonb_set(n, '{cash}', to_jsonb(floor(atq_mp.num(o, 'cash') + allow))); end if;
  if atq_mp.num(n, 'cash') < 0 then n := jsonb_set(n, '{cash}', '0'); end if;
  if old_d is null or o = '{}'::jsonb then return jsonb_set(new_d, '{save}', n); end if;
  foreach k in array array['maxCh', 'kills'] loop
    if atq_mp.num(o, k) > atq_mp.num(n, k) then n := jsonb_set(n, array[k], o -> k); end if; end loop;
  if atq_mp.num(o, 'level') > atq_mp.num(n, 'level') or (atq_mp.num(o, 'level') = atq_mp.num(n, 'level') and atq_mp.num(o, 'xp') > atq_mp.num(n, 'xp')) then
    n := jsonb_set(jsonb_set(n, '{level}', o -> 'level'), '{xp}', coalesce(o -> 'xp', '0')); end if;
  foreach k in array array['done', 'done2'] loop
    if (o ->> k) = 'true' then n := jsonb_set(n, array[k], 'true'); end if; end loop;
  foreach k in array array['owned', 'outfits', 'cosmetics', 'armors', 'pages', 'items'] loop
    if o ? k or n ? k then n := jsonb_set(n, array[k], atq_mp.jarr_union(o -> k, n -> k)); end if; end loop;
  up := coalesce(n -> 'up', '{}'::jsonb);
  if jsonb_typeof(o -> 'up') = 'object' and jsonb_typeof(up) = 'object' then
    for w in select jsonb_object_keys(o -> 'up') loop
      if jsonb_typeof(o -> 'up' -> w) = 'object' then
        if jsonb_typeof(up -> w) <> 'object' or up -> w is null then up := jsonb_set(up, array[w], '{}'::jsonb); end if;
        for s in select jsonb_object_keys(o -> 'up' -> w) loop
          if atq_mp.num(o -> 'up' -> w, s) > atq_mp.num(up -> w, s) then up := jsonb_set(up, array[w, s], o -> 'up' -> w -> s); end if; end loop;
      end if; end loop;
    n := jsonb_set(n, '{up}', up); end if;
  new_d := jsonb_set(new_d, '{save}', n);
  if atq_mp.num(old_d, 'survBest') > atq_mp.num(new_d, 'survBest') then new_d := jsonb_set(new_d, '{survBest}', old_d -> 'survBest'); end if;
  return new_d;
end $$;

create or replace function public.profile_save(p_name text, p_avatar text, p_look jsonb, p_data jsonb, p_rev int, p_force boolean default false)
returns json language plpgsql security invoker set search_path = atq_mp, public as $$
declare uid uuid := auth.uid(); cur atq_mp.profile_saves; nm text; d jsonb;
begin
  if uid is null then raise exception 'sign in first' using errcode = '42501'; end if;
  if p_data is null or jsonb_typeof(p_data) <> 'object' then raise exception 'bad data' using errcode = '22023'; end if;
  if p_look is not null and pg_column_size(p_look) > 16384 then raise exception 'look too big' using errcode = '22023'; end if;
  select * into cur from atq_mp.profile_saves where user_id = uid for update;
  if found and not coalesce(p_force, false) and coalesce(p_rev, 0) < cur.rev then
    return json_build_object('conflict', true, 'rev', cur.rev, 'data', cur.data, 'updated_at', cur.updated_at);
  end if;
  if found and cur.updated_at > now() - interval '2 seconds' then raise exception 'too fast' using errcode = '22023'; end if;
  d := atq_mp.save_guard(case when found then cur.data end, p_data, case when found then cur.updated_at end);
  nm := coalesce(nullif(left(btrim(regexp_replace(coalesce(p_name, ''), '[^[:alnum:] _.\-]', '', 'g')), 16), ''), 'Survivor');
  insert into atq_mp.profiles (user_id, display_name, avatar_url) values (uid, nm, case when p_avatar ~ '^https://' then left(p_avatar, 500) end)
    on conflict (user_id) do update set display_name = excluded.display_name, avatar_url = excluded.avatar_url;
  if p_look is not null then
    insert into atq_mp.characters (user_id, slot, look, updated_at) values (uid, 0, p_look, now()) on conflict (user_id, slot) do update set look = excluded.look, updated_at = now();
  end if;
  insert into atq_mp.profile_saves (user_id, data, rev, updated_at) values (uid, d, 1, now())
    on conflict (user_id) do update set data = excluded.data, rev = atq_mp.profile_saves.rev + 1, updated_at = now() returning * into cur;
  return json_build_object('conflict', false, 'rev', cur.rev, 'updated_at', cur.updated_at, 'adjusted', d is distinct from p_data, 'data', case when d is distinct from p_data then d end);
end $$;
revoke all on function public.profile_save(text, text, jsonb, jsonb, int, boolean) from public;
grant execute on function public.profile_save(text, text, jsonb, jsonb, int, boolean) to authenticated;
grant execute on function atq_mp.save_guard(jsonb, jsonb, timestamptz), atq_mp.jarr_union(jsonb, jsonb), atq_mp.num(jsonb, text) to authenticated;
