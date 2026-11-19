// Second-player view: client A plays, client B (separate browser context) must see A's character, pose, weapon, shots.
import { launch, client, ctxOpts, freecam } from '../mpfix/lib.mjs'; import fs from 'fs';
const OUT = '/workspace/atq1919/docs/mp-fix3/two'; fs.mkdirSync(OUT, { recursive: true });
const b = await launch(); const cA = await b.newContext(ctxOpts), cB = await b.newContext(ctxOpts);
const pA = await client(cA, 'A'), pB = await client(cB, 'B');
const fr = (p, n) => p.evaluate(n => new Promise(r => { let k = 0; const f = () => { if (++k >= n) r(); else requestAnimationFrame(f); }; requestAnimationFrame(f); }), n);
for (const p of [pA, pB]) await p.evaluate(() => { window.__MP_DTCAP = .15; window.__mpTown.Z.killNear(0, 0, 400, 9999); });
for (let i = 0; i < 90; i++) { const ok = await pB.evaluate(() => { const t = window.__mpTown; return [...t.remotes.values()].some(r => r.av); }) && await pA.evaluate(() => [...window.__mpTown.remotes.values()].some(r => r.av)); if (ok) break; await pB.waitForTimeout(1000); }
const res = {}; res.peersA = await pA.evaluate(() => window.__mpTown.peers()); res.peersB = await pB.evaluate(() => window.__mpTown.peers()); console.log('peers', res.peersA, res.peersB);
await pB.evaluate(() => { window.__ev = []; const a = window.__mpTown.aud; for (const k of ['shot', 'explode']) { const o = a[k]; a[k] = function (...r) { window.__ev.push(k + ':' + r[0]); return o.apply(this, r); }; } });
const CAR = 'c7'; const out = {};
const cinfo = p => p.evaluate(id => { const t = window.__mpTown; const c = t.cars.find(q => q.id === id); return { x: +c.x.toFixed(2), z: +c.z.toFixed(2), ry: +c.ry.toFixed(3), v: +c.v.toFixed(2), drv: c.driver }; }, CAR);
const pos = await pA.evaluate(id => { const t = window.__mpTown; const c = t.cars.find(q => q.id === id); c.lock = 0; c.broken = true; c.fuel = 40; t.setPos(c.x + 2.4, c.z); t.me.ry = -Math.PI / 2; t.camYaw(-Math.PI / 2); return [c.x, c.z]; }, CAR);
await pB.evaluate(p => window.__mpTown.setPos(p[0] - 8, p[1] + 9), pos); await fr(pA, 6); await fr(pB, 6);
await pA.keyboard.press('KeyE'); await fr(pA, 6); out.enter = await cinfo(pA); console.log('A in car', JSON.stringify(out.enter));
const seq = [];
const sample = async (tag) => { const a = await cinfo(pA), bb = await cinfo(pB); seq.push({ tag, A: a, B: bb }); return [a, bb]; };
await pA.keyboard.down('KeyW'); for (let i = 0; i < 8; i++) { await fr(pA, 2); await fr(pB, 2); await sample('fwd'); } await pA.keyboard.up('KeyW');
for (let i = 0; i < 10; i++) { await fr(pA, 2); await fr(pB, 2); } await sample('stopped');
await pA.keyboard.down('KeyS'); for (let i = 0; i < 8; i++) { await fr(pA, 2); await fr(pB, 2); await sample('rev'); } await pA.keyboard.up('KeyS');
const dir = (s, who) => { const a = s[0][who], z = s[s.length - 1][who]; const dx = z.x - a.x, dz = z.z - a.z; const f = [Math.sin(z.ry), Math.cos(z.ry)]; return { disp: +Math.hypot(dx, dz).toFixed(2), alongFacing: +(dx * f[0] + dz * f[1]).toFixed(2) }; };
const fw = seq.filter(s => s.tag === 'fwd'), rv = seq.filter(s => s.tag === 'rev');
out.forward = { A: dir(fw, 'A'), B: dir(fw, 'B') }; out.reverse = { A: dir(rv, 'A'), B: dir(rv, 'B') }; console.log(JSON.stringify(out, null, 1));
fs.writeFileSync('/workspace/atq1919/docs/mp-fix3/two/car_two_player.json', JSON.stringify({ out, seq }, null, 1));
// B's view of the truck while A drives forward (screenshot)
await pA.keyboard.down('KeyW'); await fr(pA, 8); await fr(pB, 6); { const c = await cinfo(pB); await freecam(pB, [c.x + Math.cos(c.ry) * 8, 2.4, c.z - Math.sin(c.ry) * 8], [c.x, 1, c.z]); await fr(pB, 2); await pB.screenshot({ path: '/workspace/atq1919/docs/mp-fix3/two/B_sees_truck_fwd.png' }); } await pA.keyboard.up('KeyW');
await b.close();
