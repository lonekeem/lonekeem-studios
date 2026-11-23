// usage: node heap_paths.mjs file.heapsnapshot [TargetName...]
import fs from 'fs';
const s = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const m = s.snapshot.meta, NF = m.node_fields.length, EF = m.edge_fields.length;
const nt = m.node_types[0], et = m.edge_types[0], N = s.nodes, E = s.edges, S = s.strings;
const iT = m.node_fields.indexOf('type'), iN = m.node_fields.indexOf('name'), iS = m.node_fields.indexOf('self_size'), iE = m.node_fields.indexOf('edge_count');
const n = N.length / NF, first = new Uint32Array(n + 1);
for (let i = 0, e = 0; i < n; i++) { first[i] = e; e += N[i * NF + iE] * EF; } first[n] = E.length;
const nm = i => S[N[i * NF + iN]], ty = i => nt[N[i * NF + iT]];
const agg = {};
for (let i = 0; i < n; i++) { const k = ty(i) + ':' + nm(i).slice(0, 40); (agg[k] = agg[k] || [0, 0]); agg[k][0] += N[i * NF + iS]; agg[k][1]++; }
console.log(Object.entries(agg).sort((a, b) => b[1][0] - a[1][0]).slice(0, 25).map(([k, v]) => (v[0] / 1e6).toFixed(1) + 'MB ' + v[1] + ' ' + k).join('\n'));
// BFS from root, skipping weak edges
const par = new Int32Array(n).fill(-1), pe = new Int32Array(n).fill(-1); par[0] = 0; const q = [0];
for (let h = 0; h < q.length; h++) { const i = q[h]; for (let e = first[i]; e < first[i + 1]; e += EF) { const t = et[E[e]]; if (t === 'weak' || t === 'shortcut') continue; if (process.env.NODEV && S[E[e + 1]] && String(S[E[e + 1]]).includes('DevTools')) continue; const j = E[e + 2] / NF; if (par[j] < 0) { par[j] = i; pe[j] = e; q.push(j); } } }
const targets = process.argv.slice(3);
for (const T of targets) { let shown = 0; for (let i = 0; i < n && shown < 2; i++) { if (nm(i) !== T || ty(i) !== 'object' || par[i] < 0) continue; shown++; const path = []; let j = i; while (j !== 0 && path.length < 40) { const e = pe[j]; const t = et[E[e]], en = (t === 'element' || t === 'hidden') ? '[' + E[e + 1] + ']' : S[E[e + 1]]; path.push(ty(j) + ':' + nm(j).slice(0, 60) + ' <-' + t + ':' + en); j = par[j]; } console.log('\n== ' + T + '\n' + path.join('\n')); } if (!shown) console.log('\n== ' + T + ' not reachable'); }
// CTX=1: find town closure contexts (have both 'cars' and 'renderer' slots) and list who references them
if (process.env.CTX) {
  const rev = new Map();
  for (let i = 0; i < n; i++) for (let e = first[i]; e < first[i + 1]; e += EF) { const j = E[e + 2] / NF; if (!rev.has(j)) rev.set(j, []); rev.get(j).push([i, e]); }
  const ctxs = [];
  for (let i = 0; i < n; i++) { if (!nm(i).startsWith('system / Context')) continue; let a = 0, b = 0; for (let e = first[i]; e < first[i + 1]; e += EF) { const s2 = S[E[e + 1]]; if (s2 === 'cars') a = 1; if (s2 === 'renderer') b = 1; } if (a && b) ctxs.push(i); }
  console.log('town contexts:', ctxs.length);
  for (const c of ctxs) { const refs = rev.get(c) || []; const seen = {};
    for (const [i] of refs) { // closure i -> who holds it
      const holders = (rev.get(i) || []).map(([h, e]) => { const t = et[E[e]]; return ty(h) + ':' + nm(h).slice(0, 30) + '.' + (t === 'element' || t === 'hidden' ? '[' + E[e + 1] + ']' : S[E[e + 1]]); }).filter(x => !x.includes('Context') ).slice(0, 4).join(' | ');
      const k = ty(i) + ':' + nm(i) + '  <= ' + holders; seen[k] = (seen[k] || 0) + 1; }
    console.log('\n-- ctx', c, 'reachable', par[c] >= 0); for (const [k, v] of Object.entries(seen)) if (!/<= $/.test(k)) console.log(v, k); }
}
if (process.env.PATHTO) { // path to node index, no filters
  const par2 = new Int32Array(n).fill(-1), pe2 = new Int32Array(n).fill(-1); par2[0] = 0; const q2 = [0];
  for (let h = 0; h < q2.length; h++) { const i = q2[h]; for (let e = first[i]; e < first[i + 1]; e += EF) { const j = E[e + 2] / NF; if (par2[j] < 0) { par2[j] = i; pe2[j] = e; q2.push(j); } } }
  let j = +process.env.PATHTO; const out = []; while (j > 0 && out.length < 40) { const e = pe2[j]; if (e < 0) { out.push('UNREACHABLE ' + nm(j)); break; } const t = et[E[e]]; out.push(ty(j) + ':' + nm(j).slice(0, 60) + ' <-' + t + ':' + (t === 'element' || t === 'hidden' ? '[' + E[e + 1] + ']' : S[E[e + 1]])); j = par2[j]; } console.log(out.join('\n'));
}
