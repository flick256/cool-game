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

  // ============================================================ MAP 2 — Wickholm (mossy village)
  function buildWickholm() {
    const m = G.maps.build('wickholm', 40, 30, {
      name: 'Wickholm', bgm: 'wickholm', ground: 'v', spawn: { x: 10, y: 11, dir: 'down' },
    });
    // ---- ground: meadows, plaza, paths, ponds
    m.blob('ground', 33, 26, 6, 3, '.');
    m.blob('ground', 36, 4, 3, 2, '.');
    m.blob('ground', 6, 26, 4, 2, ',');
    m.rect('ground', 17, 12, 8, 7, '=');                          // cobble plaza
    m.path([[20, 18], [20, 29]], ':', 2);                         // south lane
    m.path([[24, 14], [39, 14]], ':', 2);                         // east road to Mossgrave
    m.path([[6, 10], [6, 14], [17, 14]], ':', 2);                 // house to plaza
    m.path([[28, 15], [28, 11]], ':', 1);                         // shop lane
    m.path([[32, 14], [32, 6], [34, 6]], ':', 1);                  // lane to the ruin (x=32 corridor)
    m.path([[15, 10], [15, 13]], ':', 1);                         // hall steps
    m.path([[11, 17], [11, 12], [9, 12]], ':', 2);                // garden lane
    m.blob('ground', 8, 21, 4.5, 3.5, 'w');                       // marsh rim
    m.pond(8, 21, 3, 2);
    m.pond(33, 21, 3, 2);
    m.blob('ground', 33, 21, 4.5, 3.5, 'w');
    m.pond(33, 21, 2, 1);
    m.pond(14, 28, 2, 1);

    // ---- buildings
    m.house(3, 5, 7, 5, { roof: '1', wall: 'X', doorAt: 3 });     // Rowan's house (door 6,9)
    m.house(13, 6, 6, 5, { roof: '5', wall: 'W', doorAt: 2 });    // Lamplighter's hall (door 15,10)
    m.house(25, 5, 7, 6, { roof: '2', wall: 'W', doorAt: 3 });    // Dorrin's goods shop (door 28,10)
    m.house(33, 8, 5, 4, { roof: '3', wall: 'X', doorAt: 2 });    // cottage (door 35,11)
    m.house(3, 17, 5, 4, { roof: '4', wall: 'X', doorAt: 2 });    // mossy cottage (door 5,20)
    // ruined Lampwright chapel with a secret alcove (opening at 34,5)
    m.box('objects', 31, 1, 7, 5, 'W');
    m.rect('ground', 32, 2, 5, 3, 't');
    m.set('objects', 34, 5, ' ');
    m.set('objects', 32, 1, 'r').set('objects', 36, 1, 'r');
    m.set('objects', 34, 2, 's');
    m.tiles('objects', [[32, 4], [33, 4]], 'r');
    m.set('objects', 36, 4, 'r');
    m.set('objects', 30, 4, 'r').set('objects', 30, 2, 'd');
    // village props
    m.set('objects', 20, 15, 'o');                               // fountain (plaza)
    m.set('objects', 16, 12, 'L').set('objects', 25, 12, 'L').set('objects', 16, 18, 'L').set('objects', 25, 18, 'L');
    m.set('objects', 21, 17, ' ');
    m.tiles('objects', [[19, 12], [22, 12]], 'H');               // benches
    m.tiles('objects', [[28, 19], [29, 19]], 'U');
    m.hline('objects', 37, 12, 4, 'x').vline('objects', 37, 12, 4, 'x');
    m.hline('objects', 8, 10, 3, 'x').vline('objects', 10, 6, 4, 'x');  // yard fences
    m.hline('objects', 25, 19, 5, 'x');
    m.tiles('objects', [[12, 9]], 'C');
    m.tiles('objects', [[36, 19], [37, 19]], 'U');
    m.tiles('objects', [[20, 25]], 'R');
    m.tiles('objects', [[27, 26]], 'R');
    // sprawling greenery
    m.scatter('objects', 'T', 14, { seed: 3, on: 'v.', avoid: [{ x: 0, y: 13, w: 40, h: 4 }, { x: 17, y: 11, w: 9, h: 9 }, { x: 18, y: 18, w: 5, h: 12 }, { x: 3, y: 4, w: 12, h: 7 }, { x: 24, y: 4, w: 10, h: 8 }, { x: 30, y: 0, w: 10, h: 7 }] });
    m.scatter('objects', 'N', 6, { seed: 9, on: 'v.', avoid: [{ x: 0, y: 13, w: 40, h: 4 }, { x: 16, y: 10, w: 12, h: 12 }] });
    m.scatter('objects', 'd', 4, { seed: 11, on: 'v.', avoid: [{ x: 0, y: 13, w: 40, h: 4 }, { x: 16, y: 10, w: 12, h: 12 }] });
    m.scatter('objects', 'B', 18, { seed: 12, on: 'v.', avoid: [{ x: 0, y: 13, w: 40, h: 4 }, { x: 17, y: 11, w: 9, h: 9 }, { x: 18, y: 18, w: 5, h: 12 }] });
    m.scatter('objects', 'G', 40, { seed: 14, on: 'v.,' });
    m.scatter('objects', 'F', 22, { seed: 15, on: 'v.,', avoid: [{ x: 0, y: 13, w: 40, h: 4 }] });
    m.scatter('objects', 'R', 6, { seed: 16, on: 'v.', avoid: [{ x: 0, y: 13, w: 40, h: 4 }] });
    m.scatter('objects', 'x', 0, { seed: 17 });
    // keep the ruin interior and its lane clear of random scatter
    m.rect('objects', 32, 2, 5, 3, ' '); m.set('objects', 34, 2, 's');
    m.rect('objects', 32, 6, 4, 1, ' '); m.set('objects', 34, 5, ' ');
    // mossy roof ivy shows as bushes along the walls
    m.tiles('objects', [[4, 9], [8, 9]], 'B');
    m.tiles('objects', [[13, 10], [18, 10]], 'B');
    m.set('objects', 0, 0, 'T');
    m.set('above', 17, 11, '*').set('above', 18, 11, '*').set('above', 19, 11, '*').set('above', 20, 11, '*');
    m.set('above', 21, 11, '*').set('above', 22, 11, '*').set('above', 23, 11, '*');

    // ---- portals & shop
    m.ev([
      H.transfer(6, 9, 'wickholm_house', 5, 7, 'up', { id: 'wh_home_door' }),
      H.transfer(39, 14, 'mossgrave_wood', 1, 15, 'right', { id: 'wh_to_wood', h: 2, if: () => !!G.flag('ch0_compass') }),
      H.shop('wh_shop', 27, 11, 'merchant', 'wickholm_shop', 'Potions, salves, and one suspicious jar of honey. Mind the honey.', 'Dorrin'),
      H.sign('wh_sign_square', 19, 19, 'WICKHOLM\nLanterns keep the Dark away.\n(The Dark has been away a long time. Nobody asks why.)'),
      H.sign('wh_sign_east', 36, 13, 'To Mossgrave Wood\nBeyond the wood: Brasshaven, if you have the nerve.'),
      H.sign('wh_sign_ruin', 35, 7, 'Keep out. Lampwright ruin. Unsafe. Unfinished. Also haunted, probably.'),
      H.sign('wh_sign_hall', 17, 10, 'Lamplighter Hall. The Lamplighter is out checking the Order\'s lamps. Again.'),
    ]);

    // ---- villagers (personality and rumour)
    m.ev([
      H.npc('wh_hobb', 18, 14, 'elder', [
        'Hm? Oh, it\'s you, Rowan. Back from the lamps already? You must be the only lad in Wickholm who likes getting up early.',
        'When I was your age the lamps were gold, and so was everything. My knees were warm, my tea was warm, the whole village glowed.',
        'Now I sit by the fire and I\'m still cold. Don\'t tell Maren I said that. She\'ll make me knit something.',
      ], { name: 'Elder Hobb' }),
      H.npc('wh_wellmaid', 22, 17, 'villager_f1', [
        'The Order\'s inspectors came through last week, measuring every lamp in the village. Writing it all in a little book.',
        'Nobody asked what the book was for. That\'s the trouble with lamps. They light up everything except their own purpose.',
      ]),
      H.npc('wh_tully', 30, 13, 'guard', [
        'Lamp inspection, citizen. Standard procedure. The Hearth Order thanks you for your warmth.',
        '...The Order takes a small share of every lamp. It is a blessing. Nobody is tired because of it. Nobody.',
        'Please keep moving along, Rowan of Wickholm. Your records are, ah, in order. Unusually in order.',
      ], { name: 'Inspector Tully' }),
      H.npc('wh_child2', 19, 22, 'child2', [
        'Hopscotch! I\'m winning! Pip cheats, though. He draws his squares bigger on the inside.',
        'Pip says the Hollow can\'t come into Wickholm because the moss keeps it out. I think Pip is a liar. I\'m just going to stand on his square.',
      ], { name: 'Mira' }),
      H.npc('wh_fisher', 12, 19, 'villager_f2', [
        'Still no fish in the marsh. Ever since the water turned bright, the fish just... look at you, and then leave.',
        'I\'m always tired, dear. Like my wick is a candle someone left by an open window. I rest a while and I\'m alright.',
        'Don\'t mind me, I\'ll be hunting for fish until the moss wins.',
      ], { name: 'Old Tansy' }),
      H.npc('wh_gardener', 30, 11, 'villager_m2', [
        'Keep the hedge trimmed or the moss gets ideas. The moss has been very ambitious this year.',
        'Don\'t go into the old Lampwright ruin, lad. The statue there has a bad attitude and a worse sense of humour.',
      ], { name: 'Dunstan' }),
      H.npc('wh_cat', 36, 16, 'cat', [
        'The cat looks at you with the calm, unbothered eyes of someone who has seen the Hollow Dusk come and go.',
      ], { name: null }),
      H.npc('wh_dog', 13, 24, 'dog', [
        'The dog wags its tail. It is clearly thinking about something important, like a stick.',
      ], { name: null }),
      H.npc('wh_lamp_girl', 27, 17, 'villager_f2', [
        'Oh! You\'re the one who keeps the lamps lit for Maren! My mum says you\'re too thin.',
        'Here, take a honey cake. It\'s not a bribe. I just think you look like you\'d like one.',
      ], { name: 'Bessa' }),
      H.npc('wh_ruin_hint', 33, 17, 'villager_m1', [
        'I saw something glowing in the ruin last night. A blue light, shaped like a face. It winked.',
        'Honestly, the statue winks more than the lamps do. Less cold, though. Hm.',
      ], { name: 'Pell' }),
    ]);

    // ---- Pip the Lamplighter kid (quest giver + Hollow battle scene)
    m.ev([{
      id: 'pip_w', x: 21, y: 17, sprite: 'pip', trigger: 'action', solid: true, dir: 'left', name: 'Pip',
      run: async (c) => {
        if (!G.flag('ch0_attack')) {
          if (!G.flag('ch0_pip_asked')) {
            G.setFlag('ch0_pip_asked', true);
            await who(c, 'Pip', 'pip', 'Rowan! Rowan! I dropped my lantern in the marsh! It has a cracked pane and a face painted on it. Please?', 'worried');
            await who(c, 'Pip', 'pip', 'Maren says I\'m not allowed near the water. But you\'re not my mum, so you can go!', 'smirk');
          } else {
            await who(c, 'Pip', 'pip', 'Did you find my lantern yet? It\'s in the reeds at the marsh, I\'m sure of it. Mostly sure.', 'normal');
          }
          return;
        }
        if (G.flag('ch0_pip_lantern') && !G.flag('ch0_pip_reward')) {
          G.setFlag('ch0_pip_reward', true);
          c.sfx('coin');
          await who(c, 'Pip', 'pip', 'My lantern! It\'s got the face! Oh, it\'s got a crack on the face now. Honest scar. Like a pirate.', 'happy');
          await who(c, 'Pip', 'pip', 'Here, you can have my spare potions. And the gold from under my bed. Don\'t tell Maren about the gold.', 'happy');
          c.addItem('potion', 3);
          await c.gold(40);
          await c.emote('pip_w', 'heart');
          return;
        }
        if (G.flag('ch0_kindled')) {
          await who(c, 'Pip', 'pip', 'My wick\'s still a little wobbly. But it\'s MINE. And it\'s warm! Warm like a biscuit!', 'happy');
          return;
        }
        await who(c, 'Pip', 'pip', 'I can see my wick if I look really hard. It\'s a little orange flame. Mostly it just goes flicker.', 'normal');
      },
    }]);
    // lost lantern, half sunk among the reeds
    m.ev([{
      id: 'wh_pip_lantern', x: 13, y: 20, sprite: null, trigger: 'action', solid: false,
      if: () => !!G.flag('ch0_pip_asked') && !G.flag('ch0_pip_lantern'),
      run: async (c) => {
        c.sfx('chest');
        await nar(c, 'Something glints in the reeds: a tiny brass lantern with a cracked pane and a crayon-drawn face. Pip\'s. It is still faintly warm.');
        G.setFlag('ch0_pip_lantern', true);
        c.toast('Found Pip\'s lantern', 'item');
      },
    }]);

    // ---- secret ruin & treasure
    m.ev(H.chest('wh_ruin', 32, 3, 'whetstone', 1));
    m.ev(H.chest('wh_garden', 36, 16, 'potion', 2));
    m.ev(H.chest('wh_marsh', 9, 17, { gold: 60 }));
    m.ev([{
      id: 'wh_statue', x: 34, y: 2, sprite: null, trigger: 'action', solid: false,
      run: async (c) => {
        if (G.flag('chest_wh_ruin')) { await nar(c, 'The statue has stopped winking. It looks a little smug about it.'); return; }
        await nar(c, 'The statue winks at you. Then it winks at the chest behind it. Then, very slowly, it nods toward the whetstone.');
      },
    }]);

    // ---- the Hollow attack (prologue tutorial battle) — runs once on first arrival from the house
    m.ev(H.auto('wh_attack', async (c) => {
      G.setFlag('ch0_attack', true);
      c.bgm('wickholm');
      c.sfx('encounter'); c.flash('#7d3cff', 24);
      await c.wait(20);
      c.camera(20, 16, 30);
      await nar(c, 'The square goes quiet. Every lamp in Wickholm flickers at once. Then the shadows start to walk out from under the hedges.');
      await who(c, 'Pip', 'pip', 'Rowan! The grey things are coming out of the walls!', 'worried');
      await me(c, 'Pip, get behind me! Maren! MAREN!', 'worried');
      await c.camReset(30);
      const r = await c.battle('tutorial', {
        canEscape: false, loseOk: true, bg: 'village', bgm: 'battle',
        intro: async (c) => {
          await c.hint('Hollow creatures have WEAK POINTS. Hit one with the right weapon or element and its SHIELD drops. Empty every shield and it BREAKS: it loses its next turn and takes extra damage.');
          await c.hint('Each party member gains a Boost Point (BP) every turn. Press R (Boost) before you pick an attack to spend BP on extra hits.');
        },
      });
      await c.wait(30);
      await who(c, 'Pip', 'pip', 'I can\'t feel my wick... it\'s going out, like a candle in the rain...', 'sad');
      await c.emote('pip_w', 'sweat');
      c.camera(21, 17, 30);
      await me(c, 'Hold on, Pip. Give me your hand. Come on, it can\'t be that easy to put you out.', 'worried');
      c.sfx('boost');
      c.flash('#ffd27a', 30); c.shake(3, 30);
      await c.wait(50);
      await who(c, 'Pip', 'pip', 'Oh! It\'s warm! It\'s like Maren\'s hearth! Rowan, you\'re doing it!', 'happy');
      c.sfx('shatter'); c.flash('#ffffff', 16); c.shake(4, 20);
      await nar(c, 'The nearest shadow recoils from the little gold flame as if it had touched a hot kettle. It shrieks, cracks, and folds away into the moss.');
      await c.camReset(40);
      G.setFlag('ch0_kindled', true);
      G.setFlag('ch0_hollow_win', r === 'win');
      await c.emote('pip_w', 'heart');
      await who(c, 'Maren', 'maren', 'Rowan! Pip! Are you two in one piece? Or several smaller pieces?', 'worried');
    }, { once: true }));

    // ---- Maren's farewell & the Ember Compass
    m.ev([{
      id: 'maren_w', x: 22, y: 15, sprite: 'maren', trigger: 'action', solid: true, dir: 'left', name: 'Maren',
      if: () => !!G.flag('ch0_kindled') && !G.flag('ch0_compass'),
      run: async (c) => {
        await who(c, 'Maren', 'maren', 'You kindled the boy\'s wick. With your bare hands. I\'m not sure whether to hug you or to skin you for not telling me first.', 'angry');
        await me(c, 'Hug, please. I think I\'m shaking a bit.', 'worried');
        await who(c, 'Maren', 'maren', 'Good. You\'ll be my little lamp for ever. Now listen, because I will say this once.', 'sad');
        await who(c, 'Maren', 'maren', 'The Hollow is coming up from the marsh because the Hearth Order\'s lamps are failing. Something big is wrong in Auren.', 'normal');
        await who(c, 'Maren', 'maren', 'There\'s a lampwright\'s workshop in Brasshaven. Find the workshop, find a woman named Claret Vane. Show her this. She\'ll know.', 'normal');
        await c.emote('maren_w', 'exclaim');
        c.sfx('jingle_item');
        c.addItem('ember_compass', 1);
        G.setFlag('ch0_compass', true);
        await who(c, 'Maren', 'maren', 'The compass glows toward the sea. Trust it, even when it is annoying. Which is always.', 'smirk');
        await c.emote('pip_w', 'heart');
        await who(c, 'Pip', 'pip', 'Come back and tell me about the ocean! And bring me a shell! A big one! And a hat!', 'happy');
        await me(c, 'I will, Pip. I promise. Maren, I\'ll make you proud.', 'happy');
        await who(c, 'Maren', 'maren', 'You already do, idiot. Now go before I start knitting you a scarf out of sentiment.', 'happy');
      },
    }]);

    return m.finish({ onEnter: null });
  }
  buildWickholm();
