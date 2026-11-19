// Audits every dialogue line in the game against the action cue rules; writes a covered / not-covered report.
import { chromium } from 'playwright';
import fs from 'fs';
const port = process.argv[2] || 4301; const files = fs.readdirSync('src/game').filter(f => f.endsWith('.js')).map(f => 'src/game/' + f);
const lines = []; const re = /\[\s*'(\w+)'\s*,\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`[^`]*`)\s*\]/g;
for (const f of files) { const s = fs.readFileSync(f, 'utf8'); let m; while ((m = re.exec(s))) { let t = m[2].slice(1, -1).replace(/\\'/g, "'").replace(/\\"/g, '"'); if (t.length < 4 || /^[a-z_]+$/.test(t)) continue; if (!/ /.test(t)) continue; lines.push([m[1], t, f.replace('src/game/', '')]); } }
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] }); const p = await b.newPage();
await p.goto(`http://localhost:${port}/`, { waitUntil: 'domcontentloaded' });
const res = await p.evaluate(async (lines) => { const A = await import('/src/game/actions.js'); const out = { rules: {}, un: [] }; const kw = /(hug|point|hand(s|ed)? |give |pick(s|ed)? |kneel|crouch|duck|open|unlock|climb|jump|wave|grab|hold |carry|push|pull|lift|tie|bandage|wrap|show |roll |look (at|around|up|down)|turn |sit |stand|run |wrestle|shoot|reload|throw|toss|cry|laugh|nod|shake|salute|knock|cut |tape|plug|pump|drive|buckle|lock|drag|hide|dance|kiss)/i;
  for (const [w, t, f] of lines) { const txt = t.replace(/\{[^}]*\}/g, ''); let hit = false; for (const r of A.RULES) { if (r.w !== '*' && r.w !== w) continue; if (r.re.test(txt)) { (out.rules[r.id] = out.rules[r.id] || []).push([w, txt.slice(0, 90)]); hit = true; if (r.id.startsWith('dad_') || r.id === 'show_me_arm') break; } } if (!hit && kw.test(txt)) out.un.push([w, txt.slice(0, 100), f]); } return out; }, lines);
let md = `# Dialogue → action audit\n\nLines scanned: ${lines.length} (all say()/line arrays in src/game/*.js)\n\n## Covered by an action cue\n\n`;
for (const id in res.rules) { md += `### ${id}  (${res.rules[id].length} lines)\n` + res.rules[id].slice(0, 6).map(x => `- ${x[0]}: ${x[1]}`).join('\n') + '\n\n'; }
md += `## Lines that mention an action but have NO cue yet (${res.un.length})\n\n` + res.un.map(x => `- ${x[0]}: ${x[1]}  _(${x[2]})_`).join('\n') + '\n';
fs.writeFileSync('/workspace/atqr-proof/ACTION_AUDIT.md', md); console.log(lines.length, Object.entries(res.rules).map(([k, v]) => k + ':' + v.length).join(' '), 'uncovered:', res.un.length); await b.close();
