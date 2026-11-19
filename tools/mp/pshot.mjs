// usage: node pshot.mjs <script.mjs>  — helper to open the harness and run steps. Exported for proof scripts.
import { chromium } from 'playwright';
export async function open(port = 5211, w = 1000, h = 700) {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: w, height: h } }); p.on('pageerror', e => console.log('ERR', e.message)); p.on('console', m => { if (m.type() === 'error') console.log('CE', m.text()); });
  await p.goto(`http://127.0.0.1:${port}/tools/mp/props.html?w=${w}&h=${h}`); await p.waitForFunction(() => document.title === 'ready', null, { timeout: 120000 }); return { b, p };
}
