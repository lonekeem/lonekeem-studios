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

alter table atq_mp.profiles enable row level security;    alter table atq_mp.characters enable row level security;
alter table atq_mp.wallets enable row level security;     alter table atq_mp.inventories enable row level security;
alter table atq_mp.favorites enable row level security;   alter table atq_mp.houses enable row level security;
alter table atq_mp.house_items enable row level security; alter table atq_mp.house_pieces enable row level security;
alter table atq_mp.vehicles enable row level security;    alter table atq_mp.purchases enable row level security;

create policy "own profile" on atq_mp.profiles for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "profiles readable" on atq_mp.profiles for select using (true);
create policy "own character write" on atq_mp.characters for all using (user_id = auth.uid()) with check (user_id = auth.uid());
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
