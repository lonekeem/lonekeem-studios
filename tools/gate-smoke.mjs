// Launch-gate smoke: age check, agreement, backstory video, under-13 limits.
// Does not join the real lobby or post scores.
import { chromium, webkit, devices } from 'playwright';
import { mkdir, writeFile } from 'fs/promises';
import { dirname } from 'path';

const BASE = process.env.ATQ_URL || 'http://127.0.0.1:5178/';
const OUT = process.env.ATQ_PROOF || '/workspace/atq-gate-proof';
const yearKid = new Date().getFullYear() - 10;
const yearAdult = new Date().getFullYear() - 25;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function shot(page, name) {
  const path = `${OUT}/${name}`;
  await mkdir(dirname(path), { recursive: true });
  await page.screenshot({ path, fullPage: false });
  return path;
}

async function withContext(browserType, opts, fn) {
  const browser = await browserType.launch({ headless: true });
  const context = await browser.newContext({
    ...opts,
    // allow autoplay in tests; we also have a separate blocked-autoplay case
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  try {
    const result = await fn(page, errors);
    await context.close();
    await browser.close();
    return result;
  } catch (e) {
    try { await page.screenshot({ path: `${OUT}/FAIL-${Date.now()}.png` }); } catch {}
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
    throw e;
  }
}

async function waitVisible(page, sel, ms = 8000) {
  await page.waitForSelector(sel, { state: 'visible', timeout: ms });
}

async function firstLaunchToVideo(page, { year, shotsPrefix }) {
  await page.addInitScript(() => { try { localStorage.setItem('atq.tut.seen', '1'); } catch (e) {} });
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await waitVisible(page, '#gateAge');
  if (shotsPrefix) await shot(page, `${shotsPrefix}-age.png`);
  // Continue disabled until a year is picked
  const disabled = await page.$eval('#gAgeGo', el => el.disabled);
  if (!disabled) throw new Error('Continue should be disabled before a year is chosen');
  await page.selectOption('#gYear', String(year));
  if (year > new Date().getFullYear() - 13) {
    await page.waitForFunction(() => !document.getElementById('gAgeNote').classList.contains('hidden'));
  }
  if (shotsPrefix) await shot(page, `${shotsPrefix}-age-picked.png`);
  await page.click('#gAgeGo');
  await waitVisible(page, '#gateAgree');
  if (shotsPrefix) await shot(page, `${shotsPrefix}-agree.png`);
  const accDis = await page.$eval('#gAgreeGo', el => el.disabled);
  if (!accDis) throw new Error('Accept should be disabled until the box is ticked');
  await page.click('#gAgreeChk');
  await page.click('#gAgreeGo');
  await waitVisible(page, '#gateIntro', 8000);
  await page.waitForSelector('#gateSkip', { state: 'visible' });
  // poster or video frame should be on screen (not a blank black stall)
  const hasPoster = await page.$eval('#gateVideo', v => !!(v.poster || v.currentSrc));
  if (!hasPoster) throw new Error('intro video has no poster/src');
  if (shotsPrefix) {
    await sleep(600);
    await shot(page, `${shotsPrefix}-video.png`);
  }
}


async function dismissTutorial(page) {
  const offer = page.locator('#tutOffer:not(.hidden), #tutSkip');
  try {
    if (await page.locator('#tutSkip').isVisible({ timeout: 1500 })) {
      await page.click('#tutSkip');
      await page.waitForSelector('#tutOffer', { state: 'hidden', timeout: 3000 }).catch(() => {});
    }
  } catch (e) { /* no tutorial */ }
}
async function skipToMenu(page, shotsPrefix) {
  await page.click('#gateSkip');
  await page.waitForSelector('#title', { state: 'visible', timeout: 8000 });
  const hiddenIntro = await page.$eval('#gateIntro', el => el.classList.contains('hidden'));
  if (!hiddenIntro) throw new Error('intro still visible after skip');
  // no audio leak: src cleared or paused+muted and detached
  const leak = await page.evaluate(() => {
    const v = document.getElementById('gateVideo');
    if (!v) return false;
    if (v.paused && (!v.getAttribute('src') || v.src === '' || v.src === location.href)) return false;
    return !v.paused;
  });
  if (leak) throw new Error('video still playing after skip');
  if (shotsPrefix) await shot(page, `${shotsPrefix}-menu.png`);
  await dismissTutorial(page);
}

async function runKidFlow(page, errors, tag) {
  await firstLaunchToVideo(page, { year: yearKid, shotsPrefix: tag });
  await skipToMenu(page, tag);
  // language locked
  await page.click('#btnSettings');
  await waitVisible(page, '#settings');
  const lang = await page.$eval('#sLang', el => ({ value: el.value, disabled: el.disabled, visible: !!(el.offsetWidth || el.offsetHeight) }));
  if (lang.value !== 'clean' || !lang.disabled) throw new Error('under-13 language not locked: ' + JSON.stringify(lang));
  if (!lang.visible) throw new Error('Strong language setting is not visible in Settings');
  const hasAgreeBtn = await page.$('#btnAgreement');
  if (!hasAgreeBtn) throw new Error('User agreement button missing in Settings');
  if (tag) await shot(page, `${tag}-settings.png`);
  await page.click('#btnAgreement');
  await waitVisible(page, '#gateAgree');
  const body = await page.$eval('#gAgreeBody', el => el.innerText);
  if (!/Lone Keem Studios/.test(body) || /Kemoy|Lilly/i.test(body)) throw new Error('agreement text problem');
  if (tag) await shot(page, `${tag}-agree-settings.png`);
  await page.click('#gAgreeGo');
  await page.waitForSelector('#gateAgree', { state: 'hidden' });
  await waitVisible(page, '#settings');
  await page.click('#settings .back');
  // lobby blocked; #btnLobby still exists
  const lobbyId = await page.$('#btnLobby');
  if (!lobbyId) throw new Error('#btnLobby missing');
  await page.click('#btnOnline');
  await page.click('#btnLobby');
  await waitVisible(page, '#gateKids');
  if (tag) await shot(page, `${tag}-lobby-blocked.png`);
  await page.click('#gKidsBack');
  await page.waitForSelector('#gateKids', { state: 'hidden' });
  await waitVisible(page, '#title');
  return { errors: errors.slice(), lobby: true, lang };
}

async function runAdultReturn(page, errors, tag) {
  await page.addInitScript(({ y }) => {
    localStorage.setItem('atq.gate', JSON.stringify({ birthYear: y, agreedVersion: 1, agreedAt: Date.now() })); localStorage.setItem('atq.tut.seen', '1');
  }, { y: yearAdult });
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  // should not show age/agreement
  await waitVisible(page, '#gateIntro', 8000);
  const ageHidden = await page.$('#gateAge').then(el => el ? el.evaluate(e => e.classList.contains('hidden') || !e.offsetParent) : true);
  if (!ageHidden && await page.isVisible('#gateAge')) throw new Error('age screen shown on returning launch');
  if (tag) {
    await sleep(700);
    await shot(page, `${tag}-return-video.png`);
  }
  await skipToMenu(page, tag);
  await page.click('#btnSettings');
  const lang = await page.$eval('#sLang', el => ({ value: el.value, disabled: el.disabled }));
  if (lang.disabled) throw new Error('adult language should not be locked');
  await page.click('#settings .back');
  await page.click('#btnOnline');
  await page.click('#btnLobby');
  // guest lobby should open (do not join a room or post scores)
  await waitVisible(page, '#online', 10000);
  if (tag) await shot(page, `${tag}-lobby.png`);
  // leave
  if (await page.$('#online .wback')) await page.click('#online .wback');
  return { errors: errors.slice(), lang };
}

async function runWatchIntro(page, tag) {
  await page.addInitScript(({ y }) => {
    localStorage.setItem('atq.gate', JSON.stringify({ birthYear: y, agreedVersion: 1, agreedAt: Date.now() })); localStorage.setItem('atq.tut.seen', '1');
  }, { y: yearAdult });
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await waitVisible(page, '#gateIntro');
  await page.click('#gateSkip');
  await waitVisible(page, '#title');
  await dismissTutorial(page);
  await page.click('#btnSettings');
  await page.click('#btnWatchIntro');
  await waitVisible(page, '#gateIntro');
  if (tag) {
    await sleep(500);
    await shot(page, `${tag}-watch-intro.png`);
  }
  await page.click('#gateSkip');
  await waitVisible(page, '#settings');
}

const iphone = { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1, userAgent: devices['iPhone 13'].userAgent };
// Playwright iPhone 13 default is portrait; force landscape.


async function runWebkitAgeOnly(page, errors, tag) {
  await page.addInitScript(() => { try { localStorage.setItem('atq.tut.seen', '1'); } catch (e) {} });
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await waitVisible(page, '#gateAge');
  if (tag) await shot(page, `${tag}-age.png`);
  await page.selectOption('#gYear', String(yearKid));
  await page.waitForFunction(() => !document.getElementById('gAgeNote').classList.contains('hidden'));
  if (tag) await shot(page, `${tag}-age-picked.png`);
  // Continue must be visible on a short iPhone landscape screen
  const goVisible = await page.locator('#gAgeGo').isVisible();
  if (!goVisible) throw new Error('Continue is not visible after picking a year');
  await page.click('#gAgeGo');
  await waitVisible(page, '#gateAgree');
  if (tag) await shot(page, `${tag}-agree.png`);
  const acceptVisible = await page.locator('#gAgreeGo').isVisible();
  if (!acceptVisible) throw new Error('Accept is not visible on agreement');
  // Do not accept here: this Playwright WebKit build crashes on any <video> element.
  return { errors: errors.slice(), stoppedBeforeVideo: true };
}

const results = [];
async function section(name, fn) {
  try {
    const extra = await fn();
    results.push({ name, ok: true, ...extra });
    console.log('OK  ', name);
  } catch (e) {
    results.push({ name, ok: false, error: String(e && e.stack || e) });
    console.log('FAIL', name, e);
  }
}

await mkdir(OUT, { recursive: true });

await section('chromium first-launch under-13', () =>
  withContext(chromium, { viewport: { width: 844, height: 390 } }, (page, errors) => runKidFlow(page, errors, 'cr-kid')));

await section('chromium returning adult + lobby (guest, no join)', () =>
  withContext(chromium, { viewport: { width: 1280, height: 720 } }, (page, errors) => runAdultReturn(page, errors, 'cr-adult')));

await section('chromium Watch Intro', () =>
  withContext(chromium, { viewport: { width: 844, height: 390 } }, (page) => runWatchIntro(page, 'cr-watch')));

await section('webkit iPhone landscape age+agreement (no video; this WebKit crashes on <video>)', () =>
  withContext(webkit, iphone, (page, errors) => runWebkitAgeOnly(page, errors, 'wk-kid')));

await writeFile(`${OUT}/results.json`, JSON.stringify(results, null, 2));
const failed = results.filter(r => !r.ok);
console.log('\n' + results.length + ' tests, ' + failed.length + ' failed');
if (failed.length) process.exit(1);
