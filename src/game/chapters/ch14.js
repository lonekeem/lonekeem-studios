// Chapter 14 · Every Bite — OWNED BY THE CHAPTER 14 BUILDER (only edit this file + kit/ files listed in docs/CHAPTERS_DEV.md).
// STUB: two placeholder steps so the chapter loads and chains. Replace the stubSteps() call with real steps.
import { PI, V, dist2, follow, goto, afterBoss, clearThen, fam, dadGun, dadTick, boss, raiders, pg } from './helpers.js';
import { stubSteps } from './stub.js';
import { buildLab } from './kit/lab.js';

export const meta = { n: 14, title: 'Every Bite', endQuote: '“Every single bite.”', stub: true };
// extra speaker ids -> dialogue-box names (merged into the game's name table). Only list NEW speakers here.
export const speakers = {};
// world z origin of this chapter's set: -3700..-4000. Step cp's must live inside this band.
export const Z0 = -3700;
export const steps = stubSteps({ n: 14, z0: Z0 - 10, title: meta.title, endLine: 'Placeholder end of Chapter 14.' });
// comic pages / pickups. Use `at: '<step id>'` (first step where it shows) instead of minStep. e.g. pg(x, z, 'Captain Riverside #23: "…"', 'c14_stub1')
export const loot = [];
// the 3D set. Runs inside world.js zone(14, ...); ctx is described in docs/CHAPTERS_DEV.md. Kit pieces live in ./kit/.
export function buildZone(ctx) {
  buildLab(ctx, { x: 0, z: -3760 });
}
