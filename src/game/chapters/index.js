// Chapter registry. To add a chapter: create chNN.js (copy a stub), import it here, add it to CH_MODULES. That is the ONLY shared line you touch.
// Each chapter module exports: meta {n, title, endQuote, stub?}, speakers {id: 'Display name'}, steps [], loot [], buildZone(ctx) (optional 3D set).
import { CORE_CHAPTERS } from './core_meta.js';
import * as ch12 from './ch12.js';
import * as ch13 from './ch13.js';
import * as ch14 from './ch14.js';
import * as ch15 from './ch15.js';
import * as ch16 from './ch16.js';
import * as ch17 from './ch17.js';
import * as ch18 from './ch18.js';
import * as ch19 from './ch19.js';
import * as ch20 from './ch20.js';
import * as ch21 from './ch21.js';

export const CH_MODULES = [ch12, ch13, ch14, ch15, ch16, ch17, ch18, ch19, ch20, ch21];
export const CHAPTER_LIST = [...CORE_CHAPTERS, ...CH_MODULES.map(m => m.meta)];
export const NEW_STEPS = CH_MODULES.flatMap(m => m.steps);
export const NEW_LOOT = CH_MODULES.flatMap(m => m.loot || []);
export const SPEAKER_NAMES = Object.assign({}, ...CH_MODULES.map(m => m.speakers || {}));
// world.js calls this inside zone(n, ...) for every new chapter
export const ZONE_BUILDERS = Object.fromEntries(CH_MODULES.filter(m => m.buildZone).map(m => [m.meta.n, m.buildZone]));
