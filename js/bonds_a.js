/* =====================================================================
 * LANTERNBOUND — bonds_a.js  (OWNER: bonds-a)
 * Romance scenes for Claret Vane, Caspian Thorne and Rook Calloway.
 * Registered ids (CONTRACT §9), for each X in claret / caspian / rook:
 *   X_b1  X_b2  X_b3  (kind 'bond')      X_confession (Lantern Night)
 *   X_eve (night before the Spire)       X_epilogue   (Twin Flame ending)
 * Written for ANY player gender: Rowan is always "you" or {name}.
 * Rowan's lines use G.name() + face 'rowan'. Every string is a backtick literal.
 * ===================================================================== */
(function () {
  'use strict';
  const G = window.G;

  // ------------------------------------------------------------------ helpers
  const NAME = { claret: 'Claret', caspian: 'Caspian', rook: 'Rook' };
  const talk = (c, who, text, expr) => c.say(NAME[who], text, { face: who, expr: expr || 'normal' });
  const you = (c, text, expr) => c.say(G.name(), text, { face: 'rowan', expr: expr || 'normal' });
  const nar = (c, text) => c.narrate(text);
  const pick = (c, prompt, options) => c.choice(options, { prompt: prompt });
  function register(def) {
    if (!G.romance || typeof G.romance.registerScene !== 'function') {
      console.warn('[bonds_a] G.romance not ready; scene skipped: ' + def.id);
      return;
    }
    G.romance.registerScene(def);
  }

  // ==================================================================
  //  CLARET VANE  — engineer, captain of the Marigold, sharp and tender
  // ==================================================================

  // ------------------------------------------------------------ claret_b1
  register({
    id: 'claret_b1', actor: 'claret', minTier: 1, minChapter: 1, kind: 'bond', once: true,
    title: 'Hold the Lamp', bgm: 'comic',
    journal: `Claret let you hold the lamp while she fixed the boiler she named after her father's coat.`,
    run: async (c) => {
      c.bgm('comic');
      await c.fade('in', 40);
      await nar(c, `Past midnight. The Marigold sleeps in its Brasshaven dock like a brass whale, its hatch open to the belly of the ship.`);
      await nar(c, `One lantern hangs from a hook. Below, a spanner rings off steel, followed by words no one should say before breakfast.`);
      await talk(c, 'claret', `Oi. Lamp. Yes, you. Get down here before the boiler decides I'm not worth the trouble.`, 'angry');
      await you(c, `Good evening to you too, Captain.`);
      await talk(c, 'claret', `Evening's over. This is the bad-idea hour. Lower. Left. Your other left.`, 'smirk');
      await you(c, `I'm holding it. I'm very good at holding things.`, 'smirk');
      await talk(c, 'claret', `You're holding it like it insulted your mother. Loosen up. It's glass, not a grudge.`, 'smirk');
      await nar(c, `Claret's head pops out of the hatch, goggles shoved up, a smear of soot across one cheek. She looks like she hasn't slept in a week.`);
      await talk(c, 'claret', `Don't touch the red valve. It's load-bearing.`);
      await you(c, `The valve is load-bearing?`, 'surprised');
      await talk(c, 'claret', `The valve, the bolt, the pipe, and me. Everything on this ship is load-bearing tonight. That's the problem.`, 'worried');

      const p1 = await pick(c, `She's pale under the soot. What do you say?`, [
        `Earnest: "You look exhausted. Talk to me while you work."`,
        `Teasing: "A load-bearing captain. Very dramatic for a spanner."`,
        `Flustered: "You've got soot on your... um. Everything."`,
        `Brave: "Move over. I'll take the valve. You take a break."`,
      ]);
      if (p1 === 0) {
        await talk(c, 'claret', `Nobody asks me that. They ask if the ship's going to explode. That's a question I can answer.`, 'blush');
        await talk(c, 'claret', `I'm fine. The ship is not fine. Don't put those two on the same plate.`, 'worried');
        await c.affection('claret', 4, 'Asked how she was');
      } else if (p1 === 1) {
        await talk(c, 'claret', `Dramatic? I'm a steam-powered sarcasm engine. You're welcome for the spanner.`, 'smirk');
        await c.affection('claret', 2, 'Traded barbs');
      } else if (p1 === 2) {
        await talk(c, 'claret', `Soot's a badge of honour. Proves I work. Are you staring at my face or my elbow?`, 'smirk');
        await you(c, `Your face. Mostly. The elbow was an accident.`, 'blush');
        await c.affection('claret', 1, 'Flustered but sweet');
      } else {
        await talk(c, 'claret', `Move over? Over my dead boiler? Absolutely not.`, 'angry');
        await talk(c, 'claret', `...Fine. Hold the wrench. Don't drop it, or I'll put you in the hull.`, 'smirk');
        await c.affection('claret', -1, 'Pushed too hard');
      }

      await nar(c, `The bolt gives with a shriek. Steam sighs out of the pipe in a long, warm breath, and the whole ship shivers awake around you.`);
      await talk(c, 'claret', `There she goes. Pansy's up.`, 'happy');
      await you(c, `Pansy?`);
      await talk(c, 'claret', `The boiler. Named after my dad's worst coat. Hideous. Brilliant engineer, though. Never once buttoned it.`, 'smirk');
      await talk(c, 'claret', `He said a machine with a name is a machine you'll actually take care of. He was right about most things. Not the coat.`, 'happy');
      await you(c, `Is that why you talk to the ship?`, 'smirk');
      await talk(c, 'claret', `I don't talk to the ship. The ship talks back, which is rude, and then I fix it.`, 'smirk');
      await talk(c, 'claret', `Why are you looking at me like that? Do I have a gauge face? Tell me I don't have a gauge face.`, 'angry');

      const p2 = await pick(c, `She catches you staring. Your answer?`, [
        `Earnest: "Because you're the first person here who made me feel useful. And you're kind of amazing."`,
        `Brave: "Because I'd like to keep looking. Is that allowed on a ship?"`,
        `Teasing: "Because you have soot on your nose, and it's very distracting."`,
        `Flustered: "I wasn't! I was looking at the ceiling. Rivets. Lovely rivets."`,
      ]);
      if (p2 === 0) {
        await talk(c, 'claret', `That's not fair. Not at midnight, with a lamp in your hand and a pipe trying to kill us both.`, 'blush');
        await talk(c, 'claret', `...I like being useful. Don't tell the ship. She'll get ideas above her station.`, 'happy');
        await c.affection('claret', 5, 'An honest answer');
      } else if (p2 === 1) {
        await talk(c, 'claret', `Allowed? Hm. Let me check the manual.`, 'smirk');
        await nar(c, `She flips an imaginary page, very seriously, then stops, pink to the ears.`);
        await talk(c, 'claret', `Not in the manual. Good. That means I get to decide.`, 'blush');
        await c.affection('claret', 3, 'Brave');
      } else if (p2 === 2) {
        await talk(c, 'claret', `Soot is a feature. Proves I work. Want one on the other cheek so it's even?`, 'smirk');
        await c.affection('claret', 2, 'Teasing');
      } else {
        await talk(c, 'claret', `Rivets are just rivets, {name}. You're blushing harder than the boiler.`, 'smirk');
        await c.affection('claret', -1, 'Awkward');
      }

      await talk(c, 'claret', `Right. Pressure's holding. You can go to bed now. Good work, lamp-holder.`, 'happy');
      await you(c, `Lamp-holder. I'll take that title, Captain.`, 'smirk');
      await you(c, `And you?`);
      await talk(c, 'claret', `I'm going to sit here and listen to her breathe a bit. Don't tell anyone. I'm not sentimental.`, 'normal');
      await nar(c, `She drops onto the hatch's edge and pats the metal beside her. The lamp sits between you, and the Marigold hums like a sleeping animal.`);
      await nar(c, `Somewhere in the boiler, Pansy clicks and settles, like a cat finding its spot.`);
      await talk(c, 'claret', `...Thanks for holding the light, {name}. Don't let it go to your head.`, 'blush');
      c.sfx('heart');
    },
  });

  // ------------------------------------------------------------ claret_b2
  register({
    id: 'claret_b2', actor: 'claret', minTier: 2, minChapter: 2, kind: 'bond', once: true,
    title: 'The Quiet Gift', bgm: 'tender',
    journal: `Claret admitted she can't sleep in silence, and gave you a handmade brass lantern charm.`,
    run: async (c) => {
      c.bgm('tender');
      await c.fade('in', 40);
      await nar(c, `Brasshaven's harbour is quiet tonight.`);
      await nar(c, `The Marigold's engine is off for the first time in weeks, and the silence sits on the deck like a held breath.`);
      await nar(c, `Claret leans on the rail, tapping a wrench against a lamp post. Tick. Tick. Tick. A metronome for someone who can't sleep.`);
      await talk(c, 'claret', `If you came to tell me to go to bed, the answer's no. I'm waiting for her to get noisy again.`, 'normal');
      await you(c, `Did you mean to say that out loud?`, 'smirk');
      await talk(c, 'claret', `I mean everything I say. Some of it's just rude. That one's the sad kind.`, 'worried');

      const p1 = await pick(c, `The wrench keeps ticking, a little too fast. What do you do?`, [
        `Quiet: "Sit down next to her. We can be quiet together."`,
        `Teasing: "The ship's fine. You're the loud one, Captain."`,
        `Brave: "Then let's fix the silence. I'll hum. Badly."`,
        `Flustered: "I can't sleep either. Not because of the ship. I swear."`,
      ]);
      if (p1 === 0) {
        await nar(c, `You sit beside her, shoulder to shoulder, saying nothing. After a while, the wrench stops ticking.`);
        await talk(c, 'claret', `...Yeah. Okay. It's easier when someone else is awake. Nobody tells you that in the manuals.`, 'normal');
        await c.affection('claret', 5, 'Sat in the quiet with her');
      } else if (p1 === 1) {
        await talk(c, 'claret', `Loud? I'm the most considerate engineer in Auren. Don't get smug. You're still on watch.`, 'smirk');
        await c.affection('claret', 2, 'Teasing');
      } else if (p1 === 2) {
        await talk(c, 'claret', `You'd hum? On purpose?`, 'surprised');
        await you(c, `Badly. Very badly. I'm committed.`, 'smirk');
        await talk(c, 'claret', `Don't. Pansy would take it personally and I'd have to throw you in the harbour. Hum something else.`, 'blush');
        await c.affection('claret', 3, 'Offered to hum');
      } else {
        await talk(c, 'claret', `Obviously. Thank you for the detailed report, {name}. Very thorough.`, 'smirk');
        await nar(c, `She tries not to smile. She fails spectacularly.`);
        await c.affection('claret', 1, 'Flustered');
      }

      await nar(c, `She sits, knees up, goggles pulled down like a shield.`);
      await nar(c, `For a long while the only sounds are water slapping the dock and the lamp's faint hiss.`);
      await talk(c, 'claret', `When I was small, Dad banked the boiler every night. The engine went quiet, and every morning I checked he was still at breakfast.`, 'sad');
      await talk(c, 'claret', `Then one night it stayed off. The house was so quiet I could hear the clock in the hall. He wasn't at breakfast.`, 'sad');
      await talk(c, 'claret', `He'd gone to the Cold Foundry for a short job.`, 'sad');
      await talk(c, 'claret', `Short. Right. I still don't know how long short is.`, 'worried');
      await talk(c, 'claret', `So I can't sleep in silence. Every silence is just a morning where somebody isn't at breakfast.`, 'worried');

      const p2 = await pick(c, `She's staring at the dark water as if it might take someone. What do you say?`, [
        `Earnest: "Then I won't leave while the engine's quiet. Not tonight. Not while you need me."`,
        `Brave: "Then I'll be the one who stays. Ask me every night, and I'll say yes."`,
        `Teasing: "Try and get rid of me. You'd need a bigger ship and a worse wrench."`,
        `Flustered: "I don't want to leave. You're really hard to leave, and I'm bad at this."`,
      ]);
      if (p2 === 0) {
        await talk(c, 'claret', `Don't make promises. They're like bolts. Once they're in, they're a nightmare to take out.`, 'worried');
        await nar(c, `A long pause. Her hand finds the edge of your sleeve and holds on, the way you'd test a rail in the dark.`);
        await talk(c, 'claret', `...Okay. Promise. Don't make it weird.`, 'blush');
        await c.affection('claret', 4, 'Promised to stay');
      } else if (p2 === 1) {
        await talk(c, 'claret', `Every night? You'd get tired of me.`, 'worried');
        await you(c, `I won't.`, 'happy');
        await talk(c, 'claret', `...Then I'll ask. Don't say no. I'm bad at being told no. I just go and fix it instead.`, 'blush');
        await c.affection('claret', 3, 'Promised every night');
      } else if (p2 === 2) {
        await talk(c, 'claret', `Ha. A bigger ship. I'd need a bigger ego to haul you out of here.`, 'smirk');
        await c.affection('claret', 2, 'Teasing');
      } else {
        await talk(c, 'claret', `Hard to leave. That's the nicest insult I've had all year.`, 'blush');
        await c.affection('claret', 3, 'Flustered');
      }

      await nar(c, `Claret digs into her jacket and pulls out something small.`);
      await nar(c, `A charm no bigger than a thimble: a brass lantern with a tiny gear for a handle and a flame of smoked amber glass.`);
      await talk(c, 'claret', `It's not a gift. It's a test. The escapement's been acting up. Forty-two attempts. Forty-two.`, 'normal');
      await you(c, `It's beautiful, Claret.`, 'happy');
      await talk(c, 'claret', `It's a stupid brass lantern that ticks. Keep it on your coat.`, 'blush');
      await talk(c, 'claret', `When it ticks, you'll know somebody built it so you'd never be alone with the quiet.`, 'blush');
      await you(c, `...Claret.`, 'blush');
      await talk(c, 'claret', `Don't. You'll make me cry into my own spanner.`, 'angry');
      await nar(c, `She reaches across and winds the tiny key. Gears ratchet. The little lantern ticks, quick and bright, in the middle of the silence.`);
      await talk(c, 'claret', `There. Now it isn't so quiet.`, 'happy');
      await nar(c, `She drops down the engine hatch. A moment later the boiler coughs, catches, and rolls to life.`);
      await nar(c, `Pansy's hum climbs through the planks until the whole deck breathes with it.`);
      await talk(c, 'claret', `Don't tell anyone I sleep better with you on the deck.`, 'smirk');
      await you(c, `Your secret's safe with me.`, 'smirk');
      await talk(c, 'claret', `Good. I'd deny it, and the ship would back me up. She's loyal, when she isn't being rude.`, 'smirk');
      c.sfx('heart');
    },
  });

  // ------------------------------------------------------------ claret_b3
  register({
    id: 'claret_b3', actor: 'claret', minTier: 3, minChapter: 4, kind: 'bond', once: true,
    title: 'Load-Bearing', bgm: 'sad',
    journal: `Claret confessed her father's letter and her guilt, and nearly kissed you in the engine room.`,
    run: async (c) => {
      c.bgm('sad');
      await c.fade('in', 40);
      await nar(c, `The engine room of the Marigold is hot as the inside of a kettle. Brass pipes tick faintly. One lamp burns on a hook above the boiler.`);
      await nar(c, `Claret sits on an upturned crate with a letter in her hands. The paper is creased so many times it has gone soft as cloth.`);
      await you(c, `Claret? You've been down here for hours.`, 'worried');
      await talk(c, 'claret', `Don't touch that. It's just paper. It isn't load-bearing. It's just... paper.`, 'worried');
      await you(c, `Whose letter is it?`);
      await talk(c, 'claret', `My dad's. It came through an Order courier. Either a miracle or a trap. I haven't decided which.`, 'normal');
      await talk(c, 'claret', `He's happy. That's the worst part. He writes like a man who's finally put his life in order. "Don't come for me, Clare.`, 'sad');
      await talk(c, 'claret', `The Engine will end the suffering."`, 'sad');

      const p1 = await pick(c, `The letter crinkles in her fist. What do you say?`, [
        `Earnest: "He sounds like a man who's been told a comforting lie. You can still reach him."`,
        `Teasing: "Your dad's handwriting is a crime. Tell me he at least used a ruler."`,
        `Flustered: "I don't know what to say. I just want to hold your hand, if that's okay."`,
        `Brave: "Then we go and get him. Together. The Cold Foundry is just a building with a bad door."`,
      ]);
      if (p1 === 0) {
        await talk(c, 'claret', `Reach him. Like I'm a stubborn bolt rusted into the hull. ...Maybe I am.`, 'worried');
        await c.affection('claret', 5, 'Sincere, not a joke');
      } else if (p1 === 1) {
        await talk(c, 'claret', `He used a ruler. For everything. Even bedtime stories. Even me.`, 'sad');
        await talk(c, 'claret', `...You're not helping. I know you're trying, though.`, 'worried');
        await c.affection('claret', -2, 'Too light, too soon');
      } else if (p1 === 2) {
        await talk(c, 'claret', `Hold your hand? Just the left one. My right is busy strangling this letter.`, 'blush');
        await c.affection('claret', 3, 'Offered a hand');
      } else {
        await talk(c, 'claret', `Together. You say that like it's easy.`, 'smirk');
        await you(c, `It's not easy. It's a plan.`);
        await talk(c, 'claret', `No. But I like plans. Plans have diagrams.`, 'blush');
        await c.affection('claret', 4, 'Brave plan');
      }

      await nar(c, `She stands and paces past the boiler, heat rolling off the brass. For once, the words come faster than her tools.`);
      await talk(c, 'claret', `I told him to go. He wanted a steady job, and the Order pays in brass. I said, "Fine. Go.`, 'sad');
      await talk(c, 'claret', `I don't need you." Those were the last things I gave him.`, 'sad');
      await talk(c, 'claret', `So I built everything. The Marigold. The boiler. Every bolt and gauge.`, 'sad');
      await talk(c, 'claret', `I thought if I made something perfect enough, he'd come home to see it.`, 'sad');
      await talk(c, 'claret', `Dad taught me to solder when I was eight. He said every machine has a soft point, the place where it bends. Find it before it breaks.`, 'normal');
      await talk(c, 'claret', `I've been bending for years and calling it strength. I'm load-bearing for everyone, and I am so, so tired.`, 'worried');

      const p2 = await pick(c, `She's shaking. Don't let her hide behind a joke. What do you say?`, [
        `Earnest: "You don't have to be load-bearing, Claret. Not for everyone. Not alone."`,
        `Brave: "Then drop the wrench. I'll catch it. I'm not going anywhere."`,
        `Teasing: "You're load-bearing for the one person who loves your terrible jokes. Me."`,
        `Flustered: "I can't stop looking at your mouth. Sorry. That's not helpful, I know."`,
      ]);
      if (p2 === 0) {
        await talk(c, 'claret', `You don't get to say that and make my eyes sting. There's soot in them. That's all it is.`, 'sad');
        await c.affection('claret', 5, 'Gave her permission to rest');
      } else if (p2 === 1) {
        await talk(c, 'claret', `Catch it. Gods. You'd drop it on my foot and call it a rescue.`, 'smirk');
        await nar(c, `She laughs, wet and startled, and the wrench clatters onto the grating. Neither of you looks at it.`);
        await c.affection('claret', 4, 'Promised to catch her');
      } else if (p2 === 2) {
        await talk(c, 'claret', `Terrible jokes? I'll hold you to that. You'll have to listen to every single one.`, 'blush');
        await c.affection('claret', 1, 'Teasing');
      } else {
        await talk(c, 'claret', `My mouth? ...Oh.`, 'blush');
        await talk(c, 'claret', `That's the least helpful thing anyone's said to me, and I'm so glad you said it.`, 'happy');
        await c.affection('claret', 2, 'Flustered');
      }

      await nar(c, `She's closer now. You don't remember moving. Her forehead is nearly touching yours, and you're both breathing steam and something warmer.`);
      await talk(c, 'claret', `This is a terrible time to be honest with you.`, 'worried');
      await you(c, `The worst time. I know.`, 'blush');
      await talk(c, 'claret', `I'm going to kiss you. I want you to know that before I do it, in case you're—`, 'blush');
      await nar(c, `Pansy lets out a long, furious shriek of steam, like a kettle that's been ignored for a decade.`);
      await talk(c, 'claret', `Oh, for— She's jealous. The boiler is jealous.`, 'angry');
      await you(c, `She has excellent timing.`, 'smirk');
      await talk(c, 'claret', `Ask me again after I've slept. Properly. Without a boiler heckling us.`, 'blush');
      await you(c, `I'll ask.`, 'happy');
      await nar(c, `Her forehead finds yours. Just that. Two people who fix things, leaning on the one thing neither of them can repair alone.`);
      await talk(c, 'claret', `Don't leave me to fix this by myself, {name}.`, 'sad');
      await you(c, `I won't. You can't get rid of me. I'm load-bearing too.`, 'smirk');
      await talk(c, 'claret', `Oh, you're terrible. You're terrible, and I'm keeping you.`, 'happy');
      await nar(c, `The letter goes back into her jacket, over her heart. In your coat pocket, a little brass lantern ticks softly, in no hurry at all.`);
      c.bgm('tender');
    },
  });

  // ---------------------------------------------------------- claret_confession
  register({
    id: 'claret_confession', actor: 'claret', minTier: 3, minChapter: 4, kind: 'confession', once: true,
    title: 'Lantern Night', bgm: 'romance',
    journal: `On Lantern Night, Claret confessed she loves you, and you became her Beloved.`,
    run: async (c) => {
      c.bgm('romance');
      await c.fade('in', 60);
      await nar(c, `Lumen Vale, Lantern Night. The lake is a mirror full of paper lanterns, each carrying a wish someone was too shy to say out loud.`);
      await nar(c, `Claret sits on the shore with her boots off and her goggles pushed up. A lantern rests in her lap, a pen tucked behind her ear.`);
      await nar(c, `She hasn't written a word.`);
      await talk(c, 'claret', `I don't do wishes. I do repairs. A wish is a repair with no tools and a much higher failure rate.`, 'smirk');
      await you(c, `Then let me write it for you.`, 'smirk');
      await talk(c, 'claret', `No. Sit. I'm going to do this in one go, like a status report, and you're going to let me finish.`, 'worried');
      await talk(c, 'claret', `I've spent my whole life making things that don't leave. Bolts. Hulls. A father-shaped hole I tried to patch with brass.`, 'sad');
      await talk(c, 'claret', `And then you held the lamp for an hour without complaining. You're the first thing I've never wanted to fix. I just want to keep you.`, 'blush');
      await talk(c, 'claret', `I'm in love with you. The stupid, load-bearing kind. Say something before I combust into the lake.`, 'worried');

      const p1 = await pick(c, `Lanterns drift past the shore. How do you answer her?`, [
        `Earnest: "I love you too. I've known for weeks, and I was scared to be the one who said it."`,
        `Brave: "Then stop being scared, Claret. Come here. I'll be the one who catches you."`,
        `Teasing: "Finally. I thought you'd die before admitting it, and I'd have to write your eulogy."`,
        `Flustered: "I... yes. Yes. Gods, yes, I love you. Can I say it again? Please?"`,
      ]);
      if (p1 === 0) {
        await talk(c, 'claret', `You... really? Good. Good. I'm going to need a minute. Don't look at me.`, 'blush');
        await c.affection('claret', 2, 'Said it back');
      } else if (p1 === 1) {
        await talk(c, 'claret', `Catch me, then. I'm very heavy. I'm load-bearing, remember.`, 'smirk');
        await c.affection('claret', 2, 'Brave');
      } else if (p1 === 2) {
        await talk(c, 'claret', `Eulogy? You'd write it badly. It would rhyme with boiler.`, 'smirk');
        await c.affection('claret', 1, 'Teasing');
      } else {
        await talk(c, 'claret', `Say it again. I'll keep count. It's a very good count. I'm going to keep all of them.`, 'blush');
        await c.affection('claret', 1, 'Flustered');
      }

      await talk(c, 'claret', `Can I kiss you? I'm asking. You know I hate asking. It's the only kind of request I can't fix.`, 'blush');
      await you(c, `Yes.`, 'happy');
      c.sfx('heart');
      await c.emote('player', 'heart');
      await nar(c, `She sets the lantern on the water, and it drifts away toward the others. She doesn't watch it go.`);
      await nar(c, `The lanterns blur into gold as you lean in.`);
      await c.fade('out', 50);
      await c.wait(40);
      await c.fade('in', 50);
      await talk(c, 'claret', `That was the worst report I've ever given. Tell me it was good.`, 'blush');
      await you(c, `It was the best one I've ever heard.`, 'happy');
      await nar(c, `A bell rings out over the water for midnight. Somewhere, a thousand small wishes climb into the dark, and neither of you needs to read them.`);
      G.romance.setLover('claret');
      await c.affection('claret', 10, 'Lantern Night confession');
    },
  });

  // ------------------------------------------------------------ claret_eve
  register({
    id: 'claret_eve', actor: 'claret', minTier: 0, minChapter: 5, kind: 'eve', once: true,
    title: 'The Night Before the Spire', bgm: 'tender',
    journal: `On the eve of the Spire, Claret made you promise to come back down the stairs.`,
    run: async (c) => {
      const beloved = !!(G.romance && G.romance.lover && G.romance.lover() === 'claret');
      c.bgm('tender');
      await c.fade('in', 50);
      await nar(c, `The Hearth Spire stands like a black needle against the stars, a lantern burning at its tip.`);
      await nar(c, `The Marigold rides low on the last hill of the Ashen Road.`);
      if (beloved) {
        await talk(c, 'claret', `I've checked your harness four times. I'm checking it a fifth. Stop watching me, I'm nervous.`, 'worried');
        await you(c, `You're nervous? You?`, 'surprised');
        await talk(c, 'claret', `I'm an engineer. Engineers don't get nervous. We get specific.`, 'smirk');
        await talk(c, 'claret', `Tomorrow I see my father. I've rehearsed what I'll say a hundred times. I always forget the first line.`, 'sad');
        await you(c, `Start with "I'm here." It worked on me.`, 'smirk');
        await talk(c, 'claret', `...It did. Damn you. It really did.`, 'blush');
        await talk(c, 'claret', `When this is over, I want to sleep without listening for Pansy. I want you in the bunk too, with your boots somewhere terrible.`, 'blush');
        await you(c, `Are you asking me to move in?`, 'smirk');
        await talk(c, 'claret', `I'm asking you to come home. The Marigold is home now. It's the same thing with more rivets.`, 'normal');
        await talk(c, 'claret', `Promise me. You come back down those stairs, and you let me yell at you about your posture. Every single day.`, 'sad');
        await you(c, `I promise.`, 'happy');
        await talk(c, 'claret', `Good. Now come here before I start crying into the gearbox.`, 'blush');
        await nar(c, `She pulls you into the lamplight. Her forehead rests against yours, and for once she doesn't say anything clever at all.`);
        await talk(c, 'claret', `You don't have to hold the whole ship up. Just hold on to me. That's all I'm asking.`, 'blush');
        await c.emote('player', 'heart');
        c.sfx('heart');
        await talk(c, 'claret', `Good night, {name}. Don't let the Spire get too smug about it.`, 'happy');
      } else {
        await talk(c, 'claret', `You've been picking at that map for an hour. Put it down. Maps don't climb stairs. People do.`, 'smirk');
        await you(c, `I'm scared, Claret.`);
        await talk(c, 'claret', `Good. Scared people check their harnesses. I already checked yours. Twice. You'd have forgotten the second strap.`, 'smirk');
        await you(c, `Would I?`, 'blush');
        await talk(c, 'claret', `You absolutely would. You'd smile at the sky and forget. You do that.`, 'normal');
        await talk(c, 'claret', `Tomorrow I'm on the ship, keeping her in the air. You're on the stairs. Don't argue. I've already made the schedule.`, 'normal');
        await nar(c, `She sits on the hatch rim, goggles on her forehead, and holds out a small spanner like a toast. It's friendship in its most practical form.`);
        await talk(c, 'claret', `You've been the best crew I've ever had. Better than the Order's engineers, and they had gold-plated wrenches.`, 'happy');
        await nar(c, `Somewhere below, the boiler breathes in and out, slow as a sleeping giant. The sound is almost comforting.`);
        await you(c, `It's nice, having something that keeps going while we rest.`, 'happy');
        await talk(c, 'claret', `Whatever's up there, you're not walking into it alone. I'll be on the other end of the wire. I'm always on the other end of something.`, 'normal');
        await you(c, `Thank you, Claret.`, 'happy');
        await talk(c, 'claret', `Don't thank me. Thank the ship. She'll be insufferable if you don't.`, 'smirk');
        await talk(c, 'claret', `Now go to bed. That's an order from your captain, and yes, I'll put it in the log.`, 'smirk');
      }
    },
  });

  // ------------------------------------------------------------ claret_epilogue
  register({
    id: 'claret_epilogue', actor: 'claret', minTier: 4, minChapter: 5, kind: 'epilogue', once: true,
    title: 'Vane & Load-Bearing Repairs', bgm: 'ending_love',
    journal: `After the Twin Flame, you and Claret made a quiet home on the Marigold and learned to rest.`,
    run: async (c) => {
      c.bgm('ending_love');
      await c.fade('in', 90);
      await nar(c, `A year after the Spire, the Hearthstar still burns above Auren. It doesn't look the way it used to.`);
      await nar(c, `It burns in two colours now: a steady gold, and a warmer, lopsided ember that flickers when someone laughs.`);
      await nar(c, `Nobody announced the end of the Tithe. The lamps simply stopped asking for warmth.`);
      await nar(c, `People noticed in their sleep first, which was the only place the Order had never been able to hide its theft.`);
      await nar(c, `In Brasshaven, a new sign hangs over a workshop door, painted by hand and crooked on purpose: VANE & LOAD-BEARING REPAIRS.`);
      await nar(c, `Customers come anyway. They like the crooked part.`);
      await nar(c, `Inside, a grey-templed shipwright sands a brass lantern with the wrong grip, humming the engine note flat to annoy someone.`);
      await c.say('Bram', `Clare! You're using too much solder again. I can see it from here.`, { face: 'bram', expr: 'happy' });
      await talk(c, 'claret', `I'm using exactly enough solder. You're just jealous of my hands.`, 'smirk');
      await c.say('Bram', `I taught you to find the soft point. I didn't teach you to sit on it for ten years.`, { face: 'bram', expr: 'worried' });
      await nar(c, `Claret goes very still. Then she laughs, a real laugh, loud and unguarded, and climbs down the ladder to take the file out of his hands.`);
      await talk(c, 'claret', `Then you carry the heavy end, Dad. That's the deal. You don't get to be the only one holding things up.`, 'happy');
      await c.say('Bram', `Load-bearing. Listen to you. Go on, then. I'll see to Pansy before she sulks.`, { face: 'bram', expr: 'happy' });
      await nar(c, `The workshop door bangs open. You come in with two mugs of ember wine and a smear of grease on your sleeve.`);
      await nar(c, `Claret pretends not to notice until you're close enough to touch.`);
      await talk(c, 'claret', `You're late. The ship's been sulking. And you've got mud on your boots.`, 'smirk');
      await you(c, `I walked the long way past the market.`, 'smirk');
      await talk(c, 'claret', `Mud is a sign of having a life. Fine. Sit. Drink. Stop being so pleased with yourself.`, 'blush');
      await nar(c, `The Marigold rests at her dock, quiet for the evening.`);
      await nar(c, `The engine ticks rather than roars, and for the first time in years the silence doesn't frighten her.`);
      await talk(c, 'claret', `I still listen for her every night. Habit. But I don't need the noise to sleep anymore. I just need you, which is embarrassing.`, 'blush');
      await you(c, `It's a good kind of embarrassing.`, 'happy');
      await talk(c, 'claret', `Don't get used to it. I'll deny all of it at breakfast.`, 'smirk');
      await nar(c, `On your coat, a brass lantern ticks in time with the boiler, a fraction out of step, like two things that found their way back.`);
      await talk(c, 'claret', `Do you remember what I said about everything being load-bearing?`, 'normal');
      await you(c, `You said you were tired. Of carrying all of it.`, 'normal');
      await talk(c, 'claret', `I said I was tired. You said you weren't going anywhere. You haven't. It's very annoying, and I've decided I like it.`, 'happy');
      await nar(c, `She sets down her mug and leans her shoulder into yours, the way you'd settle a crate exactly where it belongs.`);
      await talk(c, 'claret', `I'm not load-bearing anymore. I'm just here. It's a much better job.`, 'blush');
      await nar(c, `Outside, the Hearthstar's light softens into lamplight dusk. Two hearts, one lantern, and a ship that has finally earned a quiet night.`);
      await talk(c, 'claret', `Hold the lamp for me. Just for a minute.`, 'normal');
      await you(c, `Always.`, 'happy');
      await nar(c, `Her hand finds yours on the handle. The lamp's light stays steady between you, the way it was always going to.`);
    },
  });

  // ==================================================================
  //  CASPIAN THORNE  — disgraced Knight-Lantern, courtly and gentle
  // ==================================================================

  // ---------------------------------------------------------- caspian_b1
  register({
    id: 'caspian_b1', actor: 'caspian', minTier: 1, minChapter: 2, kind: 'bond', once: true,
    title: 'Boots and Books', bgm: 'comic',
    journal: `Caspian asked permission to polish your boots, then lost himself in a satchel of old books.`,
    run: async (c) => {
      c.bgm('comic');
      await c.fade('in', 40);
      await nar(c, `The Marigold's galley smells of lamp oil, strong coffee, and someone's ambitious attempt at toast.`);
      await nar(c, `Caspian Thorne sits at the long table with a towel, a tin of polish, and dusty boots.`);
      await talk(c, 'caspian', `Forgive me. I was... unable not to notice your boots.`, 'worried');
      await you(c, `My boots?`, 'surprised');
      await talk(c, 'caspian', `They are in a condition that offends my sense of order. Mud on the left. Tragedy on the right. I apologise on their behalf.`, 'normal');
      await you(c, `Are you asking to polish them?`, 'smirk');
      await talk(c, 'caspian', `I am asking permission. I'm told that is the proper form. Nobody ever told me what happens when someone says no.`, 'normal');
      await nar(c, `He has half-risen from the bench, one knee bent, the polish tin balanced on his palm with the grave care of a man presenting a sword.`);

      const p1 = await pick(c, `He's kneeling for your boots like a knight in a tavern. How do you answer?`, [
        `Earnest: "Yes, please. Nobody's ever cared this much about my boots before."`,
        `Brave: "Polish them, then. But you'll have to fight me for the left one."`,
        `Teasing: "Only if you tell me the Lion's secret handshake afterwards."`,
        `Flustered: "I... yes. Yes, please. Stand up, you'll ruin your knees!"`,
      ]);
      if (p1 === 0) {
        await talk(c, 'caspian', `Then I shall polish them until the mud forgets it ever touched them. I've had a great deal of practice.`, 'happy');
        await talk(c, 'caspian', `Mostly on armour, which is less forgiving.`, 'happy');
        await c.affection('caspian', 4, 'Accepted the boots with grace');
      } else if (p1 === 1) {
        await talk(c, 'caspian', `A duel over boots. I would lose. I would also lose gladly. Very well, the left boot is yours to defend.`, 'smirk');
        await c.affection('caspian', 3, 'Brave');
      } else if (p1 === 2) {
        await talk(c, 'caspian', `A handshake? I hold hands like a sword: badly, and with suspicion. I'll practise on your boots, if that's allowed.`, 'worried');
        await c.affection('caspian', 2, 'Teasing');
      } else {
        await talk(c, 'caspian', `Ah. Thank you. Forgive me, I'll stand. My knees have complained since Gladius, and yours shouldn't suffer on my account.`, 'blush');
        await c.affection('caspian', 1, 'Flustered');
      }

      await nar(c, `He works in silence, careful as if the leather might bite. The mud lifts grain by grain, and the boot warms to honey-brown under the cloth.`);
      await talk(c, 'caspian', `Brasshaven leather is good. Gladius leather is cheaper. I resent both of them equally.`, 'smirk');
      await you(c, `You're a snob about leather.`, 'smirk');
      await talk(c, 'caspian', `I'm a snob about everything. I hide it under manners. It's the only way a former Knight-Lantern survives a dinner.`, 'normal');
      await nar(c, `His thumb drifts, without asking permission, to the bare patch on his pauldron where a sigil used to be.`);
      await nar(c, `The gold is scratched away in ragged lines.`);
      await talk(c, 'caspian', `Three nights with a nail. Steel doesn't surrender its marks willingly. Neither, it turns out, do I.`, 'sad');
      await nar(c, `He sets the polish down. His eyes fall on the canvas satchel at the end of the bench.`);
      await nar(c, `Its strap has been mended twice, and old books are peeking out, spines cracked.`);
      await talk(c, 'caspian', `Is this... a Lampwright treatise? Pre-Tithe. "On the Keeping of Wicks." The margins are full of notes in three different hands.`, 'surprised');
      await nar(c, `He turns the pages with two fingers, as if they might bruise. The boot is forgotten entirely.`);
      await talk(c, 'caspian', `In the Order's halls, books were drafts of heresy. We were given the Hymns and the Ledgers and told that was enough.`, 'sad');
      await talk(c, 'caspian', `But at night, when no one watched, I crept to the back shelves of the archive. Poetry. Recipes.`, 'blush');
      await talk(c, 'caspian', `A treatise on bees that made me cry for reasons I still can't explain.`, 'blush');
      await talk(c, 'caspian', `Listen to this line. "A wick is only a small promise that the dark will not have the last word."`, 'normal');

      const p2 = await pick(c, `He's reading aloud, quietly, hair falling into his eyes. What do you say?`, [
        `Earnest: "You read like someone who's finally found somewhere to belong."`,
        `Brave: "Read it to me. Every word. I'll sit right here and not get bored."`,
        `Teasing: "Careful. You'll make the book blush. It isn't used to such attention."`,
        `Flustered: "You have a lovely voice for reading. For reading. That's all I'm saying."`,
      ]);
      if (p2 === 0) {
        await talk(c, 'caspian', `Belong. That's a dangerous word for a man with a false name. Thank you. I'll keep it somewhere safe.`, 'blush');
        await c.affection('caspian', 4, 'Honest praise');
      } else if (p2 === 1) {
        await talk(c, 'caspian', `Every word. Very well. Sit closer, then. The bench is a poor chair for a reader.`, 'smirk');
        await c.affection('caspian', 3, 'Brave');
      } else if (p2 === 2) {
        await talk(c, 'caspian', `The book is not blushing. It is disgusted. This is a treatise on mould, and I am enjoying it far too much.`, 'smirk');
        await c.affection('caspian', 1, 'Teasing');
      } else {
        await talk(c, 'caspian', `Lovely? I... thank you. I'll pretend I didn't hear that, and I'll read even louder.`, 'blush');
        await c.affection('caspian', 2, 'Flustered');
      }

      await nar(c, `He reads on, and you let the morning light spill across the table. The mud is gone from your left boot.`);
      await nar(c, `The leather gleams like something that has been loved.`);
      await talk(c, 'caspian', `There. Your boots are presentable. You may now walk into any ball in Auren without shame.`, 'happy');
      await you(c, `I don't go to balls.`, 'smirk');
      await talk(c, 'caspian', `Then I shall polish them anyway. It's a principle. I have a great many principles and very few chances to use them.`, 'smirk');
      await talk(c, 'caspian', `Next time I'll bring you the Lion's favourite novel.`, 'happy');
      await you(c, `The Lion has a favourite novel?`, 'surprised');
      await talk(c, 'caspian', `The Lion has a secret. He cries at the end of everything. Please, never tell the arena.`, 'blush');
      c.sfx('heart');
    },
  });

  // ---------------------------------------------------------- caspian_b2
  register({
    id: 'caspian_b2', actor: 'caspian', minTier: 2, minChapter: 3, kind: 'bond', once: true,
    title: 'Tallowmere', bgm: 'sad',
    journal: `Caspian told you about Tallowmere, and the eighty-one lamps he put out for the Order.`,
    run: async (c) => {
      c.bgm('sad');
      await c.fade('in', 50);
      await nar(c, `The Marigold is moored above the Gladius sands. The arena's lamps burn far below, bright and busy.`);
      await nar(c, `On the upper rail, Caspian stands with a cup of cold tea he hasn't touched.`);
      await talk(c, 'caspian', `There is a thing I have never said aloud. I have tried. The words come out in the wrong order, and then I stop.`, 'worried');
      await you(c, `Then say it out of order. I'll put it back together.`, 'normal');
      await talk(c, 'caspian', `That is more or less how I lost it in the first place.`, 'sad');

      const p1 = await pick(c, `His hands shake the cup. How do you help him?`, [
        `Earnest: "Start with the place. Names are easier to hold than the rest of it."`,
        `Brave: "Say it badly. You don't have to be good at this. I'll wait."`,
        `Flustered: "I don't know what to say, but I'm not going anywhere."`,
        `Teasing: "Is it a dramatic story, or a boring one? Please say boring."`,
      ]);
      if (p1 === 0) {
        await talk(c, 'caspian', `Tallowmere. A lake village. Forty houses, and a lamp at every door. We were proud of those lamps.`, 'sad');
        await talk(c, 'caspian', `They were the first thing I saw each morning.`, 'sad');
        await c.affection('caspian', 5, 'Helped him find the first word');
      } else if (p1 === 1) {
        await talk(c, 'caspian', `Badly. Yes. I have sung for thousands at the arena and never once felt my throat close. This is worse.`, 'sad');
        await c.affection('caspian', 3, 'Brave');
      } else if (p1 === 2) {
        await talk(c, 'caspian', `Not going anywhere. Thank you. That is a very kind thing to say to a man who has done unkind things.`, 'blush');
        await c.affection('caspian', 2, 'Flustered');
      } else {
        await talk(c, 'caspian', `Boring. I wish. I would have liked a story I could laugh about with the others.`, 'sad');
        await nar(c, `He drinks the cold tea without tasting it, and says nothing for a long moment.`);
        await c.affection('caspian', -2, 'Mocked a sad story');
      }

      await talk(c, 'caspian', `I was a Knight-Lantern, then. White and gold, the Order's sigil over my heart.`, 'normal');
      await talk(c, 'caspian', `I was sent to Tallowmere to "secure the Tithe." The orders were sealed.`, 'normal');
      await talk(c, 'caspian', `I thought it was a cleaning. The Order is always cleaning something. Lamps that flicker. Wicks that run low.`, 'worried');
      await nar(c, `He sets the cup down with a click, very carefully, as if it might shatter.`);
      await talk(c, 'caspian', `The lamps in Tallowmere all ran from one pump by the lake. The Order's engineers had fitted a key to it.`, 'sad');
      await talk(c, 'caspian', `My orders were to turn the key until the warmth stopped running. "For the star."`, 'sad');
      await talk(c, 'caspian', `So I turned it. Eighty-one wicks, one by one, down the lakeshore. I counted them, because I count things when I am frightened. Eighty-one.`, 'sad');
      await nar(c, `You don't speak. You wait, the way you'd wait for a lamp to catch.`);
      await talk(c, 'caspian', `By morning the village was silent. Not peaceful. Silent like an empty church, with a bell still ringing somewhere inside your head.`, 'sad');
      await talk(c, 'caspian', `The old Lamplighter's ladder was still leaning against his door. Some of them walked into the wood and did not come back.`, 'sad');
      await talk(c, 'caspian', `Some sat on their steps and looked at the dark lamps, and didn't ask why.`, 'sad');

      const p2 = await pick(c, `He's looking at his hands as though they are still cold. What do you say?`, [
        `Earnest: "Forgiveness isn't mine to give. But I'm listening, all the way to the end."`,
        `Brave: "You ran, then you came back to fight for them. Tell me what that cost you."`,
        `Flustered: "I'm glad you told me. I really, truly am. Even though it hurts to hear."`,
        `Teasing: "Eighty-one? You counted? Of course you counted. You count my teacups too."`,
      ]);
      if (p2 === 0) {
        await talk(c, 'caspian', `All the way to the end. That is a kind promise to a man with very little left to give in return. I'll try to deserve it.`, 'blush');
        await c.affection('caspian', 4, 'Listened to the end');
      } else if (p2 === 1) {
        await talk(c, 'caspian', `The cost is the arena. The sand, the coin, the fights. Every fight I win is a clumsy way of saying "I'm sorry" to people who can't hear it.`, 'sad');
        await c.affection('caspian', 3, 'Asked what it cost');
      } else if (p2 === 2) {
        await talk(c, 'caspian', `Glad. That is a word I did not expect to hear tonight. I'm not certain what to do with it, so I shall hold it carefully.`, 'blush');
        await c.affection('caspian', 2, 'Flustered');
      } else {
        await talk(c, 'caspian', `You're right. I do count teacups. I always count them. I'm sorry. That was a cheap shot, and I deserved it.`, 'worried');
        await c.affection('caspian', -1, 'Teasing');
      }

      await talk(c, 'caspian', `After the lamps, I left the Order. I walked to Gladius with my sigil scratched out, under a false name.`, 'normal');
      await talk(c, 'caspian', `The crowd calls me the Grey Lion, and they pay to watch me hurt people in the right way.`, 'normal');
      await talk(c, 'caspian', `I have been trying to earn back eighty-one wicks since. Every fight. Every gladiator I spare. It doesn't add up. I know it doesn't.`, 'sad');
      await you(c, `You didn't keep them dark. You stopped the next morning, and you came back.`, 'normal');
      await talk(c, 'caspian', `I came back? I ran.`, 'worried');
      await you(c, `You ran, and then you stopped running. That's not the same thing.`, 'happy');
      await nar(c, `He breathes out, long and unsteady. For the first time since you sat down, his shoulders drop.`);
      await talk(c, 'caspian', `Tomorrow I'm going to say their names. All eighty-one. It's the only penance I can think of that doesn't involve a sword. Would you...`, 'worried');
      await talk(c, 'caspian', `listen?`, 'worried');
      await you(c, `Every one of them.`, 'happy');
      await talk(c, 'caspian', `Thank you. Your voice is steadier than my memory. That is not nothing, you know. It's a great deal.`, 'blush');
    },
  });

  // ---------------------------------------------------------- caspian_b3
  register({
    id: 'caspian_b3', actor: 'caspian', minTier: 3, minChapter: 4, kind: 'bond', once: true,
    title: 'An Oath of His Own', bgm: 'tense',
    journal: `Caspian laid his scratched sigil at your feet and swore an oath he chose himself, to you.`,
    run: async (c) => {
      c.bgm('tense');
      await c.fade('in', 40);
      await nar(c, `A campfire on the Ashen Road. The hills are grey and bare, and the sky has that lamplight-dusk colour that never quite goes dark.`);
      await nar(c, `Caspian comes back from scouting, dust to the knees.`);
      await talk(c, 'caspian', `The road ahead is empty. Too empty. The Order's hounds are waiting somewhere in the grey, and I would rather they weren't.`, 'worried');
      await nar(c, `He doesn't sit. He unbuckles the dented breastplate from his shoulders and holds it in both hands, as if it's still warm from his body.`);
      await nar(c, `Somewhere beyond the hills a bell tolls twice, then falls silent. He counts it without meaning to.`);
      await talk(c, 'caspian', `Two bells. Three nights ago it was one. The Order is moving faster than I would like.`, 'worried');
      await you(c, `Are you frightened?`, 'worried');
      await talk(c, 'caspian', `Yes. Terribly. It's the first honest thing I've said all week.`, 'sad');
      await nar(c, `The fire pops. A spark rises and dies in the dark above you both.`);
      await talk(c, 'caspian', `I have carried this two years. The Order's sigil, scratched out. Three nights with a nail, and I never did get all of it.`, 'sad');
      await nar(c, `Then, to your astonishment, he crosses the firelight and kneels on the stone at your feet, the plate laid across his open palms.`);
      await talk(c, 'caspian', `I swore to the Hearth Order on my knees, once. I would like to swear again. Not to an order. To a person. Will you let me?`, 'worried');

      const p1 = await pick(c, `He kneels in the dust, the plate across his palms. What do you say?`, [
        `Earnest: "Then stand up, Caspian. Take a place beside me, not below me. I'd rather have a shield than a servant."`,
        `Brave: "Then I'll swear something back. Stand with me, and don't you dare do this alone."`,
        `Teasing: "Knees on gravel? You're going to make my knees jealous."`,
        `Flustered: "Oh gods, get up. You're embarrassing us both. And I'm... yes. Yes. I'm so happy."`,
      ]);
      if (p1 === 0) {
        await talk(c, 'caspian', `Beside you. I've spent my life beneath a great many banners. It is strange to be asked for a place at the fire instead.`, 'happy');
        await c.affection('caspian', 5, 'A place beside, not below');
      } else if (p1 === 1) {
        await talk(c, 'caspian', `Stand with you. Yes. I'll try. You'll have to tell me when I'm standing wrong. I'm told I am dreadful at posture.`, 'smirk');
        await c.affection('caspian', 4, 'Brave');
      } else if (p1 === 2) {
        await talk(c, 'caspian', `Gravel is a poor cushion, and you're not wrong. My knees are cursing me from here. I'll rise.`, 'worried');
        await c.affection('caspian', -1, 'Teasing');
      } else {
        await talk(c, 'caspian', `Then I'll rise, and you won't be embarrassed. You'll be very red, I think. Yes. That's rather lovely.`, 'blush');
        await c.affection('caspian', 3, 'Flustered');
      }

      await nar(c, `He stands slowly and holds the plate out between you.`);
      await nar(c, `Among the scratches, one small piece of gold survives untouched: a little star, the only part of the sigil his nail couldn't reach.`);
      await talk(c, 'caspian', `I couldn't scratch out the star. I tried. It's the part of me that still wants the light. I have decided not to be ashamed of it.`, 'sad');
      await talk(c, 'caspian', `So I'm putting the oath under your name. Not the Order's. Caspian Thorne's. The name I haven't said aloud in a year.`, 'happy');
      await you(c, `Say it again.`, 'blush');
      await talk(c, 'caspian', `Caspian Thorne. It sounds more like a stranger than I expected. I think I like him.`, 'blush');

      const p2 = await pick(c, `He's waiting for your answer. What do you promise him back?`, [
        `Earnest: "I'll tell you when you're wrong, and I won't leave you to be wrong alone."`,
        `Brave: "I'll be your sword, and you'll be my shield. Neither of us gets to be alone."`,
        `Teasing: "I promise to make your boots dirty every single day."`,
        `Flustered: "I promise to hold your hand when the dark gets loud. You're allowed to hold mine back."`,
      ]);
      if (p2 === 0) {
        await talk(c, 'caspian', `Wrong. I'm wrong often, usually about my posture. I'd like you to tell me. Every time, please.`, 'happy');
        await c.affection('caspian', 5, 'A promise of honesty');
      } else if (p2 === 1) {
        await talk(c, 'caspian', `A sword and a shield. I'm a poor shield. I make far too many dramatic speeches before I block anything.`, 'smirk');
        await c.affection('caspian', 4, 'Brave');
      } else if (p2 === 2) {
        await talk(c, 'caspian', `Then I'll polish them every night. We shall fight the Hollow in spotless boots, and the Hollow will be deeply offended.`, 'smirk');
        await c.affection('caspian', 2, 'Teasing');
      } else {
        await talk(c, 'caspian', `Hold your hand. I'll try not to shake.`, 'blush');
        await nar(c, `His hand closes around yours, and it trembles very slightly.`);
        await talk(c, 'caspian', `I'm shaking.`, 'worried');
        await you(c, `I know. It's fine.`, 'happy');
        await talk(c, 'caspian', `Good. Then we're even, and nobody is the brave one.`, 'blush');
        await c.affection('caspian', 3, 'Flustered');
      }

      await nar(c, `The fire cracks. Somewhere far off on the grey road, something howls, then goes quiet. He doesn't flinch.`);
      await nar(c, `He only shifts closer, shoulder against yours.`);
      await talk(c, 'caspian', `I'm not good at formal oaths. I will almost certainly mispronounce something important.`, 'smirk');
      await you(c, `You'll mispronounce {name} every time.`, 'smirk');
      await talk(c, 'caspian', `Then I shall practise. {name}. There. Not so hard. I shall manage it in my sleep, if I'm allowed to sleep.`, 'blush');
      await nar(c, `He sets the plate on your knee, gently, the little star facing up. His palm settles over yours, warm from the fire, and stays there.`);
      await talk(c, 'caspian', `This is the first oath I have ever chosen for myself. Forgive the stumbling. I am very new at this.`, 'happy');
      c.sfx('heart');
      await c.emote('player', 'heart');
    },
  });

  // ---------------------------------------------------------- caspian_confession
  register({
    id: 'caspian_confession', actor: 'caspian', minTier: 3, minChapter: 4, kind: 'confession', once: true,
    title: 'Lantern Night', bgm: 'romance',
    journal: `On Lantern Night, Caspian spoke his heart plainly, and you became his Beloved.`,
    run: async (c) => {
      c.bgm('romance');
      await c.fade('in', 60);
      await nar(c, `Lantern Night in Lumen Vale. Caspian stands at the water's edge in a clean white shirt, no armour, no false name.`);
      await nar(c, `He holds one paper lantern as if it might bite him.`);
      await talk(c, 'caspian', `I was taught to speak in oaths. I've been unlearning them since Tallowmere. So I shall speak plainly. I find that terrifying.`, 'worried');
      await you(c, `Take your time.`, 'smirk');
      await talk(c, 'caspian', `I have watched you carry other people's wicks, and I've wanted to take a little of the weight.`, 'sad');
      await talk(c, 'caspian', `Then I wanted to stay near you while you carried it.`, 'sad');
      await talk(c, 'caspian', `Somewhere between the boots and the sigil and the sand, I began to want you. Not as a knight wants a banner. As a man wants a home.`, 'blush');
      await talk(c, 'caspian', `I love you. Not in the cautious way the Order taught me to love anything. In the way that makes me forget to be formal at all.`, 'happy');

      const p1 = await pick(c, `He's holding the lantern like a prayer. How do you answer?`, [
        `Earnest: "I love you too. I've been trying not to say it in case I scared you off."`,
        `Brave: "Then stop being formal and come here, Caspian. Right now."`,
        `Teasing: "Forget to be formal? I'd like to see that. Please. I'm begging."`,
        `Flustered: "I... yes. Yes, I love you. You're making it very hard to breathe."`,
      ]);
      if (p1 === 0) {
        await talk(c, 'caspian', `Scare me off? You couldn't frighten me with a pack of Hollow hounds and a sermon from the Abbess.`, 'blush');
        await c.affection('caspian', 2, 'Said it back');
      } else if (p1 === 1) {
        await talk(c, 'caspian', `Come here. Such a simple instruction. I'll obey it. I think I've wanted to for weeks.`, 'happy');
        await c.affection('caspian', 2, 'Brave');
      } else if (p1 === 2) {
        await talk(c, 'caspian', `Begging. I can't refuse begging. It's a weakness the Order spent years trying to beat out of me.`, 'smirk');
        await c.affection('caspian', 1, 'Teasing');
      } else {
        await talk(c, 'caspian', `Hard to breathe. Good. I'd hate for it to be easy. That would mean I was doing it wrong.`, 'blush');
        await c.affection('caspian', 1, 'Flustered');
      }

      await talk(c, 'caspian', `May I ask permission for something? It is a formality. You may refuse. I'll polish your boots for a week regardless.`, 'smirk');
      await you(c, `You have my permission.`, 'happy');
      await nar(c, `He sets the lantern on the water with both hands, very carefully. It drifts off toward the others. He doesn't watch it go.`);
      await nar(c, `He's watching you.`);
      await c.emote('player', 'heart');
      await talk(c, 'caspian', `Then, may I?`, 'blush');
      await you(c, `Yes.`, 'happy');
      c.sfx('heart');
      await nar(c, `He leans in slowly, the way he does everything he's afraid to break. You close the last of the distance.`);
      await nar(c, `The lanterns on the lake blur into gold.`);
      await c.fade('out', 50);
      await c.wait(40);
      await c.fade('in', 50);
      await talk(c, 'caspian', `I'm told the proper response is a bow. I'm not going to bow. I'm going to hold on.`, 'blush');
      await you(c, `Then hold on.`, 'happy');
      await nar(c, `A thousand paper lanterns climb into the dark, each carrying a wish. For once, the Grey Lion doesn't count them.`);
      G.romance.setLover('caspian');
      await c.affection('caspian', 10, 'Lantern Night confession');
    },
  });

  // ---------------------------------------------------------- caspian_eve
  register({
    id: 'caspian_eve', actor: 'caspian', minTier: 0, minChapter: 5, kind: 'eve', once: true,
    title: 'The Foot of the Stair', bgm: 'tender',
    journal: `On the eve of the Spire, Caspian swore to hold the stair, and asked you to come back down it.`,
    run: async (c) => {
      const beloved = !!(G.romance && G.romance.lover && G.romance.lover() === 'caspian');
      c.bgm('tender');
      await c.fade('in', 50);
      await nar(c, `The Hearth Spire rises black against the stars.`);
      await nar(c, `At the foot of the Ashen Road, Caspian sits at a watch-brazier, polishing the scrap of gold on his old plate.`);
      if (beloved) {
        await talk(c, 'caspian', `You've been pacing for an hour. I can hear every step. It is the most attentive I have been to anything in years.`, 'smirk');
        await you(c, `I can't sleep. Don't tell me I should.`, 'worried');
        await talk(c, 'caspian', `I wouldn't dare. You'll do what you must, which is to climb. And I will hold the stair.`, 'normal');
        await talk(c, 'caspian', `Tomorrow I stand at the bottom. Every Hollow that comes down, I shall put my body between them and you. That is the arrangement.`, 'normal');
        await you(c, `Caspian, I don't want you hurt.`, 'worried');
        await talk(c, 'caspian', `I am frightfully practised at being hurt. You are the one thing I would like to keep unharmed. Let me have that.`, 'sad');
        await talk(c, 'caspian', `Promise me something. You'll come back down those stairs.`, 'blush');
        await talk(c, 'caspian', `And in the morning you'll let me polish your boots again, with terrible commentary.`, 'blush');
        await you(c, `I promise.`, 'happy');
        await talk(c, 'caspian', `Good. I'll hold you to it. I am a very strict holder.`, 'smirk');
        await nar(c, `He stands, the plate under one arm, and crosses to you. For a moment he seems about to bow.`);
        await nar(c, `He thinks better of it and rests his forehead against yours.`);
        await talk(c, 'caspian', `Whatever is up there, you are not climbing it alone. You never were. I was simply slow to notice.`, 'blush');
        await you(c, `You noticed.`, 'happy');
        await talk(c, 'caspian', `I noticed when you sat beside me on the Marigold's rail and didn't ask me to explain. I've been noticing ever since.`, 'sad');
        await c.emote('player', 'heart');
        c.sfx('heart');
        await talk(c, 'caspian', `Sleep, {name}. I shall keep the watch. It is the one thing I have ever done properly.`, 'happy');
      } else {
        await talk(c, 'caspian', `I cannot sleep either. It seems the whole party has the same disease tonight.`, 'worried');
        await you(c, `Is it contagious?`, 'smirk');
        await talk(c, 'caspian', `Only to people with brains. I'm told that describes a fair portion of the party.`, 'smirk');
        await talk(c, 'caspian', `Tomorrow is the stair. I will hold the bottom. You'll be the one who climbs. That is the arrangement, and I won't argue it.`, 'normal');
        await you(c, `I'd like you with me, Caspian.`, 'happy');
        await talk(c, 'caspian', `You shall have me. At the bottom, shouting useful things and rather unhelpful encouragement.`, 'blush');
        await talk(c, 'caspian', `I have made a list of what I shall do at the bottom of the stair. It is short. It contains the word "shout" twice.`, 'smirk');
        await you(c, `Just shout?`, 'smirk');
        await talk(c, 'caspian', `Shout, and stand very straight. I am told posture intimidates the Hollow. Nobody has ever complained.`, 'blush');
        await talk(c, 'caspian', `You have been a better friend to me than I deserve. I am trying to be the friend you deserve, which is harder, and far less dramatic.`, 'sad');
        await talk(c, 'caspian', `Whatever's up there, go up. I'll be here when you come down. That is a promise. Most of mine are bad, so I'm trying hard with this one.`, 'happy');
        await nar(c, `He smiles, a little crooked, and lifts the rag in a small salute.`);
        await talk(c, 'caspian', `Go to sleep, {name}. That's an order. I'm allowed to give those now. I'm very out of practice.`, 'smirk');
      }
    },
  });

  // ---------------------------------------------------------- caspian_epilogue
  register({
    id: 'caspian_epilogue', actor: 'caspian', minTier: 4, minChapter: 5, kind: 'epilogue', once: true,
    title: 'Eighty-One Lanterns', bgm: 'ending_love',
    journal: `After the Twin Flame, you and Caspian lit the lanterns of Tallowmere together, one by one.`,
    run: async (c) => {
      c.bgm('ending_love');
      await c.fade('in', 90);
      await nar(c, `A year after the Spire, Tallowmere's lake is full of small paper lanterns again. Nobody in the village remembers how long it took.`);
      await nar(c, `Everybody remembers the first night.`);
      await nar(c, `None of them were lit by the Order. Each one was lit by a hand that chose to light it.`);
      await nar(c, `Eighty-one lanterns float a little apart from the rest, as if keeping a respectful distance.`);
      await nar(c, `At the water's edge, Caspian reads from a small book. His voice is steady now.`);
      await nar(c, `A child on the bank repeats each name after him, very solemnly, the way children repeat prayers.`);
      await talk(c, 'caspian', `Forty-first name: Ruth Oakley. Forty-second: Dunstan, who mended the lamps and sang while he did it, badly.`, 'sad');
      await nar(c, `The child nods. Caspian turns the page. His eyes are wet, and he doesn't hide it.`);
      await talk(c, 'caspian', `Seventy-ninth: the baker, Hesper. Eightieth: a small boy called Tam, who never once gave up his bread without a fight.`, 'sad');
      await nar(c, `You come down the shingle and stand beside him. He doesn't look up from the page. He doesn't have to.`);
      await you(c, `You're reading them all.`, 'smirk');
      await talk(c, 'caspian', `All eighty-one. It took me most of a year. It's the only penance I've found that doesn't involve a sword.`, 'normal');
      await talk(c, 'caspian', `The Hearthstar burns on two hearts now. Nobody in Tallowmere had to be drained to keep it lit.`, 'smirk');
      await talk(c, 'caspian', `Some of them even say the old lamps were pretty. I still don't agree.`, 'smirk');
      await nar(c, `He closes the book. Pinned to his collar is a small gold star, the one piece of the old sigil he would not scratch away.`);
      await nar(c, `It catches the lantern light.`);
      await talk(c, 'caspian', `The Lion retired. I'm told the crowds in Gladius have started betting on where he went. I'd like them to be wrong, and a little poorer.`, 'happy');
      await you(c, `What do they think he's doing now?`, 'smirk');
      await talk(c, 'caspian', `Reading. Badly. Aloud. To children, mostly, who are much less polite about it than the arena.`, 'blush');
      await nar(c, `Behind the lakeside hall, a shelf of forty-two books stands in the window. The oldest one came from the Order's archive.`);
      await nar(c, `He stole it, and the Order never noticed.`);
      await talk(c, 'caspian', `The Order never notices anything I take with good intentions. It's the one thing they taught me that I still find useful.`, 'smirk');
      await nar(c, `The child tugs at his sleeve and asks, very seriously, what the star is for.`);
      await talk(c, 'caspian', `It's a promise, little one. We keep it lit by lighting each other. That is much harder than it sounds, and much better.`, 'happy');
      await nar(c, `The child considers this, then runs off to tell the other children. Caspian watches her go with a look you have not seen him wear before.`);
      await nar(c, `It's something close to peace.`);
      await you(c, `You've been practising that one, haven't you?`, 'smirk');
      await talk(c, 'caspian', `For a year. I was determined to say it correctly.`, 'blush');
      await nar(c, `Dusk settles over the lake.`);
      await nar(c, `One by one, the villagers come down to the shore with their lamps, and light them with their own hands, not with the Order's key.`);
      await nar(c, `Caspian takes a taper from the rail and lights the eighty-first lantern himself. He holds it a moment before he lets it go.`);
      await talk(c, 'caspian', `Eighty-one, and one more. This is for the one I'm not afraid to name, and I don't intend to stop saying it.`, 'blush');
      await you(c, `Say it, then.`, 'happy');
      await talk(c, 'caspian', `{name}. There. Not so difficult at all. I shall be insufferable about it for the rest of my life.`, 'happy');
      await nar(c, `The lake holds all of them, bright and small and close together. Nobody on the shore has to burn dimmer so that someone else can shine.`);
      c.sfx('heart');
    },
  });

  // ==================================================================
  //  ROOK CALLOWAY  — flirtatious rogue, armour made of charm
  // ==================================================================

  // ---------------------------------------------------------- rook_b1
  register({
    id: 'rook_b1', actor: 'rook', minTier: 1, minChapter: 2, kind: 'bond', once: true,
    title: 'Sleight of Hand', bgm: 'comic',
    journal: `Rook made your coin vanish and reappear on the deck, and let you catch it when it fell.`,
    run: async (c) => {
      c.bgm('comic');
      await c.fade('in', 40);
      await nar(c, `Sun over the Marigold's deck.`);
      await nar(c, `Rook Calloway sits on a coil of rope, green coat unbuttoned, flipping a battered gold coin over his knuckles like it's trying to escape.`);
      await talk(c, 'rook', `Ah, {name}. Are you here to watch a master at work, or to become one?`, 'smirk');
      await you(c, `Is that a line?`, 'smirk');
      await talk(c, 'rook', `It's a coin. The line is free. Everything else costs extra.`, 'smirk');
      await nar(c, `The coin vanishes. He leans in, plucks it from behind your ear, and sets it on your palm. It's warm from his fingers.`);
      await talk(c, 'rook', `There. Lucky. Like you.`, 'happy');
      await you(c, `That's the oldest trick on this whole ship.`, 'smirk');
      await talk(c, 'rook', `It's the oldest trick in Gladius. That's why it still works on people who should know better.`, 'smirk');
      await you(c, `Show me that again. Slowly.`, 'smirk');
      await talk(c, 'rook', `Slowly is how I lose my audience. Fast is where the money is.`, 'smirk');
      await nar(c, `He leans back, and his sleeve shifts. A glint of gold, folded into the cuff, that wasn't there a moment ago.`);

      const p1 = await pick(c, `You can see the second coin tucked in his sleeve. What do you say?`, [
        `Earnest: "I saw the sleeve trick. But I'd rather see how you really do it, Rook."`,
        `Brave: "Keep the coin. Make it vanish again. I'll find it in my pocket later."`,
        `Teasing: "Nice sleeve. Shame about the glint. Lost your touch, have you?"`,
        `Flustered: "You're distracting me, so I'll lose track of everything you say. On purpose."`,
      ]);
      if (p1 === 0) {
        await talk(c, 'rook', `...You noticed.`, 'surprised');
        await talk(c, 'rook', `Nobody notices the sleeve. They notice the coin. They always notice the coin, darling, and never what it's doing for them.`, 'normal');
        await talk(c, 'rook', `My mother taught me on the church steps in Pennyfold, when she needed us to eat. I'd show you properly, but it takes two honest hands.`, 'sad');
        await talk(c, 'rook', `I'm short on both.`, 'sad');
        await you(c, `You have two hands.`, 'happy');
        await talk(c, 'rook', `Don't say that. I'll have to be honest, and I'm far worse at that than the trick.`, 'blush');
        await c.affection('rook', 4, 'Noticed the sleeve, and asked how he does it');
      } else if (p1 === 1) {
        await talk(c, 'rook', `Pocket? Brave. Dangerous. Sure.`, 'smirk');
        await nar(c, `He flicks a copper bit into your coat pocket with a wink.`);
        await talk(c, 'rook', `Not the lucky one. That one stays with me. Mostly.`, 'smirk');
        await c.affection('rook', 3, 'Brave');
      } else if (p1 === 2) {
        await talk(c, 'rook', `Glint? That's the glint of a professional. Did you just call me unprofessional?`, 'smirk');
        await you(c, `I called your timing unprofessional.`, 'smirk');
        await talk(c, 'rook', `Harsh. Fine. I'll be merciful, and I'll keep the second coin where it's warm.`, 'smirk');
        await c.affection('rook', 2, 'Teasing');
      } else {
        await talk(c, 'rook', `Distracting? Good. Mission accomplished. Now you'll have to remember the rest of my charms, which is going to be very difficult for you.`, 'happy');
        await c.affection('rook', 1, 'Flustered');
      }

      await you(c, `What's the story on the lucky one, then?`, 'smirk');
      await talk(c, 'rook', `Won fair in a card game off a fishmonger in Pennyfold. He swore it was lucky. He was a liar. I'm fond of him for it.`, 'normal');
      await nar(c, `A shadow crosses his face for a heartbeat. Then he's grinning again, bright as the sun on the rails.`);
      await nar(c, `He flips the coin high and catches it without looking.`);
      await talk(c, 'rook', `Don't ask about Pennyfold. It's the only story I tell badly.`, 'sad');
      await nar(c, `Gulls argue over a fish bone at the rail. He watches them with a grin that's almost real.`);
      await you(c, `You're in a good mood, for a man who just told a sad story.`, 'smirk');
      await talk(c, 'rook', `I'm always in a good mood. It's the mood I'm best at. Don't tell the Order.`, 'smirk');

      const p2 = await pick(c, `He lands the coin on the back of his hand. "So. Dinner? Or do I have to flip for it?"`, [
        `Earnest: "Yes. With you. You don't have to flip for it."`,
        `Brave: "Flip for it. If you win, you pick. If I win, you cook."`,
        `Teasing: "Your luck's been terrible lately. I'll risk it on your cooking."`,
        `Flustered: "Yes, obviously, dinner. Why are you so smooth about this?"`,
      ]);
      if (p2 === 0) {
        await talk(c, 'rook', `You don't have to flip for it. That's a dangerous sentence. Nobody has ever wanted me that easily. I'll have to get used to it.`, 'blush');
        await c.affection('rook', 4, 'Said yes, plainly');
      } else if (p2 === 1) {
        await talk(c, 'rook', `Oh, I like a gamble with stakes. Heads I cook. Tails you do the washing up. Done.`, 'smirk');
        await nar(c, `He flips it. Catches it. Covers it on his wrist. "Heads. The coin's rigged, by the way. I'm the only one who knows which side."`);
        await c.affection('rook', 3, 'Brave');
      } else if (p2 === 2) {
        await talk(c, 'rook', `Terrible luck? I'm offended. Fine. I'll take the risk, because I'm charming, and that's my armour.`, 'smirk');
        await c.affection('rook', 2, 'Teasing');
      } else {
        await talk(c, 'rook', `Smooth? That's the armour, darling. Underneath it I'm in very deep water.`, 'blush');
        await c.affection('rook', 1, 'Flustered');
      }

      await nar(c, `He tosses the coin high into a shaft of sunlight. For once, it doesn't come back to his hand.`);
      await nar(c, `It lands in yours, and he doesn't reach for it.`);
      await nar(c, `Behind you, the Marigold's bell rings for noon. He doesn't notice. He's watching you.`);
      await talk(c, 'rook', `Keep it till supper. Give it back over the stew, or I'll be forced to come looking for you. I'm dreadful at looking for things.`, 'smirk');
      await you(c, `And if I don't give it back?`, 'smirk');
      await talk(c, 'rook', `Then I'll be forced to stay put, which would be very inconvenient for my reputation. Let's see who ends up following whom.`, 'happy');
      c.sfx('coin');
    },
  });

  // ---------------------------------------------------------- rook_b2
  register({
    id: 'rook_b2', actor: 'rook', minTier: 2, minChapter: 3, kind: 'bond', once: true,
    title: "Crow's Nest", bgm: 'sad',
    journal: `Rook told you about Pennyfold, his little sister Mira, and the hand he let go of.`,
    run: async (c) => {
      c.bgm('sad');
      await c.fade('in', 50);
      await nar(c, `Night on the Marigold.`);
      await nar(c, `You climb to the crow's nest with two cups of cocoa. Rook is already up there, legs dangling, a lantern hung on a hook beside him.`);
      await talk(c, 'rook', `Couldn't sleep, couldn't drink, couldn't flirt. The stars are the only thing left to entertain me, and they're terrible company.`, 'worried');
      await you(c, `Mind if I stay?`, 'smirk');
      await talk(c, 'rook', `Stay. Please. Don't make me say please twice. I'm bad at it, and I'd only get it wrong.`, 'sad');
      await nar(c, `He counts the stars under his breath, one finger raised, lips moving. Then he stops, as if he's lost count on purpose.`);
      await talk(c, 'rook', `Stars go out in order, did you know that? The old ones first. If you're patient, you can watch the new ones give up.`, 'normal');
      await you(c, `What's out there, Rook?`, 'normal');
      await talk(c, 'rook', `My village. Beyond that horizon, somewhere. Pennyfold. You can't see it from here. Most days I can barely think of it.`, 'sad');
      await talk(c, 'rook', `I was twelve. It was the midsummer lantern fair, the one where every window in town gets a candle. Everyone was happy.`, 'sad');
      await talk(c, 'rook', `You can't imagine how happy.`, 'sad');
      await talk(c, 'rook', `Then the Hollow came up out of the wheat fields. Not monsters. Not really. Just quiet. Shadows walking the wrong way, away from the lamps.`, 'worried');
      await talk(c, 'rook', `People went out to meet them. They didn't fight.`, 'sad');
      await talk(c, 'rook', `They sat down in the road and looked up at the sky, and their wicks guttered one by one, like candles being blown out very politely.`, 'sad');
      await talk(c, 'rook', `My sister was with me. Mira. She was nine, and she bit anyone who tried to fix her hair.`, 'sad');
      await talk(c, 'rook', `She had hold of my hand the whole way down the lane.`, 'sad');
      await talk(c, 'rook', `The road out of town was still open. Mum shouted, "Run, Rook!" So I ran.`, 'worried');

      const p1 = await pick(c, `His voice holds steady. His hands are not. What do you say?`, [
        `Earnest: "You were a kid. Running wasn't the crime. Staying awake with it every night is what you've been doing."`,
        `Brave: "Tell me about Mira. Say her name out loud, so someone else carries it too."`,
        `Teasing: "So you're a coward with excellent taste in coats?"`,
        `Flustered: "I don't know what to say. But you're not a coward. I won't let you think that."`,
      ]);
      if (p1 === 0) {
        await talk(c, 'rook', `That's the kindest thing anyone has said about it. Most people say "you were brave" or "it wasn't your fault," and neither of them fits.`, 'sad');
        await c.affection('rook', 4, 'Kindness, not absolution');
      } else if (p1 === 1) {
        await talk(c, 'rook', `Mira. She bit a boy in her first week of school for calling me Rookie.`, 'happy');
        await talk(c, 'rook', `She had feathers in her hair from the chickens and the most terrible opinions.`, 'happy');
        await talk(c, 'rook', `I never forgave that boy. I'm still not sure he's forgiven her.`, 'blush');
        await c.affection('rook', 4, 'Asked for her name');
      } else if (p1 === 2) {
        await talk(c, 'rook', `Ouch. Fair. The coat's excellent, though. The coward wears it very poorly.`, 'sad');
        await c.affection('rook', -2, 'Cruel timing');
      } else {
        await talk(c, 'rook', `Careful. Kind words make a man forget he's supposed to be charming. It's terribly inconvenient.`, 'blush');
        await c.affection('rook', 2, 'Flustered');
      }

      await nar(c, `He leans back against the mast and lets his head rest on the wood. The lantern throws his shadow long across the planks.`);
      await talk(c, 'rook', `The only thing I'm truly good at is leaving before the end. People stay. I run.`, 'sad');
      await talk(c, 'rook', `I've been taught by experience, and I'm rather a good student.`, 'sad');
      await talk(c, 'rook', `I have told you more tonight than I told the cook in a whole year, and she's had my ember wine for three.`, 'smirk');

      const p2 = await pick(c, `He hooks two fingers into your sleeve. "Stay up with me. Don't leave until the stars go out. Please."`, [
        `Earnest: "I'm not going anywhere. Not tonight, not on the ship, not on the road."`,
        `Brave: "Then I'll stay until the sun comes up. And tomorrow too."`,
        `Teasing: "Only if you buy me breakfast. Ember wine doesn't count as breakfast."`,
        `Flustered: "I'll stay. You're very hard to leave, you know. I wouldn't know how."`,
      ]);
      if (p2 === 0) {
        await talk(c, 'rook', `Not going anywhere. Do you know what that does to a man who runs for a living? It makes him sit very still and pretend he's fine.`, 'blush');
        await c.affection('rook', 5, 'Promised to stay');
      } else if (p2 === 1) {
        await talk(c, 'rook', `And tomorrow too. Gods, you're going to ruin me. I'll have to start wanting things, and I'm not prepared.`, 'blush');
        await c.affection('rook', 4, 'Brave');
      } else if (p2 === 2) {
        await talk(c, 'rook', `Breakfast. Fine. You drive a hard bargain. And ember wine is a food group, so you're wrong, but I forgive you.`, 'smirk');
        await c.affection('rook', 2, 'Teasing');
      } else {
        await talk(c, 'rook', `Hard to leave. I'll take that as a compliment and file it under things I'll never admit to saying again.`, 'happy');
        await c.affection('rook', 3, 'Flustered');
      }

      await nar(c, `The stars wink out one at a time, the old ones first. Rook counts them aloud now, slow, then slower.`);
      await nar(c, `Somewhere around the twentieth, his head drops onto your shoulder.`);
      await talk(c, 'rook', `Don't move. You're the warmest thing up here.`, 'sad');
      await nar(c, `The sky greys at the edges. A bird calls from the rigging.`);
      await nar(c, `He sleeps at last, the lucky coin loose in his fingers, and you don't move until the sun is up.`);
      await you(c, `Goodnight, Rook.`, 'happy');
    },
  });

  // ---------------------------------------------------------- rook_b3
  register({
    id: 'rook_b3', actor: 'rook', minTier: 3, minChapter: 4, kind: 'bond', once: true,
    title: "Don't Make Me Regret It", bgm: 'tense',
    journal: `Rook tried to slip away in the night for your safety, then stayed, and gave you the lucky coin.`,
    run: async (c) => {
      c.bgm('tense');
      await c.fade('in', 40);
      await nar(c, `Past midnight in the Marigold's galley. The lamp is turned low.`);
      await nar(c, `On the bench, a green coat has been folded square, the way no one who loves their coat would ever fold it.`);
      await nar(c, `A pack sits by the hatch. Beside it, a man stands with one strap over his shoulder, very still, as if he might still change his mind.`);
      await nar(c, `A note lies on the table, weighted with a battered gold coin. The writing is quick and sloppy. Four lines. The last one is underlined twice.`);
      await talk(c, 'rook', `Oh. You're up. Perfect timing. I was about to be heroic, and it's a dreadful look on me.`, 'surprised');
      await you(c, `Where are you going, Rook?`, 'worried');
      await talk(c, 'rook', `Out. Away. Somewhere the Order's hounds aren't. For your safety, obviously, which I'm very proud of.`, 'smirk');
      await nar(c, `The hatch creaks, and cold night air slides in around your ankles. He doesn't close it.`);
      await talk(c, 'rook', `Shut the hatch, would you? The cold gets ideas.`, 'smirk');
      await nar(c, `Your eyes catch on the note. "Don't come after me. I'm the thing they're hunting. Better I'm gone before I'm the reason you break."`);

      const p1 = await pick(c, `He has the pack on one shoulder and the hatch at his back. Your move?`, [
        `Earnest: "Then tell me the truth, Rook. Where are you really going, and why?"`,
        `Teasing: "Heroic? You can't even leave without forgetting your coat, Rook."`,
        `Brave: "Put the pack down. You're not leaving like this, not without saying goodbye to my face."`,
        `Flustered: "Please don't. Gods, that's embarrassing. I'd miss you so much."`,
      ]);
      if (p1 === 0) {
        await talk(c, 'rook', `The Order's hunting the Kindler. And I'm the one standing closest to you. If I stay, they'll find you by my shadow.`, 'sad');
        await talk(c, 'rook', `I'd rather be lost than be the reason you're taken.`, 'sad');
        await c.affection('rook', 4, 'Asked for the truth');
      } else if (p1 === 1) {
        await talk(c, 'rook', `Look at you, being right. Terrible. My pride is in shreds, and so is the coat.`, 'smirk');
        await nar(c, `He almost laughs. It comes out as a breath, and he rubs his face with the back of his wrist.`);
        await c.affection('rook', -1, 'Teasing at the wrong moment');
      } else if (p1 === 2) {
        await talk(c, 'rook', `Alone? I've been alone my whole life, darling. It's the only thing I'm really good at.`, 'sad');
        await talk(c, 'rook', `You're the first person who's ever said "don't go" and meant "please." Nobody did before. Not once.`, 'blush');
        await c.affection('rook', 4, 'Brave');
      } else {
        await talk(c, 'rook', `Don't... don't make it sound like that. I'll never make it to the door.`, 'blush');
        await c.affection('rook', 2, 'Flustered');
      }

      await nar(c, `He slides the pack off his shoulder. It thumps to the floor like an accusation.`);
      await talk(c, 'rook', `I'll go. I'll send letters. You'll forget me by the Spire, and that'll be right, and I'll be fine.`, 'normal');
      await you(c, `You're lying.`, 'worried');
      await talk(c, 'rook', `I'm an excellent liar. Ask anyone in Gladius. They pay good coin to watch.`, 'smirk');
      await you(c, `I'm asking you. Please.`, 'worried');

      const p2 = await pick(c, `He's halfway to the hatch again, shoulders stiff. Your last move?`, [
        `Earnest: "Stay because you want to, Rook. Not because you're afraid of what happens if you go."`,
        `Brave: "Then I'll stand in this doorway until you sit down. Don't make me do it twice."`,
        `Teasing: "You can't leave. You owe me a dinner, and I'm collecting, with interest."`,
        `Flustered: "I want you to stay. I'm not ashamed to say it. I want you here."`,
      ]);
      if (p2 === 0) {
        await talk(c, 'rook', `Want to. I've wanted to since the crow's nest. The "afraid" bit is the part I can't seem to stop.`, 'sad');
        await c.affection('rook', 5, 'Asked him to want to stay');
      } else if (p2 === 1) {
        await talk(c, 'rook', `You'd stand there all night. I know you would. That's exactly the problem.`, 'worried');
        await nar(c, `He sits down on the bench with a thump, very deliberately, as if daring you to argue.`);
        await talk(c, 'rook', `There. I sat. Happy?`, 'smirk');
        await c.affection('rook', 4, 'Stood in the doorway');
      } else if (p2 === 2) {
        await talk(c, 'rook', `Dinner, with interest. You're cruel, and I'm utterly sold on it.`, 'smirk');
        await c.affection('rook', 2, 'Teasing');
      } else {
        await talk(c, 'rook', `Want me here. Nobody has ever wanted me in a room. They want me useful, or lucky, or gone.`, 'sad');
        await c.affection('rook', 3, 'Flustered');
      }

      await nar(c, `He sits. Then he slides down the bench until his knee is almost touching yours.`);
      await nar(c, `His sleeve brushes your wrist, and he doesn't look up for a long moment.`);
      await talk(c, 'rook', `I'll probably run again. You should know that. It's who I am when things get big.`, 'worried');
      await you(c, `Then I'll chase you. Every time, until you're tired of it.`, 'smirk');
      await nar(c, `He laughs, mostly breath. Then he picks up the lucky coin from under the note and presses it into your palm, folding your fingers over it.`);
      await talk(c, 'rook', `Keep it. Then you'll always know where I am, even when I'm being an idiot about it.`, 'blush');
      await talk(c, 'rook', `Don't make me regret choosing to stay.`, 'sad');
      await you(c, `I won't.`, 'happy');
      await nar(c, `He leans his forehead against yours, very carefully, the way a man touches something he has only just been allowed to hold.`);
      await c.emote('player', 'heart');
      c.sfx('heart');
      await talk(c, 'rook', `This is the part where I'm supposed to make a joke.`, 'blush');
      await you(c, `Don't.`, 'smirk');
      await talk(c, 'rook', `I won't. Stay with me till the lamp goes out.`, 'happy');
      c.bgm('tender');
    },
  });

  // ---------------------------------------------------------- rook_confession
  register({
    id: 'rook_confession', actor: 'rook', minTier: 3, minChapter: 4, kind: 'confession', once: true,
    title: 'Lucky Boys Don\'t Drown', bgm: 'romance',
    journal: `On Lantern Night, Rook stopped joking long enough to say he loved you, and you became his Beloved.`,
    run: async (c) => {
      c.bgm('romance');
      await c.fade('in', 60);
      await nar(c, `Lantern Night. Rook hasn't lost a single game of chance all evening. Unfortunately for everyone, he has won every one of them.`);
      await nar(c, `He stands at the lake's edge with a paper lantern under one arm.`);
      await nar(c, `A wish is scribbled on the side in handwriting so sloppy it can't be read from a distance.`);
      await talk(c, 'rook', `Don't look. It's private. Most of it's about the cook's pies.`, 'smirk');
      await you(c, `Are you going to tell me your wish?`, 'smirk');
      await talk(c, 'rook', `I'm going to tell you something better. It's the first thing I've said all year that I didn't make up to get a laugh.`, 'worried');
      await talk(c, 'rook', `Nobody's ever chosen me on purpose. They choose me by accident, or for the coin, or the charm, or what they can sell me for.`, 'sad');
      await talk(c, 'rook', `You chose me on purpose. Every day, in the small ways. I've been waiting for it to stop feeling like a trick. It never does.`, 'blush');
      await talk(c, 'rook', `I'm in love with you. I know I'm bad at saying it without a joke in front of it. I'm trying very hard to take the joke out.`, 'worried');

      const p1 = await pick(c, `He's got that terrible, hopeful grin. What do you say?`, [
        `Earnest: "I love you too. I've been wanting to say it since the crow's nest."`,
        `Brave: "Then stop joking, Rook, and kiss me. The whole lake is watching anyway."`,
        `Teasing: "Only the cook's pies? I'm offended. Pies are sacred."`,
        `Flustered: "I... oh. Yes. Yes, I love you too. Please don't make me say it twice."`,
      ]);
      if (p1 === 0) {
        await talk(c, 'rook', `Since the crow's nest. You've been keeping secrets. Terrible of you. I'm going to be insufferable about it for a month.`, 'happy');
        await c.affection('rook', 2, 'Said it back');
      } else if (p1 === 1) {
        await talk(c, 'rook', `Brave. Gods. All right. No more jokes. I'm going to need a moment to be sincere, which is not a skill I've practised.`, 'blush');
        await c.affection('rook', 2, 'Brave');
      } else if (p1 === 2) {
        await talk(c, 'rook', `Sacred? Be careful. You'll make me sincere, and it's extremely uncomfortable for everyone within earshot.`, 'smirk');
        await c.affection('rook', 1, 'Teasing');
      } else {
        await talk(c, 'rook', `Not twice? That's a bargain I'm not sure I can keep. I'll try, though. Gods help me.`, 'blush');
        await c.affection('rook', 1, 'Flustered');
      }

      await nar(c, `He pulls a worn copper penny from his pocket: the first coin he ever stole, in Pennyfold, and the only one he never spent.`);
      await nar(c, `He holds it a moment, then tosses it into the lake.`);
      await talk(c, 'rook', `I've been betting on luck my whole life. I'm done with it. I'm betting on you.`, 'happy');
      await you(c, `That was your first coin.`, 'surprised');
      await talk(c, 'rook', `It was. And I got the best return I've ever had. Keep the lucky one. I'll win you properly from now on.`, 'smirk');
      await talk(c, 'rook', `May I kiss you without a single joke in front of it? I'm asking nicely. It's a novelty.`, 'blush');
      await you(c, `Yes.`, 'happy');
      c.sfx('heart');
      await c.emote('player', 'heart');
      await nar(c, `He does, as if the whole lake, the lanterns, and every old grief have gone quiet at once. The lanterns blur into gold and warm light.`);
      await c.fade('out', 50);
      await c.wait(40);
      await c.fade('in', 50);
      await talk(c, 'rook', `Right. That was very un-Rook of me. I'd like a rematch, to prove I'm still charming.`, 'blush');
      await you(c, `You're still charming.`, 'happy');
      await nar(c, `Above the lake, a hundred small wishes climb into the dark. None of them needs to be read. Rook doesn't look at them once.`);
      G.romance.setLover('rook');
      await c.affection('rook', 10, 'Lantern Night confession');
    },
  });

  // ---------------------------------------------------------- rook_eve
  register({
    id: 'rook_eve', actor: 'rook', minTier: 0, minChapter: 5, kind: 'eve', once: true,
    title: 'Bow of the Marigold', bgm: 'tender',
    journal: `On the eve of the Spire, Rook asked for a promise: you'll come back down, and he won't run.`,
    run: async (c) => {
      const beloved = !!(G.romance && G.romance.lover && G.romance.lover() === 'rook');
      c.bgm('tender');
      await c.fade('in', 50);
      await nar(c, `The Marigold rides the night wind under the Spire's black needle. Tomorrow you climb it. Tonight the stars are thick enough to lean on.`);
      if (beloved) {
        await nar(c, `Rook lies on the bowsprit with his boots dangling over the edge. His fingers keep moving, flipping a coin that isn't there. Old habit.`);
        await nar(c, `The lucky coin is on your coat now.`);
        await talk(c, 'rook', `You're doing the thing where you stand very still so nobody notices you're terrified. It's adorable. It's also extremely obvious.`, 'smirk');
        await you(c, `I'm not terrified.`, 'smirk');
        await talk(c, 'rook', `Liar. Lovely. Your lies are the only ones I trust, because you're hopeless at them.`, 'blush');
        await nar(c, `He pats the wood beside him. You sit. He doesn't look at you for a moment, looking at the Spire instead.`);
        await talk(c, 'rook', `Tomorrow I'll be scared. I'm going to admit that out loud, because I'm not going to run from it. Not tomorrow.`, 'worried');
        await you(c, `You haven't run from me. Not once.`, 'happy');
        await talk(c, 'rook', `Only because you've got the coat, darling. I'd have bolted by now, otherwise. I'm a coward with excellent taste.`, 'smirk');
        await talk(c, 'rook', `So here's the deal. If I start to bolt, you grab my collar. If you start to bolt, I'll carry you up the stair myself. Agreed?`, 'normal');
        await you(c, `Agreed.`, 'happy');
        await talk(c, 'rook', `When this is over, and the star's lit and the Order's gone, you'll let me take you to a proper dinner.`, 'blush');
        await talk(c, 'rook', `No coin. No flip. Just you and me, and I'll pay. Then I'll ask you to stay, and I won't flip for that either.`, 'blush');
        await you(c, `You'll pay? Really?`, 'surprised');
        await talk(c, 'rook', `I'll pay. Don't get used to me being solvent.`, 'smirk');
        await nar(c, `He turns his head. The starlight catches his grin, and then the grin softens into something far less practised.`);
        await talk(c, 'rook', `Promise me you'll come back down those stairs, {name}. I'm not asking nicely. I'm begging, which I've never done in my whole life.`, 'sad');
        await you(c, `I promise.`, 'happy');
        await talk(c, 'rook', `Good.`, 'blush');
        await nar(c, `He leans in and presses a kiss to your temple, quick and careful, as if he's stealing it and daring the universe to object.`);
        await c.emote('player', 'heart');
        c.sfx('heart');
        await talk(c, 'rook', `Now go to bed. I'll keep watch. I'm very good at watching things I'd rather not lose.`, 'smirk');
      } else {
        await nar(c, `Rook is up in the crow's nest again, but tonight the lantern is dim, and he has called down for company.`);
        await talk(c, 'rook', `Permission to stay up here? I'm not running. I'm just pacing vertically.`, 'smirk');
        await you(c, `Permission granted.`, 'smirk');
        await talk(c, 'rook', `Good. I'd hate to start tomorrow with a bad reputation for leaving early.`, 'happy');
        await talk(c, 'rook', `They say the Spire has lots of stairs, no views, and terrible company. I've decided to bring my own. Charm, a coin, and a bad attitude.`, 'smirk');
        await you(c, `You'll be on the stairs with me?`, 'happy');
        await talk(c, 'rook', `At the bottom of the stairs, throwing coins at anything that looks at you funny. The Order will never see me coming.`, 'smirk');
        await talk(c, 'rook', `You've been a better friend to me than I've ever been to anyone. I'd like to be the one waiting when you come back down. That's all I want.`, 'sad');
        await talk(c, 'rook', `Brave, not reckless. That's my advice. You're going to be brave, so be sensible about it too.`, 'normal');
        await you(c, `Sensible? From you?`, 'smirk');
        await talk(c, 'rook', `I contain multitudes. Mostly all of them tired.`, 'blush');
        await nar(c, `A cold wind rattles the rigging. He tips his head back to watch the stars, a little longer than the stars deserve.`);
        await talk(c, 'rook', `Don't tell anyone I'm enjoying this. My reputation is extremely fragile.`, 'blush');
        await talk(c, 'rook', `Go on, then. Sleep. That isn't a suggestion.`, 'happy');
        await talk(c, 'rook', `It's advice from a man who has never slept properly in his life, and would like you not to be like him.`, 'happy');
      }
    },
  });

  // ---------------------------------------------------------- rook_epilogue
  register({
    id: 'rook_epilogue', actor: 'rook', minTier: 4, minChapter: 5, kind: 'epilogue', once: true,
    title: 'Two Blankets, One Mast', bgm: 'ending_love',
    journal: `After the Twin Flame, Rook walked home to Pennyfold with you and, this time, did not let go of anyone's hand.`,
    run: async (c) => {
      c.bgm('ending_love');
      await c.fade('in', 90);
      await nar(c, `A year after the Spire, a second blanket hangs over the rail of the Marigold's crow's nest.`);
      await nar(c, `The lantern on the hook beside it is always lit, and nobody has ever asked why.`);
      await nar(c, `The Hollow in Pennyfold lifted the week the star was relit.`);
      await nar(c, `Slowly, one wick at a time, like candles lit in the wrong order by people who were sorry it had taken so long.`);
      await nar(c, `The first wick to catch belonged to a girl.`);
      await nar(c, `Twenty-four years old now, with feathers in her hair and opinions in her mouth, and she had never once been quiet about anything.`);
      await talk(c, 'rook', `Mira bit the bailiff last week. He tried to fix her hair. Some things never change. Thank the stars for that.`, 'happy');
      await you(c, `She bit him?`, 'surprised');
      await talk(c, 'rook', `Gently. Mostly. He's fine. He'll be wearing a bandage on his thumb until Midsummer, and he's quite proud of it.`, 'smirk');
      await nar(c, `The three of you walk the road out of Pennyfold together, the same road Rook once ran down with his hands empty.`);
      await nar(c, `The wheat is high and gold on both sides.`);
      await talk(c, 'rook', `Fifteen years I ran from this road. Now I'm walking it on purpose. It looks different from this side. Much less dramatic. I'm disappointed.`, 'smirk');
      await talk(c, 'rook', `You're going to be disappointed by the entire village, I'm warning you now. They've been saying kind things about me all week.`, 'blush');
      await talk(c, 'rook', `I've had to lie down twice.`, 'blush');
      await nar(c, `Mira walks a half-step ahead, arms folded, scowling at the sky. She stops, and turns. Her eyes go straight to his hand.`);
      await talk(c, 'rook', `Mira. Hello. You look well. Terribly well. Bitey.`, 'blush');
      await c.say('Mira', `You let go of my hand, Rook.`, { face: 'unknown', expr: 'worried' });
      await nar(c, `The smile drops off his face. It isn't a joke, and he doesn't try to make it one.`);
      await talk(c, 'rook', `I did. I'm not going to make excuses. I've made enough of those for two lifetimes.`, 'sad');
      await talk(c, 'rook', `Your hand isn't going anywhere this time, if you'll let me try.`, 'sad');
      await nar(c, `He holds his hand out, palm up. Mira looks at it for a long, uncertain moment. Then she takes it, hard, testing whether it will hold.`);
      await nar(c, `It does.`);
      await c.say('Mira', `Is he always this dramatic?`, { face: 'unknown', expr: 'smirk' });
      await you(c, `Every day. It's exhausting.`, 'smirk');
      await c.say('Mira', `Good. Somebody in this family has to be.`, { face: 'unknown', expr: 'happy' });
      await talk(c, 'rook', `I'm not dramatic. I'm emotionally fluent. There's a difference, and I'm going to explain it at length.`, 'smirk');
      await nar(c, `Mira snorts. Rook grins, and it's the real one, the one that doesn't have anything to hide behind.`);
      await nar(c, `He flicks the lucky coin into the air and catches it without looking. He doesn't need luck anymore. He just likes the trick.`);
      await talk(c, 'rook', `Pennyfold's fishmonger finally paid his debt. Two bags of eels and an apology. I've decided it counts as a win.`, 'happy');
      await nar(c, `At dusk you climb back up to the crow's nest, Rook first. Mira's voice drifts up from the deck, telling the cook the eels are overcooked.`);
      await nar(c, `He pours two cups of ember wine, leaves the lantern lit, and settles against the mast the way he used to. He no longer looks like a man waiting to be sent away.`);
      await talk(c, 'rook', `I used to think the stars went out in order because the old ones were tired. Now I think they just wait for company.`, 'sad');
      await talk(c, 'rook', `Stay up with me. Don't leave until the last one goes.`, 'blush');
      await you(c, `I'm not going anywhere.`, 'happy');
      await talk(c, 'rook', `Good. I chose to stay too, and I'm not regretting it. Don't you dare make me regret it now.`, 'smirk');
      await nar(c, `The stars wink out one by one, the old ones first. He counts them without moving his lips, and for once he doesn't lose count on purpose.`);
      await nar(c, `Somewhere near the end, his hand finds yours and stays.`);
      await nar(c, `Below, a girl with feathers in her hair laughs at something on the deck. Above, the Hearthstar burns on two hearts. Two blankets. One mast.`);
      await nar(c, `Nobody running.`);
      c.sfx('coin');
    },
  });

  G.provide('bonds_a');
})();
