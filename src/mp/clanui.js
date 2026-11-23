// Clans tab inside the Online panel: create / browse / manage, banner builder, clan leaderboard.
import {
  clanMine, clanSearch, clanBoard, clanCreate, clanUpdate, clanDisband, clanLeave, clanTransfer,
  clanKick, clanPromote, clanInviteByName, clanInviteRespond, clanInviteCancel, clanRequest,
  clanRequestRespond, clanReportBanner, clanAdminResetBanner, refreshMine, forgetMine, myClanBrief, cleanClanName, cleanClanTag, MAX_MEMBERS,
} from './clans.js';
import { SHAPES, PATTERNS, EMBLEMS, TRIMS, COLORS, DEFAULT_BANNER, cleanBanner, drawBanner, bannerCanvas } from './clanBanner.js';
import { mountDrawTools } from './clanDraw.js';
import { getUser, signInGoogle, googleEnabled, getRole } from './online.js';

const el = (html) => { const d = document.createElement('div'); d.innerHTML = html; return d.firstElementChild; };
const esc = t => String(t == null ? '' : t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function bannerImg(banner, w = 96, h = 120, cls = 'cbn') {
  const c = bannerCanvas(banner, w, h); const im = document.createElement('img');
  im.className = cls; im.alt = ''; im.width = w; im.height = h; if (c) im.src = c.toDataURL('image/png'); return im;
}
function bannerHTML(banner, w = 72, h = 90) {
  const c = bannerCanvas(banner, w * 2, h * 2); return c ? `<img class="cbn" width="${w}" height="${h}" alt="" src="${c.toDataURL('image/png')}">` : '';
}

function paintPreview(canvas, banner) {
  if (!canvas) return; const r = canvas.getBoundingClientRect(); const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = Math.max(80, Math.round((r.width || 160) * dpr)), h = Math.max(100, Math.round((r.height || 200) * dpr));
  if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  drawBanner(canvas.getContext('2d'), banner, w, h);
}

export function openBannerBuilder({ banner, onSave, onClose } = {}) {
  let cur = cleanBanner(banner || DEFAULT_BANNER);
  let mode = 'parts'; // parts | draw
  let drawApi = null;
  const root = el(`<div id="cban" class="screen" role="dialog" aria-label="Banner builder">
    <div class="cban-panel">
      <div class="cban-head"><button type="button" class="wback cban-back" aria-label="Back">‹ Back</button><h2>BANNER</h2><button type="button" class="primary cban-save">Save</button></div>
      <div class="wseg cban-mode" id="cbanMode"><button type="button" data-mode="parts" class="sel">Parts</button><button type="button" data-mode="draw">Draw</button></div>
      <div class="cban-body">
        <div class="cban-prev"><canvas id="cbanCan"></canvas><div class="cban-hint">Live preview · parts and drawing, no uploads</div></div>
        <div class="cban-tools" id="cbanTools"></div>
      </div>
    </div>
  </div>`);
  document.body.append(root);
  const canvas = root.querySelector('#cbanCan');
  const tools = root.querySelector('#cbanTools');
  const hint = root.querySelector('.cban-hint');
  const setBanner = (b, live) => { cur = live ? b : cleanBanner(b); };
  const partsHTML = `<div class="clbl">Shape</div><div class="cban-row" data-k="shape"></div>
          <div class="clbl">Pattern</div><div class="cban-row" data-k="pattern"></div>
          <div class="clbl">Emblem</div><div class="cban-row" data-k="emblem"></div>
          <div class="clbl">Trim</div><div class="cban-row" data-k="trimStyle"></div>
          <div class="clbl">Background</div><div class="cswatches" data-k="bg"></div>
          <div class="clbl">Pattern color</div><div class="cswatches" data-k="bg2"></div>
          <div class="clbl">Emblem color</div><div class="cswatches" data-k="emblemColor"></div>
          <div class="clbl">Trim color</div><div class="cswatches" data-k="trim"></div>`;
  const fillRows = () => {
    const rows = { shape: SHAPES, pattern: PATTERNS, emblem: EMBLEMS, trimStyle: TRIMS };
    tools.querySelectorAll('.cban-row').forEach(row => {
      const k = row.dataset.k, opts = rows[k]; if (!opts) return;
      row.innerHTML = opts.map(([id, lab]) => `<button type="button" data-v="${id}" class="${cur[k] === id ? 'sel' : ''}">${esc(lab)}</button>`).join('');
      row.querySelectorAll('button').forEach(b => b.onclick = () => { cur = cleanBanner({ ...cur, [k]: b.dataset.v }); fillRows(); paintPreview(canvas, cur); });
    });
    tools.querySelectorAll('.cswatches').forEach(row => {
      const k = row.dataset.k;
      row.innerHTML = COLORS.map(c => `<button type="button" class="csw${cur[k] === c ? ' sel' : ''}" data-v="${c}" style="background:${c}" aria-label="${c}"></button>`).join('');
      row.querySelectorAll('button').forEach(b => b.onclick = () => { cur = cleanBanner({ ...cur, [k]: b.dataset.v }); fillRows(); paintPreview(canvas, cur); });
    });
  };
  const showMode = (m) => {
    mode = m;
    root.querySelectorAll('#cbanMode button').forEach(b => b.classList.toggle('sel', b.dataset.mode === m));
    if (drawApi) { drawApi.dispose(); drawApi = null; }
    if (m === 'draw') {
      drawApi = mountDrawTools({ tools, canvas, getBanner: () => cur, setBanner, hint });
    } else {
      tools.innerHTML = partsHTML;
      hint.textContent = 'Live preview · parts and drawing, no uploads';
      fillRows();
      requestAnimationFrame(() => paintPreview(canvas, cur));
    }
  };
  root.querySelectorAll('#cbanMode button').forEach(b => b.onclick = () => showMode(b.dataset.mode));
  showMode('parts');
  const close = () => { if (drawApi) drawApi.dispose(); root.remove(); onClose && onClose(); };
  root.querySelector('.cban-back').onclick = close;
  root.querySelector('.cban-save').onclick = () => { onSave && onSave(cleanBanner(cur)); close(); };
  return { close, get: () => cleanBanner(cur) };
}


function bannerActions(c, role) {
  const bits = [];
  if (c && c.id) bits.push(`<button type="button" class="cReportBan" data-id="${c.id}">Report banner</button>`);
  bits.push(`<button type="button" class="cAdminReset hidden" data-id="${c.id}">Reset banner</button>`);
  return `<div class="cban-safe">${bits.join('')}</div>`;
}
function bindBannerActions(root, ctx) {
  const flash = ctx.flash || (() => {});
  root.querySelectorAll('.cReportBan').forEach(b => {
    b.onclick = () => {
      if (ctx.requireSignIn && !ctx._signed) { /* show() uses requireSignIn */ }
      clanReportBanner(b.dataset.id).then(d => {
        flash(d && d.hidden ? 'Thanks. That drawing was hidden pending review.' : 'Thanks, we got your report.');
        ctx.reload && ctx.reload(true);
      }).catch(e => flash(e.message || 'Could not send the report.'));
    };
  });
  getRole().then(role => {
    if (role !== 'admin' && role !== 'moderator') return;
    root.querySelectorAll('.cAdminReset').forEach(b => {
      b.classList.remove('hidden');
      b.onclick = () => {
        if (!confirm('Reset this clan banner to the default preset and clear reports?')) return;
        clanAdminResetBanner(b.dataset.id).then(() => { flash('Banner reset.'); ctx.reload && ctx.reload(true); }).catch(e => flash(e.message || 'Could not reset.'));
      };
    });
  }).catch(() => {});
}

export function attachClans(root, ctx) {
  const q = s => root.querySelector(s);
  const { esc: E, avatarHTML, flash, requireSignIn, profile } = ctx;
  const escX = E || esc;

  // Inject Clans tab + boards if the Online panel was built without them.
  const seg = q('.wseg:not(.wsort)');
  if (seg && !seg.querySelector('[data-t="clans"]')) {
    const b = document.createElement('button'); b.dataset.t = 'clans'; b.setAttribute('role', 'tab'); b.textContent = 'Clans';
    seg.append(b);
    seg.style.gridTemplateColumns = '1fr 1fr 1fr';
  }
  if (!q('#wClans')) {
    const body = el(`<div class="wbody hidden" id="wClans">
      <div id="cInbox" class="cinbox hidden"></div>
      <div id="cMain" class="cmain"></div>
    </div>`);
    root.querySelector('.wpanel').append(body);
  }
  const board = q('#wBoard');
  if (board && !q('#wBoardKind')) {
    const kind = el(`<div class="wseg wsort" id="wBoardKind"><button data-kind="players" class="sel">Players</button><button data-kind="clans">Clans</button></div>`);
    board.insertBefore(kind, board.firstChild);
  }

  let view = 'home'; // home | create | browse | clan | board
  let browsing = [];
  let mine = null;
  let boardSort = 'kills';
  let boardKind = 'players';

  const signed = () => !!(mine && mine.signed_in);

  async function reload(force) {
    mine = await refreshMine(force);
    render();
    return mine;
  }

  function renderInbox() {
    const box = q('#cInbox'); if (!box) return;
    const inbox = (mine && mine.inbox) || [];
    if (!inbox.length) { box.classList.add('hidden'); box.innerHTML = ''; return; }
    box.classList.remove('hidden');
    box.innerHTML = inbox.map(i => `<div class="cinvite">${bannerHTML(i.banner, 36, 45)}<div class="cinvt"><b>${escX(i.name)}</b> <span class="ctag">[${escX(i.tag)}]</span><span class="small">Invite from ${escX(i.inviter)}</span></div>
      <button type="button" data-acc="${i.id}" class="primary">Join</button><button type="button" data-dec="${i.id}">No</button></div>`).join('');
    box.querySelectorAll('[data-acc]').forEach(b => b.onclick = () => act(() => clanInviteRespond(b.dataset.acc, true), 'Joined the clan.'));
    box.querySelectorAll('[data-dec]').forEach(b => b.onclick = () => act(() => clanInviteRespond(b.dataset.dec, false), 'Invite declined.'));
  }

  function needAuth(why) {
    return `<div class="wempty">${escX(why || 'Sign in with Google to create or join a clan.')}<br><button type="button" id="cSignIn" class="primary">Sign in with Google</button></div>`;
  }

  function renderHome() {
    const main = q('#cMain'); if (!main) return;
    if (mine && mine.clan) return renderClan(mine);
    main.innerHTML = `
      <div class="cintro">
        ${bannerHTML(DEFAULT_BANNER, 64, 80)}
        <div><h3>Clans</h3><p class="small">Create a clan, design a banner from preset parts, and climb the clan leaderboard. Up to ${MAX_MEMBERS} members. Scores are the real Survival totals of everyone in the clan.</p></div>
      </div>
      <div class="wact cacts">
        <button type="button" class="primary wbig" id="cCreate">Create a Clan</button>
        <button type="button" class="wbig" id="cBrowse">Find a Clan</button>
        <button type="button" class="wbig" id="cBoardBtn">Clan Board</button>
      </div>
      ${(mine && mine.my_request) ? `<div class="cnote">Request pending for <b>${escX(mine.my_request.name)}</b> [${escX(mine.my_request.tag)}] <button type="button" id="cCancelReq">Cancel</button></div>` : ''}
      ${!signed() ? '<p class="wsub small">You can browse clans as a guest. Creating, joining and inviting needs a Google sign-in.</p>' : ''}`;
    q('#cCreate').onclick = () => { view = 'create'; render(); };
    q('#cBrowse').onclick = () => { view = 'browse'; render(); loadBrowse(); };
    q('#cBoardBtn').onclick = () => { view = 'board'; render(); loadClanBoard(); };
    const cr = q('#cCancelReq'); if (cr) cr.onclick = () => act(() => clanRequestRespond(mine.my_request.id, false), 'Request cancelled.');
  }

  function renderCreate() {
    const main = q('#cMain');
    const draft = { name: '', tag: '', join: 'request', banner: cleanBanner(DEFAULT_BANNER) };
    main.innerHTML = `<div class="ccreate">
      <div class="cban-prev slim"><canvas id="cDraftBan"></canvas><button type="button" id="cEditBan">Design banner</button></div>
      <div class="cform">
        <div class="cfields">
          <label>Clan name<input id="cName" maxlength="24" placeholder="Quiet Falls Crew" autocomplete="off"></label>
          <label>Tag (2–5)<input id="cTag" maxlength="5" placeholder="QFC" autocomplete="off" class="ctagin"></label>
        </div>
        <div class="clbl">Who can join</div>
        <div class="wseg wsort" id="cJoin"><button data-j="request" class="sel">Ask to join</button><button data-j="invite">Invite only</button></div>
        <div class="cacts2"><button type="button" id="cCreateGo" class="primary">Create clan</button><button type="button" id="cCreateBack">Cancel</button></div>
        <p class="small wsub">Names and tags are unique. Banners use the game's own pieces — no uploads.</p>
      </div>
    </div>`;
    const name = q('#cName'), tag = q('#cTag'), cv = q('#cDraftBan');
    const sync = () => { draft.name = cleanClanName(name.value); draft.tag = cleanClanTag(tag.value); if (tag.value !== draft.tag) tag.value = draft.tag; paintPreview(cv, draft.banner); };
    name.oninput = sync; tag.oninput = sync;
    q('#cJoin').querySelectorAll('button').forEach(b => b.onclick = () => { draft.join = b.dataset.j; q('#cJoin').querySelectorAll('button').forEach(x => x.classList.toggle('sel', x === b)); });
    q('#cEditBan').onclick = () => openBannerBuilder({ banner: draft.banner, onSave: bn => { draft.banner = bn; paintPreview(cv, bn); } });
    q('#cCreateBack').onclick = () => { view = 'home'; render(); };
    q('#cCreateGo').onclick = async () => {
      if (!signed()) return askSignIn();
      sync();
      if (draft.name.length < 3) { flash('Name needs at least 3 characters.', true); return; }
      if (draft.tag.length < 2) { flash('Tag needs 2–5 letters or numbers.', true); return; }
      await act(async () => { await clanCreate(draft); view = 'home'; }, 'Clan created.');
    };
    requestAnimationFrame(() => paintPreview(cv, draft.banner));
  }

  async function loadBrowse(qstr = '') {
    const main = q('#cMain');
    const hold = main.querySelector('#cBrowseList') || main;
    try {
      browsing = (await clanSearch(qstr, 40)) || [];
      if (!Array.isArray(browsing)) browsing = [];
    } catch (e) { browsing = []; if (hold) hold.innerHTML = `<div class="wempty">Couldn't load clans.<br><span class="small">${escX(e.message)}</span></div>`; return; }
    renderBrowseList();
  }
  function renderBrowse() {
    const main = q('#cMain');
    main.innerHTML = `<div class="csearch"><input id="cFind" maxlength="24" placeholder="Search name or tag" autocomplete="off"><button type="button" id="cFindGo">Search</button><button type="button" id="cBrowseBack">Back</button></div>
      <div id="cBrowseList" class="clist"></div>`;
    q('#cBrowseBack').onclick = () => { view = 'home'; render(); };
    const go = () => loadBrowse(q('#cFind').value);
    q('#cFindGo').onclick = go; q('#cFind').addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
    q('#cBrowseList').innerHTML = '<div class="wempty small">Loading…</div>';
  }
  function renderBrowseList() {
    const list = q('#cBrowseList'); if (!list) return;
    if (!browsing.length) { list.innerHTML = '<div class="wempty">No clans match.<br><span class="small">Try another search, or create one.</span></div>'; return; }
    const myId = mine && mine.clan && mine.clan.id;
    list.innerHTML = browsing.map(c => `<div class="crow" data-id="${c.id}">
      ${bannerHTML(c.banner, 48, 60)}
      <div class="cmeta"><b>${escX(c.name)}</b> <span class="ctag">[${escX(c.tag)}]</span>
        <span class="small">${c.members}/${MAX_MEMBERS} members · ${c.join_mode === 'invite' ? 'Invite only' : 'Ask to join'} · ${c.score_kills || 0} kills</span></div>
      ${myId === c.id ? '<span class="ctag me">Yours</span>' : (c.join_mode === 'request' && !myId && signed()
        ? `<button type="button" data-req="${c.id}">Request</button>`
        : `<button type="button" data-view="${c.id}">View</button>`)}
    </div>`).join('');
    list.querySelectorAll('[data-req]').forEach(b => b.onclick = ev => { ev.stopPropagation(); act(() => clanRequest(b.dataset.req), 'Request sent.'); });
    list.querySelectorAll('.crow').forEach(row => row.onclick = () => openClan(row.dataset.id));
  }

  async function openClan(id) {
    // If it's mine, stay on manage view
    if (mine && mine.clan && mine.clan.id === id) { view = 'home'; render(); return; }
    const main = q('#cMain'); main.innerHTML = '<div class="wempty small">Loading…</div>';
    try {
      const { clanGet } = await import('./clans.js');
      const d = await clanGet(id); if (!d || !d.clan) { main.innerHTML = '<div class="wempty">That clan is gone.</div>'; return; }
      renderOther(d);
    } catch (e) { main.innerHTML = `<div class="wempty">${escX(e.message)}</div>`; }
  }

  function renderOther(d) {
    const c = d.clan, members = d.members || [];
    const main = q('#cMain');
    const canReq = signed() && !(mine && mine.clan) && c.join_mode === 'request';
    main.innerHTML = `<div class="cclan">
      <div class="cclan-top"><button type="button" id="cBack" class="wback">‹ Back</button>
        ${bannerHTML(c.banner, 80, 100)}
        <div class="cmeta"><h3>${escX(c.name)} <span class="ctag">[${escX(c.tag)}]</span></h3>
          <span class="small">${c.members}/${MAX_MEMBERS} · ${c.join_mode === 'invite' ? 'Invite only' : 'Ask to join'} · ${c.score_kills || 0} clan kills</span></div>
      </div>
      ${canReq ? '<button type="button" id="cReq" class="primary">Ask to join</button>' : (!signed() ? needAuth('Sign in to request a join.') : (c.join_mode === 'invite' ? '<p class="small wsub">This clan is invite-only.</p>' : ''))}
      ${c.banner_hidden ? '<p class="small wsub cwarn">This clan drawing is hidden pending review. The preset banner still shows.</p>' : ''}
      ${bannerActions(c, null)}
      <div class="clbl">Members</div>
      <div class="clist">${members.map(m => memberRow(m, null)).join('') || '<div class="wempty small">No members listed.</div>'}</div>
    </div>`;
    q('#cBack').onclick = () => { view = 'browse'; render(); loadBrowse(q('#cFind') ? q('#cFind').value : ''); };
    const rq = q('#cReq'); if (rq) rq.onclick = () => act(() => clanRequest(c.id), 'Request sent.');
    const si = q('#cSignIn'); if (si) si.onclick = askSignIn;
    bindBannerActions(main, { flash, reload });
  }

  function memberRow(m, role) {
    const canLead = role === 'leader', canOff = role === 'leader' || role === 'officer';
    const me = !!(mine && mine.signed_in && profile && profile().then); // filled below with data-id compare in renderClan
    return `<div class="cmem" data-id="${m.id}">
      ${avatarHTML ? avatarHTML(m.name, m.avatar, 'wav sm') : ''}
      <div class="cmeta"><b>${escX(m.name)}</b> <span class="crole ${escX(m.role)}">${escX(m.role)}</span>
        <span class="small">${m.kills || 0} kills · best wave ${m.wave || 0}</span></div>
      ${canLead && m.role !== 'leader' ? `<button type="button" data-pro="${m.id}" data-role="${m.role === 'officer' ? 'member' : 'officer'}">${m.role === 'officer' ? 'Demote' : 'Officer'}</button>` : ''}
      ${canLead && m.role !== 'leader' ? `<button type="button" data-xfer="${m.id}">Leader</button>` : ''}
      ${canOff && m.role !== 'leader' && !(role === 'officer' && m.role === 'officer') ? `<button type="button" data-kick="${m.id}">Kick</button>` : ''}
    </div>`;
  }

  function renderClan(d) {
    const c = d.clan, members = d.members || [], role = d.role;
    const main = q('#cMain');
    const reqs = d.requests || [];
    const outbox = d.outbox || [];
    main.innerHTML = `<div class="cclan">
      <div class="cclan-top">
        <div class="cban-prev slim"><canvas id="cMineBan"></canvas>${role === 'leader' || role === 'officer' ? '<button type="button" id="cEditMineBan">Edit banner</button>' : ''}</div>
        <div class="cmeta">
          <h3>${escX(c.name)} <span class="ctag">[${escX(c.tag)}]</span></h3>
          <span class="small">${c.members}/${MAX_MEMBERS} members · ${c.join_mode === 'invite' ? 'Invite only' : 'Ask to join'}</span>
          <div class="cstats"><span><b>${c.score_kills || 0}</b> kills</span><span><b>${c.score_wave || 0}</b> best wave</span><span><b>${c.score_hs || 0}</b> headshots</span></div>
          ${c.banner_hidden ? '<p class="small wsub cwarn">Drawing hidden pending review. Edit the banner to submit a new one, or wait for a review.</p>' : ''}
        </div>
      </div>
      ${bannerActions(c, role)}
      ${role === 'leader' ? `<div class="cform inline">
        <div class="wseg wsort" id="cJoinEdit"><button data-j="request"${c.join_mode !== 'invite' ? ' class="sel"' : ''}>Ask to join</button><button data-j="invite"${c.join_mode === 'invite' ? ' class="sel"' : ''}>Invite only</button></div>
      </div>` : ''}
      ${role === 'leader' || role === 'officer' ? `<div class="cinviteform"><input id="cInvName" maxlength="18" placeholder="Invite by player name" autocomplete="off"><button type="button" id="cInvGo" class="primary">Invite</button></div>` : ''}
      ${reqs.length ? `<div class="clbl">Join requests</div><div class="clist">${reqs.map(r => `<div class="cmem">
        ${avatarHTML ? avatarHTML(r.name, r.avatar, 'wav sm') : ''}<div class="cmeta"><b>${escX(r.name)}</b></div>
        <button type="button" class="primary" data-racc="${r.id}">Accept</button><button type="button" data-rdec="${r.id}">Decline</button></div>`).join('')}</div>` : ''}
      ${outbox.length ? `<div class="clbl">Pending invites</div><div class="clist">${outbox.map(i => `<div class="cmem"><div class="cmeta"><b>${escX(i.name)}</b></div><button type="button" data-ic="${i.id}">Cancel</button></div>`).join('')}</div>` : ''}
      <div class="clbl">Members</div>
      <div class="clist">${members.map(m => memberRow(m, role)).join('')}</div>
      <div class="cacts2">
        ${role === 'leader' ? '<button type="button" id="cDisband" class="danger">Disband clan</button>' : '<button type="button" id="cLeave">Leave clan</button>'}
        <button type="button" id="cToBoard">Clan board</button>
      </div>
    </div>`;
    requestAnimationFrame(() => paintPreview(q('#cMineBan'), c.banner));
    const edit = q('#cEditMineBan');
    if (edit) edit.onclick = () => openBannerBuilder({ banner: c.banner, onSave: bn => act(() => clanUpdate(c.id, { banner: bn }), 'Banner saved.') });
    const join = q('#cJoinEdit');
    if (join) join.querySelectorAll('button').forEach(b => b.onclick = () => act(() => clanUpdate(c.id, { join: b.dataset.j }), 'Join setting updated.'));
    const inv = q('#cInvGo');
    if (inv) inv.onclick = async () => {
      const nm = (q('#cInvName').value || '').trim(); if (nm.length < 2) { flash('Type a player name.', true); return; }
      try {
        const d2 = await clanInviteByName(c.id, nm);
        if (d2 && d2.ambiguous) { flash('Several players use that name. Ask them for an exact match.', true); return; }
        flash('Invite sent.'); await reload(true);
      } catch (e) { flash(e.message, true); }
    };
    main.querySelectorAll('[data-racc]').forEach(b => b.onclick = () => act(() => clanRequestRespond(b.dataset.racc, true), 'Member added.'));
    main.querySelectorAll('[data-rdec]').forEach(b => b.onclick = () => act(() => clanRequestRespond(b.dataset.rdec, false), 'Request declined.'));
    main.querySelectorAll('[data-ic]').forEach(b => b.onclick = () => act(() => clanInviteCancel(b.dataset.ic), 'Invite cancelled.'));
    main.querySelectorAll('[data-kick]').forEach(b => b.onclick = () => confirmAct('Kick this member?', () => clanKick(c.id, b.dataset.kick), 'Member kicked.'));
    main.querySelectorAll('[data-pro]').forEach(b => b.onclick = () => act(() => clanPromote(c.id, b.dataset.pro, b.dataset.role), b.dataset.role === 'officer' ? 'Promoted to officer.' : 'Demoted to member.'));
    main.querySelectorAll('[data-xfer]').forEach(b => b.onclick = () => confirmAct('Make this member the new leader? You will become an officer.', () => clanTransfer(c.id, b.dataset.xfer), 'Leadership transferred.'));
    const leave = q('#cLeave'); if (leave) leave.onclick = () => confirmAct('Leave this clan?', () => clanLeave(c.id), 'You left the clan.');
    const dis = q('#cDisband'); if (dis) dis.onclick = () => confirmAct('Disband this clan for everyone? This cannot be undone.', () => clanDisband(c.id), 'Clan disbanded.');
    q('#cToBoard').onclick = () => { view = 'board'; render(); loadClanBoard(); };
    bindBannerActions(main, { flash, reload });
  }

  async function loadClanBoard() {
    const main = q('#cMain'); if (view === 'board' && main) main.innerHTML = '<div class="wempty small">Loading clan board…</div>';
    try {
      const d = await clanBoard(boardSort, 50);
      if (view === 'board') renderClanBoard(d);
      return d;
    } catch (e) {
      if (view === 'board' && main) main.innerHTML = `<div class="wempty">Can't load the clan board.<br><span class="small">${escX(e.message)}</span></div>`;
      throw e;
    }
  }
  function renderClanBoard(d) {
    const main = q('#cMain');
    const rows = (d && d.rows) || [];
    const me = d && d.me;
    main.innerHTML = `<div class="cboard">
      <div class="csearch"><button type="button" id="cBoardBack">‹ Back</button>
        <div class="wseg wsort" id="cBoardSort">
          <button data-s="kills"${boardSort === 'kills' ? ' class="sel"' : ''}>Kills</button>
          <button data-s="wave"${boardSort === 'wave' ? ' class="sel"' : ''}>Best Wave</button>
          <button data-s="hs"${boardSort === 'hs' ? ' class="sel"' : ''}>Headshots</button>
        </div>
      </div>
      <div class="wme" id="cBoardMe">${me
        ? `<div class="wstat"><b>#${me.rank}</b><span>Your clan</span></div><div class="wstat"><b>${me.score_kills}</b><span>Kills</span></div><div class="wstat"><b>${me.score_wave}</b><span>Best wave</span></div><div class="wstat"><b>${me.score_hs}</b><span>Headshots</span></div>`
        : `<div class="wstat wide"><span>Join or create a clan to see your rank here. Scores are the real Survival totals of every member.</span></div>`}</div>
      <div class="wtable">${rows.length ? `<div class="wtr wth cth"><span class="wrk">#</span><span class="wnm">Clan</span><span class="${boardSort === 'kills' ? 'on' : ''}">Kills</span><span class="${boardSort === 'wave' ? 'on' : ''}">Wave</span><span class="${boardSort === 'hs' ? 'on' : ''}">Head</span></div>`
        + rows.map(r => `<div class="wtr${r.me ? ' me' : ''} crow-ban" data-id="${r.id}"><span class="wrk">${r.rank <= 3 ? ['🥇', '🥈', '🥉'][r.rank - 1] : r.rank}</span>
          <span class="wnm">${bannerHTML(r.banner, 28, 34)}<b>${escX(r.name)}</b> <span class="ctag">[${escX(r.tag)}]</span></span>
          <span>${r.score_kills}</span><span>${r.score_wave}</span><span>${r.score_hs}</span></div>`).join('')
        : '<div class="wempty">No clans yet.<br><span class="small">Create one and it will show up here.</span></div>'}</div>
    </div>`;
    q('#cBoardBack').onclick = () => { view = 'home'; render(); };
    q('#cBoardSort').querySelectorAll('button').forEach(b => b.onclick = () => { boardSort = b.dataset.s; loadClanBoard(); });
    main.querySelectorAll('.crow-ban[data-id]').forEach(row => row.onclick = () => openClan(row.dataset.id));
  }

  function render() {
    renderInbox();
    if (view === 'create') renderCreate();
    else if (view === 'browse') renderBrowse();
    else if (view === 'board') { /* filled by loadClanBoard */ if (!q('#cBoardSort')) q('#cMain').innerHTML = '<div class="wempty small">Loading…</div>'; }
    else renderHome();
    const si = q('#cSignIn'); if (si) si.onclick = askSignIn;
  }

  async function act(fn, okMsg) {
    try { await fn(); if (okMsg) flash(okMsg); await reload(true); }
    catch (e) { flash(e.message || String(e), true); }
  }
  function confirmAct(msg, fn, okMsg) {
    if (!window.confirm(msg)) return;
    act(fn, okMsg);
  }
  async function askSignIn() {
    if (requireSignIn) return requireSignIn();
    try { await signInGoogle('online'); } catch (e) { flash(e.message, true); }
  }

  // Hook the Online tab button
  const tabBtn = root.querySelector('.wseg:not(.wsort) [data-t="clans"]');
  if (tabBtn && !tabBtn.__cbound) {
    tabBtn.__cbound = true;
    tabBtn.addEventListener('click', () => show());
  }

  async function show() {
    if (view !== 'create' && view !== 'browse' && view !== 'board') view = 'home';
    q('#wClans') && q('#wClans').classList.remove('hidden');
    render();
    try { await reload(false); } catch (e) { flash(e.message, true); render(); }
  }

  // Leaderboard tab: Players | Clans
  const kindBar = q('#wBoardKind');
  if (kindBar && !kindBar.__cbound) {
    kindBar.__cbound = true;
    kindBar.querySelectorAll('button').forEach(b => b.onclick = ev => {
      ev.stopPropagation();
      boardKind = b.dataset.kind;
      kindBar.querySelectorAll('button').forEach(x => x.classList.toggle('sel', x === b));
      ctx.onBoardKind && ctx.onBoardKind(boardKind);
    });
  }

  return {
    show, reload, render, boardKind: () => boardKind, setBoardKind: k => { boardKind = k; },
    loadClanBoardInto(rowsEl, meEl, sort) {
      boardSort = sort || boardSort;
      return clanBoard(boardSort, 50).then(d => {
        const rows = d.rows || [];
        const head = `<div class="wtr wth cth"><span class="wrk">#</span><span class="wnm">Clan</span><span class="${boardSort === 'kills' ? 'on' : ''}">Kills</span><span class="${boardSort === 'wave' ? 'on' : ''}">Wave</span><span class="${boardSort === 'hs' ? 'on' : ''}">Head</span></div>`;
        rowsEl.innerHTML = rows.length ? head + rows.map(r => `<div class="wtr${r.me ? ' me' : ''}"><span class="wrk">${r.rank <= 3 ? ['🥇', '🥈', '🥉'][r.rank - 1] : r.rank}</span><span class="wnm">${bannerHTML(r.banner, 28, 34)}<b>${escX(r.name)}</b> <span class="ctag">[${escX(r.tag)}]</span></span><span>${r.score_kills}</span><span>${r.score_wave}</span><span>${r.score_hs}</span></div>`).join('')
          : '<div class="wempty">No clans yet.<br><span class="small">Create a clan and it will show up here.</span></div>';
        const m = d.me;
        meEl.innerHTML = m
          ? `<div class="wstat"><b>#${m.rank}</b><span>Your clan</span></div><div class="wstat"><b>${m.score_kills}</b><span>Kills</span></div><div class="wstat"><b>${m.score_wave}</b><span>Best wave</span></div><div class="wstat"><b>${m.score_hs}</b><span>Headshots</span></div>`
          : `<div class="wstat wide"><span>Join or create a clan to see your rank. Scores are real member Survival totals.</span></div>`;
        return d;
      });
    },
    forget: forgetMine, brief: myClanBrief,
  };
}

if (typeof window !== 'undefined' && /^(localhost|127\.0\.0\.1)$/.test(location.hostname)) {
  window.__atqClanUI = { openBannerBuilder, bannerImg, attachClans };
}
