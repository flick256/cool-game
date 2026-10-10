/* Scratch stubs for testing js/ui.js in isolation (tests only; never loaded by index.html). */
(function () {
  'use strict';
  const G = window.G;
  G.data = G.data || {
    expFor: (lv) => { let t = 0; for (let l = 1; l < lv; l++) t += Math.floor(20 * Math.pow(l, 1.6)); return t; },
    elements: ['fire', 'ice', 'lightning', 'wind', 'light', 'dark'],
    weaponTypes: ['sword', 'spear', 'dagger', 'axe', 'bow', 'staff'],
    actors: {
      rowan: { id: 'rowan', name: 'Rowan', title: 'the Kindler', cls: 'Lamplighter', weapons: ['sword', 'staff'], bio: 'Found on a doorstep in Wickholm. Wickless, yet able to kindle other people’s wicks.',
        base: { hp: 58, sp: 20, patk: 12, pdef: 8, eatk: 10, edef: 8, spd: 11, crit: 5, eva: 5 }, growth: { hp: 6, sp: 2, patk: 2, pdef: 1.4, eatk: 1.6, edef: 1.2, spd: 0.6, crit: 0.2, eva: 0.2 },
        learn: [{ level: 1, skill: 'strike' }, { level: 4, skill: 'kindle' }, { level: 6, skill: 'bond_claret' }], equip: { weapon: 'sword_1', weapon2: null, armor: 'vest_1', accessory: null }, portrait: 'rowan' },
      claret: { id: 'claret', name: 'Claret Vane', title: 'the Tinker', cls: 'Engineer', weapons: ['spear', 'axe'], bio: 'Captain of the Marigold. Hates being helped. Loves being understood.',
        base: { hp: 52, sp: 24, patk: 13, pdef: 7, eatk: 11, edef: 7, spd: 12, crit: 6, eva: 4 }, growth: { hp: 5.5, sp: 2.5, patk: 2.2, pdef: 1.1, eatk: 1.8, edef: 1, spd: 0.7, crit: 0.2, eva: 0.1 },
        learn: [{ level: 1, skill: 'lance' }, { level: 3, skill: 'spark' }], equip: { weapon: 'spear_1', weapon2: null, armor: 'mail_1', accessory: null }, portrait: 'claret' },
      caspian: { id: 'caspian', name: 'Caspian Thorne', title: 'the Oathbreaker', cls: 'Guardian', weapons: ['sword', 'spear'], bio: 'A former Knight-Lantern who now fights as the Grey Lion.',
        base: { hp: 70, sp: 12, patk: 14, pdef: 12, eatk: 6, edef: 10, spd: 8, crit: 4, eva: 2 }, growth: { hp: 8, sp: 1, patk: 2, pdef: 2, eatk: 0.8, edef: 1.4, spd: 0.4, crit: 0.1, eva: 0.1 },
        learn: [{ level: 1, skill: 'guard_strike' }], equip: { weapon: null, weapon2: null, armor: 'mail_1', accessory: null }, portrait: 'caspian' },
    },
    skills: {
      strike: { id: 'strike', name: 'Strike', desc: 'A solid blow with your weapon.', kind: 'phys', element: null, power: 100, hits: 1, target: 'one_enemy', cost: 0, anim: 'slash' },
      kindle: { id: 'kindle', name: 'Kindle', desc: 'Lend a little light to an ally. Grants +1 BP.', kind: 'special', element: 'light', power: 0, target: 'one_ally', cost: 4, special: 'give_bp', anim: 'buff' },
      lance: { id: 'lance', name: 'Arc Lance', desc: 'A lightning-charged thrust through a line of foes.', kind: 'elem', element: 'lightning', power: 120, hits: 2, target: 'all_enemies', cost: 6, anim: 'lightning' },
      spark: { id: 'spark', name: 'Spark Burst', desc: 'Fire and sparks in a wide arc.', kind: 'elem', element: 'fire', power: 90, hits: 1, target: 'all_enemies', cost: 8, anim: 'fire' },
      bond_claret: { id: 'bond_claret', name: 'Kindled Link: Claret', desc: 'A duo strike with your Tinker.', kind: 'bond', element: 'fire', power: 180, target: 'one_enemy', cost: 18, partner: 'claret', reqTier: 2, user: 'rowan', anim: 'bond' },
      guard_strike: { id: 'guard_strike', name: 'Shield Bash', desc: 'Strike and draw attention.', kind: 'phys', element: 'light', power: 100, target: 'one_enemy', cost: 4, anim: 'blunt' },
    },
    items: {
      potion: { id: 'potion', name: 'Potion', desc: 'Restores 150 HP to one ally.', type: 'consumable', price: 30, effect: { hp: 150 }, use: 'both' },
      hi_potion: { id: 'hi_potion', name: 'Hi-Potion', desc: 'Restores 400 HP.', type: 'consumable', price: 90, effect: { hp: 400 }, use: 'both' },
      ether: { id: 'ether', name: 'Ether', desc: 'Restores 40 SP.', type: 'consumable', price: 80, effect: { sp: 40 }, use: 'both' },
      brass_cog: { id: 'brass_cog', name: 'Brass Cog', desc: 'A small brass gear, still warm from a workshop.', type: 'gift', price: 120 },
      old_book: { id: 'old_book', name: 'Old Book', desc: 'A water-stained book of Lampwright hymns.', type: 'gift', price: 200 },
      ember_compass: { id: 'ember_compass', name: 'Ember Compass', desc: 'Points toward the nearest flame. It always points at you, somehow.', type: 'key', price: 0 },
      sword_1: { id: 'sword_1', name: 'Iron Sword', desc: 'Plain and dependable.', type: 'weapon', weaponType: 'sword', slot: 'weapon', price: 120, stats: { patk: 8 } },
      sword_2: { id: 'sword_2', name: 'Ember Blade', desc: 'Warm to the touch. Sparks when it hits.', type: 'weapon', weaponType: 'sword', slot: 'weapon', price: 340, stats: { patk: 15, eatk: 4 }, usable: ['rowan', 'caspian'] },
      spear_1: { id: 'spear_1', name: 'Arc Lance', desc: 'Claret’s own design.', type: 'weapon', weaponType: 'spear', slot: 'weapon', price: 150, stats: { patk: 10, spd: 1 }, usable: ['claret', 'caspian'] },
      vest_1: { id: 'vest_1', name: 'Leather Vest', desc: 'Light and quiet.', type: 'armor', slot: 'armor', price: 90, stats: { pdef: 4 } },
      mail_1: { id: 'mail_1', name: 'Scale Mail', desc: 'Heavy, honest armor.', type: 'armor', slot: 'armor', price: 200, stats: { pdef: 9, spd: -2 } },
      charm_swift: { id: 'charm_swift', name: 'Swift Charm', desc: 'Quickens the wearer.', type: 'accessory', slot: 'accessory', price: 260, stats: { spd: 3, eva: 4 } },
    },
    shops: {
      wickholm_shop: { id: 'wickholm_shop', name: 'Wickholm General', stock: ['potion', 'hi_potion', 'ether', 'vest_1', 'sword_1', 'charm_swift'] },
    },
    troops: {}, enemies: {},
  };
  // Give the stub party helpers. Real data.js replaces these.
  G.party = G.party || {
    init() { G.state.roster = G.state.roster || {}; G.state.roster.rowan = { id: 'rowan', level: 3, exp: 0, hp: 60, sp: 20, equip: { weapon: 'sword_1', weapon2: null, armor: 'vest_1', accessory: null } }; G.state.inventory.potion = 3; },
    nameOf(id) { return id === 'rowan' ? G.name() : (G.data.actors[id] || {}).name || id; },
    stats(id) { const r = G.state.roster[id]; const a = G.data.actors[id]; const lv = r ? r.level : 1; const out = { mhp: Math.floor(a.base.hp + a.growth.hp * (lv - 1)), msp: Math.floor(a.base.sp + a.growth.sp * (lv - 1)), patk: 12, pdef: 8, eatk: 10, edef: 8, spd: 11, crit: 5, eva: 5 };
      for (const s in r.equip) { const i = r.equip[s]; if (i) for (const k in (G.data.items[i].stats || {})) { if (k === 'hp') out.mhp += G.data.items[i].stats[k]; else out[k] = (out[k] || 0) + G.data.items[i].stats[k]; } } return out; },
    skills(id) { return id === 'rowan' ? ['strike', 'kindle'] : ['lance', 'spark']; },
    canEquip(actorId, itemId) { const i = G.data.items[itemId], a = G.data.actors[actorId]; if (i.usable) return i.usable.indexOf(actorId) >= 0; if (i.weaponType) return a.weapons.indexOf(i.weaponType) >= 0; return true; },
    equip(actorId, slot, itemId) { const r = G.state.roster[actorId]; const old = r.equip[slot]; if (old) G.party.addItem(old, 1); if (itemId) G.party.removeItem(itemId, 1); r.equip[slot] = itemId; return true; },
    useItem(itemId, actorId) { const r = G.state.roster[actorId]; if (!r) return false; const st = G.party.stats(actorId); const e = G.data.items[itemId].effect || {}; let did = false;
      if (e.hp && r.hp < st.mhp) { r.hp = Math.min(st.mhp, r.hp + e.hp); did = true; } if (e.sp && r.sp < st.msp) { r.sp = Math.min(st.msp, r.sp + e.sp); did = true; }
      if (did) G.party.removeItem(itemId, 1); return did; },
    addItem(id, n) { G.state.inventory[id] = (G.state.inventory[id] || 0) + n; },
    removeItem(id, n) { G.state.inventory[id] = Math.max(0, (G.state.inventory[id] || 0) - n); if (!G.state.inventory[id]) delete G.state.inventory[id]; },
    setParty(ids) { G.state.party = ids.slice(); },
    join(id) { G.state.party.push(id); G.state.roster[id] = { id, level: 3, exp: 0, hp: 40, sp: 10, equip: { weapon: null, weapon2: null, armor: null, accessory: null } }; },
    healAll() {},
  };
  G.story = G.story || { scripts: {}, chapters: {} };
  G.story.chapters[0] = G.story.chapters[0] || { title: 'Cold Ember', subtitle: 'Prologue' };
  G.story.chapters[1] = G.story.chapters[1] || { title: 'Brass & Steam', subtitle: 'Brasshaven' };
  G.maps = G.maps || { get(id) { return { id, name: id === 'wickholm_house' ? 'Rowan’s House' : 'Wickholm' }; } };
  if (!G.romance) {
    G.romance = { CANDIDATES: ['claret', 'caspian', 'rook', 'seraphine', 'wren'], _p: { claret: 46, caspian: 18 },
      get(id) { return this._p[id] || 0; }, tier(id) { const p = this.get(id); return p >= 65 ? 3 : p >= 40 ? 2 : p >= 15 ? 1 : 0; },
      tierName(id) { return ['Companion', 'Friend', 'Close', 'Devoted', 'Beloved'][this.tier(id)]; } };
  }
  G.audio = G.audio || { log: [], sfx(n) { this.log.push('sfx:' + n); }, playBgm(n) { this.log.push('bgm:' + n); }, stopBgm() {},
    setVolume(v) { this.vol = v; }, getVolume() { return this.vol || { bgm: 0.7, sfx: 0.8 }; }, unlock() {}, update() {} };
  G.newGame('Rowan');
  G.party.init();
  G.state.party = ['rowan', 'claret'];
  G.state.roster.claret = { id: 'claret', level: 4, exp: 80, hp: 30, sp: 12, equip: { weapon: 'spear_1', weapon2: null, armor: 'mail_1', accessory: null } };
  G.state.inventory = Object.assign({}, G.state.inventory, { hi_potion: 2, ether: 1, brass_cog: 2, old_book: 1, ember_compass: 1, sword_2: 1, charm_swift: 1, vest_1: 1 });
  G.state.gold = 640;
  G.state.chapter = 1;
  G.state.playtime = 54321;
  G.state.map = { id: 'wickholm_house', x: 5, y: 6, dir: 'down' };
})();
