import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const ctx = await b.newContext({ viewport: { width: 844, height: 390 } });
await ctx.addInitScript(() => { localStorage.setItem('atq3.settings', JSON.stringify({ qual: 'low', gore: true })); localStorage.setItem('atq3.look', JSON.stringify({ outfit: 'camo', hair: 'mohawk', hairColor: '#8a3a1e', skin: '#f3d2bd', face: 'sharp', beard: 'full' })); });
const p = await ctx.newPage(); await p.goto('http://127.0.0.1:4191/?step=1&god'); await p.waitForFunction(() => window.__atq && window.__atq.game && window.__atq.game.running, null, { timeout: 120000 }); await p.waitForTimeout(4000);
console.log(await p.evaluate(() => { const g = window.__atq.game; for (let i = 0; i < 60; i++) g.skipLine && g.skipLine(); return JSON.stringify({ outfit: g.player.look.outfit, hair: g.player.look.hair, rig: g.player.look.rig, skin: g.player.look.skin }); }));
await p.waitForTimeout(2500); await p.screenshot({ path: '/workspace/atq-custom-proof/story_keem_unchanged.png' }); await b.close();
