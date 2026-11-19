import { boot, OUT } from './lib.mjs';
const { b, p } = await boot();
console.log(JSON.stringify(await p.evaluate(() => { const T = window.__mpTown; return [[-4,23],[-1,25.5],[12,-22],[44,-10],[5,23.5]].map(([x,z]) => { const q = T.Z.zombies.find(q => q.dead && Math.hypot(q.root.position.x - x, q.root.position.z - z) < .3); return q && { x, z, zed: q.z, rig: q.look.rig, lz: q.look.zed, outfit: q.look.outfit, skin: q.look.skin, vis: q.root.visible }; }); })));
await b.close();
