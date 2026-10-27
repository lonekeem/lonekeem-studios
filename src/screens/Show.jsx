import React, { useEffect, useState } from 'react';
import { useStore } from '../lib/store.jsx';
import { findSeries, buildRecap } from '../lib/catalog.js';
import { Icon, Avatar } from '../lib/ui.jsx';
import EpisodePlayer from './EpisodePlayer.jsx';
import { RemixButton } from './Remix.jsx';

const RECAP_SECONDS = 7;

// "Previously on…" card. Built from earlier episode titles + prompts.
export function Recap({ series, idx, onPlay, onSkip, auto = true, compact = false }) {
  const r = buildRecap(series, idx);
  const [left, setLeft] = useState(RECAP_SECONDS);
  useEffect(() => {
    if (!auto || !onPlay) return;
    const t = setInterval(() => setLeft((x) => x - 0.1), 100);
    return () => clearInterval(t);
  }, [auto]);
  useEffect(() => { if (auto && onPlay && left <= 0) onPlay(); }, [left <= 0]); // eslint-disable-line
  if (!r) return null;
  return (
    <div className={'recap glass' + (compact ? ' compact' : '')} data-testid="recap">
      <span className="recap-kicker">Previously on</span>
      <h2 className="recap-title">{r.title}</h2>
      <p className="recap-hook">{r.hook}</p>
      <ol className="recap-list">
        {r.skipped > 0 && <li className="hint">…and {r.skipped} earlier episode{r.skipped > 1 ? 's' : ''}</li>}
        {r.lines.map((l) => (
          <li key={l.n}><b>Ep {l.n} · {l.title}</b><span>{l.line}</span></li>
        ))}
      </ol>
      {onPlay && (
        <>
          <button className="btn primary wide" onClick={onPlay} data-testid="recap-play">
            <Icon name="play" size={18} fill /> Play Ep {r.next?.n}{r.next ? ` · ${r.next.title}` : ''}
          </button>
          {auto && <div className="recap-timer"><span style={{ width: `${Math.max(0, left / RECAP_SECONDS) * 100}%` }} /></div>}
          {onSkip && <button className="link" onClick={onSkip}>Skip recap</button>}
        </>
      )}
    </div>
  );
}

// Full-screen episode viewer with recap → play → "up next".
export function Viewer({ series, index, onClose, recap = true }) {
  const { setProgress } = useStore();
  const [idx, setIdx] = useState(index);
  const [phase, setPhase] = useState(recap && index > 0 ? 'recap' : 'play');
  const ep = series.episodes[idx];
  const next = series.episodes[idx + 1];
  if (!ep) return null;
  return (
    <div className="viewer" data-testid="viewer">
      {phase === 'recap' && (
        <div className="viewer-recap">
          <Recap series={series} idx={idx} onPlay={() => setPhase('play')} onSkip={() => setPhase('play')} />
        </div>
      )}
      {phase !== 'recap' && (
        <EpisodePlayer clips={ep.clips} active={phase === 'play'} loop={false}
          onProgress={(p) => setProgress(ep.id, p)} onEnd={() => setPhase('end')} />
      )}
      {phase === 'end' && (
        <div className="viewer-end glass" data-testid="viewer-end">
          {next ? (
            <>
              <span className="hint">Up next</span>
              <b>Ep {next.n} · {next.title}</b>
              <button className="btn primary wide" onClick={() => { setIdx(idx + 1); setPhase('play'); }} data-testid="play-next">
                <Icon name="play" size={18} fill /> Play next
              </button>
            </>
          ) : (
            <>
              <b>You're caught up on {series.title}</b>
              <span className="hint">New episodes show up in Continue watching.</span>
            </>
          )}
          <button className="btn ghost wide" onClick={() => setPhase('play')}>Watch again</button>
        </div>
      )}
      <span className="ai-badge"><Icon name="spark" size={14} fill /> AI-generated</span>
      <div className="viewer-title"><small>{series.title}</small>Ep {ep.n} · {ep.title}</div>
      <button className="icon-btn viewer-close" onClick={onClose} aria-label="Close" data-testid="viewer-close"><Icon name="x" /></button>
    </div>
  );
}

// Series page: cover, follow, per-episode progress.
export default function Show({ id, play, go }) {
  const { state, toggleFollow, notify } = useStore();
  const series = findSeries(state, decodeURIComponent(id || ''));
  const [viewing, setViewing] = useState(play != null && play !== '' ? Number(play) : null);

  if (!series) {
    return (
      <div className="page center-col">
        <div className="empty-hero"><Icon name="film" size={44} /></div>
        <h1 className="page-title">Series not found</h1>
        <p className="muted">It may have been deleted or its creator blocked.</p>
        <button className="btn primary" onClick={() => go('series')}>Browse series</button>
      </div>
    );
  }

  const eps = series.mine ? series.episodes : series.episodes;
  const cover = eps.find((e) => e.clips.length)?.clips[0];
  const prog = (e) => state.progress?.[e.id]?.p || 0;
  const watched = eps.filter((e) => prog(e) >= 0.95).length;
  const resumeIdx = (() => {
    const i = eps.findIndex((e) => prog(e) > 0.02 && prog(e) < 0.95);
    if (i >= 0) return i;
    const j = eps.findIndex((e) => prog(e) < 0.95 && e.clips.length);
    return j >= 0 ? j : 0;
  })();
  const following = !!state.follows?.[series.key];
  const isMineChar = series.mine;
  const ch = state.character;

  return (
    <div className="page show" data-testid="show">
      <div className="show-hero">
        {cover ? <video className="show-cover" src={cover + '#t=1.2'} muted playsInline preload="metadata" /> : <div className="show-cover fallback" />}
        <button className="icon-btn show-back glass" onClick={() => go('series')} aria-label="Back"><Icon name="back" /></button>
        <div className="show-info">
          <span className="show-kicker">{series.mine ? 'Your series' : 'Series'} · {eps.length} episode{eps.length === 1 ? '' : 's'}</span>
          <h1 data-testid="show-title">{series.title}</h1>
          <div className="show-by">
            <Avatar character={isMineChar ? ch : { name: series.handle }} size={24} /> @{series.handle}
            {watched > 0 && <span className="chip soft">{watched}/{eps.length} watched</span>}
          </div>
        </div>
      </div>
      {series.blurb && <p className="bio">{series.blurb}</p>}

      <div className="row">
        <button className="btn primary" disabled={!eps.some((e) => e.clips.length)} onClick={() => setViewing(resumeIdx)} data-testid="show-play">
          <Icon name="play" size={18} fill /> {watched === 0 && !eps.some((e) => prog(e) > 0.02) ? 'Play Ep 1' : `Continue Ep ${resumeIdx + 1}`}
        </button>
        {series.mine ? (
          <button className="btn ghost" onClick={() => go('series/' + series.key)} data-testid="manage-series"><Icon name="edit" size={18} /> Manage</button>
        ) : (
          <button className={'btn ' + (following ? 'ghost on' : 'ghost')} data-testid="follow"
            onClick={() => { toggleFollow(series.key); notify(following ? `Unfollowed ${series.title}` : `Following ${series.title} — new episodes land in Continue watching`); }}>
            <Icon name={following ? 'check' : 'plus'} size={18} /> {following ? 'Following' : 'Follow'}
          </button>
        )}
      </div>

      <h3 className="section-label">Episodes</h3>
      {!eps.length && (
        <div className="empty-card static">
          <Icon name="film" /> No episodes yet.
          <button className="link" onClick={() => go('create/board')}>Storyboard the first one</button>
        </div>
      )}
      <ol className="ep-list">
        {eps.map((e, i) => {
          const p = prog(e);
          return (
            <li key={e.id} className="ep-card" data-testid="show-episode">
              <button className="ep-thumb" onClick={() => e.clips.length && setViewing(i)} aria-label={`Play episode ${e.n}`}>
                {e.clips[0] ? <video src={e.clips[0] + '#t=1'} muted playsInline preload="metadata" /> : null}
                <Icon name={p >= 0.95 ? 'check' : 'play'} fill={p < 0.95} size={20} />
                {p > 0 && <span className="ep-prog"><span style={{ width: `${Math.round(p * 100)}%` }} /></span>}
              </button>
              <div className="ep-meta">
                <b>Ep {e.n} · {e.title}</b>
                <span className="hint ep-line">{e.prompt}</span>
                <span className="hint">
                  {p >= 0.95 ? 'Watched' : p > 0.02 ? `${Math.round(p * 100)}% watched` : 'Not started'}
                  {series.mine && !e.published && ' · Draft'}
                  {e.remixOf && ` · Remix of @${e.remixOf.handle}`}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
      {!series.mine && eps.length > 0 && (
        <RemixButton item={{ seriesKey: series.key, series: series.title, title: eps[eps.length - 1].title, prompt: eps[eps.length - 1].prompt, handle: series.handle, collab: series.collab }} go={go} wide />
      )}

      {viewing != null && (
        <Viewer series={series} index={viewing} onClose={() => { setViewing(null); if (play != null) go('show/' + encodeURIComponent(series.key)); }} />
      )}
    </div>
  );
}
