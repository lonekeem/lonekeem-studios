// Supabase client + a tiny helper for the Lone Keem Studios API.
import { createClient } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';
import { SUPABASE_URL, SUPABASE_ANON_KEY, API_BASE } from './config.js';

const native = Capacitor.isNativePlatform();

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    flowType: 'pkce', // magic link comes back as ?code=… (keeps our #/hash routes intact)
    detectSessionInUrl: !native, // the Android app hands the code over via appUrlOpen instead
    persistSession: true,
    autoRefreshToken: true,
  },
});

export class ApiError extends Error {
  constructor(status, body) {
    super(body?.message || body?.error || `Request failed (${status})`);
    this.status = status;
    this.code = body?.error || '';
    this.body = body || {};
  }
}

export async function api(path, { method = 'GET', body, signal } = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  let r;
  try {
    r = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (e) {
    if (e.name === 'AbortError') throw e;
    throw new ApiError(0, { error: 'network', message: 'Can’t reach the studio servers. Check your connection.' });
  }
  const json = await r.json().catch(() => ({}));
  if (!r.ok) throw new ApiError(r.status, json);
  return json;
}

/** Turn backend errors into short, friendly lines. */
export function friendlyError(e) {
  if (e?.name === 'AbortError') return 'Cancelled.';
  if (!(e instanceof ApiError)) return e?.message || 'Something went wrong.';
  const b = e.body;
  switch (e.code) {
    case 'unauthorized': return 'Your session expired. Sign in again.';
    case 'insufficient_reels': return `Not enough reels (you have ${b.balance}, this take costs ${b.cost}). Claim your daily reels in the reels menu.`;
    case 'rate_limited': return `Daily take limit reached (${b.used_24h}/${b.limit} in 24h). Try again tomorrow.`;
    case 'owner_real_cap_reached': return b.message || `Real AI cap reached (${b.real_used_24h}/${b.real_cap} today). Try again tomorrow.`;
    case 'real_generation_not_enabled': return 'Real AI renders aren’t switched on right now. Your reels were not spent.';
    case 'prompt_rejected': return 'That scene breaks the community rules. Try a different idea.';
    case 'prompt_too_long': return 'That scene description is too long.';
    case 'provider_error': return 'The render farm couldn’t start this take. Reels refunded.';
    case 'already_claimed': return 'Daily reels already claimed. Come back tomorrow.';
    case 'model_not_allowed': return b.message || 'That lens isn’t available for real renders.';
    case 'network': return b.message;
    default: return b.message || `Something went wrong (${e.status}).`;
  }
}

/** Absolute URL for a clip video the API returns (demo samples are served from the API domain). */
export const absUrl = (u) => (!u ? u : /^https?:/i.test(u) ? u : `${API_BASE}${u.startsWith('/') ? '' : '/'}${u}`);
