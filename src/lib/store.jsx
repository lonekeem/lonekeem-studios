import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';

const KEY = 'lks-demo-v1';
export const START_CREDITS = 500;
export const DAILY_TOPUP = 50;

const today = () => new Date().toISOString().slice(0, 10);
export const uid = (p) => p + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

export const LORE_FIELDS = [
  { id: 'origin', label: 'Origin Story' },
  { id: 'identity', label: 'Core Identity' },
  { id: 'personality', label: 'Personality' },
  { id: 'social', label: 'Social World' },
  { id: 'territory', label: 'Territory' },
  { id: 'current', label: 'Current State' },
  { id: 'goals', label: 'Goals' },
  { id: 'fears', label: 'Fears' },
];

export const emptyCharacter = () => ({
  name: '', handle: '', look: '', avatar: '',
  versions: [], versionIdx: 0, style: 'Portrait', aspect: '3:4',
  voice: { style: 'Natural', pace: 50, desc: '', generated: false },
  lore: Object.fromEntries(LORE_FIELDS.map((f) => [f.id, ''])),
  age: '', traits: [], bio: '', socials: { x: '', instagram: '', tiktok: '', youtube: '' }, collabs: 'request',
});

const fresh = () => ({
  credits: START_CREDITS,
  lastTopUp: today(),
  ledger: [{ t: Date.now(), amount: START_CREDITS, reason: 'Welcome demo reels' }],
  character: emptyCharacter(),
  onboarded: false,
  clips: [],
  series: [],
  episodes: [],
  likes: {},
  reported: {},
  blocked: [],
  prefs: { language: 'en', fadeUI: false, notifications: false },
  earned: {},
  progress: {}, // episodeKey -> { p: 0..1, t }
  follows: {}, // seriesKey -> true
  remix: null, // draft handed from the feed to Create
  remixRequests: {}, // seriesKey -> 'sent' | 'approved'
  board: null, // storyboard draft
  loggedOut: false,
});

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fresh();
    const saved = JSON.parse(raw);
    const base = fresh();
    const character = { ...base.character, ...(saved.character || {}) };
    character.voice = { ...base.character.voice, ...(saved.character?.voice || {}) };
    character.lore = { ...base.character.lore, ...(saved.character?.lore || {}) };
    character.socials = { ...base.character.socials, ...(saved.character?.socials || {}) };
    // people from the first demo who already saved a character skip first-run
    const onboarded = saved.onboarded ?? !!saved.character?.name;
    return { ...base, ...saved, character, onboarded };
  } catch {
    return fresh();
  }
}

const Ctx = createContext(null);

export function StoreProvider({ children }) {
  const [state, setState] = useState(load);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(state)); }
    catch { setToast('Storage is full — try a smaller avatar image.'); }
  }, [state]);

  const notify = useCallback((msg) => {
    setToast(msg);
    clearTimeout(notify._t);
    notify._t = setTimeout(() => setToast(null), 2600);
  }, []);

  // daily free top-up
  useEffect(() => {
    if (state.lastTopUp !== today()) {
      setState((s) => ({
        ...s,
        credits: s.credits + DAILY_TOPUP,
        lastTopUp: today(),
        ledger: [{ t: Date.now(), amount: DAILY_TOPUP, reason: 'Daily free top-up' }, ...s.ledger].slice(0, 50),
      }));
      notify(`+${DAILY_TOPUP} daily reels added`);
    }
  }, []); // eslint-disable-line

  const api = useMemo(() => {
    const update = (fn) => setState((s) => ({ ...s, ...fn(s) }));
    return {
      state,
      notify,
      update,
      addCredits: (amount, reason) =>
        update((s) => ({ credits: s.credits + amount, ledger: [{ t: Date.now(), amount, reason }, ...s.ledger].slice(0, 50) })),
      spendCredits: (amount, reason) => {
        if (state.credits < amount) return false;
        update((s) => ({ credits: s.credits - amount, ledger: [{ t: Date.now(), amount: -amount, reason }, ...s.ledger].slice(0, 50) }));
        return true;
      },
      saveCharacter: (character) => update(() => ({ character })),
      patchCharacter: (patch) => update((s) => ({ character: { ...s.character, ...(typeof patch === 'function' ? patch(s.character) : patch) } })),
      finishOnboarding: () => update(() => ({ onboarded: true })),
      addClip: (clip) => update((s) => ({ clips: [clip, ...s.clips] })),
      deleteClip: (id) =>
        update((s) => ({
          clips: s.clips.filter((c) => c.id !== id),
          episodes: s.episodes.map((e) => ({ ...e, clipIds: e.clipIds.filter((x) => x !== id) })),
        })),
      createSeries: (title, desc = '') => {
        const s1 = { id: uid('ser'), title, desc, createdAt: Date.now() };
        update((s) => ({ series: [s1, ...s.series] }));
        return s1.id;
      },
      deleteSeries: (id) =>
        update((s) => ({ series: s.series.filter((x) => x.id !== id), episodes: s.episodes.filter((e) => e.seriesId !== id) })),
      saveEpisode: (ep) =>
        update((s) => {
          if (ep.id && s.episodes.some((e) => e.id === ep.id))
            return { episodes: s.episodes.map((e) => (e.id === ep.id ? { ...e, ...ep } : e)) };
          return { episodes: [...s.episodes, { published: false, createdAt: Date.now(), ...ep, id: ep.id || uid('ep') }] };
        }),
      deleteEpisode: (id) => update((s) => ({ episodes: s.episodes.filter((e) => e.id !== id) })),
      toggleLike: (id) => update((s) => ({ likes: { ...s.likes, [id]: !s.likes[id] } })),
      report: (id, reason) => update((s) => ({ reported: { ...s.reported, [id]: reason } })),
      block: (handle) => update((s) => ({ blocked: s.blocked.includes(handle) ? s.blocked : [...s.blocked, handle] })),
      unblock: (handle) => update((s) => ({ blocked: s.blocked.filter((h) => h !== handle) })),
      setPref: (k, v) => update((s) => ({ prefs: { ...s.prefs, [k]: v } })),
      setProgress: (key, p) => update((s) => {
        const prev = s.progress[key]?.p || 0;
        // never move a finished episode back to "in progress" just because it looped
        const next = prev >= 0.95 && p < 0.95 ? prev : p;
        return { progress: { ...s.progress, [key]: { p: Math.min(1, next), t: Date.now() } } };
      }),
      toggleFollow: (key) => update((s) => ({ follows: { ...s.follows, [key]: !s.follows[key] } })),
      setRemix: (remix) => update(() => ({ remix })),
      setRemixRequest: (key, v) => update((s) => ({ remixRequests: { ...s.remixRequests, [key]: v } })),
      setBoard: (board) => update((s) => ({ board: typeof board === 'function' ? board(s.board) : board })),
      markEarned: (k) => update((s) => ({ earned: { ...s.earned, [k]: true } })),
      logOut: () => update(() => ({ loggedOut: true })),
      logIn: () => update(() => ({ loggedOut: false })),
      deleteAccount: () => {
        localStorage.removeItem(KEY);
        setState(fresh());
      },
    };
  }, [state, notify]);

  return <Ctx.Provider value={{ ...api, toast }}>{children}</Ctx.Provider>;
}

export const useStore = () => useContext(Ctx);
