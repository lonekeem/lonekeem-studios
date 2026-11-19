// Chapter 15 · PFC Danny Is So Sorry — OWNED BY THE CHAPTER 15 BUILDER (only edit this file + kit/ files listed in docs/CHAPTERS_DEV.md).
// STUB: two placeholder steps so the chapter loads and chains. Replace the stubSteps() call with real steps.
import { PI, V, dist2, follow, goto, afterBoss, clearThen, fam, dadGun, dadTick, boss, raiders, pg } from './helpers.js';
import { stubSteps } from './stub.js';
import { buildMarket, buildFreezer } from './kit/market.js';

export const meta = { n: 15, title: 'PFC Danny Is So Sorry', endQuote: '“Dear Haverford, I\'m so sorry.”', stub: true };
// extra speaker ids -> dialogue-box names (merged into the game's name table). Only list NEW speakers here.
export const speakers = {};
// world z origin of this chapter's set: -4100..-4400. Step cp's must live inside this band.
export const Z0 = -4100;
export const steps = stubSteps({ n: 15, z0: Z0 - 10, title: meta.title, endLine: 'Placeholder end of Chapter 15.' });
// comic pages / pickups. Use `at: '<step id>'` (first step where it shows) instead of minStep. e.g. pg(x, z, 'Captain Riverside #24: "…"', 'c15_stub1')
export const loot = [];
// the 3D set. Runs inside world.js zone(15, ...); ctx is described in docs/CHAPTERS_DEV.md. Kit pieces live in ./kit/.
export function buildZone(ctx) {
  buildMarket(ctx, { x: 0, z: -4160 });
  buildFreezer(ctx, { x: 30, z: -4220 });
}
