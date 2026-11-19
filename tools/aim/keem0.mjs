import { launch, ctxOpts, client, fr } from './lib.mjs';
const b = await launch(); const ctx = await b.newContext(ctxOpts); const p = await client(ctx, { keem: true });
await p.evaluate(() => { window.__MP_DTCAP = .1; });
const r = await p.evaluate(async () => { const T = window.__mpTown; const av = T.me.av; const P = av.motion; const out = { keys: Object.keys(av).slice(0, 20), hasObj: !!av.obj, isKeem: !!P.isKeem, GSshown: T.GS.shown, pref: T.bag.pref, gun: !!T.GS.mesh, attach: typeof P.attach, rootVisible: av.root.visible };
  T.bag.add('ammo_light', 30); T.GS.cd = 0; const m0 = T.GS.mag.pistol; try { T.fireGun(); out.fired = m0 - T.GS.mag.pistol; } catch (e) { out.fireErr = e.message; }
  return out; });
console.log(JSON.stringify(r)); await b.close();
