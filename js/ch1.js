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

  // ============================================================ MAP 3 — Mossgrave Wood (field, boss_stag)
  function buildMossgrave() {
    const m = G.maps.build('mossgrave_wood', 45, 32, {
      name: 'Mossgrave Wood', bgm: 'forest', ground: '.', spawn: { x: 2, y: 15, dir: 'right' },
    });
    // ---- meadow variety
    m.blob('ground', 8, 24, 6, 4, 'v');
    m.blob('ground', 30, 24, 7, 4, 'v');
    m.blob('ground', 40, 20, 4, 3, 'v');
    m.blob('ground', 16, 26, 5, 3, ',');
    m.blob('ground', 24, 4, 4, 2, 'v');
    // ---- branching paths
    m.path([[0, 15], [20, 15]], ':', 2);                 // main trail east
    m.path([[12, 15], [12, 4], [31, 4]], ':', 2);        // north branch (to the bee tree)
    m.path([[24, 15], [24, 26], [43, 26]], ':', 2);      // south branch (to the sea road)
    m.path([[20, 15], [36, 15], [36, 14]], ':', 2);      // trail to the stag clearing
    m.path([[4, 14], [4, 16]], ':', 2);                  // the entrance nook
    // ---- ponds & stream dressing
    m.blob('ground', 17, 8, 4, 3, 'w');
    m.pond(17, 8, 3, 2);
    m.blob('ground', 30, 28, 3, 2, 'w');
    m.pond(30, 28, 2, 1);
    m.set('ground', 40, 28, 'w');
    // ---- the Hollow stag clearing (x35..43 y4..13) fenced by a ring of trees with a gap at 36,14
    m.rect('ground', 35, 4, 9, 10, 'h');
    m.blob('ground', 39, 8, 3, 2, 'y');
    m.box('objects', 34, 3, 11, 12, 'T');
    m.set('objects', 36, 14, ' ');
    m.tiles('objects', [[38, 4], [41, 4], [39, 13]], 'd');
    m.tiles('objects', [[35, 5], [43, 11]], 'F');
    // ---- scatter greenery (keep the lanes free)
    const lanes = [
      { x: 0, y: 12, w: 45, h: 7 }, { x: 10, y: 2, w: 4, h: 14 }, { x: 10, y: 2, w: 22, h: 4 },
      { x: 22, y: 17, w: 4, h: 11 }, { x: 22, y: 25, w: 24, h: 4 }, { x: 33, y: 2, w: 12, h: 14 },
      { x: 2, y: 3, w: 5, h: 12 }, { x: 14, y: 4, w: 6, h: 9 },
    ];
    m.scatter('objects', 'T', 46, { seed: 21, on: '.v,', avoid: lanes });
    m.scatter('objects', 'N', 22, { seed: 22, on: '.v,', avoid: lanes });
    m.scatter('objects', 'd', 6, { seed: 23, on: '.v,', avoid: lanes });
    m.scatter('objects', 'B', 28, { seed: 24, on: '.v,', avoid: lanes });
    m.scatter('objects', 'G', 60, { seed: 25, on: '.v,', avoid: lanes });
    m.scatter('objects', 'F', 26, { seed: 26, on: '.v,', avoid: lanes });
    m.scatter('objects', 'R', 10, { seed: 27, on: '.v', avoid: lanes });
    m.scatter('objects', 'r', 4, { seed: 28, on: '.v', avoid: lanes });
    // ---- secret glade (tall grass path hides it; a chest waits under the big tree)
    m.vline('objects', 4, 6, 9, 'G');
    m.rect('ground', 1, 2, 7, 4, 'v');
    m.tiles('objects', [[2, 3], [6, 2]], 'T');
    m.set('objects', 4, 4, ' ');
    // ---- entrance dressing
    m.tiles('objects', [[1, 13], [2, 18]], 'R');
    m.tiles('objects', [[3, 12]], 'T');
    // ---- forest rim (edges are dense woods)
    m.vline('objects', 0, 0, 12, 'T').vline('objects', 0, 17, 15, 'T');
    m.vline('objects', 44, 0, 12, 'N').vline('objects', 44, 17, 6, 'N');
    m.hline('objects', 0, 0, 45, 'T').hline('objects', 0, 31, 45, 'N');
    m.set('objects', 0, 14, ' ').set('objects', 0, 15, ' ').set('objects', 0, 16, ' ');
    m.set('objects', 44, 26, ' ').set('objects', 44, 27, ' ');
    m.set('objects', 1, 14, ' ');
    m.tiles('ground', [[0, 14], [0, 15], [0, 16]], ':');
    m.tiles('ground', [[44, 26], [44, 27]], ':');
    m.tiles('objects', [[12, 2], [14, 2]], 'T');
    // ---- a few above-layer canopies for depth
    m.tiles('above', [[1, 8], [8, 10], [28, 17]], '^');

    // ---- encounters
    m.encounters({ steps: [18, 34], troops: [{ id: 'wood_1', weight: 3 }, { id: 'wood_2', weight: 3 }, { id: 'wood_3', weight: 2 }, { id: 'wood_4', weight: 1 }] });

    // ---- portals, healing points, treasure
    m.ev([
      H.transfer(0, 14, 'wickholm', 37, 14, 'left', { id: 'wood_to_wh', h: 3 }),
      H.transfer(44, 26, 'brasshaven', undefined, undefined, 'left', { id: 'wood_to_brass', h: 2, if: () => !!G.flag('ch0_stag_done') }),
      H.save('wood_save_1', 3, 12),
      H.save('wood_save_2', 32, 12),
      H.sign('wood_sign_1', 2, 20, 'MOSSGRAVE WOOD\nThe paths branch here. Only one of them goes home.'),
      H.sign('wood_sign_2', 20, 17, 'Bee tree (north). Sweet. Dangerous. Mostly sweet.'),
    ]);
    m.ev(H.chest('wood_honey', 30, 3, 'wild_honey', 1));
    m.ev(H.chest('wood_potion', 19, 17, 'hi_potion', 2));
    m.ev(H.chest('wood_gold', 40, 25, { gold: 80 }));
    m.ev(H.chest('wood_glade', 4, 4, 'moonpetal', 1));

    // ---- wood folk
    m.ev([
      H.npc('wood_wend', 8, 19, 'villager_m2', [
        'Oh! A lamp-kid on the road! The wood\'s been asking for one. Politely, mind. In a whisper, through the ferns.',
        'The stag up at the clearing used to guard us. Now it just stands there, weeping light the colour of old bruises.',
        'If you go up there, be gentle. It\'s not the stag\'s fault it forgot how to be warm.',
      ], { name: 'Wend the Woodcutter' }),
      H.npc('wood_hollow_child', 25, 9, 'hollow', [
        'The shape of a child, blank as paper, watches you. It holds out a hand, then drops it. "...light?" it whispers.',
      ], { name: null }),
      H.npc('wood_fawn', 14, 17, 'dog', [
        'A small fawn stands perfectly still, looking at you with the earnest respect of a creature who does not own a map.',
      ], { name: null }),
      H.npc('wood_bee', 29, 2, 'villager_f2', [
        'The bees know you\'re not dangerous. They keep looking at your coat and then deciding not to sting you. It\'s very polite.',
      ], { name: 'Bee-keeper Lenna' }),
    ]);

    // ---- the boss: the Hollowed guardian (sad, not evil)
    m.ev([{
      id: 'stag_boss', x: 39, y: 8, sprite: 'hollow', trigger: 'action', solid: true, dir: 'down', name: 'Hollow Stag',
      if: () => !G.flag('ch0_stag_done'),
      run: async (c) => {
        await nar(c, 'A great stag stands at the centre of the clearing. Violet cracks run through its antlers like broken glass. It does not charge. It only looks at you with wet, tired eyes.');
        await who(c, 'Hollow Stag', 'hollow', 'You... carry a light. I have not seen one for so long. Does it hurt, to be warm?', 'sad');
        await me(c, 'It hurts a little, when you share it. It\'s also the best thing I know. I\'m sorry you forgot.', 'worried');
        await who(c, 'Hollow Stag', 'hollow', 'I guarded this wood. The lamps asked me to stop the blight... and I did, and I forgot who I was guarding.', 'sad');
        const r = await c.battle('boss_stag', {
          canEscape: false, loseOk: true, bg: 'forest', bgm: 'boss',
          intro: async (c) => {
            await c.hint('Bosses cannot be escaped from. Find WEAK POINTS: a broken shield means a turn lost for the stag, and a big hit while it is BROKEN.');
          },
          onHalf: async (c) => {
            c.flash('#f4c26a', 30); c.shake(3, 30);
            await who(c, 'Hollow Stag', 'hollow', 'Stop. Please. That light... it is in my chest too. Let it out. I have been holding it in for years.', 'sad');
          },
          outro: async (c) => {
            await nar(c, 'The stag bows its head. The violet cracks fade like frost in a warm room. A single antler, glowing soft gold, drops into the moss.');
          },
        });
        if (r === 'win') {
          G.setFlag('ch0_stag_done', true);
          c.sfx('victory'); c.flash('#ffd27a', 40); await c.wait(30);
          await who(c, 'Hollow Stag', 'hollow', 'Walk south-east. Follow the compass. It will guide you to the workshop of the Vane.', 'normal');
          await nar(c, 'In your pocket, the Ember Compass warms. Its needle swings past the trees and points straight toward the sea. It is glowing like it has been waiting for you.');
          c.sfx('lantern');
          c.toast('The Ember Compass glows toward the sea', 'good');
        } else {
          await nar(c, 'The stag\'s light is too bright for you. You stumble back to the path. It watches you go, patient and sad, and lets you live.');
        }
      },
    }]);

    m.ev(H.auto('wood_intro', async (c) => {
      c.titleCard('Mossgrave Wood', 'Where the trees keep secrets', 120);
      await c.wait(30);
    }, { once: true }));

    return m.finish({ onEnter: null });
  }
  buildMossgrave();

  // ============================================================ MAP 4 — Brasshaven (steampunk harbor city)
  function buildBrasshaven() {
    const m = G.maps.build('brasshaven', 44, 34, {
      name: 'Brasshaven', bgm: 'brasshaven', ground: '=', spawn: { x: 21, y: 21, dir: 'up' },
    });
    // ---- harbour: water to the south, pier, quay of cobble and grating
    m.rect('ground', 0, 26, 44, 8, '~');
    m.rect('ground', 0, 20, 44, 6, '=');
    m.rect('ground', 0, 20, 9, 6, 'm');                        // grating by the docks
    m.rect('ground', 35, 20, 9, 6, 'm');
    m.rect('ground', 19, 24, 4, 4, 'b');                       // pier into the water
    m.rect('ground', 2, 12, 36, 3, '=');                       // east-west street
    m.rect('ground', 19, 5, 4, 16, '=');                       // main avenue
    m.rect('ground', 3, 1, 3, 5, 'm');                         // cistern grating (secret)
    m.set('ground', 5, 6, 'm');
    m.blob('ground', 39, 4, 3, 2, 'm');
    // ---- buildings
    m.house(6, 4, 8, 6, { roof: '6', wall: '7', doorAt: 3 });            // The Brass Kettle inn (door 9,9)
    m.house(28, 5, 8, 7, { roof: '6', wall: '7', doorAt: 3 });           // Claret's workshop (door 31,11)
    m.house(9, 15, 6, 5, { roof: '4', wall: '7', doorAt: 2 });           // Sprocket & Sons (door 11,19)
    m.house(30, 15, 6, 5, { roof: '6', wall: '7', doorAt: 2 });          // Hobbs' smithy (door 32,19)
    m.house(14, 6, 6, 5, { roof: '5', wall: '7', doorAt: 2 });           // Pipe & Pint tavern (door 16,10)
    m.house(2, 6, 6, 5, { roof: '6', wall: '7', doorAt: 3 });            // Gerrit's workshop (door 5,10)
    m.house(38, 2, 4, 9, { roof: '6', wall: '7', doorAt: 1 });           // clock tower (door 39,10)
    m.house(19, 1, 6, 4, { roof: '2', wall: 'W', doorAt: 2 });           // Order lamp office (door 21,4)
    // ---- steam-punk dressing
    m.vline('objects', 27, 5, 7, 'P');                         // pipes down the workshop flank
    m.vline('objects', 15, 15, 5, 'P');
    m.hline('objects', 36, 12, 2, 'P');
    m.tiles('objects', [[26, 8], [26, 9]], 'J');              // boilers
    m.tiles('objects', [[1, 16], [1, 17]], 'J');
    m.tiles('objects', [[24, 17], [25, 17]], 'M');            // machine
    m.tiles('objects', [[36, 17], [37, 17]], 'e');            // gears
    m.tiles('objects', [[40, 13], [41, 15]], 'e');
    m.tiles('objects', [[12, 21], [13, 21]], 'C');            // crates on the quay
    m.tiles('objects', [[38, 22], [39, 22]], 'U');
    m.tiles('objects', [[6, 22], [7, 23]], 'C');
    m.tiles('objects', [[14, 13], [14, 14]], 'U');
    m.tiles('objects', [[44 - 1, 19]], 'R');
    m.set('objects', 17, 5, 'L').set('objects', 24, 5, 'L').set('objects', 18, 11, 'L').set('objects', 25, 11, 'L');
    m.set('objects', 35, 11, 'L').set('objects', 12, 12, 'L');
    m.tiles('objects', [[33, 25]], 'R');
    m.tiles('objects', [[22, 14]], 'H');
    m.tiles('objects', [[26, 19]], 'U');
    m.tiles('above', [[20, 3], [21, 3]], '*');
    m.hline('above', 9, 11, 3, '#');
    m.hline('above', 28, 11, 4, '*');
    // ---- Order gate & patrol route
    m.set('objects', 20, 22, ' ');
    m.set('above', 21, 21, '@');
    // ---- portals & points of interest
    m.ev([
      H.transfer(9, 9, 'brasshaven_inn', 6, 8, 'up', { id: 'bh_inn_door' }),
      H.transfer(31, 11, 'brasshaven_workshop', 6, 9, 'up', { id: 'bh_workshop_door' }),
      H.shipPad(21, 20, { id: 'bh_ship_pad' }),
      H.shop('bh_shop', 10, 20, 'merchant', 'brasshaven_shop', 'Gears, grease, and sandwiches you do not want to ask about. Five coins a cog.', 'Mabel Sprocket'),
      H.shop('bh_smith', 33, 20, 'engineer', 'brasshaven_smith', 'Swords, spanners and strong opinions. Nothing comes without a warranty and a sigh.', 'Hobbs Anvilhand'),
      H.sign('bh_sign_main', 22, 11, 'BRASSHAVEN\nSteam powers the city. The city pays the Order. The Order thanks the city.'),
      H.sign('bh_sign_quay', 18, 19, 'THE QUAY\nNo loitering. No brooding. No wickless youths.'),
      H.sign('bh_sign_clock', 37, 11, 'Clock Tower. Its face has not told the right time since the lamps were installed.'),
    ]);
    m.ev(H.chest('bh_quay', 40, 22, { gold: 90 }));
    m.ev(H.chest('bh_cistern', 4, 3, 'potion', 2));
    m.ev(H.chest('bh_secret', 41, 16, 'ribbon', 1));

    // ---- the Order (patrolling guards, wickless-youth hunt)
    m.ev([
      H.npc('bh_guard_gate', 21, 5, 'guard', [
        "Halt, citizen. Papers? Lamp papers. Everybody needs their lamp papers.",
        "We are looking for a youth with no wick. Pale, scruffy, probably lying about it. Report sightings to the Order.",
        "The Order thanks you for your warmth. Please keep it at a respectable temperature.",
      ], { name: 'Order Guard Hask', move: 'still' }),
      H.npc('bh_guard_patrol', 26, 13, 'guard', [
        "Nothing to see here. Keep moving. Stay warm, stay quiet, stay on the cobbles.",
        "Hm, you there. Your coat is very... red. Is that a Hollow thing? No? Good. Carry on, then.",
      ], { name: 'Order Guard Pell', move: 'wander' }),
      H.npc('bh_guard_quay', 30, 22, 'guard', [
        "Quay's clear, sir. No dock smugglers today. The smugglers went to a better tavern. Lucky them.",
      ], { name: 'Order Guard Dunk', move: 'wander' }),
    ]);

    // ---- citizens (tired, cold, brass-tongued)
    m.ev([
      H.npc('bh_joss', 19, 22, 'sailor', [
        "Old Joss, dock foreman. Don't mind the spit. I've been spitting at the sea since before your mum had teeth.",
        "The Marigold came in on a fog bank last spring with her belly full of holes. Claret's been patching her since.",
        "Not a soul in Brasshaven feels truly warm, you know. The lamps take their share. They say it's for the greater good.",
      ], { name: 'Joss' }),
      H.npc('bh_tilly', 23, 15, 'child1', [
        "My dad says the boilers keep us warm. I don't feel warm. I feel like a cold potato in a warm pan.",
        "Don't tell Mum I said that. She's tired already. Everybody's tired.",
      ], { name: 'Tilly' }),
      H.npc('bh_nessa', 34, 11, 'child2', [
        "Clockwork mouse, look! He squeaks when the gears are warm. He's been silent for three days. I think he's sad.",
      ], { name: 'Nessa' }),
      H.npc('bh_tired', 13, 18, 'villager_f1', [
        "I work the night shift at the boilers. The lamps say I'm the lucky one because I'm still warm. I'm not, though. I'm just awake.",
      ], { name: 'Dorrit' }),
      H.npc('bh_tobin', 25, 21, 'villager_m1', [
        "A stoker has warm hands and a cold heart, lad. That's the trade. The boiler eats the coal, the coal eats the lamp, the lamp eats the rest.",
        "Hm. That came out more poetic than I meant. I'm going to have a pint.",
      ], { name: 'Tobin the Stoker' }),
      H.npc('bh_lady', 38, 19, 'noble', [
        "I had my roof copper-plated this spring. Quite the fashion. It has done nothing for my moods, but it does match my gloves.",
      ], { name: 'Lady Pemberly' }),
      H.npc('bh_cat', 8, 14, 'cat', [
        "The cat is perched on a warm pipe, judging you for being out of breath. Sensible creature.",
      ], { name: null }),
      H.npc('bh_dog', 18, 25, 'dog', [
        "A stray dog wags at you and then gently sits on your foot. You feel very slightly more loved.",
      ], { name: null }),
      H.npc('bh_pinta', 17, 9, 'villager_f2', [
        "Ever been in the Pipe & Pint? No? Well, they've got a bard in there who sings the Hearth Order's anthem. Very dull. Gets the bitter ones in trouble.",
      ], { name: 'Pinta' }),
    ]);

    // ---- Gerrit the gear-collector (sidequest: wild honey -> brass cog for Claret)
    m.ev([{
      id: 'bh_gerrit', x: 5, y: 11, sprite: 'engineer', trigger: 'action', solid: true, dir: 'up', name: 'Gerrit Cogsworth',
      run: async (c) => {
        if (G.flag('ch1_gerrit_done')) {
          await who(c, 'Gerrit Cogsworth', 'unknown', "Oh, the honey was marvellous! My bee-powered gearbox has never been so sweet. And the cog is a beauty.", 'happy');
          return;
        }
        if (!G.flag('ch1_gerrit_asked')) {
          G.setFlag('ch1_gerrit_asked', true);
          await who(c, 'Gerrit Cogsworth', 'unknown', "Ah! A visitor who isn't a tax collector! I collect brass cogs. Every one is a piece of a clock that tells the time for everyone's wick.", 'happy');
          await who(c, 'Gerrit Cogsworth', 'unknown', "Bring me a jar of wild honey from the Mossgrave bee tree. My gearbox runs on it. Thick, sticky, honest. Bring it and I'll give you a cog.", 'normal');
          await me(c, "A cog for honey? That's a fair trade.", 'smirk');
          return;
        }
        if (c.hasItem && (await c.hasItem('wild_honey')) > 0) {
          await c.removeItem('wild_honey', 1);
          G.setFlag('ch1_gerrit_done', true);
          await who(c, 'Gerrit Cogsworth', 'unknown', "WILD HONEY! Oh, you beauty. Here, take a brass cog for your girl. Miss Vane prizes them, I hear. She'll like it, if she doesn't throw it.", 'happy');
          c.sfx('coin');
          c.addItem('brass_cog', 1);
          return;
        }
        await who(c, 'Gerrit Cogsworth', 'unknown', "Still hunting for wild honey? The bee tree in Mossgrave is grumpy, but the honey is worth the stings.", 'normal');
      },
    }]);

    // ---- hidden secret: the grating in the cistern alley reveals a drain with a chest (secret)
    m.ev([{
      id: 'bh_grate', x: 5, y: 7, sprite: null, trigger: 'action', solid: false,
      run: async (c) => { await nar(c, 'A rusty grate, warm under your palm. Something below is humming a little tune, out of time with the city.'); },
    }]);

    // ---- arrival: the compass guides you to the workshop, the city notices you
    m.ev(H.auto('bh_arrive', async (c) => {
      G.setFlag('ch1_started', true);
      c.chapter(1);
      c.bgm('brasshaven');
      c.titleCard('Brasshaven', 'Steam, brass & cold coins', 130);
      await c.wait(40);
      await nar(c, 'The city is all copper roofs and steam. Boilers hiss in every alley. Warm air rolls off the water, and somehow it still feels cold.');
      await me(c, 'Maren said the compass would lead me to a workshop. It\'s pointing... up the avenue, toward the big sign with the wheel.', 'normal');
      c.sfx('footstep_grass');
      await c.wait(30);
      await nar(c, 'Two Order guards at the gate look up from their clipboards. One of them has the tired eyes of someone who did not ask to be here.');
      await who(c, 'Order Guard Hask', 'unknown', 'Lamp papers, citizen. Oh. No, wait. You don\'t look like a lamp person.', 'normal');
      await me(c, 'I\'m a lamp person! Look, here\'s my lamp. Lit. Very bright.', 'worried');
      await nar(c, 'Hask squints at your face, then at the compass. The compass hums. Hask shudders as if a fly crawled up their sleeve, and waves you on.');
      await who(c, 'Order Guard Hask', 'unknown', 'Move along. Don\'t hang about the gate, it makes the Order nervous. Everything makes the Order nervous.', 'normal');
    }, { once: true }));

    return m.finish({ onEnter: null });
  }
  buildBrasshaven();
