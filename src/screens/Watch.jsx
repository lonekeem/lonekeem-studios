import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../lib/store.jsx';
import { SEED_EPISODES } from '../lib/seed.js';
import { Icon, Sheet, Avatar } from '../lib/ui.jsx';
import EpisodePlayer from './EpisodePlayer.jsx';
import { RemixButton } from './Remix.jsx';
import { Recap } from './Show.jsx';
import { findSeries } from '../lib/catalog.js';

const REASONS = ['Inappropriate or sexual', 'Violence or harm', 'Hate or harassment', 'Uses a real person without consent', 'Spam or misleading', 'Copyright', 'Something else'];

export default function Watch({ go }) {
  const { state, toggleLike, report, block, notify, setProgress } = useStore();
  const [recapFor, setRecapFor] = useState(null);
  const [active, setActive] = useState(0);
  const [reporting, setReporting] = useState(null);
  const [reason, setReason] = useState('');
  const [idle, setIdle] = useState(false);
  const feedRef = useRef(null);

  const items = useMemo(() => {
    const mine = state.episodes
      .filter((e) => e.published && e.clipIds.length)
      .map((e) => {
        const ser = state.series.find((s) => s.id === e.seriesId);
        const n = state.episodes.filter((x) => x.seriesId === e.seriesId).indexOf(e) + 1;
        return {
          id: e.id, mine: true, series: ser?.title || 'Untitled series', seriesKey: e.seriesId, ep: n, title: e.title,
          prompt: e.scenes?.[0]?.prompt || state.clips.find((c) => c.id === e.clipIds[0])?.prompt || e.title,
          remixOf: e.clipIds.map((id) => state.clips.find((c) => c.id === id)?.remixOf).find(Boolean) || null,
          handle: state.character.handle || 'you', likes: 0,
          clips: e.clipIds.map((id) => state.clips.find((c) => c.id === id)?.url).filter(Boolean),
        };
      });
    return [...mine, ...SEED_EPISODES].filter((it) => !state.blocked.includes(it.handle));
  }, [state.episodes, state.series, state.clips, state.blocked, state.character.handle]);

  useEffect(() => {
    const root = feedRef.current;
    if (!root) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((en) => { if (en.isIntersecting) setActive(Number(en.target.dataset.idx)); }),
      { root, threshold: 0.6 },
    );
    root.querySelectorAll('.feed-item').forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [items.length]);

  // Optional "fade UI" preference: hide overlays after 3s without touch.
  useEffect(() => {
    if (!state.prefs.fadeUI) { setIdle(false); return; }
    let t;
    const wake = () => { setIdle(false); clearTimeout(t); t = setTimeout(() => setIdle(true), 3000); };
    wake();
    const el = feedRef.current;
    ['pointerdown', 'scroll', 'mousemove'].forEach((ev) => el?.addEventListener(ev, wake, { passive: true }));
    return () => { clearTimeout(t); ['pointerdown', 'scroll', 'mousemove'].forEach((ev) => el?.removeEventListener(ev, wake)); };
  }, [state.prefs.fadeUI]);

  const submitReport = () => {
    report(reporting.id, reason);
    notify('Thanks — our (demo) review team will take a look.');
    setReporting(null); setReason('');
  };

  return (
    <div className={'feed' + (idle ? ' ui-faded' : '')} ref={feedRef} data-testid="feed">
      {items.map((it, idx) => {
        const liked = !!state.likes[it.id];
        const reported = !!state.reported[it.id];
        return (
          <section className="feed-item cine" key={it.id} data-idx={idx} data-testid="feed-item">
            <header className="marquee">
              <span className="bulbs" aria-hidden="true" />
              <span className="now-showing">Now showing</span>
              <button className="feed-series" onClick={() => go('show/' + encodeURIComponent(it.seriesKey))} data-testid="feed-series">
                {it.series} <Icon name="back" size={12} className="flip" />
              </button>
              <span className="ep-code" data-testid="ep-code">S{it.season || 1} · E{it.ep}</span>
            </header>
            <div className="frame">
              <EpisodePlayer clips={it.clips} active={idx === active} onProgress={(p) => setProgress(it.id, p)} />
              <div className="grain" aria-hidden="true" />
              <span className="ai-badge"><Icon name="spark" size={14} fill /> AI-generated</span>
              {it.ep > 1 && (
                <button className="prev-chip" onClick={() => setRecapFor(it)} data-testid="prev-chip">Previously on…</button>
              )}
            </div>
            <footer className="feed-info credits-roll">
              <h2>{it.title}</h2>
              <div className="feed-meta">
                <span className="feed-handle"><Avatar character={it.mine ? state.character : { name: it.handle }} size={22} />@{it.handle}{it.mine && <span className="chip">You</span>}</span>
                {it.remixOf && <span className="remix-credit"><Icon name="remix" size={13} /> Remix of @{it.remixOf.handle}</span>}
              </div>
              <div className="feed-actions action-bar">
                <button className={'act' + (liked ? ' liked' : '')} onClick={() => toggleLike(it.id)} aria-label="Like" data-testid="like">
                  <Icon name="heart" size={22} fill={liked} />
                  <span>{(it.likes + (liked ? 1 : 0)).toLocaleString()}</span>
                </button>
                <RemixButton item={it} go={go} feed />
                <button className="act" onClick={() => go('show/' + encodeURIComponent(it.seriesKey))} aria-label="Episodes">
                  <Icon name="film" size={22} />
                  <span>Episodes</span>
                </button>
                <button className={'act' + (reported ? ' reported' : '')} onClick={() => setReporting(it)} aria-label="Report" data-testid="report">
                  <Icon name="flag" size={22} />
                  <span>{reported ? 'Reported' : 'Report'}</span>
                </button>
              </div>
            </footer>
          </section>
        );
      })}
      <div className="feed-end">That's a wrap. Shoot the next episode.</div>

      <Sheet open={!!recapFor} onClose={() => setRecapFor(null)} title="Catch up">
        {recapFor && (() => {
          const ser = findSeries(state, recapFor.seriesKey);
          if (!ser) return null;
          const idx = ser.episodes.findIndex((e) => e.id === recapFor.id);
          return (
            <>
              <Recap series={ser} idx={idx} compact />
              <button className="btn ghost wide" onClick={() => go('show/' + encodeURIComponent(ser.key))}>Open the series</button>
            </>
          );
        })()}
      </Sheet>

      <Sheet open={!!reporting} onClose={() => setReporting(null)} title="Report this episode">
        <p className="muted">Why are you reporting <b>{reporting?.title}</b> by @{reporting?.handle}?</p>
        <div className="radio-list">
          {REASONS.map((r) => (
            <label key={r} className={'radio' + (reason === r ? ' on' : '')}>
              <input type="radio" name="reason" checked={reason === r} onChange={() => setReason(r)} /> {r}
            </label>
          ))}
        </div>
        <button className="btn primary wide" disabled={!reason} onClick={submitReport} data-testid="submit-report">Send report</button>
        {reporting && !reporting.mine && (
          <button className="btn ghost wide" onClick={() => { block(reporting.handle); notify(`Blocked @${reporting.handle}`); setReporting(null); }}>
            Block @{reporting?.handle}
          </button>
        )}
      </Sheet>
    </div>
  );
}
