// dev REPL: node tools/ch_repl.mjs <port> <step> [qual]  — then drop async-function bodies in /tmp/atq_cmd/<n>.js ; result -> <n>.out
// body gets (p, h) where h = { shot, run, hideUI, out }.   `await h.reload(step)` reopens the game.
import fs from 'fs'; import * as H from './ch_lib.mjs';
const [,, port = '4420', step = '54', qual = 'low'] = process.argv; const dir = '/tmp/atq_cmd'; fs.mkdirSync(dir, { recursive: true });
let S = await H.open(port, +step, { qual }); await H.hideUI(S.p);
const h = { ...H, reload: async (st, q = qual) => { try { await S.b.close(); } catch {} S = await H.open(port, +st, { qual: q }); await H.hideUI(S.p); return 'reloaded'; } };
console.log('ready'); fs.writeFileSync(dir + '/ready', '1');
const seen = new Set();
while (true) { for (const f of fs.readdirSync(dir).filter(f => /^\d+\.js$/.test(f)).sort((a, b) => parseInt(a) - parseInt(b))) { if (seen.has(f)) continue; seen.add(f);
  let res; try { const fn = new (Object.getPrototypeOf(async function () {}).constructor)('p', 'h', 'errs', fs.readFileSync(dir + '/' + f, 'utf8')); res = await fn(S.p, h, S.errs); } catch (e) { res = 'ERR ' + e.message; }
  fs.writeFileSync(dir + '/' + f.replace('.js', '.out'), typeof res === 'string' ? res : JSON.stringify(res)); }
  await new Promise(r => setTimeout(r, 300)); }
