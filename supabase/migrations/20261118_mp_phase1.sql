-- After the Quiet multiplayer: DRAFT schema (NOT applied; the Supabase project is paused and applying needs owner approval).
create schema if not exists atq_mp;

create table if not exists atq_mp.profiles (
  user_id uuid primary key references auth.users on delete cascade,
  display_name text not null default 'Survivor' check (char_length(display_name) between 2 and 20),
  created_at timestamptz not null default now()
);
create table if not exists atq_mp.characters (
  user_id uuid primary key references auth.users on delete cascade,
  look jsonb not null,                       -- versioned look document (docs/multiplayer.md §4)
  look_hash text generated always as (md5(look::text)) stored,
  updated_at timestamptz not null default now()
);
create table if not exists atq_mp.wallets (
  user_id uuid primary key references auth.users on delete cascade,
  cash bigint not null default 0 check (cash >= 0),
  stars int not null default 0 check (stars >= 0),
  diamonds int not null default 0 check (diamonds >= 0)
);
create table if not exists atq_mp.inventories (
  user_id uuid not null references auth.users on delete cascade,
  item_id text not null, qty int not null check (qty >= 0), params jsonb not null default '{}',
  primary key (user_id, item_id)
);
create table if not exists atq_mp.favorites (
  user_id uuid not null references auth.users on delete cascade, item_id text not null, primary key (user_id, item_id)
);
create table if not exists atq_mp.houses (
  id text primary key, chunk text not null, kind text not null check (kind in ('house','cabin','apartment')),
  price bigint not null, door jsonb not null, owner_id uuid references auth.users, bought_at timestamptz
);
create table if not exists atq_mp.house_items (
  id bigint generated always as identity primary key, house_id text not null references atq_mp.houses on delete cascade,
  item_id text not null, params jsonb not null default '{}', pos int[] not null, rot_y smallint not null default 0, scale real not null default 1, room smallint not null default 0
);
create index if not exists house_items_house on atq_mp.house_items(house_id);
create table if not exists atq_mp.house_pieces (   -- doors / windows / walls / fences with hp + tier
  house_id text not null references atq_mp.houses on delete cascade, piece_id text not null, tier smallint not null default 0, hp real not null, primary key (house_id, piece_id)
);
create table if not exists atq_mp.vehicles (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users on delete cascade,
  body text not null, parts jsonb not null default '{}', paint jsonb not null default '{}', fuel real not null default 0, pos jsonb
);
create table if not exists atq_mp.purchases ( -- Google Play Billing receipts (idempotent on token)
  token text primary key, user_id uuid not null references auth.users, sku text not null, verified_at timestamptz not null default now()
);

-- Accounts: players sign in with Google (Supabase Auth, provider "google"; the Google OAuth client is configured in the dashboard later, not here).
-- Roles live in their OWN table so a player can never promote themselves through the profiles policy ("own profile" is for all, so an is_admin column there would be self-editable).
create table if not exists atq_mp.user_roles (
  user_id uuid primary key references auth.users on delete cascade,
  role text not null default 'player' check (role in ('player','admin')),
  granted_at timestamptz not null default now()
);
-- Exclusive skins: whole-character skins that only some accounts may select (the story Keem model is 'skin.keem_story', admin only).
create table if not exists atq_mp.exclusive_skins (
  id text primary key,                       -- stable string id, stored in look->>'exclusive'
  label text not null,
  admin_only boolean not null default true
);
insert into atq_mp.exclusive_skins (id, label, admin_only) values ('skin.keem_story', 'Keem (story character)', true) on conflict (id) do nothing;

create or replace function atq_mp.is_admin() returns boolean language sql stable security definer set search_path = atq_mp as $$
  select exists (select 1 from user_roles where user_id = auth.uid() and role = 'admin') $$;

-- May the current user use this look? A look that names an exclusive skin needs that skin to exist and (if admin_only) the caller to be an admin.
create or replace function atq_mp.look_allowed(p_look jsonb) returns boolean language sql stable security definer set search_path = atq_mp as $$
  select case when p_look ? 'exclusive' and coalesce(p_look->>'exclusive','') <> ''
    then exists (select 1 from exclusive_skins e where e.id = p_look->>'exclusive' and (not e.admin_only or is_admin()))
    else true end $$;

-- Defence in depth: even a service-role or RPC write cannot give a non-admin an admin-only skin.
create or replace function atq_mp.characters_guard() returns trigger language plpgsql security definer set search_path = atq_mp as $$
begin
  if auth.uid() is not null and not look_allowed(new.look) then raise exception 'skin is locked to the admin account'; end if;
  return new;
end $$;
drop trigger if exists characters_guard on atq_mp.characters;
create trigger characters_guard before insert or update on atq_mp.characters for each row execute function atq_mp.characters_guard();

alter table atq_mp.profiles enable row level security;    alter table atq_mp.characters enable row level security;
alter table atq_mp.wallets enable row level security;     alter table atq_mp.inventories enable row level security;
alter table atq_mp.favorites enable row level security;   alter table atq_mp.houses enable row level security;
alter table atq_mp.house_items enable row level security; alter table atq_mp.house_pieces enable row level security;
alter table atq_mp.vehicles enable row level security;    alter table atq_mp.purchases enable row level security;
alter table atq_mp.user_roles enable row level security;  alter table atq_mp.exclusive_skins enable row level security;

create policy "own profile" on atq_mp.profiles for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "profiles readable" on atq_mp.profiles for select using (true);
-- Writes are split per command so the WITH CHECK that enforces the exclusive-skin lock is explicit on every path.
create policy "own character insert" on atq_mp.characters for insert with check (user_id = auth.uid() and atq_mp.look_allowed(look));
create policy "own character update" on atq_mp.characters for update using (user_id = auth.uid()) with check (user_id = auth.uid() and atq_mp.look_allowed(look));
create policy "own character delete" on atq_mp.characters for delete using (user_id = auth.uid());
create policy "characters readable" on atq_mp.characters for select using (true);   -- other players must be able to render you
create policy "own wallet read" on atq_mp.wallets for select using (user_id = auth.uid());   -- writes only through RPCs
create policy "own inventory read" on atq_mp.inventories for select using (user_id = auth.uid());
create policy "own favorites" on atq_mp.favorites for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "houses readable" on atq_mp.houses for select using (true);
create policy "owner reads house items" on atq_mp.house_items for select using (exists (select 1 from atq_mp.houses h where h.id = house_id and h.owner_id = auth.uid()));
create policy "own vehicles" on atq_mp.vehicles for select using (owner_id = auth.uid());
create policy "own purchases read" on atq_mp.purchases for select using (user_id = auth.uid());

-- Example server-validated purchase (price comes from the catalog table / constants, never from the client)
create or replace function atq_mp.buy_house(p_house text) returns void language plpgsql security definer set search_path = atq_mp as $$
declare h houses%rowtype; begin
  select * into h from houses where id = p_house for update;
  if h.owner_id is not null then raise exception 'already owned'; end if;
  update wallets set cash = cash - h.price where user_id = auth.uid();   -- check constraint rejects negative balances
  update houses set owner_id = auth.uid(), bought_at = now() where id = p_house;
end $$;

-- Roles: everyone can read their OWN role (so the client can show/hide the locked skin); nobody can write through the API (no insert/update/delete policy).
create policy "own role read" on atq_mp.user_roles for select using (user_id = auth.uid());
-- Exclusive skins: admin-only skins are not even listed to other accounts (hidden), the rest are public.
create policy "visible skins" on atq_mp.exclusive_skins for select using (not admin_only or atq_mp.is_admin());
-- NOTE: "characters readable" stays public on purpose: other players must be able to RENDER the admin's Keem skin in the lobby. Only SELECTING it is locked.

-- Making Keem the admin: one-time, run by the project owner in the SQL editor AFTER Keem has signed in once with Google (service role, never from the client).
-- Replace the email with Keem's Google account; it is intentionally not hard-coded in the repo.
--   insert into atq_mp.user_roles (user_id, role) select id, 'admin' from auth.users where email = '<keem google email>' on conflict (user_id) do update set role = 'admin';
-- Default for everyone else: no row = 'player'. Profiles are created by a sign-in trigger (below, draft).
create or replace function atq_mp.handle_new_user() returns trigger language plpgsql security definer set search_path = atq_mp as $$
begin
  insert into profiles (user_id, display_name) values (new.id, left(coalesce(new.raw_user_meta_data->>'name', 'Survivor'), 20)) on conflict do nothing;
  insert into user_roles (user_id, role) values (new.id, 'player') on conflict do nothing;
  return new;
end $$;
-- (trigger on auth.users is created by the owner when the migration is applied; kept as a comment because it touches the shared auth schema)
--   create trigger atq_mp_on_signup after insert on auth.users for each row execute function atq_mp.handle_new_user();
