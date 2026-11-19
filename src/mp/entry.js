// One dynamic import from src/main.js: adds the "Multiplayer (Beta)" button to the title menu. Story mode code is untouched.
export function install() {
  const menu = document.querySelector('#title .menu'); if (!menu || document.getElementById('btnMP')) return;
  const b = document.createElement('button'); b.id = 'btnMP'; b.textContent = 'Multiplayer (Beta)'; const anchor = document.getElementById('btnSurvival'); anchor ? anchor.after(b) : menu.prepend(b);
  const title = document.getElementById('title');
  const show = () => title.classList.remove('hidden');
  b.addEventListener('click', async () => {
    title.classList.add('hidden'); const mod = await import('./creator.js');
    const c = await mod.openCreator({ onClose: show, onPlay: async look => { const tw = await import('./town/town.js'); tw.enterTown({ look, onExit: show }); } });
    window.__mpCreator = c;
  });
}
