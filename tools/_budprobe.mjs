// Biscuit buddy probe: real game, iPhone landscape touch. Follow, thump warning, sniff + crate, collect.
import { chromium } from 'playwright';
const [step, out] = process.argv.slice(2); const fs = await import('fs'); fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }); await ctx.route(/supabase\.co/, r => r.abort());
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/supabase|Failed to load/i.test(m.text())) errs.push(m.text()); });
await p.addInitScript(() => { localStorage.setItem('atq3.settings', JSON.stringify({ qual: 'low', voices: false })); localStorage.setItem('atq_prologue_seen', '1'); localStorage.setItem('atq_age_ok', '1'); });
await p.goto('http://127.0.0.1:4472/?step=0&god'); await p.waitForFunction(() => window.__atq?.game?.running, null, { timeout: 180000 });
const idx = await p.evaluate((id) => window.__atq.story.findIndex(s => s.id === id), step);
await p.goto('http://127.0.0.1:4472/?step=' + idx + '&god'); await p.waitForFunction(() => window.__atq?.game?.running, null, { timeout: 180000 });
const E = (f, a) => p.evaluate(f, a); const W = (t) => p.waitForTimeout(t);
// skip intro dialogue/cut
for (let i = 0; i < 60; i++) { const c = await E(() => { const g = window.__atq.game; if (g.dlgCur || (g.dlgQ && g.dlgQ.length)) { g.skipLine(); return 1; } return g.cut ? 2 : 0; }); if (!c) break; await W(300); }
await W(1500);
const st = () => E(() => { const g = window.__atq.game, B = g._bud; const P = g.player.root.position; return { cut: !!g.cut, bud: !!B, mode: B && B.mode, d: B ? +Math.hypot(B.grp.position.x - P.x, B.grp.position.z - P.z).toFixed(2) : null, cue: document.getElementById('budCue')?.className, found: B && B.found, pk: g.pickups.filter(q => q.l.bud).length }; });
console.log('start', JSON.stringify(await st()));
// camera framing helper for proof shots: look at Keem + Biscuit from behind-ish
const frame = () => E(() => { const g = window.__atq.game; const B = g._bud; if (!B) return; g.cam.yaw = g.player.root.rotation.y + Math.PI; });
// walk forward a bit with the joystick-equivalent: move the player along its facing over 3s
for (let i = 0; i < 12; i++) { await E(() => { const g = window.__atq.game, P = g.player.root.position, a = g.player.root.rotation.y; const nx = P.x + Math.sin(a) * .5, nz = P.z + Math.cos(a) * .5; if (!g.inCol(nx, nz, .35)) P.set(nx, P.y, nz); }); await W(250); }
await W(6000); await frame(); await W(1500); await p.screenshot({ path: out + '/01_follow.png' }); console.log('follow', JSON.stringify(await st()));
// thump warning: zombie walks in from 11 m
await E(() => { const g = window.__atq.game, P = g.player.root.position, a = g.player.root.rotation.y + .6; window.__z = g.spawnZ(P.x + Math.sin(a) * 11, P.z + Math.cos(a) * 11, {}); if (g._bud) { g._bud.wcd = 0; g._bud.near0 = false; } });
for (let i = 0; i < 20; i++) { await W(250); if ((await st()).mode === 'warn') break; } await W(300); await p.screenshot({ path: out + '/02_warn.png' }); console.log('warn', JSON.stringify(await st())); await W(500); await p.screenshot({ path: out + '/02b_warn.png' });
await E(() => { const z = window.__z; if (z) { z.hp = 0; window.__atq.game.killZ ? window.__atq.game.killZ(z, {}) : (z.dead = true); } }); await W(1500);
// supply crate: force a calm moment
await E(() => { const g = window.__atq.game; g.zombies.forEach(z => { if (!z.dead) { z.hp = 0; z.dead = true; z.root.visible = false; } }); const B = g._bud; if (B) { B.mode = 'follow'; B.seekT = 0; B.calmT = 10; B.found = 0; } });
let s; for (let i = 0; i < 20; i++) { await W(300); s = await st(); if (s.mode === 'sniff') break; } console.log('seek', JSON.stringify(s)); await E(() => { const g = window.__atq.game; const B = g._bud; if (B) { const P = g.player.root.position; g.cam.yaw = Math.atan2(P.x - B.grp.position.x, P.z - B.grp.position.z); } }); await W(300); await p.screenshot({ path: out + '/03_sniff.png' });
for (let i = 0; i < 12; i++) { await W(300); s = await st(); if (s.mode === 'guard') break; } await W(500); await p.screenshot({ path: out + '/04_crate.png' }); console.log('crate', JSON.stringify(s));
const before = await E(() => { const g = window.__atq.game, s = g.save; return { cash: s.cash, meds: s.meds, ammo: JSON.stringify(s.ammo) }; });
await E(() => { const g = window.__atq.game, pk = g.pickups.find(q => q.l.bud); if (pk) g.player.root.position.set(pk.mesh.position.x, g.player.root.position.y, pk.mesh.position.z); }); await W(1200);
const after = await E(() => { const g = window.__atq.game, s = g.save; return { cash: s.cash, meds: s.meds, ammo: JSON.stringify(s.ammo) }; }); console.log('collect', JSON.stringify({ before, after, st: await st() })); await p.screenshot({ path: out + '/05_collected.png' });
// stuck test: teleport Keem 20 m away -> Biscuit must blink back
await E(() => { const g = window.__atq.game, P = g.player.root.position, a = g.player.root.rotation.y; for (let d = 20; d > 4; d -= 2) { const x = P.x - Math.sin(a) * d, z = P.z - Math.cos(a) * d; if (!g.inCol(x, z, .4)) { P.set(x, P.y, z); break; } } }); await W(1500); console.log('blink', JSON.stringify(await st()));
// cutscene hides him back in the hoodie
await E(() => { const g = window.__atq.game; g.cut = { cam: g.camera.position.clone(), look: g.player.root.position.clone(), anim: 'Idle_Loop' }; }); await W(600); console.log('cut', JSON.stringify(await st()), await E(() => { const g = window.__atq.game; for (const k in g.npcs) if (g.npcs[k].biscuit) return g.npcs[k].biscuit.visible; }));
await E(() => { window.__atq.game.cut = null; }); await W(800); console.log('after-cut', JSON.stringify(await st()));
console.log('ERRS', JSON.stringify(errs.slice(0, 8))); await b.close();
