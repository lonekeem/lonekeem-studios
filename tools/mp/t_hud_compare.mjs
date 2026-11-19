// story HUD vs multiplayer HUD at the same phone viewport: same buttons, same positions (+ Bag/Shop/Exit row)
import { launch, URL as U, ctxOpts } from '../mpfix/lib.mjs'; import fs from 'fs'; const OUT = '/workspace/atq1919/docs/mp-fix2'; fs.mkdirSync(OUT, { recursive: true });
const b = await launch(); const ctx = await b.newContext(ctxOpts); const p = await ctx.newPage();
await p.goto(U); await p.waitForSelector('#btnWarn'); await p.click('#btnWarn'); await p.waitForSelector('#btnNew'); await p.click('#btnNew');
await p.waitForFunction(() => window.__atq && window.__atq.game && window.__atq.game.running, null, { timeout: 90000 }); await p.waitForTimeout(3000);
const rects = () => p.evaluate(() => Object.fromEntries(['#tAtk', '#tRoll', '#tJump', '#tUse', '#tRun', '#tCrouch', '#btnGren', '#btnSwap', '#btnView', '#btnPause', '#hudr2'].map(id => { const e = document.querySelector(id); if (!e) return [id, null]; const r = e.getBoundingClientRect(); return [id, [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)]]; })));
const story = await rects(); await p.screenshot({ path: OUT + '/hud_story.png' });
// go to the title then multiplayer, from the same page (story game exists)
await p.evaluate(() => window.__atq.game && (window.__atq.game.paused = true)); await p.evaluate(() => document.querySelector('#btnPause').click()).catch(() => {});
console.log('story', JSON.stringify(story)); await b.close();
