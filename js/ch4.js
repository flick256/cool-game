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

  // @@NEXT@@
})();
