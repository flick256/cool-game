/* =====================================================================
 * LANTERNBOUND — ch4.js  (Chapter 4 "The Festival of Lanterns")
 * Maps: lumen_vale, lumen_inn, lumen_lake, ashen_road_1, ashen_road_2
 * Romance peak: the Festival day, the Lantern Night confessions, the
 * Vael ambush on the lake, the chase along the Ashen Road and the
 * Inquisitor Hale boss.
 * ===================================================================== */
(function () {
  'use strict';
  const G = window.G;
  const CANDS = ['claret', 'caspian', 'rook', 'seraphine', 'wren'];
  const SPEAK = { claret: 'Claret', caspian: 'Caspian', rook: 'Rook', seraphine: 'Sera', wren: 'Wren' };
  const ACTS = ['ch4_act_write', 'ch4_act_ring', 'ch4_act_food'];

  // ------------------------------------------------------------ small helpers
  const flag = (k) => !!G.flag(k);
  const setF = (k, v) => G.setFlag(k, v);
  const inParty = (id) => {
    try { return !!(G.party && G.party.members && G.party.members().indexOf(id) >= 0); }
    catch (e) { return false; }
  };
  const presentCands = () => CANDS.filter(inParty);
  const actsDone = () => ACTS.filter(flag).length;
  // tier >= 3 candidates who are actually travelling with the party (only they can be at the lake)
  function lakeEligible() {
    const els = (G.romance && G.romance.eligible) ? G.romance.eligible() : [];
    return CANDS.filter((id) => els.indexOf(id) >= 0 && inParty(id));
  }
  async function heart(c, id, n, reason) {
    if (id && inParty(id)) await c.affection(id, n, reason);
  }
  // asks the player which present candidate to spend a moment with; null = nobody in particular
  async function pickPartner(c, prompt) {
    const pres = presentCands();
    if (!pres.length) return null;
    const i = await c.choice(pres.map((id) => SPEAK[id]).concat(['Nobody in particular']), { prompt: prompt });
    return i < pres.length ? pres[i] : null;
  }
  const rowanName = () => (G.name ? G.name() : 'Rowan');
  function stall(m, x, y, roof) {
    m.set('objects', x, y, roof); m.set('objects', x + 1, y, roof);
    m.set('objects', x, y + 1, 'E'); m.set('objects', x + 1, y + 1, 'E');
    return m;
  }

  // ------------------------------------------------------------ LUMEN VALE layout (44 x 34)
  const VALE_NOGO = [
    { x: 14, y: 6, w: 16, h: 13 },   // plaza and market
    { x: 19, y: 17, w: 5, h: 17 },   // lantern avenue
    { x: 21, y: 16, w: 17, h: 4 },   // lakeside promenade
    { x: 14, y: 26, w: 15, h: 8 },   // ship pad yard and inn front
  ];
  const VALE_LAMPS = [[19, 10], [23, 10], [19, 16], [23, 16], [19, 21], [23, 21], [19, 28], [23, 28],
    [33, 16], [4, 17], [13, 17], [24, 6]];

  function lumenValeLayout() {
    const m = G.maps.build('lumen_vale', 44, 34, {
      name: 'Lumen Vale', bgm: 'festival', spawn: { x: 21, y: 32, dir: 'up' }, tint: 'rgba(40,20,70,0.18)',
    });
    // lake to the north-east: shallows ring, deep water, a long pier
    m.blob('ground', 36, 8, 8, 6, 'w');
    m.blob('ground', 36, 8, 7, 4, '~');
    m.rect('ground', 35, 12, 3, 5, 'b');
    // lantern-lit plaza, the avenue south to the ship pad, and the promenade along the shore
    m.rect('ground', 15, 8, 13, 9, 'l');
    m.rect('ground', 20, 17, 3, 16, 'l');
    m.rect('ground', 22, 17, 16, 2, 'l');
    m.set('objects', 21, 12, 'o');                       // fountain
    // dirt footpaths to the houses
    m.rect('ground', 6, 6, 1, 11, ':');
    m.rect('ground', 7, 16, 8, 1, ':');
    m.rect('ground', 3, 15, 4, 1, ':');
    m.rect('ground', 6, 25, 14, 1, ':');
    m.rect('ground', 23, 24, 10, 1, ':');
    m.rect('ground', 23, 30, 8, 1, ':');
    // houses (roof rows over a facade row; the door is the bottom centre)
    m.house(3, 2, 6, 4, { roof: '2', wall: 'X' });                 // door (6,5)
    m.house(1, 11, 4, 4, { roof: '4', wall: 'X' });                // door (3,14)
    m.house(3, 21, 6, 4, { roof: '5', wall: 'W' });                // door (6,24)
    m.house(30, 20, 6, 4, { roof: '3', wall: 'X', doorAt: 2 });    // door (32,23)
    m.house(27, 26, 7, 4, { roof: '1', wall: 'W', doorAt: 3 });    // Lumen inn, door (30,29)
    // market stalls: awning + table, the keeper stands just in front
    stall(m, 16, 9, '5');     // lantern seller   -> keeper (16,11)
    stall(m, 24, 9, '6');     // smith            -> keeper (24,11)
    stall(m, 26, 12, '2');    // ring toss        -> keeper (26,14)
    stall(m, 26, 20, '2');    // food stalls      -> keeper (26,22)
    // lantern-writing booth: long table with the scribe on the north side
    m.set('objects', 12, 12, 'E'); m.set('objects', 13, 12, 'E');
    m.set('objects', 14, 9, 's');                        // statue
    VALE_LAMPS.forEach((p) => m.set('objects', p[0], p[1], 'L'));
    // hanging paper-lantern strings (above layer, walkable)
    m.hline('above', 15, 7, 13, '*');
    m.hline('above', 20, 20, 3, '*');
    m.hline('above', 22, 16, 16, '*');
    // nature: trees, pines, bushes, flower beds and tall grass on open grass only
    m.scatter('objects', 'T', 16, { seed: 11, on: '.', avoid: VALE_NOGO });
    m.scatter('objects', 'N', 10, { seed: 12, on: '.', avoid: VALE_NOGO });
    m.scatter('objects', 'B', 14, { seed: 13, on: '.', avoid: VALE_NOGO });
    m.scatter('objects', 'F', 34, { seed: 14, on: '.', avoid: VALE_NOGO });
    m.scatter('objects', 'G', 14, { seed: 15, on: '.', avoid: VALE_NOGO });
    m.scatter('objects', 'R', 3, { seed: 16, on: '.', avoid: VALE_NOGO });
    return m;
  }

  // ------------------------------------------------------------ festival reactions (speaker = candidate)
  const WRITE_REACT = {
    claret: 'Claret reads the lantern twice, then tucks it into her jacket with ruthless casualness. "Don\'t look at me. I\'m checking the paper quality."',
    caspian: 'Caspian holds the paper as if it might tear from sheer significance. "I will keep this. I hope that is not too formal a thing to say."',
    rook: 'Rook laughs, then goes quiet, then laughs again. "Cheat. You cheated. Nobody writes something that nice on purpose."',
    seraphine: 'Sera presses the lantern to her chest, eyes bright. "Then I will sing it to the water, Rowan. Just the one line. Just for you."',
    wren: 'Wren reads it out loud, flat and literal, then looks at you like the answer surprised them. "Oh. Okay. That is a good wish."',
  };
  const RING_REACT = {
    claret: '"Left hand, right hand, both at once? You\'re doing it wrong. Let me show you. Actually, watch how I do it."',
    caspian: '"The ring keeper is cheating, I believe. Do not tell him I said so. He has a very large cousin."',
    rook: '"Oh, you think you can beat me? Careful, I have never once in my life lost at a game of chance."',
    seraphine: '"You have lovely aim. Mine is terrible, but I\'m going to pretend it\'s on purpose so you feel tall."',
    wren: '"Three rings. Three pegs. Your hands are doing the thing hands do when they want to be a bird."',
  };
  const FOOD_REACT = {
    claret: '"Honey and bun. Fine. Sticky hands are a design flaw, but I\'ll allow it this once."',
    caspian: '"You remembered I skip the meat pies. I will remember this forever. Thank you, Rowan."',
    rook: '"Sweet bun, sweet partner, sweet night. You\'re going to spoil me. Keep doing it."',
    seraphine: '"Oh, lavender sugar! You know me so well. Half of this bun is going to the swan on the water."',
    wren: '"I don\'t like sweet buns. But I like that you asked. Give me the warm half, and don\'t watch me eat it."',
  };

  // ------------------------------------------------------------ LUMEN VALE events + finish
  function lumenValeEvents(m) {
    const H = G.maps.helpers;

    // -- the ship pad (spawn is just north of it) and a Lantern Waypoint on the west side of the square
    m.ev(H.shipPad(21, 33));
    m.ev(H.save('ch4_vale_save', 12, 18));

    // -- arrival: the Marigold lands, Maren and Pip reunite with Rowan (once)
    m.ev(H.auto('ch4_arrival', async (c) => {
      setF('ch4_started'); c.chapter(4); c.bgm('festival');
      await c.wait(30);
      await c.say(null, 'Lanterns drift over Lumen Vale like a second sunset. Music rolls off the lake, and somewhere a bell rings with great enthusiasm.');
      await c.say(null, 'Above the rooftops a patched airship sinks toward the pad, one engine coughing as if it has opinions about the landing.');
      await c.camera(21, 26, 50);
      await c.walkTo('ch4_maren', 20, 31);
      await c.say('Maren', 'You\'ve gotten taller. Or I\'ve gotten shorter.', { face: 'maren' });
      const replies = [
        ['I missed you, Maren.', 'earnest'],
        ['Shorter. Definitely shorter.', 'teasing'],
        ['I... you\'re really here?', 'flustered'],
        ['I came back for you. Ready to fight?', 'brave'],
      ];
      const i = await c.choice(replies.map((r) => r[1][0].toUpperCase() + r[1].slice(1) + ': "' + r[0] + '"'), { prompt: 'How do you answer?' });
      const tone = replies[i][1];
      setF('ch4_tone', tone);
      await c.say(rowanName(), replies[i][0], { face: 'rowan' });
      const back = {
        earnest: 'Mm. Good. Took you long enough to say it, didn\'t it?',
        teasing: 'Cheeky. You\'ve been spending time with the wrong people, I can tell.',
        flustered: 'Well, don\'t faint on my doorstep. Your hands are still cold, I see. Still a little wickless, eh?',
        brave: 'There\'s my kid. Don\'t get yourself killed. I just got you back, all right?',
      };
      await c.say('Maren', back[tone], { face: 'maren' });
      await c.walkTo('ch4_pip', 22, 31);
      await c.say('Pip', 'ROWAN! You\'re late! Pip grew, you know. Not as much as Pip hoped, but a bit!', { face: 'pip' });
      await c.say('Maren', 'Pip, stop climbing the lamp posts. You\'re a lamplighter, not a squirrel.', { face: 'maren' });
      await c.say('Maren', 'The festival runs all day. Go on, have some fun. We light the lanterns at the lake when the sky goes gold.', { face: 'maren' });
      await c.camReset(30);
    }, { if: () => !flag('ch4_started') }));

    // -- Maren: gives the Lantern Night cue once the day has had at least two activities
    m.ev({
      id: 'ch4_maren', x: 18, y: 30, sprite: 'maren', dir: 'right', trigger: 'action', solid: true, move: 'still',
      run: async (c) => {
        const n = actsDone();
        if (n >= 2) {
          setF('ch4_night_cue');
          await c.say('Maren', 'Dusk is nearly here, Rowan. Lantern Night starts the moment the first lantern goes up on the lake.', { face: 'maren' });
          await c.say('Maren', 'Board the lantern barge at the end of the pier when you\'re ready. And don\'t make me come find you.', { face: 'maren' });
        } else if (n === 1) {
          await c.say('Maren', 'Not yet. You haven\'t had enough fun. Try two of the things on the square first. Then we talk.', { face: 'maren' });
        } else {
          await c.say('Maren', 'You\'re standing here? In the middle of a festival? Go! Lantern-writing, ring toss, the food stalls. Shoo.', { face: 'maren' });
        }
      },
    });

    // -- Pip: wanders around the square, comic relief and a little bit of heart
    m.ev({
      id: 'ch4_pip', x: 25, y: 14, sprite: 'pip', dir: 'down', trigger: 'action', solid: true, move: 'wander',
      run: async (c) => {
        const wrote = flag('ch4_wrote_for');
        await c.say('Pip', wrote
          ? 'Pip saw what you wrote on your lantern! Pip is not saying anything. Pip is just looking at you very meaningfully.'
          : 'Pip has been watching the lake all day. Lantern Night is when everybody tells the truth. Pip is not sure that\'s real.', { face: 'pip' });
        await c.say('Pip', 'Pip is going to write a lantern about how Pip is the best lamplighter in the whole Vale. Pip needs a witness.', { face: 'pip' });
      },
    });

    // -- festival-goers (lively, a few clues about the Tithe)
    m.ev(H.npc('ch4_f1', 23, 14, 'villager_f1', [
      'The lantern seller says the brass ones float higher. He also says that about everything he sells.',
      'My mother-in-law says Lantern Night is for courting. I told her I\'m already married. She said then it\'s for courting again.',
    ]));
    m.ev(H.npc('ch4_f2', 13, 15, 'child1', [
      'Are the lanterns really wishes? Mum says they\'re just paper. Dad says it doesn\'t matter if they\'re paper, as long as you mean it.',
    ], { name: 'Little Tam' }));
    m.ev(H.npc('ch4_f3', 17, 13, 'elder', [
      'Forty years I\'ve watched this lake. The square lamps hum louder every year. I hear it when I sleep, like a hive.',
      'Don\'t tell the Order I said so. They already gave me a pamphlet about it.',
    ], { name: 'Old Jory' }));
    m.ev(H.npc('ch4_f4', 29, 18, 'villager_m2', [
      'I bought a lantern for my wife. She bought one for me. We both bought one for the dog. The dog is not impressed.',
    ]));
    m.ev(H.npc('ch4_f5', 35, 18, 'noble', [
      'Balcony seats on the lake are fully booked. I know this because I booked all of them. Twice.',
    ], { name: 'Lord Ambrose' }));
    m.ev(H.npc('ch4_f6', 12, 27, 'cat', [
      'The cat ignores you with magnificent indifference. It is clearly the only creature here not excited about Lantern Night.',
    ], { name: null }));
    m.ev(H.npc('ch4_f7', 9, 27, 'dog', [
      'The dog is wearing a tiny paper lantern on its collar. It is staring at you with enormous dignity.',
    ], { name: null }));

    // -- shops and the smith
    m.ev(H.shop('ch4_lantern_shop', 16, 11, 'merchant', 'lumen_shop',
      'Lanterns! Glass, paper, or brass. Each one remembers a wish, provided you don\'t drop it.', 'Lantern Seller'));
    m.ev(H.shop('ch4_smith', 24, 11, 'engineer', 'lumen_smith',
      'Hinge jammed? Lantern hook rusted? Wish-proof hinge? I do all of them.', 'Tovi the Smith'));

    // -- ACTIVITY 1: lantern-writing booth (heart choice: who the lantern is for)
    m.ev({
      id: 'ch4_writing', x: 13, y: 11, sprite: 'elder', dir: 'down', trigger: 'action', solid: true, move: 'still',
      run: async (c) => {
        if (flag('ch4_act_write')) {
          await c.say('Scribe', 'Your lantern is already out on the water, floating like it owns the lake. Go and enjoy it.', { face: 'unknown' });
          return;
        }
        setF('ch4_act_write');
        await c.say('Scribe', 'Lantern writing! One wish, one name, or one terrible joke. The paper is cheap and the light lasts all night.', { face: 'unknown' });
        const msg = await c.choice([
          '"For the ones who keep the lamp lit."',
          '"For someone who makes me laugh, against my will."',
          '"For home, wherever that turns out to be."',
        ], { prompt: 'What do you write?' });
        const who = await pickPartner(c, 'Who is the lantern for?');
        if (who) {
          setF('ch4_wrote_for', who);
          await heart(c, who, 6, 'A lantern with your message');
          if (msg === 1) await heart(c, who, 2, 'You made them laugh');
          await c.say(SPEAK[who], WRITE_REACT[who], { face: who, expr: 'blush' });
        } else {
          await c.say(null, 'You send the lantern up for everyone. The scribe nods approvingly. "Very diplomatic. Next!"');
        }
        await c.sfx('lantern');
        await c.flash('#ffd27a', 30);
      },
    });

    // -- ACTIVITY 2: ring toss (heart choice: challenge a partner)
    m.ev({
      id: 'ch4_ringtoss', x: 26, y: 14, sprite: 'villager_m1', dir: 'up', trigger: 'action', solid: true, move: 'still',
      run: async (c) => {
        if (flag('ch4_act_ring')) {
          await c.say(null, 'The ring keeper has moved all the rings to the far pegs. He will not discuss it.');
          return;
        }
        setF('ch4_act_ring');
        await c.say('Ring Keeper', 'Three rings, three coins. Hit the peg and the prize is yours. Miss, and I keep your dignity. Go on.', { face: 'unknown' });
        const style = await c.choice(['Toss three rings', 'Toss with a flourish', 'Walk away, you\'re terrible'], { prompt: 'Ring toss' });
        if (style === 2) { await c.say(null, 'You walk off with your three coins and only a little dignity. Rowan promises to practise.'); return; }
        const who = await pickPartner(c, 'Who do you challenge?');
        if (who) {
          await heart(c, who, 4, 'A ring toss rivalry');
          await c.say(SPEAK[who], RING_REACT[who], { face: who, expr: 'smirk' });
        }
        await c.addItem('ribbon', 1);
      },
    });

    // -- ACTIVITY 3: food stalls (heart choice: share the sweet buns)
    m.ev({
      id: 'ch4_food', x: 26, y: 22, sprite: 'villager_f2', dir: 'up', trigger: 'action', solid: true, move: 'still',
      run: async (c) => {
        if (flag('ch4_act_food')) {
          await c.say(null, 'The food keeper is busy arguing with a goose about the last honey bun. The goose is winning.');
          return;
        }
        setF('ch4_act_food');
        await c.say(null, 'Honey-glazed sweet buns, still warm, sold by a woman who will not accept a compliment and gives you a second bun anyway.');
        const who = await pickPartner(c, 'Who gets the second bun?');
        if (who) {
          await heart(c, who, 4, 'Shared sweet buns');
          await c.say(SPEAK[who], FOOD_REACT[who], { face: who, expr: 'happy' });
        } else {
          await c.say(null, 'You eat both buns yourself, on a bench, watching the lanterns. Nobody is judging. Much.');
        }
      },
    });

    // -- the lantern barge at the pier end: the way to Lantern Night (gated by the cue)
    m.ev({
      id: 'ch4_lake_barge', x: 35, y: 12, w: 1, h: 1, sprite: null, trigger: 'step', solid: false,
      if: () => flag('ch4_night_cue') && !flag('ch4_lantern_night'),
      run: async (c) => {
        c.sfx('door');
        await c.say(null, 'The lantern barge creaks out across the water toward the far shore, where the release lanterns are already waiting.');
        await c.transfer('lumen_lake', 10, 14, 'up');
      },
    });
    m.ev({
      id: 'ch4_lake_wait', x: 35, y: 12, w: 1, h: 1, sprite: null, trigger: 'step', solid: false,
      if: () => !flag('ch4_night_cue') && !flag('ch4_lake_hint'),
      run: async (c) => {
        setF('ch4_lake_hint');
        await c.say(null, 'The barge is tied up. The boatman shrugs. "Lantern Night starts at dusk, friend. Not a minute before."');
      },
    });
    return m;
  }

  function finishLumenVale() {
    const m = lumenValeLayout();
    lumenValeEvents(m);
    return m.finish();
  }

  // ------------------------------------------------------------ LUMEN INN (16 x 12 interior)
  function finishLumenInn() {
    const H = G.maps.helpers;
    const m = G.maps.build('lumen_inn', 16, 12, {
      name: 'The Lantern Inn', bgm: 'tavern', interior: true, spawn: { x: 7, y: 10, dir: 'up' },
    });
    m.room(0, 0, 16, 12, { floor: 'f', wall: 'X', topWall: 2 });
    m.rect('ground', 5, 8, 6, 2, 'c');                     // carpet by the hearth
    m.rect('objects', 2, 2, 5, 1, 'S');                    // shelves behind the counter
    m.rect('objects', 2, 4, 5, 1, 'E');                    // counter
    m.set('objects', 1, 5, 'Y'); m.set('objects', 1, 6, 'Y');   // bookshelves on the west wall
    m.set('objects', 12, 2, 'I');                          // hearth
    m.set('objects', 13, 6, 'Z'); m.set('objects', 13, 7, 'Z');  // a bed
    m.set('objects', 9, 7, 'E'); m.set('objects', 10, 7, 'E');   // a table
    m.set('objects', 9, 8, 'H'); m.set('objects', 10, 8, 'H');   // chairs
    m.set('objects', 1, 9, 'U'); m.set('objects', 1, 10, 'U');   // barrels
    m.set('objects', 14, 9, 'F'); m.set('objects', 14, 10, 'F'); // flowers
    m.set('objects', 3, 10, 'L');                          // lamp post
    m.set('objects', 7, 11, 'D');                          // exit door
    m.hline('above', 2, 1, 12, '*');                       // paper lanterns strung along the ceiling
    m.ev([
      H.innkeeper('ch4_innkeeper', 4, 3, 'innkeeper', 30, 'Brindle'),
      H.npc('ch4_inn_couple', 6, 9, 'villager_f2', [
        'We came for the lanterns and stayed for the bread. Don\'t tell the baker we said so.',
        'Our daughter keeps asking if her wick will be bright enough. I told her the lamps are just for looking at, love.',
      ], { name: 'Tamsin' }),
      H.npc('ch4_inn_traveler', 11, 9, 'noble', [
        'Every lamp in Auren hums the same tune, you know. I used to think it was lovely. Now I think it sounds like someone breathing hard.',
      ], { name: 'Hollis' }),
      ...H.chest('lumen_inn', 14, 4, 'hi_potion', 1),
      H.transfer(7, 11, 'lumen_vale', 30, 30, 'up', { id: 'ch4_inn_exit' }),
    ]);
    return m.finish();
  }

  // ------------------------------------------------------------ LUMEN LAKE (28 x 20 shoreline, night)
  const LAKE_CAND_SPOTS = { claret: [5, 14], caspian: [6, 15], rook: [14, 15], seraphine: [15, 14], wren: [17, 15] };
  function lumenLakeLayout() {
    const m = G.maps.build('lumen_lake', 28, 20, {
      name: 'Lumen Lake', bgm: 'festival', spawn: { x: 10, y: 14, dir: 'up' }, tint: 'rgba(8,14,46,0.42)',
    });
    m.rect('ground', 0, 0, 22, 10, '~');                  // lake
    m.rect('ground', 0, 10, 22, 2, 'w');                  // shallows
    m.rect('ground', 0, 12, 28, 2, '_');                  // sand shore
    m.rect('ground', 9, 4, 3, 10, 'b');                   // release pier, runs out into the lake
    // the hill on the east side with its single old tree
    m.set('objects', 24, 3, 'T'); m.set('objects', 25, 4, 'B'); m.set('objects', 23, 6, 'B');
    m.set('objects', 22, 8, 'R'); m.set('objects', 26, 7, 'R'); m.set('objects', 24, 8, 'R');
    m.set('objects', 26, 2, 'G'); m.set('objects', 23, 2, 'G');
    // lantern stands and lamps on the shore
    m.set('objects', 8, 13, 'L'); m.set('objects', 12, 13, 'L');
    m.set('objects', 5, 13, 'C'); m.set('objects', 16, 13, 'C'); m.set('objects', 14, 16, 'U');
    m.set('objects', 1, 16, 'T'); m.set('objects', 3, 18, 'T'); m.set('objects', 25, 15, 'T');
    m.set('objects', 26, 18, 'N'); m.set('objects', 20, 18, 'N'); m.set('objects', 22, 16, 'B');
    m.set('objects', 1, 12, 'R'); m.set('objects', 20, 13, 'R');
    m.scatter('objects', 'G', 12, { seed: 21, on: 'w_', avoid: [{ x: 2, y: 13, w: 23, h: 3 }] });
    m.scatter('objects', 'F', 14, { seed: 22, on: '.', avoid: [{ x: 2, y: 13, w: 23, h: 4 }, { x: 8, y: 0, w: 4, h: 14 }] });
    m.hline('above', 4, 8, 14, '*');                      // lantern strings across the shore
    return m;
  }

  function lumenLakeEvents(m) {
    const H = G.maps.helpers; // eslint-disable-line no-unused-vars
    // candidates standing on the shore during Lantern Night (only the ones travelling with Rowan)
    for (const id of CANDS) {
      const p = LAKE_CAND_SPOTS[id];
      m.ev({
        id: 'ch4_lk_' + id, x: p[0], y: p[1], sprite: id, dir: 'right', trigger: 'action', solid: false, move: 'still',
        if: () => flag('ch4_lantern_night') && inParty(id),
        run: async (c) => {
          await c.say(SPEAK[id], 'Whatever you choose tonight, Rowan, I am glad you\'re here to choose it.', { face: id });
        },
      });
    }
    m.ev({
      id: 'ch4_lk_maren', x: 8, y: 14, sprite: 'maren', dir: 'right', trigger: 'action', solid: false, move: 'still',
      if: () => flag('ch4_lantern_night'),
      run: async (c) => { await c.say('Maren', 'Don\'t you dare cry before the lanterns go up. I\'m not wiping your nose twice.', { face: 'maren' }); },
    });
    m.ev({
      id: 'ch4_lk_pip', x: 13, y: 14, sprite: 'pip', dir: 'left', trigger: 'action', solid: false, move: 'still',
      if: () => flag('ch4_lantern_night'),
      run: async (c) => { await c.say('Pip', 'Pip is holding the lantern string. Pip is not letting go. Pip is very serious.', { face: 'pip' }); },
    });
    // ambush cast: hidden until the lanterns turn cold
    m.ev({
      id: 'ch4_lk_vael', x: 5, y: 10, sprite: 'vael', dir: 'down', trigger: 'action', solid: false, move: 'still',
      if: () => flag('ch4_vael_on'),
      run: async (c) => { await c.say('Warden Vael', 'Please, stay where you are. The lanterns are only the beginning, and they do so enjoy an audience.', { face: 'vael' }); },
    });
    m.ev({
      id: 'ch4_lk_hale', x: 16, y: 12, sprite: 'hale', dir: 'left', trigger: 'action', solid: false, move: 'still',
      if: () => flag('ch4_ambush'),
      run: async (c) => { await c.say('Inquisitor Hale', 'I told the others you would look up when they shouted. You didn\'t. I am, I confess, impressed.', { face: 'hale' }); },
    });
    m.ev({
      id: 'ch4_lk_g1', x: 12, y: 12, sprite: 'guard', dir: 'right', trigger: 'action', solid: false, move: 'still',
      if: () => flag('ch4_ambush'),
      run: async (c) => { await c.say(null, 'An Order guard in white and gold, raising a lantern-rifle with a face that has clearly been told this is necessary.'); },
    });
    m.ev({
      id: 'ch4_lk_g2', x: 19, y: 12, sprite: 'guard', dir: 'left', trigger: 'action', solid: false, move: 'still',
      if: () => flag('ch4_ambush'),
      run: async (c) => { await c.say(null, 'The second guard does not look up from the glow of his lantern. The light on his face is very cold.'); },
    });
    return m;
  }

  function finishLumenLake() {
    const m = lumenLakeLayout();
    lumenLakeEvents(m);
    // the Lantern Night set piece (auto, runs once when the cue is set)
    m.ev(G.maps.helpers.auto('ch4_lantern_night', async (c) => { await lanternNight(c); },
      { if: () => flag('ch4_night_cue') }));
    return m.finish();
  }

  // ------------------------------------------------------------ LANTERN NIGHT (lumen_lake set piece)
  const ASK = {
    claret: ['Right. Don\'t say anything. I calculated how these lanterns drift, and they float prettier with two people on the string.',
      'So. Share one with me? I\'m fine. The lantern is not fine. It keeps wobbling.'],
    caspian: ['Rowan. I have rehearsed this for an hour and I am still not prepared in the slightest.',
      'Would you share a lantern with me? I would be honoured. I would also very much like it to mean something.'],
    rook: ['Don\'t laugh. I have lost every bet I placed tonight, and now I\'m betting everything on this.',
      '"Share a lantern with me, cherub?" Say no and I\'ll pretend I was joking the whole time. I\'m very good at that.'],
    seraphine: ['I sang a hymn over my lantern. Then I sang a different one, because the first one was about somebody else.',
      'Will you share mine? I think it wants to be shared. And, I think, so do I.'],
    wren: ['I want to share a lantern with you. I\'m told the correct phrase is "would you". Would you?',
      'I didn\'t bring moss. I brought a wish and a small fox that won\'t stop following me. You can have the wish.'],
  };
  const REJECT = {
    claret: 'Claret exhales through her nose and smiles, a little crooked. "Fine. I\'ll stop calculating. That was a good sky, anyway."',
    caspian: '"Then I am glad you have so many people to hold your light, Rowan. Truly. Go on. I will still be proud to stand beside you."',
    rook: '"Ha! Knew it. Don\'t worry, cherub. I\'m far too pretty to be left alone for long. Watch me try."',
    seraphine: '"Then we keep one lantern for the whole circle. I like the sound of everyone laughing at once."',
    wren: '"Okay. That is fine. The moths were going to be rude about it anyway." They shrug, and somehow look relieved.',
  };
  const FRIENDS = {
    claret: '"Oh, fine. Hold it up. Higher. I\'m going to fix that wobble, I\'ve decided. Don\'t argue with me, I\'m emotional."',
    caspian: '"Shoulder to shoulder, my friends. This is a finer use of an evening than any oath I ever swore."',
    rook: '"Crowded, warm, ridiculous. Honestly the best con I\'ve ever pulled off. Everyone here is my accomplice."',
    seraphine: '"We\'ll sing one line together. Just one. It is the only hymn I ever truly believed."',
    wren: '"Many people in one small space. The foxes would like this. I am, very reluctantly, glad."',
  };
  const AMBUSH_SPOTS = [[9, 11], [11, 11], [9, 9], [11, 9], [10, 12]];

  // one candidate walks up to the pier and asks, shyly
  async function askFrom(c, id, idx) {
    const spot = AMBUSH_SPOTS[idx % AMBUSH_SPOTS.length];
    const eid = 'ch4_lk_' + id;
    await c.camera(spot[0], spot[1], 30);
    await c.walkTo(eid, spot[0], spot[1]);
    await c.emote(eid, 'heart');
    if (flag('ch4_wrote_for') === id) {
      await c.say(SPEAK[id], 'You wrote something on a lantern today. I saw it. Let me say the rest out loud before I lose my nerve.', { face: id, expr: 'blush' });
    }
    for (const ln of ASK[id]) await c.say(SPEAK[id], ln, { face: id, expr: 'blush' });
    await c.camReset(30);
  }

  // the warm 'everyone together' beat (no single confession)
  async function friendsNight(c, ids) {
    await c.say('Maren', 'Oi, all of you, out onto the pier! Nobody sits this one out. I\'m not spending my lantern on a single soul.', { face: 'maren' });
    await c.say('Pip', 'Pip is sharing with EVERYBODY! That is the rule! Pip made the rule just now and it is a very good rule!', { face: 'pip' });
    await c.say(null, 'You hold one lantern and four hands close around it. It is the most ordinary wonderful thing you have ever done.');
    for (const id of ids) {
      await c.say(SPEAK[id], FRIENDS[id], { face: id, expr: 'happy' });
    }
  }

  async function lanternNight(c) {
    setF('ch4_lantern_night');
    c.follow(false);
    c.bgm('festival');
    await c.setPos('player', 10, 10, 'up');
    await c.wait(40);
    await c.camera(10, 8, 60);
    await c.say(null, 'The lake is a mirror of paper lights: gold, rose, a few green ones Pip insists on. Thousands of wishes, waiting for the first breath of wind.');
    await c.say('Maren', 'Lantern Night. My word. I haven\'t seen this lake lit like this since before the Order turned every lamp all the way up.', { face: 'maren' });

    // -- pre-scene: earlier choices show up here (writing booth, ring toss, the tone at the arrival)
    await c.say('Pip', flag('ch4_wrote_for')
      ? 'Pip saw what you wrote on your lantern! Pip won\'t say who. Pip is just watching you very, very closely.'
      : 'Pip wrote a lantern about Pip. It is a very important lantern. Pip is not asking you to read it.', { face: 'pip' });
    const nerveLines = ['Ready. Let\'s do this.', 'Give me a minute to breathe.', 'Maybe I should hide in the reeds.'];
    const nerve = await c.choice(nerveLines.map((l) => '"' + l + '"'), { prompt: 'Are you ready?' });
    setF('ch4_nerve', nerve);
    await c.say(rowanName(), nerveLines[nerve], { face: 'rowan' });
    if (nerve === 2) await c.say('Maren', 'Hide in the reeds and I\'ll haul you out by the collar, Rowan. Stand up straight.', { face: 'maren' });
    else if (nerve === 1) await c.say('Pip', 'Pip will hold your lantern while you breathe. Pip is very good at holding things.', { face: 'pip' });
    else await c.say('Maren', 'That\'s my kid. Pip, shove over. Let them have the good spot.', { face: 'maren' });
    await c.say('Maren', 'We\'ll be right over here, trying very hard not to watch.', { face: 'maren' });
    c.bgm('romance');
    await c.wait(20);

    // -- the staged asks, then one choice
    const els = lakeEligible();
    let chosen = null;
    if (!els.length) {
      const pres = presentCands();
      await friendsNight(c, pres);
      for (const id of pres) await heart(c, id, 2, 'Lantern Night with friends');
    } else {
      for (let i = 0; i < els.length; i++) await askFrom(c, els[i], i);
      const labels = els.map((id) => SPEAK[id]).concat(['Stay with everyone']);
      const pick = await c.choice(labels, { prompt: 'Who do you share your lantern with?' });
      chosen = pick < els.length ? els[pick] : null;
      setF('ch4_lantern_choice', chosen || 'all');
      if (chosen) {
        await c.camera(10, 10, 40);
        await c.runScene(chosen + '_confession');
      } else {
        await friendsNight(c, els);
      }
      // the ones who were not chosen take it graciously
      for (const id of els) {
        if (id === chosen) continue;
        await c.emote('ch4_lk_' + id, 'heart');
        await c.say(SPEAK[id], REJECT[id], { face: id, expr: 'smirk' });
        await heart(c, id, 2, 'Kind words at the lake');
      }
    }
    await c.flash('#ffd27a', 40);
    await c.sfx('lantern');
    await c.say(null, 'Then the first lantern goes up. Then a hundred more. The whole lake breathes gold, and for one long moment nothing in the world is cold.');
    await c.camReset(40);
    await c.wait(30);

    // -- the ambush
    await ambush(c);
    c.follow(true);
    await c.transfer('ashen_road_1');
  }

  async function ambush(c) {
    setF('ch4_ambush');
    c.bgm('tense');
    await c.shake(3, 30);
    await c.flash('#8fd6ff', 40);
    await c.say(null, 'Every lantern on the lake flickers at once. The flames turn cold and blue and stream away across the water toward the great Anchor beacon on the far shore, the lamp that lights the whole vale.');
    await c.shake(6, 60);
    setF('ch4_vael_on');
    await c.wait(40);
    await c.say('Warden Vael', 'Good evening, Rowan. Please don\'t stand on my account. The lanterns are lovely, aren\'t they? Each one is a little wick, set adrift to be seen.', { face: 'vael' });
    await c.say('Warden Vael', 'Every lamp in Auren drinks a little warmth from the people who live beneath it. The Order calls it a blessing. The Tithe.', { face: 'vael' });
    await c.say('Warden Vael', 'It is a leash. The Hearthstar has been starving for a century, and the Order has been feeding it your warmth. You feel it, don\'t you? You\'ve always been a little cold.', { face: 'vael' });
    await c.say('Warden Vael', 'And you, Rowan, without a wick. The Order called you an omen. I call you what you are. The Heart. The star\'s true core, hidden in a child.', { face: 'vael' });
    await c.say('Warden Vael', 'The Anchors were never built to warm the world. They pour the Tithe into the star, and the star runs on the Heart. Come to the Spire willingly.', { face: 'vael' });
    await c.say('Warden Vael', 'You have until dawn. After that I shall send my Inquisitor to fetch you. He is very thorough, and he does so dislike being disappointed.', { face: 'vael' });
    await c.say(null, 'The image folds back into the lanterns like a bad dream. Somewhere on the shore a boot scrapes on stone.');
    await c.shake(8, 40);
    await c.flash('#c8f0ff', 20);
    await c.say('Inquisitor Hale', 'Rowan. Forgive the interruption. Warden Vael has been patient, but patience is not my strength. Please come quietly. My soldiers are less courteous than I am.', { face: 'hale' });
    await c.say(rowanName(), 'Not tonight, Inquisitor.', { face: 'rowan' });
    await c.say(null, 'Hale lifts one gloved hand. Lanterns fall out of the sky like hail. The pier cracks under your feet, and the cold light closes in along the shore.');
    await c.say('Maren', 'Go. I\'ve got Pip. GO, Rowan, and don\'t you look back at that man as if he\'s your friend!', { face: 'maren' });
    await c.sfx('escape');
    await c.say(null, 'You run. Behind you the lake blazes blue and the beacon swings its beam toward the Spire. Your legs are the only ship you have left tonight.');
  }

  // ------------------------------------------------------------ ASHEN ROAD (hollow-blighted road to the Spire)
  const HAND = {
    claret: '"Don\'t let go. If you fall I will be furious, and I will have to climb down after you, and I do not do stairs for anyone."',
    caspian: '"I have you. Watch the rubble, not me. I will not let you fall, Rowan. Not while I am standing."',
    rook: '"Lovely grip. Don\'t worry, I\'ve run from worse, and I\'m very fast when I\'m scared."',
    seraphine: '"Your hand is cold. Give it here. I can warm it enough to get us the rest of the way."',
    wren: '"You are shaking. The foxes do that too, sometimes. Hold on. It is only ash."',
  };

  function finishAshenRoad1() {
    const H = G.maps.helpers;
    const m = G.maps.build('ashen_road_1', 40, 24, {
      name: 'The Ashen Road', bgm: 'ashen_road', ground: 'y', spawn: { x: 2, y: 12, dir: 'right' }, tint: 'rgba(30,10,40,0.12)',
    });
    m.blob('ground', 9, 5, 5, 3, 'h');
    m.blob('ground', 27, 18, 6, 3, 'h');
    m.blob('ground', 19, 19, 3, 2, 'h');
    m.rect('ground', 0, 10, 40, 5, ':');                  // the packed road under the ash
    m.set('objects', 8, 3, 'z'); m.set('objects', 30, 4, 'z'); m.set('objects', 14, 21, 'z'); m.set('objects', 33, 21, 'z');
    m.rect('objects', 22, 8, 2, 1, 'r');
    m.rect('objects', 16, 16, 1, 2, 'r');
    const band = { x: 0, y: 9, w: 40, h: 7 };
    m.scatter('objects', 'd', 16, { seed: 31, on: 'yh', avoid: [band] });
    m.scatter('objects', 'r', 10, { seed: 32, on: 'yh', avoid: [band] });
    m.ev([
      H.sign('ch4_sign_r1', 6, 9, 'THE ASHEN ROAD\nBy order of the Hearth Order: no lantern shall be lit beyond this point.'),
      H.save('ch4_save_r1a', 4, 9),
      H.save('ch4_save_r1b', 19, 9),
      ...H.chest('ashen_road_1_a', 14, 14, 'hi_potion', 1),
      ...H.chest('ashen_road_1_b', 34, 16, 'ether', 1),
      H.transfer(39, 12, 'ashen_road_2', undefined, undefined, 'right', { id: 'ch4_road_east' }),
      H.auto('ch4_chase', async (c) => {
        setF('ch4_chase_done');
        c.bgm('tense');
        await c.say(null, 'The Ashen Road runs east toward the Spire through a land that has forgotten its colours. Ash falls like soft snow. Wisps drift in the dead trees.');
        await c.shake(4, 40);
        await c.say(null, 'Behind you, Order soldiers come over the crest with lanterns raised. A cannon shot splits a dead tree in two. The Marigold is nowhere to be seen, and a damaged airship is no use under that kind of fire.');
        await c.say(rowanName(), 'Keep moving. Don\'t stop for anything.', { face: 'rowan' });
        const who = await pickPartner(c, 'Who takes your hand over the rubble?');
        if (who) {
          await heart(c, who, 3, 'Hands over the rubble');
          await c.say(SPEAK[who], HAND[who], { face: who, expr: 'worried' });
        } else {
          await c.say(null, 'You scramble over the rubble alone, which is somehow worse. Nobody says anything. Everybody breathes.');
        }
        c.bgm('ashen_road');
      }, { if: () => flag('ch4_ambush') && !flag('ch4_chase_done') }),
    ]);
    m.encounters({ steps: [14, 24], troops: [{ id: 'ash_1', weight: 3 }, { id: 'ash_2', weight: 3 }] });
    return m.finish();
  }

  function finishAshenRoad2() {
    const H = G.maps.helpers;
    const m = G.maps.build('ashen_road_2', 40, 24, {
      name: 'Ashen Road: the Gate Yard', bgm: 'ashen_road', ground: 'y', spawn: { x: 2, y: 12, dir: 'right' }, tint: 'rgba(30,10,40,0.16)',
    });
    m.blob('ground', 14, 4, 5, 3, 'h');
    m.blob('ground', 22, 19, 6, 3, 'h');
    m.blob('ground', 36, 4, 3, 2, 'h');
    m.rect('ground', 0, 10, 39, 5, ':');                  // the road runs into the gate yard
    m.rect('ground', 30, 6, 9, 13, 'h');                  // gate yard: corrupted ground
    m.rect('objects', 30, 6, 10, 1, 'r');                 // rubble walls with the road opening at y10-14
    m.rect('objects', 30, 18, 10, 1, 'r');
    m.rect('objects', 39, 6, 1, 13, 'r');
    m.rect('objects', 30, 6, 1, 4, 'r');
    m.rect('objects', 30, 15, 1, 4, 'r');
    m.set('objects', 6, 3, 'z'); m.set('objects', 25, 21, 'z'); m.set('objects', 35, 2, 'z');
    const band = { x: 0, y: 9, w: 30, h: 7 };
    m.scatter('objects', 'd', 14, { seed: 41, on: 'yh', avoid: [band] });
    m.scatter('objects', 'r', 8, { seed: 42, on: 'yh', avoid: [band] });
    m.ev([
      H.save('ch4_save_r2a', 4, 9),
      H.save('ch4_save_r2b', 27, 9),
      ...H.chest('ashen_road_2_a', 12, 16, 'hi_ether', 1),
      ...H.chest('ashen_road_2_b', 20, 6, 'elixir', 1),
      ...H.chest('ashen_road_2_c', 36, 21, 'phoenix_down', 1),
      // Hale stands in the gate yard; stepping into the road mouth starts the fight
      { id: 'ch4_hale', x: 34, y: 12, sprite: 'hale', dir: 'left', trigger: 'action', solid: true, move: 'still',
        if: () => !flag('ch4_hale_defeated'), run: async (c) => { await haleFight(c); } },
      { id: 'ch4_gate', x: 29, y: 10, w: 1, h: 5, sprite: null, trigger: 'step', solid: false,
        if: () => !flag('ch4_hale_defeated'), run: async (c) => { await haleFight(c); } },
    ]);
    m.encounters({ steps: [14, 22], troops: [{ id: 'ash_3', weight: 3 }, { id: 'ash_4', weight: 3 }] });
    return m.finish();
  }

  // ------------------------------------------------------------ INQUISITOR HALE (boss_hale)
  async function haleFight(c) {
    if (flag('ch4_hale_defeated') || flag('ch4_hale_fight')) return;
    setF('ch4_hale_fight');
    const r = await c.battle('boss_hale', {
      canEscape: false,
      bgm: 'boss',
      intro: async (c2) => {
        await c2.say('Inquisitor Hale', 'You ran very well, Rowan. Truly. I have followed your lantern-trail for three days and I am genuinely tired of it.', { face: 'hale' });
        await c2.say('Inquisitor Hale', 'So let us be courteous about this. I will not enjoy it. But I will be thorough, and I am very sorry in advance.', { face: 'hale' });
      },
      onHalf: async (c2) => {
        await c2.say('Inquisitor Hale', 'Hm. You are stronger than your file said. Be careful, or I shall have to start admiring you.', { face: 'hale' });
      },
      outro: async (c2) => {
        await c2.say('Inquisitor Hale', 'Enough. Stop, please. The lamps... the ones in the squares... they hurt people?', { face: 'hale' });
        await c2.say('Inquisitor Hale', 'I was told they were a blessing. I hung one in my mother\'s kitchen when she got old. She said it made her tired. I thought she was simply old.', { face: 'hale' });
        await c2.say('Inquisitor Hale', 'Go to the Spire, Rowan. I will think about what you showed me. That is all I can promise you tonight.', { face: 'hale' });
        setF('ch4_hale_defeated');
      },
    });
    if (r !== 'win') return;
    if (!flag('ch4_hale_defeated')) setF('ch4_hale_defeated');
    await haleAftermath(c);
  }

  // the Lantern Lake Anchor is quenched, the Lantern Token drops, the Marigold limps in, chapter ends
  async function haleAftermath(c) {
    await c.wait(30);
    await c.say(null, 'Hale sits down heavily on a dead stump. His lantern-blade lies in the ash between you, its light going out like a tired eye.');
    await c.camera(30, 6, 60);
    await c.say(null, 'Far to the north-west, above the rooftops of Lumen Vale, the great Anchor beacon burns on the lake shore. Its beam is still turning toward the Spire, slow and patient, like something hungry.');
    await c.say(rowanName(), 'It hurts them. All of them. Every single lamp.', { face: 'rowan' });
    await c.say(null, 'The Heart in your chest answers. It is not like a flame. It is like being touched from the inside by someone who has been waiting a very long time to say hello.');
    await c.flash('#ffd27a', 60);
    await c.shake(5, 60);
    await c.say(rowanName(), 'Then let it go out.', { face: 'rowan' });
    await c.say(null, 'You lift your hand toward the far light and simply ask. The beacon gutters, coughs, and dies in one long gold sigh. Across the Vale a hundred windows go dark, then relight, one by one, with ordinary firelight.');
    await c.sfx('shatter');
    await c.say(null, 'Something drops from the beacon\'s cradle: a brass token shaped like a lantern, turning end over end through the dusk. It lands at your feet with a small, ordinary clink.');
    await c.addItem('lantern_token', 1);
    await c.camReset(40);
    await c.say(null, 'Down the road a patched airship limps out of the dusk, one engine smoking, and sinks toward the ash as if it has been holding its breath the whole way.');
    await c.say(null, 'A voice full of steam yells through a speaking tube, "Don\'t touch that, it\'s load-bearing!" The Marigold has come to fetch you.');
    setF('ch4_started'); setF('ch4_lantern_night'); setF('ch4_ambush'); setF('ch4_done');
    await c.chapterEnd(4);
  }

  // ------------------------------------------------------------ registration
  G.story = G.story || { scripts: {}, chapters: {} };
  G.story.chapters = G.story.chapters || {};
  G.story.chapters[4] = { title: 'The Festival of Lanterns', subtitle: 'Lamps on the water, cold light on the road' };

  finishLumenVale();
  finishLumenInn();
  finishLumenLake();
  finishAshenRoad1();
  finishAshenRoad2();

  G.provide('ch4');
})();
