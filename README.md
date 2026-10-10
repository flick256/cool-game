# LANTERNBOUND — Hearts of the Hollow Dusk

A complete browser JRPG in the style of **RPG Maker VX Ace**, with **Octopath Traveler–style battles** (Break / Shields,
weaknesses, Boost Points, turn-order bar) and a **romance system at the centre of the story**.

No installs, no assets: every sprite, tile, portrait, song and sound effect is generated in your browser
(Canvas 2D + WebAudio). **Open `index.html` in a modern browser** (or serve the folder with any static server).

## Controls
| Action | Keys |
|---|---|
| Move | Arrow keys / WASD |
| Confirm / talk | Z / Enter / Space |
| Cancel / open menu | X / Esc (menu also M / Tab) |
| Dash | Hold Shift |
| **Boost** (battle) | R / E (tap up to 3×) |
| Switch pages / tabs | Q / C |
| Fast-forward dialogue | Hold Shift |
| Dev overlay | F3 |

Mouse clicks work on menus and choices.

## The story
Auren is lit by the **Hearthstar**, a lantern-sun that is failing. Every person carries a **wick** — a small inner flame.
When a wick gutters from grief or loneliness, its owner turns **Hollow**. You are **Rowan**, a wickless lamplighter whose
touch can *kindle* other people's flames. Gather five companions aboard the airship **Marigold** — Claret (engineer),
Caspian (fallen knight), Rook (rogue), Seraphine (cantor) and Wren (hedge-witch, they/them) — and climb the Hearth Spire to
face Warden Vael, who believes love is only fuel and that the kindest thing is to put every flame out.

* Prologue + 5 chapters, ~30 maps: Wickholm, Brasshaven, Gladius Citadel, Pale Abbey, Whisperwood, Lumen Vale, the Hearth Spire.
* Chapters 2 and 3 can be played in either order from the Sky Chart on the Marigold.

## Romance
* Five romanceable companions (any player can romance anyone). Each has 3 **Bond scenes**, a **confession**, an **Eve** scene and an **epilogue**.
* Raise affection with heart choices in the story, Bond scenes on the Marigold deck, gifts (everyone has loves and dislikes), and
  fighting together. Check progress in the menu under **Bonds**.
* At the **Festival of Lanterns** (Chapter 4) anyone at Devoted rank may ask you to share a lantern — choose your Beloved.
* At **Close** rank or higher, Rowan unlocks a **Kindled Link** duo attack with that companion in battle.
* **Endings:** *Twin Flame* (with your Beloved), *Common Flame* (the whole crew, no Beloved), *Lone Flame* (bittersweet).

## Battle cheat-sheet
* Hit an enemy's weakness (weapon or element) to chip its **shield**; at 0 it is **Broken** — it loses a turn and takes 50% more damage.
* **BP** builds +1 per turn (max 5). Boost attacks to hit more times, or boost skills for more power.
* Unknown weaknesses show as `?` until you discover them. Defend to act earlier next round and gain BP.
* Save and heal at **Lantern Waypoints** (glowing lamps). The Marigold's Sky Chart takes you between regions.

## Developer notes
* `docs/STORY.md` — story bible. `docs/CONTRACT.md` — architecture / module contract.
* Debug start: `index.html?map=brasshaven&party=rowan,claret&level=10&flags=marigold_ready&nocut=1`
* `node tools/check.js js/ch1.js` — static map validation. `node tools/simulate.js --all` — mock-run every script.
* `node tools/autoplay.js` — runs every event script in the real engine (needs Playwright + Chromium).
* `node tools/mapshot.js <mapId> out.png` — render a whole map to an image. `node tools/play.js <url> steps…` — scripted real-time playtest.
* `node tests/battle_sim.js <troop…> --party rowan,claret --level 10` — headless battle balance simulation.
* Voice acting is planned for a later build: `G.audio.voice(actorId, key)` is the hook (currently a no-op).
