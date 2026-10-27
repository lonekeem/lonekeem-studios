// ─────────────────────────────────────────────────────────────────────────────
// The ONE place video generation happens. Everything in the UI calls
// generateClip(); swap the implementation to go from demo → real.
//
//   generateClip({ prompt, model, length, quality, character, options, onProgress })
//     → Promise<{ id, url, prompt, model, length, quality, createdAt, demo }>
//
// Signed in (params.server = true): the take runs on the hosted API
//   (POST /api/generate → poll /api/status). The server deducts reels, applies
//   the daily limit, and decides demo vs real (real only for owner accounts).
//
// Signed out, modes (set at build time via VITE_GEN_MODE):
//   demo (default) – fakes a few seconds of "rendering" and returns a bundled
//                    sample clip. No network, no keys, no cost.
//   real           – POSTs to your serverless backend (VITE_API_BASE), which
//                    holds the provider key (fal.ai / xAI) and returns a job.
// ─────────────────────────────────────────────────────────────────────────────

import { api, absUrl } from './supabase.js';

const BASE = import.meta.env.BASE_URL;
const MODE = import.meta.env.VITE_GEN_MODE || 'demo';
const API = import.meta.env.VITE_API_BASE || '';

export const SAMPLE_CLIPS = [
  'neon-city', 'ocean-drift', 'deep-zoom', 'life-grid',
  'sunset-run', 'storm-lab', 'dream-haze', 'glitch-hero',
].map((n) => `${BASE}clips/${n}.mp4`);

export const IS_DEMO = MODE !== 'real';

function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const STAGES = ['Reading your prompt', 'Placing your character', 'Rendering frames', 'Adding motion', 'Finishing up'];

async function demoGenerate({ prompt, model, length, quality, onProgress, signal }) {
  const total = 2600 + Math.random() * 1800; // ~3–4.5s fake wait
  const start = performance.now();
  await new Promise((resolve, reject) => {
    const tick = () => {
      if (signal?.aborted) return reject(new DOMException('Cancelled', 'AbortError'));
      const p = Math.min(1, (performance.now() - start) / total);
      onProgress?.({ progress: p, stage: STAGES[Math.min(STAGES.length - 1, Math.floor(p * STAGES.length))] });
      if (p >= 1) resolve();
      else setTimeout(tick, 80);
    };
    tick();
  });
  const url = SAMPLE_CLIPS[hash(prompt + model) % SAMPLE_CLIPS.length];
  return { url, demo: true };
}

async function realGenerate({ prompt, model, length, quality, character, options, onProgress, signal }) {
  // 1) start a job on YOUR backend (the provider key never reaches the browser)
  const res = await fetch(`${API}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, model, length, quality, character, options }),
    signal,
  });
  if (!res.ok) throw new Error(`Generation failed (${res.status})`);
  const { jobId } = await res.json();
  // 2) poll until done
  for (;;) {
    await new Promise((r) => setTimeout(r, 2500));
    const s = await fetch(`${API}/api/status?id=${encodeURIComponent(jobId)}`, { signal }).then((r) => r.json());
    onProgress?.({ progress: s.progress ?? 0.5, stage: s.stage || 'Rendering' });
    if (s.status === 'done') return { url: s.url, demo: false };
    if (s.status === 'error') throw new Error(s.error || 'Generation failed');
  }
}

const SERVER_STAGES = { queued: 'In the queue', running: 'Rendering frames', done: 'Finishing up' };

// Hosted API: start the take, then poll until it's in the can.
async function serverGenerate({ prompt, model, length, onProgress, onStarted, signal }) {
  const start = await api('/api/generate', { method: 'POST', body: { prompt, model, length, aspect_ratio: '9:16' }, signal });
  onStarted?.(start);
  const id = start.clip.id;
  const t0 = Date.now();
  const expected = start.mode === 'real' ? 90000 : 9000;
  onProgress?.({ progress: 0.05, stage: SERVER_STAGES.queued });
  for (;;) {
    await new Promise((r, j) => {
      const t = setTimeout(r, 3000);
      signal?.addEventListener('abort', () => { clearTimeout(t); j(new DOMException('Cancelled', 'AbortError')); }, { once: true });
    });
    const s = await api(`/api/status?id=${encodeURIComponent(id)}`, { signal });
    const c = s.clip;
    if (c.status === 'done') return { url: absUrl(c.video_url), demo: !!c.demo || s.mode === 'demo', serverId: c.id, model: c.model, length: c.length };
    if (c.status === 'failed') throw Object.assign(new Error(c.refunded ? 'That take failed. Reels refunded.' : 'That take failed.'), { refunded: !!c.refunded });
    const guess = Math.min(0.95, 0.05 + (Date.now() - t0) / expected);
    onProgress?.({ progress: guess, stage: SERVER_STAGES[c.status] || 'Rendering frames' });
  }
}

export async function generateClip(params) {
  const out = await (params.server ? serverGenerate(params) : IS_DEMO ? demoGenerate(params) : realGenerate(params));
  return {
    id: 'clip_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    url: out.url,
    prompt: params.prompt,
    model: params.model,
    length: params.length,
    quality: params.quality,
    characterName: params.character?.name || '',
    createdAt: Date.now(),
    demo: out.demo,
    ...(out.serverId ? { serverId: out.serverId } : {}),
  };
}
