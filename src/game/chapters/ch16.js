// Chapter 16 · Last Light Out — OWNED BY THE CHAPTER 16 BUILDER (only edit this file + kit/ files listed in docs/CHAPTERS_DEV.md).
// STUB: two placeholder steps so the chapter loads and chains. Replace the stubSteps() call with real steps.
import { PI, V, dist2, follow, goto, afterBoss, clearThen, fam, dadGun, dadTick, boss, raiders, pg } from './helpers.js';
import { stubSteps } from './stub.js';
import { buildRoofHelipad } from './kit/roof.js';

export const meta = { n: 16, title: 'Last Light Out', endQuote: '“It\'s still quiet here.”', stub: true, nextTeaser: 'To be continued — Chapter 17 coming soon.' };
// extra speaker ids -> dialogue-box names (merged into the game's name table). Only list NEW speakers here.
export const speakers = {};
// world z origin of this chapter's set: -4500..-4800. Step cp's must live inside this band.
export const Z0 = -4500;
export const steps = stubSteps({ n: 16, z0: Z0 + (-76), title: meta.title, endLine: 'Placeholder end of Chapter 16.' });
// comic pages / pickups. Use `at: '<step id>'` (first step where it shows) instead of minStep. e.g. pg(x, z, 'Captain Riverside #25: "…"', 'c16_stub1')
export const loot = [];
// the 3D set. Runs inside world.js zone(16, ...); ctx is described in docs/CHAPTERS_DEV.md. Kit pieces live in ./kit/.
export function buildZone(ctx) {
  buildRoofHelipad(ctx, { x: 0, z: Z0 - 60 });
}
