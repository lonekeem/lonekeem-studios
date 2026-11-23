// Staff panel inside the Online screen. Visible only after the server says the account is admin or moderator.
import {
  isStaffRole, friendlyModError, myStatus, searchPlayers, listStaff, setRole, auditLog,
  mutePlayer, unmutePlayer, banPlayer, unbanPlayer, kickPlayer, resetName,
  resetClanBanner, resetClanName, listReports, resolveReport, deleteChat, emitStaff,
} from './mod.js';
import { getRole } from './online.js';

const esc = t => String(t == null ? '' : t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const preview = () => (typeof location !== 'undefined' && /^(localhost|127\.0\.0\.1)$/.test(location.hostname) && window.__MP_FAKE_AUTH && window.__MP_FAKE_AUTH.preview) || null;
const MUTE_OPTS = [['15 m', 15], ['1 h', 60], ['24 h', 1440], ['7 d', 10080]];
const BAN_OPTS = [['24 h', 1440], ['7 d', 10080], ['30 d', 43200], ['Permanent', 0]];

function el(html) { const d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstChild; }

function roleChip(r) {
  if (r === 'admin') return '<span class="stchip stadmin">Admin</span>';
  if (r === 'moderator') return '<span class="stchip stmod">Mod</span>';
  if (r === 'banned') return '<span class="stchip stban">Banned</span>';
  if (r === 'muted') return '<span class="stchip stmute">Muted</span>';
  return '';
}

export function attachStaff(root, ctx) {
  const q = s => root.querySelector(s);
  const flash = ctx.flash || (() => {});
  let role = null, view = 'reports', signed = false;

  const seg = q('.wseg:not(.wsort)');
  if (seg && !seg.querySelector('[data-t="staff"]')) {
    const b = document.createElement('button');
    b.dataset.t = 'staff'; b.setAttribute('role', 'tab'); b.id = 'wStaffTab';
    b.textContent = 'Staff'; b.className = 'hidden';
    seg.append(b);
  }
  if (!q('#wStaff')) {
    const body = el(`<div class="wbody hidden" id="wStaff">
      <div class="sthead"><h3 id="stTitle">Staff</h3><p class="small" id="stBlurb"></p></div>
      <div class="wseg wsort stviews" id="stViews">
        <button data-v="reports" class="sel">Reports</button>
        <button data-v="players">Players</button>
        <button data-v="mods" id="stModsTab" class="hidden">Moderators</button>
        <button data-v="log" id="stLogTab" class="hidden">Log</button>
      </div>
      <div id="stMain" class="stmain"></div>
    </div>`);
    const panel = q('.wpanel') || root;
    panel.append(body);
  }

  function showTab(on) {
    const tab = q('#wStaffTab') || q('button[data-t="staff"]');
    if (tab) tab.classList.toggle('hidden', !on);
    if (seg) {
      const n = [...seg.querySelectorAll('button')].filter(b => !b.classList.contains('hidden')).length;
      seg.classList.toggle('staffon', on);
      if (n) seg.style.gridTemplateColumns = `repeat(${n}, 1fr)`;
    }
  }

  async function refreshRole() {
    try { role = await getRole(); } catch (e) { role = null; }
    const st = isStaffRole(role);
    signed = st;
    showTab(st);
    const mods = q('#stModsTab'), log = q('#stLogTab');
    if (mods) mods.classList.toggle('hidden', role !== 'admin');
    if (log) log.classList.toggle('hidden', role !== 'admin');
    if (q('#stTitle')) q('#stTitle').textContent = role === 'admin' ? 'Admin' : 'Moderator';
    if (q('#stBlurb')) q('#stBlurb').textContent = role === 'admin'
      ? 'Promote moderators, handle reports, and review the audit log. Every action is checked on the server.'
      : 'Handle reports, mute, kick, ban, and remove chat or clan banners. Every action is checked on the server.';
    if (view === 'mods' || view === 'log') { if (role !== 'admin') view = 'reports'; }
    if (q('#wStaff') && !q('#wStaff').classList.contains('hidden') && st) render();
    return st;
  }

  function setView(v) {
    if (v === 'mods' || v === 'log') { if (role !== 'admin') v = 'reports'; }
    view = v;
    q('#stViews') && q('#stViews').querySelectorAll('button').forEach(b => b.classList.toggle('sel', b.dataset.v === view));
    render();
  }
  q('#stViews') && q('#stViews').querySelectorAll('button').forEach(b => { b.onclick = () => setView(b.dataset.v); });

  function playerRow(p, extra = '') {
    const flags = [p.role && p.role !== 'player' ? roleChip(p.role) : '', p.banned ? roleChip('banned') : '', p.muted ? roleChip('muted') : ''].join('');
    return `<div class="strow" data-id="${esc(p.user_id)}">
      <div class="stnm"><b>${esc(p.name || 'Survivor')}</b>${flags}</div>
      <div class="stacts">${extra}</div>
    </div>`;
  }

  async function run(fn, okMsg) {
    try { const d = await fn(); if (okMsg) flash(okMsg); return d; }
    catch (e) { flash(friendlyModError(e)); return null; }
  }

  function punishButtons(p) {
    if (p.role === 'admin') return '<span class="small">Admin</span>';
    const mute = MUTE_OPTS.map(([l, m]) => `<button type="button" data-act="mute" data-mins="${m}" data-id="${esc(p.user_id)}">Mute ${l}</button>`).join('');
    const ban = BAN_OPTS.map(([l, m]) => `<button type="button" data-act="ban" data-mins="${m}" data-id="${esc(p.user_id)}">Ban ${l}</button>`).join('');
    return `${p.muted ? `<button type="button" data-act="unmute" data-id="${esc(p.user_id)}">Unmute</button>` : mute}
      <button type="button" data-act="kick" data-id="${esc(p.user_id)}">Kick</button>
      ${p.banned ? `<button type="button" data-act="unban" data-id="${esc(p.user_id)}">Unban</button>` : ban}
      <button type="button" data-act="rname" data-id="${esc(p.user_id)}">Reset name</button>`;
  }

  async function renderReports() {
    const main = q('#stMain'); main.innerHTML = '<p class="small">Loading reports…</p>';
    const rows = (preview() && preview().reports) || await run(() => listReports('open')) || [];
    if (!rows.length) { main.innerHTML = '<p class="small">No open reports.</p>'; return; }
    main.innerHTML = rows.map(r => {
      const clan = r.clan ? `<div class="small">Clan [${esc(r.clan.tag || '')}] ${esc(r.clan.name || '')}${r.clan.banner_hidden ? ' · hidden' : ''}</div>` : '';
      const chat = r.chat ? `<div class="stquote"><b>${esc(r.chat.name)}:</b> ${esc(r.chat.text)}${r.chat.deleted ? ' <i>(removed)</i>' : ''}</div>` : '';
      const acts = [];
      if (r.type === 'chat' && r.target_chat && !(r.chat && r.chat.deleted)) acts.push(`<button type="button" data-act="dchat" data-id="${esc(r.target_chat)}">Remove chat</button>`);
      if (r.target_user) acts.push(`<button type="button" data-act="rname" data-id="${esc(r.target_user)}">Reset name</button>`);
      if (r.target_clan) {
        acts.push(`<button type="button" data-act="rbanner" data-id="${esc(r.target_clan)}">Reset banner</button>`);
        if (r.type === 'clan_name' || r.type === 'banner') acts.push(`<button type="button" data-act="rclan" data-id="${esc(r.target_clan)}">Reset name</button>`);
      }
      acts.push(`<button type="button" data-act="resolve" data-id="${esc(r.id)}" data-src="${esc(r.source || 'reports')}">Done</button>`);
      acts.push(`<button type="button" data-act="dismiss" data-id="${esc(r.id)}">Dismiss</button>`);
      return `<div class="strep">
        <div class="stnm"><b>${esc((r.type || '').replace('_', ' '))}</b> · ${esc(r.reason || '')} <span class="small">from ${esc(r.reporter || 'Player')}</span></div>
        <div class="small">${esc(r.target_name || '')} ${esc(r.detail || '')}</div>
        ${chat}${clan}
        <div class="stacts">${acts.join('')}</div>
      </div>`;
    }).join('');
    bindActs(main);
  }

  async function renderPlayers() {
    const main = q('#stMain');
    main.innerHTML = `<form class="stsearch" id="stSearch"><input maxlength="24" placeholder="Search player by name" autocomplete="off"><button class="primary" type="submit">Search</button></form><div id="stResults" class="stlist"><p class="small">Type a name to find a player.</p></div>`;
    const form = q('#stSearch'), box = q('#stResults');
    form.onsubmit = async ev => {
      ev.preventDefault();
      const qv = form.querySelector('input').value.trim();
      if (qv.length < 1) return;
      box.innerHTML = '<p class="small">Searching…</p>';
      const rows = (preview() && preview().players) || await run(() => searchPlayers(qv)) || [];
      if (!rows.length) { box.innerHTML = '<p class="small">No players by that name.</p>'; return; }
      box.innerHTML = rows.map(p => playerRow(p, punishButtons(p))).join('');
      bindActs(box);
    };
  }

  async function renderMods() {
    const main = q('#stMain');
    if (role !== 'admin') { main.innerHTML = '<p class="small">Only the admin can promote moderators.</p>'; return; }
    main.innerHTML = `<form class="stsearch" id="stModSearch"><input maxlength="24" placeholder="Search a player to promote" autocomplete="off"><button class="primary" type="submit">Search</button></form>
      <div id="stModFind" class="stlist"></div>
      <h4 class="stsub">Current staff</h4>
      <div id="stStaff" class="stlist"><p class="small">Loading…</p></div>`;
    const staff = (preview() && preview().staff) || await run(() => listStaff()) || [];
    q('#stStaff').innerHTML = staff.length
      ? staff.map(p => playerRow(p, p.role === 'admin' ? '<span class="small">You · cannot be demoted</span>' : `<button type="button" data-act="demote" data-id="${esc(p.user_id)}">Remove mod</button>`)).join('')
      : '<p class="small">No staff listed.</p>';
    bindActs(q('#stStaff'));
    q('#stModSearch').onsubmit = async ev => {
      ev.preventDefault();
      const qv = ev.target.querySelector('input').value.trim();
      const box = q('#stModFind');
      if (qv.length < 1) return;
      box.innerHTML = '<p class="small">Searching…</p>';
      const rows = await run(() => searchPlayers(qv)) || [];
      box.innerHTML = rows.length
        ? rows.map(p => playerRow(p, p.role === 'admin' ? '<span class="small">Admin</span>' : p.role === 'moderator'
          ? `<button type="button" data-act="demote" data-id="${esc(p.user_id)}">Remove mod</button>`
          : `<button type="button" data-act="promote" data-id="${esc(p.user_id)}">Make moderator</button>`)).join('')
        : '<p class="small">No players by that name.</p>';
      bindActs(box);
    };
  }

  async function renderLog() {
    const main = q('#stMain');
    if (role !== 'admin') { main.innerHTML = '<p class="small">Only the admin can view the audit log.</p>'; return; }
    main.innerHTML = '<p class="small">Loading log…</p>';
    const rows = (preview() && preview().audit) || await run(() => auditLog()) || [];
    if (!rows.length) { main.innerHTML = '<p class="small">No staff actions yet.</p>'; return; }
    main.innerHTML = `<div class="stlist">${rows.map(a => `<div class="stlog"><b>${esc(a.action)}</b> · ${esc(a.actor || 'Staff')}
      <span class="small">${esc(a.target_name || a.target_type || '')} · ${esc(a.at ? new Date(a.at).toLocaleString() : '')}</span></div>`).join('')}</div>`;
  }

  function bindActs(node) {
    if (!node) return;
    node.querySelectorAll('button[data-act]').forEach(b => {
      b.onclick = async () => {
        const act = b.dataset.act, id = b.dataset.id, mins = +b.dataset.mins;
        b.disabled = true;
        let ok = null;
        if (act === 'mute') ok = await run(() => mutePlayer(id, mins), 'Muted.');
        else if (act === 'unmute') ok = await run(() => unmutePlayer(id), 'Unmuted.');
        else if (act === 'ban') ok = await run(() => banPlayer(id, mins), mins === 0 ? 'Permanently banned.' : 'Banned.');
        else if (act === 'unban') ok = await run(() => unbanPlayer(id), 'Ban lifted.');
        else if (act === 'kick') { ok = await run(() => kickPlayer(id, null, ''), 'Kicked.'); if (ok) emitStaff({ t: 'kick', user: id }); }
        else if (act === 'rname') ok = await run(() => resetName(id), 'Name reset to Survivor.');
        else if (act === 'rbanner') ok = await run(() => resetClanBanner(id), 'Banner reset.');
        else if (act === 'rclan') ok = await run(() => resetClanName(id), 'Clan name reset.');
        else if (act === 'dchat') { ok = await run(() => deleteChat(id), 'Message removed.'); if (ok) emitStaff({ t: 'chatdel', id }); }
        else if (act === 'resolve') ok = await run(() => resolveReport(id, 'resolved'), 'Report closed.');
        else if (act === 'dismiss') ok = await run(() => resolveReport(id, 'dismissed'), 'Report dismissed.');
        else if (act === 'promote') ok = await run(() => setRole(id, 'moderator'), 'Promoted to moderator.');
        else if (act === 'demote') ok = await run(() => setRole(id, 'player'), 'Moderator removed.');
        b.disabled = false;
        if (ok) render();
      };
    });
  }

  function render() {
    const main = q('#stMain'); if (!main) return;
    if (!isStaffRole(role)) { main.innerHTML = '<p class="small">Staff only.</p>'; showTab(false); return; }
    q('#stViews') && q('#stViews').querySelectorAll('button').forEach(b => b.classList.toggle('sel', b.dataset.v === view));
    if (view === 'players') return renderPlayers();
    if (view === 'mods') return renderMods();
    if (view === 'log') return renderLog();
    return renderReports();
  }

  const api = {
    show() { refreshRole().then(on => { if (on) { const body = q('#wStaff'); if (body && !body.classList.contains('hidden')) render(); } }); },
    refresh: refreshRole,
    isStaff: () => isStaffRole(role),
    role: () => role,
  };
  refreshRole();
  return api;
}
