/* =====================================================================
 * LANTERNBOUND — gfx_world.js  (owner: gfx-world)
 * Procedural world art: 32x32 tiles, 96x128 character sheets, object
 * sprites, emote bubbles and glow. Everything is cached; nothing is
 * regenerated per frame. Deterministic via G.util.rng.
 * ===================================================================== */
(function () {
  'use strict';
  const G = (window.G = window.G || {});
  G.gfx = G.gfx || {};
  const T = 32;

  // ------------------------------------------------------------------ helpers
  function mk(w, h) { return G.util.canvas(w, h); }
  function px(c, x, y, col) { c.fillStyle = col; c.fillRect(x | 0, y | 0, 1, 1); }
  function rect(c, x, y, w, h, col) { c.fillStyle = col; c.fillRect(x | 0, y | 0, w | 0, h | 0); }
  function rnd(seed) { return G.util.rng(seed); }
  // deterministic hex colour helpers
  function hex2rgb(h) { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map((x) => x + x).join(''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; }
  function rgb2hex(r, g, b) { const f = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0'); return '#' + f(r) + f(g) + f(b); }
  function shade(h, k) { const [r, g, b] = hex2rgb(h); if (k >= 0) return rgb2hex(r + (255 - r) * k, g + (255 - g) * k, b + (255 - b) * k); return rgb2hex(r * (1 + k), g * (1 + k), b * (1 + k)); }
  function mix(a, b, t) { const A = hex2rgb(a), B = hex2rgb(b); return rgb2hex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t); }
  // dither/speckle n random pixels of colour col inside a box
  function speckle(c, r, x0, y0, w, h, col, n) { c.fillStyle = col; for (let i = 0; i < n; i++) c.fillRect(x0 + Math.floor(r() * w), y0 + Math.floor(r() * h), 1, 1); }
  // checker/dither overlay for smooth gradients
  function dither(c, r, x0, y0, w, h, col, density) { c.fillStyle = col; for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) if (((x + y) & 1) === 0 && r() < density) c.fillRect(x, y, 1, 1); }
  // vertical gradient bands
  function vgrad(c, x, y, w, h, stops) { const g = c.createLinearGradient(0, y, 0, y + h); stops.forEach((s) => g.addColorStop(s[0], s[1])); c.fillStyle = g; c.fillRect(x, y, w, h); }
  // 1px outline around opaque pixels of a source canvas (returns new canvas)
  function outlined(src, col) {
    const w = src.width, h = src.height, o = mk(w, h), c = o.getContext('2d');
    const sd = src.getContext('2d').getImageData(0, 0, w, h).data;
    const od = c.createImageData(w, h); const d = od.data;
    const hasA = (x, y) => x >= 0 && y >= 0 && x < w && y < h && sd[(y * w + x) * 4 + 3] > 0;
    const [r, g, b] = hex2rgb(col);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (sd[i + 3] > 0) continue;
      if (hasA(x - 1, y) || hasA(x + 1, y) || hasA(x, y - 1) || hasA(x, y + 1)) { d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 255; }
    }
    c.putImageData(od, 0, 0); c.drawImage(src, 0, 0); return o;
  }
  // soft glow composite onto a canvas (additive)
  function addGlow(c, x, y, rad, col, a) {
    c.save(); c.globalCompositeOperation = 'lighter';
    const g = c.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.globalAlpha = a; c.fillStyle = g; c.fillRect(x - rad, y - rad, rad * 2, rad * 2); c.restore();
  }

  // ------------------------------------------------------------------ palette (VX-Ace leaning)
  const P_ = {
    grass: ['#5fa84a', '#6fb856', '#4f9a3e'], grassDk: '#3f7f35', grassLt: '#9ad46e',
    moss: ['#4d6b33', '#5a7a3a', '#3e5a2a'], mossDk: '#2f4520',
    dirt: ['#a07a4c', '#b28b5c', '#8a6640'], dirtDk: '#6b4c2e',
    cobble: ['#8d8c92', '#a3a2a8', '#777680'], mortar: '#5b5a62',
    sand: ['#e3cc96', '#eed9a6', '#d4bb84'],
    water: ['#3b7fd0', '#4b92e0', '#2f6cb8'], waterLt: '#9fd6ff', waterDk: '#1f4f94',
    shallow: ['#5a9fb0', '#6cb4bf'],
    woodFloor: ['#b07a46', '#a06c3c', '#c08854'], woodDk: '#6e4524',
    stone: ['#9b9aa3', '#88878f', '#aeadb5'],
    iron: ['#4a4f5c', '#5d6474', '#353a45'], brass: ['#c79a3b', '#e0b657', '#8e6a25'], brassLt: '#ffe39a',
    carpet: ['#9c2430', '#b02d39', '#7f1a24'], gold: '#e7b84f',
    cave: ['#3c3a4a', '#4a4860', '#2c2b3a'],
    hollow: ['#2a1f3a', '#352848', '#1d1528'], violet: '#8a5cff', violetLt: '#c7a8ff',
    arena: ['#d9b77a', '#e6c68f', '#c7a46b'],
    marble: ['#efe6d2', '#f6efdf', '#e0d4bb'], veinGold: '#c9a25a',
    ash: ['#6b6a70', '#7b7a80', '#58575d'],
    deck: ['#7a5232', '#8a5d3a', '#6a4528'],
    outline: '#2b2a33', ink: '#1a1822',
  };

  // ------------------------------------------------------------------ ground tiles
  // Each painter: (c, r, v) where c is 32x32 ctx, r = rng, v = variant int
  const PAINT = {};

  PAINT.grass = function (c, r) {
    rect(c, 0, 0, T, T, P_.grass[0]);
    dither(c, r, 0, 0, T, T, P_.grass[2], 0.35);
    speckle(c, r, 0, 0, T, T, P_.grass[1], 70);
    speckle(c, r, 0, 0, T, T, P_.grassLt, 14);
    speckle(c, r, 0, 0, T, T, P_.grassDk, 18);
    // little blade ticks
    for (let i = 0; i < 9; i++) { const x = Math.floor(r() * 30) + 1, y = Math.floor(r() * 30) + 1; px(c, x, y, P_.grassDk); px(c, x, y - 1, P_.grassLt); }
  };
  PAINT.grass_flower = function (c, r) {
    PAINT.grass(c, r);
    const cols = ['#fff6c8', '#ffe066', '#ffffff', '#ffb3c6'];
    for (let i = 0; i < 6; i++) {
      const x = 3 + Math.floor(r() * 26), y = 3 + Math.floor(r() * 26), col = cols[Math.floor(r() * cols.length)];
      px(c, x, y, col); px(c, x + 1, y, '#e0a030'); px(c, x, y + 1, '#3f7f35'); px(c, x - 1, y, col); px(c, x, y - 1, col);
    }
  };
  PAINT.moss = function (c, r) {
    rect(c, 0, 0, T, T, P_.moss[0]);
    dither(c, r, 0, 0, T, T, P_.moss[2], 0.5);
    speckle(c, r, 0, 0, T, T, P_.moss[1], 60);
    speckle(c, r, 0, 0, T, T, P_.mossDk, 40);
    // ivy wisps
    for (let i = 0; i < 4; i++) { const x = Math.floor(r() * 28), y = Math.floor(r() * 28); rect(c, x, y, 3, 1, '#6e9440'); px(c, x + 1, y + 1, '#6e9440'); }
  };
  PAINT.dirt = function (c, r) {
    rect(c, 0, 0, T, T, P_.dirt[0]);
    dither(c, r, 0, 0, T, T, P_.dirt[2], 0.4);
    speckle(c, r, 0, 0, T, T, P_.dirt[1], 60);
    speckle(c, r, 0, 0, T, T, P_.dirtDk, 30);
    for (let i = 0; i < 3; i++) { const x = Math.floor(r() * 26), y = Math.floor(r() * 30); rect(c, x, y, 2, 1, P_.dirtDk); }
  };
  PAINT.cobble = function (c, r) {
    rect(c, 0, 0, T, T, P_.mortar);
    // staggered stones 16x8 rows
    for (let row = 0; row < 4; row++) {
      const y = row * 8, off = row % 2 ? 8 : 0;
      for (let k = -1; k < 3; k++) {
        const x = k * 16 + off, base = P_.cobble[Math.floor(r() * 3)];
        const x0 = Math.max(0, x + 1), x1 = Math.min(T, x + 15);
        if (x1 <= x0) continue;
        rect(c, x0, y + 1, x1 - x0, 6, base);
        rect(c, x0, y + 1, x1 - x0, 1, shade(base, 0.22));
        rect(c, x0, y + 6, x1 - x0, 1, shade(base, -0.25));
        speckle(c, r, x0, y + 1, x1 - x0, 6, shade(base, -0.12), 6);
      }
    }
  };
  PAINT.lantern_path = function (c, r) {
    PAINT.cobble(c, r);
    // warm golden glow patches
    const g = c.createRadialGradient(16, 16, 2, 16, 16, 22);
    g.addColorStop(0, 'rgba(255,214,110,0.55)'); g.addColorStop(1, 'rgba(255,214,110,0)');
    c.fillStyle = g; c.fillRect(0, 0, T, T);
    speckle(c, r, 0, 0, T, T, '#ffe9a0', 10);
  };
  PAINT.sand = function (c, r) {
    rect(c, 0, 0, T, T, P_.sand[0]);
    dither(c, r, 0, 0, T, T, P_.sand[2], 0.3);
    speckle(c, r, 0, 0, T, T, P_.sand[1], 60);
    speckle(c, r, 0, 0, T, T, '#c9ae78', 20);
  };
  PAINT.arena_sand = function (c, r) {
    rect(c, 0, 0, T, T, P_.arena[0]);
    dither(c, r, 0, 0, T, T, P_.arena[2], 0.3);
    speckle(c, r, 0, 0, T, T, P_.arena[1], 50);
    speckle(c, r, 0, 0, T, T, '#b9965c', 18);
    // arc scuffs
    for (let i = 0; i < 2; i++) { const y = 6 + i * 16; rect(c, 4 + i * 4, y, 22, 1, shade(P_.arena[2], -0.1)); }
  };
  PAINT.ash = function (c, r) {
    rect(c, 0, 0, T, T, P_.ash[0]);
    dither(c, r, 0, 0, T, T, P_.ash[2], 0.45);
    speckle(c, r, 0, 0, T, T, P_.ash[1], 70);
    speckle(c, r, 0, 0, T, T, '#4a4950', 25);
    speckle(c, r, 0, 0, T, T, '#8f8e96', 10);
  };
  PAINT.water = function (c, r, frame) { return paintWater(c, frame, 0, false); };
  PAINT.shallows = function (c, r, frame) { return paintWater(c, frame, 1, true); };

  // animated water: 4 frames built from the same base noise with shifted ripple bands
  function paintWater(c, frame, kind, shallow) {
    const base = shallow ? P_.shallow : P_.water;
    const rr = rnd(9001 + kind * 77);
    rect(c, 0, 0, T, T, base[0]);
    dither(c, rr, 0, 0, T, T, base[2], 0.45);
    speckle(c, rr, 0, 0, T, T, base[1], 50);
    // travelling ripple lines; each frame shifts by 8px
    const shift = (frame | 0) * 8;
    for (let i = 0; i < 3; i++) {
      const y = (6 + i * 10 + (rr() * 3 | 0)) % T;
      for (let x = 0; x < 9; x++) {
        const xx = (x * 4 + shift + i * 7) % T;
        px(c, xx, y, P_.waterLt); px(c, (xx + 1) % T, y, shallow ? '#c9ecf0' : '#7fc2f5');
      }
    }
    if (shallow) {
      // reeds in the marsh
      for (let i = 0; i < 3; i++) { const x = 4 + i * 9 + (frame % 2); const h = 6 + (i % 2) * 3; rect(c, x, 32 - h, 1, h, '#3d6b3a'); px(c, x - 1, 32 - h + 1, '#4c8a46'); }
    }
    // darker edge fringe for depth
    rect(c, 0, T - 1, T, 1, shade(base[2], -0.15));
  }
  // paint animated tiles
  function paintAnimated(name, frame) {
    const c = mk(T, T).getContext('2d'); PAINT[name](c, rnd(11), frame); return c.canvas;
  }
  G.gfx._paintAnimatedFrame = paintAnimated;

  PAINT.wood_floor = function (c, r) {
    // horizontal planks of 8px height with offset joins and grain
    for (let row = 0; row < 4; row++) {
      const y = row * 8, col = P_.woodFloor[row % 3];
      rect(c, 0, y, T, 8, col);
      const jx = (row * 11 + 5) % 24 + 3;
      rect(c, jx, y, 1, 8, shade(col, -0.35));
      rect(c, 0, y + 7, T, 1, shade(col, -0.3));
      rect(c, 0, y, T, 1, shade(col, 0.15));
      for (let k = 0; k < 3; k++) { const gx = Math.floor(r() * 26), gy = y + 2 + Math.floor(r() * 4); rect(c, gx, gy, 3 + (r() * 3 | 0), 1, shade(col, -0.18)); }
      speckle(c, r, 0, y, T, 8, shade(col, 0.1), 3);
    }
  };
  PAINT.stone_floor = function (c, r) {
    rect(c, 0, 0, T, T, P_.stone[0]);
    // 16x16 flagstones with dark seams
    for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) {
      const x = i * 16, y = j * 16, base = P_.stone[(i + j * 2) % 3];
      rect(c, x, y, 16, 16, base); rect(c, x, y, 16, 1, shade(base, 0.2));
      rect(c, x + 15, y, 1, 16, shade(base, -0.3)); rect(c, x, y + 15, 16, 1, shade(base, -0.3));
      speckle(c, r, x + 1, y + 1, 14, 14, shade(base, -0.12), 12);
    }
  };
  PAINT.metal_grate = function (c, r) {
    rect(c, 0, 0, T, T, P_.iron[2]);
    for (let y = 0; y < T; y += 4) rect(c, 0, y, T, 1, P_.iron[1]);
    for (let x = 0; x < T; x += 4) rect(c, x, 0, 1, T, '#2b2f38');
    // brass rivets at corners of each 8px grid cell
    for (let y = 2; y < T; y += 8) for (let x = 2; x < T; x += 8) { px(c, x, y, P_.brassLt); px(c, x + 1, y, P_.brass[0]); px(c, x, y + 1, P_.brass[2]); }
    speckle(c, r, 0, 0, T, T, '#6b7184', 20);
  };
  PAINT.carpet = function (c, r) {
    rect(c, 0, 0, T, T, P_.carpet[0]);
    dither(c, r, 0, 0, T, T, P_.carpet[2], 0.25);
    // gold border on the edges, diamond pattern centre
    rect(c, 0, 0, T, 2, P_.gold); rect(c, 0, T - 2, T, 2, P_.gold);
    rect(c, 0, 0, 2, T, P_.gold); rect(c, T - 2, 0, 2, T, P_.gold);
    rect(c, 2, 2, T - 4, 1, shade(P_.gold, -0.3));
    for (let i = 0; i < 4; i++) px(c, 16, 6 + i * 1, P_.carpet[1]);
    for (let k = 0; k < 4; k++) { const y = 10 + k * 3; for (let x = 0; x < 3 - Math.abs(k - 1); x++) px(c, 14 + x, y, '#d05060'); }
  };
  PAINT.cave_floor = function (c, r) {
    rect(c, 0, 0, T, T, P_.cave[0]);
    dither(c, r, 0, 0, T, T, P_.cave[2], 0.4);
    // rocky chips
    for (let i = 0; i < 9; i++) { const x = Math.floor(r() * 28), y = Math.floor(r() * 28), w = 2 + (r() * 3 | 0); rect(c, x, y, w, 2, P_.cave[1]); rect(c, x, y + 2, w, 1, P_.cave[2]); }
    speckle(c, r, 0, 0, T, T, '#55526a', 20);
  };
  PAINT.bridge = function (c, r) {
    rect(c, 0, 0, T, T, '#2a1e14');
    for (let y = 0; y < T; y += 6) {
      const col = P_.woodFloor[(y / 6) % 3 | 0];
      rect(c, 0, y + 1, T, 5, col); rect(c, 0, y + 1, T, 1, shade(col, 0.2)); rect(c, 0, y + 5, T, 1, shade(col, -0.35));
      speckle(c, r, 0, y + 1, T, 5, shade(col, -0.15), 4);
    }
    rect(c, 0, 0, 2, T, '#4a3220'); rect(c, T - 2, 0, 2, T, '#4a3220');
  };
  PAINT.hollow_ground = function (c, r) {
    rect(c, 0, 0, T, T, P_.hollow[0]);
    dither(c, r, 0, 0, T, T, P_.hollow[1], 0.35);
    speckle(c, r, 0, 0, T, T, P_.hollow[2], 40);
    // violet crack lines
    for (let i = 0; i < 2; i++) {
      let x = Math.floor(r() * 8), y = 0;
      while (y < T) { px(c, x, y, P_.violet); px(c, x + 1, y, '#5a3ca8'); y++; x += (r() < 0.5 ? 1 : 0); if (x >= T) break; }
    }
    speckle(c, r, 0, 0, T, T, P_.violetLt, 4);
  };
  PAINT.marble = function (c, r) {
    rect(c, 0, 0, T, T, P_.marble[0]);
    dither(c, r, 0, 0, T, T, P_.marble[2], 0.25);
    // faint gold veins
    for (let i = 0; i < 2; i++) { let x = Math.floor(r() * T), y = 0; while (y < T) { px(c, x, y, shade(P_.veinGold, 0.1)); y++; x += (r() < 0.4 ? 1 : (r() < 0.2 ? -1 : 0)); x = Math.max(0, Math.min(T - 1, x)); } }
    // tile seams 16px
    rect(c, 0, 15, T, 1, P_.marble[2]); rect(c, 15, 0, 1, T, P_.marble[2]);
  };
  PAINT.deck = function (c, r) {
    for (let row = 0; row < 4; row++) {
      const y = row * 8, col = P_.deck[row % 3];
      rect(c, 0, y, T, 8, col); rect(c, 0, y + 7, T, 1, shade(col, -0.35)); rect(c, 0, y, T, 1, shade(col, 0.1));
      const jx = (row * 13 + 9) % 24 + 4; rect(c, jx, y, 1, 8, shade(col, -0.3));
      for (let k = 0; k < 2; k++) { const gx = Math.floor(r() * 24), gy = y + 2 + (r() * 3 | 0); rect(c, gx, gy, 4, 1, shade(col, -0.2)); }
      // brass nails
      px(c, 3, y + 3, P_.brassLt); px(c, 3 + 0, y + 4, P_.brass[2]);
      px(c, 27, y + 3, P_.brassLt); px(c, 27, y + 4, P_.brass[2]);
    }
  };
  PAINT.void = function (c) { rect(c, 0, 0, T, T, '#05040a'); };
  // ------------------------------------------------------------------ roofs (shingles, period 8 so blocks tile)
  // palette per roof: base, light, dark, moss-tint
  const ROOFS = {
    roof_green: { b: '#5b8a3a', l: '#7fb057', d: '#33531f', m: '#3f6a2a' },
    roof_yellow: { b: '#c9a64a', l: '#e6c76a', d: '#8a6a25', m: '#7d8a3a' },
    roof_brown: { b: '#7b4f2c', l: '#9a6a3f', d: '#4a2c17', m: '#4b5e2a' },
    roof_blue: { b: '#4d6a95', l: '#6d8cb8', d: '#2c3f5e', m: '#3b5a48' },
    roof_red: { b: '#b4533a', l: '#d27a5c', d: '#722d1f', m: '#4f6a2e' },
    roof_copper: { b: '#3f8f80', l: '#6cc0ac', d: '#24564e', m: '#5a7a3a' },
  };
  function paintRoof(c, r, key) {
    const R = ROOFS[key];
    rect(c, 0, 0, T, T, R.d);
    // shingle rows, 8px tall, 8px wide shingles, alternate row offset 4
    for (let row = 0; row < 4; row++) {
      const y = row * 8, off = (row % 2) * 4;
      for (let k = -1; k < 5; k++) {
        const x = k * 8 + off;
        const x0 = Math.max(0, x), x1 = Math.min(T, x + 8);
        if (x1 <= x0) continue;
        const tone = r() < 0.5 ? R.b : shade(R.b, (r() - 0.5) * 0.12);
        rect(c, x0, y, x1 - x0, 7, tone);
        rect(c, x0, y, x1 - x0, 1, R.l);               // top highlight
        rect(c, x0, y + 6, x1 - x0, 1, R.d);            // scalloped bottom edge
        if (x1 - x0 >= 3) px(c, x0 + 1, y + 6, shade(R.d, -0.2));
        // seam between shingles
        if (x0 >= 0 && x0 < T) px(c, x0, y + 1, R.d);
        // moss tint dither on some shingles (Wickholm reclaimed look)
        if (key !== 'roof_copper' && r() < 0.28) { dither(c, r, x0, y + 2, x1 - x0, 4, R.m, 0.6); }
      }
    }
    // gentle sun-bleach gradient down the tile
    dither(c, r, 0, 0, T, T, R.l, 0.05);
    if (key === 'roof_copper') {
      // brass rivets + gauge hint
      for (let y = 4; y < T; y += 8) for (let x = 3; x < T; x += 16) { px(c, x, y, P_.brassLt); px(c, x, y + 1, P_.brass[2]); }
    }
  }

  // ------------------------------------------------------------------ walls
  function paintStoneWall(c, r) {
    rect(c, 0, 0, T, T, P_.mortar);
    for (let row = 0; row < 4; row++) {
      const y = row * 8, off = (row % 2) * 8;
      for (let k = -1; k < 3; k++) {
        const x = k * 16 + off, base = P_.stone[Math.floor(r() * 3)];
        const x0 = Math.max(0, x + 1), x1 = Math.min(T, x + 15);
        if (x1 <= x0) continue;
        rect(c, x0, y + 1, x1 - x0, 6, base);
        rect(c, x0, y + 1, x1 - x0, 1, shade(base, 0.25));
        rect(c, x0, y + 6, x1 - x0, 1, shade(base, -0.28));
        speckle(c, r, x0, y + 1, x1 - x0, 6, shade(base, -0.1), 4);
      }
    }
    // moss stains near the base of the wall
    for (let i = 0; i < 6; i++) { const x = Math.floor(r() * 30), y = 26 + Math.floor(r() * 6); px(c, x, y, P_.moss[1]); px(c, x + 1, y, P_.moss[0]); }
  }
  function paintWoodWall(c, r) {
    rect(c, 0, 0, T, T, '#6b4424');
    for (let x = 0; x < T; x += 8) {
      const col = P_.woodFloor[(x / 8) % 3 | 0];
      rect(c, x, 0, 8, T, col);
      rect(c, x, 0, 1, T, shade(col, -0.35));
      rect(c, x + 1, 0, 1, T, shade(col, 0.12));
      speckle(c, r, x + 2, 0, 5, T, shade(col, -0.18), 6);
      px(c, x + 4, 4, '#3a2412'); px(c, x + 4, 27, '#3a2412');    // nails
    }
    rect(c, 0, T - 3, T, 3, '#4a2d18');                              // base sill
  }
  function windowGlow(c, x, y, w, h) {
    rect(c, x - 1, y - 1, w + 2, h + 2, '#3a2412');
    rect(c, x, y, w, h, '#ffcf6a');
    vgrad(c, x, y, w, h, [[0, '#fff1b8'], [1, '#f5a84a']]);
    rect(c, x + (w >> 1), y, 1, h, '#5a3a1c'); rect(c, x, y + (h >> 1), w, 1, '#5a3a1c');
    px(c, x + 1, y + 1, '#ffffff');
    addGlow(c, x + w / 2, y + h / 2, 14, 'rgba(255,205,110,0.5)', 1);
  }
  function paintMetalWall(c, r) {
    rect(c, 0, 0, T, T, P_.iron[0]);
    rect(c, 0, 0, T, 3, P_.brass[0]); rect(c, 0, 0, T, 1, P_.brassLt);     // brass trim top
    rect(c, 0, T - 3, T, 3, P_.brass[2]);                                  // brass trim base
    for (let y = 4; y < T - 4; y += 10) {
      rect(c, 0, y, T, 1, P_.iron[2]);
      for (let x = 2; x < T; x += 8) { px(c, x, y + 2, P_.brassLt); px(c, x, y + 3, P_.brass[1]); }
    }
    speckle(c, r, 0, 4, T, T - 8, '#6b7184', 18);
    speckle(c, r, 0, 4, T, T - 8, '#2a2d36', 14);
  }
  function paintCaveWall(c, r) {
    rect(c, 0, 0, T, T, P_.cave[2]);
    for (let i = 0; i < 9; i++) { const x = Math.floor(r() * 26), y = Math.floor(r() * 26), w = 4 + (r() * 5 | 0); rect(c, x, y, w, 4, P_.cave[0]); rect(c, x, y, w, 1, P_.cave[1]); }
    speckle(c, r, 0, 0, T, T, '#55526a', 20);
    speckle(c, r, 0, 0, T, T, '#1a1822', 30);
  }
  function paintMarbleWall(c, r) {
    rect(c, 0, 0, T, T, P_.marble[2]);
    rect(c, 0, 0, T, 26, P_.marble[0]);
    dither(c, r, 0, 0, T, 26, P_.marble[1], 0.3);
    rect(c, 0, 24, T, 2, P_.veinGold);                                     // gold trim band
    rect(c, 0, 26, T, 1, shade(P_.veinGold, -0.3));
    rect(c, 0, 0, T, 1, shade(P_.marble[0], 0.3));
    for (let x = 0; x < T; x += 16) rect(c, x, 0, 1, 24, P_.marble[2]);   // block joints
  }
  function paintArenaWall(c, r) {
    rect(c, 0, 0, T, T, P_.arena[2]);
    rect(c, 0, 0, T, 2, shade(P_.arena[0], 0.2));
    // arched niche
    rect(c, 8, 8, 16, 24, '#6c4f2e');
    for (let y = 0; y < 8; y++) { const w = 16 - Math.round(Math.sqrt(Math.max(0, 64 - (y - 8) * (y - 8)))); }
    for (let i = 0; i < 8; i++) { const hw = Math.round(Math.sqrt(Math.max(0, 64 - (8 - i) * (8 - i)))); rect(c, 16 - hw, 8 + i, hw * 2, 1, '#6c4f2e'); }
    rect(c, 8, 8, 2, 24, shade(P_.arena[0], 0.1)); rect(c, 22, 8, 2, 24, shade(P_.arena[2], -0.2));
    speckle(c, r, 0, 0, T, T, P_.arena[1], 30); speckle(c, r, 0, 0, T, T, '#a9854e', 25);
  }
  function paintDoor(c, r) {
    paintStoneWall(c, r);
    // door frame
    rect(c, 5, 6, 22, 26, '#3a2a20');
    rect(c, 7, 8, 18, 24, '#7a4f2c');
    for (let x = 8; x < 25; x += 4) rect(c, x, 8, 1, 24, '#5e3a1e');
    rect(c, 7, 8, 18, 1, '#9a6a3f');
    rect(c, 15, 8, 2, 24, '#4a2c17');
    px(c, 12, 19, P_.brassLt); px(c, 12, 20, P_.brass[2]); px(c, 19, 19, P_.brassLt); px(c, 19, 20, P_.brass[2]);
    // bottom threshold
    rect(c, 6, 31, 20, 1, '#2a1a10');
  }
  function paintFence(c, r) {
    // transparent background; pickets + two rails
    rect(c, 0, 12, T, 2, '#8a5c34'); rect(c, 0, 20, T, 2, '#8a5c34');
    rect(c, 0, 12, T, 1, '#b8844f'); rect(c, 0, 20, T, 1, '#b8844f');
    for (let x = 1; x < T; x += 8) {
      rect(c, x, 6, 5, 22, '#9e6d3e'); rect(c, x, 6, 5, 1, '#c59160'); rect(c, x, 6, 1, 22, '#c59160');
      rect(c, x + 4, 6, 1, 22, '#5a3a1e'); px(c, x + 2, 9, '#5a3a1e');
      rect(c, x, 27, 5, 1, '#5a3a1e');
    }
  }

  // ------------------------------------------------------------------ nature
  function leafy(c, r, cx, cy, rx, ry, base, opts) {
    opts = opts || {};
    for (let y = Math.floor(cy - ry - 1); y <= cy + ry + 1; y++) for (let x = Math.floor(cx - rx - 1); x <= cx + rx + 1; x++) {
      const dx = (x - cx) / rx, dy = (y - cy) / ry, d = dx * dx + dy * dy;
      if (d > 1) continue;
      let col = base;
      if (dy < -0.25 && dx < 0.2) col = shade(base, 0.18);            // lit upper-left
      if (dy > 0.45) col = shade(base, -0.22);                         // shadowed underside
      if (d > 0.82) col = shade(base, -0.12);                          // rim darker
      if (r() < 0.14) col = (r() < 0.5 ? shade(col, 0.22) : shade(col, -0.18));  // leaf speckle
      px(c, x, y, col);
    }
  }
  function paintTree(c, r) {
    // trunk
    rect(c, 14, 20, 4, 11, '#6b4424'); rect(c, 14, 20, 1, 11, '#8a5c34'); rect(c, 17, 22, 1, 9, '#4a2c17');
    px(c, 15, 26, '#4a2c17');
    leafy(c, r, 16, 12, 13, 11, '#4f9a3e');
    // leafy highlights
    for (let i = 0; i < 10; i++) { const x = 6 + Math.floor(r() * 16), y = 4 + Math.floor(r() * 10); px(c, x, y, '#8fd060'); }
  }
  function paintPine(c, r) {
    rect(c, 14, 24, 4, 7, '#5a3a20');
    for (let i = 0; i < 4; i++) {
      const y = 22 - i * 5, hw = 4 + i * 2.6;
      for (let yy = y - 5; yy < y + 1; yy++) {
        const t = (yy - (y - 5)) / 6, w = Math.round(hw * (0.45 + 0.55 * t));
        for (let x = 16 - w; x < 16 + w; x++) px(c, x, yy, (x > 16 ? shade('#2f6b3a', -0.1) : '#2f6b3a'));
        px(c, 16 - w, yy, '#1f4a28');
      }
    }
    for (let i = 0; i < 6; i++) px(c, 10 + Math.floor(r() * 12), 6 + Math.floor(r() * 16), '#4f8f52');
  }
  function paintDeadTree(c, r) {
    const col = '#8e8a84', dk = '#55514d';
    rect(c, 14, 14, 4, 17, col); rect(c, 17, 14, 1, 17, dk);
    rect(c, 10, 12, 1, 6, col); px(c, 9, 11, col); px(c, 8, 10, col);
    rect(c, 18, 9, 1, 8, col); px(c, 19, 8, col); px(c, 21, 6, col); rect(c, 20, 7, 1, 2, col);
    rect(c, 13, 18, 3, 1, dk); rect(c, 15, 24, 4, 1, dk);
  }
  function paintBush(c, r) {
    leafy(c, r, 16, 19, 12, 8, '#5b9440');
    for (let i = 0; i < 8; i++) { const x = 6 + Math.floor(r() * 20), y = 13 + Math.floor(r() * 9); px(c, x, y, '#86c25a'); }
    rect(c, 6, 25, 20, 2, shade('#5b9440', -0.35));
  }
  function paintRock(c, r) {
    // grey boulder
    for (let y = 8; y < 28; y++) for (let x = 5; x < 27; x++) {
      const dx = (x - 16) / 11, dy = (y - 18) / 9; if (dx * dx + dy * dy > 1) continue;
      let col = '#8b8a92'; if (dy < -0.3 && dx < 0) col = '#b2b1ba'; if (dy > 0.4) col = '#5c5b64';
      px(c, x, y, col);
    }
    speckle(c, r, 6, 10, 20, 16, '#6e6d76', 14);
    rect(c, 9, 12, 4, 1, '#c8c7cf');
  }
  function paintFlowers(c, r) {
    const cols = ['#ff6f8e', '#ffd34d', '#ffffff', '#b58cff', '#ff9f4a'];
    for (let i = 0; i < 9; i++) {
      const x = 3 + Math.floor(r() * 26), y = 4 + Math.floor(r() * 24), col = cols[Math.floor(r() * cols.length)];
      rect(c, x, y + 1, 1, 3, '#3f7f35'); px(c, x - 1, y + 2, '#4f9a3e');
      px(c, x, y, col); px(c, x - 1, y, col); px(c, x + 1, y, col); px(c, x, y - 1, col);
      px(c, x, y, '#fff3a0');
    }
  }
  function paintTallgrass(c, r) {
    for (let i = 0; i < 7; i++) {
      const x = 4 + Math.floor(r() * 24), h = 8 + Math.floor(r() * 10), lean = (r() < 0.5 ? -1 : 1);
      for (let k = 0; k < h; k++) px(c, x + Math.round(lean * k * 0.15), 30 - k, k > h - 4 ? '#9ad46e' : (k > h / 2 ? '#5fa84a' : '#3f7f35'));
    }
  }
  function paintGravestone(c, r) {
    rect(c, 8, 10, 16, 18, '#9d9ca6'); rect(c, 8, 10, 16, 1, '#c8c7cf');
    rect(c, 10, 6, 12, 5, '#9d9ca6'); px(c, 11, 5, '#c8c7cf'); px(c, 21, 5, '#c8c7cf');
    rect(c, 8, 26, 16, 2, '#5f5e66'); rect(c, 23, 10, 1, 18, '#6e6d76');
    speckle(c, r, 9, 11, 14, 16, '#7d7c86', 14);
    rect(c, 15, 13, 2, 7, '#5f5e66'); rect(c, 12, 16, 8, 2, '#5f5e66');
    // moss creeping at base
    for (let x = 8; x < 24; x += 2) px(c, x, 27, P_.moss[1]);
  }
  function paintRubble(c, r) {
    for (let i = 0; i < 9; i++) {
      const x = 3 + Math.floor(r() * 24), y = 14 + Math.floor(r() * 14), w = 3 + (r() * 4 | 0), h = 2 + (r() * 3 | 0);
      const col = P_.stone[Math.floor(r() * 3)]; rect(c, x, y, w, h, col); rect(c, x, y, w, 1, shade(col, 0.25)); rect(c, x, y + h - 1, w, 1, shade(col, -0.3));
    }
  }
  function paintCrystal(c, r) {
    const shards = [[12, 4, 5, 22, '#7fa8ff'], [17, 8, 4, 18, '#9a7bff'], [8, 12, 3, 14, '#6fd0ff'], [21, 14, 3, 12, '#b48cff']];
    for (const [cx, top, w, h, col] of shards) {
      for (let y = top; y < top + h; y++) {
        const hw = Math.max(1, Math.round(w / 2 * (1 - Math.abs((y - top) / h - 0.4) * 0.8)));
        for (let x = cx - hw; x <= cx + hw; x++) px(c, x, y, x < cx ? shade(col, 0.2) : shade(col, -0.2));
      }
      px(c, cx, top + 2, '#ffffff');
    }
    addGlow(c, 16, 16, 14, 'rgba(120,120,255,0.45)', 1);
  }
  function paintRift(c, r, frame) {
    const ph = (frame | 0) * 0.5;
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
      const dx = (x - 16) / 13, dy = (y - 16) / 13, d = Math.sqrt(dx * dx + dy * dy);
      if (d > 1) continue;
      const ang = Math.atan2(dy, dx) + d * 3 - ph;
      const sw = Math.sin(ang * 3) * 0.5 + 0.5;
      const col = d < 0.35 ? '#0a0612' : (sw > 0.6 ? '#9b6bff' : (sw > 0.3 ? '#5a3aa8' : '#2b1a4a'));
      px(c, x, y, col);
    }
    px(c, 16, 16, '#d7c4ff');
  }

  // Object/building painters need a transparent background; outline them.
  const OBJ = {
    tree: paintTree, pine: paintPine, dead_tree: paintDeadTree, bush: paintBush, rock: paintRock, flowers: paintFlowers,
    tallgrass: paintTallgrass, rubble: paintRubble, gravestone: paintGravestone, crystal: paintCrystal, fence: paintFence,
  };
  // ------------------------------------------------------------------ furniture & props
  function paintShelf(c, r) {
    rect(c, 2, 0, 28, T, '#5a3a20'); rect(c, 4, 2, 24, 28, '#3a2412');
    for (const y of [9, 19, 28]) rect(c, 3, y, 26, 2, '#8a5c34');
    const jars = ['#e0a040', '#c05a4a', '#7ab86a', '#e8dcc0', '#6ab0d8'];
    for (const row of [4, 14]) for (let i = 0; i < 5; i++) {
      const x = 5 + i * 5, col = jars[Math.floor(r() * jars.length)];
      rect(c, x, row + 2, 3, 4, col); rect(c, x, row + 2, 1, 4, shade(col, 0.3)); rect(c, x + 1, row, 1, 2, '#8a5c34');
    }
    rect(c, 6, 22, 5, 4, '#c79a3b'); rect(c, 14, 23, 4, 3, '#a8a8b0');
  }
  function paintBookshelf(c, r) {
    rect(c, 1, 0, 30, T, '#4a2c17'); rect(c, 3, 2, 26, 28, '#2a170c');
    for (const y of [10, 20]) rect(c, 3, y, 26, 2, '#7a4f2c');
    const books = ['#9c2430', '#2f5f9a', '#3f7f35', '#c79a3b', '#6a3a8a', '#e8dcc0', '#b06030'];
    for (const row of [3, 13, 23]) {
      let x = 4;
      while (x < 27) {
        const w = 2 + (r() * 2 | 0), col = books[Math.floor(r() * books.length)];
        if (x + w > 28) break;
        rect(c, x, row, w, 7, col); rect(c, x, row, 1, 7, shade(col, 0.25)); rect(c, x + w - 1, row + 6, 1, 1, shade(col, -0.3));
        x += w;
      }
    }
  }
  function paintTable(c, r) {
    rect(c, 3, 11, 26, 6, '#b07a46'); rect(c, 3, 11, 26, 1, '#d09a62'); rect(c, 3, 16, 26, 1, '#6e4524');
    rect(c, 5, 17, 3, 12, '#6e4524'); rect(c, 24, 17, 3, 12, '#6e4524');
    rect(c, 5, 17, 1, 12, '#8a5c34');
    // teacup + bread
    rect(c, 9, 8, 4, 3, '#f0e6d2'); rect(c, 9, 8, 4, 1, '#ffffff'); px(c, 13, 9, '#f0e6d2');
    rect(c, 19, 8, 5, 3, '#d9a25a'); rect(c, 19, 8, 5, 1, '#f0c27a');
  }
  function paintChair(c, r) {
    rect(c, 9, 4, 14, 4, '#8a5c34'); rect(c, 9, 4, 14, 1, '#b07a46');
    rect(c, 9, 8, 3, 20, '#6e4524'); rect(c, 20, 8, 3, 20, '#6e4524');
    rect(c, 9, 17, 14, 4, '#b07a46'); rect(c, 9, 17, 14, 1, '#d09a62'); rect(c, 9, 21, 14, 1, '#4a2c17');
  }
  function paintBed(c, r) {
    rect(c, 3, 1, 26, 30, '#6e4524'); rect(c, 3, 1, 26, 2, '#9a6a3f');
    rect(c, 5, 4, 22, 24, '#f2ecdf'); rect(c, 5, 4, 22, 6, '#ffffff');
    rect(c, 8, 6, 8, 4, '#e9e2d0'); rect(c, 17, 6, 8, 4, '#e9e2d0');
    rect(c, 5, 12, 22, 16, '#3d64a8'); rect(c, 5, 12, 22, 1, '#6a8fd0'); rect(c, 5, 27, 22, 1, '#284a80');
    for (let y = 16; y < 26; y += 4) rect(c, 7, y, 18, 1, '#4a78c0');
    rect(c, 3, 28, 26, 3, '#4a2c17');
  }
  function paintCrate(c, r) {
    rect(c, 4, 4, 24, 24, '#a6743f'); rect(c, 4, 4, 24, 24, '#a6743f');
    rect(c, 4, 4, 24, 1, '#c79a5a'); rect(c, 4, 27, 24, 1, '#5a3a1e');
    for (let y = 6; y < 27; y += 6) rect(c, 5, y, 22, 1, '#7a4f2c');
    rect(c, 4, 4, 2, 24, '#8a5c34'); rect(c, 26, 4, 2, 24, '#8a5c34');
    for (const [x, y] of [[6, 6], [24, 6], [6, 24], [24, 24]]) px(c, x, y, '#3a2412');
    rect(c, 13, 14, 6, 4, '#5a3a1e');
  }
  function paintBarrel(c, r) {
    for (let y = 3; y < 30; y++) {
      const w = y < 6 || y > 26 ? 9 : 11;
      const x0 = 16 - w, x1 = 16 + w;
      for (let x = x0; x < x1; x++) px(c, x, y, x < 16 - w + 4 ? '#8a5c34' : (x > 16 + w - 4 ? '#4a2c17' : '#6e4524'));
    }
    for (const y of [7, 25]) rect(c, 6, y, 20, 2, '#8e8a84');
    for (let y = 4; y < 29; y++) px(c, 11, y, '#a6743f');
    rect(c, 14, 15, 4, 3, '#5a3a1e');
  }
  function paintHearth(c, r, frame) {
    rect(c, 0, 0, T, T, '#6e6d76');
    rect(c, 2, 2, 28, 28, '#7d7c86');
    for (let y = 2; y < 30; y += 4) for (let x = 2 + ((y / 4) % 2) * 4; x < 30; x += 8) rect(c, x, y, 7, 3, shade('#7d7c86', (r() - 0.5) * 0.12));
    rect(c, 7, 12, 18, 18, '#2a2a30');
    // flames
    const fl = [['#ff8a2a', 9, 16, 14, 14], ['#ffd34d', 12, 20, 8, 10]];
    const wob = (frame | 0) % 4;
    for (let x = 9; x < 23; x++) {
      const h = 6 + Math.round(3 * Math.sin((x + wob * 1.7) * 0.9)) + (wob % 2);
      for (let y = 29 - h; y < 29; y++) px(c, x, y, y < 29 - h + 3 ? '#ffe89a' : (y < 29 - h + 6 ? '#ffb040' : '#e0561f'));
    }
    rect(c, 6, 28, 20, 2, '#4a4a52');
    addGlow(c, 16, 22, 16, 'rgba(255,150,60,0.35)', 1);
  }
  function paintLampPost(c, r, frame) {
    rect(c, 15, 12, 2, 19, '#353a45'); rect(c, 12, 29, 8, 3, '#353a45'); rect(c, 15, 12, 1, 19, '#4a4f5c');
    rect(c, 11, 6, 10, 2, '#353a45');
    rect(c, 12, 8, 8, 4, '#2a2d36');
    const pulse = 0.85 + 0.15 * Math.sin((frame | 0) * 1.6);
    rect(c, 13, 9, 6, 2, shade('#ffd76a', 0.2 * pulse));
    px(c, 13, 8, '#ffe89a'); px(c, 18, 8, '#ffe89a');
    rect(c, 10, 5, 12, 1, '#353a45');
    addGlow(c, 16, 10, 12 + (frame | 0) % 3, 'rgba(255,200,100,' + (0.55 * pulse).toFixed(2) + ')', 1);
  }
  function paintStatue(c, r) {
    rect(c, 6, 25, 20, 6, '#8e8d96'); rect(c, 6, 25, 20, 1, '#b5b4bc'); rect(c, 6, 30, 20, 1, '#5f5e66');
    rect(c, 9, 20, 14, 5, '#9d9ca6'); rect(c, 9, 20, 14, 1, '#c8c7cf');
    rect(c, 13, 9, 6, 11, '#aeadb5'); rect(c, 14, 4, 4, 5, '#bdbcc4'); rect(c, 12, 12, 2, 6, '#9d9ca6'); rect(c, 18, 12, 2, 6, '#9d9ca6');
    rect(c, 13, 9, 1, 11, '#d6d5dc'); rect(c, 18, 9, 1, 11, '#7d7c86');
    speckle(c, r, 6, 20, 20, 10, '#6e6d76', 10);
  }
  function paintFountain(c, r, frame) {
    rect(c, 2, 16, 28, 14, '#8e8d96'); rect(c, 2, 16, 28, 1, '#c8c7cf'); rect(c, 2, 28, 28, 2, '#5f5e66');
    for (let y = 18; y < 28; y++) for (let x = 4; x < 28; x++) { const dx = (x - 16) / 12, dy = (y - 22) / 6; if (dx * dx + dy * dy <= 1) px(c, x, y, ((x + y + (frame | 0)) % 4 === 0) ? '#b8e6ff' : '#4fa8e6'); }
    rect(c, 14, 8, 4, 10, '#9d9ca6'); rect(c, 12, 6, 8, 3, '#b5b4bc');
    const sp = (frame | 0) % 3;
    for (let i = 0; i < 4; i++) px(c, 16 + (i % 2 ? 1 : -1) * (2 + sp), 6 - i, '#d6f0ff');
    px(c, 16, 5 - sp, '#ffffff');
  }
  function paintPillar(c, r) {
    rect(c, 9, 2, 14, 3, P_.marble[0]); rect(c, 7, 0, 18, 2, P_.marble[0]);
    rect(c, 11, 5, 10, 22, P_.marble[0]); rect(c, 11, 5, 2, 22, '#fff8ea'); rect(c, 19, 5, 2, 22, P_.marble[2]);
    for (let y = 8; y < 26; y += 4) rect(c, 13, y, 6, 1, P_.marble[2]);
    rect(c, 9, 27, 14, 3, P_.marble[0]); rect(c, 7, 29, 18, 2, P_.marble[2]);
    rect(c, 9, 27, 14, 1, '#ffffff');
  }
  function paintArenaWallTile(c, r) { paintArenaWall(c, r); }
  function paintBanner(c, r) {
    paintStoneWall(c, r);
    // hanging cloth
    rect(c, 6, 2, 20, 2, '#c79a3b');
    rect(c, 8, 4, 16, 24, '#2f7a3e'); rect(c, 8, 4, 16, 1, '#4a9a52');
    rect(c, 8, 4, 1, 24, '#1f5a2a'); rect(c, 23, 4, 1, 24, '#1f5a2a');
    for (let y = 26; y < 28; y++) for (let x = 8; x < 24; x++) if ((x + y) % 2 === 0) px(c, x, y, '#2f7a3e');
    // gold crest (sun)
    rect(c, 13, 10, 6, 6, P_.gold); rect(c, 14, 9, 4, 1, P_.gold); rect(c, 14, 16, 4, 1, P_.gold);
    px(c, 15, 12, '#fff3a0'); px(c, 16, 13, '#fff3a0');
    rect(c, 12, 20, 8, 1, P_.gold);
  }
  function paintStairs(c, r) {
    for (let i = 0; i < 4; i++) {
      const y = i * 8;
      rect(c, 0, y, T, 8, shade(P_.stone[1], i * 0.05 - 0.05)); rect(c, 0, y, T, 1, shade(P_.stone[1], 0.3)); rect(c, 0, y + 7, T, 1, '#4a4952');
      speckle(c, r, 0, y + 1, T, 6, '#6e6d76', 6);
    }
  }
  function paintArenaWallIt(c, r) { paintArenaWall(c, r); }

  // ------------------------------------------------------------------ steampunk
  function paintPipe(c, r) {
    // horizontal brass pipe with flanges; transparent above/below
    rect(c, 0, 12, T, 8, P_.brass[0]); rect(c, 0, 12, T, 2, P_.brassLt); rect(c, 0, 18, T, 2, P_.brass[2]);
    for (let x = 0; x < T; x += 10) { rect(c, x, 9, 3, 14, '#5d6474'); rect(c, x, 9, 3, 1, '#7d8494'); }
    speckle(c, r, 0, 12, T, 8, '#ffffff', 2);
  }
  function paintMachine(c, r) {
    rect(c, 2, 4, 28, 26, P_.iron[0]); rect(c, 2, 4, 28, 2, P_.iron[1]); rect(c, 2, 28, 28, 2, P_.iron[2]);
    rect(c, 2, 4, 2, 26, P_.iron[2]); rect(c, 28, 4, 2, 26, P_.iron[2]);
    // brass gauges
    for (const [gx, gy] of [[9, 10], [22, 10]]) {
      for (let y = -4; y <= 4; y++) for (let x = -4; x <= 4; x++) { const d = x * x + y * y; if (d <= 16) px(c, gx + x, gy + y, d > 9 ? P_.brass[2] : '#f2ecd0'); }
      px(c, gx, gy, '#222'); px(c, gx + 2, gy - 1, '#c0392b');
    }
    // gear window
    rect(c, 13, 18, 6, 6, P_.iron[2]);
    for (let i = 0; i < 4; i++) px(c, 14 + (i % 2) * 3, 19 + (i >> 1) * 3, P_.brassLt);
    rect(c, 6, 24, 20, 2, P_.brass[0]);
    // rivets
    for (let x = 4; x < 28; x += 6) { px(c, x, 6, P_.brassLt); px(c, x, 27, P_.brassLt); }
    px(c, 16, 17, '#ffb050');
  }
  function paintBoiler(c, r) {
    // copper tank, pressure gauge, rivets
    rect(c, 3, 4, 26, 24, '#b8643a'); rect(c, 3, 4, 26, 24, '#b8643a');
    rect(c, 3, 4, 5, 24, '#d98354'); rect(c, 24, 4, 5, 24, '#8a4426');
    for (let y = 8; y < 26; y += 6) rect(c, 8, y, 16, 1, '#7a3a20');
    rect(c, 11, 1, 10, 4, P_.iron[1]); rect(c, 11, 1, 10, 1, '#7d8494');
    // gauge
    for (let y = -4; y <= 4; y++) for (let x = -4; x <= 4; x++) { const d = x * x + y * y; if (d <= 16) px(c, 16 + x, 13 + y, d > 9 ? P_.iron[2] : '#f2ecd0'); }
    px(c, 16, 13, '#222'); px(c, 18, 11, '#e74c3c');
    rect(c, 6, 22, 20, 2, P_.iron[2]);
    px(c, 4, 6, P_.brassLt); px(c, 27, 6, P_.brassLt); px(c, 4, 26, P_.brassLt); px(c, 27, 26, P_.brassLt);
  }
  function paintGears(c, r) {
    const gear = (cx, cy, R, col, rot) => {
      for (let y = -R - 1; y <= R + 1; y++) for (let x = -R - 1; x <= R + 1; x++) {
        const d = Math.sqrt(x * x + y * y), a = Math.atan2(y, x) + rot;
        const teeth = Math.cos(a * 6) > 0.2;
        if (d <= R - 2 || (d <= R && teeth)) {
          let cc = col; if (d > R - 2) cc = shade(col, -0.25); if (d < R * 0.45) cc = shade(col, -0.15);
          px(c, cx + x, cy + y, cc);
        }
      }
      px(c, cx, cy, P_.brassLt);
    };
    gear(11, 11, 9, P_.brass[0], 0.2);
    gear(23, 22, 7, P_.iron[1], 0.5);
    px(c, 11, 11, '#3a2a10'); px(c, 23, 22, '#222');
  }

  // ------------------------------------------------------------------ above layer (drawn over player)
  function paintCanopy(c, r) {
    leafy(c, r, 16, 14, 16, 13, '#4f9a3e');
    // semi transparent fringe: fade bottom rows
    for (let y = 22; y < T; y++) for (let x = 0; x < T; x++) {
      const id = c.getImageData(x, y, 1, 1).data; if (id[3] === 0) continue;
      c.clearRect(x, y, 1, 1);
      if (r() < 0.6) { c.fillStyle = 'rgba(79,154,62,0.75)'; c.fillRect(x, y, 1, 1); }
    }
    for (let i = 0; i < 9; i++) px(c, 4 + Math.floor(r() * 24), 3 + Math.floor(r() * 12), '#8fd060');
  }
  function paintArch(c, r) {
    // stone arch top piece: thick arc with opening at the bottom
    rect(c, 0, 16, T, 16, P_.stone[1]);
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < T; x++) {
        const dx = (x - 16) / 16, dy = (y + 16 - 32) / 16;
        const d = dx * dx + (y - 16 + 0) / 16 * 0; // placeholder
      }
    }
    // draw arch band: outer radius 16, inner 9, centred at (16,32)
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
      const dx = x - 16, dy = y - 32, d = Math.sqrt(dx * dx + dy * dy);
      if (d <= 16 && d >= 10) px(c, x, y, shade(P_.stone[1], (d > 14 ? -0.25 : 0.12)));
      else if (y >= 16 && d < 10) { /* opening: transparent */ }
    }
    for (let x = 0; x < 6; x++) { px(c, x, 30, P_.stone[2]); px(c, 25 + x, 30, P_.stone[2]); }
    speckle(c, r, 0, 0, T, 16, '#6e6d76', 6);
  }
  function paintBeam(c, r) {
    rect(c, 0, 10, T, 12, '#4a2c17'); rect(c, 0, 10, T, 2, '#6e4524'); rect(c, 0, 20, T, 2, '#2a170c');
    for (let x = 4; x < T; x += 10) px(c, x, 15, '#2a170c');
  }
  function paintHangingLanterns(c, r) {
    // a sagging string with paper lanterns
    for (let x = 0; x < T; x++) { const y = 4 + Math.round(Math.sin(x / T * Math.PI) * 3); px(c, x, y, '#3a2412'); }
    for (const lx of [6, 16, 26]) {
      const y0 = 4 + Math.round(Math.sin(lx / T * Math.PI) * 3);
      rect(c, lx, y0 + 1, 1, 2, '#3a2412');
      for (let y = -4; y <= 4; y++) for (let x = -3; x <= 3; x++) {
        const d = (x / 3.2) * (x / 3.2) + (y / 4.2) * (y / 4.2); if (d > 1) continue;
        px(c, lx + x, y0 + 7 + y, d > 0.7 ? '#c0501a' : (y < -2 ? '#ffd07a' : '#ffb04a'));
      }
      px(c, lx, y0 + 7, '#fff3c0');
      rect(c, lx - 2, y0 + 3, 5, 1, '#9a2a10');
      addGlow(c, lx, y0 + 7, 9, 'rgba(255,170,80,0.35)', 1);
    }
  }

  G.gfx._PAINT = PAINT; G.gfx._P = P_; G.gfx._ROOFS = ROOFS; G.gfx._OBJ = OBJ;
  G.gfx._internal = { mk, px, rect, rnd, hex2rgb, rgb2hex, shade, mix, speckle, dither, vgrad, outlined, addGlow, T, paintRoof, paintStoneWall, paintWoodWall, windowGlow, paintMetalWall, paintCaveWall, paintMarbleWall, paintArenaWall, paintDoor, paintRift, leafy, paintFence, paintShelf, paintBookshelf, paintTable, paintChair, paintBed, paintCrate, paintBarrel, paintHearth, paintLampPost, paintStatue, paintFountain, paintPillar, paintBanner, paintStairs, paintPipe, paintMachine, paintBoiler, paintGears, paintCanopy, paintArch, paintBeam, paintHangingLanterns };
  // ------------------------------------------------------------------ tile registry & cache
  // name -> painter(c, rng, frame)
  const NAME_FN = {
    grass: PAINT.grass, grass_flower: PAINT.grass_flower, moss: PAINT.moss, dirt: PAINT.dirt, cobble: PAINT.cobble,
    sand: PAINT.sand, water: (c, r, f) => PAINT.water(c, r, f), shallows: (c, r, f) => PAINT.shallows(c, r, f),
    wood_floor: PAINT.wood_floor, stone_floor: PAINT.stone_floor, metal_grate: PAINT.metal_grate, carpet: PAINT.carpet,
    cave_floor: PAINT.cave_floor, bridge: PAINT.bridge, hollow_ground: PAINT.hollow_ground, arena_sand: PAINT.arena_sand,
    marble: PAINT.marble, lantern_path: PAINT.lantern_path, ash: PAINT.ash, deck: PAINT.deck, void: PAINT.void,
    // nature
    tree: paintTree, pine: paintPine, dead_tree: paintDeadTree, bush: paintBush, rock: paintRock, flowers: paintFlowers,
    tallgrass: paintTallgrass, rubble: paintRubble, gravestone: paintGravestone, crystal: paintCrystal,
    rift: (c, r, f) => paintRift(c, r, f),
    // buildings
    stone_wall: paintStoneWall, wood_wall: paintWoodWall,
    window_wall: (c, r) => { paintWoodWall(c, r); windowGlow(c, 9, 9, 14, 11); rect(c, 0, T - 3, T, 3, '#4a2d18'); },
    metal_wall: paintMetalWall, cave_wall: paintCaveWall, marble_wall: paintMarbleWall, door: paintDoor, fence: paintFence,
    roof_green: (c, r) => paintRoof(c, r, 'roof_green'), roof_yellow: (c, r) => paintRoof(c, r, 'roof_yellow'),
    roof_brown: (c, r) => paintRoof(c, r, 'roof_brown'), roof_blue: (c, r) => paintRoof(c, r, 'roof_blue'),
    roof_red: (c, r) => paintRoof(c, r, 'roof_red'), roof_copper: (c, r) => paintRoof(c, r, 'roof_copper'),
    // furniture & props
    shelf: paintShelf, bookshelf: paintBookshelf, table: paintTable, chair: paintChair, bed: paintBed, crate: paintCrate,
    barrel: paintBarrel, hearth: (c, r, f) => paintHearth(c, r, f), lamp_post: (c, r, f) => paintLampPost(c, r, f),
    statue: paintStatue, fountain: (c, r, f) => paintFountain(c, r, f), pillar: paintPillar, arena_wall: paintArenaWall,
    banner: paintBanner, stairs: paintStairs,
    // steampunk
    pipe: paintPipe, machine: paintMachine, boiler: paintBoiler, gears: paintGears,
    // above
    canopy: paintCanopy, arch: paintArch, beam: paintBeam, hanging_lanterns: paintHangingLanterns,
  };
  // these ground/object tiles are drawn with a 4-frame cycle
  const ANIM = { water: 1, shallows: 1, rift: 1, hearth: 1, lamp_post: 1, fountain: 1 };
  // object tiles that get a 1px dark outline (transparent-background props)
  const OUTLINE = { tree: '#23402a', pine: '#183320', dead_tree: '#3a3633', bush: '#2e4d22', rock: '#2b2a33', flowers: '#2f4a25',
    tallgrass: '#2a4a20', rubble: '#2b2a33', gravestone: '#2b2a33', crystal: '#2a2050', table: '#2a170c', chair: '#2a170c',
    barrel: '#2a170c', lamp_post: '#1a1d24', statue: '#2b2a33', pipe: '#3a2a10', fence: '#3a2412', canopy: '#1f3d1c', arch: '#3a3a44' };

  const tileCache = new Map();
  const CH_TO_NAME = {};
  function resolveName(chOrName) {
    if (chOrName == null) return null;
    const s = String(chOrName);
    if (G.tiles && G.tiles.byChar && G.tiles.byChar[s]) return G.tiles.byChar[s].name;
    if (NAME_FN[s]) return s;
    if (G.tiles && G.tiles.byName && G.tiles.byName[s]) return s;
    return null;
  }
  function buildTile(name, frame) {
    const c = mk(T, T).getContext('2d');
    const r = rnd(G.util.hash('tile:' + name));
    const fn = NAME_FN[name];
    if (!fn) { // unknown but named: magenta checker so it is obvious
      for (let y = 0; y < T; y += 4) for (let x = 0; x < T; x += 4) rect(c, x, y, 4, 4, ((x + y) / 4) % 2 ? '#ff00ff' : '#202020');
      return c.canvas;
    }
    fn(c, r, frame | 0);
    if (OUTLINE[name]) return outlined(c.canvas, OUTLINE[name]);
    return c.canvas;
  }
  function tileFor(chOrName, frame) {
    const name = resolveName(chOrName);
    if (!name) {
      const key = 'missing|' + String(chOrName);
      if (!tileCache.has(key)) tileCache.set(key, buildTile('__missing', 0));
      return tileCache.get(key);
    }
    const f = ANIM[name] ? ((frame | 0) & 3) : 0;
    const key = name + '|' + f;
    let cv = tileCache.get(key);
    if (!cv) { cv = buildTile(name, f); tileCache.set(key, cv); }
    return cv;
  }
  // missing-tile fallback painter
  NAME_FN.__missing = (c) => { for (let y = 0; y < T; y += 4) for (let x = 0; x < T; x += 4) rect(c, x, y, 4, 4, ((x + y) / 4) % 2 ? '#ff00ff' : '#202020'); };

  // Public tile API
  G.gfx.tile = function (chOrName, frame) { return tileFor(chOrName, frame); };
  G.gfx.drawTile = function (ctx, chOrName, x, y, frame) { ctx.drawImage(tileFor(chOrName, frame), x | 0, y | 0); };
  G.gfx.tileNames = function () { return Object.keys(NAME_FN).filter((k) => k !== '__missing'); };
  // pre-warm every ground/object/above tile (call once at boot if desired; cheap)
  G.gfx.warmTiles = function () { if (!G.tiles || !G.tiles.list) return 0; let n = 0; for (const t of G.tiles.list) { for (let f = 0; f < (ANIM[t.name] ? 4 : 1); f++) { tileFor(t.name, f); n++; } } return n; };
  /*__PART5__*/
})();
