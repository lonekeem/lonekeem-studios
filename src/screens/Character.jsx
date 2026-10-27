import React, { useState } from 'react';
import { useStore } from '../lib/store.jsx';
import { Avatar, Icon } from '../lib/ui.jsx';

// Shrink the chosen image to a small square JPEG data URL so it fits in localStorage.
function shrink(file, size = 256) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = c.height = size;
      const s = Math.min(img.width, img.height);
      c.getContext('2d').drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
      URL.revokeObjectURL(img.src);
      resolve(c.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

export default function Character({ go }) {
  const { state, saveCharacter, notify } = useStore();
  const [c, setC] = useState(state.character);
  const set = (k) => (e) => setC({ ...c, [k]: e.target.value });

  const onAvatar = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) return notify('Please pick an image.');
    try { setC({ ...c, avatar: await shrink(f) }); } catch { notify('Could not read that image.'); }
  };

  const handle = c.handle.replace(/^@/, '').toLowerCase().replace(/[^a-z0-9._]/g, '').slice(0, 24);
  const valid = c.name.trim() && handle.length >= 3;

  const save = () => {
    if (!valid) return notify('Add a name and a handle (3+ letters).');
    saveCharacter({ ...c, name: c.name.trim(), handle, look: c.look.trim() });
    notify('Character saved');
  };

  return (
    <div className="page create">
      <h1 className="page-title">My character</h1>
      <div className="avatar-edit">
        <Avatar character={{ ...c, handle }} size={96} />
        <div>
          <label className="btn ghost small">
            <input type="file" accept="image/*" hidden onChange={onAvatar} data-testid="avatar-file" />
            <Icon name="upload" size={16} /> {c.avatar ? 'Change photo' : 'Add photo (optional)'}
          </label>
          {c.avatar && <button className="link" onClick={() => setC({ ...c, avatar: '' })}>Remove</button>}
          <p className="hint">Stored only on this device.</p>
        </div>
      </div>

      <label className="field"><span className="field-label">Name</span>
        <input className="input" value={c.name} onChange={set('name')} maxLength={40} placeholder="e.g. Kai Storm" data-testid="char-name" />
      </label>
      <label className="field"><span className="field-label">Handle</span>
        <div className="input-prefix"><span>@</span>
          <input className="input" value={c.handle} onChange={set('handle')} maxLength={25} placeholder="kaistorm" data-testid="char-handle" />
        </div>
        {c.handle && handle !== c.handle.replace(/^@/, '') && <span className="hint">Will be saved as @{handle}</span>}
      </label>
      <label className="field"><span className="field-label">Look</span>
        <textarea rows={4} value={c.look} onChange={set('look')} maxLength={400} data-testid="char-look"
          placeholder="Hair, face, outfit, vibe… e.g. curly silver hair, orange bomber jacket, small scar over left eyebrow" />
        <span className="counter">{c.look.length}/400</span>
      </label>
      <p className="hint">Your look description is sent with every clip when Character lock is on, so you stay consistent across episodes.</p>
      <div className="row">
        <button className="btn primary" onClick={save} disabled={!valid} data-testid="char-save">Save character</button>
        <button className="btn ghost" onClick={() => go('create')}>Make a clip</button>
      </div>
    </div>
  );
}
