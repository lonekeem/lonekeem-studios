// Cloud save merge (pure, no DOM). Used when this device and the cloud both changed since the last sync.
// Rule: the copy saved most recently decides "current" things (cash, ammo, meds, equipped gear, continue point, settings);
// the other copy can only ADD progress: furthest chapter, finished flags, level/xp, kills, everything bought or unlocked, upgrade tiers.
// The server applies the same floor (supabase/migrations/20261123_cloud_save_guard.sql), so progress can never go backwards.
const UNION = ['owned', 'outfits', 'cosmetics', 'armors', 'pages', 'items'];
const num = v => (typeof v === 'number' && isFinite(v) ? v : 0);
const clone = o => (o == null ? o : JSON.parse(JSON.stringify(o)));
export function mergeSave(newer, older) {
  if (!older || typeof older !== 'object') return clone(newer); if (!newer || typeof newer !== 'object') return clone(older);
  const m = clone(newer);
  for (const k of ['maxCh', 'kills']) if (num(older[k]) > num(m[k])) m[k] = older[k];
  if (num(older.level) > num(m.level) || (num(older.level) === num(m.level) && num(older.xp) > num(m.xp))) { m.level = older.level; m.xp = older.xp; }
  for (const k of ['done', 'done2', 'played']) if (older[k] === true) m[k] = true;
  for (const k of UNION) if (Array.isArray(older[k]) || Array.isArray(m[k])) m[k] = [...new Set([...(Array.isArray(m[k]) ? m[k] : []), ...(Array.isArray(older[k]) ? older[k] : [])])];
  if (older.up && typeof older.up === 'object') { m.up = m.up && typeof m.up === 'object' ? m.up : {};
    for (const w of Object.keys(older.up)) { const o = older.up[w]; if (!o || typeof o !== 'object') continue; const n = m.up[w] = (m.up[w] && typeof m.up[w] === 'object') ? m.up[w] : {};
      for (const s of Object.keys(o)) if (num(o[s]) > num(n[s])) n[s] = o[s]; } }
  return m;
}
/** Merge two cloud payloads ({ save, sel, settings, survBest, stats, chars, at }). `at` = ms timestamp of the last local change. */
export function mergePayload(local, cloud) {
  if (!cloud || typeof cloud !== 'object' || !cloud.save) return clone(local); if (!local || typeof local !== 'object' || !local.save) return clone(cloud);
  const localNewer = num(local.at) >= num(cloud.at); const N = localNewer ? local : cloud, O = localNewer ? cloud : local;
  const m = Object.assign({}, clone(O), clone(N));
  m.save = mergeSave(N.save, O.save); m.survBest = Math.max(num(local.survBest), num(cloud.survBest));
  m.settings = N.settings || O.settings || null; m.sel = N.sel || O.sel || null; m.at = Math.max(num(local.at), num(cloud.at));
  return m;
}
