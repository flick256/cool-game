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

    // ---- ground: paths first, then paving patterns laid over them -----------------------
    m.path([[11, 29], [21, 29], [21, 13]], '=', 3);            // spawn avenue -> plaza
    m.path([[2, 21], [17, 21]], '=', 2);                       // west market avenue
    m.path([[3, 9], [3, 12], [17, 12]], '=', 2);               // NW houses -> plaza
    m.path([[10, 8], [10, 11]], '=', 1);                       // back door of NW house 2
    m.path([[36, 7], [36, 13], [25, 13]], '=', 2);             // NE houses -> plaza
    m.path([[25, 21], [36, 21], [36, 20]], '=', 2);            // plaza -> smithy door
    m.path([[31, 27], [25, 27], [25, 21]], '=', 2);            // tavern door -> plaza
    m.rect('ground', 1, 18, 9, 3, '=');                        // market cobbles
    m.rect('ground', 11, 18, 5, 3, '=');                       // fruit-stall cobbles
    m.rect('ground', 17, 13, 9, 9, '=');                       // central plaza
    m.rect('ground', 15, 12, 13, 1, 't');                      // colosseum forecourt flagstones
    m.rect('ground', 19, 16, 5, 5, 'g');                       // marble inlay around the fountain
    [[17, 13], [25, 13], [17, 21], [25, 21]].forEach(([x, y]) => m.set('ground', x, y, 'l'));   // warm glow corners
    m.rect('ground', 24, 29, 5, 4, 't');                       // tavern terrace (stone patio)
    m.rect('ground', 9, 27, 4, 3, 'v');                        // moss patches (reclaimed by nature)
    m.rect('ground', 30, 30, 6, 3, 'v');
    m.rect('ground', 33, 27, 3, 2, 'v');
    m.rect('ground', 2, 24, 6, 2, 'v');                        // overgrown ruin floor

    // ---- colosseum: sandstone bowl, crown of pillars, arched grand entrance -------------
    m.blob('objects', 21, 6, 10, 5, 'A');
    for (let x = 12; x <= 30; x += 2) m.set('objects', x, 1, 'Q');   // crown of pillars
    m.set('objects', 21, 11, 'D');                                    // grand entrance
    m.hline('objects', 20, 12, 3, 'u');                               // steps
    m.hline('above', 20, 10, 3, '@');                                 // arch lintel over the door
    m.set('objects', 18, 11, 's'); m.set('objects', 24, 11, 's');     // statues flanking the door
    m.set('objects', 19, 12, 'L'); m.set('objects', 23, 12, 'L');     // lamps at the steps
    m.set('objects', 16, 12, 'Q'); m.set('objects', 26, 12, 'Q');     // pillars framing the forecourt
    m.set('objects', 13, 11, 'Q'); m.set('objects', 15, 11, 'Q');     // colonnade, west
    m.set('objects', 27, 11, 'Q'); m.set('objects', 29, 11, 'Q');     // colonnade, east
    m.set('objects', 13, 4, 'V'); m.set('objects', 29, 4, 'V');       // banners on the bowl
    m.set('objects', 14, 7, 'V'); m.set('objects', 28, 7, 'V');
    m.set('objects', 17, 9, 'V'); m.set('objects', 25, 9, 'V');
    m.set('objects', 14, 13, 's'); m.set('objects', 28, 13, 's');    // plaza plinth statues

    // ---- plaza furniture ----------------------------------------------------------------
    m.set('objects', 21, 18, 'o');                                    // central fountain
    m.set('objects', 19, 16, 'H'); m.set('objects', 23, 16, 'H');    // benches at the marble corners
    m.set('objects', 19, 20, 'H'); m.set('objects', 23, 20, 'H');
    [[16, 13], [26, 13], [16, 21], [26, 21], [12, 25], [30, 25], [22, 27]].forEach(([x, y]) => m.set('objects', x, y, 'L'));

    // ---- west market: stall 1 (merchant, shop) --------------------------------------------
    m.rect('objects', 2, 15, 7, 1, '5');                              // red awning
    m.rect('objects', 2, 16, 7, 1, 'S');                              // shelves of goods
    m.rect('objects', 2, 17, 7, 1, 'E');                              // counter
    m.hline('above', 2, 14, 7, '*');                                  // strings of lanterns over the market
    m.set('objects', 1, 16, 'V');
    m.set('objects', 1, 19, 'C'); m.set('objects', 8, 19, 'C');      // crates
    m.set('objects', 1, 20, 'U'); m.set('objects', 9, 20, 'U');      // barrels
    // ---- market stall 2: fruit & flowers (vendor) -----------------------------------------
    m.rect('objects', 11, 15, 4, 1, '2');
    m.rect('objects', 11, 16, 4, 1, 'S');
    m.rect('objects', 11, 17, 4, 1, 'E');
    m.hline('above', 11, 14, 4, '*');
    m.set('objects', 15, 19, 'U'); m.set('objects', 16, 19, 'C');

    // ---- NW houses ------------------------------------------------------------------------
    m.house(1, 3, 5, 5, { roof: '1', wall: 'X', doorAt: 2 });         // door (3,7)
    m.house(8, 4, 4, 4, { roof: '5', wall: 'W', doorAt: 2 });         // door (10,7)
    m.set('objects', 6, 5, 'B'); m.set('objects', 6, 7, 'B');
    m.set('objects', 5, 1, 'T');
    m.set('objects', 7, 8, 'U'); m.set('objects', 1, 9, 'F'); m.set('objects', 2, 9, 'F');

    // ---- NE houses (inn-ish home, then a row of roofs) ------------------------------------
    m.house(34, 2, 6, 5, { roof: '2', wall: 'X', doorAt: 2 });        // door (36,6)
    m.house(38, 9, 4, 4, { roof: '4', wall: 'W', doorAt: 2 });        // door (40,12)
    m.set('objects', 42, 6, 'B'); m.set('objects', 41, 2, 'Y');
    m.set('objects', 42, 9, 'U'); m.set('objects', 33, 8, 'L');

    // ---- smithy (metal, copper roof, forge) -----------------------------------------------
    m.house(34, 15, 6, 5, { roof: '6', wall: '7', doorAt: 2 });       // door (36,19)
    m.set('objects', 32, 16, 'M'); m.set('objects', 41, 16, 'J');
    m.set('objects', 31, 19, 'e'); m.set('objects', 33, 18, 'U');
    m.set('objects', 33, 20, 'C');
    m.rect('objects', 40, 19, 2, 2, 'P');

    // ---- east garden: flower beds, a hedge, a shade tree ----------------------------------
    m.rect('objects', 27, 16, 2, 1, 'F'); m.set('objects', 27, 17, 'F');
    m.hline('objects', 27, 19, 2, 'B');
    m.set('objects', 29, 17, 'T');

    // ---- tavern (The Gilded Dice) and its stone terrace -----------------------------------
    m.house(28, 22, 7, 5, { roof: '3', wall: 'X', doorAt: 3 });       // door (31,26)
    m.set('objects', 35, 24, 'U'); m.set('objects', 35, 25, 'U');
    m.set('objects', 27, 25, 'E'); m.set('objects', 26, 25, 'H');     // outdoor table
    m.set('objects', 29, 28, 'x');                                    // fence line for the terrace
    m.set('objects', 25, 31, 'E'); m.set('objects', 24, 31, 'H'); m.set('objects', 26, 31, 'H');   // terrace café
    m.set('objects', 28, 30, 'E'); m.set('objects', 28, 29, 'H');
    m.set('objects', 24, 29, 'F');

    // ---- south-east pond: reed shallows, benches, trees ------------------------------------
    m.blob('ground', 38, 29, 4.5, 3.5, 'w');
    m.pond(38, 29, 3, 2);
    m.set('objects', 33, 28, 'H'); m.set('objects', 40, 33, 'H');
    m.set('objects', 34, 33, 'T'); m.set('objects', 41, 33, 'T');
    m.set('objects', 37, 33, 'R'); m.set('objects', 42, 30, 'F');
    m.set('objects', 41, 26, 'L');

    // ---- NE garden hedge and flowers ------------------------------------------------------
    m.hline('objects', 40, 13, 3, 'B');
    m.rect('objects', 41, 16, 2, 1, 'F'); m.set('objects', 41, 17, 'F');
    m.set('objects', 42, 20, 'T');

    // ---- south-west: ruined colonnade and the secret alcove -------------------------------
    m.set('objects', 2, 24, 'Q'); m.set('objects', 5, 24, 'Q'); m.set('objects', 8, 24, 'Q');
    m.set('objects', 4, 26, 'r'); m.set('objects', 7, 27, 'r');
    m.set('objects', 2, 27, 'F'); m.set('objects', 3, 27, 'F');
    m.set('objects', 2, 31, 'B'); m.set('objects', 4, 31, 'B'); m.set('objects', 3, 32, 'B');

    // ---- scenery: trees, bushes, flowers, grass (deterministic scatter) -------------------
    const npc = [[21, 16], [20, 15], [15, 16], [19, 14], [12, 23], [23, 22], [30, 15], [16, 24], [12, 21],
      [27, 22], [38, 21], [13, 18], [5, 18], [17, 15], [11, 30], [3, 31], [21, 11], [31, 26]];
    const avoid = [
      { x: 9, y: 0, w: 26, h: 14 },   // colosseum & forecourt
      { x: 14, y: 12, w: 13, h: 12 }, // plaza
      { x: 10, y: 24, w: 14, h: 8 },  // spawn avenue
      { x: 0, y: 13, w: 18, h: 10 },  // market
      { x: 0, y: 0, w: 9, h: 13 },    // NW houses
      { x: 33, y: 0, w: 11, h: 14 },  // NE houses
      { x: 27, y: 14, w: 17, h: 14 }, // smithy, garden & tavern
      { x: 0, y: 30, w: 6, h: 4 },    // secret alcove
      { x: 22, y: 27, w: 8, h: 6 },   // tavern terrace
      { x: 32, y: 25, w: 12, h: 9 },  // pond shore
    ].concat(npc.map(([x, y]) => ({ x: x - 1, y: y - 1, w: 3, h: 3 })));
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
      await say(c, 'Claret', 'Gladius. Sand in the teeth, sun on the stones, and a sky that looks like it wants to sell us a nap.', 'claret', 'normal');
      await say(c, 'Claret', "Don't laugh. I'm sky-sick again. Ten minutes on the ground and my ears still think they're in a cloud.", 'claret', 'worried');
      const i = await c.choice(['Earnest: "It\'s warm. People here look... happy?"', 'Teasing: "Just say you missed the Marigold."', 'Brave: "Then we walk. Fast."'], { prompt: 'How do you answer?' });
      if (i === 0) await say(c, '{name}', 'It\'s warm. Everyone here looks happy, almost.', null);
      if (i === 1) { await say(c, '{name}', 'You missed the Marigold. Admit it.', null); await say(c, 'Claret', "Shut up. I'm not admitting anything with a sky like that watching.", 'claret', 'smirk'); }
      if (i === 2) { await say(c, '{name}', 'Then we walk, fast, and get you somewhere with a roof.', null); await say(c, 'Claret', "Hm. You're not wrong. Lead, Kindler.", 'claret', 'happy'); }
      await c.affection('claret', i === 1 ? 2 : 1, 'Gladius arrival banter');
      await c.narrate('Gladius is crowded and quiet at once. A vendor yawns over a crate of figs. A dicing crowd stares at the dice without rolling them. A child drags a stick along the cobbles and forgets to finish the line.');
      await say(c, 'Claret', 'Look at the lamps. Every one of them is burning, and nobody in this city looks warm.', 'claret', 'worried');
      await say(c, '{name}', "Something's draining them. Like the lamps are eating the warmth. I can almost see it.", null);
      await say(c, 'Claret', "Let's keep our eyes open and our hands near our pockets. Rule one of any city with a colosseum: somebody is always selling something.", 'claret', 'smirk');
    }, { once: true, if: () => !flag('ch2_started') }));

    // ---- Rook's pickpocket on the fountain steps (once, after arrival) ----
    m.ev(H.auto('cit_pickpocket', async (c) => {
      await c.narrate('A red-haired man in a green coat bumps into you on the fountain steps, apologising far too loudly. His hand is already at your belt pouch.');
      await say(c, 'Rook', "Oh! Sorry, sorry, lovely day for it. Gladius is full of hazards. Mostly me.", 'rook', 'smirk');
      const i = await c.choice([
        'Earnest: "Give it back, please."',
        'Teasing: "Is that how you say hello here?"',
        'Flustered: "Wh-what are you doing?!"',
        'Brave: "Nice try. Hand it over."',
      ], { prompt: 'Catch the thief...' });
      if (i === 0) {
        await say(c, '{name}', 'Give it back, please. It has an important compass in it.', null);
        await say(c, 'Rook', 'Oh, a compass! Nobody ever trusts a man with a compass. Here, a deal: I keep the pouch, you keep your face.', 'rook', 'smirk');
      } else if (i === 1) {
        await say(c, '{name}', 'Is that how you say hello in Gladius? By robbing people?', null);
        await say(c, 'Rook', 'Only the pretty ones, sweetheart. You should see the ones I hand back.', 'rook', 'smirk');
        await c.affection('rook', 2, 'Teasing Rook back');
      } else if (i === 2) {
        await say(c, '{name}', 'Wh-what are you doing?! That is not your pocket!', null);
        await say(c, 'Rook', "Ooh, and they blush! Don't worry, I only steal things I actually want. And I don't want anything from you. Yet.", 'rook', 'smirk');
        await c.affection('rook', 1, 'Flustered in front of Rook');
      } else {
        await say(c, '{name}', 'Nice try. Hand it over before I make you hand over your boots.', null);
        await say(c, 'Rook', 'Ha! Brave one. I like brave. Brave is expensive to lift from.', 'rook', 'happy');
        await c.affection('rook', 2, 'Brave face for Rook');
      }
      await say(c, 'Claret', "He had the pouch open, genius. You're lucky it's not my wallet, I'd have broken his fingers.", 'claret', 'angry');
      await say(c, 'Rook', "Tell your friend I'm not a thief. I'm a freelancer. And I just want to say, the tavern across the plaza has the best dice in the Vale.", 'rook', 'smirk');
      await say(c, 'Rook', "I'm called Rook, by the way. Rook Calloway. If you want your compass back, you'll find me at the Gilded Dice. Bring something to bet.", 'rook', 'happy');
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
      { who: 'Sailor', text: 'Is that the Marigold? No, she\'s got a patched gas bag. Good ship. Good crew. Bad luck.', face: 'unknown' },
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
              await say(c, null, 'Your weapon hums like a fresh bell. Mede hands you a Focus Charm, clinking.');
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
    m.set('objects', 5, 0, 'V'); m.set('objects', 14, 0, 'V'); // house banners on the back wall
    m.set('objects', 0, 6, 'O'); m.set('objects', 19, 6, 'O'); // glowing windows
    // back bar: bookshelves and bottles along the north wall
    m.hline('objects', 1, 1, 18, 'S');
    m.set('objects', 3, 1, 'Y'); m.set('objects', 9, 1, 'Y'); m.set('objects', 16, 1, 'Y');
    m.hline('above', 2, 1, 16, '*');                           // paper lanterns strung along the shelves
    // bar counter with casks and bar stools
    m.hline('objects', 6, 3, 8, 'E');
    m.set('objects', 6, 4, 'U'); m.set('objects', 13, 4, 'U');
    m.set('objects', 8, 4, 'H'); m.set('objects', 10, 4, 'H'); m.set('objects', 11, 4, 'H');
    // dice tables
    m.set('objects', 3, 7, 'E'); m.set('objects', 4, 7, 'E'); m.set('objects', 2, 7, 'H');
    m.set('objects', 3, 6, 'H'); m.set('objects', 3, 8, 'H'); m.set('objects', 4, 6, 'H');
    m.set('objects', 15, 7, 'E'); m.set('objects', 16, 7, 'E'); m.set('objects', 14, 7, 'H');
    m.set('objects', 15, 6, 'H'); m.set('objects', 15, 8, 'H'); m.set('objects', 17, 7, 'H');
    // hearth with firewood, and a side shelf
    m.set('objects', 17, 4, 'I'); m.set('objects', 18, 3, 'C');
    m.set('objects', 18, 6, 'S'); m.set('objects', 18, 7, 'S');
    // lounge in the back-left corner
    m.set('objects', 1, 11, 'C'); m.set('objects', 2, 11, 'C');
    m.set('objects', 4, 10, 'E'); m.set('objects', 3, 10, 'H'); m.set('objects', 5, 10, 'H');
    m.set('objects', 18, 10, 'U'); m.set('objects', 17, 10, 'U');
    // dining corner by the innkeeper, and a cot in the back room
    m.set('objects', 13, 11, 'E'); m.set('objects', 14, 11, 'H');
    m.set('objects', 8, 11, 'Z');
    m.set('objects', 9, 9, 'E'); m.set('objects', 9, 10, 'H');
    // the exit door in the south wall, lamps in the corners
    m.set('objects', 10, 13, 'D');
    m.set('objects', 1, 2, 'L'); m.set('objects', 18, 2, 'L');
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
          await say(c, 'Rook', 'Oh? You found the Dice! Sit down, Kindler, the house always wins, but I make it a fun way to lose.', 'rook', 'smirk');
          G.setFlag('ch2_met_rook', true);
        }
        const first = !flag('ch2_dice_played');
        if (first) await say(c, 'Rook', "Dice, not cards. Cards are for cheats, dice are for honest liars. Now, what's your bet?", 'rook', 'happy');
        else await say(c, 'Rook', "Back for more? I like a regular. It makes my dice feel loved.", 'rook', 'smirk');
        const pick = await c.choice(['Bet 10 gold', 'Bet 30 gold', 'Ask Rook about his coin', 'Just watch'], { prompt: 'Roll the dice' });
        if (pick === 3) { await say(c, 'Rook', 'Watching is free. Lovely of you. Hold my drink, would you?', 'rook', 'smirk'); return; }
        if (pick === 2) {
          await say(c, '{name}', 'Your coin. Where did you get it?', null);
          await say(c, 'Rook', "From my mum. She said the luckiest coins are the ones you give away. I keep giving it back to myself, so I'm very lucky.", 'rook', 'smirk');
          await c.affection('rook', 1, 'Asked about the lucky coin');
          return;
        }
        const bet = pick === 0 ? 10 : 30;
        if (G.state.gold < bet) {
          await say(c, 'Rook', "Rowan, your pouch is lighter than my rent. Come back with the coin and we'll play.", 'rook', 'worried');
          return;
        }
        await c.gold(-bet);
        await say(c, 'Rook', 'Call it: high roll or low roll.', 'rook', 'smirk');
        const call = await c.choice(['High roll', 'Low roll'], { prompt: 'Your call' });
        c.sfx('ok');
        const roll = Math.random() < 0.5 ? 'high' : 'low';
        const won = (roll === 'high') === (call === 0);
        await say(c, null, 'The dice rattle across the felt... ' + roll.toUpperCase() + ' roll.');
        if (won) {
          await c.gold(bet * 2);
          await say(c, 'Rook', 'Oh! The dice fell in your favour. How unfair. Next time, I rig the table, just for you.', 'rook', 'happy');
          await c.affection('rook', bet >= 30 ? 2 : 1, 'Won a dice round with Rook');
          if (!hasItemState('lucky_coin') && !flag('ch2_rook_coin')) {
            G.setFlag('ch2_rook_coin', true);
            await say(c, 'Rook', 'Here. Take my lucky coin. Keep it. Luck is better when it is shared, and I have never once been lucky alone.', 'rook', 'smirk');
            await c.addItem('lucky_coin', 1);
          }
        } else {
          await say(c, 'Rook', 'Ouch. Losing is just winning someone else a rest. Want to try again? Only one of us is nervous, and it\'s not me.', 'rook', 'smirk');
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
          await say(c, 'Mirela', 'And one for the road, on the house. Ember wine. Don\'t tell the Warden I had it made in a bathtub.', null);
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
    // rings: paved walkway inside the sandstone stands (A), sand (a) in the middle
    m.blob('ground', 22, 14, 18, 12, '=');                     // paved outer ring
    m.blob('objects', 22, 14, 18, 12, 'A');                    // stands
    m.blob('objects', 22, 14, 15, 10, ' ');                    // clear the walkway
    m.blob('ground', 22, 14, 15, 10, 't');
    m.blob('ground', 22, 14, 13, 8.5, 'a');                    // sand
    m.blob('objects', 22, 14, 13, 8.5, ' ');
    m.rect('ground', 20, 22, 5, 3, 'g');                       // marble bands on the walkway, south
    m.rect('ground', 20, 5, 5, 2, 'g');                        // and north
    [[9, 9], [35, 9], [9, 19], [35, 19]].forEach(([x, y]) => m.set('ground', x, y, 'l'));   // lamp-lit corners

    // gates: the main gate faces the citadel, the back gate opens onto the aqueduct
    m.set('objects', 22, 26, 'D');                             // main gate to the citadel
    m.set('objects', 22, 25, ' '); m.set('ground', 22, 25, 't');
    m.rect('ground', 18, 27, 9, 3, 't');                       // paved gate court outside the arena
    m.set('objects', 19, 27, 'Q'); m.set('objects', 25, 27, 'Q');
    m.set('objects', 19, 29, 'L'); m.set('objects', 25, 29, 'L');
    m.set('objects', 4, 14, 'D'); m.set('objects', 5, 14, ' '); m.set('objects', 6, 14, ' ');
    m.set('ground', 5, 14, 't'); m.set('ground', 6, 14, 't');  // back gate -> aqueduct
    m.set('objects', 3, 14, 'Q'); m.set('objects', 41, 14, 'Q');
    m.set('objects', 3, 12, 'Q'); m.set('objects', 3, 16, 'Q');
    m.set('objects', 41, 12, 'Q'); m.set('objects', 41, 16, 'Q');

    // colossal crown of pillars along the top, banners on the bowl
    for (let x = 14; x <= 30; x += 4) m.set('objects', x, 1, 'Q');
    [[22, 2], [12, 4], [32, 4], [12, 24], [32, 24], [6, 10], [38, 10], [6, 18], [38, 18], [40, 14], [20, 25], [24, 25]]
      .forEach(([x, y]) => m.set('objects', x, y, 'V'));
    m.set('objects', 4, 10, 'V');
    m.set('objects', 18, 25, 's'); m.set('objects', 26, 25, 's');     // statues flanking the main gate
    m.set('objects', 8, 14, 's'); m.set('objects', 36, 14, 's');      // walkway statues
    [[9, 9], [35, 9], [9, 19], [35, 19]].forEach(([x, y]) => m.set('objects', x, y, 'L'));   // corridor lamps

    // trees and bushes beyond the stands, a tree line around the bowl
    const outside = [{ x: 4, y: 2, w: 37, h: 24 }, { x: 17, y: 26, w: 11, h: 4 }];
    m.scatter('objects', 'T', 22, { seed: 21, on: '.', avoid: outside });
    m.scatter('objects', 'B', 14, { seed: 22, on: '.', avoid: outside });
    m.scatter('objects', 'F', 10, { seed: 23, on: '.', avoid: outside });
    m.scatter('objects', 'G', 10, { seed: 24, on: '.', avoid: outside });
    arenaEvents(m);
    return m.finish();
  }

  // tournament text per bout (1..3). Bout n is battle 'arena_n'; ch2_round = bouts won so far.
  const BOUTS = {
    1: {
      ann: 'Bout One! Two recruits from the drill yards, still smelling of the parade! Show us some sand!',
      tor: "Don't look at the crowd, friend. They only bite when you look back.",
      win: "A clean win! Torvald's heart is doing a jig. Next bout in five minutes. Drink some water.",
      lose: 'Ach, you bounced off them like a cart off a wall. Up you get. The crowd loves a comeback.',
    },
    2: {
      ann: 'Bout Two! Arena hounds, savage and hungry, and one recruit who bites! The crowd is hungry too!',
      tor: "Hounds aren't evil, friend. They run until somebody falls over. Be the somebody who doesn't.",
      win: "Hounds down! You're better than the Ashgrove champion. Don't tell him, he cries easily.",
      lose: 'The hounds did not even break a sweat. Get your breath back. Round three waits for nobody.',
    },
    3: {
      ann: 'Bout Three! Sand bandits from the dune camps! Three of them, and a taste for purses!',
      tor: 'Bandits take your purse, your boots, and sometimes your dignity. Keep the dignity.',
      win: "That's three bouts! The Champion's Pass is nearly in your hands. Nearly.",
      lose: 'The bandits stole your breath, not your place in the bracket. Stand up. I will pretend you did not squeal.',
    },
  };

  // runs bout n (1..3). Returns true when the bout was won.
  async function runBout(c, n) {
    const B = BOUTS[n];
    await say(c, 'Announcer Quill', B.ann, 'unknown');
    await say(c, 'Torvald', B.tor, 'torvald', 'smirk');
    c.bgm('arena');
    const r = await c.battle('arena_' + n, { canEscape: false, bgm: 'battle', bg: 'arena', loseOk: true });
    if (r === 'win') {
      G.setFlag('ch2_round', n);
      await say(c, 'Torvald', B.win, 'torvald', 'happy');
      return true;
    }
    await say(c, 'Torvald', B.lose, 'torvald', 'worried');
    return false;
  }

  // the Champion finale: the Grey Lion steps onto the sand, the battle, the Pass, and the Order's standoff
  async function runFinale(c) {
    await say(c, 'Announcer Quill', 'The final bout! The Gladius Champion, undefeated since the Frost Fair, and three of his finest recruits!', 'unknown');
    await say(c, 'Torvald', 'Bring me his scalp and I will sell you a statue of yourself. Wait... is that the Grey Lion?', 'torvald', 'surprised');
    const r = await c.battle('boss_champion', {
      canEscape: false, bgm: 'boss', bg: 'arena', loseOk: true,
      intro: async (c) => {
        if (!flag('ch2_finale_intro')) {
          G.setFlag('ch2_finale_intro', true);
          await say(c, 'Announcer Quill', 'The Lion is stepping down from the walkway! The crowd is on its feet!', 'unknown');
          await c.emote('arena_caspian', 'exclaim');
          await say(c, 'Caspian', 'Champion. Step aside. The bout you want is not the one you have. I have stood in the shade for eleven years. I would like to try the sun.', 'caspian', 'normal');
          await say(c, '{name}', 'You are going to fight beside us? Caspian, you could be arrested for this.', null);
          await say(c, 'Caspian', 'Arrested is a fair price. I have been called worse by better men, and some of them were Wardens.', 'caspian', 'happy');
          await c.affection('caspian', 2, 'Caspian stepped onto the sand for you');
        }
        await c.join('caspian');
      },
      onHalf: async (c) => {
        await say(c, 'Caspian', 'He is tiring. Good. Watch his left foot. He leads with it when he is angry, which is always.', 'caspian', 'smirk');
      },
    });
    if (r !== 'win') {
      await say(c, 'Torvald', 'The Champion is a brute. Rest. Come back and let the sand have another try.', 'torvald', 'worried');
      return;
    }

    // ---- the Pass, the crowd, the Order's standoff ----
    G.setFlag('ch2_round', 4);
    G.setFlag('ch2_tournament_won', true);
    await say(c, 'Torvald', 'THE CHAMPION! The sand loves you! Here, the Pass, the Champion\'s Pass. It opens the old lamp-vault under my arena. Don\'t tell the Order.', 'torvald', 'happy');
    await c.addItem('gladius_pass', 1);
    await say(c, null, 'The Pass is a brass disc, stamped with a lantern. It is warm to the touch, the way a sleeping cat is warm.');

    await c.wait(20);
    await say(c, 'Warden Sorrel', 'Caspian Thorne. Knight-Lantern of the Hearth Order. You have worn the Lion for eleven years, and under the dust your sigil is still there.', 'unknown');
    await say(c, 'Caspian', 'Sorrel. I scratched the sigil out because I could not bear to look at it. Yes, I know what I did.', 'caspian', 'sad');
    await say(c, 'Warden Sorrel', 'You were sent to Ashmere. You put out their lamps, and four hundred people slept in the dark. You refused the order too late. The Order requires the Lion back.', 'unknown');
    const pick = await c.choice([
      'Earnest: "He is not yours to take."',
      'Teasing: "Your lantern is crooked, Warden."',
      'Brave: "Then you will have to ask me."',
    ], { prompt: 'Stand between them' });
    if (pick === 0) {
      await say(c, '{name}', 'He is not yours to take. He is standing here, which is more than your lamps did for Ashmere.', null);
      await c.affection('caspian', 2, 'Stood up for Caspian');
    } else if (pick === 1) {
      await say(c, '{name}', 'Your lantern is crooked, Warden. Your whole Order is crooked, if you ask the people in these stands.', null);
      await c.affection('caspian', 1, 'Teased the Warden');
    } else {
      await say(c, '{name}', 'Then you will have to ask me. Politely, if you can manage it. Caspian is not your property.', null);
      await c.affection('caspian', 2, 'Brave for Caspian');
    }
    await say(c, 'Caspian', pick === 2 ? 'You should not stand for me. You barely know me.' : 'You should not do this for me. You barely know me.', 'caspian', 'sad');
    await say(c, '{name}', 'Then let me get to know you. Starting with the part where you stop apologising.', null);
    await say(c, 'Caspian', '...Thank you. I will try. It is a very old habit.', 'caspian', 'blush');
    await say(c, 'Warden Sorrel', 'Then the vault is closed to you, Thorne, and to your friends. The Order does not forget a lamp that goes out.', 'unknown');
    await say(c, null, 'The Warden turns on his heel and marches for the gate. The crowd sees the Wardens leave and boos, then stops booing when they realise the sand is quiet.');

    // Rook drops in from the stands
    await say(c, null, 'A familiar laugh drifts down from the upper stands, and a green coat drops onto the sand beside you.');
    await c.join('rook');
    await say(c, 'Rook', 'Ha! Sorrel marched out like a man with a stick up his coat. And I lifted his pocket watch while he was busy being dramatic. Look at this!', 'rook', 'smirk');
    await say(c, 'Rook', "The Order's vault is under this sand, under the old Gladius aqueduct. The gate's guarded, but a gate is just a door that someone didn't want opened.", 'rook', 'happy');
    await say(c, 'Caspian', 'The old aqueduct. It still carries water from the hills, and it runs beneath the arena to the lamp-vault. I used to inspect it, once, long ago.', 'caspian', 'normal');
    await say(c, 'Claret', "Water, pipes, and a pressure valve, Captain's favourite. I'll handle the valves. You two handle being charming.", 'claret', 'smirk');
    await say(c, 'Rook', "Oh, I do charm very well. It's the being-caught I'm rubbish at.", 'rook', 'happy');
    G.setFlag('ch2_standoff_done', true);
    G.setFlag('ch2_heist_go', true);
    await c.toast('Gladius Pass, Lion and Rook joined', 'good');
    await say(c, 'Torvald', 'Go! Get out of my arena before you break the sand. And leave me a seat on the sand when you come back.', 'torvald', 'happy');
  }

  function arenaEvents(m) {
    m.ev(H.transfer(22, 26, 'gladius_citadel', 21, 12, 'down', { id: 'arena_to_cit' }));

    // ---- Torvald: enter the tournament, run bouts, then the finale ----
    m.ev({
      id: 'arena_torvald', x: 27, y: 22, sprite: 'torvald', trigger: 'action', solid: true, dir: 'left', name: 'Torvald',
      run: async (c) => {
        if (flag('ch2_tournament_won')) {
          await say(c, 'Torvald', "Champion! My favourite kind of trouble. The sand loves you. Don't get used to the sand loving you.", 'torvald', 'happy');
          return;
        }
        if (!flag('ch2_entered')) {
          await say(c, 'Torvald', 'Welcome to Gladius Arena! I am Torvald, the loudest man in the Vale and the only honest promoter. Want to fight?', 'torvald', 'happy');
          const i = await c.choice(['Enter the tournament (20 gold)', 'Just looking'], { prompt: 'Torvald' });
          if (i === 1) { await say(c, 'Torvald', 'Looking is free! Sand is not. Come back when you are brave or bored.', 'torvald', 'smirk'); return; }
          if (G.state.gold < 20) { await say(c, 'Torvald', 'Twenty gold, friend, or a sword that looks expensive. Come back when you have the coin.', 'torvald', 'worried'); return; }
          await c.gold(-20);
          G.setFlag('ch2_entered', true);
          await say(c, 'Torvald', "Three bouts. Win them all and I'll give you the Champion's Pass: the old lamp-vault under my sand. Trust me, it's a terrible place to keep a lamp.", 'torvald', 'smirk');
        }
        const won = G.flag('ch2_round') || 0;
        if (won < 3) {
          const n = won + 1;
          const ok = await runBout(c, n);
          if (ok && n === 3) await say(c, 'Torvald', 'Three bouts, the crowd is in tears, and the Champion is waiting. Oh, come on, you are going to win this too.', 'torvald', 'smirk');
        } else {
          await runFinale(c);
        }
      },
    });

    // ---- the Grey Lion, resting on the walkway; joins at the finale ----
    m.ev({
      id: 'arena_caspian', x: 9, y: 18, sprite: 'caspian', trigger: 'action', solid: true, dir: 'right', name: 'Grey Lion',
      if: () => !inParty('caspian'),
      run: async (c) => {
        if (!flag('ch2_met_caspian')) {
          G.setFlag('ch2_met_caspian', true);
          await say(c, 'Caspian', 'You are standing in my shade. It is a habit I am trying to break. Forgive me, I am told I apologise far too often.', 'caspian', 'normal');
          await say(c, '{name}', 'You are the Grey Lion? You look more like a kind librarian.', null);
          const i = await c.choice([
            'Earnest: "I heard you never lose."',
            'Teasing: "A librarian with a sword?"',
            'Flustered: "You are very tall, sorry."',
          ], { prompt: 'Talk to the Lion' });
          if (i === 0) {
            await say(c, 'Caspian', 'I have lost plenty. I just do not like to lose where people are watching. It is a vanity, and it is also a penance.', 'caspian', 'sad');
            await c.affection('caspian', 2, 'Earnest talk with Caspian');
          } else if (i === 1) {
            await say(c, 'Caspian', 'I was a librarian of sorts, once. Of lamps. Lanterns, Knight-Lantern work, the old ledgers. Books are the kindest thing I know.', 'caspian', 'smirk');
            await c.affection('caspian', 1, 'Teased Caspian about books');
          } else {
            await say(c, 'Caspian', 'I am told the height is a family trait, and so is the apologising. Please do not mind either.', 'caspian', 'blush');
            await c.affection('caspian', 1, 'Flustered, and Caspian noticed');
          }
          await say(c, 'Caspian', 'Once, I was a Knight-Lantern of the Hearth Order. My sigil is under the dust on my shoulder. Ask me about it another day, when I am braver.', 'caspian', 'normal');
          return;
        }
        if (!flag('ch2_caspian_sigil')) {
          await say(c, 'Caspian', 'Win your bouts. The Champion is Order-trained, and he will not say what he saw in the Frost Fair. I would rather you hear it from me.', 'caspian', 'normal');
          const j = await c.choice(['Ask about the sigil', 'Tell him you will win'], { prompt: 'Caspian' });
          if (j === 0) {
            G.setFlag('ch2_caspian_sigil', true);
            await say(c, 'Caspian', 'I was ordered to snuff the lamps of Ashmere, a village in the hills. For the star, they said. The star needs warmth, and the lamps take it from the people. I did it, for three nights. On the fourth I refused, and it was too late for the children.', 'caspian', 'sad');
            await say(c, '{name}', 'You stopped. That counts.', null);
            await say(c, 'Caspian', 'It counts for me, a little. It does not count for Ashmere. Thank you for not pretending it does.', 'caspian', 'blush');
            await c.affection('caspian', 2, 'Caspian shared his sigil story');
          } else {
            await say(c, 'Caspian', 'Then I shall stand at the gate and believe you. It is a foolish thing, but I find I want to.', 'caspian', 'happy');
            await c.affection('caspian', 1, 'Promised to win');
          }
        } else {
          await say(c, 'Caspian', 'You are kind to listen to an old oath. Take the Pass when it is given, and do not let the Warden make you feel small.', 'caspian', 'normal');
        }
      },
    });

    // ---- the Warden's reinforcements' sentinel is absent; crowd & announcer ----
    m.ev(H.npc('arena_announcer', 22, 4, 'villager_m1', [
      { who: 'Announcer Quill', text: "Welcome to Gladius Arena! Tickets are sold out, and so are the Wardens' seats. Lovely to have you, everyone!", face: 'unknown' },
      { who: 'Announcer Quill', text: 'The Grey Lion fights at dusk, folks, and he has never once looked at the crowd. Good manners in a gladiator. Terrible for ratings.', face: 'unknown' },
    ], { name: 'Announcer Quill' }));
    m.ev(H.npc('arena_kid', 12, 20, 'child2', [
      { who: 'Tomas', text: 'Are you the Grey Lion\'s friend? You look like you could be a Lion too. Can I touch your sword? Only the hilt.' },
    ], { name: 'Tomas' }));
    m.ev(H.npc('arena_spectator', 32, 8, 'villager_f2', [
      { who: 'Spectator', text: 'I came for the Lion and I got a sunburn. Worth it. The sand smells like warm bread and rust.' },
    ], { name: 'Spectator' }));
    m.ev(H.npc('arena_gladiator', 35, 18, 'gladiator', [
      { who: 'Gladiator', text: 'Stand near the ring and the wind howls. Stand in the stands and everybody sings. Sand gets in your teeth either way.' },
    ], { name: 'Gladiator' }));

    // ---- the back gate: locked until the Pass is won, then it opens to the aqueduct ----
    m.ev({
      id: 'arena_gate_sign', x: 5, y: 14, sprite: null, trigger: 'action', solid: false,
      if: () => !flag('ch2_tournament_won'),
      run: async (c) => { await say(c, null, 'An iron gate hums with cold lantern-light. A brass Order seal reads: CHAMPIONS ONLY. The Pass, or the sand.'); },
    });
    m.ev({
      id: 'arena_gate_warm', x: 5, y: 14, sprite: null, trigger: 'action', solid: false,
      if: () => !!flag('ch2_tournament_won'),
      run: async (c) => { await say(c, null, 'The gate is warm to the touch. Beyond it, water runs and the old walls breathe. The aqueduct, and the vault beneath it.'); },
    });
    m.ev(H.transfer(4, 14, 'aqueduct_1', undefined, undefined, 'left', { id: 'arena_to_aq', if: () => !!flag('ch2_tournament_won') }));

    // ---- a Lantern Waypoint on the walkway, before the finale ----
    m.ev(H.save('arena_save', 30, 22));

    // ---- prize chest by the walkway (the old champion's cup) ----
    m.ev(H.chest('g_arena_prize', 30, 6, 'hi_potion', 2));
    // @@ARENA_EV@@
  }

  // ===================================================================
  // AQUEDUCT (see chapter 2 pass to the Lantern Vault)  — stubs are replaced below
  // ===================================================================
  function buildAqueduct1() {
    const m = G.maps.build('aqueduct_1', 36, 26, {
      name: 'Old Gladius Aqueduct', bgm: 'undercroft', ground: 'k', spawn: { x: 2, y: 13, dir: 'right' },
    });
    m.rect('objects', 0, 0, 36, 26, '8');                      // living rock
    // main corridor: worn stone flags with moss in the cracks
    m.rect('objects', 1, 12, 34, 3, ' ');
    m.rect('ground', 1, 12, 34, 3, 't');
    m.rect('ground', 4, 12, 2, 1, 'v'); m.rect('ground', 26, 14, 2, 1, 'v');
    // the old water channel: an open flume cut through the rock, bridged where it crosses the corridor
    m.rect('objects', 12, 2, 2, 10, ' '); m.rect('objects', 12, 15, 2, 9, ' ');
    m.rect('ground', 12, 2, 2, 22, '~');
    m.rect('ground', 12, 13, 2, 1, 'b');                       // bridge across the channel
    // north room: a cistern with a stone floor and a corner of moss
    m.rect('objects', 2, 3, 9, 8, ' ');
    m.rect('ground', 2, 3, 9, 8, 't');
    m.rect('ground', 2, 8, 3, 3, 'v');
    m.rect('objects', 5, 11, 1, 1, ' ');                       // opening south to corridor
    // north-east hall: marble floor, pillars, a rubble spill
    m.rect('objects', 15, 3, 16, 7, ' ');
    m.rect('ground', 15, 3, 16, 7, 'g');
    m.rect('objects', 21, 10, 1, 2, ' ');                      // opening to the corridor
    // south store: cave floor with a stone pad, shelves and crates
    m.rect('objects', 15, 16, 12, 6, ' ');
    m.rect('ground', 17, 17, 6, 3, 't');
    m.rect('objects', 20, 15, 1, 1, ' ');                      // opening to the corridor
    m.set('objects', 15, 17, 'S'); m.set('objects', 15, 18, 'S'); m.set('objects', 15, 19, 'S');
    m.set('objects', 19, 18, 'E'); m.set('objects', 18, 18, 'H');
    m.set('objects', 16, 20, 'C'); m.set('objects', 17, 20, 'C');
    // pillars and barrels
    [[4, 3], [16, 8], [25, 20]].forEach(([x, y]) => m.set('objects', x, y, 'U'));
    m.set('objects', 24, 19, 'U');
    m.set('objects', 2, 3, 'Q'); m.set('objects', 10, 3, 'Q'); m.set('objects', 2, 10, 'Q');
    m.set('objects', 18, 4, 'Q'); m.set('objects', 24, 4, 'Q'); m.set('objects', 18, 8, 'Q'); m.set('objects', 24, 8, 'Q');
    m.set('objects', 4, 6, 'C'); m.set('objects', 7, 8, 'R');  // scattered crates & rubble
    m.set('objects', 25, 5, 'r'); m.set('objects', 29, 6, 'r');
    // corridor lamps, pillars and carved arches in the rock above the corridor
    m.set('objects', 33, 12, 'L'); m.set('objects', 1, 14, 'L'); m.set('objects', 5, 14, 'L');
    m.set('objects', 7, 12, 'Q'); m.set('objects', 19, 14, 'Q'); m.set('objects', 30, 12, 'Q');
    m.set('above', 8, 11, '@'); m.set('above', 16, 11, '@'); m.set('above', 25, 11, '@');
    // glowing cave crystals
    m.set('objects', 3, 9, 'i'); m.set('objects', 9, 3, 'i'); m.set('objects', 17, 4, 'i'); m.set('objects', 28, 8, 'i');
    m.scatter('objects', 'R', 6, { seed: 31, on: 'k', avoid: [{ x: 0, y: 11, w: 36, h: 4 }] });
    m.ev(H.transfer(1, 13, 'gladius_arena', 5, 14, 'right', { id: 'aq1_to_arena' }));
    m.ev(H.transfer(34, 13, 'aqueduct_2', undefined, undefined, 'right', { id: 'aq1_to_aq2' }));
    m.ev(H.save('aq1_save_a', 4, 14));
    m.ev(H.save('aq1_save_b', 17, 14));
    m.ev(H.chest('aq1_north', 3, 4, 'ether', 1));
    m.ev(H.chest('aq1_ne', 27, 4, 'old_book', 1));
    m.ev(H.chest('aq1_south', 24, 20, { gold: 90 }));
    m.ev(H.sign('aq1_sign', 9, 13, 'OLD GLADIUS AQUEDUCT\nBuilt by the first Lampwrights to carry water from the hills.\nNow it carries something else.'));
    m.ev(H.auto('aq1_banter', async (c) => {
      await say(c, 'Rook', 'Ah, the old aqueduct. Water, bad lighting, and a man who has been splashed in one of these before. Lovely.', 'rook', 'smirk');
      await say(c, 'Caspian', 'I was not splashed. The reservoir had an accident and I was briefly near it. There is a difference, and it is very large.', 'caspian', 'normal');
      await say(c, 'Rook', 'Oh, the Lion protests too much. Don\'t worry, Lion, I forgive you for being tall and expensive to hide.', 'rook', 'happy');
      const i = await c.choice([
        'Earnest: "Can we please focus?"',
        'Teasing: "Caspian, you are blushing."',
        'Flustered: "Could you both stop bickering?"',
      ], { prompt: 'Keep the peace' });
      if (i === 0) {
        await say(c, '{name}', 'Can we please focus? The Anchor is down there, and the people in the city are tired.', null);
        await c.affection('rook', 1, 'Asked the crew to focus');
        await c.affection('caspian', 1, 'Asked the crew to focus');
      } else if (i === 1) {
        await say(c, '{name}', 'Caspian, you are blushing. Rook, you are thrilled. I am in the middle of two very silly men.', null);
        await c.affection('caspian', 2, 'Teased Caspian');
        await c.affection('rook', 1, 'Rook laughed at the tease');
      } else {
        await say(c, '{name}', 'Could you both stop? I am trying to be brave down here and you are making it very hard.', null);
        await c.affection('rook', 1, 'Rook felt bad, then softened');
        await c.affection('caspian', 1, 'Caspian apologised');
      }
      await say(c, 'Claret', 'Can we go? I want to see the valves before this whole place sinks.', 'claret', 'angry');
    }, { once: true, if: () => !!flag('ch2_heist_go') && !flag('ch2_aq1_banter') }));
    return m.finish();
  }

  function buildAqueduct2() {
    const m = G.maps.build('aqueduct_2', 36, 26, {
      name: 'Lantern Vault', bgm: 'tense', ground: 'k', spawn: { x: 2, y: 13, dir: 'right' },
    });
    m.rect('objects', 0, 0, 36, 26, '8');
    // corridor: stone flags, moss in the cracks
    m.rect('objects', 1, 12, 24, 3, ' ');                      // corridor
    m.rect('ground', 1, 12, 24, 3, 't');
    m.rect('ground', 4, 12, 2, 1, 'v'); m.rect('ground', 19, 14, 2, 1, 'v');
    // the channel: open flume through the rock, bridged over the corridor
    m.rect('objects', 8, 2, 2, 10, ' '); m.rect('objects', 8, 15, 2, 9, ' ');
    m.rect('ground', 8, 2, 2, 22, '~');                        // channel
    m.rect('ground', 8, 13, 2, 1, 'b');                        // bridge
    // north cache room: stone floor, moss corner, shelves
    m.rect('objects', 14, 3, 9, 6, ' ');
    m.rect('ground', 14, 3, 9, 6, 't');
    m.rect('ground', 14, 3, 3, 2, 'v');
    m.rect('objects', 15, 9, 1, 3, ' ');                       // opening down to the corridor
    m.set('objects', 22, 5, 'S'); m.set('objects', 22, 6, 'S');
    m.set('objects', 22, 3, 'Q'); m.set('objects', 14, 8, 'Q');
    // south cache room: stone floor, shelves and barrels
    m.rect('objects', 14, 16, 9, 5, ' ');
    m.rect('ground', 14, 16, 9, 5, 't');
    m.rect('ground', 21, 16, 2, 1, 'v');
    m.rect('objects', 15, 15, 1, 1, ' ');
    m.set('objects', 14, 17, 'S'); m.set('objects', 14, 18, 'S');
    m.set('objects', 15, 19, 'U'); m.set('objects', 16, 19, 'C');
    // the vault: marble floor, a glowing machine cradle, pillars around the Anchor
    m.rect('objects', 25, 8, 10, 11, ' ');
    m.rect('ground', 25, 8, 10, 11, 'g');
    m.rect('ground', 27, 12, 2, 3, 'l');                       // warm light around the Anchor's cradle
    m.rect('objects', 30, 11, 3, 5, 'M');                      // the Colosseum Anchor's cradle
    m.set('objects', 29, 13, ' ');                             // the Anchor sits at (29,13)
    m.set('objects', 27, 9, 'J'); m.set('objects', 27, 17, 'J');
    m.set('objects', 33, 9, 'P'); m.set('objects', 33, 10, 'P'); m.set('objects', 33, 16, 'P');
    m.set('objects', 25, 10, 'Q'); m.set('objects', 25, 16, 'Q');
    m.set('objects', 34, 11, 'Q'); m.set('objects', 34, 15, 'Q');
    m.set('objects', 34, 8, 'i'); m.set('objects', 34, 18, 'i');   // humming crystals
    m.set('objects', 26, 14, 'E');                             // the ledger desk
    m.set('objects', 18, 11, ' ');
    m.set('objects', 9, 10, 'C'); m.set('objects', 1, 11, 'C');
    m.set('objects', 23, 12, 'L');
    m.set('objects', 6, 12, 'Q'); m.set('objects', 16, 14, 'Q');
    m.set('above', 6, 11, '@'); m.set('above', 20, 11, '@');
    m.set('objects', 16, 4, 'i'); m.set('objects', 21, 19, 'i');   // dripping cave crystals
    m.scatter('objects', 'R', 4, { seed: 41, on: 'k', avoid: [{ x: 0, y: 11, w: 24, h: 4 }] });
    m.ev(H.transfer(1, 13, 'aqueduct_1', 33, 13, 'left', { id: 'aq2_to_aq1' }));
    m.ev(H.save('aq2_save_a', 4, 14));
    m.ev(H.save('aq2_save_b', 21, 14));
    m.ev(H.chest('aq2_north', 20, 4, 'elixir', 1));
    m.ev(H.chest('aq2_south', 22, 20, 'hi_ether', 2));
    m.ev(H.sign('aq2_sign', 12, 13, 'LANTERN VAULT: the Order\'s Tithe. Warmth in, warmth out. Please keep your hands in your pockets.'));
    aqueduct2Events(m);
    return m.finish();
  }

  function aqueduct2Events(m) {
    // Claret cranks the sluice valve in the alcove north of the corridor
    m.ev({
      id: 'aq2_valve', x: 18, y: 11, sprite: 'obj_marigold_wheel', trigger: 'action', solid: true, dir: 'down', name: 'Valve',
      run: async (c) => {
        if (flag('ch2_valve_done')) { await say(c, null, 'The valve is open. Water hisses through the sluice, cold and clean.'); return; }
        G.setFlag('ch2_valve_done', true);
        await say(c, 'Claret', 'Right, a valve. Do not touch that, it is load-bearing. Hold this, Rook. No, the other end.', 'claret', 'smirk');
        await say(c, 'Rook', 'I am holding the valve, Captain, you cannot blame me for the water.', 'rook', 'smirk');
        await say(c, 'Claret', 'Watch the gauge. When it hits the red, step back. I hate it when a valve sings.', 'claret', 'normal');
        await c.shake(3, 30);
        c.sfx('shatter');
        await say(c, null, 'Claret throws her weight into the wheel. The sluice groans, the old gears judder and then sing, and the water drops away from the vault\'s floor-gutters.');
        await say(c, 'Caspian', 'I used to inspect this valve. It was stuck then. You have a gift with metal, Captain Vane.', 'caspian', 'happy');
        await say(c, 'Claret', 'Gifts are for people who have spare time. Just keep walking, Lion, and stop being impressive.', 'claret', 'smirk');
        await c.affection('claret', 2, 'Claret opened the sluice with a grin');
        await c.toast('The sluice is open', 'info');
      },
    });

    // the vault's ledger desk: Rook lifts the Tithe ledger
    m.ev({
      id: 'aq2_ledger', x: 26, y: 14, sprite: 'obj_sign', trigger: 'action', solid: true, dir: 'right', name: 'Ledger',
      run: async (c) => {
        if (flag('ch2_ledger_taken')) { await say(c, null, 'A blank desk. Rook has already lifted the Tithe ledger, and he is very pleased with himself.'); return; }
        G.setFlag('ch2_ledger_taken', true);
        await say(c, null, 'A ledger of the Tithe lies open on the desk. Rows of towns, columns of warmth. Each row ends with a single word: spent.');
        await say(c, 'Rook', 'Oh, look. The Order keeps its books beautifully. Warmth in, warmth out, and every citizen in one neat little line. Written like candles.', 'rook', 'worried');
        await say(c, 'Rook', 'I am taking this. Don\'t look at me like that. Nobody reads the books in a vault. It is practically a crime to leave them behind.', 'rook', 'smirk');
        await say(c, 'Caspian', 'Take it. And if anyone asks, you are a thief with a conscience. It is a rare and expensive combination.', 'caspian', 'happy');
        await c.affection('rook', 1, 'Rook lifted the ledger for good reasons');
        await c.toast('Tithe Ledger acquired', 'item');
      },
    });

    // Order Wardens guarding the vault (they retreat after the Anchor is dealt with)
    m.ev({
      id: 'vault_warden1', x: 27, y: 10, sprite: 'guard', trigger: 'action', solid: true, dir: 'down', name: 'Order Warden',
      if: () => !flag('ch2_vault_done'),
      run: async (c) => { await say(c, 'Order Warden', 'Halt! The Tithe is not for visitors. The Lion has no business in the vault, and neither do his thieves.', 'unknown', 'angry'); },
    });
    m.ev({
      id: 'vault_warden2', x: 27, y: 16, sprite: 'guard', trigger: 'action', solid: true, dir: 'up', name: 'Order Warden',
      if: () => !flag('ch2_vault_done'),
      run: async (c) => { await say(c, 'Order Warden', 'Get back, Thorne. The Order will have your sigil back, one way or another.', 'unknown', 'angry'); },
    });

    // the Colosseum Anchor: the finale of the chapter
    m.ev({
      id: 'vault_anchor', x: 29, y: 13, sprite: 'obj_beacon', trigger: 'action', solid: true, dir: 'right', name: 'Colosseum Anchor',
      if: () => !flag('ch2_vault_done'),
      run: async (c) => {
        if (!flag('ch2_ledger_taken')) {
          await say(c, null, 'The Anchor hums, and a clerk\'s voice in your head says the ledger first. Maybe Rook has the right idea about the books.');
          return;
        }
        c.bgm('tense');
        await say(c, null, 'A lamp taller than two men sits in a cradle of brass pipes. Its glass heart pulses slow, like breathing, and every pipe runs back out under the arena to the city. Every pipe is drinking.');
        await say(c, 'Caspian', 'The Colosseum Anchor. In Ashmere, my lamp was a child\'s lamp. This one is the whole city, and I did not know it was this big.', 'caspian', 'sad');
        await say(c, 'Claret', "I can shut the valves. But it'll scream louder, and the pipes will burst. It needs a decision, Rowan. Not a wrench.", 'claret', 'worried');
        const i = await c.choice([
          'Kindle it: turn the flow around and give the warmth back',
          'Silence it: cut every pipe and let the lamp go dark',
        ], { prompt: 'The Anchor' });
        await c.flash(i === 0 ? '#ffd27a' : '#c8dcff', 30);
        await c.shake(4, 40);
        if (i === 0) {
          await say(c, '{name}', 'Turn it around. Give everything back to the people who are paying for it.', null);
          await say(c, 'Caspian', 'Yes. Give it back. We were never meant to be the star, only the hearth.', 'caspian', 'happy');
          await c.affection('caspian', 2, 'Kindled the Anchor together');
          await say(c, 'Rook', 'Oh, that is so much nicer than stealing things. I am moved. Also sweating a little, but moved.', 'rook', 'smirk');
          await c.affection('rook', 2, 'Kindled the Anchor');
        } else {
          await say(c, '{name}', 'Silence it. Nobody should be drained again, even by a lamp that means well.', null);
          await say(c, 'Claret', 'Good. Cutting it is cleaner. Nobody likes a lamp that talks back.', 'claret', 'smirk');
          await c.affection('claret', 2, 'Silenced the Anchor');
          await say(c, 'Rook', 'Dark lamp, bright ideas. Fine by me. I think this is the most heroic I have ever been, and I am not comfortable with it.', 'rook', 'worried');
          await c.affection('rook', 1, 'Silenced the Anchor with a joke');
        }
        c.sfx('heal');
        await c.wait(20);
        await c.narrate('Far above, the city breathes out. Lamps brighten. A child shrieks with laughter in the plaza, and the dice finally roll on the tavern felt.');
        await c.flash('#fff3c4', 40);
        await say(c, 'Order Warden', 'The Order will hear of this. The Order hears everything, eventually.', 'unknown', 'worried');
        await say(c, 'Caspian', 'Then let them listen. The Lion is done with the Order.', 'caspian', 'normal');
        await c.showNpc('vault_warden1', false);
        await c.showNpc('vault_warden2', false);
        await c.narrate('The two Wardens back away up the stairs, lanterns held low, and their footsteps fade into the drip of the aqueduct.');
        G.setFlag('ch2_vault_done', true);
        G.setFlag('ch2_done', true);
        await c.toast('The warmth returns to Gladius', 'good');
        await c.chapterEnd(2);
      },
    });
  }

  // ===================================================================
  // registration & chapter card
  // ===================================================================
  G.story.chapters[2] = { title: 'Sand & Oath', subtitle: 'The Grey Lion of Gladius' };

  // ===================================================================
  // build every chapter-2 map at load time
  // ===================================================================
  buildCitadel();
  buildTavern();
  buildArena();
  buildAqueduct1();
  buildAqueduct2();

  // @@APPEND@@
  G.provide('ch2');
})();
