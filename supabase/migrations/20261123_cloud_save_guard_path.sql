-- pin search_path on the cloud-save helper functions (Supabase advisor: role mutable search_path)
alter function atq_mp.jarr_union(jsonb, jsonb) set search_path = pg_catalog, atq_mp;
alter function atq_mp.num(jsonb, text) set search_path = pg_catalog, atq_mp;
alter function atq_mp.save_guard(jsonb, jsonb, timestamptz) set search_path = pg_catalog, atq_mp;
revoke execute on function public.profile_save(text, text, jsonb, jsonb, int, boolean), public.profile_load(), atq_mp.save_guard(jsonb, jsonb, timestamptz) from anon;
