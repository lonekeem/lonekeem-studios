// Second-player view: client A plays, client B (separate browser context) must see A's character, pose, weapon, shots.
import { launch, client, ctxOpts, freecam } from '../mpfix/lib.mjs'; import fs from 'fs';
const OUT = '/workspace/atq1919/docs/mp-fix2/two'; fs.mkdirSync(OUT, { recursive: true });
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
await pA.evaluate(() => { window.__mpTown.bag.pref = 'pistol'; }); await fr(pA, 8); await fr(pB, 10);
res.idleGun = await view('B_sees_A_pistol_idle'); console.log('idle+gun', JSON.stringify(res.idleGun));
await pA.keyboard.down('KeyW'); await pA.keyboard.down('ShiftLeft'); await fr(pA, 8); await fr(pB, 6); { const r = await remote(); await freecam(pB, [r.x + 7, 1.4, r.z + 1.2], [r.x + 1, 1.0, r.z]); await fr(pB, 2); await pB.screenshot({ path: `${OUT}/B_sees_A_sprint.png` }); res.sprint = r; } console.log('sprint', JSON.stringify(res.sprint));
await pA.keyboard.up('ShiftLeft'); await pA.keyboard.up('KeyW'); await fr(pA, 4);
await pA.keyboard.press('KeyC'); await fr(pA, 6); await fr(pB, 8); res.crouch = await view('B_sees_A_crouch'); console.log('crouch', JSON.stringify(res.crouch)); await pA.keyboard.press('KeyC'); await fr(pA, 3);
await pA.evaluate(() => { window.__mpTown.hit(); }); await pA.evaluate(() => { window.__mpTown.hit(); }); await fr(pA, 4); await fr(pB, 3); res.shotEvents = await pB.evaluate(() => window.__ev.slice()); console.log('B heard/saw shots', JSON.stringify(res.shotEvents)); await view('B_sees_A_firing');
await pA.evaluate(() => { const t = window.__mpTown; t.bag.add('bat', 1); t.bag.pref = 'bat'; }); await fr(pA, 6); await fr(pB, 8); res.bat = await remote(); await pA.evaluate(() => window.__mpTown.hit()); await fr(pA, 2); await fr(pB, 2); res.swing = await view('B_sees_A_bat_swing'); console.log('bat swing', JSON.stringify(res.swing));
await pA.evaluate(() => { const t = window.__mpTown; t.bag.pref = 'fists'; }); await fr(pA, 6);
await pA.keyboard.press('ControlLeft'); await fr(pA, 1); await fr(pB, 2); res.roll = await remote(); console.log('roll', JSON.stringify(res.roll)); await fr(pA, 8);
await pA.evaluate(() => { window.__mpTown.bag.add('grenade', 1); }); await pA.keyboard.press('KeyG'); for (let i = 0; i < 20; i++) await fr(pA, 1); await fr(pB, 4); res.boomHeard = await pB.evaluate(() => window.__ev.filter(e => e.startsWith('explode'))); console.log('B explosion', JSON.stringify(res.boomHeard));
fs.writeFileSync(OUT + '/two_player.json', JSON.stringify(res, null, 1)); await b.close();
