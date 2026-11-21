// During g.say() lines, nearby characters turn to face the person they're talking to
// (yaw only, ~0.3s slerp) and stand in an idle / talking pose instead of a frozen walk.
// The player is only turned / idled when input is locked (g.cut). Peek, wake, victims,
// and scripted runners are left alone.
import { angLerp } from './util.js';

const RANGE = 16;
const TURN = 0.3;
const VOICELESS = new Set(['radio', 'note', 'sgt', 'captain']);
const ALIAS = { dad: 'marcus', mom: 'dana', keem: 'keem', nia: 'nia', marcus: 'marcus', dana: 'dana' };
const MENTION = [
  ['marcus', /\b(dad|marcus|father)\b/i],
  ['nia', /\bnia\b/i],
  ['keem', /\b(keem|son|boy)\b/i],
  ['dana', /\b(mom|mother|dana)\b/i],
  ['reyes', /\breyes\b/i],
  ['tuck', /\btuck\b/i],
  ['dube', /\bdube\b/i],
  ['walt', /\bwalt\b/i],
];
const BUSY_ANIM = /Death|Sit|Sleep|Lie/;
const LOCO_ANIM = /__loco|Walk_Loop|Jog_Fwd|Sprint_Loop|Crouch_Fwd/;
const _hp = { x: 0, y: 0, z: 0 };
const _tp = { x: 0, y: 0, z: 0 };

function angDiff(a, b) { return ((b - a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI; }
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function keyOf(who) { return ALIAS[who] || who; }

function stagedLook(g) {
  if (g.cut && g.cut.noFace) return true;
  const ph = g.stepData && g.stepData.phase;
  if (ph === 'peek' || ph === 'wake') return true;
  if (g.cut && g.cut.anim && /Sitt|Sleep/.test(g.cut.anim)) return true;
  return false;
}

function usable(ch) {
  if (!ch || !ch.root || ch.root.visible === false || !ch.root.parent) return false;
  if (ch.isVictim || ch.down || ch.bleed && BUSY_ANIM.test(ch.curName || '')) return false;
  if (ch.tn) return false; // town-life extras: leave panic / eaten scenes alone
  if (BUSY_ANIM.test(ch.curName || '')) return false;
  return true;
}

function bodyFor(g, who) {
  who = keyOf(who);
  if (!who || VOICELESS.has(who)) return null;
  if (who === 'keem') return usable(g.player) ? g.player : null;
  if (g.npcs[who] && usable(g.npcs[who])) return g.npcs[who];
  for (const k in g.npcs) {
    const c = g.npcs[k];
    if (!usable(c)) continue;
    if (keyOf(c.key) === who || c.lookKey === who || keyOf(c.lookKey) === who) return c;
  }
  return null;
}

function nearby(g) {
  const out = [];
  const P = g.player, pp = P && P.root.position;
  if (usable(P)) out.push({ who: 'keem', ch: P, isPlayer: true });
  if (!pp) return out;
  for (const k in g.npcs) {
    const n = g.npcs[k];
    if (!usable(n) || n === P) continue;
    const q = n.root.position;
    if (Math.hypot(q.x - pp.x, q.z - pp.z) > RANGE) continue;
    out.push({ who: keyOf(n.key || n.lookKey || k), ch: n, isPlayer: false });
  }
  return out;
}

function mentioned(text, speaker, present) {
  if (!text) return null;
  for (const [who, re] of MENTION) {
    if (who === speaker) continue;
    if (!re.test(text)) continue;
    if (present.find(p => p.who === who)) return who;
  }
  return null;
}

function targetOf(g, speaker, text, present) {
  const S = g.dlgFace;
  const named = mentioned(text, speaker, present);
  if (named) {
    const p = present.find(x => x.who === named);
    if (p) return p;
  }
  if (S.lastWho && S.lastWho !== speaker) {
    const p = present.find(x => x.who === S.lastWho);
    if (p) return p;
  }
  if (S.lastBody && S.lastBody !== bodyFor(g, speaker) && usable(S.lastBody)) {
    const p = present.find(x => x.ch === S.lastBody);
    if (p) return p;
  }
  if (speaker !== 'keem') {
    const p = present.find(x => x.who === 'keem');
    if (p) return p;
  }
  const self = bodyFor(g, speaker);
  let best = null, bd = RANGE;
  for (const p of present) {
    if (p.ch === self) continue;
    const d = Math.hypot(p.ch.root.position.x - (self ? self.root.position.x : 0), p.ch.root.position.z - (self ? self.root.position.z : 0));
    if (d < bd) { bd = d; best = p; }
  }
  return best;
}

function poseFor(ch, talking) {
  if (!ch || BUSY_ANIM.test(ch.curName || '')) return;
  if (ch.locoOn) ch.endLoco();
  const talk = talking && ch.lib && ch.lib.clips && ch.lib.clips.Idle_Talking_Loop;
  const name = talk ? 'Idle_Talking_Loop' : 'Idle_Loop';
  if (ch.curName === name) return;
  if (ch.curName && !LOCO_ANIM.test(ch.curName) && !/^Idle_/.test(ch.curName) && !/Talking/.test(ch.curName)) return;
  ch.play(name);
}

function setTurn(S, ch, target, isPlayer) {
  if (!ch || !target || ch === target) return;
  let t = S.turns.get(ch);
  if (!t) { t = { ch, from: ch.root.rotation.y, t: 0, isPlayer }; S.turns.set(ch, t); }
  t.target = target;
  t.isPlayer = isPlayer;
  const want = Math.atan2(target.root.position.x - ch.root.position.x, target.root.position.z - ch.root.position.z);
  if (!t.want || Math.abs(angDiff(t.want, want)) > .08) { t.from = ch.root.rotation.y; t.t = 0; t.want = want; }
}

function headOf(ch, out) {
  const b = ch.bone && (ch.bone('DEF-head') || ch.bone('DEF-neck'));
  if (b) { b.getWorldPosition(out); return out; }
  const p = ch.root.position;
  out.x = p.x; out.y = p.y + 1.5; out.z = p.z;
  return out;
}

function lookHead(ch, target) {
  const head = ch.bone && ch.bone('DEF-head'), neck = ch.bone && ch.bone('DEF-neck');
  if (!head || !target) return;
  headOf(ch, _hp); headOf(target, _tp);
  const dx = _tp.x - _hp.x, dy = _tp.y - _hp.y, dz = _tp.z - _hp.z;
  const body = ch.root.rotation.y;
  let hy = clamp(angDiff(body, Math.atan2(dx, dz)), -0.7, 0.7);
  let hx = clamp(Math.atan2(dy, Math.hypot(dx, dz) || 1e-3), -0.4, 0.35);
  if (neck) { neck.rotateY(hy * 0.35); neck.rotateX(hx * 0.25); }
  head.rotateY(hy * 0.5); head.rotateX(hx * 0.45);
}

function lookBiscuit(rb, from, target) {
  if (!rb || !rb.head || !target) return;
  const p = from.root.position, q = target.root.position;
  const hy = clamp(angDiff(from.root.rotation.y, Math.atan2(q.x - p.x, q.z - p.z)), -1.1, 1.1);
  const hx = clamp(Math.atan2((q.y + 1.4) - (p.y + 1.2), Math.hypot(q.x - p.x, q.z - p.z) || 1), -0.4, 0.35);
  rb.head.rotation.y = hy;
  rb.head.rotation.x = hx * 0.6;
}

function lookFreeBiscuit(B, target) {
  if (!B || !B.r || !B.r.head || !target || B.st === 'hop') return;
  const p = B.grp.position, q = target.root.position;
  const yaw = B.grp.rotation.y || 0;
  B.r.head.rotation.y = clamp(angDiff(yaw, Math.atan2(q.x - p.x, q.z - p.z)), -1.0, 1.0);
  B.r.head.rotation.x = clamp(Math.atan2((q.y + 1.3) - p.y, Math.hypot(q.x - p.x, q.z - p.z) || 1), -0.4, 0.3);
}

export function onDialogueLine(g, it) {
  if (!it || it.cb) return;
  const S = g.dlgFace || (g.dlgFace = { lastWho: null, lastBody: null, turns: new Map(), hold: new Set(), speaker: null, active: false });
  if (stagedLook(g)) { S.active = false; S.hold.clear(); S.turns.clear(); return; }
  const speaker = keyOf(it.who);
  const present = nearby(g);
  const spBody = bodyFor(g, speaker);
  const tgt = targetOf(g, speaker, it.text || it.raw, present);
  S.active = true;
  S.speaker = spBody;
  S.hold.clear();
  const locked = !!g.cut && !(g.truck && g.truck.driving);

  if (spBody && tgt) setTurn(S, spBody, tgt.ch, speaker === 'keem');
  for (const p of present) {
    if (spBody && p.ch === spBody) continue;
    if (spBody) setTurn(S, p.ch, spBody, p.isPlayer);
  }

  for (const [ch, t] of S.turns) {
    if (t.isPlayer && !locked) { S.turns.delete(ch); continue; }
    if (t.isPlayer && locked && g.cut && g.cut.anim && /Sitt|Sleep/.test(g.cut.anim)) { S.turns.delete(ch); continue; }
    if (!t.isPlayer || locked) {
      S.hold.add(ch);
      poseFor(ch, ch === spBody);
    }
  }
  if (locked && g.player) {
    if (g.player.locoOn) g.player.endLoco();
    if (!(g.cut && g.cut.anim && /Sitt|Sleep/.test(g.cut.anim))) poseFor(g.player, speaker === 'keem');
  }

  if (spBody) { S.lastWho = speaker; S.lastBody = spBody; }
}

export function tickDialogueFace(g, dt) {
  const S = g.dlgFace;
  if (!S || !S.active) return;
  if (!g.dlgCur || stagedLook(g)) { endDialogueFace(g); return; }
  const locked = !!g.cut && !(g.truck && g.truck.driving);
  for (const [ch, t] of S.turns) {
    if (!ch || !ch.root || !t.target || !t.target.root) { S.turns.delete(ch); continue; }
    if (t.isPlayer && !locked) continue;
    const want = Math.atan2(t.target.root.position.x - ch.root.position.x, t.target.root.position.z - ch.root.position.z);
    if (Math.abs(angDiff(t.want || want, want)) > .08) { t.from = ch.root.rotation.y; t.t = 0; t.want = want; }
    t.t = (t.t || 0) + dt;
    const u = Math.min(1, t.t / TURN);
    const s = u * u * (3 - 2 * u);
    ch.root.rotation.y = angLerp(t.from, t.want, s);
    if (S.hold.has(ch) && !t.isPlayer) poseFor(ch, ch === S.speaker);
    lookHead(ch, t.target);
  }
  // Biscuit: look at the current speaker (or whoever people are facing)
  const lookAt = S.speaker || (S.turns.size && [...S.turns.values()][0].target);
  if (lookAt) {
    for (const k in g.npcs) {
      const n = g.npcs[k];
      if (n && n.biscuit) lookBiscuit(n.biscuit, n, lookAt);
    }
    if (g.stepData && g.stepData.B) lookFreeBiscuit(g.stepData.B, lookAt);
  }
}

export function endDialogueFace(g) {
  const S = g.dlgFace;
  if (!S) return;
  S.active = false;
  S.hold.clear();
  S.turns.clear();
  S.speaker = null;
  // lastWho stays so a follow-up say() in the same scene can still pick a partner
}

export function resetDialogueFace(g) {
  if (!g.dlgFace) return;
  endDialogueFace(g);
  g.dlgFace.lastWho = null;
  g.dlgFace.lastBody = null;
}
