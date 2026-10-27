import React, { useEffect, useState } from 'react';
import { drawCard, cardBlob } from '../lib/card.js';
import { useStore, LORE_FIELDS } from '../lib/store.jsx';
import { Avatar, Icon, Sheet } from '../lib/ui.jsx';
import { isNative, shareFile, saveFile } from '../lib/native.js';

const COLLAB = { allow: 'Collabs: open to all', request: 'Collabs: on request', private: 'Collabs: private' };

export default function Character({ go }) {
  const { state, notify } = useStore();
  const ch = state.character;
  const [cardOpen, setCardOpen] = useState(false);
  const lore = LORE_FIELDS.filter((f) => ch.lore?.[f.id]?.trim());
  const socials = Object.entries(ch.socials || {}).filter(([, v]) => v);

  if (!ch.name) {
    return (
      <div className="page center-col">
        <div className="empty-hero"><Icon name="user" size={48} /></div>
        <h1 className="page-title">No character yet</h1>
        <p className="muted">Design a look, a voice and a backstory — then star in your own series.</p>
        <button className="btn primary wide" onClick={() => go('creator/look')} data-testid="open-creator">Create my character</button>
      </div>
    );
  }

  return (
    <div className="page profile" data-testid="profile">
      <div className="profile-hero">
        {ch.avatar ? <img src={ch.avatar} alt="" className="profile-bg" /> : <div className="profile-bg fallback" />}
        <div className="profile-card glass">
          <Avatar character={ch} size={72} />
          <div className="grow">
            <h1 data-testid="profile-name">{ch.name}</h1>
            <div className="muted">@{ch.handle}{ch.age && ` · ${ch.age}`}</div>
            {!!ch.traits?.length && <div className="trait-row">{ch.traits.map((t) => <span key={t} className="chip soft">{t}</span>)}</div>}
          </div>
        </div>
      </div>
      {ch.bio && <p className="bio">{ch.bio}</p>}

      <div className="row">
        <button className="btn primary" onClick={() => go('creator/look')} data-testid="edit-character"><Icon name="edit" size={18} /> Edit character</button>
        <button className="btn ghost" onClick={() => setCardOpen(true)} data-testid="share-card"><Icon name="share" size={18} /> Share card</button>
      </div>
      <button className="btn ghost wide" onClick={() => go('create/board')}><Icon name="board" size={18} /> Storyboard an episode</button>

      <div className="card list">
        <button className="list-row" onClick={() => go('creator/look')}><Icon name="user" /><span className="grow">Look<span className="hint">{ch.versions?.length || 0} version(s) · {ch.style}</span></span><Icon name="back" size={16} className="flip" /></button>
        <button className="list-row" onClick={() => go('creator/voice')}><Icon name="mic" /><span className="grow">Voice<span className="hint">{ch.voice.style} · pace {ch.voice.pace}%{ch.voice.generated ? ' · saved' : ''}</span></span><Icon name="back" size={16} className="flip" /></button>
        <button className="list-row" onClick={() => go('creator/lore')}><Icon name="film" /><span className="grow">Lore<span className="hint">{lore.length ? lore.map((f) => f.label).join(' · ') : 'Nothing yet — chat to add some'}</span></span><Icon name="back" size={16} className="flip" /></button>
        <button className="list-row" onClick={() => go('creator/details')}><Icon name="gear" /><span className="grow">Details<span className="hint">{COLLAB[ch.collabs]}{socials.length ? ` · ${socials.length} social(s)` : ''}</span></span><Icon name="back" size={16} className="flip" /></button>
      </div>
      <Sheet open={cardOpen} onClose={() => setCardOpen(false)} title="Character card">
        {cardOpen && <CardPreview ch={ch} notify={notify} />}
      </Sheet>
    </div>
  );
}

function CardPreview({ ch, notify }) {
  const [url, setUrl] = useState(null);
  const [blob, setBlob] = useState(null);
  useEffect(() => {
    let alive = true; let objUrl;
    drawCard(ch).then(cardBlob).then((b) => {
      if (!alive || !b) return;
      objUrl = URL.createObjectURL(b);
      setBlob(b); setUrl(objUrl);
    });
    return () => { alive = false; if (objUrl) URL.revokeObjectURL(objUrl); };
  }, [ch]);
  const fileName = `${ch.handle || 'character'}-card.png`;
  const download = async () => {
    if (isNative) {
      try { await saveFile(blob, fileName); notify('Card saved to Documents › Lone Keem Studios'); }
      catch { try { await shareFile(blob, fileName, `${ch.name} · Lone Keem Studios`, ''); } catch { notify('Couldn\'t save the card on this phone'); } }
      return;
    }
    const a = document.createElement('a');
    a.href = url; a.download = fileName;
    document.body.appendChild(a); a.click(); a.remove();
    notify('Card saved to your downloads');
  };
  const share = async () => {
    if (isNative) {
      try { await shareFile(blob, fileName, `${ch.name} · Lone Keem Studios`, `Meet ${ch.name} (@${ch.handle}). Your character. Your series.`); }
      catch (e) { if (!/cancel/i.test(e?.message || '')) notify('Couldn\'t open the share sheet'); }
      return;
    }
    const file = new File([blob], fileName, { type: 'image/png' });
    const data = { files: [file], title: `${ch.name} · Lone Keem Studios`, text: `Meet ${ch.name} (@${ch.handle}). Your character. Your series.` };
    if (navigator.canShare?.(data)) {
      try { await navigator.share(data); } catch (e) { if (e.name !== 'AbortError') download(); }
    } else {
      download();
      notify('Sharing isn\'t supported here — downloaded instead');
    }
  };
  return (
    <div className="card-preview">
      <div className={'card-img' + (url ? '' : ' skel')}>{url && <img src={url} alt={`${ch.name} character card`} data-testid="card-img" />}</div>
      <div className="row">
        <button className="btn ghost" disabled={!url} onClick={download} data-testid="card-download"><Icon name="download" size={18} /> Download</button>
        <button className="btn primary" disabled={!url} onClick={share} data-testid="card-share"><Icon name="share" size={18} /> Share</button>
      </div>
      <p className="hint center">Made on your device — nothing is uploaded.</p>
    </div>
  );
}
