import React from 'react';
import { createPortal } from 'react-dom';

const P = {
  play: 'M8 5v14l11-7z',
  plus: 'M12 5v14M5 12h14',
  heart: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z',
  flag: 'M5 21V4h11l-1.5 4L16 12H5',
  film: 'M4 5h16v14H4zM4 9h16M4 15h16M8 5v14M16 5v14',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-7 8a7 7 0 0 1 14 0',
  gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 13a7.6 7.6 0 0 0 0-2l2-1.5-2-3.4-2.3.9a7 7 0 0 0-1.7-1L15 3.6h-4l-.4 2.4a7 7 0 0 0-1.7 1l-2.3-.9-2 3.4 2 1.5a7.6 7.6 0 0 0 0 2l-2 1.5 2 3.4 2.3-.9a7 7 0 0 0 1.7 1l.4 2.4h4l.4-2.4a7 7 0 0 0 1.7-1l2.3.9 2-3.4z',
  home: 'M4 11l8-7 8 7v9h-5v-6H9v6H4z',
  lock: 'M7 11V8a5 5 0 0 1 10 0v3M6 11h12v9H6z',
  spark: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z',
  coin: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9 9.5h4.5a1.75 1.75 0 0 1 0 3.5H10.5a1.75 1.75 0 0 0 0 3.5H15M12 7.5v1.5M12 16.5V18',
  x: 'M6 6l12 12M18 6L6 18',
  up: 'M12 19V5M6 11l6-6 6 6',
  down: 'M12 5v14M6 13l6 6 6-6',
  trash: 'M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13',
  check: 'M5 12l5 5 9-10',
  dance: 'M13 4a2 2 0 1 0 0 .1M9 21l2-6-3-3 2-4 5 2 3-2M13 15l3 6',
  back: 'M15 5l-7 7 7 7',
  share: 'M12 4v12M7 9l5-5 5 5M5 14v6h14v-6',
  bell: 'M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 20a2 2 0 0 0 4 0',
  people: 'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm-6 9a6 6 0 0 1 12 0M17 11a3 3 0 1 0 0-6M21 20a6 6 0 0 0-4-5.6',
  star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z',
  upload: 'M12 16V4M7 9l5-5 5 5M4 20h16',
  bulb: 'M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z',
  gem: 'M6 3h12l3 6-9 12L3 9zM3 9h18M9 3l-1.5 6L12 21l4.5-12L15 3',
  stop: 'M7 7h10v10H7z',
  mic: 'M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM5 11a7 7 0 0 0 14 0M12 18v3',
  remix: 'M4 9a7 7 0 0 1 12.5-3.5L19 8M19 4v4h-4M20 15a7 7 0 0 1-12.5 3.5L5 16M5 20v-4h4',
  grip: 'M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01',
  camera: 'M3 8h3l2-3h8l2 3h3v11H3zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  download: 'M12 4v12M7 11l5 5 5-5M4 20h16',
  board: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  edit: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4',
};

export function Icon({ name, size = 22, fill = false, stroke = 2, className = '' }) {
  return (
    <svg className={'ico ' + className} width={size} height={size} viewBox="0 0 24 24"
      fill={fill ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={stroke}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={P[name]} />
    </svg>
  );
}

export function Sheet({ open, onClose, title, children }) {
  if (!open) return null;
  return createPortal(
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grip" />
        <div className="sheet-head">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="x" /></button>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </div>,
    document.body
  );
}

export function Toggle({ checked, onChange, label, hint, testid }) {
  return (
    <label className="toggle-row">
      <span>
        <span className="toggle-label">{label}</span>
        {hint && <span className="hint">{hint}</span>}
      </span>
      <input type="checkbox" className="switch" checked={checked} data-testid={testid}
        onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

export function Avatar({ character, size = 40 }) {
  const letter = (character?.name || character?.handle || '?').trim().charAt(0).toUpperCase() || '?';
  return character?.avatar ? (
    <img className="avatar" src={character.avatar} alt="" style={{ width: size, height: size }} />
  ) : (
    <span className="avatar avatar-letter" style={{ width: size, height: size, fontSize: size * 0.42 }}>{letter}</span>
  );
}

// LKS monogram — the studio's own mark.
export function Monogram({ size = 28, className = '' }) {
  return (
    <svg className={'monogram ' + className} width={size} height={size} viewBox="0 0 64 64" aria-label="LKS" role="img">
      <defs>
        <linearGradient id="lksg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#d946ef" /><stop offset="1" stopColor="#7c3aed" /></linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="18" fill="url(#lksg)" />
      <rect x="2.75" y="2.75" width="58.5" height="58.5" rx="17.25" fill="none" stroke="rgba(255,255,255,.35)" strokeWidth="1.5" />
      <path d="M13 19v26h10" stroke="#fff" strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M28 19v26M28 33l10-14M31 30l8 15" stroke="#fff" strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M53 22.5c-1.4-2.4-3.6-3.5-6-3.5-3.3 0-5.5 2-5.5 5 0 6.5 12 4.5 12 11.5 0 3.3-2.6 5.5-6.3 5.5-2.8 0-5.2-1.3-6.4-3.8" stroke="#fff" strokeWidth="4.2" fill="none" strokeLinecap="round" transform="translate(0 2)" />
    </svg>
  );
}

// Light "haptic" tick on supported phones.
export const tick = () => { try { navigator.vibrate?.(8); } catch {} };
