import React, { useEffect, useState } from 'react';
import { StoreProvider, useStore, DAILY_TOPUP } from './lib/store.jsx';
import { Icon, Sheet, Monogram, tick } from './lib/ui.jsx';
import { IS_DEMO } from './lib/generateClip.js';
import Watch from './screens/Watch.jsx';
import Create from './screens/Create.jsx';
import Character from './screens/Character.jsx';
import Series from './screens/Series.jsx';
import Settings from './screens/Settings.jsx';
import Creator, { Welcome } from './screens/Creator.jsx';
import Show from './screens/Show.jsx';

const TABS = [
  { id: 'watch', label: 'Showing', icon: 'ticket' },
  { id: 'series', label: 'Library', icon: 'library' },
  { id: 'create', label: 'Action', icon: 'clapper' },
  { id: 'character', label: 'Cast', icon: 'cast' },
  { id: 'settings', label: 'Studio', icon: 'gear' },
];

function useHashRoute() {
  const get = () => (window.location.hash.replace(/^#\/?/, '') || 'watch');
  const [route, setRoute] = useState(get);
  useEffect(() => {
    const on = () => setRoute(get());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return [route, (r) => { window.location.hash = '/' + r; }];
}

function Shell() {
  const { state, toast, logIn } = useStore();
  const [route, go] = useHashRoute();
  const [creditsOpen, setCreditsOpen] = useState(false);
  const [introSeen, setIntroSeen] = useState(false);
  const [tab, sub] = route.split('/');
  const firstRun = !state.onboarded;

  // Haptic-feel presses: a tiny vibration on buttons (phones that support it).
  useEffect(() => {
    const on = (e) => { if (e.target.closest?.('.btn, .act, .tab, .pill, .tool')) tick(); };
    document.addEventListener('pointerdown', on, { passive: true });
    return () => document.removeEventListener('pointerdown', on);
  }, []);

  if (state.loggedOut) {
    return (
      <div className="welcome">
        <Monogram size={84} />
        <h1>Lone Keem Studios</h1>
        <p className="tagline">Your character. Your series.</p>
        <button className="btn primary wide" onClick={logIn} data-testid="login">Continue in demo mode</button>
        <p className="hint">Demo only — no account, no sign-up. Your data stays in this browser.</p>
      </div>
    );
  }

  // First run: short (skippable) welcome, then the character creator before the feed.
  if (firstRun && !state.loggedOut) {
    if (!introSeen && tab !== 'creator') {
      return <div className="app solo"><Welcome onStart={() => { setIntroSeen(true); go('creator/look'); }} onSkip={() => { setIntroSeen(true); go('creator/look'); }} />{toast && <div className="toast" role="status">{toast}</div>}</div>;
    }
    return <div className="app solo"><Creator tab={tab === 'creator' ? sub : 'look'} go={go} firstRun />{toast && <div className="toast" role="status">{toast}</div>}</div>;
  }
  if (tab === 'creator') {
    return <div className="app solo"><Creator tab={sub} go={go} />{toast && <div className="toast" role="status">{toast}</div>}</div>;
  }

  const isWatch = tab === 'watch';
  return (
    <div className={'app' + (isWatch ? ' on-watch' : '')}>
      <header className="topbar">
        <a className="brand" href="#/watch"><Monogram size={28} /><span className="brand-word">Lone Keem <b>Studios</b></span></a>
        {IS_DEMO && <span className="demo-pill">DEMO</span>}
        <button className="credit-pill reel-pill" onClick={() => setCreditsOpen(true)} data-testid="credits" aria-label="Reels">
          <Icon name="reel" size={18} className="spin-reel" /> <span data-testid="credit-balance">{state.credits}</span>
        </button>
      </header>

      <main className="screen">
        {tab === 'watch' && <Watch go={go} />}
        {tab === 'create' && <Create mode={sub} go={go} />}
        {tab === 'character' && <Character go={go} />}
        {tab === 'series' && <Series go={go} sub={sub} />}
        {tab === 'show' && <Show key={route} id={sub} play={route.split('/')[2]} go={go} />}
        {tab === 'settings' && <Settings go={go} />}
        {!TABS.some((t) => t.id === tab) && tab !== 'show' && <Watch go={go} />}
      </main>

      <nav className="tabbar dock">
        {TABS.map((t) => (
          <button key={t.id} className={'tab' + (tab === t.id || (tab === 'show' && t.id === 'series') ? ' active' : '') + (t.id === 'create' ? ' tab-create' : '')}
            onClick={() => go(t.id)} data-testid={'tab-' + t.id} aria-label={t.id === 'create' ? 'Create' : t.label}>
            {t.id === 'create' ? (
              <span className="clap-btn" aria-hidden="true">
                <span className="clap-top"><i /><i /><i /><i /></span>
                <span className="clap-body"><span className="rec-dot" /></span>
              </span>
            ) : <Icon name={t.icon} />}
            <span>{t.label}</span>
          </button>
        ))}
      </nav>

      <Sheet open={creditsOpen} onClose={() => setCreditsOpen(false)} title="Your reels">
        <div className="credit-big"><Icon name="reel" size={30} /> {state.credits}</div>
        <p className="muted">Reels are what you spend to shoot scenes. Demo reels aren't real money, and you get <b>{DAILY_TOPUP}</b> free every day you open the app.</p>
        <button className="btn ghost wide" onClick={() => { setCreditsOpen(false); go('settings'); }}>Free reels</button>
        <h4>Recent activity</h4>
        <ul className="ledger">
          {state.ledger.slice(0, 12).map((l, i) => (
            <li key={i}><span>{l.reason}</span><b className={l.amount > 0 ? 'pos' : 'neg'}>{l.amount > 0 ? '+' : ''}{l.amount}</b></li>
          ))}
        </ul>
      </Sheet>

      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}

export default function App() {
  return <StoreProvider><Shell /></StoreProvider>;
}
