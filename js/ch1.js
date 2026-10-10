/* =====================================================================
 * LANTERNBOUND — ch1.js  (ch1 agent)
 * Prologue "Cold Ember" (Wickholm, Mossgrave Wood) + Chapter 1 "Brass & Steam"
 * (Brasshaven, Claret's workshop, the Clockwork Undercroft).
 * Maps: wickholm_house wickholm mossgrave_wood brasshaven brasshaven_workshop
 *       brasshaven_inn undercroft_1 undercroft_2
 * ===================================================================== */
(function () {
  'use strict';
  const G = window.G;
  const H = G.maps.helpers;

  G.story = G.story || { scripts: {}, chapters: {} };
  G.story.chapters = G.story.chapters || {};
  G.story.chapters[0] = { title: 'Prologue: Cold Ember', subtitle: 'Wickholm & the Hollow Dusk' };
  G.story.chapters[1] = { title: 'Brass & Steam', subtitle: 'Brasshaven, the Marigold, and the Clockwork Undercroft' };

  // ------------------------------------------------------------ tiny staging helpers
  // Rowan speaks with the player's name as speaker (ui maps it to the rowan portrait).
  const me = (c, text, expr) => c.say(G.name(), text, { face: 'rowan', expr: expr || 'normal' });
  const who = (c, name, face, text, expr) => c.say(name, text, { face, expr: expr || 'normal' });
  const nar = (c, text) => c.say(null, text);
  const once = (k) => !G.flag(k);
  // grants a flag (one-off guard) and returns true the first time it is called
  const claim = (k) => { if (G.flag(k)) return false; G.setFlag(k); return true; };
  // Ch1 soft helper: award affection only once per reason flag
  const aff = (c, id, n, flag, reason) => { if (claim(flag)) return c.affection(id, n, reason); return null; };

  // ============================================================ MAP 1 — Rowan's house
  function buildWickholmHouse() {
    const m = G.maps.build('wickholm_house', 12, 9, {
      name: "Rowan's House", bgm: 'wickholm', interior: true, ground: 'f',
      spawn: { x: 5, y: 6, dir: 'down' },
    });
    m.room(0, 0, 12, 9, { floor: 'f', wall: 'X', topWall: 2 });
    // windows on the back wall, a rug, the hearth
    m.set('objects', 3, 0, 'O').set('objects', 8, 0, 'O');
    m.rect('ground', 3, 4, 4, 3, 'c');
    m.set('objects', 10, 2, 'I');                                  // hearth (warm glow)
    m.tiles('objects', [[1, 2], [2, 2]], 'Y');                     // bookshelves
    m.tiles('objects', [[4, 2]], 'S');                             // jars shelf
    m.tiles('objects', [[1, 4], [1, 5]], 'Z');                     // Rowan's bed
    m.tiles('objects', [[7, 4]], 'E');                             // table
    m.tiles('objects', [[6, 4], [8, 4]], 'H');                     // chairs
    m.tiles('objects', [[10, 6]], 'H');                            // Maren's knitting chair
    m.tiles('objects', [[2, 7], [3, 7]], 'C');                     // crates of lamp oil
    m.tiles('objects', [[9, 7], [10, 8]], 'U');                    // barrels
    m.set('objects', 3, 6, 'L');                                   // the chore lamp
    m.set('objects', 5, 8, 'D');                                   // front door

    m.ev([
      H.transfer(5, 8, 'wickholm', 6, 10, 'up', { id: 'wh_exit' }),
      {
        id: 'wh_lamp', x: 3, y: 6, sprite: 'obj_lamp', trigger: 'action', solid: true,
        if: () => !G.flag('ch0_lamp'),
        run: async (c) => {
          c.sfx('lantern');
          await c.say(null, 'The lamp by the door is cold. A lamp-tender\'s chore: strike the flint, coax the wick, keep the dark politely outside.');
          await me(c, 'Right. Flint... there. Come on, little flame.', 'normal');
          c.sfx('ok'); await c.wait(20);
          await nar(c, 'The wick catches. The lamp gives off a soft, honey-coloured glow. For one warm moment, the room feels bigger.');
          G.setFlag('ch0_lamp', true);
          c.toast('Lamp lit', 'good');
          await c.emote('player', 'heart');
        },
      },
      {
        id: 'wh_lamp_done', x: 3, y: 6, sprite: 'obj_lamp', trigger: 'action', solid: true,
        if: () => !!G.flag('ch0_lamp'),
        run: async (c) => { await nar(c, 'The lamp hums, bright and steady. Maren would be pleased. Maybe.'); },
      },
      {
        id: 'maren', x: 8, y: 6, sprite: 'maren', trigger: 'action', solid: true, dir: 'left',
        run: async (c) => {
          if (!G.flag('ch0_lamp')) {
            await who(c, 'Maren', 'maren', 'Lamp first, dreamer. The Hollow doesn\'t wait for breakfast, and neither do I.', 'angry');
            return;
          }
          await who(c, 'Maren', 'maren', 'Well. Look at that. Lit on the first try. Don\'t let it go to your head, it\'s only a lamp.', 'smirk');
          await who(c, 'Maren', 'maren', 'Eat your porridge. The square needs sweeping, the goats need stroking, and the Lampkeeper is in a mood.', 'normal');
          await c.emote('maren', 'music');
        },
      },
      {
        id: 'wh_bed', x: 1, y: 3, sprite: null, trigger: 'action', solid: false,
        run: async (c) => { await nar(c, 'Your bed. The quilt Maren knitted has a patch shaped like a fox, because she ran out of the right colour and refused to unpick it.'); },
      },
      {
        id: 'wh_hearth', x: 10, y: 3, sprite: null, trigger: 'action', solid: false,
        run: async (c) => { await nar(c, 'The hearth is lit low. Your palm tingles near it, the way it always does. You have never been warm to the touch. Only other people are.'); },
      },
    ]);

    // Opening morning — the first thing the player sees. Runs once.
    m.ev(H.auto('wh_open', async (c) => {
      G.setFlag('ch0_started', true);
      c.bgm('wickholm');
      c.titleCard('Prologue', 'Cold Ember', 130);
      await c.wait(60);
      await who(c, 'Maren', 'maren', 'Up, Rowan. The sun\'s a lantern this morning, so you\'ll be wanting a coat. Or a better temper.', 'smirk');
      await me(c, 'Five more minutes, Maren. The dream was almost finished.', 'worried');
      await who(c, 'Maren', 'maren', 'Dreams are for people who have chores done. Lamp, goats, and then you can dream about whatever you like.', 'normal');
      // Tone choice: defines Rowan's voice for the prologue (flag 'rowan_tone').
      const i = await c.choice(['Earnest: "Sorry, Maren. I\'ll be quick."', 'Teasing: "Who says the lamps need me? They\'re not even awake."', 'Flustered: "I was dreaming about a fox, I\'m not sure why."', 'Brave: "Then I\'ll be up before the sun. Watch me."'], { prompt: 'How do you answer?' });
      G.setFlag('rowan_tone', i);
      const lines = [
        ['Sorry, Maren. I\'ll be quick.', 'normal'],
        ['Maybe the lamps can get up on their own today.', 'smirk'],
        ['A fox? In a dream? That\'s the most Wickholm thing I\'ve ever heard.', 'blush'],
        ['Then I\'ll beat the sun to the square. Hold my porridge.', 'happy'],
      ][i];
      await me(c, lines[0], lines[1]);
      await who(c, 'Maren', 'maren', 'Good. Now go. And Rowan? I\'m proud of you. Don\'t tell the goats.', 'happy');
      await c.emote('maren', 'heart');
      G.setFlag('ch0_wake', true);
    }, { once: true }));
    return m.finish({ onEnter: null });
  }

  buildWickholmHouse();
