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
const tpA = (x, z, ry) => pA.evaluate(([x, z, ry]) => { const t = window.__mpTown; t.setPos(x, z); t.me.ry = ry; t.camYaw(ry); }, [x, z, ry]);
const remote = async () => { const a = await pA.evaluate(() => [window.__mpTown.me.x, window.__mpTown.me.z]); return pB.evaluate(a => { const t = window.__mpTown; const r = [...t.remotes.values()].filter(r => r.av).sort((p, q) => Math.hypot(p.x - a[0], p.z - a[1]) - Math.hypot(q.x - a[0], q.z - a[1]))[0]; if (!r) return null; const P = r.av.motion; return { x: +r.x.toFixed(1), z: +r.z.toFixed(1), vis: r.av.root.visible, anim: P && (P.locoOn ? 'LOCO' : P.curName), gunMounted: !!r.gm, g: r.g, name: r.tag && r.tag.visible, n: [...t.remotes.values()].filter(r => r.av).length }; }, a); };
const view = async name => { const r = await remote(); await freecam(pB, [r.x + 1.6, 1.4, r.z + 2.4], [r.x, 1.0, r.z]); await fr(pB, 3); await pB.screenshot({ path: `${OUT}/${name}.png` }); return r; };
await tpA(-6, 22, Math.PI / 2); await pB.evaluate(() => window.__mpTown.setPos(-6, 12)); await fr(pA, 12); await fr(pB, 12);
// close side view of A's right hand as seen by B
const hand = async name => { const r = await remote(); await freecam(pB, [r.x + .5, 1.4, r.z + 1.7], [r.x + .5, 1.25, r.z]); await fr(pB, 3); await pB.screenshot({ path: `${OUT}/${name}.png`, clip: { x: 222, y: 40, width: 400, height: 300 } }); return r; };
await tpA(-6, 22, Math.PI / 2); await pB.evaluate(() => window.__mpTown.setPos(-6, 12)); await fr(pA, 10); await fr(pB, 10);
const give = (id, am) => pA.evaluate(([id, am]) => { const t = window.__mpTown; t.bag.cap = 999; t.bag.add(id, 1); if (am) t.bag.add(am, 200); t.bag.pref = id; }, [id, am]);
await give('bat'); await fr(pA, 8); await fr(pB, 10); await hand('B_bat_rest'); console.log('bat rest ok');
await pA.evaluate(() => { window.__MP_DTCAP = .04; window.__mpTown.hit(); }); await pB.evaluate(() => { window.__MP_DTCAP = .04; });
for (let i = 0; i < 4; i++) { await fr(pA, 3); await fr(pB, 3); const ph = await pA.evaluate(() => window.__mpTown.S.atk.toFixed(2)); console.log('swing', i, ph); await hand('B_bat_swing' + i); }
await pA.evaluate(() => { window.__MP_DTCAP = .15; }); await pB.evaluate(() => { window.__MP_DTCAP = .15; });
await pA.evaluate(() => { const t = window.__mpTown; t.bag.add('pan', 1); t.bag.pref = 'pan'; }); await fr(pA, 8); await fr(pB, 10); await hand('B_pan_rest');
for (const [g, am] of [['smg', 'ammo_light'], ['rifle', 'ammo_rifle'], ['sniper', 'ammo_rifle']]) { await give(g, am); await fr(pA, 8); await fr(pB, 10); await hand('B_' + g + '_rest'); console.log(g); }
await give('flamer', 'ammo_fuel'); await pA.evaluate(() => { const t = window.__mpTown; t.GS.mag.flamer = 50; t.GS.cd = 0; }); await fr(pA, 8); await fr(pB, 8);
await pA.evaluate(() => { window.__mpTown.fireGun(); }); await fr(pB, 1); { const r = await remote(); await freecam(pB, [r.x + 2.2, 1.6, r.z + 3], [r.x + 3, 1.2, r.z]); await fr(pB, 1); await pB.screenshot({ path: `${OUT}/B_flamer_fire.png` }); }
await pA.evaluate(() => { const t = window.__mpTown; t.bag.add('grenade', 1); t.bag.pref = 'fists'; }); await pA.keyboard.press('KeyG'); for (let i = 0; i < 12; i++) await fr(pA, 1); await fr(pB, 2);
console.log('boom B ev', await pB.evaluate(() => window.__ev.slice()));
{ const bm = await pB.evaluate(() => window.__mpTown.S.lastBoom); console.log('B lastBoom', JSON.stringify(bm)); }
await b.close();
