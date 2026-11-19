// Online layer for multiplayer: Supabase Realtime (broadcast) as the Net transport + Google sign-in + role lookup.
// Everything here is optional: if the project is unreachable or the network is off, the town falls back to solo (BroadcastChannel, same-browser tabs only).
// The URL and publishable key are PUBLIC by design (they ship in every browser build); security is enforced by RLS (supabase/migrations/20261118_mp_phase1.sql).
export const SB_URL = 'https://wwdwbnhswynjcxeerdgz.supabase.co';
export const SB_KEY = 'sb_publishable_Lr8VClcrLGY57mypsUP09A_Y5YRhOag';
let clientP = null;
export function sb() {
  if (!clientP) clientP = import('@supabase/supabase-js').then(({ createClient }) => createClient(SB_URL, SB_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' },
    realtime: { params: { eventsPerSecond: 40 } },
  }));
  return clientP;
}
const withTimeout = (p, ms, what) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error(what + ' timed out')), ms))]);

export class SupabaseTransport {
  constructor(client, room) { this.client = client; this.room = room; this.ok = false; this.onstatus = null; this.onmessage = null; }
  /** Resolves true when the realtime channel is joined, false/throws on failure. */
  connect(timeout = 4500) {
    this.ch = this.client.channel('atq-mp-' + this.room, { config: { broadcast: { self: false, ack: false } } });
    this.ch.on('broadcast', { event: 'm' }, ({ payload }) => this.onmessage && this.onmessage(payload));
    return withTimeout(new Promise((res, rej) => this.ch.subscribe(st => {
      const ok = st === 'SUBSCRIBED'; this.ok = ok; this.onstatus && this.onstatus(ok, st);
      if (ok) res(true); else if (st === 'CHANNEL_ERROR' || st === 'TIMED_OUT') rej(new Error(st));
    })), timeout, 'realtime');
  }
  send(m) { if (this.ok) this.ch.send({ type: 'broadcast', event: 'm', payload: m }); }
  close() { try { this.ch && this.client.removeChannel(this.ch); } catch (e) { /* ignore */ } }
}

/** Try to join the online room. Returns { transport, client } or null (solo fallback). */
export async function goOnline(room = 'town') {
  try {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return null;
    const client = await withTimeout(sb(), 8000, 'sdk'); const tp = new SupabaseTransport(client, room); await tp.connect(); return { transport: tp, client };
  } catch (e) { console.warn('[mp] online unavailable, solo mode:', e.message); return null; }
}

// ---- accounts ----
export async function getUser() { try { const c = await sb(); const { data } = await c.auth.getSession(); return data.session ? data.session.user : null; } catch (e) { return null; } }
export async function signInGoogle() { const c = await sb(); const redirectTo = location.origin + location.pathname; const { error } = await c.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } }); if (error) throw error; }
export async function signOut() { const c = await sb(); await c.auth.signOut(); }
/** 'admin' | 'player' | null (signed out / unreachable). Reads the caller's own row (RLS: own role read). */
export async function getRole() { try { const c = await sb(); const u = await getUser(); if (!u) return null; const { data, error } = await c.schema('public').rpc('mp_my_role'); if (error) return null; return data; } catch (e) { return null; } }
/** Is the Google provider switched on in the Supabase dashboard? (button stays hidden until Keem finishes the OAuth setup) */
export async function googleEnabled() { try { const r = await withTimeout(fetch(SB_URL + '/auth/v1/settings', { headers: { apikey: SB_KEY } }), 4000, 'settings'); const j = await r.json(); return !!(j.external && j.external.google); } catch (e) { return false; } }
