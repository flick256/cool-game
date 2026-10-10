/* =====================================================================
 * LANTERNBOUND — data.js  (owner: data)
 * Static game database (actors, skills, enemies, troops, items, shops,
 * statuses, exp curve), the runtime party API G.party, and the data-owned
 * script commands: addItem, removeItem, hasItem, join, leave, healAll, setParty.
 *
 * Conventions
 *  - Skill targets are from the USER's point of view. Player skills:
 *    one_enemy = an enemy. Enemy skills (e_*): one_enemy = one PARTY member,
 *    all_enemies = whole party, one_ally/all_allies = other enemies, self = user.
 *  - "usable" on an item omitted (null) = anyone whose weapons[] has the type.
 *  - weapon2 contributes 50% of its stats and its weapon type to Attack.
 *  - Bond skills (kind 'bond') are not in learn lists: G.party.skills(rowan)
 *    returns them when the partner is in the party, alive and tier >= reqTier.
 * ===================================================================== */
(function () {
  'use strict';
  const G = window.G;
  const D = (G.data = G.data || {});

  const MAX_LEVEL = 30;
  const STAT_KEYS = ['hp', 'sp', 'patk', 'pdef', 'eatk', 'edef', 'spd', 'crit', 'eva'];
  const EQUIP_SLOTS = ['weapon', 'weapon2', 'armor', 'accessory'];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
  const toast = (text, kind) => { try { if (G.ui && G.ui.toast) G.ui.toast(text, kind || 'info'); } catch (e) { /* ui optional */ } };
  const sfx = (name) => { try { if (G.audio && G.audio.sfx) G.audio.sfx(name); } catch (e) { /* audio optional */ } };

  D.MAX_LEVEL = MAX_LEVEL;
  D.elements = ['fire', 'ice', 'lightning', 'wind', 'light', 'dark'];
  D.weaponTypes = ['sword', 'spear', 'dagger', 'axe', 'bow', 'staff'];
  D.TOKENS = D.elements.concat(D.weaponTypes);
  D.statKeys = STAT_KEYS.slice();
  D.kinds = ['phys', 'elem', 'heal', 'buff', 'debuff', 'special', 'bond'];
  D.targets = ['one_enemy', 'all_enemies', 'random_enemies', 'one_ally', 'all_allies', 'self', 'dead_ally'];
  D.anims = ['slash', 'pierce', 'blunt', 'arrow', 'fire', 'ice', 'lightning', 'wind', 'light', 'dark', 'heal', 'buff', 'debuff', 'bond', 'steal', 'revive', 'poison', 'break', 'hit', 'shield'];
  D.specials = ['steal', 'provoke', 'revive', 'give_bp', 'cleanse'];
  D.statuses = ['poison', 'sleep', 'atkup', 'atkdown', 'defup', 'defdown', 'spdup', 'spddown', 'regen', 'taunt', 'guard'];
  D.itemTypes = ['consumable', 'gift', 'key', 'weapon', 'armor', 'accessory'];

  D.statusInfo = {
    poison: { name: 'Poison', icon: 'poison', desc: 'Loses 8% of max HP at the start of each turn.', buff: false },
    sleep: { name: 'Sleep', icon: 'sleep', desc: 'Cannot act. Wakes when struck.', buff: false },
    atkup: { name: 'Attack Up', icon: 'up', desc: 'Attack power x1.3.', buff: true },
    atkdown: { name: 'Attack Down', icon: 'down', desc: 'Attack power x0.7.', buff: false },
    defup: { name: 'Guard Up', icon: 'shield', desc: 'Damage taken x0.7.', buff: true },
    defdown: { name: 'Guard Down', icon: 'shieldBreak', desc: 'Damage taken x1.3.', buff: false },
    spdup: { name: 'Haste', icon: 'up', desc: 'Speed up: acts earlier in the round.', buff: true },
    spddown: { name: 'Slow', icon: 'down', desc: 'Speed down: acts later in the round.', buff: false },
    regen: { name: 'Regen', icon: 'heart', desc: 'Recovers 8% of max HP each turn.', buff: true },
    taunt: { name: 'Taunt', icon: 'star', desc: 'Enemies must target this unit.', buff: true },
    guard: { name: 'Guard', icon: 'shield', desc: 'Halves damage taken until the next turn.', buff: true },
  };

  // ================================================================ EXP CURVE
  // Total exp to reach level L from 1. Early levels take ~13 battles, later ~8.
  // Enemy exp is tuned so one battle at the area's level yields roughly the
  // per-level step divided by the battles-per-level above.
  const EXP = [0, 0];
  (function buildExp() {
    let total = 0;
    for (let L = 2; L <= MAX_LEVEL; L++) {
      const k = L - 1;                                  // exp step is paid when leaving level k
      const perBattle = 0.6 * k * k + 9;                // ~3 enemies of level k
      const battles = k <= 8 ? 13 : (k <= 16 ? 10 : (k <= 24 ? 9 : 8));
      total += Math.round(battles * perBattle);
      EXP[L] = total;
    }
  })();
  D.expFor = function (level) { return EXP[clamp(Math.floor(level || 1), 1, MAX_LEVEL)]; };

  // ================================================================ ACTORS
  // growth = added per level, stat = base + floor(growth * (lv - 1)).
  const ACTORS = {};
  function actor(o) { ACTORS[o.id] = o; return o; }

  actor({
    id: 'rowan', name: 'Rowan', title: 'the Kindler', cls: 'Apprentice Lamplighter', pronouns: 'they/them',
    weapons: ['sword', 'staff'],
    base: { hp: 60, sp: 20, patk: 14, pdef: 9, eatk: 12, edef: 9, spd: 10, crit: 6, eva: 5 },
    growth: { hp: 16, sp: 3, patk: 2.6, pdef: 1.9, eatk: 2.4, edef: 1.9, spd: 0.45, crit: 0.15, eva: 0.12 },
    learn: [
      { level: 1, skill: 'kindle_spark' }, { level: 3, skill: 'kindle' }, { level: 5, skill: 'wickcutter' },
      { level: 8, skill: 'lamplight_ward' }, { level: 12, skill: 'sunrise_arc' }, { level: 15, skill: 'warm_hands' },
      { level: 18, skill: 'flare_of_kin' }, { level: 21, skill: 'starfall_lantern' }, { level: 26, skill: 'lampwright_secret' },
      { level: 30, skill: 'heart_of_the_hearthstar' },
    ],
    equip: { weapon: 'sword_1', weapon2: null, armor: 'vest_1', accessory: null },
    joinLevel: 1, color: '#ffcc66', sprite: 'rowan', portrait: 'rowan',
    bio: 'Found as an infant on Wickholm\'s doorstep and raised by Maren to tend the village lamps. Wickless, so the superstitious call them Cold. Yet a touch of their hand can kindle someone else\'s flame.',
  });

  actor({
    id: 'claret', name: 'Claret', title: 'the Tinker', cls: 'Captain-Engineer', pronouns: 'she/her',
    weapons: ['spear', 'axe'],
    base: { hp: 72, sp: 24, patk: 16, pdef: 11, eatk: 10, edef: 8, spd: 11, crit: 9, eva: 4 },
    growth: { hp: 17, sp: 2.5, patk: 2.9, pdef: 2.1, eatk: 1.5, edef: 1.5, spd: 0.5, crit: 0.25, eva: 0.08 },
    learn: [
      { level: 1, skill: 'arc_lance' }, { level: 3, skill: 'spanner_swing' }, { level: 5, skill: 'sparkbolt' },
      { level: 8, skill: 'signal_flare' }, { level: 10, skill: 'grease_trap' }, { level: 13, skill: 'overclock' },
      { level: 16, skill: 'boiler_burst' }, { level: 19, skill: 'thunder_gasket' }, { level: 23, skill: 'steam_hammer' },
      { level: 30, skill: 'marigold_overdrive' },
    ],
    equip: { weapon: 'spear_1', weapon2: null, armor: 'mail_1', accessory: null },
    joinLevel: 5, color: '#e8553a', sprite: 'claret', portrait: 'claret',
    bio: 'Captain-engineer of the steam-airship Marigold. Sharp-tongued, practical and secretly tender. She fixes things because it is easier than saying what she means.',
  });

  actor({
    id: 'caspian', name: 'Caspian', title: 'the Oathbreaker', cls: 'Former Knight-Lantern', pronouns: 'he/him',
    weapons: ['sword', 'spear'],
    base: { hp: 95, sp: 15, patk: 15, pdef: 14, eatk: 6, edef: 10, spd: 7, crit: 4, eva: 2 },
    growth: { hp: 22, sp: 1.5, patk: 2.4, pdef: 2.8, eatk: 1.0, edef: 2.0, spd: 0.3, crit: 0.1, eva: 0.05 },
    learn: [
      { level: 1, skill: 'oathshield_bash' }, { level: 3, skill: 'stand_forward' }, { level: 5, skill: 'iron_vigil' },
      { level: 8, skill: 'spear_sweep' }, { level: 11, skill: 'oath_of_light' }, { level: 14, skill: 'shield_wall' },
      { level: 17, skill: 'field_dressing' }, { level: 20, skill: 'gladius_oathstrike' }, { level: 24, skill: 'unbroken_line' },
      { level: 30, skill: 'last_stand_grey_lion' },
    ],
    equip: { weapon: 'sword_2', weapon2: null, armor: 'mail_2', accessory: null },
    joinLevel: 10, color: '#e9e2c8', sprite: 'caspian', portrait: 'caspian',
    bio: 'Once a Knight-Lantern of the Hearth Order, now the Grey Lion of Gladius. Courteous, honorable and guilt-ridden over the lamps he was ordered to put out.',
  });

  actor({
    id: 'rook', name: 'Rook', title: 'the Rogue', cls: 'Gambler-Thief', pronouns: 'he/him',
    weapons: ['dagger', 'bow'],
    base: { hp: 62, sp: 22, patk: 16, pdef: 8, eatk: 11, edef: 8, spd: 15, crit: 14, eva: 14 },
    growth: { hp: 14, sp: 2.5, patk: 2.7, pdef: 1.7, eatk: 2.2, edef: 1.8, spd: 0.7, crit: 0.3, eva: 0.25 },
    learn: [
      { level: 1, skill: 'lucky_stab' }, { level: 3, skill: 'pickpocket' }, { level: 5, skill: 'gust_flick' },
      { level: 7, skill: 'coin_trick' }, { level: 10, skill: 'evasive_roll' }, { level: 13, skill: 'cartwheel_knives' },
      { level: 16, skill: 'silver_tongue' }, { level: 19, skill: 'loaded_dice' }, { level: 22, skill: 'thiefs_arrow' },
      { level: 30, skill: 'jackpot' },
    ],
    equip: { weapon: 'dagger_2', weapon2: null, armor: 'vest_2', accessory: 'charm_luck' },
    joinLevel: 10, color: '#6fbf73', sprite: 'rook', portrait: 'rook',
    bio: 'A charming thief with a silver tongue and a lucky coin. Always joking, because a joke is easier to run away on. Is learning, one bet at a time, how to stay.',
  });

  actor({
    id: 'seraphine', name: 'Seraphine', title: 'the Cantor', cls: 'Pale Choir Cantor', pronouns: 'she/her',
    weapons: ['staff'],
    base: { hp: 58, sp: 40, patk: 9, pdef: 7, eatk: 16, edef: 13, spd: 10, crit: 4, eva: 6 },
    growth: { hp: 13, sp: 4.5, patk: 1.6, pdef: 1.5, eatk: 2.9, edef: 2.5, spd: 0.4, crit: 0.1, eva: 0.1 },
    learn: [
      { level: 1, skill: 'hymn_of_mending' }, { level: 3, skill: 'pale_note' }, { level: 5, skill: 'cleansing_chord' },
      { level: 8, skill: 'benediction' }, { level: 10, skill: 'hymn_of_return' }, { level: 13, skill: 'choirs_embrace' },
      { level: 16, skill: 'sing_the_hollow_back' }, { level: 22, skill: 'grace_glimmer' }, { level: 27, skill: 'sermon_unbound' },
      { level: 30, skill: 'a_choir_of_one' },
    ],
    equip: { weapon: 'staff_2', weapon2: null, armor: 'robe_2', accessory: null },
    joinLevel: 14, color: '#9fe3d6', sprite: 'seraphine', portrait: 'seraphine',
    bio: 'Cantor of the Pale Choir. Gentle, earnest and dryly funny when comfortable. Her hymns have begun to sound like questions, and she is learning to answer them herself.',
  });

  actor({
    id: 'wren', name: 'Wren', title: 'the Hedge-Witch', cls: 'Whisperwood Hedge-Witch', pronouns: 'they/them',
    weapons: ['staff', 'bow'],
    base: { hp: 52, sp: 55, patk: 8, pdef: 6, eatk: 18, edef: 12, spd: 12, crit: 5, eva: 8 },
    growth: { hp: 12, sp: 6, patk: 1.5, pdef: 1.2, eatk: 3.2, edef: 2.3, spd: 0.35, crit: 0.15, eva: 0.15 },
    learn: [
      { level: 1, skill: 'ember_seed' }, { level: 2, skill: 'thorn_arrow' }, { level: 5, skill: 'thunder_thorn' },
      { level: 8, skill: 'wild_wind' }, { level: 10, skill: 'moonpetal_mend' }, { level: 13, skill: 'briar_snare' },
      { level: 15, skill: 'blizzard_moth' }, { level: 21, skill: 'storm_hedge' }, { level: 28, skill: 'winter_crown' },
      { level: 30, skill: 'hedge_eclipse' },
    ],
    equip: { weapon: 'staff_2', weapon2: null, armor: 'robe_2', accessory: null },
    joinLevel: 14, color: '#8fb8ff', sprite: 'wren', portrait: 'wren',
    bio: 'Hedge-witch of Whisperwood. Blunt, literal and surprisingly kind. Talks to foxes, trusts plants more than people, and does not like being rushed.',
  });

  D.actors = ACTORS;

  // ================================================================ SKILLS
  const SKILLS = {};
  function sk(o) {
    const s = Object.assign({
      desc: '', kind: 'phys', element: null, weapon: null, power: 100, hits: 1, target: 'one_enemy',
      cost: 0, shield: 1, effects: [], special: null, anim: 'slash', partner: null, reqTier: null, user: null,
    }, o);
    s.effects = (s.effects || []).map((e) => Object.assign({ status: 'atkup', chance: 1, turns: 3, target: 'target' }, e));
    SKILLS[s.id] = s;
    return s;
  }

  // ---- Rowan: light damage, BP and buff support, warm heals
  sk({ id: 'kindle_spark', name: 'Kindling Spark', kind: 'elem', element: 'light', power: 110, cost: 4, anim: 'light',
    desc: 'A flick of the wrist and a spark of warm light. The Hollow flinch from it.' });
  sk({ id: 'kindle', name: 'Kindle', kind: 'buff', special: 'give_bp', target: 'one_ally', cost: 6, anim: 'buff',
    desc: 'Press a palm to an ally\'s back. Their wick catches. The ally gains 1 BP.' });
  sk({ id: 'wickcutter', name: 'Wickcutter', kind: 'phys', weapon: 'sword', power: 130, cost: 5, anim: 'slash', shield: 1,
    desc: 'A clean sword-cut through gloom and grey fog. Needs a sword in hand.' });
  sk({ id: 'lamplight_ward', name: 'Lamplight Ward', kind: 'buff', target: 'one_ally', cost: 6, anim: 'buff',
    effects: [{ status: 'defup', chance: 1, turns: 3, target: 'target' }],
    desc: 'A warm halo settles on one ally. Their guard rises for three turns.' });
  sk({ id: 'sunrise_arc', name: 'Sunrise Arc', kind: 'elem', element: 'light', target: 'all_enemies', power: 80, cost: 12, anim: 'light',
    desc: 'A staff sweeps a crescent of dawn across every foe. Shadows get shorter.' });
  sk({ id: 'warm_hands', name: 'Warm Hands', kind: 'heal', element: 'light', target: 'one_ally', power: 120, cost: 8, anim: 'heal',
    desc: 'You press your palms over a wound. The warmth goes in, and stays a while.' });
  sk({ id: 'flare_of_kin', name: 'Flare of Kin', kind: 'buff', target: 'all_allies', cost: 14, anim: 'buff',
    effects: [{ status: 'atkup', chance: 1, turns: 3, target: 'target' }],
    desc: 'Everyone you care about burns a little brighter. Attack up for the whole party.' });
  sk({ id: 'starfall_lantern', name: 'Starfall Lantern', kind: 'elem', element: 'light', power: 150, cost: 20, anim: 'light', shield: 2,
    desc: 'You loose a lantern into the sky. It comes down on one foe as a falling star.' });
  sk({ id: 'lampwright_secret', name: 'Lampwright\'s Secret', kind: 'elem', element: 'light', power: 220, cost: 30, anim: 'light', shield: 2,
    desc: 'A word from the margins of an old Lampwright\'s book. It hurts the dark a great deal.' });
  sk({ id: 'heart_of_the_hearthstar', name: 'Heart of the Hearthstar', kind: 'buff', special: 'give_bp', target: 'all_allies', cost: 25, anim: 'buff',
    desc: 'For one breath every wick in the party burns as one. All allies gain 1 BP.' });

  // ---- Claret: lightning and fire gadgets, AoE, debuffs
  sk({ id: 'arc_lance', name: 'Arc-Lance Thrust', kind: 'phys', weapon: 'spear', power: 105, cost: 0, anim: 'pierce', shield: 1,
    desc: 'The lance is more of a tool than a weapon. It pierces guard with a crackle.' });
  sk({ id: 'spanner_swing', name: 'Spanner Swing', kind: 'phys', weapon: 'axe', power: 125, cost: 4, anim: 'blunt', shield: 1,
    desc: 'A heavy swing with a heavier spanner. "Don\'t touch that, it\'s load-bearing."' });
  sk({ id: 'sparkbolt', name: 'Sparkbolt', kind: 'elem', element: 'lightning', power: 110, cost: 5, anim: 'lightning',
    desc: 'A crackling bolt from the arc-coil on her wrist. Smells faintly of ozone and victory.' });
  sk({ id: 'signal_flare', name: 'Signal Flare', kind: 'elem', element: 'fire', target: 'all_enemies', power: 75, cost: 12, anim: 'fire',
    effects: [{ status: 'defdown', chance: 0.5, turns: 2, target: 'target' }],
    desc: 'A flare meant for ship-to-ship signals. Enemies see it too, and do not enjoy it.' });
  sk({ id: 'grease_trap', name: 'Grease Trap', kind: 'debuff', power: 0, target: 'all_enemies', cost: 8, anim: 'debuff',
    effects: [{ status: 'spddown', chance: 0.8, turns: 3, target: 'target' }],
    desc: 'Oil, gears and a very slippery opinion. Enemies slow down for three turns.' });
  sk({ id: 'overclock', name: 'Overclock', kind: 'buff', target: 'one_ally', cost: 8, anim: 'buff',
    effects: [{ status: 'atkup', chance: 1, turns: 3, target: 'target' }],
    desc: '"Hold still, I\'m tuning you." Attack up for three turns. Do not ask about the sparks.' });
  sk({ id: 'boiler_burst', name: 'Boiler Burst', kind: 'elem', element: 'fire', target: 'all_enemies', power: 110, cost: 16, anim: 'fire', shield: 1,
    desc: 'She opens a boiler valve on purpose. The steam is hot, the fire is hotter.' });
  sk({ id: 'thunder_gasket', name: 'Thunder Gasket', kind: 'elem', element: 'lightning', hits: 3, power: 60, cost: 14, anim: 'lightning', shield: 1,
    desc: 'Three quick discharges through a tuned gasket. Each one is a tiny, rude argument.' });
  sk({ id: 'steam_hammer', name: 'Steam-Hammer Breaker', kind: 'phys', weapon: 'axe', power: 180, cost: 15, anim: 'blunt', shield: 2,
    desc: 'The spanner-axe with a steam piston bolted to the back. Armor is a suggestion.' });
  sk({ id: 'marigold_overdrive', name: 'Marigold Overdrive', kind: 'elem', element: 'lightning', target: 'all_enemies', power: 190, cost: 35, anim: 'lightning', shield: 2,
    effects: [{ status: 'atkup', chance: 1, turns: 2, target: 'self' }],
    desc: 'Every coil on the Marigold screams at once. She is fine. The ship is not fine.' });

  // ---- Caspian: tank, guard, provoke, light
  sk({ id: 'oathshield_bash', name: 'Oathshield Bash', kind: 'phys', weapon: 'sword', power: 105, cost: 3, anim: 'blunt',
    effects: [{ status: 'defdown', chance: 0.5, turns: 2, target: 'target' }],
    desc: 'A bash with the shield he was issued by the Order. He is not proud of it. He still uses it.' });
  sk({ id: 'stand_forward', name: 'Stand Forward, Friend', kind: 'special', special: 'provoke', target: 'self', cost: 4, anim: 'buff',
    effects: [{ status: 'taunt', chance: 1, turns: 2, target: 'self' }],
    desc: 'Every blow aimed at the others now has to get past him first.' });
  sk({ id: 'iron_vigil', name: 'Iron Vigil', kind: 'buff', target: 'self', cost: 5, anim: 'buff',
    effects: [{ status: 'guard', chance: 1, turns: 2, target: 'self' }],
    desc: 'He plants his feet like a lamppost in a gale. Damage taken is halved until his next turn.' });
  sk({ id: 'spear_sweep', name: 'Oathspear Sweep', kind: 'phys', weapon: 'spear', target: 'all_enemies', power: 90, cost: 8, anim: 'pierce',
    desc: 'A long, patient arc. Every enemy in reach remembers it fondly.' });
  sk({ id: 'oath_of_light', name: 'Oath of Light', kind: 'elem', element: 'light', power: 125, cost: 8, anim: 'light',
    desc: 'The oath he swore as a Knight-Lantern, spoken again for the people it was meant for.' });
  sk({ id: 'shield_wall', name: 'Shield Wall', kind: 'buff', target: 'all_allies', cost: 16, anim: 'buff',
    effects: [{ status: 'defup', chance: 1, turns: 3, target: 'target' }],
    desc: 'Shields up, shoulders close. Everyone in the party takes less damage for three turns.' });
  sk({ id: 'field_dressing', name: 'Field Dressing', kind: 'heal', element: 'light', target: 'one_ally', power: 95, cost: 8, anim: 'heal',
    desc: 'Clean linen, steady hands, and a bad joke to distract from the sting.' });
  sk({ id: 'gladius_oathstrike', name: 'Gladius Oathstrike', kind: 'phys', weapon: 'sword', power: 170, cost: 14, anim: 'slash', shield: 2,
    desc: 'The strike the Arena taught him. Fast, honest, and aimed at the armor, not the person.' });
  sk({ id: 'unbroken_line', name: 'Unbroken Line', kind: 'buff', target: 'self', cost: 12, anim: 'buff',
    effects: [{ status: 'defup', chance: 1, turns: 3, target: 'self' }, { status: 'taunt', chance: 1, turns: 2, target: 'self' }],
    desc: 'He becomes the wall, and says so, loudly. Guard up and taunting for a short while.' });
  sk({ id: 'knight_lantern_dawn', name: 'Knight-Lantern\'s Dawn', kind: 'elem', element: 'light', target: 'all_enemies', power: 115, cost: 22, anim: 'light', shield: 1,
    desc: 'The Order\'s oath, sung backwards. Turned around, it is a warning, and a light.' });
  sk({ id: 'last_stand_grey_lion', name: 'Last Stand of the Grey Lion', kind: 'buff', target: 'self', cost: 25, anim: 'buff',
    effects: [{ status: 'regen', chance: 1, turns: 5, target: 'self' }, { status: 'defup', chance: 1, turns: 3, target: 'self' }],
    desc: 'Regeneration and an iron guard, for the fight that matters most. He has been waiting to earn this.' });

  // ---- Rook: steal, dagger flurries, wind and dark, evasion
  sk({ id: 'lucky_stab', name: 'Lucky Stab', kind: 'phys', weapon: 'dagger', power: 70, hits: 2, cost: 0, anim: 'pierce',
    desc: 'Quick stabs. Quicker hands. Nothing about it is fair, which is the point.' });
  sk({ id: 'pickpocket', name: 'Pickpocket', kind: 'special', special: 'steal', power: 0, cost: 2, anim: 'steal',
    desc: 'Something of theirs is suddenly something of yours. They will notice, eventually.' });
  sk({ id: 'gust_flick', name: 'Gust Flick', kind: 'elem', element: 'wind', power: 105, cost: 4, anim: 'wind',
    desc: 'A flick of the wrist and a sudden wind across the foe\'s face. Charming, and rude.' });
  sk({ id: 'coin_trick', name: 'Coin Trick', kind: 'elem', element: 'dark', power: 110, cost: 5, anim: 'dark',
    effects: [{ status: 'defdown', chance: 0.5, turns: 2, target: 'target' }],
    desc: '"Here it is... now it isn\'t." The coin vanishes into the dark, and so does their guard.' });
  sk({ id: 'evasive_roll', name: 'Evasive Roll', kind: 'buff', target: 'self', cost: 6, anim: 'buff',
    effects: [{ status: 'spdup', chance: 1, turns: 3, target: 'self' }],
    desc: 'A roll, a flip, and you were never there. Speed up for three turns.' });
  sk({ id: 'cartwheel_knives', name: 'Cartwheel Knives', kind: 'phys', weapon: 'dagger', target: 'all_enemies', power: 75, hits: 2, cost: 10, anim: 'pierce',
    desc: 'Knives thrown while cartwheeling. The audience is always impressed and the enemy is never safe.' });
  sk({ id: 'silver_tongue', name: 'Silver Tongue', kind: 'debuff', power: 0, target: 'all_enemies', cost: 10, anim: 'debuff',
    effects: [{ status: 'atkdown', chance: 0.7, turns: 3, target: 'target' }],
    desc: '"Let\'s not, shall we?" Enemies suddenly remember they had somewhere else to be.' });
  sk({ id: 'loaded_dice', name: 'Loaded Dice', kind: 'elem', element: 'dark', hits: 3, power: 60, cost: 12, anim: 'dark',
    desc: 'Three rolls. Three results. You get to decide what they mean.' });
  sk({ id: 'thiefs_arrow', name: 'Thief\'s Arrow', kind: 'phys', weapon: 'bow', power: 130, cost: 8, anim: 'arrow', shield: 2,
    desc: 'Shot from a rooftop he was not supposed to be on. It was worth it.' });
  sk({ id: 'wind_in_gallows', name: 'Wind in the Gallows', kind: 'elem', element: 'wind', target: 'all_enemies', power: 130, cost: 18, anim: 'wind',
    desc: 'A gust that picks up every loose thing on the battlefield and hurls it at the enemy.' });
  sk({ id: 'jackpot', name: 'Jackpot!', kind: 'elem', element: 'dark', hits: 2, power: 240, cost: 30, anim: 'dark', shield: 2,
    desc: 'Everything on the table, and then everything else. Nobody in Gladius has ever seen the house win this big.' });

  // ---- Seraphine: heals, revive, cleanse, light, buffs
  sk({ id: 'hymn_of_mending', name: 'Hymn of Mending', kind: 'heal', element: 'light', target: 'one_ally', power: 100, cost: 6, anim: 'heal',
    desc: 'A short, bright verse. The wound closes like a sleepy eye.' });
  sk({ id: 'pale_note', name: 'Pale Note', kind: 'elem', element: 'light', power: 100, cost: 4, anim: 'light',
    desc: 'One clear high note. It hits harder than a note has any right to.' });
  sk({ id: 'cleansing_chord', name: 'Cleansing Chord', kind: 'special', special: 'cleanse', target: 'one_ally', power: 0, cost: 6, anim: 'heal',
    desc: 'A low chord that washes away poison, sleep and the odd bad mood.' });
  sk({ id: 'benediction', name: 'Benediction', kind: 'buff', target: 'all_allies', cost: 12, anim: 'buff',
    effects: [{ status: 'atkup', chance: 1, turns: 3, target: 'target' }],
    desc: 'A blessing spoken without any authority at all. It works anyway, which is awkward for everyone.' });
  sk({ id: 'hymn_of_return', name: 'Hymn of Return', kind: 'special', special: 'revive', target: 'dead_ally', power: 40, cost: 14, anim: 'revive',
    desc: 'A hymn for the one who fell. They return with a little less than they had, and a lot more to say.' });
  sk({ id: 'choirs_embrace', name: 'Choir\'s Embrace', kind: 'heal', element: 'light', target: 'all_allies', power: 70, cost: 18, anim: 'heal',
    desc: 'Every voice in the party joins in. Harmony is a kind of medicine.' });
  sk({ id: 'sing_the_hollow_back', name: 'Sing the Hollow Back', kind: 'elem', element: 'light', target: 'all_enemies', power: 90, cost: 14, anim: 'light',
    effects: [{ status: 'atkdown', chance: 0.5, turns: 2, target: 'target' }],
    desc: 'She sings the Hollow back into its own silence. It has never heard its own voice before.' });
  sk({ id: 'grace_glimmer', name: 'Grace Glimmer', kind: 'heal', element: 'light', target: 'one_ally', power: 180, cost: 20, anim: 'heal',
    desc: 'A slow, golden swell of grace. Sera calls it "the one that makes people cry, which is fine".' });
  sk({ id: 'sermon_unbound', name: 'Sermon Unbound', kind: 'elem', element: 'light', target: 'all_enemies', power: 150, cost: 25, anim: 'light', shield: 2,
    desc: 'The Abbess would never have let her preach this sermon. Sera is preaching it anyway.' });
  sk({ id: 'a_choir_of_one', name: 'A Choir of One', kind: 'heal', element: 'light', target: 'all_allies', power: 160, cost: 40, anim: 'heal',
    desc: 'One voice, layered a thousand times. Everyone in the party is healed by the echoes.' });

  // ---- Wren: fire, ice, lightning, wind spells, AoE, big SP costs
  sk({ id: 'ember_seed', name: 'Ember Seed', kind: 'elem', element: 'fire', power: 110, cost: 6, anim: 'fire',
    desc: 'A seed of fire, planted in the enemy\'s bad mood. It sprouts immediately.' });
  sk({ id: 'thorn_arrow', name: 'Thorn Arrow', kind: 'phys', weapon: 'bow', power: 100, cost: 2, anim: 'arrow', shield: 1,
    desc: 'A briar-tipped arrow, shot with an apology. Sorry. Hold still.' });
  sk({ id: 'thunder_thorn', name: 'Thunder Thorn', kind: 'elem', element: 'lightning', power: 110, cost: 7, anim: 'lightning',
    desc: 'Lightning that has been living in an oak for three hundred years and is tired of waiting.' });
  sk({ id: 'wild_wind', name: 'Wild Wind of the Whisperwood', kind: 'elem', element: 'wind', target: 'all_enemies', power: 75, cost: 12, anim: 'wind',
    desc: 'The forest\'s own breath, rising up and rattling every enemy in the clearing.' });
  sk({ id: 'moonpetal_mend', name: 'Moonpetal Mending', kind: 'heal', target: 'one_ally', power: 110, cost: 10, anim: 'heal',
    desc: 'A petal from the moonflower, crushed into a poultice. It smells of rain and silence.' });
  sk({ id: 'briar_snare', name: 'Briar Snare', kind: 'debuff', power: 0, target: 'all_enemies', cost: 12, anim: 'debuff',
    effects: [{ status: 'spddown', chance: 0.8, turns: 3, target: 'target' }],
    desc: 'Briars rise from the ground and very politely hold everyone\'s ankles.' });
  sk({ id: 'blizzard_moth', name: 'Blizzard of Moths', kind: 'elem', element: 'ice', target: 'all_enemies', power: 110, cost: 20, anim: 'ice', shield: 1,
    effects: [{ status: 'spddown', chance: 0.3, turns: 2, target: 'target' }],
    desc: 'Pale moths made of frost. They are very beautiful and they are extremely cold.' });
  sk({ id: 'storm_hedge', name: 'Storm in the Hedgerow', kind: 'elem', element: 'lightning', target: 'all_enemies', power: 120, cost: 24, anim: 'lightning', shield: 1,
    desc: 'The hedges crackle, the sky frowns, and the enemies find out why nobody goes into the woods.' });
  sk({ id: 'winter_crown', name: 'Winter Crown', kind: 'elem', element: 'ice', target: 'all_enemies', power: 190, cost: 32, anim: 'ice', shield: 2,
    desc: 'A crown of frost for the whole battlefield. Wren wears it with a shrug.' });
  sk({ id: 'hedge_eclipse', name: 'Eclipse of the Hedge', kind: 'elem', element: 'wind', target: 'all_enemies', hits: 2, power: 150, cost: 40, anim: 'wind', shield: 2,
    desc: 'The whole Whisperwood holds its breath, and then breathes out, twice. Everything in the sky goes quiet.' });

  // ---- Bond skills (Rowan + partner). Power scales with tier in battle.
  sk({ id: 'bond_claret', name: 'Kindled Link: Claret', kind: 'bond', element: 'lightning', partner: 'claret', reqTier: 2, user: 'rowan',
    power: 200, cost: 18, anim: 'bond', shield: 2,
    desc: 'Rowan\'s light and Claret\'s lightning meet in a single, unlikely, very loud spark.' });
  sk({ id: 'bond_caspian', name: 'Kindled Link: Caspian', kind: 'bond', element: 'light', partner: 'caspian', reqTier: 2, user: 'rowan',
    power: 200, cost: 18, anim: 'bond', shield: 2,
    desc: 'A shield of light and a lantern of trust: Caspian steps in, Rowan steps forward, and the foe finds no gap.' });
  sk({ id: 'bond_rook', name: 'Kindled Link: Rook', kind: 'bond', element: 'wind', partner: 'rook', reqTier: 2, user: 'rowan',
    power: 200, cost: 18, anim: 'bond', shield: 2,
    desc: 'A wind of coin and candle that spins them both into the same grin. Rook insists he planned it.' });
  sk({ id: 'bond_seraphine', name: 'Kindled Link: Seraphine', kind: 'bond', element: 'light', target: 'all_enemies', partner: 'seraphine', reqTier: 2, user: 'rowan',
    power: 150, cost: 18, anim: 'bond', shield: 2,
    desc: 'Rowan\'s spark and Sera\'s note fall together into a chord that is only half a hymn and entirely theirs.' });
  sk({ id: 'bond_wren', name: 'Kindled Link: Wren', kind: 'bond', element: 'fire', partner: 'wren', reqTier: 2, user: 'rowan',
    power: 220, cost: 18, anim: 'bond', shield: 2, hits: 1,
    desc: 'A seed of fire from Wren, a spark from Rowan, and the hedge grows a flame that does not burn anything they love.' });

  // ================================================================ ENEMY SKILLS
  // Enemy-user perspective: one_enemy = one party member, all_enemies = whole party.
  sk({ id: 'e_sticky_goo', name: 'Sticky Goo', kind: 'debuff', power: 0, target: 'one_enemy', anim: 'debuff',
    effects: [{ status: 'spddown', chance: 0.7, turns: 2, target: 'target' }], desc: 'Slimes are not known for their manners.' });
  sk({ id: 'e_screech', name: 'Sonic Screech', kind: 'elem', element: 'wind', power: 80, hits: 2, target: 'one_enemy', anim: 'wind',
    desc: 'A squeal that rattles teeth.' });
  sk({ id: 'e_gore', name: 'Gore', kind: 'phys', power: 130, anim: 'pierce', desc: 'Lowered head, flat charge.' });
  sk({ id: 'e_dim_flicker', name: 'Dim Flicker', kind: 'elem', element: 'dark', power: 110, anim: 'dark',
    effects: [{ status: 'defdown', chance: 0.4, turns: 2, target: 'target' }], desc: 'The wisp dims, and then burns colder.' });
  sk({ id: 'e_antler_charge', name: 'Antler Charge', kind: 'phys', power: 170, anim: 'pierce', desc: 'The stag remembers being a king.' });
  sk({ id: 'e_hollow_bellow', name: 'Hollow Bellow', kind: 'elem', element: 'dark', target: 'all_enemies', power: 85, anim: 'dark',
    effects: [{ status: 'atkdown', chance: 0.5, turns: 2, target: 'target' }], desc: 'A bellow with no warmth in it at all.' });
  sk({ id: 'e_gnaw', name: 'Gnaw', kind: 'phys', power: 110, anim: 'slash',
    effects: [{ status: 'poison', chance: 0.4, turns: 3, target: 'target' }], desc: 'Teeth first. Ethics later.' });
  sk({ id: 'e_scald', name: 'Scalding Hiss', kind: 'elem', element: 'fire', power: 105, anim: 'fire', desc: 'A jet of hot, sour steam.' });
  sk({ id: 'e_rust_crunch', name: 'Rusted Crunch', kind: 'phys', power: 120, anim: 'blunt', desc: 'Its claw has not been oiled since the last war.' });
  sk({ id: 'e_steam_piston', name: 'Steam Piston', kind: 'phys', power: 180, anim: 'blunt', shield: 1, desc: 'A piston the size of a barrel, with feelings.' });
  sk({ id: 'e_boiler_vent', name: 'Boiler Vent', kind: 'elem', element: 'fire', target: 'all_enemies', power: 110, anim: 'fire', desc: 'The sentinel opens every valve at once.' });
  sk({ id: 'e_halberd_crack', name: 'Halberd Crack', kind: 'phys', power: 115, anim: 'blunt', desc: 'A halberd butt, sharp enough to ruin a day.' });
  sk({ id: 'e_maul', name: 'Maul', kind: 'phys', power: 130, anim: 'pierce', desc: 'Teeth and momentum from a very large hound.' });
  sk({ id: 'e_howl', name: 'Arena Howl', kind: 'buff', target: 'self', anim: 'buff',
    effects: [{ status: 'atkup', chance: 1, turns: 3, target: 'self' }], desc: 'The crowd howls, and so does the hound.' });
  sk({ id: 'e_stab_and_run', name: 'Stab and Run', kind: 'phys', power: 100, anim: 'pierce', desc: 'In, out, and somewhere else before you notice.' });
  sk({ id: 'e_sand_throw', name: 'Sand in the Eyes', kind: 'elem', element: 'wind', power: 90, hits: 2, anim: 'wind',
    desc: 'A double handful of desert grit, thrown with professional malice.' });
  sk({ id: 'e_shield_rush', name: 'Shield Rush', kind: 'phys', power: 120, anim: 'blunt',
    effects: [{ status: 'defup', chance: 1, turns: 2, target: 'self' }], desc: 'A shield held high, a rush behind it.' });
  sk({ id: 'e_ember_breath', name: 'Ember Breath', kind: 'elem', element: 'fire', target: 'all_enemies', power: 90, anim: 'fire',
    desc: 'The whelp inhales, looks pleased with itself, and exhales a small sunrise.' });
  sk({ id: 'e_bone_bash', name: 'Bone Bash', kind: 'phys', power: 110, anim: 'blunt', desc: 'Old bones, rattling with purpose.' });
  sk({ id: 'e_bone_rattle', name: 'Bone Rattle', kind: 'debuff', power: 0, target: 'all_enemies', anim: 'debuff',
    effects: [{ status: 'defdown', chance: 0.6, turns: 2, target: 'target' }], desc: 'A sound that makes armor feel less certain.' });
  sk({ id: 'e_champion_cleave', name: 'Champion\'s Cleave', kind: 'phys', power: 190, anim: 'slash', shield: 2,
    desc: 'The crowd goes quiet. Then the axe goes down.' });
  sk({ id: 'e_crowd_roar', name: 'Crowd Roar', kind: 'buff', target: 'self', anim: 'buff',
    effects: [{ status: 'atkup', chance: 1, turns: 3, target: 'self' }, { status: 'defup', chance: 1, turns: 2, target: 'self' }],
    desc: 'Thirty thousand voices, all of them rooting against you.' });
  sk({ id: 'e_grave_claw', name: 'Grave Claw', kind: 'phys', power: 120, anim: 'slash',
    effects: [{ status: 'poison', chance: 0.5, turns: 3, target: 'target' }], desc: 'Cold, long nails with old earth under them.' });
  sk({ id: 'e_pale_dust', name: 'Pale Dust', kind: 'elem', element: 'ice', target: 'all_enemies', power: 95, anim: 'ice',
    effects: [{ status: 'spddown', chance: 0.5, turns: 2, target: 'target' }], desc: 'Wings shed a fine, freezing dust that settles on everything.' });
  sk({ id: 'e_root_slam', name: 'Root Slam', kind: 'phys', power: 140, anim: 'blunt', desc: 'The treant does not move. Then the ground does.' });
  sk({ id: 'e_thorn_wall', name: 'Thorn Wall', kind: 'buff', target: 'self', anim: 'buff',
    effects: [{ status: 'defup', chance: 1, turns: 3, target: 'self' }], desc: 'Bramble grows up around it, politely and sharply.' });
  sk({ id: 'e_hollow_embrace', name: 'Hollow Embrace', kind: 'elem', element: 'dark', power: 110, anim: 'dark',
    effects: [{ status: 'defdown', chance: 0.5, turns: 2, target: 'target' }], desc: 'It wants to hold you. It does not know how to stop.' });
  sk({ id: 'e_bramble_lash', name: 'Bramble Lash', kind: 'phys', target: 'all_enemies', power: 150, anim: 'pierce', desc: 'The matron\'s thorns come down like a rope bridge snapping.' });
  sk({ id: 'e_matron_bloom', name: 'Matron\'s Bloom', kind: 'heal', target: 'self', power: 120, anim: 'heal', desc: 'A flower opens on her chest and drinks the light.' });
  sk({ id: 'e_dissonant_hymn', name: 'Dissonant Hymn', kind: 'elem', element: 'dark', target: 'all_enemies', power: 100, anim: 'dark',
    effects: [{ status: 'atkdown', chance: 0.5, turns: 2, target: 'target' }], desc: 'Every note is almost right. That is the terrible part.' });
  sk({ id: 'e_hollow_harmony', name: 'Hollow Harmony', kind: 'heal', target: 'self', power: 100, anim: 'heal', desc: 'The choir hums its own wounds closed.' });
  sk({ id: 'e_ash_grasp', name: 'Ash Grasp', kind: 'elem', element: 'dark', power: 115, anim: 'dark',
    effects: [{ status: 'defdown', chance: 0.5, turns: 2, target: 'target' }], desc: 'Grey hands made of cooling ash.' });
  sk({ id: 'e_hound_bite', name: 'Hound\'s Bite', kind: 'phys', power: 110, anim: 'pierce', desc: 'Hollow hounds bite with the hollowness, too.' });
  sk({ id: 'e_hollow_howl', name: 'Hollow Howl', kind: 'debuff', power: 0, target: 'all_enemies', anim: 'debuff',
    effects: [{ status: 'atkdown', chance: 0.6, turns: 2, target: 'target' }], desc: 'A howl with no hope in it to resist.' });
  sk({ id: 'e_magma_fist', name: 'Magma Fist', kind: 'elem', element: 'fire', power: 150, anim: 'fire', desc: 'A fist that was a boulder once, and is becoming a volcano.' });
  sk({ id: 'e_cinder_quake', name: 'Cinder Quake', kind: 'phys', target: 'all_enemies', power: 90, anim: 'blunt', desc: 'The golem stamps. The road remembers.' });
  sk({ id: 'e_judgement_rod', name: 'Judgement Rod', kind: 'elem', element: 'light', power: 130, anim: 'light', desc: 'A brass rod that sees every sin and files it.' });
  sk({ id: 'e_lamp_seal', name: 'Lamp Seal', kind: 'debuff', power: 0, target: 'all_enemies', anim: 'debuff',
    effects: [{ status: 'spddown', chance: 0.6, turns: 2, target: 'target' }], desc: 'A lamp is slammed shut over the party. It is very heavy.' });
  sk({ id: 'e_hale_sword', name: 'Hale\'s Verdict', kind: 'phys', power: 170, anim: 'slash', shield: 2, desc: 'Polite. Precise. Final.' });
  sk({ id: 'e_order_decree', name: 'Order\'s Decree', kind: 'elem', element: 'light', target: 'all_enemies', power: 110, anim: 'light', desc: '"By order of the Hearth: be quiet."' });
  sk({ id: 'e_exposing_light', name: 'Exposing Light', kind: 'debuff', power: 0, target: 'all_enemies', anim: 'debuff',
    effects: [{ status: 'defdown', chance: 0.8, turns: 3, target: 'target' }], desc: 'A spotlight with no mercy in it.' });
  sk({ id: 'e_gear_slam', name: 'Gear Slam', kind: 'phys', power: 110, anim: 'blunt', desc: 'A gear the size of a cart, dropped with conviction.' });
  sk({ id: 'e_spire_beam', name: 'Spire Beam', kind: 'elem', element: 'lightning', power: 140, anim: 'lightning', desc: 'Lightning drawn down from the Spire itself.' });
  sk({ id: 'e_hollow_lance', name: 'Hollow Lance', kind: 'phys', power: 130, anim: 'pierce', desc: 'A lance that has forgotten why it was given.' });
  sk({ id: 'e_grey_oath', name: 'Grey Oath', kind: 'buff', target: 'self', anim: 'buff',
    effects: [{ status: 'defup', chance: 1, turns: 3, target: 'self' }, { status: 'atkup', chance: 1, turns: 2, target: 'self' }],
    desc: 'The knight remembers his oath, and renews it in grey.' });
  sk({ id: 'e_void_dust', name: 'Void Dust', kind: 'elem', element: 'dark', target: 'all_enemies', power: 90, anim: 'dark', desc: 'Wings like unlit lamps, scattering nothing.' });
  sk({ id: 'e_numb', name: 'Numbing Wings', kind: 'debuff', power: 0, anim: 'debuff',
    effects: [{ status: 'spddown', chance: 1, turns: 2, target: 'target' }], desc: 'A slow, dreamy flutter that makes you want to sit down.' });
  sk({ id: 'e_frost_ray', name: 'Frost Ray', kind: 'elem', element: 'ice', power: 120, anim: 'ice', desc: 'A cold, precise beam from a drone\'s lens.' });
  sk({ id: 'e_cold_ping', name: 'Cold Ping', kind: 'debuff', power: 0, anim: 'debuff',
    effects: [{ status: 'defdown', chance: 0.7, turns: 2, target: 'target' }], desc: 'A tap on the nervous system, measured to the decimal.' });
  sk({ id: 'e_grief_wave', name: 'Wave of Grief', kind: 'elem', element: 'dark', target: 'all_enemies', power: 130, anim: 'dark',
    effects: [{ status: 'atkdown', chance: 0.5, turns: 2, target: 'target' }], desc: 'Elowen does not mean to hurt you. The sorrow does it for her.' });
  sk({ id: 'e_tender_embrace', name: 'Tender Embrace', kind: 'elem', element: 'dark', power: 170, anim: 'dark',
    effects: [{ status: 'defdown', chance: 0.6, turns: 2, target: 'target' }], desc: 'Her arms are open. It is the saddest hug in Auren.' });
  sk({ id: 'e_lantern_tear', name: 'Lantern Tear', kind: 'heal', target: 'self', power: 150, anim: 'heal',
    desc: 'A tear falls, and the lantern at her heart flickers back a little.' });
  sk({ id: 'e_tithe_drain', name: 'Tithe Drain', kind: 'elem', element: 'dark', power: 150, anim: 'dark',
    effects: [{ status: 'spddown', chance: 0.5, turns: 2, target: 'target' }], desc: 'A quiet, professional siphon of warmth. Vael does not blink.' });
  sk({ id: 'e_extinguish', name: 'Extinguish', kind: 'elem', element: 'dark', target: 'all_enemies', power: 120, anim: 'dark', desc: '"Just one breath, and then it will be quiet. Mercy."' });
  sk({ id: 'e_pale_judgement', name: 'Pale Judgement', kind: 'phys', power: 170, anim: 'slash', desc: 'A silver blade with an elegant, bored swing.' });
  sk({ id: 'e_cold_piston', name: 'Cold Piston', kind: 'phys', power: 200, anim: 'blunt', shield: 2, desc: 'The engine does not care who it hits, only that it hits.' });
  sk({ id: 'e_quiet_pulse', name: 'Quiet Pulse', kind: 'elem', element: 'dark', target: 'all_enemies', power: 130, anim: 'dark', desc: 'A wave of stillness. Every wick in range dims a little.' });
  sk({ id: 'e_coolant_blast', name: 'Coolant Blast', kind: 'elem', element: 'ice', target: 'all_enemies', power: 150, anim: 'ice', desc: 'Liquid cold, blasted at pressure.' });
  sk({ id: 'e_engine_repair', name: 'Self-Repair', kind: 'heal', target: 'self', power: 130, anim: 'heal', desc: 'Brass plates shift back into place with a satisfied clank.' });

  D.skills = SKILLS;

  // ================================================================ ENEMIES
  const ENEMIES = {};
  function en(o) {
    const e = Object.assign({ sprite: o.id, boss: false, scale: 1, resist: [], shields: 2, steal: [], drops: [], gold: 5, exp: 5, skills: [] }, o);
    ENEMIES[e.id] = e;
    return e;
  }
  const ST = (patk, pdef, eatk, edef, spd, crit, eva) => ({ patk, pdef, eatk, edef, spd, crit, eva });

  // -- Wood (lv 2-5, boss stag 6)
  en({ id: 'moss_slime', name: 'Moss Slime', level: 2, hp: 105, shields: 2, weak: ['fire', 'sword'], resist: ['ice'],
    stats: ST(10, 4, 6, 4, 6, 2, 2), skills: [{ skill: 'e_sticky_goo', weight: 2 }], exp: 4, gold: 4,
    drops: [{ item: 'potion', chance: 0.12 }, { item: 'wild_honey', chance: 0.03 }], steal: [{ item: 'potion', chance: 0.25 }] });
  en({ id: 'forest_bat', name: 'Forest Bat', level: 3, hp: 40, shields: 2, weak: ['wind', 'bow'],
    stats: ST(11, 3, 4, 3, 14, 4, 16), skills: [{ skill: 'e_screech', weight: 3 }], exp: 5, gold: 4,
    drops: [{ item: 'potion', chance: 0.1 }], steal: [{ item: 'ether', chance: 0.15 }] });
  en({ id: 'thorn_boar', name: 'Thorn Boar', level: 4, hp: 90, shields: 2, weak: ['fire', 'axe'], resist: ['wind'],
    stats: ST(12, 8, 3, 5, 8, 4, 3), skills: [{ skill: 'e_gore', weight: 3 }], exp: 6, gold: 6,
    drops: [{ item: 'pressed_flower', chance: 0.05 }, { item: 'potion', chance: 0.15 }], steal: [{ item: 'potion', chance: 0.3 }] });
  en({ id: 'hollow_wisp', name: 'Hollow Wisp', level: 5, hp: 40, shields: 2, weak: ['light', 'fire'], resist: ['dark'],
    stats: ST(17, 6, 16, 10, 12, 3, 12), skills: [{ skill: 'e_dim_flicker', weight: 3 }], exp: 8, gold: 6,
    drops: [{ item: 'ether', chance: 0.12 }], steal: [{ item: 'ether', chance: 0.3 }] });
  en({ id: 'hollow_stag', name: 'Hollow Stag', level: 6, hp: 220, shields: 4, weak: ['light', 'fire', 'spear'], resist: ['dark'], boss: true,
    stats: ST(10, 14, 14, 12, 13, 6, 6), skills: [{ skill: 'e_antler_charge', weight: 3 }, { skill: 'e_hollow_bellow', weight: 2 }], exp: 30, gold: 60,
    drops: [{ item: 'hi_potion', chance: 1 }, { item: 'ribbon', chance: 0.5 }], steal: [{ item: 'hi_potion', chance: 0.3 }] });

  // -- City & Undercroft (lv 6-10, boss sentinel 11)
  en({ id: 'cog_rat', name: 'Cog Rat', level: 6, hp: 145, shields: 2, weak: ['lightning', 'dagger'],
    stats: ST(21, 12, 8, 10, 14, 6, 10), skills: [{ skill: 'e_gnaw', weight: 3 }], exp: 10, gold: 14,
    drops: [{ item: 'brass_cog', chance: 0.25 }, { item: 'potion', chance: 0.1 }], steal: [{ item: 'brass_cog', chance: 0.3 }] });
  en({ id: 'steam_sprite', name: 'Steam Sprite', level: 7, hp: 260, shields: 2, weak: ['ice', 'staff'], resist: ['fire'],
    stats: ST(34, 10, 24, 16, 13, 3, 14), skills: [{ skill: 'e_scald', weight: 3 }], exp: 11, gold: 15,
    drops: [{ item: 'ether', chance: 0.15 }], steal: [{ item: 'ether', chance: 0.2 }] });
  en({ id: 'rust_bot', name: 'Rust Bot', level: 8, hp: 270, shields: 3, weak: ['lightning', 'axe'], resist: ['ice'],
    stats: ST(36, 20, 6, 12, 9, 4, 4), skills: [{ skill: 'e_rust_crunch', weight: 3 }], exp: 13, gold: 20,
    drops: [{ item: 'brass_cog', chance: 0.3 }, { item: 'whetstone', chance: 0.1 }], steal: [{ item: 'brass_cog', chance: 0.25 }] });
  en({ id: 'order_guard', name: 'Order Guard', level: 7, hp: 230, shields: 3, weak: ['fire', 'spear'], resist: ['dark'],
    stats: ST(27, 22, 6, 12, 10, 5, 5), skills: [{ skill: 'e_halberd_crack', weight: 3 }], exp: 12, gold: 22,
    drops: [{ item: 'potion', chance: 0.3 }, { item: 'mail_1', chance: 0.05 }], steal: [{ item: 'hi_potion', chance: 0.15 }] });
  en({ id: 'brass_sentinel', name: 'Brass Sentinel', level: 11, hp: 800, shields: 5, weak: ['lightning', 'axe'], resist: ['fire'], boss: true,
    stats: ST(33, 26, 18, 20, 12, 4, 2), skills: [{ skill: 'e_steam_piston', weight: 3 }, { skill: 'e_boiler_vent', weight: 2 }], exp: 81, gold: 150,
    drops: [{ item: 'hi_potion', chance: 1 }, { item: 'axe_2', chance: 0.5 }, { item: 'brass_cog', chance: 1 }], steal: [{ item: 'hi_potion', chance: 0.3 }] });

  // -- Arena & Aqueduct (lv 11-16, boss champion 17)
  en({ id: 'arena_hound', name: 'Arena Hound', level: 12, hp: 270, shields: 3, weak: ['fire', 'bow'],
    stats: ST(35, 24, 10, 16, 17, 8, 8), skills: [{ skill: 'e_maul', weight: 3 }, { skill: 'e_howl', weight: 1 }], exp: 32, gold: 40,
    drops: [{ item: 'potion', chance: 0.2 }, { item: 'sweet_bun', chance: 0.05 }], steal: [{ item: 'hi_potion', chance: 0.2 }] });
  en({ id: 'sand_bandit', name: 'Sand Bandit', level: 12, hp: 300, shields: 2, weak: ['wind', 'dagger'], resist: ['fire'],
    stats: ST(38, 20, 8, 14, 17, 12, 14), skills: [{ skill: 'e_stab_and_run', weight: 3 }, { skill: 'e_sand_throw', weight: 2 }], exp: 32, gold: 45,
    drops: [{ item: 'lucky_coin', chance: 0.05 }, { item: 'hi_potion', chance: 0.1 }], steal: [{ item: 'ether', chance: 0.3 }, { item: 'lucky_coin', chance: 0.1 }] });
  en({ id: 'gladiator_recruit', name: 'Gladiator Recruit', level: 13, hp: 390, shields: 3, weak: ['axe', 'spear'],
    stats: ST(46, 26, 6, 14, 12, 6, 5), skills: [{ skill: 'e_shield_rush', weight: 3 }], exp: 35, gold: 50,
    drops: [{ item: 'hi_potion', chance: 0.15 }, { item: 'spear_2', chance: 0.04 }], steal: [{ item: 'hi_potion', chance: 0.2 }] });
  en({ id: 'drake_whelp', name: 'Drake Whelp', level: 13, hp: 410, shields: 3, weak: ['ice', 'spear'], resist: ['fire'],
    stats: ST(46, 20, 28, 18, 15, 5, 8), skills: [{ skill: 'e_ember_breath', weight: 3 }], exp: 35, gold: 55,
    drops: [{ item: 'hi_potion', chance: 0.2 }, { item: 'charm_ember', chance: 0.03 }], steal: [{ item: 'ember_wine', chance: 0.05 }] });
  en({ id: 'catacomb_skeleton', name: 'Catacomb Skeleton', level: 14, hp: 300, shields: 3, weak: ['light', 'axe'], resist: ['dark'],
    stats: ST(35, 22, 4, 12, 11, 4, 6), skills: [{ skill: 'e_bone_bash', weight: 3 }, { skill: 'e_bone_rattle', weight: 1 }], exp: 33, gold: 45,
    drops: [{ item: 'antidote', chance: 0.2 }, { item: 'old_book', chance: 0.05 }], steal: [{ item: 'antidote', chance: 0.25 }] });
  en({ id: 'gladius_champion', name: 'Gladius Champion', level: 17, hp: 2570, shields: 6, weak: ['wind', 'spear'], resist: ['fire'], boss: true,
    stats: ST(66, 38, 10, 26, 16, 10, 6), skills: [{ skill: 'e_champion_cleave', weight: 3 }, { skill: 'e_crowd_roar', weight: 2 }], exp: 150, gold: 300,
    drops: [{ item: 'phoenix_down', chance: 0.5 }, { item: 'spear_3', chance: 0.2 }, { item: 'ember_wine', chance: 0.5 }], steal: [{ item: 'hi_potion', chance: 0.4 }] });

  // -- Crypt & Whisperwood (lv 15-20, bosses choir 20 / matron 22)
  en({ id: 'crypt_ghoul', name: 'Crypt Ghoul', level: 16, hp: 730, shields: 3, weak: ['light', 'fire'], resist: ['dark'],
    stats: ST(62, 30, 20, 24, 14, 6, 6), skills: [{ skill: 'e_grave_claw', weight: 3 }], exp: 54, gold: 90,
    drops: [{ item: 'hi_potion', chance: 0.25 }, { item: 'antidote', chance: 0.2 }, { item: 'moonpetal', chance: 0.05 }], steal: [{ item: 'antidote', chance: 0.3 }] });
  en({ id: 'pale_moth', name: 'Pale Moth', level: 16, hp: 530, shields: 2, weak: ['fire', 'wind'], resist: ['ice'],
    stats: ST(55, 24, 40, 28, 19, 5, 20), skills: [{ skill: 'e_pale_dust', weight: 3 }], exp: 54, gold: 85,
    drops: [{ item: 'feather_quill', chance: 0.08 }, { item: 'ether', chance: 0.3 }], steal: [{ item: 'hi_ether', chance: 0.15 }] });
  en({ id: 'briar_treant', name: 'Briar Treant', level: 17, hp: 890, shields: 3, weak: ['fire', 'axe'], resist: ['wind'],
    stats: ST(69, 40, 16, 30, 9, 4, 2), skills: [{ skill: 'e_root_slam', weight: 3 }, { skill: 'e_thorn_wall', weight: 1 }], exp: 58, gold: 95,
    drops: [{ item: 'pressed_flower', chance: 0.3 }, { item: 'hi_potion', chance: 0.25 }], steal: [{ item: 'wild_honey', chance: 0.2 }] });
  en({ id: 'hollow_husk', name: 'Hollow Husk', level: 17, hp: 530, shields: 3, weak: ['light', 'staff'], resist: ['dark'],
    stats: ST(50, 28, 34, 26, 14, 5, 6), skills: [{ skill: 'e_hollow_embrace', weight: 3 }], exp: 58, gold: 90,
    drops: [{ item: 'hi_ether', chance: 0.15 }, { item: 'lavender_sachet', chance: 0.08 }], steal: [{ item: 'hi_potion', chance: 0.2 }] });
  en({ id: 'hollow_choir', name: 'Hollow Choir', level: 20, hp: 2190, shields: 6, weak: ['light', 'staff'], resist: ['dark'], boss: true,
    stats: ST(62, 32, 52, 38, 18, 8, 10), skills: [{ skill: 'e_dissonant_hymn', weight: 3 }, { skill: 'e_hollow_harmony', weight: 2 }], exp: 150, gold: 400,
    drops: [{ item: 'hi_ether', chance: 1 }, { item: 'silver_locket', chance: 0.5 }, { item: 'star_chart', chance: 0.2 }], steal: [{ item: 'hi_ether', chance: 0.3 }] });
  en({ id: 'briar_matron', name: 'Briar Matron', level: 22, hp: 2700, shields: 5, weak: ['fire', 'axe'], resist: ['wind'], boss: true,
    stats: ST(70, 36, 44, 34, 16, 8, 8), skills: [{ skill: 'e_bramble_lash', weight: 3 }, { skill: 'e_matron_bloom', weight: 2 }], exp: 180, gold: 450,
    drops: [{ item: 'elixir', chance: 0.5 }, { item: 'ribbon', chance: 1 }], steal: [{ item: 'moonpetal', chance: 0.2 }] });

  // -- Ashen Road (lv 20-25, boss Hale 26)
  en({ id: 'ash_wraith', name: 'Ash Wraith', level: 21, hp: 840, shields: 3, weak: ['light', 'fire'], resist: ['dark'],
    stats: ST(75, 36, 50, 36, 18, 8, 14), skills: [{ skill: 'e_ash_grasp', weight: 3 }], exp: 91, gold: 130,
    drops: [{ item: 'hi_ether', chance: 0.2 }, { item: 'lavender_sachet', chance: 0.05 }], steal: [{ item: 'hi_ether', chance: 0.2 }] });
  en({ id: 'hollow_hound', name: 'Hollow Hound', level: 21, hp: 640, shields: 3, weak: ['ice', 'bow'], resist: ['dark'],
    stats: ST(61, 34, 20, 26, 20, 10, 10), skills: [{ skill: 'e_hound_bite', weight: 3 }, { skill: 'e_hollow_howl', weight: 2 }], exp: 91, gold: 120,
    drops: [{ item: 'hi_potion', chance: 0.25 }, { item: 'sweet_bun', chance: 0.1 }], steal: [{ item: 'hi_potion', chance: 0.2 }] });
  en({ id: 'cinder_golem', name: 'Cinder Golem', level: 22, hp: 1170, shields: 3, weak: ['ice', 'spear'], resist: ['fire'],
    stats: ST(93, 44, 30, 34, 12, 6, 2), skills: [{ skill: 'e_magma_fist', weight: 3 }, { skill: 'e_cinder_quake', weight: 2 }], exp: 100, gold: 150,
    drops: [{ item: 'hi_ether', chance: 0.2 }, { item: 'spear_3', chance: 0.04 }], steal: [{ item: 'hi_potion', chance: 0.25 }] });
  en({ id: 'order_inquisitor', name: 'Order Inquisitor', level: 23, hp: 620, shields: 3, weak: ['light', 'sword'], resist: ['dark'],
    stats: ST(84, 38, 44, 38, 18, 8, 8), skills: [{ skill: 'e_judgement_rod', weight: 3 }, { skill: 'e_lamp_seal', weight: 2 }], exp: 109, gold: 160,
    drops: [{ item: 'sword_3', chance: 0.05 }, { item: 'hi_potion', chance: 0.2 }], steal: [{ item: 'hi_ether', chance: 0.15 }] });
  en({ id: 'inquisitor_hale', name: 'Inquisitor Hale', level: 26, hp: 3020, shields: 7, weak: ['lightning', 'sword'], resist: ['light'], boss: true,
    stats: ST(74, 50, 52, 46, 20, 12, 10), skills: [{ skill: 'e_hale_sword', weight: 3 }, { skill: 'e_order_decree', weight: 2 }, { skill: 'e_exposing_light', weight: 2 }], exp: 415, gold: 600,
    drops: [{ item: 'hi_ether', chance: 1 }, { item: 'sword_3', chance: 0.4 }, { item: 'robe_3', chance: 0.3 }], steal: [{ item: 'elixir', chance: 0.1 }] });

  // -- Hearth Spire (lv 25-30, bosses Elowen 31, Vael 33, Cold Engine 35)
  en({ id: 'spire_sentinel', name: 'Spire Sentinel', level: 26, hp: 1150, shields: 3, weak: ['lightning', 'spear'], resist: ['wind'],
    stats: ST(98, 50, 40, 44, 16, 5, 3), skills: [{ skill: 'e_gear_slam', weight: 3 }, { skill: 'e_spire_beam', weight: 2 }], exp: 138, gold: 220,
    drops: [{ item: 'hi_ether', chance: 0.25 }, { item: 'mail_3', chance: 0.1 }], steal: [{ item: 'hi_potion', chance: 0.2 }] });
  en({ id: 'hollow_knight', name: 'Hollow Knight', level: 27, hp: 810, shields: 3, weak: ['fire', 'light'], resist: ['dark'],
    stats: ST(72, 48, 36, 44, 18, 7, 6), skills: [{ skill: 'e_hollow_lance', weight: 3 }, { skill: 'e_grey_oath', weight: 1 }], exp: 149, gold: 230,
    drops: [{ item: 'elixir', chance: 0.05 }, { item: 'vest_3', chance: 0.1 }], steal: [{ item: 'hi_potion', chance: 0.2 }] });
  en({ id: 'void_moth', name: 'Void Moth', level: 27, hp: 690, shields: 3, weak: ['light', 'wind'], resist: ['dark'],
    stats: ST(78, 36, 70, 50, 24, 8, 24), skills: [{ skill: 'e_void_dust', weight: 3 }, { skill: 'e_numb', weight: 2 }], exp: 149, gold: 210,
    drops: [{ item: 'feather_quill', chance: 0.1 }, { item: 'hi_ether', chance: 0.25 }], steal: [{ item: 'hi_ether', chance: 0.2 }] });
  en({ id: 'cold_drone', name: 'Cold Drone', level: 27, hp: 850, shields: 3, weak: ['fire', 'lightning'], resist: ['ice'],
    stats: ST(77, 52, 58, 46, 22, 6, 6), skills: [{ skill: 'e_frost_ray', weight: 3 }, { skill: 'e_cold_ping', weight: 2 }], exp: 149, gold: 220,
    drops: [{ item: 'brass_cog', chance: 0.3 }, { item: 'hi_ether', chance: 0.2 }], steal: [{ item: 'hi_potion', chance: 0.25 }] });
  en({ id: 'hollow_elowen', name: 'Hollow Elowen', level: 31, hp: 4930, shields: 8, weak: ['light', 'fire'], resist: ['dark'], boss: true,
    stats: ST(124, 58, 78, 62, 22, 10, 12), skills: [{ skill: 'e_grief_wave', weight: 3 }, { skill: 'e_tender_embrace', weight: 3 }, { skill: 'e_lantern_tear', weight: 2 }], exp: 586, gold: 900,
    drops: [{ item: 'phoenix_down', chance: 1 }, { item: 'ribbon', chance: 0.5 }], steal: [{ item: 'elixir', chance: 0.1 }] });
  en({ id: 'warden_vael', name: 'Warden Ignatius Vael', level: 33, hp: 4680, shields: 8, weak: ['lightning', 'spear'], resist: ['light'], boss: true,
    stats: ST(124, 60, 82, 64, 24, 10, 12), skills: [{ skill: 'e_tithe_drain', weight: 3 }, { skill: 'e_extinguish', weight: 2 }, { skill: 'e_pale_judgement', weight: 2 }], exp: 662, gold: 1000,
    drops: [{ item: 'elixir', chance: 1 }, { item: 'star_chart', chance: 0.5 }], steal: [{ item: 'elixir', chance: 0.1 }] });
  en({ id: 'vael_cold_engine', name: 'Cold Engine', level: 35, hp: 5130, shields: 8, weak: ['fire', 'axe'], resist: ['ice'], boss: true,
    stats: ST(124, 72, 60, 50, 18, 4, 2), skills: [{ skill: 'e_cold_piston', weight: 3 }, { skill: 'e_quiet_pulse', weight: 2 }, { skill: 'e_coolant_blast', weight: 2 }, { skill: 'e_engine_repair', weight: 1 }], exp: 744, gold: 1200,
    drops: [{ item: 'phoenix_down', chance: 0.5 }, { item: 'charm_guard', chance: 0.5 }], steal: [{ item: 'elixir', chance: 0.1 }] });

  D.enemies = ENEMIES;

  // ================================================================ TROOPS
  const TROOPS = {};
  function tr(id, enemies, bg, bgm) { TROOPS[id] = { id, enemies, bg, bgm: bgm || 'battle' }; }
  tr('tutorial', ['moss_slime'], 'forest');
  tr('wood_1', ['moss_slime', 'moss_slime'], 'forest');
  tr('wood_2', ['forest_bat', 'forest_bat', 'forest_bat'], 'forest');
  tr('wood_3', ['thorn_boar', 'moss_slime'], 'forest');
  tr('wood_4', ['hollow_wisp', 'hollow_wisp', 'forest_bat'], 'forest');
  tr('boss_stag', ['hollow_stag', 'hollow_wisp', 'hollow_wisp'], 'forest', 'boss');
  tr('city_1', ['order_guard', 'order_guard'], 'city');
  tr('city_2', ['cog_rat', 'cog_rat', 'cog_rat'], 'city');
  tr('city_3', ['rust_bot', 'cog_rat', 'cog_rat'], 'city');
  tr('under_1', ['cog_rat', 'cog_rat', 'steam_sprite'], 'steam');
  tr('under_2', ['rust_bot', 'rust_bot'], 'steam');
  tr('under_3', ['steam_sprite', 'steam_sprite', 'rust_bot'], 'steam');
  tr('under_4', ['order_guard', 'rust_bot', 'cog_rat'], 'steam');
  tr('boss_sentinel', ['brass_sentinel', 'cog_rat', 'cog_rat'], 'steam', 'boss');
  tr('aq_1', ['drake_whelp', 'drake_whelp'], 'cave');
  tr('aq_2', ['catacomb_skeleton', 'catacomb_skeleton', 'catacomb_skeleton'], 'cave');
  tr('aq_3', ['sand_bandit', 'sand_bandit', 'arena_hound'], 'cave');
  tr('aq_4', ['drake_whelp', 'catacomb_skeleton', 'catacomb_skeleton'], 'cave');
  tr('arena_1', ['gladiator_recruit', 'gladiator_recruit'], 'arena');
  tr('arena_2', ['arena_hound', 'arena_hound', 'gladiator_recruit'], 'arena');
  tr('arena_3', ['sand_bandit', 'sand_bandit', 'sand_bandit'], 'arena');
  tr('boss_champion', ['gladius_champion', 'gladiator_recruit', 'gladiator_recruit'], 'arena', 'boss');
  tr('crypt_1', ['crypt_ghoul', 'crypt_ghoul'], 'crypt');
  tr('crypt_2', ['pale_moth', 'pale_moth', 'pale_moth'], 'crypt');
  tr('crypt_3', ['crypt_ghoul', 'hollow_husk', 'hollow_husk'], 'crypt');
  tr('crypt_4', ['pale_moth', 'pale_moth', 'crypt_ghoul'], 'crypt');
  tr('boss_choir', ['hollow_choir', 'pale_moth', 'pale_moth'], 'crypt', 'boss');
  tr('ww_1', ['briar_treant', 'pale_moth'], 'witchwood');
  tr('ww_2', ['hollow_husk', 'hollow_husk', 'hollow_husk'], 'witchwood');
  tr('ww_3', ['pale_moth', 'pale_moth', 'hollow_wisp', 'hollow_wisp'], 'witchwood');
  tr('ww_4', ['briar_treant', 'briar_treant'], 'witchwood');
  tr('boss_matron', ['briar_matron', 'hollow_wisp', 'hollow_wisp'], 'witchwood', 'boss');
  tr('ash_1', ['ash_wraith', 'ash_wraith'], 'road');
  tr('ash_2', ['hollow_hound', 'hollow_hound', 'hollow_hound'], 'road');
  tr('ash_3', ['cinder_golem', 'ash_wraith'], 'road');
  tr('ash_4', ['order_inquisitor', 'hollow_hound', 'hollow_hound'], 'road');
  tr('boss_hale', ['inquisitor_hale', 'order_inquisitor', 'order_inquisitor'], 'road', 'boss');
  tr('spire_1', ['spire_sentinel', 'spire_sentinel'], 'spire');
  tr('spire_2', ['hollow_knight', 'hollow_knight', 'void_moth'], 'spire');
  tr('spire_3', ['cold_drone', 'cold_drone', 'cold_drone'], 'spire');
  tr('spire_4', ['hollow_knight', 'spire_sentinel', 'void_moth'], 'spire');
  tr('spire_5', ['void_moth', 'void_moth', 'void_moth'], 'spire');
  tr('boss_elowen', ['hollow_elowen'], 'spire', 'boss');
  tr('boss_vael1', ['warden_vael'], 'chamber', 'finalboss');
  tr('boss_vael2', ['vael_cold_engine'], 'chamber', 'finalboss');
  D.troops = TROOPS;

  // ================================================================ ITEMS
  const ITEMS = {};
  function it(o) {
    const x = Object.assign({ desc: '', type: 'consumable', price: 0, effect: null, use: null, weaponType: null, slot: null, stats: null, usable: null, armorClass: null }, o);
    ITEMS[x.id] = x;
    return x;
  }

  // -- Consumables
  it({ id: 'potion', name: 'Warm Tonic', desc: 'Heals 120 HP. Tastes of honey and regret.', price: 30, effect: { hp: 120 }, use: 'both' });
  it({ id: 'hi_potion', name: 'Hearthbrew', desc: 'Heals 350 HP. Brewed in a kettle the size of a bathtub.', price: 120, effect: { hp: 350 }, use: 'both' });
  it({ id: 'ether', name: 'Wick Oil', desc: 'Restores 40 SP. Keeps the spirit lamp burning.', price: 80, effect: { sp: 40 }, use: 'both' });
  it({ id: 'hi_ether', name: 'Kindling Oil', desc: 'Restores 100 SP. Smells of cedar and a good decision.', price: 240, effect: { sp: 100 }, use: 'both' });
  it({ id: 'elixir', name: 'Hearthstar Draught', desc: 'Fully restores HP and SP. A sip of the star itself.', price: 800, effect: { hp: 9999, sp: 9999 }, use: 'both' });
  it({ id: 'phoenix_down', name: 'Phoenix Ash', desc: 'Revives a fallen ally with half their max HP.', price: 150, effect: { revive: 0.5 }, use: 'both' });
  it({ id: 'smelling_salts', name: 'Smelling Salts', desc: 'Wakes a sleeping ally. Also wakes you, in a hurry.', price: 40, effect: { cure: ['sleep'] }, use: 'battle' });
  it({ id: 'antidote', name: 'Clear Tincture', desc: 'Cures poison. Bitter enough to cure anything, for a moment.', price: 40, effect: { cure: ['poison'] }, use: 'battle' });
  it({ id: 'bp_tonic', name: 'Spirit Tonic', desc: 'Gives one ally +1 BP in battle. Smells of mint and bravado.', price: 300, effect: { bp: 1 }, use: 'battle' });

  // -- Gifts (romance). Price drives nothing but sale value.
  const gift = (id, name, price, desc) => it({ id, name, desc, type: 'gift', price, use: null });
  gift('wild_honey', 'Wild Honey', 60, 'Golden and slow. From a hive that is far too close to the Whisperwood.');
  gift('brass_cog', 'Brass Cog', 80, 'Warm from a pocket. Perfectly machined. Slightly bent by someone who cared.');
  gift('silver_locket', 'Silver Locket', 240, 'Empty inside, for now. Someone always wants to fill one.');
  gift('old_book', 'Old Book', 120, 'A cracked, faded volume of poetry about lighthouses.');
  gift('lavender_sachet', 'Lavender Sachet', 50, 'A little pouch that makes a dull room feel like a garden.');
  gift('ember_wine', 'Ember Wine', 150, 'Red, peppery and dangerously warm. Do not drink it on a ship.');
  gift('star_chart', 'Star Chart', 200, 'Hand-drawn constellations, annotated with a lot of opinions.');
  gift('ribbon', 'Silk Ribbon', 70, 'Soft, bright and very much the wrong color for a battlefield.');
  gift('whetstone', 'Whetstone', 90, 'Honed to a hungry edge. A thoughtful, slightly dangerous present.');
  gift('moonpetal', 'Moonpetal', 180, 'A silver flower that opens only at night. It hums very quietly.');
  gift('sweet_bun', 'Sweet Bun', 40, 'Warm, sugared, and still in the paper. A perfectly honest gift.');
  gift('music_box', 'Music Box', 380, 'A tiny brass cylinder that plays a hymn no one remembers the name of.');
  gift('pressed_flower', 'Pressed Flower', 45, 'A wildflower, pressed flat between two pages of an unfinished letter.');
  gift('lucky_coin', 'Lucky Coin', 110, 'Worn smooth on one side by a thumb that never lost a bet.');
  gift('rare_tea', 'Rare Tea', 130, 'Leaves picked at dawn from a garden that is not supposed to exist.');
  gift('feather_quill', 'Feather Quill', 110, 'A long, pale feather that writes in an ink of its own.');

  // -- Key items (unsellable, story-only)
  const key = (id, name, desc) => it({ id, name, desc, type: 'key', price: 0, use: null });
  key('ember_compass', 'Ember Compass', 'Maren\'s gift. The needle points toward warmth, and warmth points toward you.');
  key('aether_coil', 'Aether Coil', 'A humming coil pulled from the Order\'s bots. Marigold can fly again.');
  key('gladius_pass', 'Gladius Pass', 'A gold-edged arena pass, stamped with a grey lion.');
  key('abbey_seal', 'Abbey Seal', 'The seal of the Pale Choir. It opens doors that want to be opened.');
  key('witchwood_charm', 'Witchwood Charm', 'A sprig of living wood. Keeps the Hollow politely out of the garden.');
  key('lantern_token', 'Lantern Token', 'A brass token stamped with the Lamplighters\' sun.');
  key('lampwright_notes', 'Lampwright\'s Notes', 'Faded notes on kindling. One line is underlined so hard the paper has torn.');
  key('spire_key', 'Spire Key', 'Iron and warm brass. It opens the upper door of the Hearth Spire.');

  // -- Accessories
  it({ id: 'charm_ember', name: 'Ember Charm', type: 'accessory', slot: 'accessory', price: 260, stats: { eatk: 8, sp: 10 },
    desc: 'A warm coal on a cord. Spells sting a little more.' });
  it({ id: 'charm_swift', name: 'Swift Charm', type: 'accessory', slot: 'accessory', price: 240, stats: { spd: 4, eva: 4 },
    desc: 'A small silver wing. It does not fly, but it wants to.' });
  it({ id: 'charm_guard', name: 'Guardian Charm', type: 'accessory', slot: 'accessory', price: 300, stats: { hp: 40, pdef: 6, edef: 6 },
    desc: 'Carved from driftwood by a patient hand. It has opinions about being hit.' });
  it({ id: 'charm_focus', name: 'Focus Charm', type: 'accessory', slot: 'accessory', price: 280, stats: { sp: 20, crit: 5 },
    desc: 'A crystal bead that makes the world hold still for a moment.' });
  it({ id: 'charm_luck', name: 'Lucky Charm', type: 'accessory', slot: 'accessory', price: 220, stats: { patk: 3, crit: 6, eva: 3 },
    desc: 'It is not magic. It is just very, very lucky. Rook swears by it.' });
  it({ id: 'ring_bond', name: 'Ring of Bonds', type: 'accessory', slot: 'accessory', price: 500, stats: { hp: 20, sp: 15, edef: 3 },
    desc: 'Two bands, one wire. It settles a little warmer when someone stands beside you.' });

  // -- Equipment (generated tiers 1-4)
  const TIER_PRICE = { weapon: [90, 300, 850, 2100], armor: [80, 260, 760, 1900] };
  const WEAPONS = {
    sword: { names: ['Iron Sword', 'Lampsteel Sword', 'Oathbrand', 'Hearthstar Blade'], stats: [{ patk: 6 }, { patk: 12 }, { patk: 20 }, { patk: 30 }],
      desc: 'A straight, honest blade.' },
    spear: { names: ['Tin Spear', 'Brass-Tipped Spear', 'Arc-Lance', 'Tempest Arc-Lance'], stats: [{ patk: 5, pdef: 1 }, { patk: 11, pdef: 1 }, { patk: 19, pdef: 2 }, { patk: 28, pdef: 3 }],
      desc: 'Long reach, longer memory.' },
    dagger: { names: ['Sharpened Knife', 'Lucky Stiletto', 'Gambler\'s Blade', 'Ace of Knives'], stats: [{ patk: 4, crit: 4, spd: 1 }, { patk: 9, crit: 6, spd: 2 }, { patk: 15, crit: 9, spd: 3 }, { patk: 22, crit: 12, spd: 4 }],
      desc: 'Quick, quiet, and a little bit smug.' },
    axe: { names: ['Hand Axe', 'Spanner-Axe', 'Boiler Cleaver', 'Steam-Hammer Axe'], stats: [{ patk: 8, spd: -1 }, { patk: 15, spd: -1 }, { patk: 24, spd: -2 }, { patk: 34, spd: -3 }],
      desc: 'Heavy, rude and extremely effective.' },
    bow: { names: ['Short Bow', 'Hedge Longbow', 'Witchwood Bow', 'Moonstring Bow'], stats: [{ patk: 4, spd: 1, eva: 2 }, { patk: 9, spd: 2, eva: 3 }, { patk: 15, spd: 3, eva: 4 }, { patk: 22, spd: 4, eva: 6 }],
      desc: 'Quiet on the draw, loud about being right.' },
    staff: { names: ['Oak Staff', 'Hymnwood Staff', 'Choir Staff', 'Hearthstar Staff'], stats: [{ patk: 3, eatk: 8, sp: 4 }, { patk: 6, eatk: 16, sp: 8 }, { patk: 10, eatk: 26, sp: 12 }, { patk: 14, eatk: 36, sp: 16 }],
      desc: 'Carved for spells, and surprisingly good at hitting things.' },
  };
  Object.keys(WEAPONS).forEach((wt) => {
    const W = WEAPONS[wt];
    for (let t = 1; t <= 4; t++) {
      it({ id: wt + '_' + t, name: W.names[t - 1], type: 'weapon', slot: 'weapon', weaponType: wt, price: TIER_PRICE.weapon[t - 1],
        stats: W.stats[t - 1], desc: W.desc + (t === 4 ? ' Tier IV.' : '') });
    }
  });
  const ARMORS = {
    vest: { names: ['Leather Vest', 'Reinforced Vest', 'Aviator\'s Vest', 'Storm-Stitched Vest'], usable: ['rowan', 'claret', 'rook'],
      stats: [{ pdef: 3, eva: 1 }, { pdef: 7, eva: 2 }, { pdef: 12, eva: 3 }, { pdef: 18, eva: 4 }], desc: 'Light, buckled, with plenty of pockets.' },
    mail: { names: ['Chain Mail', 'Lantern Plate', 'Knight-Lantern Mail', 'Grey Lion Plate'], usable: ['claret', 'caspian'],
      stats: [{ pdef: 6, hp: 10, spd: -1 }, { pdef: 12, hp: 25, spd: -1 }, { pdef: 20, hp: 45, spd: -2 }, { pdef: 30, hp: 70, spd: -2 }], desc: 'Heavy plates. Loud. Reassuring.' },
    robe: { names: ['Pilgrim Robe', 'Hymn Robe', 'Hedge Robe', 'Lampwright\'s Robe'], usable: ['rowan', 'seraphine', 'wren'],
      stats: [{ edef: 3, eatk: 1, sp: 5 }, { edef: 7, eatk: 3, sp: 10 }, { edef: 12, eatk: 5, sp: 18 }, { edef: 18, eatk: 8, sp: 25 }], desc: 'Cloth stitched with prayers and burr-thorn.' },
  };
  Object.keys(ARMORS).forEach((cls) => {
    const A = ARMORS[cls];
    for (let t = 1; t <= 4; t++) {
      it({ id: cls + '_' + t, name: A.names[t - 1], type: 'armor', slot: 'armor', armorClass: cls, usable: A.usable.slice(),
        price: TIER_PRICE.armor[t - 1], stats: A.stats[t - 1], desc: A.desc + (t === 4 ? ' Tier IV.' : '') });
    }
  });
  D.items = ITEMS;

  // ================================================================ SHOPS
  const SHOPS = {};
  function shop(id, name, stock) { SHOPS[id] = { id, name, stock }; }
  shop('wickholm_shop', 'Wickholm Sundries', ['potion', 'ether', 'antidote', 'smelling_salts', 'sword_1', 'staff_1', 'vest_1', 'robe_1', 'wild_honey', 'pressed_flower', 'sweet_bun']);
  shop('brasshaven_shop', 'Brasshaven Provisions', ['potion', 'hi_potion', 'ether', 'antidote', 'smelling_salts', 'phoenix_down', 'bp_tonic', 'brass_cog', 'whetstone', 'ribbon', 'sweet_bun']);
  shop('brasshaven_smith', 'Tallow & Steel', ['dagger_1', 'spear_1', 'axe_1', 'bow_1', 'sword_2', 'spear_2', 'axe_2', 'dagger_2', 'bow_2', 'vest_2', 'mail_1', 'mail_2', 'charm_swift', 'charm_luck']);
  shop('gladius_shop', 'Gladius Apothecary', ['potion', 'hi_potion', 'ether', 'hi_ether', 'antidote', 'smelling_salts', 'phoenix_down', 'bp_tonic', 'ember_wine', 'lucky_coin', 'old_book', 'rare_tea']);
  shop('gladius_smith', 'The Colosseum Armory', ['sword_2', 'sword_3', 'spear_2', 'spear_3', 'axe_2', 'axe_3', 'dagger_2', 'dagger_3', 'bow_2', 'bow_3', 'mail_2', 'mail_3', 'vest_2', 'vest_3', 'charm_focus', 'charm_guard']);
  shop('abbey_shop', 'Pale Abbey Almonry', ['hi_potion', 'hi_ether', 'phoenix_down', 'antidote', 'smelling_salts', 'staff_2', 'robe_2', 'robe_3', 'charm_focus', 'ring_bond', 'lavender_sachet', 'rare_tea', 'feather_quill', 'moonpetal']);
  shop('lumen_shop', 'Lumen Lantern Market', ['hi_potion', 'hi_ether', 'elixir', 'phoenix_down', 'bp_tonic', 'antidote', 'smelling_salts', 'charm_swift', 'charm_luck', 'music_box', 'star_chart', 'silver_locket']);
  shop('lumen_smith', 'Lumen Forge', ['sword_3', 'spear_3', 'axe_3', 'dagger_3', 'bow_3', 'staff_3', 'mail_3', 'vest_3', 'robe_3', 'charm_ember', 'charm_guard']);
  shop('spire_shop', 'Hearthstar Quartermaster', ['elixir', 'hi_ether', 'phoenix_down', 'bp_tonic', 'sword_4', 'spear_4', 'axe_4', 'dagger_4', 'bow_4', 'staff_4', 'mail_4', 'vest_4', 'robe_4', 'charm_ember', 'charm_guard', 'charm_focus', 'charm_luck', 'charm_swift', 'ring_bond']);
  D.shops = SHOPS;

  // ================================================================ HELPERS
  D.skillIcons = function (id) {
    const s = SKILLS[id]; if (!s) return [];
    const out = [];
    if (s.kind === 'bond') out.push('heart');
    if (s.element) out.push(s.element);
    if (s.weapon) out.push(s.weapon);
    if (!out.length) {
      if (s.special) out.push({ steal: 'gift', provoke: 'shield', revive: 'heart', give_bp: 'bp', cleanse: 'check' }[s.special] || 'star');
      else if (s.kind === 'heal') out.push('heart');
      else if (s.kind === 'buff') out.push('up');
      else if (s.kind === 'debuff') out.push('down');
      else out.push('sword');
    }
    return out;
  };
  D.tokenIcon = (tok) => (D.TOKENS.indexOf(tok) >= 0 ? tok : 'unknown');
  const KIND_LABEL = { phys: 'Physical', elem: 'Magic', heal: 'Heal', buff: 'Buff', debuff: 'Debuff', special: 'Special', bond: 'Bond' };
  const TARGET_LABEL = { one_enemy: 'One enemy', all_enemies: 'All enemies', random_enemies: 'Random enemies', one_ally: 'One ally', all_allies: 'All allies', self: 'Self', dead_ally: 'Fallen ally' };
  D.describeSkill = function (id) {
    const s = SKILLS[id]; if (!s) return null;
    const parts = [KIND_LABEL[s.kind] || s.kind];
    if (s.element) parts.push(cap(s.element));
    else if (s.weapon) parts.push(cap(s.weapon));
    if (s.power && s.kind !== 'buff' && s.kind !== 'debuff') parts.push(s.power + '%' + (s.hits > 1 ? ' x' + s.hits : ''));
    parts.push(s.cost ? s.cost + ' SP' : 'No SP');
    parts.push(TARGET_LABEL[s.target] || s.target);
    return {
      id: s.id, name: s.name, desc: s.desc, kind: s.kind, element: s.element, weapon: s.weapon, power: s.power, hits: s.hits,
      cost: s.cost, target: s.target, partner: s.partner, icons: D.skillIcons(id), line: parts.join(' · '),
    };
  };
  D.itemsByType = function (type) {
    return Object.values(ITEMS).filter((x) => x.type === type)
      .sort((a, b) => (a.price - b.price) || (a.id < b.id ? -1 : 1));
  };

  // ================================================================ VALIDATION
  const REQ = {
    actors: ['rowan', 'claret', 'caspian', 'rook', 'seraphine', 'wren'],
    enemies: ('moss_slime forest_bat thorn_boar hollow_wisp hollow_stag cog_rat steam_sprite rust_bot order_guard brass_sentinel arena_hound sand_bandit gladiator_recruit drake_whelp catacomb_skeleton gladius_champion crypt_ghoul pale_moth briar_treant hollow_husk briar_matron hollow_choir ash_wraith hollow_hound order_inquisitor cinder_golem inquisitor_hale spire_sentinel hollow_knight void_moth cold_drone hollow_elowen warden_vael vael_cold_engine').split(' '),
    troops: ('tutorial wood_1 wood_2 wood_3 wood_4 boss_stag city_1 city_2 city_3 under_1 under_2 under_3 under_4 boss_sentinel aq_1 aq_2 aq_3 aq_4 arena_1 arena_2 arena_3 boss_champion crypt_1 crypt_2 crypt_3 crypt_4 boss_choir ww_1 ww_2 ww_3 ww_4 boss_matron ash_1 ash_2 ash_3 ash_4 boss_hale spire_1 spire_2 spire_3 spire_4 spire_5 boss_elowen boss_vael1 boss_vael2').split(' '),
    items: ('potion hi_potion ether hi_ether elixir phoenix_down smelling_salts antidote bp_tonic wild_honey brass_cog silver_locket old_book lavender_sachet ember_wine star_chart ribbon whetstone moonpetal sweet_bun music_box pressed_flower lucky_coin rare_tea feather_quill ember_compass aether_coil gladius_pass abbey_seal witchwood_charm lantern_token lampwright_notes spire_key charm_ember charm_swift charm_guard charm_focus charm_luck ring_bond').split(' ')
      .concat(['sword', 'spear', 'dagger', 'axe', 'bow', 'staff'].reduce((acc, t) => acc.concat([1, 2, 3, 4].map((n) => t + '_' + n)), []))
      .concat(['vest', 'mail', 'robe'].reduce((acc, t) => acc.concat([1, 2, 3, 4].map((n) => t + '_' + n)), [])),
    shops: 'wickholm_shop brasshaven_shop brasshaven_smith gladius_shop gladius_smith abbey_shop lumen_shop lumen_smith spire_shop'.split(' '),
    bonds: ['bond_claret', 'bond_caspian', 'bond_rook', 'bond_seraphine', 'bond_wren'],
  };
  D.REQUIRED = REQ;

  D.validate = function () {
    const errs = [];
    const bad = (m) => errs.push(m);
    const hasKeys = (o, keys) => keys.every((k) => typeof o[k] === 'number' && isFinite(o[k]));
    const isTok = (t) => D.TOKENS.indexOf(t) >= 0;

    // required ids (CONTRACT §4 — other modules rely on these)
    REQ.actors.forEach((id) => { if (!ACTORS[id]) bad('missing actor ' + id); });
    REQ.enemies.forEach((id) => { if (!ENEMIES[id]) bad('missing enemy ' + id); });
    REQ.troops.forEach((id) => { if (!TROOPS[id]) bad('missing troop ' + id); });
    REQ.items.forEach((id) => { if (!ITEMS[id]) bad('missing item ' + id); });
    REQ.shops.forEach((id) => { if (!SHOPS[id]) bad('missing shop ' + id); });
    REQ.bonds.forEach((id) => { if (!SKILLS[id]) bad('missing bond skill ' + id); });
    D.statuses.forEach((s) => { if (!D.statusInfo[s]) bad('no statusInfo for ' + s); });

    // actors
    Object.values(ACTORS).forEach((a) => {
      if (!hasKeys(a.base, STAT_KEYS)) bad('actor ' + a.id + ' base incomplete');
      if (!hasKeys(a.growth, STAT_KEYS)) bad('actor ' + a.id + ' growth incomplete');
      if (!Array.isArray(a.learn) || a.learn.length < 8 || a.learn.length > 10) bad('actor ' + a.id + ' needs 8-10 learn entries');
      let last = 0;
      (a.learn || []).forEach((l) => {
        if (!SKILLS[l.skill]) bad('actor ' + a.id + ' learns unknown skill ' + l.skill);
        if (l.level < last || l.level < 1 || l.level > MAX_LEVEL) bad('actor ' + a.id + ' learn levels not ascending/in range');
        last = l.level;
        if (SKILLS[l.skill] && SKILLS[l.skill].kind === 'bond') bad('actor ' + a.id + ' should not learn bond skill ' + l.skill);
      });
      (a.weapons || []).forEach((w) => { if (D.weaponTypes.indexOf(w) < 0) bad('actor ' + a.id + ' bad weapon type ' + w); });
      EQUIP_SLOTS.forEach((slot) => {
        const id = a.equip[slot]; if (!id) return;
        if (!ITEMS[id]) { bad('actor ' + a.id + ' starting ' + slot + ' unknown item ' + id); return; }
        if (slot === 'weapon2' || slot === 'weapon') { if (ITEMS[id].slot !== 'weapon') bad('actor ' + a.id + ' ' + slot + ' is not a weapon'); }
        else if (ITEMS[id].slot !== slot) bad('actor ' + a.id + ' ' + slot + ' is not a ' + slot);
        if (!canEquipData(a.id, id)) bad('actor ' + a.id + ' cannot equip starting item ' + id);
      });
    });

    // skills
    Object.values(SKILLS).forEach((s) => {
      const p = 'skill ' + s.id + ': ';
      if (D.kinds.indexOf(s.kind) < 0) bad(p + 'bad kind ' + s.kind);
      if (s.element && D.elements.indexOf(s.element) < 0) bad(p + 'bad element ' + s.element);
      if (s.weapon && D.weaponTypes.indexOf(s.weapon) < 0) bad(p + 'bad weapon ' + s.weapon);
      if (s.kind === 'phys' && s.element) bad(p + 'phys skill should not have an element');
      if (D.targets.indexOf(s.target) < 0) bad(p + 'bad target ' + s.target);
      if (D.anims.indexOf(s.anim) < 0) bad(p + 'bad anim ' + s.anim);
      if (s.special && D.specials.indexOf(s.special) < 0) bad(p + 'bad special ' + s.special);
      if (!(typeof s.power === 'number' && s.power >= 0)) bad(p + 'bad power');
      if (!(typeof s.cost === 'number' && s.cost >= 0)) bad(p + 'bad cost');
      if (!(s.hits >= 1)) bad(p + 'bad hits');
      if (s.shield == null || s.shield < 0) bad(p + 'bad shield');
      s.effects.forEach((e) => {
        if (D.statuses.indexOf(e.status) < 0) bad(p + 'unknown status ' + e.status);
        if (['target', 'self'].indexOf(e.target) < 0) bad(p + 'effect target must be target|self');
      });
      if (s.kind === 'bond') {
        if (!ACTORS[s.partner]) bad(p + 'bond needs a valid partner');
        if (s.user !== 'rowan') bad(p + 'bond user must be rowan');
        if (!(s.reqTier >= 1)) bad(p + 'bond needs reqTier');
      }
    });

    // enemies
    Object.values(ENEMIES).forEach((e) => {
      const p = 'enemy ' + e.id + ': ';
      if (e.sprite !== e.id) bad(p + 'sprite must equal id');
      if (!(e.level >= 1)) bad(p + 'bad level');
      if (!hasKeys(e.stats, ['patk', 'pdef', 'eatk', 'edef', 'spd', 'crit', 'eva'])) bad(p + 'stats incomplete');
      if (!(e.hp > 0) || !isFinite(e.hp)) bad(p + 'bad hp');
      if (!Array.isArray(e.weak) || e.weak.length < 2 || e.weak.length > 4) bad(p + 'needs 2-4 weaknesses');
      (e.weak || []).concat(e.resist || []).forEach((t) => { if (!isTok(t)) bad(p + 'bad token ' + t); });
      if (e.boss ? !(e.shields >= 4 && e.shields <= 8) : !(e.shields >= 1 && e.shields <= 3)) bad(p + 'shield count out of range');
      if (!e.skills.length) bad(p + 'needs at least one signature skill');
      e.skills.forEach((x) => { if (!SKILLS[x.skill]) bad(p + 'unknown skill ' + x.skill); });
      e.drops.concat(e.steal).forEach((x) => { if (!ITEMS[x.item]) bad(p + 'unknown item ' + x.item); });
      if (!(e.exp >= 0) || !(e.gold >= 0)) bad(p + 'bad exp/gold');
    });

    // troops
    Object.values(TROOPS).forEach((t) => {
      if (!(t.enemies.length >= 1 && t.enemies.length <= 5)) bad('troop ' + t.id + ' needs 1-5 enemies');
      t.enemies.forEach((e) => { if (!ENEMIES[e]) bad('troop ' + t.id + ' unknown enemy ' + e); });
      if (!t.bg) bad('troop ' + t.id + ' has no bg');
      if (['battle', 'boss', 'finalboss'].indexOf(t.bgm) < 0) bad('troop ' + t.id + ' bad bgm ' + t.bgm);
    });

    // items
    Object.values(ITEMS).forEach((x) => {
      const p = 'item ' + x.id + ': ';
      if (D.itemTypes.indexOf(x.type) < 0) bad(p + 'bad type ' + x.type);
      if (!(typeof x.price === 'number' && x.price >= 0)) bad(p + 'bad price');
      if (x.use && ['battle', 'menu', 'both'].indexOf(x.use) < 0) bad(p + 'bad use ' + x.use);
      if (x.effect) Object.keys(x.effect).forEach((k) => { if (['hp', 'sp', 'revive', 'cure', 'bp'].indexOf(k) < 0) bad(p + 'unknown effect ' + k); });
      if (x.effect && x.effect.cure) x.effect.cure.forEach((s) => { if (D.statuses.indexOf(s) < 0) bad(p + 'unknown cure status ' + s); });
      if (x.type === 'weapon') {
        if (D.weaponTypes.indexOf(x.weaponType) < 0) bad(p + 'bad weaponType');
        if (x.slot !== 'weapon') bad(p + 'weapon slot must be weapon');
      }
      if (x.type === 'armor' && x.slot !== 'armor') bad(p + 'armor slot must be armor');
      if (x.type === 'accessory' && x.slot !== 'accessory') bad(p + 'accessory slot must be accessory');
      if (x.stats) Object.keys(x.stats).forEach((k) => { if (STAT_KEYS.indexOf(k) < 0) bad(p + 'unknown stat ' + k); });
      if (x.usable) x.usable.forEach((a) => { if (!ACTORS[a]) bad(p + 'unknown usable actor ' + a); });
    });

    // shops
    Object.values(SHOPS).forEach((s) => {
      if (!s.name) bad('shop ' + s.id + ' has no name');
      s.stock.forEach((x) => { if (!ITEMS[x]) bad('shop ' + s.id + ' stocks unknown item ' + x); });
    });

    // exp curve
    for (let L = 2; L <= MAX_LEVEL; L++) if (!(EXP[L] > EXP[L - 1])) bad('exp curve not increasing at level ' + L);

    return errs;
  };

  // ================================================================ RUNTIME PARTY API (G.party)
  const P = (G.party = G.party || {});
  const rosterOf = (id) => (G.state && G.state.roster ? G.state.roster[id] || null : null);
  const activeOf = () => (G.state && G.state.party) || [];

  function canEquipData(actorId, itemId) {
    const a = ACTORS[actorId], x = ITEMS[itemId];
    if (!a || !x) return false;
    if (x.type === 'weapon' && a.weapons.indexOf(x.weaponType) < 0) return false;
    if (x.type !== 'weapon' && x.type !== 'armor' && x.type !== 'accessory') return false;
    if (x.usable && x.usable.indexOf(actorId) < 0) return false;
    return true;
  }

  // Pure stat calculation: base + floor(growth * (lv-1)) + equipment (weapon2 at 50%).
  P.calcStats = function (id, level, equip) {
    const a = ACTORS[id]; if (!a) return null;
    const lv = clamp(Math.floor(level || 1), 1, MAX_LEVEL);
    const eq = equip || a.equip;
    const s = {};
    STAT_KEYS.forEach((k) => { s[k] = a.base[k] + Math.floor(a.growth[k] * (lv - 1)); });
    EQUIP_SLOTS.forEach((slot) => {
      const x = eq[slot] && ITEMS[eq[slot]]; if (!x || !x.stats) return;
      const mul = slot === 'weapon2' ? 0.5 : 1;
      Object.keys(x.stats).forEach((k) => { s[k] = (s[k] || 0) + Math.round(x.stats[k] * mul); });
    });
    return {
      mhp: Math.max(1, s.hp), msp: Math.max(0, s.sp),
      patk: Math.max(0, s.patk), pdef: Math.max(0, s.pdef), eatk: Math.max(0, s.eatk), edef: Math.max(0, s.edef),
      spd: Math.max(1, s.spd), crit: clamp(s.crit, 0, 100), eva: clamp(s.eva, 0, 100),
    };
  };

  P.stats = function (id) {
    const r = rosterOf(id);
    if (r) return P.calcStats(id, r.level, r.equip);
    return ACTORS[id] ? P.calcStats(id, 1, ACTORS[id].equip) : null;
  };

  function newRuntime(id, lv) {
    const a = ACTORS[id];
    const eq = clone(a.equip);
    const s = P.calcStats(id, lv, eq);
    return { id, level: lv, exp: D.expFor(lv), hp: s.mhp, sp: s.msp, equip: eq };
  }

  P.init = function () {
    const S = G.state; if (!S) return null;
    S.party = ['rowan'];
    S.roster = { rowan: newRuntime('rowan', 3) };
    S.inventory = { potion: 3, ether: 1 };
    return S.roster.rowan;
  };
  P.members = () => activeOf().slice();
  P.actor = (id) => rosterOf(id);
  P.nameOf = (id) => (ACTORS[id] ? ACTORS[id].name : id);
  P.count = (id) => ((G.state && G.state.inventory && G.state.inventory[id]) || 0);

  P.addItem = function (id, n) {
    n = n == null ? 1 : Math.max(0, Math.floor(n));
    if (!ITEMS[id]) { console.warn('[party] unknown item', id); return 0; }
    const S = G.state; S.inventory = S.inventory || {};
    S.inventory[id] = (S.inventory[id] || 0) + n;
    return S.inventory[id];
  };
  P.removeItem = function (id, n) {
    n = n == null ? 1 : Math.max(0, Math.floor(n));
    const have = P.count(id);
    if (have < n) return false;
    if (have === n) delete G.state.inventory[id]; else G.state.inventory[id] = have - n;
    return true;
  };

  // Join rule: level = max(actor.joinLevel, round(avg roster level) - 1)
  P.joinLevel = function (id) {
    const a = ACTORS[id]; if (!a) return 1;
    const lvls = Object.values((G.state && G.state.roster) || {}).map((r) => r.level);
    const avg = lvls.length ? lvls.reduce((x, y) => x + y, 0) / lvls.length : a.joinLevel;
    return Math.max(a.joinLevel, Math.round(avg) - 1);
  };
  P.join = function (id, level) {
    const a = ACTORS[id]; const S = G.state;
    if (!a || !S) return false;
    S.roster = S.roster || {};
    S.party = S.party || ['rowan'];
    const wasKnown = !!S.roster[id];
    if (!wasKnown) {
      const lv = clamp(Math.max(level || 0, P.joinLevel(id)), 1, MAX_LEVEL);
      S.roster[id] = newRuntime(id, lv);
    }
    if (S.party.indexOf(id) >= 0) return true;
    if (S.party.length < 4) {
      S.party.push(id);
      toast(a.name + (wasKnown ? ' rejoined the party!' : ' joined the party!'), 'good');
    } else {
      toast(a.name + ' joined, and waits in reserve.', 'info');
    }
    return true;
  };
  P.leave = function (id) {
    const S = G.state; if (!S || id === 'rowan') return false;
    const i = (S.party || []).indexOf(id);
    if (i < 0) return false;
    S.party.splice(i, 1);
    return true;
  };
  P.setParty = function (ids) {
    const S = G.state; if (!S) return [];
    const out = ['rowan'];
    (ids || []).forEach((id) => { if (id !== 'rowan' && rosterOf(id) && out.indexOf(id) < 0 && out.length < 4) out.push(id); });
    S.party = out;
    return out.slice();
  };
  P.setLevel = function (id, l) {
    const r = rosterOf(id); if (!r) return false;
    r.level = clamp(Math.floor(l || 1), 1, MAX_LEVEL);
    r.exp = D.expFor(r.level);
    const s = P.stats(id);
    r.hp = s.mhp; r.sp = s.msp;
    return true;
  };
  P.healAll = function () {
    Object.keys((G.state && G.state.roster) || {}).forEach((id) => {
      const s = P.stats(id), r = rosterOf(id);
      r.hp = s.mhp; r.sp = s.msp;
    });
  };

  function avgActiveLevel() {
    const ids = activeOf().filter((id) => rosterOf(id));
    if (!ids.length) return 1;
    return ids.reduce((sum, id) => sum + rosterOf(id).level, 0) / ids.length;
  }
  // Total exp is added (catch-up: below-average members gain +50%). Returns level-ups with learned skills.
  P.gainExp = function (id, n) {
    const r = rosterOf(id), a = ACTORS[id];
    if (!r || !a) return [];
    const out = [];
    let gain = Math.max(0, Math.round(n || 0));
    if (r.level < avgActiveLevel()) gain = Math.round(gain * 1.5);
    r.exp += gain;
    while (r.level < MAX_LEVEL && r.exp >= D.expFor(r.level + 1)) {
      const before = P.stats(id);
      r.level++;
      const after = P.stats(id);
      if (r.hp > 0) r.hp = Math.min(after.mhp, r.hp + Math.max(0, after.mhp - before.mhp));
      r.sp = Math.min(after.msp, r.sp + Math.max(0, after.msp - before.msp));
      out.push({ level: r.level, learned: a.learn.filter((l) => l.level === r.level).map((l) => l.skill) });
    }
    return out;
  };

  function weaponTypesOf(id) {
    const r = rosterOf(id); if (!r) return [];
    const out = [];
    ['weapon', 'weapon2'].forEach((slot) => {
      const x = r.equip[slot] && ITEMS[r.equip[slot]];
      if (x && x.weaponType && out.indexOf(x.weaponType) < 0) out.push(x.weaponType);
    });
    return out;
  }
  P.weaponTypesOf = weaponTypesOf;

  function bondReady(s) {
    if (activeOf().indexOf(s.partner) < 0) return false;
    const pr = rosterOf(s.partner);
    if (!pr || pr.hp <= 0) return false;
    let tier = 0;
    try { if (G.romance && typeof G.romance.tier === 'function') tier = G.romance.tier(s.partner) || 0; } catch (e) { tier = 0; }
    return tier >= (s.reqTier || 0);
  }
  // Skills usable right now: learned by level, weapon type equipped, bond partner present & tier met.
  P.skills = function (id) {
    const a = ACTORS[id], r = rosterOf(id);
    if (!a || !r) return [];
    const types = weaponTypesOf(id);
    const out = [];
    a.learn.forEach((l) => {
      if (l.level > r.level) return;
      const s = SKILLS[l.skill]; if (!s) return;
      if (s.weapon && types.indexOf(s.weapon) < 0) return;
      out.push(s.id);
    });
    Object.values(SKILLS).forEach((s) => {
      if (s.kind === 'bond' && s.user === id && bondReady(s)) out.push(s.id);
    });
    return out;
  };

  P.canEquip = canEquipData;
  // Equip into slot ('weapon'|'weapon2'|'armor'|'accessory'); itemId null unequips. Old item returns to inventory.
  P.equip = function (actorId, slot, itemId) {
    const r = rosterOf(actorId);
    if (!r || EQUIP_SLOTS.indexOf(slot) < 0) return false;
    if (itemId == null) {
      const old = r.equip[slot];
      if (old) { r.equip[slot] = null; P.addItem(old, 1); }
      clampVitals(actorId);
      return true;
    }
    const x = ITEMS[itemId];
    if (!x) return false;
    if ((slot === 'weapon' || slot === 'weapon2') ? x.slot !== 'weapon' : x.slot !== slot) return false;
    if (!canEquipData(actorId, itemId)) return false;
    const old = r.equip[slot];
    if (old === itemId) return true;
    if (P.count(itemId) < 1) return false;
    P.removeItem(itemId, 1);
    r.equip[slot] = itemId;
    if (old) P.addItem(old, 1);
    clampVitals(actorId);
    return true;
  };
  function clampVitals(id) {
    const r = rosterOf(id); if (!r) return;
    const s = P.stats(id);
    r.hp = Math.min(r.hp, s.mhp);
    r.sp = Math.min(r.sp, s.msp);
  }

  // Menu use. Returns true when the item was used (and removed).
  P.useItem = function (itemId, actorId) {
    const x = ITEMS[itemId], r = rosterOf(actorId);
    if (!x || !x.effect || !r) return false;
    if (x.use !== 'menu' && x.use !== 'both') return false;
    if (P.count(itemId) < 1) return false;
    const s = P.stats(actorId);
    const e = x.effect;
    const dead = r.hp <= 0;
    if (e.revive != null) {
      if (!dead) return false;
      r.hp = Math.max(1, Math.floor(s.mhp * e.revive));
    } else {
      if (dead) return false;
      if (e.hp) r.hp = Math.min(s.mhp, r.hp + e.hp);
      if (e.sp) r.sp = Math.min(s.msp, r.sp + e.sp);
      if (!e.hp && !e.sp) return false;
    }
    P.removeItem(itemId, 1);
    return true;
  };

  // ================================================================ SCRIPT COMMANDS
  const DEFINE = (name, fn) => { if (G.script && G.script.define) G.script.define(name, fn); };
  const itemName = (id) => (ITEMS[id] ? ITEMS[id].name : id);
  DEFINE('addItem', (id, n, opts) => {
    n = n == null ? 1 : n;
    const count = P.addItem(id, n);
    if (!(opts && opts.silent)) {
      toast('Obtained ' + itemName(id) + (n > 1 ? ' x' + n : ''), 'item');
      sfx('jingle_item');
    }
    return count;
  });
  DEFINE('removeItem', (id, n) => P.removeItem(id, n == null ? 1 : n));
  DEFINE('hasItem', (id) => P.count(id));
  DEFINE('join', (actorId, level) => P.join(actorId, level));
  DEFINE('leave', (actorId) => P.leave(actorId));
  DEFINE('healAll', () => { P.healAll(); sfx('heal'); });
  DEFINE('setParty', (ids) => P.setParty(ids));

  G.provide('data');
})();
