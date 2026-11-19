import { boot } from '../mpfix/lib.mjs'; import fs from 'fs';
const { b, p } = await boot();
const r = await p.evaluate(() => Object.fromEntries(['#tAtk', '#tRoll', '#tJump', '#tUse', '#tRun', '#tCrouch', '#btnGren', '#btnSwap', '#btnView', '#btnPause', '#hudr2', '#mini', '#hpb'].map(id => { const e = document.querySelector(id); if (!e) return [id, null]; const r = e.getBoundingClientRect(); return [id, [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)]]; })));
console.log('mp', JSON.stringify(r)); await p.screenshot({ path: '/workspace/atq1919/docs/mp-fix2/hud_mp.png' }); await b.close();
