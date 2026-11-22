// Loading overlay layout: status, bar, TIP label and tip text must stack
// with spacing and no overlap at phone landscape, desktop, and portrait.
// usage: node tools/smoke_loading_layout.mjs <url> <outdir>
import { chromium } from 'playwright';
import fs from 'fs';

const URL = process.argv[2] || 'http://127.0.0.1:5372/';
const OUT = process.argv[3] || '/workspace/atq-chload-proof/layout1936';
fs.mkdirSync(OUT, { recursive: true });

const VIEWS = [
  { id: 'phone-land', width: 844, height: 390, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  { id: 'desktop', width: 1280, height: 800, deviceScaleFactor: 1, isMobile: false, hasTouch: false },
  { id: 'phone-port', width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
];

const LONG_TIP = 'Hold Shift, press L3, or tap RUN to sprint. On touch, pushing the stick all the way out also starts a run.';

const measureFn = () => {
  const r = (el) => {
    if (!el) return null;
    const b = el.getBoundingClientRect();
    return { t: +b.top.toFixed(1), b: +b.bottom.toFixed(1), l: +b.left.toFixed(1), r: +b.right.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1) };
  };
  const q = (s) => document.querySelector(s);
  const ov = (a, b) => !!(a && b && a.t < b.b - 0.5 && b.t < a.b - 0.5 && a.l < b.r - 0.5 && b.l < a.r - 0.5);
  const brand = r(q('#loading .lbrand'));
  const center = r(q('#loading .lcenter'));
  const quote = r(q('#loading .lquote'));
  const status = r(q('#loading .lt'));
  const bar = r(q('#loading .lb'));
  const tipLab = r(q('#loading .ltip b'));
  const tipTxt = r(q('#loading .ltip span'));
  const gaps = {
    brandToCenter: brand && center ? +(center.t - brand.b).toFixed(1) : null,
    quoteToStatus: quote && status ? +(status.t - quote.b).toFixed(1) : null,
    statusToBar: status && bar ? +(bar.t - status.b).toFixed(1) : null,
    barToTip: bar && tipLab ? +(tipLab.t - bar.b).toFixed(1) : null,
    labToTxt: tipLab && tipTxt ? +(tipTxt.t - tipLab.b).toFixed(1) : null,
    tipToBottom: tipTxt ? +(innerHeight - tipTxt.b).toFixed(1) : null,
  };
  const overlaps = {
    statusBar: ov(status, bar),
    statusTipLab: ov(status, tipLab),
    statusTipTxt: ov(status, tipTxt),
    barTipLab: ov(bar, tipLab),
    barTipTxt: ov(bar, tipTxt),
    tipLabTxt: ov(tipLab, tipTxt),
    centerStatus: ov(center, status),
    centerBar: ov(center, bar),
    centerTip: ov(center, tipLab) || ov(center, tipTxt),
    brandCenter: ov(brand, center),
  };
  const clipped = [brand, center, status, bar, tipLab, tipTxt].some((b) => b && (b.t < -1 || b.b > innerHeight + 1 || b.l < -1 || b.r > innerWidth + 1));
  return { vw: innerWidth, vh: innerHeight, brand, center, quote, status, bar, tipLab, tipTxt, gaps, overlaps, clipped, statusText: q('#loading .lt')?.textContent, tipText: q('#loading .ltip span')?.textContent };
};

const recs = [];
const rec = (n, ok, d) => { recs.push(!!ok); console.log(ok ? 'PASS' : 'FAIL', n, d != null ? JSON.stringify(d).slice(0, 800) : ''); return !!ok; };

const b = await chromium.launch({
  executablePath: '/usr/bin/google-chrome',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'],
});

for (const view of VIEWS) {
  const ctx = await b.newContext({ viewport: { width: view.width, height: view.height }, deviceScaleFactor: view.deviceScaleFactor, isMobile: view.isMobile, hasTouch: view.hasTouch });
  const p = await ctx.newPage();
  p.setDefaultTimeout(60000);
  await p.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  const warn = p.locator('#btnWarn');
  if (await warn.count()) { await warn.click().catch(() => {}); }
  await p.evaluate((tip) => {
    for (const id of ['studio', 'warning', 'title', 'chapters']) {
      const n = document.getElementById(id); if (n) n.classList.add('hidden');
    }
    const rot = document.getElementById('rotate');
    if (rot) { rot.dataset.prevDisplay = rot.style.display; rot.style.display = 'none'; }
    const el = document.getElementById('loading');
    el.classList.remove('hidden');
    const lt = el.querySelector('.lt'); if (lt) lt.textContent = 'Loading Riverside…';
    const kick = el.querySelector('.lkick'); if (kick) kick.textContent = 'CHAPTER 1';
    const name = el.querySelector('.lname'); if (name) name.textContent = 'The Day Before';
    const quote = el.querySelector('.lquote'); if (quote) quote.textContent = '“There is still a home at the end of this road.”';
    const lab = el.querySelector('.ltip b'); if (lab) lab.textContent = 'TIP';
    const span = el.querySelector('.ltip span'); if (span) span.textContent = tip;
    const bar = el.querySelector('#loading .lb i, .lb i'); if (bar) bar.style.width = '62%';
  }, LONG_TIP);
  await p.waitForTimeout(120);
  const layout = await p.evaluate(measureFn);
  await p.screenshot({ path: `${OUT}/${view.id}.png` });
  console.log('SHOT', `${OUT}/${view.id}.png`);
  const ovAny = Object.values(layout.overlaps).some(Boolean);
  const tight = layout.gaps.statusToBar < 6 || layout.gaps.barToTip < 8 || layout.gaps.labToTxt < 4;
  rec('layout_' + view.id, !ovAny && !tight && !layout.clipped && layout.status && layout.bar && layout.tipLab && layout.tipTxt, layout);
  fs.writeFileSync(`${OUT}/${view.id}.json`, JSON.stringify(layout, null, 2));
  await ctx.close();
}

const fail = recs.some((x) => !x);
console.log(fail ? 'FAIL LOADING-LAYOUT SMOKE' : 'LOADING-LAYOUT SMOKE OK');
fs.writeFileSync(`${OUT}/summary.json`, JSON.stringify({ ok: !fail }, null, 2));
await b.close();
process.exit(fail ? 1 : 0);
