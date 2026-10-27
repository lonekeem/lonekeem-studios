import { SAMPLE_CLIPS } from './generateClip.js';

const c = (i) => SAMPLE_CLIPS[i % SAMPLE_CLIPS.length];

// Demo feed content from made-up creators. All clips are placeholder videos
// generated for this project (see README → "Sample media").
export const SEED_EPISODES = [
  { id: 'seed1', series: 'Night Shift Couriers', ep: 1, title: 'The package that hums', handle: 'nova.rides', likes: 1240, clips: [c(0), c(6)] },
  { id: 'seed2', series: 'Tidebound', ep: 3, title: 'Under the glass reef', handle: 'mareline', likes: 865, clips: [c(1)] },
  { id: 'seed3', series: 'Infinite Stairwell', ep: 2, title: 'Floor ∞ + 1', handle: 'loopkid', likes: 2310, clips: [c(2), c(4)] },
  { id: 'seed4', series: 'Pixel Garden', ep: 1, title: 'Seeds that blink', handle: 'tinygrower', likes: 412, clips: [c(3)] },
  { id: 'seed5', series: 'Last Light Run', ep: 5, title: 'Outrunning the sunset', handle: 'dashwick', likes: 3088, clips: [c(4), c(0)] },
  { id: 'seed6', series: 'Static Lab', ep: 1, title: 'Experiment 110', handle: 'drvolt', likes: 590, clips: [c(5)] },
  { id: 'seed7', series: 'Soft Orbit', ep: 4, title: 'Sleepwalking on Saturn', handle: 'hazey', likes: 1770, clips: [c(6), c(1)] },
  { id: 'seed8', series: 'Channel Zero', ep: 2, title: 'The hero who glitched', handle: 'zeroframe', likes: 958, clips: [c(7)] },
];
