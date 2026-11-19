import * as THREE from 'three';
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const PI = Math.PI;
const rnd = (a, b) => a + Math.random() * (b - a);
const dist2 = (g, x, z) => Math.hypot(g.player.root.position.x - x, g.player.root.position.z - z);
function follow(g, n, off) { n.update = (dt) => { const P = g.player.root.position, p = n.root.position; const tx = P.x + off[0], tz = P.z + off[1]; const dx = tx - p.x, dz = tz - p.z, d = Math.hypot(dx, dz);
  if (d > 1.2) { const sp = Math.min(d, 1) * (d > 4 ? 5 : 2.8); p.x += dx / d * sp * dt; p.z += dz / d * sp * dt; n.root.rotation.y = Math.atan2(dx, dz); n.play(d > 4 ? 'Jog_Fwd_Loop' : 'Walk_Loop'); } else n.play('Idle_Loop'); }; }
// v1.9.4: never snap the player to a far checkpoint mid-play — fade to black with the next objective instead
function goto(g, i, xp = 100) { const tok = g.stepTok; g.addXP(xp); g.audio.pickup(); setTimeout(() => { if (g.stepTok !== tok) return; const cp = STORY[i] && STORY[i].cp, P = g.player.root.position; if (cp && Math.hypot(cp[0] - P.x, cp[1] - P.z) > 4 && g.fadeStep) g.fadeStep(i); else g.loadStep(i); }, 50); }
// v1.9.7: after a boss (or a big fight) ends, let the death play out (slow-mo + collapse), then give Keem a few seconds of free control
// ("BOSS DOWN"), and only then run dialogue / fades / step changes. Real-time, skips paused time, cancelled if the step changes.
function afterBoss(g, fn, secs = 4.5, label = true) { const tok = g.stepTok; let t = 0, shown = false; const iv = setInterval(() => { if (g.stepTok !== tok) { clearInterval(iv); return; } if (g.paused || g.dead || g.dying) return; t += .1;
  if (label && !shown && t >= 1.4) { shown = true; g.toast('BOSS DOWN', 2.5); g.objective('Boss down', 'Take a breath.'); } if (t >= secs + (g.boss && g.boss.dead && g.boss.deadT < 2.5 ? 99 : 0) - (t > 12 ? 99 : 0)) { clearInterval(iv); fn(); } }, 100); }
// v1.9.4: fight cleared → point at the next checkpoint and advance only when the player walks there (was: instant jump to the next area)
function clearThen(g, D, i, xp, label) { if (D.clr0 == null) D.clr0 = g.t; if (!D.go && g.t - D.clr0 < 2) return; // v1.9.7: let the last death play out before 'Area clear'
  if (D.go === 'walk') { const cp = STORY[i].cp; if (dist2(g, cp[0], cp[1]) < 2.5 && !g.cut) { D.go = true; goto(g, i, xp); } return; }
  if (!D.go) { D.go = 'walk'; const cp = STORY[i].cp; g.wpTarget = [cp[0], 1.2, cp[1]]; g.objective(label, 'Area clear. Follow the marker.'); g.toast('Area clear', 1.6); } }

// Chapter 1 — The Day Before … it ends. Opens at night in Keem's boarded-up house in Riverside, Maine.
export const STORY = [
  { id: 'house', cp: [18.1, 42.6, -PI / 2], obj: 'Wake up', hint: '', mood: 'night', beat: 0,
    enter(g) { const D = g.stepData; D.phase = 'wake';
      g.cut = { anim: 'Sitting_Idle_Loop', cam: V(15.2, 1.7, 41), look: V(18.1, 0.9, 42.6), flash: false }; g.camera.position.copy(g.cut.cam);
      // the street scene outside the boarded window
      g.victim(3.5, 43.6, 'walt', 3);
      const dube = g.npc('dube', 'dube', -4, 30, 0, 'Sprint_Loop'); D.dube = dube; D.chaser = g.spawnZ(-4, 24, { runner: true, idle: true }); D.chaser.play('Sprint_Loop');
      [0, 1.4, 3.1, 5].forEach((t, i) => setTimeout(() => (i === 1 && g.audio.victimScream ? g.audio.victimScream(.12) : g.audio.scream(0.1 + Math.random() * .05)), t * 1000)); setTimeout(() => g.audio.glass(), 2400); setTimeout(() => g.audio.dog(), 3500);
      const own = (k) => g.save.owned.includes(k);
      if (!g.save.items.includes('backpack')) g.addPickup({ kind: 'backpack', story: true, label: 'Grab your backpack', pos: [19.5, 0.85, 40.2] });
      if (!own('bat')) g.addPickup({ kind: 'weapon', item: 'bat', story: true, label: 'Take Dad\'s bat', pos: [13.0, 0.3, 44.3] });
      if (!own('pistol')) g.addPickup({ kind: 'weapon', item: 'pistol', ammo: 24, story: true, label: 'Open Dad\'s lockbox', pos: [19.55, 0.85, 39.65], onTake: (g) => g.say([['note', 'Keem — went to get Nia from the Pells\'. Stay put. If it gets bad, the 9mm is for EMERGENCIES. Code is your birthday. — Dad'], ['keem', "Code is my birthday. Bro. Of course it is."], ['keem', "And \"stay put\" lasted like four minutes, Dad."]]) });
      g.say([['keem', "…"], ['keem', "Hold up… is that screaming?"], ['keem', "Okay. Boards on the windows was Dad's idea. Paranoid Dad was right."], ['keem', "Just look out the window. Don't be the dude in the movie who opens the door."], ['keem', "…Aight. I'm looking."]], () => {
        g.cut = null; g.objective('Check the boarded window', 'Walk to the window (WASD / left stick). Press E / ✋ to peek through the gaps.'); g.wpTarget = [12.6, 1.4, 42.5]; D.phase = 'walk';
        D.uses = [{ x: 12.7, z: 42.5, label: 'Peek through the boards', fn: (g) => this.peek(g) }]; }); },
    peek(g) { const D = g.stepData; if (D.phase !== 'walk') return; D.uses = []; D.phase = 'peek'; g.wpTarget = null; g.cut = { anim: 'Idle_Loop', cam: V(12.3, 1.5, 42.5), look: V(2.5, 0.6, 42.5), flash: false };
      g.player.root.position.set(12.8, 0, 42.5); g.player.root.rotation.y = -PI / 2; g.audio.beat(0); g.audio.sting();
      // Mr. Dube runs past and gets tackled
      const dube = D.dube, ch = D.chaser; dube.root.position.set(-3, 0, 34); ch.root.position.set(-3, 0, 28.5); ch.st = 'script'; dube.play('Sprint_Loop');
      let t = 0; dube.update = (dt) => { t += dt; if (t < 2.2) { dube.root.position.z += dt * 4.6; dube.root.position.x += dt * 1.6; dube.root.rotation.y = .33; ch.root.position.z += dt * 5.6; ch.root.position.x += dt * 1.6; ch.root.rotation.y = .33; ch.mixer.update(0); }
        else if (!dube.down) { dube.down = true; dube.play('Death01', { once: true }); g.audio.scream(.16); g.blood(dube.root.position.clone().setY(.8), V(0, 1, 0), 30, 3); g.decal(dube.root.position.x, dube.root.position.z, 2); dube.bleed = true; dube.mat.userData.u.uBlood.value = g.settings.gore ? 1 : .2;
          ch.root.position.set(dube.root.position.x - .7, 0, dube.root.position.z - .4); ch.root.rotation.y = 1; ch.st = 'eat'; ch.play('Fixing_Kneeling', { speed: 1.6 }); } };
      g.say([['keem', "Mr. Walt…? Oh {shit|nah}. Nah nah nah."], ['keem', "They're… they're eating him. They're {freakin' |}eating Mr. Walt."], ['dube', 'HELP! SOMEBODY HELP ME—'], ['keem', "Mr. Dube, run! RUN, bro!"], ['keem', "…"], ['keem', "Okay. Okay. That can't be real. That can't be real."], ['keem', "Dad and Nia are at the Pells'. Two streets. I gotta get to 'em."], ['keem', "Backpack. Bat. Dad's lockbox. Move, Keem."]], () => {
        g.cut = null; D.phase = 'gear'; g.objective('Gear up: backpack, bat, Dad\'s lockbox', 'Walk over the glowing items and press E / ✋. Collect all three.'); g.audio.beat(1); });
    },
    update(g) { const D = g.stepData; if (D.phase === 'gear') { const need = []; if (!g.save.items.includes('backpack')) need.push([19.5, 1, 40.2]); if (!g.save.owned.includes('bat')) need.push([13, 1, 44.3]); if (!g.save.owned.includes('pistol')) need.push([19.55, 1, 39.65]);
        if (need.length) g.wpTarget = need[0]; else { D.phase = 'door'; g.objective('Pry the boards off the front door', 'Front door, by the living room. Swap weapons with Q / ⇄. Guns: right-click / ⌖ to aim.'); g.wpTarget = [12.7, 1.2, 36.8];
          g.say([['keem', "Bat for the quiet ones. Pistol for the \"oh {shit|no}\" ones."], ['keem', "Mom would end me for this. If she… yeah. Later."]]);
          D.uses = [{ x: 12.8, z: 36.8, label: 'Pry the boards off the door', fn: (g) => { g.setDoor(true); g.audio.crash(); goto(g, 1); } }]; } } } },

  { id: 'street', cp: [10.6, 36.8, -PI / 2], obj: 'Get to the Pell house — Dad and Nia are there', hint: 'Follow the green marker. Melee: click / HIT (chain hits for combos). Roll: Ctrl / ROLL.', mood: 'tense', beat: 2,
    enter(g) { g.stepData.runners = .1; g.victim(3.5, 43.6, 'walt', 3); const dv = g.victim(-1.2, 40.5, 'dube', 1);
      g.horde(7, [[2, 30], [-3, 24], [4, 16], [-4, 10], [1, 4], [-8, 6]]); g.wpTarget = [-11, 1.2, 20];
      g.say([['keem', "Mr. Walt's still… moving. That ain't Mr. Walt no more."], ['keem', "Pells' house. Blue one, other side. Let's go."]]); },
    update(g) { if (dist2(g, -11, 20) < 3) goto(g, 2, 120); } },

  { id: 'pell', cp: [-9.3, 20, PI / 2], obj: '', hint: '', mood: 'night', beat: 1,
    enter(g) { const D = g.stepData; const dad = g.npc('marcus', 'marcus', -11, 19.2, PI / 2, 'Idle_Talking_Loop'); dad.root.add(Object.assign(g.weaponMeshes.shotgun.clone(), { visible: false }));
      const nia = g.npc('nia', 'nia', -11.3, 21, PI / 2, 'Idle_Loop', 0.62); g.cut = { anim: 'Idle_Loop', cam: V(-7.2, 1.7, 17.6), look: V(-10.2, 1.1, 20), flash: true };
      g.say([['marcus', 'KEEM! What the {hell|heck} did I say? I said stay PUT.'], ['keem', "You also said \"emergencies.\" This is the emergency, Dad."], ['marcus', '…Fair. You brought the bat AND the pistol? Good. Don\'t tell your mother.'],
        ['nia', "Biscuit's in my hoodie. He's okay. He's giving you a mean look. Me too."], ['keem', "Biscuit is a rabbit, Nia. Not a therapist."], ['nia', "Yes, Keem. Bunnies can be mad. He learned it from me."],
        ['marcus', 'Listen. The Pells are gone. The truck\'s at Hank\'s Garage. Sheriff Doyle\'s cruiser is by the Market — there\'s a rifle in the rack.'], ['marcus', 'Get it. We\'ll cut through the backyards and meet you at Hank\'s. Fast and loud, son. Don\'t stop.'], ['keem', "Fast and loud. Got it."]], () => {
        g.cut = null; dad.root.visible = false; nia.root.visible = false; g.objective('Get the rifle from the sheriff\'s cruiser by Riverside Market', 'Zombies hunt by sound. Crouch (C) to sneak past. Loot the cash & ammo on the way — spend it in the Armory (pause menu).');
        g.wpTarget = [-8.6, 1.2, -30]; g.stepData.runners = .25; g.horde(10, [[0, -4], [-4, -14], [3, -20], [-2, -24], [6, 2]]); g.victim(-12.5, -38, 'ruth', 2);
        D.uses = [{ x: -8.6, z: -30, r: 2.6, label: 'Take the rifle from the cruiser', fn: (g) => { g.give('rifle'); g.save.ammo.rifle = (g.save.ammo.rifle || 0) + 60; g.say([['keem', "Sheriff Doyle's rifle. My bad, Sheriff."], ['keem', "Okay. Now I'm the {damn |}main character, fr."], ['marcus', "Main character? Boy, you're the comic relief. And what in the world is 'fr'?"]]); goto(g, 3, 150); } }]; }); } },

  { id: 'garage', cp: [-6.5, -28, PI], obj: 'Meet Dad at Hank\'s Garage', hint: 'Rifle is full-auto: hold fire. Reload R / ⟳.', mood: 'tense', beat: 2,
    enter(g) { const D = g.stepData; g.wpTarget = [11, 1.2, -46]; g.horde(4, [[2, -36], [-3, -40]]); D.runners = .2; },
    update(g, dt) { const D = g.stepData;
      if (!D.trig && dist2(g, 12, -48) < 22) { D.trig = true; D.tankerHP = 140; D.hordeAll = true; D.runners = .35; g.horde(14, [[8, -50], [6, -44], [4, -56], [12, -58], [2, -48]]); g.audio.groan(.3);
        g.say([['radio', '(Dad, on the walkie) Keem! They\'re all over the {damn |}pumps! We\'re stuck in the garage!'], ['radio', 'The fuel tanker — SHOOT THE TANKER and get back!'], ['keem', "Shoot the giant freakin' bomb. Cool. Love that plan."]]); g.objective('Shoot the fuel tanker!', 'Aim at the red FLAMMABLE tanker and keep firing — then get clear.'); g.wpTarget = [8, 2, -51]; }
      if (D.tankerDone && !D.after) { D.after = 3; g.say([['keem', "WOOOO— {holy shit|holy crap}, that was WAY bigger than I thought!"], ['radio', 'Keem?! Was that you?!'], ['keem', "Define \"you.\""]]); g.objective('Clear the garage', 'Finish the stragglers.'); }
      if (D.after > 0) { D.after -= dt; if (D.after <= 0) { D.after = -1; } }
      if (D.after === -1 && g.alive().filter(z => dist2(g, z.root.position.x, z.root.position.z) < 30).length <= 2) { D.after = -2; } if (D.after === -2) clearThen(g, D, 4, 200, 'Get back to Dad at the truck'); } },

  { id: 'truck', cp: [14, -54, PI], obj: '', hint: '', mood: 'night', beat: 1,
    enter(g) { const D = g.stepData; const dad = g.npc('marcus', 'marcus', 20, -61, -PI / 2, 'Idle_Talking_Loop'); const nia = g.npc('nia', 'nia', 20.3, -62.6, -PI / 2, 'Idle_Loop', .62);
      g.cut = { anim: 'Idle_Loop', cam: V(15, 1.8, -58), look: V(20, 1, -61.5), flash: true };
      g.say([['marcus', 'You blew the {hell|heck} out of Hank\'s.'], ['keem', "Hank's was already kinda on fire. Emotionally."], ['marcus', 'My hand\'s cut up. You drive. You\'ve played enough of those games.'], ['nia', "He crashes in ALL of them. Every single time! It's so cringe."], ['keem', "That's called DRIP, Dad."], ['marcus', "Drip. Son, you got bat guts on your shoes. That ain't drip, that's a stain."], ['marcus', 'Bridge. Riverside Bridge. The Guard is on the far side. GO.']], () => {
        g.cut = null; D.canDrive = true; g.objective('Get in the truck and drive to Riverside Bridge', 'E / ✋ near the truck. GAS/BRAKE + ◀ ▶ (W/S A/D, pad RT/LT). Ram them.'); g.wpTarget = [22, 1.4, -64];
        D.onDrive = (g) => { dad.root.visible = nia.root.visible = false; g.wpTarget = [0, 1, -96]; g.objective('Drive to Riverside Bridge', 'Plow through. Don\'t stop.'); D.hordeAll = true; D.runners = .3; g.horde(16, [[0, -66], [-2, -72], [3, -78], [-3, -84], [2, -90], [0, -80]]); g.audio.beat(2);
          g.say([['nia', "Left! LEFT! Your OTHER left, Keem!"], ['keem', "I KNOW WHICH {damn |}LEFT!"]]); }; }); },
    update(g) { const T = g.truck; if (T.driving && T.g.position.z < -91) { T.v = 0; g.shake(1); g.audio.crash(); g.exitTruck(); g.player.root.position.set(1, 0, -93.5); goto(g, 5, 150); } } },

  { id: 'boss', cp: [0.5, -93.5, PI], obj: 'Defeat Big Gus', hint: 'Roll away from his slam (red ring) and his charge. Headshots hurt him most.', mood: 'tense', beat: 2,
    enter(g) { const D = g.stepData; const dad = g.npc('marcus', 'marcus', 3.5, -92.5, PI, 'Idle_Loop'); const nia = g.npc('nia', 'nia', 4.2, -91.6, PI, 'Idle_Loop', .62);
      const b = g.spawnZ(-0.2, -103.5, { boss: true, hp: 900, scale: 1.5, runner: false }); b.speed = 1.7; b.cd = 2; g.audio.roar && setTimeout(() => { g.audio.roar(); g.audio.shout('keem_boss', true); }, 1200); b.aggro = 99; b.mat.userData.u.uShirt.value.set('#e8e2d2'); b.mat.userData.u.uBlood.value = g.settings.gore ? 1.3 : .2; g.boss = b; $q('#bossn').textContent = 'BIG GUS — the barber';
      g.horde(4, [[-4, -104], [4, -104]]); D.hordeAll = true; g.wpTarget = null;
      g.say([['keem', "Hold up… is that Gus? From the barbershop?"], ['marcus', 'Gus was always big. That is NOT {fuckin\' |}normal big.'], ['keem', "He gave me the worst {damn |}fade of my life. This is personal."]]); },
    update(g) { if (g.boss && g.boss.dead && !g.stepData.won) { g.stepData.won = true; afterBoss(g, () => g.say([['keem', "Lineup's crooked, Gus. Shoulda let me cut it."], ['nia', "Ewww, that was so gross. …Okay, that was kinda fire. Do it again!"], ['marcus', 'Bridge. Now. {Move your ass|Move it}!']], () => goto(g, 6, 400))); } } },

  { id: 'bridge', cp: [0.3, -97, PI], obj: 'Cross Riverside Bridge', hint: 'Keep Nia close. Don\'t look back.', mood: 'sad', beat: 0,
    enter(g) { const dad = g.npc('marcus', 'marcus', 2, -95.5, PI, 'Walk_Loop'); const nia = g.npc('nia', 'nia', -1.4, -95.5, PI, 'Walk_Loop', .62); follow(g, dad, [1.6, 1.2]); follow(g, nia, [-1.2, .9]); g.wpTarget = [0, 1.2, -122]; g.stepData.dad = dad;
      g.horde(6, [[0, -80], [-4, -84], [4, -86]], { runner: true, aggro: 99 }); g.stepData.runners = .6; },
    update(g) { const D = g.stepData; if (!D.end && g.player.root.position.z < -114) { D.end = true; const dad = D.dad; dad.update = null; dad.root.position.set(0.5, 0, -110); dad.root.rotation.y = 0; dad.play('Pistol_Aim_Neutral');
        g.cut = { anim: 'Idle_Loop', cam: V(-3.5, 1.8, -121), look: V(0.5, 1.2, -110), flash: true }; g.audio.setMood('sad');
        g.say([['marcus', 'Keem. Take your sister. Go.'], ['keem', "Dad, nah — {goddammit, |}come ON—"], ['marcus', 'Somebody has to hold the gate. I\'ll be right behind you.'], ['nia', "Pinky promise? For real for real? No cap?"], ['marcus', 'Promise. Go. GO!'], ['keem', "…"], ['keem', "He said he'd be right behind us."]], () => { g.onComplete && g.onComplete(1); }); } } },

  // ===================== CHAPTER 2 — HIGH WATER =====================
  // Picks up seconds after the bridge. Haverford, the next town south, is flooded, overrun, and very much not the "safe zone" the radio promised.
  { id: 'c2_shore', ch: 2, cp: [0.3, -136, PI], obj: 'Reach the National Guard checkpoint', hint: 'The radio said Haverford was a safe zone. Follow the road south.', mood: 'tense', beat: 1,
    enter(g) { const D = g.stepData; g.ch2Reset(g, 7); if (!g.save.owned.includes('pistol')) { g.give('pistol'); g.save.ammo.light = (g.save.ammo.light || 0) + 48; }
      const nia = g.npc('nia', 'nia', -1.2, -134.5, PI, 'Walk_Loop', .62); follow(g, nia, [-1.2, .9]); D.nia = nia; g.wpTarget = [0, 1.2, -156];
      g.horde(5, [[-6, -146], [6, -150], [0, -170]], { aggro: 14 });
      g.say([['nia', "Dad's coming, right? Say he's coming."], ['keem', "He's coming. He said right behind us. He's coming."], ['nia', "He said his knee was fine too. Then he fell down the stairs!"], ['keem', "That was ONE time. And the refs was {straight-up |}blind."], ['radio', 'This is the National Guard. Haverford is a designated safe zone. Proceed to the checkpoint.'], ['nia', "Safe zone. Okay. I just want a bed and a snack."]]); },
    update(g) { if (dist2(g, 0, -156) < 6 && !g.stepData.go) { g.stepData.go = true; goto(g, 8, 150); } } },

  { id: 'c2_checkpoint', ch: 2, cp: [0.3, -153, PI], obj: 'Clear the checkpoint', hint: 'The soldiers are… busy. Being eaten.', mood: 'tense', beat: 2,
    enter(g) { const D = g.stepData; g.ch2Reset(g, 8); const nia = g.npc('nia', 'nia', -1.4, -152, PI, 'Idle_Loop', .62); follow(g, nia, [-1.2, 1]); D.nia = nia;
      g.victim(-6, -161, null, 3); g.victim(7, -162, null, 2); g.victim(-14, -158, null, 2);
      g.horde(9, [[-8, -166], [8, -168], [0, -175], [-16, -160], [16, -162]], { aggro: 30 }); D.hordeAll = true; g.wpTarget = null; g.audio.beat(2);
      g.say([['nia', "Wait, the safe zone people are eating each other? That's so sus!"], ['keem', "Bro, that soldier's getting his whole {damn |}spine slurped like a noodle."], ['nia', "I'm never eating noodles ever again. Thanks a lot, Keem. Not slay."], ['keem', "Stay behind me!"]]); },
    update(g) { const D = g.stepData; if (!D.clear && g.alive().length === 0) { D.clear = true; g.objective('Search the command tent', 'The big tent on the right. Look for the radio.'); g.wpTarget = [12.5, 1, -154];
        g.say([['keem', "Clear. Nia, you good?"], ['nia', "I stepped IN somebody. Like, inside him. I'm okay. No I'm not!"]]);
        D.uses = [{ x: 12, z: -154, label: 'Search the command tent', fn: (g) => { D.uses = []; g.save.ammo.rifle = (g.save.ammo.rifle || 0) + 90; g.save.cash += 250; g.toast && g.toast('+90 rifle ammo · +$250 · Guard SAW unlocked in the Armory');
          g.cut = { anim: 'Idle_Loop', cam: V(9, 1.7, -151), look: V(14, 1.1, -155) };
          g.say([['sgt', "…if anybody's hearing this… it's Sergeant Okafor… Haverford's gone. Last evac bird lifts from the high school stadium at oh-six-hundred."], ['sgt', "Gate's on a backup panel. Needs fuses. Hardware store, the doughnut place, the laundromat… I really wanted a doughnut. Okafor out."], ['keem', "Fuses, then the roof. I can do that."], ['nia', "You can't even do two things! You burned cereal, Keem. CEREAL!"]], () => { g.cut = null; goto(g, 9, 200); }); } }]; } } },

  { id: 'c2_town', ch: 2, cp: [0, -168, PI], obj: 'Find 3 fuses for the school gate (0/3)', hint: 'Hardware store, Doughnut Depot, Suds-n-Duds laundromat. Loot everything.', mood: 'night', beat: 1,
    enter(g) { const D = g.stepData; g.ch2Reset(g, 9); D.fuses = 0; const nia = g.npc('nia', 'nia', -1.4, -166, PI, 'Idle_Loop', .62); follow(g, nia, [-1.2, 1]); D.nia = nia; g.wpTarget = null;
      g.horde(10, [[-12, -182], [12, -196], [-24, -198], [22, -214], [-6, -226], [28, -190]], { aggro: 16 }); D.runners = .25;
      const got = (msg) => { D.fuses++; g.audio.pickup(); g.objective('Find 3 fuses for the school gate (' + D.fuses + '/3)', 'Hardware store, Doughnut Depot, Suds-n-Duds laundromat.'); g.say(msg);
        if (D.fuses === 3) { g.objective('Get to the Haverford High gate', 'South end of Main. Follow the marker.'); g.wpTarget = [0, 1.2, -253]; g.horde(6, [[-8, -240], [8, -244]], { runner: true, aggro: 40 }); } };
      D.uses = [
        { x: -10, z: -188, label: 'Grab fuse (Haverford Hardware)', fn: () => { D.uses = D.uses.filter(u => u.x !== -10); got([['keem', "Fuse one. And a nail gun I can't even use. Story of my life."], ['nia', "A man is eating another man in the paint aisle! Like a burrito! I wanna go home!"]]); g.horde(4, [[-16, -184], [-8, -194]], { aggro: 30 }); } },
        { x: 9.6, z: -214, label: 'Grab fuse (Doughnut Depot)', fn: () => { D.uses = D.uses.filter(u => u.x !== 9.6); got([['nia', "A Boston cream donut! Okay, this is bussin'. Now I'm happy."], ['keem', "Nia, that zombie got sprinkles on his face. Do NOT eat that {shit|stuff}."]]); g.horde(4, [[14, -222], [6, -208]], { aggro: 30 }); } },
        { x: -25.6, z: -190, label: 'Grab fuse (Suds-n-Duds)', fn: () => { D.uses = D.uses.filter(u => u.x !== -25.6); got([['keem', "Fuse three. Somebody got ate in the spin cycle. Pink suds, bro. Pink."], ['nia', "I'm gonna have bad dreams forever. Like, FOREVER."]]); g.horde(4, [[-30, -200], [-20, -186]], { aggro: 30 }); } }]; },
    update(g) { const D = g.stepData; if (D.fuses === 3 && !D.go && dist2(g, 0, -253) < 4) { D.go = true; goto(g, 10, 300); } } },

  { id: 'c2_gate', ch: 2, cp: [0, -252, 0], obj: 'Hold the gate while Nia wires the panel', hint: 'Waves come up Main Street. Grenades help. Don\'t let them reach Nia.', mood: 'tense', beat: 3,
    enter(g) { const D = g.stepData; g.ch2Reset(g, 10); D.t = 0; D.wave = 0; D.len = 60; const nia = g.npc('nia', 'nia', 3.4, -255.2, PI, 'Idle_Loop', .62); D.nia = nia; g.wpTarget = null; D.hordeAll = true; D.runners = .35;
      g.say([['nia', "Red wire, blue wire… they're both brown! Why are they BROWN?"], ['keem', "Just make it beep, Nia! Ain't that hard!"], ['nia', "Gimme one minute! And stop breathing on me!"]]); },
    update(g, dt) { const D = g.stepData; if (D.done) return; D.t += dt; const left = Math.max(0, Math.ceil(D.len - D.t)); if (left !== D.lastL) { D.lastL = left; g.objective('Hold the gate: ' + left + 's', 'Waves come up Main Street. Protect Nia.'); }
      if (D.t > D.wave * 9 && D.wave < 6) { D.wave++; const n = g.alive().length < 22 ? 5 + D.wave : 2; g.horde(n, [[-6, -222], [6, -226], [-20, -232], [18, -230], [0, -214]], { runner: D.wave > 2, aggro: 99 }); g.audio.roar && D.wave % 2 && g.audio.roar(); }
      if (D.t > 28 && !D.dad) { D.dad = g.npc('marcus', 'marcus', 0, -212, PI, 'Jog_Fwd_Loop'); D.dad.update = (dt) => { const p = D.dad.root.position; if (p.z > -246) { p.z -= 5 * dt; D.dad.play('Jog_Fwd_Loop'); } else D.dad.play('Pistol_Aim_Neutral'); };
        g.say([['marcus', 'KEEM! NIA! Told you. Right behind you!'], ['keem', "Right behind us? That was like two HOURS, Dad!"], ['marcus', 'I stopped for gas. And a doughnut. Shut up and shoot, son.'], ['nia', "Dad! You got Boston cream without me? That's lowkey so rude!"]]); }
      if (D.dad && (D.dcd = (D.dcd || 0) - dt) < 0) { D.dcd = .8; const dp = D.dad.root.position; let best = null, bd = 18; g.alive().forEach(z => { const d = z.root.position.distanceTo(dp); if (d < bd) { bd = d; best = z; } }); if (best) { const dir = best.root.position.clone().sub(dp).normalize(); D.dad.root.rotation.y = Math.atan2(dir.x, dir.z); g.damageZ(best, 70, dir, { head: Math.random() < .4 }); g.audio.shot('shotgun'); } }
      if (D.t >= D.len) { D.done = true; g.world.ch2.panel.material.emissive.set('#2f2'); g.openGate(true); g.audio.play && g.audio.play('reload_in', { vol: .8, flat: true });
        g.say([['nia', "It beeped! I ate that! Say it. Say I'm a genius!"], ['keem', "Gate's open — GO, go, go!"]], () => goto(g, 11, 500)); } } },

  { id: 'c2_boss', ch: 2, cp: [0, -260, PI], obj: 'Defeat Coach Brickman', hint: 'He charges like a linebacker. Sidestep, then unload. Headshots.', mood: 'tense', beat: 2,
    enter(g) { const D = g.stepData; g.ch2Reset(g, 11); g.npc('marcus', 'marcus', 2, -257.5, PI, 'Pistol_Aim_Neutral'); g.npc('nia', 'nia', -2, -257.5, PI, 'Idle_Loop', .62);
      const b = g.spawnZ(0, -284, { boss: true, hp: 1500, scale: 1.75, runner: false }); b.speed = 2.0; b.cd = 2; b.aggro = 99; b.mat.userData.u.uShirt.value.set('#b8202a'); b.mat.userData.u.uBlood.value = g.settings.gore ? 1.4 : .2; g.boss = b; $q('#bossn').textContent = 'COACH BRICKMAN — 31 years, 0 playoff wins';
      g.horde(5, [[-10, -282], [10, -282]], { aggro: 99 }); D.hordeAll = true; g.wpTarget = null; g.audio.roar && setTimeout(() => g.audio.roar(), 900);
      g.say([['brick', 'BEAVERS! ON THE LINE! RAAAGH!'], ['keem', "Is that Coach Brickman? He failed me in gym. Gym, Dad."], ['marcus', "Then go get your {damn |}grade back, son."], ['nia', "He's eating his whistle. The WHOLE whistle. Ew."]]); },
    update(g) { if (g.boss && g.boss.dead && !g.stepData.won) { g.stepData.won = true; afterBoss(g, () => g.say([['keem', "Should've passed me, Coach."], ['marcus', "That's my boy. Ugly as hell, but that's my boy."], ['nia', "Where's the helicopter? Somebody said helicopter!"]], () => goto(g, 12, 600))); } } },

  { id: 'c2_end', ch: 2, cp: [0, -272, PI], obj: 'Find the evac helicopter', hint: 'Check the scoreboard.', mood: 'sad', beat: 0,
    enter(g) { const D = g.stepData; g.ch2Reset(g, 12); const dad = g.npc('marcus', 'marcus', 1.6, -270, PI, 'Walk_Loop'); const nia = g.npc('nia', 'nia', -1.4, -270, PI, 'Walk_Loop', .62); follow(g, dad, [1.6, 1.2]); follow(g, nia, [-1.2, .9]); D.dad = dad; g.wpTarget = [0, 1.2, -293];
      D.uses = [{ x: 0, z: -293.2, label: 'Read the scoreboard', fn: (g) => { D.uses = []; dad.update = nia.update = null; dad.root.position.set(1.6, 0, -291); nia.root.position.set(-1.4, 0, -291.4); dad.root.rotation.y = nia.root.rotation.y = PI; dad.play('Idle_Loop'); nia.play('Idle_Loop');
        g.world.ch2.board.material.map = g.world.signTex ? g.world.signTex(['EVAC LEFT EARLY. SORRY.', 'GO TO PORTLAND · FORT WILLIAMS', '— PFC DANNY, I AM SO SORRY'], '#101010') : g.world.ch2.board.material.map; g.world.ch2.board.material.needsUpdate = true;
        g.cut = { anim: 'Idle_Loop', cam: V(-3, 1.7, -287), look: V(0, 3.6, -296) }; g.audio.setMood('sad');
        g.say([['keem', "\"Evac left early. Sorry. Go to Portland.\" They left EARLY? Who leaves EARLY?"], ['nia', "Danny did. Danny is a big dummy. He's so mid. Forget Danny."], ['marcus', "Portland, then. Sixty miles. We've got a truck and half a doughnut."], ['nia', "Dad… why's your sleeve all wet?"], ['marcus', "It's nothing, baby. Glass. From the gate."], ['keem', "…Dad. Lemme see your arm."], ['marcus', "Keem. I said it's nothing. Get in the truck."]], () => { g.cut = { anim: 'Idle_Loop', cam: V(3, 1.5, -289), look: V(1.6, 1.2, -291) }; setTimeout(() => g.onComplete && g.onComplete(2), 1800); }); } }];
      g.say([['marcus', 'Stadium lights still on. Somebody was here.'], ['keem', "Scoreboard says something. Come on."]]); } },

  // ===================== CHAPTER 3 — ROUTE 1 =====================
  { id: 'c3_road', ch: 3, cp: [0, -310, PI], obj: 'Find fuel at the Big Moose Truck Stop', hint: 'The truck is running on fumes. The truck stop is on the left.', mood: 'night', beat: 1,
    enter(g) { const D = g.stepData; fam(g, D, -312); g.wpTarget = [-22, 1.2, -347]; g.horde(7, [[-8, -330], [6, -345], [-20, -340], [10, -360]], { aggro: 16 });
      g.say([['nia', "Dad, you're all sweaty like Uncle Ray at a cookout."], ['marcus', "It's August, baby."], ['keem', "It's October, Dad. Fr."], ['marcus', "Then it's a hot October. Find us some diesel."]]); },
    update(g) { if (dist2(g, -22, -347) < 6 && !g.stepData.go) { g.stepData.go = true; goto(g, 14, 150); } } },
  { id: 'c3_stop', ch: 3, cp: [-18, -342, PI], obj: 'Clear the truck stop', hint: 'Truckers. Big ones. Aim high.', mood: 'tense', beat: 2,
    enter(g) { const D = g.stepData; fam(g, D, -342, -18); D.hordeAll = true; g.horde(10, [[-30, -356], [-14, -362], [-26, -330], [0, -352]], { aggro: 40 }); D.runners = .3; dadGun(g, D);
      g.say([['marcus', 'Diesel pumps. Cover me.'], ['keem', "That one got a CB radio cord around his neck. Breaker breaker, buddy."], ['nia', "Ooh, bad word! Mom would've gotten you."], ['keem', "Nia, it's a dude with no face. Ain't no way."]]); },
    update(g, dt) { const D = g.stepData; dadTick(g, D, dt); if (!D.clear && g.alive().length === 0) { D.clear = true; g.objective('Pump the diesel', 'Pump island under the canopy.'); g.wpTarget = [-22, 1, -347];
      D.uses = [{ x: -22, z: -347, label: 'Pump diesel', fn: () => { D.uses = []; g.save.cash += 200; g.toast && g.toast('Tank full · +$200 from the register'); g.say([['marcus', "Full tank. Now I need to lie down a minute."], ['nia', "There's a motel! Pine Tree! It has TV! Can we stay? Please? Pretty please?"]], () => goto(g, 15, 200)); } }]; } } },
  { id: 'c3_motel', ch: 3, cp: [10, -372, PI], obj: 'Check Dad at the Pine Tree Motel', hint: 'Room 4. He went in alone.', mood: 'sad', beat: 0,
    enter(g) { const D = g.stepData; fam(g, D, -372, 10, true); g.wpTarget = [27, 1.2, -386]; g.horde(4, [[20, -400], [16, -380]], { aggro: 12 });
      D.uses = [{ x: 26.5, z: -386, label: 'Knock on Room 4', fn: () => { D.uses = []; const dad = g.npc('marcus', 'marcus', 24.5, -386, -PI / 2, 'Idle_Loop'); g.cut = { anim: 'Idle_Loop', cam: V(20, 1.7, -384), look: V(24.5, 1.3, -386) }; g.audio.setMood('sad');
        g.say([['keem', "Dad. Roll up the sleeve."], ['marcus', 'Keem—'], ['keem', "ROLL IT UP."], ['marcus', "…Gate in Haverford. One of the soldiers. Little bastard didn't even have teeth on one side."], ['keem', "That's a bite, Dad. That's a {freakin' |}BITE."], ['marcus', "I know what it is. Don't tell your sister. Not yet."], ['marcus', "Portland. The Navy. Somebody's gotta have something. Till then, I'm still your old man."], ['keem', "…Okay. Okay."]], () => { g.cut = null; dad.root.position.set(22, 0, -384); goto(g, 16, 200); }); } }];
      g.say([['nia', "He's been in there forever. Somebody go check on him. Not me!"]]); } },
  { id: 'c3_boss', ch: 3, cp: [6, -380, PI], obj: 'Kill Big Rig Ronnie', hint: 'He comes with the horn. Dodge the charge, then light him up.', mood: 'tense', beat: 3,
    enter(g) { const D = g.stepData; fam(g, D, -380, 6); dadGun(g, D); const b = boss(g, 0, -402, 1700, '#2a4a7a', 'BIG RIG RONNIE — 2.1 million miles, 0 showers'); b.speed = 2.3;
      g.horde(5, [[-10, -400], [10, -404]], { aggro: 99 }); D.hordeAll = true; g.audio.horn && g.audio.horn();
      g.say([['ronnie', 'TEN-FOUR, GOOD BUDDY! RAAAGH!'], ['nia', "He has a whole steering wheel in his tummy! How is he still walking?"], ['marcus', "That's Ronnie. He sold me bad jerky in 2009. Kill him, son."]]); },
    update(g, dt) { const D = g.stepData; dadTick(g, D, dt); if (g.boss && g.boss.dead && !D.won) { D.won = true; afterBoss(g, () => g.say([['keem', "Over and out, Ronnie."], ['marcus', '*cough* Good. That was good.'], ['nia', "Dad? Your nose is bleeding. Dad!"]], () => goto(g, 17, 600))); } } },
  { id: 'c3_end', ch: 3, cp: [0, -404, PI], obj: 'Get to the turnpike on-ramp', hint: 'South, past the barrier.', mood: 'sad', beat: 0,
    enter(g) { const D = g.stepData; fam(g, D, -404); g.wpTarget = [0, 1.2, -413];
      g.say([['marcus', "Turnpike's faster. Twenty miles to Portland."], ['radio', '...this is the Tollmen. Turnpike is ours. Everybody pays. Everybody.']]); },
    update(g) { if (dist2(g, 0, -413) < 4 && !g.stepData.go) { g.stepData.go = true; g.cut = { anim: 'Idle_Loop', cam: V(2, 1.6, -409), look: V(0, 1.3, -420) }; g.say([['nia', "Pays what? What do we have to pay?"], ['marcus', "Whatever they want, baby. Whatever they want."]], () => g.onComplete && g.onComplete(3)); } } },

  // ===================== CHAPTER 4 — EVERYBODY PAYS =====================
  { id: 'c4_plaza', ch: 4, cp: [0, -424, PI], obj: 'Get through the toll plaza', hint: 'Humans shoot back. Use cars for cover. Strafe.', mood: 'tense', beat: 2,
    enter(g) { const D = g.stepData; fam(g, D, -424); dadGun(g, D); raiders(g, 6, [[-12, -466], [12, -466], [-20, -458], [20, -460], [0, -474]]); D.hordeAll = true;
      g.say([['deacon', 'Toll is one gun, one gallon, and one of the girls. Exact change only.'], ['keem', "How about one bullet. In your face."], ['marcus', "That's my boy."]]); },
    update(g, dt) { const D = g.stepData; dadTick(g, D, dt); if (D.go === 'walk' || (!D.go && g.alive().length === 0)) clearThen(g, D, 19, 250, 'Plaza clear — follow the drag marks south'); } },
  { id: 'c4_taken', ch: 4, cp: [0, -462, PI], obj: 'Find Dad and Nia', hint: 'Follow the drag marks to the camp.', mood: 'night', beat: 1,
    enter(g) { const D = g.stepData; g.openGate(true); g.cut = { anim: 'Idle_Loop', cam: V(3, 1.8, -458), look: V(0, 1, -470), flash: true }; g.audio.setMood('sad');
      g.say([['nia', "KEEM! Let go of me! Let GO!"], ['marcus', 'Take me, not her, you sons of bitches—'], ['deacon', "Oh, we're takin' both. The old man's got a bite. The Captain pays double for biters."], ['keem', "DAD!"]], () => { g.cut = null; g.wpTarget = [0, 1.2, -505]; g.horde(8, [[-10, -485], [10, -490], [-24, -480], [24, -484]], { aggro: 20 }); raiders(g, 4, [[-8, -498], [8, -500], [-20, -492], [20, -494]]); }); },
    update(g) { if (dist2(g, 0, -505) < 7 && !g.stepData.go && !g.cut) { g.stepData.go = true; goto(g, 20, 250); } } },
  { id: 'c4_cage', ch: 4, cp: [0, -500, PI], obj: 'Clear the camp, then break the cage', hint: 'Raiders first. Then the padlock.', mood: 'tense', beat: 3,
    enter(g) { const D = g.stepData; g.openGate(true); D.hordeAll = true; g.npc('marcus', 'marcus', -1, -514, 0, 'Idle_Loop'); g.npc('nia', 'nia', 1, -514, 0, 'Idle_Loop', .62); raiders(g, 6, [[-14, -508], [14, -508], [-22, -500], [22, -500]]); g.horde(6, [[-30, -510], [30, -510]], { runner: true, aggro: 99 });
      g.say([['nia', "Keem! In here! It smells like stinky feet! Not the vibe!"], ['keem', "Hang on, Nia! I'm coming!"]]); },
    update(g) { const D = g.stepData; if (!D.clear && g.alive().length === 0) { D.clear = true; g.wpTarget = [0, 1, -512];
      D.uses = [{ x: 0, z: -512.4, label: 'Break the padlock', fn: () => { D.uses = []; g.say([['marcus', "Knew you'd come. Took your sweet time."], ['nia', "Dad BIT one of them. With his teeth! That's so gross!"], ['marcus', "…He tasted like Marlboros."]], () => goto(g, 21, 300)); } }]; } } },
  { id: 'c4_boss', ch: 4, cp: [0, -506, PI], obj: 'Kill Deacon', hint: 'He hides behind his boys. Grenades.', mood: 'tense', beat: 2,
    enter(g) { const D = g.stepData; fam(g, D, -506); dadGun(g, D); const b = g.spawnZ(0, -490, { raider: true, hp: 1100, gun: 'shotgun', shirt: '#101010' }); b.root.scale.setScalar(1.25); g.boss = b; $q('#bossn').textContent = 'DEACON — Tollman lieutenant';
      raiders(g, 4, [[-10, -488], [10, -488]]); D.hordeAll = true; g.say([['deacon', "You owe the toll, boy. I'll take it outta your hide."], ['keem', "Come collect, Deacon. Exact change."]]); },
    update(g, dt) { const D = g.stepData; dadTick(g, D, dt); if (g.boss && g.boss.dead && !D.won) { D.won = true; afterBoss(g, () => g.say([['deacon', '…the King… he\'ll find you…'], ['keem', "Tell him the toll's paid. In full. Bet."], ['marcus', "'Bet.' Every time. You sound like a group chat with legs."]], () => goto(g, 22, 600))); } } },
  { id: 'c4_end', ch: 4, cp: [0, -512, PI], obj: 'Head for the Maine Mall', hint: 'South. Past the barrier.', mood: 'sad', beat: 0,
    enter(g) { const D = g.stepData; fam(g, D, -512); g.wpTarget = [0, 1.2, -523];
      g.say([['nia', "Who's the Captain? Why does he want the biters?"], ['marcus', "Don't know, baby. Don't wanna."], ['marcus', 'My hand… I can\'t feel my hand, Keem.']]); },
    update(g) { if (dist2(g, 0, -523) < 4 && !g.stepData.go) { g.stepData.go = true; g.say([['keem', "Mall's got a pharmacy. We gon' find you something, Dad. I promise."]], () => g.onComplete && g.onComplete(4)); } } },

  // ===================== CHAPTER 5 — BLACK FRIDAY =====================
  { id: 'c5_lot', ch: 5, cp: [0, -534, PI], obj: 'Cross the Maine Mall parking lot', hint: 'Somebody is waving a flashlight by the doors.', mood: 'night', beat: 1,
    enter(g) { const D = g.stepData; fam(g, D, -534); dadGun(g, D); g.wpTarget = [0, 1.2, -606]; g.horde(12, [[-20, -560], [16, -570], [-8, -585], [24, -590], [0, -598]], { aggro: 18 }); D.runners = .3;
      g.say([['nia', "I got a Cinnabon here one time. It was the GOAT. Best day of my whole life."], ['keem', "Cinnabon is a corpse now, Nia. Let it go."]]); },
    update(g) { if (dist2(g, 0, -606) < 6 && !g.stepData.go) { g.stepData.go = true; goto(g, 24, 200); } } },
  { id: 'c5_pharm', ch: 5, cp: [0, -604, PI], obj: 'Find 3 antiviral packs (0/3)', hint: 'Dr. Reyes says: the kiosk, the van, the ambulance.', mood: 'tense', beat: 2,
    enter(g) { const D = g.stepData; fam(g, D, -604); dadGun(g, D); D.n = 0; const R = g.npc('reyes', null, 3, -608, PI, 'Idle_Loop'); const T = g.npc('tuck', null, 5, -607, PI, 'Pistol_Aim_Neutral');
      g.say([['reyes', "Imani Reyes. Veterinarian. Let me see the arm— oh. Oh, sir."], ['tuck', "Tuck. I sold phone cases at the kiosk. Now I sell headshots."], ['reyes', 'Antivirals won\'t cure it. They slow it. There\'s three packs out there in the lot.'], ['marcus', "Slow is good. Slow I'll take."]]);
      const got = () => { D.n++; g.audio.pickup(); g.objective('Find 3 antiviral packs (' + D.n + '/3)', 'Kiosk, van, ambulance.'); g.horde(4, [[g.player.root.position.x + 10, g.player.root.position.z + 8]], { runner: true, aggro: 30 }); if (D.n === 3) { g.wpTarget = [0, 1.2, -604]; g.say([['reyes', 'Bring them here. Then we hold the food court.']], () => goto(g, 25, 300)); } };
      D.uses = [[-24, -600, 'Search the kiosk'], [22, -566, 'Search the van'], [-26, -552, 'Search the ambulance']].map(([x, z, label]) => ({ x, z, label, fn: () => { D.uses = D.uses.filter(u => u.x !== x); got(); } }));
      g.horde(8, [[-24, -590], [22, -574], [-26, -560]], { aggro: 14 }); } },
  { id: 'c5_hold', ch: 5, cp: [0, -600, PI], obj: 'Hold the doors while Reyes works', hint: 'Waves from every direction. Protect Dad.', mood: 'tense', beat: 3,
    enter(g) { const D = g.stepData; D.t = 0; D.wave = 0; D.len = 50; D.hordeAll = true; D.runners = .4; g.npc('marcus', 'marcus', 0, -609, PI, 'Idle_Loop'); g.npc('reyes', null, 1.4, -609, -PI / 2, 'Idle_Loop'); g.npc('nia', 'nia', -1.5, -609, PI, 'Idle_Loop', .62);
      g.say([['reyes', 'Hold still, Marcus. This is going in your thigh.'], ['marcus', "Buy me dinner first, doc."], ['tuck', 'Incoming! All of them!']]); },
    update(g, dt) { const D = g.stepData; if (D.done) return; D.t += dt; const left = Math.max(0, Math.ceil(D.len - D.t)); if (left !== D.lastL) { D.lastL = left; g.objective('Hold the doors: ' + left + 's', 'Protect Dad.'); }
      if (D.t > D.wave * 8 && D.wave < 6) { D.wave++; g.horde(g.alive().length < 22 ? 5 + D.wave : 2, [[-24, -570], [24, -570], [0, -555], [-30, -595], [30, -595]], { runner: D.wave > 2, aggro: 99 }); }
      if (D.t >= D.len) { D.done = true; g.say([['reyes', "It's in. It'll buy him days. Maybe a week."], ['nia', "Days for what? Until what?"], ['tuck', 'Uh, guys? Santa is coming out of the mall.']], () => goto(g, 26, 400)); } } },
  { id: 'c5_boss', ch: 5, cp: [0, -596, PI], obj: 'Kill Mall Santa', hint: 'He throws elves. Do not let him hug you.', mood: 'tense', beat: 2,
    enter(g) { const D = g.stepData; fam(g, D, -596); dadGun(g, D); const b = boss(g, 0, -610, 2000, '#c01818', 'MALL SANTA — naughty list: everyone'); b.speed = 2.1; g.horde(6, [[-12, -606], [12, -606]], { runner: true, aggro: 99 }); D.hordeAll = true;
      g.say([['santa', 'HO… HO… HOOOOARGH!'], ['nia', "I sat on his lap when I was six! I want my picture back!"], ['keem', "And I'm finna put six in his fat belly."]]); },
    update(g, dt) { const D = g.stepData; dadTick(g, D, dt); if (g.boss && g.boss.dead && !D.won) { D.won = true; afterBoss(g, () => g.say([['keem', "Merry {freakin' |}Christmas, man."], ['tuck', "That's the best thing I've ever seen."]], () => goto(g, 27, 600))); } } },
  { id: 'c5_end', ch: 5, cp: [0, -600, PI], obj: 'Talk to Dr. Reyes', hint: 'She knows something.', mood: 'sad', beat: 0,
    enter(g) { const D = g.stepData; fam(g, D, -600); const R = g.npc('reyes', null, 3, -606, PI, 'Idle_Loop'); g.wpTarget = [3, 1.2, -605];
      D.uses = [{ x: 3, z: -605, label: 'Talk to Dr. Reyes', fn: () => { D.uses = []; g.cut = { anim: 'Idle_Loop', cam: V(0, 1.7, -601), look: V(3, 1.4, -606) };
        g.say([['reyes', 'There was a Navy broadcast. Fort Williams. They have a cure trial. They want infected volunteers.'], ['marcus', "Then I'm volunteering."], ['tuck', "The Tollmen heard it too. Their King's camped by the lighthouse."], ['keem', "Then we go through the King."]], () => g.onComplete && g.onComplete(5)); } }]; } },

  // ===================== CHAPTER 6 — THE LIGHTHOUSE =====================
  { id: 'c6_park', ch: 6, cp: [0, -646, PI], obj: 'Reach the old fort', hint: 'Fort Williams. The stone ruins on the left.', mood: 'night', beat: 1,
    enter(g) { const D = g.stepData; fam(g, D, -646); dadGun(g, D); g.wpTarget = [-26, 1.2, -678]; g.horde(10, [[-10, -665], [10, -670], [-20, -690], [16, -684]], { aggro: 16 });
      g.say([['marcus', "Your mother and I got engaged right there. By the lighthouse."], ['nia', "Ewww. Stop it!"], ['marcus', 'She said yes. Then she threw up. Lobster roll.']]); },
    update(g) { if (dist2(g, -26, -678) < 7 && !g.stepData.go) { g.stepData.go = true; goto(g, 29, 200); } } },
  { id: 'c6_raid', ch: 6, cp: [-20, -678, PI], obj: 'Survive the Tollmen raid', hint: 'Raiders and the dead. Hold the ruins.', mood: 'tense', beat: 3,
    enter(g) { const D = g.stepData; fam(g, D, -678, -20); dadGun(g, D); D.hordeAll = true; raiders(g, 8, [[-6, -700], [6, -704], [-30, -705], [20, -700], [0, -715]]); g.horde(8, [[-40, -690], [30, -680]], { runner: true, aggro: 99 });
      g.say([['king', "The Navy's boat is MINE, children. The biter comes with me."], ['keem', "Over my dead body."], ['king', "That's the plan, sweetheart."]]); },
    update(g, dt) { const D = g.stepData; dadTick(g, D, dt); if (D.go === 'walk' || (!D.go && g.alive().length === 0)) clearThen(g, D, 30, 400, 'Raid survived — head for the Toll King'); } },
  { id: 'c6_boss', ch: 6, cp: [0, -700, PI], obj: 'Kill the Toll King', hint: 'Armored. Headshots and grenades.', mood: 'tense', beat: 2,
    enter(g) { const D = g.stepData; fam(g, D, -700); dadGun(g, D); const b = g.spawnZ(4, -722, { raider: true, hp: 1600, gun: 'saw', shirt: '#4a3a10' }); b.root.scale.setScalar(1.35); g.boss = b; $q('#bossn').textContent = 'THE TOLL KING — everybody pays';
      raiders(g, 4, [[-10, -718], [14, -718]]); D.hordeAll = true; g.say([['king', 'Pay up, boy!'], ['marcus', "Keem. Take his crown."]]); },
    update(g, dt) { const D = g.stepData; dadTick(g, D, dt); if (g.boss && g.boss.dead && !D.won) { D.won = true; afterBoss(g, () => g.say([['king', 'The Captain… he doesn\'t cure them… he…'], ['nia', "He what? Say the rest!"]], () => goto(g, 31, 700))); } } },
  { id: 'c6_light', ch: 6, cp: [4, -712, PI], obj: 'Signal the ship from the lighthouse', hint: 'The keeper\'s house by the tower.', mood: 'sad', beat: 0,
    enter(g) { const D = g.stepData; fam(g, D, -712, 4); g.wpTarget = [8, 1.2, -733];
      D.uses = [{ x: 8, z: -732, label: 'Flash the lighthouse signal', fn: () => { D.uses = []; const s = g.world.zones && g.world.zones._ship; if (s) s.intensity = 60; goto(g, 32, 500); } }]; } },
  { id: 'c6_end', ch: 6, cp: [6, -728, PI], obj: '', hint: '', mood: 'sad', beat: 0,
    enter(g) { const D = g.stepData; const dad = g.npc('marcus', 'marcus', 8, -731, PI, 'Idle_Loop'); g.npc('nia', 'nia', 4.5, -730, PI, 'Idle_Loop', .62); g.npc('reyes', null, 2.5, -729, PI, 'Idle_Loop');
      g.cut = { anim: 'Idle_Loop', cam: V(6, 1.7, -724), look: V(-30, 2, -840) }; g.audio.setMood('sad'); const s = g.world.zones && g.world.zones._ship; if (s) s.intensity = 60;
      g.say([['radio', 'Fort Williams, this is the Captain. We see your light. Bring the infected one to the shore. Alone.'], ['reyes', "…That's not a Navy call sign."], ['nia', "Dad?"],
        ['marcus', "Keem… my eyes. Everything's gray."], ['keem', "Dad, look at me. LOOK at me."], ['marcus', 'Keem… run. Take your sister and run.']],
        () => { g.cut = { anim: 'Idle_Loop', cam: V(6, 1.6, -720), look: V(6, 3, -760) }; dad.root.visible = false; g.shake(1); g.audio.shot('revolver'); setTimeout(() => g.onComplete && g.onComplete(6), 2200); }); } },

  // ===================== CHAPTER 7 — REARVIEW (driving) =====================
  { id: 'c7_drive', ch: 7, cp: [2, -1010, PI], obj: '', hint: '', mood: 'tense', beat: 2,
    enter(g) { const D = g.stepData; fam(g, D, -1010, 0, true); g.npc('reyes', null, -2, -1013, PI, 'Idle_Loop'); g.npc('tuck', null, 5.5, -1013, PI, 'Idle_Loop');
      const T = g.truck; T.g.position.set(4, 0, -1018); T.head = PI; T.g.rotation.y = PI; g.updateTruckCol();
      g.cut = { anim: 'Idle_Loop', cam: V(-2, 1.8, -1004), look: V(3, 1, -1016), flash: true };
      g.say([['nia', "Where did Dad go? Keem, where did he GO?"], ['reyes', 'He ran into the fog. Then there was a boat light. Then nothing.'], ['tuck', "The Captain's men grabbed him off the rocks. Red boat. Heading for Cape Marina."],
        ['keem', "Then we hit the marina. Everybody in the truck. Now."], ['nia', "You're driving? Again? You crash in every single game. That's so cringe."], ['keem', "That was one time. Buckle up."]], () => {
        g.cut = null; D.canDrive = true; g.objective('Get in the truck', 'E / ✋ near the truck. GAS/BRAKE + ◀ ▶ (W/S A/D, pad RT/LT).'); g.wpTarget = [4, 1.4, -1018];
        D.onDrive = (g) => { for (const k in g.npcs) g.npcs[k].root.visible = false; D.k0 = g.save.kills; g.wpTarget = [0, 1, -1232]; D.hordeAll = true; D.runners = .45;
          g.horde(26, [[0, -1050], [-6, -1075], [6, -1100], [-4, -1125], [5, -1150], [0, -1175], [-6, -1195], [6, -1215]], { aggro: 30 }); g.audio.beat(3);
          g.say([['nia', "Hit that one! HIT HIM! Yesss, ten points!"], ['keem', "That's five! Somebody count!"], ['tuck', 'Watch the burning cars. Watch the— okay, you hit it. Fine.']]); }; }); },
    update(g) { const T = g.truck, D = g.stepData; if (!T.driving) return; const k = g.save.kills - (D.k0 || 0); if (k !== D.lk) { D.lk = k; g.objective('Drive to Cape Marina · Roadkill: ' + k, 'Plow through them. Bonus cash for every splat.'); }
      if (T.g.position.z < -1226) { T.v = 0; g.shake(1); g.audio.crash(); g.exitTruck(); g.player.root.position.set(4, 0, -1232); g.save.cash += k * 10; goto(g, 34, 150); } } },
  { id: 'c7_boss', ch: 7, cp: [4, -1232, PI], obj: 'Kill the Bait Man', hint: 'He swings an anchor. Roll the slam, then unload.', mood: 'tense', beat: 2,
    enter(g) { const D = g.stepData; fam(g, D, -1228, 2, true); const b = boss(g, 8, -1212, 2200, '#2a5a6a', 'THE BAIT MAN — Cape Marina, est. 1974'); b.speed = 2.2; g.horde(6, [[-8, -1214], [12, -1218]], { runner: true, aggro: 99 }); D.hordeAll = true;
      g.say([['nia', "Ew, he smells like fish sticks and feet!"], ['keem', "Bait shop's closed, man. For good."]]); },
    update(g) { const D = g.stepData; if (g.boss && g.boss.dead && !D.won) { D.won = true; afterBoss(g, () => g.say([['keem', "Catch and release, buddy. Mostly the release part."], ['tuck', "There's a harpoon gun on his shop counter. Just saying."]], () => goto(g, 35, 600))); } } },
  { id: 'c7_end', ch: 7, cp: [4, -1236, PI], obj: 'Answer the marina radio', hint: 'The CB is crackling by the dock.', mood: 'sad', beat: 0,
    enter(g) { const D = g.stepData; fam(g, D, -1234, 2, true); g.wpTarget = [8, 1.2, -1250];
      D.uses = [{ x: 8, z: -1250, label: 'Answer the radio', fn: () => { D.uses = []; g.cut = { anim: 'Idle_Loop', cam: V(4, 1.7, -1240), look: V(8, 1.2, -1252) };
        g.say([['captain', 'Little Pell. Your father bit two of my men. I like him.'], ['captain', "Come to Peaks Island. Bring the girl. We'll make a trade."], ['nia', "We're NOT a trade! I'm a whole person! That's so rude!"], ['keem', "I'm coming. And I'm bringing every bullet I got."]], () => g.onComplete && g.onComplete(7)); } }]; } },

  // ===================== CHAPTER 8 — OPEN WATER =====================
  { id: 'c8_term', ch: 8, cp: [0, -1264, PI], obj: 'Reach the Peaks Island ferry', hint: 'Casco Bay Lines terminal. Down the ramp.', mood: 'night', beat: 1,
    enter(g) { const D = g.stepData; fam(g, D, -1264, 0, true); g.wpTarget = [0, 1.2, -1342]; g.horde(14, [[-10, -1290], [10, -1300], [-6, -1320], [8, -1330]], { aggro: 16 }); raiders(g, 3, [[-8, -1325], [8, -1330]]); D.runners = .3;
      g.say([['tuck', 'Casco Bay Lines. I took this ferry to prom. Threw up on it, too.'], ['keem', "Bro really said prom. Like we got time."], ['nia', "Was your date pretty? Was she a zombie? Tell me everything!"]]); },
    update(g) { if (dist2(g, 0, -1342) < 6 && !g.stepData.go) { g.stepData.go = true; goto(g, 37, 200); } } },
  { id: 'c8_hold', ch: 8, cp: [0, -1350, PI], obj: 'Hold the car deck while Tuck starts the ferry', hint: 'They pour down the ramp. Protect Nia.', mood: 'tense', beat: 3,
    enter(g) { const D = g.stepData; D.t = 0; D.wave = 0; D.len = 45; D.hordeAll = true; D.runners = .4; g.npc('tuck', null, 0, -1433, PI, 'Idle_Loop'); g.npc('reyes', null, 2, -1356, PI, 'Idle_Loop'); g.npc('nia', 'nia', -1.5, -1357, PI, 'Idle_Loop', .62);
      g.say([['tuck', 'Engine is cold. Give me forty-five seconds.'], ['reyes', "Keem, they're coming down the ramp!"]]); },
    update(g, dt) { const D = g.stepData; if (D.done) return; D.t += dt; const left = Math.max(0, Math.ceil(D.len - D.t)); if (left !== D.lastL) { D.lastL = left; g.objective('Hold the car deck: ' + left + 's', 'Protect Nia.'); }
      if (D.t > D.wave * 8 && D.wave < 6) { D.wave++; g.horde(g.alive().length < 22 ? 5 + D.wave : 2, [[-8, -1310], [8, -1310], [0, -1300], [-10, -1325], [10, -1325]], { runner: D.wave > 2, aggro: 99 }); }
      if (D.t >= D.len) { D.done = true; g.say([['tuck', "She's alive! Casting off!"], ['nia', "We're on a BOAT! This is bussin'! …Wait, something's moving downstairs."]], () => goto(g, 38, 400)); } } },
  { id: 'c8_boss', ch: 8, cp: [0, -1400, PI], obj: 'Kill the Deckhand', hint: 'He hits like a wave. Keep moving on the deck.', mood: 'tense', beat: 2,
    enter(g) { const D = g.stepData; fam(g, D, -1400, 0, true); const b = boss(g, 0, -1372, 2500, '#1a2a4a', 'THE DECKHAND — 30 years on the Peaks run'); b.speed = 2.3; g.horde(6, [[-8, -1380], [8, -1380]], { runner: true, aggro: 99 }); D.hordeAll = true;
      g.say([['nia', "He still has his little captain hat! That's lowkey cute. Kill him anyway."], ['keem', "Last stop, my guy. Everybody off."]]); },
    update(g) { const D = g.stepData; if (g.boss && g.boss.dead && !D.won) { D.won = true; afterBoss(g, () => g.say([['keem', "Ticket punched. Overboard, dummy."], ['tuck', 'There is a minigun bolted to the wheelhouse. Who puts a minigun on a ferry?'], ['keem', "The Captain's, I guess. It's mine now."]], () => goto(g, 39, 600))); } } },
  { id: 'c8_end', ch: 8, cp: [0, -1428, PI], obj: '', hint: '', mood: 'sad', beat: 0,
    enter(g) { const D = g.stepData; g.npc('nia', 'nia', -1.5, -1430, PI, 'Idle_Loop', .62); g.npc('reyes', null, 1.8, -1430, PI, 'Idle_Loop'); g.cut = { anim: 'Idle_Loop', cam: V(0, 2.2, -1424), look: V(0, 3, -1600) }; g.audio.setMood('sad');
      g.say([['reyes', "Peaks Island. The old battery is lit up like a hospital."], ['captain', 'I see your ferry, little Pell. Your father is awake. He keeps saying your name.'], ['nia', "Dad's awake? Keem, he's AWAKE!"], ['keem', "Hold on, Dad. We almost there."]], () => g.onComplete && g.onComplete(8)); } },

  // ===================== CHAPTER 9 — PEAKS ISLAND =====================
  { id: 'c9_beach', ch: 9, cp: [0, -1464, PI], obj: 'Storm the Captain\'s gate', hint: 'Real guns at the fence. Use the wrecks.', mood: 'tense', beat: 2,
    enter(g) { const D = g.stepData; fam(g, D, -1464, 0, true); g.wpTarget = [0, 1.2, -1540]; raiders(g, 6, [[-8, -1520], [8, -1525], [-14, -1530], [14, -1532]]); g.horde(10, [[-10, -1490], [10, -1500], [0, -1510]], { aggro: 18 });
      g.say([['tuck', "Captain's guys at the gate. Real guns."], ['reyes', 'Stay low. Keep the girl behind you.'], ['keem', "Nia, stay on me. Like glue."], ['nia', "I'm being SO glue right now."]]); },
    update(g) { if (dist2(g, 0, -1540) < 6 && !g.stepData.go) { g.stepData.go = true; goto(g, 41, 200); } } },
  { id: 'c9_cards', ch: 9, cp: [0, -1544, PI], obj: 'Find 3 keycards (0/3)', hint: 'West barracks, east barracks, the guard post.', mood: 'tense', beat: 2,
    enter(g) { const D = g.stepData; fam(g, D, -1544, 0, true); D.n = 0;
      g.say([['reyes', "The battery door takes three keycards. Navy paranoia."], ['keem', "Three cards. I been finding stuff all week."]]);
      const got = () => { D.n++; g.audio.pickup(); g.objective('Find 3 keycards (' + D.n + '/3)', 'Barracks and the guard post.'); raiders(g, 2, [[g.player.root.position.x + 8, g.player.root.position.z - 8]]); if (D.n === 3) { g.wpTarget = [0, 1.2, -1652]; g.say([['nia', "That's all three! I ate that! …Well, you did."]], () => goto(g, 42, 300)); } };
      D.uses = [[-14.5, -1580, 'Search the west barracks'], [14.5, -1600, 'Search the east barracks'], [0, -1640, 'Search the guard post']].map(([x, z, label]) => ({ x, z, label, fn: () => { D.uses = D.uses.filter(u => u.x !== x); got(); } }));
      g.horde(10, [[-8, -1575], [8, -1600], [0, -1630]], { aggro: 16 }); } },
  { id: 'c9_cells', ch: 9, cp: [0, -1652, PI], obj: 'Find Dad in Battery Steele', hint: 'Through the door. The cells in the back.', mood: 'night', beat: 1,
    enter(g) { const D = g.stepData; fam(g, D, -1652, 0, true); g.wpTarget = [0, 1.2, -1680]; g.horde(6, [[-16, -1672], [16, -1676]], { aggro: 12 });
      D.uses = [{ x: 0, z: -1680, label: 'Open the specimen cell', fn: () => { D.uses = []; g.npc('marcus', 'marcus', 0, -1687, 0, 'Idle_Loop'); g.cut = { anim: 'Idle_Loop', cam: V(1.5, 1.7, -1678), look: V(0, 1.4, -1687) };
        g.say([['marcus', "Keem…? That you?"], ['keem', "Dad! You talking? You TALKING!"], ['marcus', 'Hungry, son. So hungry. Stand back from the bars.'], ['captain', 'Touching. He is my best specimen. Half dead, half Marcus.']], () => { g.cut = null; goto(g, 43, 200); }); } }]; } },
  { id: 'c9_boss', ch: 9, cp: [0, -1672, PI], obj: 'Kill the Captain', hint: 'He is armored and he brought friends. Grenades, then headshots.', mood: 'tense', beat: 3,
    enter(g) { const D = g.stepData; g.npc('marcus', 'marcus', 0, -1687, 0, 'Idle_Loop'); g.npc('nia', 'nia', -3, -1682, PI, 'Idle_Loop', .62); const b = g.spawnZ(8, -1666, { raider: true, hp: 2600, gun: 'smg', shirt: '#1a1a3a' }); b.root.scale.setScalar(1.35); g.boss = b; $q('#bossn').textContent = 'THE CAPTAIN — not actually Navy';
      raiders(g, 4, [[-12, -1668], [14, -1670]]); D.hordeAll = true; g.say([['captain', 'You want him back? Pay the toll, boy.'], ['keem', "The toll got paid at the lighthouse. Now it's your turn, clown."]]); },
    update(g) { const D = g.stepData; if (g.boss && g.boss.dead && !D.won) { D.won = true; afterBoss(g, () => g.say([['captain', 'There are… others like him… Boston knows…'], ['keem', "Captain's down. Where's my dad?"]], () => goto(g, 44, 700))); } } },
  { id: 'c9_end', ch: 9, cp: [0, -1678, PI], obj: '', hint: '', mood: 'sad', beat: 0,
    enter(g) { g.npc('marcus', 'marcus', 0, -1687, 0, 'Idle_Loop'); g.npc('nia', 'nia', -1.5, -1681, PI, 'Idle_Loop', .62); g.npc('reyes', null, 2, -1681, PI, 'Idle_Loop'); g.npc('tuck', null, 3.5, -1679, PI, 'Idle_Loop');
      g.cut = { anim: 'Idle_Loop', cam: V(2, 1.7, -1676), look: V(0, 1.4, -1687) }; g.audio.setMood('sad');
      g.say([['reyes', 'Subject eleven. Marcus Pell. Antiviral plus the Captain\'s serum. Status: responding.'], ['nia', "Responding means he's getting better, right? Right, Keem?"], ['marcus', "Nia… baby. Dad's still here. Mostly."],
        ['radio', 'Peaks Island, this is Boston. Captain, report. Is the Pell specimen ready for transport?'], ['keem', "…Boston?"]], () => { g.shake(.6); setTimeout(() => g.onComplete && g.onComplete(9), 1500); }); } },
  // ===== v1.8 CHAPTER 10 · HARBOR LIGHTS (Boston: Long Wharf → Quarantine Row → Public Garden, z -2000..-2310) =====
  { id: 'c10_wharf', ch: 10, cp: [0, -2008, PI], obj: 'Sneak Dad through Quarantine Row', hint: 'Stay out of the searchlights. Crouch (C / ⤓) to slip under them.', mood: 'night', beat: 1,
    enter(g) { const D = g.stepData; fam(g, D, -2008); g.wpTarget = [0, 1.2, -2124]; D.spots = (g.world.zones[10] && g.world.zones[10].userData.spots) || []; D.hit = {};
      g.horde(6, [[-18, -2050], [18, -2085], [-16, -2110]], { aggro: 10 });
      g.cut = { anim: 'Idle_Loop', cam: V(3, 1.8, -2003), look: V(0, 1.4, -2012) };
      g.say([['keem', "Boston. We actually made it."], ['nia', "It's so quiet. Is quiet good or bad?"], ['marcus', "Bad. Quiet means somebody's in charge."], ['radio', 'Attention. Quarantine Row is under automated watch. Infected will be fired upon.'],
        ['keem', "Infected. That's you, Dad."], ['marcus', "Then I'll walk where the lights aren't."], ['nia', "Biscuit says he'll walk where the lights aren't too. He can't walk. I'm carrying him."]], () => { g.cut = null; }); },
    update(g, dt) { const D = g.stepData, P = g.player.root.position; D.t = (D.t || 0) + dt;
      D.spots.forEach((s, i) => { const x = Math.sin(D.t * (.55 + i * .12) + i * 2) * 15; s.disc.position.x = x; s.head.lookAt(x, 0, s.disc.position.z);
        if (!D.hit[i] && !g.cut && Math.hypot(P.x - x, P.z - s.disc.position.z) < 3.6 && !g.state.crouch) { D.hit[i] = true; s.disc.material.color.set('#ff2a2a'); g.audio.beat(3); g.toast && g.toast('SPOTTED', 1); g.shake(.3);
          g.horde(5, [[x - 10, s.disc.position.z - 8], [x + 10, s.disc.position.z + 8]], { runner: true, aggro: 99 }); raiders(g, 2, [[x, s.disc.position.z - 14]]);
          g.say([[['keem', "They saw me. My bad— go, go!"], ['nia', "Keem! You had ONE job!"], ['marcus', 'Keep moving. Do not stop.']][i]]); } });
      if (dist2(g, 0, -2124) < 5 && !D.go) { D.go = true; goto(g, 46, 220); } } },
  { id: 'c10_turn', ch: 10, cp: [0, -2128, PI], obj: 'Talk Dad down', hint: 'Get close. Stay calm. Say his name.', mood: 'sad', beat: 0,
    enter(g) { const D = g.stepData; const d = g.npc('marcus', 'marcus', 0, -2136, 0, 'Idle_Loop'); D.dad = d; const n = g.npc('nia', 'nia', -2.2, -2131, PI * .8, 'Idle_Loop', .62); D.nia = n; g.openGate(true);
      g.cut = { anim: 'Idle_Loop', cam: V(2.6, 1.6, -2131), look: V(0, 1.5, -2136), flash: true }; g.shake(.4);
      g.say([['marcus', "Keem… back up. Back UP. I can smell you. All of you."], ['nia', "Dad? Your eyes are doing the thing again."], ['keem', "Nia. Behind me. Slow."]], () => { g.cut = null;
        D.uses = [{ x: 0, z: -2134, label: 'Say his name', fn: () => { D.uses = []; g.cut = { anim: 'Idle_Loop', cam: V(1.6, 1.6, -2132), look: V(0, 1.5, -2136) };
          g.say([['keem', "Marcus Pell. You taught me to ride a bike on Elm Street. You ran beside me the whole block."], ['keem', "You didn't let go till I told you. So I'm telling you. Don't let go."], ['marcus', "…I'm here. I'm here, son. God, I'm still here."],
            ['nia', "Group hug. Biscuit too. He's scared, he won't say it."]], () => { const z = g.spawnZ(-6, -2124, { runner: true }); z.aggro = 99; g.say([['nia', "KEEM, BEHIND ME—"]], () => { g.shake(.8); g.damageZ(z, 1e7, V(0, 0, -1), { head: true, finisher: true });
              g.say([['marcus', "Nobody touches my kids. Nobody."], ['keem', "…Okay. Okay, that was hard. You good?"], ['marcus', "No. But I'm on our side. Let's go."]], () => { g.cut = null; goto(g, 47, 250); }); }); }); } }]; }); } },
  { id: 'c10_swan', ch: 10, cp: [0, -2190, PI], obj: 'Hold the dock: 45', hint: 'Nia is getting the swan boat moving. Keep them off her. Dad has your back.', mood: 'tense', beat: 3,
    enter(g) { const D = g.stepData; g.openGate(true); D.t = 0; D.wave = 0; D.len = 45; const d = g.npc('marcus', 'marcus', 3, -2196, PI, 'Idle_Loop'); D.dad = d; dadGun(g, D); g.npc('nia', 'nia', 0, -2203, 0, 'Idle_Loop', .62); g.wpTarget = null; D.hordeAll = true;
      g.say([['nia', "I'm driving the swan! His name is Sir Honks. Don't ask."], ['keem', "I wasn't gonna ask. Just pedal."], ['marcus', "I'll take the left. You take the right. Like the yard, Keem."]]); },
    update(g, dt) { const D = g.stepData; dadTick(g, D, dt); if (D.done) return; D.t += dt; const left = Math.max(0, Math.ceil(D.len - D.t)); if (left !== D.lastL) { D.lastL = left; g.objective('Hold the dock: ' + left, 'Keep them off Nia. Dad has your back.'); }
      if (D.t > D.wave * 8 && D.wave < 6) { D.wave++; g.horde(g.alive().length < 20 ? 5 + D.wave : 2, [[-16, -2172], [16, -2176], [-10, -2160], [12, -2162]], { runner: D.wave > 2, aggro: 99 }); if (D.wave === 4) g.say([['nia', "Pedaling! It's SO heavy! Swans are so heavy!"]]); }
      if (D.t >= D.len) { D.done = true; g.say([['nia', "Sir Honks is GO!"], ['keem', "Everybody in the swan. I can't believe I just said that."]], () => goto(g, 48, 300)); } } },
  { id: 'c10_boss', ch: 10, cp: [0, -2262, PI], obj: 'Kill the Swan Knight', hint: 'Plate armor eats bullets. Headshots, blades, fire or explosions get through.', mood: 'tense', beat: 3,
    enter(g) { const D = g.stepData; fam(g, D, -2262, 0); const b = boss(g, 0, -2290, 3400, '#6a6a72', 'THE SWAN KNIGHT — Medieval Faire, 2 for 1'); b.speed = 1.7; b.armor = (o) => (o.head || o.blade || o.boom || o.flame || o.sever) ? 1 : .35;
      g.horde(4, [[-12, -2280], [12, -2282]], { aggro: 99 }); D.hordeAll = true;
      g.say([['nia', "Is that a knight? Like a REAL knight?"], ['keem', "That's a dude from the Renaissance Faire who never took the armor off."], ['marcus', "Bullets are bouncing. Go for the face, or cut him."]]); },
    update(g) { const D = g.stepData; if (g.boss && !D.half && g.boss.hp < 1700) { D.half = true; g.say([['keem', "He's slowing down. Keep cutting."]]); }
      if (g.boss && g.boss.dead && !D.won) { D.won = true; afterBoss(g, () => g.say([['nia', "You beat a knight. You're like… a knight now."], ['keem', "Nah. I'm just tired."]], () => goto(g, 49, 700))); } } },
  { id: 'c10_end', ch: 10, cp: [0, -2296, PI], obj: '', hint: '', mood: 'sad', beat: 0,
    enter(g) { g.npc('marcus', 'marcus', 1.2, -2302, PI * .9, 'Idle_Loop'); g.npc('nia', 'nia', -1.2, -2301, PI * 1.1, 'Idle_Loop', .62); g.cut = { anim: 'Idle_Loop', cam: V(0, 1.6, -2306), look: V(0, 1.4, -2298) }; g.audio.setMood('sad');
      g.say([['marcus', "Your mom used to bring you here. You threw bread at the ducks and cried when they ate it."], ['keem', "I don't remember that."], ['marcus', "You were three. I remember for you."],
        ['radio', 'Pell family. This is Dr. Ada Vance, Mass General. Bring Marcus to me and I can finish what the Captain started.'], ['vance', "Or don't. He has maybe a day before the virus wins."], ['keem', "…A day."]], () => setTimeout(() => g.onComplete && g.onComplete(10), 1200)); } },
  // ===== v1.8 CHAPTER 11 · SWAN SONG (tunnel → Cambridge St → Mass General helipad, z -2330..-2700) =====
  { id: 'c11_tunnel', ch: 11, cp: [0, -2338, PI], obj: 'Get through the harbor tunnel', hint: 'Dark, tight, and full. Keep moving.', mood: 'night', beat: 2,
    enter(g) { const D = g.stepData; fam(g, D, -2338); g.wpTarget = [0, 1.2, -2446]; g.horde(12, [[-4, -2370], [4, -2395], [0, -2420]], { aggro: 14 });
      g.say([['nia', "It smells like a hundred feet in here."], ['keem', "Breathe through your mouth."], ['nia', "Now I can TASTE the feet."]]); },
    update(g) { const D = g.stepData; if (!D.boom && g.player.root.position.z < -2402) { D.boom = true; const T = V(0, 1.5, -2386); g.explode(T, 7, 300); setTimeout(() => g.explode(V(-4, 1.5, -2378), 6, 260), 450); setTimeout(() => g.explode(V(4, 1.5, -2370), 6, 260), 900);
        g.horde(8, [[0, -2372], [-4, -2366]], { runner: true, aggro: 99 }); g.alive().forEach(z => { if (z.root.position.z > -2400) z.burn = 6; });
        g.say([['marcus', "Tanker! DOWN!"], ['keem', "Nia, you good?! Talk to me!"], ['nia', "My ears are ringing but Biscuit is fine."], ['keem', "They're on fire and they're still coming. Run."]]); }
      if (dist2(g, 0, -2446) < 5 && !D.go) { D.go = true; goto(g, 51, 220); } } },
  { id: 'c11_drive', ch: 11, cp: [0, -2450, PI], obj: 'Get in the ambulance', hint: 'E / ✋ near it. Ram them all the way to Mass General.', mood: 'tense', beat: 3,
    enter(g) { const D = g.stepData; fam(g, D, -2450, 0); const T = g.truck; T.g.position.set(4, 0, -2456); T.head = PI; T.g.rotation.y = PI; g.updateTruckCol(); g.wpTarget = [4, 1.4, -2456]; D.canDrive = true;
      g.say([['keem', "Ambulance still has keys. Everybody in."], ['marcus', "Let me drive."], ['keem', "You're half zombie, Dad."], ['marcus', "…Fair."]]);
      D.onDrive = (g) => { for (const k in g.npcs) g.npcs[k].root.visible = false; D.k0 = g.save.kills; g.wpTarget = [0, 1, -2596]; D.hordeAll = true; D.runners = .5;
        g.horde(24, [[0, -2480], [-6, -2500], [6, -2520], [-4, -2540], [5, -2560], [0, -2580]], { aggro: 30 }); g.audio.beat(3); g.say([['nia', "Siren! Turn on the siren!"], ['keem', "It's already on, it's just broken. Hold on."]]); }; },
    update(g) { const T = g.truck, D = g.stepData; if (!T.driving) return; const k = g.save.kills - (D.k0 || 0); if (k !== D.lk) { D.lk = k; g.objective('Drive to Mass General · Roadkill: ' + k, 'Plow through them.'); }
      if (T.g.position.z < -2590) { T.v = 0; g.shake(1); g.audio.crash(); g.exitTruck(); g.player.root.position.set(0, 0, -2598); g.save.cash += k * 10; goto(g, 52, 150); } } },
  { id: 'c11_er', ch: 11, cp: [0, -2600, PI], obj: 'Clear the ER (0/20)', hint: 'Fight with Dad. Do not let them reach Nia at the desk.', mood: 'tense', beat: 3,
    enter(g) { const D = g.stepData; g.openGate(true); D.k0 = g.save.kills; const d = g.npc('marcus', 'marcus', 2, -2604, PI, 'Idle_Loop'); D.dad = d; dadGun(g, D); g.npc('nia', 'nia', -6, -2610, PI / 2, 'Idle_Loop', .62); D.hordeAll = true; D.w = 0;
      g.say([['vance', 'You made it. Impressive. The ER is overrun, so clear it and come up to the roof.'], ['keem', "You could come down and help."], ['vance', "I could. I won't."]]); },
    update(g, dt) { const D = g.stepData; dadTick(g, D, dt); if (D.done) return; const k = Math.min(20, g.save.kills - D.k0); if (k !== D.lk) { D.lk = k; g.objective('Clear the ER (' + k + '/20)', 'Fight with Dad.'); }
      if (g.alive().length < 4 && D.w < 5) { D.w++; g.horde(6, [[-14, -2620], [14, -2622], [0, -2632]], { runner: D.w > 2, aggro: 99 }); if (D.w === 3) g.say([['marcus', "Twenty years of dad jokes and THIS is how you see me fight."], ['keem', "Honestly? You're kind of cold with it."]]); }
      if (k >= 20 || (D.w >= 5 && !g.alive().length)) { D.done = true; afterBoss(g, () => g.say([['marcus', "Roof. Let's end this."]], () => goto(g, 53, 300)), 2.5, false); } } },
  { id: 'c11_boss', ch: 11, cp: [0, -2640, PI], obj: 'Kill Subject One', hint: 'He is huge. Explosives and headshots. Roll when he leaps.', mood: 'tense', beat: 3,
    enter(g) { const D = g.stepData; fam(g, D, -2640, 0, true); const b = boss(g, 0, -2672, 5400, '#3a5a3a', 'SUBJECT ONE — the first volunteer'); b.root.scale.setScalar(2.4); b.speed = 2.4;
      D.hordeAll = true; g.say([['vance', "Subject One. My first volunteer. He was a firefighter."], ['keem', "You did this to a firefighter?"], ['vance', "I did it for everybody. Show me what your father's son can do."]]); },
    update(g) { const D = g.stepData, b = g.boss; if (b && !b.dead) { if (!D.p2 && b.hp < 2700) { D.p2 = true; g.shake(1); g.audio.roar && g.audio.roar(); b.speed = 3.4; g.horde(8, [[-14, -2660], [14, -2662]], { runner: true, aggro: 99 }); g.say([['nia', "He's MAD now!"], ['keem', "Yeah, I see him. Stay down."]]); } }
      if (b && b.dead && !D.won) { D.won = true; afterBoss(g, () => goto(g, 54, 800)); } } },
  { id: 'c11_end', ch: 11, cp: [0, -2650, PI], obj: '', hint: '', mood: 'sad', beat: 0,
    enter(g) { g.npc('marcus', 'marcus', 1.4, -2654, PI, 'Idle_Loop'); g.npc('nia', 'nia', -1.4, -2653, PI, 'Idle_Loop', .62); g.npc('vance', null, 0, -2664, 0, 'Idle_Loop');
      g.cut = { anim: 'Idle_Loop', cam: V(2, 1.7, -2650), look: V(0, 1.5, -2664) }; g.audio.setMood('sad');
      g.say([['vance', "Well. You're as stubborn as she said you'd be."], ['keem', "As who said?"], ['vance', "Volunteer number two. Dana Pell. She signed up the first week."],
        ['marcus', "…Dana's alive?"], ['nia', "Mommy? Keem. Keem, she said Mommy."], ['vance', "Your mother is downstairs. Whether she's still your mother is a longer conversation."], ['keem', "…Take me to her. Now."]], () => { g.shake(.5); setTimeout(() => g.onComplete && g.onComplete(11), 1500); }); } },

  // v1.9.0 Survival mode — endless waves on Haverford Main Street (Ch2 map). Not part of story progress.
  { id: 'survival', ch: 2, survival: true, cp: [0, -236, 0], obj: 'Survival — get ready', hint: 'Endless waves. Pause → Armory to spend cash between waves.', mood: 'tense', beat: 2, rain: true,
    enter(g) { const D = g.stepData; g.ch2Reset(g, 10); D.wave = 0; D.gap = 5; D.left = 0; D.sp = 0; D.hordeAll = true; D.best = +(g.LS.getItem('atq3.survBest') || 0);
      const nia = g.npc('nia', 'nia', -1.4, -238, 0, 'Idle_Loop', .62); follow(g, nia, [-1.2, -1]); D.nia = nia; g.wpTarget = null; g.toast('SURVIVAL — Best: wave ' + D.best, 2.5); },
    update(g, dt) { const D = g.stepData; const al = g.alive().length; const PTS = [[-6, -212], [6, -214], [-20, -222], [18, -220], [0, -200], [-14, -250], [14, -252]];
      if (D.left > 0) { D.sp -= dt; if (D.sp <= 0 && al < 18) { D.sp = 1.6; const n = Math.min(D.left, 4); D.left -= n; for (let i = 0; i < n; i++) { const p = PTS[(Math.random() * PTS.length) | 0]; const hp = 70 + D.wave * 8;
          if (D.wave >= 5 && Math.random() < .12) g.spawnZ(p[0] + rnd(-3, 3), p[1] + rnd(-3, 3), { raider: true, hp: 90 + D.wave * 6, aggro: 99, gun: Math.random() < .5 ? 'smg' : 'rifle' });
          else g.spawnZ(p[0] + rnd(-3, 3), p[1] + rnd(-3, 3), { aggro: 99, hp, runner: Math.random() < Math.min(.6, .1 + D.wave * .05) }); } } }
      if (D.wave > 0 && D.left <= 0 && al === 0 && !D.clear) { D.clear = true; D.gap = 8; const bonus = 20 + D.wave * 15; g.addCash(bonus); g.floatText('Wave ' + D.wave + ' cleared · +$' + bonus, '#9f9');
        if (D.wave > D.best) { D.best = D.wave; g.LS.setItem('atq3.survBest', String(D.wave)); g.toast('New best: wave ' + D.wave + '!', 2); } g.checkpoint(); }
      if (D.left <= 0 && al === 0 && (D.wave === 0 || D.clear)) { D.gap -= dt; if (D.gap <= 0) { D.wave++; D.clear = false; D.left = 5 + D.wave * 3; D.sp = 0; g.zombies = g.zombies.filter(z => { if (z.dead) g.scene.remove(z.root); return !z.dead; }); g.audio.roar && g.audio.roar(); } }
      const txt = 'Survival · Wave ' + D.wave + ' · ' + (D.wave && !D.clear ? (al + D.left) + ' left' : 'next wave in ' + Math.ceil(Math.max(0, D.gap)) + 's') + ' · Best ' + D.best; if (txt !== D.lt) { D.lt = txt; g.objective(txt, 'Pause → Armory to buy guns, ammo & upgrades with your cash.'); } } },
];
const $q = (s) => document.querySelector(s);

// v1.6 chapter helpers
const CH_START = { 1: 0, 2: 7, 3: 13, 4: 18, 5: 23, 6: 28, 7: 33, 8: 36, 9: 40, 10: 45, 11: 50 };
export function chOf(i) { const s = STORY[i]; return s && s.ch ? s.ch : 1; }
export { CH_START };
export const SURVIVAL_STEP = STORY.findIndex(s => s.survival);
function fam(g, D, z, x = 0, noDad) { g.openGate(true); if (!noDad) { const d = g.npc('marcus', 'marcus', x + 1.6, z + 1.5, PI, 'Walk_Loop'); follow(g, d, [1.6, 1.2]); D.dad = d; } const n = g.npc('nia', 'nia', x - 1.4, z + 1.5, PI, 'Walk_Loop', .62); follow(g, n, [-1.2, .9]); D.nia = n; }
function dadGun(g, D) { D.dadGun = true; }
function dadTick(g, D, dt) { if (!D.dad || !D.dadGun || (D.dcd = (D.dcd || 0) - dt) > 0) return; D.dcd = .9; const dp = D.dad.root.position; let best = null, bd = 18; g.alive().forEach(z => { if (z.boss) return; const d = z.root.position.distanceTo(dp); if (d < bd) { bd = d; best = z; } }); if (best) { const dir = best.root.position.clone().sub(dp).normalize(); g.damageZ(best, 60, dir, { head: Math.random() < .35 }); g.audio.shot('shotgun'); } }
function boss(g, x, z, hp, shirt, name) { const b = g.spawnZ(x, z, { boss: true, hp, scale: 1.75, runner: false }); b.cd = 2; b.aggro = 99; b.mat.userData.u.uShirt.value.set(shirt); b.mat.userData.u.uBlood.value = g.settings.gore ? 1.4 : .2; g.boss = b; $q('#bossn').textContent = name; g.audio.roar && setTimeout(() => g.audio.roar(), 900); return b; }
function raiders(g, n, pts) { for (let i = 0; i < n; i++) { const p = pts[i % pts.length]; const r = g.spawnZ(p[0] + rnd2(), p[1] + rnd2(), { raider: true, gun: ['rifle', 'pistol', 'shotgun', 'smg'][i % 4] }); r.aggro = 40; } }
const rnd2 = () => (Math.random() - .5) * 5;
let n = 0; const id = () => 'l' + (n++);
const pg = (x, z, text, ms = 0) => ({ id: 'pg_' + x + '_' + z, kind: 'page', manual: false, text, pos: [x, 0.9, z], minStep: ms });
export const LOOT = [
  { id: 'h_cash', kind: 'cash', n: 40, pos: [19.6, 0.85, 40.7] }, { id: 'h_pan', kind: 'weapon', item: 'pan', pos: [14.2, 0.2, 36.4], label: 'Frying pan' }, { id: 'h_med', kind: 'med', pos: [13, 0.2, 38.4] },
  pg(16.5, 44.2, 'Captain Riverside #1: "The Lobster Men Cometh"'),
  { id: 's1', kind: 'cash', n: 25, pos: [4.6, .25, 30], minStep: 1 }, { id: 's2', kind: 'ammo', item: 'light', n: 18, pos: [-5.8, .25, 26], minStep: 1 }, { id: 's3', kind: 'cash', n: 60, pos: [9, .25, 20], minStep: 1 },
  { id: 's4', kind: 'med', pos: [-6.4, .25, 12], minStep: 1 }, { id: 's5', kind: 'grenade', n: 1, pos: [5.6, .25, 8], minStep: 1 }, pg(24, 50, 'Captain Riverside #2: "Chowder of Doom"', 1), pg(-24, 34, 'Captain Riverside #3: "Moose Problems"', 1),
  { id: 'm1', kind: 'ammo', item: 'light', n: 24, pos: [-5, .25, -10], minStep: 2 }, { id: 'm2', kind: 'cash', n: 80, pos: [-12, .25, -26], minStep: 2 }, { id: 'm3', kind: 'ammo', item: 'shell', n: 10, pos: [-12.5, .25, -40], minStep: 2 },
  { id: 'm4', kind: 'grenade', n: 1, pos: [-13, .25, -50], minStep: 2 }, { id: 'm5', kind: 'med', pos: [5.8, .25, -18], minStep: 2 }, { id: 'm6', kind: 'cash', n: 120, pos: [-24, .25, -14], minStep: 2 }, pg(-30, -24, 'Captain Riverside #4: "Lighthouse of Fear"', 2), pg(30, -6, 'Captain Riverside #5: "The Fog Eats Tuesdays"', 2),
  { id: 'g1', kind: 'ammo', item: 'rifle', n: 30, pos: [5, .25, -40], minStep: 3 }, { id: 'g2', kind: 'cash', n: 90, pos: [22, .25, -46], minStep: 3 }, { id: 'g3', kind: 'med', pos: [24, .25, -56], minStep: 3 }, { id: 'g4', kind: 'grenade', n: 2, pos: [-4, .25, -60], minStep: 3 }, pg(26, -66, 'Captain Riverside #6: "Hank\'s Last Stand"', 3),
  { id: 'b1', kind: 'ammo', item: 'rifle', n: 40, pos: [-5, .25, -92], minStep: 5 }, { id: 'b2', kind: 'med', pos: [6, .25, -92], minStep: 5 }, { id: 'b3', kind: 'ammo', item: 'light', n: 30, pos: [-3, .25, -88], minStep: 5 }, pg(-9, -88, 'Captain Riverside #7: "Barber of the Damned"', 4), pg(3, -130, 'Captain Riverside #8: "Right Behind You"', 6),
  // Chapter 2 loot
  { id: 'c2a', kind: 'ammo', item: 'light', n: 30, pos: [-4, .25, -146], minStep: 7 }, { id: 'c2b', kind: 'med', pos: [-15, .25, -149], minStep: 8 }, { id: 'c2c', kind: 'grenade', n: 2, pos: [16, .25, -150], minStep: 8 }, { id: 'c2d', kind: 'ammo', item: 'shell', n: 16, pos: [-9, .25, -168], minStep: 8 },
  { id: 'c2e', kind: 'cash', n: 150, pos: [-9.4, .25, -184], minStep: 9 }, { id: 'c2f', kind: 'ammo', item: 'rifle', n: 60, pos: [5.5, .25, -209], minStep: 9 }, { id: 'c2g', kind: 'med', pos: [-22, .25, -194], minStep: 9 }, { id: 'c2h', kind: 'cash', n: 200, pos: [24, .25, -206], minStep: 9 }, { id: 'c2i', kind: 'grenade', n: 2, pos: [-5, .25, -232], minStep: 9 }, { id: 'c2j', kind: 'weapon', item: 'axe', pos: [-24, .25, -214], label: 'Fire axe', minStep: 9 },
  { id: 'c2k', kind: 'ammo', item: 'rifle', n: 60, pos: [5, .25, -250], minStep: 10 }, { id: 'c2l', kind: 'med', pos: [-5, .25, -250], minStep: 10 }, { id: 'c2m', kind: 'cash', n: 300, pos: [10, .25, -290], minStep: 12 },
  pg(-16, -160, 'Captain Riverside #9: "Safe Zone (Not Safe)"', 7), pg(-30, -186, 'Captain Riverside #10: "Spin Cycle Massacre"', 9), pg(18, -217, 'Captain Riverside #11: "Boston Cream Catastrophe"', 9), pg(32, -214, 'Captain Riverside #12: "The Flood Remembers"', 9), pg(-34, -260, 'Captain Riverside #13: "Fourth and Doom"', 10), pg(-12, -294, 'Captain Riverside #14: "Portland or Bust"', 12),
  // Chapter 3–6 loot
  { id: 'c3a', kind: 'ammo', item: 'shell', n: 16, pos: [-14, .25, -338], minStep: 13 }, { id: 'c3b', kind: 'med', pos: [-30, .25, -344], minStep: 13 }, { id: 'c3c', kind: 'weapon', item: 'chainsaw', pos: [-31, .25, -352], label: 'Chainsaw', minStep: 14 }, { id: 'c3d', kind: 'cash', n: 250, pos: [18, .25, -392], minStep: 15 }, { id: 'c3e', kind: 'grenade', n: 2, pos: [4, .25, -388], minStep: 16 },
  { id: 'c4a', kind: 'ammo', item: 'rifle', n: 60, pos: [-8, .25, -440], minStep: 18 }, { id: 'c4b', kind: 'weapon', item: 'lever', pos: [-20, .25, -494], label: 'Lever-action rifle', minStep: 19 }, { id: 'c4c', kind: 'med', pos: [10, .25, -480], minStep: 19 }, { id: 'c4d', kind: 'grenade', n: 3, pos: [-6, .25, -506], minStep: 20 }, { id: 'c4e', kind: 'cash', n: 400, pos: [20, .25, -508], minStep: 21 },
  { id: 'c5a', kind: 'ammo', item: 'shell', n: 24, pos: [-10, .25, -560], minStep: 23 }, { id: 'c5b', kind: 'weapon', item: 'auto12', pos: [14, .25, -580], label: 'Auto-12 shotgun', minStep: 23 }, { id: 'c5c', kind: 'med', pos: [-16, .25, -596], minStep: 24 }, { id: 'c5d', kind: 'grenade', n: 3, pos: [6, .25, -598], minStep: 25 }, { id: 'c5e', kind: 'cash', n: 500, pos: [-28, .25, -580], minStep: 24 },
  { id: 'c6a', kind: 'ammo', item: 'light', n: 40, pos: [6, .25, -660], minStep: 28 }, { id: 'c6b', kind: 'weapon', item: 'handcannon', pos: [-30, .25, -670], label: 'Hand cannon', minStep: 28 }, { id: 'c6c', kind: 'med', pos: [-20, .25, -684], minStep: 29 }, { id: 'c6d', kind: 'grenade', n: 3, pos: [10, .25, -690], minStep: 29 }, { id: 'c6e', kind: 'ammo', item: 'rifle', n: 90, pos: [-4, .25, -704], minStep: 30 },
  { id: 'c7a', kind: 'ammo', item: 'rifle', n: 60, pos: [0, .25, -1238], minStep: 34 }, { id: 'c7b', kind: 'weapon', item: 'harpoon', pos: [-4, .25, -1240], label: 'Harpoon gun', minStep: 34 }, { id: 'c7c', kind: 'med', pos: [10, .25, -1236], minStep: 34 },
  { id: 'c8a', kind: 'ammo', item: 'shell', n: 24, pos: [-6, .25, -1288], minStep: 36 }, { id: 'c8b', kind: 'med', pos: [6, .25, -1346], minStep: 37 }, { id: 'c8c', kind: 'weapon', item: 'minigun', pos: [6, .25, -1424], label: 'Deck minigun', minStep: 38 }, { id: 'c8d', kind: 'ammo', item: 'rifle', n: 150, pos: [-6, .25, -1424], minStep: 38 }, { id: 'c8e', kind: 'grenade', n: 3, pos: [-6, .25, -1356], minStep: 37 },
  { id: 'c9a', kind: 'ammo', item: 'rifle', n: 120, pos: [-6, .25, -1480], minStep: 40 }, { id: 'c9b', kind: 'weapon', item: 'katana', pos: [-12, .25, -1592], label: 'Captain\'s katana', minStep: 41 }, { id: 'c9c', kind: 'med', pos: [8, .25, -1560], minStep: 41 }, { id: 'c9d', kind: 'grenade', n: 4, pos: [6, .25, -1654], minStep: 42 }, { id: 'c9e', kind: 'cash', n: 800, pos: [-8, .25, -1650], minStep: 42 },
  { id: 'c10a', kind: 'weapon', item: 'flamer', pos: [-14.5, .25, -2090], label: 'Flamethrower', minStep: 45 }, { id: 'c10b', kind: 'ammo', item: 'fuel', n: 200, pos: [-14, .25, -2094], minStep: 45 }, { id: 'c10c', kind: 'med', pos: [8, .25, -2180], minStep: 47 }, { id: 'c10d', kind: 'weapon', item: 'longsword', pos: [0, .25, -2286], label: 'Swan Knight longsword', minStep: 49 }, { id: 'c10e', kind: 'ammo', item: 'bolt', n: 20, pos: [10, .25, -2020], minStep: 45 },
  { id: 'c11a', kind: 'ammo', item: 'fuel', n: 150, pos: [-6, .25, -2440], minStep: 50 }, { id: 'c11b', kind: 'med', pos: [-8, .25, -2612], minStep: 52 }, { id: 'c11c', kind: 'weapon', item: 'launcher', pos: [6, .25, -2636], label: 'M32 grenade launcher', minStep: 52 }, { id: 'c11d', kind: 'ammo', item: 'gl', n: 18, pos: [7, .25, -2638], minStep: 52 }, { id: 'c11e', kind: 'grenade', n: 3, pos: [-6, .25, -2638], minStep: 53 },
  pg(-24, -330, 'Captain Riverside #15: "Breaker Breaker"', 13), pg(28, -404, 'Captain Riverside #16: "Room 4"', 15), pg(-28, -478, 'Captain Riverside #17: "Everybody Pays"', 18), pg(26, -560, 'Captain Riverside #18: "Food Court of the Dead"', 23), pg(-12, -604, 'Captain Riverside #19: "Ho Ho Horror"', 24), pg(-34, -672, 'Captain Riverside #20: "The Light Keeps"', 28),
];
