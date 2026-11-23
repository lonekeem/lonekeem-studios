// Staff (admin / moderator) API. Every write goes through a server RPC; the client never trusts a local role flag.
import { sb, getUser, getRole } from './online.js';

const FAKE = () => (typeof location !== 'undefined' && /^(localhost|127\.0\.0\.1)$/.test(location.hostname)) ? window.__MP_FAKE_AUTH : null;

export const isStaffRole = r => r === 'admin' || r === 'moderator';

export function friendlyModError(e) {
  const m = (e && e.message) || String(e || '');
  if (/sign in first/i.test(m)) return 'Sign in with Google first.';
  if (/banned/i.test(m)) return 'This account is banned from online play.';
  if (/muted/i.test(m)) return 'You are muted and cannot chat right now.';
  if (/staff only|admin only|permission|cannot moderate|cannot change your own|cannot %|cannot ban yourself|cannot mute yourself|cannot kick yourself/i.test(m)) return 'You do not have permission to do that.';
  if (/language/i.test(m)) return 'That message is not allowed.';
  if (/already reported/i.test(m)) return 'You already reported this.';
  if (/too fast/i.test(m)) return 'Slow down a little.';
  if (/empty/i.test(m)) return 'Type a message first.';
  if (/no player|no message|no report|no clan/i.test(m)) return 'Could not find that.';
  if (/own account|own banner/i.test(m)) return 'You cannot report yourself.';
  return m.replace(/^rejected:\s*/i, '').slice(0, 160) || 'Something went wrong.';
}

async function call(name, args = {}) {
  const c = await sb();
  const { data, error } = await c.schema('public').rpc(name, args);
  if (error) {
    const err = new Error(error.message || name + ' failed');
    err.code = error.code;
    throw err;
  }
  return data;
}

export async function myStatus() {
  const f = FAKE();
  if (f) {
    if (!f.email) return { signed_in: false, role: null };
    return {
      signed_in: true, user_id: f.id || 'fake-user', role: f.role || 'player',
      banned: !!f.banned, ban_reason: f.ban_reason || null, ban_ends: f.ban_ends || null,
      muted: !!f.muted, mute_reason: f.mute_reason || null, mute_ends: f.mute_ends || null,
      kicked: !!f.kicked, kick_reason: f.kick_reason || null, kick_room: f.kick_room || null, kick_ends: null,
    };
  }
  try {
    const u = await getUser();
    if (!u) return { signed_in: false, role: null };
    return await call('mp_my_status');
  } catch (e) {
    const r = await getRole().catch(() => null);
    return { signed_in: !!r, role: r, error: e.message };
  }
}

export async function staffBadges(ids) {
  const list = (ids || []).filter(Boolean);
  const f = FAKE();
  if (f && f.badges) return f.badges;
  if (!list.length) return [];
  try { return (await call('mp_staff_badges', { p_ids: list })) || []; } catch (e) { return []; }
}

export const searchPlayers = (q, limit = 20) => call('mp_admin_search', { p_q: q, p_limit: limit });
export const listStaff = () => call('mp_admin_list_staff');
export const setRole = (user, role) => call('mp_admin_set_role', { p_user: user, p_role: role });
export const auditLog = (limit = 80) => call('mp_mod_audit', { p_limit: limit });
export const mutePlayer = (user, minutes, reason = '') => call('mp_mod_mute', { p_user: user, p_minutes: minutes, p_reason: reason });
export const unmutePlayer = (user) => call('mp_mod_unmute', { p_user: user });
export const banPlayer = (user, minutes, reason = '') => call('mp_mod_ban', { p_user: user, p_minutes: minutes, p_reason: reason });
export const unbanPlayer = (user) => call('mp_mod_unban', { p_user: user });
export const kickPlayer = (user, room = null, reason = '') => call('mp_mod_kick', { p_user: user, p_room: room, p_reason: reason });
export const resetName = (user) => call('mp_mod_reset_name', { p_user: user });
export const resetClanBanner = (id) => call('mp_mod_reset_clan_banner', { p_id: id });
export const resetClanName = (id) => call('mp_mod_reset_clan_name', { p_id: id });
export const listReports = (status = 'open', limit = 50) => call('mp_mod_reports', { p_status: status, p_limit: limit });
export const resolveReport = (id, status) => call('mp_mod_resolve_report', { p_id: id, p_status: status });
export const deleteChat = (id) => call('mp_mod_delete_chat', { p_id: id });
export const sendChat = (room, text, name) => call('mp_chat_send', { p_room: room, p_text: text, p_name: name || null });
export const recentChat = (room, limit = 12) => call('mp_chat_recent', { p_room: room, p_limit: limit });
export const fileReport = (opts) => call('mp_report', {
  p_type: opts.type,
  p_reason: opts.reason || '',
  p_user: opts.user || null,
  p_chat: opts.chat || null,
  p_clan: opts.clan || null,
  p_detail: opts.detail || null,
});

// A small client-side copy of the worst terms so offline / guest chat is filtered too.
// The server still uses atq_mp.clan_is_bad and is the real gate when signed in.
const BAD = /nigger|nigga|faggot|kike|tranny|retard|rape|rapist|pedo|paedo|molest|nazi|hitler|kkk|onlyfans|porn|pussy|blowjob/i;
export function chatNotAllowed(text) { return BAD.test(String(text || '').replace(/[^a-z0-9]/gi, '')); }

// Global staff broadcast (kick / chat delete). Clients still confirm kicks with mp_my_status.
let staffCh = null, staffClient = null, staffHandlers = new Set();
export async function listenStaff(fn) {
  if (fn) staffHandlers.add(fn);
  if (FAKE()) return () => staffHandlers.delete(fn);
  if (staffCh) return () => staffHandlers.delete(fn);
  try {
    staffClient = await sb();
    staffCh = staffClient.channel('atq-staff', { config: { broadcast: { self: true } } });
    staffCh.on('broadcast', { event: 'mod' }, ({ payload }) => { for (const h of staffHandlers) try { h(payload); } catch (e) { /* ignore */ } });
    await staffCh.subscribe();
  } catch (e) { staffCh = null; }
  return () => staffHandlers.delete(fn);
}
export async function emitStaff(payload) {
  if (FAKE()) { for (const h of staffHandlers) try { h(payload); } catch (e) { /* ignore */ } return; }
  try {
    if (!staffCh) await listenStaff();
    if (staffCh) await staffCh.send({ type: 'broadcast', event: 'mod', payload });
  } catch (e) { /* ignore */ }
}

export function formatBan(st) {
  if (!st || !st.banned) return '';
  if (!st.ban_ends) return 'permanently banned' + (st.ban_reason ? ' (' + st.ban_reason + ')' : '');
  try { return 'banned until ' + new Date(st.ban_ends).toLocaleString() + (st.ban_reason ? ' (' + st.ban_reason + ')' : ''); }
  catch (e) { return 'banned'; }
}
