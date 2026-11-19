// Two clients in one browser context (BroadcastChannel is per-context). usage: node lobby2.mjs outPrefix
import { chromium } from 'playwright';
import { defaultLook, randomLook } from '../../src/mp/look.js';
const out = process.argv[2] || '/workspace/mp/L';
const A = defaultLook('mp_m2'); A.name = 'Keem'; A.skin.t = .75; const B = randomLook('mp_f1', 77); B.name = 'Mia'; B.skin.t = .15; B.hair.id = 'longwave'; B.worn.top = { id: 'sundress', c: '#e9b949', c2: '#fff', p: 0 }; B.worn.pants = null;
const b = await chromium.launch({ executablePath:'/usr/bin/google-chrome', args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport:{width:844,height:390}, deviceScaleFactor:1.5, hasTouch:true, isMobile:true });
async function client(look, name) {
  const p = await ctx.newPage(); p.on('pageerror',e=>console.log(name,'ERR',e.message)); p.on('console',m=>{ if(m.type()==='error') console.log(name,'CE',m.text().slice(0,200)); });
    await p.goto('http://127.0.0.1:5199/'); await p.waitForSelector('#btnWarn'); await p.click('#btnWarn'); await p.waitForSelector('#btnMP'); await p.click('#btnMP');
  await p.waitForFunction(()=>window.__mpCreator&&window.__mpCreator.av(),null,{timeout:90000}); await p.evaluate(l=>window.__mpCreator.setLook(l), look); await p.waitForTimeout(800); await p.evaluate(()=>window.__mpCreator.close(true));
  await p.waitForFunction(()=>window.__mpLobby,null,{timeout:60000}); return p;
}
const pa = await client(A, 'A'); const pb = await client(B, 'B');
await pa.waitForTimeout(4000);
console.log('A peers', await pa.evaluate(()=>window.__mpLobby.peers()), 'B peers', await pb.evaluate(()=>window.__mpLobby.peers()));
await pa.evaluate(()=>window.__mpLobby.setPos(-1,4)); await pb.evaluate(()=>{ window.__mpLobby.setPos(1,4); window.__mpLobby.key('KeyW',false); });
await pa.waitForTimeout(1500); await pa.screenshot({path:out+'_A1.png'}); await pb.screenshot({path:out+'_B1.png'});
await pb.evaluate(()=>{ window.__mpLobby.camYaw(Math.PI); window.__mpLobby.key('KeyD',true); window.__mpLobby.key('KeyW',true); });
await pa.waitForTimeout(1800); await pa.screenshot({path:out+'_A2.png'});
const pos = await pa.evaluate(()=>[...window.__mpLobby.remotes.values()].map(r=>[r.x,r.z]));
console.log('A sees B at', JSON.stringify(pos));
await pb.evaluate(()=>{ window.__mpLobby.key('KeyD',false); window.__mpLobby.key('KeyW',false); });
// car
await pa.evaluate(()=>{ const L=window.__mpLobby; L.setPos(L.car.position.x+2.5, L.car.position.z); }); await pa.waitForTimeout(300); await pa.keyboard.press('KeyE'); await pa.waitForTimeout(300); await pa.keyboard.down('KeyW'); await pa.waitForTimeout(1800); await pa.screenshot({path:out+'_A3.png'}); await pb.screenshot({path:out+'_B3.png'});
console.log('car', JSON.stringify(await pa.evaluate(()=>[window.__mpLobby.car.position.x,window.__mpLobby.car.position.z])), 'B sees car', JSON.stringify(await pb.evaluate(()=>[window.__mpLobby.car.position.x,window.__mpLobby.car.position.z])));
await b.close();
