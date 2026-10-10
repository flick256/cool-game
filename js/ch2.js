/* =====================================================================
 * LANTERNBOUND — ch2.js  (OWNER: ch2)   Chapter 2 "Sand & Oath"
 * Maps: gladius_citadel gladius_tavern gladius_arena aqueduct_1 aqueduct_2
 * Story: Gladius is a colosseum city drained by the Colosseum Anchor (an Order lamp-vault
 * under the arena). Rook (gambler-thief) and Caspian (the Grey Lion, deserter Knight-Lantern)
 * are met here; the tournament opens the back gate; the aqueduct heist ends at the Anchor.
 * ===================================================================== */
(function () {
  'use strict';
  const G = window.G;
  const H = G.maps.helpers;

  // small helpers -------------------------------------------------------
  const flag = (k) => !!G.flag(k);
  const has = (k) => flag(k);
  const hasItemState = (id) => !!(G.state.inventory && G.state.inventory[id]);
  const inParty = (id) => !!(G.state.party && G.state.party.indexOf(id) >= 0);
  const say = (c, who, text, face, expr) => c.say(who, text, face ? { face, expr } : undefined);

  // ===================================================================
  // GLADIUS CITADEL  (44 x 34)  — colosseum city, grass plazas, market, tavern, smithy
  // ===================================================================
  function buildCitadel() {
    const m = G.maps.build('gladius_citadel', 44, 34, {
      name: 'Gladius Citadel', bgm: 'gladius', spawn: { x: 11, y: 29, dir: 'up' },
    });

    // ---- ground: cobbles, forecourt, paths --------------------------------------------
    m.rect('ground', 17, 13, 9, 9, '=');                       // central plaza
    m.rect('ground', 18, 12, 7, 1, 't');                       // colosseum forecourt (stone)
    m.path([[11, 29], [21, 29], [21, 13]], '=', 3);            // spawn avenue -> plaza
    m.path([[2, 21], [17, 21]], '=', 2);                       // west market avenue
    m.path([[3, 9], [3, 12], [17, 12]], '=', 2);               // NW houses -> plaza
    m.path([[10, 8], [10, 11]], '=', 1);                       // back door of NW house 2
    m.path([[36, 7], [36, 13], [25, 13]], '=', 2);             // NE houses -> plaza
    m.path([[25, 21], [36, 21], [36, 20]], '=', 2);            // plaza -> smithy door
    m.path([[31, 27], [25, 27], [25, 21]], '=', 2);            // tavern door -> plaza
    m.rect('ground', 1, 18, 9, 3, '=');                        // market cobbles
    m.rect('ground', 11, 18, 5, 3, '=');                       // fruit-stall cobbles
    m.rect('ground', 9, 27, 4, 3, 'v');                        // moss patch (reclaimed by nature)
    m.rect('ground', 30, 30, 6, 3, 'v');
    m.rect('ground', 33, 27, 3, 2, 'v');

    // ---- colosseum (solid sandstone ellipse, crown of pillars, grand entrance) -------
    m.blob('objects', 21, 6, 10, 5, 'A');
    for (let x = 12; x <= 30; x += 2) m.set('objects', x, 1, 'Q');   // crown of pillars
    m.set('objects', 21, 11, 'D');                                    // grand entrance
    m.hline('objects', 20, 12, 3, 'u');                               // steps
    m.set('objects', 18, 11, 's'); m.set('objects', 24, 11, 's');     // statues flanking the door
    m.set('objects', 14, 7, 'V'); m.set('objects', 28, 7, 'V');       // banners
    m.set('objects', 17, 9, 'V'); m.set('objects', 25, 9, 'V');
    m.set('objects', 14, 13, 's'); m.set('objects', 28, 13, 's');    // plaza plinth statues
    m.set('objects', 13, 11, 'Q'); m.set('objects', 29, 11, 'Q');

    // ---- plaza furniture ------------------------------------------------------------------
    m.set('objects', 21, 18, 'o');                                    // central fountain
    m.set('objects', 19, 16, 'H'); m.set('objects', 23, 16, 'H');    // benches (chairs)
    m.set('objects', 19, 20, 'H'); m.set('objects', 23, 20, 'H');
    [[16, 13], [26, 13], [16, 21], [26, 21], [12, 25], [30, 25], [22, 27]].forEach(([x, y]) => m.set('objects', x, y, 'L'));

    // ---- west market: stall 1 (merchant, shop) ----------------------------------------
    m.rect('objects', 2, 15, 7, 1, '5');                              // red awning
    m.rect('objects', 2, 16, 7, 1, 'S');                              // shelves of goods
    m.rect('objects', 2, 17, 7, 1, 'E');                              // counter
    m.set('objects', 1, 16, 'V');
    m.set('objects', 1, 19, 'C'); m.set('objects', 8, 19, 'C');       // crates
    m.set('objects', 1, 20, 'U'); m.set('objects', 9, 20, 'U');      // barrels
    // ---- market stall 2: fruit & flowers (vendor) -----------------------------------
    m.rect('objects', 11, 15, 4, 1, '2');
    m.rect('objects', 11, 16, 4, 1, 'S');
    m.rect('objects', 11, 17, 4, 1, 'E');
    m.set('objects', 15, 19, 'U'); m.set('objects', 16, 19, 'C');

    // ---- NW houses ----------------------------------------------------------------------------
    m.house(1, 3, 5, 5, { roof: '1', wall: 'X', doorAt: 2 });         // door (3,7)
    m.house(8, 4, 4, 4, { roof: '5', wall: 'W', doorAt: 2 });         // door (10,7)
    m.set('objects', 6, 5, 'B'); m.set('objects', 6, 7, 'B');
    m.set('objects', 5, 1, 'T');
    // ---- NE houses (inn-ish home, then a row of roofs) -----------------------------------
    m.house(34, 2, 6, 5, { roof: '2', wall: 'X', doorAt: 2 });        // door (36,6)
    m.house(38, 9, 4, 4, { roof: '4', wall: 'W', doorAt: 2 });        // door (40,12)
    m.set('objects', 42, 6, 'B'); m.set('objects', 41, 2, 'Y');

    // ---- smithy (metal, copper roof, forge) ---------------------------------------------------
    m.house(34, 15, 6, 5, { roof: '6', wall: '7', doorAt: 2 });       // door (36,19)
    m.set('objects', 32, 16, 'M'); m.set('objects', 41, 16, 'J');
    m.set('objects', 31, 19, 'e'); m.set('objects', 33, 18, 'U');
    m.rect('objects', 40, 19, 2, 2, 'P');

    // ---- tavern (The Gilded Dice) ----------------------------------------------------------------
    m.house(28, 22, 7, 5, { roof: '3', wall: 'X', doorAt: 3 });       // door (31,26)
    m.set('objects', 35, 24, 'U'); m.set('objects', 35, 25, 'U');
    m.set('objects', 27, 25, 'E'); m.set('objects', 26, 25, 'H');     // outdoor table
    m.set('objects', 29, 28, 'x');                                    // fence line for the terrace

    // ---- pond & garden in the south-east ----------------------------------------------------
    m.pond(38, 29, 3, 2);
    m.set('objects', 35, 29, 'B'); m.set('objects', 41, 30, 'F'); m.set('objects', 37, 32, 'R');

    // ---- south-west secret alcove (chest behind bushes) ----------------------------------
    m.set('objects', 2, 31, 'B'); m.set('objects', 4, 31, 'B'); m.set('objects', 3, 32, 'B');

    // ---- scenery: trees, bushes, flowers, grass (deterministic scatter) -------------------
    const avoid = [
      { x: 9, y: 0, w: 26, h: 14 },   // colosseum & forecourt
      { x: 14, y: 12, w: 13, h: 12 }, // plaza
      { x: 10, y: 24, w: 14, h: 8 },  // spawn avenue
      { x: 0, y: 13, w: 14, h: 10 },  // market
      { x: 0, y: 0, w: 9, h: 13 },    // NW houses
      { x: 33, y: 0, w: 11, h: 14 },  // NE houses
      { x: 27, y: 14, w: 17, h: 14 }, // smithy & tavern
      { x: 0, y: 30, w: 6, h: 4 },    // secret alcove
    ];
    m.scatter('objects', 'T', 22, { seed: 11, avoid, on: '.' });
    m.scatter('objects', 'N', 8, { seed: 12, avoid, on: '.' });
    m.scatter('objects', 'B', 16, { seed: 13, avoid, on: '.' });
    m.scatter('objects', 'F', 26, { seed: 14, avoid, on: '.' });
    m.scatter('objects', 'G', 26, { seed: 15, avoid, on: '.' });
    m.scatter('objects', 'R', 5, { seed: 16, avoid, on: '.' });
    m.scatter('objects', 'd', 2, { seed: 17, avoid, on: '.' });
    // a few trees framing the entrance avenue and the north rim
    [[0, 20], [0, 26], [43, 22], [43, 26], [6, 33], [40, 33], [17, 0], [30, 0]].forEach(([x, y]) => m.set('objects', x, y, 'T'));

    citadelEvents(m);
    return m.finish();
  }

  function citadelEvents(m) {
    // ---- doors ----------------------------------------------------------------------------
    m.ev(H.transfer(21, 11, 'gladius_arena', undefined, undefined, 'up', { id: 'cit_to_arena' }));
    m.ev(H.transfer(31, 26, 'gladius_tavern', undefined, undefined, 'up', { id: 'cit_to_tavern' }));
    m.ev(H.shipPad(11, 30));

    // ---- arrival (once): Claret's sky-sick joke, the listless city, the chapter card ----
    m.ev(H.auto('cit_arrival', async (c) => {
      G.setFlag('ch2_started', true);
      await c.chapter(2);
      await c.fade('in', 30);
      await c.titleCard(G.story.chapters[2].title, G.story.chapters[2].subtitle, 110);
      await c.say('Claret', 'Gladius. Sand in the teeth, sun on the stones, and a sky that looks like it wants to sell us a nap.', 'claret', 'normal');
      await c.say('Claret', "Don't laugh. I'm sky-sick again. Ten minutes on the ground and my ears still think they're in a cloud.", 'claret', 'worried');
      const i = await c.choice(['Earnest: "It\'s warm. People here look... happy?"', 'Teasing: "Just say you missed the Marigold."', 'Brave: "Then we walk. Fast."'], { prompt: 'How do you answer?' });
      if (i === 0) await c.say('{name}', 'It\'s warm. Everyone here looks happy, almost.', null);
      if (i === 1) { await c.say('{name}', 'You missed the Marigold. Admit it.', null); await c.say('Claret', "Shut up. I'm not admitting anything with a sky like that watching.", 'claret', 'smirk'); }
      if (i === 2) { await c.say('{name}', 'Then we walk, fast, and get you somewhere with a roof.', null); await c.say('Claret', "Hm. You're not wrong. Lead, Kindler.", 'claret', 'happy'); }
      await c.affection('claret', i === 1 ? 2 : 1, 'Gladius arrival banter');
      await c.narrate('Gladius is crowded and quiet at once. A vendor yawns over a crate of figs. A dicing crowd stares at the dice without rolling them. A child drags a stick along the cobbles and forgets to finish the line.');
      await c.say('Claret', 'Look at the lamps. Every one of them is burning, and nobody in this city looks warm.', 'claret', 'worried');
      await c.say('{name}', "Something's draining them. Like the lamps are eating the warmth. I can almost see it.", null);
      await c.say('Claret', "Let's keep our eyes open and our hands near our pockets. Rule one of any city with a colosseum: somebody is always selling something.", 'claret', 'smirk');
    }, { once: true, if: () => !flag('ch2_started') }));

    // ---- Rook's pickpocket on the fountain steps (once, after arrival) ----
    m.ev(H.auto('cit_pickpocket', async (c) => {
      await c.narrate('A red-haired man in a green coat bumps into you on the fountain steps, apologising far too loudly. His hand is already at your belt pouch.');
      await c.say('Rook', "Oh! Sorry, sorry, lovely day for it. Gladius is full of hazards. Mostly me.", 'rook', 'smirk');
      const i = await c.choice([
        'Earnest: "Give it back, please."',
        'Teasing: "Is that how you say hello here?"',
        'Flustered: "Wh-what are you doing?!"',
        'Brave: "Nice try. Hand it over."',
      ], { prompt: 'Catch the thief...' });
      if (i === 0) {
        await c.say('{name}', 'Give it back, please. It has an important compass in it.', null);
        await c.say('Rook', 'Oh, a compass! Nobody ever trusts a man with a compass. Here, a deal: I keep the pouch, you keep your face.', 'rook', 'smirk');
      } else if (i === 1) {
        await c.say('{name}', 'Is that how you say hello in Gladius? By robbing people?', null);
        await c.say('Rook', 'Only the pretty ones, sweetheart. You should see the ones I hand back.', 'rook', 'smirk');
        await c.affection('rook', 2, 'Teasing Rook back');
      } else if (i === 2) {
        await c.say('{name}', 'Wh-what are you doing?! That is not your pocket!', null);
        await c.say('Rook', "Ooh, and they blush! Don't worry, I only steal things I actually want. And I don't want anything from you. Yet.", 'rook', 'smirk');
        await c.affection('rook', 1, 'Flustered in front of Rook');
      } else {
        await c.say('{name}', 'Nice try. Hand it over before I make you hand over your boots.', null);
        await c.say('Rook', 'Ha! Brave one. I like brave. Brave is expensive to lift from.', 'rook', 'happy');
        await c.affection('rook', 2, 'Brave face for Rook');
      }
      await c.say('Claret', "He had the pouch open, genius. You're lucky it's not my wallet, I'd have broken his fingers.", 'claret', 'angry');
      await c.say('Rook', "Tell your friend I'm not a thief. I'm a freelancer. And I just want to say, the tavern across the plaza has the best dice in the Vale.", 'rook', 'smirk');
      await c.say('Rook', "I'm called Rook, by the way. Rook Calloway. If you want your compass back, you'll find me at the Gilded Dice. Bring something to bet.", 'rook', 'happy');
      G.setFlag('ch2_met_rook', true);
      G.setFlag('rook_seen_citadel', true);
      await c.toast('Met Rook Calloway', 'heart');
    }, { once: true, if: () => flag('ch2_started') && !flag('ch2_met_rook') }));

    // ---- Rook, idling by the fountain after you met him (not joined yet) ----
    m.ev(H.npc('cit_rook', 21, 16, 'rook', [
      { who: 'Rook', text: "The Gilded Dice is open till the moon sets. Dice don't care who you are. Neither do I, mostly.", face: 'rook', expr: 'smirk' },
    ], { name: 'Rook', if: () => flag('ch2_met_rook') && !inParty('rook') }));

    // ---- Merchant Ioane (shop: gladius_shop) ----
    m.ev(H.shop('cit_merchant', 5, 18, 'merchant', 'gladius_shop',
      'Fresh gear, arena-tested! Only the sand in the bargain is extra.', 'Merchant Ioane'));

    // ---- fruit vendor (flavour) ----
    m.ev(H.npc('cit_fruit', 13, 18, 'villager_f1', [
      { who: 'Fruit Seller', text: 'Figs! Figs for the sleepless! Eat one and you can almost remember why you got up this morning.' },
      { who: 'Fruit Seller', text: "Don't mind the lamps, they're a blessing. That's what the Order says, anyway. I'm sure they know." },
    ], { name: 'Fruit Seller' }));

    // ---- Gran Hesper, old lady on the plaza (lamp-warmth lore) ----
    m.ev(H.npc('cit_elder', 20, 15, 'elder', [
      { who: 'Gran Hesper', text: 'When I was small the lamps were just lamps. Now my knees ache when I walk past one. Warm, but tired. Like a cat in the sun.' },
      { who: 'Gran Hesper', text: 'The Order says the lamps keep the Dark away. Dear, the Dark never came here. It was the lamps that came.' },
    ], { name: 'Gran Hesper' }));

    // ---- child who idolises the Grey Lion ----
    m.ev(H.npc('cit_kid', 15, 16, 'child1', [
      { who: 'Tomas', text: "You're not from here! The Grey Lion fights at dusk. He's the best, he never once lost a fight. Don't tell anyone, but I've got his scratch-mark drawn on my sleeve." },
      { who: 'Tomas', text: "He's got a sword and a sigil he scratched out. Nobody knows why. Mum says it's because he's a hero, and Auntie says he's a liar. I think it's both." },
    ], { name: 'Tomas' }));

    // ---- a gambler losing his shirt (gossip) ----
    m.ev(H.npc('cit_gambler', 12, 23, 'villager_m2', [
      { who: 'Gambler', text: "Lost ten gold to a red-haired con man. Ten. And he tipped the dealer! Tavern's not the same since he came to town." },
      { who: 'Gambler', text: 'If you go in, bring luck. Or a lucky coin. Nobody ever won with a loose button.' },
    ], { name: 'Gambler' }));

    // ---- off-duty gladiator at the fountain (sand, pride, the Lion) ----
    m.ev(H.npc('cit_gladiator', 23, 22, 'gladiator', [
      { who: 'Gladiator', text: "Arena rules: no weapons in the stands. Blades for the sand, and smiles for the crowd. Torvald says it's the only honest game in town." },
      { who: 'Gladiator', text: "The Grey Lion's the only one who doesn't smile. Looks like he's apologising to the crowd for winning. I'd like to meet a man like that." },
    ], { name: 'Gladiator' }));

    // ---- Order Warden guarding the colosseum forecourt ----
    m.ev(H.npc('cit_guard', 19, 14, 'guard', [
      { who: 'Warden', text: 'Keep moving, citizen. The forecourt is for the Order and for tickets. Tickets are for the arena. The arena is for entertainment.', face: 'unknown' },
      { who: 'Warden', text: 'The vault gates are not for entertainment. Nothing behind them concerns you. Nothing at all.', face: 'unknown' },
    ], { name: 'Order Warden', face: 'unknown' }));

    // ---- a noble enjoying the sun (Tithe rumours) ----
    m.ev(H.npc('cit_noble', 30, 15, 'noble', [
      { who: 'Lady Aurelle', text: 'The Order is very generous with its lamps. I do so love the warmth, though I must lie down a great deal these days.' },
      { who: 'Lady Aurelle', text: 'My physician says I must rest. My husband says I must stop fussing. Nobody says the lamps might be the problem. Isn\'t it all so civilised?' },
    ], { name: 'Lady Aurelle' }));

    // ---- a dog that waits outside the tavern ----
    m.ev(H.npc('cit_dog', 16, 24, 'dog', [
      { who: null, text: 'The dog wags its tail. It has definitely been fed by someone at the tavern.' },
    ], { name: null }));

    // ---- a sailor from the docks, hopeful about the Marigold ----
    m.ev(H.npc('cit_sailor', 12, 21, 'sailor', [
      { who: 'Sailor', text: 'Is that the Marigold? No, she\'s got a patched gas bag. Good ship. Good crew. Bad luck.', face: 'normal' },
      { who: 'Sailor', text: 'Hey, Captain Vane! Your mate Rook was in here last week. Took a bet off me with a loaded deck. I love the man.' },
    ], { name: 'Sailor' }));

    // ---- a restless girl on the bench, looking up at the arena ----
    m.ev(H.npc('cit_dancer', 27, 22, 'villager_f2', [
      { who: 'Dancer', text: 'I trained for the festival of the arena. Torvald says I\'m too gentle for the sand. He\'s not wrong. I dance better than I fight.' },
    ], { name: 'Dancer' }));

    // ---- the smithy: Smith Mede (sharpening, the whetstone trade-off) ----
    m.ev({
      id: 'cit_smith', x: 38, y: 21, sprite: 'engineer', trigger: 'action', solid: true, dir: 'left', name: 'Smith Mede',
      run: async (c) => {
        await say(c, 'Smith Mede', 'Bring steel, I bring sparks. You want something sharpened, or you want to look at my forge and feel poor?', 'unknown', 'normal');
        const first = !flag('ch2_smith_met');
        G.setFlag('ch2_smith_met', true);
        for (;;) {
          const opts = ['Browse the wares', 'Ask for a sharpening', 'Ask about the arena'];
          if (flag('ch2_sharpened')) opts[1] = 'Chat about forging';
          opts.push('Leave');
          const i = await c.choice(opts, { prompt: 'Smith Mede' });
          if (i === 0) { await c.shop('gladius_smith'); }
          else if (i === 1) {
            if (flag('ch2_sharpened')) {
              await say(c, 'Smith Mede', 'The old blade is sharp enough to split a hair. Save your whetstone for the Lion. He cares about edges.', 'unknown', 'smirk');
            } else if (hasItemState('whetstone')) {
              await say(c, 'Smith Mede', 'Ah, a proper whetstone! Give it here. I\'ll put an edge on your weapon that\'d make a Hollow stag blush.', 'unknown', 'happy');
              await c.removeItem('whetstone', 1);
              await c.addItem('charm_focus', 1);
              G.setFlag('ch2_sharpened', true);
              await c.say(null, 'Your weapon hums like a fresh bell. Mede hands you a Focus Charm, clinking.');
            } else {
              await say(c, 'Smith Mede', 'I\'d sharpen it for you, but I need a whetstone. Gladius hides its good things in bushes. Have a look in the south-west corner.', 'unknown', 'normal');
            }
          } else if (i === 2) {
            await say(c, 'Smith Mede', 'The arena? Torvald sells tickets to anything with a pulse. Enter the tournament, win, and you get the Pass to the Order\'s vault. Don\'t tell him I said so.', 'unknown', 'smirk');
          } else break;
        }
        if (first) await say(c, 'Smith Mede', 'Come back when you need your edge fixed. Or your temper.', 'unknown', 'happy');
      },
    });

    // ---- sign by the plaza ----
    m.ev(H.sign('cit_sign', 17, 15, 'GLADIUS ARENA\nTournament sign-ups inside. The Grey Lion fights at dusk.\nNo weapons in the stands, no Hollow in the sand.'));

    // ---- secret: a whetstone in the south-west alcove (hidden behind the bushes) ----
    m.ev(H.chest('g_citadel_secret', 3, 31, 'whetstone', 1));
    // @@CIT_EV@@
  }

  // ===================================================================
  // GLADIUS TAVERN (interior)  — The Gilded Dice  (Rook's den)
  // ===================================================================
  function buildTavern() {
    const m = G.maps.build('gladius_tavern', 20, 14, {
      name: 'The Gilded Dice', bgm: 'tavern', interior: true, spawn: { x: 10, y: 12, dir: 'up' },
    });
    m.room(0, 0, 20, 14, { floor: 'f', wall: 'X', topWall: 2 });
    m.rect('ground', 2, 3, 16, 9, 'c');                        // red carpet hall
    m.hline('objects', 1, 1, 18, 'S');                         // back shelves of bottles
    m.set('objects', 3, 1, 'Y'); m.set('objects', 16, 1, 'Y');
    m.set('objects', 5, 1, 'S');
    // bar along the north wall
    m.hline('objects', 6, 3, 8, 'E');
    m.set('objects', 6, 4, 'U'); m.set('objects', 13, 4, 'U');
    // dice tables
    m.set('objects', 3, 7, 'E'); m.set('objects', 4, 7, 'E'); m.set('objects', 2, 7, 'H');
    m.set('objects', 3, 6, 'H'); m.set('objects', 3, 8, 'H'); m.set('objects', 4, 6, 'H');
    m.set('objects', 15, 7, 'E'); m.set('objects', 16, 7, 'E'); m.set('objects', 14, 7, 'H');
    m.set('objects', 15, 6, 'H'); m.set('objects', 15, 8, 'H'); m.set('objects', 17, 7, 'H');
    // hearth & lounge
    m.set('objects', 17, 4, 'I'); m.set('objects', 1, 11, 'C'); m.set('objects', 2, 11, 'C');
    m.set('objects', 18, 10, 'U'); m.set('objects', 17, 10, 'U');
    m.set('objects', 8, 11, 'Z');                              // a cot in the back room
    m.set('objects', 9, 9, 'E'); m.set('objects', 9, 10, 'H');
    m.set('objects', 6, 9, 'V');
    // the exit door in the south wall
    m.set('objects', 10, 13, 'D');
    m.set('objects', 13, 2, 'V');
    m.set('objects', 6, 2, 'V');
    m.set('objects', 1, 2, 'L');  m.set('objects', 18, 2, 'L');
    m.encounters(null);
    tavernEvents(m);
    return m.finish();
  }

  function tavernEvents(m) {
    m.ev(H.transfer(10, 13, 'gladius_citadel', 31, 27, 'up', { id: 'tav_to_cit', sfx: true }));

    // ---- Rook at the dice table (visible until he joins the party) ----
    m.ev({
      id: 'tav_rook', x: 16, y: 6, sprite: 'rook', trigger: 'action', solid: true, dir: 'left', name: 'Rook',
      if: () => !inParty('rook'),
      run: async (c) => {
        if (!flag('ch2_met_rook')) {
          await c.say('Rook', 'Oh? You found the Dice! Sit down, Kindler, the house always wins, but I make it a fun way to lose.', 'rook', 'smirk');
          G.setFlag('ch2_met_rook', true);
        }
        const first = !flag('ch2_dice_played');
        if (first) await c.say('Rook', "Dice, not cards. Cards are for cheats, dice are for honest liars. Now, what's your bet?", 'rook', 'happy');
        else await c.say('Rook', "Back for more? I like a regular. It makes my dice feel loved.", 'rook', 'smirk');
        const pick = await c.choice(['Bet 10 gold', 'Bet 30 gold', 'Ask Rook about his coin', 'Just watch'], { prompt: 'Roll the dice' });
        if (pick === 3) { await c.say('Rook', 'Watching is free. Lovely of you. Hold my drink, would you?', 'rook', 'smirk'); return; }
        if (pick === 2) {
          await c.say('{name}', 'Your coin. Where did you get it?', null);
          await c.say('Rook', "From my mum. She said the luckiest coins are the ones you give away. I keep giving it back to myself, so I'm very lucky.", 'rook', 'smirk');
          await c.affection('rook', 1, 'Asked about the lucky coin');
          return;
        }
        const bet = pick === 0 ? 10 : 30;
        if (G.state.gold < bet) {
          await c.say('Rook', "Rowan, your pouch is lighter than my rent. Come back with the coin and we'll play.", 'rook', 'worried');
          return;
        }
        await c.gold(-bet);
        await c.say('Rook', 'Call it: high roll or low roll.', 'rook', 'smirk');
        const call = await c.choice(['High roll', 'Low roll'], { prompt: 'Your call' });
        c.sfx('ok');
        const roll = Math.random() < 0.5 ? 'high' : 'low';
        const won = (roll === 'high') === (call === 0);
        await c.say(null, 'The dice rattle across the felt... ' + roll.toUpperCase() + ' roll.');
        if (won) {
          await c.gold(bet * 2);
          await c.say('Rook', 'Oh! The dice fell in your favour. How unfair. Next time, I rig the table, just for you.', 'rook', 'happy');
          await c.affection('rook', bet >= 30 ? 2 : 1, 'Won a dice round with Rook');
          if (!hasItemState('lucky_coin') && !flag('ch2_rook_coin')) {
            G.setFlag('ch2_rook_coin', true);
            await c.say('Rook', 'Here. Take my lucky coin. Keep it. Luck is better when it is shared, and I have never once been lucky alone.', 'rook', 'smirk');
            await c.addItem('lucky_coin', 1);
          }
        } else {
          await c.say('Rook', 'Ouch. Losing is just winning someone else a rest. Want to try again? Only one of us is nervous, and it\'s not me.', 'rook', 'smirk');
          await c.affection('rook', 1, 'Lost a round, but stayed to laugh');
        }
        G.setFlag('ch2_dice_played', true);
      },
    });

    // ---- Mirela the barmaid: free ember wine for a regular ----
    m.ev(H.npc('tav_barmaid', 9, 2, 'innkeeper', [
      { who: 'Mirela', text: 'Tavern rule number one: drink the wine, leave a tip, and never tell Rook your real name. He will use it at the wrong moment.' },
    ], {
      name: 'Mirela',
      after: async (c) => {
        if (!flag('ch2_wine_given')) {
          G.setFlag('ch2_wine_given', true);
          await c.say('Mirela', 'And one for the road, on the house. Ember wine. Don\'t tell the Warden I had it made in a bathtub.', null);
          await c.addItem('ember_wine', 1);
        }
      },
    }));

    // ---- the innkeeper (rest for a fee) ----
    m.ev(H.innkeeper('tav_inn', 17, 11, 'innkeeper', 25, 'Innkeeper Bastel'));

    // ---- a drunk patron at the bar, and a sailor who lost a bet ----
    m.ev(H.npc('tav_drunk', 11, 6, 'villager_m2', [
      { who: 'Drunk', text: 'The lamps are very warm, friend. So warm I can\'t remember where I left my hat. Maybe the hat is in the lamp.' },
    ], { name: 'Drunk' }));
    m.ev(H.npc('tav_sailor', 7, 10, 'sailor', [
      { who: 'Sailor', text: 'Rook owes me five gold and a boot. Swear he has my boot. Good crew, though. Good crew.' },
    ], { name: 'Sailor' }));

    // ---- dealer behind the dice table ----
    m.ev(H.npc('tav_dealer', 4, 5, 'noble', [
      { who: 'Dealer Nyx', text: 'Five dice, one rule: never bet on a lie. The house does not care who wins. The house only cares that you keep coming back.' },
    ], { name: 'Dealer Nyx' }));

    // ---- cellar chest with a little coin ----
    m.ev(H.chest('g_tavern_cellar', 18, 12, { gold: 60 }));
    // @@TAV_EV@@
  }

  // ===================================================================
  // GLADIUS ARENA (44 x 30)  — sand ring, stands, tournament
  // ===================================================================
  function buildArena() {
    const m = G.maps.build('gladius_arena', 44, 30, {
      name: 'Gladius Arena', bgm: 'arena', spawn: { x: 22, y: 23, dir: 'up' },
    });
    // rings: stone walkway (t) inside the sandstone stands (A), sand (a) in the middle
    m.blob('ground', 22, 14, 18, 12, '=');                     // paved outer ring
    m.blob('objects', 22, 14, 18, 12, 'A');                    // stands
    m.blob('objects', 22, 14, 15, 10, ' ');                    // clear the walkway
    m.blob('ground', 22, 14, 15, 10, 't');
    m.blob('ground', 22, 14, 13, 8.5, 'a');                    // sand
    m.blob('objects', 22, 14, 13, 8.5, ' ');
    // gates
    m.set('objects', 22, 26, 'D');                             // main gate to the citadel
    m.set('objects', 22, 25, ' '); m.set('ground', 22, 25, 't');
    m.set('objects', 4, 14, 'D'); m.set('objects', 5, 14, ' '); m.set('objects', 6, 14, ' ');
    m.set('ground', 5, 14, 't'); m.set('ground', 6, 14, 't');  // back gate -> aqueduct
    // seats: a few stone benches along the walkway and banners on the stands
    [[12, 4], [32, 4], [12, 24], [32, 24]].forEach(([x, y]) => m.set('objects', x, y, 'V'));
    m.set('objects', 22, 2, 'V'); m.set('objects', 40, 14, 'V'); m.set('objects', 4, 10, 'V');
    m.set('objects', 3, 14, 'Q'); m.set('objects', 41, 14, 'Q');
    m.set('objects', 18, 25, 's'); m.set('objects', 26, 25, 's');
    m.set('objects', 8, 14, 's'); m.set('objects', 36, 14, 's');
    // corridor lamps (walkway)
    [[9, 9], [35, 9], [9, 19], [35, 19]].forEach(([x, y]) => m.set('objects', x, y, 'L'));
    // a palm-ish decor beyond the rings (outside the stands)
    m.scatter('objects', 'T', 8, { seed: 21, on: '.', avoid: [{ x: 0, y: 0, w: 44, h: 27 }] });
    arenaEvents(m);
    return m.finish();
  }

  function arenaEvents(m) {
    m.ev(H.transfer(22, 26, 'gladius_citadel', 21, 12, 'down', { id: 'arena_to_cit' }));
    // @@ARENA_EV@@
  }

  // ===================================================================
  // AQUEDUCT (see chapter 2 pass to the Lantern Vault)  — stubs are replaced below
  // ===================================================================
  function buildAqueducts() { return null; }

  // ===================================================================
  // registration & chapter card
  // ===================================================================
  G.story.chapters[2] = { title: 'Sand & Oath', subtitle: 'The Grey Lion of Gladius' };

  // @@APPEND@@
  G.provide('ch2');
})();
