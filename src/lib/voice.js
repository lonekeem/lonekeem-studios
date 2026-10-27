// Demo voice: the browser's built-in speech synthesis (free, offline on most devices).
// In real mode, swap speak() for audio returned by a TTS / voice model on your backend.

export const VOICE_STYLES = [
  { id: 'Natural', pitch: 1, rate: 1, volume: 1 },
  { id: 'Deep', pitch: 0.55, rate: 0.92, volume: 1 },
  { id: 'Raspy', pitch: 0.75, rate: 0.95, volume: 1 },
  { id: 'Bright', pitch: 1.45, rate: 1.05, volume: 1 },
  { id: 'Robotic', pitch: 0.1, rate: 0.9, volume: 1 },
  { id: 'Whisper', pitch: 1.1, rate: 0.85, volume: 0.45 },
  { id: 'Warm', pitch: 0.9, rate: 0.95, volume: 1 },
  { id: 'Hyped', pitch: 1.25, rate: 1.2, volume: 1 },
];

export const VOICE_IDEAS = [
  'Calm late-night radio host, slow and smooth',
  'Fast-talking street racer, a little cocky',
  'Old-world storyteller with a gravelly edge',
  'Cheerful and bubbly, always about to laugh',
  'Cold and precise, like a ship computer',
  'Soft-spoken, thoughtful, pauses before punchlines',
];

export const ttsSupported = () => typeof window !== 'undefined' && 'speechSynthesis' in window;

function pickVoice(desc, seed) {
  const voices = window.speechSynthesis.getVoices().filter((v) => v.lang?.startsWith('en'));
  if (!voices.length) return null;
  const d = (desc || '').toLowerCase();
  const fem = /\b(female|woman|girl|she|her)\b/.test(d);
  const male = /\b(male|man|guy|boy|he|him)\b/.test(d);
  const pool = voices.filter((v) => (fem ? /female|samantha|victoria|karen|zira|susan|fiona|moira/i.test(v.name) : male ? /male|daniel|alex|fred|david|mark|george|rishi/i.test(v.name) : true));
  const list = pool.length ? pool : voices;
  return list[seed % list.length];
}

// Returns a handle with .stop(); calls onEnd when finished (or after an estimate
// if the browser has no voices, so the UI still animates).
export function speak({ text, style = 'Natural', pace = 50, desc = '', seed = 0 }, { onStart, onEnd } = {}) {
  const st = VOICE_STYLES.find((s) => s.id === style) || VOICE_STYLES[0];
  const rate = Math.max(0.5, Math.min(2, st.rate * (0.6 + (pace / 100) * 0.9)));
  let done = false;
  const finish = () => { if (!done) { done = true; onEnd?.(); } };
  const est = setTimeout(finish, Math.max(1500, (text.length / (14 * rate)) * 1000 + 600));
  onStart?.();
  if (ttsSupported()) {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.pitch = st.pitch; u.rate = rate; u.volume = st.volume;
    const v = pickVoice(desc, seed);
    if (v) u.voice = v;
    let started = false;
    u.onstart = () => { started = true; };
    // If the device has no usable voice the utterance errors out instantly;
    // keep the estimate timer running so the preview still "plays" visually.
    u.onend = () => { if (started) { clearTimeout(est); finish(); } };
    u.onerror = () => { if (started) { clearTimeout(est); finish(); } };
    window.speechSynthesis.speak(u);
  }
  return { stop: () => { clearTimeout(est); if (ttsSupported()) window.speechSynthesis.cancel(); finish(); } };
}
