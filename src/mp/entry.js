// One dynamic import from src/main.js: adds the "Multiplayer (Beta)" button to the title menu. Story mode code is untouched.
export function install() {
  const menu = document.querySelector('#title .menu'); if (!menu || document.getElementById('btnMP')) return;
  const b = document.createElement('button'); b.id = 'btnMP'; b.textContent = 'Free Roam Town (Beta)'; const pane = document.getElementById('paneOnline'); const anchor = document.getElementById('btnSurvival'); if (pane) pane.append(b); else if (anchor) anchor.after(b); else menu.prepend(b);
  const title = document.getElementById('title');
  const show = () => title.classList.remove('hidden');
  b.addEventListener('click', async () => {
    title.classList.add('hidden'); const mod = await import('./creator.js');
    const c = await mod.openCreator({ onClose: show, onPlay: async look => { const tw = await import('./town/town.js'); tw.enterTown({ look, onExit: show }); } });
    window.__mpCreator = c;
  });
  // back from the Google redirect: reopen the multiplayer menu so the sign-in shows up straight away
  try { if (sessionStorage.getItem('atq.mp.resume')) { sessionStorage.removeItem('atq.mp.resume'); setTimeout(() => b.click(), 800); } } catch (e) { /* ignore */ }
}
