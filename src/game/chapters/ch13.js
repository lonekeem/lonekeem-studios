// Chapter 13 · Biscuit Goes Rogue — OWNED BY THE CHAPTER 13 BUILDER (only edit this file + kit/ files listed in docs/CHAPTERS_DEV.md).
// STUB: two placeholder steps so the chapter loads and chains. Replace the stubSteps() call with real steps.
import { PI, V, dist2, follow, goto, afterBoss, clearThen, fam, dadGun, dadTick, boss, raiders, pg } from './helpers.js';
import { stubSteps } from './stub.js';
import { buildCafeteria, buildGiftShop, buildKidsWard } from './kit/floors.js';

export const meta = { n: 13, title: 'Biscuit Goes Rogue', endQuote: '“He\'s sitting on the soup.”', stub: true };
// extra speaker ids -> dialogue-box names (merged into the game's name table). Only list NEW speakers here.
export const speakers = {};
// world z origin of this chapter's set: -3300..-3600. Step cp's must live inside this band.
export const Z0 = -3300;
export const steps = stubSteps({ n: 13, z0: Z0 + (-26), title: meta.title, endLine: 'Placeholder end of Chapter 13.' });
// comic pages / pickups. Use `at: '<step id>'` (first step where it shows) instead of minStep. e.g. pg(x, z, 'Captain Riverside #22: "…"', 'c13_stub1')
export const loot = [];
// the 3D set. Runs inside world.js zone(13, ...); ctx is described in docs/CHAPTERS_DEV.md. Kit pieces live in ./kit/.
export function buildZone(ctx) {
  buildGiftShop(ctx, { x: 0, z: Z0 - 20 });
  buildKidsWard(ctx, { x: 0, z: Z0 - 46 });
  buildCafeteria(ctx, { x: 0, z: Z0 - 76 });
}
