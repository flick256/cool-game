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

  // @@NEXT@@
})();
