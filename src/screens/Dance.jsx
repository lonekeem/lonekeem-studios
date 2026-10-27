import React, { useEffect, useState } from 'react';
import { useStore } from '../lib/store.jsx';
import { generateClip } from '../lib/generateClip.js';
import { Icon } from '../lib/ui.jsx';

export default function Dance() {
  const { state, addClip, notify } = useStore();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [consent, setConsent] = useState(false);
  const [job, setJob] = useState(null);
  const [result, setResult] = useState(null);

  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  const pick = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('video/')) return notify('Please choose a video file.');
    if (f.size > 100 * 1024 * 1024) return notify('Max 100 MB in this demo.');
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setResult(null);
  };

  const run = async () => {
    setJob({ progress: 0, stage: 'Queued' });
    const clip = await generateClip({
      prompt: `Dance copy of "${file.name}"`, model: 'auto', length: 10, quality: '480p',
      character: state.character, options: { dance: true }, onProgress: setJob,
    });
    addClip(clip);
    setJob(null);
    setResult(clip);
  };

  return (
    <div className="create" data-testid="dance">
      <div className="banner"><b>Coming soon</b> — this is a working demo of the flow. No video leaves your device.</div>
      <p className="muted">Upload a reference dance and your character will copy the moves.</p>

      <label className="upload">
        <input type="file" accept="video/*" onChange={pick} data-testid="dance-file" />
        {preview ? <video src={preview} muted playsInline loop autoPlay /> : (
          <span><Icon name="upload" size={28} /><b>Choose a reference video</b><span className="hint">MP4 / MOV · up to 30s</span></span>
        )}
      </label>
      {file && <p className="hint">{file.name}</p>}

      <div className="note"><Icon name="x" size={16} /> Audio is removed from your reference video. Only the movement is used — add music later.</div>

      <label className="consent">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} data-testid="dance-consent" />
        <span>I own this video or have permission from everyone in it, and it doesn’t show anyone under 18 or anyone who hasn’t agreed to be used.</span>
      </label>

      {job ? (
        <div className="gen-inline"><div className="progress"><span style={{ width: `${job.progress * 100}%` }} /></div><span className="hint">{job.stage}…</span></div>
      ) : (
        <button className="btn primary wide" disabled={!file || !consent} onClick={run} data-testid="dance-run">
          <Icon name="dance" size={18} /> Try the demo (free)
        </button>
      )}

      {result && (
        <div className="result-video small">
          <video src={result.url} autoPlay muted loop playsInline />
          <span className="ai-badge"><Icon name="spark" size={14} fill /> AI-generated · demo</span>
        </div>
      )}
    </div>
  );
}
