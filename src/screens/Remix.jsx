import React, { useState } from 'react';
import { useStore } from '../lib/store.jsx';
import { Icon, Sheet } from '../lib/ui.jsx';

const LABEL = { allow: 'Open to remixes', request: 'Remix on request', private: 'Remixes off' };

// "Remix with my character" — respects the original creator's collab setting.
export function RemixButton({ item, go, wide = false, feed = false }) {
  const { state, setRemix, setRemixRequest, notify } = useStore();
  const [sheet, setSheet] = useState(null); // 'request' | 'private'
  const key = item.seriesKey || item.id;
  const req = state.remixRequests?.[key];
  const collab = item.mine ? 'allow' : req === 'approved' ? 'allow' : item.collab || 'request';

  const start = () => {
    if (!state.character.name) { notify('Create your character first — then remix anything.'); go('creator/look'); return; }
    if (collab === 'private') return setSheet('private');
    if (collab === 'request') return setSheet('request');
    setRemix({ prompt: item.prompt || item.title, handle: item.handle, title: item.title, series: item.series, at: Date.now() });
    go('create');
  };

  const sendRequest = () => {
    setRemixRequest(key, 'sent');
    setSheet(null);
    notify(`Request sent to @${item.handle}`);
    // Demo: the other creator "approves" a few seconds later.
    setTimeout(() => { setRemixRequest(key, 'approved'); notify(`@${item.handle} approved your remix (demo)`); }, 4000);
  };

  const icon = collab === 'private' ? 'lock' : 'remix';
  const text = collab === 'private' ? 'Private' : collab === 'request' ? (req === 'sent' ? 'Asked' : 'Ask') : 'Remix';

  return (
    <>
      {feed ? (
        <button className={'act' + (collab === 'private' ? ' muted-act' : '')} onClick={start} aria-label="Remix with my character" data-testid="remix">
          <Icon name={icon} size={22} /><span>{text}</span>
        </button>
      ) : (
        <button className={'btn ghost remix-btn' + (wide ? ' wide' : '')} onClick={start} data-testid="remix">
          <Icon name={icon} size={18} /> Remix with my character
          <span className="hint">{req === 'sent' ? 'Request pending' : LABEL[collab]}</span>
        </button>
      )}
      <Sheet open={sheet === 'request'} onClose={() => setSheet(null)} title="Ask to remix">
        <p className="muted">@{item.handle} reviews remixes of <b>{item.series || item.title}</b> before they go live.</p>
        <p className="hint">We'll send a request to cast your character in their scene. In this demo they always say yes after a few seconds.</p>
        {req === 'sent'
          ? <button className="btn ghost wide" disabled>Request pending…</button>
          : <button className="btn primary wide" onClick={sendRequest} data-testid="send-remix-request"><Icon name="people" size={18} /> Send request</button>}
      </Sheet>
      <Sheet open={sheet === 'private'} onClose={() => setSheet(null)} title="Remixes are off">
        <p className="muted">@{item.handle} keeps <b>{item.series || item.title}</b> private, so it can't be remixed.</p>
        <p className="hint">Want to tell a similar story? Start your own scene from scratch — your character, your series.</p>
        <button className="btn primary wide" onClick={() => { setSheet(null); go('create'); }}>Start my own scene</button>
      </Sheet>
    </>
  );
}
