import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath:'/usr/bin/google-chrome', args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage(); p.on('pageerror',e=>console.log('ERR',e.message));
await p.goto(process.argv[2]); await p.waitForFunction(()=>document.title==='done',null,{timeout:60000});
console.log(JSON.stringify(await p.evaluate(()=>window.info))); await b.close();
