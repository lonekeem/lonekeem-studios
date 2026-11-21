// One dynamic import from src/main.js: adds the "Multiplayer (Beta)" button to the title menu. Story mode code is untouched.
export function install() {
  const menu = document.querySelector('#title .menu'); if (!menu || document.getElementById('btnMP')) return;
  const b = document.createElement('button'); b.id = 'btnMP'; b.textContent = 'Free Roam Town (Beta)'; const pane = document.getElementById('paneOnline'); const anchor = document.getElementById('btnSurvival'); if (pane) pane.append(b); else if (anchor) anchor.after(b); else menu.prepend(b);
  const title = document.getElementById('title');
  const show = () => title.classList.remove('hidden');
  b.addEventListener('click', async () => { // v1.9.29: one profile layer - first time = sign in / create (new creator), then straight into town with the profile's character
    title.classList.add('hidden');
    const PR = await import('./profile.js'); const cloud = await import('./cloud.js');
    if (!PR.hasProfile()) { const p = await cloud.openProfileScreen('auto'); if (!p) { show(); return; } }
    const p = PR.getProfile(); const tw = await import('./town/town.js'); tw.enterTown({ look: Object.assign({}, p.look, { name: p.name }), onExit: show });
  });
  // back from the Google redirect: reopen the multiplayer menu so the sign-in shows up straight away
  try { if (sessionStorage.getItem('atq.mp.resume')) { sessionStorage.removeItem('atq.mp.resume'); setTimeout(() => b.click(), 800); } } catch (e) { /* ignore */ }
}
