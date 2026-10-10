/* =====================================================================
 * LANTERNBOUND — hub.js  (owner: romance)
 * The Marigold: maps marigold_deck + marigold_galley, companion NPCs with
 * talk/gift menus, the Sky Chart scene ('skychart'), and the commands
 * c.skychart() and c.chapterEnd(n, {to}).
 * ===================================================================== */
(function () {
  'use strict';
  const G = (window.G = window.G || {});

  const CAND = ['claret', 'caspian', 'rook', 'seraphine', 'wren'];
  const joined = (id) => !!(G.state && G.state.roster && G.state.roster[id]);
  const U = () => (G.romance && G.romance._ui) || null;   // shared UI helpers (romance.js)
  const sfx = (n) => { try { if (G.audio && G.audio.sfx) G.audio.sfx(n); } catch (e) { /* optional */ } };

  // default chapter cards (chapter files may overwrite these)
  const FALLBACK_CHAPTERS = {
    0: { title: 'Cold Ember', subtitle: 'Wickholm' },
    1: { title: 'Brass & Steam', subtitle: 'Brasshaven' },
    2: { title: 'Sand & Oath', subtitle: 'Gladius' },
    3: { title: 'Wings & Whispers', subtitle: 'The Pale Abbey' },
    4: { title: 'The Festival of Lanterns', subtitle: 'Lumen Vale' },
    5: { title: 'The Hollow Road', subtitle: 'The Hearth Spire' },
    6: { title: 'The Last Lantern', subtitle: 'The Hearthstar' },
  };
  G.story = G.story || {};
  G.story.chapters = G.story.chapters || {};
  Object.keys(FALLBACK_CHAPTERS).forEach((k) => { if (!G.story.chapters[k]) G.story.chapters[k] = FALLBACK_CHAPTERS[k]; });

  // ------------------------------------------------------------------ idle chat (rotating, chapter-aware)
  // need: flag that must be set for the line to be in the pool (null = always)
  const IDLE = {
    claret: [
      { need: null, text: "Don't touch that, it's load-bearing. ...You can touch it. Just not the big red lever." },
      { need: 'ch1_done', text: "Marigold flies properly now. Some nights I still listen to her engine like it might stop. Silly, right?" },
      { need: 'ch2_done', text: "Gladius hid a lamp-vault under a colosseum. Who does that? Madmen. Brilliant engineering, though. Don't tell them." },
      { need: 'ch3_done', text: "The abbey bells hum in a key that rattles every rivet on the ship. I'll fix it after dinner. Probably." },
      { need: 'ch4_done', text: "After the Festival, the lanterns on the lake... I keep thinking about them. I'm fine. The ship is not fine." },
    ],
    caspian: [
      { need: null, text: "Do you ever wonder what the stars would say if they could speak? I suspect they would be rude about my posture." },
      { need: 'ch1_done', text: "Brasshaven's harbour has a great many old lamps. I have stopped looking at them directly. I am working on it." },
      { need: 'ch2_done', text: "The Grey Lion has retired, you know. He would have approved of your footwork in the arena. Do not tell him I said so." },
      { need: 'ch3_done', text: "We passed the Pale Abbey on the way home. I did not look at the choir windows. I am proud of that small thing." },
      { need: 'ch4_done', text: "You were very brave at the lake. I have been searching for words since. Honest praise, freely given. There, I have said it." },
    ],
    rook: [
      { need: null, text: "Lost a bet to Claret. She made me scrub the bilge. Worth it, just to see her smug about it." },
      { need: 'ch1_done', text: "Look at you, flying on a steam-ship with a lady engineer. You're shaping up to be a proper bad influence." },
      { need: 'ch2_done', text: "I stole a lot in Gladius. Mostly from people who deserved it. Don't tell Caspian. He gets that face." },
      { need: 'ch3_done', text: "The abbey nuns bake the best honey cake, {name}. I may have taken two. It's fine. I'm not a bad man. Mostly." },
      { need: 'ch4_done', text: "I always leave before people can leave me. Funny thing, you keep turning up. I'm not complaining. Much." },
    ],
    seraphine: [
      { need: null, text: "Do you know the lantern hymns? I used to sing all seven verses. Now I only sing the one about the windows." },
      { need: 'ch1_done', text: "The ship hums under my feet like a choir that forgot the words. I think she's happier than she was." },
      { need: 'ch2_done', text: "Gladius is loud and sunny and full of people who want things. It is a relief to be somewhere that wants things." },
      { need: 'ch3_done', text: "The abbey was my home. Now it is a question I have to answer. Thank you for not making me answer it alone." },
      { need: 'ch4_done', text: "Lanterns on the lake, for everyone who has lost a light. I think that may be the truest hymn I have ever heard." },
    ],
    wren: [
      { need: null, text: "I brought you a moonpetal. Don't tell the foxes. They think everything on this ship is theirs." },
      { need: 'ch1_done', text: "The sky has so much room. It makes my ears ring. Everything is far away and close at once, a bit like a garden." },
      { need: 'ch2_done', text: "The sand in Gladius is too clean. Nothing grows in it. Next time we bring seeds." },
      { need: 'ch3_done', text: "I went home to the Whisperwood. The trees said hello. They say you're nice. They're wrong, but I won't correct them." },
      { need: 'ch4_done', text: "You kindle things. The lanterns were so bright. I want to plant one somewhere and wait to see what grows." },
    ],
  };
  const idleCount = {};
  function idleLine(id) {
    const pool = (IDLE[id] || []).filter((l) => !l.need || G.flag(l.need));
    if (!pool.length) return '...';
    idleCount[id] = (idleCount[id] || 0) + 1;
    // rotate, but favour the newest chapter line so the chat keeps moving forward
    return pool[idleCount[id] % pool.length].text;
  }

  // ------------------------------------------------------------------ companion talk
  function nameOf(id) { const u = U(); return u ? u.actorName(id) : id; }
  function talkRun(id) {
    return async (c) => {
      const R = G.romance; if (!R) return;
      const name = nameOf(id);
      const av = R.available(id);
      if (av.length) {
        const i = await c.choice(['Talk with ' + name + ' (new!)', 'Give a gift', 'Never mind'], { prompt: name + ' looks up from what they were doing.' });
        if (i === 0) { await c.runScene(av[0].id); return; }
        if (i === 1) { await R.openGiftMenu(id); }
        return;
      }
      await c.say(name, idleLine(id), { face: id, expr: 'normal' });
      const j = await c.choice(['Give a gift', 'Never mind']);
      if (j === 0) await R.openGiftMenu(id);
    };
  }

  // ------------------------------------------------------------------ map layouts
  const DECK_SPOTS = { claret: [5, 6, 'left'], caspian: [2, 6, 'right'], rook: [17, 7, 'left'], seraphine: [16, 9, 'up'], wren: [6, 9, 'right'] };
  const GALLEY_SPOTS = { claret: [10, 5, 'left'], caspian: [3, 4, 'right'], rook: [12, 7, 'down'], seraphine: [4, 8, 'right'], wren: [9, 8, 'left'] };

  function companionEvents(prefix, spots) {
    return CAND.map((id) => {
      const s = spots[id];
      return { id: prefix + '_npc_' + id, x: s[0], y: s[1], sprite: id, dir: s[2], trigger: 'action', solid: true, move: 'still',
        if: () => joined(id), run: talkRun(id) };
    });
  }

  function buildDeck() {
    const b = G.maps.build('marigold_deck', 22, 14, { name: 'The Marigold — Deck', bgm: 'marigold', spawn: { x: 11, y: 8, dir: 'up' }, interior: false });
    b.rect('ground', 0, 0, 22, 14, 'q');                    // sky void around the ship
    b.rect('ground', 1, 2, 20, 10, 'j');                    // airship deck planks
    b.hline('objects', 1, 2, 20, 'x'); b.hline('objects', 1, 11, 20, 'x');     // rails
    b.vline('objects', 1, 2, 10, 'x'); b.vline('objects', 20, 2, 10, 'x');
    [4, 5, 15].forEach((x) => b.set('objects', x, 2, 'C'));                   // crates on the north rail
    b.house(8, 3, 6, 5, { roof: '4', wall: 'X', doorAt: 3 });                 // galley deckhouse, door at (11,7)
    b.set('objects', 16, 3, 'M');                                             // helm machinery
    b.set('objects', 3, 3, 'M'); b.set('objects', 3, 4, 'E'); b.set('objects', 4, 4, 'E');   // Claret's tool bench
    b.set('objects', 18, 8, 'C'); b.set('objects', 19, 8, 'C'); b.set('objects', 18, 9, 'C');   // cargo
    b.set('objects', 18, 6, 'U'); b.set('objects', 19, 6, 'U');
    [3, 4, 5, 15, 16, 17].forEach((x) => b.set('above', x, 2, '*'));           // strings of paper lanterns
    b.ev([
      { id: 'to_galley', x: 11, y: 7, sprite: null, trigger: 'step', solid: false,
        run: async (c) => { c.sfx('door'); await c.transfer('marigold_galley'); } },
      G.maps.helpers.save('deck_lamp', 4, 9),
      { id: 'helm', x: 16, y: 4, sprite: 'obj_marigold_wheel', trigger: 'action', solid: true, dir: 'down',
        run: async (c) => {
          if (!G.flag('marigold_ready')) { await c.say(null, "The helm is locked to an engine in pieces. Nothing to steer until she flies."); return; }
          await c.say(null, "Claret's helm. Pinned under the glass is a hand-drawn chart of the whole sky.");
          await c.skychart();
        } },
      G.maps.helpers.sign('bench_sign', 4, 5, "Claret's tool bench: three spanners, a bent propeller blade and a teacup full of rivets. Don't touch that. It's load-bearing."),
      { id: 'cat_sprocket', x: 14, y: 10, sprite: 'cat', dir: 'left', trigger: 'action', solid: true, move: 'still',
        run: async (c) => {
          const line = G.flag('ch2_done') ? 'Sprocket has claimed Rook\'s green coat as a bed. Rook has not been consulted.'
            : G.flag('ch1_done') ? 'Sprocket is asleep on Claret\'s spare goggles. Claret says this is fine. Claret is lying.'
            : 'Sprocket, the ship\'s cat, is asleep on a coil of rope. One eye opens, judges you, and closes again.';
          await c.say(null, line);
        } },
      ...companionEvents('deck', DECK_SPOTS),
    ]);
    return b.finish();
  }

  function buildGalley() {
    const b = G.maps.build('marigold_galley', 16, 11, { name: 'Marigold Galley', bgm: 'marigold', spawn: { x: 8, y: 9, dir: 'up' }, interior: true });
    b.room(0, 0, 16, 11, { floor: 'f', wall: 'X', topWall: 2 });
    b.door(8, 10);                                               // the way back out to the deck
    b.set('objects', 4, 1, 'O'); b.set('objects', 11, 1, 'O'); b.set('objects', 7, 1, 'V');
    b.rect('ground', 4, 4, 6, 4, 'c');                           // red carpet under the table
    b.hline('objects', 1, 2, 3, 'Y');                            // bookshelves
    b.hline('objects', 10, 2, 3, 'S');                           // pantry shelves
    b.set('objects', 14, 2, 'I');                                // hearth
    b.set('objects', 1, 6, 'Z'); b.set('objects', 1, 7, 'Z');    // bunks
    b.set('objects', 14, 6, 'Z'); b.set('objects', 14, 7, 'Z');
    b.rect('objects', 6, 5, 2, 2, 'E');                          // table
    b.set('objects', 6, 4, 'H'); b.set('objects', 5, 5, 'H'); b.set('objects', 8, 5, 'H'); b.set('objects', 7, 7, 'H');
    b.set('objects', 2, 9, 'C'); b.set('objects', 3, 9, 'C');    // crates
    b.set('objects', 13, 9, 'U'); b.set('objects', 14, 9, 'U');  // barrels
    [6, 7, 8].forEach((x) => b.set('above', x, 2, '*'));         // lanterns over the table
    b.ev([
      { id: 'galley_exit', x: 8, y: 10, sprite: null, trigger: 'step', solid: false,
        run: async (c) => { c.sfx('door'); await c.transfer('marigold_deck', 11, 8, 'up'); } },
      G.maps.helpers.save('galley_lamp', 11, 6),
      ...G.maps.helpers.chest('marigold_galley_chest', 2, 5, 'sweet_bun', 1),
      ...companionEvents('galley', GALLEY_SPOTS),
    ]);
    return b.finish();
  }

  if (G.maps && G.maps.build && G.maps.helpers) {
    buildDeck();
    buildGalley();
  } else {
    console.warn('[hub] mapbuilder missing; Marigold maps not built');
  }

  // ------------------------------------------------------------------ Sky Chart
  const TRAVEL = 120;   // frames the airship takes to cross the chart
  // map: node position in 640x480 chart space
  const DEST = [
    { id: 'wickholm', name: 'Wickholm', glyph: 'village', pos: [96, 250],
      desc: "Maren's mossy village at the edge of Mossgrave Wood. The lamps there are dim, and Pip is probably up to something.",
      open: () => true },
    { id: 'brasshaven', name: 'Brasshaven', glyph: 'city', pos: [300, 262],
      desc: "The steam-and-brass harbour city. Claret's workshop is still there, and so is the Clockwork Undercroft.",
      open: () => true },
    { id: 'gladius_citadel', name: 'Gladius', glyph: 'arena', pos: [500, 262],
      desc: 'A colosseum city of sand and oaths. Arena banners flap all day, and a certain Grey Lion may be watching.',
      open: () => true },
    { id: 'pale_abbey', name: 'Pale Abbey', glyph: 'abbey', pos: [176, 150],
      desc: 'White halls, a singing choir, and crypts beneath. Its bells hum in a key that rattles rivets.',
      open: () => true },
    { id: 'lumen_vale', name: 'Lumen Vale', glyph: 'lake', pos: [468, 136],
      desc: 'A lake town where paper lanterns are launched across the water every year. You can smell pine smoke from up here.',
      open: () => !!G.flag('ch2_done') && !!G.flag('ch3_done'),
      lock: () => {
        const miss = [];
        if (!G.flag('ch2_done')) miss.push('Gladius');
        if (!G.flag('ch3_done')) miss.push('the Pale Abbey');
        return miss.length === 2 ? 'requires both Gladius and the Pale Abbey' : 'requires ' + miss[0] + ' to be finished first';
      } },
    { id: 'spire_gate', name: 'Hearth Spire', glyph: 'spire', pos: [318, 74],
      desc: "The Hearthstar's tower. Its gate is watched and its upper halls are silent. Not yet.",
      open: () => !!G.flag('ch4_done'),
      lock: () => 'requires the Festival of Lanterns (Chapter 4) to be finished' },
  ];
  const destIndex = (id) => DEST.findIndex((d) => d.id === id);
  const islandsExtra = [[92, 96, 40, 22], [560, 92, 46, 30], [520, 330, 60, 26], [236, 330, 46, 20], [400, 180, 26, 16], [60, 380, 52, 24], [600, 400, 40, 30]];

  // parchment base map, rendered once
  let skyBaseCanvas = null;
  function islandPath(x, cx, cy, rx, ry, seed) {
    const r = G.util.rng(seed);
    const N = 36, pts = [];
    let prev = 0;
    for (let i = 0; i < N; i++) { prev = prev * 0.5 + (r() - 0.5) * 0.5; pts.push(1 + 0.14 * prev + (r() - 0.5) * 0.12); }
    x.beginPath();
    for (let i = 0; i <= N; i++) {
      const a = (i / N) * Math.PI * 2, k = pts[i % N];
      const px = cx + Math.cos(a) * rx * k, py = cy + Math.sin(a) * ry * k;
      if (i === 0) x.moveTo(px, py); else x.lineTo(px, py);
    }
    x.closePath();
  }
  function drawIsland(x, cx, cy, rx, ry, seed) {
    x.save();
    islandPath(x, cx + 3, cy + 3, rx, ry, seed); x.fillStyle = 'rgba(90,60,20,0.18)'; x.fill();   // drop shadow
    islandPath(x, cx, cy, rx, ry, seed); x.fillStyle = '#cdb57c'; x.fill();
    x.lineWidth = 1.6; x.strokeStyle = '#5b3c18'; x.stroke();
    x.save(); x.clip();
    islandPath(x, cx, cy, rx * 0.72, ry * 0.7, seed + 9); x.fillStyle = '#b9a064'; x.fill();
    x.restore();
    // hatch strokes, like a hand-inked coastline
    const r = G.util.rng(seed + 31);
    x.strokeStyle = 'rgba(70,45,15,0.45)'; x.lineWidth = 1;
    for (let i = 0; i < Math.max(6, rx / 3); i++) {
      const px = cx + (r() - 0.5) * rx * 1.4, py = cy + (r() - 0.5) * ry * 1.2;
      x.beginPath(); x.moveTo(px, py); x.lineTo(px + 4, py + 2); x.stroke();
    }
    x.restore();
  }
  function cloudSprite(seed) {
    const cv = G.util.canvas(96, 40), x = cv.getContext('2d'), r = G.util.rng(seed);
    const puffs = [[30, 24, 14], [50, 18, 17], [70, 24, 12], [44, 26, 12]];
    puffs.forEach(([px, py, rr]) => { x.beginPath(); x.arc(px + (r() - 0.5) * 3, py, rr, 0, Math.PI * 2); x.fillStyle = 'rgba(255,252,240,0.82)'; x.fill(); });
    x.lineWidth = 1.2; x.strokeStyle = 'rgba(110,80,40,0.45)';
    puffs.forEach(([px, py, rr]) => { x.beginPath(); x.arc(px, py, rr, Math.PI * 1.05, Math.PI * 1.95); x.stroke(); });
    return cv;
  }
  function compass(x, cx, cy, s) {
    x.save(); x.translate(cx, cy); x.strokeStyle = '#5b3c18'; x.fillStyle = '#5b3c18'; x.lineWidth = 1.5;
    x.beginPath(); x.arc(0, 0, 26, 0, Math.PI * 2); x.stroke();
    x.beginPath(); x.arc(0, 0, 20, 0, Math.PI * 2); x.stroke();
    [[0, -34, 'N'], [34, 0, 'E'], [0, 34, 'S'], [-34, 0, 'W']].forEach(([dx, dy, l]) => {
      x.font = 'bold 11px Georgia, serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(l, dx, dy);
    });
    for (let i = 0; i < 4; i++) {
      x.save(); x.rotate((Math.PI / 2) * i + Math.PI / 4);
      x.beginPath(); x.moveTo(0, -18); x.lineTo(4, 0); x.lineTo(0, 18); x.lineTo(-4, 0); x.closePath(); x.fill(); x.restore();
    }
    x.restore();
  }
  function skyBase() {
    if (skyBaseCanvas) return skyBaseCanvas;
    const cv = G.util.canvas(640, 480), x = cv.getContext('2d');
    const g = x.createRadialGradient(320, 240, 80, 320, 240, 430);
    g.addColorStop(0, '#f2e2b6'); g.addColorStop(0.7, '#e6cf98'); g.addColorStop(1, '#bf9d62');
    x.fillStyle = g; x.fillRect(0, 0, 640, 480);
    const r = G.util.rng(4242);
    for (let i = 0; i < 1100; i++) {                                    // paper fibre & age spots
      x.fillStyle = r() < 0.5 ? 'rgba(120,80,30,0.05)' : 'rgba(255,250,230,0.10)';
      x.fillRect(Math.floor(r() * 640), Math.floor(r() * 480), 1 + Math.floor(r() * 3), 1 + Math.floor(r() * 2));
    }
    x.strokeStyle = 'rgba(90,110,130,0.22)'; x.lineWidth = 1;          // sea: hand-drawn wave ticks
    for (let i = 0; i < 300; i++) {
      const px = r() * 620, py = r() * 470, L = 6 + r() * 9;
      x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + L / 2, py - 3, px + L, py); x.stroke();
    }
    // routes between ports
    x.save(); x.setLineDash([2, 5]); x.strokeStyle = 'rgba(92,60,24,0.45)'; x.lineWidth = 1.5;
    const hub = DEST[1].pos;
    DEST.forEach((d, i) => { if (i === 1) return; x.beginPath(); x.moveTo(hub[0], hub[1]); x.quadraticCurveTo((hub[0] + d.pos[0]) / 2, Math.min(hub[1], d.pos[1]) - 30, d.pos[0], d.pos[1]); x.stroke(); });
    x.restore();
    islandsExtra.forEach((e, i) => drawIsland(x, e[0], e[1], e[2], e[3], 900 + i * 17));
    DEST.forEach((d, i) => drawIsland(x, d.pos[0], d.pos[1] + 6, 34 + (i % 3) * 4, 20 + (i % 2) * 3, 100 + i * 23));
    // ink border
    x.strokeStyle = '#6b4a22'; x.lineWidth = 3; x.strokeRect(6, 6, 628, 468);
    x.lineWidth = 1; x.strokeRect(12, 12, 616, 456);
    compass(x, 584, 184, 26);
    skyBaseCanvas = cv;
    return cv;
  }
  let cloudSprites = null;
  const cloudY = [60, 120, 210, 300, 350, 170, 40];
  function drawGlyph(x, kind, cx, cy) {
    x.save(); x.strokeStyle = '#3f2a12'; x.fillStyle = '#3f2a12'; x.lineWidth = 1.6;
    if (kind === 'village') {
      x.beginPath(); x.moveTo(cx - 6, cy); x.lineTo(cx, cy - 6); x.lineTo(cx + 6, cy); x.stroke(); x.strokeRect(cx - 4, cy, 8, 6);
    } else if (kind === 'city') {
      x.fillRect(cx - 7, cy - 1, 4, 7); x.fillRect(cx - 2, cy - 5, 4, 11); x.fillRect(cx + 3, cy - 2, 4, 8);
    } else if (kind === 'arena') {
      x.beginPath(); x.ellipse(cx, cy, 7, 4.5, 0, 0, Math.PI * 2); x.stroke(); x.beginPath(); x.ellipse(cx, cy, 3, 2, 0, 0, Math.PI * 2); x.fill();
    } else if (kind === 'abbey') {
      x.fillRect(cx - 1, cy - 7, 2, 14); x.fillRect(cx - 5, cy - 3, 10, 2);
    } else if (kind === 'lake') {
      x.beginPath(); x.moveTo(cx - 7, cy - 1); x.quadraticCurveTo(cx - 3.5, cy - 4, cx, cy - 1); x.quadraticCurveTo(cx + 3.5, cy + 2, cx + 7, cy - 1); x.stroke();
      x.beginPath(); x.moveTo(cx - 7, cy + 4); x.quadraticCurveTo(cx - 3.5, cy + 1, cx, cy + 4); x.quadraticCurveTo(cx + 3.5, cy + 7, cx + 7, cy + 4); x.stroke();
    } else if (kind === 'spire') {
      x.beginPath(); x.moveTo(cx, cy - 9); x.lineTo(cx + 3, cy + 6); x.lineTo(cx - 3, cy + 6); x.closePath(); x.fill();
      x.beginPath(); x.arc(cx, cy - 10, 2, 0, Math.PI * 2); x.fill();
    }
    x.restore();
  }
  function drawAirship(x, px, py, t) {
    const bob = Math.sin(t / 14) * 1.6;
    x.save();
    x.fillStyle = 'rgba(60,40,12,0.28)'; x.beginPath(); x.ellipse(px, py + 20, 12, 3, 0, 0, Math.PI * 2); x.fill();
    x.strokeStyle = '#4a3218'; x.lineWidth = 1;
    x.beginPath(); x.moveTo(px - 5, py + 2 + bob); x.lineTo(px - 4, py + 8 + bob); x.moveTo(px + 5, py + 2 + bob); x.lineTo(px + 4, py + 8 + bob); x.stroke();
    x.beginPath(); x.ellipse(px, py - 6 + bob, 14, 9, 0, 0, Math.PI * 2); x.fillStyle = '#c4572f'; x.fill(); x.stroke();
    x.save(); x.beginPath(); x.ellipse(px, py - 6 + bob, 14, 9, 0, 0, Math.PI * 2); x.clip();
    x.fillStyle = '#e9b44c'; for (let i = -2; i <= 2; i++) x.fillRect(px + i * 6 - 1, py - 16 + bob, 2, 20);
    x.restore();
    x.fillStyle = '#6b4a2a'; x.fillRect(px - 6, py + 3 + bob, 12, 6); x.strokeRect(px - 6, py + 3 + bob, 12, 6);
    x.fillStyle = '#e9b44c'; x.fillRect(px - 4, py + 5 + bob, 3, 2);
    x.restore();
  }
  function inkText(x, s, px, py, size, o) {
    o = o || {};
    x.save(); x.font = (o.italic ? 'italic ' : '') + (o.bold ? 'bold ' : '') + size + 'px Georgia, "Times New Roman", serif';
    x.textAlign = o.align || 'left'; x.textBaseline = 'top'; x.fillStyle = o.color || '#3a2612';
    x.fillText(String(s), px, py); x.restore();
  }

  G.scenes.register('skychart', (params) => {
    const p = params || {};
    const at0 = destIndex(G.flag('sky_at')); const startAt = at0 >= 0 ? at0 : 1;
    let sel = startAt, at = startAt, phase = 'choose', prog = 0, to = startAt, t = 0, msg = '', msgT = 0, finished = false;
    let prevBgm = null;
    function restoreBgm() { if (prevBgm && G.audio && G.audio.playBgm) { try { G.audio.playBgm(prevBgm); } catch (e) { /* optional */ } } }
    function finish(id) {
      if (finished) return; finished = true;
      G.scenes.pop();
      if (p.onDone) p.onDone(id);
    }
    function lockOf(d) { return d.open() ? '' : (d.lock ? d.lock() : 'not yet charted'); }
    function airPos() {
      const A = DEST[at].pos;
      if (phase !== 'travel') return A;
      const B = DEST[to].pos, C = [(A[0] + B[0]) / 2, Math.min(A[1], B[1]) - 60], k = prog / TRAVEL;
      return [(1 - k) * (1 - k) * A[0] + 2 * (1 - k) * k * C[0] + k * k * B[0], (1 - k) * (1 - k) * A[1] + 2 * (1 - k) * k * C[1] + k * k * B[1]];
    }
    return {
      opaque: true,
      enter() {
        prevBgm = (G.audio && typeof G.audio.currentBgm === 'string') ? G.audio.currentBgm : null;
        try { if (G.audio && G.audio.playBgm) G.audio.playBgm('sky'); } catch (e) { /* optional */ }
      },
      update() {
        t++; if (msgT > 0) msgT--;
        if (finished) return;
        if (phase === 'travel') {
          prog++;
          if (prog >= TRAVEL) { at = to; G.setFlag('sky_at', DEST[to].id); finish(DEST[to].id); }
          return;
        }
        if (G.input.repeat('left') || G.input.repeat('up')) { sel = (sel + DEST.length - 1) % DEST.length; sfx('cursor'); }
        if (G.input.repeat('right') || G.input.repeat('down')) { sel = (sel + 1) % DEST.length; sfx('cursor'); }
        if (G.input.pressed('cancel')) { sfx('cancel'); G.input.clear(); restoreBgm(); finished = true; G.scenes.pop(); if (p.onDone) p.onDone(null); return; }
        if (G.input.pressed('ok')) {
          const d = DEST[sel];
          if (!d.open()) { sfx('buzzer'); msg = d.name + ' ' + lockOf(d) + '.'; msgT = 200; return; }
          if (sel === at) { sfx('buzzer'); msg = 'The Marigold is already moored there.'; msgT = 120; return; }
          sfx('lantern'); phase = 'travel'; prog = 0; to = sel;
        }
      },
      draw(ctx) {
        const x = ctx;
        x.drawImage(skyBase(), 0, 0);
        if (!cloudSprites) cloudSprites = [11, 12, 13].map((s) => cloudSprite(s));
        cloudY.forEach((cy, i) => {
          const cx = ((i * 137 + t * 0.12) % 780) - 90;
          x.save(); x.globalAlpha = 0.8; x.drawImage(cloudSprites[i % 3], Math.round(cx), cy); x.restore();
        });
        // title cartouche
        x.save(); x.fillStyle = 'rgba(243,225,180,0.92)'; x.fillRect(22, 18, 262, 34);
        x.strokeStyle = '#6b4a22'; x.lineWidth = 2; x.strokeRect(22.5, 18.5, 261, 33);
        x.restore();
        inkText(x, 'The Sky Chart of Auren', 34, 25, 18, { bold: true, italic: true, color: '#4a2f12' });
        // destinations
        DEST.forEach((d, i) => {
          const [nx, ny] = d.pos, open = d.open(), on = i === sel;
          x.save();
          x.beginPath(); x.arc(nx, ny, 11, 0, Math.PI * 2);
          x.fillStyle = open ? '#f7e8bd' : '#a99c84'; x.fill();
          x.lineWidth = on ? 3 : 1.8; x.strokeStyle = on ? '#8a2d1d' : '#5b3c18'; x.stroke();
          x.restore();
          drawGlyph(x, open ? d.glyph : 'village', nx, ny);
          if (!open) {
            x.save(); x.strokeStyle = '#5b3c18'; x.lineWidth = 2; x.beginPath(); x.moveTo(nx - 8, ny - 8); x.lineTo(nx + 8, ny + 8); x.stroke(); x.restore();
          }
          if (on) {
            const pulse = 14 + Math.sin(t / 8) * 2;
            x.save(); x.strokeStyle = 'rgba(138,45,29,0.7)'; x.lineWidth = 2; x.beginPath(); x.arc(nx, ny, pulse, 0, Math.PI * 2); x.stroke(); x.restore();
          }
          inkText(x, d.name, nx, ny + 17, 13, { bold: on, align: 'center', color: open ? '#3a2612' : '#6e5e44' });
        });
        // airship: a dotted trail while travelling
        if (phase === 'travel') {
          const A = DEST[at].pos, B = DEST[to].pos, C = [(A[0] + B[0]) / 2, Math.min(A[1], B[1]) - 60];
          x.save(); x.setLineDash([2, 4]); x.strokeStyle = 'rgba(138,45,29,0.7)'; x.lineWidth = 1.5;
          x.beginPath(); x.moveTo(A[0], A[1]); x.quadraticCurveTo(C[0], C[1], B[0], B[1]); x.stroke(); x.restore();
        }
        const ap = airPos();
        drawAirship(x, Math.round(ap[0]), Math.round(ap[1]), t);
        // info panel
        const d = DEST[sel], open = d.open();
        x.save(); x.fillStyle = 'rgba(243,225,180,0.95)'; x.fillRect(14, 352, 612, 116);
        x.strokeStyle = '#6b4a22'; x.lineWidth = 2; x.strokeRect(14.5, 352.5, 611, 115);
        x.strokeStyle = '#b08a4a'; x.lineWidth = 1; x.strokeRect(19.5, 357.5, 601, 105);
        x.restore();
        inkText(x, d.name, 30, 364, 20, { bold: true, italic: true, color: '#4a2f12' });
        const U_ = U();
        const lines = U_ ? U_.wrap(d.desc, 580, 13) : [d.desc];
        lines.slice(0, 2).forEach((ln, i) => inkText(x, ln, 30, 394 + i * 16, 14, { color: '#3a2612' }));
        if (open) inkText(x, phase === 'travel' ? 'Setting sail...' : 'Z: set sail for ' + d.name, 30, 430, 14, { bold: true, color: '#2f5a2a' });
        else inkText(x, 'Locked: ' + lockOf(d), 30, 430, 14, { bold: true, color: '#8a2d1d' });
        if (msgT > 0 && phase !== 'travel') inkText(x, msg, 30, 446, 12, { italic: true, color: '#8a2d1d' });
        else inkText(x, 'Left/Right or Up/Down choose    Z set sail    X close', 30, 448, 11, { italic: true, color: '#6e5e44' });
      },
    };
  });

  // opens the chart; resolves with the chosen destination id or null
  function openSkyChart() {
    return new Promise((resolve) => { G.scenes.push('skychart', { onDone: resolve }); });
  }

  // ------------------------------------------------------------------ commands
  const S = G.script;
  S.define('skychart', async () => {
    const dest = await openSkyChart();
    if (!dest) return;
    const d = DEST[destIndex(dest)];
    if (d && d.id) { await G.script.ctx.transfer(d.id); }
  });

  S.define('chapterEnd', async (n, opts) => {
    n = (+n) | 0; opts = opts || {};
    const c = G.script.ctx;
    const card = (G.story.chapters && G.story.chapters[n]) || FALLBACK_CHAPTERS[n] || { title: 'Chapter ' + n, subtitle: '' };
    G.setFlag('ch' + n + '_done', true);
    G.state.chapter = Math.max(G.state.chapter | 0, n);
    if (n === 1) G.setFlag('marigold_ready', true);
    if (G.state.romance) G.state.romance.gifts = {};             // gift allowance resets each chapter
    await c.healAll();
    await c.titleCard(card.title, 'Chapter ' + n + ' Complete');
    await c.transfer(opts.to || 'marigold_deck');
    await G.wait(30);                                               // let the fade-in settle
    const someone = CAND.some((id) => joined(id) && G.romance && G.romance.available(id).length);
    if (someone) await c.toast('Someone wants to talk…', 'heart');
  });

  G.provide('hub');
})();
