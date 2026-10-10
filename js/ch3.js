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

  /*@@MORE@@*/
  G.provide('ch3');
})();
