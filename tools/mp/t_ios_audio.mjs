// iOS-like audio unlock: strict autoplay policy, taps only (touchend), MP reuses the unlocked context; suspended/interrupted ctx resumes on the next tap.
import { chromium } from 'playwright'; import { URL, ctxOpts } from '../mpfix/lib.mjs'; import fs from 'fs';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=document-user-activation-required'] });
const ctx = await b.newContext(ctxOpts); const p = await ctx.newPage(); p.on('pageerror', e => console.log('ERR', e.message));
const log = []; const rec = (n, v) => { log.push([n, v]); console.log(n, JSON.stringify(v)); };
const st = () => p.evaluate(() => ({ main: window.__atq.audio.ctx && window.__atq.audio.ctx.state, mp: window.__mpAud ? (window.__mpAud.ctx && window.__mpAud.ctx.state) : 'n/a', same: window.__mpAud === window.__atq.audio, t: window.__atq.audio.ctx ? +window.__atq.audio.ctx.currentTime.toFixed(2) : null }));
await p.goto(URL); await p.waitForSelector('#btnWarn'); rec('before any tap', await st());
const tap = async sel => { const r = await p.evaluate(s => { const e = document.querySelector(s).getBoundingClientRect(); return [e.x + e.width / 2, e.y + e.height / 2]; }, sel); await p.touchscreen.tap(r[0], r[1]); };
await tap('#btnWarn'); await p.waitForSelector('#btnMP'); await p.waitForTimeout(300); rec('after tapping warning (touch)', await st());
await tap('#btnMP'); await p.waitForFunction(() => window.__mpCreator && window.__mpCreator.av(), null, { timeout: 120000 }); await p.evaluate(() => window.__mpCreator.close(true)); await p.waitForFunction(() => window.__mpTown, null, { timeout: 120000 }); await p.waitForTimeout(1500);
rec('in town', await st());
await p.evaluate(() => window.__mpAud.ctx.suspend()); await p.waitForTimeout(300); rec('forced suspended (like iOS interrupted)', await st());
await p.touchscreen.tap(420, 200); await p.waitForTimeout(500); rec('after one touch in town', await st());
await p.evaluate(() => { window.__mpTown.aud.footstep && 0; window.__ok = typeof window.__mpAud.shot === 'function'; });
fs.mkdirSync('/workspace/atq1919/docs/mp-fix3/audio', { recursive: true }); fs.writeFileSync('/workspace/atq1919/docs/mp-fix3/audio/ios_unlock.json', JSON.stringify(log, null, 1)); await b.close();
