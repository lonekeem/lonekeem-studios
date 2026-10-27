// Optional accounts. Signed out = the local demo (everything in this browser).
// Signed in = reels, daily claim and takes go through the hosted API.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { supabase, api, friendlyError, ApiError } from './supabase.js';
import { SUPABASE_URL, SUPABASE_ANON_KEY, WEB_HOME, NATIVE_AUTH_CALLBACK } from './config.js';

const native = Capacitor.isNativePlatform();
const Ctx = createContext(null);

function redirectTarget() {
  if (native) return NATIVE_AUTH_CALLBACK;
  const { origin, hostname } = window.location;
  if (hostname === 'localhost' || hostname === '127.0.0.1') return origin + import.meta.env.BASE_URL;
  return WEB_HOME;
}

// Pull ?code / ?error out of the address bar after a magic-link return so it doesn't linger.
function cleanAuthParams() {
  const u = new URL(window.location.href);
  let changed = false;
  for (const k of ['code', 'error', 'error_code', 'error_description']) if (u.searchParams.has(k)) { u.searchParams.delete(k); changed = true; }
  if (/^#(error|access_token)=/.test(u.hash)) { u.hash = '#/watch'; changed = true; }
  if (changed) window.history.replaceState(null, '', u.toString());
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [ready, setReady] = useState(false);
  const [me, setMe] = useState(null);
  const [meError, setMeError] = useState('');
  const [catalog, setCatalog] = useState(null);
  const [providers, setProviders] = useState({ email: true, google: false });
  const [signInOpen, setSignInOpen] = useState(false);
  const [authNotice, setAuthNotice] = useState('');

  useEffect(() => {
    // Magic-link error that came back in the URL (expired / already used link)
    const q = new URLSearchParams(window.location.search);
    const h = new URLSearchParams(window.location.hash.replace(/^#\/?/, ''));
    const err = q.get('error_description') || h.get('error_description');
    if (err) setAuthNotice(`Sign-in link problem: ${err.replace(/\+/g, ' ')}. Request a new link.`);

    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true); cleanAuthParams(); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => { setSession(s); if (s) cleanAuthParams(); });

    // Which sign-in buttons to show (Google only once it's enabled in Supabase).
    fetch(`${SUPABASE_URL}/auth/v1/settings`, { headers: { apikey: SUPABASE_ANON_KEY } })
      .then((r) => r.json()).then((s) => setProviders({ email: s?.external?.email !== false, google: !!s?.external?.google }))
      .catch(() => {});

    // Android: the magic link reopens the app via com.lonekeemstudios.app://auth-callback?code=…
    let handle;
    if (native) {
      CapApp.addListener('appUrlOpen', async ({ url }) => {
        if (!url?.startsWith(NATIVE_AUTH_CALLBACK)) return;
        const p = new URL(url.replace(/#/, '?')).searchParams;
        const code = p.get('code');
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) setAuthNotice(`Couldn’t finish signing in: ${error.message}`);
        } else if (p.get('error_description')) setAuthNotice(`Sign-in link problem: ${p.get('error_description')}`);
      }).then((h2) => { handle = h2; });
    }
    return () => { sub.subscription.unsubscribe(); handle?.remove?.(); };
  }, []);

  const refreshMe = useCallback(async () => {
    try {
      const m = await api('/api/me');
      setMe(m); setMeError('');
      return m;
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) { await supabase.auth.signOut(); setAuthNotice('Your session expired. Sign in again.'); }
      else setMeError(friendlyError(e));
      return null;
    }
  }, []);

  useEffect(() => {
    if (!session) { setMe(null); return; }
    refreshMe();
    if (!catalog) api('/api/models').then(setCatalog).catch(() => {});
  }, [session?.user?.id]); // eslint-disable-line

  const value = useMemo(() => {
    const realOn = !!(me?.owner && me?.generation_mode === 'real');
    return {
      ready, session, signedIn: !!session, user: session?.user || null, me, meError, catalog, providers, realOn,
      authNotice, clearNotice: () => setAuthNotice(''),
      signInOpen, openSignIn: () => setSignInOpen(true), closeSignIn: () => setSignInOpen(false),
      refreshMe,
      setBalance: (balance) => typeof balance === 'number' && setMe((m) => (m ? { ...m, balance } : m)),
      sendMagicLink: async (email) => {
        const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTarget() } });
        if (error) throw error;
      },
      signInGoogle: async () => {
        const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: redirectTarget() } });
        if (error) throw error;
      },
      signOut: async () => { await supabase.auth.signOut(); setMe(null); },
      claimDaily: async () => {
        try {
          const r = await api('/api/claim-daily', { method: 'POST' });
          setMe((m) => (m ? { ...m, balance: r.balance, daily_claim_available: false } : m));
          return { ok: true, granted: r.granted };
        } catch (e) {
          if (e instanceof ApiError && e.code === 'already_claimed') setMe((m) => (m ? { ...m, balance: e.body.balance ?? m.balance, daily_claim_available: false } : m));
          if (e instanceof ApiError && e.status === 401) await supabase.auth.signOut();
          return { ok: false, message: friendlyError(e) };
        }
      },
      ledger: async () => {
        const { data } = await supabase.from('credit_ledger').select('delta,reason,created_at').order('created_at', { ascending: false }).limit(12);
        return data || [];
      },
    };
  }, [ready, session, me, meError, catalog, providers, signInOpen, authNotice, refreshMe]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
