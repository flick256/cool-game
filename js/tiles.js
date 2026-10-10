/* =====================================================================
 * LANTERNBOUND — tiles.js  (OVERSEER-OWNED shared tile catalog)
 * Every tile is a single ASCII character. Maps are made of three layers:
 *   ground  (drawn first)   objects (drawn second, below the player's feet-line sort)   above (drawn over the player)
 * gfx_world.js MUST paint every tile listed here. maps/mapbuilder MUST use only these characters.
 * pass:true  = walkable. Collision = ground AND objects must both be passable.
 * ===================================================================== */
(function () {
  'use strict';
  const G = (window.G = window.G || {});
  // [char, name, pass, layer, note for the artist]
  const T = [
    // ------------- GROUND -------------
    ['.', 'grass', 1, 'ground', 'bright green grass, subtle blade speckles (RPG Maker VX style)'],
    [',', 'grass_flower', 1, 'ground', 'grass with tiny white/yellow flowers'],
    ['v', 'moss', 1, 'ground', 'dark olive overgrown moss/ivy ground (Wickholm is reclaimed by nature)'],
    [':', 'dirt', 1, 'ground', 'brown packed dirt path'],
    ['=', 'cobble', 1, 'ground', 'grey cobblestone street'],
    ['_', 'sand', 1, 'ground', 'pale sand'],
    ['~', 'water', 0, 'ground', 'blue water, ANIMATED 4 frames (ripples)'],
    ['w', 'shallows', 1, 'ground', 'shallow marsh water, walkable, ANIMATED 4 frames'],
    ['f', 'wood_floor', 1, 'ground', 'warm wooden plank floor (interiors)'],
    ['t', 'stone_floor', 1, 'ground', 'grey stone flag floor'],
    ['m', 'metal_grate', 1, 'ground', 'steampunk riveted iron grating floor, dark with brass rivets'],
    ['c', 'carpet', 1, 'ground', 'rich red carpet with gold edge'],
    ['k', 'cave_floor', 1, 'ground', 'dark rocky cave/dungeon floor'],
    ['b', 'bridge', 1, 'ground', 'wooden bridge planks'],
    ['h', 'hollow_ground', 1, 'ground', 'corrupted purple-black ground with faint violet cracks (the Hollow)'],
    ['a', 'arena_sand', 1, 'ground', 'warm tan colosseum sand'],
    ['g', 'marble', 1, 'ground', 'polished cream marble floor with faint veins'],
    ['l', 'lantern_path', 1, 'ground', 'cobble with warm golden glow patches (festival path)'],
    ['y', 'ash', 1, 'ground', 'grey ash-covered scorched earth'],
    ['j', 'deck', 1, 'ground', 'airship deck planks, darker wood with brass nails'],
    ['q', 'void', 0, 'ground', 'pure black / out of bounds'],
    // ------------- OBJECTS (nature) -------------
    ['T', 'tree', 0, 'objects', 'round leafy tree, trunk visible, transparent background'],
    ['N', 'pine', 0, 'objects', 'dark green pine tree'],
    ['d', 'dead_tree', 0, 'objects', 'bare grey twisted tree'],
    ['B', 'bush', 0, 'objects', 'round green bush'],
    ['R', 'rock', 0, 'objects', 'grey boulder'],
    ['F', 'flowers', 1, 'objects', 'patch of colourful flowers (decor, walkable)'],
    ['G', 'tallgrass', 1, 'objects', 'tuft of tall grass (decor, walkable)'],
    ['r', 'rubble', 0, 'objects', 'broken stone rubble pile'],
    ['+', 'gravestone', 0, 'objects', 'weathered gravestone'],
    ['i', 'crystal', 0, 'objects', 'glowing blue-violet crystal cluster (cave)'],
    ['z', 'rift', 0, 'objects', 'swirling violet-black Hollow rift (animated feel optional)'],
    // ------------- OBJECTS (buildings) -------------
    ['W', 'stone_wall', 0, 'objects', 'grey stone brick wall (building facade / interior wall)'],
    ['X', 'wood_wall', 0, 'objects', 'brown wooden plank wall'],
    ['O', 'window_wall', 0, 'objects', 'wooden wall with a small glowing window'],
    ['7', 'metal_wall', 0, 'objects', 'steampunk riveted iron wall with brass trim'],
    ['8', 'cave_wall', 0, 'objects', 'dark cave rock wall face'],
    ['9', 'marble_wall', 0, 'objects', 'cream marble abbey wall with gold trim'],
    ['D', 'door', 1, 'objects', 'wooden door set in a wall (walkable; events transfer you)'],
    ['x', 'fence', 0, 'objects', 'wooden picket fence'],
    ['1', 'roof_green', 0, 'objects', 'green shingled roof tile'],
    ['2', 'roof_yellow', 0, 'objects', 'yellow/ochre shingled roof tile'],
    ['3', 'roof_brown', 0, 'objects', 'brown shingled roof tile'],
    ['4', 'roof_blue', 0, 'objects', 'slate-blue shingled roof tile'],
    ['5', 'roof_red', 0, 'objects', 'terracotta red roof tile'],
    ['6', 'roof_copper', 0, 'objects', 'steampunk copper/verdigris roof tile with chimney vibe'],
    // ------------- OBJECTS (furniture & props) -------------
    ['S', 'shelf', 0, 'objects', 'wooden shelf with jars/goods'],
    ['Y', 'bookshelf', 0, 'objects', 'tall bookshelf full of books'],
    ['E', 'table', 0, 'objects', 'wooden table'],
    ['H', 'chair', 0, 'objects', 'simple wooden chair/stool'],
    ['Z', 'bed', 0, 'objects', 'bed with blue blanket'],
    ['C', 'crate', 0, 'objects', 'wooden crate'],
    ['U', 'barrel', 0, 'objects', 'wooden barrel'],
    ['I', 'hearth', 0, 'objects', 'stone fireplace with glowing fire'],
    ['L', 'lamp_post', 0, 'objects', 'iron lamp post with warm lantern glow'],
    ['s', 'statue', 0, 'objects', 'stone statue on plinth'],
    ['o', 'fountain', 0, 'objects', 'round stone fountain with water'],
    ['Q', 'pillar', 0, 'objects', 'marble column'],
    ['A', 'arena_wall', 0, 'objects', 'colosseum sandstone arched wall'],
    ['V', 'banner', 0, 'objects', 'green and gold hanging banner on a wall'],
    ['u', 'stairs', 1, 'objects', 'stone stairs (walkable)'],
    // ------------- OBJECTS (steampunk) -------------
    ['P', 'pipe', 0, 'objects', 'brass steam pipes along a wall / floor'],
    ['M', 'machine', 0, 'objects', 'brass-and-iron machine with dials and gears'],
    ['J', 'boiler', 0, 'objects', 'big copper boiler tank with pressure gauge'],
    ['e', 'gears', 0, 'objects', 'cluster of large interlocking gears'],
    // ------------- ABOVE (drawn over the player; never blocks) -------------
    ['^', 'canopy', 1, 'above', 'leafy tree canopy overhang, semi-transparent edges'],
    ['@', 'arch', 1, 'above', 'stone archway top piece'],
    ['#', 'beam', 1, 'above', 'dark wooden ceiling beam'],
    ['*', 'hanging_lanterns', 1, 'above', 'string of warm glowing paper lanterns'],
  ];

  const byChar = {}, byName = {}, list = [];
  for (const t of T) {
    const e = { ch: t[0], name: t[1], pass: !!t[2], layer: t[3], note: t[4] };
    if (byChar[e.ch]) throw new Error('duplicate tile char ' + e.ch);
    byChar[e.ch] = e; byName[e.name] = e; list.push(e);
  }
  G.tiles = {
    list, byChar, byName,
    ANIMATED: ['~', 'w'],
    passable: (ch) => { const t = byChar[ch]; return t ? t.pass : true; },
    char: (name) => (byName[name] ? byName[name].ch : null),
  };
})();
