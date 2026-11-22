// One dynamic import from src/main.js: keeps #btnMP for compatibility, hidden on the simplified menu.
// Visible path is World Lobby (Create Game / Quick Join / Practice Alone). Story mode code is untouched.
export function install() {
  const menu = document.querySelector('#title .menu'); if (!menu || document.getElementById('btnMP')) return;
  const b = document.createElement('button'); b.id = 'btnMP'; b.textContent = 'Free Roam Town (Beta)';
  b.className = 'hidden'; b.tabIndex = -1; b.setAttribute('aria-hidden', 'true');
  const pane = document.getElementById('paneOnline'); if (pane) pane.append(b); else menu.append(b);
  const title = document.getElementById('title');
  const show = () => title.classList.remove('hidden');
  b.addEventListener('click', async () => {
    title.classList.add('hidden');
    const PR = await import('./profile.js'); const cloud = await import('./cloud.js');
    if (!PR.hasProfile()) { const p = await cloud.openProfileScreen('auto'); if (!p) { show(); return; } }
    const p = PR.getProfile(); const tw = await import('./town/town.js'); tw.enterTown({ look: Object.assign({}, p.look, { name: p.name }), solo: true, onExit: show });
  });
  // back from the Google redirect: reopen the multiplayer menu so the sign-in shows up straight away
  try { if (sessionStorage.getItem('atq.mp.resume')) { sessionStorage.removeItem('atq.mp.resume'); setTimeout(() => b.click(), 800); } } catch (e) { /* ignore */ }
}
