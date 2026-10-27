import React, { useState } from 'react';
import { useStore } from '../lib/store.jsx';
import { Icon, Sheet, Toggle } from '../lib/ui.jsx';
import EpisodePlayer from './EpisodePlayer.jsx';

export default function Series({ go }) {
  const { state, createSeries, deleteSeries, saveEpisode, deleteEpisode, deleteClip, notify } = useStore();
  const [openId, setOpenId] = useState(null);
  const [newSeries, setNewSeries] = useState(false);
  const [title, setTitle] = useState('');
  const [editing, setEditing] = useState(null); // episode draft
  const [playing, setPlaying] = useState(null); // {title, clips}

  const clipUrl = (id) => state.clips.find((c) => c.id === id)?.url;
  const ser = state.series.find((s) => s.id === openId);
  const epsOf = (sid) => state.episodes.filter((e) => e.seriesId === sid);

  const addSeries = () => {
    if (!title.trim()) return;
    const id = createSeries(title.trim());
    setTitle(''); setNewSeries(false); setOpenId(id);
  };

  const saveDraft = () => {
    if (!editing.title.trim()) return notify('Give the episode a title.');
    if (!editing.clipIds.length) return notify('Add at least one clip.');
    saveEpisode({ ...editing, title: editing.title.trim() });
    setEditing(null);
    notify('Episode saved');
  };

  const move = (i, d) => {
    const ids = [...editing.clipIds];
    const j = i + d;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    setEditing({ ...editing, clipIds: ids });
  };

  // ── Series detail ──
  if (ser) {
    const eps = epsOf(ser.id);
    const allClips = eps.flatMap((e) => e.clipIds.map(clipUrl)).filter(Boolean);
    return (
      <div className="page">
        <button className="back" onClick={() => setOpenId(null)}><Icon name="back" size={18} /> All series</button>
        <h1 className="page-title">{ser.title}</h1>
        <div className="row">
          <button className="btn primary" disabled={!allClips.length} onClick={() => setPlaying({ title: ser.title, clips: allClips })} data-testid="play-series">
            <Icon name="play" size={18} fill /> Play series
          </button>
          <button className="btn ghost" onClick={() => setEditing({ seriesId: ser.id, title: `Episode ${eps.length + 1}`, clipIds: [] })} data-testid="new-episode">
            <Icon name="plus" size={18} /> Episode
          </button>
        </div>
        {!eps.length && <p className="empty-note">No episodes yet. Add one and pick clips to put in it.</p>}
        <ol className="ep-list">
          {eps.map((e, i) => (
            <li key={e.id} className="ep-card" data-testid="episode">
              <button className="ep-thumb" onClick={() => setPlaying({ title: e.title, clips: e.clipIds.map(clipUrl).filter(Boolean) })}>
                {clipUrl(e.clipIds[0]) ? <video src={clipUrl(e.clipIds[0]) + '#t=1'} muted playsInline preload="metadata" /> : null}
                <Icon name="play" fill size={20} />
              </button>
              <div className="ep-meta">
                <b>Ep {i + 1}: {e.title}</b>
                <span className="hint">{e.clipIds.length} clip{e.clipIds.length === 1 ? '' : 's'} · {e.published ? 'Published to Watch' : 'Draft'}</span>
                <div className="ep-actions">
                  <button className="link" onClick={() => setEditing({ ...e })}>Edit</button>
                  <button className="link" onClick={() => { saveEpisode({ ...e, published: !e.published }); notify(e.published ? 'Unpublished' : 'Published to the Watch feed (on this device)'); }} data-testid="publish">
                    {e.published ? 'Unpublish' : 'Publish'}
                  </button>
                  <button className="link danger" onClick={() => deleteEpisode(e.id)}>Delete</button>
                </div>
              </div>
            </li>
          ))}
        </ol>
        <button className="link danger" onClick={() => { if (confirm('Delete this series and its episodes?')) { deleteSeries(ser.id); setOpenId(null); } }}>Delete series</button>
        {renderSheets()}
      </div>
    );
  }

  // ── Overview ──
  return (
    <div className="page">
      <h1 className="page-title">My series</h1>

      <div className="section-head"><h3>My clips</h3><button className="link" onClick={() => go('create')}>+ New clip</button></div>
      {!state.clips.length ? (
        <button className="empty-card" onClick={() => go('create')}><Icon name="spark" /> Generate your first clip</button>
      ) : (
        <div className="clip-row" data-testid="clip-row">
          {state.clips.map((c) => (
            <div key={c.id} className="clip-tile">
              <video src={c.url + '#t=1'} muted playsInline preload="metadata" onClick={() => setPlaying({ title: c.prompt, clips: [c.url] })} />
              <span className="clip-len">{c.length}s</span>
              <button className="clip-del" aria-label="Delete clip" onClick={() => deleteClip(c.id)}><Icon name="x" size={14} /></button>
              <p>{c.prompt}</p>
            </div>
          ))}
        </div>
      )}

      <div className="section-head"><h3>Series</h3><button className="link" onClick={() => setNewSeries(true)} data-testid="new-series">+ New series</button></div>
      {!state.series.length && <p className="empty-note">Group your clips into episodes, and episodes into a series.</p>}
      <div className="series-grid">
        {state.series.map((s) => {
          const eps = epsOf(s.id);
          const first = clipUrl(eps[0]?.clipIds[0]);
          return (
            <button key={s.id} className="series-card" onClick={() => setOpenId(s.id)} data-testid="series-card">
              <div className="series-cover">{first ? <video src={first + '#t=1'} muted playsInline preload="metadata" /> : <Icon name="film" size={30} />}</div>
              <b>{s.title}</b>
              <span className="hint">{eps.length} episode{eps.length === 1 ? '' : 's'}</span>
            </button>
          );
        })}
      </div>
      {renderSheets()}
    </div>
  );

  function renderSheets() {
    return (
      <>
        <Sheet open={newSeries} onClose={() => setNewSeries(false)} title="New series">
          <input className="input" autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Series title" maxLength={50}
            onKeyDown={(e) => e.key === 'Enter' && addSeries()} data-testid="series-title" />
          <button className="btn primary wide" disabled={!title.trim()} onClick={addSeries} data-testid="create-series">Create series</button>
        </Sheet>

        <Sheet open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? 'Edit episode' : 'New episode'}>
          {editing && (
            <>
              <input className="input" value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} placeholder="Episode title" maxLength={60} />
              <h4>In this episode (plays in order)</h4>
              {!editing.clipIds.length && <p className="hint">Tap clips below to add them.</p>}
              <ol className="order-list">
                {editing.clipIds.map((id, i) => {
                  const c = state.clips.find((x) => x.id === id);
                  return (
                    <li key={id + i}>
                      <span className="num">{i + 1}</span>
                      <span className="grow">{c?.prompt || 'Missing clip'}</span>
                      <button className="icon-btn" onClick={() => move(i, -1)} aria-label="Up"><Icon name="up" size={16} /></button>
                      <button className="icon-btn" onClick={() => move(i, 1)} aria-label="Down"><Icon name="down" size={16} /></button>
                      <button className="icon-btn" onClick={() => setEditing({ ...editing, clipIds: editing.clipIds.filter((_, k) => k !== i) })} aria-label="Remove"><Icon name="x" size={16} /></button>
                    </li>
                  );
                })}
              </ol>
              <h4>Your clips</h4>
              {!state.clips.length && <p className="hint">No clips yet — make some in Create.</p>}
              <div className="pick-grid">
                {state.clips.map((c) => (
                  <button key={c.id} className={'pick' + (editing.clipIds.includes(c.id) ? ' on' : '')} data-testid="pick-clip"
                    onClick={() => setEditing({ ...editing, clipIds: [...editing.clipIds, c.id] })}>
                    <video src={c.url + '#t=1'} muted playsInline preload="metadata" />
                    <span>{c.prompt}</span>
                  </button>
                ))}
              </div>
              <Toggle label="Publish to Watch feed" hint="Only visible on this device in the demo" checked={!!editing.published}
                onChange={(v) => setEditing({ ...editing, published: v })} />
              <button className="btn primary wide" onClick={saveDraft} data-testid="save-episode">Save episode</button>
            </>
          )}
        </Sheet>

        {playing && (
          <div className="viewer" data-testid="viewer">
            <EpisodePlayer clips={playing.clips} active loop={false} onEnd={() => {}} />
            <span className="ai-badge"><Icon name="spark" size={14} fill /> AI-generated</span>
            <div className="viewer-title">{playing.title}</div>
            <button className="icon-btn viewer-close" onClick={() => setPlaying(null)} aria-label="Close"><Icon name="x" /></button>
          </div>
        )}
      </>
    );
  }
}
