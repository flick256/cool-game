# CLAUDE.md — Lanternbound

Read this first, then `docs/HANDOFF.md` (status, decisions, next steps), then `docs/STORY.md` and `docs/CONTRACT.md` as needed.

## What this project is
**Lanternbound — Hearts of the Hollow Dusk**: a complete JRPG in the style of RPG Maker VX Ace with **Octopath Traveler–style battles**
(Break/shields, weaknesses, Boost Points, turn-order bar) and a **romance system as a main pillar** of the story.
Currently a pure vanilla-JS + Canvas browser game: no libraries, no asset files — all art is drawn by code, all audio is synthesized (WebAudio).
Play it by opening `index.html` (or serve the folder). The user is considering a **Godot 4 port** (see HANDOFF.md).

## The user's working preferences
- They want me to act as **overseer** and use **many parallel subagents (Haiku 5.5, high effort)** to build big modules, with clear
  contracts between modules. That worked well: write the contract/docs first, then fan out one agent per module/file.
- Voice acting: **later build** (hook exists: `G.audio.voice`, currently a no-op).
- Quality bar: it should look like an RPG Maker game and play like Octopath; story and romance matter a lot. Prefer polish.
- Reference screenshots (RPG Maker dialogue with portrait, mossy village, Octopath colosseum town, RPG Maker battle, Octopath battle UI)
  lived in `docs/ref/` but are **git-ignored** (not in the repo). If you need them, ask the user to re-add them.

## Hard rules for content
- **Rowan (the player character) uses NO gendered pronouns.** Refer to Rowan as "you"/{name}. The player can be any gender.
- **Wren uses they/them.** Any of the five love interests can be romanced by any player.
- Keep romance PG-13 and tasteful. Dialogue lines ≲140 chars each.

## How to run and test
```
python3 -m http.server 8000     # then open http://localhost:8000
index.html?map=brasshaven&party=rowan,claret&level=10&flags=marigold_ready&nocut=1   # debug jump (nocut=1 skips cutscenes)
```
Headless tools need Node + Playwright + Chromium (`npm i -g playwright`; set `NODE_PATH=$(npm root -g)`):
- `node tools/check.js js/ch1.js` — static map validation (bounds, unknown tiles, unreachable events, known IDs).
- `node tools/simulate.js --all` — mock-runs every event script / romance scene and cross-checks item/troop/sprite/bgm IDs.
- `node tools/autoplay.js [mapId…]` — runs EVERY event script in the real engine with auto-confirmed dialogue (expected: only the two `hearthstar_chamber/vael_fight*` "hangs", which end in the credits).
- `node tools/chain.js [--love wren]` — plays a New Game through all chapters to the credits; `--love <id>` primes a romance route.
- `node tools/mapshot.js <mapId> out.png [--scale 0.55] [--grid]` — render a whole map to a PNG.
- `node tools/run.js --url "index.html?map=…" --keys … --shot out.png` and `node tools/play.js <url> step…` — scripted headless / real-time playtests.
- `node tests/battle_sim.js <troop…> --party rowan,claret --level 10 --seeds 20` — battle balance sim. **Pass troops as separate args** (not comma-joined).
- `node tests/data_test.js`, `tests/audio_test.js`, etc. — module tests.
- Beware: `pkill -f <pattern>` can match your own shell; kill by PID.

## Architecture in one paragraph
Global namespace `G` (see `js/core.js`): fixed 60 UPS loop, scene stack, input, save/load, an async **script runner** (story code is
`async (c) => {…}` calling commands like `c.say`, `c.choice`, `c.battle`, `c.transfer`, `c.affection` that modules register with
`G.script.define`). Maps are built with `G.maps.build()` (js/mapbuilder.js) from the tile catalog `js/tiles.js`. Script load order is
fixed in `index.html`. Full module ownership and every API/ID list is in `docs/CONTRACT.md` — keep it accurate if you change an API.
`js/dress.js` post-processes outdoor maps at boot (flowers/trees); `js/touch.js` adds on-screen touch controls on phones.

## Hosted copy
A published copy exists as a claude.ai Artifact (built from `dist/index.html`, git-ignored; regenerate with the small script described in HANDOFF.md).

## Git
Develop on `claude/determined-feynman-aedai1` (pushed). No PR has been opened. Commit messages in this repo end with the Co-Authored-By trailer.
