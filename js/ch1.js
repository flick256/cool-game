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
    m.tiles('objects', [[9, 7], [10, 7]], 'U');                    // barrels
    m.set('objects', 3, 6, 'L');                                   // the chore lamp
    m.set('objects', 6, 1, 'V');                                   // Maren's quilt banner over the back wall
    m.set('objects', 1, 6, 'S');                                   // a wardrobe of spare wool
    m.set('objects', 9, 5, 'F');                                   // a pot of flowers by the window
    m.tiles('above', [[5, 2], [8, 2]], '*');                       // the lantern string over the room
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
    // ---- ground: an overgrown moss village. Cobble square with a golden-glow fountain court, dirt lanes that join every door
    //      to the square, grass lawns, a marsh with a dock, and the stone floor of the ruins.
    m.blob('ground', 33, 26, 6, 3, '.');                          // meadow south-east
    m.blob('ground', 36, 4, 3, 2, '.');                           // grassy patch north-east
    m.blob('ground', 6, 26, 4, 2, ',');                           // flowery lawn south-west
    m.blob('ground', 26, 2, 3, 2, '.');                           // the graveyard lawn
    m.rect('ground', 17, 12, 8, 7, '=');                          // cobble square
    m.rect('ground', 19, 14, 3, 3, 'l');                          // golden glow round the fountain
    m.rect('ground', 9, 1, 6, 4, 't');                            // the broken cottage's floor
    m.rect('ground', 32, 2, 5, 3, 't');                           // the chapel's floor
    m.path([[20, 18], [20, 29]], ':', 2);                         // south lane
    m.path([[24, 14], [39, 14]], ':', 2);                         // east road to Mossgrave
    m.path([[6, 10], [6, 14], [17, 14]], ':', 2);                 // Rowan's house to the square
    m.path([[28, 15], [28, 11]], ':', 1);                         // shop lane
    m.path([[32, 14], [32, 6], [34, 6]], ':', 1);                 // lane to the ruin
    m.path([[15, 10], [15, 13]], ':', 1);                         // hall steps
    m.path([[11, 17], [11, 12], [9, 12]], ':', 2);                // garden lane
    m.path([[35, 12], [35, 13]], ':', 1);                         // cottage door to the road
    m.path([[5, 21], [5, 22]], ':', 1);                           // mossy cottage door
    // ---- water: the marsh (with a dock for the fisher), the east pond and a small south pond
    m.blob('ground', 8, 21, 4.5, 3.5, 'w');
    m.pond(8, 21, 3, 2);
    m.set('ground', 5, 21, 'w').set('ground', 5, 22, 'w');        // shallows at the mossy cottage's step
    m.rect('ground', 10, 21, 3, 1, 'b');                          // fisher's dock
    m.blob('ground', 33, 21, 4.5, 3.5, 'w');
    m.pond(33, 21, 3, 2);
    m.pond(14, 28, 2, 1);

    // ---- buildings: tidy houses beside a broken-down one. Doors keep their event coordinates.
    m.house(3, 5, 7, 5, { roof: '1', wall: 'X', doorAt: 3 });     // Rowan's house, mossy green roof (door 6,9)
    m.house(13, 6, 6, 5, { roof: '5', wall: 'W', doorAt: 2 });    // Lamplighter's hall (door 15,10)
    m.house(25, 5, 7, 6, { roof: '2', wall: 'W', doorAt: 3 });    // Dorrin's goods shop (door 28,10)
    m.house(33, 8, 5, 4, { roof: '3', wall: 'X', doorAt: 2 });    // cottage (door 35,11)
    m.house(3, 17, 5, 4, { roof: '4', wall: 'X', doorAt: 2 });    // mossy cottage (door 5,20)
    // broken-down cottage (north-west): planks without a roof, rubble, a dead tree growing inside
    m.hline('objects', 9, 1, 6, 'X').hline('objects', 9, 4, 6, 'X');
    m.vline('objects', 9, 1, 4, 'X').vline('objects', 14, 1, 4, 'X');
    m.set('objects', 14, 2, ' ');                                 // a plank has fallen out
    m.set('objects', 11, 4, ' ').set('objects', 12, 4, ' ');     // the doorway
    m.tiles('objects', [[10, 2], [13, 3], [12, 5]], 'r');
    m.set('objects', 12, 2, 'd');
    m.set('objects', 10, 3, 'B');
    // ruined Lampwright chapel with a secret alcove (opening at 34,5)
    m.box('objects', 31, 1, 7, 5, 'W');
    m.set('objects', 34, 5, ' ');
    m.set('objects', 32, 1, 'r').set('objects', 36, 1, 'r');     // broken top wall
    m.tiles('objects', [[32, 4], [33, 4]], 'r');
    m.set('objects', 36, 4, 'r');
    m.set('objects', 34, 2, 's');
    m.set('objects', 30, 4, 'r').set('objects', 30, 2, 'd');
    m.tiles('objects', [[26, 1], [28, 1], [27, 3], [29, 3]], '+'); // the graveyard lawn
    // Rowan's yard, the hall corners and the cottage garden
    m.hline('objects', 8, 10, 3, 'x').vline('objects', 10, 6, 4, 'x');
    m.tiles('objects', [[4, 9], [8, 9]], 'B');                    // ivy growing over the wall
    m.tiles('objects', [[13, 10], [18, 10]], 'B');
    m.tiles('objects', [[13, 11], [14, 11]], 'F');
    m.tiles('objects', [[33, 12], [34, 12]], 'F');
    m.tiles('objects', [[38, 9], [38, 10]], 'B');
    m.vline('objects', 2, 17, 3, 'x');                            // broken fence round the mossy cottage
    m.set('objects', 2, 20, 'B');
    m.tiles('objects', [[12, 9]], 'C');                           // crate by the hall
    m.tiles('objects', [[29, 12], [30, 12]], 'U');                // barrels by the shop lane

    // ---- the square: a fountain in the glow, lamps, benches, a flower bed on each corner
    m.set('objects', 20, 15, 'o');
    m.set('objects', 16, 12, 'L').set('objects', 25, 12, 'L').set('objects', 16, 18, 'L').set('objects', 25, 18, 'L');
    m.tiles('objects', [[19, 12], [22, 12]], 'H');               // benches
    m.tiles('objects', [[17, 18], [24, 13]], 'F');               // flower beds on the square's corners
    m.set('objects', 4, 11, 'L');                                 // a lamp by Rowan's door
    m.set('objects', 30, 16, 'L');                                // a lamp on the east road

    // ---- the east road and the Mossgrave gate: the road runs clear to the gate
    m.tiles('objects', [[37, 12], [38, 13]], 'r');                // rubble by the road
    m.set('objects', 37, 13, 'R');
    m.tiles('objects', [[34, 16], [34, 17]], 'F');                // flowers by the ruin-hint's garden
    m.tiles('objects', [[37, 15], [37, 16]], 'B');                // bushes round the garden chest (36,16)
    m.vline('objects', 39, 0, 13, 'T');                           // a wood along the east edge (gate gap at 14-15)
    m.vline('objects', 39, 16, 14, 'N');

    // ---- the south: a lane of rocks, the marsh reeds, a garden at the mossy cottage
    m.tiles('objects', [[18, 26], [23, 26]], 'R');                // roadside rocks
    m.tiles('objects', [[1, 21]], 'd');                           // dead tree on the marsh edge
    m.tiles('objects', [[13, 19], [14, 20], [13, 21]], 'G');      // reeds by the pond
    m.tiles('objects', [[9, 18], [12, 22]], 'G');
    m.tiles('objects', [[7, 16], [8, 17]], 'G');
    m.tiles('objects', [[15, 24], [18, 22]], 'R');
    m.tiles('objects', [[30, 21], [31, 22]], 'R');                // rocks by the east pond
    m.set('objects', 24, 23, 'o');                                // a village well
    m.tiles('objects', [[25, 22], [26, 22], [25, 23]], 'C');      // a cart's load of crates
    m.set('objects', 23, 24, 'U');
    m.tiles('objects', [[28, 19], [29, 20], [27, 24], [29, 26]], 'F');   // wild flowers in the meadow

    // ---- the edges: woods with gaps, so nothing just stops
    m.tiles('objects', [[0, 0], [2, 0], [5, 0], [6, 0], [11, 0], [16, 0], [17, 0], [22, 0], [31, 0], [36, 0]], 'T');
    m.tiles('objects', [[0, 6], [0, 7], [0, 8], [0, 9], [0, 11], [0, 12], [0, 13], [0, 16]], 'N');
    m.tiles('objects', [[1, 8], [1, 18], [0, 22], [0, 24]], 'T');
    m.hline('objects', 0, 29, 40, 'N');
    m.set('objects', 20, 29, ' ').set('objects', 21, 29, ' ');   // the south lane runs out to the edge
    m.tiles('objects', [[17, 29], [19, 29]], 'T');
    m.set('objects', 0, 0, 'T');
    // ---- stray scrub and flowers for life (kept off every event and approach)
    const keep = [
      { x: 0, y: 11, w: 40, h: 4 }, { x: 16, y: 10, w: 13, h: 10 }, { x: 19, y: 18, w: 3, h: 12 },
      { x: 2, y: 3, w: 12, h: 7 }, { x: 24, y: 4, w: 10, h: 8 }, { x: 31, y: 0, w: 8, h: 6 },
      { x: 32, y: 6, w: 7, h: 9 }, { x: 0, y: 17, w: 14, h: 6 }, { x: 33, y: 16, w: 7, h: 4 },
    ];
    m.scatter('objects', 'G', 42, { seed: 14, on: 'v.,', avoid: keep });
    m.scatter('objects', 'F', 16, { seed: 15, on: 'v.,', avoid: keep });
    m.scatter('objects', 'B', 10, { seed: 12, on: 'v.', avoid: keep });
    m.scatter('objects', 'T', 8, { seed: 3, on: 'v.', avoid: keep });
    m.scatter('objects', 'd', 2, { seed: 11, on: 'v.', avoid: keep });
    // keep every lane and approach clear again after the scatter
    m.tiles('objects', [[11, 4], [12, 4]], ' ');
    m.tiles('objects', [[20, 18], [20, 19], [21, 18], [21, 19]], ' ');
    m.set('objects', 11, 11, ' ');
    m.tiles('above', [[17, 11], [18, 11], [19, 11], [20, 11], [21, 11], [22, 11], [23, 11]], '*');
    // ---- portals & shop
    m.ev([
      H.transfer(6, 9, 'wickholm_house', 5, 7, 'up', { id: 'wh_home_door' }),
      H.shipPad(11, 11, { id: 'wh_ship_pad' }),
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

    // ---- a hunters' camp off the south road (a fire, crates, a barrel) and a worn statue off the north path
    m.set('objects', 30, 23, 'I');
    m.tiles('objects', [[33, 22], [34, 22], [33, 23]], 'C');
    m.set('objects', 34, 24, 'U');
    m.set('objects', 27, 7, 's');

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
        await who(c, 'Hollow Stag', 'unknown', 'You... carry a light. I have not seen one for so long. Does it hurt, to be warm?', 'sad');
        await me(c, 'It hurts a little, when you share it. It\'s also the best thing I know. I\'m sorry you forgot.', 'worried');
        await who(c, 'Hollow Stag', 'unknown', 'I guarded this wood. The lamps asked me to stop the blight... and I did, and I forgot who I was guarding.', 'sad');
        const r = await c.battle('boss_stag', {
          canEscape: false, loseOk: true, bg: 'forest', bgm: 'boss',
          intro: async (c) => {
            await c.hint('Bosses cannot be escaped from. Find WEAK POINTS: a broken shield means a turn lost for the stag, and a big hit while it is BROKEN.');
          },
          onHalf: async (c) => {
            c.flash('#f4c26a', 30); c.shake(3, 30);
            await who(c, 'Hollow Stag', 'unknown', 'Stop. Please. That light... it is in my chest too. Let it out. I have been holding it in for years.', 'sad');
          },
          outro: async (c) => {
            await nar(c, 'The stag bows its head. The violet cracks fade like frost in a warm room. A single antler, glowing soft gold, drops into the moss.');
          },
        });
        if (r === 'win') {
          G.setFlag('ch0_stag_done', true);
          c.sfx('levelup'); c.flash('#ffd27a', 40); await c.wait(30);
          await who(c, 'Hollow Stag', 'unknown', 'Walk south-east. Follow the compass. It will guide you to the workshop of the Vane.', 'normal');
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
    // ---- harbour: water to the south, quay of cobble and iron grating, piers into the bay
    m.rect('ground', 0, 26, 44, 8, '~');                       // harbour water
    m.rect('ground', 0, 20, 44, 6, '=');                       // quay & cobbles
    m.rect('ground', 0, 20, 9, 6, 'm');                        // iron-grate docks (west)
    m.rect('ground', 35, 20, 9, 6, 'm');                       // iron-grate docks (east)
    m.rect('ground', 19, 24, 4, 4, 'b');                       // main pier into the bay
    m.rect('ground', 37, 25, 3, 3, 'b');                       // little east jetty
    m.rect('ground', 2, 12, 36, 3, '=');                       // east-west street
    m.rect('ground', 9, 13, 29, 1, 'm');                       // steam-vent grating down the middle of the street
    m.rect('ground', 1, 11, 7, 4, ':');                        // the dirt lane of the lower quarter (west)
    m.rect('ground', 19, 5, 4, 16, '=');                       // main avenue
    // ---- north market: a grate square with a cobble cross and a glowing fountain court
    m.rect('ground', 6, 1, 13, 3, 'm');
    m.vline('ground', 9, 1, 3, '=').vline('ground', 13, 1, 3, '=').vline('ground', 17, 1, 3, '=');
    m.rect('ground', 11, 1, 3, 3, 'l');
    m.rect('ground', 14, 4, 5, 2, '=');                        // alley down to the avenue
    // ---- cistern grating (secret drain) on the west
    m.rect('ground', 3, 1, 3, 5, 'm');
    // ---- boiler court (between Sprocket and the avenue)
    m.rect('ground', 16, 15, 3, 5, 'm');
    // ---- central plaza: stone flags round a fountain
    m.rect('ground', 23, 15, 6, 5, 't');

    // ---- buildings (copper roofs, slate, terracotta, yellow). Doors keep their event coordinates.
    m.house(6, 4, 8, 6, { roof: '6', wall: '7', doorAt: 3 });            // The Brass Kettle inn (door 9,9)
    m.house(28, 5, 8, 7, { roof: '6', wall: '7', doorAt: 3 });           // Claret's workshop (door 31,11)
    m.house(9, 15, 6, 5, { roof: '4', wall: '7', doorAt: 2 });           // Sprocket & Sons (door 11,19)
    m.house(30, 15, 6, 5, { roof: '3', wall: '7', doorAt: 2 });          // Hobbs' smithy (door 32,19)
    m.house(14, 6, 6, 5, { roof: '5', wall: '7', doorAt: 2 });           // Pipe & Pint tavern (door 16,10)
    m.house(2, 6, 4, 5, { roof: '3', wall: '7', doorAt: 1 });            // Gerrit's workshop (door 3,10)
    m.house(38, 2, 4, 9, { roof: '6', wall: '7', doorAt: 1 });           // clock tower (door 39,10)
    m.house(19, 1, 6, 4, { roof: '2', wall: 'W', doorAt: 2 });           // Order lamp office (door 21,4)

    // ---- perimeter: riveted iron wall round the city, pipes running up the walls
    m.hline('objects', 0, 0, 44, '7');                         // north wall
    m.vline('objects', 0, 0, 20, '7');                         // west wall
    m.vline('objects', 43, 0, 20, '7');                        // east wall
    m.tiles('objects', [[2, 0], [7, 0], [18, 0], [28, 0], [38, 0]], 'P');

    // ---- chimneys (pipes on the roofs) and roof-side pipes
    m.tiles('objects', [[8, 4], [12, 4]], 'P');                // inn
    m.tiles('objects', [[30, 5], [34, 5]], 'P');               // workshop
    m.tiles('objects', [[17, 6]], 'P');                        // tavern
    m.tiles('objects', [[12, 15], [33, 15]], 'P');             // Sprocket & smithy
    m.tiles('objects', [[23, 1]], 'P');                        // lamp office
    m.tiles('objects', [[40, 2]], 'P');                        // clock tower
    m.tiles('objects', [[4, 6]], 'P');                         // Gerrit
    m.vline('objects', 27, 5, 7, 'P');                         // pipes down the workshop flank
    m.vline('objects', 15, 15, 5, 'P');                        // boiler court wall
    m.vline('objects', 29, 15, 5, 'P');                        // pipes down the smithy flank
    m.hline('objects', 36, 12, 2, 'P');

    // ---- north market: stalls under a row of lanterns, a fountain in the glow
    m.tiles('objects', [[7, 1], [8, 1], [16, 1], [17, 1]], 'S');  // shelves of goods
    m.tiles('objects', [[7, 2], [8, 2], [16, 2], [17, 2]], 'E');  // stall tables
    m.tiles('objects', [[9, 2], [18, 2]], 'C');                   // crates under the stalls
    m.set('objects', 12, 2, 'o');                                 // steam fountain
    m.tiles('objects', [[10, 3], [14, 3]], 'H');                  // benches by the fountain
    m.tiles('objects', [[6, 1], [6, 2], [6, 3]], 'P');            // pipes along the inn's west wall
    m.tiles('above', [[7, 3], [9, 3], [11, 3], [13, 3], [15, 3], [17, 3]], '*');

    // ---- cistern (secret) and the west lane
    m.tiles('objects', [[1, 1], [1, 2]], 'U');
    m.set('objects', 1, 4, 'C');
    m.set('objects', 2, 14, 'H');                              // an old bench
    m.tiles('objects', [[1, 16], [1, 17]], 'J');               // boilers, west yard
    m.tiles('objects', [[7, 17], [7, 18]], 'C');               // stacked crates
    m.set('objects', 6, 19, 'U');
    m.set('objects', 4, 13, 'L');                              // lamp posts along the lane
    m.set('objects', 8, 15, 'L');
    m.set('objects', 6, 11, 'U');                               // barrels by Gerrit's door
    m.tiles('objects', [[3, 16], [4, 16]], 'e');                // gears in the west yard

    // ---- boiler court (16..18, 15..19) between Sprocket and the avenue
    m.set('objects', 16, 15, 'J');
    m.set('objects', 18, 16, 'e');
    m.set('objects', 16, 19, 'C');
    m.set('objects', 17, 19, 'U');

    // ---- alley east of the avenue (23..26, 5..10): barrels, crates, a lamp
    m.tiles('objects', [[23, 6], [23, 7]], 'U');
    m.tiles('objects', [[24, 8], [24, 9]], 'C');
    m.set('objects', 24, 5, 'L');
    m.set('objects', 17, 5, 'L');

    // ---- the street: lamp posts and a gear cluster by the east yard
    m.set('objects', 18, 11, 'L').set('objects', 25, 11, 'L').set('objects', 35, 11, 'L');
    m.set('objects', 12, 12, 'L');
    m.tiles('objects', [[22, 14]], 'H');                        // chair by the avenue
    m.tiles('objects', [[26, 19]], 'U');
    m.set('objects', 25, 17, 'o');                              // plaza fountain
    m.tiles('objects', [[23, 17], [27, 17]], 'H');             // benches round it
    m.set('objects', 23, 19, 'L').set('objects', 28, 19, 'L');

    // ---- workshop front, clock tower and the east yard
    m.tiles('objects', [[40, 13], [41, 13], [41, 14]], 'e');   // gears
    m.tiles('objects', [[36, 15], [36, 16]], 'M');              // lathe in the yard
    m.tiles('objects', [[36, 17], [37, 17]], 'e');              // gears
    m.set('objects', 42, 15, 'U');
    m.tiles('objects', [[38, 13], [39, 13]], 'F');              // a planter by the gears
    m.vline('objects', 42, 2, 9, 'P');                          // pipes up the clock tower flank

    // ---- south quay: crates, barrels, lamps, dock cranes and a steam railing
    m.tiles('objects', [[12, 21], [13, 21], [13, 22]], 'C');   // crates by the quay
    m.set('objects', 14, 22, 'U');
    m.tiles('objects', [[38, 22], [39, 22]], 'U');             // barrels by the chest
    m.tiles('objects', [[9, 22]], 'E');                        // fish stall
    m.tiles('objects', [[10, 22], [9, 24], [10, 24]], 'C');
    m.tiles('objects', [[1, 22], [2, 22], [2, 23]], 'C');      // west docks: stacked crates
    m.tiles('objects', [[1, 25], [2, 25]], 'U');
    m.set('objects', 5, 21, 'M').set('objects', 5, 20, 'P');   // west dock crane
    m.set('objects', 6, 21, 'e');
    m.set('objects', 27, 23, 'M').set('objects', 27, 22, 'P'); // central dock crane
    m.set('objects', 42, 22, 'M').set('objects', 42, 21, 'P'); // east dock crane
    m.tiles('objects', [[16, 21], [28, 21]], 'L');             // quay lamps
    m.tiles('objects', [[30, 24], [31, 24], [31, 25]], 'C');   // crates by the guard post
    m.hline('objects', 9, 25, 9, 'P');                         // steam railing, west quay
    m.hline('objects', 23, 25, 11, 'P');                       // steam railing, east quay
    m.tiles('objects', [[33, 25]], 'P');
    m.set('objects', 19, 25, ' ');

    // ---- harbour water: a crate-boat, a second quay corner
    m.set('objects', 40, 28, 'C');
    m.set('objects', 35, 30, 'U');
    m.set('objects', 14, 27, 'C');
    m.tiles('objects', [[30, 30], [10, 31], [36, 33]], 'R');   // rocks breaking the bay

    // ---- hanging lanterns across the avenue mouth; a warm light over the arrival point
    m.tiles('above', [[20, 3], [21, 3]], '*');
    m.hline('above', 28, 11, 4, '*');
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
      H.npc('bh_tired', 17, 17, 'villager_f1', [
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
      H.npc('bh_pinta', 20, 10, 'villager_f2', [
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
      id: 'bh_grate', x: 4, y: 5, sprite: null, trigger: 'action', solid: false,
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

    // ---- the morning launch (Ch1 finale): Hale glimpsed, two heart choices, the Marigold rises
    m.ev([{
      id: 'hale_dock', x: 24, y: 23, sprite: 'hale', trigger: 'action', solid: true, dir: 'left', name: 'Inquisitor Hale',
      if: () => !!G.flag('ch1_slept') && !G.flag('ch1_launched'),
      run: async (c) => { await who(c, 'Inquisitor Hale', 'hale', 'Lovely morning for a flight, Captain Vane. Mind the fog. It has ears, and the Warden keeps a list.', 'smirk'); },
    }]);
    m.ev(H.auto('bh_launch', async (c) => {
      c.bgm('marigold');
      c.titleCard('Morning', 'The Marigold rises', 110);
      await c.wait(40);
      await nar(c, 'The dawn over Brasshaven is the colour of a lantern turned low: honey, rose, a little brass. The copper roofs catch it and pass it along, roof to roof, until the whole city is blushing.');
      await who(c, 'Claret', 'claret', "You're late, Rowan. I've been standing here for twenty minutes pretending I'm not nervous about flying a ship I patched with a hat.", 'smirk');
      await me(c, "You said morning. This is morning. It's very early morning, Claret, you should be proud.", 'smirk');
      c.camera(24, 22, 30);
      await c.emote('hale_dock', 'question');
      await nar(c, 'On the pier, a tall figure in a silver-white coat watches the Marigold with a lantern brooch glinting at his collar. Inquisitor Hale. He tips his hat, unhurried, as if he has all the time in Auren.');
      await who(c, 'Inquisitor Hale', 'hale', 'Good morning, Captain. Good morning, wickless youth. The Warden sends his warmest regards. He says the sky will be very clear for you.', 'smirk');
      await c.walk('hale_dock', ['left', 'left', 'up', 'up']);
      await nar(c, 'He steps into the fog and is gone. The fog closes behind him like a door that was never opened.');
      c.camReset(30);
      // heart choice 1 — before takeoff
      const i = await c.choice([
        '"I\'m right here. Take my hand and we\'ll go up together."',
        '"Relax, Captain. If anyone gets airsick, it\'ll be me."',
        '"Your father built a beautiful ship, Claret. You\'re flying it for both of you."',
      ], { prompt: 'Claret is pale and gripping a spanner. What do you say?' });
      if (i === 0) {
        await who(c, 'Claret', 'claret', "...Fine. Fine. Your hand is warm, which is unfair. Don't let go.", 'blush');
        await c.affection('claret', 3, 'Held her hand');
      } else if (i === 1) {
        await who(c, 'Claret', 'claret', "If you get airsick, I'm putting you in the bilge with the spare rivets. Ha. I mean it. Kind of.", 'smirk');
        await c.affection('claret', 2, 'A joke to ease the nerves');
      } else {
        await who(c, 'Claret', 'claret', "Don't. Don't say his name like that. I'll cry on the controls and the Marigold will sulk for a week.", 'sad');
        await c.affection('claret', 3, 'Honoured her father');
      }
      // the Marigold rises
      c.sfx('lantern'); c.flash('#9fd8ff', 36); c.shake(4, 60);
      c.camera(21, 6, 150);
      await nar(c, 'The Marigold lifts from the pier with a sigh of steam and a groan of old brass that turns, halfway up, into a hymn. Her propeller spins up straight and true. Gulls scatter. The copper roofs fall away below.');
      await c.wait(60);
      // heart choice 2 — sweet beat, in the air
      const j = await c.choice([
        '"Give him a hug first. Then a spanner."',
        '"Make him fix your hull. Every single gouge."',
        '"Then we\'ll find him, and he can tell you all the things you never let anyone say."',
      ], { prompt: 'Above the rooftops, Claret asks: what will you do when you find your father?' });
      if (j === 0) {
        await who(c, 'Claret', 'claret', "A spanner, first. Then a hug. He'd complain about the order, and I'd hit him, and then he'd hug me back. Mostly fair.", 'happy');
        await c.affection('claret', 3, 'A sweet plan');
      } else if (j === 1) {
        await who(c, 'Claret', 'claret', "Ha! He'd say the gouge was artistic. I'd say he's a liar. We'd both be right, and it would be perfect.", 'smirk');
        await c.affection('claret', 2, 'Laughter in the sky');
      } else {
        await who(c, 'Claret', 'claret', "...Rowan. Don't. I've got to keep my goggles on for the wind, and you're making my eyes do something embarrassing.", 'blush');
        await c.affection('claret', 3, 'Something real');
      }
      // sweet ending beat
      await c.emote('player', 'heart');
      await me(c, "Look at the city, Claret. It's so small from up here. And the lamps are still warm.", 'happy');
      await who(c, 'Claret', 'claret', 'It is small. Everything gets small when you look at it from the right height. Even the Order. Even... me.', 'sad');
      await who(c, 'Claret', 'claret', "Thanks for not letting me fall, Rowan. Don't read into that. I'm just saying thanks. Shut up. I'm saying it again. Thanks.", 'happy');
      G.setFlag('ch1_launched', true);
      G.setFlag('ch1_done', true);
      c.toast('Claret ♥ Friend of the sky', 'heart');
      await c.wait(60);
      await c.chapterEnd(1);
    }, { once: false, if: () => !!G.flag('ch1_slept') && !G.flag('ch1_launched') }));

    return m.finish({ onEnter: null });
  }
  buildBrasshaven();

  // ============================================================ MAP 5 — Claret's workshop (interior)
  function buildWorkshop() {
    const m = G.maps.build('brasshaven_workshop', 16, 12, {
      name: "Claret's Workshop", bgm: 'workshop', interior: true, ground: 'm', spawn: { x: 6, y: 9, dir: 'up' },
    });
    m.room(0, 0, 16, 12, { floor: 'm', wall: '7', topWall: 2 });
    m.set('objects', 6, 11, 'D');
    m.set('objects', 3, 0, ' ');                              // a porthole in the top wall (decor only)
    m.vline('objects', 14, 3, 6, 'P');                         // pipes along the east wall
    m.tiles('objects', [[2, 2], [3, 2]], 'S');                 // parts shelves
    m.tiles('objects', [[12, 2], [13, 2]], 'Y');               // manuals
    m.tiles('objects', [[2, 5], [3, 5]], 'E');                 // bench with spanners
    m.tiles('objects', [[1, 8], [2, 8]], 'C');                 // crates of spares
    m.tiles('objects', [[13, 8]], 'U');
    m.tiles('objects', [[1, 9], [1, 10]], 'J');                // boiler
    m.tiles('objects', [[4, 9], [5, 9]], 'M');                 // lathe machine
    m.tiles('objects', [[9, 9], [10, 9]], 'e');                // gears
    m.tiles('objects', [[12, 5], [13, 5]], 'M');
    m.set('objects', 5, 4, 'H');
    m.set('objects', 9, 2, ' ');
    m.set('objects', 7, 5, 'H');
    m.rect('ground', 4, 3, 5, 3, 'j');                         // the ship's deck planks: the Marigold sits on them
    m.tiles('objects', [[7, 2], [8, 2]], 'S');                 // a tool board
    m.set('objects', 13, 7, 'U');
    m.set('objects', 10, 4, 'L');                              // a lamp by the Marigold
    m.tiles('objects', [[9, 6], [10, 6]], 'E');                // a workbench
    m.ev([
      H.transfer(6, 11, 'brasshaven', 31, 12, 'down', { id: 'ws_exit' }),
      {
        id: 'ws_marigold', x: 8, y: 4, sprite: 'obj_marigold_wheel', trigger: 'action', solid: true, name: 'Marigold model',
        run: async (c) => {
          await nar(c, 'A half-built model of the Marigold, the size of a dinner table. Its propeller is bent in three places, and a neat paper tag reads: "DO NOT FLY. (YET.)"');
          if (G.flag('ch1_fixed')) { await nar(c, 'The model is shiny, straight, and clearly thrilled about its life choices now.'); }
        },
      },
      {
        id: 'ws_hatch', x: 12, y: 9, sprite: null, trigger: 'action', solid: false, dir: 'down',
        if: () => !!G.flag('ch1_met_claret'),
        run: async (c) => {
          if (G.flag('ch1_boss_sentinel')) { await nar(c, 'The old lift hatch. The Order\'s bots came up through here with the Coil. Its brass rungs are still warm.'); return; }
          c.sfx('door');
          await who(c, 'Claret', 'claret', 'The hatch takes you down to the Clockwork Undercroft. Rusty old lift, hates everybody, don\'t talk to it.', 'normal');
          const i = await c.choice(['Go down with Claret', 'Not yet'], { prompt: 'Descend into the Undercroft?' });
          if (i !== 0) return;
          await c.transfer('undercroft_1', 3, 21, 'up');
        },
      },
    ]);

    // ---- a secret drawer: Bram's note (emotional beat, one-off)
    m.ev([{
      id: 'ws_drawer', x: 6, y: 2, sprite: null, trigger: 'action', solid: false, name: 'Drawer',
      run: async (c) => {
        if (G.flag('ch1_bram_note')) { await nar(c, 'The drawer holds only spare rivets and a single brass button. Your hand lingers on it for a second longer than you mean it to.'); return; }
        G.setFlag('ch1_bram_note', true);
        c.sfx('chest');
        await nar(c, 'Tucked under a stack of blueprints is a folded note, the paper soft from being read too many times. The handwriting is big, careless, and kind.');
        await nar(c, '"Claret, love. If you find this, the Coil went down the old lift and I\'m sorry I couldn\'t stop them. Don\'t come after me. Keep the ship honest. Keep your goggles on. Dad."');
        if (G.flag('ch1_met_claret')) {
          await who(c, 'Claret', 'claret', 'He wrote that the week before they came. Of course he did. He always wrote me notes when he was going to be stubborn about something.', 'sad');
          await me(c, 'Then we bring him home, Claret. And we tell him the note was rubbish.', 'smirk');
          await who(c, 'Claret', 'claret', 'It was not rubbish. It was very Dad. Shut up. I\'m going to stop talking now.', 'blush');
        }
      },
    }]);

    // ---- Claret, the meeting (runs once)
    m.ev([{
      id: 'claret_ws', x: 9, y: 7, sprite: 'claret', trigger: 'action', solid: true, dir: 'up', name: 'Claret',
      run: async (c) => {
        if (!G.flag('ch1_met_claret')) { await who(c, 'Claret', 'claret', 'Still here? I said I\'m not selling. Or sorry. Stop looking at my goggles.', 'angry'); return; }
        if (G.flag('ch1_fixed')) { await who(c, 'Claret', 'claret', 'She flies, Rowan. She actually flies. Don\'t look at me like that, I\'m allowed to be happy about a propeller.', 'happy'); return; }
        if (G.flag('ch1_boss_sentinel')) { await who(c, 'Claret', 'claret', 'Go and sleep. I\'ll fix the ship. I fixed three hundred other things, I can fix one more.', 'normal'); return; }
        await who(c, 'Claret', 'claret', 'Don\'t touch that, it\'s load-bearing. I\'m fine. The ship is not fine. Coil first, then I\'ll be fine. Probably.', 'normal');
      },
    }]);

    m.ev(H.auto('ws_meet', async (c) => {
      c.sfx('blunt'); c.shake(2, 12);
      await c.wait(20);
      await who(c, 'Claret', 'claret', "Oi! Whoever's standing in my doorway: I'm not buying, I'm not selling, and I'm not sorry.", 'angry');
      await me(c, "I'm not here to buy anything! I'm looking for a workshop. Big wheel on the sign?", 'worried');
      await c.emote('claret_ws', 'exclaim');
      await who(c, 'Claret', 'claret', "Then you found it. Congratulations. Don't touch that, it's load-bearing.", 'smirk');
      c.sfx('lightning'); c.flash('#9fd8ff', 10);
      await nar(c, 'A blue spark jumps from the lathe to the back of your hand. You hiss. Claret looks up, really looks at you, and goes very still.');
      await me(c, "Ow. Okay. Maren Lampkeeper sent me. She said to show you this.", 'worried');
      await me(c, 'It\'s a compass. It\'s been humming since the forest. It keeps pointing at you, which is rude.', 'smirk');
      await who(c, 'Claret', 'claret', "That's an Ember Compass. Nobody's made one since my dad's day. Where did you get that? Nobody sends anybody to me. They send bailiffs.", 'surprised');
      await who(c, 'Claret', 'claret', 'I\'m Claret Vane. Captain, engineer, and the only person in Brasshaven who will tell you the ship is broken to your face.', 'normal');
      await me(c, 'What happened to her? To the ship?', 'normal');
      await who(c, 'Claret', 'claret', 'I also found a bent propeller, worn-out struts, loose lug nuts and a giant gouge in the hull! This poor girl\'s been through the ringer!', 'angry');
      await c.emote('claret_ws', 'sweat');
      await who(c, 'Claret', 'claret', 'Three weeks ago the Order came with a warrant and a cart. They took my father, Bram Vane, to the Cold Foundry. Shipwright. Brilliant, stubborn, mine.', 'sad');
      await who(c, 'Claret', 'claret', 'And they took the Aether Coil. The Marigold\'s heart. Their bots dragged it down the old lift into the undercroft. Nobody comes back from down there.', 'sad');
      await c.bgm('tender');
      await me(c, 'Then we get the Coil back. And we get your father back. If I\'m good for nothing else, I can at least carry things.', 'happy');
      await who(c, 'Claret', 'claret', 'Hmm. Deal, then. You get the Coil out of the undercroft, and I patch the Marigold and take you wherever that stupid compass wants to go.', 'smirk');
      const i = await c.choice([
        '"Your father isn\'t lost. We\'ll find him together."',
        '"Deal. Though I\'d trust a ship with a gouge in it about as far as I\'d trust a goat."',
        '"You don\'t have to do all of this alone, you know."',
      ], { prompt: 'How do you answer Claret?' });
      if (i === 0) {
        await who(c, 'Claret', 'claret', "...Don't say things like that. Especially not in that voice. It's distracting, and I'm trying to be professional.", 'blush');
        await c.affection('claret', 3, 'A warm promise');
      } else if (i === 1) {
        await who(c, 'Claret', 'claret', 'The ship is perfectly trustworthy. The gouge is cosmetic. Mostly. The goat is the one I wouldn\'t trust.', 'smirk');
        await c.affection('claret', 2, 'A bit of a tease');
      } else {
        await who(c, 'Claret', 'claret', "I've been carrying everything since Dad went. Don't make me cry in front of a stranger. Give me a minute to glare at a spanner.", 'sad');
        await c.affection('claret', 1, 'Honest and kind');
      }
      G.setFlag('ch1_met_claret', true);
      await c.bgm('workshop');
      await who(c, 'Claret', 'claret', 'Trapdoor\'s in the floor by the lathe. I\'m coming with you. I\'ve got a spanner and a terrible temper.', 'normal');
    }, { once: true, if: () => !G.flag('ch1_met_claret') && !!G.flag('ch1_started') }));

    // ---- overnight refit (after the Undercroft boss): the ship is fixed by morning
    m.ev(H.auto('ws_refit', async (c) => {
      c.bgm('workshop');
      await who(c, 'Claret', 'claret', 'Right. Night shift. Get out of my way and hold this, no, not like that, hold it like you mean it.', 'normal');
      await me(c, 'Like this?', 'smirk');
      await c.fade('out', 60);
      await c.wait(40);
      await nar(c, 'Hours pass in a blur of sparks, hissing rivets, and Claret swearing at a propeller in three languages.');
      await nar(c, 'You hold lamps. You fetch things. At one point you are asked to not breathe on the gears. You do not breathe on the gears.');
      await c.fade('in', 60);
      await who(c, 'Claret', 'claret', 'Propeller: straight. Struts: sound. Hull: patched with my second-best hat. And the Coil is in. She\'s ready, Rowan.', 'happy');
      G.setFlag('ch1_fixed', true);
      G.setFlag('marigold_ready', true);
      c.sfx('levelup');
      c.toast('The Marigold is ready to fly', 'good');
      await who(c, 'Claret', 'claret', 'Now get some sleep. Inn, bed, pillow. I\'ll be fussing over the hull till dawn. Go on. Shoo.', 'normal');
      await c.transfer('brasshaven_inn', 6, 8, 'up');
    }, { once: false, if: () => !!G.flag('ch1_boss_sentinel') && !G.flag('ch1_fixed') }));

    return m.finish({ onEnter: null });
  }
  buildWorkshop();

  // ============================================================ MAP 6 — The Brass Kettle (inn)
  function buildInn() {
    const m = G.maps.build('brasshaven_inn', 12, 10, {
      name: 'The Brass Kettle', bgm: 'tavern', interior: true, ground: 'f', spawn: { x: 6, y: 8, dir: 'up' },
    });
    m.room(0, 0, 12, 10, { floor: 'f', wall: '7', topWall: 2 });
    m.set('objects', 6, 9, 'D');
    m.tiles('objects', [[1, 3], [1, 4], [3, 3], [3, 4]], 'Z');  // beds along the west wall
    m.tiles('objects', [[9, 3], [9, 4], [10, 3], [10, 4]], 'Z');
    m.tiles('objects', [[11, 2]], 'I');                          // steam hearth
    m.tiles('objects', [[5, 3], [6, 3], [7, 3]], 'S');           // shelves of mugs
    m.tiles('objects', [[3, 7], [8, 7]], 'E');                   // tables
    m.tiles('objects', [[2, 7], [4, 7], [7, 7], [9, 7]], 'H');   // chairs
    m.tiles('objects', [[1, 8]], 'U');
    m.set('objects', 5, 5, 'P').set('objects', 6, 5, 'P');
    m.rect('ground', 4, 5, 5, 2, 'c');                            // a rug in the common room
    m.rect('ground', 9, 2, 2, 1, 't');                            // flagstones by the steam hearth
    m.set('objects', 1, 2, 'F');                                  // a planter by the beds
    m.set('objects', 4, 2, 'L');                                  // a lamp post by the beds
    m.set('objects', 10, 8, 'U');                                 // barrels of ale
    m.tiles('above', [[3, 2], [6, 2], [9, 2]], '*');              // lanterns strung along the beams
    m.ev([
      H.transfer(6, 9, 'brasshaven', 9, 10, 'down', { id: 'inn_exit' }),
      H.innkeeper('inn_keeper', 10, 6, 'innkeeper', 30, 'Mother Gusset'),
      {
        id: 'claret_inn', x: 8, y: 8, sprite: 'claret', trigger: 'action', solid: true, dir: 'up', name: 'Claret',
        run: async (c) => {
          if (G.flag('ch1_fixed') && !G.flag('ch1_slept')) { await who(c, 'Claret', 'claret', 'Five more minutes. I\'m just checking the rivets in my sleep.', 'normal'); return; }
          await who(c, 'Claret', 'claret', 'The Kettle\'s bread is hard, the beer is worse, and the bed is the only honest thing in Brasshaven. Sleep is for the lucky.', 'sad');
        },
      },
      {
        id: 'inn_patron', x: 3, y: 6, sprite: 'sailor', trigger: 'action', solid: true, dir: 'down', name: 'Drunk Sailor',
        run: async (c) => {
          await who(c, 'Sailor', 'unknown', 'Oi! The lamps are in my head, friend. They hum all the time. I drink to make them shut up. Then they hum at me from my cup.', 'sad');
        },
      },
      {
        id: 'inn_bard', x: 9, y: 6, sprite: 'noble', trigger: 'action', solid: true, dir: 'left', name: 'Pinta the Bard',
        run: async (c) => {
          await who(c, 'Pinta', 'unknown', 'Ah, a fresh ear! I wrote a ballad: "The Lamp That Ate My Grandmother." It rhymes. Mostly. The Order didn\'t like the ending.', 'happy');
        },
      },
    ]);
    m.ev(H.auto('inn_night', async (c) => {
      c.bgm('tavern');
      await c.fade('out', 50);
      await c.wait(40);
      await nar(c, 'Night in the Brass Kettle. The copper roof sings a little as it cools. Somewhere a lamp is humming a lullaby, badly. You sleep the sleep of the very tired and the very fixed.');
      await c.fade('in', 50);
      await who(c, 'Claret', 'claret', 'Morning, sleepyhead. I didn\'t sleep either. I just sat by the Coil and listened to it purr. Don\'t tell anyone I did that.', 'smirk');
      await me(c, 'Your secret\'s safe. Thank you, Claret. For fixing her. For fixing... this.', 'happy');
      await who(c, 'Claret', 'claret', 'Shut up and go outside. The sky is doing something ridiculous. I want to see your face when the Marigold lifts.', 'blush');
      G.setFlag('ch1_slept', true);
      await c.transfer('brasshaven', undefined, undefined, 'down');
    }, { once: false, if: () => !!G.flag('ch1_fixed') && !G.flag('ch1_slept') }));
    return m.finish({ onEnter: null });
  }
  buildInn();

  // ============================================================ MAP 7 — Clockwork Undercroft I (steam dungeon)
  function buildUndercroft1() {
    const m = G.maps.build('undercroft_1', 32, 26, {
      name: 'Clockwork Undercroft', bgm: 'undercroft', ground: 'm', spawn: { x: 3, y: 21, dir: 'up' },
    });
    m.border('objects', '7', 1);
    // spine corridor (row 12) with side rooms north (storerooms) and south (pipe maze, stairs)
    m.hline('objects', 1, 11, 30, '7');
    m.hline('objects', 4, 13, 27, '7');
    m.vline('objects', 4, 14, 11, '7');                 // entry hall wall
    m.vline('objects', 5, 1, 10, '7');
    m.vline('objects', 12, 1, 10, '7');
    m.vline('objects', 21, 1, 10, '7');
    m.vline('objects', 15, 14, 11, '7');                // divider between the pipe maze and the stairs room
    m.set('objects', 6, 11, ' ').set('objects', 15, 11, ' ').set('objects', 24, 11, ' ');
    m.set('objects', 6, 13, ' ').set('objects', 24, 13, ' ');
    m.set('objects', 15, 18, ' ');                      // doorway between the south rooms
    m.set('objects', 12, 20, ' ');                      // a hidden little pass in the pipe maze
    m.set('objects', 5, 11, ' ');                       // storeroom opens to the spine
    m.set('objects', 1, 13, ' ').set('objects', 2, 13, ' ').set('objects', 3, 13, ' ');
    // open the entry hall
    m.rect('objects', 1, 22, 3, 3, ' ');
    m.vline('objects', 1, 14, 8, ' ').vline('objects', 2, 14, 8, ' ').vline('objects', 3, 14, 8, ' ');
    // rooms with their own floors: a wooden storeroom (west), a stone archive, a stone entry hall, a carpeted treasury
    m.rect('ground', 1, 1, 4, 10, 'f');                        // storeroom: planks
    m.rect('ground', 6, 1, 6, 10, 't');                        // old archive: flagstones
    m.rect('ground', 22, 1, 9, 10, 'c');                       // treasury: red carpet
    m.rect('ground', 1, 13, 3, 12, 't');                       // entry hall: flagstones
    m.rect('ground', 8, 16, 3, 3, 't');                        // a patch of flags in the pipe maze
    m.rect('ground', 20, 19, 5, 4, 't');                       // flags round the save lamp
    m.set('objects', 8, 11, ' ');                              // the archive's back gap (lets the banter trigger at 8,11 fire)

    // steam dressing
    m.vline('objects', 7, 2, 1, 'P').vline('objects', 19, 2, 8, 'P');
    m.tiles('objects', [[14, 3], [14, 4], [14, 5]], 'J');
    m.tiles('objects', [[17, 3], [18, 3]], 'e');
    m.tiles('objects', [[17, 7], [18, 7]], 'e');
    m.tiles('objects', [[23, 3], [24, 3]], 'M');
    m.tiles('objects', [[27, 3]], 'J');
    m.tiles('objects', [[7, 6], [8, 6]], 'C');
    m.tiles('objects', [[9, 9]], 'U');
    m.tiles('objects', [[7, 18], [8, 18], [9, 18]], 'P');
    m.tiles('objects', [[10, 21], [10, 22]], 'J');
    m.tiles('objects', [[6, 22], [7, 23]], 'M');
    m.tiles('objects', [[18, 16], [19, 16]], 'M');
    m.tiles('objects', [[22, 22], [23, 22]], 'C');
    m.tiles('objects', [[17, 22], [17, 23]], 'e');
    m.tiles('objects', [[26, 16]], 'J');
    m.set('objects', 28, 22, 'u');                             // stairs down to the second Undercroft

    // the storeroom (west): shelves on the back wall, crate stacks, barrels, a lamp
    m.tiles('objects', [[1, 1], [2, 1], [3, 1], [4, 1]], 'S');
    m.tiles('objects', [[1, 3], [2, 3], [1, 4], [2, 4]], 'C');
    m.tiles('objects', [[4, 3], [4, 4]], 'U');
    m.tiles('objects', [[3, 8], [4, 8], [1, 8]], 'U');
    m.set('objects', 2, 6, 'L');
    m.tiles('objects', [[1, 9], [2, 9]], 'C');
    // the archive (6..11): bookshelves, the notes desk, a stool
    m.tiles('objects', [[9, 1], [10, 1], [11, 1]], 'Y');
    m.set('objects', 10, 4, 'E');
    m.set('objects', 9, 5, 'H');
    m.set('objects', 11, 6, 'P');
    m.tiles('objects', [[10, 9]], 'C');
    // the boiler room (13..20): a pipe to the lamp, boilers, gears, barrels by the gap
    m.tiles('objects', [[15, 1], [16, 1]], 'J');
    m.set('objects', 16, 8, 'L');
    m.tiles('objects', [[20, 8], [20, 9]], 'U');
    m.hline('objects', 16, 9, 3, 'P');
    m.tiles('above', [[16, 2], [18, 2]], '*');
    // the treasury (22..30): pillars, gold crates, a table, a lamp
    m.set('objects', 23, 8, 'Q').set('objects', 29, 8, 'Q');
    m.tiles('objects', [[29, 4], [29, 5]], 'C');
    m.tiles('objects', [[25, 7], [26, 7]], 'E');
    m.set('objects', 27, 8, 'L');

    // the entry hall (1..3, 13..24): a lamp by the stair-down; keep the spawn column clear
    m.set('objects', 1, 17, 'L');
    // the pipe maze (5..14, 14..24): a pipe wall with gaps, crates and barrels
    m.hline('objects', 8, 15, 4, 'P');
    m.tiles('objects', [[13, 16], [14, 16]], 'C');
    m.set('objects', 5, 20, 'U');
    m.set('objects', 13, 19, 'U');
    // the stairs room (16..30, 14..24): crate depot, shelves, a lamp, steam pipes along the south wall
    m.tiles('objects', [[17, 14], [18, 14], [17, 15]], 'C');
    m.tiles('objects', [[29, 14], [29, 15]], 'S');
    m.set('objects', 30, 18, 'U');
    m.set('objects', 21, 19, 'L');
    m.tiles('objects', [[26, 14], [27, 14]], 'M');             // a press along the north wall (the gap at 24,13 stays clear)
    m.tiles('objects', [[29, 19], [29, 20], [30, 20]], 'e');   // gears by the east wall
    m.hline('objects', 17, 24, 9, 'P');
    m.tiles('above', [[3, 12], [10, 12], [18, 12], [27, 12]], '*');
    m.tiles('above', [[13, 2], [25, 2]], '*');
    m.encounters({ steps: [16, 30], troops: [{ id: 'under_1', weight: 3 }, { id: 'under_2', weight: 3 }, { id: 'under_3', weight: 2 }] });

    m.ev([
      H.transfer(2, 24, 'brasshaven_workshop', 12, 8, 'down', { id: 'uc1_exit' }),
      H.transfer(28, 22, 'undercroft_2', undefined, undefined, 'down', { id: 'uc1_stairs' }),
      H.save('uc1_save_1', 2, 20),
      H.save('uc1_save_2', 22, 21),
      H.sign('uc1_sign', 3, 23, 'CLOCKWORK UNDERCROFT\nKeep to the grating. The Order\'s bots do not share their cogs.'),
    ]);

    // Claret joins at the start of the dungeon
    m.ev(H.auto('uc1_join', async (c) => {
      c.titleCard('Clockwork Undercroft', 'Gears, grates & grudges', 120);
      await c.wait(40);
      await c.join('claret');
      G.setFlag('ch1_claret_joined', true);
      c.sfx('heal');
      await who(c, 'Claret', 'claret', 'Right. Don\'t wander off. Stay in the light, don\'t touch the valves unless I say, and for pity\'s sake don\'t lick the pipes.', 'normal');
      await me(c, 'Why would I lick the pipes?', 'worried');
      await who(c, 'Claret', 'claret', 'You\'d be surprised what people try in a dungeon. I once watched a mercenary eat a gear. He was fine. The gear was not.', 'smirk');
    }, { once: true, if: () => !!G.flag('ch1_met_claret') && !G.flag('ch1_claret_joined') }));

    // banter triggers that only fire once each
    m.ev([
      H.trigger('uc1_banter_bots', 15, 12, async (c) => {
        await who(c, 'Claret', 'claret', 'Those are Order bots. Cog rats with a union card. Mind the one with the clipboard.', 'normal');
        await me(c, 'Clipboard?', 'worried');
        await who(c, 'Claret', 'claret', 'Everything in this city has a clipboard, Rowan. That\'s how you know the Order is alive.', 'smirk');
      }, { once: true, if: () => !!G.flag('ch1_claret_joined') }),
      H.trigger('uc1_banter_store', 8, 11, async (c) => {
        await me(c, 'Your father\'s handwriting is on this crate. "Do not load after dark. Do not load before breakfast. Do not, under any circumstances, load Tuesdays."', 'smirk');
        await who(c, 'Claret', 'claret', '...He was always dramatic about crates. Keep walking. Please keep walking.', 'sad');
      }, { once: true, if: () => !!G.flag('ch1_claret_joined') }),
    ]);

    // ---- treasure
    m.ev(H.chest('uc1_notes', 9, 3, 'lampwright_notes', 1));  // Elowen's notes: the three Anchors
    m.ev(H.chest('uc1_store', 7, 9, 'hi_potion', 2));
    m.ev(H.chest('uc1_gold', 28, 3, { gold: 70 }));
    m.ev(H.chest('uc1_ether', 12, 23, 'ether', 1));

    // ---- wandering Order bot (flavour NPC) and a lost engineer
    m.ev([
      H.npc('uc1_bot', 19, 20, 'engineer', [
        "BEEP. Please do not stand on the grate. The grate is an investment. BEEP.",
        "The Coil is in the lowest sector. Nobody goes to the lowest sector. Nobody. BEEP.",
      ], { name: 'Order Maintenance Bot' }),
      H.npc('uc1_lost', 26, 19, 'villager_m1', [
        "I came down for a tour. The guide ran off. I've been here three days. The steam keeps the rats warm, and me cold.",
      ], { name: 'Lost Surveyor' }),
    ]);

    return m.finish({ onEnter: null });
  }
  buildUndercroft1();

  // ============================================================ MAP 8 — Clockwork Undercroft II (boss: Brass Sentinel)
  function buildUndercroft2() {
    const m = G.maps.build('undercroft_2', 32, 28, {
      name: 'Undercroft: The Lowest Sector', bgm: 'undercroft', ground: 'm', spawn: { x: 26, y: 5, dir: 'down' },
    });
    m.border('objects', '7', 1);
    // arrival room A (x20..28, y3..6)
    m.box('objects', 19, 2, 11, 6, '7');
    m.set('objects', 24, 7, ' ').set('objects', 19, 5, ' ');
    // shortcut corridor (row 5) to the boss hall, sealed by a steam gate
    m.hline('objects', 15, 4, 4, '7').hline('objects', 15, 6, 4, '7');
    m.set('objects', 14, 5, ' ');
    // boss hall B (x5..13, y3..9)
    m.box('objects', 4, 2, 11, 9, '7');
    m.set('objects', 14, 5, ' ').set('objects', 7, 10, ' ');
    // long route: corridor x=24 down to the valve room V
    m.vline('objects', 23, 8, 3, '7').vline('objects', 25, 8, 3, '7');
    // valve room V (x18..28, y12..17)
    m.box('objects', 17, 11, 13, 8, '7');
    m.set('objects', 24, 11, ' ').set('objects', 17, 14, ' ').set('objects', 21, 18, ' ');
    // west corridor row 14 (x8..16) to the boss hall's south door
    m.hline('objects', 8, 13, 9, '7').hline('objects', 8, 15, 9, '7');
    m.vline('objects', 6, 11, 4, '7').vline('objects', 8, 11, 2, '7');
    // coil room K (x17..27, y20..24)
    m.box('objects', 16, 19, 13, 7, '7');
    m.set('objects', 21, 19, ' ');
    // rooms with stone floors (the arrival room, the Sentinel's hall, the coil room) and grating everywhere else
    m.rect('ground', 20, 3, 9, 4, 't');                        // arrival room flags
    m.rect('ground', 5, 3, 9, 7, 't');                         // the Sentinel's hall
    m.rect('ground', 17, 20, 11, 4, 't');                      // the coil room floor
    // arrival room (20..28, 3..6): steam pipes, lamps, the save lamp at 21,4 and the sign at 25,4
    m.tiles('objects', [[20, 4], [22, 4]], 'P');
    m.set('objects', 20, 3, ' ');
    m.set('objects', 27, 3, 'e');
    m.set('objects', 23, 6, 'L').set('objects', 27, 6, 'L');
    // the Sentinel's hall (5..13, 3..9): pipe columns, a boiler, crates, lanterns over the arena
    m.tiles('objects', [[12, 3], [12, 4]], 'J');
    m.tiles('objects', [[9, 4], [10, 4]], 'C');
    m.set('objects', 6, 4, 'P').set('objects', 12, 8, 'P');
    m.set('objects', 6, 8, 'e');
    m.tiles('above', [[8, 3], [12, 6]], '*');
    // the valve room (18..28, 11..18): machines, gears, pipes; the approaches to the valves and the coil stair stay clear
    m.tiles('objects', [[19, 17], [20, 17]], 'M');
    m.tiles('objects', [[25, 13], [26, 13]], 'e');
    m.set('objects', 18, 12, 'P').set('objects', 18, 13, 'P');
    m.set('objects', 28, 12, 'P').set('objects', 28, 13, 'P');
    m.set('objects', 20, 16, 'P');
    m.set('objects', 23, 12, 'J');
    // the coil room (17..27, 20..24): crystals ring the empty cradle (the hint at 22,21 stays clear)
    m.tiles('objects', [[20, 20], [24, 20], [20, 23], [24, 21]], 'i');
    m.tiles('objects', [[20, 24], [21, 24], [26, 22]], 'M');
    m.set('objects', 18, 23, 'e');
    // the west service shaft (1..3, 2..26): boilers, gears, crates; column 1 stays open
    m.set('objects', 2, 2, 'J');
    m.tiles('objects', [[2, 20], [2, 21]], 'J');
    m.tiles('objects', [[2, 16], [3, 16]], 'e');
    m.tiles('objects', [[2, 23], [3, 23]], 'C');
    m.tiles('objects', [[3, 13], [3, 14]], 'P');
    m.tiles('above', [[6, 1], [14, 1], [22, 1], [28, 1]], '*');
    m.set('objects', 1, 26, 'U');
    m.encounters({ steps: [16, 30], troops: [{ id: 'under_2', weight: 3 }, { id: 'under_3', weight: 3 }, { id: 'under_4', weight: 2 }] });

    m.ev([
      H.save('uc2_save_1', 21, 4),
      H.save('uc2_save_2', 6, 7),
      H.sign('uc2_sign', 25, 4, 'THE LOWEST SECTOR\nValve Room: turn all three valves to open the steam gate. Please. The gate is very heavy.'),
    ]);

    // ---- valve puzzle: three valves open the steam gate (a shortcut to the boss hall)
    const valve = (id, x, y, flag, label) => ({
      id, x, y, sprite: 'obj_beacon', trigger: 'action', solid: true, name: 'Valve',
      if: () => !G.flag(flag),
      run: async (c) => {
        c.sfx('door'); G.setFlag(flag, true);
        await who(c, 'Claret', 'claret', label, 'smirk');
        const all = G.flag('ch1_valve_a') && G.flag('ch1_valve_b') && G.flag('ch1_valve_c');
        if (all && !G.flag('ch1_gate_open')) {
          G.setFlag('ch1_gate_open', true);
          c.flash('#ffd27a', 24); c.shake(3, 30); c.sfx('shatter');
          await nar(c, 'Somewhere in the wall, a steam gate groans, hisses, and lifts its heavy brass shoulder. A shortcut to the Sentinel\'s hall is open.');
          if (G.map && G.map.refreshEvents) G.map.refreshEvents();
        } else if (!all) {
          await nar(c, 'The valve turns with a satisfied squeak. Steam sighs out of a pipe somewhere. Two more to go.');
        }
      },
    });
    m.ev([
      valve('uc2_valve_a', 19, 15, 'ch1_valve_a', 'Valve one. Red stripe means "keep your fingers." Turned.'),
      valve('uc2_valve_b', 22, 15, 'ch1_valve_b', 'Valve two. Turned, and the pressure gauge goes from sulky to cheerful.'),
      valve('uc2_valve_c', 26, 15, 'ch1_valve_c', 'Valve three. Turned. I owe my father a pint for teaching me this.'),
      // the steam gate (solid until the valves are done)
      { id: 'uc2_gate', x: 17, y: 5, sprite: 'obj_crate', trigger: 'action', solid: true, name: 'Steam gate',
        if: () => !G.flag('ch1_gate_open'),
        run: async (c) => { await nar(c, 'A brass gate, hissing and locked. It wants three valves turned in the room below.'); } },
    ]);

    // ---- the coil room (the Aether Coil)
    m.ev(H.chest('uc2_coil', 25, 23, 'aether_coil', 1));
    m.ev(H.chest('uc2_ether', 18, 22, 'hi_ether', 1));
    m.ev([{
      id: 'uc2_coil_hint', x: 22, y: 21, sprite: null, trigger: 'action', solid: false,
      run: async (c) => { await nar(c, 'A cradle of cold brass and quiet blue light. Something in here was once a heart. Something else took it. The cradle hums, sad and empty.'); },
    }]);

    // ---- the boss: the Brass Sentinel
    m.ev([{
      id: 'sentinel', x: 9, y: 6, sprite: 'obj_marigold_wheel', trigger: 'action', solid: true, name: 'Brass Sentinel',
      if: () => !G.flag('ch1_boss_sentinel'),
      run: async (c) => {
        await who(c, 'Brass Sentinel', 'unknown', 'INTRUDER. CALM IS THE ORDER OF THE HEARTH. WARMTH IS NOT TO BE SPENT. RETURN THE COIL.', 'angry');
        await who(c, 'Claret', 'claret', 'Oh, you\'re going to be like that, are you? Okay. Rowan, it has a bolt loose on its left side. Be my spanner.', 'angry');
        await me(c, 'Bolts, left side. I\'m on it!', 'happy');
        const r = await c.battle('boss_sentinel', {
          canEscape: false, loseOk: true, bg: 'steam', bgm: 'boss',
          intro: async (c) => {
            await c.hint('The Sentinel is ARMOURED: it has a lot of shields. Hit its weak points with the right weapon type, break the shields, and then hit hard while it is BROKEN.');
          },
          onHalf: async (c) => {
            c.flash('#ff9d4a', 24); c.shake(4, 24);
            await who(c, 'Claret', 'claret', 'Sparks everywhere! Its core is a mess! Keep hitting the left side, it\'s got a loose plate!', 'happy');
            await who(c, 'Brass Sentinel', 'unknown', 'THE HEARTH WILL... CALM... YOU.', 'worried');
          },
          outro: async (c) => {
            await nar(c, 'The Sentinel shudders. Its joints unlock one by one. Its last whisper is almost gentle: "Warmth... is not to be spent..."');
          },
        });
        if (r === 'win') {
          G.setFlag('ch1_boss_sentinel', true);
          c.sfx('levelup');
          await who(c, 'Claret', 'claret', 'Did it just say something nice? Don\'t be sentimental. Hold the lamp, we\'re going home. Home is the workshop. Be quick, I want to get the coil in before my hands stop shaking.', 'sad');
          await c.transfer('brasshaven_workshop', 6, 9, 'up');
        } else {
          await nar(c, 'The Sentinel\'s steam knocks you back into the hall. You pick yourself up, and the Lantern Waypoint hums a little louder for you.');
        }
      },
    }]);

    m.ev(H.auto('uc2_intro', async (c) => {
      c.titleCard('The Lowest Sector', 'Where the Coil was taken', 110);
      await c.wait(40);
      await nar(c, 'The air is thick and hot. A distant clock ticks in the wrong rhythm, as if it has been waiting for someone to come and set it right.');
    }, { once: true }));

    return m.finish({ onEnter: null });
  }
  buildUndercroft2();

  G.provide('ch1');
})();
