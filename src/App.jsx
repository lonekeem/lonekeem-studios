import React, { useEffect, useState } from 'react';
import { StoreProvider, useStore, DAILY_TOPUP } from './lib/store.jsx';
import { Icon, Sheet } from './lib/ui.jsx';
import { IS_DEMO } from './lib/generateClip.js';
import Watch from './screens/Watch.jsx';
import Create from './screens/Create.jsx';
import Character from './screens/Character.jsx';
import Series from './screens/Series.jsx';
import Settings from './screens/Settings.jsx';

const TABS = [
  { id: 'watch', label: 'Watch', icon: 'home' },
  { id: 'series', label: 'My series', icon: 'film' },
  { id: 'create', label: 'Create', icon: 'plus' },
  { id: 'character', label: 'Character', icon: 'user' },
  { id: 'settings', label: 'Settings', icon: 'gear' },
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
  const [tab, sub] = route.split('/');

  if (state.loggedOut) {
    return (
      <div className="welcome">
        <div className="brand-mark big" />
        <h1>Lone Keem Studios</h1>
        <p className="muted">Make your character. Star in your own short series.</p>
        <button className="btn primary wide" onClick={logIn} data-testid="login">Continue in demo mode</button>
        <p className="hint">Demo only — no account, no sign-up. Your data stays in this browser.</p>
      </div>
    );
  }

  const isWatch = tab === 'watch';
  return (
    <div className={'app' + (isWatch ? ' on-watch' : '')}>
      <header className="topbar">
        <a className="brand" href="#/watch"><span className="brand-mark" />Lone Keem <b>Studios</b></a>
        {IS_DEMO && <span className="demo-pill">DEMO</span>}
        <button className="credit-pill" onClick={() => setCreditsOpen(true)} data-testid="credits">
          <Icon name="coin" size={18} /> <span data-testid="credit-balance">{state.credits}</span>
        </button>
      </header>

      <main className="screen">
        {tab === 'watch' && <Watch />}
        {tab === 'create' && <Create mode={sub} go={go} />}
        {tab === 'character' && <Character go={go} />}
        {tab === 'series' && <Series go={go} />}
        {tab === 'settings' && <Settings go={go} />}
        {!TABS.some((t) => t.id === tab) && <Watch />}
      </main>

      <nav className="tabbar">
        {TABS.map((t) => (
          <button key={t.id} className={'tab' + (tab === t.id ? ' active' : '') + (t.id === 'create' ? ' tab-create' : '')}
            onClick={() => go(t.id)} data-testid={'tab-' + t.id} aria-label={t.label}>
            {t.id === 'create' ? <span className="create-bubble"><Icon name="plus" size={26} stroke={2.6} /></span> : <Icon name={t.icon} />}
            <span>{t.label}</span>
          </button>
        ))}
      </nav>

      <Sheet open={creditsOpen} onClose={() => setCreditsOpen(false)} title="Credits">
        <div className="credit-big"><Icon name="coin" size={30} /> {state.credits}</div>
        <p className="muted">Demo credits — not real money. You get <b>{DAILY_TOPUP}</b> free every day you open the app.</p>
        <button className="btn ghost wide" onClick={() => { setCreditsOpen(false); go('settings'); }}>Earn more credits</button>
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
