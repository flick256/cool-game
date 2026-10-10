/* =====================================================================
 * LANTERNBOUND — map.js  (owner: map engine)
 * Scene 'map', runtime G.map, and the map script commands:
 *   transfer walk walkTo face setPos showNpc setSprite setEvent
 *   camera camReset emote jump follow
 * Map defs come from G.maps (mapbuilder.js). Loaded after mapbuilder.js.
 * ===================================================================== */
(function () {
  'use strict';
  const G = (window.G = window.G || {});

  const TILE = 32, CHUNK = 8, CHUNK_PX = CHUNK * TILE;
  const VW = 640, VH = 480;
  const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  const OPP = { up: 'down', down: 'up', left: 'right', right: 'left' };
  const DIR_LIST = ['up', 'down', 'left', 'right'];
  const WALK_FRAMES = [0, 1, 2, 1];
  const WALK_SPEED = 4, DASH_SPEED = 6;
  const BANNER_LIFE = 150, EMOTE_LIFE = 40, JUMP_LIFE = 20;
  const EV_FIELDS = ['x', 'y', 'dir', 'sprite', 'move', 'solid', 'trigger', 'hidden'];
  const EMOTE_GLYPH = { heart: '<3', exclaim: '!', question: '?', sweat: ';', music: 'J', dots: '...', anger: '#', bulb: '*' };
  const ANIM_DEFAULT = ['~', 'w'];

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rint = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const approach = (v, s) => (v > 0 ? Math.max(0, v - s) : v < 0 ? Math.min(0, v + s) : 0);
  const dirFromDelta = (dx, dy) => (dx > 0 ? 'right' : dx < 0 ? 'left' : dy > 0 ? 'down' : 'up');
  const warn = (...a) => console.warn('[map]', ...a);
  const resolved = () => Promise.resolve();

  // ------------------------------------------------------------------ runtime state
  const M = {
    def: null,            // current map def (from G.maps)
    serial: 0,            // bumped on every map switch; stale async work checks it
    events: [],           // runtime event objects for the current map
    followers: [],        // party members 1..3 (runtime chars)
    followOn: true,
    followKey: null,
    player: null,
    cam: { x: 0, y: 0, fixed: null, tw: null },
    emotes: [],
    banner: null,
    locked: 0,            // >0 while a transfer is in progress (no player input)
    bumpLock: null,       // direction whose touch-bump already fired (re-arms on release)
    enc: null, encLeft: 0,
    overrides: {},        // mapId -> evId -> {x,y,dir,sprite,move,solid,trigger,hidden} (session only)
    prevId: null,
    debug: false, fps: 0, fpsN: 0, fpsT: 0,
    cache: null,
  };

  // a "character" = player, follower, or event sprite. Logical tile (x,y) is the destination;
  // ox/oy are pixel offsets that decay to 0 (so drawn position = x*32+ox).
  function mkChar(id, x, y, dir) {
    return {
      id, sprite: id, x, y, dir, ox: 0, oy: 0, jy: 0, jt: 0, spd: WALK_SPEED, anim: 0, moving: false,
      arrive: [], routeId: 0, queue: [], idx: -1,
      def: null, active: true, hidden: false, solid: false, trigger: 'none', move: 'still',
      w: 1, h: 1, hx: x, hy: y, wt: rint(60, 120),
    };
  }
  M.player = mkChar('player', 0, 0, 'down');
  M.player.sprite = 'rowan';

  // ------------------------------------------------------------------ small helpers
  function inb(def, x, y) { return x >= 0 && y >= 0 && x < def.w && y < def.h; }
  function terrainOK(def, x, y) {
    if (!inb(def, x, y)) return false;
    if (G.maps && typeof G.maps.isPassable === 'function') return G.maps.isPassable(def, x, y);
    return G.tiles.passable(def.ground[y][x]) && G.tiles.passable(def.objects[y][x]);
  }
  function isAnim(ch) { const a = (G.tiles && G.tiles.ANIMATED) || ANIM_DEFAULT; return a.indexOf(ch) >= 0; }
  function isSolidEv(e) { return !!e.solid && !!e.sprite; }
  function evCovers(e, x, y) { return x >= e.x && y >= e.y && x < e.x + e.w && y < e.y + e.h; }
  function evalIf(e) {
    const f = e.def ? e.def.if : undefined;
    if (f === undefined || f === null) return true;
    if (typeof f !== 'function') return !!f;
    try { return !!f(); } catch (err) { warn('if() threw on event ' + e.id, err); return false; }
  }
  function refreshEvents() { for (const e of M.events) e.active = evalIf(e); }
  // fresh evaluation (used for triggers so a flag set a moment ago is respected immediately)
  function liveNow(e) { if (e.hidden) return false; e.active = evalIf(e); return e.active; }

  // ------------------------------------------------------------------ event construction
  function applyOv(e, ov) {
    for (const k of EV_FIELDS) if (ov[k] !== undefined) e[k] = ov[k];
    e.hx = e.x; e.hy = e.y;
  }
  function makeEvent(d, ov) {
    const e = mkChar(d.id, d.x | 0, d.y | 0, d.dir || 'down');
    e.def = d;
    e.sprite = d.sprite || null;
    e.solid = d.solid === undefined ? !!d.sprite : !!d.solid;
    e.trigger = d.trigger || 'action';
    e.move = d.move || 'still';
    e.w = Math.max(1, d.w | 0);
    e.h = Math.max(1, d.h | 0);
    e.active = true;
    if (ov) applyOv(e, ov);
    return e;
  }
  function saveOv(e, partial) {
    if (!M.def) return;
    const mid = M.def.id;
    const o = (M.overrides[mid] = M.overrides[mid] || {});
    o[e.id] = Object.assign(o[e.id] || {}, partial);
  }
  function charOf(who) {
    if (who === 'player' || who === undefined || who === null) return M.player;
    return M.events.find((e) => e.id === who) || null;
  }
  function eventOf(id) { return M.events.find((e) => e.id === id) || null; }

  // ------------------------------------------------------------------ static render caches
  // Ground/objects/above are painted once per map into CHUNK x CHUNK tile canvases (lazily).
  // Animated ground tiles are excluded from the chunks and drawn live each frame (visible only).
  const caches = new WeakMap();
  function cacheFor(def) {
    let c = caches.get(def);
    if (!c) {
      c = { layers: { ground: new Map(), objects: new Map(), above: new Map() }, anim: [] };
      for (let y = 0; y < def.h; y++) for (let x = 0; x < def.w; x++) {
        const ch = def.ground[y][x];
        if (isAnim(ch)) c.anim.push({ x, y, ch });
      }
      caches.set(def, c);
    }
    return c;
  }
  function invalidate(def) {
    caches.delete(def);
    if (M.def === def) M.cache = cacheFor(def);
  }

  let tileErrWarned = false;
  function paintTile(g, ch, layer, x, y, frame) {
    if (G.gfx && typeof G.gfx.drawTile === 'function') {
      try { G.gfx.drawTile(g, ch, x, y, frame || 0); return; }
      catch (err) { if (!tileErrWarned) { tileErrWarned = true; warn('gfx.drawTile threw; using placeholders', err); } }
    }
    placeholderTile(g, ch, layer, x, y, frame || 0);
  }
  function placeholderTile(g, ch, layer, x, y, frame) {
    const t = G.tiles && G.tiles.byChar ? G.tiles.byChar[ch] : null;
    const name = t ? t.name : ch;
    const h = G.util.hash(name) % 360;
    if (layer === 'ground') {
      if (/water|shallow/.test(name)) g.fillStyle = `hsl(${212 + frame * 6},60%,${38 + frame * 4}%)`;
      else g.fillStyle = `hsl(${h},28%,${32 + (h % 12)}%)`;
      g.fillRect(x, y, TILE, TILE);
    } else if (layer === 'above') {
      g.fillStyle = `hsla(${h},40%,50%,0.45)`; g.fillRect(x, y, TILE, 8);
    } else if (t && t.pass) {
      g.fillStyle = `hsla(${h},30%,45%,0.45)`; g.fillRect(x + 2, y + 2, 28, 28);
    } else {
      g.fillStyle = `hsl(${h},35%,30%)`; g.fillRect(x + 2, y + 2, 28, 28);
      g.strokeStyle = '#000'; g.strokeRect(x + 2.5, y + 2.5, 27, 27);
    }
  }
  function chunkCanvas(def, layer, cxI, cyI) {
    const store = cacheFor(def).layers[layer];
    const key = cxI + ',' + cyI;
    let cv = store.get(key);
    if (cv) return cv;
    const tx0 = cxI * CHUNK, ty0 = cyI * CHUNK;
    const tw = Math.min(CHUNK, def.w - tx0), th = Math.min(CHUNK, def.h - ty0);
    cv = G.util.canvas(tw * TILE, th * TILE);
    const g = cv.getContext('2d');
    const rows = def[layer];
    for (let j = 0; j < th; j++) for (let i = 0; i < tw; i++) {
      const ch = rows[ty0 + j][tx0 + i];
      if (!ch || ch === ' ') continue;
      if (layer === 'ground' && isAnim(ch)) continue;
      paintTile(g, ch, layer, i * TILE, j * TILE, 0);
    }
    store.set(key, cv);
    return cv;
  }
  function drawLayer(ctx, def, layer, cx, cy) {
    const nx = Math.ceil(def.w / CHUNK), ny = Math.ceil(def.h / CHUNK);
    const x0 = clamp(Math.floor(cx / CHUNK_PX), 0, nx - 1), x1 = clamp(Math.floor((cx + VW - 1) / CHUNK_PX), 0, nx - 1);
    const y0 = clamp(Math.floor(cy / CHUNK_PX), 0, ny - 1), y1 = clamp(Math.floor((cy + VH - 1) / CHUNK_PX), 0, ny - 1);
    for (let j = y0; j <= y1; j++) for (let i = x0; i <= x1; i++) {
      ctx.drawImage(chunkCanvas(def, layer, i, j), i * CHUNK_PX - cx, j * CHUNK_PX - cy);
    }
  }
  function paintScreenTile(ctx, ch, layer, sx, sy, frame) {
    if (G.gfx && typeof G.gfx.drawTile === 'function') {
      try { G.gfx.drawTile(ctx, ch, sx, sy, frame); return; }
      catch (err) { if (!tileErrWarned) { tileErrWarned = true; warn('gfx.drawTile threw; using placeholders', err); } }
    }
    placeholderTile(ctx, ch, layer, sx, sy, frame);
  }

  // ------------------------------------------------------------------ movement core
  function canEnter(ch, x, y, opts) {
    const def = M.def;
    if (!def || !terrainOK(def, x, y)) return false;
    if (opts && opts.through) return true;
    for (const e of M.events) {
      if (e !== ch && e.active && !e.hidden && isSolidEv(e) && evCovers(e, x, y)) return false;
    }
    if (ch !== M.player && M.player.x === x && M.player.y === y) return false;
    return true;
  }
  // begins a one-tile step if the target is enterable. Logical position updates at once; offsets animate.
  function startStep(ch, dir, opts) {
    const d = DIRS[dir];
    if (!d) return false;
    ch.dir = dir;
    const nx = ch.x + d[0], ny = ch.y + d[1];
    if (!canEnter(ch, nx, ny, opts)) return false;
    const ox = ch.x, oy = ch.y;
    const spd = (opts && opts.speed) || WALK_SPEED;
    ch.x = nx; ch.y = ny;
    ch.ox = -d[0] * TILE; ch.oy = -d[1] * TILE;
    ch.spd = spd; ch.moving = true; ch.anim = 0;
    if (ch === M.player && M.followOn && M.followers.length) M.followers[0].queue.push({ x: ox, y: oy, spd });
    return true;
  }
  function waitArrive(ch) { return new Promise((res) => ch.arrive.push(res)); }
  function flushArrive(ch) { const l = ch.arrive; ch.arrive = []; for (const r of l) r(); }
  function stepChar(ch) {
    if (ch.jt > 0) {
      ch.jt--;
      ch.jy = -Math.round(Math.sin(Math.PI * (JUMP_LIFE - ch.jt) / JUMP_LIFE) * 12);
    } else if (ch.jy) ch.jy = 0;
    if (ch.ox || ch.oy) {
      ch.ox = approach(ch.ox, ch.spd);
      ch.oy = approach(ch.oy, ch.spd);
      ch.anim++;
      if (!ch.ox && !ch.oy) arrive(ch);
    }
  }
  function arrive(ch) {
    ch.moving = false; ch.anim = 0;
    if (ch === M.player) playerArrived();
    if (ch.arrive.length) flushArrive(ch);
  }
  function route(ch, dirs, opts) {
    return (async () => {
      const id = ++ch.routeId;
      for (const dir of dirs) {
        if (ch.routeId !== id) return;
        let started = false;
        for (let tries = 0; tries < 40 && !started; tries++) {
          started = startStep(ch, dir, opts);
          if (!started) await G.wait(1);
          if (ch.routeId !== id) return;
        }
        if (started) await waitArrive(ch);
      }
    })();
  }
  function doWalk(ch, dirs, opts) {
    const list = dirs.filter((d) => DIRS[d]);
    if (!list.length) return resolved();
    const p = route(ch, list, opts);
    return opts.wait === false ? resolved() : p;
  }
  function findPath(ch, tx, ty, opts) {
    const def = M.def;
    if (!def || !inb(def, tx, ty)) return null;
    if (ch.x === tx && ch.y === ty) return [];
    const W = def.w, N = W * def.h;
    const prev = new Int32Array(N).fill(-1);
    const start = ch.y * W + ch.x, goal = ty * W + tx;
    prev[start] = start;
    const q = [start];
    let head = 0, found = false;
    while (head < q.length) {
      const cur = q[head++];
      if (cur === goal) { found = true; break; }
      const cx = cur % W, cy = (cur - cx) / W;
      for (const k of DIR_LIST) {
        const d = DIRS[k], nx = cx + d[0], ny = cy + d[1];
        if (nx < 0 || ny < 0 || nx >= W || ny >= def.h) continue;
        const idx = ny * W + nx;
        if (prev[idx] !== -1) continue;
        if (!canEnter(ch, nx, ny, opts)) continue;
        prev[idx] = cur; q.push(idx);
      }
    }
    if (!found) return null;
    const dirs = [];
    let cur = goal;
    while (cur !== start) {
      const p = prev[cur];
      const px = p % W, py = (p - px) / W, cxx = cur % W, cyy = (cur - cxx) / W;
      dirs.push(dirFromDelta(cxx - px, cyy - py));
      cur = p;
    }
    return dirs.reverse();
  }

  // ------------------------------------------------------------------ followers (classic follow chain)
  function placeBehind(f, i) {
    const p = M.player, def = M.def;
    const d = DIRS[p.dir] || DIRS.down;
    const cands = [[p.x - d[0] * (i + 1), p.y - d[1] * (i + 1)]];
    for (const k of DIR_LIST) cands.push([p.x + DIRS[k][0] * (i + 1), p.y + DIRS[k][1] * (i + 1)]);
    let pick = null;
    for (const [x, y] of cands) if (def && terrainOK(def, x, y)) { pick = [x, y]; break; }
    if (!pick) pick = [p.x, p.y];
    f.x = pick[0]; f.y = pick[1]; f.hx = f.x; f.hy = f.y;
    f.ox = 0; f.oy = 0; f.moving = false; f.anim = 0; f.queue = []; f.dir = p.dir;
  }
  function syncFollowers(force) {
    const ids = ((G.state && G.state.party) || []).slice(1, 4);
    const key = ids.join(',');
    if (!force && key === M.followKey) return;
    M.followKey = key;
    M.followers = ids.map((id, i) => {
      const f = mkChar(id, 0, 0, 'down');
      f.sprite = id; f.idx = i;
      placeBehind(f, i);
      return f;
    });
  }
  function followStep(f) {
    const t = f.queue.shift();
    const dx = t.x - f.x, dy = t.y - f.y;
    const nxt = M.followers[f.idx + 1];
    if (nxt) nxt.queue.push({ x: f.x, y: f.y, spd: t.spd });
    if (Math.abs(dx) + Math.abs(dy) !== 1) { f.x = t.x; f.y = t.y; f.ox = 0; f.oy = 0; return; }
    f.dir = dirFromDelta(dx, dy);
    f.x = t.x; f.y = t.y;
    f.ox = -dx * TILE; f.oy = -dy * TILE;
    f.spd = t.spd; f.moving = true; f.anim = 0;
  }

  // ------------------------------------------------------------------ player placement & map switching
  function placePlayer(x, y, dir) {
    const p = M.player;
    p.x = x; p.y = y; p.dir = dir || p.dir;
    p.ox = 0; p.oy = 0; p.jt = 0; p.jy = 0; p.moving = false; p.anim = 0; p.queue = [];
    p.routeId++; flushArrive(p);
  }
  function saveState() {
    if (!M.def) return;
    const p = M.player;
    G.state.map = { id: M.def.id, x: p.x, y: p.y, dir: p.dir };
  }
  function camFocus() {
    if (M.cam.fixed) return M.cam.fixed;
    const p = M.player;
    return { cx: p.x * TILE + p.ox + TILE / 2, cy: p.y * TILE + p.oy + TILE / 2 };
  }
  function camClamp(f) {
    const def = M.def;
    if (!def) return { x: 0, y: 0 };
    const W = def.w * TILE, H = def.h * TILE;
    const x = W <= VW ? -(VW - W) / 2 : clamp(f.cx - VW / 2, 0, W - VW);
    const y = H <= VH ? -(VH - H) / 2 : clamp(f.cy - VH / 2, 0, H - VH);
    return { x, y };
  }
  function snapCam() {
    if (M.cam.tw) { const r = M.cam.tw.res; M.cam.tw = null; r(); }
    const t = camClamp(camFocus());
    M.cam.x = t.x; M.cam.y = t.y;
  }
  function rollEncounter() {
    if (!M.enc) return;
    const s = M.enc.steps || [10, 20];
    M.encLeft = rint(s[0], s[1]);
  }
  function switchMap(def, x, y, dir) {
    for (const e of M.events) { e.routeId++; flushArrive(e); }
    M.def = def;
    M.serial++;
    M.bumpLock = null;
    M.emotes = [];
    M.cache = cacheFor(def);
    const ovs = M.overrides[def.id] || {};
    M.events = (def.events || []).map((d) => makeEvent(d, ovs[d.id]));
    const sp = def.spawn || { x: 1, y: 1, dir: 'down' };
    let px = x == null ? sp.x : x, py = y == null ? sp.y : y;
    if (!terrainOK(def, px, py)) { px = sp.x; py = sp.y; }
    placePlayer(px, py, dir || sp.dir || 'down');
    syncFollowers(true);
    refreshEvents();
    M.enc = (def.encounters && def.encounters.troops && def.encounters.troops.length) ? def.encounters : null;
    rollEncounter();
    M.cam.fixed = null;
    if (M.cam.tw) { const r = M.cam.tw.res; M.cam.tw = null; r(); }
    snapCam();
    saveState();
    if (def.bgm && G.audio && typeof G.audio.playBgm === 'function') G.audio.playBgm(def.bgm);
  }
  function showBanner(def) {
    if (!def.name || def.banner === false) return;
    M.banner = { t: 0, text: String(def.name) };
  }
  // entry sequence: (fade in) -> banner -> onEnter -> auto events. Runs as a script (busy while it runs).
  function enterFlow(o) {
    const serial = M.serial;
    return G.script.run(async (c) => {
      if (o.fromBlack) G.fx.fade = 1;
      await G.fx.doFade('in', o.frames || 30);
      if (serial !== M.serial || !M.def) return;
      const def = M.def;
      if (o.banner) showBanner(def);
      if (typeof def.onEnter === 'function') await def.onEnter(c);
      await runAutos(c, serial);
    });
  }
  async function runAutos(c, serial) {
    const list = M.events.filter((e) => e.trigger === 'auto');
    for (const e of list) {
      if (serial !== M.serial) return;
      if (!evalIf(e)) continue;
      if (e.def && typeof e.def.run === 'function') await e.def.run(c);
    }
    if (serial === M.serial) refreshEvents();
  }
  async function transfer(mapId, x, y, dir) {
    const def = G.maps && G.maps.get(mapId);
    if (!def) { console.error('[map] transfer: unknown map ' + mapId); return; }
    const prevId = M.def ? M.def.id : null;
    M.locked++;
    try {
      await G.fx.doFade('out', 20);
      switchMap(def, x, y, dir);
    } finally { M.locked--; }
    await enterFlow({ fromBlack: false, banner: prevId !== def.id });
  }

  // ------------------------------------------------------------------ events: triggers
  function runEvent(e) {
    if (!e || !e.def || typeof e.def.run !== 'function' || G.script.busy) return false;
    const serial = M.serial;
    G.script.run(async (c) => { await e.def.run(c); })
      .then(() => { if (serial === M.serial) refreshEvents(); });
    return true;
  }
  function tryAction() {
    const p = M.player, d = DIRS[p.dir];
    const fx = p.x + d[0], fy = p.y + d[1];
    let e = M.events.find((ev) => ev.trigger === 'action' && evCovers(ev, fx, fy) && liveNow(ev));
    if (!e) e = M.events.find((ev) => ev.trigger === 'action' && !isSolidEv(ev) && evCovers(ev, p.x, p.y) && liveNow(ev));
    if (!e) return false;
    if (e.sprite) e.dir = OPP[p.dir];   // characters turn to face the person talking to them
    return runEvent(e);
  }
  function bumpCheck(tx, ty, d) {
    if (M.bumpLock === d || G.script.busy) return;
    const e = M.events.find((ev) => ev.trigger === 'touch' && isSolidEv(ev) && evCovers(ev, tx, ty) && liveNow(ev));
    if (!e) return;
    M.bumpLock = d;
    e.dir = OPP[d];
    runEvent(e);
  }
  function findArrivalEvent(x, y) {
    return M.events.find((ev) => (ev.trigger === 'step' || (ev.trigger === 'touch' && !isSolidEv(ev))) &&
      evCovers(ev, x, y) && liveNow(ev)) || null;
  }

  // ------------------------------------------------------------------ encounters
  function pickTroop(list) {
    let total = 0;
    for (const t of list) total += (t.weight == null ? 1 : t.weight);
    let r = Math.random() * total;
    for (const t of list) { r -= (t.weight == null ? 1 : t.weight); if (r < 0) return t.id; }
    return list[list.length - 1].id;
  }
  function runEncounter(troopId) {
    const data = G.data && G.data.troops && G.data.troops[troopId];
    const bg = (data && data.bg) || 'forest';
    const bgm = (data && data.bgm) || 'battle';
    G.script.run(async (c) => {
      c.sfx('encounter');
      G.fx.doFlash('#ffffff', 18);
      G.fx.doShake(3, 16);
      await G.wait(20);
      await c.battle(troopId, { canEscape: true, bgm, bg });
    }).then(() => refreshEvents());
  }
  function encounterStep() {
    if (!M.enc) return;
    M.encLeft--;
    if (M.encLeft > 0) return;
    rollEncounter();
    runEncounter(pickTroop(M.enc.troops));
  }

  // ------------------------------------------------------------------ player arrival / input
  function playerArrived() {
    const p = M.player;
    G.state.steps = (G.state.steps || 0) + 1;
    saveState();
    if (G.script.busy || M.locked > 0) return;
    const e = findArrivalEvent(p.x, p.y);
    if (e && runEvent(e)) return;
    encounterStep();
  }
  function handleInput() {
    const p = M.player;
    if (G.input.pressed('menu') && G.scenes.has('menu')) { G.scenes.push('menu', {}); return; }
    if (p.moving) return;
    if (G.input.pressed('ok') && tryAction()) return;
    const d = G.input.dir();
    if (!d) return;
    if (startStep(p, d, { speed: G.input.down('dash') ? DASH_SPEED : WALK_SPEED })) return;
    p.dir = d;
    bumpCheck(p.x + DIRS[d][0], p.y + DIRS[d][1], d);
  }

  // ------------------------------------------------------------------ non-player characters
  function updateNPCs() {
    const p = M.player;
    for (const e of M.events) {
      if (!e.sprite || e.hidden || !e.active || e.moving) continue;
      if (e.move === 'wander') {
        if (G.script.busy) continue;
        if (--e.wt > 0) continue;
        e.wt = rint(60, 120);
        if (Math.abs(e.x - p.x) + Math.abs(e.y - p.y) <= 1) continue;   // don't wander off while talking
        const dir = DIR_LIST[rint(0, 3)], d = DIRS[dir];
        const nx = e.x + d[0], ny = e.y + d[1];
        if (Math.abs(nx - e.hx) > 2 || Math.abs(ny - e.hy) > 2) { e.dir = dir; continue; }
        startStep(e, dir, { speed: WALK_SPEED });
      } else if (e.move === 'face') {
        if (G.frame % 15 !== 0) continue;
        const dx = p.x - e.x, dy = p.y - e.y;
        if (dx === 0 && dy === 0) continue;
        if (Math.abs(dx) + Math.abs(dy) > 3) continue;
        e.dir = Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
      }
    }
  }

  // ------------------------------------------------------------------ camera
  function startCamTween(frames) {
    const cam = M.cam;
    if (cam.tw) { const r = cam.tw.res; cam.tw = null; r(); }
    const dur = Math.max(1, frames == null ? 30 : frames | 0);
    return new Promise((res) => { cam.tw = { x0: cam.x, y0: cam.y, t: 0, dur, res }; });
  }
  function updateCamera() {
    if (!M.def) return;
    const cam = M.cam, tw = cam.tw;
    const tgt = camClamp(camFocus());
    if (!tw) { cam.x = tgt.x; cam.y = tgt.y; return; }
    tw.t++;
    const k = Math.min(1, tw.t / tw.dur), e = k * k * (3 - 2 * k);
    cam.x = tw.x0 + (tgt.x - tw.x0) * e;
    cam.y = tw.y0 + (tgt.y - tw.y0) * e;
    if (tw.t >= tw.dur) { cam.tw = null; cam.x = tgt.x; cam.y = tgt.y; tw.res(); }
  }

  // ------------------------------------------------------------------ per-frame update
  function update() {
    if (!M.def) return;
    syncFollowers(false);
    for (const e of M.events) stepChar(e);
    if (M.followOn) for (const f of M.followers) { if (!f.moving && f.queue.length) followStep(f); stepChar(f); }
    stepChar(M.player);          // may trigger arrival handlers (step events, encounters)

    updateNPCs();
    for (const em of M.emotes) em.t++;
    M.emotes = M.emotes.filter((em) => em.t < EMOTE_LIFE);
    if (M.banner) { M.banner.t++; if (M.banner.t >= BANNER_LIFE) M.banner = null; }

    if (M.bumpLock && G.input.dir() !== M.bumpLock) M.bumpLock = null;
    const blocked = G.script.busy || !!(G.ui && G.ui.modal) || M.locked > 0;
    if (!blocked) handleInput();

    if (G.frame % 30 === 0) refreshEvents();
    updateCamera();
  }

  // ------------------------------------------------------------------ drawing
  function feetY(ch) { return ch.y * TILE + ch.oy + TILE; }
  function placeholderChar(ctx, key, dir, px, py) {
    const h = G.util.hash(key) % 360;
    if (key.indexOf('obj_') === 0) {
      ctx.fillStyle = `hsl(${h},45%,38%)`; ctx.fillRect(px + 5, py + 10, 22, 18);
      ctx.strokeStyle = '#111'; ctx.strokeRect(px + 5.5, py + 10.5, 21, 17);
      return;
    }
    ctx.fillStyle = `hsl(${h},50%,42%)`; ctx.fillRect(px + 8, py + 15, 16, 13);
    ctx.fillStyle = '#e8c49a'; ctx.fillRect(px + 10, py + 5, 12, 11);
    ctx.fillStyle = `hsl(${(h + 150) % 360},45%,28%)`; ctx.fillRect(px + 10, py + 3, 12, 5);
    ctx.fillStyle = '#1a1a1a';
    if (dir === 'down') { ctx.fillRect(px + 12, py + 10, 2, 2); ctx.fillRect(px + 18, py + 10, 2, 2); }
    else if (dir === 'left') ctx.fillRect(px + 11, py + 10, 2, 2);
    else if (dir === 'right') ctx.fillRect(px + 19, py + 10, 2, 2);
  }
  let drawCharWarned = false;
  function drawCharacter(ctx, ch, cx, cy) {
    const px = Math.round(ch.x * TILE + ch.ox - cx), py = Math.round(ch.y * TILE + ch.oy + ch.jy - cy);
    if (px <= -TILE || py <= -TILE || px >= VW || py >= VH) return;
    const key = ch.sprite;
    if (!key) return;
    const dir = ch.dir || 'down';
    let frame = 1, d = dir;
    if (key.indexOf('obj_') === 0) { frame = Math.floor(G.frame / 12) % 3; d = 'down'; }
    else if (ch.moving) frame = WALK_FRAMES[Math.floor(ch.anim / (ch.spd >= DASH_SPEED ? 3 : 4)) % 4];
    if (G.gfx && typeof G.gfx.drawChar === 'function') {
      try { G.gfx.drawChar(ctx, key, d, frame, px, py); return; }
      catch (err) { if (!drawCharWarned) { drawCharWarned = true; warn('gfx.drawChar threw; using placeholders', err); } }
    }
    placeholderChar(ctx, key, d, px, py);
  }
  function drawEmotes(ctx, cx, cy) {
    for (const em of M.emotes) {
      const ch = em.ch;
      const px = Math.round(ch.x * TILE + ch.ox - cx) + TILE / 2, py = Math.round(ch.y * TILE + ch.oy - cy);
      if (G.gfx && typeof G.gfx.drawEmote === 'function') { G.gfx.drawEmote(ctx, em.kind, px, py, em.t); continue; }
      const by = py - 16 - Math.min(6, em.t / 3);
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#222';
      ctx.beginPath(); ctx.arc(px, by, 9, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#222'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(EMOTE_GLYPH[em.kind] || '?', px, by + 0.5);
    }
  }
  function drawBanner(ctx) {
    const b = M.banner;
    if (!b) return;
    const t = b.t;
    const a = t < 20 ? t / 20 : t > BANNER_LIFE - 20 ? Math.max(0, (BANNER_LIFE - t) / 20) : 1;
    if (a <= 0) return;
    const gfx = G.gfx || {};
    const tw = gfx.textWidth ? gfx.textWidth(b.text, 20, true) : b.text.length * 11;
    const w = Math.max(200, Math.round(tw + 64)), h = 44, x = Math.round((VW - w) / 2), y = 26;
    ctx.save();
    ctx.globalAlpha = a;
    if (gfx.window) gfx.window(ctx, x, y, w, h, { style: 'blue' });
    else {
      ctx.fillStyle = 'rgba(12,18,44,0.9)'; ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = '#9fd8ff'; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    }
    if (gfx.text) gfx.text(ctx, b.text, VW / 2, y + 11, { size: 20, align: 'center', bold: true });
    else {
      ctx.font = 'bold 20px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.fillStyle = '#fff'; ctx.fillText(b.text, VW / 2, y + 11);
    }
    ctx.restore();
  }
  function drawDebug(ctx, cx, cy) {
    if (!M.debug) return;
    const p = M.player;
    const lines = [
      'FPS ' + M.fps + '   map ' + (M.def ? M.def.id : '-'),
      'pos ' + p.x + ',' + p.y + ' ' + p.dir + '   steps ' + (G.state.steps | 0),
      'cam ' + Math.round(M.cam.x) + ',' + Math.round(M.cam.y) + '   events ' + M.events.length + '   enc ' + (M.enc ? M.encLeft : '-'),
      'busy ' + !!G.script.busy + '  locked ' + M.locked + '  follow ' + M.followOn + ' (' + M.followers.length + ')',
    ];
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(4, 4, 330, lines.length * 14 + 8);
    ctx.font = '12px monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillStyle = '#d8ff9a';
    lines.forEach((l, i) => ctx.fillText(l, 8, 8 + i * 14));
    ctx.restore();
  }
  function draw(ctx) {
    const now = performance.now();
    M.fpsN++;
    if (now - M.fpsT >= 1000) { M.fps = M.fpsN; M.fpsN = 0; M.fpsT = now; }
    ctx.fillStyle = (M.def && M.def.backdrop) || '#06050c';
    ctx.fillRect(0, 0, VW, VH);
    if (!M.def) return;
    const def = M.def, cache = M.cache;
    const cx = Math.round(M.cam.x), cy = Math.round(M.cam.y);

    drawLayer(ctx, def, 'ground', cx, cy);
    const frame = Math.floor(G.frame / 20) % 4;
    for (const a of cache.anim) {
      const sx = a.x * TILE - cx, sy = a.y * TILE - cy;
      if (sx <= -TILE || sy <= -TILE || sx >= VW || sy >= VH) continue;
      paintScreenTile(ctx, a.ch, 'ground', sx, sy, frame);
    }
    drawLayer(ctx, def, 'objects', cx, cy);

    // sprites: player, followers and visible events, sorted by feet line
    const list = [{ ch: M.player, feet: feetY(M.player), ord: 0 }];
    if (M.followOn) for (const f of M.followers) list.push({ ch: f, feet: feetY(f), ord: 1 });
    let ord = 2;
    for (const e of M.events) if (e.sprite && !e.hidden && e.active) list.push({ ch: e, feet: feetY(e), ord: ord++ });
    list.sort((a, b) => (a.feet - b.feet) || (a.ord - b.ord));
    for (const it of list) drawCharacter(ctx, it.ch, cx, cy);

    drawLayer(ctx, def, 'above', cx, cy);
    if (def.tint) { ctx.fillStyle = def.tint; ctx.fillRect(0, 0, VW, VH); }
    drawEmotes(ctx, cx, cy);
    drawBanner(ctx);
    drawDebug(ctx, cx, cy);
  }

  // ------------------------------------------------------------------ scene
  function enterScene(p) {
    const id = p.map || (G.state.map && G.state.map.id);
    const def = G.maps && G.maps.get(id);
    if (!def) { console.error('[map] unknown map ' + id); return; }
    M.locked = 0;
    if (p.resume) M.overrides = {};
    switchMap(def, p.x, p.y, p.dir);
    enterFlow({ fromBlack: p.fade !== false, banner: true });
  }
  G.scenes.register('map', function () {
    return {
      opaque: true,
      enter(p) { enterScene(p || {}); },
      update() { update(); },
      draw(ctx) { draw(ctx); },
      exit() {},
      pause() {},
      resume() {},
    };
  });
  if (!window.__mapF3Bound) {
    window.__mapF3Bound = true;
    window.addEventListener('keydown', (e) => { if (e.code === 'F3') { M.debug = !M.debug; e.preventDefault(); } });
  }

  // ------------------------------------------------------------------ public runtime: G.map
  G.map = {
    player: M.player,
    get id() { return M.def ? M.def.id : null; },
    get def() { return M.def; },
    get events() { return M.events; },
    get followers() { return M.followers; },
    get cam() { return M.cam; },
    getEvent(id) { return eventOf(id); },
    refreshEvents,
    teleport(x, y, dir) {
      if (!M.def) return;
      placePlayer(x, y, dir);
      syncFollowers(true);
      snapCam();
      saveState();
      refreshEvents();
    },
    isPassable(x, y) { return !!M.def && terrainOK(M.def, x, y); },
    // edit a tile in the live map (layer 'ground'|'objects'|'above'); rebuilds render caches
    setTile(layer, x, y, ch) {
      const def = M.def;
      if (!def || !def[layer] || !inb(def, x, y)) return;
      const row = def[layer][y];
      if (typeof row === 'string') def[layer][y] = row.slice(0, x) + ch + row.slice(x + 1);
      else row[x] = ch;
      invalidate(def);
    },
    invalidate() { if (M.def) invalidate(M.def); },
  };

  // ------------------------------------------------------------------ script commands
  const S = G.script;
  S.define('transfer', (mapId, x, y, dir) => transfer(mapId, x, y, dir));

  S.define('walk', (who, dirs, opts) => {
    const ch = charOf(who);
    if (!ch) { warn('walk: unknown character ' + who); return resolved(); }
    opts = Object.assign({ speed: WALK_SPEED, wait: true }, opts || {});
    return doWalk(ch, Array.isArray(dirs) ? dirs : [dirs], opts);
  });
  S.define('walkTo', (who, x, y, opts) => {
    const ch = charOf(who);
    if (!ch) { warn('walkTo: unknown character ' + who); return resolved(); }
    opts = Object.assign({ speed: WALK_SPEED, wait: true }, opts || {});
    const path = findPath(ch, x | 0, y | 0, opts);
    if (!path) { warn('walkTo: no path for ' + who + ' to ' + x + ',' + y); return resolved(); }
    return doWalk(ch, path, opts);
  });
  S.define('face', (who, dir) => {
    const ch = charOf(who);
    if (ch && DIRS[dir]) ch.dir = dir;
    return resolved();
  });
  function moveEventTo(e, x, y, dir) {
    e.routeId++; flushArrive(e);
    e.x = x; e.y = y; e.hx = x; e.hy = y;
    e.ox = 0; e.oy = 0; e.moving = false;
    if (dir && DIRS[dir]) e.dir = dir;
  }
  S.define('setPos', (who, x, y, dir) => {
    const ch = charOf(who);
    if (!ch) { warn('setPos: unknown character ' + who); return resolved(); }
    if (ch === M.player) {
      placePlayer(x | 0, y | 0, dir);
      syncFollowers(true);
      snapCam();
      saveState();
      refreshEvents();
      return resolved();
    }
    moveEventTo(ch, x | 0, y | 0, dir);
    saveOv(ch, { x: ch.x, y: ch.y, dir: ch.dir });
    return resolved();
  });
  S.define('showNpc', (id, on) => {
    const e = eventOf(id);
    if (!e) { warn('showNpc: unknown event ' + id); return resolved(); }
    e.hidden = on === false;
    saveOv(e, { hidden: e.hidden });
    return resolved();
  });
  S.define('setSprite', (id, key) => {
    const e = eventOf(id);
    if (!e) { warn('setSprite: unknown event ' + id); return resolved(); }
    e.sprite = key || null;
    saveOv(e, { sprite: e.sprite });
    return resolved();
  });
  S.define('setEvent', (id, props) => {
    const e = eventOf(id);
    if (!e) { warn('setEvent: unknown event ' + id); return resolved(); }
    props = props || {};
    if (props.x !== undefined || props.y !== undefined) moveEventTo(e, props.x !== undefined ? props.x | 0 : e.x, props.y !== undefined ? props.y | 0 : e.y, props.dir);
    else if (props.dir && DIRS[props.dir]) e.dir = props.dir;
    if (props.sprite !== undefined) e.sprite = props.sprite || null;
    if (props.move !== undefined) e.move = props.move;
    if (props.solid !== undefined) e.solid = !!props.solid;
    if (props.trigger !== undefined) e.trigger = props.trigger;
    if (props.hidden !== undefined) e.hidden = !!props.hidden;
    saveOv(e, { x: e.x, y: e.y, dir: e.dir, sprite: e.sprite, move: e.move, solid: e.solid, trigger: e.trigger, hidden: e.hidden });
    return resolved();
  });
  S.define('camera', (x, y, frames) => {
    M.cam.fixed = { cx: (x | 0) * TILE + TILE / 2, cy: (y | 0) * TILE + TILE / 2 };
    return startCamTween(frames);
  });
  S.define('camReset', (frames) => {
    M.cam.fixed = null;
    return startCamTween(frames);
  });
  S.define('emote', (who, kind) => {
    const ch = charOf(who);
    if (ch) M.emotes.push({ ch, kind: String(kind || 'exclaim'), t: 0 });
    return G.wait(EMOTE_LIFE);
  });
  S.define('jump', (who) => {
    const ch = charOf(who);
    if (ch) ch.jt = JUMP_LIFE;
    return G.wait(JUMP_LIFE);
  });
  S.define('follow', (on) => {
    const want = on !== false;
    const was = M.followOn;
    M.followOn = want;
    if (want && !was) syncFollowers(true);
    return resolved();
  });

  G.provide('map');
})();
