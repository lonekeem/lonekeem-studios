import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath:'/usr/bin/google-chrome', args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
const p = await b.newPage({viewport:{width:600,height:400}}); p.on('console',m=>console.log(m.text().slice(0,1500))); p.on('pageerror',e=>console.log('ERR',e.message));
await p.goto(process.argv[2]); await p.waitForFunction(()=>document.title==='done',null,{timeout:60000}).catch(()=>console.log('timeout')); await b.close();
