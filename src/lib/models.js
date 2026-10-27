// Model catalogue (names are plain text only — no logos). Costs are demo reels
// per 5 seconds at 480p. Tune these to match your real provider pricing later.
export const MODELS = [
  { id: 'auto', name: "Director's pick", tag: 'Matched to your scene', blurb: 'The studio matches a camera to what you wrote.', base: 20, lens: 'AUTO' },
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
  characterLock: { label: 'Lock my lead', hint: 'Your character looks the same in every shot', cost: 5 },
  voiceLock: { label: 'Lock the voice', hint: 'Same voice across every scene', cost: 8 },
  coStar: { label: 'Cast a co-star', hint: 'Bring a second character into the shot', cost: 10 },
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
