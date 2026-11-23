// Local-only: prove left-edge glow/waypoint markers stay off CRCH and other HUD, still on the edge.
import { openGame } from '../proof_lib.mjs';
import { mkdirSync, writeFileSync } from 'fs';

const OUT = process.env.OUT || '/workspace/atq-road-proof/hud-marker';
const port = process.env.PORT || '5571';
mkdirSync(OUT, { recursive: true });

const { b, p, errs } = await openGame(port, 1, { w: 844, h: 390, qual: 'low', skip: true });

// Wait until CRCH is actually laid out
let crch = null;
for (let i = 0; i < 40; i++) {
  crch = await p.evaluate(() => {
    const el = document.getElementById('tCrouch');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    if (s.display === 'none' || r.width < 4) return null;
    return { l: r.left, r: r.right, t: r.top, b: r.bottom, cy: (r.top + r.bottom) / 2, w: r.width, h: r.height };
  });
  if (crch) break;
  await p.waitForTimeout(200);
}
if (!crch) {
  console.log('NO_CRCH');
  await p.screenshot({ path: `${OUT}/no-crch.png` });
  await b.close();
  process.exit(2);
}

const result = await p.evaluate((crch) => {
  const g = window.__atq.game;
  g.cut = null; g.dlgQ = []; g.dlgCur = null; g.convo = null;
  g.paused = false; g.god = true; g.hp = g.maxHp = 9999;
  document.body.classList.remove('hudv2');
  try { g.alive().forEach(z => z.root.position.set(900, 0, 900)); } catch (e) {}

  // Freeze camera / story so we control the marker
  g.player.root.position.set(0, 0, 0);
  g.cam.fp = false; g.cam.yaw = 0; g.cam.pitch = 0.12; g.cam.dist = 7;
  g.player.root.rotation.y = 0;
  g.stepData = { uses: [], noGlow: true };
  g.wpTarget = null;

  const boxOf = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity === 0 || r.width < 4) return null;
    return { id: el.id || sel, l: r.left, r: r.right, t: r.top, b: r.bottom };
  };

  const overlap = (a, b) => a && b && !(a.r < b.l || a.l > b.r || a.b < b.t || a.t > b.b);

  // 1) Direct clamp of a raw left-edge position sitting on CRCH (the reported bug)
  return import('/src/game/layout.js').then(({ clampHudMarker }) => {
    const raw = { x: 40, y: crch.cy };
    const [cx, cy] = clampHudMarker(raw.x, raw.y, 32, 28, 10);

    // Reuse / build a glow arrow so the screenshot matches the in-game look
    let el = document.querySelector('.glowArrow');
    if (!el) {
      el = document.createElement('div');
      el.className = 'glowArrow';
      el.innerHTML = '<i>▶</i><b></b>';
      (document.getElementById('hud') || document.body).appendChild(el);
    }
    // hide extras
    document.querySelectorAll('.glowArrow').forEach(e => { if (e !== el) e.style.display = 'none'; });
    const wp = document.getElementById('wp');
    if (wp) wp.style.display = 'none';

    const paint = () => {
      el.style.display = '';
      el.style.zIndex = '20';
      el.style.left = cx + 'px';
      el.style.top = cy + 'px';
      el.firstChild.style.transform = 'rotate(180deg)';
      el.lastChild.textContent = '20 m';
    };
    paint();
    g.paused = true;
    if (g.glow) g.glow.on = false;
    if (window.__keepMarker) clearInterval(window.__keepMarker);
    window.__keepMarker = setInterval(paint, 16);
    let badge = document.getElementById('proofBadge');
    if (!badge) {
      badge = document.createElement('div');
      badge.id = 'proofBadge';
      document.body.appendChild(badge);
    }
    Object.assign(badge.style, {
      position: 'fixed', left: cx + 'px', top: cy + 'px', transform: 'translate(-50%,-50%)',
      zIndex: '9999', background: '#ffd54a', color: '#111', font: '800 14px system-ui',
      padding: '4px 8px', borderRadius: '8px', border: '2px solid #000', pointerEvents: 'none',
      whiteSpace: 'nowrap'
    });
    badge.textContent = '▶ 20 m';

    const mark = el.getBoundingClientRect();
    const mb = { l: mark.left, r: mark.right, t: mark.top, b: mark.bottom };
    const hudSels = ['#tCrouch', '#tRun', '#stickBase', '#mini', '#obj', '#hudr', '#hpTxt', '#ammoTxt', '#wbar', '#tJump', '#tRoll', '#tAtk', '#tUse'];
    const hud = hudSels.map(boxOf).filter(Boolean);
    const hits = hud.filter(h => overlap(mb, h)).map(h => h.id);
    return {
      crch,
      raw,
      clamped: { x: cx, y: cy },
      mark: mb,
      hits,
      onLeftEdge: cx <= 140,
      clearOfCrch: !hits.includes('tCrouch'),
    };
  });
}, crch);

await p.waitForTimeout(100);
await p.screenshot({ path: `${OUT}/crch-clamp-full.png` });
const clipX = 0, clipY = Math.max(0, Math.min(crch.t - 80, 390 - 260));
await p.screenshot({
  path: `${OUT}/crch-clamp-closeup.png`,
  clip: { x: clipX, y: clipY, width: 280, height: Math.min(260, 390 - clipY) },
});

// Also a full left-edge crop that includes the clamped marker if it's above RUN
const my = result.mark;
if (my) {
  const x = Math.max(0, Math.min(my.l - 20, 844 - 300));
  const y = Math.max(0, Math.min(Math.min(my.t, crch.t) - 20, 390 - 280));
  const w = Math.min(300, 844 - x);
  const h = Math.min(300, 390 - y);
  await p.screenshot({ path: `${OUT}/crch-clamp-edge.png`, clip: { x, y, width: w, height: h } });
}

writeFileSync(`${OUT}/crch-clamp.json`, JSON.stringify({ result, errs: errs.slice(0, 8) }, null, 2));
console.log(JSON.stringify(result, null, 2));
await b.close();
if (!result.clearOfCrch || result.hits.length || !result.onLeftEdge) process.exit(2);
