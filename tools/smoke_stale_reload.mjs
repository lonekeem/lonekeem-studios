// Proves the stale-index auto-reload fires once with a cache-bust, then does not loop.
// Local only. Does not open the real lobby or post scores.
import { webkit, chromium } from 'playwright';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const OUT = process.argv[2] || '/workspace/atq-stale-proof';
fs.mkdirSync(OUT, { recursive: true });

if (!fs.existsSync(path.join(DIST, 'index.html'))) {
  console.error('dist/index.html missing — run vite build first');
  process.exit(2);
}

const fresh = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
const m = fresh.match(/assets\/index-[A-Za-z0-9_-]+\.js/);
if (!m) { console.error('no hashed bundle in dist/index.html'); process.exit(2); }
const stale = fresh.replace(m[0], 'assets/index-STALEDEAD00.js');

let staleHits = 0, freshHits = 0;
const server = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://127.0.0.1');
  let rel = decodeURIComponent(u.pathname);
  if (rel === '/') rel = '/index.html';
  if (rel === '/index.html') {
    const wantFresh = u.searchParams.has('atq') || u.searchParams.has('atqcheck');
    const body = wantFresh ? fresh : stale;
    if (wantFresh) freshHits++; else staleHits++;
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(body);
    return;
  }
  const file = path.join(DIST, rel.replace(/^\/+/, ''));
  if (!file.startsWith(DIST) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404); res.end('no'); return;
  }
  const ext = path.extname(file);
  const types = { '.js': 'application/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.json': 'application/json', '.wasm': 'application/wasm', '.woff2': 'font/woff2' };
  res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const base = `http://127.0.0.1:${port}/`;
console.log('server', base, 'fresh bundle', m[0]);

const rec = (n, ok, d) => { console.log(ok ? 'PASS' : 'FAIL', n, d != null ? JSON.stringify(d) : ''); return !!ok; };
let fails = 0;
const ok = (n, v, d) => { if (!rec(n, v, d)) fails++; };

async function runBrowser(kind) {
  const factory = kind === 'webkit' ? webkit : chromium;
  const launch = kind === 'chromium'
    ? { executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] }
    : {};
  const b = await factory.launch(launch);
  const ctx = await b.newContext({
    viewport: { width: 844, height: 390 },
    deviceScaleFactor: 2,
    hasTouch: true,
    isMobile: true,
    userAgent: kind === 'webkit'
      ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
      : undefined,
  });
  const p = await ctx.newPage();
  const navs = [];
  p.on('framenavigated', f => { if (f === p.mainFrame()) navs.push(f.url()); });
  staleHits = 0; freshHits = 0;
  await p.goto(base, { waitUntil: 'domcontentloaded', timeout: 30000 });
  // Stale check or module error should replace the page with ?atq=
  const reloaded = await p.waitForFunction(() => {
    try { return new URL(location.href).searchParams.has('atq') && !!window.__atqReloadStale; } catch (e) { return false; }
  }, null, { timeout: 15000 }).then(() => true).catch(() => false);
  const url = p.url();
  ok(`${kind}: auto-reloaded once with cache-bust`, reloaded && /[?&]atq=/.test(url), { url, navs, staleHits, freshHits });

  // After the fresh page loads, the helper is present and the guard is still set until boot (or cleared after boot)
  const helper = await p.evaluate(() => typeof window.__atqReloadStale === 'function');
  ok(`${kind}: __atqReloadStale is a function after reload`, helper);

  // With the guard already set, a second call must not navigate again.
  // (A successful boot clears the guard so a later deploy can recover; set it here to test the loop lock.)
  const urlBefore = p.url();
  const second = await p.evaluate(() => { try { sessionStorage.setItem('atq.modReload', '1'); } catch (e) {} return window.__atqReloadStale(); });
  await p.waitForTimeout(800);
  ok(`${kind}: second reloadOnce returns false and stays put`, second === false && p.url() === urlBefore, { second, url: p.url() });

  await p.screenshot({ path: path.join(OUT, `reload_${kind}.png`) });
  await b.close();
}

await runBrowser('webkit');
await runBrowser('chromium');

// Loop guard: always serve stale HTML, even with ?atq= — must navigate only once more, then stop
{
  const b = await webkit.launch();
  const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
  const p = await ctx.newPage();
  let htmlHits = 0;
  const loopServer = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://127.0.0.1');
    let rel = decodeURIComponent(u.pathname);
    if (rel === '/') rel = '/index.html';
    if (rel === '/index.html') {
      htmlHits++;
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(stale); // always stale
      return;
    }
    res.writeHead(404); res.end('no');
  });
  await new Promise(r => loopServer.listen(0, '127.0.0.1', r));
  const lp = loopServer.address().port;
  const navs = [];
  p.on('framenavigated', f => { if (f === p.mainFrame()) navs.push(f.url()); });
  await p.goto(`http://127.0.0.1:${lp}/`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await p.waitForTimeout(4000);
  const navsAfter = navs.slice();
  await p.waitForTimeout(3000);
  // 1 initial load + at most 1 cache-bust reload. atqcheck fetches also hit index.html, so htmlHits can be ~6.
  ok('webkit: always-stale server does not reload in a loop', navs.length === navsAfter.length && navs.length <= 2, { htmlHits, navs, final: p.url() });
  await p.screenshot({ path: path.join(OUT, 'reload_noloop.png') });
  await b.close();
  loopServer.close();
}

server.close();
console.log(fails ? `FAILED ${fails}` : 'ALL PASSED');
process.exit(fails ? 1 : 0);
