import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath:'/usr/bin/google-chrome', args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage({viewport:{width:900,height:500}}); p.on('pageerror',e=>console.log('ERR',e.message));
await p.goto('http://127.0.0.1:5210/tools/mp/townmap.html?top=10'); await p.waitForTimeout(1500);
const out = await p.evaluate(async () => { const T = await import('three'); const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js'); const res = {};
  for (const k of ['sedan','suv','truck','van','hatchback-sports','suv-luxury']) { const g = await new GLTFLoader().loadAsync('/models/cars/' + k + '.glb'); const bb = new T.Box3().setFromObject(g.scene); const names = []; g.scene.traverse(o => names.push(o.name + ':' + o.position.toArray().map(v => +v.toFixed(2)).join(','))); res[k] = { min: bb.min.toArray().map(v => +v.toFixed(2)), max: bb.max.toArray().map(v => +v.toFixed(2)), names: names.slice(0, 8) }; } return res; });
console.log(JSON.stringify(out, null, 1)); await b.close();
