// Co-op missions for the online town (Quiet Falls map). Pure data: no three.js, so the lobby can list them without loading the game.
// Stage kinds (run by coop.js, host-authoritative):
//   goto   {p:[x,z], r, all?}         a player (or every standing player when all) reaches the spot
//   collect{items:[[x,z],...]}        walk over every supply crate
//   use    {p, r, dur, label}         someone holds the action button there for dur seconds
//   hold   {p, r, dur, waves}         keep at least one standing player inside the zone for dur seconds
//   kills  {p, r, need, waves, seed}  kill `need` zombies inside the zone (zombies spawn there)
//   escort {to, r}                    bring the survivor to the spot alive
// Map spots: spawn street (-6,21.5), store (0,-11, door on its south side), sheds (-40,1) (-14,0) (40,6), gas kiosk (46,-5.5), roads at x/z = ±24.
export const EVAC = [-6, 24];
export const MISSIONS = [
  { id: 'supply', name: 'Supply Run', icon: '📦', mins: '5–8', reward: 150, limit: 600,
    brief: 'The camp is out of food. Grab the 6 supply crates around town, then everyone meets at the evac point.',
    stages: [
      { kind: 'collect', text: 'Collect the supply crates', items: [[-41, 4.4], [-14, 3.6], [46, -0.4], [30, -28.5], [-30, -28.5], [6, 30.5]] },
      { kind: 'goto', text: 'Everyone to the evac point', p: EVAC, r: 7, all: true, evac: true },
    ] },
  { id: 'rescue', name: 'Rescue Marcus', icon: '🆘', mins: '5–7', reward: 250, limit: 600,
    brief: 'Marcus is hiding by the shed on the east side. Free him, then keep him alive all the way back to the evac point.',
    stages: [
      { kind: 'goto', text: 'Find Marcus by the east shed', pin: 'Marcus', p: [36.4, 6], r: 6 },
      { kind: 'use', text: 'Help Marcus up', label: 'Help Marcus up', p: [36.4, 6], r: 2.6, dur: 2.5, survivor: 'free' },
      { kind: 'escort', text: 'Escort Marcus to the evac point', to: EVAC, r: 6, waves: { every: 22, n: 3 } },
    ] },
  { id: 'hold', name: 'Hold the Store', icon: '🛡️', mins: '4–6', reward: 200, limit: 600,
    brief: 'A rescue truck is coming for the store. Get there and hold the front lot until it arrives.',
    stages: [
      { kind: 'goto', text: 'Get to the store', pin: 'Store', p: [0, -1.5], r: 7 },
      { kind: 'hold', text: 'Hold the store lot', pin: 'Hold', p: [0, -1.5], r: 7.5, dur: 90, waves: { every: 12, n: 4 } },
    ] },
  { id: 'clear', name: 'Clear the Store', icon: '🧹', mins: '4–7', reward: 175, limit: 600,
    brief: 'The store is crawling with the dead. Clear 16 of them out so the camp can use it.',
    stages: [
      { kind: 'goto', text: 'Get to the store', pin: 'Store', p: [0, -2], r: 12 },
      { kind: 'kills', text: 'Clear the store', p: [0, -8], r: 18, need: 16, start: 8, waves: { every: 10, n: 3 } },
    ] },
  { id: 'radio', name: 'Radio Tower', icon: '📡', mins: '6–9', reward: 300, limit: 660,
    brief: 'Reach the old radio tower out past the east houses, switch it on and protect it while it calls for help.',
    stages: [
      { kind: 'goto', text: 'Reach the radio tower', pin: 'Tower', p: [70, -31], r: 8 },
      { kind: 'use', text: 'Switch the radio on', label: 'Switch radio on', p: [70, -31], r: 3.2, dur: 3 },
      { kind: 'hold', text: 'Protect the radio', pin: 'Radio', p: [70, -31], r: 10, dur: 60, waves: { every: 10, n: 4 } },
    ] },
];
export const missionById = id => MISSIONS.find(m => m.id === id) || null;
export const NO_DOWN_BONUS = 50, FAIL_PAY = 25;
