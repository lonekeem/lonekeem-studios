import { SEED_SERIES } from './seed.js';

// One shape for every series — yours and the demo creators' — so the
// series page, "Continue watching" and recaps don't care where it came from.
export function buildCatalog(state) {
  const clip = (id) => state.clips.find((c) => c.id === id);
  const mine = state.series.map((s) => {
    const eps = state.episodes.filter((e) => e.seriesId === s.id);
    return {
      key: s.id, mine: true, title: s.title, blurb: s.desc || '', handle: state.character.handle || 'you',
      collab: state.character.collabs || 'request', likes: 0,
      episodes: eps.map((e, i) => ({
        id: e.id, n: i + 1, title: e.title, published: !!e.published,
        prompt: e.scenes?.length ? e.scenes.map((x) => x.prompt).join('. ') : e.clipIds.map((id) => clip(id)?.prompt).filter(Boolean).join('. '),
        clips: e.clipIds.map((id) => clip(id)?.url).filter(Boolean),
        remixOf: e.clipIds.map((id) => clip(id)?.remixOf).find(Boolean) || null,
      })),
    };
  });
  const seeds = SEED_SERIES.filter((s) => !state.blocked.includes(s.handle)).map((s) => ({
    key: 's:' + s.slug, mine: false, title: s.title, blurb: s.blurb, handle: s.handle, collab: s.collab, likes: s.likes,
    episodes: s.episodes.map((e, i) => ({ ...e, n: i + 1, published: true })),
  }));
  return [...mine, ...seeds];
}

export const findSeries = (state, key) => buildCatalog(state).find((s) => s.key === key);

const sentence = (txt, max = 96) => {
  const t = (txt || '').split(/(?<=[.!?])\s/)[0].trim();
  return t.length > max ? t.slice(0, max - 1).trimEnd() + '…' : t;
};

// "Previously on…" — stitched from earlier episode titles and prompts. No AI.
export function buildRecap(series, idx) {
  if (!series || idx < 1) return null;
  const prior = series.episodes.slice(Math.max(0, idx - 3), idx);
  const lines = prior.map((e) => ({ n: e.n, title: e.title, line: sentence(e.prompt) || 'Things got complicated.' }));
  const last = prior[prior.length - 1];
  const hook = last?.prompt
    ? `Last time: ${sentence(last.prompt, 80).replace(/^./, (m) => m.toLowerCase()).replace(/[.…]?$/, '…')}`
    : 'Last time, things got complicated…';
  return { title: series.title, next: series.episodes[idx], lines, hook, skipped: Math.max(0, idx - 3) };
}

// Continue watching: half-watched episodes first, then the next episode of
// series you finished an episode of (or follow), newest activity first.
export function continueWatching(state, catalog = buildCatalog(state)) {
  const out = [];
  for (const s of catalog) {
    const eps = s.episodes.filter((e) => e.published !== false || s.mine).filter((e) => e.clips.length);
    let lastT = 0; let entry = null;
    eps.forEach((e, i) => {
      const pr = state.progress?.[e.id];
      if (!pr) return;
      if (pr.t > lastT) {
        lastT = pr.t;
        if (pr.p < 0.95) entry = { series: s, ep: e, idx: s.episodes.indexOf(e), p: Math.max(pr.p, 0.04), kind: 'resume', t: pr.t };
        else if (eps[i + 1]) entry = { series: s, ep: eps[i + 1], idx: s.episodes.indexOf(eps[i + 1]), p: state.progress?.[eps[i + 1].id]?.p || 0, kind: 'next', t: pr.t };
        else entry = null;
      }
    });
    if (!entry && state.follows?.[s.key]) {
      const unwatched = eps.find((e) => (state.progress?.[e.id]?.p || 0) < 0.95);
      if (unwatched) entry = { series: s, ep: unwatched, idx: s.episodes.indexOf(unwatched), p: state.progress?.[unwatched.id]?.p || 0, kind: 'follow', t: 0 };
    }
    if (entry) out.push(entry);
  }
  return out.sort((a, b) => b.t - a.t).slice(0, 12);
}
