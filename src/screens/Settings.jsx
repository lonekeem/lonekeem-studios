import React, { useState } from 'react';
import { useStore } from '../lib/store.jsx';
import { Icon, Sheet, Toggle, Avatar } from '../lib/ui.jsx';
import { isNative, shareText } from '../lib/native.js';

const EARN = [
  { id: 'notifications', icon: 'bell', title: 'Turn on notifications', reward: 30 },
  { id: 'invite', icon: 'share', title: 'Invite a friend', reward: 100 },
  { id: 'community', icon: 'people', title: 'Join the community', reward: 50 },
];

const LANGS = [['en', 'English'], ['es', 'Español'], ['fr', 'Français'], ['pt', 'Português'], ['de', 'Deutsch'], ['ja', '日本語']];

const DOCS = {
  terms: ['Terms of Service', 'Placeholder. This is a demo build — real terms will be published before launch. Content you create must follow the community rules: no sexual content, no real people without consent, no harassment, no illegal content.'],
  privacy: ['Privacy Policy', 'Placeholder. In this demo everything (your character, avatar, clips list, reels) is stored only in your browser’s localStorage. Nothing is uploaded and there are no accounts or trackers.'],
  merge: ['Merge accounts', 'Coming later: sign in on two devices and merge reels, characters and series into one account. Not available in the demo because there are no accounts.'],
  sub: ['Subscription', 'You are on the Free plan. Paid plans (longer clips, 720p/1080p, more reels) are not available in this demo and nothing can be purchased.'],
};

export default function Settings({ go }) {
  const { state, addCredits, markEarned, setPref, unblock, notify, logOut, deleteAccount } = useStore();
  const [doc, setDoc] = useState(null);
  const [feedback, setFeedback] = useState(false);
  const [fbText, setFbText] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const earn = async (t) => {
    if (state.earned[t.id]) return;
    if (t.id === 'notifications') {
      try { if ('Notification' in window) await Notification.requestPermission(); } catch {}
      setPref('notifications', true);
    }
    if (t.id === 'invite') {
      const url = isNative ? 'https://lonekeem.github.io/lonekeem-studios/' : window.location.href.split('#')[0];
      try {
        if (isNative) await shareText('Lone Keem Studios', 'Make your own AI short series with me', url);
        else if (navigator.share) await navigator.share({ title: 'Lone Keem Studios', text: 'Make your own AI short series with me', url });
        else { await navigator.clipboard?.writeText(url); notify('Invite link copied'); }
      } catch { /* share sheet dismissed — still reward in demo */ }
    }
    if (t.id === 'community') notify('Community link coming soon (demo).');
    markEarned(t.id);
    addCredits(t.reward, t.title);
    notify(`+${t.reward} reels`);
  };

  return (
    <div className="page settings">
      <h1 className="page-title">Settings</h1>

      <h3 className="group-title">Character</h3>
      <div className="card list">
        <button className="list-row" onClick={() => go(state.character.name ? 'character' : 'creator/look')} data-testid="settings-character">
          <Avatar character={state.character} size={44} />
          <span className="grow">{state.character.name || 'Create your character'}<span className="hint">{state.character.handle ? '@' + state.character.handle + ' · ' + state.character.voice.style + ' voice' : 'Look, voice, lore & details'}</span></span>
          <span className="link">Edit</span>
        </button>
      </div>

      <h3 className="group-title">Free reels</h3>
      <div className="card list">
        {EARN.map((t) => (
          <button key={t.id} className="list-row" onClick={() => earn(t)} disabled={state.earned[t.id]} data-testid={`earn-${t.id}`}>
            <Icon name={t.icon} /> <span className="grow">{t.title}</span>
            {state.earned[t.id] ? <span className="done"><Icon name="check" size={16} /> Claimed</span> : <span className="reward">+{t.reward}</span>}
          </button>
        ))}
        <button className="list-row" onClick={() => notify('Thanks for the love! ★ (store rating opens in the real app)')} data-testid="rate-us">
          <Icon name="star" /> <span className="grow">Rate us</span><span className="hint">No reward — just appreciated</span>
        </button>
      </div>

      <h3 className="group-title">Preferences</h3>
      <div className="card">
        <label className="toggle-row">
          <span className="toggle-label">Language</span>
          <select value={state.prefs.language} onChange={(e) => setPref('language', e.target.value)}>
            {LANGS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
        <Toggle label="Fade UI while watching" hint="Hide buttons after 3s so you see the whole video" checked={state.prefs.fadeUI}
          onChange={(v) => setPref('fadeUI', v)} testid="fade-ui" />
        <div className="toggle-row col">
          <span className="toggle-label">Blocked users</span>
          {!state.blocked.length ? <span className="hint">Nobody blocked. Block someone from the Report menu on any video.</span> : (
            <ul className="blocked">
              {state.blocked.map((h) => <li key={h}>@{h}<button className="link" onClick={() => unblock(h)}>Unblock</button></li>)}
            </ul>
          )}
        </div>
        {state.prefs.language !== 'en' && <p className="hint">Translations aren’t in the demo yet — the app stays in English.</p>}
      </div>

      <h3 className="group-title">Account</h3>
      <div className="card list">
        <button className="list-row" onClick={() => setDoc('sub')}><span className="grow">Subscription</span><span className="plan">Free plan</span></button>
        <button className="list-row" onClick={() => setDoc('merge')}><span className="grow">Merge accounts</span><Icon name="back" size={16} className="flip" /></button>
      </div>

      <h3 className="group-title">About</h3>
      <div className="card list">
        <button className="list-row" onClick={() => setFeedback(true)}><span className="grow">Send feedback</span><Icon name="back" size={16} className="flip" /></button>
        <button className="list-row" onClick={() => setDoc('terms')}><span className="grow">Terms of Service</span><Icon name="back" size={16} className="flip" /></button>
        <button className="list-row" onClick={() => setDoc('privacy')}><span className="grow">Privacy Policy</span><Icon name="back" size={16} className="flip" /></button>
        <div className="list-row static"><span className="grow">Version</span><span className="hint">0.1 demo</span></div>
      </div>

      <div className="card list">
        <button className="list-row" onClick={logOut} data-testid="logout"><span className="grow">Log out</span></button>
        <button className="list-row danger" onClick={() => setConfirmDelete(true)} data-testid="delete-account"><span className="grow">Delete account</span></button>
      </div>
      <p className="hint center">Lone Keem Studios · demo build · all data stays on this device</p>

      <Sheet open={!!doc} onClose={() => setDoc(null)} title={doc ? DOCS[doc][0] : ''}>
        <p className="muted">{doc && DOCS[doc][1]}</p>
        {doc === 'sub' && <button className="btn ghost wide" disabled>Upgrade (not available in demo)</button>}
      </Sheet>

      <Sheet open={feedback} onClose={() => setFeedback(false)} title="Send feedback">
        <textarea rows={5} value={fbText} onChange={(e) => setFbText(e.target.value)} placeholder="What should we build next?" />
        <button className="btn primary wide" disabled={!fbText.trim()} onClick={() => { setFeedback(false); setFbText(''); notify('Feedback saved (demo — not sent anywhere).'); }}>Send</button>
      </Sheet>

      <Sheet open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete account?">
        <p className="muted">This wipes your character, clips, series and reels from this device. It can’t be undone.</p>
        <button className="btn danger wide" onClick={() => { deleteAccount(); setConfirmDelete(false); window.location.hash = '/watch'; }} data-testid="confirm-delete">Delete everything</button>
        <button className="btn ghost wide" onClick={() => setConfirmDelete(false)}>Cancel</button>
      </Sheet>
    </div>
  );
}
