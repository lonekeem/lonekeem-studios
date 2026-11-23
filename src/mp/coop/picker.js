// Mode picker for Create Game / Practice Alone: Survival (free roam town) or one of the co-op missions. Plain DOM, phone-landscape friendly.
import { MISSIONS } from './missions.js';
export const COOP_MAX = 4;
const CSS = `#coopPick{position:fixed;inset:0;z-index:90;background:#050b08ee;display:flex;align-items:safe center;justify-content:safe center;overflow:auto;font-family:system-ui,sans-serif;color:#fff;padding:max(8px,env(safe-area-inset-top)) max(8px,env(safe-area-inset-right)) max(8px,env(safe-area-inset-bottom)) max(8px,env(safe-area-inset-left));box-sizing:border-box}
#coopPick .cp{width:min(720px,94vw);max-height:100%;display:flex;flex-direction:column;background:linear-gradient(#1d2b22,#121a15);border:1px solid #ffd34a66;border-radius:18px;box-shadow:0 10px 40px #000a;box-sizing:border-box;padding:10px 12px;margin:auto}
#coopPick .cph{display:flex;align-items:center;gap:10px;margin-bottom:8px}#coopPick .cph h2{flex:1;margin:0;font:800 16px system-ui;letter-spacing:.04em;color:#ffd34a}#coopPick .cph button{font:600 13px system-ui;color:#fff;background:#2b3a30;border:1px solid #ffffff44;border-radius:10px;min-height:40px;padding:6px 14px}
#coopPick .cl{overflow:auto;display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px;padding:2px}
#coopPick .co{display:flex;gap:10px;align-items:center;text-align:left;font:inherit;color:#fff;background:#ffffff10;border:1px solid #ffffff2a;border-radius:14px;padding:10px 12px;min-height:64px}
#coopPick .co:active,#coopPick .co:focus-visible{border-color:#ffd34a;background:#ffd34a22}#coopPick .co .ci{font-size:26px;width:38px;text-align:center}
#coopPick .co b{display:block;font-size:14px}#coopPick .co span{display:block;font-size:11.5px;opacity:.78;line-height:1.3}#coopPick .co.sv{border-color:#7cf29a66}#coopPick .co .cr{display:inline;color:#ffd34a;font-weight:700}
#coopPick .sub{font-size:11.5px;opacity:.7;margin:2px 2px 8px}
@media (max-height:420px){#coopPick .cph{margin-bottom:4px}#coopPick .cph h2{font-size:15px;color:#ffd34a}#coopPick .cph button{min-height:36px;padding:4px 12px}#coopPick .sub{margin:0 2px 6px}#coopPick .co{min-height:52px;padding:8px 10px}#coopPick .cl{gap:6px}}`;
/** Shows the picker. Resolves { mission: null } for Survival, { mission: id } for a co-op mission, or null when cancelled. */
export function pickMode({ title = 'Create Game', practice = false } = {}) {
  if (!document.getElementById('coopPick-css')) document.head.append(Object.assign(document.createElement('style'), { id: 'coopPick-css', textContent: CSS }));
  return new Promise(res => {
    const el = document.createElement('div'); el.id = 'coopPick'; el.setAttribute('role', 'dialog');
    el.innerHTML = `<div class="cp"><div class="cph"><h2>${title.toUpperCase()} · PICK A MODE</h2><button data-x="1">Cancel</button></div>
      <div class="sub">${practice ? 'Play any mode on your own. Co-op missions give a second wind when you play alone.' : 'Survival is the open town for up to 8 players. Co-op missions are short team jobs for 1–4 players.'}</div>
      <div class="cl"><button class="co sv" data-m=""><span class="ci">🧟</span><span><b>Survival · free roam</b><span>Loot, drive and survive in Quiet Falls${practice ? '' : ' · up to 8 players'}</span></span></button>
      ${MISSIONS.map(m => `<button class="co" data-m="${m.id}"><span class="ci">${m.icon}</span><span><b>${m.name}</b><span>Co-op · 1–4 players · ${m.mins} min · <span class="cr">$${m.reward}</span></span></span></button>`).join('')}</div></div>`;
    const done = v => { el.remove(); res(v); };
    el.addEventListener('click', e => { if (e.target === el) return done(null); const b = e.target.closest('button'); if (!b) return; if (b.dataset.x) return done(null); if (b.dataset.m != null) done({ mission: b.dataset.m || null }); });
    document.body.append(el);
  });
}
export const missionLabel = id => { const m = MISSIONS.find(x => x.id === id); return m ? `${m.icon} Co-op · ${m.name}` : 'Quiet Falls · free roam'; };
