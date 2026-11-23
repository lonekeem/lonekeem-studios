import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox'] });
const ctx = await b.newContext({ viewport:{width:844,height:390}, deviceScaleFactor:2, isMobile:true, hasTouch:true }); await ctx.route(/supabase\.co/, r=>r.abort());
const p = await ctx.newPage();
await p.addInitScript(()=>{localStorage.setItem('atq3.settings',JSON.stringify({qual:'low',voices:false}));localStorage.setItem('atq_prologue_seen','1');localStorage.setItem('atq_age_ok','1');});
await p.goto('http://127.0.0.1:4472/?step=0&god'); await p.waitForFunction(()=>window.__atq?.game?.running,null,{timeout:180000});
const idx = await p.evaluate(()=>window.__atq.story.findIndex(s=>s.id==='c2_town'));
await p.goto('http://127.0.0.1:4472/?step='+idx+'&god'); await p.waitForFunction(()=>window.__atq?.game?.running,null,{timeout:180000});
for (let i=0;i<40;i++){const c=await p.evaluate(()=>{const g=window.__atq.game;if(g.dlgCur||(g.dlgQ&&g.dlgQ.length)){g.skipLine();return 1;}return g.cut?2:0;}); if(!c)break; await p.waitForTimeout(300);}
await p.waitForTimeout(2500);
const info = () => p.evaluate(()=>{const g=window.__atq.game,B=g._bud; const c=document.getElementById('budCue'); const r=c&&c.getBoundingClientRect(); const cs=c&&getComputedStyle(c); let sp=null; if(B){const THREE_v=B.grp.position.clone(); THREE_v.y+=.3; THREE_v.project(g.camera); sp=[((THREE_v.x+1)/2*innerWidth)|0,((1-THREE_v.y)/2*innerHeight)|0,+THREE_v.z.toFixed(3)];} const par=c&&c.parentElement; return {cue:r&&[r.x|0,r.y|0,r.width|0,r.height|0], op:cs&&cs.opacity, disp:cs&&cs.display, par:par&&(par.id+':'+getComputedStyle(par).display+':'+getComputedStyle(par).visibility), cls:c&&c.className, bud:sp, bvis:B&&B.grp.visible, scale:B&&B.r.scale.x, bp:B&&[B.grp.position.x.toFixed(1),B.grp.position.y.toFixed(2),B.grp.position.z.toFixed(1)], pp:[g.player.root.position.x.toFixed(1),g.player.root.position.y.toFixed(2),g.player.root.position.z.toFixed(1)], kids:B&&B.r.children.length};});
console.log(JSON.stringify(await info()));
console.log(JSON.stringify(await p.evaluate(()=>{const g=window.__atq.game,P=g.player.root.position,a=g.player.root.rotation.y;const cd=new (g.camera.position.constructor)();g.camera.getWorldDirection(cd);const r=[];for(let d=1;d<=4;d+=.5){r.push([d,g.inCol(P.x+Math.sin(a)*d,P.z+Math.cos(a)*d,.25)]);}return {a,wp:g.wpTarget,cd:[cd.x.toFixed(2),cd.z.toFixed(2)],r,side:g._bud&&g._bud._side,st:g._bud&&g._bud.st,stuck:g._bud&&g._bud.stuck};})));
console.log('fps', await p.evaluate(()=>new Promise(r=>{let n=0;const t0=performance.now();const f=()=>{n++; if(performance.now()-t0<2000) requestAnimationFrame(f); else r(n/2);};requestAnimationFrame(f);})));
console.log('budT', await p.evaluate(()=>new Promise(r=>{const B=window.__atq.game._bud;const t0=B.t+0,w=performance.now();setTimeout(()=>r([(B.t-t0),performance.now()-w]),2000);})));
await p.evaluate(()=>{const g=window.__atq.game,P=g.player.root.position,a=g.player.root.rotation.y+.6; g.spawnZ(P.x+Math.sin(a)*11,P.z+Math.cos(a)*11,{}); if(g._bud){g._bud.wcd=0;g._bud.near0=false;}});
await p.waitForTimeout(800); console.log(JSON.stringify(await info())); await p.screenshot({path:'/workspace/atq-feat3-proof/bud_c2/d_warn.png'});
await b.close();
