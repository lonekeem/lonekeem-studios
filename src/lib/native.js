// Native (Android app) helpers. On the website these are no-ops / fall back to web APIs.
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';

export const isNative = Capacitor.isNativePlatform();

const toBase64 = (blob) => new Promise((res, rej) => {
  const r = new FileReader();
  r.onload = () => res(String(r.result).split(',')[1]);
  r.onerror = rej;
  r.readAsDataURL(blob);
});

/** Share an image through Android's share sheet. */
export async function shareFile(blob, fileName, title, text) {
  const data = await toBase64(blob);
  const { uri } = await Filesystem.writeFile({ path: fileName, data, directory: Directory.Cache });
  await Share.share({ title, text, files: [uri], dialogTitle: 'Share your card' });
}

/** Save an image into the phone's Documents folder. */
export async function saveFile(blob, fileName) {
  const data = await toBase64(blob);
  await Filesystem.writeFile({ path: `Lone Keem Studios/${fileName}`, data, directory: Directory.Documents, recursive: true });
}

export async function shareText(title, text, url) {
  await Share.share({ title, text, url, dialogTitle: 'Invite a friend' });
}

/** Status bar, splash and the hardware back button. */
export function initNative() {
  if (!isNative) return;
  document.documentElement.classList.add('native');
  StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {});
  StatusBar.setBackgroundColor({ color: '#0f0a1a' }).catch(() => {});
  StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
  setTimeout(() => SplashScreen.hide().catch(() => {}), 300);

  App.addListener('backButton', () => {
    // 1. Close whatever is on top: a sheet, then a full-screen player.
    const sheets = document.querySelectorAll('.sheet-backdrop .sheet-head [aria-label="Close"]');
    if (sheets.length) { sheets[sheets.length - 1].click(); return; }
    const viewerClose = document.querySelector('.viewer .viewer-close');
    if (viewerClose) { viewerClose.click(); return; }
    // 2. Step up through screens; on the home feed, leave the app.
    const route = window.location.hash.replace(/^#\/?/, '') || 'watch';
    const [tab, sub] = route.split('/');
    let to;
    if (tab === 'watch' || document.querySelector('.later')) { App.exitApp(); return; }
    if (tab === 'show') to = 'series';
    else if (tab === 'creator') to = 'character';
    else if (sub) to = tab;
    else to = 'watch';
    window.location.replace('#/' + to);
  });
}
