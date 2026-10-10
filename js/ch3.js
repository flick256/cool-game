/* =====================================================================
 * LANTERNBOUND — ch3.js  (ch3 agent)  Chapter 3 "Wings & Whispers"
 * Maps: pale_abbey, pale_abbey_hall, abbey_crypt_1, abbey_crypt_2,
 *       whisperwood_1, whisperwood_2, wren_cottage
 * Flags: ch3_started ch3_met_sera ch3_met_wren ch3_matron_done ch3_choir_done ch3_done
 * Key items: abbey_seal (Sera, hall) · witchwood_charm (Wren, after the Matron)
 * ===================================================================== */
(function () {
  'use strict';
  const G = (window.G = window.G || {});
  const M = G.maps;
  const H = G.maps.helpers;

  G.story = G.story || { scripts: {}, chapters: {} };
  G.story.chapters = G.story.chapters || {};
  G.story.chapters[3] = { title: 'Wings & Whispers', subtitle: 'Hymns above, thorns below' };

  // ------------------------------------------------------------ helpers
  const flag = (k) => !!G.flag(k);
  const setF = (k, v) => G.setFlag(k, v === undefined ? true : v);
  const hasItem = (id) => !!(G.state.inventory && G.state.inventory[id]);
  const ME = () => G.name();
  // dialogue helpers: face = portrait id, expr = optional expression
  const talk = (c, who, face, text, expr) => {
    const o = {};
    if (face) o.face = face;
    if (expr) o.expr = expr;
    return c.say(who, text, Object.keys(o).length ? o : undefined);
  };
  const rowan = (c, t, e) => talk(c, ME(), 'rowan', t, e);
  const claret = (c, t, e) => talk(c, 'Claret', 'claret', t, e);
  const sera = (c, t, e) => talk(c, 'Sera', 'seraphine', t, e);
  const wren = (c, t, e) => talk(c, 'Wren', 'wren', t, e);
  const orla = (c, t, e) => talk(c, 'Abbess Orla', 'abbess', t, e);
  const narr = (c, t) => c.say(null, t);
  // step triggers that refuse entry: stop the player by stepping them back one tile
  const pushBack = async (c) => {
    const d = (G.map && G.map.player && G.map.player.dir) || 'down';
    const back = { up: 'down', down: 'up', left: 'right', right: 'left' }[d] || 'up';
    await c.walk('player', [back], { wait: true });
  };
  // a plain NPC: lines is a function (c) => Promise; keeps each event self-contained
  const npc = (id, x, y, sprite, run, opts) => Object.assign({
    id, x, y, sprite, trigger: 'action', solid: true, dir: 'down', move: 'still', run,
  }, opts || {});

  // ============================================================ pale_abbey (40 x 32)
  const pa = M.build('pale_abbey', 40, 32, { name: 'Pale Abbey', bgm: 'abbey', spawn: { x: 19, y: 27, dir: 'up' } });
  // void beyond the cliff, a moss lip, and fences along the drop
  pa.rect('ground', 0, 0, 40, 1, 'q').rect('ground', 36, 0, 4, 32, 'q').rect('ground', 0, 31, 40, 1, 'q');
  pa.rect('ground', 0, 1, 36, 1, 'v');
  pa.hline('objects', 0, 1, 36, 'x').vline('objects', 35, 2, 28, 'x').hline('objects', 0, 30, 36, 'x');
  // marble plaza, airship landing deck, dirt path from the west gate
  pa.rect('ground', 9, 11, 19, 19, 'g');
  pa.rect('ground', 17, 25, 5, 5, 'j');
  pa.rect('ground', 1, 15, 8, 2, ':');
  pa.rect('ground', 27, 15, 2, 2, 'g');
  pa.blob('ground', 5, 5, 3, 2, 'v');
  pa.blob('ground', 31, 22, 3, 2, 'v');
  pa.pond(6, 18, 2, 1);
  // Abbey nave (door at 18,10 leads to the hall), steps and pillars
  pa.house(10, 3, 17, 8, { roof: '4', wall: '9', doorAt: 8, windows: false });
  pa.rect('objects', 17, 11, 3, 1, 'u');
  pa.tiles('objects', [[11, 11], [24, 11]], 'Q');
  // Bell tower (north-west)
  pa.rect('objects', 2, 2, 5, 2, '4');
  pa.rect('objects', 2, 4, 5, 7, '9');
  // Pilgrim shop (west) and pilgrim hostel (east)
  pa.house(2, 21, 6, 5, { roof: '5', wall: '9', doorAt: 3, windows: false });   // door (5,25)
  pa.house(27, 21, 6, 5, { roof: '2', wall: '9', doorAt: 2, windows: false });  // door (29,25)
  // Crypt stair hidden behind a hedge of black thorns
  pa.set('objects', 8, 8, 'u');
  pa.tiles('objects', [[7, 7], [8, 7], [9, 7], [7, 8], [9, 8], [7, 9], [9, 9]], 'B');
  // Mistward gate (west edge to Whisperwood)
  pa.vline('objects', 1, 12, 3, 'x').vline('objects', 1, 18, 3, 'x');
  pa.set('objects', 1, 11, 'L');
  // Hedge maze garden (east), secret pocket at (31,14)
  for (let y = 3; y <= 16; y++) for (let x = 28; x <= 34; x++) {
    let b = false;
    if (y === 4 && x !== 34) b = true;
    if (y === 8 && x !== 28) b = true;
    if (y === 12 && x !== 34) b = true;
    if (x === 31 && (y === 6 || y === 10)) b = true;
    if (y === 13 && x >= 30 && x <= 32) b = true;
    if (y === 14 && (x === 30 || x === 32)) b = true;
    if (b) pa.set('objects', x, y, 'B');
  }
  // plaza furniture and statues
  pa.tiles('objects', [[11, 14], [25, 14], [11, 26], [25, 26]], 's');
  pa.tiles('objects', [[12, 18], [12, 22], [24, 18], [24, 22]], 'Q');
  pa.set('objects', 18, 20, 'o');
  pa.tiles('objects', [[13, 16], [15, 16], [21, 16], [23, 16]], 'H');
  pa.tiles('objects', [[9, 12], [27, 12], [9, 28], [27, 28]], 'L');
  pa.tiles('objects', [[10, 12], [11, 12], [26, 12], [10, 27], [26, 27]], 'F');
  // hanging paper lanterns over the plaza
  pa.tiles('above', [[13, 12], [17, 12], [21, 12], [25, 12]], '*');
  // scatter: trees, pines, bushes, flowers, tall grass in the open gardens
  const paAvoid = [
    { x: 0, y: 12, w: 12, h: 6 }, { x: 6, y: 6, w: 5, h: 5 }, { x: 9, y: 11, w: 19, h: 20 },
    { x: 2, y: 21, w: 6, h: 6 }, { x: 27, y: 21, w: 6, h: 6 }, { x: 27, y: 2, w: 9, h: 18 },
    { x: 7, y: 3, w: 1, h: 1 }, { x: 4, y: 13, w: 1, h: 1 }, { x: 3, y: 19, w: 1, h: 1 }, { x: 30, y: 3, w: 1, h: 1 },
  ];
  pa.scatter('objects', 'T', 6, { seed: 3, on: '.v', avoid: paAvoid });
  pa.scatter('objects', 'N', 4, { seed: 9, on: '.v', avoid: paAvoid });
  pa.scatter('objects', 'B', 7, { seed: 13, on: '.v', avoid: paAvoid });
  pa.scatter('objects', 'F', 20, { seed: 11, on: '.v', avoid: paAvoid });
  pa.scatter('objects', 'G', 16, { seed: 17, on: '.v', avoid: paAvoid });
  // landing pad and lantern waypoint near the arrival point
  pa.ev(H.shipPad(19, 28, { id: 'pa_pad' }));
  pa.ev(H.save('pa_save_arrival', 15, 26));

  // ---- pale_abbey events
  pa.ev(H.auto('pa_arrive', async (c) => {
    await c.titleCard('Chapter 3', 'Wings & Whispers', 120);
    setF('ch3_started');
    c.chapter(3);
    narr(c, 'The Pale Abbey hangs on a cliff so high that the clouds have to look up at it.');
    claret(c, "Whoever built this had a lot of faith and no respect for wind.", 'smirk');
    rowan(c, 'Do you hear that? Someone is singing.', 'happy');
    narr(c, 'A choir drifts across the grounds. It is beautiful. The pilgrims beneath it look pale and tired, as if they have been crying for days and forgotten why.');
    claret(c, "Good singing, bad sleep. I've seen that look on engineers before a launch.", 'worried');
    rowan(c, 'Then let\'s find out what the Choir is hiding. Quietly.', 'normal');
  }, { if: () => !flag('ch3_started') }));

  pa.ev(npc('pa_orla', 18, 15, 'abbess', async (c) => {
    if (!flag('ch3_orla_intro')) {
      setF('ch3_orla_intro');
      orla(c, 'Welcome to the Pale Abbey, pilgrim. Our hymns rise every dusk so the Hearthstar knows we are grateful.', 'happy');
      rowan(c, 'The singing is lovely. Is that the Pale Choir?');
      orla(c, 'Forty voices, one prayer. You are kind to notice. Most visitors only notice the view.');
      orla(c, 'The people here are tired. It is the Vigil season, child. Everyone is tired.', 'worried');
      rowan(c, "There's a crypt under this abbey. The old Lampwright notes mention it.");
      orla(c, 'The Hymn Stones. They are sealed, as they should be. Some things are kept for our safety, not for curiosity.', 'normal');
      orla(c, 'The thorns across the stair were grown there for a reason. Please leave them be.', 'smirk');
      return;
    }
    const lines = [
      ['The Vigil bell rings at dusk. Please be seated for the hymn.', 'normal'],
      ['Sister Seraphine practises in the hall. Very dedicated. Very... fervent.', 'smirk'],
      ['Pray for the Choir. The Order says the lamps keep the dark away, and I believe the Order.', 'happy'],
      ['If you are looking for trouble, the wood to the west is full of it. Please come back for supper.', 'worried'],
    ];
    const n = (G.state.flags.ch3_orla_n = ((G.state.flags.ch3_orla_n || 0) % lines.length));
    G.state.flags.ch3_orla_n = n + 1;
    orla(c, lines[n][0], lines[n][1]);
  }));

  // Crypt stair: the thorns part only for the witchwood charm (Wren's gift)
  pa.ev({
    id: 'pa_crypt_gate', x: 8, y: 8, w: 1, h: 1, sprite: null, trigger: 'step', solid: false,
    run: async (c) => {
      if (!hasItem('witchwood_charm')) {
        narr(c, 'Black briar as thick as a wrist has grown over the stair. It hisses at the lantern light and will not let go.');
        rowan(c, 'Whatever grew this does not want anyone going down there.', 'worried');
        await pushBack(c);
        return;
      }
      narr(c, 'The witchwood charm warms in your hand. The thorns unwind like a sleepy cat and make a path.');
      c.sfx('lantern');
      await c.transfer('abbey_crypt_1');
    },
  });

  // The hall door (north of the nave)
  pa.ev(H.transfer(18, 10, 'pale_abbey_hall', 9, 12, 'up'));

  // Sign by the bell tower
  pa.ev(H.sign('pa_sign_bell', 3, 11, 'Bell of the Pale Choir. It rings at dusk for the Tithe, and for nothing else. Please do not climb the tower.'));

  // Shops and inns
  pa.ev(H.shop('pa_shop', 5, 26, 'merchant', 'abbey_shop', 'Blessed wares for the pilgrim! Nothing sacred is overpriced. Nearly.', 'Brother Tobin'));
  pa.ev(H.innkeeper('pa_inn', 29, 26, 'innkeeper', 30, 'Sister Mave'));

  // Villagers and pilgrims (flavour, odd and a little eerie)
  pa.ev(npc('pa_choir_f', 14, 24, 'choir_f', async (c) => {
    rowan(c, 'You sing beautifully. Do you remember the words?');
    talk(c, 'Choir Sister', null, "I've forgotten my mother's name. But every verse of the Vigil? Perfect. Every single one.", 'sad');
    talk(c, 'Choir Sister', null, 'Isn\'t that a comfort? Not having to carry anything heavy.', 'smirk');
  }));
  pa.ev(npc('pa_choir_m', 22, 24, 'choir_m', async (c) => {
    talk(c, 'Choir Brother', null, 'Sera rehearses in the hall every evening. She sings like she is apologising to a wall.');
    talk(c, 'Choir Brother', null, 'Don\'t tell her I said that. Or do. She\'d like to be told things.', 'smirk');
  }));
  pa.ev(npc('pa_gardener', 6, 14, 'villager_m1', async (c) => {
    talk(c, 'Brother Lodd', null, 'The roses wilt when the bell rings. Roses have opinions too, you know.', 'normal');
    talk(c, 'Brother Lodd', null, 'Don\'t go near the black briar. The Mother of the Wood has a temper, and so does the briar.');
  }));
  pa.ev(npc('pa_pilgrim', 14, 13, 'villager_f2', async (c) => {
    talk(c, 'Pilgrim', null, 'My lamp at home dims a little more each morning. The Order says that is normal. I am sure it is fine.', 'sad');
  }));
  pa.ev(npc('pa_bishop', 24, 28, 'elder', async (c) => {
    talk(c, 'Bishop Oswin', null, 'I feed the pigeons every day. Lately, the pigeons have started feeding me.', 'smirk');
    talk(c, 'Bishop Oswin', null, 'I am choosing to see this as a sign of grace.');
  }));
  pa.ev(npc('pa_guard', 3, 14, 'guard', async (c) => {
    talk(c, 'Sister Ilse', null, 'The west gate is for the wood. Nobody goes into the wood. The wood is full of things that do not belong to the Order.', 'worried');
    talk(c, 'Sister Ilse', null, 'Which is why I am standing here, and why you are not going in. Lovely to meet you.', 'happy');
  }));
  pa.ev(npc('pa_child', 30, 3, 'child1', async (c) => {
    talk(c, 'Little Tam', null, 'I lost my dog in the hedges! He\'s named Wick. He is a very good dog.', 'sad');
    rowan(c, 'We\'ll look for him. Just keep to the path.');
  }));
  pa.ev(npc('pa_dog', 33, 3, 'dog', async (c) => {
    setF('ch3_dog_found');
    narr(c, 'The dog looks at you with deep and unbothered understanding. It has clearly been through the maze. It has clearly found the secret.');
    talk(c, 'Little Tam', null, 'WICK! You found him! Here, he wants you to have this.', 'happy');
    c.sfx('heart');
    await c.addItem('pressed_flower', 1);
  }, { name: 'Wick', if: () => !flag('ch3_dog_found') }));

  // Claret and the fountain: a heart choice about her father
  pa.ev(H.trigger('pa_claret_fountain', 18, 22, async (c) => {
    claret(c, 'You know what I hate about churches? They build the ceilings too high to fix.', 'normal');
    rowan(c, 'Is that your way of saying you miss your father?');
    claret(c, 'My father would have loved this place. Brass everywhere. Every single one of those bells would need a new spring.', 'sad');
    claret(c, "I'm fine. The bells are not fine. Don't say anything nice, I'll cry on the fountain.", 'worried');
    const i = await c.choice([
      '"I\'m listening. Go on."',
      '"He\'s going to be fine, Claret."',
      '"Want to fix the ceiling together?"',
    ], { prompt: 'What do you say?' });
    if (i === 0) { await c.affection('claret', 3, 'listened'); claret(c, 'Huh. You\'re annoyingly good at that.', 'blush'); }
    else if (i === 1) { await c.affection('claret', 1); claret(c, "Don't promise things you can't fix. ...Thanks anyway.", 'blush'); }
    else { await c.affection('claret', 2); claret(c, 'Ha. Deal. Next time you climb, I\'m not catching you.', 'smirk'); }
  }, { once: true }));

  // Chests (3 in the abbey grounds + one secret in the hedge maze)
  pa.ev(H.chest('pa_chest_garden', 4, 13, 'lavender_sachet'));
  pa.ev(H.chest('pa_chest_pond', 3, 19, 'potion', 2));
  pa.ev(H.chest('pa_chest_bell', 6, 12, { gold: 80 }));
  pa.ev(H.chest('pa_chest_secret', 31, 14, 'sweet_bun'));

  // The ending: the last event of the chapter (after the crypt engine is lit)
  pa.ev(H.auto('pa_end', async (c) => {
    orla(c, 'You kindled the hymn stones. I felt it in my chest, like a bell that had forgotten how to ring.', 'surprised');
    orla(c, 'Go with the Order\'s blessing, and tell the Hearth that the Choir will keep singing for you.', 'happy');
    rowan(c, 'Thank you, Abbess. I hope you sleep well tonight.', 'normal');
    await c.chapterEnd(3);
  }, { if: () => flag('ch3_engine_lit') && !flag('ch3_done') }));

  pa.finish();

  // ============================================================ pale_abbey_hall (18 x 14)
  const ph = M.build('pale_abbey_hall', 18, 14, { name: 'Chapel of the Pale Choir', bgm: 'abbey', interior: true, spawn: { x: 9, y: 12, dir: 'up' } });
  ph.room(0, 0, 18, 14, { floor: 'g', wall: '9', topWall: 2 });
  ph.rect('ground', 7, 2, 4, 11, 'c');                 // red carpet aisle
  ph.tiles('objects', [[3, 1], [6, 1], [11, 1], [14, 1]], 'O');   // glowing "stained glass" windows
  ph.tiles('objects', [[5, 3], [12, 3], [5, 11], [12, 11]], 'Q');
  ph.tiles('objects', [[8, 3], [9, 3]], 'E');          // altar
  ph.set('objects', 2, 2, 'M');                        // the organ bellows, all brass dials
  ph.hline('objects', 2, 5, 4, 'E').hline('objects', 2, 6, 4, 'H');     // left pews
  ph.hline('objects', 12, 5, 4, 'E').hline('objects', 12, 6, 4, 'H');   // right pews
  ph.hline('objects', 2, 8, 4, 'E').hline('objects', 2, 9, 4, 'H');
  ph.hline('objects', 12, 8, 4, 'E').hline('objects', 12, 9, 4, 'H');
  ph.vline('objects', 1, 6, 3, 'Y');                   // hymnal shelves
  ph.vline('objects', 16, 6, 2, 'S');
  ph.tiles('above', [[9, 6], [9, 9]], '*');            // chandeliers
  ph.ev(H.transfer(9, 13, 'pale_abbey', 18, 11, 'down'));

  // Sera: rehearsing at the altar, then a long talk (heart choice, the abbey seal)
  ph.ev(H.auto('ph_meet', async (c) => {
    c.emote('ph_sera', 'music');
    await c.walk('ph_sera', ['down', 'down'], { wait: true });
    sera(c, 'Oh! Pilgrims. I am not allowed to be alarmed. Please don\'t tell the Abbess I was alarmed.', 'surprised');
    rowan(c, 'The door was open. Is the chapel always this empty?');
    sera(c, 'Only when the hymn is wrong. I keep singing it and it keeps coming out sad. As if the building is sighing.', 'worried');
    sera(c, 'I\'m Seraphine. Sera. Cantor of the Pale Choir. Supposedly.');
    claret(c, 'Supposedly?', 'normal');
    sera(c, 'Supposedly is the correct word for a cantor who has begun to doubt her own hymns, Captain. You have a captain face, by the way.', 'smirk');
    const i = await c.choice([
      '"Doubt is just listening harder."',
      '"Do the hymns really hurt people?"',
      '"I think you\'re brave to sing at all."',
    ], { prompt: 'How do you answer?' });
    if (i === 0) {
      rowan(c, 'Doubt is just listening harder, I think.', 'normal');
      sera(c, 'That was annoyingly profound. Shall I write it down? I will. In the margins of the Vigil book.', 'blush');
      await c.affection('seraphine', 3, 'listened');
    } else if (i === 1) {
      rowan(c, 'Do the hymns really hurt people?', 'worried');
      sera(c, 'You ask the question my confessor forbids. I like you already. Quietly. Please be quiet about it.', 'smirk');
      await c.affection('seraphine', 2, 'asked');
    } else {
      rowan(c, 'I think you\'re brave to sing at all, with that much doubt in you.', 'happy');
      sera(c, 'Don\'t. My face has rules, and you are breaking several of them.', 'blush');
      await c.affection('seraphine', 2, 'brave');
    }
    setF('ch3_met_sera');
    sera(c, 'Listen. Under this hall are the Hymn Stones. The Choir sings, the stones drink the warmth from the hymn, and the warmth goes up to the Hearthstar.', 'worried');
    rowan(c, 'The lamps. The Tithe. The Order said the lamps were a blessing.');
    sera(c, 'Lamps are a blessing the way a leech is a healing tool. We are singing the world\'s warmth away, and the pilgrims are paying for every verse.', 'sad');
    sera(c, 'The crypt gate is sealed with the Abbey seal. Orla keeps it in the vestry. She won\'t open it for anyone, and I have a key to the vestry and very little regard for rules.');
    c.sfx('chest');
    await c.addItem('abbey_seal', 1);
    narr(c, 'Sera presses a heavy wax-sealed medallion into your palm. It is still warm from her hands.');
    sera(c, 'Careful with it. The seal goes cold if you are carrying a grudge. Mine has been freezing since Tuesday.', 'smirk');
    sera(c, 'The briar on the crypt stair won\'t part for steel, though. Only a hedge-witch can part it. There is one in Whisperwood, past the west gate. Wren Alder.');
    sera(c, 'They are blunt. Don\'t take it personally. They take everything personally, but in a fair way.', 'smirk');
  }, { if: () => !flag('ch3_met_sera') }));

  ph.ev(npc('ph_sera', 9, 5, 'seraphine', async (c) => {
    if (!flag('ch3_met_sera')) {
      sera(c, 'Oh, you are still here. Stand somewhere else while I finish the verse, please.', 'normal');
      return;
    }
    if (!flag('ch3_sera_talk2')) {
      setF('ch3_sera_talk2');
      sera(c, 'You came back. Nobody comes back to this chapel, except the rats, and they only come for the bread.', 'happy');
      const i = await c.choice([
        '"Tell me about your first hymn."',
        '"Would you sing for me?"',
        '"Do you want to run away?"',
      ], { prompt: 'Sera waits for you to speak.' });
      if (i === 0) {
        sera(c, 'I was six. I sang the Vigil so badly the bishop cried. I wanted to be forgiven for it. I still do.', 'sad');
        await c.affection('seraphine', 3, 'first hymn');
      } else if (i === 1) {
        sera(c, 'Fine. Only the quiet verse, though. The loud ones have teeth.', 'blush');
        await c.affection('seraphine', 2, 'sing');
        narr(c, 'Her voice is clear and low and sad, and for a moment the hall stops sighing.');
      } else {
        sera(c, 'Run away? I cannot. Orla would find me, and I\'d have to apologise for the mess. Maybe one day. With snacks.', 'smirk');
        await c.affection('seraphine', 3, 'run away');
      }
      return;
    }
    const lines = [
      'Lavender helps when the hymn sounds wrong. I hide sachets in the pews. Don\'t tell Orla.',
      'Pilgrims come in here and cry about their lamps. I give them bread and tell them their lamps are fine. Liars are allowed to be kind.',
      'The stones are louder at night. Like something knocking politely from underneath.',
    ];
    const n = (G.state.flags.ch3_sera_n = ((G.state.flags.ch3_sera_n || 0) % lines.length));
    G.state.flags.ch3_sera_n = n + 1;
    sera(c, lines[n], n === 2 ? 'worried' : 'normal');
  }));

  ph.ev(npc('ph_choir', 4, 12, 'choir_m', async (c) => {
    talk(c, 'Choir Brother', null, 'We sing forty verses a day. I stopped counting the sins after the first week.', 'smirk');
    talk(c, 'Choir Brother', null, 'Do not ask me what the sins were. I have a lovely memory of the tune, though.', 'sad');
  }));

  ph.ev(H.chest('ph_chest_hymnal', 16, 12, 'pressed_flower'));
  ph.ev(H.chest('ph_chest_vestry', 1, 12, { gold: 120 }));
  ph.finish();

  /*@@MORE@@*/
  G.provide('ch3');
})();
