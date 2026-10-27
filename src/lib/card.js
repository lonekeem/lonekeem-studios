// Shareable character card, drawn on a canvas (1080×1350, 4:5).
const W = 1080, H = 1350;

const loadImg = (src) => new Promise((res) => {
  if (!src) return res(null);
  const im = new Image();
  im.onload = () => res(im);
  im.onerror = () => res(null);
  im.src = src;
});

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrap(ctx, text, maxW, maxLines) {
  const words = (text || '').replace(/\s+/g, ' ').trim().split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    const t = line ? line + ' ' + w : w;
    if (ctx.measureText(t).width > maxW && line) {
      lines.push(line); line = w;
      if (lines.length === maxLines) break;
    } else line = t;
  }
  if (lines.length < maxLines && line) lines.push(line);
  if (lines.length === maxLines && words.join(' ').length > lines.join(' ').length) {
    let last = lines[maxLines - 1];
    while (ctx.measureText(last + '…').width > maxW && last.length) last = last.slice(0, -1);
    lines[maxLines - 1] = last.trimEnd() + '…';
  }
  return lines;
}

function monogram(ctx, x, y, s) {
  const g = ctx.createLinearGradient(x, y, x + s, y + s);
  g.addColorStop(0, '#d946ef'); g.addColorStop(1, '#7c3aed');
  ctx.fillStyle = g; rr(ctx, x, y, s, s, s * 0.28); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = `800 ${s * 0.36}px system-ui, -apple-system, Segoe UI, sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('LKS', x + s / 2, y + s / 2 + 2);
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
}

export async function drawCard(ch) {
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  const F = 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif';

  // background
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#1a1030'); bg.addColorStop(1, '#0f0a1a');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  for (const [x, y, r, c] of [[880, 180, 520, 'rgba(217,70,239,.35)'], [140, 1100, 560, 'rgba(139,92,246,.4)']]) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, c); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }

  // header
  monogram(ctx, 64, 60, 76);
  ctx.fillStyle = '#f5f0ff'; ctx.font = `700 34px ${F}`;
  ctx.fillText('Lone Keem Studios', 160, 108);
  ctx.fillStyle = '#c4b5fd'; ctx.font = `600 24px ${F}`;
  ctx.textAlign = 'right'; ctx.fillText('CHARACTER CARD', W - 64, 106); ctx.textAlign = 'left';

  // portrait
  const px = 64, py = 172, pw = W - 128, ph = 640;
  ctx.save();
  ctx.shadowColor = 'rgba(168,85,247,.55)'; ctx.shadowBlur = 60;
  rr(ctx, px, py, pw, ph, 44); ctx.fillStyle = '#21173a'; ctx.fill();
  ctx.restore();
  ctx.save(); rr(ctx, px, py, pw, ph, 44); ctx.clip();
  const img = await loadImg(ch.avatar);
  if (img) {
    const s = Math.max(pw / img.width, ph / img.height);
    const iw = img.width * s, ih = img.height * s;
    ctx.drawImage(img, px + (pw - iw) / 2, py + (ph - ih) * 0.3, iw, ih);
  } else {
    const g = ctx.createLinearGradient(px, py, px + pw, py + ph);
    g.addColorStop(0, '#d946ef'); g.addColorStop(1, '#4c1d95');
    ctx.fillStyle = g; ctx.fillRect(px, py, pw, ph);
    ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.font = `800 260px ${F}`; ctx.textAlign = 'center';
    ctx.fillText((ch.name || '?').trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase(), W / 2, py + ph / 2 + 90);
    ctx.textAlign = 'left';
  }
  const fade = ctx.createLinearGradient(0, py + ph * 0.55, 0, py + ph);
  fade.addColorStop(0, 'rgba(15,10,26,0)'); fade.addColorStop(1, 'rgba(15,10,26,.85)');
  ctx.fillStyle = fade; ctx.fillRect(px, py, pw, ph);
  ctx.restore();
  ctx.strokeStyle = 'rgba(196,181,253,.35)'; ctx.lineWidth = 2; rr(ctx, px, py, pw, ph, 44); ctx.stroke();

  // name + handle (over the bottom of the portrait)
  ctx.fillStyle = '#fff'; ctx.font = `800 76px ${F}`;
  let name = ch.name || 'Unnamed';
  while (ctx.measureText(name).width > pw - 80 && name.length > 3) name = name.slice(0, -2) + '…';
  ctx.fillText(name, px + 40, py + ph - 78);
  ctx.fillStyle = '#c4b5fd'; ctx.font = `600 36px ${F}`;
  ctx.fillText('@' + (ch.handle || 'yourname'), px + 40, py + ph - 30);

  // traits
  let tx = 64; const ty = 860;
  ctx.font = `700 30px ${F}`;
  for (const t of (ch.traits || []).slice(0, 3)) {
    const w = ctx.measureText(t).width + 56;
    const g = ctx.createLinearGradient(tx, ty, tx + w, ty);
    g.addColorStop(0, 'rgba(217,70,239,.35)'); g.addColorStop(1, 'rgba(139,92,246,.35)');
    ctx.fillStyle = g; rr(ctx, tx, ty, w, 62, 31); ctx.fill();
    ctx.strokeStyle = 'rgba(196,181,253,.45)'; ctx.stroke();
    ctx.fillStyle = '#f5f0ff'; ctx.fillText(t, tx + 28, ty + 42);
    tx += w + 16;
  }

  // bio
  ctx.fillStyle = '#e9e2ff'; ctx.font = `400 38px ${F}`;
  const bio = ch.bio || ch.lore?.identity || ch.lore?.origin || 'A brand-new character, ready for their first series.';
  wrap(ctx, bio, W - 128, 3).forEach((l, i) => ctx.fillText(l, 64, 990 + i * 52));

  // footer
  ctx.strokeStyle = 'rgba(196,181,253,.2)'; ctx.beginPath(); ctx.moveTo(64, 1196); ctx.lineTo(W - 64, 1196); ctx.stroke();
  const g = ctx.createLinearGradient(64, 0, 600, 0);
  g.addColorStop(0, '#e879f9'); g.addColorStop(1, '#a78bfa');
  ctx.fillStyle = g; ctx.font = `800 40px ${F}`;
  ctx.fillText('Your character. Your series.', 64, 1268);
  ctx.fillStyle = '#b3a6d4'; ctx.font = `500 26px ${F}`;
  ctx.textAlign = 'right'; ctx.fillText(ch.voice?.style ? `${ch.voice.style} voice` : '', W - 64, 1266); ctx.textAlign = 'left';
  return cv;
}

export const cardBlob = (cv) => new Promise((res) => cv.toBlob(res, 'image/png'));
