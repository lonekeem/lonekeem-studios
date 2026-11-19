// Chapter 12 · Sublevel B — OWNED BY THE CHAPTER 12 BUILDER (only edit this file + kit/ files listed in docs/CHAPTERS_DEV.md).
// STUB: two placeholder steps so the chapter loads and chains. Replace the stubSteps() call with real steps.
import { PI, V, dist2, follow, goto, afterBoss, clearThen, fam, dadGun, dadTick, boss, raiders, pg } from './helpers.js';
import { stubSteps } from './stub.js';
import { buildBasement } from './kit/basement.js';

export const meta = { n: 12, title: 'Sublevel B', endQuote: '“Hi, baby.”', stub: true };
// extra speaker ids -> dialogue-box names (merged into the game's name table). Only list NEW speakers here.
export const speakers = {};
// world z origin of this chapter's set: -2900..-3200. Step cp's must live inside this band.
export const Z0 = -2900;
export const steps = stubSteps({ n: 12, z0: Z0 - 10, title: meta.title, endLine: 'Mom is alive. Placeholder end of Chapter 12.' });
// comic pages / pickups. Use `at: '<step id>'` (first step where it shows) instead of minStep. e.g. pg(x, z, 'Captain Riverside #21: "…"', 'c12_stub1')
export const loot = [];
// the 3D set. Runs inside world.js zone(12, ...); ctx is described in docs/CHAPTERS_DEV.md. Kit pieces live in ./kit/.
export function buildZone(ctx) {
  buildBasement(ctx, { x: 0, z: -2930, length: 260 });
}
