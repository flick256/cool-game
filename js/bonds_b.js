/* =====================================================================
 * LANTERNBOUND - bonds_b.js  (owner: bonds-b)
 * Romance scenes for Seraphine "Sera" Whitlock and Wren Alder (they/them),
 * the crew banter scenes (banter_1..banter_4) and the night-before toast (final_toast).
 * Scene ids follow CONTRACT §9. Rowan has no gendered pronouns (you / {name}).
 * ===================================================================== */
(function () {
  'use strict';
  const G = window.G;

  const SPEAKER = { claret: 'Claret', caspian: 'Caspian', rook: 'Rook', seraphine: 'Sera', wren: 'Wren' };
  const ALWAYS = { rowan: true, claret: true };     // in the crew by the time these scenes play
  const has = (id) => !!(G.state && G.state.roster && G.state.roster[id]);
  const present = (id) => !!ALWAYS[id] || has(id);
  const lover = () => (G.romance && typeof G.romance.lover === 'function') ? G.romance.lover() : null;

  // Play a list of lines:  [who, text, expr?, need?]
  //   who   'narr' (narration) | 'rowan' (the player, spoken as G.name()) | a crew id
  //   need  optional crew id: the line is skipped unless that member has joined (for lines that refer to them)
  // Crew who have not joined are silently skipped, so every scene plays with any party size.
  async function play(c, lines) {
    for (const ln of lines) {
      const who = ln[0], text = ln[1], expr = ln[2] || 'normal', need = ln[3];
      if (need && !present(need)) continue;
      if (who === 'narr') { await c.narrate(text); continue; }
      if (!present(who)) continue;
      if (who === 'rowan') await c.say(G.name(), text, { face: 'rowan', expr: expr });
      else await c.say(SPEAKER[who] || who, text, { face: who, expr: expr });
    }
  }

  // A tone choice. opts: [{tone, label, say, expr?, d (affection delta), reply: [lines]}]
  // Shows "Tone: label", Rowan speaks `say`, the affection moves by d, then the reply plays.
  async function choose(c, aff, prompt, opts) {
    const labels = opts.map((o) => o.tone + ': ' + o.label);
    const i = Math.max(0, await c.choice(labels, { prompt: prompt }));
    const o = opts[i] || opts[0];
    await play(c, [['rowan', o.say, o.expr || 'normal']]);
    if (o.d) await c.affection(aff, o.d);
    await play(c, o.reply || []);
    return i;
  }

  function reg(def) {
    if (G.romance && typeof G.romance.registerScene === 'function') G.romance.registerScene(def);
    else console.warn('[bonds_b] G.romance.registerScene missing; scene skipped: ' + def.id);
  }

  // ====================================================================
  // SERAPHINE "SERA" WHITLOCK  (Pale Choir cantor; dry deadpan under earnest faith)
  // ====================================================================

  reg({
    id: 'seraphine_b1', actor: 'seraphine', minTier: 1, minChapter: 3, kind: 'bond', once: true,
    title: 'Practice at Midnight',
    journal: "Sera hummed a hymn on the Marigold's deck and admitted she had never sung for anyone but a god.",
    bgm: 'tender',
    run: async (c) => {
      await c.bgm('tender');
      await play(c, [
        ['narr', 'Past midnight aboard the Marigold. The engines sleep, the lanterns are turned low, and the deck smells of rain and lavender.'],
        ['narr', "Somebody is humming. Not one of the Order's hymns. Something older, with a crooked little turn at the end of each phrase."],
        ['narr', 'Sera stands at the rail, white wing-headdress pushed back, a shawl over her nightclothes. She is talking to the sea.'],
        ['seraphine', "Oh! You're awake. Good. I wasn't going to wake you. I was going to practise very quietly at a ship.", 'surprised'],
        ['seraphine', 'The ship has not complained. The ship is very patient. Unlike certain people loitering in doorways.', 'smirk'],
        ['seraphine', 'So. Did you come to tell me to go to bed? I have a whole hymn left. It is very long. It is absolutely not about you.', 'normal'],
      ]);
      await choose(c, 'seraphine', 'How do you answer?', [
        { tone: 'Earnest', label: 'Say you came because she sounds lonely', d: 4,
          say: "I came because you sounded lonely. I didn't want to hear that from the far end of the ship and do nothing.",
          reply: [
            ['seraphine', "Oh. Well. That's the sort of thing a cantor is supposed to sing about, not say to her in her nightgown.", 'blush'],
          ] },
        { tone: 'Brave', label: 'Ask her to sing the rest', d: 3,
          say: "Then sing the rest of it. I'm not going anywhere till you do.",
          reply: [
            ['seraphine', 'Bold. Sit, then. On the crate with the broken hinge. Claret keeps promising to fix it.', 'smirk'],
          ] },
        { tone: 'Flustered', label: 'Stammer that you were only standing nearby', d: 2, expr: 'blush',
          say: "I'm not loitering. I was standing. Near singing. Adjacent to it.",
          reply: [
            ['seraphine', 'Adjacent. I will allow it. You have the face of someone who has been adjacent for ages.', 'happy'],
          ] },
        { tone: 'Teasing', label: 'Tease that it is a long hymn about nothing', d: -1, expr: 'smirk',
          say: "It's a long hymn about nothing, Sera. I could tell from the doorway.",
          reply: [
            ['narr', 'She goes very still. The lantern beside her gutters, then steadies.'],
            ['seraphine', "Yes. About nothing. That's rather the problem with it.", 'sad'],
            ['seraphine', "Don't be clever at me before dawn. I haven't got the armour for it.", 'worried'],
          ] },
      ]);
      await play(c, [
        ['narr', 'She tugs the shawl tighter. A sprig of lavender sits behind one ear, the only part of her not dressed for a ceremony.'],
        ['seraphine', "It's the Canticle of Lanterns. I've sung it on the Abbey steps every dusk since I was nine. Hundreds of people. Lamps lit down every terrace.", 'normal'],
        ['seraphine', 'Nobody ever looked up. I used to think that was the point. Humility. Being a very good voice that nobody looks at.', 'sad'],
        ['rowan', 'But do you ever sing it for someone? Not for the steps.', 'normal'],
        ['seraphine', 'Never. Not once. I sing for the Light, and the Light, as far as I can tell, has never once clapped.', 'smirk'],
        ['seraphine', "So this is new. I'm practising on a ship because the Marigold's lanterns are too honest to judge me.", 'blush'],
        ['narr', 'She sings it through, very low, the way you would carry something fragile across a room.'],
        ['narr', 'The crooked turns hang in the air like small bright birds.'],
        ['narr', 'For a moment the deck is a nave and the lanterns are a congregation, and nobody is watching but you.'],
        ['narr', 'When she finishes, the sea goes on being the sea. Sera keeps her eyes on the lanterns instead of on you.'],
      ]);
      await choose(c, 'seraphine', 'Answer her honestly:', [
        { tone: 'Earnest', label: 'Tell her it is the most honest thing you have heard', d: 4,
          say: 'It was the most honest thing I have heard in a year. Thank you for singing it to me.',
          reply: [
            ['seraphine', "Honest. Thank you. I shall pretend that was a compliment from a choir of one.", 'happy'],
          ] },
        { tone: 'Quiet', label: 'Ask her to hum the last line again', d: 3,
          say: 'Hum the last line again. I want to remember how it ends.',
          reply: [
            ['seraphine', "It ends higher than you expect. That's the whole secret of it.", 'blush'],
            ['narr', 'She hums only the last phrase. The lantern above you both seems to lean in to catch it.'],
          ] },
        { tone: 'Teasing', label: 'Call it terrible, so she has to sing it again', d: 1, expr: 'smirk',
          say: 'Terrible. Sing it again so I can suffer properly.',
          reply: [
            ['seraphine', 'Ha! Rude. Thoroughly rude. Right, now you have to listen to all six verses.', 'smirk'],
          ] },
        { tone: 'Flustered', label: 'Say it was lovely, and that she is too', d: 2, expr: 'blush',
          say: "It was lovely. You're lovely. The song is... it's lovely.",
          reply: [
            ['seraphine', "Lovely. I'll take lovely. It's a very good word for a cantor nobody has told so in years.", 'blush'],
          ] },
      ]);
      await play(c, [
        ['seraphine', "Don't tell Claret. She'll make a joke about the acoustics, then fix the acoustics, and then I'll be living in the hold with a better echo than mine.", 'normal'],
        ['seraphine', 'The lamps go out in ten minutes. I have a verse to finish that is absolutely, categorically not about you.', 'smirk'],
        ['narr', 'She turns back to the sea and hums on. Under the tune, very quietly, you hear something that is not a hymn at all: a laugh.'],
      ]);
    },
  });

  reg({
    id: 'seraphine_b2', actor: 'seraphine', minTier: 2, minChapter: 4, kind: 'bond', once: true,
    title: 'The Rests in the Hymn',
    journal: 'Sera found drinking-marks hidden in her beloved hymn and asked whether it had only ever been a leash.',
    bgm: 'sad',
    run: async (c) => {
      await c.bgm('sad');
      await play(c, [
        ['narr', "The Marigold's galley, close and dim. The kettle ticks as it cools. Sera sits with a battered hymnal open on the table and a cup of tea she has not touched."],
        ['narr', 'She has been reading the same page since supper. You can tell, because the tea has stopped steaming.'],
        ['rowan', "Sera. You've been staring at one page for three hours.", 'worried'],
        ['seraphine', "Four hours. Don't count the humming. Humming doesn't count when I'm doing it by accident.", 'sad'],
        ['seraphine', "Look. Gently. It's older than the Abbey. It was copied out by a monk who was very bored and very thorough.", 'normal'],
        ['narr', 'The margins are crowded with tiny marks, dots and strokes like birds on a wire, set above every seventh beat of the score.'],
        ['seraphine', 'Those are rests. The notes call them "drinking marks". Every seventh beat the choir falls silent, and down on the terraces the lamps brighten, just a little.', 'normal'],
        ['seraphine', 'I always thought it was for breath. Sensible, lovely breath. I have been taking my breath on the drinking marks for sixteen years.', 'sad'],
        ['seraphine', 'It is not for breath. It is for drawing. The lamps drink on the rests, and the warmth goes up the wire to the Hearthstar.', 'worried'],
        ['seraphine', 'Warmth from where? From the people singing. From their wicks. I have been tired after every dusk for years, and I blamed the stairs.', 'sad'],
        ['narr', 'Her finger traces one of the little marks, very slowly, as if it might bite.'],
        ['seraphine', 'Abbess Orla wrote these in, in her own hand. She taught me to sing them with a smile on my face.', 'sad'],
        ['seraphine', 'And the choristers who went quiet in the crypt. They were my friends. The hymn is what hollowed them. I thought we were singing them home.', 'worried'],
        ['seraphine', 'So tell me something honest. What if the hymn I loved was a leash?', 'sad'],
      ]);
      await choose(c, 'seraphine', 'Hold her faith with her:', [
        { tone: 'Earnest', label: 'Say the hymn was never the problem; someone used it', d: 4,
          say: 'Then the hymn was never the problem. Someone used it like a leash. That is a different thing from having loved it.',
          reply: [
            ['seraphine', "You say that as if it were simple. It is the simplest thing I've heard in a year.", 'sad'],
          ] },
        { tone: 'Brave', label: 'Promise to unpick the hymn with her, thread by thread', d: 5,
          say: 'Then we unpick it. Thread by thread. And on the last verse, we sing it ourselves.',
          reply: [
            ['seraphine', "We? You can't carry a tune in a bucket.", 'smirk'],
            ['rowan', 'Then you carry it for both of us.', 'normal'],
            ['seraphine', "That's a dreadful line. I'm keeping it. I'm going to hate how much I like it.", 'blush'],
          ] },
        { tone: 'Quiet', label: 'Take her hand and say nothing clever', d: 3,
          say: "I won't say anything clever. Just let me hold this for a minute.",
          reply: [
            ['narr', 'She looks at the hand over hers as though she had forgotten hands could be kind.'],
            ['seraphine', 'Good. Clever would have made me cry into the tea.', 'sad'],
          ] },
        { tone: 'Teasing', label: 'Joke that she has never once been on a leash', d: -2, expr: 'smirk',
          say: "You've never been on a leash in your life. You bit the Abbess.",
          reply: [
            ['seraphine', 'Yes. Thank you. That is extremely helpful.', 'sad'],
            ['narr', 'She draws her hand back into her sleeve. For a moment, neither of you says anything at all.'],
            ['rowan', "Sorry. That came out flippant. I'm listening now. Properly.", 'worried'],
            ['seraphine', "Then listen. Don't interrupt the bit where I fall apart. It's a short bit.", 'normal'],
          ] },
      ]);
      await play(c, [
        ['seraphine', 'Orla knew. She wrote the rests in with her own pen, and she has never once sung them with her eyes shut.', 'sad'],
        ['seraphine', 'If the hymn drinks people, is it still a hymn? Or is it just a very pretty pump?', 'worried'],
      ]);
      await choose(c, 'seraphine', 'Say what you believe:', [
        { tone: 'Earnest', label: 'Say people made it, and then it was stolen from them', d: 4,
          say: 'I think people made it, and then the Order stole it from them. Both things can be true.',
          reply: [
            ['seraphine', "Both. Yes. That's the awful part. Both.", 'sad'],
          ] },
        { tone: 'Brave', label: 'Tell her the part of it that was hers drinks nothing', d: 4,
          say: 'The part that was yours is not drinking anything. Your voice, your breath. That was never theirs to take.',
          reply: [
            ['seraphine', "You're very certain for a person who can't name the notes.", 'smirk'],
            ['seraphine', "...Thank you. I needed someone certain. I've run out of my own.", 'sad'],
          ] },
        { tone: 'Teasing', label: 'Call it a pretty pump with a bad habit', d: 1, expr: 'smirk',
          say: 'A very pretty pump. Like Claret\'s kettle. Gorgeous, and it steals your evenings.',
          reply: [
            ['seraphine', 'Ha. You are not helping, and yet I am grinning. Typical.', 'smirk'],
          ] },
        { tone: 'Flustered', label: 'Admit you know nothing about hymns', d: 3, expr: 'blush',
          say: 'I know nothing about hymns. I know you sing like the room was waiting for you.',
          reply: [
            ['seraphine', 'Oh. That is not a theology. That is a compliment wearing a coat. I will accept it.', 'blush'],
          ] },
      ]);
      await play(c, [
        ['seraphine', 'Then I will write my own. Not a leash. Not a ledger. A hymn with no rests in it, where nothing is drunk and nobody is spent.', 'happy'],
        ['seraphine', "I'm not ready to sing it. I'm crying into a very good tea, and it would be a shame to waste it.", 'sad'],
        ['seraphine', 'Ask me again soon. Ask me when I have stopped being a sad, sensible puddle.', 'smirk'],
        ['narr', 'She closes the hymnal over the little drinking marks, very gently, the way you would shut the door of a room you mean to clean out one day.'],
      ]);
    },
  });

  reg({
    id: 'seraphine_b3', actor: 'seraphine', minTier: 3, minChapter: 4, kind: 'bond', once: true,
    title: 'A Hymn for People',
    journal: 'Sera sang you a hymn she had written herself, with no god in it, and you nearly kissed under the lanterns.',
    bgm: 'romance',
    run: async (c) => {
      await c.bgm('romance');
      await play(c, [
        ['narr', "Two days out from Lumen Vale. The crew has strung paper lanterns along the Marigold's rail, every colour of the Festival, and the deck is full of their soft light."],
        ['narr', 'Sera waits at the bow with a single folded sheet of music, one hand flat on it, as if the wind might take it.'],
        ['seraphine', "Don't say anything clever. I've written something. I'm going to sing it, and you're going to be the first person to hear it who isn't a god, a lamp, or Orla.", 'worried'],
        ['seraphine', 'Will you listen? Properly, I mean. Not the way people listen to a bell that happens to be ringing.', 'normal'],
      ]);
      await choose(c, 'seraphine', 'Your answer:', [
        { tone: 'Earnest', label: 'Promise to hear every verse', d: 4,
          say: "I'll listen to every verse, Sera. Every breath you take in between them, too.",
          reply: [
            ['seraphine', "Oh, that's unfair. I've got a lump in my throat the size of a lantern.", 'blush'],
          ] },
        { tone: 'Brave', label: 'Ask to sing the next verse together', d: 5,
          say: 'I want to hear it. And then I want to sing the next verse with you.',
          reply: [
            ['seraphine', "You can't sing. You told me so in Brasshaven. Loudly.", 'smirk'],
            ['rowan', 'Then I will be loud and wrong beside you.', 'normal'],
            ['seraphine', "Yes. That's the whole point of a choir.", 'happy'],
          ] },
        { tone: 'Teasing', label: 'Only if she promises no high note', d: 1, expr: 'smirk',
          say: "Only if you promise not to do the high note at me. I have a delicate soul.",
          reply: [
            ['seraphine', "It's the highest note I own. You'll have to bear it.", 'smirk'],
          ] },
        { tone: 'Flustered', label: 'Blurt out a yes', d: 2, expr: 'blush',
          say: 'Yes! I mean... yes. Obviously. Please.',
          reply: [
            ['seraphine', "Please. That's the nicest thing you've ever said at me. Sit. Hold the lantern. Don't blink.", 'happy'],
          ] },
      ]);
      await play(c, [
        ['narr', 'She sings. Her voice is different from the night on the deck: not hushed, not practising. Open, the way a window is open on a warm evening.'],
        ['narr', 'At the top of the page, in her careful hand, the title reads: For the People Beside You.'],
        ['narr', 'Sera closes her eyes. Lantern light sits on her lids like gold leaf.'],
        ['narr', '“No god in this hymn, no gold, no glass,'],
        ['narr', 'only the people who stayed when the lamps went past.”'],
        ['narr', '“Sing with me, lantern-hearted, and lend me your name,'],
        ['narr', 'and nothing we share will be spent in the flame.”'],
        ['narr', 'Nothing in the verse drinks. Nothing in it is counted. It is only a list of people, and the sound of them, and it fills the whole deck.'],
        ['seraphine', 'That is the verse. There is a second one. It is worse. It rhymes "Orla" with "corla", which is not a word.', 'blush'],
        ['rowan', 'Corla sounds like something you would find in a stew.', 'smirk'],
        ['seraphine', "Stop it. You're ruining the one honest thing I've made.", 'happy'],
        ['narr', 'Far off across the water, the bell in Lumen Vale rings the hour. A lantern tips loose from the rail and rises between you, gold on black.'],
        ['narr', 'Sera steps closer without seeming to decide to. Lavender and rain and warm wax.'],
        ['narr', 'Her forehead is an inch from yours, and neither of you moves to close it.'],
        ['seraphine', "It's a bad hymn, isn't it.", 'blush'],
        ['rowan', "It's the best one I've ever heard.", 'worried'],
      ]);
      await choose(c, 'seraphine', 'Stay still, or move?', [
        { tone: 'Quiet', label: 'Hold still and breathe with her', d: 5,
          say: "Stay right there. Let's just breathe for a minute.",
          reply: [
            ['narr', 'Neither of you closes the last inch. Somehow it is the warmest thing you have ever shared, and nobody has to say so.'],
            ['seraphine', 'Mm. This is very unfair. I had hoped to be dignified about it.', 'blush'],
          ] },
        { tone: 'Brave', label: 'Come forward until your foreheads touch', d: 4,
          say: 'Come here, then.',
          reply: [
            ['narr', 'Her breath catches. She laughs, very quietly, into the space between you, and then stops laughing and simply stays.'],
            ['seraphine', 'Forehead. Good. We are doing forehead. I am not a fast woman.', 'smirk'],
          ] },
        { tone: 'Teasing', label: 'Say her hymn is going to be unbearable now', d: 2, expr: 'smirk',
          say: 'Your hymn is going to be unbearable now. You know that.',
          reply: [
            ['seraphine', "It's going to be the worst thing in Auren. The whole Pale Choir will be weeping on the steps.", 'smirk'],
          ] },
        { tone: 'Flustered', label: 'Step back to fuss with a lantern', d: 1, expr: 'blush',
          say: 'The lantern. That one. It looks a bit precarious.',
          reply: [
            ['narr', 'The lantern is perfectly fine. Sera watches you fuss with it, and her expression softens into something patient.'],
            ['seraphine', "Oh, that's all right. Fix the lantern. I'll ask again when you've stopped looking like a startled fox.", 'happy'],
          ] },
      ]);
      await play(c, [
        ['seraphine', "Ask me again at Lumen Vale. There's a lake, and everybody sets a lantern on it, and I have decided to be sensible about exactly none of it.", 'happy'],
        ['narr', 'She tucks the hymn into the front of her robe, beside the lavender sachet, and goes back to the rail.'],
        ['narr', 'The lanterns drift after her like a flock that has decided to be fond of her.'],
      ]);
    },
  });

  reg({
    id: 'seraphine_confession', actor: 'seraphine', minTier: 3, minChapter: 4, kind: 'confession', once: true,
    title: 'Lantern Night',
    journal: 'On Lantern Night Sera shared a lantern on the lake with you, and told you plainly that she loved you.',
    bgm: 'romance',
    run: async (c) => {
      await c.bgm('romance');
      await play(c, [
        ['narr', 'Lumen Vale on Lantern Night.'],
        ['narr', 'Thousands of paper lanterns lift off the lake at once, and the water looks as though someone spilled the sky and let it stay.'],
        ['narr', 'Sera waits at the far end of the shingle, away from the crowd. Her headdress is in her hands.'],
        ['narr', 'Without it she looks younger, like someone who is allowed to be wrong.'],
        ['seraphine', 'You found me. I left a trail of very obvious lavender, and I am not sorry.', 'blush'],
        ['seraphine', "Festival custom: one lantern, shared between two. You chose me. I know, because you did it with your whole face at the stall.", 'smirk'],
        ['seraphine', "So say it plainly. I am not doing another hymn about you. I would never finish, and the Abbess would send me to bed without supper.", 'normal'],
      ]);
      await choose(c, 'seraphine', 'Say it plainly:', [
        { tone: 'Earnest', label: 'Tell her you love her', d: 3,
          say: "I love you. I've been trying not to say it for months, and it isn't working.",
          reply: [
            ['seraphine', "Good. Well. Good. I'd been rehearsing a speech about how it isn't working either.", 'blush'],
          ] },
        { tone: 'Brave', label: 'Tell her you want to be the one she sings to', d: 3,
          say: 'I love you, Sera. I want to be the one you sing to, every dusk, for the rest of it.',
          reply: [
            ['seraphine', "Oh, you've stolen my good line. Fine. I'll write another one. It will be longer.", 'smirk'],
          ] },
        { tone: 'Teasing', label: 'Joke that it is a poor idea for a person with a ship', d: 2, expr: 'smirk',
          say: 'I love you, which I am told is a poor decision for anyone who owns a ship.',
          reply: [
            ['seraphine', 'Claret would agree with you. She would also be insufferable about it for a month.', 'smirk'],
          ] },
        { tone: 'Flustered', label: 'Stammer it out, rather beautifully', d: 2, expr: 'blush',
          say: "I love you. Oh- that's it. That's the one. I love you.",
          reply: [
            ['seraphine', 'Yes. That one. I am keeping that one.', 'happy'],
          ] },
      ]);
      await play(c, [
        ['seraphine', "Then let me say mine properly. I've been practising it in the rafters for a week. Nobody heard, which was the point.", 'normal'],
        ['seraphine', 'I was taught that love is something you spend. Like lamp oil. Like breath. Every dusk I gave mine to the Light, and every dusk I came out a little emptier.', 'sad'],
        ['seraphine', 'Then you sat on a crate with a broken hinge and let me sing badly at you, and you listened as if it mattered. And something did not run out.', 'happy'],
        ['seraphine', "It multiplied. I didn't know that was allowed. I'm a cantor. I'm supposed to know what's allowed.", 'blush'],
        ['seraphine', "I'm not a hymn, and I'm not a lamp. I'm a woman with a terrible singing habit, and I would very much like to hold your hand while the lake does that.", 'normal'],
        ['narr', 'Out on the water the lanterns drift and turn, and a few of them catch the light on their paper like fish rising to the surface.'],
        ['narr', 'She holds out her hand. Lantern light finds the lavender ribbon in her hair and the pale line of her wrist.'],
        ['narr', 'You take her hand. Her fingers are cold from the lake and warm where they close around yours.'],
      ]);
      await c.emote('player', 'heart');
      await c.sfx('heart');
      await play(c, [
        ['narr', 'She kisses you, or you kiss her. Afterwards you will each insist the other one moved first.'],
        ['narr', 'The lanterns, rising over the water, decline to take sides.'],
      ]);
      await c.fade('out', 60, '#1a1030');
      await c.wait(30);
      await play(c, [
        ['narr', 'Some time later. The lanterns have drifted far out across the lake, a river of small gold lights moving toward the far shore.'],
      ]);
      await c.fade('in', 60);
      await play(c, [
        ['seraphine', 'I am going to have to write a hymn about that.', 'blush'],
        ['rowan', 'Write it with no god in it.', 'smirk'],
        ['seraphine', "Oh, there's no god at all now. It's all people. Lots of people. Mostly you.", 'happy'],
        ['seraphine', "Stay on the shore with me until the last of them goes out? I'd like to be sensible about this for at least an hour.", 'normal'],
        ['narr', 'She tucks her headdress under one arm and laces her fingers through yours.'],
        ['narr', 'Far out on the water, the last festival lantern sets off toward the dark, carrying two names that nobody else will read.'],
      ]);
      G.romance.setLover('seraphine');
      await c.affection('seraphine', 10);
    },
  });

  reg({
    id: 'seraphine_eve', actor: 'seraphine', minTier: 0, minChapter: 5, kind: 'eve', once: true,
    title: 'The Night Before the Spire',
    journal: 'The night before the Spire, Sera kept you company on the Marigold and made the climb feel less lonely.',
    bgm: 'tender',
    run: async (c) => {
      await c.bgm('tender');
      const beloved = lover() === 'seraphine';
      if (beloved) {
        await play(c, [
          ['narr', "The night before the Spire. The Marigold is moored in the lee of the first terrace, and the Spire climbs into a sky with no stars in it."],
          ['narr', "Sera sits on the forward hatch, legs folded under her and a crewmate's coat around her shoulders. Her headdress is off. She holds it in her lap like a bowl of something hot."],
          ['seraphine', "I can't sleep. I've tried everything. The lamps are very loud when you're trying not to think about the top of a tower.", 'sad'],
          ['rowan', 'Me neither. I keep counting steps that are not there yet.', 'worried'],
          ['seraphine', "Good. Then we'll be awful together. It's practically a tradition.", 'smirk'],
          ['seraphine', 'Tomorrow we climb. I want to say something before we do, while it is still just us and the wind.', 'normal'],
          ['seraphine', "Whatever is at the top, Hale's ghost or Vael's cold engine or my own voice in a cage, you come back down to me. That isn't a request. It's a hymn. I've decided.", 'blush'],
          ['rowan', 'Then I will come down the stairs. Badly. Probably singing the wrong tune.', 'smirk'],
          ['seraphine', "Under the wrong tune, then. I'll correct you the whole way down.", 'happy'],
          ['narr', 'She shifts along the hatch. Her shoulder finds yours, the way it has so many times since Wickholm, and this time she leaves it there.'],
          ['seraphine', "I want to sing the last verse. Not the Abbey's version. Not the Canticle. Ours.", 'normal'],
          ['narr', 'She sings it very low, barely more than a breath.'],
          ['narr', 'The lantern on the hook above you both sways, and the light rolls across her face like water.'],
          ['seraphine', 'There. A hymn with no god in it, and one person I want to be listened to by for the rest of my life. That is the verse.', 'blush'],
          ['rowan', "I'm listening. I'm going to keep on listening.", 'normal'],
          ['seraphine', "Good. And if you're not, I'll know, because you have a face like a dropped pie when your mind wanders.", 'smirk'],
          ['narr', 'She leans her forehead against yours. Neither of you moves for a long time.'],
          ['narr', 'Above, the Spire climbs into the dark, and for once it seems a very long way off.'],
          ['seraphine', "Goodnight, {name}. Don't fall off the stairs. It's very untidy, and I'd have to sing at your funeral.", 'happy'],
        ]);
      } else {
        await play(c, [
          ['narr', 'The Marigold is moored in the Spire\'s shadow. The crew has gone to bed in shifts. The galley lamp is the only one still lit.'],
          ['narr', 'Sera finds you on the upper deck, wrapped in a blanket that was clearly borrowed from Claret without asking.'],
          ['seraphine', "Caught you. You've been pacing for an hour. The board by the winch squeaks. I counted.", 'smirk'],
          ['rowan', "I'm fine.", 'worried'],
          ['seraphine', "You're not fine. You're a kettle that has forgotten about tea.", 'normal'],
          ['rowan', "I keep thinking about what I'll find up there. If my mother is still... in there, somewhere.", 'sad'],
          ['seraphine', "Yes. That's allowed. I'd be worried if you didn't think about it at all.", 'sad'],
          ['seraphine', 'You do not have to be sure. You do not have to know who you will be when you come back down. You only have to be there when the door opens.', 'normal'],
          ['seraphine', 'The Light never sent me one useful message in my life, so I will give you one for free. You are not made of your worst day.', 'happy'],
          ['seraphine', "You're made of Maren's knitting, Pip's terrible jokes, Claret's tea with things in it, and every time you've stayed when you could have run.", 'smirk'],
          ['rowan', 'That is a very good list.', 'happy'],
          ['seraphine', 'I had help. Caspian wrote the sensible sections. Rook did the bit about the knitting, which he will deny in front of Maren.', 'smirk', 'caspian'],
          ['seraphine', "Tomorrow you'll be brave, I'll sing badly, and Wren will say something rude to the Spire, and the Spire will take it personally.", 'normal', 'wren'],
          ['seraphine', "I'm proud of you, and that isn't a hymn. It's a fact. The Abbess taught me never to lie about facts.", 'happy'],
          ['narr', 'She takes the other half of the blanket and sits on the crate with the broken hinge, which Claret still has not fixed.'],
          ['narr', 'The two of you watch the Spire until the galley lamp goes out.'],
        ]);
      }
    },
  });

  reg({
    id: 'seraphine_epilogue', actor: 'seraphine', minTier: 4, minChapter: 5, kind: 'epilogue', once: true,
    title: 'Twin Flame',
    journal: 'The Tithe ended, the Hearthstar was relit by two hearts, and Sera sang a hymn with no god in it at last.',
    bgm: 'ending_love',
    run: async (c) => {
      await c.bgm('ending_love');
      await play(c, [
        ['narr', 'The Tithe ended on an ordinary grey morning in Lumen Vale. No proclamation was read. The Order had lost the knack of making them.'],
        ['narr', 'That evening, for the first time in forty years, the bells of the Pale Abbey rang at dusk with no Canticle beneath them.'],
        ['narr', 'Sera stood on the Abbey steps.'],
        ['narr', 'The congregation below her was not a congregation at all: former choristers, dockhands, a fox nobody had invited.'],
        ['narr', 'Abbess Orla was there too, at the foot of the steps, where she had chosen to sit down and listen.'],
        ['narr', 'Sera sang. No rests. No drinking marks. A hymn with no god in it, only people.'],
        ['narr', 'When it ended, the lanterns on the terraces did not dim, because nothing was being taken from them.'],
        ['narr', 'High above, the Hearthstar burns.'],
        ['narr', 'It is brighter now, and warmer, and its light has two notes in it: one steady, and one that flickers when someone laughs.'],
        ['rowan', 'They can probably hear you from up there.', 'smirk'],
        ['seraphine', "The Star? It hasn't got ears. It's a lantern.", 'smirk'],
        ['rowan', 'Then how do you know it is not listening?', 'normal'],
        ['seraphine', 'Because nothing that makes a sound that big ever wants to be heard by nobody. I have decided that is the theology now.', 'happy'],
        ['narr', 'The Abbess has burned the rest-marks out of every hymnal in the Abbey, page by page, in the courtyard.'],
        ['narr', 'Claret came to watch and complained that the bonfire was badly built.'],
        ['narr', 'The lavender along the Abbey wall is in full flower, and the bees have opinions about all of it.'],
        ['seraphine', "Thirty-one verses, and not one of them drinks anything. I checked. Orla checked too, and then she cried. She says it's the first time in public since the roof fell in.", 'sad'],
        ['rowan', 'Are you going to finish the second verse? The one that rhymes with corla?', 'smirk'],
        ['seraphine', 'I burned that verse. There is no second verse. There is only you being a menace about the first.', 'blush'],
        ['narr', 'A lantern drifts loose from the terrace rail and wanders out over the Vale, unhurried. Nobody chases it. Nobody needs to.'],
        ['seraphine', 'Do you remember the first night? The deck, the sea, you in the doorway like a stray that had been told it could come in.', 'happy'],
        ['rowan', 'You told me to go to bed.', 'smirk'],
        ['seraphine', "I was extremely rude to you that night. I'd like it entered in the records that I was rude because I was already wonderful.", 'blush'],
        ['narr', 'Her hand finds yours on the stone. It is steady now.'],
        ['narr', 'It was not steady in the Hearthstar hall, when she had been ready to let her own light go out so that someone else could live.'],
        ['seraphine', "I was so frightened, up there. I thought the only way to end the Tithe was to let my wick go out for it. And you wouldn't let me.", 'sad'],
        ['rowan', 'You would not let me do it either.', 'worried'],
        ['seraphine', 'No. Two stubborn idiots holding one candle between them, each insisting the other take the warm side.', 'smirk'],
        ['narr', 'Under her ribs, a thread of light, small and bright and entirely her own, leans toward yours.'],
        ['narr', 'Yours leans back. The star above answers both, a note you feel in your teeth.'],
        ['narr', 'Two hearts, one star. The old Lampwrights built the Hearthstar to burn on other people\'s warmth.'],
        ['narr', 'It has learned, very quickly, how to give some back.'],
        ['seraphine', 'The Abbess has asked the choir to tour. Lumen, the Ashen Road, Brasshaven. Every place nobody ever let us sing.', 'happy'],
        ['seraphine', 'I said yes. Then I said we would sing for nothing, because the lamps have taken enough, and Orla could come and sit at the back and be humbled.', 'smirk'],
        ['rowan', 'Will Claret come?', 'normal'],
        ['seraphine', 'Claret will complain about the acoustics, fix the acoustics, and then insist it was load-bearing all along.', 'smirk'],
        ['narr', 'On the terrace below, the lanterns are being lit one after another.'],
        ['narr', 'Nobody has to light them. Somebody started, and everybody else wanted to.'],
        ['narr', 'The one that drifted from the rail has reached the far shore.'],
        ['narr', 'A small figure there is waving it at the sky, and all across the Vale other people are lighting theirs.'],
        ['seraphine', 'Nothing is being spent tonight. Look at them. Everything is being shared, and it is getting brighter.', 'happy'],
        ['narr', 'On the lake below, a single paper lantern drifts out over the water with two names written on its side. It does not go dark.'],
      ]);
    },
  });

  // ====================================================================
  // WREN ALDER  (Whisperwood hedge-witch; they/them; blunt, literal, odd, kind)
  // ====================================================================

  reg({
    id: 'wren_b1', actor: 'wren', minTier: 1, minChapter: 3, kind: 'bond', once: true,
    title: 'The Stolen Geranium',
    journal: 'Wren repotted a stolen windowbox geranium and answered every question in blunt riddles, somehow kindly.',
    bgm: 'tender',
    run: async (c) => {
      await c.bgm('tender');
      await play(c, [
        ['narr', "The Marigold's deck, after rain. Puddles hold the lamplight like spilled coins. In one corner, kneeling on an upturned crate, Wren is repotting a windowbox of trailing geranium."],
        ['narr', 'The geranium was, until this morning, on a Brasshaven balcony.'],
        ['narr', 'It was moved here by someone who had been told not to move it. Wren has not forgiven that person yet.'],
        ['narr', 'Their blue witch hat, with its bedraggled feather, sits on the crate beside them.'],
        ['narr', 'A fox with a torn ear watches from the rail with the expression of a professional.'],
        ['wren', "Don't touch the roots. They're in a mood. I've apologised to the plant. It did not accept.", 'normal'],
        ['wren', 'You have a question sitting on your face like a wet bird. Ask it. The fox has already decided you are harmless.', 'smirk'],
      ]);
      await choose(c, 'wren', 'Ask the question:', [
        { tone: 'Earnest', label: 'Ask why they brought the plant here', d: 3,
          say: 'Why did you bring the plant here, Wren?',
          reply: [
            ['wren', 'Because it was going to die on that balcony. The balcony was going to die of being in Brasshaven. Nobody asked the plant what it wanted.', 'normal'],
            ['wren', "Repotting is a kind of apology, you see. It stings for a day. Then it's glad. Mostly.", 'sad'],
          ] },
        { tone: 'Brave', label: 'Tell them to ask, and you will answer straight', d: 4,
          say: 'Then ask me something. I will answer straight, even if it is embarrassing.',
          reply: [
            ['wren', 'Are you a kind person, or a loud one who has had a lot of practice?', 'smirk'],
            ['rowan', 'Both. Mostly the second one, with practice.', 'happy'],
            ['wren', 'Honest. Good. Honest is rarer than dry days in the Whisperwood.', 'normal'],
          ] },
        { tone: 'Teasing', label: 'Ask if the fox is their business partner', d: 1, expr: 'smirk',
          say: 'Is the fox your business partner? Looks like the fox does all the lifting.',
          reply: [
            ['wren', 'Yes. He does the lifting. I do the blaming. It is a very efficient arrangement.', 'smirk'],
            ['narr', 'The fox sneezes, as if to confirm it for the record.'],
          ] },
        { tone: 'Flustered', label: 'Admit you do not know what to ask', d: 2, expr: 'blush',
          say: "I don't know what to ask. You're very... green. Mossy, I mean.",
          reply: [
            ['wren', 'Thank you. I am mostly moss. Moss is the best thing to be if you want to be left alone and still get visited.', 'happy'],
          ] },
      ]);
      await play(c, [
        ['wren', 'What makes a plant happy, do you think? Don\'t think about it. Say the first thing.', 'normal'],
        ['rowan', 'Light. Water. Someone to talk to?', 'normal'],
        ['wren', 'Close. Light, water, and not being moved without asking. You got the important bit. Good.', 'smirk'],
        ['wren', 'You keep asking me things. Most people stop after the first answer. They think I am bored, or cruel. Which do you think I am?', 'normal'],
      ]);
      await choose(c, 'wren', 'Wren is watching you:', [
        { tone: 'Earnest', label: 'Say they are only honest, and it is rare', d: 4,
          say: "Neither. You're just honest. It's rarer than you think, and it's lovely.",
          reply: [
            ['wren', "...Lovely. Don't say that near the plant. It will get ideas.", 'blush'],
            ['narr', 'Rain starts again, a light tick on the canvas. Wren does not move to cover. The geranium leans into the drops as if it had been waiting.'],
          ] },
        { tone: 'Quiet', label: 'Say you like the pause after their answers', d: 3,
          say: "I like the pause after your answers. It's where you're thinking.",
          reply: [
            ['wren', "Nobody has ever liked my pauses. People think I've forgotten the next line.", 'sad'],
            ['wren', "Then that's a good pause. I'll keep it. I'm not giving it back.", 'normal'],
          ] },
        { tone: 'Teasing', label: 'Say cruel, definitely cruel, and your ears go pink', d: -1, expr: 'smirk',
          say: 'Cruel. Definitely cruel. Your ears go pink when you are pleased with yourself.',
          reply: [
            ['wren', 'They do. That is the moss. Pink is a warning colour, you know.', 'smirk'],
            ['wren', "...Don't repeat that. It was unkind. I'm trying to be less good at unkind.", 'worried'],
          ] },
      ]);
      await play(c, [
        ['wren', "The geranium is settled. Its name is Sulk. Don't use it. It hates being named.", 'smirk'],
        ['wren', "Come back tomorrow, when the moonpetal is awake. I'm bad at being found. I'm a little less bad after dark.", 'normal'],
        ['narr', 'Wren picks the hat up off the crate, settles the feather, and does not quite look at you.'],
        ['narr', 'The fox has already gone to sleep across the windowbox.'],
      ]);
    },
  });

  reg({
    id: 'wren_b2', actor: 'wren', minTier: 2, minChapter: 4, kind: 'bond', once: true,
    title: 'The Garden in the Jar',
    journal: 'Wren showed you the garden they keep sealed in a jar, and admitted they had been lonely for years.',
    bgm: 'sad',
    run: async (c) => {
      await c.bgm('sad');
      await play(c, [
        ['narr', "The Marigold's lower hold smells of thyme, smoke and wet earth. Wren has hung drying bundles from every beam, and the crew has learned to duck without being asked."],
        ['narr', 'Wren sits cross-legged among the herbs with a glass jar held in both hands, the way other people hold a sleeping child.'],
        ['wren', 'Don\'t tip it. Everything in here has had a difficult year.', 'normal'],
        ['narr', 'Under the lid is a whole small world: moss like green velvet, a fern just uncurling,'],
        ['narr', 'a trickle of water in one corner, and a single pale moonpetal the size of a fingernail, shut tight.'],
      ]);
      await choose(c, 'wren', 'Ask about the jar:', [
        { tone: 'Earnest', label: 'Ask why a forest lives in a jar', d: 4,
          say: 'So you can carry a forest with you, wherever you go?',
          reply: [
            ['wren', "...Yes. That's it exactly. I never had the words for it. I only had the jar.", 'surprised'],
          ] },
        { tone: 'Quiet', label: 'Lift the lantern to the glass and say nothing', d: 5,
          say: 'Hold on. Let me just look at it.',
          reply: [
            ['narr', 'You lift the lantern so its light goes through the glass. Wren watches you do it, and something in their shoulders comes down an inch.'],
            ['wren', 'Thank you. Nobody has ever just held a jar up to the light for me. They usually open it.', 'sad'],
          ] },
        { tone: 'Teasing', label: 'Joke it keeps the crew from wandering off', d: -1, expr: 'smirk',
          say: 'So nothing can wander off to Lumen Vale without asking you first.',
          reply: [
            ['wren', 'That is rude. Also accurate. Accuracy is rude. Everyone knows that.', 'smirk'],
          ] },
        { tone: 'Flustered', label: 'Say it is lovely and you want a closer look', d: 2, expr: 'blush',
          say: "It's lovely. Could I see it closer? If you'd let me.",
          reply: [
            ['wren', 'Closer, then. Mind the fern. It is tender and has opinions.', 'happy'],
          ] },
      ]);
      await play(c, [
        ['wren', 'Four people have lived in my cottage in the Whisperwood. One was a lamplighter who wanted to be a bard. Two were lovers who wanted to be somewhere else.', 'normal'],
        ['rowan', 'And the fourth?', 'normal'],
        ['wren', 'A fox. I was certain he was a person for a week. He wrote me letters, badly, in mud. Then he left like everyone else.', 'smirk'],
        ['wren', 'They all went down the path and did not look back. Good. People should be allowed to leave. I just did not expect the house to go so quiet afterward.', 'sad'],
        ['wren', 'So I made this. A forest that does not need me to be interesting. It needs light, a little water, and the occasional gossip. The gossip is optional.', 'normal'],
        ['narr', 'Wren turns the jar a quarter turn, so the moss faces the light, and does it so carefully it is clearly a habit.'],
        ['rowan', 'Do you get lonely out there, Wren?', 'worried'],
        ['wren', "I don't use that word. It's for people with time to spare. I'm very busy. I have a garden in a jar.", 'normal'],
      ]);
      await choose(c, 'wren', 'Wren is not looking at you:', [
        { tone: 'Earnest', label: 'Tell them they do not have to be fine with you', d: 4,
          say: "You don't have to be fine with me, Wren.",
          reply: [
            ['wren', "...That isn't fair. I was extremely well prepared to be fine.", 'sad'],
            ['narr', 'They look at the jar for a long moment, as though it might help. It does not, but it does not look away either.'],
          ] },
        { tone: 'Brave', label: 'Promise to come back every week with bad tea', d: 5,
          say: 'Then I will come back. Every week. I will bring bad tea and worse jokes, and you can be rude about both.',
          reply: [
            ['wren', 'Bad tea. You would bring bad tea? That is the most committed thing anyone has ever offered me.', 'surprised'],
            ['wren', 'Fine. Weekly. Write it down somewhere the fox cannot reach.', 'smirk'],
          ] },
        { tone: 'Teasing', label: 'Say sure, you are fine, and the fox is a diplomat', d: -2, expr: 'smirk',
          say: 'Sure. You are fine. And the fox is a diplomat, and the moss is a poet.',
          reply: [
            ['wren', 'Right. Go on, then. Sit somewhere else. That is what everybody does.', 'sad'],
            ['narr', 'They do not move. The jar turns very slowly in their hands.'],
            ['wren', "...No. Stay. I was being prickly. Be unbearable at me instead. It's better than the quiet.", 'worried'],
          ] },
      ]);
      await play(c, [
        ['wren', "I'm not lonely. I'm sealed. Like this. The things inside keep going, and nobody has to open the lid.", 'normal'],
        ['wren', 'Then somebody opens it anyway, without asking, with a lantern. Everything in here suddenly needs watering, and I have forgotten how to be a jar that has been opened.', 'sad'],
        ['rowan', 'Want me to close it again?', 'worried'],
        ['wren', 'No. Immediately no. Keep it open. I am going to be furious about it for a week.', 'surprised'],
        ['narr', 'On the glass shelf inside the jar, the single moonpetal, which has not opened in all the years Wren has tended it, gives a small shiver.'],
        ['wren', 'It only opens when somebody is looking. I used to think that was a flaw in the flower. I am starting to think it has taste.', 'smirk'],
        ['narr', 'Slowly, the first silver edge of a petal unfurls. Then another.'],
        ['wren', 'Oh, you absolute fool of a flower. Fine. Take the credit. Everybody else does.', 'happy'],
        ['wren', "Next time I'll let you hold the jar, not just the lantern. Don't make that face. You're making the petals nervous.", 'normal'],
      ]);
    },
  });

  reg({
    id: 'wren_b3', actor: 'wren', minTier: 3, minChapter: 4, kind: 'bond', once: true,
    title: 'May I Stay?',
    journal: 'Wren asked, for the first time in their life, whether they could stay, and you nearly kissed under a moonpetal.',
    bgm: 'romance',
    run: async (c) => {
      await c.bgm('romance');
      await play(c, [
        ['narr', 'The Whisperwood at night is quiet in the particular way of a place that is listening.'],
        ['narr', 'Pale moths gather at the cottage door. Far off, a fox gives an unimpressed bark.'],
        ['narr', 'Wren sits on the porch step with their hat in their lap and the feather bent sideways.'],
        ['narr', 'They are looking up at the tall moonpetal stalk by the gate, which has not bloomed in all the years they have lived here.'],
        ['narr', 'Tonight a single bud is opening. Slowly, like someone checking whether it is safe.'],
        ['wren', "It's going to bloom. I'm not nervous. I'm only aware of a flower.", 'worried'],
        ['rowan', "You're nervous.", 'smirk'],
        ['wren', "I'm allowed. I've practised a question on the fox all week. He's a poor audience. He keeps going to sleep.", 'sad'],
        ['wren', 'I have a question. I have never asked it of a person. Not once in my whole life.', 'normal'],
      ]);
      await choose(c, 'wren', 'Wren is waiting:', [
        { tone: 'Earnest', label: 'Ask it, and you will answer true', d: 4,
          say: "Ask it. I'll answer true, even if I'm clumsy about it.",
          reply: [
            ['wren', '...Thank you. Right. Here it is.', 'normal'],
          ] },
        { tone: 'Brave', label: 'Promise to answer anything they ask', d: 5,
          say: 'Anything. Ask me anything, Wren.',
          reply: [
            ['wren', '...Thank you. Right. Here it is.', 'normal'],
          ] },
        { tone: 'Teasing', label: 'Ask whether the fox said yes', d: 2, expr: 'smirk',
          say: 'Did the fox say yes?',
          reply: [
            ['wren', "The fox said nothing. He hasn't woken up since Tuesday. Here it is, anyway.", 'smirk'],
          ] },
        { tone: 'Flustered', label: 'Say "Oh. Yes? Probably yes"', d: 1, expr: 'blush',
          say: 'Oh... um. Yes? Probably yes. Definitely yes.',
          reply: [
            ['wren', 'Good. Probably yes is a very good start. Here it is.', 'happy'],
          ] },
      ]);
      await play(c, [
        ['wren', 'May I stay?', 'normal'],
        ['narr', 'The moths stop moving. Even the bud seems to hold still.'],
        ['wren', 'I mean here. The cottage. Or the Marigold, once the Spire is done, if you are still going somewhere. Anywhere you are.', 'normal'],
        ['wren', 'Everyone I have ever let in has gone. Going is what people do, and I am very good at watching them do it. I would like to find out what it is like when somebody does not.', 'sad'],
      ]);
      await choose(c, 'wren', 'Answer the question:', [
        { tone: 'Quiet', label: 'Answer with one word', d: 5,
          say: 'Yes.',
          reply: [
            ['wren', 'One word. I braced for a paragraph. I had a whole rebuttal, and now it is useless.', 'surprised'],
            ['narr', 'They sit very still, as if the answer were a bird that might fly off if they breathed.'],
          ] },
        { tone: 'Earnest', label: 'Say yes, and that you want them to stay', d: 4,
          say: "Yes. And I don't want you to ask again. Stay because you want to, not because you asked nicely.",
          reply: [
            ['wren', 'Want. That is a big word for a small, prickly person. I will have to find somewhere to keep it.', 'blush'],
          ] },
        { tone: 'Teasing', label: 'Say yes, if they bring the fox', d: 2, expr: 'smirk',
          say: 'Only if you bring the fox. The fox has been very vocal about it.',
          reply: [
            ['wren', 'He has already decided. He has been sitting on your boots since you sat down.', 'smirk'],
          ] },
        { tone: 'Flustered', label: 'Say yes, and offer them the good pillow', d: 1, expr: 'blush',
          say: 'Yes. Yes. You can have the good pillow. I will take the bad one. I am fine.',
          reply: [
            ['wren', 'The good pillow. That is extremely generous. The fox will be furious. Good.', 'happy'],
          ] },
      ]);
      await play(c, [
        ['narr', 'The bud unfurls with a sound like a sigh. Silver-white petals open one after another.'],
        ['narr', 'Their light is soft and cool, nothing like a lamp, and it falls across the porch and both of your faces.'],
        ['wren', "It's open. It has never been open with someone here to see it.", 'surprised'],
        ['wren', "I should say something about that. I don't know what. You will have to forgive me. Nobody has ever asked me to stay before, so I am bad at the rest.", 'sad'],
        ['wren', "Also, I have never done this. Kissing, I mean. Or nearly. Is it like a bee? Do I lean? Does the bee lean, or does the flower?", 'worried'],
        ['narr', 'Wren leans. You lean. A moth lands on a petal between you and settles there, very decided about the matter.'],
      ]);
      await choose(c, 'wren', 'The moment:', [
        { tone: 'Brave', label: 'Ask first', d: 5,
          say: 'May I?',
          reply: [
            ['wren', 'Yes. Yes. Forehead first. We are doing forehead. I am not a fast person.', 'blush'],
            ['narr', 'Their forehead touches yours, very gently, the way you would test whether a cup of tea is too hot.'],
            ['narr', 'Then they stay there, and the petals glow around the two of you.'],
          ] },
        { tone: 'Quiet', label: 'Stay exactly where you are and breathe', d: 4,
          say: "Stay right there. Let's just breathe for a little while.",
          reply: [
            ['narr', 'Neither of you closes the last inch. The moonpetal holds its light and the Whisperwood holds its breath.'],
            ['narr', 'It is the warmest quiet you have ever shared.'],
          ] },
        { tone: 'Teasing', label: 'Warn them the petals look offended', d: 1, expr: 'smirk',
          say: 'Mind the petals. They look offended by the whole arrangement.',
          reply: [
            ['wren', 'They are offended. Everything here is offended by me. You are the first thing to stay.', 'smirk'],
          ] },
      ]);
      await play(c, [
        ['narr', 'The moonpetal folds, slowly, back toward the dark, the way a flower does once it has said what it needed to say.'],
        ['wren', 'Put it in your notes. Wren Alder asked a question and got a yes. Nobody is going to believe me. The fox will want proof.', 'smirk'],
        ['wren', 'Stay for breakfast. I am bad at breakfast. You will have to forgive the porridge, and the fox, who has resumed sitting on your boots.', 'normal'],
      ]);
    },
  });

  reg({
    id: 'wren_confession', actor: 'wren', minTier: 3, minChapter: 4, kind: 'confession', once: true,
    title: 'Lantern Shore',
    journal: 'On Lantern Night Wren asked you to share a lantern, then told you bluntly that they loved you.',
    bgm: 'romance',
    run: async (c) => {
      await c.bgm('romance');
      await play(c, [
        ['narr', 'Lumen Vale on Lantern Night.'],
        ['narr', 'The festival is a warm roar along the terraces,'],
        ['narr', 'but the far end of the shingle is quiet and dark, and that is where Wren has chosen to stand.'],
        ['narr', 'Wren holds a paper lantern against their chest. It is blank. They keep turning it over, as if the blank side might change its mind.'],
        ['wren', 'I hate crowds. I came anyway. This is a terrible sign. The moss is sulking about it.', 'worried'],
        ['wren', 'Festival rule: one lantern, shared between two people. You chose me. The stall keeper told me. He looked delighted, and he is not a delightful man.', 'smirk'],
        ['wren', 'I came out here so I could say it before I lost my nerve, and before the feather falls out of my hat.', 'normal'],
      ]);
      await choose(c, 'wren', 'Wren waits:', [
        { tone: 'Earnest', label: 'Ask for the true version, not the pretty one', d: 3,
          say: "Say it. I'd rather hear it true than pretty.",
          reply: [
            ['wren', 'True, then. I am a terrible liar. My ears go pink. You have noticed the ears.', 'normal'],
          ] },
        { tone: 'Brave', label: 'Say you are not going anywhere', d: 3,
          say: "Say it, Wren. I'm not going anywhere.",
          reply: [
            ['wren', "Good. That's the only bit I was worried about.", 'happy'],
          ] },
        { tone: 'Teasing', label: 'Say they are making the lantern nervous', d: 2, expr: 'smirk',
          say: "Say it. You're making the lantern nervous.",
          reply: [
            ['wren', 'The lantern has never been nervous in its life. It is paper. It does not have the capacity.', 'smirk'],
          ] },
        { tone: 'Flustered', label: 'Say yes, please, anything', d: 2, expr: 'blush',
          say: "Yes. Yes, please. Say anything. I'll cope.",
          reply: [
            ['wren', "Anything, then. I'll start with the bad news.", 'happy'],
          ] },
      ]);
      await play(c, [
        ['wren', 'I love you. That is the plain version. The pretty version is that you are the only person in ten years who asked me a question and then waited for the answer as if it mattered.', 'normal'],
        ['wren', 'I have been telling myself the garden is enough. It is a very good garden. You are better than a jar.', 'sad'],
        ['wren', 'The moonpetal opened for you. Three years of nothing, and then one night, with you holding the lantern up to the glass. I think the flower was smarter than me.', 'happy'],
        ['wren', 'I am not good at staying in one place for people. I have decided it is a skill, like pickling. I can learn a skill. I am a witch. We are mostly learning.', 'normal'],
        ['wren', 'I meant to write it on the front of the lantern. My hands had other plans. So I wrote something else on the side.', 'worried'],
        ['narr', 'They turn the lantern over. On its side, pricked through the paper with a pin in small, careful letters, is a single name.'],
        ['narr', 'Lantern light shines through the holes, each letter a tiny star. Yours.'],
        ['wren', 'Right. Is this where I am meant to kiss you? I have read about it. It seemed structurally unsound.', 'worried'],
        ['rowan', 'Structurally, I think you are fine.', 'blush'],
        ['narr', 'They kiss you the way they do everything: directly, a little clumsily,'],
        ['narr', 'and then with a complete and surprising certainty that goes straight through you.'],
      ]);
      await c.emote('player', 'heart');
      await c.sfx('heart');
      await c.fade('out', 50, '#1a1030');
      await c.wait(30);
      await play(c, [
        ['narr', 'Behind you, the lantern lifts off the shingle where it was set down with great care,'],
        ['narr', 'and sails out over the water with your name on its side. The festival goes on without them for a while.'],
      ]);
      await c.fade('in', 50);
      await play(c, [
        ['narr', 'When the light comes back, Wren is sitting beside you on the stones with their hat in their lap and their ears very pink.'],
        ['wren', 'Structurally, that was sound. I am going to be insufferable about it. Expect a dissertation.', 'smirk'],
        ['rowan', "I'll read every page.", 'happy'],
        ['wren', "Yes. That's the trouble. You will.", 'blush'],
      ]);
      G.romance.setLover('wren');
      await c.affection('wren', 10);
    },
  });

  reg({
    id: 'wren_eve', actor: 'wren', minTier: 0, minChapter: 5, kind: 'eve', once: true,
    title: 'The Night Before the Spire',
    journal: 'The night before the Spire, Wren kept you company by the rail and made the climb feel less like an ending.',
    bgm: 'tender',
    run: async (c) => {
      await c.bgm('tender');
      const beloved = lover() === 'wren';
      if (beloved) {
        await play(c, [
          ['narr', 'The night before the Spire.'],
          ['narr', 'The Marigold is moored in the lee of the first terrace, and the Spire climbs into a sky with no stars in it at all.'],
          ['narr', 'Wren sits on the rail with their boots off and a fox asleep across their knees.'],
          ['narr', 'Their hat hangs on the nearest lamp hook, which for Wren is the same as undressing in public.'],
          ['wren', "Don't say anything about the hat. It isn't a symbol. It's a hat, and it's tired.", 'normal'],
          ['rowan', "I wasn't going to say anything.", 'smirk'],
          ['wren', 'You were going to look at it meaningfully. I could feel it on the back of my neck.', 'smirk'],
          ['wren', 'Tomorrow we climb. I have checked the route. Fourteen hundred steps, three of which are a lie, and one of which the fox has already tested and disliked.', 'normal'],
          ['wren', 'I am frightened. I am telling you because I have decided to say true things this week, and it is easier with a fox to blame.', 'sad'],
          ['rowan', 'Me too.', 'worried'],
          ['wren', "Good. Then we are both idiots, and we're going to climb anyway. It's a bad plan. It's ours.", 'happy'],
          ['wren', "Whatever is at the top, I'll be the one who wrote the way home down. Every step, in a notebook, in mud. You'll find it.", 'normal'],
          ['wren', "If it's bad up there, you come back down the stairs. I'll be at the bottom being rude, and that's a promise.", 'blush'],
          ['rowan', 'Only rude?', 'smirk'],
          ['wren', "Mostly rude. Some of it will be a surprise. I'm not telling you which bit.", 'smirk'],
          ['narr', 'Wren leans down from the rail and rests their forehead against yours, very carefully, so as not to wake the fox.'],
          ['wren', "Stay the night. I'll sleep badly. You can have the good pillow, and I'll pretend it's a sacrifice.", 'normal'],
          ['narr', "High at the top of the stair, a small cold flame flickers in the Spire's window. Neither of you looks at it for long."],
          ['wren', "Goodnight. I love you. That's not a riddle, so don't go looking for the answer.", 'blush'],
        ]);
      } else {
        await play(c, [
          ['narr', "The Marigold's galley, dark except for the stove. Wren sits at the table, sorting dried herbs into little paper twists with the grim concentration of a clerk."],
          ['wren', "Don't stand in the doorway. The thyme goes everywhere when you stand in the doorway.", 'normal'],
          ['rowan', 'Sorry.', 'worried'],
          ['wren', 'It is fine. Sit. You have your "I am going to be brave in the morning" face on, and it is distracting.', 'smirk'],
          ['rowan', "I'm scared, Wren.", 'sad'],
          ['wren', 'Good. Scared is correct. People who are not scared fall off things. Hold the rail. Look at the next step, not the top.', 'normal'],
          ['wren', "I've made you something. It isn't a charm. Charms are for people who need luck. This is rosemary, for remembering.", 'normal'],
          ['narr', 'They press a small paper twist into your palm and close your fingers over it,'],
          ['narr', 'briskly, the way you might give a child a coin for the sweet shop.'],
          ['wren', 'For when you forget who you are climbing for. You will, at about the eight-hundredth step. Everyone does. Eight hundred is very boring.', 'smirk'],
          ['wren', 'The fox has made a decision. He is coming in the morning. Nobody asked him.', 'normal'],
          ['rowan', "I'm glad he's coming.", 'happy'],
          ['wren', 'He will be useless. He will be sick on the fourth landing, and then he will be brave all at once. It is a family trait. Mine is the sick bit.', 'smirk'],
          ['wren', 'You have said you are glad four times tonight. I am taking that as evidence that you are a sensible person.', 'happy'],
          ['wren', 'Go to bed. The thyme is going everywhere. And {name}, the steps are not a personal insult. They are only steps.', 'normal'],
          ['narr', 'Wren goes back to the twists, humming something with no tune in it, and does not look up again until you have gone.'],
        ]);
      }
    },
  });

  reg({
    id: 'wren_epilogue', actor: 'wren', minTier: 4, minChapter: 5, kind: 'epilogue', once: true,
    title: 'Twin Flame',
    journal: "The Tithe ended, the Whisperwood opened its hand, and Wren's garden finally had room for two.",
    bgm: 'ending_love',
    run: async (c) => {
      await c.bgm('ending_love');
      await play(c, [
        ['narr', 'The Tithe ended without ceremony. The Order was too busy working out where its lamps had gone to bother with a proclamation.'],
        ['narr', 'In the Whisperwood, the old Lampwright seed went quiet.'],
        ['narr', 'For a long time it had held the forest shut like a fist, keeping the Hollow out and everyone else in. Now the fist opened.'],
        ['narr', "Within a season, people were walking the path to Wren's cottage again. Not to take anything. To ask questions and be answered rudely, which Wren considers the highest form of hospitality."],
        ['narr', "The garden has long since outgrown its jar. It spills over the cottage step and climbs the porch posts, and has, to the fox's great irritation, taken over the woodpile."],
        ['wren', "Don't step on the thyme.", 'normal'],
        ['rowan', "I'm not stepping on anything. I'm standing very carefully on the thyme.", 'smirk'],
        ['wren', 'That is stepping on the thyme.', 'normal'],
        ['narr', 'Wren sits on the step with a mug of tea, hat on, feather back in place.'],
        ['narr', 'Beside them on the sill is a second jar, empty and clean, and they keep glancing at it.'],
        ['wren', "It's for you. Don't look at it like that. It's a jar. You don't have to put anything in it.", 'normal'],
        ['rowan', 'Is that a question?', 'worried'],
        ['wren', "It's a Thursday. Not everything has to be a question.", 'smirk'],
        ['narr', 'Above the trees, the Hearthstar burns brighter and warmer than anyone in Auren has ever seen it.'],
        ['narr', 'Its light has two notes in it: one steady, one that flickers when the wind goes through the wood.'],
        ['wren', 'The Lampwrights built the star to use people up. It is not like that now. It takes a little warmth from everyone and gives it back. Like a kettle that has finally remembered what it is for.', 'happy'],
        ['wren', 'I used to think warmth was a thing you rationed. Tea, moonpetal, the last of the honey. You hoard it so there is some when you are alone. The most useless belief I ever had.', 'sad'],
        ['rowan', 'What changed?', 'normal'],
        ['wren', 'Somebody sat on my step and did not leave. Then they came back with bad jokes and a fox. I stopped counting the rations.', 'blush'],
        ['narr', 'At the heart of the garden the moonpetal is open.'],
        ['narr', 'It is the first to bloom each year, and this year it bloomed on a quiet Tuesday, when someone was there to see it.'],
        ['wren', 'I was sure, up in the Spire hall, that the only way to end the Tithe was to let my own wick go out. Very sensible. A jar with the lid screwed down.', 'sad'],
        ['rowan', 'You would not let me do it, either.', 'worried'],
        ['wren', 'No. We are idiots pointed in the same direction. It is the most useful kind.', 'smirk'],
        ['narr', 'Their hand finds yours on the warm stone of the step. The thread of their wick glows faintly beneath their ribs, close and bright.'],
        ['narr', 'Yours leans toward it, and the star above answers both.'],
        ['narr', 'Two hearts, one star. Nothing is drinking the lamps any more. The whole Whisperwood hums, quietly, like the inside of a bell.'],
        ['wren', 'Sera has written. The choir is touring. She says she is going to sing in the trees, because the acoustics here are "ridiculous".', 'happy', 'seraphine'],
        ['wren', 'I wrote back. I said the trees are very rude about acoustics, and she should come anyway. Then I said I would bring the fox to heckle.', 'smirk', 'seraphine'],
        ['narr', 'The fox, who has never been given a name because Wren refuses to give him one, looks up from the woodpile with deep and personal suspicion.'],
        ['rowan', 'Are you still going to be called a hedge-witch?', 'smirk'],
        ['wren', 'I want to be called Wren. Hedge-witch is what people say when they are worried they will be wrong about me.', 'normal'],
        ['rowan', 'Then Wren it is. Every day, until you are sick of it.', 'blush'],
        ['wren', "I am not going to be sick of it. Don't be stupid. I'm extremely hard to get rid of. Like moss.", 'blush'],
        ['narr', 'Dawn comes over the trees. Wren hangs their hat on its hook.'],
        ['narr', 'In the window, the moonpetal begins to fold itself away for the day, the way a hand closes around something it means to keep.'],
      ]);
    },
  });

  // ====================================================================
  // CREW BANTER  (whole-party scenes on the Marigold; actor null; only joined crew speak)
  // ====================================================================

  reg({
    id: 'banter_1', actor: null, minTier: 0, minChapter: 2, kind: 'banter', once: true,
    title: 'Dinner, Probably Safe',
    journal: "The crew survived Claret's stew, mostly, and agreed the Marigold was starting to feel like home.",
    bgm: 'comic',
    run: async (c) => {
      await c.bgm('comic');
      await play(c, [
        ['narr', 'The Marigold\'s galley, a week out of Brasshaven. Something is bubbling on the stove with an air of suspicion.'],
        ['claret', 'Nobody touch the stew. It is stew. It is fine. It is load-bearing.', 'normal'],
        ['rowan', 'Load-bearing?', 'worried'],
        ['claret', "I'm not explaining until you've eaten it. Then you'll be on my side.", 'smirk'],
        ['rook', 'Something in that pot is wearing a hat. I say that as a man who has eaten in Gladius.', 'smirk'],
        ['caspian', 'I have eaten worse in the Order\'s barracks, under worse supervision. This stew is honest. There is a great honesty in it.', 'normal'],
        ['claret', 'Thank you. Nobody has ever called my cooking honest before.', 'blush'],
        ['rook', 'Nobody has called it anything, Captain. The bowl is still looking at us.', 'smirk'],
        ['rowan', "I'll have seconds. Brave of me.", 'smirk'],
        ['claret', "Don't. Seconds is how the bowl wins.", 'normal'],
        ['narr', 'Spoons clink. Then more of them. For a while the galley is busy with the sound of people eating something they did not expect to enjoy.'],
        ['rowan', "It's good. Really good. The first hot meal since Wickholm that didn't come out of a tin.", 'happy'],
        ['claret', "Don't get used to it. I'm a mechanic with a stove, not a cook.", 'normal'],
        ['caspian', 'A mechanic with a stove who can make a stew honest. There must be a lesson in that somewhere.', 'happy', 'caspian'],
        ['rook', "The lesson is don't let the captain near the spice rack. I learned that the hard way.", 'smirk', 'caspian'],
        ['claret', "I'm sitting right here, Rook.", 'normal'],
        ['rook', "Yes, Captain, and that's why I'm saying it loudly.", 'smirk'],
        ['rook', 'Right. A silver says there is a nut in it.', 'smirk'],
        ['claret', "It contains one nut. It is a very small nut. It's the only one I own.", 'smirk'],
        ['seraphine', 'Grace first, everybody. Sit. The stew would like a blessing.', 'smirk'],
        ['wren', 'The stew does not want a blessing. It wants to be eaten quickly and not discussed.', 'normal'],
        ['seraphine', 'Wren, that is rude.', 'normal'],
        ['wren', 'It is also true. Sometimes those are the same thing. Pass the bread.', 'smirk'],
        ['narr', 'The bread goes round. Somebody, nobody will say who, has put a little lavender in the honey.', null, 'seraphine'],
        ['narr', 'It is not in the recipe. It is the best thing on the table.', null, 'seraphine'],
        ['rowan', 'To the ship.', 'happy'],
        ['claret', "To the ship that doesn't explode.", 'smirk'],
        ['caspian', "It has been a week. Nothing has exploded.", 'happy', 'caspian'],
        ['claret', "It's been a very quiet week. I'm starting to find it suspicious.", 'normal'],
        ['narr', 'Outside the portholes, the lantern-sun hangs low and warm over the sea, and for once nobody is in a hurry to be anywhere else.'],
        ['rowan', 'Thanks for cooking, Claret. Really.', 'happy'],
        ['claret', "Don't make it a moment. I'll get emotional about the gravy.", 'blush'],
        ['narr', 'She does not look up from her bowl. But the tips of her ears go pink, and she pushes the last of the bread across the table toward you.'],
      ]);
    },
  });

  reg({
    id: 'banter_2', actor: null, minTier: 0, minChapter: 3, kind: 'banter', once: true,
    title: 'Lanternfall',
    journal: 'Game night ended with a cheating thief, a fox who relocated the queen, and a lamp that went out at the worst moment.',
    bgm: 'comic',
    run: async (c) => {
      await c.bgm('comic');
      await play(c, [
        ['narr', "Night in the Marigold's mess. The table is cleared, the cards are out, and Claret has chalked a score column on a slate with the grim fairness of a tax collector."],
        ['rook', 'Lanternfall. Rules are simple. Highest hand takes the pot. The loser does the washing-up for a week.', 'smirk'],
        ['claret', "The loser scrubs the galley with a toothbrush. I'm keeping score, Rook. I've seen you deal.", 'normal'],
        ['rook', 'Captain, I am wounded. I am a gentleman. Gentlemen do not deal from the bottom.', 'smirk'],
        ['narr', 'He does, twice. Claret sees both times, and writes both down.'],
        ['caspian', 'I must be candid. I cannot lie, and so I shall not be able to bluff. Please do not take my hand personally.', 'normal', 'caspian'],
        ['rook', 'Caspian, the man who cannot lie, against the man who cannot stop. This is going to be tragic. I love it.', 'happy', 'caspian'],
        ['seraphine', "I've been practising my poker face. Watch. Mm. Nothing is happening in my face.", 'normal'],
        ['claret', "That's not a poker face. That's a hymn face.", 'smirk'],
        ['seraphine', 'A hymn face is a poker face with better lighting.', 'smirk'],
        ['narr', 'Under the table, a fox has taken the Queen of Lanterns in his teeth and is carrying her off with the air of a pickpocket.', null, 'wren'],
        ['wren', 'He wants it back. He is very serious about cards. He is very bad at them.', 'normal'],
        ['rook', "That was my best card. Wren, your fox is a thief. We have something in common.", 'smirk'],
        ['wren', 'He is not a thief. He is a fox. Foxes do not steal. They relocate property.', 'smirk'],
        ['claret', 'Right. Hands. Quietly. Caspian, you have that look again.', 'normal'],
        ['caspian', 'I have no look. I am simply holding three lanterns and a cold feeling.', 'worried', 'caspian'],
        ['rowan', 'Three lanterns and a feeling. That sounds like a winning hand.', 'smirk'],
        ['caspian', 'It is a losing hand. I shall lose honestly.', 'normal', 'caspian'],
        ['rook', 'That is the saddest thing I have ever heard. Fold, my friend. Fold for love.', 'happy', 'caspian'],
        ['narr', 'Caspian folds. He turns his cards face-up anyway, three lanterns and a cold feeling, because he cannot bear to be dishonest about it.', null, 'caspian'],
        ['claret', 'Rook wins, of course.', 'normal'],
        ['rook', 'Of course. Pay up. Oh, wait. Pay down. The washing-up.', 'happy'],
        ['rowan', "I'm playing the next hand. I've got a secret weapon.", 'smirk'],
        ['claret', 'You do not.', 'normal'],
        ['rowan', "I have Sera's face.", 'smirk'],
        ['seraphine', 'Mm. Be careful. You will have to give it back after.', 'smirk'],
        ['narr', 'The hand that follows is decided by a fox, a sneeze, and a lamp that goes out at a very inconvenient moment.'],
        ['narr', 'In the dark, somebody swears in a language nobody will admit to knowing.'],
        ['rowan', 'Who won?', 'worried'],
        ['claret', 'Nobody won. Lamp is out. We are all doing the washing-up.', 'normal'],
        ['rook', "I'd call that a moral victory for the fox.", 'smirk'],
        ['wren', 'He agrees with you.', 'smirk'],
        ['narr', 'Someone lights the lamp again.'],
        ['narr', 'In the sudden brightness everyone is laughing, even Caspian, who had sworn to be honest about his laughter and is not.'],
        ['seraphine', "We should make it a tradition. Thursday games. I'll bring sweets. Not sweet buns. Wren has feelings about sweet buns.", 'happy'],
        ['wren', 'I have a very reasonable objection to sweet buns.', 'normal'],
        ['rowan', 'Same time next week?', 'happy'],
        ['claret', "Same time, same washing-up. I'm bringing the slate with the proof.", 'smirk'],
      ]);
    },
  });

  reg({
    id: 'banter_3', actor: null, minTier: 0, minChapter: 4, kind: 'banter', once: true,
    title: 'The Storm Over the Road',
    journal: 'The Marigold rode out a storm over the Ashen Road with a lullaby, a stove, and a great many hands held tight.',
    bgm: 'tense',
    run: async (c) => {
      await c.bgm('tense');
      await play(c, [
        ['narr', 'Over the Ashen Road the sky turns the colour of an old bruise, and the Marigold runs straight into the middle of it.'],
        ['claret', 'Everyone in the galley. Now. Hold on to something bolted down. Nothing on this ship is bolted down enough, but hold on anyway.', 'worried'],
        ['narr', 'Thunder walks across the hull like a giant in bad boots. The lamps swing on their hooks.'],
        ['narr', 'A teacup escapes its saucer and is recaptured by Caspian without his looking.'],
        ['caspian', 'I have it. Forgive the liberty.', 'normal', 'caspian'],
        ['rook', 'Caspian, that was the most heroic thing I have seen all week, and I have watched you wrestle a bear.', 'happy', 'caspian'],
        ['claret', "Don't say it's just a bit of wind. It is not a bit of wind. It is a wind with a grudge.", 'normal'],
        ['rowan', 'How bad is it?', 'worried'],
        ['claret', 'Bad enough that I am going to swear at the engine. Don\'t look at me like that. It likes it.', 'smirk'],
        ['narr', 'Below decks the engine coughs, considers the matter, and resumes with a sound like a kettle having an argument with itself.'],
        ['claret', 'There. See? It listens to shouting. It is a Vane family trait.', 'smirk'],
        ['narr', 'Wren stands in the doorway with their hat clamped down and addresses the sky in a low, unimpressed voice.', null, 'wren'],
        ['wren', 'You are not invited. You are being rude. Go and be rude to a mountain.', 'normal'],
        ['rook', 'Is that going to work?', 'smirk', 'rook'],
        ['wren', 'No. But I feel better, and so will the fox, who is hiding under the bench and should be ashamed of himself.', 'smirk'],
        ['narr', 'Somewhere under the bench, a fox gives a long, miserable whine.', null, 'wren'],
        ['seraphine', 'Come here, everybody. Sit by the stove. I will sing.', 'happy'],
        ['rook', 'Sing what? Something with a happy ending, please. I have had a day.', 'smirk', 'rook'],
        ['seraphine', 'Something with no god in it.', 'normal'],
        ['narr', 'She starts low, a simple tune with no crooked turns in it.'],
        ['narr', 'By the second line the galley is humming along, including the ones who swear they cannot.'],
        ['caspian', 'I cannot hold a tune. I shall hold the lantern instead.', 'normal', 'caspian'],
        ['claret', 'Hold the lantern, Caspian. Thank you.', 'happy'],
        ['narr', 'Thunder rolls off across the sea, growing smaller.'],
        ['narr', 'The Marigold lurches once more and then steadies, like a horse that has decided not to bolt after all.'],
        ['rowan', 'Is it over?', 'worried'],
        ['claret', 'No. That was the front edge. The back edge is worse. It is always worse.', 'normal'],
        ['rook', 'Then tell us a story, Captain, and make it a good one.', 'smirk', 'rook'],
        ['claret', 'Once upon a time, a stupid mechanic tried to fix a boat in a storm.', 'smirk'],
        ['rook', "That's not a story. That's a summary.", 'smirk', 'rook'],
        ['claret', 'Fine. Once upon a time, the captain ran away from a storm and came home with a fox.', 'normal'],
        ['wren', 'I did not come home with a fox. The fox came home with me. There is a difference.', 'normal', 'wren'],
        ['seraphine', 'There is no difference. Let me have that one, Wren.', 'smirk', 'wren'],
        ['narr', 'The second wave hits. Nobody screams, though Rook comes close. They hold on to the table, to the nearest rail, to the nearest hand.'],
        ['rowan', "I'm not scared. I'm just holding on to Claret's sleeve very tightly.", 'worried'],
        ['claret', 'I can feel that. You are going to pull it off.', 'normal'],
        ['narr', 'She does not move her arm. Neither do you.'],
        ['narr', 'When the storm finally breaks, the sleeve is still there, a little crumpled, and nobody mentions it.'],
        ['narr', 'Outside, the stars come back over the Ashen Road one at a time, like lanterns being lit by someone who has finally got the matches to work.'],
      ]);
    },
  });

  reg({
    id: 'banter_4', actor: null, minTier: 0, minChapter: 5, kind: 'banter', once: true,
    title: 'Patch Job',
    journal: "The crew patched the Marigold's hull at the foot of the Spire and painted a row of small lanterns along the new plate.",
    bgm: 'comic',
    run: async (c) => {
      await c.bgm('comic');
      await play(c, [
        ['narr', "The Marigold's hull has a hole in it the size of a dining table, courtesy of Inquisitor Hale. Everyone has been put to work on the patch at the foot of the Spire's gate."],
        ['claret', 'Right. Patch. Plate. Rivets. Nobody says "fine" until I say "fine". Caspian, the plate. Rook, the rivets.', 'normal'],
        ['rook', "Captain, I'm a thief. Not a riveter.", 'smirk'],
        ['claret', "You're a thief with two hands. Use them.", 'normal'],
        ['caspian', 'Please. Hand me the plate. I shall carry it like a shield, which I believe is its real purpose.', 'happy', 'caspian'],
        ['narr', 'Caspian lifts a sheet of riveted iron onto one shoulder as if it were a loaf of bread,'],
        ['narr', 'and sets it over the hole with a gentleness that stops Claret complaining for two whole seconds.'],
        ['claret', "Hold it. Hold it, Caspian. Don't be nice to it. It'll get ideas.", 'normal'],
        ['narr', 'Rook pockets a bolt that is definitely not his and winks at no one in particular.', null, 'rook'],
        ['claret', 'Put that back.', 'normal'],
        ['rook', 'The universe said I could.', 'smirk', 'rook'],
        ['claret', 'The universe is not on my payroll.', 'normal'],
        ['seraphine', 'Oh, leave him. He has been good all morning. He has only stolen one thing.', 'smirk'],
        ['rook', "Thank you, Sera. I'll tell the universe you said so.", 'happy', 'rook'],
        ['wren', "The plant is going in the engine room. Don't argue. I've picked the spot.", 'normal'],
        ['claret', "Wren. Don't you dare put a moonpetal in my engine room.", 'angry'],
        ['wren', "It's a geranium. It is not a moonpetal. The moonpetal is for the bow. It needs a view.", 'normal'],
        ['claret', 'The geranium is not allowed in my engine. The engine is not a garden.', 'normal'],
        ['wren', 'Everything is a garden if you are patient enough. Your engine is already coughing like a hedge in June.', 'smirk'],
        ['narr', 'Sera has climbed onto the hull with a pot of paint.'],
        ['narr', 'She is writing a line of small lanterns along the new plate, one by one,'],
        ['narr', 'each with the tilted flame the Lampwrights once painted on their doors.'],
        ['rowan', "What are those?", 'normal'],
        ['seraphine', "Lanterns. Not the Order's kind. The sort you let go of, that go somewhere nobody owns.", 'happy'],
        ['claret', "They'll flake off in the first storm.", 'normal'],
        ['seraphine', "Then I'll paint them again. That's the nice thing about lanterns.", 'smirk'],
        ['caspian', 'I shall paint the one by the rivet. It is my favourite. It looks as if it is about to fall over, and does not care.', 'happy', 'caspian'],
        ['narr', 'By the time the sun is low the hole is a patch, the patch is a plate,'],
        ['narr', 'and the plate has a row of small bright lanterns running down the iron like the line of a hymn.'],
        ['narr', 'Claret raps the plate with a spanner. It rings, low and sure, like a bell that has been told it is needed.'],
        ['claret', 'Fine. It is fine. We are fixed.', 'smirk'],
        ['rowan', "We're not fixed. We're fixed enough.", 'happy'],
        ['claret', "...That's the nicest thing you've ever said about my work, and I am going to pretend you did not say it.", 'blush'],
        ['narr', 'Wren\'s geranium is wedged, against all reason, into a gap by the forward vent. It has already begun to lean toward the last of the sun.', null, 'wren'],
        ['rook', "Right. Who's buying a drink? Not me. I'm skint. I'm borrowing the universe for the evening, though.", 'smirk', 'rook'],
        ['claret', "Nobody is buying anything. We go up the Spire in the morning. Eat something first.", 'normal'],
        ['caspian', 'Eat, then sleep. And tomorrow, we climb.', 'normal', 'caspian'],
        ['narr', 'The crew sits along the hull in the last of the light, legs dangling, paint on their hands,'],
        ['narr', 'while the Spire climbs into the dusk above them like a question with no ending yet.'],
      ]);
    },
  });

  // ====================================================================
  // FINAL TOAST  (the night before the Hearthstar; all six crew; funny to moving)
  // ====================================================================

  // A knowing glance, shown only when someone is the Beloved (tier-aware, never heavy).
  const GLANCE = {
    seraphine: 'Across the table, Sera catches your eye over the rim of her cup, and for once she does not look away.',
    wren: 'Across the lanterns, Wren meets your eye, unblinking, the way they look at things they intend to keep.',
    claret: 'Across the table, Claret looks at you, then very deliberately looks into her cup as if it had done something rude. She is grinning.',
    caspian: "Caspian's eyes find yours over the rim of his cup. He gives the small, honest smile he does not give often, and lifts the cup an inch toward you.",
    rook: 'Rook finds you across the lanterns and winks, but not his usual wink. This one is slower, and it means: I know.',
  };

  reg({
    id: 'final_toast', actor: null, minTier: 0, minChapter: 5, kind: 'banter', once: true,
    title: 'The Last Lantern',
    journal: 'On the last night before the Hearthstar, the six of you raised a stolen bottle and promised to come back.',
    bgm: 'comic',
    run: async (c) => {
      await c.bgm('comic');
      await play(c, [
        ['narr', 'The night before the Hearthstar. Every lantern the crew could find is strung through the Marigold\'s rigging, mismatched and warm.'],
        ['narr', 'A table has been dragged up from the galley, with six cups on it.'],
        ['narr', 'In the middle of the table stands a bottle of ember wine. Rook swears he did not steal it.'],
        ['rook', 'Acquired. Not stolen. There is a difference, and I am standing in it.', 'smirk'],
        ['claret', 'He took it off a bishop.', 'normal'],
        ['caspian', 'From a bishop who was not drinking it, and who will be perfectly well. I have it on good authority.', 'normal'],
        ['wren', 'Wine taken from a bishop is a bad omen. Ask the fox. He had the bottle first.', 'smirk'],
        ['seraphine', 'Everyone, please. It is the last night. Let us be dignified for six whole minutes.', 'normal'],
        ['narr', 'Nobody is dignified for six whole minutes. Claret stands with a cup in one hand and a spanner in the other, which is how she makes speeches.'],
        ['claret', "Right. Speeches. I'm bad at these. So I'll say the honest thing, and nobody is allowed to cry about it.", 'normal'],
        ['claret', "I'm fighting for my dad. And for a ship that does not have to carry everything alone. Including me. That's the list. It's short. I've checked it twice.", 'sad'],
        ['caspian', 'I am fighting for the people I left in the lamp-towns. I put out their lights once, on an order. I would rather fall down the Spire than put out one more.', 'sad'],
        ['rook', "I'm fighting to stay. That's the whole plan. I'll stay put and be a nuisance until you all die of boredom. It's a punishment, honestly.", 'smirk'],
        ['seraphine', 'I am fighting for a hymn with no god in it. For people, singing out loud where nothing has to be drunk. The Abbess says she will attend. I have given her my "don\'t you dare" face.', 'happy'],
        ['wren', 'I am fighting for the garden. For the people who come back up the path. And for the fox, who is in the wrong place and has been told.', 'normal'],
        ['narr', 'Everyone turns to you. The lanterns sway, and the Hearthstar hangs above the Spire, pale and too bright for comfort. Nobody looks at it.'],
        ['rowan', "I'm fighting for everyone I've ever kindled. And the ones I haven't met yet. And for the stupid, wonderful people on this deck, who keep following me up the stairs.", 'happy'],
        ['rowan', 'Rook, I can see you blushing.', 'smirk'],
        ['rook', 'I am not blushing. The lantern is reflecting off me. It is a known effect.', 'smirk'],
      ]);
      const glance = GLANCE[lover()];
      if (glance) await play(c, [['narr', glance]]);
      await play(c, [
        ['rowan', 'Rook, you give the toast. You have been trying to all night.', 'smirk'],
        ['rook', 'Finally. Right. Cups up. Everyone. Cups up. And nobody cries.', 'happy'],
        ['rook', 'To lanterns that do not drink.', 'happy'],
        ['claret', 'To lanterns that do not drink.', 'normal'],
        ['caspian', 'To lanterns that do not drink, and to the people who carry them.', 'normal'],
        ['seraphine', 'To people who do not have to be spent in order to be bright.', 'happy'],
        ['wren', 'To the garden. And to everyone who gets to come up the path.', 'normal'],
        ['rowan', 'To all of you. Every single one.', 'happy'],
        ['narr', "Six cups go up. Lantern light runs over the rims, down the brass of Claret's hand, across Caspian's coat and Sera's pale hair and Wren's crooked hat, and over Rook's grin."],
        ['claret', 'Oh, don\'t. Rook, you are doing the face.', 'smirk'],
        ['rook', 'I am not doing a face. I am a very proud man with a stolen bottle of wine.', 'happy'],
        ['wren', 'Drink it, then, before it goes off. Bishops are very particular.', 'smirk'],
        ['narr', 'They drink. Somebody coughs. Somebody laughs too loudly, and then everybody is laughing, and the ship is full of it, warm and unhurried.'],
        ['caspian', 'Thank you. I should like to say, once more, that I am proud of every one of you. I shall say it again in the morning, in case I forget.', 'happy', 'caspian'],
        ['claret', 'You will forget. Say it on the stairs. We will all be too out of breath to argue.', 'smirk'],
        ['narr', 'Above the Spire, the Hearthstar burns on, a lantern that has been fed for an age on other people\'s warmth.'],
        ['narr', 'Down here, on one small ship, six lights sit together under a row of paper lanterns. Not one of them grows dimmer for being shared.'],
        ['narr', 'Tomorrow they will climb. Tonight they are simply together, and the lanterns burn, and they keep on burning.'],
      ]);
    },
  });

  G.provide('bonds_b');
})();
