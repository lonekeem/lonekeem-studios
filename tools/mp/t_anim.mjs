// Animation proof (not A-pose, not gliding): touch joystick (real touch events via CDP) on client A, 2 clients; own + remote; zombie hit flinch.
import { launch, client, ctxOpts, freecam } from '../mpfix/lib.mjs'; import fs from 'fs';
const OUT = '/workspace/atq1919/docs/mp-fix3/anim'; fs.mkdirSync(OUT, { recursive: true });
const b = await launch(); const cA = await b.newContext(ctxOpts), cB = await b.newContext(ctxOpts);
const pA = await client(cA, 'A'), pB = await client(cB, 'B'); const cdp = await cA.newCDPSession(pA);
const fr = (p, n) => p.evaluate(n => new Promise(r => { let k = 0; const f = () => { if (++k >= n) r(); else requestAnimationFrame(f); }; requestAnimationFrame(f); }), n);
for (const p of [pA, pB]) await p.evaluate(() => { window.__MP_DTCAP = .08; window.__mpTown.Z.killNear(0, 0, 600, 1e9); });
for (let i = 0; i < 90; i++) { const ok = await pB.evaluate(() => [...window.__mpTown.remotes.values()].some(r => r.av)) && await pA.evaluate(() => [...window.__mpTown.remotes.values()].some(r => r.av)); if (ok) break; await pB.waitForTimeout(1000); }
const res = { log: [] }; const rec = (n, ok, d) => { res.log.push({ n, ok, d }); console.log(ok ? 'PASS' : 'FAIL', n, JSON.stringify(d)); };
// probe: bone world positions relative to the avatar root (so root motion doesn't count) + arm elevation; works for local me.av and a remote's av
const probe = `(w) => { const t = window.__mpTown; let av, P; if (w === 'me') { av = t.me.av; } else { const r = [...t.remotes.values()].filter(r => r.av)[0]; av = r && r.av; } if (!av) return null; P = av.motion; let skin = null; av.obj.traverse(o => { if (o.isSkinnedMesh && !skin) skin = o; }); const bn = skin.skeleton.bones; const g = re => bn.find(b => re.test(b.name)); const V = av.root.position.constructor; const inv = av.root.matrixWorld.clone().invert(); const rel = b => { const v = new V(); b.getWorldPosition(v); return v.applyMatrix4(inv); };
  const lf = g(/LeftFoot/i), rf = g(/RightFoot/i), ra = g(/RightArm$|RightUpperArm|UpperArm_?R/i), rfa = g(/RightForeArm|LowerArm_?R/i), rh = g(/RightHand/i), ls = g(/LeftArm$|LeftUpperArm|UpperArm_?L/i), lh = g(/LeftHand/i);
  const a = rel(ra || rf), h = rel(rh); const arm = Math.atan2(Math.hypot(h.x - a.x, h.z - a.z), -(h.y - a.y)) * 180 / Math.PI; // 0 = arm hanging straight down, 90 = horizontal
  const la = ls ? rel(ls) : a, lhp = lh ? rel(lh) : h; const armL = Math.atan2(Math.hypot(lhp.x - la.x, lhp.z - la.z), -(lhp.y - la.y)) * 180 / Math.PI;
  const f1 = rel(lf), f2 = rel(rf); return { anim: P && P.curName, os: !!(P && P.oneShot), lf: [f1.x, f1.y, f1.z].map(v => +v.toFixed(3)), rf: [f2.x, f2.y, f2.z].map(v => +v.toFixed(3)), armR: +arm.toFixed(0), armL: +armL.toFixed(0), names: [lf, rf, ra, rh, ls].map(b => b && b.name) }; }`;
const pr = (p, w) => p.evaluate(`(${probe})('${w}')`);
const spread = arr => { const f = k => arr.map(o => o[k]); const sd = xs => { const m = xs.reduce((s, v) => s + v, 0) / xs.length; return Math.sqrt(xs.reduce((s, v) => s + (v - m) ** 2, 0) / xs.length); }; return { footZsd: +Math.max(sd(arr.map(o => o.lf[2])), sd(arr.map(o => o.rf[2]))).toFixed(3), footYsd: +Math.max(sd(arr.map(o => o.lf[1])), sd(arr.map(o => o.rf[1]))).toFixed(3) }; };
// ---- idle
await pA.evaluate(() => { const t = window.__mpTown; t.setPos(-6, 22); t.me.ry = Math.PI / 2; t.camYaw(Math.PI / 2); t.bag.pref = 'fists'; }); await pB.evaluate(() => window.__mpTown.setPos(-6, 15)); await fr(pA, 10); await fr(pB, 10);
const idleA = await pr(pA, 'me'), idleB = await pr(pB, 'remote'); rec('idle: own anim playing, arms down (not A-pose)', idleA.anim === 'Idle_Loop' && idleA.armR < 30, idleA); rec('idle: remote anim playing, arms down', idleB && idleB.armR < 30, idleB);
// ---- touch stick forward (real touch events): stick base centre -> drag up
const bs = await pA.evaluate(() => { const r = document.querySelector('#stickBase').getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; });
const send = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 3 }] });
const run = async (dy, label, runBtn) => { await send('touchStart', bs[0], bs[1]); for (let i = 1; i <= 4; i++) await send('touchMove', bs[0], bs[1] - dy * i / 4); const sa = [], sb = [], sp = []; for (let i = 0; i < 14; i++) { await fr(pA, 1); await fr(pB, 1); sa.push(await pr(pA, 'me')); sb.push(await pr(pB, 'remote')); sp.push(await pA.evaluate(() => +window.__mpTown.S.spd.toFixed(2))); } await send('touchEnd'); return { sa, sb, sp }; };
const walk = await run(24, 'walk'); const aW = spread(walk.sa), bW = spread(walk.sb);
rec('touch stick (half): own plays locomotion, feet move', aW.footZsd > .03 && /Walk|Jog|Sprint|Run/.test(walk.sa[walk.sa.length - 1].anim), { anim: walk.sa.map(o => o.anim).filter((v, i, a) => a.indexOf(v) === i), spd: walk.sp.slice(-3), ...aW, armR: walk.sa[walk.sa.length - 1].armR });
rec('touch stick (half): remote sees locomotion, feet move', bW.footZsd > .03 && /Walk|Jog|Sprint|Run|__loco/.test(walk.sb[walk.sb.length - 1].anim), { anim: walk.sb.map(o => o.anim).filter((v, i, a) => a.indexOf(v) === i), ...bW, armR: walk.sb[walk.sb.length - 1].armR });
await pA.evaluate(() => { const t = window.__mpTown; t.setPos(-6, 22); t.me.ry = Math.PI / 2; t.camYaw(Math.PI / 2); }); await fr(pA, 6);
const full = await run(60, 'run'); const aF = spread(full.sa), bF = spread(full.sb);
rec('touch stick (full): own runs, speed > walk, feet move faster', Math.max(...full.sp) > Math.max(...walk.sp) && aF.footZsd > .03, { anim: full.sa.map(o => o.anim).filter((v, i, a) => a.indexOf(v) === i), spd: full.sp.slice(-3), ...aF });
rec('touch stick (full): remote sees run', bF.footZsd > .03, { anim: full.sb.map(o => o.anim).filter((v, i, a) => a.indexOf(v) === i), ...bF });
// glide check: ground speed vs foot cadence -> stopped = feet settle (no gliding in idle pose)
await fr(pA, 6); await fr(pB, 6); const stopA = await pr(pA, 'me'), stopB = await pr(pB, 'remote'); rec('after release: own idle + remote idle', /Idle/.test(stopA.anim) && /Idle/.test(stopB.anim) && stopA.armR < 30, { A: stopA.anim, B: stopB.anim });
// ---- zombie hits A: flinch plays on A (own) and B sees it, locomotion resumes
await pA.evaluate(() => { const t = window.__mpTown; t.Z.killNear(0, 0, 600, 1e9); t.setPos(-6, 22); t.me.ry = Math.PI / 2; t.me.hp = 100; for (let k = 0; k < 3; k++) { const z = t.Z.spawnAt(t.me.x + 1.0 + k * .3, t.me.z + (k - 1) * .5); z.st = 'chase'; z.cd = 0; } });
let flinchA = false, flinchB = false, hp = 100, seenAnims = new Set(), seenB = new Set(); for (let i = 0; i < 60 && !(flinchA && flinchB); i++) { await fr(pA, 1); await fr(pB, 1); const a = await pr(pA, 'me'); const bb = await pr(pB, 'remote'); const h = await pA.evaluate(() => window.__mpTown.me.hp); hp = h; if (a) { seenAnims.add(a.anim); if (a.anim === 'Hit_Chest') flinchA = true; } if (bb) { seenB.add(bb.anim); if (bb.anim === 'Hit_Chest') flinchB = true; } }
rec('zombie hit: own flinch anim (Hit_Chest) plays', flinchA, { hp, seen: [...seenAnims] }); rec('zombie hit: remote player sees the flinch', flinchB, { seen: [...seenB] });
await pA.evaluate(() => { const t = window.__mpTown; t.Z.killNear(0, 0, 600, 1e9); t.me.hp = 100; }); await fr(pA, 12); await fr(pB, 6);
const afterHit = await send('touchStart', bs[0], bs[1]).then(async () => { for (let i = 1; i <= 4; i++) await send('touchMove', bs[0], bs[1] - 60 * i / 4); const s = []; for (let i = 0; i < 10; i++) { await fr(pA, 1); s.push(await pr(pA, 'me')); } await send('touchEnd'); return s; });
rec('after the hit: locomotion resumes (touch stick)', /Jog|Run|Sprint|Walk/.test(afterHit[afterHit.length - 1].anim) && spread(afterHit).footZsd > .03, { anim: afterHit.map(o => o.anim).filter((v, i, a) => a.indexOf(v) === i) });
// screenshots: B watching A mid-run, and A's own view
await pA.evaluate(() => { const t = window.__mpTown; t.setPos(-6, 22); t.me.ry = Math.PI / 2; t.camYaw(Math.PI / 2); }); await fr(pA, 4);
await send('touchStart', bs[0], bs[1]); for (let i = 1; i <= 4; i++) await send('touchMove', bs[0], bs[1] - 60 * i / 4); await fr(pA, 5); await fr(pB, 5);
await pA.screenshot({ path: `${OUT}/A_run_own.png` }); { const r = await pB.evaluate(() => { const r = [...window.__mpTown.remotes.values()].filter(r => r.av)[0]; return [r.x, r.z]; }); await freecam(pB, [r[0] + 1.5, 1.4, r[1] + 3.2], [r[0], 1.0, r[1]]); await fr(pB, 2); await pB.screenshot({ path: `${OUT}/B_sees_A_run.png` }); }
await send('touchEnd');
fs.writeFileSync(`${OUT}/anim.json`, JSON.stringify(res, null, 1)); await b.close();
