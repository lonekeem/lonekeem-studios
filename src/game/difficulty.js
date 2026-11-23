// v1.9.85: story difficulty (Easy / Normal / Hard) + per-chapter star ratings.
// Everything that should sync lives in the main save object: save.diff, save.stars[ch] = { s, t, dmg, deaths, diff }.
// The in-progress chapter run (time, damage, deaths) is transient and kept in its own key so a death/retry
// (which reloads the save from the last checkpoint) does not wipe it.
export const DIFF = {
  easy: { id: 'easy', name: 'Easy', hp: 0.7, dmg: 0.55, ammo: 1.5, blurb: 'Weaker zombies, more ammo' },
  normal: { id: 'normal', name: 'Normal', hp: 1, dmg: 1, ammo: 1, blurb: 'The intended experience' },
  hard: { id: 'hard', name: 'Hard', hp: 1.4, dmg: 1.45, ammo: 0.65, blurb: 'Tougher zombies, scarce ammo' },
};
export const diffId = (save) => (save && DIFF[save.diff] ? save.diff : 'normal');
// story only: survival waves keep their own tuning
export const diffOf = (g) => (g && !g.survival && g.save ? DIFF[diffId(g.save)] : DIFF.normal);

const RK = 'atq3.run';
export function loadRun(LS) { try { const r = JSON.parse(LS.getItem(RK) || 'null'); return r && typeof r === 'object' ? r : null; } catch (e) { return null; } }
export function saveRun(LS, r) { try { if (r) LS.setItem(RK, JSON.stringify(r)); else LS.removeItem(RK); } catch (e) { /* ignore */ } }
export function newRun(ch, diff, replay) { return { ch, diff, replay: !!replay, t: 0, dmg: 0, deaths: 0, at: Date.now() }; }

// ★ finish · ★ no deaths · ★ on Hard, or on Normal with under 200 damage taken (Easy tops out at two stars)
export const STAR_RULES = ['Finish the chapter', 'No deaths', 'Hard — or Normal with under 200 damage taken'];
export function starsFor(run) {
  if (!run) return { s: 1, got: [true, false, false] };
  const got = [true, (run.deaths || 0) === 0, run.diff === 'hard' || (run.diff === 'normal' && (run.dmg || 0) < 200)];
  return { s: got.filter(Boolean).length, got };
}
// keep the best result per chapter (more stars, then faster time)
export function recordStars(save, ch, run) {
  const r = starsFor(run); save.stars = save.stars && typeof save.stars === 'object' ? save.stars : {};
  const prev = save.stars[ch], cur = { s: r.s, t: Math.round(run ? run.t : 0), dmg: Math.round(run ? run.dmg : 0), deaths: run ? run.deaths | 0 : 0, diff: run ? run.diff : 'normal' };
  const better = !prev || cur.s > prev.s || (cur.s === prev.s && cur.t > 0 && (!prev.t || cur.t < prev.t));
  if (better) save.stars[ch] = cur;
  return { ...r, cur, best: save.stars[ch], newBest: better };
}
export const starStr = (n) => '★'.repeat(n) + '☆'.repeat(Math.max(0, 3 - n));
export const fmtT = (t) => { t = Math.max(0, Math.round(t || 0)); const m = Math.floor(t / 60), s = t % 60; return m + ':' + String(s).padStart(2, '0'); };
