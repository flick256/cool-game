/* =====================================================================
 * LANTERNBOUND — mapbuilder.js  (OVERSEER-OWNED)
 * Map registry + a programmatic map builder + event helper factories.
 * Chapter modules build maps with G.maps.build(...) and register them with m.finish().
 * ===================================================================== */
(function () {
  'use strict';
  const G = (window.G = window.G || {});
  const maps = (G.maps = G.maps || {});
  const store = {};
  maps.register = function (def) { store[def.id] = def; return def; };
  maps.get = (id) => store[id] || null;
  maps.list = () => Object.keys(store);
  maps.all = () => store;

  // ------------------------------------------------------------------ builder
  class Builder {
    constructor(id, w, h, opts) {
      opts = opts || {};
      this.id = id; this.w = w; this.h = h; this.opts = opts;
      const mk = (ch) => { const a = []; for (let y = 0; y < h; y++) { a.push(new Array(w).fill(ch)); } return a; };
      this.L = { ground: mk(opts.ground || '.'), objects: mk(' '), above: mk(' ') };
      this.events = []; this._enc = null;
      this._seed = G.util.hash(id);
    }
    inb(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h; }
    set(layer, x, y, ch) { if (this.inb(x, y)) this.L[layer][y][x] = ch; return this; }
    get(layer, x, y) { return this.inb(x, y) ? this.L[layer][y][x] : ' '; }
    tiles(layer, pts, ch) { for (const p of pts) this.set(layer, p[0], p[1], ch); return this; }
    rect(layer, x, y, w, h, ch) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(layer, x + i, y + j, ch); return this; }
    box(layer, x, y, w, h, ch) { this.hline(layer, x, y, w, ch); this.hline(layer, x, y + h - 1, w, ch); this.vline(layer, x, y, h, ch); this.vline(layer, x + w - 1, y, h, ch); return this; }
    hline(layer, x, y, len, ch) { for (let i = 0; i < len; i++) this.set(layer, x + i, y, ch); return this; }
    vline(layer, x, y, len, ch) { for (let i = 0; i < len; i++) this.set(layer, x, y + i, ch); return this; }
    border(layer, ch, t) { t = t || 1; for (let k = 0; k < t; k++) this.box(layer, k, k, this.w - 2 * k, this.h - 2 * k, ch); return this; }
    blob(layer, cx, cy, rx, ry, ch) {
      for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x - cx) / (rx + 0.5), dy = (y - cy) / (ry + 0.5); if (dx * dx + dy * dy <= 1) this.set(layer, x, y, ch);
      } return this;
    }
    pond(cx, cy, rx, ry) { this.blob('ground', cx, cy, rx, ry, '~'); this.blob('objects', cx, cy, rx + 1, ry + 1, ' '); return this; }
    // draws an L-shaped polyline of thickness `width` through points [[x,y],...]
    path(points, ch, width, layer) {
      width = width || 2; layer = layer || 'ground';
      for (let i = 0; i + 1 < points.length; i++) {
        const [x1, y1] = points[i], [x2, y2] = points[i + 1];
        const sx = Math.min(x1, x2), ex = Math.max(x1, x2), sy = Math.min(y1, y2), ey = Math.max(y1, y2);
        this.rect(layer, sx, y1, ex - sx + 1, width, ch);        // horizontal leg at y1
        this.rect(layer, x2, sy, width, ey - sy + 1, ch);        // vertical leg at x2
      } return this;
    }
    // random but deterministic scatter onto free ground cells.
    // opts: {seed, avoid:[{x,y,w,h}], on:'chars allowed in ground', layer:'objects'}
    scatter(layer, ch, count, opts) {
      opts = opts || {}; const rnd = G.util.rng((opts.seed || 1) + this._seed); layer = layer || 'objects';
      let placed = 0, tries = 0;
      while (placed < count && tries < count * 60) {
        tries++; const x = Math.floor(rnd() * this.w), y = Math.floor(rnd() * this.h);
        if (this.get('objects', x, y) !== ' ' || (layer === 'above' && this.get('above', x, y) !== ' ')) continue;
        const g = this.get('ground', x, y);
        if (opts.on ? opts.on.indexOf(g) < 0 : !G.tiles.passable(g)) continue;
        if (opts.avoid && opts.avoid.some((r) => x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h)) continue;
        this.set(layer, x, y, ch); placed++;
      } return this;
    }
    // Building facade: top (h-1) rows roof, bottom row wall with a door. Returns the door tile {x,y}; entrance tile is {x, y+1}.
    // opts: {roof:'1', wall:'X', doorAt: offsetFromLeft, windows:true}
    house(x, y, w, h, opts) {
      opts = opts || {}; const roof = opts.roof || '3', wall = opts.wall || 'X';
      const doorAt = opts.doorAt == null ? Math.floor(w / 2) : opts.doorAt;
      for (let j = 0; j < h - 1; j++) for (let i = 0; i < w; i++) this.set('objects', x + i, y + j, roof);
      for (let i = 0; i < w; i++) {
        let c = wall;
        if (wall === 'X' && opts.windows !== false && i % 2 === 0 && i !== doorAt && w >= 4) c = 'O';
        this.set('objects', x + i, y + h - 1, c);
      }
      this.set('objects', x + doorAt, y + h - 1, 'D');
      return { x: x + doorAt, y: y + h - 1 };
    }
    // Interior room: floor fill + wall ring. topWall rows of wall on top (default 2).
    room(x, y, w, h, opts) {
      opts = opts || {}; const floor = opts.floor || 'f', wall = opts.wall || 'W', tw = opts.topWall == null ? 2 : opts.topWall;
      this.rect('ground', x, y, w, h, floor);
      for (let j = 0; j < tw; j++) this.hline('objects', x, y + j, w, wall);
      this.vline('objects', x, y, h, wall); this.vline('objects', x + w - 1, y, h, wall); this.hline('objects', x, y + h - 1, w, wall);
      return this;
    }
    door(x, y) { this.set('objects', x, y, 'D'); return this; }
    ev(def) {
      const arr = Array.isArray(def) ? def : [def];
      for (const d of arr) {
        if (!d) continue;
        d.dir = d.dir || 'down'; d.trigger = d.trigger || 'action'; if (d.solid === undefined) d.solid = d.sprite ? true : false;
        d.w = d.w || 1; d.h = d.h || 1;
        this.events.push(d);
      } return this;
    }
    encounters(def) { this._enc = def; return this; }   // {steps:[min,max], troops:[{id:'wood_1', weight:3},...]}
    finish(extra) {
      const rows = (layer) => this.L[layer].map((r) => r.join(''));
      const def = Object.assign({
        id: this.id, name: this.opts.name || this.id, w: this.w, h: this.h, bgm: this.opts.bgm || null,
        spawn: this.opts.spawn || { x: 1, y: 1, dir: 'down' }, interior: !!this.opts.interior, tint: this.opts.tint || null,
        ground: rows('ground'), objects: rows('objects'), above: rows('above'),
        events: this.events, encounters: this._enc, onEnter: this.opts.onEnter || null,
      }, extra || {});
      maps.register(def); return def;
    }
  }
  maps.build = (id, w, h, opts) => new Builder(id, w, h, opts);

  // ------------------------------------------------------------------ validation / reachability (dev tool)
  maps.isPassable = function (def, x, y) {
    if (x < 0 || y < 0 || x >= def.w || y >= def.h) return false;
    return G.tiles.passable(def.ground[y][x]) && G.tiles.passable(def.objects[y][x]);
  };
  // returns array of warning strings. Flood-fills from spawn; every transfer/step event and every action-event neighbour must be reachable.
  maps.check = function (id) {
    const def = maps.get(id); const out = [];
    if (!def) return ['map not registered: ' + id];
    for (const layer of ['ground', 'objects', 'above']) {
      if (def[layer].length !== def.h) out.push(layer + ' rows != h');
      for (const r of def[layer]) { if (r.length !== def.w) { out.push(layer + ' row width != w'); break; } for (const ch of r) if (ch !== ' ' && !G.tiles.byChar[ch]) { out.push('unknown tile char "' + ch + '" in ' + layer); break; } }
    }
    const seen = new Set(), q = [[def.spawn.x, def.spawn.y]]; const key = (x, y) => x + ',' + y;
    const solidEv = {}; for (const e of def.events) if (e.solid) solidEv[key(e.x, e.y)] = true;
    if (!maps.isPassable(def, def.spawn.x, def.spawn.y)) out.push('spawn is not passable');
    seen.add(key(def.spawn.x, def.spawn.y));
    while (q.length) { const [x, y] = q.pop(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, k = key(nx, ny); if (seen.has(k)) continue; if (!maps.isPassable(def, nx, ny)) continue; if (solidEv[k]) continue; seen.add(k); q.push([nx, ny]); } }
    const ids = new Set();
    for (const e of def.events) {
      if (ids.has(e.id)) out.push('duplicate event id ' + e.id); ids.add(e.id);
      if (e.x < 0 || e.y < 0 || e.x >= def.w || e.y >= def.h) { out.push('event ' + e.id + ' out of bounds'); continue; }
      let ok = seen.has(key(e.x, e.y));
      if (!ok) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (seen.has(key(e.x + dx, e.y + dy))) ok = true;
      if (!ok && e.trigger !== 'auto') out.push('event ' + e.id + ' (' + e.x + ',' + e.y + ') is unreachable from spawn');
    }
    return out;
  };

  // ------------------------------------------------------------------ event helper factories
  // All return event defs (or arrays of defs) for use with builder.ev(...)
  const H = (maps.helpers = {});
  const say = (c, who, line, face) => c.say(who, line, face ? { face } : undefined);
  H.npc = function (id, x, y, sprite, lines, opts) {
    opts = opts || {};
    return {
      id, x, y, sprite, dir: opts.dir || 'down', trigger: 'action', move: opts.move || 'still', if: opts.if, name: opts.name || null, face: opts.face || null,
      run: async (c) => {
        const L = typeof lines === 'function' ? await lines(c) : lines;
        for (const ln of (L || [])) {
          if (typeof ln === 'string') await c.say(opts.name || null, ln, opts.face ? { face: opts.face, expr: opts.expr } : undefined);
          else await c.say(ln.who !== undefined ? ln.who : (opts.name || null), ln.text, { face: ln.face || opts.face, expr: ln.expr });
        }
        if (opts.after) await opts.after(c);
      },
    };
  };
  H.sign = (id, x, y, text) => ({ id, x, y, sprite: 'obj_sign', trigger: 'action', solid: true, run: async (c) => { await c.say(null, text); } });
  // item: itemId string  OR {gold:n}.  Flag used: 'chest_'+id  (so ids must be unique across the game — prefix with the map id)
  H.chest = function (id, x, y, item, n) {
    const fk = 'chest_' + id;
    const closed = {
      id, x, y, sprite: 'obj_chest', trigger: 'action', solid: true, if: () => !G.flag(fk),
      run: async (c) => {
        c.sfx('chest'); G.setFlag(fk, true);
        if (item && typeof item === 'object' && item.gold) { await c.gold(item.gold); await c.say(null, 'Found ' + item.gold + ' gold!'); }
        else { await c.addItem(item, n || 1); }
        G.map && G.map.refreshEvents && G.map.refreshEvents();
      },
    };
    const open = { id: id + '_open', x, y, sprite: 'obj_chest_open', trigger: 'action', solid: true, if: () => !!G.flag(fk), run: async (c) => { await c.say(null, 'The chest is empty.'); } };
    return [closed, open];
  };
  // invisible step trigger that moves the player to another map. toX/toY may be omitted to use the target map's spawn.
  H.transfer = (x, y, toMap, toX, toY, dir, opts) => {
    opts = opts || {};
    return { id: opts.id || ('tr_' + toMap + '_' + x + '_' + y), x, y, w: opts.w || 1, h: opts.h || 1, sprite: null, trigger: 'step', solid: false, if: opts.if,
      run: async (c) => { if (opts.sfx !== false) c.sfx('door'); await c.transfer(toMap, toX, toY, dir || 'down'); } };
  };
  // a Lantern Waypoint: heals the party and offers saving. Sprite 'obj_lamp'
  H.save = (id, x, y) => ({ id, x, y, sprite: 'obj_lamp', trigger: 'action', solid: true,
    run: async (c) => { await c.say(null, 'A Lantern Waypoint hums softly. Its warmth mends your wounds.'); await c.healAll(); c.sfx('save'); await c.saveMenu(); } });
  // landing beacon: boards the Marigold airship (only once the ship is repaired: flag 'marigold_ready')
  H.shipPad = (x, y, opts) => ({ id: (opts && opts.id) || 'ship_pad', x, y, sprite: 'obj_beacon', trigger: 'action', solid: true,
    run: async (c) => {
      if (!G.flag('marigold_ready')) { await c.say(null, 'A signal beacon for airships. There is nothing to signal yet.'); return; }
      const i = await c.choice(['Board the Marigold', 'Not yet'], { prompt: 'Signal the Marigold?' });
      if (i === 0) { c.sfx('door'); await c.transfer('marigold_deck'); }
    } });
  H.innkeeper = (id, x, y, sprite, price, name) => ({ id, x, y, sprite, trigger: 'action', solid: true,
    run: async (c) => {
      price = price == null ? 30 : price;
      await c.say(name || 'Innkeeper', 'Welcome, traveler! A warm bed for ' + price + ' gold. Interested?');
      const i = await c.choice(['Rest (' + price + 'G)', 'No thanks']);
      if (i !== 0) { await c.say(name || 'Innkeeper', 'Come back any time.'); return; }
      if (G.state.gold < price) { await c.say(name || 'Innkeeper', "Ah... you're a little short. Sorry!"); return; }
      await c.gold(-price); await c.fade('out', 40); c.sfx('heal'); await c.healAll(); await c.wait(40);
      await c.fade('in', 40); await c.say(name || 'Innkeeper', 'Sleep well? You look much better!');
      await c.afterRest();     // romance.js: may trigger a campfire/bond conversation
    } });
  H.shop = (id, x, y, sprite, shopId, greeting, name) => ({ id, x, y, sprite, trigger: 'action', solid: true,
    run: async (c) => { await c.say(name || 'Merchant', greeting || 'Take a look at my wares!'); await c.shop(shopId); } });
  // invisible rectangle step trigger. opts: {once:true, if, w, h}
  H.trigger = (id, x, y, run, opts) => {
    opts = opts || {}; const fk = 'trig_' + id;
    return { id, x, y, w: opts.w || 1, h: opts.h || 1, sprite: null, trigger: opts.trigger || 'step', solid: false,
      if: () => (opts.once ? !G.flag(fk) : true) && (opts.if ? opts.if() : true),
      run: async (c) => { if (opts.once) G.setFlag(fk, true); await run(c); } };
  };
  // runs automatically as soon as the map is entered (if its `if` passes). Use for cutscenes. opts: {once:true, if}
  H.auto = (id, run, opts) => { opts = opts || {}; const fk = 'auto_' + id;
    return { id, x: 0, y: 0, sprite: null, trigger: 'auto', solid: false,
      if: () => (opts.once === false ? true : !G.flag(fk)) && (opts.if ? opts.if() : true),
      run: async (c) => { if (opts.once !== false) G.setFlag(fk, true); await run(c); } }; };
  G.provide('mapbuilder');
})();
