# LANTERNBOUND — Technical Contract  (READ FULLY BEFORE WRITING CODE)

A browser JRPG in the style of **RPG Maker VX Ace / MV** (32px tile top-down world, side-view battles, blue windows,
face portraits beside the message box) with **Octopath-Traveler-style battles** (Break/Shield, Weaknesses, Boost Points, turn-order
bar) and a **romance system as a main pillar**. Pure vanilla JS + one `<canvas>`; **no libraries, no external images/audio/fonts**.
ALL art is drawn procedurally with Canvas 2D, ALL audio is synthesized with WebAudio. Runs by opening `index.html` (file://).

Story bible: `docs/STORY.md` (names, personalities, chapters, romance rules). Look & feel references: RPG Maker VX Ace
steampunk town + Claret dialogue, mossy village, Octopath Traveler town & battle UI.

## 0. Ground rules (apply to EVERY agent)
1. You own ONLY the file(s) assigned to you (see §1). Never edit other agents' files, `core.js`, `tiles.js`, `mapbuilder.js`, `index.html`, `main.js`, or `docs/*`.
   If the contract seems wrong/missing something: do the sensible thing, note it in your final report, do not edit shared files.
2. **Do NOT run `git commit`/`git add`/any git write command** (the overseer commits). Do not create other top-level files. You MAY create `tests/<yourfile>_*.html|js` scratch tests.
3. Style: ES2020, no modules/bundlers. Wrap your file in `(function(){ 'use strict'; const G = window.G; ... })();`. Attach to `G.<namespace>`.
   At the end of your file call `G.provide('<yourmodule>')`. Keep it robust: **never throw at load time because another module is absent** — reference other modules only inside functions (lazy), and guard with `if (G.xxx && G.xxx.fn)` when it is a *soft* dependency.
4. Frame-based timing: game logic runs at fixed 60 UPS via `scene.update()` (no `dt`). Use frame counters. `await G.wait(n)` waits n frames.
5. Logical resolution 640×480 (`G.W`,`G.H`), tile 32px (`G.TILE`) → 20×15 tiles visible. Canvas context is `G.ctx`; image smoothing is OFF — keep it crisp/pixelated. Draw with integer coordinates.
6. Performance: pre-render and **cache** procedural art into offscreen canvases (use `G.util.canvas(w,h)`); never regenerate art per frame. Use `G.util.rng(seed)` (deterministic) for procedural noise so art is identical every run.
7. Test your work headlessly (see §13). Run `node --check js/yourfile.js` ALWAYS. Make a real effort that it runs without console errors.
8. Quality bar: this is meant to feel like a real, polished, *fun* RPG. Prefer richer/better-looking over minimal. But correctness and API-compat first.
9. Rowan (player character) uses NO gendered pronouns anywhere. Wren uses they/them. Write dialogue accordingly. Player's name is `G.name()`; in `say` text you can write `{name}` and it is replaced.
10. When finished reply with a SHORT report: what you built, public API additions beyond the contract, known gaps. No long essays.

## 1. File ownership & load order (index.html loads in exactly this order)
| # | File | Owner | Namespaces / scenes / commands it provides |
|---|------|-------|-------------------------------------------|
| 1 | js/core.js | overseer | `G.util G.input G.scenes G.fx G.state G.save G.script G.wait G.story` + commands wait,fade,flash,shake,flag,set,inc,gold,bgm,sfx,stopBgm,run,chapter,callScript |
| 2 | js/tiles.js | overseer | `G.tiles` catalog |
| 3 | js/mapbuilder.js | overseer | `G.maps` registry, builder, event helpers (`G.maps.helpers`) |
| 4 | js/gfx_ui.js | **gfx-ui** | `G.gfx` windows, text, icons, portraits, faces, title art |
| 5 | js/gfx_world.js | **gfx-world** | `G.gfx` tiles, character sheets, object sprites, emotes |
| 6 | js/gfx_battle.js | **gfx-battle** | `G.gfx` enemy sprites, battlers, battle backgrounds, battle effects |
| 7 | js/audio.js | **audio** | `G.audio` procedural BGM + SFX |
| 8 | js/data.js | **data** | `G.data`, `G.party`, commands addItem,removeItem,hasItem,join,leave,healAll,setParty |
| 9 | js/ui.js | **ui** | `G.ui` + scenes title,nameentry,menu,shop,saveload,options,gameover,credits + commands say,narrate,choice,nameInput,titleCard,toast,shop,saveMenu,credits,hint |
| 10 | js/romance.js | **romance** | `G.romance` + scene 'bonds' + commands affection,runScene,afterRest |
| 11 | js/map.js | **map** | scene 'map', `G.map` + commands transfer,walk,walkTo,face,setPos,showNpc,camera,camReset,emote,jump,setSprite,follow,setEvent |
| 12 | js/battle.js | **battle** | scene 'battle' + command battle |
| 13 | js/hub.js | **romance** (same agent as #10) | maps marigold_deck, marigold_galley, scene 'skychart', commands chapterEnd, skychart |
| 14 | js/ch1.js | **ch1** | Prologue + Chapter 1 maps/events/story |
| 15 | js/ch2.js | **ch2** | Chapter 2 |
| 16 | js/ch3.js | **ch3** | Chapter 3 |
| 17 | js/ch4.js | **ch4** | Chapter 4 |
| 18 | js/ch5.js | **ch5** | Chapters 5 & 6, endings |
| 19 | js/bonds_a.js | **bonds-a** | romance scenes for claret, caspian, rook |
| 20 | js/bonds_b.js | **bonds-b** | romance scenes for seraphine, wren + party banter scenes |
| 21 | js/main.js | overseer | boot / `?map=` debug start |

Because chapter files load AFTER the engine, chapter files may call `G.maps.build`, `G.maps.helpers.*`, `G.romance.registerScene` etc. at load time.
`G.gfx` is ONE object shared by files #4–#6: each starts with `G.gfx = G.gfx || {};` and adds functions with `Object.assign(G.gfx, {...})`.

## 2. Core API (already written — read `js/core.js`)
- `G.input`: `pressed(b) down(b) repeat(b) released(b) dir()`; buttons `up down left right ok cancel menu dash boost pageup pagedown`. `ok`=Z/Enter/Space, `cancel`=X/Esc, `boost`=R/E, `dash`=Shift, `pageup`=Q, `pagedown`=C. Use `repeat()` for scrolling cursors.
- `G.scenes`: `register(name, factory)`, `push(name,params)`, `pop()`, `replace(name,params)` (clears stack), `swapTop`, `top()`. A scene object: `{ enter(params), update(), draw(ctx), exit(), pause(), resume(), opaque:true|false }`. `opaque:false` scenes draw over the scene below (menus over map: make menu scene `opaque:false`, and draw a dim overlay yourself).
- Global overlay: `G.ui.update()`/`G.ui.draw(ctx)` are called every frame by core (the ui agent implements them: message window, choices, toasts). While `G.ui.modal === true` the top scene's `update()` is NOT called.
- `G.fx` : `doFade('out'|'in',frames,color)`, `doFlash`, `doShake`; `G.fx.ox/oy` is applied to scene drawing automatically.
- `G.state` shape (see `G.NEW_STATE`): `{player:{name}, party:[ids], roster:{id:{id,level,exp,hp,sp,equip:{weapon,weapon2,armor,accessory}}}, inventory:{itemId:n}, gold, flags:{}, chapter, map:{id,x,y,dir}, romance:{points:{id:n}, lover:null|id, seen:{sceneId:true}, gifts:{}, journal:[]}, steps, playtime, battles}`.
  `G.flag(k)`, `G.setFlag(k,v=true)`, `G.name()`.
- `G.save.write(slot)`, `G.save.read(slot)` (+ `info`, `exists`, `anySave`, `latest`), `G.resumeGame()`, `G.newGame(playerName)` (calls `G.party.init()` if present).
- `G.util`: `clamp lerp rand randInt pick shuffle deepCopy rng(seed) hash(str) canvas(w,h)`.
- `G.wait(frames)` / `G.waitUntil(fn)` return Promises.

## 3. Story scripts & the command context `c`
Story/event code is written as `async (c) => { ... }`. `c` is `G.script.ctx`; every command is registered with `G.script.define(name, fn)` by the module listed. Missing commands warn instead of crashing.
Run a script: `await G.script.run(async (c) => {...})`. While any script runs, `G.script.busy === true` (map must not take player input; menu disabled).

| Command | Owner | Behavior |
|---------|-------|----------|
| `c.say(speaker, text, opts?)` | ui | Message box w/ name tag. `speaker`=display name or `null` for narration. `opts:{face:'claret', expr:'happy', side:'left'|'right'}`. If `face` omitted the ui maps the speaker name → portrait id (Claret→claret, the player's name→rowan, 'Maren'→maren …). `expr` ∈ `normal happy sad angry surprised blush smirk worried`. `{name}`→player name; `\n` newline. Auto-wraps and auto-paginates; keep each call ≲140 chars. Resolves when player confirms. |
| `c.narrate(text)` | ui | `say(null,text)` |
| `c.choice(options, opts?)` | ui | `options`: array of strings (≤6). `opts:{prompt:'text', cancel:-1|index}`. Resolves to chosen index. |
| `c.nameInput(default)` | ui | Name entry → string |
| `c.titleCard(title, subtitle?, frames?)` | ui | Big centered chapter/location card with fade |
| `c.toast(text, kind?)` | ui | Small notification at top-right. kind: 'info'|'heart'|'item'|'good' |
| `c.hint(text)` | ui | Boxed tutorial hint, wait for ok |
| `c.shop(shopId)` | ui | Opens shop scene, resolves when closed |
| `c.saveMenu()` | ui | Opens save/load scene (save mode), resolves when closed |
| `c.credits(endingKey)` | ui | Replaces stack with credits scene (endingKey 'twin'|'common'|'lone') → then title |
| `c.fade('out'|'in', frames=30, color?)`, `c.flash(color, frames)`, `c.shake(power, frames)`, `c.wait(frames)` | core | |
| `c.flag(k)`, `c.set(k,v=true)`, `c.inc(k,n=1)`, `c.gold(n)`, `c.chapter(n)`, `c.bgm(name)`, `c.sfx(name)`, `c.stopBgm(frames)`, `c.callScript(name,...args)` | core | |
| `c.addItem(id,n=1,{silent})`, `c.removeItem(id,n=1)`, `c.hasItem(id)`→count, `c.join(actorId, level?)`, `c.leave(actorId)`, `c.healAll()`, `c.setParty([ids])` | data | `addItem` shows toast+sfx unless `silent`. `join` adds to roster and to `state.party` (max 4 active; extras wait in roster reserve) and toasts "X joined the party!" |
| `c.transfer(mapId, x?, y?, dir?)` | map | Fade out, change map, fade in. Omitted x/y → target map `spawn`. Fires target's `onEnter` & `auto` events. |
| `c.walk(who, ['up','left',...], {speed?, wait=true})` | map | Move step by step (ignores collision with events if `{through:true}`). `who`: `'player'` or an event id of the current map. Resolves when done. |
| `c.walkTo(who, x, y, {wait=true})` | map | Simple pathfind (BFS) to tile |
| `c.face(who, dir)`, `c.setPos(who,x,y,dir?)`, `c.showNpc(eventId, bool)`, `c.setSprite(eventId, spriteKey)`, `c.setEvent(eventId, {x,y,dir,sprite})` | map | |
| `c.camera(x,y,frames)`, `c.camReset(frames)` | map | pan camera to center on tile / back to player |
| `c.emote(who, kind)` | map | kind ∈ `heart exclaim question sweat music dots anger bulb` (animated bubble above head, waits ~40 frames) |
| `c.jump(who)` | map | little hop |
| `c.follow(bool)` | map | party followers visible/following on/off |
| `c.battle(troopId, opts?)` | battle | Runs a battle; resolves `'win'|'lose'|'escape'`. opts: `{canEscape:true, bg:'forest', bgm:'battle', loseOk:false, intro:async c=>{}, onHalf:async c=>{}, outro:async c=>{}}`. `loseOk:true` → story battle: on defeat party is restored and `'lose'` returned (script decides). Otherwise defeat → game-over scene. |
| `c.affection(actorId, delta, reason?)` | romance | adds points (clamped 0–100), shows ♥ toast `"Claret ♥ +3"` (negative: broken-heart toast) |
| `c.runScene(sceneId)` | romance | runs a registered romance scene (also marks it seen) |
| `c.afterRest()` | romance | called by inns after resting; may trigger an inn chat |
| `c.chapterEnd(n, {to:'marigold_deck'})` | hub | sets `chN_done`, `state.chapter`, heals, shows 'Chapter N complete' card, transfers. Ch1 also sets `marigold_ready`. |
| `c.skychart()` | hub | opens destination chooser |

Authoring conventions: flags are `chN_*` for chapter N (e.g. `ch1_met_claret`), maps ids as in §8. **Every cutscene/event with one-off effects must guard itself with a flag** (events re-run each time conditions pass).

## 4. Data schemas (owner: data) — `G.data`
IDs are lowercase snake_case strings. Elements: `fire ice lightning wind light dark`. Weapon types: `sword spear dagger axe bow staff`. The 12 tokens are the *weakness tokens*.
Stats: `hp sp patk pdef eatk edef spd crit eva` (crit/eva are percentages 0–100). Level cap **30**.
```js
G.data.actors[id] = { id, name, title, cls, pronouns, weapons:['sword','staff'], // weapon types usable
  base:{hp,sp,patk,pdef,eatk,edef,spd,crit,eva},          // level 1 values
  growth:{hp,sp,patk,pdef,eatk,edef,spd,crit,eva},       // added per level (floats; stat = base + floor(growth*(lv-1)))
  learn:[{level:1, skill:'id'}, ...],                       // 8–10 entries
  equip:{weapon:'sword_1', weapon2:null, armor:'vest_1', accessory:null}, // starting equipment
  joinLevel, color:'#ffcc66', sprite:'rowan', portrait:'rowan', bio:'text' }
G.data.skills[id] = { id, name, desc, kind:'phys'|'elem'|'heal'|'buff'|'debuff'|'special'|'bond',
  element:null|'fire'.., weapon:null|'sword'.. (for phys: required weapon type; null = whatever weapon the actor chose),
  power:100, hits:1, target:'one_enemy'|'all_enemies'|'random_enemies'|'one_ally'|'all_allies'|'self'|'dead_ally',
  cost:0 /*SP*/, shield:1 /*shield dmg per weakness hit*/, effects:[{status:'poison',chance:0.8,turns:3,target:'target'|'self'}],
  special:null|'steal'|'provoke'|'revive'|'give_bp'|'cleanse', anim:'slash'|'pierce'|'blunt'|'arrow'|'fire'|'ice'|'lightning'|'wind'|'light'|'dark'|'heal'|'buff'|'debuff'|'bond',
  partner:null|'claret' /*bond skills: partner must be alive & in party*/, reqTier:null|2 /*romance tier*/, user:null|'rowan' /*only this actor*/ }
G.data.enemies[id] = { id, name, sprite:id, level, hp, shields, weak:['fire','sword'], resist:[...], stats:{patk,pdef,eatk,edef,spd,crit,eva},
  skills:[{skill:'id', weight:3}], exp, gold, drops:[{item,chance}], steal:[{item,chance}], boss:false, scale:1 }
G.data.troops[id] = { id, enemies:[enemyId,...≤5], bg:'forest', bgm:'battle'|'boss' }
G.data.items[id] = { id, name, desc, type:'consumable'|'gift'|'key'|'weapon'|'armor'|'accessory', price, // 0 = unsellable
  effect:{hp:150}|{sp:40}|{revive:0.5}|{cure:['poison','sleep']}|{bp:1}, use:'battle'|'menu'|'both',
  weaponType:'sword', slot:'weapon'|'armor'|'accessory', stats:{patk:8,...}, usable:['rowan',...] /*who can equip; omit = anyone w/ weapon type*/ }
G.data.shops[id] = { id, name, stock:[itemIds] }
G.data.expFor(level) -> total exp needed to reach `level` from 1
G.data.elements / G.data.weaponTypes arrays; G.data.statusInfo[id] = {name, icon, desc, buff:bool}
```
**Statuses** (fixed list): `poison sleep atkup atkdown defup defdown spdup spddown regen taunt guard`.
**Runtime helpers `G.party`** (data.js): `init()`, `members()` (active ids), `actor(id)` (runtime state), `stats(id)` → `{mhp,msp,patk,pdef,eatk,edef,spd,crit,eva}` incl. equipment, `skills(id)` → array of skill ids usable now (level + affection reqs `G.romance.tier(partner)>=reqTier` and partner in party), `join(id,level?)`, `leave(id)`, `setLevel(id,l)`, `gainExp(id,n)` → `[{level, learned:[skillIds]}]`, `healAll()`, `addItem(id,n)`, `removeItem(id,n)`, `count(id)`, `useItem(itemId, actorId)`→bool (menu use), `equip(actorId, slot, itemId|null)`→bool, `canEquip(actorId,itemId)`, `weaponTypesOf(actorId)` → equipped weapon types `['sword','staff']`, `nameOf(id)`.
Join level = `max(actor.joinLevel, round(avg level of current roster) - 1)`. Starting state: Rowan Lv 3 with starter gear & 3 potions.
**Enemy/troop/item/skill/actor IDs that OTHER agents rely on are FIXED below — data MUST define all of them (it may add more).**
- actors: `rowan claret caspian rook seraphine wren`
- enemies: `moss_slime forest_bat thorn_boar hollow_wisp hollow_stag cog_rat steam_sprite rust_bot order_guard brass_sentinel arena_hound sand_bandit gladiator_recruit drake_whelp catacomb_skeleton gladius_champion crypt_ghoul pale_moth briar_treant hollow_husk briar_matron hollow_choir ash_wraith hollow_hound order_inquisitor cinder_golem inquisitor_hale spire_sentinel hollow_knight void_moth cold_drone hollow_elowen warden_vael vael_cold_engine` (bosses: hollow_stag brass_sentinel gladius_champion briar_matron hollow_choir inquisitor_hale hollow_elowen warden_vael vael_cold_engine). Enemy `sprite` === its id.
- troops (id → enemies): `tutorial`[moss_slime]; **wood**: `wood_1`[moss_slime×2] `wood_2`[forest_bat×3] `wood_3`[thorn_boar,moss_slime] `wood_4`[hollow_wisp×2,forest_bat] `boss_stag`[hollow_stag,hollow_wisp×2];
  **city**: `city_1`[order_guard×2] `city_2`[cog_rat×3] `city_3`[rust_bot,cog_rat×2];
  **undercroft**: `under_1`[cog_rat×2,steam_sprite] `under_2`[rust_bot×2] `under_3`[steam_sprite×2,rust_bot] `under_4`[order_guard,rust_bot,cog_rat] `boss_sentinel`[brass_sentinel,cog_rat×2];
  **gladius/aqueduct**: `aq_1`[drake_whelp×2] `aq_2`[catacomb_skeleton×3] `aq_3`[sand_bandit×2,arena_hound] `aq_4`[drake_whelp,catacomb_skeleton×2] `arena_1`[gladiator_recruit×2] `arena_2`[arena_hound×2,gladiator_recruit] `arena_3`[sand_bandit×3] `boss_champion`[gladius_champion,gladiator_recruit×2];
  **crypt**: `crypt_1`[crypt_ghoul×2] `crypt_2`[pale_moth×3] `crypt_3`[crypt_ghoul,hollow_husk×2] `crypt_4`[pale_moth×2,crypt_ghoul] `boss_choir`[hollow_choir,pale_moth×2];
  **whisperwood**: `ww_1`[briar_treant,pale_moth] `ww_2`[hollow_husk×3] `ww_3`[pale_moth×2,hollow_wisp×2] `ww_4`[briar_treant×2] `boss_matron`[briar_matron,hollow_wisp×2];
  **ashen road**: `ash_1`[ash_wraith×2] `ash_2`[hollow_hound×3] `ash_3`[cinder_golem,ash_wraith] `ash_4`[order_inquisitor,hollow_hound×2] `boss_hale`[inquisitor_hale,order_inquisitor×2];
  **spire**: `spire_1`[spire_sentinel×2] `spire_2`[hollow_knight×2,void_moth] `spire_3`[cold_drone×3] `spire_4`[hollow_knight,spire_sentinel,void_moth] `spire_5`[void_moth×3] `boss_elowen`[hollow_elowen] `boss_vael1`[warden_vael] `boss_vael2`[vael_cold_engine].
  Troop `bg`: wood→forest, city→city, under→steam, aq/arena→(aq: cave, arena: arena), crypt→crypt, ww→witchwood, ash→road, spire→spire, boss_vael*→chamber, boss_elowen→spire.
  Enemy level ranges: wood 2–5 (boss_stag 6); city/under 6–10 (boss_sentinel 11); aq/arena 11–16 (boss_champion 17); crypt/ww 15–20 (boss_choir 20, boss_matron 22); ash 20–25 (boss_hale 26); spire 25–30 (boss_elowen 31, vael1 33, vael2 35). Tune HP/stats so a party at about the area level wins in ~3–5 rounds if they exploit weaknesses and loses if they don't pay attention; bosses 5–10 rounds. Give EVERY enemy 2–4 weaknesses (tokens above) and 1–3 shields (bosses 4–8); give enemies a signature skill each.
- items (must exist): consumables `potion hi_potion ether hi_ether elixir phoenix_down smelling_salts antidote bp_tonic` ; gifts `wild_honey brass_cog silver_locket old_book lavender_sachet ember_wine star_chart ribbon whetstone moonpetal sweet_bun music_box pressed_flower lucky_coin rare_tea feather_quill` (gift prices 40–400g; price drives nothing else) ; key items `ember_compass aether_coil gladius_pass abbey_seal witchwood_charm lantern_token lampwright_notes spire_key` ; equipment `sword_1..sword_4 spear_1..4 dagger_1..4 axe_1..4 bow_1..4 staff_1..4 vest_1..4 (light armor) mail_1..4 (heavy armor) robe_1..4 (cloth) charm_ember charm_swift charm_guard charm_focus charm_luck ring_bond` (tier N = better; sensible names, e.g. sword_1 "Iron Sword"). Who can equip armor type: rowan vest/robe; claret mail/vest; caspian mail; rook vest; seraphine robe; wren robe.
- shops: `wickholm_shop brasshaven_shop brasshaven_smith gladius_shop gladius_smith abbey_shop lumen_shop lumen_smith spire_shop` (stock tiers rise with chapter). 
- Required skills (ids) other modules reference: all five bond skills `bond_claret bond_caspian bond_rook bond_seraphine bond_wren` (kind 'bond', user:'rowan', partner:<id>, reqTier:2, cost ~18, flashy duo attack; damage/effect scales +15% per tier above 2 — battle implements scaling; tier read from `G.romance.tier(partner)`), plus 8–10 skills per actor (see STORY.md for roles/elements).
  Each actor's skill set must make them play differently: Rowan = light damage + BP/buff support (`give_bp`: grants an ally +1 BP, "Kindle"); Claret = lightning/fire gadget AoE + debuffs; Caspian = tank (`provoke`, guard, light); Rook = steal, dagger multi-hit, wind/dark, evasion; Seraphine = heals, revive, cleanse, light, buffs; Wren = fire/ice/lightning/wind spells incl. AoE, big SP costs.
  Enemy skills are in `G.data.skills` too (kind etc. same schema; ids prefixed `e_`).

## 5. Battle rules (owner: battle; data must balance to these)
Octopath-style. Party (up to 4) on the RIGHT, enemies LEFT. Side-view. Turn-order bar at top shows next ~10 actors.
- Round-based: at round start all living units sorted by `spd` (desc; ties random); `defend`ing last round: +50% spd for ordering. Display the *next* order including next round (second row smaller like Octopath).
- Commands: **Attack** (choose a weapon among the actor's equipped weapon types → pick target), **Skills** (list, SP cost, grey if unusable), **Item**, **Defend** (damage ×0.5 until your next turn, act earlier next round, +1 BP), **Escape** (chance based on speeds; bosses can't). Cancel (X) backs out. `R`/boost: BOOST.
- **BP**: each party member starts battle with 1 BP; at the start of each of their turns gain +1 (max 5). Boost spends 1–3 BP (press boost repeatedly; max 3 per action; can't exceed current BP): Attack hits `1+boost` times; skills multiply `power` by `(1 + 0.5*boost)` (heals/buffs likewise; multi-target skills get extra hits instead where `hits>1`). Show BP pips under each member.
- **Weaknesses & Shields**: each enemy has `shields` (number) and `weak` tokens. A hit whose weapon type or element (the attack's `element`, or the weapon token for phys) matches a weakness: *reveals* the weakness (until then shown as `?` icons — Octopath style; weaknesses are revealed also by the Scholar-like `analyze`: not needed) and reduces shield by `skill.shield` (default 1) per hit (multi-hit: each hit counts). Weakness damage ×1.2. Resist tokens (`resist`) → damage ×0.5 and no shield damage.
- **Break**: when shield reaches 0 the enemy is **Broken**: it loses its next turn (stunned), takes **×1.5** damage while broken, shield bar shows "BREAK". It recovers (shields refilled to max) at the start of the turn it would have acted, i.e. broken status lasts until after its skipped turn. Show a big "BREAK!" and shatter fx + shake.
- Damage: `dmg = max(1, round( (A*power/100*2 - D*0.9) * var * mult ))` where A=`patk` or `eatk`, D=`pdef`/`edef` of target (phys vs elemental by skill kind: phys→patk/pdef, elem→eatk/edef), `var`=0.9–1.1 random, `mult` = product of: weakness 1.2, break 1.5, crit 1.5 (crit chance = attacker.crit%), boost scaling (above), defend 0.5 (defender), atkup/atkdown ×1.3/×0.7 on attacker, defup/defdown ×0.7/×1.3 on damage taken. Enemy `evade` check: `eva%` chance to miss (skip for skills that don't miss). Healing: `heal = round(eatk*power/100*1.5)`.
- Statuses with turns (poison: 8% max HP at turn start; sleep: skip turn, wakes on damage; regen +8% maxHP; taunt: enemies must target this unit; guard).
- **Bond skills** (romance link): skill kind 'bond' with `partner`: only available if partner is in the *active party* and alive, and `G.romance.tier(partner) >= 2`. Performs a cinematic duo attack (both characters step forward, `bond` fx with hearts/flames, partner named in the skill banner: "Kindled Link — Claret!"), partner does NOT lose their turn. Power ×(1 + 0.15 × (tier-2)). Cost SP + 1 BP. Using one gives `G.romance.add(partner, 1)` at most 3 times per chapter (`G.romance.bondTrickle(partner)` helper — call it, it enforces the cap).
- Enemy AI: weighted random from `skills` (+ basic attack), prefer weak/low-HP targets sometimes; taunt respected. Bosses (flag `boss`) can't be escaped from; boss `onHalf` callback runs once when HP ≤ 50%.
- Victory: exp split to ALL roster members that fought (living ones fully; dead ones 50%; reserve members in roster 50% — so benched characters don't fall behind), gold, drops (toasts / results window), level-up display with learned skills, `victory` jingle. **Defeat**: if `opts.loseOk` restore & return 'lose' else `G.scenes.replace('gameover')`.
- After battle the `map` scene resumes (HP/SP carry over; SP regains +10% each battle end for QoL). Count `G.state.battles++`.
- Visual spec: top turn-order bar (face icons), enemy name + shield pips + HP gauge over each enemy (HP gauge only after first damage? always show for bosses), command window bottom-left like screenshot (blue RPG Maker window with arrow cursor), party status panel bottom-right (Name / HP / SP / BP pips), floating damage numbers (white; weakness yellow; crit bigger; heal green), attack animations from `G.gfx.drawFx`, screen shake on break/crit, enemy flash on hit, party battlers via `G.gfx.drawBattler`, backgrounds via `G.gfx.battleBg(key)`.

## 6. Graphics API (`G.gfx`)
**gfx_ui.js** (owner gfx-ui):
- `G.gfx.window(ctx,x,y,w,h,opts?)` — RPG Maker style window: dark-blue gradient body (alpha ~0.9), light-blue/white rounded border, subtle inner border. `opts:{style:'blue'|'dark'|'parchment'|'gold', alpha}`.
- `G.gfx.text(ctx,str,x,y,opts?)` — opts `{size=16, color='#fff', align:'left'|'center'|'right', outline:true, outlineColor:'#000', bold, maxWidth, shadow}`; draws with a black 2px outline (RPG Maker MV look); baseline top-left. Font stack `"Trebuchet MS","Segoe UI",Arial,sans-serif`. `G.gfx.textWidth(str,size,bold)`. `G.gfx.wrap(str,maxWidth,size)` → array of lines (respects `\n`).
- `G.gfx.gauge(ctx,x,y,w,h,ratio,c1,c2,opts?)`, `G.gfx.cursor(ctx,x,y,frame)` (white hand/arrow pointing right, bobbing), `G.gfx.pips(ctx,x,y,n,max,color)`.
- `G.gfx.icon(ctx,name,x,y,size=16)` names: `heart heartEmpty heartHalf sword spear dagger axe bow staff fire ice lightning wind light dark potion ether gold key shield shieldBreak unknown bp poison sleep up down check lock gift book star lantern flame`.
- Portraits: `G.gfx.portrait(id, expr='normal')` → cached canvas **144×192** (bust, transparent bg, drawn facing right, eyes visible, painted anime-ish look with hair, face, shoulders, clothing, accessories with outlines/shading) — ids: `rowan claret caspian rook seraphine wren maren bram torvald abbess hale elowen vael pip` (+ `unknown` silhouette). Expressions `normal happy sad angry surprised blush smirk worried` (change eyes/brows/mouth/blush). `G.gfx.drawPortrait(ctx,id,expr,x,y,{flip,alpha,scale})`.
  `G.gfx.face(id,expr='normal')` → cached **48×48** head crop for UI (menus, turn order). `G.gfx.drawFace(ctx,id,x,y,size=48,expr)`.
- `G.gfx.drawTitleScreen(ctx, t)` — full 640×480 animated title backdrop (starfield night, a huge glowing lantern-sun, silhouette skyline/forest, floating embers/fireflies; logo drawn by `G.gfx.drawLogo(ctx,x,y)` "LANTERNBOUND" + subtitle "Hearts of the Hollow Dusk").
- `G.gfx.drawMenuBg(ctx,t)` — soft animated dark-blue backdrop for menus (used under menu scenes), `G.gfx.drawHeartMeter(ctx,x,y,points,tier,w)` romance meter (hearts fill by tier).
**gfx_world.js** (owner gfx-world):
- `G.gfx.tile(chOrName)` → cached 32×32 canvas; `G.gfx.drawTile(ctx,chOrName,x,y,frame=0)` ; animated tiles (`~`,`w`) have 4 frames (`frame = floor(G.frame/20)%4`). Paint EVERY entry of `G.tiles.list` (`note` fields describe each). Tiles with transparent areas (objects/above) must have real alpha so the ground shows through; objects like trees are drawn on top of the ground layer. Use a coherent VX-Ace-ish palette, soft dithering, outlines, per-tile deterministic variation. Roof/wall tiles must look good when tiled in blocks (`G.maps` buildings are blocks of roof tiles over a 1-row facade).
- `G.gfx.charSheet(key)` → cached **96×128** canvas: 3 columns (walk frames 0,1,2: left-step, stand, right-step) × 4 rows (down, left, right, up) of 32×32 cells (chibi VX-style: big head, hair detail, outfit; feet at the bottom of the cell). `G.gfx.drawChar(ctx,key,dir,frame,x,y)` where x,y = top-left of the 32×32 cell (`dir` ∈ down/left/right/up, `frame` 0–2).
  Required keys — heroes: `rowan claret caspian rook seraphine wren`; named NPCs: `maren pip bram torvald abbess hale vael elowen` (elowen = ghostly Hollow queen look); generic: `villager_m1 villager_m2 villager_f1 villager_f2 elder child1 child2 guard merchant innkeeper choir_f choir_m gladiator engineer sailor noble hollow cat dog`; objects (single image replicated into all 12 cells): `obj_chest obj_chest_open obj_lamp obj_sign obj_beacon obj_crate obj_marigold_wheel`. `obj_lamp` = glowing lantern on a post (Lantern Waypoint, gentle animated glow via frame 0–2). Unknown key → draw a placeholder silhouette (never throw).
- `G.gfx.drawEmote(ctx,kind,x,y,t)` (t=frames since start; bubble pops above head) for kinds `heart exclaim question sweat music dots anger bulb`.
- `G.gfx.glow(ctx,x,y,radius,color,alpha)` additive radial light.
**gfx_battle.js** (owner gfx-battle):
- `G.gfx.enemy(key)` → cached canvas (48–160px wide depending on creature; bosses large 128–192px) ; `G.gfx.drawEnemy(ctx,key,x,y,frame,opts?)` x,y = bottom-center anchor; opts `{flash:0..1 (white overlay), alpha, scale, shake, flipX, tint}`; idle 'breathing' bob from `frame`. Make EVERY enemy id in §4 distinct and good-looking (slimes, bats, boars, wisps, a stag with Hollow cracks, cog rats, steam sprites, rust bots, guards in white-gold armor, brass sentinel, hounds, bandits, gladiators, whelps, skeletons, champion, ghouls, moths, treants, husks, matron, choir (floating mouths/robes), wraiths, hollow hounds, inquisitors, cinder golems, Hale, spire sentinels, hollow knights, void moths, cold drones, Elowen (tall ghostly woman in a long dress, lantern-flame heart), Vael (silver coat, floating lantern), Vael's Cold Engine (huge mech throne)).
- `G.gfx.battler(actorId,pose)` / `G.gfx.drawBattler(ctx,actorId,pose,x,y,frame,opts?)` — party battle sprite = the actor's charSheet scaled ×2 (64×64, nearest-neighbour; x,y = bottom-center). poses: `idle`(breathing), `attack`(lean forward/lift), `cast`(arms up glow), `hurt`, `defend`, `dead`(lying), `win`(hop), `weak`(low HP slump). Use charSheet frames+transforms (`G.gfx.charSheet(spriteKey)` from gfx_world; actor→sprite key equal to actorId).
- `G.gfx.battleBg(key)` → cached 640×480 canvas for keys `forest village cave city steam arena abbey crypt witchwood road spire chamber ship void` — painterly layered scenes (sky gradient, parallax silhouettes, ground band with perspective; wooden fence front like screenshot optional). Must leave the lower 140px calmer (UI sits there).
- `G.gfx.drawFx(ctx,name,x,y,t,opts?)` — t ∈ 0..1 progress; `name` ∈ `slash pierce blunt arrow fire ice lightning wind light dark heal buff debuff break hit steal bond poison revive shield`. x,y = target center. `G.gfx.fxDuration(name)` → frames (20–45). `opts:{big:true,color}`. `bond` = interlocking heart-shaped flames in rose/gold. `break` = shield shards shattering.
- `G.gfx.drawShieldPips(ctx,x,y,count,max,broken)`; `G.gfx.drawWeakIcons(ctx,x,y,weakList,revealedSet)` (12 icons or `?`).
**Never call a function from a gfx file that another gfx file defines at load time; call them lazily.**

## 7. Audio API (`G.audio`) — owner audio
Procedural WebAudio chiptune/orchestral-lite synth (square/triangle/saw/noise voices, ADSR, simple delay/reverb, a lookahead step sequencer driven by `G.audio.update()` per frame or its own scheduler). AudioContext is created lazily on first `unlock()` (called by core on first key/click). All functions must be **safe no-ops if audio is unavailable/locked** (file:// headless). `G.audio.playBgm(name,{fade:30})` (no-op if already playing that name; crossfade), `stopBgm(frames)`, `jingle(name)` (plays a short non-looping track then resumes previous bgm, used for `victory`), `sfx(name)`, `setVolume({bgm:0..1,sfx:0..1})`, `getVolume()`, `unlock()`, `update()`, `voice(actorId,key)` (**no-op stub**: voice acting planned for a later build), `muted` toggle `G.audio.setMuted(b)`.
BGM names (each distinct: key, mode, tempo, instrumentation, motif; loops seamlessly; 30–90 s each, built from compact pattern data — be clever and generative to keep the file reasonable): `title wickholm forest brasshaven workshop undercroft gladius arena tavern abbey crypt whisperwood festival ashen_road spire chamber battle boss finalboss victory gameover marigold sky romance tender sad tense mystery comic ending_love ending_common ending_lone credits`.
SFX names: `cursor ok cancel buzzer step door chest heal hit crit break slash pierce blunt arrow fire ice lightning wind light dark levelup coin save encounter escape boost heart buff debuff lantern portal jingle_item footstep_grass shatter`.

## 8. Maps, events and the world (owner of engine: map; map data: chapter agents)
Map def (built via `G.maps.build(...)` → `m.finish()`; see `js/mapbuilder.js` — READ IT):
`{id,name,w,h,bgm,spawn:{x,y,dir},interior,tint,ground[],objects[],above[],events[],encounters,onEnter}` — layers are arrays of equal-length strings of tile chars from `js/tiles.js` (`' '` = empty in objects/above).
Use `G.maps.helpers.{npc,sign,chest,transfer,save,shipPad,innkeeper,shop,trigger,auto}` for common events (they already exist in mapbuilder.js — read the signatures). Custom events: `{id,x,y,w?,h?,sprite:'claret'|null,dir,trigger:'action'|'touch'|'step'|'auto',solid,move:'still'|'wander'|'face',if:()=>bool,run:async c=>{}}`:
- `action`: player presses ok facing the tile (or on it, if non-solid). `touch`: player walks into it (solid) or onto it (non-solid). `step`: player *arrives* on a tile inside rect (x..x+w-1,y..y+h-1). `auto`: runs automatically after map entry fade-in (ordered by definition), only if `if()` true. 
- `if` is re-evaluated on every map entry, after every script ends, and every 30 frames; falsy → event hidden & inactive. Several events may share a tile with different `if`s.
- Events with a `sprite` and `solid:true` block movement. `sprite:null` = invisible trigger.
- Encounters: `m.encounters({steps:[18,34], troops:[{id:'wood_1',weight:3},...]})`. Random battle when the step counter runs out (Octopath-style, no visible enemies). Map engine shows a flash + `encounter` sfx, then `c.battle(troop)`. Towns/interiors: no encounters. Encounter rate halves... never inside events/scripts.
- Followers: party members 1–3 trail the player (classic VX follow chain); `c.follow(false)` hides them for cutscenes.
- The player sprite is the actor `rowan`. Map scene draws: ground layer → objects layer (+ event sprites + player sorted by feet y) → above layer → optional `tint` overlay (e.g. `'rgba(10,20,60,0.35)'` for night) → location name banner on entry. Camera follows player, clamped to map bounds; maps smaller than the screen are centered. Doors/transfers: `H.transfer` or custom.
- Pressing `menu` (Esc/X/M/Tab) on the map when `!G.script.busy` pushes scene `'menu'`. Dash with Shift.
- `G.map` (runtime, set by map scene): `id, def, player:{x,y,dir}, events, getEvent(id), refreshEvents(), teleport(x,y)`. Map scene params: `{map,x,y,dir,resume}`; on enter it stores `G.state.map` (every transfer & before saving).
- Map engine must also support 2×1 / big event sprites? NO — all sprites are 32×32.
**Map ids & owners** (every map ids below MUST exist; towns/chapters may add more):
- ch1.js: `wickholm_house wickholm mossgrave_wood brasshaven brasshaven_workshop brasshaven_inn undercroft_1 undercroft_2` (new game starts in `wickholm_house` at (5,6))
- hub.js: `marigold_deck marigold_galley`
- ch2.js: `gladius_citadel gladius_tavern gladius_arena aqueduct_1 aqueduct_2`
- ch3.js: `pale_abbey pale_abbey_hall abbey_crypt_1 abbey_crypt_2 whisperwood_1 whisperwood_2 wren_cottage`
- ch4.js: `lumen_vale lumen_inn lumen_lake ashen_road_1 ashen_road_2`
- ch5.js: `spire_gate spire_hall_1 spire_hall_2 spire_upper hearthstar_chamber`
Every town/outdoor-arrival map: its `spawn` is the arrival point next to its `H.shipPad(x,y)` (towns: brasshaven, gladius_citadel, pale_abbey, lumen_vale, spire_gate, wickholm). Maps should be generously sized & varied (towns ≈ 40×30, dungeons ≈ 30×30 with branching, fields ≈ 40×30, interiors ≈ 12–20 × 10–14) with 3–5 chests, decorative detail, an obvious path, a Lantern Waypoint (`H.save`) in every dungeon (near its entrance AND before bosses), and encounters in fields/dungeons.
Use ALL available art: paths (`path()`), ponds, trees/bushes/flowers scattered, fences, houses with different roofs, lamp posts, statues, fountains. Make it look like a lived-in RPG Maker town, not a flat field.

## 9. Romance (owner: romance) — `G.romance`
Constants: `G.romance.CANDIDATES=['claret','caspian','rook','seraphine','wren']`, `TIERS=['Companion','Friend','Close','Devoted','Beloved']`, tier thresholds by points: 0:<15, 1:≥15, 2:≥40, 3:≥65; tier 4 only when `lover===id`.
API: `get(id)`, `add(id,n,reason?)` (silent; clamps; records journal), `tier(id)`, `tierName(id)`, `lover()`, `setLover(id)`, `eligible()` (ids with tier≥3), `canGift(id)`, `giftPrefs(id)`→`{loves:[],likes:[],dislikes:[]}`, `giveGift(actorId,itemId)`→`'love'|'like'|'neutral'|'dislike'|'full'` (applies points love +8/like +4/neutral +1/dislike -3; one gift per character per chapter; consumes the item; `full` = already gave this chapter), `registerScene({id, actor, minTier, minChapter, kind:'bond'|'confession'|'eve'|'epilogue'|'banter'|'inn', once:true, title, run:async c=>{}})`, `scenes()`, `scene(id)`, `available(actorId)` (bond scenes whose reqs are met & unseen, lowest first), `seen(id)`, `bondTrickle(partnerId)`.
Gift items & preferences (romance.js defines; bonds files may reference): claret loves `brass_cog wild_honey`, likes `whetstone ember_wine music_box`, dislikes `lavender_sachet`; caspian loves `old_book rare_tea`, likes `whetstone star_chart pressed_flower`, dislikes `ember_wine`; rook loves `lucky_coin ember_wine`, likes `silver_locket sweet_bun brass_cog`, dislikes `old_book`; seraphine loves `lavender_sachet sweet_bun`, likes `feather_quill music_box rare_tea pressed_flower`, dislikes `whetstone`; wren loves `moonpetal rare_tea`, likes `pressed_flower wild_honey ribbon feather_quill`, dislikes `sweet_bun`.
Registered scene ids (bonds files MUST register exactly these; chapter/hub files call them by id): for each `X` in `claret caspian rook seraphine wren`: `X_b1` (minTier 1, minChapter 1... see below), `X_b2` (minTier 2), `X_b3` (minTier 3), `X_confession` (kind confession; run by ch4 festival), `X_eve` (kind eve; run by ch5), `X_epilogue` (kind epilogue; run by ch5 ending when X is the Beloved). minChapter: b1 = the chapter after they join (claret: 1; caspian,rook: 2; seraphine,wren: 3), b2 ≥ +1 chapter (claret 2, caspian/rook 3, seraphine/wren 4 — but min 3 is fine), b3 ≥ 4. Scenes ≈ 25–45 lines of real, characterful dialogue with choices that move affection.
Plus group scenes (bonds_b): `banter_1 … banter_4` (kind banter, whole-party fun scenes on deck, chapters 2,3,4,5), `final_toast` (night before the last battle everyone together, run by ch5).
- **Marigold hub** (`hub.js`): companions stand on the deck/galley as event NPCs (visible if joined); talking to one: if `G.romance.available(id)` has a scene → offer it ("Talk with X" → plays it) else small rotating chat + **Give gift** option (choose from inventory gifts, reaction text per result). Helm event → `c.skychart()` (scene `'skychart'`: map of Auren, destinations with names/flavor: `wickholm` (map wickholm), `brasshaven`, `gladius_citadel`, `pale_abbey`, `lumen_vale` (needs flags ch2_done & ch3_done), `spire_gate` (needs ch4_done); each requires `marigold_ready`; unlocked list can be gated by flags; arrival uses each map's `spawn`).
- Scene `'bonds'` (pushed from the main menu "Bonds"): list of 5 candidates (face, name, class, tier name, heart meter, points, next-scene hint "New talk available!", likes/dislikes revealed progressively: loves visible at tier≥1, likes tier≥2, dislikes tier≥1), shows who is the Beloved with a golden heart, shows the journal (`G.state.romance.journal` of short strings like "Ch2 — Claret admitted she's afraid of heights.").

## 10. UI (owner: ui) — `G.ui`
`G.ui.modal` (bool), `update()`, `draw(ctx)`, `toast(text,kind)`, `faceFor(speakerName)`, `busy()`.
Message window RPG-Maker style: dialogue box at the bottom (≈ 640×128, window style 'blue'), name tag tab above the box's left edge (like the Claret screenshot), the speaker portrait standing at the left (or right if `side:'right'`) extending above the box, typewriter text effect (hold ok = faster, ok = finish line, ok again = next page), blinking ▼ page arrow, expression changes. Narration (speaker null) = centered box without portrait. Choices appear as a window above/right of the message box with a hand cursor, hover highlight. Dim portrait of non-speaker is optional.
Scenes (all registered via `G.scenes.register`):
- `title`: animated `G.gfx.drawTitleScreen`, menu **New Game / Continue / Options**; New Game → `nameentry` scene (grid keyboard + typed input, default "Rowan", ≤10 chars) → `G.newGame(name)`, `G.audio.playBgm`, → `G.resumeGame()` (start map wickholm_house). Continue → `saveload` (load mode) → `G.save.read` → `G.resumeGame()`. Press-any-key intro fade. Version/credit line.
- `menu` (opaque:false, over the map): left command list: **Items, Skills, Equip, Status, Bonds, Formation, Save, Options, Title**. Right panel shows party (face, name, Lv, HP/SP gauges), bottom: gold, playtime, chapter/location. Sub-screens: Items (consumables use on actor; gifts/key tabs), Skills (list per actor with desc/cost/element icons), Equip (4 slots, stat preview ▲▼), Status (stats, weapons, weakness-token icons, bio, romance tier hint), Formation (choose the 4 active members from the roster, Rowan locked first), Bonds → `G.scenes.push('bonds')` (romance.js owns the scene; graceful if missing), Save → saveload scene, Options (bgm/sfx volume, text speed, dash default), Title (confirm).
- `shop` `{shopId}`: Buy / Sell / Exit, gold window, quantity picker, owned counts, equipment shows stat deltas for the selected actor.
- `saveload` `{mode:'save'|'load'}`: 3 slots with chapter, location, playtime, party faces + levels.
- `options`, `gameover` (Load last save / Title; "The lamps go dark…"), `credits` `{ending}` (scrolling credits over night-sky art with ending-specific epilogue paragraph; pressing ok after the end returns to title).
- Commands from §3 owned by ui.
- Cursors: arrow keys / WASD, ok/cancel; supports **mouse click** on menu entries is a bonus.

## 11. Chapter & hub flow (all chapter agents)
- Game start: `wickholm_house`, chapter 0. **Prologue = ch1.js.** Ch1 ends with `await c.chapterEnd(1)` after Claret joins and Marigold is ready (it sets `marigold_ready`, transfers to `marigold_deck`).
- Ch2 and Ch3 are both available after Ch1 in either order from the Sky Chart. Ch4 requires `ch2_done && ch3_done`. Ch5 requires `ch4_done`. Ch6 follows Ch5 directly in the same file.
- Each chapter: gives its companions via `c.join(...)`, spends ≥3 *heart choices* (`c.affection`) across the chapter for the relevant candidates (and Claret), has at least one boss, a dungeon w/ encounters, 1–2 towns' worth NPCs, a secret/optional chest or sidequest, and ends with `c.chapterEnd(n)` (ch4 → returns to `marigold_deck` after the Hale boss; ch5/6 special).
- Per-chapter `G.story.chapters[n] = {title, subtitle}` registered by each chapter file (used by hub's chapter card).
- Bosses use `c.battle('boss_x', {canEscape:false, bgm:'boss', intro, onHalf, outro})` with banter. Never make the player re-watch cutscenes after a defeat: set flags before the battle, put the post-battle scene behind a different flag.
- Chapter agents write only their chapter's story logic and maps. Romance scenes (`X_b1…X_epilogue`, `banter_*`, `final_toast`) are written by bonds agents; chapter code only *triggers* them with `await c.runScene('claret_confession')` etc. (and must tolerate their absence: runScene on an unknown id just warns).

## 12. Dialogue style guide
Distinct voices: Claret — clipped, sardonic, engineering metaphors, softens when sincere. Caspian — formal, gentle, dry humour he doesn't realise is humour. Rook — playful, flirty, deflecting, drops the act at key moments. Sera — soft, earnest, sneaky deadpan; hymns/lantern imagery. Wren — blunt, literal, surprising kindness, plant & animal metaphors, they/them. Maren — gruff grandma energy. Vael — measured, courteous, chilling sincerity. Rowan lines (when Rowan speaks) are short & warm; give the player **choice lines** to define Rowan's tone: Earnest / Teasing / Flustered / Brave. ~140 chars max per `say`. Use `\n` sparingly. Give moments room: banter, a quiet beat, then the stakes. Use `c.emote`, `c.sfx`, `c.bgm('romance'|'tender'|'sad'|'tense'|'comic')`, camera pans and screen effects to sell scenes — cutscenes should feel directed.

## 13. Testing tools (all agents)
- Syntax: `node --check js/<file>.js`.
- Headless browser: `NODE_PATH=$(npm root -g) node tools/run.js --url "index.html?map=wickholm" --frames 120 --shot /tmp/x.png --eval "G.state.map" [--keys "right:20,ok"]`. Prints console errors/warnings and exits non-zero on errors. **View screenshots with the Read tool** (it displays images) to check how things look. `--keys` entries: `button:frames` (press & hold) or `wait:frames`.
- Static map check: `NODE_PATH=$(npm root -g) node tools/check.js js/ch1.js` loads core+tiles+mapbuilder+your file and prints map validation warnings (bounds, unknown tiles, unreachable events). Chapter agents: run it until clean.
- Mock script simulation (chapter/bond agents): `NODE_PATH=$(npm root -g) node tools/simulate.js js/ch1.js [js/bonds_a.js ...]` runs every event script and registered scene with a mock `c` (choices pick random options) and reports exceptions / undefined commands. Run until clean.
- Other modules may not exist yet while you work. Build a tiny scratch harness (`tests/<you>.html` with `<canvas id="game">` loading `js/core.js`, `js/tiles.js`, your file(s) and whatever stubs you need) and screenshot-test with `tools/run.js --url tests/<you>.html`.
- Debug start once everything is integrated: `index.html?map=brasshaven&party=rowan,claret&level=10&flags=marigold_ready`.
