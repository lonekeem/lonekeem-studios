import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useStore, LORE_FIELDS } from '../lib/store.jsx';
import { drawPortrait, shrinkImage, STYLES, ASPECTS } from '../lib/portrait.js';
import { speak, VOICE_STYLES, VOICE_IDEAS, ttsSupported } from '../lib/voice.js';
import { SEED_EPISODES } from '../lib/seed.js';
import { Icon, Sheet } from '../lib/ui.jsx';

export const LOOK_COST = 45;
export const VOICE_COST = 30;
export const WELCOME_BONUS = 100;
const TABS = ['look', 'voice', 'lore', 'details'];
const TAB_LABEL = { look: 'Look', voice: 'Voice', lore: 'Lore', details: 'Details' };
const LOOK_IDEAS = [
  'Silver hair, neon-lit night street, confident half smile',
  'Desert wanderer, teal scarf, sun-faded jacket, golden hour',
  'Pink hair, oversized hoodie, rooftop at sunset',
  'Dark noir detective, rain, purple city lights',
  'Ocean explorer with a glowing blue visor',
  'Curly hair, forest green cloak, misty morning',
];
const TRAITS = ['Playful', 'Deadpan', 'Loyal', 'Chaotic', 'Warm', 'Blunt', 'Curious', 'Shy', 'Bold', 'Dreamy', 'Sassy', 'Gentle'];
const RESERVED = ['admin', 'support', 'official', 'moderator', 'studios', 'help', 'team', 'you'];
const CONTENT_NOTE = 'Make it your own. Don’t copy famous characters or real people without their permission.';

export const cleanHandle = (h) => (h || '').toLowerCase().replace(/^@/, '').replace(/[^a-z0-9._]/g, '').slice(0, 24);

function useFakeJob() {
  const [job, setJob] = useState(null);
  const run = (ms, stages) => new Promise((resolve) => {
    const start = performance.now();
    const tick = () => {
      const p = Math.min(1, (performance.now() - start) / ms);
      setJob({ progress: p, stage: stages[Math.min(stages.length - 1, Math.floor(p * stages.length))] });
      if (p >= 1) { setJob(null); resolve(); } else setTimeout(tick, 70);
    };
    tick();
  });
  return [job, run];
}

// ─────────────────────────────────────────────────────────────────────────────
export function Welcome({ onStart, onSkip }) {
  return (
    <div className="welcome fancy" data-testid="welcome">
      <div className="brand-mark big" />
      <h1>Welcome to <span className="grad-text">Lone Keem Studios</span></h1>
      <ul className="welcome-steps">
        <li><span>1</span> Design how your character looks</li>
        <li><span>2</span> Give them a voice and a backstory</li>
        <li><span>3</span> Star in your own short series</li>
      </ul>
      <button className="btn primary wide" onClick={onStart} data-testid="welcome-start">Build my character</button>
      <button className="link" onClick={onSkip} data-testid="welcome-skip">Skip intro</button>
      <p className="hint">Demo mode · free · nothing leaves this device</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function Creator({ tab = 'look', go, firstRun }) {
  const store = useStore();
  const { state, patchCharacter, finishOnboarding, addCredits, markEarned, notify } = store;
  const ch = state.character;
  const t = TABS.includes(tab) ? tab : 'look';
  const idx = TABS.indexOf(t);
  const setTab = (x) => go('creator/' + x);

  const handle = cleanHandle(ch.handle);
  const taken = useMemo(() => new Set([...SEED_EPISODES.map((e) => e.handle), ...RESERVED]), []);
  const handleOk = handle.length >= 3 && !taken.has(handle);
  const ready = ch.name.trim() && handleOk;

  const done = () => {
    if (!ready) { setTab('details'); notify('Add a name and an available @username to finish.'); return; }
    patchCharacter({ name: ch.name.trim(), handle });
    if (!state.earned.welcome) { markEarned('welcome'); addCredits(WELCOME_BONUS, 'Welcome bonus — character created'); notify(`Character ready! +${WELCOME_BONUS} bonus credits`); }
    else notify('Character saved');
    finishOnboarding();
    go(firstRun ? 'watch' : 'character');
  };

  const later = () => { finishOnboarding(); go(firstRun ? 'watch' : 'character'); };

  return (
    <div className="creator" data-testid="creator">
      <header className="creator-top">
        <button className="icon-btn" onClick={later} aria-label="Close" data-testid="creator-close">
          {firstRun ? <span className="later">Later</span> : <Icon name="x" />}
        </button>
        <div className="creator-title">{firstRun ? 'Create your character' : 'Edit character'}
          <span className="mini-credits" data-testid="creator-credits"><Icon name="gem" size={13} />{state.credits}</span></div>
        <button className="btn primary small" onClick={done} data-testid="creator-done">Done</button>
      </header>
      <div className="seg seg-anim" style={{ '--i': idx, '--n': TABS.length }}>
        <span className="seg-thumb" />
        {TABS.map((x) => (
          <button key={x} className={t === x ? 'on' : ''} onClick={() => setTab(x)} data-testid={'ctab-' + x}>{TAB_LABEL[x]}</button>
        ))}
      </div>
      <div className="creator-body" key={t}>
        {t === 'look' && <LookTab />}
        {t === 'voice' && <VoiceTab />}
        {t === 'lore' && <LoreTab />}
        {t === 'details' && <DetailsTab handle={handle} handleOk={handleOk} taken={taken.has(handle)} />}
        <div className="creator-next">
          {idx < TABS.length - 1
            ? <button className="btn ghost wide" onClick={() => setTab(TABS[idx + 1])} data-testid="creator-next">Next: {TAB_LABEL[TABS[idx + 1]]} →</button>
            : <button className="btn primary wide" onClick={done} data-testid="creator-finish">Finish{!state.earned.welcome && ` · +${WELCOME_BONUS} bonus`}</button>}
        </div>
      </div>
    </div>
  );
}

// ── Photo consent sheet (shared by upload + reference image) ──
function PhotoConsent({ pending, onCancel, onConfirm }) {
  const [ok, setOk] = useState(false);
  useEffect(() => setOk(false), [pending]);
  return (
    <Sheet open={!!pending} onClose={onCancel} title={pending?.kind === 'ref' ? 'Add reference image' : 'Use your photo'}>
      {pending && <img className="consent-preview" src={pending.img} alt="" />}
      <label className="consent">
        <input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} data-testid="photo-consent" />
        <span>If this shows a real person, it’s me or I have their permission. It isn’t a celebrity, and no one in it is a minor.</span>
      </label>
      <button className="btn primary wide" disabled={!ok} onClick={() => onConfirm(pending)} data-testid="photo-use">Use this image</button>
    </Sheet>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
function LookTab() {
  const { state, patchCharacter, spendCredits, notify } = useStore();
  const ch = state.character;
  const [job, runJob] = useFakeJob();
  const [ref, setRef] = useState(null);
  const [pending, setPending] = useState(null);
  const [styleOpen, setStyleOpen] = useState(false);
  const fileRef = useRef(null);
  const refRef = useRef(null);
  const v = ch.versions;
  const i = Math.min(ch.versionIdx, Math.max(0, v.length - 1));
  const cur = v[i];

  const select = (k) => patchCharacter((c) => ({ versionIdx: k, avatar: c.versions[k]?.img || '' }));

  const pick = (kind) => async (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (!f.type.startsWith('image/')) return notify('Please choose an image.');
    try { setPending({ kind, img: await shrinkImage(f, 640) }); } catch { notify('Could not read that image.'); }
  };

  const confirmPhoto = (p) => {
    setPending(null);
    if (p.kind === 'ref') { setRef(p.img); notify('Reference added — it will guide the next generation.'); return; }
    // An uploaded photo becomes version 1.
    patchCharacter((c) => {
      const versions = [{ img: p.img, style: 'Photo', prompt: 'Uploaded photo', kind: 'photo' }, ...c.versions.filter((x) => x.kind !== 'photo')].slice(0, 10);
      return { versions, versionIdx: 0, avatar: p.img };
    });
  };

  const generate = async () => {
    if (!spendCredits(LOOK_COST, 'Character look')) return notify('Not enough credits.');
    const base = ref || v.find((x) => x.kind === 'photo')?.img || null;
    const [img] = await Promise.all([
      drawPortrait({ seed: Date.now(), style: ch.style, name: ch.name || ch.handle, prompt: ch.look, aspect: ch.aspect, baseImage: base }),
      runJob(2600, ['Sketching', 'Shaping the face', 'Lighting', 'Final touches']),
    ]);
    patchCharacter((c) => {
      const versions = [...c.versions, { img, style: c.style, prompt: c.look, kind: 'gen' }].slice(-10);
      return { versions, versionIdx: versions.length - 1, avatar: img };
    });
    setRef(null);
  };

  const aspects = Object.keys(ASPECTS);
  const ar = ch.aspect.replace(':', ' / ');

  return (
    <div className="look">
      <div className="portrait" style={{ aspectRatio: ar }} data-testid="portrait">
        {cur ? <img src={cur.img} alt="Character portrait" /> : (
          <div className="portrait-empty"><Icon name="user" size={54} /><span>Describe your look below and tap Generate — or upload a photo.</span></div>
        )}
        <button className="style-tag glass" onClick={() => setStyleOpen(true)} data-testid="style-tag">{ch.style} ▾</button>
        <button className="glass icon-btn upload-btn" onClick={() => fileRef.current.click()} aria-label="Upload your own image" data-testid="upload-own">
          <Icon name="upload" size={18} />
        </button>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={pick('photo')} data-testid="upload-input" />
        {v.length > 1 && (
          <>
            <button className="nav-arrow left glass" onClick={() => select((i - 1 + v.length) % v.length)} aria-label="Previous version" data-testid="ver-prev"><Icon name="back" size={20} /></button>
            <button className="nav-arrow right glass" onClick={() => select((i + 1) % v.length)} aria-label="Next version" data-testid="ver-next"><Icon name="back" size={20} className="flip" /></button>
          </>
        )}
        {v.length > 0 && <span className="ver-count glass" data-testid="ver-count">{i + 1} / {v.length}{cur?.kind === 'photo' ? ' · your photo' : ''}</span>}
        {job && (
          <div className="portrait-job glass" data-testid="look-job">
            <div className="ring" style={{ '--p': job.progress }}><span>{Math.round(job.progress * 100)}%</span></div>
            <span>{job.stage}…</span>
          </div>
        )}
      </div>
      <p className="content-note">{CONTENT_NOTE}</p>

      <div className="edit-box">
        <textarea rows={2} maxLength={400} placeholder="Edit… describe the look (hair, outfit, vibe, setting)" value={ch.look}
          onChange={(e) => patchCharacter({ look: e.target.value })} data-testid="look-prompt" />
        {ref && <div className="ref-chip"><img src={ref} alt="" /> Reference <button onClick={() => setRef(null)} aria-label="Remove reference"><Icon name="x" size={12} /></button></div>}
        <div className="edit-tools">
          <button className="tool" onClick={() => refRef.current.click()} aria-label="Add reference image" title="Add reference image"><Icon name="plus" size={18} /></button>
          <input ref={refRef} type="file" accept="image/*" hidden onChange={pick('ref')} data-testid="ref-input" />
          <button className="tool" onClick={() => patchCharacter({ look: LOOK_IDEAS[Math.floor(Math.random() * LOOK_IDEAS.length)] })} aria-label="Idea" title="Give me an idea" data-testid="look-idea"><Icon name="bulb" size={18} /></button>
          <button className="tool aspect" onClick={() => patchCharacter({ aspect: aspects[(aspects.indexOf(ch.aspect) + 1) % aspects.length] })} title="Format" data-testid="aspect">{ch.aspect}</button>
          <button className="btn primary gen" disabled={!!job || state.credits < LOOK_COST} onClick={generate} data-testid="look-generate">
            Generate <span className="cost-chip"><Icon name="gem" size={14} />{LOOK_COST}</span>
          </button>
        </div>
      </div>

      <Sheet open={styleOpen} onClose={() => setStyleOpen(false)} title="Style">
        <div className="style-grid">
          {STYLES.map((s) => (
            <button key={s} className={'pill' + (ch.style === s ? ' on' : '')} onClick={() => { patchCharacter({ style: s }); setStyleOpen(false); }} data-testid={'style-' + s}>{s}</button>
          ))}
        </div>
        <p className="hint">The style applies to your next generation.</p>
      </Sheet>
      <PhotoConsent pending={pending} onCancel={() => setPending(null)} onConfirm={confirmPhoto} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
function VoiceTab() {
  const { state, patchCharacter, spendCredits, notify } = useStore();
  const ch = state.character;
  const vo = ch.voice;
  const [playing, setPlaying] = useState(false);
  const [job, runJob] = useFakeJob();
  const h = useRef(null);
  const setVo = (p) => patchCharacter((c) => ({ voice: { ...c.voice, ...p } }));

  useEffect(() => () => h.current?.stop(), []);

  const line = () => `Hey, I'm ${ch.name || 'your new character'}. ${vo.desc ? '' : ''}Let's make something nobody's seen before.`;
  const play = () => {
    if (playing) { h.current?.stop(); return; }
    if (!ttsSupported()) notify('Your browser can’t speak — showing a silent preview.');
    h.current = speak({ text: line(), style: vo.style, pace: vo.pace, desc: vo.desc, seed: (ch.handle || 'x').length }, {
      onStart: () => setPlaying(true), onEnd: () => setPlaying(false),
    });
  };

  const generate = async () => {
    if (!spendCredits(VOICE_COST, 'Character voice')) return notify('Not enough credits.');
    await runJob(2000, ['Listening to your description', 'Tuning pitch', 'Matching pace']);
    setVo({ generated: true, savedAt: Date.now() });
    notify('Voice saved');
    play();
  };

  return (
    <div className="voice">
      <div className="portrait voice-card" style={{ aspectRatio: '4 / 5' }}>
        {ch.avatar ? <img src={ch.avatar} alt="" /> : <div className="portrait-empty"><Icon name="user" size={54} /></div>}
        <div className="voice-panel glass">
          <button className={'play-btn' + (playing ? ' on' : '')} onClick={play} aria-label={playing ? 'Stop' : 'Play voice'} data-testid="voice-play">
            <Icon name={playing ? 'stop' : 'play'} size={22} fill />
          </button>
          <div className={'wave' + (playing ? ' playing' : '')} data-testid="wave">
            {Array.from({ length: 22 }, (_, k) => <span key={k} style={{ '--d': `${(k * 53) % 400}ms`, '--h': `${30 + ((k * 37) % 70)}%` }} />)}
          </div>
          <span className="style-tag static">{vo.style}</span>
        </div>
        {job && <div className="portrait-job glass"><div className="ring" style={{ '--p': job.progress }}><span>{Math.round(job.progress * 100)}%</span></div><span>{job.stage}…</span></div>}
      </div>

      <div className="field"><span className="field-label">Style</span>
        <div className="chip-scroll">
          {VOICE_STYLES.map((s) => (
            <button key={s.id} className={'pill' + (vo.style === s.id ? ' on' : '')} onClick={() => setVo({ style: s.id })} data-testid={'vstyle-' + s.id}>{s.id}</button>
          ))}
        </div>
      </div>
      <label className="field"><span className="field-label">Pace · {vo.pace}%</span>
        <input type="range" min="0" max="100" value={vo.pace} onChange={(e) => setVo({ pace: Number(e.target.value) })} className="slider" data-testid="voice-pace" style={{ '--v': vo.pace + '%' }} />
        <span className="slider-ends"><span>Slow</span><span>Fast</span></span>
      </label>
      <div className="edit-box">
        <textarea rows={2} maxLength={300} placeholder="Edit… describe the voice (accent, energy, attitude)" value={vo.desc}
          onChange={(e) => setVo({ desc: e.target.value })} data-testid="voice-desc" />
        <div className="edit-tools">
          <button className="tool" onClick={() => setVo({ desc: VOICE_IDEAS[Math.floor(Math.random() * VOICE_IDEAS.length)] })} title="Give me an idea" data-testid="voice-idea"><Icon name="bulb" size={18} /></button>
          <span className="grow hint">{vo.generated ? '✓ Voice saved' : 'Play is free · Generate saves it'}</span>
          <button className="btn primary gen" disabled={!!job || state.credits < VOICE_COST} onClick={generate} data-testid="voice-generate">
            Generate <span className="cost-chip"><Icon name="gem" size={14} />{VOICE_COST}</span>
          </button>
        </div>
      </div>
      <p className="hint">Demo voice uses your browser’s built-in speech, so it sounds different on each device.</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
const LORE_Q = {
  origin: 'Where do I come from? Tell me how my story started.',
  identity: 'Who am I at my core — what never changes about me?',
  personality: 'How do I act around people? Quirks, humor, habits?',
  social: 'Who’s in my life — friends, family, rivals, crew?',
  territory: 'Where do I hang out? My city, turf, home base?',
  current: 'What’s going on with me right now?',
  goals: 'What am I chasing? What do I want most?',
  fears: 'What scares me, even if I’d never admit it?',
};
const LORE_REPLY = [
  (l) => `Ooh, I like that. Added to my ${l}.`,
  (l) => `Noted — that’s part of my ${l} now.`,
  (l) => `That explains a lot. Saved under ${l}.`,
  (l) => `Got it. My ${l} just got more interesting.`,
];
const guessField = (txt) => {
  const s = txt.toLowerCase();
  if (/afraid|scared|fear|terrif|nightmare/.test(s)) return 'fears';
  if (/\bwant|dream|goal|someday|plan to|wish/.test(s)) return 'goals';
  if (/friend|sister|brother|mom|dad|rival|crew|partner|family|love/.test(s)) return 'social';
  if (/born|grew up|raised|came from|origin|childhood/.test(s)) return 'origin';
  if (/city|town|lives in|live in|district|island|planet|home base|turf/.test(s)) return 'territory';
  if (/right now|currently|lately|these days|today/.test(s)) return 'current';
  if (/funny|joke|sarcas|shy|loud|habit|always says/.test(s)) return 'personality';
  return 'identity';
};

function LoreTab() {
  const { state, patchCharacter, notify } = useStore();
  const ch = state.character;
  const label = (id) => LORE_FIELDS.find((f) => f.id === id)?.label;
  const [msgs, setMsgs] = useState([{ who: 'char', text: 'Hey. Want to change anything about my story?' }]);
  const [topic, setTopic] = useState(null);
  const [text, setText] = useState('');
  const [panel, setPanel] = useState(false);
  const [listening, setListening] = useState(false);
  const listRef = useRef(null);
  const SR = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);

  useEffect(() => { listRef.current?.scrollTo(0, listRef.current.scrollHeight); }, [msgs]);

  const chooseTopic = (id) => { setTopic(id); setMsgs((m) => [...m, { who: 'char', text: LORE_Q[id], topic: id }]); };

  const send = () => {
    const t = text.trim();
    if (!t) return;
    const field = topic || guessField(t);
    patchCharacter((c) => {
      const prev = c.lore[field]?.trim();
      const sentence = /[.!?]$/.test(t) ? t : t + '.';
      return { lore: { ...c.lore, [field]: prev ? `${prev} ${sentence}` : sentence } };
    });
    const reply = LORE_REPLY[msgs.length % LORE_REPLY.length](label(field));
    setMsgs((m) => [...m, { who: 'me', text: t }, { who: 'char', text: reply, saved: field }]);
    setText(''); setTopic(null);
  };

  const mic = () => {
    if (!SR) return notify('Voice typing isn’t supported in this browser.');
    const rec = new SR();
    rec.lang = 'en-US'; rec.interimResults = false;
    rec.onresult = (e) => setText((x) => (x ? x + ' ' : '') + e.results[0][0].transcript);
    rec.onend = () => setListening(false);
    rec.onerror = () => { setListening(false); notify('Couldn’t hear you — try again.'); };
    setListening(true); rec.start();
  };

  const filled = LORE_FIELDS.filter((f) => ch.lore[f.id]?.trim()).length;

  return (
    <div className="lore">
      <div className="chip-scroll lore-chips" data-testid="lore-chips">
        {LORE_FIELDS.map((f) => (
          <button key={f.id} className={'pill' + (topic === f.id ? ' on' : '') + (ch.lore[f.id] ? ' has' : '')} onClick={() => chooseTopic(f.id)} data-testid={'lore-' + f.id}>
            {f.label}
          </button>
        ))}
      </div>
      <div className="chat" ref={listRef} data-testid="lore-chat">
        {msgs.map((m, k) => (
          <div key={k} className={'bubble-row ' + m.who}>
            {m.who === 'char' && (ch.avatar ? <img className="avatar" src={ch.avatar} alt="" style={{ width: 30, height: 30 }} /> : <span className="avatar avatar-letter" style={{ width: 30, height: 30, fontSize: 13 }}>{(ch.name || '?')[0].toUpperCase()}</span>)}
            <div className="bubble">{m.text}{m.saved && <button className="saved-tag" onClick={() => setPanel(true)}>✓ {label(m.saved)}</button>}</div>
          </div>
        ))}
      </div>
      <p className="content-note">{CONTENT_NOTE}</p>
      <div className="chat-input">
        <button className="tool" onClick={() => chooseTopic(LORE_FIELDS[Math.floor(Math.random() * LORE_FIELDS.length)].id)} title="Ask me a lore question" aria-label="New lore question"><Icon name="plus" size={18} /></button>
        <button className="tool lore-btn" onClick={() => setPanel(true)} data-testid="lore-panel-btn">Lore{filled ? ` · ${filled}` : ''}</button>
        <input className="input" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder={topic ? `About my ${label(topic)}…` : 'Tell me something about me…'} data-testid="lore-input" />
        <button className={'tool' + (listening ? ' rec' : '')} onClick={mic} aria-label="Speak" title={SR ? 'Voice typing' : 'Voice typing not supported here'} data-testid="lore-mic"><Icon name="mic" size={18} /></button>
        <button className="tool send" onClick={send} disabled={!text.trim()} aria-label="Send" data-testid="lore-send"><Icon name="up" size={18} /></button>
      </div>

      <Sheet open={panel} onClose={() => setPanel(false)} title="Saved lore">
        <p className="hint">Everything your character knows about themself. Edit freely.</p>
        {LORE_FIELDS.map((f) => (
          <label key={f.id} className="field lore-field">
            <span className="field-label">{f.label}</span>
            <textarea rows={2} maxLength={1200} value={ch.lore[f.id]} placeholder={LORE_Q[f.id]} data-testid={'lorefield-' + f.id}
              onChange={(e) => patchCharacter((c) => ({ lore: { ...c.lore, [f.id]: e.target.value } }))} />
          </label>
        ))}
      </Sheet>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
function DetailsTab({ handle, handleOk, taken }) {
  const { state, patchCharacter, notify } = useStore();
  const ch = state.character;
  const set = (k) => (e) => patchCharacter({ [k]: e.target.value });
  const toggleTrait = (t) => {
    const has = ch.traits.includes(t);
    if (!has && ch.traits.length >= 3) return notify('Pick up to 3.');
    patchCharacter({ traits: has ? ch.traits.filter((x) => x !== t) : [...ch.traits, t] });
  };
  const COLLAB = [
    { id: 'allow', label: 'Allow', hint: 'Anyone can cast your character in their episodes.' },
    { id: 'request', label: 'Request', hint: 'Others ask first — you approve each one.' },
    { id: 'private', label: 'Private', hint: 'Only you can use your character.' },
  ];
  return (
    <div className="details">
      <label className="field"><span className="field-label">Name *</span>
        <input className="input" value={ch.name} onChange={set('name')} maxLength={40} placeholder="e.g. Nova Vale" data-testid="d-name" />
      </label>
      <label className="field"><span className="field-label">Username *</span>
        <div className="input-prefix"><span>@</span>
          <input className="input" value={ch.handle} maxLength={25} placeholder="novavale" autoCapitalize="none" data-testid="d-handle"
            onChange={(e) => patchCharacter({ handle: cleanHandle(e.target.value) })} />
        </div>
        <span className={'hint ' + (handleOk ? 'ok' : handle ? 'bad' : '')} data-testid="handle-status">
          {!handle ? 'Lowercase letters, numbers, dots and underscores.' : handle.length < 3 ? 'At least 3 characters.' : taken ? `@${handle} is taken` : `@${handle} is available`}
        </span>
      </label>
      <label className="field"><span className="field-label">Age (optional)</span>
        <input className="input" inputMode="numeric" value={ch.age} maxLength={4} placeholder="e.g. 24, or 'ageless'" onChange={set('age')} data-testid="d-age" />
      </label>
      <div className="field"><span className="field-label">Personality · pick up to 3</span>
        <div className="pills">
          {TRAITS.map((t) => <button key={t} className={'pill' + (ch.traits.includes(t) ? ' on' : '')} onClick={() => toggleTrait(t)} data-testid={'trait-' + t}>{t}</button>)}
        </div>
      </div>
      <label className="field"><span className="field-label">Bio</span>
        <textarea rows={3} maxLength={160} value={ch.bio} onChange={set('bio')} placeholder="One or two lines people see on your profile" data-testid="d-bio" />
        <span className="counter">{ch.bio.length}/160</span>
      </label>
      <div className="field"><span className="field-label">Socials</span>
        <div className="socials">
          {[['x', 'X'], ['instagram', 'Instagram'], ['tiktok', 'TikTok'], ['youtube', 'YouTube']].map(([k, l]) => (
            <div className="input-prefix" key={k}><span className="soc">{l}</span>
              <input className="input" value={ch.socials[k]} placeholder="@handle" maxLength={40}
                onChange={(e) => patchCharacter((c) => ({ socials: { ...c.socials, [k]: e.target.value } }))} />
            </div>
          ))}
        </div>
      </div>
      <div className="field"><span className="field-label">Allow collabs</span>
        <div className="radio-list">
          {COLLAB.map((o) => (
            <label key={o.id} className={'radio' + (ch.collabs === o.id ? ' on' : '')}>
              <input type="radio" name="collab" checked={ch.collabs === o.id} onChange={() => patchCharacter({ collabs: o.id })} data-testid={'collab-' + o.id} />
              <span><b>{o.label}</b><span className="hint">{o.hint}</span></span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
