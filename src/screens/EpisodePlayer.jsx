import React, { useEffect, useRef, useState } from 'react';

// Plays a list of clip URLs back-to-back. Loops the episode when it ends.
// onProgress(fraction of the whole episode) fires about once a second.
export default function EpisodePlayer({ clips, active = true, loop = true, onEnd, onProgress, className = '', controls = false }) {
  const ref = useRef(null);
  const [i, setI] = useState(0);
  const [ready, setReady] = useState(false);
  const lastReport = useRef(0);

  useEffect(() => { setI(0); }, [clips.join('|')]);
  useEffect(() => { setReady(false); }, [i, clips.join('|')]);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (active) v.play().catch(() => {});
    else v.pause();
  }, [active, i]);

  const report = (force) => {
    const v = ref.current;
    if (!onProgress || !v || !v.duration || !active) return;
    const now = Date.now();
    if (!force && now - lastReport.current < 1000) return;
    lastReport.current = now;
    onProgress(Math.min(1, (i + v.currentTime / v.duration) / clips.length));
  };

  const next = () => {
    if (i + 1 < clips.length) setI(i + 1);
    else {
      onProgress?.(1);
      onEnd?.();
      if (loop) {
        if (clips.length === 1) { ref.current.currentTime = 0; ref.current.play().catch(() => {}); }
        else setI(0);
      }
    }
  };

  if (!clips.length) return <div className={'player empty ' + className}>No clips yet</div>;
  return (
    <div className={'player ' + className + (ready ? '' : ' skel')}>
      <video ref={ref} key={clips[i] + i} src={clips[i]} muted playsInline autoPlay={active}
        preload="metadata" onEnded={next} controls={controls} onLoadedData={() => setReady(true)}
        onTimeUpdate={() => report(false)} onPause={() => report(true)} />
      {clips.length > 1 && (
        <div className="seg-bar">
          {clips.map((_, k) => <span key={k} className={k < i ? 'done' : k === i ? 'now' : ''} />)}
        </div>
      )}
    </div>
  );
}
