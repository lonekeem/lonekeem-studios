// One dynamic import from src/main.js: adds the "Multiplayer (Beta)" button to the title menu. Story mode code is untouched.
export function install() {
  const menu = document.querySelector('#title .menu'); if (!menu || document.getElementById('btnMP')) return;
  const b = document.createElement('button'); b.id = 'btnMP'; b.textContent = 'Multiplayer (Beta)'; const anchor = document.getElementById('btnSurvival'); anchor ? anchor.after(b) : menu.prepend(b);
  const title = document.getElementById('title');
  const show = () => title.classList.remove('hidden');
  b.addEventListener('click', async () => {
    title.classList.add('hidden');
    { const PR = await import('./profile.js'); if (!PR.hasProfile()) { const { openProfile } = await import('./profileui.js'); const p = await openProfile({ mode: 'auto' }); if (!p) { show(); return; } const tw = await import('./town/town.js'); tw.enterTown({ look: p.look, onExit: show }); return; } } // v1.9.28: first time online = sign in or create a profile
    const mod = await import('./creator.js');
    const c = await mod.openCreator({ onClose: show, onPlay: async look => { const tw = await import('./town/town.js'); tw.enterTown({ look, onExit: show }); } });
    window.__mpCreator = c;
  });
  // back from the Google redirect: reopen the multiplayer menu so the sign-in shows up straight away
  try { if (sessionStorage.getItem('atq.mp.resume')) { sessionStorage.removeItem('atq.mp.resume'); setTimeout(() => b.click(), 800); } } catch (e) { /* ignore */ }
}
