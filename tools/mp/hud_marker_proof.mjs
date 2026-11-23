// Local-only: off-screen waypoint / glow-arrow vs touch HUD. Never joins the public lobby.
import { openGame, stepShot } from '../proof_lib.mjs';
import { mkdirSync, writeFileSync } from 'fs';

const OUT = process.env.OUT || '/workspace/atq-road-proof/hud-marker';
const port = process.env.PORT || '5571';
mkdirSync(OUT, { recursive: true });

const { b, p, errs } = await openGame(port, 1, { w: 844, h: 390, qual: 'low', skip: true });
await p.evaluate(() => {
  const g = window.__atq.game;
  g.cut = null; g.dlgQ = []; g.dlgCur = null; g.convo = null; g.paused = false;
  g.god = true; g.hp = g.maxHp = 9999;
  try { g.alive().forEach(z => z.root.position.set(900, 0, 900)); } catch (e) {}
  document.body.classList.remove('hudv2');
});
await p.waitForTimeout(200);

async function place(kind, side) {
  return p.evaluate(([kind, side]) => {
    const g = window.__atq.game;
    g.cut = null; g.dlgQ = []; g.dlgCur = null; g.convo = null;
    // Stop the story from rewriting the waypoint every tick
    g.stepData = { uses: [], noGlow: false };
    const st = g.story && g.STORY;
    if (g.step != null) g._stepHold = true;
    if (!g._hudProofHook) {
      const orig = g.update.bind(g);
      g.update = function (dt, a) {
        const keep = g._hudProof;
        const r = orig(dt, a);
        if (keep) {
          g.cut = null; g.dlgCur = null;
          g.wpTarget = keep.wp;
          g.stepData = keep.sd;
        }
        return r;
      };
      g._hudProofHook = true;
    }
    const P = g.player.root.position; P.set(0, 0, 0);
    g.cam.fp = false; g.cam.yaw = 0; g.cam.pitch = 0.12; g.cam.dist = 7;
    g.player.root.rotation.y = 0;
    // Look toward -Z. Screen left is -X, right +X, up is -Z (ahead), down is +Z (behind).
    const off = 40;
    const map = { left: [-off, 1.2, -8], right: [off, 1.2, -8], up: [0, 1.2, -off], down: [0, 1.2, off] };
    const t = map[side];
    let wp = null, uses = [];
    if (kind === 'wp') wp = t;
    else uses = [{ x: t[0], y: 0, z: t[2], label: 'Test', name: 'Test' }];
    g.wpTarget = wp;
    g.stepData = { uses, noGlow: false };
    g._hudProof = { wp, sd: { uses, noGlow: false } };
    g.paused = false;
    for (let i = 0; i < 8; i++) g.update(1 / 30, 1 / 30);
    const el = kind === 'wp' ? document.querySelector('#wp') : document.querySelector('.glowArrow');
    const box = el && el.style.display !== 'none' ? el.getBoundingClientRect() : null;
    return { mid: box && +((box.left+box.right)/2).toFixed(1), y: box && +((box.top+box.bottom)/2).toFixed(1), text: el && el.innerText };
  }, [kind, side]);
}

function overlapInfo() {
  return p.evaluate(() => {
    const hud = [...document.querySelectorAll('#touch .rb, #stickBase, #mini, #obj, #hudr, #hpTxt, #ammoTxt, #budCue, #wbar.on, #pfp')];
    const vis = (el) => {
      const s = getComputedStyle(el);
      if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity === 0) return false;
      return !!el.getClientRects().length;
    };
    const boxes = hud.filter(vis).map(el => {
      const r = el.getBoundingClientRect();
      return { id: el.id || el.className, l: r.left, r: r.right, t: r.top, b: r.bottom };
    });
    const marks = [...document.querySelectorAll('#wp, .glowArrow')].filter(el => vis(el) && el.style.display !== 'none');
    const hits = [];
    for (const m of marks) {
      const r = m.getBoundingClientRect();
      const rec = { kind: m.id === 'wp' ? 'wp' : 'glow', l: r.left, r: r.right, t: r.top, b: r.bottom, x: +m.style.left.replace('px',''), y: +m.style.top.replace('px',''), text: (m.innerText || '').replace(/\s+/g, ' ') };
      for (const b of boxes) {
        const ox = !(r.right < b.l || r.left > b.r || r.bottom < b.t || r.top > b.b);
        if (ox) hits.push({ mark: rec, hud: b });
      }
    }
    const crch = document.getElementById('tCrouch');
    const cr = crch && vis(crch) ? crch.getBoundingClientRect() : null;
    return { hits, marks: marks.map(m => ({ kind: m.id === 'wp' ? 'wp' : 'glow', text: (m.innerText || '').replace(/\s+/g,' '), x: m.style.left, y: m.style.top, box: m.getBoundingClientRect() })), crch: cr && { l: cr.left, r: cr.right, t: cr.top, b: cr.bottom } };
  });
}

await place('glow', 'right'); // warmup so the update hook is in place
const report = { errs: [...errs], cases: [] };
for (const kind of ['glow', 'wp']) {
  for (const side of ['left', 'right', 'up', 'down']) {
    await place(kind, side);
    await p.waitForTimeout(250);
    const info = await overlapInfo();
    const name = `${kind}-${side}`;
    await p.screenshot({ path: `${OUT}/${name}.png` });
    // close-up of left edge / CRCH for the left cases
    if (side === 'left' && info.crch) {
      const c = info.crch;
      await p.screenshot({
        path: `${OUT}/${name}-crch-closeup.png`,
        clip: { x: Math.max(0, c.l - 50), y: Math.max(0, c.t - 50), width: Math.min(280, 844 - Math.max(0, c.l - 50)), height: Math.min(200, 390 - Math.max(0, c.t - 50)) },
      });
    }
    report.cases.push({ name, hits: info.hits, marks: info.marks, crch: info.crch });
    console.log(name, 'hits', info.hits.length, 'marks', JSON.stringify(info.marks));
  }
}

writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2));
const nHit = report.cases.reduce((n, c) => n + c.hits.length, 0);
console.log(JSON.stringify({ out: OUT, hits: nHit, errs: report.errs.slice(0, 5), pages: report.errs.length }, null, 2));
await b.close();
if (nHit > 0) process.exitCode = 2;
