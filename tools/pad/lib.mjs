// Emulated standard-mapping gamepad (Xbox layout) for Playwright: overrides navigator.getGamepads.
export const PAD_INIT = () => {
  const mk = () => ({ pressed: false, touched: false, value: 0 });
  const pad = { id: 'Xbox Wireless Controller (emulated)', index: 0, connected: true, mapping: 'standard', timestamp: 0, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, mk) };
  window.__fakePad = pad; navigator.getGamepads = () => [pad, null, null, null];
  window.__padSet = (i, v) => { pad.buttons[i].pressed = !!v; pad.buttons[i].value = v ? 1 : 0; pad.timestamp = performance.now(); };
  window.__padAx = (i, v) => { pad.axes[i] = v; pad.timestamp = performance.now(); };
  window.__padConnect = () => { const e = new Event('gamepadconnected'); e.gamepad = pad; dispatchEvent(e); };
};
export const BTN = { A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, LT: 6, RT: 7, VIEW: 8, START: 9, L3: 10, R3: 11, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 };
export function padOf(p) {
  const raf = n => p.evaluate(n => new Promise(r => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); setTimeout(r, 4000); }), n);
  // hold for at least 3 rendered frames (slow SwiftShader frames would otherwise miss a short press)
  const press = async (b, ms = 120, after = 120) => { const i = typeof b === 'number' ? b : BTN[b]; await p.evaluate(i => window.__padSet(i, 1), i); await raf(3); await p.waitForTimeout(ms); await p.evaluate(i => window.__padSet(i, 0), i); await raf(3); await p.waitForTimeout(after); };
  const hold = async (b, v) => { const i = typeof b === 'number' ? b : BTN[b]; await p.evaluate(([i, v]) => window.__padSet(i, v), [i, v]); };
  const axis = (i, v) => p.evaluate(([i, v]) => window.__padAx(i, v), [i, v]);
  const focus = () => p.evaluate(() => { const f = window.__padNav && window.__padNav.focus; return f ? (f.id ? '#' + f.id : (f.textContent || f.tagName).trim().slice(0, 30)) : null; });
  return { press, hold, axis, focus };
}
