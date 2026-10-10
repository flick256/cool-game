/* Scratch stubs for romance/hub tests (loaded in the page before js/romance.js). Not part of the game. */
(function () {
  const G = window.G;
  G.__log = [];
  G.__choice = 0;
  G.data = {
    actors: {
      rowan: { name: 'Rowan', title: 'The Kindler' },
      claret: { name: 'Claret Vane', title: 'The Tinker', color: '#d8703a' },
      caspian: { name: 'Caspian Thorne', title: 'The Oathbreaker', color: '#c8d4ff' },
      rook: { name: 'Rook Calloway', title: 'The Rogue', color: '#d2452c' },
      seraphine: { name: 'Sera Whitlock', title: 'The Cantor', color: '#8fd8c8' },
      wren: { name: 'Wren Alder', title: 'The Hedge-Witch', color: '#7f9ad8' },
    },
    items: {
      brass_cog: { name: 'Brass Cog', type: 'gift', desc: 'A warm little gear.' },
      wild_honey: { name: 'Wild Honey', type: 'gift', desc: 'Golden, slow, sweet.' },
      sweet_bun: { name: 'Sweet Bun', type: 'gift', desc: 'Still warm from the oven.' },
      old_book: { name: 'Old Book', type: 'gift', desc: 'Its spine has been mended many times.' },
      lavender_sachet: { name: 'Lavender Sachet', type: 'gift', desc: 'Dried flowers in linen.' },
      ember_wine: { name: 'Ember Wine', type: 'gift', desc: 'Tastes of cinnamon and smoke.' },
      moonpetal: { name: 'Moonpetal', type: 'gift', desc: 'Glows faintly in the dark.' },
      potion: { name: 'Potion', type: 'consumable', desc: 'Restores HP.' },
    },
  };
  G.party = {
    removeItem(id, n) { const inv = G.state.inventory; inv[id] = (inv[id] || 0) - (n || 1); if (inv[id] <= 0) delete inv[id]; },
  };
  G.audio = {
    currentBgm: 'marigold',
    sfx(n) { G.__log.push('sfx:' + n); },
    playBgm(n) { G.__log.push('bgm:' + n); G.audio.currentBgm = n; },
  };
  G.ui = {
    modal: false,
    toasts: [],
    toast(text, kind) { G.__log.push('toast:' + kind + ':' + text); G.ui.toasts.push(text); },
    update() {}, draw() {},
  };
  const cmds = {
    say(who, text, o) { G.__log.push('say:' + who + ':' + text + (o && o.face ? ' [' + o.face + ']' : '')); return Promise.resolve(); },
    narrate(t) { G.__log.push('narrate:' + t); return Promise.resolve(); },
    choice(opts, o) { G.__log.push('choice:' + opts.join('|')); return Promise.resolve(G.__choice); },
    titleCard(t, s) { G.__log.push('title:' + t + ' / ' + s); return Promise.resolve(); },
    transfer(id, x, y, dir) { G.__log.push('transfer:' + id + (x !== undefined ? ' ' + x + ',' + y : '')); G.state.map.id = id; return Promise.resolve(); },
    healAll() { G.__log.push('healAll'); return Promise.resolve(); },
    toast(t, k) { G.ui.toast(t, k); return Promise.resolve(); },
    sfx(n) { G.__log.push('sfx:' + n); },
    bgm(n) { G.audio.playBgm(n); },
    gold() { return Promise.resolve(); },
  };
  for (const k of Object.keys(cmds)) G.script.define(k, cmds[k]);
})();
