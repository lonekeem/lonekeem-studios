// Model catalogue (names are plain text only — no logos). Costs are demo reels
// per 5 seconds at 480p. Tune these to match your real provider pricing later.
export const MODELS = [
  { id: 'auto', name: 'House lens', tag: 'Studio matches your scene', blurb: 'The studio reads your scene and chooses the lens for you.', base: 20, lens: 'AUTO' },
  { lens: '35mm', id: 'seedance', name: 'Seedance', tag: 'Strongest overall', blurb: 'Top motion quality and prompt following.', base: 32 },
  { lens: '50mm', id: 'grok-imagine', name: 'Grok Imagine', tag: 'Native audio', blurb: 'Generates sound together with the video.', base: 28 },
  { lens: '16mm', id: 'wan', name: 'Wan', tag: 'Fast & cheapest', blurb: 'Quick drafts for testing ideas.', base: 10 },
  { lens: '28mm', id: 'minimax', name: 'MiniMax', tag: 'Great value', blurb: 'Solid quality for the price.', base: 16 },
  { lens: '85mm', id: 'kling', name: 'Kling', tag: 'Best for action', blurb: 'Fights, chases and fast camera moves.', base: 26 },
  { lens: 'ANA', id: 'mood-fx', name: 'Mood FX', tag: 'Mood & effects', blurb: 'Stylised looks, lighting and VFX.', base: 18 },
];

export const LENGTHS = [
  { s: 5, locked: false },
  { s: 10, locked: false },
  { s: 15, locked: true },
  { s: 20, locked: true },
  { s: 25, locked: true },
];

export const QUALITIES = [
  { id: '480p', mult: 1, locked: false },
  { id: '720p', mult: 1.6, locked: true },
  { id: '1080p', mult: 2.5, locked: true },
];

export const ADDONS = {
  characterLock: { label: 'Lead continuity', hint: 'Your lead keeps the same face and wardrobe from shot to shot', cost: 5 },
  voiceLock: { label: 'Voice continuity', hint: 'Your lead sounds the same in every scene', cost: 8 },
  coStar: { label: 'Second billing', hint: 'Write a co-star into the shot', cost: 10 },
};

export function creditCost({ model, length, quality, characterLock, voiceLock, coStar }) {
  const m = MODELS.find((x) => x.id === model) || MODELS[0];
  const q = QUALITIES.find((x) => x.id === quality) || QUALITIES[0];
  let cost = m.base * (length / 5) * q.mult;
  if (characterLock) cost += ADDONS.characterLock.cost;
  if (voiceLock) cost += ADDONS.voiceLock.cost;
  if (coStar) cost += ADDONS.coStar.cost;
  return Math.round(cost);
}

// Lens cards for the hosted API's models (signed-in users). Prices come from /api/models.
export const SERVER_LENS = {
  fast: { lens: '16mm', name: 'Quick Take', tag: 'Fastest, lowest cost', blurb: 'Rapid drafts. Good for blocking out an idea.' },
  seedance: { lens: '35mm', name: 'Seedance', tag: 'Strong all-rounder', blurb: 'Clean motion that follows the scene closely.' },
  seedance2: { lens: '50mm', name: 'Seedance 2', tag: 'Premium look', blurb: 'Richer detail for hero shots.' },
  wan: { lens: '28mm', name: 'Wan 2.5', tag: 'Detailed scenes', blurb: 'Busy, detailed set pieces.' },
  hailuo: { lens: '85mm', name: 'Hailuo', tag: 'Sharper 768p', blurb: 'Higher-resolution frames, 6s or 10s takes.' },
  kling: { lens: 'ANA', name: 'Kling', tag: 'Action & stunts', blurb: 'Chases, fights and big camera moves.' },
};
