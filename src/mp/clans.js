// Clan API: thin wrapper around public.clan_* RPCs. Guests can browse + see the board; writes need Google sign-in.
import { sb, getUser } from './online.js';
import { getProfile, saveProfile } from './profile.js';
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
    [/already reported/i, 'You already reported this banner.'],
    [/own banner/i, "You can't report your own clan's banner. Edit or reset it instead."],
    [/admin only/i, 'Only an admin can do that.'],
    [/no clan/i, 'That clan is gone.'],
    [/not enough cash/i, 'Not enough cash to create a clan.'],
    [/sync cash first/i, 'Your cash has not been saved to your account yet. Sign in, wait a moment, then try again.'],
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
export const CLAN_CREATE_PRICE = 2500; // in-game cash; must match atq_mp.clan_create_price()
export const money = n => '$' + Math.max(0, Math.floor(+n || 0)).toLocaleString('en-US');

export function sharedCash() {
  try { if (typeof window !== 'undefined' && window.__atq && window.__atq.save && window.__atq.save.cash != null) return window.__atq.save.cash | 0; } catch (e) { /* ignore */ }
  const p = getProfile && getProfile();
  return (p && p.cash) | 0;
}
export function applySharedCash(n) {
  n = Math.max(0, Math.floor(+n || 0));
  try { if (typeof window !== 'undefined' && window.__atq && window.__atq.save) window.__atq.save.cash = n; } catch (e) { /* ignore */ }
  try { saveProfile({ cash: n }, { silent: false }); } catch (e) { /* ignore */ }
  try {
    const shop = document.getElementById('shopCash');
    if (shop && window.__atq && window.__atq.save) {
      const save = window.__atq.save;
      shop.innerHTML = 'Cash: $' + save.cash + '  ·  Level ' + (save.level || 1);
    }
    const inv = document.getElementById('invStats');
    if (inv && window.__atq && window.__atq.save && /Cash \$/.test(inv.textContent || '')) {
      inv.textContent = (inv.textContent || '').replace(/Cash \$\d+/, 'Cash $' + n);
    }
    const pc = document.getElementById('profCash'); if (pc) pc.textContent = '$' + n;
    const cc = document.getElementById('cCash'); if (cc) cc.textContent = 'Cash: $' + n;
    const wal = document.getElementById('cWallet'); if (wal) wal.textContent = 'Your cash: ' + money(n);
  } catch (e) { /* ignore */ }
  try { window.__atq && window.__atq.reloadSave && window.__atq.reloadSave(); } catch (e) { /* ignore */ }
}

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
  const data = await call('clan_create', { p_name: cleanClanName(name), p_tag: cleanClanTag(tag), p_banner: cleanBanner(banner || DEFAULT_BANNER), p_join: join === 'invite' ? 'invite' : 'request' });
  if (data && data.cash != null) applySharedCash(data.cash);
  return data;
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
export async function clanReportBanner(id) { return call('clan_report_banner', { p_id: id }); }
export async function clanAdminResetBanner(id) { return call('clan_admin_reset_banner', { p_id: id }); }

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
  window.__atqClans = { clanMine, clanSearch, clanBoard, clanCreate, clanUpdate, refreshMine, cachedMine, cleanClanName, cleanClanTag, cleanBanner, CLAN_CREATE_PRICE, money, sharedCash, applySharedCash };
}
