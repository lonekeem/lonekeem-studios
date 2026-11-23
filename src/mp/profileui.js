import { googleAllowed } from '../ui/gate.js';
// v1.9.28 Profile + character creator screen. First time online: Sign in with Google (load a saved profile) or Create profile, then a
// step-by-step creator (name -> skin & eyes -> face -> hair -> outfit -> extras) with a big rotating preview of the multiplayer avatar.
// Later visits open the same screen in edit mode (steps become tabs). All data goes through profile.js (getProfile / saveProfile).
import * as THREE from 'three';
import { loadBase, Avatar } from './avatar.js';
import { dress } from './dress.js';
import { animate } from './anim.js';
import * as K from './look.js';
import { applySel, ALL_PARTS } from './storeLook.js';
import { getProfile, saveProfile, hasProfile, pullProfile, DEFAULT_SEL } from './profile.js';
import { upsertChar, setActiveId, getChar, KEEM_ID } from './chars.js';
import { OUTFITS, OUTFIT, HAIRS, HAIR_COLORS, SKINS, FACES, BEARDS, EYES } from '../game/looks.js';
import * as COS from './cosmetics.js';
import * as C from './catalog.js';
import { poseChair } from './chair.js';

const CSS = `
#prof{position:fixed;inset:0;z-index:70;display:flex;flex-direction:column;background:radial-gradient(120% 100% at 30% 20%,#23332b 0%,#0d1411 70%);color:#eef2ee;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;user-select:none}
#prof *{box-sizing:border-box}#prof button{font:inherit;color:inherit;cursor:pointer}
#prof .top{display:flex;align-items:center;gap:10px;padding:10px 14px 6px}#prof .top h2{margin:0;font-size:19px;letter-spacing:.4px;color:#9fe0b4;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#prof .cash{background:#16241c;border:1px solid #2f5a40;border-radius:999px;padding:5px 12px;font-weight:700;color:#ffd77a;font-size:14px;white-space:nowrap}
#prof .x{background:none;border:1px solid #2f4a3a;border-radius:10px;padding:6px 12px}
#prof .steps{display:flex;gap:6px;padding:0 14px 8px;overflow-x:auto;scrollbar-width:none}#prof .steps::-webkit-scrollbar{display:none}
#prof .steps button{flex:none;background:#14201a;border:1px solid #2a3e32;border-radius:999px;padding:6px 12px;font-size:13px;color:#b9cbbf}
#prof .steps button.on{background:#3d8f5c;border-color:#5fc086;color:#fff;font-weight:700}#prof .steps button.done{color:#8fd8a8}
#prof .main{flex:1;display:flex;min-height:0;gap:10px;padding:0 14px 10px}
#prof .stage{flex:1 1 48%;position:relative;min-width:0;border-radius:18px;background:radial-gradient(90% 80% at 50% 40%,#2e4638 0%,#121c17 75%);border:1px solid #24382c;overflow:hidden}
#prof .stage canvas{width:100%;height:100%;display:block;touch-action:none}#prof .stage .hint{position:absolute;bottom:8px;left:0;right:0;text-align:center;font-size:12px;color:#8aa596;pointer-events:none}
#prof .stage .nm{position:absolute;top:10px;left:12px;font-weight:800;font-size:16px;text-shadow:0 2px 6px #000;background:#0008;border-radius:8px;padding:3px 10px}#prof .stage .nm:empty{display:none}
#prof .side{flex:1 1 52%;display:flex;flex-direction:column;min-width:0;min-height:0;background:#101a15;border:1px solid #22362a;border-radius:18px}
#prof .side h3{margin:0;padding:12px 14px 2px;font-size:16px}#prof .side .sub{padding:0 14px 8px;font-size:12.5px;color:#8fa898}
#prof .body{flex:1;overflow-y:auto;padding:4px 12px 12px;min-height:0}
#prof .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(112px,1fr));gap:8px}
#prof .card{position:relative;text-align:left;background:#17251d;border:1.5px solid #2a4033;border-radius:12px;padding:8px 9px;min-height:48px;display:flex;flex-direction:column;gap:5px}
#prof .card.on{border-color:#6fd394;background:#1d3526;box-shadow:0 0 0 2px #6fd39433}#prof .card.lock{opacity:.62}
#prof .card,#prof .welcome button,#prof .steps button{color:#eef2ee;opacity:1}#prof .welcome .g{color:#222}#prof .card b{font-size:13.5px;line-height:1.15}#prof .chips{display:flex;height:12px;border-radius:4px;overflow:hidden;border:1px solid #0006}#prof .chips i{flex:1}
#prof .tag{font-style:normal;opacity:1;align-self:flex-start;font-size:11px;font-weight:700;border-radius:999px;padding:2px 8px;background:#2a3a31;color:#c9d6ce}
#prof .tag.wear{background:#3d8f5c;color:#fff}#prof .tag.price{background:#4a3a12;color:#ffd77a}#prof .tag.lockt{background:#4a1e1e;color:#ffb0a8}#prof .tag.own{background:#23402f;color:#9fe0b4}
#prof .lbl{margin:12px 2px 6px;font-size:12px;letter-spacing:.6px;text-transform:uppercase;color:#8fa898}
#prof .sws{display:flex;flex-wrap:wrap;gap:8px}#prof .sw{width:38px;height:38px;border-radius:50%;border:3px solid #0000;box-shadow:0 0 0 1px #0008 inset}#prof .sw.on{border-color:#fff;box-shadow:0 0 0 2px #6fd394}
#prof .foot{opacity:1;font:inherit;text-align:center;flex:none;display:flex;gap:8px;padding:10px 12px;border-top:1px solid #22362a}#prof .foot button{flex:1;border-radius:12px;padding:11px;font-weight:700;font-size:15px;background:#1d2b23;border:1px solid #2f4a3a;color:#eef2ee;opacity:1}
#prof .foot button.pri{background:#3d8f5c;border-color:#5fc086;color:#fff}#prof input.name{width:100%;font:inherit;font-size:20px;font-weight:700;color:#fff;background:#0c1410;border:1.5px solid #2f5a40;border-radius:12px;padding:12px 14px;outline:none}
#prof .welcome{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:16px;text-align:center}
#prof .welcome h1{margin:0;font-size:28px;color:#9fe0b4}#prof .welcome p{margin:0 0 6px;color:#9fb3a6;max-width:420px}
#prof .welcome button{width:min(340px,90%);border-radius:14px;padding:14px;font-size:16px;font-weight:700;background:#1d2b23;border:1px solid #2f4a3a}
#prof .welcome .g{background:#fff;color:#222;border-color:#fff}#prof .welcome .pri{background:#3d8f5c;border-color:#5fc086}#prof .welcome .note{font-size:12.5px;color:#7f998a}
#prof .subs{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 8px}#prof .subs button{background:#14201a;border:1px solid #2a3e32;border-radius:999px;padding:5px 10px;font-size:12px;color:#b9cbbf}#prof .subs button.on{background:#3d8f5c;border-color:#5fc086;color:#fff;font-weight:700}
@media (orientation:portrait){#prof .main{flex-direction:column}#prof .stage{flex:0 0 40%}#prof .grid{grid-template-columns:repeat(auto-fill,minmax(110px,1fr))}}
`;
const el = (tag, props = {}, ...kids) => { const e = document.createElement(tag); for (const [k, v] of Object.entries(props)) { if (k === 'cls') e.className = v; else if (k === 'on') for (const [ev, fn] of Object.entries(v)) e.addEventListener(ev, fn); else if (k === 'style') e.style.cssText = v; else e[k] = v; } for (const c of kids.flat()) if (c != null && c !== false) e.append(c.nodeType ? c : document.createTextNode(String(c))); return e; };
const STEPS = [['name', 'Name'], ['skin', 'Skin & eyes'], ['face', 'Face'], ['hair', 'Hair'], ['outfit', 'Outfits'], ['clothes', 'Clothes'], ['extra', 'Accessories']];
const SUB = { name: 'This is what other players see above your head.', skin: 'Pick a skin tone and eye colour. You can also pick a body.', face: 'Face shape, eyes, brows, nose, mouth, makeup and facial hair.', hair: 'Hairstyle and colour, including dyed looks.', outfit: 'Ready-made outfits. Free ones plus ones you buy with shared cash.', clothes: 'Shirts, jackets, pants and shoes. Some are free, some you buy in the Store.', extra: 'Hats, glasses, earrings, piercings, chains, a wheelchair, backpack and build.' };
const NAMES = ['Ash', 'Rook', 'Juno', 'Dex', 'Nova', 'Kai', 'Mars', 'Sage', 'Rio', 'Zuri', 'Blaze', 'Echo', 'Onyx', 'Ivy', 'Jett', 'Remy'];
const CLOSE = { skin: 1, face: 1, hair: 1, extra: 1 };

// mode: 'auto' (welcome + create when there is no profile, else edit) | 'create' | 'edit'.  Resolves with the saved profile or null (closed).
export function openProfile({ mode = 'auto', onSignIn, slotId, asNew } = {}) {
  return new Promise(async (resolve) => {
    if (!document.getElementById('prof-css')) document.head.append(el('style', { id: 'prof-css' }, CSS));
    if (mode === 'auto' && !asNew && !slotId) mode = hasProfile() ? 'edit' : 'welcome';
    const P0 = getProfile(); let sel = Object.assign({}, DEFAULT_SEL, (P0 && P0.sel) || readOldSel()); let name = (P0 && P0.name) || ''; let base = (P0 && P0.look) || K.loadLook() || K.defaultLook('mp_m1');
    let touched = new Set(P0 && K.loadLook() ? [] : ALL_PARTS); let step = 0; const done = new Set();
    if (asNew) { mode = 'create'; sel = Object.assign({}, DEFAULT_SEL); name = ''; base = K.defaultLook('mp_m1'); touched = new Set(ALL_PARTS); }
    else if (slotId && slotId !== KEEM_ID) { const ch = getChar(slotId); if (ch) { mode = mode === 'auto' ? 'edit' : mode; sel = Object.assign({}, DEFAULT_SEL, ch.sel || {}); name = ch.name || name; base = ch.look || base; touched = new Set(ALL_PARTS); } }
    const wallet = () => { const s = (window.__atq && window.__atq.save) || {}; return s; };
    const root = el('div', { id: 'prof' }); document.body.append(root);
    let renderer = null, scene, cam, av = null, gen = 0, running = true, rot = 0, swayT = 0, drag = null, zoom = 0, t = 0, last = performance.now(), auto = true;
    const finish = (p) => { running = false; try { renderer && renderer.dispose(); av && av.dispose(); } catch (e) { /* ignore */ } root.remove(); resolve(p); };

    function welcome() { root.innerHTML = '';
      const w = el('div', { cls: 'welcome' }, el('h1', {}, 'Play online'), el('p', {}, 'Make a profile for your own survivor. Your character, cash and items save to it.'));
      const gBtn = googleAllowed() ? el('button', { cls: 'g', on: { click: async () => { gBtn.disabled = true; gBtn.textContent = 'Opening Google…'; try { if (onSignIn) await onSignIn(); else { const o = await import('./online.js'); await o.signInGoogle(); } } catch (e) { gBtn.disabled = false; gBtn.textContent = 'Sign in with Google'; note.textContent = 'Google sign-in is not available right now. You can still create a profile on this device.'; } } } }, 'Sign in with Google') : null;
      const note = el('div', { cls: 'note' }, googleAllowed() ? 'Signed in: your profile loads on any phone or computer. Guest: it saves on this device only.' : 'This profile saves on this device only.');
      w.append(...[gBtn, el('button', { cls: 'pri', on: { click: () => { mode = 'create'; build(); } } }, 'Create profile'), el('button', { on: { click: () => finish(null) } }, 'Not now'), note].filter(Boolean)); root.append(w);
      if (googleAllowed()) import('./online.js').then(async o => { const u = await o.getUser().catch(() => null); if (!u || !running) return; const p = await pullProfile(u).catch(() => null); if (p && running) { finish(p); return; }
        if (gBtn) { gBtn.textContent = '✓ Signed in as ' + ((u.user_metadata && u.user_metadata.name) || u.email || 'Google'); gBtn.disabled = true; } if (!name && u.user_metadata && u.user_metadata.name) name = String(u.user_metadata.name).split(' ')[0]; }).catch(() => {});
    }
    if (mode === 'welcome') { welcome(); return; }
    build();

    function build() { root.innerHTML = '';
      const top = el('div', { cls: 'top' }, el('h2', {}, mode === 'create' ? 'Create your profile' : 'Your profile'), el('div', { cls: 'cash', id: 'profCash' }), el('button', { cls: 'x', on: { click: () => finish(null) } }, mode === 'create' ? 'Cancel' : 'Close'));
      { // admin (Keem's own account) only: play online as the real story Keem (story look + voice) instead of the custom character; the custom one is saved and kept, so he can switch back on any visit
        const kb = el('button', { cls: 'keemBtn', style: 'display:none;background:#b8741c;border:1px solid #e0a050;color:#fff;border-radius:8px;padding:6px 12px;font-weight:700;margin-left:auto;margin-right:8px', on: { click: () => { const p = saveProfile({ name: name || 'Survivor', sel, look: look() }); finish(Object.assign({}, p, { playAsKeem: true, look: Object.assign({}, p.look, { exclusive: 'skin.keem_story', name: 'Keem' }) })); } } }, '★ Play as Keem');
        top.insertBefore(kb, top.lastChild); window.__profKeemBtn = kb;
        import('./online.js').then(async o => { const u = await o.getUser().catch(() => null); const r = u ? await o.getRole().catch(() => null) : null; const local = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
          if (r === 'admin' || (local && window.__MP_FORCE_ADMIN)) kb.style.display = ''; }).catch(() => {}); }
      const stepsEl = el('div', { cls: 'steps' }); const stage = el('div', { cls: 'stage' }); const canvas = el('canvas'); const nm = el('div', { cls: 'nm' }); stage.append(canvas, nm, el('div', { cls: 'hint' }, 'Drag to turn'));
      const side = el('div', { cls: 'side' }); const h3 = el('h3'); const sub = el('div', { cls: 'sub' }); const body = el('div', { cls: 'body' }); const foot = el('div', { cls: 'foot' }); side.append(h3, sub, body, foot);
      root.append(top, stepsEl, el('div', { cls: 'main' }, stage, side));
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1)); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping;
      scene = new THREE.Scene(); scene.add(new THREE.HemisphereLight('#e8f0ff', '#4a5248', 1.05)); const k = new THREE.DirectionalLight('#fff4e6', 2.05); k.position.set(1.4, 2.5, 3); scene.add(k); const fill = new THREE.DirectionalLight('#c9e4ff', .7); fill.position.set(-2.2, 1.8, 1.6); scene.add(fill); const rim = new THREE.DirectionalLight('#ffe6d2', 1.35); rim.position.set(-1.2, 2.2, -3.2); scene.add(rim);
      const floor = new THREE.Mesh(new THREE.CircleGeometry(.7, 48), new THREE.MeshStandardMaterial({ color: '#1f3328', roughness: 1 })); floor.rotation.x = -Math.PI / 2; scene.add(floor);
      cam = new THREE.PerspectiveCamera(30, 1, .05, 30);
      canvas.addEventListener('pointerdown', e => { drag = e.clientX; auto = false; canvas.setPointerCapture(e.pointerId); }); canvas.addEventListener('pointermove', e => { if (drag != null) { rot += (e.clientX - drag) * .012; drag = e.clientX; } }); canvas.addEventListener('pointerup', () => { drag = null; });
      const frame = (now) => { if (!running) return; requestAnimationFrame(frame); const dt = Math.min(.05, (now - last) / 1000); last = now; t += dt; const w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h) return;
        if (canvas.width !== Math.floor(w * renderer.getPixelRatio())) { renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
        if (auto) { swayT += dt; rot = .45 * Math.sin(swayT * .5); } /* gentle sway around the FRONT: never drifts to the back, even after a slow load / Google redirect */ const zf = CLOSE[STEPS[step][0]] ? 1 : 0; zoom += (zf - zoom) * Math.min(1, dt * 5); const s = av ? av.root.scale.y : 1; const fit = Math.max(1, .9 / cam.aspect);
        if (av) { av.root.rotation.y = rot; try { animate(av, t, 0); } catch (e) { /* ignore */ } try { if (look().acc && look().acc.chair) poseChair(av, t); } catch (e) { /* ignore */ } } cam.position.set(0, (1.0 + zoom * .56) * s, (3.9 - zoom * 2.0) * fit); cam.lookAt(0, (.9 + zoom * .6) * s, 0); renderer.render(scene, cam); };
      requestAnimationFrame(frame);
      const look = () => { const L = applySel(base, sel, [...touched], OUTFIT); L.name = name || 'Survivor'; return L; };
      const rebuild = async () => { const L = look(); const g = ++gen; const tpl = await loadBase(L.base); if (g !== gen || !running) return; if (!av || av.tpl !== tpl) { if (av) { scene.remove(av.root); av.dispose(); } av = new Avatar(tpl); scene.add(av.root); } try { dress(av, L); } catch (e) { console.error('dress', e); } };
      const set = (part, fn) => { if (fn() === false) return; touched.add(part); rebuild(); render(); };
      const card = (title, { on, tag, tagCls = '', chips, lock, click }) => el('button', { cls: 'card' + (on ? ' on' : '') + (lock ? ' lock' : ''), on: { click } }, chips ? el('div', { cls: 'chips' }, chips.map(c => el('i', { style: 'background:' + c }))) : null, el('b', {}, title), tag ? el('span', { cls: 'tag ' + tagCls }, tag) : null);
      const swatches = (key, arr, part) => el('div', { cls: 'sws' }, arr.map(c => el('button', { cls: 'sw' + (sel[key] === c ? ' on' : ''), style: 'background:' + c, title: c, on: { click: () => set(part, () => { sel[key] = c; }) } })));
      const owned = (o) => !o.price || ((wallet().outfits || []).includes(o.id));
      sel.parts = sel.parts || {};
      let clothSub = 'top', accSub = 'hat', faceSub = 'shape';
      const buyPiece = (id) => { const W = wallet(); if (COS.ownedCosmetic(W, id)) return true; const p = COS.priceOf(id); if ((W.cash | 0) < p) { toast(`You need $${p}. Earn cash in Story, Survival or Online.`); return false; } if (!confirm(`Buy ${COS.itemName(id)} for $${p} (in-game cash)?`)) return false; COS.buyCosmetic(W, id); saveProfile({ cash: W.cash, cosmetics: W.cosmetics }, { silent: true }); try { window.__atq.audio.pickup(); } catch (e) { /* ignore */ } return true; };
      const wearId = (slot) => { const v = sel.parts[slot]; if (v == null) return null; return typeof v === 'string' ? v : v.id; };
      const pickPiece = (slot, id, extra) => set('clothes', () => { if (id && id !== 'none' && !buyPiece(id)) return false; sel.parts = sel.parts || {}; sel.parts[slot] = (id == null || id === 'none') ? 'none' : id; if (extra && extra.mirror) sel.parts[extra.mirror] = sel.parts[slot]; if (slot === 'glasses') sel.glasses = id !== 'none'; if (slot === 'chair' && id === 'chair') { /* mobility aid */ } });
      const pieceCards = (list, slot, { none = true, current, extra } = {}) => {
        const W = wallet(); const cur = current != null ? current : wearId(slot); const items = [];
        if (none) items.push(['none', 'None']);
        for (const row of list) items.push([row[0], row[1]]);
        return el('div', { cls: 'grid' }, items.map(([id, label]) => { const p = COS.priceOf(id), own = COS.ownedCosmetic(W, id), on = (id === 'none' ? (cur == null || cur === 'none') : cur === id);
          const tag = on ? 'Wearing' : own || !p ? (id === 'none' ? '' : 'Free') : '$' + p;
          return card(label, { on, lock: !own && p, tag: tag || undefined, tagCls: on ? 'wear' : (!own && p ? 'price' : 'own'), click: () => pickPiece(slot, id, extra) }); }));
      };
      const PAGES = {
        name: () => { const inp = el('input', { cls: 'name', value: name, maxLength: 18, placeholder: 'Your name', on: { input: e => { name = e.target.value; nm.textContent = name; } } }); setTimeout(() => { try { inp.focus(); } catch (e) { /* ignore */ } }, 50);
          return [inp, el('div', { cls: 'lbl' }, 'Ideas'), el('div', { cls: 'grid' }, NAMES.slice(0, 8).map(n => card(n, { click: () => { name = n; inp.value = n; nm.textContent = n; } })))]; },
        skin: () => [el('div', { cls: 'lbl' }, 'Body'), el('div', { cls: 'grid' }, [['mp_m1', 'Guy'], ['mp_f1', 'Girl']].map(([id, n]) => card(n, { on: (sel.base || 'mp_m1') === id, click: () => set('skin', () => { sel.base = id; base = Object.assign({}, base, { base: id }); }) }))),
          el('div', { cls: 'lbl' }, 'Skin tone'), swatches('skin', SKINS, 'skin'), el('div', { cls: 'lbl' }, 'Eye colour'), swatches('eyes', EYES, 'skin')],
        face: () => { const tabs = [['shape', 'Shape'], ['eyes', 'Eyes'], ['brows', 'Brows'], ['nose', 'Nose'], ['mouth', 'Mouth'], ['makeup', 'Makeup'], ['hairf', 'Facial hair']];
          const faceIdx = () => ({ keem: 0, soft: 1, strong: 2, narrow: 3, round: 4, sharp: 5, elder: 6 }[sel.face] );
          const curEye = sel.eyeShape != null ? sel.eyeShape : ({ keem: 0, soft: 1, strong: 11, narrow: 3, round: 7, sharp: 9, elder: 6 }[sel.face] || 0);
          const curBrow = sel.browStyle != null ? sel.browStyle : ({ keem: 3, soft: 0, strong: 8, narrow: 1, round: 0, sharp: 6, elder: 5 }[sel.face] || 0);
          const curNose = sel.noseStyle != null ? sel.noseStyle : ({ keem: 2, soft: 1, strong: 4, narrow: 7, round: 1, sharp: 7, elder: 3 }[sel.face] || 0);
          const curMouth = sel.mouthStyle != null ? sel.mouthStyle : ({ keem: 1, soft: 3, strong: 0, narrow: 2, round: 8, sharp: 7, elder: 2 }[sel.face] || 0);
          const mk = sel.makeup || { shadow: 0, liner: 0, blush: 0, lip: 0 };
          const section = {
            shape: () => [el('div', { cls: 'lbl' }, 'Face shape'), el('div', { cls: 'grid' }, Object.entries(FACES).map(([k, f]) => card(f.name === 'Keem' ? 'Classic' : f.name, { on: sel.face === k, click: () => set('face', () => { sel.face = k; sel.eyeShape = sel.browStyle = sel.noseStyle = sel.mouthStyle = undefined; }) })))],
            eyes: () => [el('div', { cls: 'lbl' }, 'Eye shape'), el('div', { cls: 'grid' }, C.EYES.map((e, i) => card(e[0], { on: curEye === i, click: () => set('face', () => { sel.eyeShape = i; }) }))),
              el('div', { cls: 'lbl' }, 'Eye size'), el('div', { cls: 'grid' }, [[-0.25, 'Small'], [0, 'Average'], [0.45, 'Large'], [0.8, 'Huge']].map(([v, n]) => card(n, { on: (sel.eyeSize || 0) === v, click: () => set('face', () => { sel.eyeSize = v; }) }))),
              el('div', { cls: 'lbl' }, 'Eye colour'), swatches('eyes', [...new Set([...(C.SWATCH.eye || []), ...EYES])], 'skin')],
            brows: () => [el('div', { cls: 'lbl' }, 'Brow shape'), el('div', { cls: 'grid' }, C.BROWS.map((e, i) => card(e[0], { on: curBrow === i, click: () => set('face', () => { sel.browStyle = i; }) })))],
            nose: () => [el('div', { cls: 'lbl' }, 'Nose'), el('div', { cls: 'grid' }, C.NOSES.map((e, i) => card(e[0], { on: curNose === i, click: () => set('face', () => { sel.noseStyle = i; }) })))],
            mouth: () => [el('div', { cls: 'lbl' }, 'Mouth'), el('div', { cls: 'grid' }, C.MOUTHS.map((e, i) => card(e[0], { on: curMouth === i, click: () => set('face', () => { sel.mouthStyle = i; }) })))],
            makeup: () => [el('div', { cls: 'lbl' }, 'Eyeshadow'), el('div', { cls: 'grid' }, C.MAKEUP.shadow.map((n, i) => card(n, { on: (mk.shadow || 0) === i, click: () => set('face', () => { sel.makeup = Object.assign({}, mk, { shadow: i }); }) }))),
              el('div', { cls: 'lbl' }, 'Eyeliner'), el('div', { cls: 'grid' }, C.MAKEUP.liner.map((n, i) => card(n, { on: (mk.liner || 0) === i, click: () => set('face', () => { sel.makeup = Object.assign({}, mk, { liner: i }); }) }))),
              el('div', { cls: 'lbl' }, 'Blush'), el('div', { cls: 'grid' }, C.MAKEUP.blush.map((n, i) => card(n, { on: (mk.blush || 0) === i, click: () => set('face', () => { sel.makeup = Object.assign({}, mk, { blush: i }); }) }))),
              el('div', { cls: 'lbl' }, 'Lipstick'), el('div', { cls: 'grid' }, C.MAKEUP.lipstick.map((n, i) => card(n, { on: (mk.lip || 0) === i, click: () => set('face', () => { sel.makeup = Object.assign({}, mk, { lip: i }); }) })))],
            hairf: () => [el('div', { cls: 'lbl' }, 'Beard'), el('div', { cls: 'grid' }, [['none', 'None'], ['stubble', 'Stubble'], ['mustache', 'Mustache'], ['goatee', 'Goatee'], ['full', 'Full beard'], ['boxed', 'Short boxed'], ['lumber', 'Big beard'], ['circle', 'Circle beard'], ['soul', 'Soul patch'], ['strap', 'Chin strap'], ['curtain', 'Chin curtain']].map(([k, n]) => card(n, { on: (sel.beard || 'none') === k, click: () => set('face', () => { sel.beard = k; }) }))),
              el('div', { cls: 'lbl' }, 'Mustache'), el('div', { cls: 'grid' }, C.STACHES.map(s => card(s[1], { on: (sel.stache || (sel.beard === 'mustache' ? 'chevron' : 'none')) === s[0], click: () => set('face', () => { sel.stache = s[0]; if (s[0] !== 'none' && (!sel.beard || sel.beard === 'none')) sel.beard = 'mustache'; }) })))],
          };
          return [el('div', { cls: 'subs' }, tabs.map(([k, n]) => el('button', { cls: faceSub === k ? 'on' : '', on: { click: () => { faceSub = k; render(); } } }, n))), ...section[faceSub]()]; },
        hair: () => [el('div', { cls: 'lbl' }, 'Colour'), swatches('hairColor', HAIR_COLORS, 'hair'), el('div', { cls: 'lbl' }, 'Style'), el('div', { cls: 'grid' }, Object.entries(HAIRS).map(([k, n]) => card(n, { on: sel.hair === k, click: () => set('hair', () => { sel.hair = k; }) })))],
        outfit: () => { const W = wallet(); const sorted = [...OUTFITS].sort((a, b) => (owned(b) - owned(a)) || ((a.price || 0) - (b.price || 0)));
          return [el('div', { cls: 'grid' }, sorted.map(o => { const own = owned(o), lockLv = !own && o.lvl && (W.level || 1) < o.lvl, wear = sel.outfit === o.id && !Object.keys(sel.parts || {}).length;
            return card(o.name, { on: wear, lock: !own, chips: [o.jacket || o.shirt, o.shirt, o.pants, o.shoes], tag: wear ? 'Wearing' : own ? 'Owned' : lockLv ? '🔒 Level ' + o.lvl : '$' + o.price, tagCls: wear ? 'wear' : own ? 'own' : lockLv ? 'lockt' : 'price',
              click: () => set('outfit', () => { if (!own) { if (lockLv) { toast(`Reach level ${o.lvl} to unlock ${o.name}.`); return false; } if ((W.cash | 0) < o.price) { toast(`You need $${o.price}. Earn cash in Story, Survival or Online.`); return false; } if (!confirm(`Buy ${o.name} for $${o.price} (in-game cash)?`)) return false;
                W.cash -= o.price; W.outfits = [...new Set([...(W.outfits || ['classic']), o.id])]; saveProfile({ cash: W.cash, owned: W.outfits }, { silent: true }); try { window.__atq.audio.pickup(); } catch (e) { /* ignore */ } } sel.outfit = o.id; sel.parts = {}; }) }); }))]; },
        clothes: () => { const tabs = [['top', 'Shirts'], ['jacket', 'Jackets'], ['pants', 'Pants'], ['shoes', 'Shoes']];
          const lists = { top: COS.catalogEntries('TOPS'), jacket: COS.catalogEntries('JACKETS'), pants: COS.catalogEntries('PANTS'), shoes: COS.catalogEntries('SHOES') };
          return [el('div', { cls: 'subs' }, tabs.map(([k, n]) => el('button', { cls: clothSub === k ? 'on' : '', on: { click: () => { clothSub = k; render(); } } }, n))), pieceCards(lists[clothSub], clothSub, { none: clothSub === 'jacket' })]; },
        extra: () => { const tabs = [['hat', 'Hats'], ['glasses', 'Glasses'], ['earL', 'Earrings'], ['pierce', 'Piercings'], ['neck', 'Chains'], ['chair', 'Mobility']];
          const lists = { hat: COS.catalogEntries('HATS'), glasses: COS.catalogEntries('GLASSES_LIST'), earL: COS.catalogEntries('EARRINGS'), pierce: COS.catalogEntries('PIERCINGS'), neck: COS.catalogEntries('NECKLACES'), chair: [['chair', 'Wheelchair']] };
          const pier = () => { const cur = new Set(Array.isArray(sel.parts.pierce) ? sel.parts.pierce : (sel.parts.pierce ? [sel.parts.pierce] : [])); const W = wallet();
            return el('div', { cls: 'grid' }, [['none', 'None'], ...lists.pierce.map(r => [r[0], r[1]])].map(([id, label]) => {
              const on = id === 'none' ? cur.size === 0 : cur.has(id), p = COS.priceOf(id), own = COS.ownedCosmetic(W, id);
              return card(label, { on, lock: !own && p, tag: on ? 'On' : own || !p ? (id === 'none' ? '' : 'Free') : '$' + p, tagCls: on ? 'wear' : (!own && p ? 'price' : 'own'),
                click: () => set('clothes', () => { if (id === 'none') { sel.parts.pierce = []; return; } if (!buyPiece(id)) return false; const a = new Set(Array.isArray(sel.parts.pierce) ? sel.parts.pierce : []); if (a.has(id)) a.delete(id); else a.add(id); sel.parts.pierce = [...a]; }) }); })); };
          return [
            el('div', { cls: 'subs' }, tabs.map(([k, n]) => el('button', { cls: accSub === k ? 'on' : '', on: { click: () => { accSub = k; render(); } } }, n))),
            accSub === 'pierce' ? pier() : pieceCards(lists[accSub], accSub, { none: true, extra: accSub === 'earL' ? { mirror: 'earR' } : null }),
            el('div', { cls: 'lbl' }, 'Also'),
            el('div', { cls: 'grid' }, card('Backpack', { on: sel.pack, tag: sel.pack ? 'On' : 'Off', tagCls: sel.pack ? 'wear' : '', click: () => set('extra', () => { sel.pack = !sel.pack; }) })),
            el('div', { cls: 'lbl' }, 'Build'), el('div', { cls: 'grid' }, [[.92, 'Slim'], [1, 'Average'], [1.1, 'Stocky']].map(([v, n]) => card(n, { on: sel.build === v, click: () => set('extra', () => { sel.build = v; }) })))
          ]; },
      };
      let toastT = 0; const toast = (m) => { sub.textContent = m; sub.style.color = '#ffb0a8'; clearTimeout(toastT); toastT = setTimeout(() => { sub.style.color = ''; sub.textContent = SUB[STEPS[step][0]]; }, 2600); };
      const save = () => {
        const L = look(); L.name = name || 'Survivor';
        const slot = upsertChar({ id: (slotId && slotId !== KEEM_ID) ? slotId : undefined, name: L.name, sel, look: L });
        if (slot) setActiveId(slot.id);
        // Editing a slot should not rename the account when they already have a profile name
        const p = (asNew || slotId) && hasProfile() ? saveProfile({ sel, look: L }) : saveProfile({ name: L.name, sel, look: L });
        finish(Object.assign({}, p || {}, { name: L.name, sel, look: L, slotId: slot && slot.id }));
      };
      function render() { const [key, label] = STEPS[step]; const W = wallet(); document.getElementById('profCash').textContent = '$' + (W.cash | 0); nm.textContent = name;
        stepsEl.innerHTML = ''; STEPS.forEach(([k, n], i) => stepsEl.append(el('button', { cls: (i === step ? 'on' : '') + (done.has(i) ? ' done' : ''), on: { click: () => { if (mode === 'create' && i > step && !name.trim()) return; step = i; render(); } } }, (mode === 'create' ? (i + 1) + '. ' : '') + n)));
        h3.textContent = (mode === 'create' ? `Step ${step + 1} of ${STEPS.length} · ` : '') + label; sub.textContent = SUB[key]; const sc = body.scrollTop; body.innerHTML = ''; body.append(...PAGES[key]()); body.scrollTop = sc; foot.innerHTML = '';
        if (mode === 'create') { foot.append(el('button', { on: { click: () => { if (step) { step--; body.scrollTop = 0; render(); } else finish(null); } } }, step ? '‹ Back' : 'Cancel'),
            el('button', { cls: 'pri', on: { click: () => { if (key === 'name' && !name.trim()) { toast('Type a name first (or tap an idea).'); return; } done.add(step); if (step < STEPS.length - 1) { step++; body.scrollTop = 0; render(); } else save(); } } }, step < STEPS.length - 1 ? 'Next ›' : 'Finish ✓')); }
        else foot.append(el('button', { on: { click: () => finish(null) } }, 'Cancel'), el('button', { cls: 'pri', on: { click: save } }, 'Save'));
      }
      window.__profUI = { get step() { return step; }, setStep: i => { step = i; render(); }, get sel() { return sel; }, rot: v => { rot = v; auto = false; }, av: () => av, apply: (o, parts = ALL_PARTS) => { Object.assign(sel, o); parts.forEach(x => touched.add(x)); return rebuild().then(render); } }; // test hook
      rebuild(); render();
    }
  });
}
function readOldSel() { try { return JSON.parse(localStorage.getItem('atq3.look') || 'null') || {}; } catch (e) { return {}; } }
