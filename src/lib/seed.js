import { SAMPLE_CLIPS } from './generateClip.js';

const c = (i) => SAMPLE_CLIPS[i % SAMPLE_CLIPS.length];

// Demo series from made-up creators. All clips are placeholder videos
// generated for this project (see README → "Sample media").
// collab = that creator's remix setting: allow | request | private.
export const SEED_SERIES = [
  {
    slug: 'night-shift', title: 'Night Shift Couriers', handle: 'nova.rides', collab: 'allow', likes: 1240,
    blurb: 'A courier crew that only delivers after midnight — and never asks what is in the box.',
    episodes: [
      { title: 'First run', prompt: 'A rookie courier straps a glowing parcel to a hoverbike and races through a neon city at midnight', clips: [c(0)] },
      { title: 'The package that hums', prompt: 'The parcel starts humming a lullaby while the courier dodges drones under rainy billboards', clips: [c(0), c(6)] },
    ],
  },
  {
    slug: 'tidebound', title: 'Tidebound', handle: 'mareline', collab: 'request', likes: 865,
    blurb: 'A diver searches the drowned coast for the lighthouse that sank with her family name.',
    episodes: [
      { title: 'Low tide', prompt: 'A diver walks into a calm ocean at dawn holding an old brass key', clips: [c(1)] },
      { title: 'The lantern fish', prompt: 'A school of glowing fish leads the diver past a sunken tram line', clips: [c(2)] },
      { title: 'Under the glass reef', prompt: 'The diver finds a glass reef with a door carved into it, light pulsing from inside', clips: [c(1)] },
    ],
  },
  {
    slug: 'stairwell', title: 'Infinite Stairwell', handle: 'loopkid', collab: 'allow', likes: 2310,
    blurb: 'Every floor is the same floor. Almost.',
    episodes: [
      { title: 'Floor ∞', prompt: 'A kid in a yellow hoodie climbs a spiral stairwell that never ends, the same exit sign on every floor', clips: [c(2)] },
      { title: 'Floor ∞ + 1', prompt: 'One floor is different: the walls breathe and the stairs start going sideways', clips: [c(2), c(4)] },
    ],
  },
  {
    slug: 'pixel-garden', title: 'Pixel Garden', handle: 'tinygrower', collab: 'allow', likes: 412,
    blurb: 'A tiny gardener grows plants that blink like old monitors.',
    episodes: [
      { title: 'Seeds that blink', prompt: 'A tiny gardener plants a seed that sprouts a blinking pixel flower', clips: [c(3)] },
    ],
  },
  {
    slug: 'last-light', title: 'Last Light Run', handle: 'dashwick', collab: 'private', likes: 3088,
    blurb: 'A runner who can only move while the sun is up — and the sun is setting.',
    episodes: [
      { title: 'Golden hour', prompt: 'A runner sprints across rooftops chasing the last strip of sunlight', clips: [c(4)] },
      { title: 'The shadow line', prompt: 'Shadows crawl up the street behind the runner, swallowing parked cars', clips: [c(5)] },
      { title: 'Outrunning the sunset', prompt: 'The runner leaps off a pier toward the horizon as the sun touches the sea', clips: [c(4), c(0)] },
    ],
  },
  {
    slug: 'static-lab', title: 'Static Lab', handle: 'drvolt', collab: 'request', likes: 590,
    blurb: 'A scientist with too many lightning bolts and not enough safety goggles.',
    episodes: [
      { title: 'Experiment 110', prompt: 'A scientist flips a giant switch and the whole lab fills with dancing lightning', clips: [c(5)] },
    ],
  },
  {
    slug: 'soft-orbit', title: 'Soft Orbit', handle: 'hazey', collab: 'allow', likes: 1770,
    blurb: 'Bedtime stories set in space, narrated by someone half asleep.',
    episodes: [
      { title: 'Pillow moon', prompt: 'A sleepy astronaut floats past a moon shaped like a pillow, stars drifting like dust', clips: [c(6)] },
      { title: 'The quiet comet', prompt: 'A comet slows down to keep the astronaut company, its tail glowing soft pink', clips: [c(1)] },
      { title: 'Sleepwalking on Saturn', prompt: 'The astronaut sleepwalks along Saturn’s rings in slow motion', clips: [c(6), c(1)] },
    ],
  },
  {
    slug: 'channel-zero', title: 'Channel Zero', handle: 'zeroframe', collab: 'private', likes: 958,
    blurb: 'A superhero who lives inside a broken TV signal.',
    episodes: [
      { title: 'Signal lost', prompt: 'A caped hero flickers into existence inside an old TV test pattern', clips: [c(7)] },
      { title: 'The hero who glitched', prompt: 'The hero tries to save the day but keeps glitching three seconds into the past', clips: [c(7)] },
    ],
  },
].map((s) => ({ ...s, episodes: s.episodes.map((e, i) => ({ ...e, id: `${s.slug}-${i + 1}` })) }));

// Feed shows each seed series' latest episode.
export const SEED_EPISODES = SEED_SERIES.map((s) => {
  const e = s.episodes[s.episodes.length - 1];
  return { id: e.id, series: s.title, seriesKey: 's:' + s.slug, ep: s.episodes.length, title: e.title, prompt: e.prompt, handle: s.handle, likes: s.likes, clips: e.clips, collab: s.collab };
});

export const SEED_HANDLES = SEED_SERIES.map((s) => s.handle);
