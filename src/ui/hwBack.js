// Android hardware back: close the top overlay instead of leaving the app.
// Web has no hardware back; this is a no-op in the browser.
import { handleGateBack } from './gate.js';

const vis = (sel) => {
  const el = typeof sel === 'string' ? document.querySelector(sel) : sel;
  if (!el || el.classList.contains('hidden')) return null;
  try {
    const st = getComputedStyle(el);
    if (st.display === 'none' || st.visibility === 'hidden') return null;
  } catch (e) { /* ignore */ }
  return el;
};
const click = (sel) => {
  for (const s of String(sel).split(',').map(x => x.trim()).filter(Boolean)) {
    const el = vis(s);
    if (el) { el.click(); return true; }
  }
  return false;
};

/** @returns true if the back press was consumed */
export function handleHardwareBack() {
  if (handleGateBack()) return true;
  // Highest overlays first.
  if (vis('#charSel')) return click('#charSelCancel');
  if (vis('#tutOffer')) return click('#tutSkip') || click('#tutMenu') || click('#tutStay') || click('#tutStart');
  if (vis('#layEdit')) return click('#layEdit #leDone, #layEdit .back');

  if (vis('#prof')) return click('#prof button.x') || click('#prof .foot button') || click('#prof .welcome button:last-of-type');
  if (vis('#mpc')) {
    const labeled = [...document.querySelectorAll('#mpc button')].find(b => /(?:^|\s)(Back|Cancel)\s*$/i.test((b.textContent || '').trim()));
    if (labeled) { labeled.click(); return true; }
  }

  if (vis('#dailies')) return click('#dailies .back');
  if (vis('#online')) return click('#online .wback');
  if (vis('#shop')) return click('#shop .back');
  if (vis('#inv')) return click('#inv .back');
  if (vis('#custom')) return click('#custom .back');
  if (vis('#chapters')) return click('#chapters .back');
  if (vis('#credits')) return click('#credits .back');
  if (vis('#ctlset')) return click('#ctlset .back, #ctlset .back2');
  if (vis('#controls')) return click('#controls .back2, #controls .back');
  if (vis('#settings')) return click('#settings .back');
  if (vis('#pause')) return click('#btnResume');
  if (vis('#dead')) return click('#btnDeadQuit');
  if (vis('#ending')) return click('#btnEndTitle');
  if (vis('#cine')) return click('#cine .skip');

  if (vis('#title')) {
    const openBtn = document.querySelector('#title .mplay.open');
    if (openBtn) { openBtn.click(); return true; }
    const pane = document.querySelector('#title .mpane.on');
    if (pane) { pane.classList.remove('on'); return true; }
    return false; // title: let the OS leave / minimize the app
  }
  if (vis('#warning')) return false;

  const stage = document.getElementById('stage');
  if (stage && !stage.classList.contains('hidden')) return click('#btnPause');
  return false;
}

export async function installHardwareBack() {
  try {
    const Cap = typeof window !== 'undefined' ? window.Capacitor : null;
    if (!Cap || !Cap.isNativePlatform || !Cap.isNativePlatform()) return;
    const { App } = await import('@capacitor/app');
    App.addListener('backButton', () => {
      if (handleHardwareBack()) return;
      try { App.minimizeApp(); } catch (e) { try { App.exitApp(); } catch (e2) { /* ignore */ } }
    });
  } catch (e) { /* web / plugin not ready */ }
}
