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
  const cs = (who, text, face, expr) => ({ who, text, face, expr });

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
  ]);
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

  // @@NEXT@@
})();
