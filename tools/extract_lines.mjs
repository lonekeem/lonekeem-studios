// Lines may hold {explicit|clean} pairs (Strong language setting); both variants are voiced.
// Extracts all [who, text] dialogue lines from story.js/game.js -> JSON for tools/make_audio.py
import fs from 'fs';
export const vhash = (s) => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0; return h.toString(36); };
// chapter files (src/game/chapters/chNN.js) are scanned too; any speaker id listed in their `export const speakers = {...}` is voiced automatically
const chDir = 'src/game/chapters'; const chFiles = fs.existsSync(chDir) ? fs.readdirSync(chDir).filter(f => /^ch\d+\.js$/.test(f)).map(f => chDir + '/' + f) : [];
const src = ['src/game/story.js', 'src/game/game.js', ...chFiles].map(f => fs.readFileSync(f, 'utf8')).join('\n');
const extra = []; chFiles.forEach(f => { const m = /export const speakers\s*=\s*\{([^}]*)\}/.exec(fs.readFileSync(f, 'utf8')); if (m) for (const k of m[1].matchAll(/([a-z0-9_]+)\s*:/g)) extra.push(k[1]); });
const WHO = ['keem', 'marcus', 'nia', 'walt', 'ruth', 'dube', 'radio', 'gus', 'sgt', 'brick', 'ronnie', 'deacon', 'reyes', 'tuck', 'santa', 'king', 'captain', 'vance', ...extra].join('|');
const re = new RegExp('\\[\\s*([\'"])(' + WHO + ')\\1\\s*,\\s*(([\'"`])(?:\\\\.|(?!\\4).)*\\4)\\s*\\]', 'g'); const out = []; let m;
while ((m = re.exec(src))) { const raw = eval(m[3]); const vs = new Set([raw.replace(/\{([^|}]*)\|([^}]*)\}/g, '$1'), raw.replace(/\{([^|}]*)\|([^}]*)\}/g, '$2')]); vs.forEach(text => out.push([m[2], text, vhash(m[2] + '|' + text)])); }
fs.writeFileSync('/tmp/lines.json', JSON.stringify(out, null, 1)); console.log(out.length, 'lines');
