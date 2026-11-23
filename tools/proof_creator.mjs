// Cycles random creator combos, checks save/reload/apply, and screenshots a sample grid + close-ups.
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'fs/promises';
import { existsSync } from 'fs';

const PORT = process.env.PORT || 5388;
const OUT = process.env.OUT || '/workspace/atq-creator-proof';
const N = +(process.env.COMBOS || 80);
await mkdir(OUT, { recursive: true });

const chrome = existsSync('/usr/bin/google-chrome') ? '/usr/bin/google-chrome' : undefined;
const browser = await chromium.launch({
  executablePath: chrome,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'],
});
const ctx = await browser.newContext({ viewport: { width: 900, height: 1100 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push(String(e.message || e)));
page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });

const url = `http://127.0.0.1:${PORT}/tools/creator_proof.html`;
console.log('open', url);
await page.goto(url, { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(() => window.__PROOF && window.__PROOF.ready, { timeout: 180000 });

const logic = await page.evaluate(() => window.__PROOF.runLogicTests());
console.log('logic', JSON.stringify(logic.tests, null, 2));
console.log('counts styles', logic.counts && logic.counts.TOTAL);

console.log('cycling', N, 'random combos…');
const cycle = await page.evaluate((n) => window.__PROOF.cycleRandom(n, 20261123), N);
console.log('cycle errors', cycle.errors.length, '/', cycle.n);
if (cycle.errors.length) console.log(cycle.errors.slice(0, 8));

function saveDataUrl(path, dataUrl) {
  const b64 = String(dataUrl || '').split(',')[1];
  if (!b64) throw new Error('no image data for ' + path);
  return writeFile(path, Buffer.from(b64, 'base64'));
}

console.log('rendering grid…');
const gridData = await page.evaluate(() => window.__PROOF.renderGrid());
await saveDataUrl(`${OUT}/grid-16.png`, gridData);

const closeups = await page.evaluate(() => window.__PROOF.CLOSEUPS.map(c => ({ file: c.file, title: c.title })));
for (const c of closeups) {
  console.log('closeup', c.file);
  const data = await page.evaluate((file) => {
    const spec = window.__PROOF.CLOSEUPS.find(s => s.file === file);
    return window.__PROOF.renderCloseup(spec);
  }, c.file);
  await saveDataUrl(`${OUT}/close-${c.file}.png`, data);
}

const filtered = errs.filter(e => !/supabase|Failed to load resource|ERR_FAILED|favicon/i.test(e));
const report = {
  logic: logic.tests,
  counts: logic.counts,
  reloadOk: logic.reloadOk,
  cycle: { n: cycle.n, errors: cycle.errors },
  pageErrors: filtered.slice(0, 20),
  out: OUT,
};
await writeFile(`${OUT}/report.json`, JSON.stringify(report, null, 2));
console.log('REPORT', JSON.stringify({ pass: logic.tests.every(t => t.pass) && cycle.errors.length === 0, tests: logic.tests, cycleErrors: cycle.errors.length, pageErrors: filtered.length }, null, 2));
await browser.close();
if (!logic.tests.every(t => t.pass) || cycle.errors.length) process.exit(2);
