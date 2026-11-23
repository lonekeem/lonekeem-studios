// Clan API: thin wrapper around public.clan_* RPCs. Guests can browse + see the board; writes need Google sign-in.
import { sb, getUser } from './online.js';
import { cleanBanner, DEFAULT_BANNER } from './clanBanner.js';

const isLocal = () => typeof location !== 'undefined' && /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
const rpcErr = (error) => {
  const m = (error && error.message) || 'request failed';
  const map = [
    [/sign in first/i, 'Sign in with Google to use clans.'],
    [/already in a clan/i, 'You are already in a clan. Leave it first.'],
    [/name taken/i, 'That clan name is taken.'],
    [/tag taken/i, 'That tag is taken.'],
    [/name not allowed|tag not allowed/i, 'Please pick a different name or tag.'],
    [/tag reserved/i, 'That tag is reserved.'],
    [/name length/i, 'Names need 3–24 letters or numbers.'],
    [/tag length/i, 'Tags need 2–5 letters or numbers.'],
    [/create limit/i, 'You can only create a few clans per day.'],
    [/already invited|already requested/i, 'That is already pending.'],
    [/clan full/i, 'That clan is full (30 members).'],
    [/invite only/i, 'This clan is invite-only.'],
    [/officers only|leader only/i, "You don't have permission to do that."],
    [/transfer or disband/i, 'Transfer leadership or disband the clan first.'],
    [/player not found/i, 'No player with that name was found.'],
    [/cannot kick/i, "You can't kick that member."],
    [/too fast/i, 'Slow down a little and try again.'],
    [/no clan/i, 'That clan is gone.'],
  ];
  for (const [re, t] of map) if (re.test(m)) return t;
  return m.replace(/^rejected:\s*/i, '');
};
async function call(name, args) {
  const c = await sb();
  const { data, error } = await c.rpc(name, args || {});
  if (error) throw new Error(rpcErr(error));
  return data;
}

export const MAX_MEMBERS = 30;
export function cleanClanName(n) { return String(n || '').replace(/[^\p{L}\p{N} _.\-]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 24); }
export function cleanClanTag(t) { return String(t || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 5); }

export async function clanMine() { return call('clan_mine'); }
export async function clanGet(id) { return call('clan_get', { p_id: id }); }
export async function clanSearch(q = '', limit = 30) { return call('clan_search', { p_q: q || '', p_limit: limit }); }
export async function clanBoard(sort = 'kills', limit = 50) {
  const u = await getUser().catch(() => null);
  return call('clan_board', { p_sort: sort, p_limit: limit, p_me: u && u.id ? u.id : null });
}
export async function clanTags(ids = []) { return call('clan_tags', { p_ids: ids }); }
export async function clanCreate({ name, tag, banner, join }) {
  return call('clan_create', { p_name: cleanClanName(name), p_tag: cleanClanTag(tag), p_banner: cleanBanner(banner || DEFAULT_BANNER), p_join: join === 'invite' ? 'invite' : 'request' });
}
export async function clanUpdate(id, patch) {
  const args = { p_id: id };
  if (patch.name != null) args.p_name = cleanClanName(patch.name);
  if (patch.tag != null) args.p_tag = cleanClanTag(patch.tag);
  if (patch.banner != null) args.p_banner = cleanBanner(patch.banner);
  if (patch.join != null) args.p_join = patch.join === 'invite' ? 'invite' : 'request';
  return call('clan_update', args);
}
export async function clanDisband(id) { return call('clan_disband', { p_id: id }); }
export async function clanLeave(id) { return call('clan_leave', { p_id: id }); }
export async function clanTransfer(id, userId) { return call('clan_transfer', { p_id: id, p_user: userId }); }
export async function clanKick(id, userId) { return call('clan_kick', { p_id: id, p_user: userId }); }
export async function clanPromote(id, userId, role) { return call('clan_promote', { p_id: id, p_user: userId, p_role: role }); }
export async function clanInvite(id, userId) { return call('clan_invite', { p_id: id, p_user: userId }); }
export async function clanInviteByName(id, name) { return call('clan_invite_by_name', { p_id: id, p_name: String(name || '').trim() }); }
export async function clanInviteRespond(inviteId, accept) { return call('clan_invite_respond', { p_invite: inviteId, p_accept: !!accept }); }
export async function clanInviteCancel(inviteId) { return call('clan_invite_cancel', { p_invite: inviteId }); }
export async function clanRequest(id) { return call('clan_request', { p_id: id }); }
export async function clanRequestRespond(requestId, accept) { return call('clan_request_respond', { p_request: requestId, p_accept: !!accept }); }

let cache = { at: 0, mine: null };
export function cachedMine() { return cache.mine; }
export async function refreshMine(force) {
  if (!force && cache.mine && Date.now() - cache.at < 8000) return cache.mine;
  const u = await getUser().catch(() => null);
  if (!u || !u.id) { cache = { at: Date.now(), mine: { signed_in: false, clan: null, inbox: [] } }; return cache.mine; }
  try { cache = { at: Date.now(), mine: await clanMine() }; } catch (e) { cache = { at: Date.now(), mine: { signed_in: !!u, clan: null, inbox: [], error: e.message } }; }
  return cache.mine;
}
export function forgetMine() { cache = { at: 0, mine: null }; }
export function myClanBrief() {
  const m = cache.mine; if (!m || !m.clan) return null;
  return { id: m.clan.id, name: m.clan.name, tag: m.clan.tag, banner: m.clan.banner, role: m.role };
}

if (typeof window !== 'undefined' && isLocal()) {
  window.__atqClans = { clanMine, clanSearch, clanBoard, clanCreate, clanUpdate, refreshMine, cachedMine, cleanClanName, cleanClanTag, cleanBanner };
}
