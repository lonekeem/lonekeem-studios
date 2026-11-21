// Pause the game when the app is sent to the background (app switch, lock, tab hide).
// Story/survival can fully pause; the online town keeps its connection and only stops local input.
// On return, gameplay stays on the pause menu until the player taps Resume. Menus may start menu music again.

let away = false;
const leaveFns = [];
const returnFns = [];

export const isAway = () => away;

export function onAppLeave(fn) { leaveFns.push(fn); return () => { const i = leaveFns.indexOf(fn); if (i >= 0) leaveFns.splice(i, 1); }; }
export function onAppReturn(fn) { returnFns.push(fn); return () => { const i = returnFns.indexOf(fn); if (i >= 0) returnFns.splice(i, 1); }; }

export function leaveApp() {
  if (away) return;
  away = true;
  for (const fn of leaveFns) { try { fn(); } catch (e) { console.warn('[bg-pause] leave', e); } }
}

export function returnApp() {
  if (!away) return;
  away = false;
  for (const fn of returnFns) { try { fn(); } catch (e) { console.warn('[bg-pause] return', e); } }
}

async function hookNative() {
  try {
    const Cap = typeof window !== 'undefined' ? window.Capacitor : null;
    if (Cap && Cap.isNativePlatform && !Cap.isNativePlatform()) return;
    const { App } = await import('@capacitor/app');
    App.addListener('pause', () => leaveApp());
    App.addListener('resume', () => returnApp());
    App.addListener('appStateChange', (s) => {
      if (!s) return;
      if (s.isActive === false) leaveApp();
      else if (s.isActive === true) returnApp();
    });
  } catch (e) { /* web / plugin not ready */ }
}

export function installBgListeners() {
  if (installBgListeners._on) return;
  installBgListeners._on = true;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden || document.visibilityState === 'hidden') leaveApp();
    else returnApp();
  });
  addEventListener('pagehide', leaveApp);
  addEventListener('pageshow', returnApp);
  addEventListener('blur', () => {
    if (document.visibilityState === 'hidden' || (typeof document.hasFocus === 'function' && !document.hasFocus())) leaveApp();
  });
  addEventListener('focus', () => {
    if (!document.hidden && document.visibilityState === 'visible') returnApp();
  });
  hookNative();
}
