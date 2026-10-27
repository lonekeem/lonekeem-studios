// Demo "portrait generator": draws a stylised placeholder character on a canvas.
// Every call with a new seed gives a different result. In real mode this is
// where an image model (e.g. via fal.ai) would be called from the backend.

export const STYLES = ['Portrait', 'Full body', 'Anime', 'Realistic', '3D toon'];
export const ASPECTS = { '3:4': [480, 640], '1:1': [512, 512], '9:16': [432, 768] };

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const HUES = { red: 0, crimson: 350, orange: 25, gold: 45, yellow: 52, green: 130, forest: 140, teal: 175, cyan: 188, ocean: 200, blue: 220, navy: 228, purple: 270, violet: 275, pink: 320, magenta: 305 };
const HAIR = { silver: '#d9dbe3', white: '#f1efe9', blonde: '#e7c46b', black: '#16141b', brown: '#5b3a24', ginger: '#c4562a', red: '#b8322f', pink: '#ff7fb6', blue: '#4a7dff', green: '#3fbf7f', purple: '#8a5cff' };
const SKIN = ['#f4d3b8', '#e8b48f', '#c98d63', '#a8693f', '#7a4a2b', '#5a3420'];

export function initials(name) {
  const p = (name || '').trim().split(/\s+/).filter(Boolean);
  return ((p[0]?.[0] || '?') + (p[1]?.[0] || '')).toUpperCase();
}

function loadImg(src) {
  return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
}

function coverDraw(ctx, img, x, y, w, h) {
  const s = Math.max(w / img.width, h / img.height);
  const iw = img.width * s, ih = img.height * s;
  ctx.drawImage(img, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih);
}

export async function drawPortrait({ seed = Date.now(), style = 'Portrait', name = '', prompt = '', aspect = '3:4', baseImage = null }) {
  const [W, H] = ASPECTS[aspect] || ASPECTS['3:4'];
  const r = rng(seed);
  const p = prompt.toLowerCase();
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');

  // palette from prompt keywords, otherwise random
  const kw = Object.keys(HUES).find((k) => p.includes(k));
  const hue = kw ? HUES[kw] : Math.floor(r() * 360);
  const hue2 = (hue + 40 + r() * 80) % 360;
  const dark = /night|dark|shadow|noir|moody/.test(p);
  const L = dark ? 14 : 24;

  // background
  const bg = ctx.createLinearGradient(0, 0, W * (0.3 + r() * 0.7), H);
  bg.addColorStop(0, `hsl(${hue} 70% ${L + 10}%)`);
  bg.addColorStop(1, `hsl(${hue2} 75% ${L}%)`);
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 9; i++) {
    const x = r() * W, y = r() * H * 0.8, rad = 20 + r() * 110;
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, `hsla(${(hue + r() * 120) % 360} 90% 70% / ${0.12 + r() * 0.25})`);
    g.addColorStop(1, 'transparent');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }

  if (baseImage) {
    // stylise the uploaded / reference photo
    const img = await loadImg(baseImage);
    const filters = {
      Portrait: 'contrast(1.1) saturate(1.15)',
      'Full body': 'contrast(1.05) saturate(1.1)',
      Anime: 'contrast(1.45) saturate(1.8) brightness(1.08)',
      Realistic: 'contrast(1.08) saturate(0.95) sepia(0.12)',
      '3D toon': 'saturate(1.6) contrast(1.2) blur(1.2px)',
    };
    ctx.save();
    ctx.filter = filters[style] || 'none';
    const m = W * 0.06;
    ctx.beginPath(); ctx.roundRect(m, m, W - 2 * m, H - 2 * m, 28); ctx.clip();
    coverDraw(ctx, img, m, m, W - 2 * m, H - 2 * m);
    ctx.restore();
    ctx.globalCompositeOperation = 'soft-light';
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
  } else {
    drawFigure(ctx, W, H, r, style, hue, p);
  }

  // rim glow + vignette
  const v = ctx.createRadialGradient(W / 2, H * 0.45, H * 0.25, W / 2, H * 0.5, H * 0.75);
  v.addColorStop(0, 'transparent'); v.addColorStop(1, 'rgba(0,0,0,.55)');
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);

  if (style === 'Realistic') { // film grain
    const d = ctx.getImageData(0, 0, W, H);
    for (let i = 0; i < d.data.length; i += 4) { const n = (r() - 0.5) * 18; d.data[i] += n; d.data[i + 1] += n; d.data[i + 2] += n; }
    ctx.putImageData(d, 0, 0);
  }

  // initials badge
  ctx.font = `800 ${Math.round(W * 0.09)}px system-ui, sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,.88)';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(initials(name), W * 0.07, H - W * 0.07);
  ctx.font = `700 ${Math.round(W * 0.03)}px system-ui, sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,.5)';
  ctx.textAlign = 'right';
  ctx.fillText('DEMO PORTRAIT', W * 0.93, H - W * 0.075);
  return c.toDataURL('image/jpeg', 0.84);
}

function drawFigure(ctx, W, H, r, style, hue, p) {
  const full = style === 'Full body';
  const toon = style === '3D toon';
  const anime = style === 'Anime';
  const real = style === 'Realistic';
  const skin = SKIN[Math.floor(r() * SKIN.length)];
  const hairKey = Object.keys(HAIR).find((k) => p.includes(k + ' hair') || p.includes(k));
  const hair = hairKey ? HAIR[hairKey] : (anime ? `hsl(${Math.floor(r() * 360)} 80% 60%)` : ['#16141b', '#5b3a24', '#e7c46b', '#b8322f', '#d9dbe3'][Math.floor(r() * 5)]);
  const outfit = `hsl(${(hue + 180 + r() * 60) % 360} 55% ${toon ? 55 : 38}%)`;
  const silhouette = style === 'Portrait';

  const cx = W / 2;
  const headR = full ? W * 0.11 : W * (toon ? 0.23 : 0.19);
  const headY = full ? H * 0.22 : H * (toon ? 0.4 : 0.4);
  const fill = (col) => (silhouette ? '#0b0a10' : col);

  ctx.save();
  ctx.shadowColor = `hsla(${hue} 95% 70% / .9)`;
  ctx.shadowBlur = silhouette ? 28 : 10;

  // body
  ctx.fillStyle = fill(outfit);
  if (full) {
    const top = headY + headR * 1.1;
    ctx.beginPath(); ctx.roundRect(cx - W * 0.15, top, W * 0.3, H * 0.33, 30); ctx.fill();
    ctx.beginPath(); ctx.roundRect(cx - W * 0.24, top + 10, W * 0.08, H * 0.3, 20); ctx.roundRect(cx + W * 0.16, top + 10, W * 0.08, H * 0.3, 20); ctx.fill();
    ctx.fillStyle = fill(`hsl(${hue} 25% 22%)`);
    ctx.beginPath(); ctx.roundRect(cx - W * 0.13, top + H * 0.31, W * 0.11, H * 0.33, 18); ctx.roundRect(cx + W * 0.02, top + H * 0.31, W * 0.11, H * 0.33, 18); ctx.fill();
  } else {
    const sy = headY + headR * 1.25;
    ctx.beginPath();
    ctx.moveTo(cx - W * 0.42, H);
    ctx.bezierCurveTo(cx - W * 0.42, sy + H * 0.08, cx - W * 0.25, sy, cx, sy);
    ctx.bezierCurveTo(cx + W * 0.25, sy, cx + W * 0.42, sy + H * 0.08, cx + W * 0.42, H);
    ctx.fill();
    ctx.fillStyle = fill(skin);
    ctx.fillRect(cx - headR * 0.35, headY + headR * 0.6, headR * 0.7, headR * 0.75);
  }

  // hair back (long styles)
  const hairType = Math.floor(r() * 5); // 0 short 1 long 2 spiky 3 curly 4 bun
  ctx.fillStyle = fill(hair);
  if (hairType === 1) { ctx.beginPath(); ctx.ellipse(cx, headY + headR * 0.6, headR * 1.25, headR * 1.7, 0, 0, Math.PI * 2); ctx.fill(); }

  // head
  ctx.fillStyle = fill(skin);
  ctx.beginPath(); ctx.ellipse(cx, headY, headR * (anime ? 0.92 : 0.86), headR, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  // hair front
  ctx.fillStyle = fill(hair);
  ctx.beginPath();
  if (hairType === 2) {
    for (let i = -4; i <= 4; i++) {
      const x = cx + i * headR * 0.24;
      ctx.moveTo(x - headR * 0.2, headY - headR * 0.45);
      ctx.lineTo(x + (r() - 0.5) * headR * 0.3, headY - headR * (1.35 + r() * 0.4));
      ctx.lineTo(x + headR * 0.2, headY - headR * 0.45);
    }
    ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx, headY - headR * 0.5, headR * 0.95, headR * 0.55, 0, Math.PI, 0); ctx.fill();
  } else if (hairType === 3) {
    for (let a = Math.PI * 0.95; a <= Math.PI * 2.05; a += 0.28) {
      ctx.moveTo(cx + Math.cos(a) * headR, headY + Math.sin(a) * headR);
      ctx.arc(cx + Math.cos(a) * headR * 0.95, headY + Math.sin(a) * headR * 0.95, headR * 0.3, 0, Math.PI * 2);
    }
    ctx.fill();
  } else {
    ctx.ellipse(cx, headY - headR * 0.25, headR * 0.98, headR * 0.85, 0, Math.PI * 1.02, Math.PI * 1.98); ctx.fill();
    if (hairType === 4) { ctx.beginPath(); ctx.arc(cx, headY - headR * 1.15, headR * 0.38, 0, Math.PI * 2); ctx.fill(); }
  }

  if (silhouette) return;

  // face
  const ey = headY + headR * 0.08, ex = headR * 0.36;
  if (anime) {
    for (const s of [-1, 1]) {
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(cx + s * ex, ey, headR * 0.17, headR * 0.24, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = `hsl(${hue} 80% 45%)`; ctx.beginPath(); ctx.ellipse(cx + s * ex, ey + headR * 0.04, headR * 0.12, headR * 0.18, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx + s * ex - headR * 0.05, ey - headR * 0.05, headR * 0.05, 0, Math.PI * 2); ctx.fill();
    }
  } else {
    ctx.fillStyle = '#1b1720';
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(cx + s * ex, ey, headR * (toon ? 0.09 : 0.07), headR * (toon ? 0.12 : 0.05), 0, 0, Math.PI * 2); ctx.fill(); }
  }
  if (real) { ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx, ey + headR * 0.1); ctx.lineTo(cx - headR * 0.06, ey + headR * 0.32); ctx.lineTo(cx + headR * 0.04, ey + headR * 0.34); ctx.stroke(); }
  if (toon || anime) { ctx.fillStyle = 'rgba(255,110,130,.35)'; for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(cx + s * headR * 0.5, ey + headR * 0.28, headR * 0.14, headR * 0.08, 0, 0, Math.PI * 2); ctx.fill(); } }
  ctx.strokeStyle = 'rgba(60,20,30,.75)'; ctx.lineWidth = Math.max(2, headR * 0.04); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(cx, ey + headR * 0.38, headR * 0.16, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
  if (toon) { // glossy highlight
    const g = ctx.createRadialGradient(cx - headR * 0.35, headY - headR * 0.45, 0, cx - headR * 0.35, headY - headR * 0.45, headR * 0.6);
    g.addColorStop(0, 'rgba(255,255,255,.45)'); g.addColorStop(1, 'transparent');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, headY, headR, 0, Math.PI * 2); ctx.fill();
  }
}

// Shrink an uploaded image to fit in localStorage.
export function shrinkImage(file, max = 640) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const s = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src);
      resolve(c.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}
