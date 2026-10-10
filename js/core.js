/* =====================================================================
 * LANTERNBOUND — core.js  (OVERSEER-OWNED. Do not edit unless you are the overseer.)
 * Global namespace, main loop, input, scene manager, timers, script runner,
 * game state, save/load, fade/flash/shake overlay.
 * ===================================================================== */
(function () {
  'use strict';
  const G = (window.G = window.G || {});
  G.W = 640; G.H = 480; G.TILE = 32;
  G.VERSION = '0.1.0';
  G.frame = 0;
  G.modules = {};            // G.modules.name = true when a module finished loading
  G.provide = function (name) { G.modules[name] = true; };

  // ---------------------------------------------------------------- canvas
  const canvas = document.getElementById('game');
  canvas.width = G.W; canvas.height = G.H;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  G.canvas = canvas; G.ctx = ctx;

  // ---------------------------------------------------------------- util
  G.util = {
    clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
    lerp: (a, b, t) => a + (b - a) * t,
    rand: () => Math.random(),
    randInt: (a, b) => a + Math.floor(Math.random() * (b - a + 1)),   // inclusive
    pick: (arr) => arr[Math.floor(Math.random() * arr.length)],
    shuffle: (arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; },
    deepCopy: (o) => JSON.parse(JSON.stringify(o)),
    // deterministic PRNG (mulberry32) — use for procedural art so it is identical every run
    rng: (seed) => { let a = seed >>> 0; return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; },
    hash: (str) => { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; },
    // create an offscreen canvas
    canvas: (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; return c; },
  };

  // ---------------------------------------------------------------- input
  // Logical buttons: up down left right ok cancel menu dash boost pageup pagedown
  const KEYMAP = {
    ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
    KeyZ: 'ok', Enter: 'ok', Space: 'ok',
    KeyX: 'cancel', Escape: 'cancel', Backspace: 'cancel',
    ShiftLeft: 'dash', ShiftRight: 'dash',
    KeyR: 'boost', KeyE: 'boost',
    KeyQ: 'pageup', PageUp: 'pageup', KeyC: 'pagedown', PageDown: 'pagedown',
    KeyM: 'menu', Tab: 'menu',
  };
  const held = {}, trig = {}, rel = {}, repeatT = {};
  G.input = {
    down: (b) => !!held[b],
    pressed: (b) => !!trig[b],                 // true only on the frame the button went down
    repeat: (b) => !!trig[b] || (held[b] && repeatT[b] > 24 && repeatT[b] % 5 === 0), // key-repeat for menus
    released: (b) => !!rel[b],
    // currently held direction, last-pressed wins; returns 'up'|'down'|'left'|'right'|null
    dir() { let best = null, bt = -1; for (const d of ['up', 'down', 'left', 'right']) if (held[d] && held[d] > bt) { best = d; bt = held[d]; } return best; },
    any: () => Object.keys(trig).length > 0,
    clear() { for (const k in trig) delete trig[k]; },
    _tick() {                                  // called once per update step AFTER scenes have run
      for (const k in trig) delete trig[k];
      for (const k in rel) delete rel[k];
      for (const k in held) repeatT[k] = (repeatT[k] || 0) + 1;
    },
    // virtual press (used by touch buttons / tests)
    press(b) { if (!held[b]) { held[b] = ++G.input._seq; trig[b] = true; repeatT[b] = 0; } },
    release(b) { if (held[b]) { delete held[b]; rel[b] = true; delete repeatT[b]; } },
    _seq: 0,
  };
  window.addEventListener('keydown', (e) => {
    const b = KEYMAP[e.code]; if (!b) return;
    e.preventDefault();
    if (G.audio && G.audio.unlock) G.audio.unlock();
    G.input.press(b);
    if (e.code === 'Escape' || e.code === 'Tab') { /* cancel & menu both fire for Esc/Tab */ }
    if (e.code === 'Escape' || e.code === 'KeyX') G.input.press('menu');
  });
  window.addEventListener('keyup', (e) => {
    const b = KEYMAP[e.code]; if (!b) return;
    G.input.release(b);
    if (e.code === 'Escape' || e.code === 'KeyX') G.input.release('menu');
  });
  window.addEventListener('blur', () => { for (const k in held) delete held[k]; });
  canvas.addEventListener('pointerdown', () => { if (G.audio && G.audio.unlock) G.audio.unlock(); canvas.focus && canvas.focus(); });

  // ---------------------------------------------------------------- timers (frame based)
  const timers = [];
  G.wait = function (frames) { return new Promise((res) => timers.push({ left: Math.max(0, frames | 0), res })); };
  G.waitUntil = function (fn, maxFrames) { return new Promise((res) => timers.push({ left: maxFrames || 1e9, res, until: fn })); };
  function tickTimers() {
    for (let i = timers.length - 1; i >= 0; i--) {
      const t = timers[i];
      if (t.until && t.until()) { timers.splice(i, 1); t.res(); continue; }
      if (--t.left <= 0) { timers.splice(i, 1); t.res(); }
    }
  }

  // ---------------------------------------------------------------- global screen effects (fade / flash / shake)
  G.fx = {
    fade: 0, fadeTo: 0, fadeSpeed: 0, fadeColor: '#000', fadeRes: null,
    flashA: 0, flashColor: '#fff', flashDec: 0.05,
    shakeFrames: 0, shakePower: 0, ox: 0, oy: 0,
    // c.fade('out'|'in', frames, color) -> promise
    doFade(dir, frames, color) {
      const f = G.fx; f.fadeColor = color || '#000';
      f.fadeTo = dir === 'out' ? 1 : 0;
      frames = Math.max(1, frames == null ? 30 : frames);
      f.fadeSpeed = Math.abs(f.fadeTo - f.fade) / frames;
      if (f.fadeSpeed === 0) return Promise.resolve();
      return new Promise((res) => { f.fadeRes = res; });
    },
    doFlash(color, frames) { const f = G.fx; f.flashColor = color || '#fff'; f.flashA = 1; f.flashDec = 1 / Math.max(1, frames || 20); },
    doShake(power, frames) { const f = G.fx; f.shakePower = power || 4; f.shakeFrames = frames || 20; },
    update() {
      const f = G.fx;
      if (f.fade !== f.fadeTo) {
        const d = f.fadeTo - f.fade;
        if (Math.abs(d) <= f.fadeSpeed) { f.fade = f.fadeTo; if (f.fadeRes) { const r = f.fadeRes; f.fadeRes = null; r(); } }
        else f.fade += Math.sign(d) * f.fadeSpeed;
      }
      if (f.flashA > 0) f.flashA = Math.max(0, f.flashA - f.flashDec);
      if (f.shakeFrames > 0) { f.shakeFrames--; f.ox = (Math.random() * 2 - 1) * f.shakePower; f.oy = (Math.random() * 2 - 1) * f.shakePower; } else { f.ox = f.oy = 0; }
    },
    draw(c) {
      const f = G.fx;
      if (f.flashA > 0) { c.globalAlpha = f.flashA; c.fillStyle = f.flashColor; c.fillRect(0, 0, G.W, G.H); c.globalAlpha = 1; }
      if (f.fade > 0) { c.globalAlpha = f.fade; c.fillStyle = f.fadeColor; c.fillRect(0, 0, G.W, G.H); c.globalAlpha = 1; }
    },
  };

  // ---------------------------------------------------------------- scenes
  // A scene is a plain object: { enter(params), update(), draw(ctx), exit(), opaque:bool, pause?() resume?() }
  // Register a FACTORY:  G.scenes.register('map', (params) => ({ ...scene object... }))
  const factories = {};
  const stack = [];
  G.scenes = {
    register(name, factory) { factories[name] = factory; },
    has: (name) => !!factories[name],
    create(name, params) {
      if (!factories[name]) throw new Error('Unknown scene: ' + name);
      const s = factories[name](params || {}); s.name = name; s.params = params || {};
      if (s.opaque === undefined) s.opaque = true; return s;
    },
    push(name, params) {
      const top = stack[stack.length - 1]; if (top && top.pause) top.pause();
      const s = G.scenes.create(name, params); stack.push(s); if (s.enter) s.enter(params || {}); return s;
    },
    pop() {
      const s = stack.pop(); if (s && s.exit) s.exit();
      const top = stack[stack.length - 1]; if (top && top.resume) top.resume(); return s;
    },
    replace(name, params) {   // pops EVERYTHING then pushes
      while (stack.length) { const s = stack.pop(); if (s.exit) s.exit(); }
      return G.scenes.push(name, params);
    },
    swapTop(name, params) {   // replace only the top scene
      const s = stack.pop(); if (s && s.exit) s.exit();
      const n = G.scenes.create(name, params); stack.push(n); if (n.enter) n.enter(params || {}); return n;
    },
    top: () => stack[stack.length - 1] || null,
    stack: () => stack.slice(),
    depth: () => stack.length,
  };

  // ---------------------------------------------------------------- game state
  G.NEW_STATE = () => ({
    version: 1,
    player: { name: 'Rowan' },
    party: ['rowan'],          // ordered active party (max 4 fight). Rowan is always first.
    roster: {},                // actorId -> runtime actor {id, level, exp, hp, sp, equip:{weapon,armor,accessory}}
    inventory: {},             // itemId -> count
    gold: 150,
    flags: {},                 // free-form story flags
    chapter: 0,
    map: { id: 'wickholm_house', x: 5, y: 6, dir: 'down' },
    romance: { points: {}, lover: null, seen: {}, gifts: {}, journal: [] },
    steps: 0, playtime: 0,     // playtime in frames
    battles: 0,
  });
  G.state = G.NEW_STATE();
  G.name = () => G.state.player.name || 'Rowan';
  G.flag = (k) => G.state.flags[k];
  G.setFlag = (k, v) => { G.state.flags[k] = (v === undefined ? true : v); };
  G.newGame = function (playerName) {
    G.state = G.NEW_STATE();
    G.state.player.name = (playerName || 'Rowan').trim().slice(0, 10) || 'Rowan';
    if (G.party && G.party.init) G.party.init();   // data.js creates Rowan's runtime actor
    return G.state;
  };

  // ---------------------------------------------------------------- save / load
  const SAVE_PREFIX = 'lanternbound_save_';
  G.save = {
    SLOTS: 3,
    write(slot) {
      try {
        const meta = {
          slot, time: Date.now(), chapter: G.state.chapter, playtime: G.state.playtime, name: G.name(), map: G.state.map.id,
          mapName: (G.maps && G.maps.get && G.maps.get(G.state.map.id)) ? G.maps.get(G.state.map.id).name : G.state.map.id,
          party: G.state.party.map((id) => ({ id, level: (G.state.roster[id] || {}).level || 1 })), gold: G.state.gold,
        };
        localStorage.setItem(SAVE_PREFIX + slot, JSON.stringify({ meta, state: G.state }));
        return true;
      } catch (e) { console.warn('save failed', e); return false; }
    },
    info(slot) { try { const j = localStorage.getItem(SAVE_PREFIX + slot); return j ? JSON.parse(j).meta : null; } catch (e) { return null; } },
    exists(slot) { return !!G.save.info(slot); },
    read(slot) {      // loads into G.state, returns true/false. Caller then starts the map scene.
      try {
        const j = localStorage.getItem(SAVE_PREFIX + slot); if (!j) return false;
        const o = JSON.parse(j); G.state = Object.assign(G.NEW_STATE(), o.state); return true;
      } catch (e) { console.warn('load failed', e); return false; }
    },
    anySave() { for (let i = 1; i <= G.save.SLOTS; i++) if (G.save.exists(i)) return true; return false; },
    latest() { let best = 0, bt = -1; for (let i = 1; i <= G.save.SLOTS; i++) { const m = G.save.info(i); if (m && m.time > bt) { bt = m.time; best = i; } } return best; },
  };
  // Resume the world from G.state (after a load or from debug start)
  G.resumeGame = function () {
    const m = G.state.map;
    G.scenes.replace('map', { map: m.id, x: m.x, y: m.y, dir: m.dir, resume: true });
  };

  // ---------------------------------------------------------------- script runner
  // Story scripts are async functions receiving a command context `c`.
  //   G.script.define('say', async function (speaker, text, opts) {...})   <- modules register commands
  //   await G.script.run(async (c) => { await c.say('Claret', 'Hi'); });
  // Unknown commands do not crash: they log a warning and resolve.
  G.script = {
    cmds: {}, depth: 0, busy: false,
    define(name, fn) { G.script.cmds[name] = fn; },
    ctx: null,
    async run(fn) {
      G.script.depth++; G.script.busy = true;
      try { return await fn(G.script.ctx); }
      catch (e) { console.error('[script error]', e); }
      finally { G.script.depth--; G.script.busy = G.script.depth > 0; }
    },
  };
  G.script.ctx = new Proxy({}, {
    get(_, name) {
      if (typeof name !== 'string') return undefined;
      const f = G.script.cmds[name];
      if (f) return f;
      if (name === 'then') return undefined;      // so `await c` never misbehaves
      return function () { console.warn('[script] missing command c.' + name + '(', ...arguments, ')'); return Promise.resolve(); };
    },
  });
  // ---- core-owned commands
  const S = G.script;
  S.define('wait', (frames) => G.wait(frames == null ? 30 : frames));
  S.define('fade', (dir, frames, color) => G.fx.doFade(dir, frames, color));
  S.define('flash', (color, frames) => { G.fx.doFlash(color, frames); return G.wait(Math.min(frames || 20, 10)); });
  S.define('shake', (power, frames) => { G.fx.doShake(power, frames); return G.wait(frames || 20); });
  S.define('flag', (k) => G.flag(k));
  S.define('set', (k, v) => { G.setFlag(k, v); });
  S.define('inc', (k, n) => { G.state.flags[k] = (G.state.flags[k] || 0) + (n == null ? 1 : n); return G.state.flags[k]; });
  S.define('gold', (n) => { G.state.gold = Math.max(0, G.state.gold + n); if (G.ui && G.ui.toast) G.ui.toast((n >= 0 ? 'Received ' : 'Paid ') + Math.abs(n) + ' gold'); });
  S.define('bgm', (name, opts) => { if (G.audio && G.audio.playBgm) G.audio.playBgm(name, opts); });
  S.define('sfx', (name) => { if (G.audio && G.audio.sfx) G.audio.sfx(name); });
  S.define('stopBgm', (frames) => { if (G.audio && G.audio.stopBgm) G.audio.stopBgm(frames); });
  S.define('run', (fn) => G.script.run(fn));
  S.define('chapter', (n) => { G.state.chapter = Math.max(G.state.chapter, n); });
  S.define('callScript', (name, ...args) => { const f = G.story && G.story.scripts && G.story.scripts[name]; if (!f) { console.warn('[script] unknown story script', name); return; } return f(G.script.ctx, ...args); });
  // item/party commands are provided by data.js (see CONTRACT): addItem, removeItem, join, leave, healAll, hasItem

  // ---------------------------------------------------------------- story registry (chapter modules fill this)
  G.story = { scripts: {}, chapters: {} };

  // ---------------------------------------------------------------- main loop
  let last = 0, acc = 0; const STEP = 1000 / 60;
  G.paused = false;
  G.step = function () {
    G.frame++;
    tickTimers();
    G.fx.update();
    const top = G.scenes.top();
    const wasModal = !!(G.ui && G.ui.modal);
    if (G.ui && G.ui.update) G.ui.update();
    if (G.audio && G.audio.update) G.audio.update();
    if (top && !wasModal && !(G.ui && G.ui.modal)) { top.update && top.update(); }
    if (G.state && top && top.name === 'map') G.state.playtime++;
    G.input._tick();
  };
  G.render = function () {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, G.W, G.H);
    ctx.translate(Math.round(G.fx.ox), Math.round(G.fx.oy));
    const st = G.scenes.stack(); let start = 0;
    for (let i = st.length - 1; i >= 0; i--) if (st[i].opaque) { start = i; break; }
    for (let i = start; i < st.length; i++) st[i].draw && st[i].draw(ctx);
    ctx.restore();
    if (G.ui && G.ui.draw) G.ui.draw(ctx);
    G.fx.draw(ctx);
  };
  function loop(t) {
    if (!last) last = t;
    acc += Math.min(100, t - last); last = t;
    let n = 0;
    while (acc >= STEP && n < 5) { if (!G.paused) { try { G.step(); } catch (e) { console.error('[step error]', e); } } acc -= STEP; n++; }
    try { G.render(); } catch (e) { console.error('[render error]', e); }
    requestAnimationFrame(loop);
  }
  G.start = function () { requestAnimationFrame(loop); };
  // test hook: advance N frames synchronously (headless tests)
  G.advance = function (n) { for (let i = 0; i < n; i++) G.step(); G.render(); };

  window.addEventListener('error', (e) => { console.error('[window error]', e.message, e.filename + ':' + e.lineno); });
  window.addEventListener('unhandledrejection', (e) => { console.error('[unhandled rejection]', e.reason && e.reason.stack || e.reason); });
})();
