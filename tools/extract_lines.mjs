// Lines may hold {explicit|clean} pairs (Strong language setting); both variants are voiced.
// Extracts all [who, text] dialogue lines from story.js/game.js -> JSON for tools/make_audio.py
import fs from 'fs';
export const vhash = (s) => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0; return h.toString(36); };
const src = ['src/game/story.js', 'src/game/game.js'].map(f => fs.readFileSync(f, 'utf8')).join('\n');
// v1.9.17: speakers come from the `names` table in game.js (add a character there and it is picked up here); 'note' is text only, never voiced
const spk = new Set([...(/const names = \{([^}]*)\}/.exec(src) || ['', ''])[1].matchAll(/(\w+)\s*:\s*'/g)].map(m => m[1]).filter(k => k !== 'note'));
const re = /\[\s*(['"])([a-z]+)\1\s*,\s*((['"`])(?:\\.|(?!\4).)*\4)\s*\]/g; const out = []; let m;
while ((m = re.exec(src))) { if (!spk.has(m[2])) continue; const raw = eval(m[3]); const vs = new Set([raw.replace(/\{([^|}]*)\|([^}]*)\}/g, '$1'), raw.replace(/\{([^|}]*)\|([^}]*)\}/g, '$2')]); vs.forEach(text => out.push([m[2], text, vhash(m[2] + '|' + text)])); }
fs.writeFileSync('/tmp/lines.json', JSON.stringify(out, null, 1)); console.log(out.length, 'lines');
