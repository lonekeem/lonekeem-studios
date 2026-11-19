// usage: node flow.mjs outPrefix "tab1,tab2,..." [w h] [extraJS]
import { chromium } from 'playwright';
const [,, out, tabs='', w=390, h=844, extra=''] = process.argv;
const b = await chromium.launch({ executablePath:'/usr/bin/google-chrome', args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport:{width:+w,height:+h}, deviceScaleFactor:2, hasTouch:true, isMobile:true });
const p = await ctx.newPage(); p.on('pageerror',e=>console.log('ERR',e.message)); p.on('console',m=>{ if(['error','warning'].includes(m.type())) console.log(m.type().toUpperCase(),m.text().slice(0,300)); });
await p.goto('http://127.0.0.1:5199/'); await p.waitForSelector('#btnWarn'); await p.click('#btnWarn'); await p.waitForSelector('#btnMP',{timeout:20000});
await p.screenshot({path:out+'_menu.png'});
await p.click('#btnMP'); await p.waitForFunction(()=>window.__mpCreator&&window.__mpCreator.av(),null,{timeout:90000}); await p.waitForTimeout(1500);
if(extra) await p.evaluate(extra);
for (const t of tabs.split(',').filter(Boolean)) { const [name, js] = t.split('|'); await p.evaluate((n)=>{ const c=window.__mpCreator; c.setTab(c.tabs.indexOf(n)); }, name); if(js) await p.evaluate(js); await p.waitForTimeout(1800); await p.screenshot({path:`${out}_${name.replace(/\W/g,'')}.png`}); }
await b.close();
