-- Additive: creating a clan costs shared in-game cash, deducted atomically in clan_create.
-- Joining stays free. Existing clans are not charged. No table or row deletes.

create table if not exists atq_mp.cash_debits (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  amount int not null check (amount > 0),
  reason text not null,
  created_at timestamptz not null default now()
);
create index if not exists cash_debits_user_at on atq_mp.cash_debits (user_id, created_at desc);
alter table atq_mp.cash_debits enable row level security;
revoke all on atq_mp.cash_debits from public, anon, authenticated;

create or replace function atq_mp.clan_create_price() returns int
language sql immutable set search_path = pg_catalog as $$
  -- Above typical store cosmetics ($60–$450) and a little above the priciest outfits ($2,000).
  select 2500
$$;

create or replace function public.clan_prices() returns json
language sql stable set search_path = atq_mp, pg_catalog as $$
  select json_build_object('create', atq_mp.clan_create_price(), 'join', 0)
$$;

-- Atomically debit profile_saves.data.save.cash. Raises on missing save or short funds.
-- Runs inside the caller's transaction, so a later exception refunds automatically.
create or replace function atq_mp.debit_save_cash(uid uuid, amount int, reason text)
returns int language plpgsql set search_path = atq_mp, pg_catalog as $$
declare
  cur atq_mp.profile_saves;
  cash numeric;
  new_cash int;
  d jsonb;
begin
  if uid is null then raise exception 'rejected: sign in first' using errcode = '42501'; end if;
  if amount is null or amount <= 0 then raise exception 'rejected: bad price' using errcode = '22023'; end if;
  select * into cur from atq_mp.profile_saves where user_id = uid for update;
  if not found or cur.data is null then
    raise exception 'rejected: sync cash first' using errcode = '22023';
  end if;
  begin
    cash := coalesce((cur.data #>> '{save,cash}')::numeric, 0);
  exception when others then cash := 0;
  end;
  if cash < amount then
    raise exception 'rejected: not enough cash' using errcode = '22023';
  end if;
  new_cash := floor(cash - amount)::int;
  d := cur.data;
  if d->'save' is null or jsonb_typeof(d->'save') <> 'object' then
    d := jsonb_set(d, '{save}', '{}'::jsonb, true);
  end if;
  d := jsonb_set(d, '{save,cash}', to_jsonb(new_cash));
  update atq_mp.profile_saves set data = d where user_id = uid;
  insert into atq_mp.cash_debits (user_id, amount, reason) values (uid, amount, reason);
  return new_cash;
end $$;

create or replace function public.clan_create(p_name text, p_tag text, p_banner jsonb default '{}'::jsonb, p_join text default 'request')
returns json language plpgsql security definer set search_path = atq_mp, public, pg_catalog as $$
declare uid uuid; nm text; tg text; bn jsonb; jm text; c clans; price int; new_cash int;
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
  -- Charge only after every check passes. Any exception after this rolls the debit back.
  price := atq_mp.clan_create_price();
  new_cash := atq_mp.debit_save_cash(uid, price, 'clan_create');
  insert into clans (name, tag, banner, join_mode, leader_id, member_count) values (nm, tg, bn, jm, uid, 0) returning * into c;
  insert into clan_members (clan_id, user_id, role) values (c.id, uid, 'leader');
  insert into clan_create_log (user_id) values (uid);
  select * into c from clans where id = c.id;
  return json_build_object('clan', atq_mp.clan_public_row(c), 'members', atq_mp.clan_members_json(c.id), 'role', 'leader', 'cash', new_cash, 'price', price);
end $$;

-- Tighten profile_save so a stale wallet upload cannot undo a server debit.
-- After an unsynced debit, cash may only rise by the per-minute earn rate (no $3,000 bump).
create or replace function public.profile_save(p_name text, p_avatar text, p_look jsonb, p_data jsonb, p_rev int, p_force boolean default false)
returns json language plpgsql security invoker set search_path = atq_mp, public as $$
declare uid uuid := auth.uid(); cur atq_mp.profile_saves; nm text; d jsonb;
  last_debit timestamptz; incoming numeric; server_cash numeric; allow numeric;
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
  if found then
    select max(created_at) into last_debit from atq_mp.cash_debits where user_id = uid;
    if last_debit is not null and last_debit > cur.updated_at then
      begin server_cash := coalesce((cur.data #>> '{save,cash}')::numeric, 0); exception when others then server_cash := 0; end;
      incoming := atq_mp.num(d->'save', 'cash');
      allow := least(250000, 400 * greatest(0, extract(epoch from (now() - last_debit)) / 60));
      if incoming > server_cash + allow then
        d := jsonb_set(d, '{save,cash}', to_jsonb(floor(server_cash + allow)));
      end if;
    end if;
  end if;
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

revoke all on function public.clan_prices() from public;
grant execute on function public.clan_prices() to anon, authenticated;
revoke all on function public.clan_create(text,text,jsonb,text) from public, anon;
grant execute on function public.clan_create(text,text,jsonb,text) to authenticated;
revoke all on function public.profile_save(text, text, jsonb, jsonb, int, boolean) from public;
grant execute on function public.profile_save(text, text, jsonb, jsonb, int, boolean) to authenticated;
