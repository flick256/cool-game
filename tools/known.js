/* Shared "known IDs" lists (from docs/CONTRACT.md) used by check/simulate to cross-validate independently-written modules. Loaded in the PAGE. */
window.KNOWN = {
  maps: 'wickholm_house wickholm mossgrave_wood brasshaven brasshaven_workshop brasshaven_inn undercroft_1 undercroft_2 marigold_deck marigold_galley gladius_citadel gladius_tavern gladius_arena aqueduct_1 aqueduct_2 pale_abbey pale_abbey_hall abbey_crypt_1 abbey_crypt_2 whisperwood_1 whisperwood_2 wren_cottage lumen_vale lumen_inn lumen_lake ashen_road_1 ashen_road_2 spire_gate spire_hall_1 spire_hall_2 spire_upper hearthstar_chamber'.split(' '),
  actors: 'rowan claret caspian rook seraphine wren'.split(' '),
  candidates: 'claret caspian rook seraphine wren'.split(' '),
  troops: 'tutorial wood_1 wood_2 wood_3 wood_4 boss_stag city_1 city_2 city_3 under_1 under_2 under_3 under_4 boss_sentinel aq_1 aq_2 aq_3 aq_4 arena_1 arena_2 arena_3 boss_champion crypt_1 crypt_2 crypt_3 crypt_4 boss_choir ww_1 ww_2 ww_3 ww_4 boss_matron ash_1 ash_2 ash_3 ash_4 boss_hale spire_1 spire_2 spire_3 spire_4 spire_5 boss_elowen boss_vael1 boss_vael2'.split(' '),
  items: ('potion hi_potion ether hi_ether elixir phoenix_down smelling_salts antidote bp_tonic wild_honey brass_cog silver_locket old_book lavender_sachet ember_wine star_chart ribbon whetstone moonpetal sweet_bun music_box pressed_flower lucky_coin rare_tea feather_quill ember_compass aether_coil gladius_pass abbey_seal witchwood_charm lantern_token lampwright_notes spire_key charm_ember charm_swift charm_guard charm_focus charm_luck ring_bond ' +
    ['sword','spear','dagger','axe','bow','staff','vest','mail','robe'].map(t => [1,2,3,4].map(n => t + '_' + n).join(' ')).join(' ')).split(' '),
  shops: 'wickholm_shop brasshaven_shop brasshaven_smith gladius_shop gladius_smith abbey_shop lumen_shop lumen_smith spire_shop'.split(' '),
  portraits: 'rowan claret caspian rook seraphine wren maren bram torvald abbess hale elowen vael pip unknown'.split(' '),
  exprs: 'normal happy sad angry surprised blush smirk worried'.split(' '),
  emotes: 'heart exclaim question sweat music dots anger bulb'.split(' '),
  bgm: 'title wickholm forest brasshaven workshop undercroft gladius arena tavern abbey crypt whisperwood festival ashen_road spire chamber battle boss finalboss victory gameover marigold sky romance tender sad tense mystery comic ending_love ending_common ending_lone credits'.split(' '),
  sfx: 'cursor ok cancel buzzer step door chest heal hit crit break slash pierce blunt arrow fire ice lightning wind light dark levelup coin save encounter escape boost heart buff debuff lantern portal jingle_item footstep_grass shatter'.split(' '),
  sprites: 'rowan claret caspian rook seraphine wren maren pip bram torvald abbess hale vael elowen villager_m1 villager_m2 villager_f1 villager_f2 elder child1 child2 guard merchant innkeeper choir_f choir_m gladiator engineer sailor noble hollow cat dog obj_chest obj_chest_open obj_lamp obj_sign obj_beacon obj_crate obj_marigold_wheel'.split(' '),
  bgs: 'forest village cave city steam arena abbey crypt witchwood road spire chamber ship void'.split(' '),
  sceneIds: (function () { const o = []; ['claret','caspian','rook','seraphine','wren'].forEach(x => ['b1','b2','b3','confession','eve','epilogue'].forEach(s => o.push(x + '_' + s))); ['banter_1','banter_2','banter_3','banter_4','final_toast'].forEach(s => o.push(s)); return o; })(),
};
