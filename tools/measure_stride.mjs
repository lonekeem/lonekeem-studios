// measure each locomotion clip's foot excursion at the player's scale -> stride (m per cycle) and natural speed
import { chromium } from 'playwright';
const port = process.argv[2] || '5191';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 640, height: 360 } })).newPage();
await p.goto(`http://localhost:${port}/?step=0`); await p.waitForFunction(() => window.__atq?.game?.running, null, { timeout: 120000 });
console.log(await p.evaluate(() => { const g = window.__atq.game; g.paused = true; const P = g.player; const out = [];
  for (const name of ['Walk_Loop', 'Jog_Fwd_Loop', 'Sprint_Loop', 'Crouch_Fwd_Loop']) { P.mixer.stopAllAction(); P.locoOn = false; const a = P.act(name); a.reset(); a.setEffectiveWeight(1); a.play(); const D = a.getClip().duration;
    const N = 240, ys = [], zs = []; const v = new P.root.position.constructor(); for (let i = 0; i < N; i++) { a.time = D * i / N; P.mixer.update(0); P.root.updateMatrixWorld(true); P.bone('DEF-foot.L').getWorldPosition(v); P.root.worldToLocal(v); ys.push(v.y); zs.push(v.z); }
    const ymin = Math.min(...ys); let sum = 0, n = 0; for (let i = 0; i < N; i++) { if (ys[i] < ymin + 0.025) { const j = (i + 1) % N; sum += (zs[i] - zs[j]) / (D / N); n++; } }
    out.push(`${name} dur=${D.toFixed(3)} stanceFrac=${(n / N).toFixed(2)} stanceSpeed(natural m/s at scale ${P.scale})=${(sum / Math.max(1, n)).toFixed(2)} -> at scale1 ${(sum / Math.max(1, n) / P.scale).toFixed(2)}`); }
  return out.join('\n'); })); await b.close();
