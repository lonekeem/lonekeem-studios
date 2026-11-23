// Lobby mode picker (Create Game / Practice Alone) on a phone-landscape screen. Local only: supabase blocked, no public lobby join.
import { launch, context, page } from './lib.mjs'; import fs from 'fs';
const OUT = '/workspace/atq-coop-proof/lobby'; fs.mkdirSync(OUT, { recursive: true });
const b = await launch(); const ctx = await context(b); const p = await page(ctx, 'L');
const res = { errs: p.errs, nf: p.nf };
res.btnLobby = await p.evaluate(() => !!document.getElementById('btnLobby'));
res.playAsKeem = await p.evaluate(async () => {
  for (const u of ['./src/mp/creator.js', './src/mp/profileui.js', './src/mp/charselect.js']) {
    try { if (/Play as Keem/.test(await (await fetch(u)).text())) return true; } catch (e) {}
  }
  return false;
});
await p.screenshot({ path: `${OUT}/01_menu.png` });
await p.click('#btnOnline');
await p.waitForTimeout(400);
await p.screenshot({ path: `${OUT}/01b_online_pane.png` });
await p.click('#btnLobby');
await p.waitForSelector('#online:not(.hidden)', { timeout: 20000 });
await p.waitForTimeout(600);
await p.screenshot({ path: `${OUT}/02_lobby.png` });
res.lobbyButtons = await p.evaluate(() => ['btnQuickJoin','btnCreateGame','btnPractice'].map(id => ({ id, t: document.getElementById(id)?.innerText })));
await p.click('#btnCreateGame');
await p.waitForSelector('#coopPick', { timeout: 10000 });
await p.waitForTimeout(300);
await p.screenshot({ path: `${OUT}/03_create_picker.png` });
res.modes = await p.evaluate(() => [...document.querySelectorAll('#coopPick .co')].map(b => b.innerText.replace(/\s+/g,' ').trim()));
await p.click('#coopPick [data-x]');
await p.waitForSelector('#coopPick', { state: 'detached' });
await p.click('#btnPractice');
await p.waitForSelector('#coopPick', { timeout: 10000 });
await p.waitForTimeout(300);
await p.screenshot({ path: `${OUT}/04_practice_picker.png` });
res.practiceTitle = await p.evaluate(() => document.querySelector('#coopPick h2')?.innerText);
console.log(JSON.stringify(res, null, 1));
fs.writeFileSync(`${OUT}/lobby.json`, JSON.stringify(res, null, 1));
await b.close();
if (!res.btnLobby || !res.modes || res.modes.length < 6) process.exit(1);
