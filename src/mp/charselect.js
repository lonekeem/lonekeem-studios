// Pre-match character select for online (Quick Join / Create Game / Practice Alone).
// Touch-friendly on short landscape phones. Story mode is not routed through here.
import { listPlayable, getActiveId, setActiveId, getPlayLook, upsertChar, removeChar, MAX_CHARS, KEEM_ID } from './chars.js';
import { openProfileScreen } from './cloud.js';
import { hasProfile } from './profile.js';

const CSS = `
#charSel{position:fixed;inset:0;z-index:80;display:flex;align-items:stretch;justify-content:center;background:rgba(4,10,7,.94);color:#e8efe4;font-family:system-ui,-apple-system,sans-serif;padding:max(8px,env(safe-area-inset-top)) 10px max(8px,env(safe-area-inset-bottom));}
#charSel .box{width:min(960px,100%);height:100%;display:flex;flex-direction:column;gap:8px;min-height:0}
#charSel h2{margin:0;font:700 16px system-ui;letter-spacing:.12em;text-transform:uppercase;color:#7fd49a;flex:none}
#charSel .sub{margin:0;font-size:13px;opacity:.8;flex:none}
#charSel .scroller{flex:1 1 auto;min-height:0;overflow:auto;-webkit-overflow-scrolling:touch;display:flex;gap:10px;align-items:stretch;padding:4px 2px 8px}
#charSel .card{flex:0 0 auto;width:min(200px,42vw);min-width:148px;display:flex;flex-direction:column;align-items:center;gap:6px;padding:10px 8px;border-radius:14px;border:1px solid #1d3a28;background:rgba(8,22,14,.92);color:inherit;text-align:center;min-height:0}
#charSel .card.sel{border-color:#7fd49a;box-shadow:0 0 0 2px rgba(127,212,154,.35);background:rgba(47,107,69,.4)}
#charSel .av{width:64px;height:64px;border-radius:50%;display:flex;align-items:center;justify-content:center;font:800 28px system-ui;color:#eafff0;border:2px solid #2a4a34;flex:none}
#charSel .nm{font:700 15px system-ui;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
#charSel .tag{font-size:11px;letter-spacing:.06em;text-transform:uppercase;opacity:.7}
#charSel .row{display:flex;gap:6px;width:100%;justify-content:center;flex-wrap:wrap;margin-top:auto}
#charSel .row button,#charSel .foot button,#charSel .card.create{min-height:40px;padding:6px 10px;border-radius:10px;border:1px solid #2a4a34;background:#0d2a18;color:#dfe;font:600 13px system-ui}
#charSel .foot button.pri,#charSel .card .pri{background:linear-gradient(180deg,rgba(64,140,92,.95),rgba(30,84,52,.95));border-color:#7fd49a;color:#eafff0}
#charSel .card.create{width:min(180px,38vw);min-width:132px;justify-content:center;font-size:15px}
#charSel .foot{display:flex;gap:8px;flex:none;justify-content:flex-end;align-items:center}
#charSel .foot .sp{flex:1}
#charSel .foot button{min-width:96px;min-height:44px;font-size:15px}
@media (min-aspect-ratio:4/3) and (max-height:430px){
  #charSel{padding:4px 8px}
  #charSel h2{font-size:14px}
  #charSel .sub{display:none}
  #charSel .av{width:48px;height:48px;font-size:22px}
  #charSel .card{padding:6px;width:min(170px,36vw)}
  #charSel .foot button,#charSel .row button{min-height:36px}
}
`;

const el = (t, a = {}, ...kids) => {
  const n = document.createElement(t);
  for (const k in a) {
    if (k === 'cls') n.className = a[k];
    else if (k === 'on') for (const ev in a.on) n.addEventListener(ev, a.on[ev]);
    else if (k === 'html') n.innerHTML = a[k];
    else if (k === 'style' && typeof a[k] === 'object') Object.assign(n.style, a[k]);
    else n.setAttribute(k, a[k]);
  }
  for (const c of kids.flat()) if (c != null && c !== false) n.append(c.nodeType ? c : document.createTextNode(c));
  return n;
};

const hue = (name) => { let h = 0; for (const c of String(name || '?')) h += c.charCodeAt(0); return h * 47 % 360; };
const skinBg = (c) => {
  if (c.kind === 'keem') return 'hsl(28 40% 32%)';
  const s = c.sel && c.sel.skin; if (s) return s;
  return `hsl(${hue(c.name)} 35% 32%)`;
};

/**
 * Show the picker. Resolves with { id, look } to play, or null if cancelled.
 * If the player has no profile yet, they are sent through profile create first.
 */
export function pickCharacter() {
  return new Promise(async (resolve) => {
    if (!hasProfile()) {
      const made = await openProfileScreen('auto');
      if (!made) { resolve(null); return; }
      if (made && made.name) upsertChar({ name: made.name, sel: made.sel, look: made.look });
    }
    if (!document.getElementById('charSel-css')) document.head.append(el('style', { id: 'charSel-css' }, CSS));
    const root = el('div', { id: 'charSel', role: 'dialog', 'aria-label': 'Choose your character' });
    document.body.append(root);
    let selected = getActiveId();
    let done = false;
    const finish = (val) => {
      if (done) return; done = true;
      root.remove();
      resolve(val);
    };
    const play = () => {
      setActiveId(selected);
      finish({ id: selected, look: getPlayLook(selected) });
    };
    const cancel = () => finish(null);

    const render = () => {
      const list = listPlayable();
      if (!list.some(c => c.id === selected)) selected = getActiveId();
      root.innerHTML = '';
      const box = el('div', { cls: 'box' });
      box.append(el('h2', {}, 'Choose your character'), el('p', { cls: 'sub' }, 'This is who you play as online. Story mode is always Keem.'));
      const sc = el('div', { cls: 'scroller' });
      for (const c of list) {
        const card = el('button', { cls: 'card' + (c.id === selected ? ' sel' : ''), type: 'button', 'data-id': c.id, 'data-kind': c.kind, on: { click: () => { selected = c.id; render(); } } });
        card.append(
          el('div', { cls: 'av', style: { background: skinBg(c) } }, (c.name || '?').trim()[0].toUpperCase()),
          el('div', { cls: 'nm' }, c.name || 'Survivor'),
          el('div', { cls: 'tag' }, c.kind === 'keem' ? 'Story look' : 'Your character')
        );
        if (c.kind === 'keem') {
          card.append(el('div', { cls: 'row' }, el('span', { cls: 'tag', style: { opacity: '1', color: '#f0c070' } }, 'Play as Keem')));
        } else {
          card.append(el('div', { cls: 'row' },
            el('button', { type: 'button', on: { click: (e) => { e.stopPropagation(); edit(c.id); } } }, 'Edit'),
            el('button', { type: 'button', on: { click: (e) => { e.stopPropagation(); if (confirm('Delete ' + (c.name || 'this character') + '?')) { removeChar(c.id); if (selected === c.id) selected = getActiveId(); render(); } } } }, 'Delete')
          ));
        }
        sc.append(card);
      }
      if (list.filter(c => c.kind === 'custom').length < MAX_CHARS) {
        sc.append(el('button', { cls: 'card create', type: 'button', on: { click: () => createNew() } }, '+ Create new'));
      }
      box.append(sc);
      const foot = el('div', { cls: 'foot' },
        el('div', { cls: 'sp' }),
        el('button', { type: 'button', on: { click: cancel }, id: 'charSelCancel' }, 'Cancel'),
        el('button', { cls: 'pri', type: 'button', on: { click: play }, id: 'charSelPlay' }, selected === KEEM_ID ? 'Play as Keem' : 'Play')
      );
      box.append(foot);
      root.append(box);
    };

    async function edit(id) {
      root.style.display = 'none';
      const { openProfile } = await import('./profileui.js');
      const p = await openProfile({ mode: 'edit', slotId: id });
      root.style.display = '';
      if (p) {
        upsertChar({ id, name: p.name, sel: p.sel, look: p.look });
        selected = id;
      }
      render();
    }
    async function createNew() {
      root.style.display = 'none';
      const { openProfile } = await import('./profileui.js');
      const p = await openProfile({ mode: 'create', asNew: true });
      root.style.display = '';
      if (p) {
        const slot = upsertChar({ name: p.name, sel: p.sel, look: p.look });
        if (slot) selected = slot.id;
      }
      render();
    }

    render();
    window.__atqCharSel = { get selected() { return selected; }, select(id) { selected = id; render(); }, play, cancel, list: () => listPlayable() };
  });
}
