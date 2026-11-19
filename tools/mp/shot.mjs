import { chromium } from 'playwright';
const [,, url, out, w=800, h=800] = process.argv;
const b = await chromium.launch({ executablePath:'/usr/bin/google-chrome', args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
const p = await b.newPage({viewport:{width:+w,height:+h}}); p.on('pageerror',e=>console.log('ERR',e.message)); p.on('console',m=>{if(m.type()==='error')console.log('CE',m.text())});
await p.goto(url); await p.waitForFunction(()=>document.title==='done',null,{timeout:90000}).catch(()=>console.log('timeout'));
console.log(JSON.stringify(await p.evaluate(()=>window.info)));
await p.screenshot({path:out}); await b.close();
