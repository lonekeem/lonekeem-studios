// Transport layer for the multiplayer lobby. Phase 1 = BroadcastChannel (two tabs / windows of the same browser, zero cost, zero servers).
// The Net class only talks to a "transport" with send()/onmessage, so Supabase Realtime (or a game server) can be swapped in later without touching the lobby.
export class BroadcastTransport {
  constructor(room) { this.bc = new BroadcastChannel('atq-mp-' + room); this.bc.onmessage = e => this.onmessage && this.onmessage(e.data); }
  send(m) { this.bc.postMessage(m); } close() { this.bc.close(); }
}
// Draft for phase 2 (NOT enabled: the Supabase project is paused and nothing is created without owner approval). See docs/multiplayer.md section 4.
export class SupabaseTransport {
  constructor() { throw new Error('SupabaseTransport is not enabled in phase 1'); }
}
const rid = () => Math.random().toString(36).slice(2, 8);
export class Net {
  constructor(room = 'lobby', transport) {
    this.id = rid(); this.room = room; this.t = transport || new BroadcastTransport(room); this.peers = new Map(); this.me = { name: 'Player', look: null }; this.onHello = null; this.onLeave = null; this.onCar = null; this.onEvt = null;
    this.t.onmessage = m => this.recv(m); this._hello = setInterval(() => this.hello(), 2000); this._prune = setInterval(() => this.prune(), 1000); this.hello();
  }
  hello(to) { this.t.send({ k: 'hello', id: this.id, name: this.me.name, look: this.me.look, clan: this.me.clan || null, to }); }
  state(s) { this.t.send({ k: 'st', id: this.id, s, ts: performance.timeOrigin + performance.now() }); }
  car(c) { this.t.send({ k: 'car', id: this.id, c }); }
  evt(e) { this.t.send({ k: 'ev', id: this.id, e }); } // generic world events (doors, loot, ...)
  recv(m) {
    if (!m || m.id === this.id) return; if (m.to && m.to !== this.id) return; let p = this.peers.get(m.id);
    if (m.k === 'hello') { const fresh = !p; if (!p) { p = { id: m.id, seen: 0 }; this.peers.set(m.id, p); } p.name = m.name; p.clan = m.clan || null; p.seen = performance.now(); const changed = JSON.stringify(p.look) !== JSON.stringify(m.look) || JSON.stringify(p._clanSig) !== JSON.stringify(m.clan || null); p.look = m.look; p._clanSig = m.clan || null; if (fresh) this.hello(m.id); if ((fresh || changed || !p.ann) && this.onHello) { p.ann = true; this.onHello(p); } } // p.ann: a hello that arrived before the town finished loading (onHello not set yet) is replayed by the next periodic hello
    else if (m.k === 'st') { if (!p) { this.hello(m.id); return; } p.seen = performance.now(); p.s = m.s; p.sAt = performance.now(); }
    else if (m.k === 'car') { this.onCar && this.onCar(m.c, m.id); }
    else if (m.k === 'ev') { this.onEvt && this.onEvt(m.e, m.id); }
  }
  prune() { const now = performance.now(); for (const [id, p] of this.peers) if (now - p.seen > 6000) { this.peers.delete(id); this.onLeave && this.onLeave(p); } }
  close() { clearInterval(this._hello); clearInterval(this._prune); this.t.close && this.t.close(); }
}
