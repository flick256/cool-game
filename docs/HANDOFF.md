# HANDOFF — state of the project

Last updated at the end of the first (cloud) session.

## Status: the browser game is COMPLETE and playable
- Prologue + 5 chapters, 32 maps, 6 playable characters, 34 enemies / 45 troops, ~110 skills, 75 items, 9 shops.
- Octopath-style battles, menus, shops, save/load (3 slots in localStorage), title screen, name entry, Sky Chart travel, credits.
- Romance: 5 candidates (claret, caspian, rook, seraphine, wren) × (3 bond scenes + confession + eve + epilogue), gifts, Bonds screen, bond duo skills,
  Festival of Lanterns choice (Ch4), 3 endings (Twin Flame / Common Flame / Lone Flame). Plus 4 party banter scenes + `final_toast`.
- Procedural music (33 tracks) and ~40 SFX; touch controls; whole-map terrain rendering with edge blending, shorelines and shadows.

## What was verified (and how)
- `tools/autoplay.js`: all ~880 event scripts run in the real engine without errors.
- `tools/chain.js`: a New Game reaches every chapter-done flag and the credits; every companion joins through normal flow.
- Romance route checked by hand-priming Wren to tier 3: Lantern Night → confession → `lover = wren`.
- Battle sim: normal fights 2–6 rounds; bosses winnable at intended levels (Brass Sentinel ~77% at L11 vs a simple bot; Briar Matron ~80% at L22).

## NOT verified / known gaps
- **No one has played start-to-finish by hand.** Tests exercise scripts, not a continuous human run.
- **Audio has never been listened to** (only numeric checks). Many tracks are short 4–8 bar loops.
- Twin Flame / Common Flame epilogues were only run through scripted branch tests (`tests/ch5_branches_run.js`).
- Art is code-drawn and stylised: portraits are clean vector-cartoon, not painterly; character sprites are boxy; backgrounds are simple.
  Brasshaven/Gladius still lean on big grey cobble areas. Dirt/stone floors still use repeating per-tile painters.
- Boss intros replay after a defeat in ch3 (`loseOk` path); skills list API `G.party.skills()` returns only currently-usable skills (menu can't show locked skills greyed out).
- Seraphine/Wren (and any 5th+ member) join into **reserve** because the active party is 4; a toast tells the player to use Menu > Formation.
- Invented lore in bonds_a: Tallowmere (Caspian's village), Pennyfold (Rook's village), Rook's sister Mira (no portrait → 'unknown'), Marigold boiler "Pansy", Bram calls Claret "Clare".
- Stray empty file `/launch.txt` was created at the filesystem root by an agent in the cloud container (not in the repo; irrelevant on a new machine).

## Decisions / ideas under discussion (nothing started)
1. **Port to Godot 4** (recommended by the previous session): free, native Linux, 2D lighting/shaders/bloom for an HD-2D look, tilemap editor with autotiling,
   real audio, exports. Plan: port data + story first (they are portable), rebuild map/battle/menu scenes in GDScript, add a lighting pass, then swap in real assets.
   RPG Maker was considered and rejected for *me* to author (GUI-driven; Octopath battles need paid plugins) — but it has the best ready-made assets.
2. **Real art and music** will improve the look more than any engine change (free CC0/licensed RPG tilesets & sprites e.g. Kenney / OpenGameArt; record licences in the repo).
3. Possible **new story** reusing the engine: engine systems are story-independent, but this story's content is written *as code* inside `js/ch*.js`,
   `js/bonds_*.js`, `js/hub.js` (not data files). A new story = new `docs/STORY.md` bible + new chapter files against `docs/CONTRACT.md`.
4. The user can install anything and runs **Nobara Linux** (Fedora-based) with the Claude Code desktop app. Best setup: run Claude Code locally in this repo with
   Godot installed so screenshots of the real game can be taken and iterated on. (Godot also has a CLI: `godot --headless`, `--export-release`, `--script`.)

## Practical notes
- Rebuild the hosted page: `dist/index.html` = `index.html` with `<!DOCTYPE>/<html>/<head>/<body>` tags removed, `<title>Lanternbound</title>` + the `<style>` + body content,
  `onerror="__miss(event)"` attributes stripped; publish with the Artifact tool with every `js/*.js` as supporting files (relative paths preserved).
- `docs/ref/` (reference screenshots) is git-ignored — re-add from the originals if wanted.
- Module ownership table, all ID lists (maps, items, troops, sprites, bgm, sfx, portraits) and script commands: `docs/CONTRACT.md`. `tools/known.js` mirrors those ID lists for validators.
- The previous session built everything with 16 parallel Haiku subagents + 6 polish agents; see the working preferences in `CLAUDE.md`.

## Suggested next steps
1. Clone, run the game locally, **play it** and write down what feels wrong (pacing, writing, balance, visuals).
2. Decide: keep polishing the browser version, or start the Godot port (and replace code-drawn art with real assets).
3. Whatever you pick, update this file and `CLAUDE.md` at the end of each session.
