import React, { useRef, useState } from 'react';
import { useStore } from '../lib/store.jsx';
import { MODELS, LENGTHS, QUALITIES, ADDONS, creditCost } from '../lib/models.js';
import { generateClip, IS_DEMO } from '../lib/generateClip.js';
import { Icon, Sheet, Toggle, Avatar } from '../lib/ui.jsx';
import Dance from './Dance.jsx';
import Storyboard from './Storyboard.jsx';

const IDEAS = [
  'My character sneaks through a neon night market looking for a lost robot',
  'Slow-motion jump between two rooftops at sunset, camera following',
  'Waking up on a floating island above the clouds, wind in the hair',
  'A tense standoff in a rainy alley, dramatic lighting',
];

export default function Create({ mode, go }) {
  return (
    <div className="page">
      <div className="seg seg-anim" style={{ '--i': mode === 'board' ? 1 : mode === 'dance' ? 2 : 0, '--n': 3 }}>
        <span className="seg-thumb" />
        <button className={!mode ? 'on' : ''} onClick={() => go('create')} data-testid="scene-tab">Scene</button>
        <button className={mode === 'board' ? 'on' : ''} onClick={() => go('create/board')} data-testid="board-tab">Storyboard</button>
        <button className={mode === 'dance' ? 'on' : ''} onClick={() => go('create/dance')} data-testid="dance-tab">
          Dance <span className="soon">soon</span>
        </button>
      </div>
      {mode === 'dance' ? <Dance /> : mode === 'board' ? <Storyboard go={go} /> : <SceneCreator go={go} />}
    </div>
  );
}

function SceneCreator({ go }) {
  const { state, spendCredits, addCredits, addClip, notify, setRemix } = useStore();
  // A remix handed over from the feed: prefill the scene, lock the character in.
  const [remix] = useState(() => state.remix);
  React.useEffect(() => { if (state.remix) setRemix(null); }, []); // eslint-disable-line
  const [remixOf, setRemixOf] = useState(remix ? { handle: remix.handle, title: remix.title, series: remix.series } : null);
  const [prompt, setPrompt] = useState(remix ? `${state.character.name || 'My character'} steps into this scene: ${remix.prompt}` : '');
  const [model, setModel] = useState('auto');
  const [length, setLength] = useState(5);
  const [quality, setQuality] = useState('480p');
  const [opts, setOpts] = useState({ characterLock: true, voiceLock: false, coStar: false });
  const [coStarName, setCoStarName] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [job, setJob] = useState(null); // {progress, stage}
  const [result, setResult] = useState(null);
  const abortRef = useRef(null);

  const cost = creditCost({ model, length, quality, ...opts });
  const m = MODELS.find((x) => x.id === model);
  const ch = state.character;
  const hasChar = !!ch.name;
  const lockedTap = (what) => notify(`${what} is a paid-plan feature (locked in this demo).`);

  const run = async () => {
    if (!prompt.trim()) return notify('Describe your scene first.');
    if (!spendCredits(cost, `Clip · ${m.name} · ${length}s`)) return notify('Not enough credits — earn more in Settings.');
    setResult(null);
    setJob({ progress: 0, stage: 'Queued' });
    const ac = new AbortController();
    abortRef.current = ac;
    try {
      const clip = await generateClip({
        prompt: prompt.trim(), model, length, quality,
        // Only what a real model needs — not the whole version history.
        character: opts.characterLock && hasChar ? {
          name: ch.name, handle: ch.handle, look: ch.look, style: ch.style, image: ch.avatar,
          voice: opts.voiceLock ? ch.voice : null, lore: ch.lore, traits: ch.traits,
        } : null,
        options: { ...opts, coStarName: opts.coStar ? coStarName : '' },
        onProgress: setJob, signal: ac.signal,
      });
      const c = remixOf ? { ...clip, remixOf } : clip;
      addClip(c);
      setResult(c);
    } catch (e) {
      addCredits(cost, 'Refund · cancelled clip');
      notify(e.name === 'AbortError' ? 'Cancelled — credits refunded.' : e.message);
    } finally {
      setJob(null);
    }
  };

  if (job) {
    return (
      <div className="gen-card" data-testid="generating">
        <div className="gen-orb"><span style={{ '--p': job.progress }} /></div>
        <h2>Making your clip…</h2>
        <p className="muted">{job.stage}</p>
        <div className="progress"><span style={{ width: `${Math.round(job.progress * 100)}%` }} /></div>
        <p className="hint">{Math.round(job.progress * 100)}% · {m.name} · {length}s · {quality}{IS_DEMO && ' · demo render'}</p>
        <button className="btn ghost" onClick={() => abortRef.current?.abort()}>Cancel</button>
      </div>
    );
  }

  if (result) {
    return (
      <div className="result" data-testid="result">
        <div className="result-video">
          <video src={result.url} autoPlay muted loop playsInline controls />
          <span className="ai-badge"><Icon name="spark" size={14} fill /> AI-generated</span>
        </div>
        <p className="prompt-echo">“{result.prompt}”</p>
        {result.remixOf && <p className="remix-credit center"><Icon name="remix" size={14} /> Remix of @{result.remixOf.handle} · “{result.remixOf.title}”</p>}
        {result.demo && <p className="hint">Demo mode: this is a sample clip, not a real render of your prompt.</p>}
        <div className="row">
          <button className="btn ghost" onClick={() => setResult(null)}>Make another</button>
          <button className="btn primary" onClick={() => go('series')} data-testid="to-series">Add to a series</button>
        </div>
      </div>
    );
  }

  return (
    <div className="create">
      {remixOf && (
        <div className="remix-banner glass" data-testid="remix-banner">
          <Icon name="remix" size={20} />
          <span className="grow"><b>Remix of @{remixOf.handle}</b><span className="hint">“{remixOf.title}”{remixOf.series ? ` · ${remixOf.series}` : ''} — credited on your clip</span></span>
          <button className="icon-btn sm" onClick={() => setRemixOf(null)} aria-label="Remove remix credit"><Icon name="x" size={16} /></button>
        </div>
      )}
      <button className="char-strip" onClick={() => go(hasChar ? 'character' : 'creator/look')}>
        <Avatar character={ch} size={38} />
        <span>
          {hasChar ? <><b>{ch.name}</b> <span className="muted">@{ch.handle}</span></> : <b>Create your character</b>}
          <span className="hint">{hasChar ? `${opts.characterLock ? 'Locked in' : 'Not locked'} · ${ch.voice.style} voice${opts.voiceLock ? ' (locked)' : ''}` : 'So you can star in your clips'}</span>
        </span>
        <Icon name="back" size={18} className="flip" />
      </button>

      <label className="field">
        <span className="field-label">Scene</span>
        <textarea rows={4} maxLength={600} value={prompt} onChange={(e) => setPrompt(e.target.value)}
          placeholder="What happens in this clip? e.g. I race a hoverbike through a canyon at dawn" data-testid="prompt" />
        <span className="counter">{prompt.length}/600</span>
      </label>
      <div className="ideas">
        {IDEAS.map((i) => <button key={i} className="chip-btn" onClick={() => setPrompt(i)}>{i.split(' ').slice(0, 5).join(' ')}…</button>)}
      </div>

      <div className="field">
        <span className="field-label">Model</span>
        <button className="model-btn" onClick={() => setPickerOpen(true)} data-testid="model-btn">
          <span><b>{m.name}{m.id === 'auto' && ' (recommended)'}</b><span className="hint">{m.tag} · {m.blurb}</span></span>
          <span className="muted">Change</span>
        </button>
      </div>

      <div className="field">
        <span className="field-label">Length</span>
        <div className="pills">
          {LENGTHS.map((l) => (
            <button key={l.s} className={'pill' + (length === l.s ? ' on' : '') + (l.locked ? ' locked' : '')}
              onClick={() => (l.locked ? lockedTap(`${l.s}s clips`) : setLength(l.s))} data-testid={`len-${l.s}`}>
              {l.locked && <Icon name="lock" size={13} />}{l.s}s
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <span className="field-label">Quality</span>
        <div className="pills">
          {QUALITIES.map((q) => (
            <button key={q.id} className={'pill' + (quality === q.id ? ' on' : '') + (q.locked ? ' locked' : '')}
              onClick={() => (q.locked ? lockedTap(q.id) : setQuality(q.id))} data-testid={`q-${q.id}`}>
              {q.locked && <Icon name="lock" size={13} />}{q.id}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        {Object.entries(ADDONS).map(([k, a]) => (
          <Toggle key={k} label={`${a.label} · +${a.cost}`} hint={a.hint} checked={opts[k]} testid={`opt-${k}`}
            onChange={(v) => setOpts((o) => ({ ...o, [k]: v }))} />
        ))}
        {opts.coStar && (
          <input className="input" placeholder="Co-star name or @handle" value={coStarName} onChange={(e) => setCoStarName(e.target.value)} />
        )}
        {opts.characterLock && !hasChar && <p className="hint warn">Character lock works best once you create your character.</p>}
      </div>

      <div className="cost-bar">
        <div>
          <span className="hint">Cost</span>
          <b data-testid="cost"><Icon name="gem" size={16} /> {cost}</b>
          <span className="hint">You have {state.credits}</span>
        </div>
        <button className="btn primary" onClick={run} disabled={!prompt.trim() || cost > state.credits} data-testid="generate">
          <Icon name="spark" size={18} fill /> Generate
        </button>
      </div>

      <Sheet open={pickerOpen} onClose={() => setPickerOpen(false)} title="Choose a model">
        <div className="model-list">
          {MODELS.map((x, idx) => (
            <React.Fragment key={x.id}>
              {idx === 1 && <div className="list-label">Choose your own</div>}
              <button className={'model-opt' + (x.id === model ? ' on' : '')} data-testid={`model-${x.id}`}
                onClick={() => { setModel(x.id); setPickerOpen(false); }}>
                <span>
                  <b>{x.name}{x.id === 'auto' && ' (recommended)'}</b>
                  <span className="tag">{x.tag}</span>
                  <span className="hint">{x.blurb}</span>
                </span>
                <span className="price"><Icon name="gem" size={14} />{x.base}<small>/5s</small></span>
              </button>
            </React.Fragment>
          ))}
        </div>
        <p className="hint">Model names are shown for comparison only. In demo mode every model returns a sample clip.</p>
      </Sheet>
    </div>
  );
}
