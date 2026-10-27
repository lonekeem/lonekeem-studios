import React from 'react';
import { useStore, LORE_FIELDS } from '../lib/store.jsx';
import { Avatar, Icon } from '../lib/ui.jsx';

const COLLAB = { allow: 'Collabs: open to all', request: 'Collabs: on request', private: 'Collabs: private' };

export default function Character({ go }) {
  const { state } = useStore();
  const ch = state.character;
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
        <button className="btn ghost" onClick={() => go('create')}><Icon name="spark" size={18} /> Make a clip</button>
      </div>

      <div className="card list">
        <button className="list-row" onClick={() => go('creator/look')}><Icon name="user" /><span className="grow">Look<span className="hint">{ch.versions?.length || 0} version(s) · {ch.style}</span></span><Icon name="back" size={16} className="flip" /></button>
        <button className="list-row" onClick={() => go('creator/voice')}><Icon name="mic" /><span className="grow">Voice<span className="hint">{ch.voice.style} · pace {ch.voice.pace}%{ch.voice.generated ? ' · saved' : ''}</span></span><Icon name="back" size={16} className="flip" /></button>
        <button className="list-row" onClick={() => go('creator/lore')}><Icon name="film" /><span className="grow">Lore<span className="hint">{lore.length ? lore.map((f) => f.label).join(' · ') : 'Nothing yet — chat to add some'}</span></span><Icon name="back" size={16} className="flip" /></button>
        <button className="list-row" onClick={() => go('creator/details')}><Icon name="gear" /><span className="grow">Details<span className="hint">{COLLAB[ch.collabs]}{socials.length ? ` · ${socials.length} social(s)` : ''}</span></span><Icon name="back" size={16} className="flip" /></button>
      </div>
    </div>
  );
}
