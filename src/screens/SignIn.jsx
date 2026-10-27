import React, { useState } from 'react';
import { useAuth } from '../lib/auth.jsx';
import { Sheet, Icon } from '../lib/ui.jsx';

// Studio pass: optional sign-in. Signed out, the app is a local demo.
export function SignInForm({ onSent }) {
  const auth = useAuth();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState('');
  const [err, setErr] = useState('');
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const send = async (e) => {
    e?.preventDefault();
    if (!valid || busy) return;
    setBusy(true); setErr('');
    try {
      await auth.sendMagicLink(email.trim());
      setSent(email.trim());
      onSent?.();
    } catch (x) {
      setErr(/rate|seconds/i.test(x.message) ? 'Too many links requested. Wait a minute and try again.' : x.message || 'Couldn’t send the link.');
    } finally { setBusy(false); }
  };

  if (sent) {
    return (
      <div className="signin-sent" data-testid="signin-sent">
        <Icon name="check" size={28} />
        <p><b>Check your inbox.</b> We sent a sign-in link to <b>{sent}</b>. Open it on this device to step onto the lot.</p>
        <button className="btn ghost wide" onClick={() => setSent('')}>Use a different email</button>
      </div>
    );
  }
  return (
    <form className="signin-form" onSubmit={send}>
      <input className="input" type="email" inputMode="email" autoComplete="email" placeholder="you@example.com"
        value={email} onChange={(e) => setEmail(e.target.value)} data-testid="signin-email" aria-label="Email" />
      <button className="btn primary wide" type="submit" disabled={!valid || busy} data-testid="signin-send">
        {busy ? 'Sending…' : 'Email me a sign-in link'}
      </button>
      {auth.providers.google && (
        <button type="button" className="btn ghost wide" onClick={() => auth.signInGoogle().catch((x) => setErr(x.message))} data-testid="signin-google">
          Continue with Google
        </button>
      )}
      {err && <p className="hint warn" role="alert" data-testid="signin-error">{err}</p>}
      <p className="hint">No password. Your studio pass keeps your reels on your account and unlocks daily reels.</p>
    </form>
  );
}

export default function SignInSheet() {
  const auth = useAuth();
  return (
    <Sheet open={auth.signInOpen} onClose={auth.closeSignIn} title="Get your studio pass">
      <SignInForm />
    </Sheet>
  );
}
