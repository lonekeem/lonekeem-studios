-- Tightens EXECUTE grants: write/membership RPCs are authenticated-only.
-- Read RPCs (clan_get, clan_search, clan_board, clan_tags) stay available to guests.
revoke all on function
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
from public, anon;

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
