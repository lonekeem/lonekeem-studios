import { chromium } from 'playwright';
const ids = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox'] });
const ctx = await b.newContext({ viewport:{width:844,height:390}, isMobile:true, hasTouch:true }); await ctx.route(/supabase\.co/, r=>r.abort());
const p = await ctx.newPage();
await p.addInitScript(()=>{localStorage.setItem('atq3.settings',JSON.stringify({qual:'low',voices:false}));localStorage.setItem('atq_prologue_seen','1');localStorage.setItem('atq_age_ok','1');});
await p.goto('http://127.0.0.1:4472/?step=0&god'); await p.waitForFunction(()=>window.__atq?.game?.running,null,{timeout:180000});
for (const id of ids) { const idx = await p.evaluate(id=>window.__atq.story.findIndex(s=>s.id===id), id);
 await p.goto('http://127.0.0.1:4472/?step='+idx+'&god'); await p.waitForFunction(()=>window.__atq?.game?.running,null,{timeout:180000}); await p.waitForTimeout(2500);
 console.log(id, idx, JSON.stringify(await p.evaluate(()=>{const g=window.__atq.game;const P=g.player.root.position;return {cut:!!g.cut,sd:Object.keys(g.stepData||{}),npcs:Object.entries(g.npcs).map(([k,n])=>[k,!!n.biscuit,!!(n.root&&n.root.parent),n.root&&n.root.visible,!!n.down,!!n.isVictim,n.root?+Math.hypot(n.root.position.x-P.x,n.root.position.z-P.z).toFixed(1):null])};})));
}
await b.close();
