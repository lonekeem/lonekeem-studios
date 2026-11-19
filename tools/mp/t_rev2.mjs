// holding BRAKE (REV) while stopped must reverse, like story mode
import { boot } from '../mpfix/lib.mjs';
const { b, p } = await boot();
const r = await p.evaluate(async () => { const T = window.__mpTown; const c = T.cars.find(k => k.id === 'c1'); T.setPos(c.x + 3, c.z); T.enter(c); await new Promise(r => setTimeout(r, 400));
  const out = { fuel: c.fuel, engine: c.engine, driver: c.driver }; const e = document.querySelector('#dBrake'); const fire = (t) => e.dispatchEvent(new PointerEvent(t, { bubbles: true, cancelable: true, pointerId: 1, pointerType: 'touch' }));
  const x0 = c.x, z0 = c.z, ry = c.ry; fire('pointerdown'); const vs = []; for (let i = 0; i < 6; i++) { await new Promise(r => setTimeout(r, 400)); vs.push(+c.v.toFixed(2)); } fire('pointerup');
  const fwd = (c.x - x0) * Math.sin(ry) + (c.z - z0) * Math.cos(ry); return { ...out, vs, movedAlongHeading: +fwd.toFixed(2), btnDisplayed: getComputedStyle(e).display }; });
console.log(JSON.stringify(r)); await b.close();
