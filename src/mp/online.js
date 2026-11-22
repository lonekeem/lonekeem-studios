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
  connect(timeout = 8000) {
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
const FAKE = () => (typeof location !== 'undefined' && /^(localhost|127\.0\.0\.1)$/.test(location.hostname)) ? window.__MP_FAKE_AUTH : null; // dev/test hook (localhost only)
export async function getUser() { const f = FAKE(); if (f) return f.email ? { email: f.email, user_metadata: { name: f.name } } : null; try { const c = await sb(); const { data } = await c.auth.getSession(); return data.session ? data.session.user : null; } catch (e) { return null; } }
// Google sign-in. Web: normal redirect back to this page. Android app: Google refuses sign-in inside an embedded WebView, so the
// sign-in page opens in the phone's browser and comes back through the app link com.lonekeemstudios.app://auth-callback?code=...
// (AndroidManifest intent-filter, launchMode singleTask), handled by installNativeAuth() below. resume: 'mp' (town creator) or 'online' (world lobby).
export const isNative = () => { try { return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()); } catch (e) { return false; } };
export const NATIVE_REDIRECT = 'com.lonekeemstudios.app://auth-callback';
export async function signInGoogle(resume = 'mp') {
  const c = await sb(); try { if (resume === 'online') localStorage.setItem('atq.online.resume', String(Date.now())); else sessionStorage.setItem('atq.mp.resume', '1'); } catch (e) { /* ignore */ }
  if (isNative()) {
    const { data, error } = await c.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: NATIVE_REDIRECT, skipBrowserRedirect: true, queryParams: { prompt: 'select_account' } } }); if (error) throw error;
    location.href = data.url; return; // Capacitor hands non-app URLs to the system browser
  }
  const redirectTo = location.href.split('#')[0].split('?')[0];
  const { error } = await c.auth.signInWithOAuth({ provider: 'google', options: { redirectTo, queryParams: { prompt: 'select_account' } } }); if (error) throw error;
}
let nativeAuthOn = false;
/** Android only: finish a Google sign-in when the browser hands the code back to the app. onDone(user|null) runs after the session is stored. */
export async function installNativeAuth(onDone) {
  if (!isNative() || nativeAuthOn) return; nativeAuthOn = true;
  const { App } = await import('@capacitor/app');
  const finish = async url => {
    if (!url || !url.startsWith(NATIVE_REDIRECT)) return; let code = null, err = null;
    try { const u = new URL(url.replace(NATIVE_REDIRECT, 'https://cb.local/')); code = u.searchParams.get('code'); err = u.searchParams.get('error_description') || u.searchParams.get('error'); } catch (e) { /* ignore */ }
    try { if (code) { const c = await sb(); const { data, error } = await c.auth.exchangeCodeForSession(code); if (error) throw error; onDone && onDone(data.user || null); } else onDone && onDone(null, err); } catch (e) { console.warn('[auth] code exchange failed', e); onDone && onDone(null, e.message || String(e)); }
  };
  App.addListener('appUrlOpen', ({ url }) => finish(url));
  try { const l = await App.getLaunchUrl(); if (l && l.url) finish(l.url); } catch (e) { /* ignore */ }
}
export async function signOut() { const f = FAKE(); if (f) { window.__MP_FAKE_AUTH = {}; return; } const c = await sb(); await c.auth.signOut(); }
/** 'admin' | 'player' | null (signed out / unreachable). Reads the caller's own row (RLS: own role read). */
export async function getRole() { const f = FAKE(); if (f) return f.email ? (f.role || 'player') : null; try { const c = await sb(); const u = await getUser(); if (!u) return null; const { data, error } = await c.schema('public').rpc('mp_my_role'); if (error) return null; return data; } catch (e) { return null; } }
/** Is the Google provider switched on in the Supabase dashboard? (button stays hidden until Keem finishes the OAuth setup) */
export async function googleEnabled() { try { const r = await withTimeout(fetch(SB_URL + '/auth/v1/settings', { headers: { apikey: SB_KEY } }), 4000, 'settings'); const j = await r.json(); return !!(j.external && j.external.google); } catch (e) { return false; } }
