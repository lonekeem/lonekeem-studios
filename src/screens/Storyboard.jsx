import React, { useRef, useState } from 'react';
import { useStore, uid } from '../lib/store.jsx';
import { creditCost } from '../lib/models.js';
import { generateClip, IS_DEMO } from '../lib/generateClip.js';
import { Icon, Avatar, tick } from '../lib/ui.jsx';
import { Slate } from './Create.jsx';

export const CAMERAS = ['Close-up', 'Medium', 'Wide', 'Tracking', 'Low angle', 'Overhead', 'Handheld'];
export const MOODS = ['Epic', 'Tense', 'Dreamy', 'Funny', 'Cozy', 'Eerie', 'Hopeful'];
const MIN = 3, MAX = 6;

const beatName = (i, n) => (i === 0 ? 'Opening' : i === n - 1 ? 'Cliffhanger' : i === n - 2 && n > 3 ? 'Twist' : 'Build');
const OUTLINE = {
  Opening: (n) => `${n} wakes up somewhere they don't recognise, city lights humming outside`,
  Build: (n) => `${n} follows a strange signal through crowded streets, glancing over their shoulder`,
  Twist: (n) => `The signal leads to a door with ${n}'s own name carved into it`,
  Cliffhanger: (n) => `${n} opens the door — and a blinding light swallows the frame`,
};
const newScene = (i = 0) => ({ id: uid('sc'), prompt: '', length: 5, camera: CAMERAS[[2, 3, 0, 4, 1, 5][i % 6]], mood: MOODS[[3, 1, 0, 2, 4, 6][i % 6]] });
export const newBoard = () => ({ title: '', seriesId: 'new', newSeries: '', publish: true, scenes: [0, 1, 2].map(newScene) });

const sceneCost = (sc, locked) => creditCost({ model: 'auto', length: sc.length, quality: '480p', characterLock: locked });

export default function Storyboard({ go }) {
  const { state, setBoard, spendCredits, addCredits, addClip, createSeries, saveEpisode, notify } = useStore();
  const board = state.board || newBoard();
  const ch = state.character;
  const hasChar = !!ch.name;
  const [job, setJob] = useState(null); // { statuses: [...], i }
  const [done, setDone] = useState(null);
  const [dragging, setDragging] = useState(null);
  const [sel, setSel] = useState(0);
  const abortRef = useRef(null);
  const listRef = useRef(null);
  const drag = useRef(null);

  const set = (patch) => setBoard({ ...board, ...patch });
  const setScene = (i, patch) => set({ scenes: board.scenes.map((s, k) => (k === i ? { ...s, ...patch } : s)) });
  const move = (from, to) => {
    if (to < 0 || to >= board.scenes.length || from === to) return;
    const sc = [...board.scenes];
    const [x] = sc.splice(from, 1);
    sc.splice(to, 0, x);
    set({ scenes: sc });
    setSel(to);
  };
  const total = board.scenes.reduce((a, s) => a + sceneCost(s, hasChar), 0);
  const seconds = board.scenes.reduce((a, s) => a + s.length, 0);
  const ready = board.scenes.every((s) => s.prompt.trim().length > 2);
  const charName = ch.name || 'The hero';

  // Pointer-based drag (works with touch, unlike HTML5 drag-and-drop on phones).
  const onGrab = (e, i) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    drag.current = i; setDragging(i); tick();
  };
  const onDrag = (e) => {
    if (drag.current == null) return;
    // Near either edge of the strip, scroll it so a frame can travel the whole timeline.
    const strip = listRef.current.closest('.filmstrip') || listRef.current;
    const sr = strip.getBoundingClientRect();
    if (e.clientX < sr.left + 36) strip.scrollLeft -= 14;
    else if (e.clientX > sr.right - 36) strip.scrollLeft += 14;
    const cards = [...listRef.current.querySelectorAll('.scene-card')];
    let j = cards.findIndex((c) => { const r = c.getBoundingClientRect(); return e.clientX < r.left + r.width / 2; });
    if (j === -1) j = cards.length - 1;
    else if (j > drag.current) j -= 1;
    if (j !== drag.current) { move(drag.current, j); drag.current = j; setDragging(j); tick(); }
  };
  const onDrop = () => { drag.current = null; setDragging(null); };

  const outline = () => {
    const n = board.scenes.length;
    set({ scenes: board.scenes.map((s, i) => (s.prompt.trim() ? s : { ...s, prompt: OUTLINE[beatName(i, n)](charName) })) });
    notify('Filled the empty scenes with a starter outline');
  };

  const generateAll = async () => {
    if (!ready) return notify('Every scene needs a short description.');
    if (board.seriesId === 'new' && !board.newSeries.trim() && !board.title.trim()) return notify('Name the episode or the series first.');
    if (!spendCredits(total, `Storyboard · ${board.scenes.length} scenes`)) return notify('Not enough reels for every scene. Cut one, or grab free reels in Studio.');
    const scenes = board.scenes;
    const statuses = scenes.map(() => ({ state: 'queued', progress: 0 }));
    setJob({ statuses: [...statuses] });
    const ac = new AbortController();
    abortRef.current = ac;
    const clips = [];
    try {
      for (let i = 0; i < scenes.length; i++) {
        const sc = scenes[i];
        statuses[i] = { state: 'rendering', progress: 0, stage: 'Queued' };
        setJob({ statuses: [...statuses], i });
        const clip = await generateClip({
          prompt: `${sc.prompt.trim()} — ${sc.camera.toLowerCase()} shot, ${sc.mood.toLowerCase()} mood`,
          model: 'auto', length: sc.length, quality: '480p',
          character: hasChar ? { name: ch.name, handle: ch.handle, look: ch.look, style: ch.style, image: ch.avatar, lore: ch.lore, traits: ch.traits } : null,
          options: { characterLock: hasChar, camera: sc.camera, mood: sc.mood, scene: i + 1 },
          onProgress: (p) => { statuses[i] = { state: 'rendering', ...p }; setJob({ statuses: [...statuses], i }); },
          signal: ac.signal,
        });
        const c = { ...clip, prompt: sc.prompt.trim(), camera: sc.camera, mood: sc.mood };
        addClip(c);
        clips.push(c);
        statuses[i] = { state: 'done', progress: 1, url: c.url };
        setJob({ statuses: [...statuses], i });
      }
      // Auto-build the episode (and the series if needed).
      let seriesId = board.seriesId;
      if (seriesId === 'new' || !state.series.some((s) => s.id === seriesId)) {
        seriesId = createSeries((board.newSeries || `${charName}: ${board.title || 'Season 1'}`).trim());
      }
      const n = state.episodes.filter((e) => e.seriesId === seriesId).length;
      const epId = uid('ep');
      saveEpisode({
        id: epId, seriesId, title: board.title.trim() || `Episode ${n + 1}`, clipIds: clips.map((c) => c.id),
        scenes: scenes.map(({ prompt, length, camera, mood }) => ({ prompt, length, camera, mood })), published: board.publish,
      });
      setDone({ seriesId, idx: n, title: board.title.trim() || `Episode ${n + 1}`, clips: clips.map((c) => c.url) });
      setBoard(null);
      notify('Episode built from your storyboard');
    } catch (e) {
      const left = scenes.slice(clips.length).reduce((a, s) => a + sceneCost(s, hasChar), 0);
      if (left) addCredits(left, 'Refund · storyboard stopped');
      notify(e.name === 'AbortError' ? `Cut! ${clips.length} clip(s) kept in your library, ${left} reels refunded.` : e.message);
    } finally {
      setJob(null);
    }
  };

  if (job) {
    const doneCount = job.statuses.filter((s) => s.state === 'done').length;
    return (
      <div className="board-job" data-testid="board-job">
        <h2>Rolling all scenes…</h2>
        <p className="muted">Scene {Math.min(doneCount + 1, job.statuses.length)} of {job.statuses.length}{IS_DEMO && ' · demo renders'}</p>
        <div className="progress"><span style={{ width: `${((doneCount + (job.statuses[job.i]?.progress || 0) * (job.statuses[job.i]?.state === 'rendering' ? 1 : 0)) / job.statuses.length) * 100}%` }} /></div>
        <ol className="board-status">
          {board.scenes.map((sc, i) => {
            const st = job.statuses[i];
            return (
              <li key={sc.id} className={'bs-' + st.state}>
                <div className={'bs-thumb' + (st.state !== 'done' ? ' skel' : '')}>
                  {st.url && <video src={st.url + '#t=1'} muted playsInline preload="metadata" />}
                  {st.state === 'rendering' && <span className="bs-pct">{Math.round((st.progress || 0) * 100)}%</span>}
                  {st.state === 'done' && <Icon name="check" size={18} />}
                </div>
                <div className="grow"><b>Scene {i + 1} · {sc.camera}</b><span className="hint">{sc.prompt}</span></div>
              </li>
            );
          })}
        </ol>
        <button className="btn ghost" onClick={() => abortRef.current?.abort()} data-testid="board-cancel">Stop</button>
      </div>
    );
  }

  if (done) {
    return (
      <div className="result" data-testid="board-done">
        <div className="result-video">
          <video src={done.clips[0]} autoPlay muted loop playsInline />
          <span className="ai-badge"><Icon name="spark" size={14} fill /> AI-generated</span>
        </div>
        <h2>“{done.title}” is ready</h2>
        <p className="muted">{done.clips.length} scenes stitched into one episode{board.publish !== false ? '' : ''}.</p>
        {IS_DEMO && <p className="hint">Demo mode: scenes are sample clips, not real renders of your prompts.</p>}
        <div className="row">
          <button className="btn ghost" onClick={() => setDone(null)}>New storyboard</button>
          <button className="btn primary" onClick={() => go(`show/${done.seriesId}/${done.idx}`)} data-testid="board-watch"><Icon name="play" size={18} fill /> Watch it</button>
        </div>
      </div>
    );
  }

  const n = board.scenes.length;
  const si = Math.min(sel, n - 1);
  const cur = board.scenes[si];
  const seriesName = board.seriesId === 'new' ? (board.newSeries || 'New series') : (state.series.find((x) => x.id === board.seriesId)?.title || 'Series');
  const addScene = () => { set({ scenes: [...board.scenes, newScene(n)] }); setSel(n); };
  const removeScene = (i) => { set({ scenes: board.scenes.filter((_, k) => k !== i) }); setSel(Math.max(0, i - 1)); };

  return (
    <div className="board" data-testid="board">
      <Slate prod={seriesName} roll="A1" scene={`${String(si + 1).padStart(2, '0')}/${String(n).padStart(2, '0')}`} take="01"
        extra={(
          <div className="slate-foot">
            <Avatar character={ch} size={26} />
            <span className="grow hint">{hasChar ? `Starring ${ch.name}, lead locked for every scene` : 'Tip: cast a character to star in every scene'}</span>
            <button className="btn ghost small" onClick={outline} data-testid="board-outline"><Icon name="wand" size={16} /> Outline it</button>
          </div>
        )} />

      <div className="grid2">
        <label className="field"><span className="field-label">Episode title</span>
          <input className="input" value={board.title} maxLength={60} placeholder="e.g. The door with my name" onChange={(e) => set({ title: e.target.value })} data-testid="board-title" />
        </label>
        <label className="field"><span className="field-label">Series</span>
          <select className="input" value={board.seriesId} onChange={(e) => set({ seriesId: e.target.value })} data-testid="board-series">
            <option value="new">+ New series</option>
            {state.series.map((x) => <option key={x.id} value={x.id}>{x.title}</option>)}
          </select>
        </label>
      </div>
      {board.seriesId === 'new' && (
        <input className="input" value={board.newSeries} maxLength={50} placeholder={`New series name (e.g. ${charName}: Season 1)`} onChange={(e) => set({ newSeries: e.target.value })} data-testid="board-newseries" />
      )}

      <div className="strip-head">
        <span className="field-label">Timeline · {n} scenes · {seconds}s</span>
        <span className="hint">Drag a frame by its handle to reorder</span>
      </div>
      <div className="filmstrip" data-testid="filmstrip">
        <ol className="strip-track" ref={listRef} onPointerMove={onDrag} onPointerUp={onDrop} onPointerCancel={onDrop}>
          {board.scenes.map((sc, i) => (
            <li key={sc.id} className={'scene-card frame-cell' + (i === si ? ' sel' : '') + (dragging === i ? ' dragging' : '')} data-testid="scene-card"
              onClick={() => setSel(i)} data-prompt={sc.prompt}>
              <div className="frame-pic" style={{ '--h': (i * 47 + 260) % 360 }}>
                <span className="frame-no">{String(i + 1).padStart(2, '0')}</span>
                <button className="grip" onPointerDown={(e) => onGrab(e, i)} onClick={(e) => e.stopPropagation()} aria-label="Drag to reorder" data-testid="scene-grip"><Icon name="grip" size={18} stroke={3} /></button>
                <span className="frame-beat">{beatName(i, n)}</span>
                <span className="frame-text">{sc.prompt || 'Empty frame'}</span>
              </div>
              <span className="frame-meta">{sc.camera} · {sc.length}s</span>
            </li>
          ))}
          {n < MAX && (
            <li className="frame-add">
              <button onClick={addScene} data-testid="scene-add" aria-label="Add scene"><Icon name="plus" size={22} /><span>Add frame</span><small>{n}/{MAX}</small></button>
            </li>
          )}
        </ol>
      </div>

      {cur && (
        <div className="frame-editor" key={cur.id} data-testid="frame-editor">
          <div className="scene-top">
            <span className="scene-num">{String(si + 1).padStart(2, '0')}</span>
            <span className="scene-beat">{beatName(si, n)}</span>
            <span className="grow" />
            <button className="icon-btn sm" onClick={() => move(si, si - 1)} disabled={si === 0} aria-label="Move earlier" data-testid="scene-up"><Icon name="back" size={16} /></button>
            <button className="icon-btn sm" onClick={() => move(si, si + 1)} disabled={si === n - 1} aria-label="Move later" data-testid="scene-down"><Icon name="back" size={16} className="flip" /></button>
            <button className="icon-btn sm" onClick={() => removeScene(si)} disabled={n <= MIN} aria-label="Remove scene" data-testid="scene-remove"><Icon name="trash" size={16} /></button>
          </div>
          <textarea rows={3} maxLength={300} value={cur.prompt} placeholder={OUTLINE[beatName(si, n)](charName)}
            onChange={(e) => setScene(si, { prompt: e.target.value })} data-testid="scene-prompt" />
          <div className="scene-opts">
            <div className="stock-toggle" role="group" aria-label="Length">
              {[5, 10].map((l) => <button key={l} className={cur.length === l ? 'on' : ''} onClick={() => setScene(si, { length: l })}>{l}s</button>)}
            </div>
            <label className="mini-select"><Icon name="camera" size={14} />
              <select value={cur.camera} onChange={(e) => setScene(si, { camera: e.target.value })} data-testid="scene-camera">{CAMERAS.map((c) => <option key={c}>{c}</option>)}</select>
            </label>
            <label className="mini-select"><Icon name="spark" size={14} />
              <select value={cur.mood} onChange={(e) => setScene(si, { mood: e.target.value })} data-testid="scene-mood">{MOODS.map((m) => <option key={m}>{m}</option>)}</select>
            </label>
          </div>
        </div>
      )}
      {n >= MAX && <p className="hint center">Six scenes max. Keep it short and punchy.</p>}

      <label className="check-row">
        <input type="checkbox" checked={board.publish} onChange={(e) => set({ publish: e.target.checked })} /> Premiere it on Showing when it's done (this device only)
      </label>

      <div className="cost-bar">
        <div>
          <span className="hint">Budget · {n} scenes</span>
          <b data-testid="board-cost"><Icon name="reel" size={16} /> {total}</b>
          <span className="hint">You have {state.credits}</span>
        </div>
        <button className="btn primary" onClick={generateAll} disabled={!ready || total > state.credits} data-testid="generate-all">
          <Icon name="clapper" size={18} /> Roll all scenes
        </button>
      </div>
    </div>
  );
}
