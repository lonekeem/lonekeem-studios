import { chromium } from 'playwright';
import fs from 'fs';
const port = '4388', out = '/workspace/atq-face/proof';
fs.mkdirSync(out, { recursive: true });

async function open(step, w=1280, h=720) {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: true });
  await ctx.addInitScript(() => localStorage.setItem('atq3.settings', JSON.stringify({ qual: 'low', gore: true, auto: false, text: 1, lang: 'on' })));
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e.message || e)));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(`http://localhost:${port}/?step=${step}&god`, { waitUntil: 'load', timeout: 120000 });
  await p.waitForFunction(() => window.__atq && window.__atq.game && window.__atq.game.running, null, { timeout: 120000 });
  await p.evaluate(() => { const g = window.__atq.game; g.paused = true; g.god = true; g.settings.auto = false; });
  await p.waitForTimeout(600);
  return { b, p, errs };
}
async function step(p, n=24) {
  await p.evaluate((n) => {
    const g = window.__atq.game; g.paused = true;
    for (let i = 0; i < n; i++) g.update(1/30, 1/30);
    if (!g.__pl) { g.__pl = new g.faceL.constructor('#fff0dc', 2.4, 18, 1.3); g.scene.add(g.__pl); }
    g.__pl.position.copy(g.camera.position).add({ x: .2, y: .8, z: .2 }); g.__pl.visible = true;
    g.render && g.render(1/30);
  }, n);
  await p.waitForTimeout(200);
}

// wide truck: include Keem, Dad, Nia
{
  const { b, p, errs } = await open(4, 1280, 720);
  await step(p, 30);
  const info = await p.evaluate(() => {
    const g = window.__atq.game, V = (x,y,z)=>new g.player.root.position.constructor(x,y,z);
    const keem = g.player.root.position, dad = g.npcs.marcus.root.position, nia = g.npcs.nia.root.position;
    const cx = (keem.x+dad.x+nia.x)/3, cz = (keem.z+dad.z+nia.z)/3;
    const dx = dad.x-keem.x, dz = dad.z-keem.z, len = Math.hypot(dx,dz)||1;
    const px = -dz/len, pz = dx/len;
    const cam = V(cx + px*8.5 - dx/len*1.5, 2.4, cz + pz*8.5 - dz/len*1.5);
    const look = V(cx, 1.2, cz);
    g.cut = Object.assign(g.cut||{}, { cam, look, anim: g.cut?.anim||'Idle_Loop', flash: true });
    g.camera.position.copy(cam); g.camera.lookAt(look);
    const wrap=y=>Math.atan2(Math.sin(y),Math.cos(y));
    const dot=(a,b)=>{ const yaw=wrap(a.root.rotation.y), fx=Math.sin(yaw), fz=Math.cos(yaw); const dx=b.root.position.x-a.root.position.x, dz=b.root.position.z-a.root.position.z, len=Math.hypot(dx,dz)||1; return +((fx*dx+fz*dz)/len).toFixed(3); };
    return { who: g.dlgCur?.who, text: g.dlgCur?.text?.slice(0,80), faceActive: !!g.dlgFace?.active, dots: { keemDad: dot(g.player, g.npcs.marcus), dadKeem: dot(g.npcs.marcus, g.player), niaDad: dot(g.npcs.nia, g.npcs.marcus), niaKeem: dot(g.npcs.nia, g.player) }, errs: 0 };
  });
  await step(p, 12);
  await p.screenshot({ path: out+'/truck-desk-dad-wide.png', timeout: 120000 });
  console.log('truck-wide', JSON.stringify(info), 'errs', errs.slice(0,5));
  await b.close();
}

// peek regression
{
  const { b, p, errs } = await open(0, 1280, 720);
  const after = await p.evaluate(() => {
    const g = window.__atq.game;
    for (let i = 0; i < 30; i++) g.skipLine && g.skipLine();
    for (let i = 0; i < 8; i++) g.update(1/30, 1/30);
    const peek = (g.stepData.uses || []).find(u => /Peek/i.test(u.label || ''));
    if (peek) peek.fn(g);
    const z0 = g.npcs.dube ? g.npcs.dube.root.position.z : null;
    for (let i = 0; i < 30; i++) g.update(1/30, 1/30);
    const dube = g.npcs.dube;
    return {
      phase: g.stepData.phase, cut: !!g.cut, cutAnim: g.cut && g.cut.anim,
      playerYaw: +g.player.root.rotation.y.toFixed(3),
      playerAnim: g.player.curName, faceActive: !!(g.dlgFace && g.dlgFace.active),
      dube: dube ? { z0, z: +dube.root.position.z.toFixed(2), yaw: +dube.root.rotation.y.toFixed(3), anim: dube.curName, moved: z0 != null ? +(dube.root.position.z - z0).toFixed(2) : null } : null,
      who: g.dlgCur && g.dlgCur.who
    };
  });
  await p.evaluate(() => {
    const g = window.__atq.game;
    if (!g.__pl) { g.__pl = new g.faceL.constructor('#fff0dc', 2.0, 14, 1.3); g.scene.add(g.__pl); }
    g.__pl.position.copy(g.camera.position).add({ x:0, y:.6, z:0 }); g.__pl.visible = true;
    g.render && g.render(1/30);
  });
  await p.waitForTimeout(250);
  await p.screenshot({ path: out+'/peek-regression.png', timeout: 120000 });
  console.log('peek', JSON.stringify(after), 'errs', errs.slice(0,6));
  const ok = after.phase === 'peek' && after.cut && after.faceActive === false && Math.abs(after.playerYaw + Math.PI/2) < 0.05 && after.dube && after.dube.moved > 0.5;
  console.log(ok ? 'PEEK OK' : 'PEEK CHECK ' + JSON.stringify({ faceActive: after.faceActive, yaw: after.playerYaw, expect: -Math.PI/2, moved: after.dube && after.dube.moved, phase: after.phase }));
  await b.close();
}

// chapter smoke: load a spread of steps, skip lines, run 45 frames, collect errors
const steps = [0, 2, 4, 5, 7, 15, 24, 55, 59, 60];
let bad = 0;
for (const st of steps) {
  const { b, p, errs } = await open(st, 960, 540);
  const info = await p.evaluate((st) => {
    const g = window.__atq.game;
    g.hp = g.maxHp = 9999;
    for (let i = 0; i < 8; i++) g.skipLine && g.skipLine();
    for (let i = 0; i < 45; i++) g.update(1/30, 1/30);
    return { step: g.step, wanted: st, obj: document.querySelector('#obj')?.textContent, faceActive: !!(g.dlgFace && g.dlgFace.active), phase: g.stepData && g.stepData.phase };
  }, st);
  const real = errs.filter(e => !/AbortError|play\(\)|The play\(\)|user didn't interact|NotAllowedError|AudioContext/i.test(e));
  console.log('smoke', st, JSON.stringify(info), 'errs', real.length, real.slice(0,3));
  if (real.length || info.step !== st) bad++;
  await b.close();
}
console.log(bad ? 'SMOKE FAIL '+bad : 'CHAPTER SMOKE OK');
process.exit(bad ? 1 : 0);
