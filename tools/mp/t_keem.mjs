// admin path: forced-admin on localhost shows "Play as Keem"; the town then uses the story Keem (voice flag on, story animations)
import { launch, URL as U, ctxOpts } from '../mpfix/lib.mjs'; import fs from 'fs'; const OUT = '/workspace/atq1919/docs/mp-fix2';
const b = await launch(); const ctx = await b.newContext(ctxOpts); const p = await ctx.newPage(); p.on('pageerror', e => console.log('ERR', e.message)); p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.log('CE', m.text().slice(0, 200)); });
await p.addInitScript(() => { window.__MP_FORCE_ADMIN = 1; });
await p.goto(U); await p.waitForSelector('#btnWarn'); await p.click('#btnWarn'); await p.waitForSelector('#btnMP'); await p.click('#btnMP');
await p.waitForFunction(() => window.__mpCreator && window.__mpCreator.av(), null, { timeout: 120000 }); await p.waitForTimeout(1500);
console.log('keemBtn shown:', await p.evaluate(() => window.__mpKeemBtn && window.__mpKeemBtn.style.display === ''));
await p.screenshot({ path: OUT + '/creator_admin_button.png' });
await p.evaluate(() => window.__mpKeemBtn.click()); await p.waitForFunction(() => window.__mpTown, null, { timeout: 120000 }); await p.waitForTimeout(2500);
await p.keyboard.down('KeyW'); await p.keyboard.down('ShiftLeft'); await p.waitForTimeout(2500);
console.log(JSON.stringify(await p.evaluate(() => { const T = window.__mpTown, P = T.me.av.motion; return { isKeem: !!(P && P.isKeem), noKeemVoice: T.aud.noKeem, cur: P.locoOn ? 'LOCO' : P.curName, spd: T.S.spd }; })));
await p.screenshot({ path: OUT + '/keem_run.png' });
await p.evaluate(() => { try { window.__calls = []; const a = window.__mpTown.aud, o = a.shout.bind(a); a.shout = (k, ...r) => { window.__calls.push(k); return o(k, ...r); }; a.hurt(); a.hurt(); a.hurt(); a.hurt(); a.hurt(); a.hurt(); a.hurt(); a.hurt(); } catch (e) { window.__calls.push('ERR ' + e.message); } });
console.log('keem shout keys while Keem:', JSON.stringify(await p.evaluate(() => window.__calls)));
await b.close();
