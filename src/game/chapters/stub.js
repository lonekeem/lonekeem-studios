// Placeholder chapter used by the ch12..ch16 stubs: 2 steps that load, walk, and end the chapter. Builders DELETE this call and write real steps.
import { PI, V, dist2, fam, goto } from './helpers.js';

export function stubSteps({ n, z0, title, endLine }) {
  const id = 'c' + n;
  return [
    { id: id + '_stub1', ch: n, cp: [0, z0, PI], obj: 'PLACEHOLDER · Chapter ' + n + ' · ' + title, hint: 'Walk to the marker. (stub step, replace me)', mood: 'night', beat: 1,
      enter(g) { const D = g.stepData; fam(g, D, z0); g.wpTarget = [0, 1.2, z0 - 40]; },
      update(g) { if (dist2(g, 0, z0 - 40) < 4 && !g.stepData.go) { g.stepData.go = true; goto(g, id + '_stub2', 100); } } },
    { id: id + '_stub2', ch: n, cp: [0, z0 - 44, PI], obj: '', hint: '', mood: 'sad', beat: 0,
      enter(g) { const D = g.stepData; g.npc('marcus', 'marcus', 1.4, z0 - 48, PI, 'Idle_Loop'); g.npc('nia', 'nia', -1.4, z0 - 48, PI, 'Idle_Loop', .62);
        g.cut = { anim: 'Idle_Loop', cam: V(2, 1.7, z0 - 41), look: V(0, 1.4, z0 - 48) };
        g.say([['nia', endLine || ('(Chapter ' + n + ' placeholder.)')]], () => { setTimeout(() => g.onComplete && g.onComplete(n), 800); }); } },
  ];
}
