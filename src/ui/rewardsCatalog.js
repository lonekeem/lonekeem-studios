// Unlockable cosmetic catalog for After the Quiet.
// Original cartoon looks, no brand logos. Cosmetics apply to the multiplayer character and weapons only — never Story Keem.
export const KINDS = [
  { id: 'skin', label: 'Skins' },
  { id: 'finish', label: 'Weapons' },
  { id: 'title', label: 'Titles' },
  { id: 'badge', label: 'Badges' },
];

const kills = (n) => ({ test: s => (s.kills || 0) >= n, progress: s => ({ have: s.kills || 0, need: n, label: n + ' career kills' }) });
const hs = (n) => ({ test: s => (s.headshots || 0) >= n, progress: s => ({ have: s.headshots || 0, need: n, label: n + ' career headshots' }) });
const wave = (n) => ({ test: s => (s.bestWave || 0) >= n, progress: s => ({ have: s.bestWave || 0, need: n, label: 'Reach wave ' + n + ' in Survival' }) });
const dailies = (n) => ({ test: s => (s.dailiesDone || 0) >= n, progress: s => ({ have: s.dailiesDone || 0, need: n, label: 'Complete ' + n + ' daily challenge' + (n === 1 ? '' : 's') }) });
const days = (n) => ({ test: s => (s.dailiesDays || 0) >= n, progress: s => ({ have: s.dailiesDays || 0, need: n, label: 'Finish all 3 dailies on ' + n + ' day' + (n === 1 ? '' : 's') }) });
const streak = (n) => ({ test: s => (s.dailyStreak || 0) >= n, progress: s => ({ have: s.dailyStreak || 0, need: n, label: n + '-day daily streak' }) });
const rank = (n) => ({ test: s => s.bestRank && s.bestRank <= n, progress: s => ({ have: s.bestRank ? 'Best #' + s.bestRank : 0, need: 'Top ' + n, label: 'Reach top ' + n + ' on the leaderboard' }) });

export const CATALOG = [
  // ---- skins (recolor the multiplayer outfit you already wear) ----
  { id: 'skin_riverside', kind: 'skin', name: 'Riverside Green', blurb: 'Deep forest greens from the Maine woods.', swatch: ['#2f6b45', '#1a3a28', '#7fd49a'],
    colors: { top: '#2f6b45', top2: '#1e4a32', jacket: '#1a3a28', jacket2: '#0e2418', pants: '#2a3028', shoes: '#1a1814', sole: '#0e0c0a' },
    ...dailies(1) },
  { id: 'skin_ember', kind: 'skin', name: 'Ember Coat', blurb: 'Warm rust and charcoal, like a porch light in the dark.', swatch: ['#8a2a14', '#3a1a12', '#e8743b'],
    colors: { top: '#3a1a12', top2: '#5a2418', jacket: '#8a2a14', jacket2: '#5a1c10', pants: '#2a1c18', shoes: '#1a100c', sole: '#100804' },
    ...kills(25) },
  { id: 'skin_midnight', kind: 'skin', name: 'Midnight Runner', blurb: 'Quiet night blues for slipping through town.', swatch: ['#1c2233', '#12141c', '#4aa3c7'],
    colors: { top: '#12141c', top2: '#1a1e2a', jacket: '#1c2233', jacket2: '#141822', pants: '#0e1016', shoes: '#08080c', sole: '#4aa3c7' },
    ...wave(5) },
  { id: 'skin_frost', kind: 'skin', name: 'Frost Line', blurb: 'Pale winter layers against dark denim.', swatch: ['#d8e4ee', '#8aa8c0', '#cfe6f4'],
    colors: { top: '#d8e4ee', top2: '#c4d4e2', jacket: '#8aa8c0', jacket2: '#6a889e', pants: '#3a4a58', shoes: '#e8eef2', sole: '#8aa8c0' },
    ...hs(50) },
  { id: 'skin_gold', kind: 'skin', name: 'Quiet Gold', blurb: 'Soft gold trim on dark cloth — earned, not bought.', swatch: ['#c9a227', '#2a2414', '#ffd77a'],
    colors: { top: '#2a2414', top2: '#3a3018', jacket: '#c9a227', jacket2: '#a4841c', pants: '#1a1810', shoes: '#3a3018', sole: '#c9a227' },
    ...dailies(7) },
  { id: 'skin_crimson', kind: 'skin', name: 'Crimson Watch', blurb: 'Deep reds for a long night on the wall.', swatch: ['#8a1a22', '#3a1014', '#e05060'],
    colors: { top: '#3a1014', top2: '#5a181c', jacket: '#8a1a22', jacket2: '#5a1016', pants: '#1c1012', shoes: '#14080a', sole: '#8a1a22' },
    ...wave(10) },
  { id: 'skin_forest', kind: 'skin', name: 'Forest Scout', blurb: 'Moss and bark tones, built for the tree line.', swatch: ['#3a4a28', '#2a3a1c', '#8fbc4a'],
    colors: { top: '#3a4a28', top2: '#2e3c20', jacket: '#2a3a1c', jacket2: '#1c2a14', pants: '#4a5a32', shoes: '#2a2014', sole: '#1a140c' },
    ...streak(3) },
  { id: 'skin_ivory', kind: 'skin', name: 'Ivory Street', blurb: 'Clean cream layers over charcoal pants.', swatch: ['#efe6d4', '#d4c4a8', '#3a3a38'],
    colors: { top: '#efe6d4', top2: '#e4d8c4', jacket: '#d4c4a8', jacket2: '#c0b090', pants: '#3a3a38', shoes: '#efe8dc', sole: '#2a2a28' },
    ...kills(200) },
  { id: 'skin_solar', kind: 'skin', name: 'Solar Flare', blurb: 'Bright amber against dark earth tones.', swatch: ['#e09020', '#3a2a10', '#ffcc44'],
    colors: { top: '#3a2a10', top2: '#5a3c14', jacket: '#e09020', jacket2: '#c07018', pants: '#2a2418', shoes: '#1a140c', sole: '#e09020' },
    ...hs(100) },
  { id: 'skin_champion', kind: 'skin', name: 'Champion Stripe', blurb: 'Gold and night-green for a top-ten run.', swatch: ['#d4aa2a', '#14201c', '#ffe08a'],
    colors: { top: '#14201c', top2: '#1c2c24', jacket: '#d4aa2a', jacket2: '#b88c1e', pants: '#1a1c22', shoes: '#111114', sole: '#d4aa2a' },
    ...rank(10) },
  { id: 'skin_legend', kind: 'skin', name: 'Quiet Legend', blurb: 'Black, crimson and gold — reserved for first place.', swatch: ['#0e0e12', '#7a1f1f', '#c9a227'],
    colors: { top: '#0e0e12', top2: '#1a1a20', jacket: '#7a1f1f', jacket2: '#4a1010', pants: '#121214', shoes: '#c9a227', sole: '#7a1f1f' },
    ...rank(1) },

  // ---- weapon finishes (Survival + Online weapons only) ----
  { id: 'wf_stock', kind: 'finish', name: 'Stock', blurb: 'The factory look. Always yours.', swatch: ['#2c2f33', '#6b4527', '#a9aeb3'],
    paint: { mix: 0 }, test: () => true, progress: () => ({ have: 1, need: 1, label: 'Unlocked from the start' }) },
  { id: 'wf_olive', kind: 'finish', name: 'Olive Drab', blurb: 'Worn field green over steel and wood.', swatch: ['#4b5236', '#2a2e1c', '#6a7048'],
    paint: { color: '#4b5236', mix: .72, metalness: .35, roughness: .55 }, ...kills(15) },
  { id: 'wf_blued', kind: 'finish', name: 'Blued Steel', blurb: 'Cold blue-black metal, tighter and cleaner.', swatch: ['#2a3a4a', '#1a2834', '#6a8aa0'],
    paint: { color: '#2a3a4a', mix: .8, metalness: .75, roughness: .3 }, ...hs(10) },
  { id: 'wf_copper', kind: 'finish', name: 'Copper', blurb: 'Warm copper sheen on grips and receivers.', swatch: ['#b8733a', '#8a4e22', '#e0a060'],
    paint: { color: '#b8733a', mix: .78, metalness: .7, roughness: .35 }, ...kills(50) },
  { id: 'wf_gold', kind: 'finish', name: 'Gold Plate', blurb: 'Soft gold plating — showy, still deadly.', swatch: ['#d9b44a', '#a4841c', '#ffe08a'],
    paint: { color: '#d9b44a', mix: .82, metalness: .85, roughness: .28, emissive: '#3a2e08' }, ...wave(8) },
  { id: 'wf_whiteout', kind: 'finish', name: 'Whiteout', blurb: 'Pale winter coating with a matte edge.', swatch: ['#e8e6e0', '#c8c4bc', '#f4f2ec'],
    paint: { color: '#e8e6e0', mix: .8, metalness: .2, roughness: .45 }, ...streak(5) },
  { id: 'wf_ember', kind: 'finish', name: 'Ember Edge', blurb: 'Heat-stained metal with a faint glow.', swatch: ['#8a2a14', '#3a1008', '#e05020'],
    paint: { color: '#8a2a14', mix: .78, metalness: .55, roughness: .4, emissive: '#3a1008' }, ...kills(150) },
  { id: 'wf_night', kind: 'finish', name: 'Night Oil', blurb: 'Near-black oil finish for a top-25 run.', swatch: ['#141418', '#0a0a0c', '#3a3a44'],
    paint: { color: '#141418', mix: .85, metalness: .6, roughness: .4 }, ...rank(25) },

  // ---- titles (shown on your lobby profile) ----
  { id: 'title_survivor', kind: 'title', name: 'Survivor', blurb: 'You made it this far.', icon: '', test: () => true, progress: () => ({ have: 1, need: 1, label: 'Unlocked from the start' }) },
  { id: 'title_daily', kind: 'title', name: 'Daily Grinder', blurb: 'Cleared a full set of daily challenges.', icon: '', ...days(1) },
  { id: 'title_streak3', kind: 'title', name: 'On a Roll', blurb: 'Three days in a row.', icon: '', ...streak(3) },
  { id: 'title_streak7', kind: 'title', name: 'Week Warrior', blurb: 'A whole week of dailies, no skip.', icon: '', ...streak(7) },
  { id: 'title_wave5', kind: 'title', name: 'Wave Rider', blurb: 'Held the line through wave 5.', icon: '', ...wave(5) },
  { id: 'title_wave10', kind: 'title', name: 'Horde Breaker', blurb: 'Ten waves and still standing.', icon: '', ...wave(10) },
  { id: 'title_wave15', kind: 'title', name: 'Last Stand', blurb: 'Fifteen waves. Most don\'t get here.', icon: '', ...wave(15) },
  { id: 'title_kills50', kind: 'title', name: 'Slayer', blurb: 'Fifty down.', icon: '', ...kills(50) },
  { id: 'title_kills200', kind: 'title', name: 'Exterminator', blurb: 'Two hundred career takedowns.', icon: '', ...kills(200) },
  { id: 'title_hs25', kind: 'title', name: 'Sharpshooter', blurb: 'Twenty-five clean headshots.', icon: '', ...hs(25) },
  { id: 'title_hs100', kind: 'title', name: 'Deadeye', blurb: 'A hundred headshots, counted.', icon: '', ...hs(100) },
  { id: 'title_top10', kind: 'title', name: 'Top Ten', blurb: 'Cracked the worldwide top ten.', icon: '', ...rank(10) },
  { id: 'title_top3', kind: 'title', name: 'Podium', blurb: 'Best rank: third or better.', icon: '', ...rank(3) },
  { id: 'title_first', kind: 'title', name: 'The Quiet', blurb: 'Number one on the board.', icon: '', ...rank(1) },

  // ---- badges (small mark next to your name) ----
  { id: 'badge_star', kind: 'badge', name: 'Rising Star', blurb: 'Your first daily challenge.', icon: '✦', ...dailies(1) },
  { id: 'badge_flame', kind: 'badge', name: 'Streak Flame', blurb: 'A three-day daily streak.', icon: '🔥', ...streak(3) },
  { id: 'badge_skull', kind: 'badge', name: 'Skull', blurb: 'One hundred career kills.', icon: '☠', ...kills(100) },
  { id: 'badge_target', kind: 'badge', name: 'Bullseye', blurb: 'Fifty career headshots.', icon: '◎', ...hs(50) },
  { id: 'badge_wave', kind: 'badge', name: 'Tide', blurb: 'Survived to wave 10.', icon: '〰', ...wave(10) },
  { id: 'badge_crown', kind: 'badge', name: 'Crown', blurb: 'A top-ten leaderboard rank.', icon: '♛', ...rank(10) },
];

export const BY_ID = Object.fromEntries(CATALOG.map(x => [x.id, x]));
export const DEFAULT_EQ = { skin: null, finish: 'wf_stock', title: 'title_survivor', badge: null };
