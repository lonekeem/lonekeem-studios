-- After the Quiet multiplayer: online access layer (applied after 20261118_mp_phase1.sql).
-- 1) API grants (RLS from phase1 still decides what each row-access allows), 2) sign-up trigger, 3) admin e-mail allow-list, 4) expose the schema to the Data API.
grant usage on schema atq_mp to anon, authenticated;
grant select on all tables in schema atq_mp to anon, authenticated;
grant insert, update, delete on atq_mp.characters, atq_mp.profiles, atq_mp.favorites to authenticated;
grant execute on function atq_mp.is_admin(), atq_mp.look_allowed(jsonb) to anon, authenticated;

-- Admin e-mail allow-list: nobody can read or write it through the API (RLS on, no policy). The owner adds Keem's Google e-mail via the SQL editor / connector.
create table if not exists atq_mp.admin_emails (email text primary key);
alter table atq_mp.admin_emails enable row level security;
revoke all on atq_mp.admin_emails from anon, authenticated;

create or replace function atq_mp.handle_new_user() returns trigger language plpgsql security definer set search_path = atq_mp as $$
declare r text;
begin
  r := case when exists (select 1 from admin_emails a where lower(a.email) = lower(new.email)) then 'admin' else 'player' end;
  insert into profiles (user_id, display_name) values (new.id, greatest(left(coalesce(new.raw_user_meta_data->>'name', 'Survivor'), 20), 'Survivor')) on conflict do nothing;
  insert into user_roles (user_id, role) values (new.id, r) on conflict (user_id) do update set role = excluded.role where user_roles.role <> 'admin';
  return new;
end $$;
drop trigger if exists atq_mp_on_signup on auth.users;
create trigger atq_mp_on_signup after insert on auth.users for each row execute function atq_mp.handle_new_user();

-- If the allow-list gains an address after that person already signed in, promote them right away.
create or replace function atq_mp.admin_email_added() returns trigger language plpgsql security definer set search_path = atq_mp as $$
begin
  insert into user_roles (user_id, role) select u.id, 'admin' from auth.users u where lower(u.email) = lower(new.email) on conflict (user_id) do update set role = 'admin';
  return new;
end $$;
drop trigger if exists admin_email_added on atq_mp.admin_emails;
create trigger admin_email_added after insert on atq_mp.admin_emails for each row execute function atq_mp.admin_email_added();

-- The Data API only exposes `public` by default (changing "Exposed schemas" is a dashboard setting), so the client reads its own role through this tiny wrapper.
create or replace function public.mp_my_role() returns text language sql stable security definer set search_path = atq_mp as $$
  select coalesce((select role from user_roles where user_id = auth.uid()), case when auth.uid() is null then null else 'player' end) $$;
revoke all on function public.mp_my_role() from public; grant execute on function public.mp_my_role() to anon, authenticated;
