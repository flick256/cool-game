/* =====================================================================
 * LANTERNBOUND — ch5.js  (OVERSEER-APPROVED CHAPTER FILE, owner: ch5)
 * Chapter 5 "The Hollow Road"  — the camp at the Spire, the Eve, the Spire halls,
 *                                 Bram in the Cold Foundry, Hollow Elowen.
 * Chapter 6 "The Last Lantern" — the Hearthstar Chamber, Vael, the Choice at the Heart, endings.
 * Maps: spire_gate spire_hall_1 spire_hall_2 spire_upper hearthstar_chamber
 * ===================================================================== */
(function () {
  'use strict';
  const G = (window.G = window.G || {});
  const H = G.maps.helpers;           // shared event factories (mapbuilder.js loads before this file)

  // ------------------------------------------------------------------ constants & chapter cards
  const T5 = { title: 'The Hollow Road', subtitle: 'Ash, lanterns and the Hearth Spire' };
  const T6 = { title: 'The Last Lantern', subtitle: 'Warmth is shared, not spent' };
  G.story.chapters[5] = T5;
  G.story.chapters[6] = T6;

  const CAND = ['claret', 'caspian', 'rook', 'seraphine', 'wren'];
  const NAME = { claret: 'Claret', caspian: 'Caspian', rook: 'Rook', seraphine: 'Seraphine', wren: 'Wren' };

  // ------------------------------------------------------------------ small helpers (all lazy, all safe)
  const flag = (k) => !!G.flag(k);
  const joined = (id) => !!(G.state.roster && G.state.roster[id]);
  const tierOf = (id) => {
    try { return G.romance && G.romance.tier ? G.romance.tier(id) | 0 : 0; } catch (e) { return 0; }
  };
  const loverId = () => {
    try { return G.romance && G.romance.lover ? G.romance.lover() || null : null; } catch (e) { return null; }
  };
  const eveSeen = (id) => flag('ch5_eve_' + id);
  const presentCands = () => CAND.filter(joined);
  const allEveSeen = () => presentCands().every(eveSeen);
  // "Beloved last": the Beloved's Eve unlocks only once every other present companion has had theirs.
  const othersSeen = (lv) => presentCands().filter((x) => x !== lv).every(eveSeen);
  const hasSpireKey = () => ((G.state.inventory && G.state.inventory.spire_key) || 0) > 0 || flag('ch5_hale_pass');
  const gateOpen = () => flag('ch5_gate_open');

  // Finishes the Eve: plays the group toast once, then marks the Eve complete.
  async function finishEve(c) {
    if (!flag('ch5_toast')) {
      G.setFlag('ch5_toast');
      await c.runScene('final_toast');
    }
    G.setFlag('ch5_eve_done');
  }

  // Tier-aware in-character line from a companion. lines = [tier0-1 line, tier2 line, tier3+ line]
  async function chip(c, id, lines) {
    const t = tierOf(id);
    const L = t >= 3 ? lines[2] : t >= 2 ? lines[1] : lines[0];
    if (!L) return;
    await c.say(NAME[id], L);
  }

  // Companions present at a moment, each with their own line (only the ones who are in the roster)
  async function companionsSay(c, table) {
    for (const id of CAND) {
      if (!joined(id) || !table[id]) continue;
      await chip(c, id, table[id]);
    }
  }

  // ==================================================================
  // MAP: spire_gate — a night camp at the foot of the Hearth Spire
  // ==================================================================
  const gate = G.maps.build('spire_gate', 36, 28, {
    name: 'Foot of the Hearth Spire', bgm: 'spire', spawn: { x: 17, y: 24, dir: 'up' }, ground: 'y', tint: 'rgba(10,8,34,0.30)',
  });
  gate.border('objects', 'R', 1);
  // ash & hollow ground
  gate.blob('ground', 5, 9, 3, 2, 'h').blob('ground', 30, 14, 4, 5, 'h').blob('ground', 28, 4, 3, 2, 'h').blob('ground', 5, 23, 3, 2, 'h');
  gate.blob('ground', 3, 15, 2, 4, 'v').blob('ground', 32, 20, 2, 3, 'v');
  gate.set('objects', 6, 9, 'z').set('objects', 31, 13, 'z').set('objects', 4, 23, 'z');
  // the dirt road up from the landing pad to the Spire fence
  gate.path([[17, 25], [17, 11]], ':', 2);
  // the Spire's camp clearing
  gate.blob('ground', 21, 19, 6, 5, ':');
  // a stone plaza before the Spire
  gate.rect('ground', 8, 9, 20, 1, 't');
  // the Spire: a tapering silhouette of copper, metal and stone
  gate.rect('objects', 15, 0, 6, 2, '6');
  gate.rect('objects', 13, 2, 10, 3, '7');
  gate.rect('objects', 12, 5, 12, 4, 'W');
  gate.vline('objects', 11, 2, 7, 'P').vline('objects', 24, 2, 7, 'P');
  gate.set('objects', 10, 7, 'Q').set('objects', 25, 7, 'Q');
  gate.set('objects', 14, 6, 'O').set('objects', 21, 6, 'O');
  gate.set('objects', 8, 9, 's').set('objects', 27, 9, 's');
  // the Order's fence and the one gate through it
  gate.hline('objects', 9, 10, 19, 'x');
  gate.set('objects', 18, 10, 'D');
  gate.set('objects', 18, 8, 'D');
  gate.set('objects', 14, 12, 'L').set('objects', 22, 12, 'L').set('objects', 9, 12, 'L').set('objects', 27, 12, 'L');
  // tents, crates and barrels around the fire
  gate.house(9, 13, 4, 3, { roof: '5', wall: 'X', doorAt: 1, windows: false });
  gate.house(25, 13, 4, 3, { roof: '4', wall: 'X', doorAt: 2, windows: false });
  gate.house(10, 21, 4, 3, { roof: '3', wall: 'X', doorAt: 1, windows: false });
  gate.set('objects', 14, 14, 'C').set('objects', 14, 15, 'C').set('objects', 13, 17, 'U');
  gate.set('objects', 28, 17, 'U').set('objects', 28, 18, 'C').set('objects', 27, 19, 'U');
  gate.set('objects', 23, 15, 'C');
  gate.set('objects', 21, 18, 'I');            // the campfire
  // scatter the wild ash and wreckage ONLY outside the camp and the road
  const gateAvoid = [{ x: 8, y: 0, w: 22, h: 12 }, { x: 8, y: 13, w: 21, h: 14 }, { x: 15, y: 0, w: 6, h: 28 }];
  gate.scatter('objects', 'd', 6, { seed: 11, avoid: gateAvoid });
  gate.scatter('objects', 'R', 5, { seed: 12, avoid: gateAvoid });
  gate.scatter('objects', 'r', 6, { seed: 13, avoid: gateAvoid });
  gate.scatter('objects', 'i', 3, { seed: 14, avoid: gateAvoid });
  gate.scatter('objects', 'B', 3, { seed: 15, avoid: gateAvoid, on: 'vy' });
  gate.scatter('objects', 'F', 4, { seed: 16, avoid: gateAvoid, on: 'vy' });
  gate.ev([
    H_shipPad(17, 25),
    H_save('gate_save', 20, 20),
    H_sign('gate_sign', 20, 12, 'THE HEARTH SPIRE.\nNo lamps past this point. By order of the Warden.'),
    H_chest('gate_chest', 30, 23, 'hi_potion', 2),
    eveNpc('claret', 15, 18), eveNpc('caspian', 24, 18), eveNpc('rook', 15, 22),
    eveNpc('seraphine', 26, 21), eveNpc('wren', 19, 23),
    {
      id: 'gate_merchant', x: 23, y: 23, sprite: 'merchant', trigger: 'action', solid: true, move: 'wander', dir: 'left',
      run: async (c) => {
        await c.say('Last Chance Lantern Co.', 'Last stock before the Spire! Tonics, lanterns, and a sincere promise I will be here tomorrow. Probably.');
        await c.shop('spire_shop');
      },
    },
    {
      // the path block: a non-solid touch trigger keeps the plaza statically reachable; it walks you back until the gate opens
      id: 'spire_block', x: 18, y: 11, w: 1, h: 1, sprite: null, trigger: 'touch', solid: false,
      if: () => !gateOpen(),
      run: async (c) => {
        await c.say('Order Sentry', 'Not yet. Go and sit with your people first.');
        await c.walk('player', ['down']);
      },
    },
    {
      id: 'spire_guard', x: 19, y: 11, sprite: 'guard', trigger: 'action', solid: true, dir: 'left',
      if: () => !gateOpen(),
      run: async (c) => {
        if (gateOpen()) return;
        if (allEveSeen() || flag('ch5_eve_done')) {
          await c.say('Order Sentry', 'The Spire is yours, then. Go on. Don\'t make me regret the step aside.');
          await finishEve(c);
          G.setFlag('ch5_gate_open');
          return;
        }
        await c.say('Order Sentry', 'The Spire is sealed for the night. Go and sit with your people first. Tomorrow nobody sits.');
        await c.say('Order Sentry', 'Or say you\'re ready. I\'ll make an exception. I\'m tired and you\'re not the first to ask.');
        const i = await c.choice(['Ready', 'Not yet'], { prompt: 'Open the Spire gate?' });
        if (i !== 0) { await c.say('Order Sentry', 'Then I\'ll be here. I always am.'); return; }
        await finishEve(c);
        G.setFlag('ch5_gate_open');
        await c.say('Order Sentry', 'Right. Go on, then. I\'ll tell the others you didn\'t look back.');
      },
    },
    {
      id: 'spire_door', x: 18, y: 8, w: 1, h: 1, sprite: null, trigger: 'touch', solid: false,
      if: () => gateOpen(),
      run: async (c) => {
        c.sfx('door');
        await c.transfer('spire_hall_1');
      },
    },
    H_auto_arrival(),
  ].flat());
  gate.finish();

  // Helper factories used by the gate (defined after use via hoisting of function declarations below).
  function H_shipPad(x, y) { return G.maps.helpers.shipPad(x, y); }
  function H_save(id, x, y) { return G.maps.helpers.save(id, x, y); }
  function H_sign(id, x, y, t) { return G.maps.helpers.sign(id, x, y, t); }
  function H_chest(id, x, y, item, n) { return G.maps.helpers.chest(id, x, y, item, n); }

  // Companion NPC for the Eve. Plays their scene ONCE, then idles. Beloved stands by until last.
  function eveNpc(id, x, y) {
    const idle = {
      claret: 'Still here. Still not touching that engine. Still not sleeping.',
      caspian: 'I find the fire steadying. It reminds me of nothing bad, which is a novelty.',
      rook: 'You\'re staring. Keep it up, I\'ll think you\'re in love with me.',
      seraphine: 'I am humming a hymn I don\'t believe in. It\'s a hard thing to do quietly.',
      wren: 'The moths like the fire. Everything likes the fire. That\'s the whole point of fire.',
    }[id];
    return {
      id: 'eve_' + id, x, y, sprite: id, trigger: 'action', solid: true, dir: 'down',
      if: () => joined(id) && (id !== loverId() || eveSeen(id) || othersSeen(id)),
      run: async (c) => {
        if (eveSeen(id)) { await c.say(NAME[id], idle); return; }
        G.setFlag('ch5_eve_' + id);
        c.emote('eve_' + id, 'heart');
        await c.wait(20);
        await c.runScene(id + '_eve');
        if (allEveSeen()) await finishEve(c);
      },
    };
  }

  // The Eve's opening: the stirring moment at the camp, once.
  function H_auto_arrival() {
    return G.maps.helpers.auto('gate_arrival', async (c) => {
      c.bgm('tender');
      c.chapter(5);
      G.setFlag('ch5_started');
      for (const id of ['claret', 'caspian', 'rook', 'seraphine', 'wren']) await c.join(id);   // safety: the finale needs the whole crew
      await c.wait(40);
      await c.camera(18, 9, 90);
      await c.wait(70);
      await c.camReset(60);
      await c.titleCard(T5.title, T5.subtitle, 150);
      await c.narrate('The Hollow Road ends at the foot of the Hearth Spire. Behind you, the campfire is the only warm thing left in Auren.');
      await c.say(null, 'Above you, the Spire hides the Hearthstar. Somewhere in its Cold Foundry, Claret\'s father is waiting. So is the Warden.');
      const i = await c.choice(['Earnest: "We can do this together."', 'Teasing: "Try not to fall asleep before the stairs."', 'Flustered: "Um. Is it normal to be this scared?"', 'Brave: "Tomorrow, we end the Quiet."'], { prompt: 'What do you say?' });
      const lines = [
        'We can do this together. All of us. I mean that.',
        'Try not to fall asleep before the stairs. You snore like a boiler, I\'ve heard it through two walls.',
        'Um. Is it normal to be this scared? Don\'t answer. I can see your face and it\'s fine.',
        'Tomorrow we end the Quiet. Tonight we eat something warm and remember what we\'re fighting for.',
      ];
      await c.say(G.name(), lines[i] || lines[0], { face: 'rowan', expr: i === 2 ? 'worried' : 'happy' });
      await c.say(null, 'Everyone has a fire to keep. Talk to the people around the camp. The Spire opens when you are ready, or when every one of them has had their night.');
    }, { if: () => !flag('ch5_started') });
  }

  // ==================================================================
  // MAP: spire_hall_1 — the Spire's lower halls (Order remnants, Hale)
  // ==================================================================
  const h1 = G.maps.build('spire_hall_1', 30, 26, {
    name: 'Spire Lower Halls', bgm: 'spire', spawn: { x: 14, y: 23, dir: 'up' }, ground: 'g', interior: true,
  });
  h1.border('objects', '7', 1);
  h1.rect('ground', 1, 1, 28, 24, 'g');
  h1.rect('ground', 1, 1, 8, 16, 'm').rect('ground', 21, 1, 8, 16, 'm');
  h1.vline('objects', 9, 1, 16, '7').vline('objects', 20, 1, 16, '7');
  h1.set('objects', 9, 6, ' ').set('objects', 20, 11, ' ');
  h1.blob('ground', 4, 20, 3, 3, 'h').blob('ground', 24, 20, 3, 2, 'h');
  h1.vline('objects', 2, 2, 13, 'P').vline('objects', 27, 2, 13, 'P');
  h1.set('objects', 4, 3, 'M').set('objects', 25, 3, 'J').set('objects', 3, 9, 'J').set('objects', 26, 9, 'M');
  h1.set('objects', 6, 13, 'e').set('objects', 23, 13, 'e');
  h1.set('objects', 24, 15, 'z').set('objects', 5, 15, 'z');
  h1.set('objects', 12, 6, 'Q').set('objects', 17, 6, 'Q').set('objects', 12, 12, 'Q').set('objects', 17, 12, 'Q');
  h1.set('objects', 12, 20, 'Q').set('objects', 17, 20, 'Q');
  h1.set('objects', 14, 3, 's').set('objects', 11, 2, 'L').set('objects', 18, 2, 'L');
  h1.set('objects', 14, 0, 'u');                 // stairs north, to the second hall
  h1.set('objects', 14, 25, 'D');                // the way back out to the gate
  h1.ev([
    H.save('hall1_entry', 12, 22),
    H.save('hall1_mid', 14, 9),
    H.chest('hall1_chest_a', 3, 4, 'ether', 1),
    H.chest('hall1_chest_b', 26, 13, { gold: 140 }),
    H.chest('hall1_chest_c', 6, 22, 'hi_potion', 2),
    H.transfer(14, 0, 'spire_hall_2', 14, 23, 'up', { id: 'hall1_north' }),
    H.transfer(14, 25, 'spire_gate', 18, 9, 'down', { id: 'hall1_south' }),
    {
      id: 'hale_hall', x: 15, y: 5, sprite: 'hale', trigger: 'action', solid: true, dir: 'left',
      if: () => !flag('ch5_hale_done'),
      run: async (c) => {
        await c.say('Hale', 'You don\'t need to say anything, {name}. I rehearsed my lines all week. Every one ends in an apology I can\'t finish.', { face: 'hale', expr: 'worried' });
        await c.say('Hale', 'My lamp-brand feels cold since Lumen Vale. Like someone let my wick out, very politely, and walked away.', { face: 'hale', expr: 'sad' });
        await c.say('Hale', 'The Warden will know you were here. He always knows. I can keep my mouth shut for an hour, if you give me a reason.', { face: 'hale' });
        const i = await c.choice(['"Give me the key to the Foundry."', '"Let me pass. You don\'t have to do this."'], { prompt: 'Hale waits.' });
        await companionsSay(c, {
          caspian: ['Inquisitor. You let me walk away once. I haven\'t forgotten it, sir.', 'Hale. Sir. You kept your word to the lamps longer than you should have. Thank you for stopping.', 'Hale. We both know what it cost to stop. Thank you for stopping.'],
          rook: ['Officer, you have a lovely face for surrender. Keep the key warm, won\'t you.', 'Hale, you\'ve got the look of a man who finally lost something he wanted to lose.', 'You know, Hale, the lamp-brand reads better as a bruise. Go on, be honest about it.'],
        });
        if (i === 0) {
          await c.addItem('spire_key', 1);
          await c.say('Hale', 'The lantern-key opens the Foundry lock. Don\'t let Claret carry it. She\'ll lose it in a drawer and blame the drawer.', { face: 'hale', expr: 'smirk' });
          G.setFlag('ch5_hale_key');
        } else {
          G.setFlag('ch5_hale_pass');
          await c.say('Hale', 'Then go. I lost you in the fog. I\'m better at losing than winning, it turns out.', { face: 'hale', expr: 'smirk' });
        }
        G.setFlag('ch5_hale_done');
      },
    },
  ].flat());
  h1.encounters({ steps: [16, 28], troops: [{ id: 'spire_1', weight: 3 }, { id: 'spire_2', weight: 2 }] });
  h1.finish();

  // ==================================================================
  // MAP: spire_hall_2 — the Cold Foundry halls: valves, the lock, Bram
  // ==================================================================
  const h2 = G.maps.build('spire_hall_2', 30, 26, {
    name: 'Spire Cold Foundry', bgm: 'spire', spawn: { x: 14, y: 23, dir: 'up' }, ground: 'g', interior: true,
  });
  h2.border('objects', '7', 1);
  h2.rect('ground', 1, 1, 28, 24, 'g');
  h2.rect('ground', 1, 1, 8, 16, 'm').rect('ground', 21, 1, 8, 16, 'm');
  h2.vline('objects', 9, 1, 16, '7').vline('objects', 20, 1, 16, '7');
  h2.set('objects', 9, 8, ' ');
  h2.set('objects', 20, 13, 'D');               // the Foundry door (locked by the touch-lock below)
  h2.blob('ground', 24, 18, 3, 2, 'h').blob('ground', 13, 19, 2, 2, 'h');
  h2.vline('objects', 2, 10, 5, 'P').hline('objects', 21, 2, 8, 'P');
  h2.set('objects', 3, 4, 'M').set('objects', 5, 8, 'M').set('objects', 7, 4, 'M');
  h2.set('objects', 25, 12, 'M').set('objects', 22, 15, 'J').set('objects', 27, 15, 'J');
  h2.set('objects', 23, 5, 'e').set('objects', 27, 5, 'e').set('objects', 23, 9, 'e');
  h2.set('objects', 12, 6, 'Q').set('objects', 17, 6, 'Q').set('objects', 12, 16, 'Q').set('objects', 17, 16, 'Q');
  h2.set('objects', 14, 0, 'u');                // stairs north to the Spire's upper hall
  h2.set('objects', 14, 25, 'D');               // back down to the lower halls
  h2.set('objects', 11, 2, 'L').set('objects', 18, 2, 'L');
  h2.set('objects', 16, 9, 'L');
  const valve = (id, x, y, order, label) => ({
    id, x, y, sprite: 'obj_beacon', trigger: 'action', solid: true,
    if: () => !flag('ch5_valves_done'),
    run: async (c) => {
      const step = (G.state.flags.ch5_valve_step | 0);
      if (step === order) {
        G.setFlag('ch5_valve_step', step + 1);
        c.sfx('lantern');
        await c.say(null, label + ' turns with a long, warm sigh. Steam slides into the pipes like a held breath let go.');
        if (step + 1 === 3) {
          G.setFlag('ch5_valves_done');
          c.sfx('heal');
          await c.toast('The Foundry valves are open. The core is breathing.', 'good');
          await c.say(null, 'Three valves, three turns. The Foundry\'s core has lost its grip on the steam.');
        }
      } else {
        G.setFlag('ch5_valve_step', 0);
        c.sfx('buzzer');
        await c.say(null, 'A jet of cold steam hisses out of the wrong valve and locks it shut. Start again from the beginning.');
      }
    },
  });
  h2.ev([
    H.save('hall2_entry', 16, 22),
    H.save('hall2_upper', 14, 4),
    H.chest('hall2_chest_a', 6, 14, 'elixir', 1),
    H.chest('hall2_chest_b', 12, 14, 'sweet_bun', 1),
    H.chest('hall2_chest_foundry', 27, 20, 'lucky_coin', 1),
    H.chest('hall2_secret', 4, 2, 'charm_focus', 1),
    H.transfer(14, 0, 'spire_upper', undefined, undefined, 'up', { id: 'hall2_north' }),
    H.transfer(14, 25, 'spire_hall_1', 14, 2, 'down', { id: 'hall2_south' }),
    {
      id: 'valve_sign', x: 4, y: 12, sprite: 'obj_sign', trigger: 'action', solid: true,
      run: async (c) => { await c.say(null, 'VALVES.\nWarmth rises from the left, crests in the middle and falls to the right. Turn them in that order.'); },
    },
    valve('valve_left', 3, 4, 0, 'The left valve'),
    valve('valve_mid', 5, 8, 1, 'The middle valve'),
    valve('valve_right', 7, 4, 2, 'The right valve'),
    {
      id: 'foundry_lock', x: 19, y: 13, w: 1, h: 1, sprite: null, trigger: 'touch', solid: false,
      if: () => !flag('ch5_foundry_open') && !hasSpireKey(),
      run: async (c) => {
        await c.say(null, 'The Foundry door is sealed. A brass lock in the shape of a lantern, faintly cold. It wants a key.');
        await c.walk('player', ['left']);
      },
    },
    {
      id: 'foundry_key', x: 19, y: 13, w: 1, h: 1, sprite: null, trigger: 'touch', solid: false,
      if: () => !flag('ch5_foundry_open') && hasSpireKey(),
      run: async (c) => {
        G.setFlag('ch5_foundry_open');
        c.sfx('door');
        if ((G.state.inventory.spire_key || 0) > 0) await c.removeItem('spire_key', 1);
        await c.say(null, 'You fit the lantern-key into the lock. The Foundry door unseals with a sigh of cold steam.');
      },
    },
    {
      id: 'bram_foundry', x: 25, y: 13, sprite: 'bram', trigger: 'action', solid: true, dir: 'left', move: 'still',
      run: async (c) => { await bramScene(c); },
    },
  ].flat());
  h2.encounters({ steps: [16, 28], troops: [{ id: 'spire_3', weight: 3 }, { id: 'spire_4', weight: 2 }, { id: 'spire_5', weight: 2 }] });
  h2.finish();

  // Bram in the Cold Foundry: Claret-centred, no battle, tier-aware choice, then the regulator is sabotaged.
  async function bramScene(c) {
    if (flag('ch5_bram_done')) {
      await c.say('Bram', 'Still here. Still humming. I never could sing, Clary. You got that from your mother.', { face: 'bram', expr: 'worried' });
      return;
    }
    c.bgm('sad');
    await c.narrate('The Foundry is loud with cold machinery. At the central console, a thin man in a scorched shipwright\'s apron hums something tender and out of tune. He does not turn around.');
    await c.say('Bram', 'Pressure\'s at four, lovely. Thirty more turns and the Engine will have stopped every tear in Auren. Nobody will ever cry again.', { face: 'bram', expr: 'happy' });
    await c.say('Claret', 'Dad.', { face: 'claret', expr: 'surprised' });
    await c.say('Bram', 'Clary? No. No, you\'re in Brasshaven. The ship needs you. I\'ve been following the reports. You fixed the boiler by yourself, didn\'t you? Of course you did.', { face: 'bram', expr: 'surprised' });
    await c.say('Claret', 'The ship is fine. I am not. Dad, what did they do to you?', { face: 'claret', expr: 'worried' });
    await c.say('Bram', 'They gave me a laboratory and a reason. I haven\'t been this happy in years, Clary. It\'s terrible, isn\'t it?', { face: 'bram', expr: 'sad' });
    const i = await c.choice([
      '"Stop. Please. Look at me."',
      '"You\'re scaring me, Dad."',
      '"Then I\'ll break it myself."',
    ], { prompt: 'Claret steps closer.' });
    await c.affection('claret', i === 0 ? 4 : i === 1 ? 2 : 1, 'Dad, in the Foundry');
    if (i === 0) await c.say('Claret', 'Dad. Look at me. You taught me to read a gauge before I could read a book. Read me now.', { face: 'claret', expr: 'sad' });
    else if (i === 1) await c.say('Claret', 'You\'re scaring me. You never scared me. Not when the boiler blew, not when you vanished. Don\'t start now.', { face: 'claret', expr: 'angry' });
    else await c.say('Claret', 'Then I\'ll break it myself, with a spanner and no pity. That\'s how you taught me, remember? Everything you build holds weight.', { face: 'claret', expr: 'angry' });
    await c.say('Bram', 'I built it to stop your tears, Clary. Every wick it puts out is one less grief in the world. When you cried for a week over a busted kettle, I thought...', { face: 'bram', expr: 'sad' });
    await c.say('Claret', 'You don\'t end suffering by ending people. Ships don\'t stop breaking by sinking. Don\'t touch that. It\'s load-bearing.', { face: 'claret', expr: 'sad' });
    await c.say('Bram', 'It is, isn\'t it. I designed it that way.', { face: 'bram', expr: 'sad' });
    await c.wait(40);
    c.sfx('shatter');
    c.shake(4, 30);
    await c.say(null, 'Bram\'s hand comes down on the core regulator, and then, very carefully, he turns the wheel the wrong way. Alarms wail. The Engine coughs and loses its rhythm.');
    await c.say('Bram', 'Seven turns to the left and the Engine stops listening to me. Now they\'ll have to come down here and talk to me about it. Like you did.', { face: 'bram', expr: 'happy' });
    await c.say('Claret', 'Come with me. Right now. I can fix you. I can fix anything that\'s broken, you taught me that too.', { face: 'claret', expr: 'sad' });
    await c.say('Bram', 'Not yet, Clary. Someone has to stand guard over the thing I made. Go up. Make them sorry. Then come and fetch me.', { face: 'bram', expr: 'smirk' });
    await c.say('Claret', 'I\'m fine. The ship is not fine.', { face: 'claret', expr: 'worried' });
    G.setFlag('ch5_bram_done');
    G.setFlag('ch5_core_sabotaged');
    c.bgm('spire');
  }

  // ==================================================================
  // MAP: spire_upper — the Hollow Queen's gallery: floating lights, the garden gate, Elowen
  // ==================================================================
  const up = G.maps.build('spire_upper', 36, 20, {
    name: 'The Upper Gallery', bgm: 'sad', spawn: { x: 5, y: 10, dir: 'right' }, ground: 'g', interior: true, tint: 'rgba(12,10,30,0.22)',
  });
  up.border('objects', '9', 1);
  up.rect('ground', 1, 1, 34, 18, 'g');
  up.rect('ground', 2, 9, 23, 3, 'c');                         // the red carpet, lit by the floating lamps
  up.hline('above', 2, 2, 32, '*');                            // a string of warm lanterns over the gallery
  up.hline('above', 2, 17, 22, '*');
  up.blob('ground', 8, 16, 5, 2, 'h').blob('ground', 22, 3, 4, 2, 'h').blob('ground', 15, 4, 2, 1, 'h');
  up.vline('objects', 26, 1, 18, '9');                         // the wall of the garden
  up.set('objects', 26, 10, ' ');                              // the one gap, where Elowen stands
  up.rect('ground', 27, 1, 8, 18, '.');                        // the garden, unseen until Elowen falls aside
  up.hline('objects', 6, 6, 4, 'Q').hline('objects', 6, 12, 4, 'Q');
  up.set('objects', 13, 6, 'Q').set('objects', 13, 12, 'Q').set('objects', 19, 6, 'Q').set('objects', 19, 12, 'Q');
  up.vline('objects', 3, 3, 3, 'P').vline('objects', 3, 14, 3, 'P');
  up.set('objects', 22, 2, 'L').set('objects', 5, 2, 'L').set('objects', 22, 16, 'L').set('objects', 5, 16, 'L');
  up.set('objects', 1, 9, 's').set('objects', 1, 11, 's');     // statues flanking the entry
  up.set('objects', 30, 2, 'T').set('objects', 33, 2, 'T').set('objects', 30, 16, 'T').set('objects', 33, 16, 'T');
  up.set('objects', 29, 9, 'o');                               // a fountain in the garden
  up.set('objects', 3, 8, 'V').set('objects', 22, 17, 'V');    // banners of the Hearth Order
  up.set('objects', 2, 1, 'u').set('objects', 4, 19, 'u');     // stairs to the Hearthstar, and back down
  up.scatter('objects', 'F', 8, { seed: 21, avoid: [{ x: 1, y: 1, w: 25, h: 18 }] });
  up.scatter('objects', 'B', 6, { seed: 22, avoid: [{ x: 1, y: 0, w: 25, h: 19 }] });
  up.ev([
    H.save('upper_save', 10, 10),
    H.sign('upper_portrait', 14, 1, 'A portrait under a cracked gilt frame: a smiling woman with a lantern glowing in her chest. The plaque says only ELOWEN.'),
    H.chest('upper_chest', 2, 4, 'ember_wine', 1),
    H.transfer(2, 1, 'hearthstar_chamber', undefined, undefined, 'up', { id: 'upper_to_chamber', if: () => flag('ch5_elowen_done') }),
    H.transfer(4, 19, 'spire_hall_2', 14, 2, 'down', { id: 'upper_to_hall2' }),
    {
      id: 'upper_stairs_block', x: 2, y: 2, w: 1, h: 1, sprite: null, trigger: 'touch', solid: false,
      if: () => !flag('ch5_elowen_done'),
      run: async (c) => {
        await c.say(null, 'The stairs up to the Hearthstar are behind you, but the way is not open. Somewhere past the garden gate, a voice is singing softly.');
      },
    },
    {
      id: 'elowen_gate', x: 26, y: 10, sprite: 'elowen', trigger: 'action', solid: true, dir: 'left', move: 'still',
      if: () => !flag('ch5_elowen_done'),
      run: async (c) => { await elowenEncounter(c); },
    },
  ].flat());
  up.encounters({ steps: [30, 44], troops: [{ id: 'spire_5', weight: 1 }] });
  up.finish();

  // Hollow Elowen: intro (once), the boss fight, and the mother-and-child outro.
  async function elowenEncounter(c) {
    if (!flag('ch5_elowen_met')) {
      G.setFlag('ch5_elowen_met');
      c.bgm('sad');
      await c.narrate('A woman stands in the gap of the garden wall. Her dress is made of lamplight and ash. Where a heart should be, there is only one small ember, and a hairline thread of gold that seems to lean toward {name}.');
      await c.say('Elowen', 'The garden is closed. It has been closed since the lamps went out. Go back down, little lights.', { face: 'elowen', expr: 'sad' });
      await c.say('Claret', 'We just want through, ma\'am. Nobody has to get hurt.', { face: 'claret', expr: 'worried' });
      await c.say('Elowen', 'Everyone who wants through has a wick they are willing to give. Yours are so bright. I can feel them from here.', { face: 'elowen', expr: 'normal' });
      const i = await c.choice(['"Please. Let us pass."', '"Who are you?"', '"I\'m sorry you were alone up here."'], { prompt: 'Rowan steps forward.' });
      if (i === 1) await c.say('Elowen', 'Someone who used to be called by name. I\'ve forgotten the name. I haven\'t forgotten the garden.', { face: 'elowen', expr: 'sad' });
      if (i === 2) await c.say('Elowen', 'Alone. Yes. That is the kindest word anyone has said in this tower. Let me keep it, and give you the fight.', { face: 'elowen', expr: 'smirk' });
      await c.say('Elowen', 'Then I will keep you in the garden, the way I kept everything else.', { face: 'elowen', expr: 'angry' });
    }
    const result = await c.battle('boss_elowen', {
      canEscape: false, bgm: 'boss', loseOk: true,
      intro: async (c2) => { await companionsSay(c2, { caspian: ['Steady. We fight her without hurting her. That\'s the whole trick.'], seraphine: ['Sing with me when you can. Her hymn has a hole in it. We can fill it.'] }); },
      onHalf: async (c2) => {
        c2.sfx('light');
        c2.flash('#fff6c8', 24);
        await c2.say(G.name(), 'Elowen. Look. This is warm. Can you feel it?', { face: 'rowan', expr: 'worried' });
        await c2.say('Elowen', 'Warm... that is not... who taught you to be warm?', { face: 'elowen', expr: 'surprised' });
        await c2.say(null, 'The ember in her chest flickers, and the hairline gold thread flares toward {name} like a drawn breath.');
      },
      outro: async (c2) => { await c2.wait(30); },
    });
    if (result !== 'win') return;
    await elowenOutro(c);
  }

  // The quiet, devastating scene: Elowen returns to herself for a moment.
  async function elowenOutro(c) {
    c.bgm('sad');
    c.sfx('heart');
    await c.fade('out', 50, '#fff8e0');
    await c.wait(20);
    await c.fade('in', 80, '#fff8e0');
    await c.narrate('The ash falls out of her hair like snow. For a moment, the woman in the garden gate is only tired, and only herself.');
    await c.say('Elowen', 'Oh. Oh, you\'re warm. Warmer than the lamps ever were. Why are you so warm?', { face: 'elowen', expr: 'surprised' });
    await c.say(G.name(), 'I\'m... I don\'t know. Ma\'am, are you...', { face: 'rowan', expr: 'worried' });
    const pick = await c.choice(['"Are you my mother?"', '"Why did you leave me?"', '"It\'s okay. I\'m here now."'], { prompt: 'What do you ask?' });
    await c.say('Elowen', 'I am the one who made you a cradle, and the one who gave away the light to close the door on you. I am so sorry. I did not know a child could be so heavy with warmth.', { face: 'elowen', expr: 'sad' });
    if (pick === 1) await c.say(G.name(), 'You didn\'t leave me. You put me somewhere safe. I can hear it in your voice.', { face: 'rowan', expr: 'sad' });
    if (pick === 2) await c.say(G.name(), 'I\'m here now. The lamps are cold, but I brought a warm one. I did. I think.', { face: 'rowan', expr: 'happy' });
    await c.say('Elowen', 'Your wick is not missing, love. It was never a wick. It is the Heart. The Hearthstar is only a mirror of it. I hid it inside you so the Warden could not burn it for the Quiet.', { face: 'elowen', expr: 'normal' });
    await c.say(G.name(), 'So the lamps... every lamp in Auren has been drinking from me. Is that right?', { face: 'rowan', expr: 'worried' });
    await c.say('Elowen', 'Yes. But here is the thing, and listen to me, because I have so little time. Warmth is not spent. It is shared.', { face: 'elowen', expr: 'happy' });
    await c.say('Elowen', 'Ignatius believes love is fuel that burns people out. He is wrong. He is only lonely, and I left him to be lonely in a house full of lamps.', { face: 'elowen', expr: 'sad' });
    await companionsSay(c, {
      seraphine: ['Lady Elowen, your hymn was never wrong. Only unfinished. I\'m so glad to hear the last verse.', 'Lady, your hymn is finished now. Thank you for singing it, even this quietly.', 'Oh. Oh, Elowen. Thank you for the last verse.'],
      wren: ['She\'s fading like a good candle. Good candles don\'t go out angry, they go out tired.', 'Lady, you\'re going to be warm now. I can tell by the fox. He\'s sitting down.', 'Elowen. Go on. The garden will be fine. Foxes always know where to sit.'],
    });
    await c.say('Elowen', 'Tell Ignatius that I still remember the garden. Tell him I am not angry. Tell him I\'m sorry I made him wait. Go up. Give the Heart away, not to him. To everyone.', { face: 'elowen', expr: 'happy' });
    await c.say(G.name(), 'I will. I promise. Thank you, Mother.', { face: 'rowan', expr: 'happy' });
    await c.say('Elowen', 'Mm. That word hurts a little. In the good way.', { face: 'elowen', expr: 'smirk' });
    c.emote('elowen_gate', 'heart');
    await c.fade('out', 60, '#fff8e0');
    await c.wait(30);
    G.setFlag('ch5_elowen_done');
    G.setFlag('ch5_done');
    await c.showNpc('elowen_gate', false);
    c.chapter(5);
    await c.fade('in', 60, '#fff8e0');
    await c.say('Claret', 'Rowan. Your face. Are you going to be sick?', { face: 'claret', expr: 'worried' });
    await c.say(G.name(), 'No. I\'m going to be brave. Let\'s go, Claret.', { face: 'rowan', expr: 'happy' });
    await c.say('Claret', 'Good. Then let\'s go and say something to the Warden he\'ll never forget.', { face: 'claret', expr: 'smirk' });
    await c.toast('Hollow Elowen is gone. The Hearthstar stairs are open.', 'good');
  }

  // ==================================================================
  // MAP: hearthstar_chamber — the round chamber at the top of the Spire (Chapter 6)
  // ==================================================================
  const hs = G.maps.build('hearthstar_chamber', 26, 22, {
    name: 'The Hearthstar Chamber', bgm: 'chamber', spawn: { x: 13, y: 19, dir: 'up' }, ground: 'g', interior: true, tint: 'rgba(6,4,22,0.30)',
  });
  hs.border('objects', '7', 1);
  // a round chamber: marble floor, sigil rings of lantern-light, cold walls outside the circle
  for (let y = 1; y < 21; y++) for (let x = 1; x < 25; x++) {
    const d = Math.hypot(x - 12.5, y - 10.5);
    if (d > 10.6) hs.set('objects', x, y, 'W');
    else if ((d >= 8.5 && d < 9.5) || (d >= 4.5 && d < 5.5)) hs.set('ground', x, y, 'l');
    else if (d >= 9.5) hs.set('ground', x, y, 'h');
  }
  // pillars of the old Lampwrights around the sigil ring
  for (let k = 0; k < 8; k++) {
    const a = (Math.PI / 4) * k + Math.PI / 8;
    hs.set('objects', Math.round(12.5 + 7 * Math.cos(a)), Math.round(10.5 + 7 * Math.sin(a)), 'Q');
  }
  // the Cold Engine throne: a brass-and-iron machine with gears and boilers
  hs.rect('objects', 12, 9, 2, 2, 'M');
  hs.set('objects', 11, 11, 'e').set('objects', 14, 11, 'e').set('objects', 10, 8, 'J').set('objects', 15, 8, 'J');
  hs.set('objects', 6, 6, 'z').set('objects', 19, 15, 'z').set('objects', 20, 6, 'z');
  hs.set('objects', 3, 10, 'P').set('objects', 22, 10, 'P');
  hs.set('objects', 13, 2, 'I').set('objects', 12, 2, 'I');       // the old Hearthstar hearth, cold
  hs.ev([
    H.save('chamber_save', 13, 16),
    H.auto('chamber_arrival', async (c) => {
      c.chapter(6);
      G.setFlag('ch6_started');
      c.bgm('chamber');
      await c.wait(40);
      await c.camera(12, 9, 60);
      await c.titleCard(T6.title, T6.subtitle, 160);
      await c.narrate('The stairs open into a round, cold room. Above it the Hearthstar hangs in the dark like a bruise that remembers being a sun.');
      await c.say('Vael', 'Rowan. You came up the stairs with a warm lantern in your hand. I hoped you would. It seemed kinder to meet you here.', { face: 'vael', expr: 'normal' });
      await c.say('Vael', 'Stand where I can see you. Your friends may stand behind you. That is how these things are done, when they are done properly.', { face: 'vael', expr: 'smirk' });
      await c.camReset(60);
    }, { if: () => !flag('ch6_started') && flag('ch5_elowen_done') }),
    {
      id: 'vael_parley', x: 12, y: 7, sprite: 'vael', trigger: 'action', solid: true, dir: 'down', move: 'still',
      if: () => flag('ch6_started') && !flag('ch6_parley'),
      run: async (c) => { await vaelParley(c); },
    },
    {
      id: 'vael_fight1', x: 12, y: 7, sprite: 'vael', trigger: 'action', solid: true, dir: 'down', move: 'still',
      if: () => flag('ch6_parley') && !flag('ch6_vael1'),
      run: async (c) => { await vaelFight1(c); },
    },
    {
      id: 'vael_fight2', x: 12, y: 7, sprite: 'vael', trigger: 'action', solid: true, dir: 'down', move: 'still',
      if: () => flag('ch6_vael1') && !flag('ch6_vael2'),
      run: async (c) => { await vaelPhaseTwo(c); },
    },
    {
      id: 'heart_fallback', x: 12, y: 8, w: 1, h: 1, sprite: null, trigger: 'touch', solid: false,
      if: () => flag('ch6_vael2') && !flag('ch6_done'),
      run: async (c) => { await finale(c); },
    },
  ].flat());
  hs.finish();

  // Vael's parley: three rounds, each with a choice of counter-argument; companions chip in, tier-aware.
  async function vaelParley(c) {
    G.setFlag('ch6_parley');
    c.bgm('tense');
    await c.say('Vael', 'Let me explain it properly, since you climbed so far to hear it. Every lamp in Auren drinks a little warmth from every wick. It is slow, tidy, and nobody has to be sad about it.', { face: 'vael', expr: 'normal' });
    await c.say('Vael', 'Grief is what happens when the cup runs dry. The Quiet is simply the lid. Nothing ever spills again.', { face: 'vael', expr: 'smirk' });
    const r1 = await c.choice([
      '"Grief is how we remember the people we loved."',
      '"And hope is how we keep going. Both belong."',
      '"You\'re just afraid of being sad, Warden."',
    ], { prompt: 'Answer Vael.' });
    await c.say(G.name(), ['Grief is how we remember the people we loved. I\'m not giving that up for a lid.', 'Hope and grief are both in the same lamp. You don\'t get to keep one and throw the other out.', 'You\'re afraid of it, aren\'t you? That\'s why the tower is so cold.'][r1], { face: 'rowan', expr: r1 === 2 ? 'smirk' : 'normal' });
    await c.say('Vael', ['Yes. Grief is the part of the memory that eats the room. Look at this tower.', 'Hope is a lamp you keep lit for people who will not come home. I have been lighting mine for twenty years.', 'I was afraid. I am afraid now. Fear is the most honest thing I have left, Rowan.'][r1], { face: 'vael', expr: r1 === 2 ? 'sad' : 'normal' });
    await companionsSay(c, {
      claret: ['Grief is a fault in the design, Vael. You don\'t throw out the whole ship because one boiler sings.', 'You can\'t engineer a world without tears. I\'ve tried, Warden. The gears seize up.', 'Grief is the part of me that still walks into Dad\'s workshop. I\'m keeping it. Thanks.'],
      caspian: ['I put a village\'s lamps out once, for the star. Grief was the only honest thing I had left after that.', 'Grief is the price of having loved something, Warden. I would pay it again without blinking.', 'You left Elowen to be lonely, Warden. I know that kind of lonely. I know it from the inside.'],
      rook: ['Grief is what I ran from for ten years. You can\'t outrun a memory, but you can sit down with it.', 'I ran from my own village\'s grief. I\'d rather sit in it with someone than be happy alone in a silent town.', 'I\'d sit in grief with this lot any day over a quiet, perfect nothing, Warden. Tell me I\'m wrong.'],
      seraphine: ['The hymns you taught us had a verse about weeping. We never sang it. We should have.', 'Grief is a hymn with the rests still in it. You don\'t skip the rests, Warden. That\'s where the breath is.', 'I used to think tears were a failure of faith. Now I think they\'re the faith itself.'],
      wren: ['The oaks in my wood lose every leaf each autumn. They grieve, then they come back. That is how a forest keeps its promises.', 'Grief is weather, not a flood. Let it blow through and plant something after. Honestly, it\'s basic.', 'Tears are rain, Warden. Your Quiet is a drought wearing a nice coat.'],
    });
    await c.say('Vael', 'Ask Elowen. She gave her wick away because it hurt too much to keep. I am only offering the same mercy to everyone.', { face: 'vael', expr: 'sad' });
    const r2 = await c.choice([
      '"She gave it away because she loved you both."',
      '"She gave it away because she was alone. Nobody should be."',
      '"Mercy that takes away a choice isn\'t mercy."',
    ], { prompt: 'Answer Vael.' });
    await c.say(G.name(), ['She loved you both. That\'s why it was so hard for her. Please don\'t make her love into a lock.', 'Nobody should be alone up here. Not her. Not you. That\'s why I came.', 'Mercy with the choice taken out is just a closed door, Vael. I\'m not going through a door I didn\'t pick.'][r2], { face: 'rowan', expr: 'worried' });
    await c.say('Vael', ['Yes. That is the trap in it. Love is the reason she could not bear to stay. Let me spare you that.', 'Then I should have been the one who stayed with her. That was my failure, not the mercy\'s.', 'Mercy takes choices from people who cannot carry them. I can carry them all. That is the point of me.'][r2], { face: 'vael', expr: 'sad' });
    await companionsSay(c, {
      claret: ['Mercy with a lock on it is what my father built. I know how that sounds. He called it a solution.', 'Don\'t call it mercy, Warden. You call it mercy and I can hear the wrench tightening.', 'Ask anyone who has had a door shut on them. It doesn\'t feel like kindness, Vael. It feels like being told to shush.'],
      caspian: ['When I was ordered to put the lamps out, they called it mercy too. I still hear the word in my sleep.', 'Mercy is not a decision you make for someone while they sleep. You protect them, you do not put them out.', 'You are asking us to forgive a thing you have not done yet, Warden. I know that trick. I used to sell it.'],
      rook: ['Ask anyone who got left behind. Mercy that means "gone" is not mercy, it\'s a dropped coin nobody picks up.', 'If somebody offers me a quiet mercy, I check my pockets. Something is always missing when they\'re that nice.', 'I\'ve been the one who ran. You know what I wanted, all those years? Someone to stay. That\'s it. That\'s the whole thing.'],
      seraphine: ['Elowen sang warmth, Warden. You can\'t hymn a silence. It\'s only a rest with no song after it.', 'Elowen gave her light so her son would be safe. That was love, not mercy. Love does not need a quiet to be real.', 'Ignatius, she waited. Every song she sang up here was a way of waiting for you to come home.'],
      wren: ['Foxes don\'t hide from the dark because they are sad. They hide because they are careful. Be careful with yourself, Warden.', 'Mercy with no seeds in it grows nothing at all. Plant something warm first, and then ask what it\'s for.', 'The Quiet is frost. Frost kills the flowers, and then it kills the roots, and then it calls itself peaceful.'],
    });
    await c.say('Vael', 'You don\'t have a wick, Rowan. You carry the Heart. Hand it to me, and nobody ever suffers again. Nobody. Ever.', { face: 'vael', expr: 'normal' });
    const r3 = await c.choice([
      '"Then nobody ever loves again, either."',
      '"Ask me again once you\'ve met my friends."',
      '"I\'m not handing over anything. Come and take it."',
    ], { prompt: 'Answer Vael.' });
    await c.say(G.name(), ['Then nobody ever loves again either. You can\'t have one without the other, Vael. I learned that from a fox.', 'Ask me again once you\'ve met my friends. You won\'t like how they talk back.', 'I\'m not handing over anything. If you want the Heart, you\'re going to have to take it from all of us.'][r3], { face: 'rowan', expr: r3 === 2 ? 'angry' : 'smirk' });
    await companionsSay(c, {
      claret: ['No. I\'ve watched you pretend to be calm since the first lamp. It\'s a terrible disguise, Vael.', 'Rowan is not a battery, Warden. You don\'t plug people in and call the silence peace.', 'Rowan stays Rowan. So do we. Hands off, Ignatius. That is load-bearing.'],
      caspian: ['I will stand in front of Rowan. I did that once for the wrong master. This time I choose the stance myself.', 'Warden, I am not a knight anymore. I am a man who keeps his promises. Rowan is mine to protect.', 'Rowan is not your fuel. Rowan is a friend. You can\'t harvest a friendship, Warden. Nobody ever could.'],
      rook: ['Wait, wait. You want to make a deal? I\'m a professional. Can I see the terms in writing?', 'Oi. The Heart is not on the table, Warden. Rowan\'s the one who gets to decide what happens to it.', 'You want to take the one person who ever made me want to stay? No chance. Not for all the lamps in the world.'],
      seraphine: ['You\'re singing a lullaby with no ending, Warden. Let me sing you the ending instead.', 'Ignatius, Elowen says the warmth is shared. Stop choosing silence and start listening to the choir.', 'Rowan\'s light is a song that needs more voices in it. Come and sing with us. Please.'],
      wren: ['You can ask a seed for its warmth and it will give it freely. You cannot take it. Nobody can take a seed.', 'Grief and warmth both live in the soil, Warden. Plants don\'t ask the frost for permission. They just grow.', 'Rowan, pull the frost out of the soil and let the roots breathe. That is all it takes, I promise.'],
    });
    await c.say('Vael', 'Then the Engine will decide. It is the only one of us who was never afraid of the dark. Stand back, all of you. You will feel nothing. It is merciful.', { face: 'vael', expr: 'angry' });
    c.sfx('buzzer');
    await c.wait(30);
  }

  // ------------------------------------------------------------------ Vael's fight (phase 1 → phase 2)
  async function vaelFight1(c) {
    c.bgm('boss');
    const r = await c.battle('boss_vael1', {
      canEscape: false, bgm: 'boss', loseOk: true,
      intro: async (c2) => {
        await c2.say('Vael', 'Stand where you are. The first part is only a formality. The second part is the Quiet.', { face: 'vael', expr: 'normal' });
        await companionsSay(c2, {
          claret: ['Hit the lantern, not the coat. The lantern is what keeps him talking.'],
          caspian: ['Keep the guard up, Rowan. He does not fight like a man who is afraid of losing.'],
          wren: ['His coat is all silver thread. Foxes hate that. Let\'s go.'],
        });
      },
      onHalf: async (c2) => {
        c2.sfx('heart');
        await c2.say('Vael', 'You are better than my reports said. Then let us see whether your friends can hold the Engine when I call it.', { face: 'vael', expr: 'smirk' });
      },
      outro: async (c2) => {
        await c2.say('Vael', 'Oh. Oh, that is warmer than I expected. Elowen used to be warm like that, before the house got cold.', { face: 'vael', expr: 'sad' });
      },
    });
    if (r !== 'win') return;
    G.setFlag('ch6_vael1');
    await vaelPhaseTwo(c);
  }

  // The Cold Engine awakens. Phase 2 of Vael. Also the re-entry point if the player lost phase 2.
  async function vaelPhaseTwo(c) {
    c.sfx('shatter');
    await c.shake(6, 40);
    c.flash('#c8e8ff', 30);
    await c.narrate('Vael steps back onto the throne. The sigils ignite in cold blue, one ring after another, and the whole chamber begins to hum like a held note.');
    await c.say('Vael', 'Now the Engine. It was built to be merciful. I will not pretend it is pretty.', { face: 'vael', expr: 'angry' });
    if (flag('ch5_core_sabotaged')) {
      await c.say('Vael', 'The regulator is slipping. Bram. Of course. He was always the cleverest of my people, and the most sentimental.', { face: 'vael', expr: 'surprised' });
      await c.say(null, 'Somewhere far below, a loud, thin voice is laughing, and crying, and turning a wheel the wrong way.');
    }
    c.bgm('finalboss');
    const r2 = await c.battle('boss_vael2', {
      canEscape: false, bgm: 'finalboss', loseOk: true,
      intro: async (c2) => {
        await c2.say('Vael', 'Do you know what it is to be the only one who remembers? The Engine is that memory, cold and perfect. It never has to forget anything.', { face: 'vael', expr: 'sad' });
        await companionsSay(c2, {
          claret: ['Shoot the regulator, not the throne. Dad left us a weak spot in the code. Trust me on this one.'],
          seraphine: ['Sing with me. The Engine loses its rhythm when we all breathe on the same note.'],
          rook: ['Hey, Vael. Nice throne. Shame about the slow, expensive, clanking noises it makes.'],
        });
      },
      onHalf: async (c2) => {
        c2.sfx('break');
        await c2.say(null, 'The Cold Engine shudders and coughs out a cloud of frost. For the first time, Vael looks uncertain.');
        await c2.say('Vael', 'Stop. You are making it want to be warm. It was never supposed to want anything.', { face: 'vael', expr: 'worried' });
      },
      outro: async (c2) => {
        await c2.say('Vael', 'Oh. The light is in the room. Elowen\'s light. I thought I had put it out.', { face: 'vael', expr: 'surprised' });
      },
    });
    if (r2 !== 'win') return;
    G.setFlag('ch6_vael2');
    await finale(c);
  }

  // ------------------------------------------------------------------ the Choice at the Heart
  async function finale(c) {
    if (flag('ch6_done')) return;
    c.bgm('tense');
    await c.narrate('The Hearthstar cracks open above the chamber like a sunrise breaking through a lid. Light falls down through the dark, and every sigil on the floor turns toward {name}.');
    await c.say('Vael', 'There. You see it. The Heart is yours to keep, or to give. Choose, Rowan. Choose it the way Elowen did. Alone, if you must.', { face: 'vael', expr: 'normal' });
    const i = await c.choice([
      'Offer your light.',
      'Refuse the Quiet.',
      'Ask for help.',
    ], { prompt: 'The Heart waits. What do you do?' });
    if (i === 0) {
      await c.say(G.name(), 'Then take my light, all of it. I\'m not keeping it for myself. It was never mine to keep.', { face: 'rowan', expr: 'happy' });
      await c.say(null, 'Warmth pours out of the Heart in every direction, down the stairs, through the halls, out of the Spire and across the ash.');
    } else if (i === 1) {
      await c.say(G.name(), 'No. I refuse the Quiet. Out loud, so every lamp in Auren can hear it. Nobody goes cold for the sake of a tidy sky.', { face: 'rowan', expr: 'angry' });
      await c.say(null, 'The word goes through the Spire like a struck bell. Every lamp in the world flickers at the same instant, and then burns steadier than before.');
    } else {
      await c.say(G.name(), 'I need help. I\'ve never said that before. Will you help me hold this?', { face: 'rowan', expr: 'worried' });
      await c.say(null, 'Five voices answer before the question is finished. The sentence is never needed. Everybody was already reaching.');
    }
    await c.say('Vael', 'So that is what it looks like. Warmth divided, and not diminished. I had the arithmetic wrong for twenty years.', { face: 'vael', expr: 'sad' });
    await c.sfx('heart');
    await c.flash('#fff4c8', 40);
    await endings(c);
  }

  // Picks the ending from state, plays it, then shows credits.
  async function endings(c) {
    const lover = loverId();
    const warm = presentCands().filter((id) => tierOf(id) >= 1);
    const key = lover ? 'twin' : (warm.length >= 3 ? 'common' : 'lone');
    G.state.flags.ending = key;
    G.setFlag('new_game_plus');
    G.setFlag('ch6_done');
    G.setFlag('ch6_ending_' + key);
    if (key === 'twin') await endTwin(c, lover);
    else if (key === 'common') await endCommon(c);
    else await endLone(c);
    await c.credits(key);
  }

  // Vael's redemption, shared by every ending. Extinguished gently into peace, reunited with Elowen's light.
  async function vaelRedemption(c, extra) {
    await c.say('Vael', 'Elowen. You are still warm. I thought the cold had won the whole argument.', { face: 'vael', expr: 'surprised' });
    await c.say('Vael', 'Tell the Order I was wrong. Tell the lamps. Tell Ignatius, who is tired and a little ashamed, that he was never the cruel one.', { face: 'vael', expr: 'sad' });
    if (extra) await c.say('Vael', extra, { face: 'vael', expr: 'happy' });
    await c.narrate('The silver lantern on his coat goes out, gently, the way a candle does when someone closes a window against the rain. His light goes up the stairs toward a second light, and both are warm.');
  }

  // Twin Flame: the Beloved's wick is entwined with Rowan's.
  async function endTwin(c, lover) {
    c.bgm('ending_love');
    await c.fade('out', 60, '#fff4c8');
    await c.wait(20);
    await c.fade('in', 90, '#fff4c8');
    await c.narrate('Two lights stand at the centre of the Hearthstar chamber. One is Rowan\'s, and the other is braided through it like a ribbon that was never allowed to come loose.');
    const LOVE = {
      claret: ['Don\'t you dare go out on me, Rowan. I still have a ship to fix, and you\'re the only one who holds the spanner right.', 'I\'m fine. The ship is not fine. But you... you are fine. Tell me you\'re fine.'],
      caspian: ['Rowan. I will not look away this time. I am here, and I am staying.', 'You gave the Heart back to everyone. Now I give you my hand back. Keep it, if you like.'],
      rook: ['Okay. Okay. You\'re allowed to be the brave one for once. I\'ll be right here being a mess, same as always.', 'I stayed. Look at that. Turns out I can. Turns out it was always you I was staying for.'],
      seraphine: ['Then we sing it together. Breathe with me, the way the choir does. In, and out, and in again.', 'You were never a lamp, Rowan. You are a hymn. I was only ever allowed to sing the verse you wrote.'],
      wren: ['Let the seeds go. I\'ll keep the garden warm. You come back and tell me all about the stars, the rude ones and the kind ones.', 'You\'re not cold. You never were. You just needed somebody to plant you in a warm place. Honestly, it\'s basic.'],
    };
    for (const line of (LOVE[lover] || [])) await c.say(NAME[lover] || lover, line, { face: lover });
    await c.say(G.name(), 'Then I\'ll keep the light on. For both of us. Every night, if you\'ll stay where I can see it.', { face: 'rowan', expr: 'happy' });
    await vaelRedemption(c);
    await c.runScene(lover + '_epilogue');
    await c.titleCard('Twin Flame', 'Two hearts, one hearth', 240);
  }

  // Common Flame: every companion lends a flame; the star becomes a shared hearth.
  async function endCommon(c) {
    c.bgm('ending_common');
    await c.narrate('Across the chamber, the companions come up one by one, the way people come to a fire on a cold night. Each of them has a small light to lend.');
    const LEND = {
      claret: 'Here. Take my spanner-lamp. I\'ve been carrying it for ten years, and I\'d rather you carried it for a while.',
      caspian: 'I have no good words, only a flame that is mine. It has been mine since the day I walked out of the Order. Use it well, Rowan.',
      rook: 'My lucky coin is on the end of this flame. Don\'t tell anyone. I put it on the warmest light I know.',
      seraphine: 'A lantern-hymn, the one I was told never to sing. It belongs to the warm now. So do I.',
      wren: 'A moonpetal, lit from the inside. It\'s the only light I have that I didn\'t grow myself. The garden loves it anyway.',
    };
    for (const id of presentCands()) if (LEND[id]) await c.say(NAME[id], LEND[id], { face: id });
    await c.say(G.name(), 'So this is what a hearth is. It was never about one star. It is about everyone standing close enough to share the heat.', { face: 'rowan', expr: 'happy' });
    await vaelRedemption(c, 'Put my flame with theirs, Elowen. It was always going to be a shared one.');
    await c.titleCard('Common Flame', 'A hearth for everyone', 240);
  }

  // Lone Flame: Rowan becomes the new star, alone, bittersweet, with a lantern kept lit below.
  async function endLone(c) {
    c.bgm('ending_lone');
    await c.narrate('The light goes up through the Spire and stays there. Rowan is left at the centre of the chamber, a small warm figure in a very large dark, holding a star that is finally, honestly, Rowan\'s own.');
    await c.narrate('The companions go down the stairs slowly, looking back at every step. They have a long road home, and they know it.');
    await c.say(G.name(), 'It\'s all right. I\'m not gone. I\'ll be the star now. I think I can do that, if somebody keeps a lantern lit for me down there.', { face: 'rowan', expr: 'sad' });
    await vaelRedemption(c, 'Be brave for them, Rowan. A star does not need company to shine. It only needs to remember where it came from.');
    await c.narrate('Far below, on the Marigold\'s dock in Brasshaven, a lantern is lit and hung on the rail. In Wickholm, Maren knits a warm scarf and leaves a light in the window.');
    await c.titleCard('Lone Flame', 'The star keeps a light on for home', 240);
  }

  // Story-script hooks: other modules (and the branch tests) can call these by name.
  G.story.scripts = G.story.scripts || {};
  G.story.scripts.ch5_eve_close = (c) => finishEve(c);
  G.story.scripts.ch5_bram = (c) => bramScene(c);
  G.story.scripts.ch6_finale = (c) => finale(c);
  G.story.scripts.ch6_endings = (c) => endings(c);

  G.provide('ch5');
})();
