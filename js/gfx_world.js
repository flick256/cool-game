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
    // only solid pixels (alpha >= 128) take part: faint glows must not be outlined
    const hasA = (x, y) => x >= 0 && y >= 0 && x < w && y < h && sd[(y * w + x) * 4 + 3] >= 128;
    const [r, g, b] = hex2rgb(col);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (sd[i + 3] >= 128) continue;
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
    shallow: ['#5a9fb0', '#6cb4bf', '#4a8a9c'],
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

  // grass / moss / flowers are painted per pixel from WORLD coordinates (see "WORLD-SPACE GROUND" below):
  // no repeating tile pattern and no seams between neighbours.
  PAINT.grass = function (c) { putBuf(c, pixelBuf(0, 0, grassPx)); };
  PAINT.grass_flower = function (c) { const b = pixelBuf(0, 0, grassPx); flowersOn(b, 0, 0); putBuf(c, b); };
  PAINT.moss = function (c) { putBuf(c, pixelBuf(0, 0, mossPx)); };
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
    // (shift is not a multiple of the 4px dash period, so every frame differs)
    const fr = frame | 0;
    const shift = fr * 3;
    for (let i = 0; i < 3; i++) {
      const y = (6 + i * 10 + (rr() * 3 | 0) + Math.round(Math.sin(fr * 1.57 + i * 2.1))) % T;
      for (let x = 0; x < 9; x++) {
        const xx = (x * 4 + shift + i * 7) % T;
        px(c, xx, y, P_.waterLt); px(c, (xx + 1) % T, y, shallow ? '#c9ecf0' : '#7fc2f5');
      }
    }
    // sparkles that drift per frame
    for (let i = 0; i < 4; i++) { const sx = (i * 9 + fr * 5 + 3) % T, sy = (i * 7 + fr * 3 + 5) % T; px(c, sx, sy, '#e6f6ff'); }
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
  PAINT.void = function (c) { putBuf(c, pixelBuf(0, 0, voidPx)); };
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
        const w = x1 - x0;
        const tone = r() < 0.5 ? R.b : shade(R.b, (r() - 0.5) * 0.14);
        rect(c, x0, y, w, 7, tone);
        // lit upper bevel and a slightly darker lower band give each shingle its lip
        rect(c, x0, y, w, 1, R.l);
        rect(c, x0 + 1, y + 1, Math.max(0, w - 3), 1, shade(tone, 0.14));
        rect(c, x0, y + 5, w, 1, shade(tone, -0.16));
        // scalloped bottom: rounded corners drop to the dark colour
        rect(c, x0, y + 6, w, 1, R.d);
        if (w >= 6) { px(c, x0, y + 6, shade(R.d, 0.1)); px(c, x1 - 1, y + 6, shade(R.d, 0.1)); }
        // dark seams between neighbouring shingles (full height)
        if (x0 < T) rect(c, x0, y, 1, 7, R.d);
        // moss tint dither on some shingles (Wickholm reclaimed look)
        if (key !== 'roof_copper' && r() < 0.35) { dither(c, r, x0 + 1, y + 2, Math.max(1, w - 2), 3, R.m, 0.7); }
        // occasional glint
        if (r() < 0.12) px(c, x0 + 2 + (r() * 3 | 0), y + 2, R.l);
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
      const v = r();
      if (v < 0.35) c.clearRect(x, y, 1, 1);                              // ragged, see-through lower fringe
      else if (v < 0.5) { c.fillStyle = 'rgba(79,154,62,0.7)'; c.fillRect(x, y, 1, 1); }
    }
    for (let i = 0; i < 9; i++) px(c, 4 + Math.floor(r() * 24), 3 + Math.floor(r() * 12), '#8fd060');
  }
  function paintArch(c, r) {
    // stone arch top piece: thick arc with opening at the bottom
    rect(c, 0, 16, T, 16, P_.stone[1]);
    // arch band: outer radius 16, inner 10, centred at (16,32); opening stays transparent
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
      const dx = x - 16, dy = y - 32, d = Math.sqrt(dx * dx + dy * dy);
      if (d <= 16 && d >= 10) px(c, x, y, shade(P_.stone[1], (d > 14 ? -0.25 : 0.12)));
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
  // ------------------------------------------------------------------ characters (parametric chibi, 32x32 cells)
  // Views: 'front' (down), 'back' (up), 'side' (faces right; left = mirrored side).
  // step: 0 = stand, 1 = left leg raised (walk frame 0), 2 = right leg raised (walk frame 2).
  function hairCap(c, S, view) {
    const hr = S.hair, hl = shade(hr, 0.25);
    if (view === 'front') {
      rect(c, 9, 2, 14, 5, hr); rect(c, 8, 5, 2, 6, hr); rect(c, 22, 5, 2, 6, hr);
      rect(c, 11, 7, 4, 2, hr); rect(c, 17, 7, 4, 2, hr); rect(c, 12, 3, 6, 1, hl);
    } else if (view === 'back') {
      rect(c, 9, 2, 14, 14, hr); rect(c, 12, 3, 6, 1, hl);
    } else {
      rect(c, 9, 2, 14, 5, hr); rect(c, 9, 5, 5, 9, hr); rect(c, 16, 6, 4, 2, hr); rect(c, 12, 3, 6, 1, hl);
    }
  }
  function hairStyle(c, S, view) {
    const hr = S.hair, st = S.hairStyle || 'short';
    const back = view === 'back', side = view === 'side';
    switch (st) {
      case 'long':
        if (back) rect(c, 9, 15, 14, 8, hr);
        else if (side) rect(c, 9, 5, 5, 18, hr);
        else { rect(c, 8, 8, 2, 14, hr); rect(c, 22, 8, 2, 14, hr); }
        break;
      case 'bun':
        rect(c, 13, 0, 6, 4, hr); px(c, 14, 0, shade(hr, 0.2)); break;
      case 'ponytail':
        if (back) rect(c, 15, 6, 3, 14, hr);
        else if (side) rect(c, 5, 6, 3, 12, hr);
        else rect(c, 23, 8, 2, 9, hr);
        break;
      case 'spiky':
        for (let x = 9; x < 23; x += 3) rect(c, x, 0, 1, 2, hr);
        break;
      case 'shaggy':
        for (let x = 8; x < 24; x += 2) px(c, x, 1 + (x % 3 === 0 ? 1 : 0), hr);
        rect(c, 7, 9, 2, 4, hr); rect(c, 23, 9, 2, 4, hr);
        break;
      case 'curly':
        for (let x = 9; x < 23; x += 3) { rect(c, x, 2, 3, 2, hr); px(c, x + 1, 1, hr); }
        break;
      case 'hat':
        rect(c, 11, 0, 10, 5, S.hat || '#6b3a22'); rect(c, 11, 4, 10, 1, S.hatBand || '#e0b657');
        rect(c, 5, 4, 22, 2, S.hat || '#6b3a22'); rect(c, 5, 5, 22, 1, shade(S.hat || '#6b3a22', -0.25));
        break;
      case 'tall':
        rect(c, 11, 0, 10, 6, S.hat || '#222'); rect(c, 8, 6, 16, 1, S.hat || '#222');
        rect(c, 11, 4, 10, 1, S.hatBand || '#e0b657');
        break;
      case 'witch':
        for (let y = 0; y < 4; y++) { const half = Math.round(1 + y * 1.4); rect(c, 16 - half, y, half * 2, 1, S.hat || '#2c4fa0'); }
        rect(c, 5, 4, 22, 2, S.hat || '#2c4fa0'); rect(c, 5, 5, 22, 1, shade(S.hat || '#2c4fa0', -0.25));
        rect(c, 9, 4, 14, 1, S.hatBand || '#e8c15a');
        px(c, 23, 1, '#ffd0ea'); px(c, 24, 0, '#ffd0ea');
        break;
      case 'hood':
        rect(c, 7, 2, 18, 15, S.hood || S.top);
        rect(c, 7, 2, 1, 15, shade(S.hood || S.top, -0.25));
        if (!back) { if (side) rect(c, 12, 6, 11, 10, S.skin); else rect(c, 10, 6, 12, 10, S.skin); }
        break;
      case 'bald':
        if (back) rect(c, 9, 8, 14, 3, hr);
        else { rect(c, 8, 8, 2, 4, hr); rect(c, 22, 8, 2, 4, hr); }
        break;
      case 'veil':
        if (back) rect(c, 7, 2, 18, 20, S.veil || '#f4f4f8');
        else { rect(c, 7, 2, 18, 4, S.veil || '#f4f4f8'); rect(c, 7, 6, 2, 16, S.veil || '#f4f4f8'); rect(c, 23, 6, 2, 16, S.veil || '#f4f4f8'); }
        break;
      case 'helm':
        rect(c, 9, 2, 14, 6, S.helm || '#b8bcc8');
        if (back) rect(c, 9, 2, 14, 12, S.helm || '#b8bcc8');
        else rect(c, 10, 7, 12, 1, shade(S.helm || '#b8bcc8', -0.45));
        rect(c, 15, 0, 2, 3, S.plume || '#c0392b');
        break;
      case 'cap':
        rect(c, 9, 2, 14, 5, S.cap || '#3a5a8a');
        if (!back) rect(c, 7, 6, 18, 2, shade(S.cap || '#3a5a8a', -0.25));
        else rect(c, 9, 7, 14, 1, shade(S.cap || '#3a5a8a', -0.25));
        break;
      default: break; // short: handled by hairCap
    }
  }
  function drawLegs(c, S, view, step) {
    const pt = S.pants, bt = S.boots, pd = shade(pt, -0.2), bd = shade(bt, -0.15);
    if (view === 'side') {
      const backLift = step === 1 ? 1 : 0, frontLift = step === 2 ? 1 : 0;
      rect(c, 12, 24, 3, 4 - backLift, pd); rect(c, 11, 28 - backLift, 4, 3, bd);
      rect(c, 15, 24, 3, 4 - frontLift, pt); rect(c, 15, 28 - frontLift, 5, 3, bt);
      rect(c, 15, 28 - frontLift, 5, 1, shade(bt, 0.15));
    } else {
      const lL = step === 1 ? 1 : 0, lR = step === 2 ? 1 : 0;
      rect(c, 11, 24, 4, 4 - lL, pt); rect(c, 10, 28 - lL, 5, 3, bt); rect(c, 10, 28 - lL, 5, 1, shade(bt, 0.15));
      rect(c, 17, 24, 4, 4 - lR, pt); rect(c, 17, 28 - lR, 5, 3, bt); rect(c, 17, 28 - lR, 5, 1, shade(bt, 0.15));
      rect(c, 13, 24, 1, 4 - lL, pd); rect(c, 17, 24, 1, 4 - lR, shade(pt, 0.1));
    }
  }
  function drawTorso(c, S, view) {
    const tp = S.top, td = shade(tp, -0.2), bl = S.belt || '#3a2412';
    if (view === 'side') {
      rect(c, 11, 17, 9, 7, tp); rect(c, 11, 17, 1, 7, td); rect(c, 19, 17, 1, 7, shade(tp, 0.1));
      rect(c, 11, 22, 9, 1, bl);
      if (S.coat) { rect(c, 10, 17, 10, 9, S.coat); rect(c, 10, 17, 1, 9, shade(S.coat, -0.25)); rect(c, 10, 25, 10, 1, shade(S.coat, -0.3)); }
      if (S.scarf) rect(c, 15, 16, 4, 2, S.scarf);
    } else if (view === 'back') {
      rect(c, 10, 17, 12, 7, td); rect(c, 10, 17, 1, 7, shade(tp, -0.35)); rect(c, 21, 17, 1, 7, shade(tp, -0.35));
      rect(c, 10, 22, 12, 1, bl);
      if (S.coat) { rect(c, 9, 17, 14, 9, S.coat); rect(c, 9, 17, 14, 1, shade(S.coat, -0.35)); rect(c, 16, 18, 1, 8, shade(S.coat, -0.3)); rect(c, 9, 25, 14, 1, shade(S.coat, -0.25)); }
      if (S.scarf) rect(c, 10, 16, 12, 2, S.scarf);
    } else {
      rect(c, 10, 17, 12, 7, tp); rect(c, 10, 17, 1, 7, td); rect(c, 21, 17, 1, 7, td);
      rect(c, 10, 22, 12, 1, bl); rect(c, 15, 22, 2, 1, S.buckle || P_.brassLt);
      if (S.trim) rect(c, 14, 17, 4, 1, S.trim);
      if (S.coat) {
        rect(c, 9, 17, 14, 9, S.coat); rect(c, 9, 17, 1, 9, shade(S.coat, -0.25)); rect(c, 22, 17, 1, 9, shade(S.coat, -0.25));
        rect(c, 16, 18, 1, 8, shade(S.coat, -0.35)); rect(c, 9, 25, 14, 1, shade(S.coat, -0.3));
        if (S.trim) rect(c, 9, 17, 14, 1, S.trim);
      }
      if (S.scarf) rect(c, 10, 16, 12, 2, S.scarf);
      if (S.armor) { rect(c, 11, 18, 10, 4, S.armor); rect(c, 15, 18, 2, 4, shade(S.armor, -0.2)); rect(c, 11, 18, 10, 1, shade(S.armor, 0.3)); }
      if (S.apron) rect(c, 12, 19, 8, 5, S.apron);
      if (S.sigil) { for (let i = 0; i < 4; i++) { px(c, 13 + i, 19 + i, shade(S.armor || tp, -0.4)); px(c, 18 - i, 19 + i, shade(S.armor || tp, -0.4)); } }
    }
  }
  function drawArms(c, S, view, step) {
    const sl = S.sleeve || S.top, sd = shade(sl, -0.2);
    if (view === 'side') {
      const nd = step === 2 ? 1 : (step === 1 ? -1 : 0);
      rect(c, 12, 18, 2, 5, sd); rect(c, 12, 22, 2, 2, shade(S.skin, -0.12));
      rect(c, 17, 18 + (nd > 0 ? 1 : 0), 2, 4, sl); rect(c, 17, 22 + (nd > 0 ? 1 : 0), 2, 2, S.skin);
    } else {
      const dL = step === 1 ? 1 : 0, dR = step === 2 ? 1 : 0;
      rect(c, 8, 18 + dL, 2, 4, sl); rect(c, 8, 22 + dL, 2, 2, S.skin); rect(c, 8, 18 + dL, 1, 4, sd);
      rect(c, 22, 18 + dR, 2, 4, sl); rect(c, 22, 22 + dR, 2, 2, S.skin); rect(c, 23, 18 + dR, 1, 4, sd);
    }
  }
  function drawHeadBase(c, S, view) {
    const sk = S.skin;
    if (view === 'side') {
      rect(c, 10, 3, 13, 13, sk); c.clearRect(10, 3, 1, 1); c.clearRect(22, 3, 1, 1); c.clearRect(10, 15, 1, 1); c.clearRect(22, 15, 1, 1);
      px(c, 14, 9, shade(sk, -0.1)); px(c, 14, 10, shade(sk, -0.1));
      px(c, 22, 11, shade(sk, -0.15));
    } else if (view === 'back') {
      rect(c, 9, 3, 14, 13, sk); c.clearRect(9, 3, 1, 1); c.clearRect(22, 3, 1, 1);
      px(c, 8, 9, sk); px(c, 8, 10, sk); px(c, 23, 9, sk); px(c, 23, 10, sk);
    } else {
      rect(c, 9, 3, 14, 13, sk); c.clearRect(9, 3, 1, 1); c.clearRect(22, 3, 1, 1); c.clearRect(9, 15, 1, 1); c.clearRect(22, 15, 1, 1);
      px(c, 8, 9, sk); px(c, 8, 10, sk); px(c, 23, 9, sk); px(c, 23, 10, sk);
    }
  }
  function drawFace(c, S, view) {
    if (view === 'back') return;
    const eye = S.eye || '#2a2440', hd = shade(S.hair, -0.35);
    if (S.eyeGlow) {
      // hollow / ghost eyes: glowing violet
      const ec = S.eyeGlow;
      if (view === 'front') { rect(c, 11, 9, 2, 3, ec); rect(c, 19, 9, 2, 3, ec); px(c, 11, 9, '#ffffff'); px(c, 19, 9, '#ffffff'); addGlow(c, 12, 10, 4, 'rgba(180,120,255,0.6)', 1); addGlow(c, 20, 10, 4, 'rgba(180,120,255,0.6)', 1); }
      else { rect(c, 19, 9, 2, 3, ec); px(c, 19, 9, '#ffffff'); addGlow(c, 20, 10, 4, 'rgba(180,120,255,0.6)', 1); }
      return;
    }
    if (view === 'front') {
      for (const x of [11, 19]) {
        rect(c, x, 9, 2, 3, eye); px(c, x, 9, '#ffffff'); px(c, x + 1, 11, shade(eye, 0.35));
        rect(c, x, 8, 2, 1, hd);
      }
      px(c, 15, 13, '#b5544a'); px(c, 16, 13, '#b5544a');
      px(c, 11, 12, '#f0a0a0'); px(c, 20, 12, '#f0a0a0');
    } else {
      rect(c, 19, 9, 2, 3, eye); px(c, 19, 9, '#ffffff'); px(c, 20, 11, shade(eye, 0.35));
      rect(c, 19, 8, 2, 1, hd);
      px(c, 21, 13, '#b5544a'); px(c, 18, 12, '#f0a0a0');
    }
  }
  function drawAccessories(c, S, view, step) {
    const acc = S.acc || [];
    const side = view === 'side';
    for (const a of acc) {
      if (a === 'goggles') {
        const br = '#c79a3b', bd = '#8e6a25';
        if (view === 'back') rect(c, 9, 6, 14, 1, bd);
        else if (side) { rect(c, 15, 5, 5, 2, br); rect(c, 16, 5, 3, 2, '#7fd8ff'); px(c, 15, 5, '#ffe39a'); }
        else { rect(c, 10, 5, 5, 2, br); rect(c, 17, 5, 5, 2, br); rect(c, 11, 5, 3, 2, '#7fd8ff'); rect(c, 18, 5, 3, 2, '#7fd8ff'); px(c, 11, 5, '#ffffff'); px(c, 18, 5, '#ffffff'); rect(c, 9, 6, 1, 1, bd); rect(c, 22, 6, 1, 1, bd); }
      } else if (a === 'lantern') {
        const lx = side ? 19 : 24, ly = side ? 21 : 21;
        rect(c, lx - 1, ly + 1, 1, 3, '#5a3a1e');
        rect(c, lx, ly, 3, 4, '#c79a3b'); rect(c, lx + 1, ly + 1, 1, 2, '#ffe89a'); px(c, lx + 1, ly - 1, '#5a3a1e');
        addGlow(c, lx + 1, ly + 2, 8, 'rgba(255,200,100,0.45)', 1);
      } else if (a === 'staff') {
        const sx = side ? 21 : 25;
        rect(c, sx, 6, 1, 24, '#7a4f2c'); rect(c, sx, 6, 1, 1, '#a6743f');
        rect(c, sx - 1, 3, 3, 3, S.staffGem || '#9ad8ff'); px(c, sx, 3, '#ffffff');
      } else if (a === 'sword') {
        if (side) { rect(c, 9, 14, 1, 12, '#6b4a2a'); rect(c, 8, 13, 3, 1, P_.gold); }
        else { rect(c, 6, 14, 1, 12, '#6b4a2a'); rect(c, 5, 13, 3, 1, P_.gold); rect(c, 6, 26, 1, 2, '#c8d0dc'); }
      } else if (a === 'spear') {
        const sx = side ? 24 : 26;
        rect(c, sx, 2, 1, 27, '#8a5c34'); rect(c, sx - 1, 0, 3, 3, '#c8d0dc'); px(c, sx, 0, '#ffffff');
      } else if (a === 'bow') {
        const bx = side ? 5 : 3;
        for (let y = 8; y <= 22; y++) px(c, bx + (y < 15 ? 0 : (y > 18 ? 0 : 1)) * 0, y, '#6b4a2a');
        px(c, bx - 1, 8, '#6b4a2a'); px(c, bx - 1, 22, '#6b4a2a');
      } else if (a === 'wings') {
        const wc = S.wing || '#f5f5ff', wd = shade(wc, -0.2);
        if (side) { rect(c, 5, 5, 4, 12, wc); rect(c, 5, 16, 3, 3, wd); px(c, 5, 5, '#bfd8ff'); }
        else { rect(c, 2, 5, 5, 13, wc); rect(c, 2, 16, 4, 3, wd); px(c, 2, 5, '#bfd8ff'); rect(c, 25, 5, 5, 13, wc); rect(c, 26, 16, 4, 3, wd); px(c, 28, 5, '#bfd8ff'); }
      } else if (a === 'cape') {
        // drawn in charCell before the body; placeholder
      } else if (a === 'patch') {
        // handled with cape
      } else if (a === 'backpack') {
        if (side) rect(c, 7, 16, 4, 7, '#8a5a2e'); else if (view === 'back') rect(c, 11, 17, 10, 6, '#8a5a2e');
      } else if (a === 'coin') {
        px(c, 22, 25, P_.gold); px(c, 23, 25, '#fff3a0');
      } else if (a === 'bag') {
        if (side) rect(c, 18, 22, 4, 4, '#8a5a2e'); else rect(c, 22, 23, 4, 4, '#8a5a2e');
        rect(c, side ? 18 : 22, 22, 4, 1, '#6b4424');
      } else if (a === 'cane') {
        const cx = side ? 22 : 24; rect(c, cx, 14, 1, 14, '#5a3a1e'); px(c, cx - 1, 14, '#5a3a1e');
      } else if (a === 'knit') {
        rect(c, 22, 14, 1, 3, '#d6604a'); px(c, 21, 12, '#d6604a');
      } else if (a === 'shoulder_pads') {
        rect(c, 8, 17, 3, 2, S.armor || P_.gold); rect(c, 21, 17, 3, 2, S.armor || P_.gold);
      } else if (a === 'tabard') {
        if (!side && view !== 'back') { rect(c, 13, 18, 6, 9, S.tabard || '#b02d39'); rect(c, 13, 18, 6, 1, P_.gold); }
      } else if (a === 'belt_pouch') {
        if (!side && view !== 'back') rect(c, 20, 22, 3, 3, '#6b4424');
      } else if (a === 'gladius_helm') {
        // helm handled by hair style
      }
    }
  }
  function drawCape(c, S, view) {
    if (!S.cape && !(S.acc || []).includes('cape')) return;
    const cc = S.cape || '#6b3a8a', cd = shade(cc, -0.25);
    const patchy = (S.acc || []).includes('patch');
    if (view === 'back') {
      rect(c, 8, 17, 16, 14, cc); rect(c, 8, 17, 1, 14, cd); rect(c, 23, 17, 1, 14, cd);
      if (patchy) { rect(c, 10, 20, 4, 3, '#3f7f35'); rect(c, 17, 24, 4, 3, '#c07a2a'); rect(c, 12, 27, 3, 2, '#2f5f9a'); rect(c, 19, 18, 3, 3, '#e8dcc0'); }
    } else if (view === 'side') {
      rect(c, 6, 17, 4, 14, cc); rect(c, 6, 17, 1, 14, cd);
      if (patchy) { rect(c, 7, 20, 2, 3, '#3f7f35'); rect(c, 7, 26, 2, 2, '#c07a2a'); }
    } else {
      rect(c, 7, 17, 2, 13, cc); rect(c, 23, 17, 2, 13, cc); rect(c, 7, 17, 1, 13, cd); rect(c, 24, 17, 1, 13, cd);
      if (patchy) { rect(c, 7, 20, 2, 3, '#3f7f35'); rect(c, 23, 25, 2, 3, '#c07a2a'); }
    }
  }

  // one 32x32 cell for a character, facing 'down'|'up'|'left'|'right', walk step 0/1/2
  function charCell(S, dir, frame) {
    const view = dir === 'up' ? 'back' : (dir === 'left' || dir === 'right' ? 'side' : 'front');
    const step = frame === 0 ? 1 : (frame === 2 ? 2 : 0);
    const cv = mk(T, T), c = cv.getContext('2d');
    drawCape(c, S, view);
    if (S.acc && S.acc.includes('wings')) drawAccessories(c, S, view, step);
    drawLegs(c, S, view, step);
    if (S.acc && S.acc.includes('bow') && view !== 'side') drawAccessories(c, Object.assign({}, S, { acc: ['bow'] }), view, step);
    drawTorso(c, S, view);
    drawArms(c, S, view, step);
    if (S.acc && S.acc.includes('backpack')) drawAccessories(c, S, view, step);
    drawHeadBase(c, S, view);
    if (S.hairStyle !== 'bald' || view === 'back') hairCap(c, S, view);
    hairStyle(c, S, view);
    drawFace(c, S, view);
    const front = Object.assign({}, S, { acc: (S.acc || []).filter((a) => a !== 'wings' && a !== 'bow' && a !== 'backpack') });
    drawAccessories(c, front, view, step);
    const outlineCol = S.outline || '#2b2a33';
    const out = outlined(cv, outlineCol);
    if (dir !== 'left') return out;
    const fl = mk(T, T), f = fl.getContext('2d'); f.translate(T, 0); f.scale(-1, 1); f.drawImage(out, 0, 0);
    return fl;
  }
  G.gfx._charCell = charCell;

  // ------------------------------------------------------------------ character specs
  const CHARS = {
    // heroes -------------------------------------------------------
    rowan: { skin: '#f2c9a0', eye: '#4a3a2a', hair: '#6b4226', hairStyle: 'short', top: '#f0e0b0', sleeve: '#e8d290', coat: '#d9a53a', trim: '#ffe39a', pants: '#5a4030', boots: '#3a2412', acc: ['lantern'], outline: '#3a2412' },
    claret: { skin: '#f2c2a0', eye: '#3a6fa8', hair: '#1f2340', hairStyle: 'short', top: '#2f6fb8', sleeve: '#8a5a2e', pants: '#4a5a3a', boots: '#3a2412', belt: '#3a2412', buckle: '#c79a3b', acc: ['goggles', 'spear'] },
    caspian: { skin: '#e8b890', eye: '#5a4a3a', hair: '#2e3240', hairStyle: 'short', top: '#e8e4d8', sleeve: '#d4d0c4', armor: '#e8e4d8', trim: '#d4a83a', pants: '#e8e4d8', boots: '#7a6a50', belt: '#c79a3b', sigil: true, acc: ['sword', 'cape'], cape: '#f3f0e6', outline: '#4a4a52' },
    rook: { skin: '#f0c4a0', eye: '#3aa070', hair: '#c4402a', hairStyle: 'shaggy', top: '#2a2d36', sleeve: '#2e7a48', coat: '#2e7a48', trim: '#c8c8d0', scarf: '#e0b657', pants: '#2a2d36', boots: '#2a1a10', belt: '#3a2412', acc: ['coin', 'sword'] },
    seraphine: { skin: '#f6d6c0', eye: '#5ab0b8', hair: '#2fb4a0', hairStyle: 'long', top: '#eef4f2', sleeve: '#dff2ee', trim: '#8fd0c8', pants: '#eef4f2', boots: '#d8e4e0', belt: '#8fd0c8', wing: '#f5f5ff', acc: ['wings', 'staff'], staffGem: '#9ad8ff' },
    wren: { skin: '#f0c8a8', eye: '#3a6a5a', hair: '#6f8ba0', hairStyle: 'hat', hat: '#2c4fa0', hatBand: '#e8c15a', top: '#8a6a3a', sleeve: '#7a5a8a', pants: '#3a3a4a', boots: '#4a3020', belt: '#3a2412', cape: '#7a5a8a', acc: ['patch', 'cape', 'staff'] },
    // named npcs ---------------------------------------------------
    maren: { skin: '#e8b890', eye: '#3a2a20', hair: '#9a9aa8', hairStyle: 'bun', top: '#7a4a2a', sleeve: '#8a5a3a', coat: '#c9a86a', pants: '#5a4030', boots: '#2a1a10', acc: ['knit'] },
    pip: { skin: '#f2c9a0', eye: '#2a2030', hair: '#7a4a2a', hairStyle: 'cap', cap: '#c04a2a', top: '#3a7a3a', sleeve: '#3a7a3a', pants: '#4a3a2a', boots: '#2a1a10', acc: ['lantern'] },
    bram: { skin: '#e0b08a', eye: '#4a4a50', hair: '#8a8a92', hairStyle: 'short', top: '#4a4a40', sleeve: '#4a4a40', apron: '#c8a878', pants: '#3a3a40', boots: '#2a1a10', acc: ['goggles'] },
    torvald: { skin: '#c8906a', eye: '#2a1a10', hair: '#3a2a20', hairStyle: 'bald', top: '#b03030', sleeve: '#b03030', coat: '#b03030', trim: '#e0b657', pants: '#5a3a20', boots: '#2a1a10', acc: ['shoulder_pads'] },
    abbess: { skin: '#f0d4c0', eye: '#5a4a6a', hair: '#e8e0c8', hairStyle: 'veil', veil: '#fff6e0', top: '#f6f0e0', sleeve: '#f6f0e0', trim: '#c9a25a', pants: '#f6f0e0', boots: '#c9a25a', acc: [] },
    hale: { skin: '#e8c0a0', eye: '#2a2a40', hair: '#2a2030', hairStyle: 'tall', hat: '#20202a', hatBand: '#e0b657', top: '#f0f0f5', sleeve: '#f0f0f5', coat: '#f0f0f5', trim: '#e0b657', pants: '#2a2a34', boots: '#1a1a20', acc: ['sword'] },
    vael: { skin: '#e0c0a8', eye: '#8a7aa8', hair: '#c8c8d8', hairStyle: 'long', top: '#c8ccd8', sleeve: '#b8bccb', coat: '#b8bccb', trim: '#e8c060', pants: '#3a3a48', boots: '#1a1a22', cape: '#7a8098', acc: ['cape', 'lantern'] },
    elowen: { skin: '#e8e0f0', eye: '#c7a8ff', eyeGlow: '#c7a8ff', hair: '#d8d0f0', hairStyle: 'long', top: '#4a3a6a', sleeve: '#5a4a7a', pants: '#4a3a6a', boots: '#2a2040', outline: '#8a6ad0', acc: ['lantern'] },
    // generic npcs -------------------------------------------------
    villager_m1: { skin: '#e8b890', eye: '#3a2a20', hair: '#5a3a20', hairStyle: 'short', top: '#4f8f52', sleeve: '#4f8f52', pants: '#5a4a30', boots: '#3a2412', acc: [] },
    villager_m2: { skin: '#d8a880', eye: '#3a2a20', hair: '#9a9aa8', hairStyle: 'short', top: '#e8e0c8', sleeve: '#e8e0c8', coat: '#3a4a8a', pants: '#4a4a58', boots: '#2a1a10', acc: ['cane'] },
    villager_f1: { skin: '#f2c9a0', eye: '#4a3a2a', hair: '#d86a2a', hairStyle: 'long', top: '#8a4aa8', sleeve: '#8a4aa8', pants: '#8a4aa8', boots: '#4a2a20', acc: [] },
    villager_f2: { skin: '#e0b08a', eye: '#2a2030', hair: '#1a1a22', hairStyle: 'bun', top: '#e8e0d0', sleeve: '#e8e0d0', pants: '#6a4a2a', boots: '#2a1a10', apron: '#f5f5f5', acc: ['belt_pouch'] },
    elder: { skin: '#e6b890', eye: '#4a4a50', hair: '#e8e8ec', hairStyle: 'short', top: '#6a4a2a', sleeve: '#6a4a2a', pants: '#4a3a2a', boots: '#2a1a10', acc: ['cane'] },
    child1: { skin: '#f5cfae', eye: '#3a6a9a', hair: '#e8c060', hairStyle: 'short', top: '#d03a3a', sleeve: '#d03a3a', pants: '#3a4a6a', boots: '#3a2412', acc: [] },
    child2: { skin: '#e8b890', eye: '#3a2a20', hair: '#2a2030', hairStyle: 'bun', top: '#e8c040', sleeve: '#e8c040', pants: '#5a4a6a', boots: '#3a2412', acc: [] },
    guard: { skin: '#e8b890', eye: '#2a2030', hair: '#3a2a20', hairStyle: 'helm', helm: '#b8bcc8', plume: '#c0392b', top: '#8a929e', sleeve: '#8a929e', armor: '#8a929e', tabard: '#b02d39', trim: '#e0b657', pants: '#3a3f4a', boots: '#2a2d36', acc: ['spear', 'tabard'] },
    merchant: { skin: '#dca88a', eye: '#2a2030', hair: '#6a4a2a', hairStyle: 'hat', hat: '#7a4a2a', hatBand: '#e0b657', top: '#6a5a3a', sleeve: '#6a5a3a', coat: '#7a4a2a', pants: '#4a3a2a', boots: '#2a1a10', acc: ['bag'] },
    innkeeper: { skin: '#e6b890', eye: '#3a2a20', hair: '#3a2a20', hairStyle: 'bald', top: '#e8e0d0', sleeve: '#e8e0d0', pants: '#4a3a6a', boots: '#2a1a10', apron: '#f5f5f5', acc: [] },
    choir_f: { skin: '#f6dccc', eye: '#6a5a8a', hair: '#e8e0f0', hairStyle: 'veil', veil: '#f4f4f8', top: '#eef0f8', sleeve: '#eef0f8', trim: '#c9a25a', pants: '#eef0f8', boots: '#c9a25a', acc: [] },
    choir_m: { skin: '#e8c0a0', eye: '#3a2a20', hair: '#3a3a4a', hairStyle: 'hood', hood: '#f0f0f8', top: '#eef0f8', sleeve: '#eef0f8', pants: '#eef0f8', boots: '#c9a25a', acc: [] },
    gladiator: { skin: '#c8906a', eye: '#2a1a10', hair: '#2a1a10', hairStyle: 'helm', helm: '#b08a50', plume: '#e0b657', top: '#8a5a3a', sleeve: '#b08a50', armor: '#b08a50', pants: '#a0303a', boots: '#5a3a20', acc: ['sword', 'shoulder_pads'] },
    engineer: { skin: '#e8b890', eye: '#3a6a9a', hair: '#8a5a2a', hairStyle: 'short', top: '#e07a2a', sleeve: '#e07a2a', pants: '#3a4a6a', boots: '#3a2412', belt: '#c79a3b', acc: ['goggles'] },
    sailor: { skin: '#d8a880', eye: '#2a2a40', hair: '#2a2a40', hairStyle: 'cap', cap: '#2a4a6a', top: '#f2f2f2', sleeve: '#f2f2f2', trim: '#2a4a7a', pants: '#2a3a5a', boots: '#2a1a10', acc: [] },
    noble: { skin: '#f2d0b0', eye: '#4a3a6a', hair: '#2a1a30', hairStyle: 'hat', hat: '#5a2a6a', hatBand: '#e0b657', top: '#5a2a6a', sleeve: '#5a2a6a', coat: '#7a3a8a', trim: '#e0b657', pants: '#3a2a4a', boots: '#2a1a10', acc: [] },
    hollow: { skin: '#2a2236', eye: '#c7a8ff', eyeGlow: '#c7a8ff', hair: '#120c1c', hairStyle: 'hood', hood: '#1a1024', top: '#1a1024', sleeve: '#120c1c', pants: '#0e0a16', boots: '#0a0710', outline: '#6a4aa8', acc: [] },
    // placeholder for unknown keys
    __placeholder: { skin: '#a8a8b8', eye: '#4a4a58', hair: '#6a6a78', hairStyle: 'short', top: '#8a8a98', sleeve: '#8a8a98', pants: '#5a5a68', boots: '#3a3a44', acc: [] },
  };

  // ------------------------------------------------------------------ animals
  function animalCell(kind, dir, frame) {
    const cv = mk(T, T), c = cv.getContext('2d');
    const body = kind === 'cat' ? '#e08a3a' : '#a06a3a', belly = kind === 'cat' ? '#f6d0a0' : '#d8b890', dk = shade(body, -0.3);
    const legStep = frame === 0 ? 1 : (frame === 2 ? -1 : 0);
    if (dir === 'up') {
      rect(c, 10, 14, 12, 10, body); rect(c, 10, 14, 12, 1, shade(body, 0.2)); rect(c, 11, 10, 10, 6, body);
      if (kind === 'cat') { px(c, 11, 10, dk); px(c, 20, 10, dk); } else { rect(c, 9, 13, 3, 3, body); rect(c, 20, 13, 3, 3, body); }
      rect(c, 12, 22, 3, 4, dk); rect(c, 17, 22, 3, 4, dk);
      rect(c, 24, 16, 4, 2, body); rect(c, 26, 12, 2, 5, body);
    } else if (dir === 'down') {
      rect(c, 9, 13, 14, 10, body); rect(c, 11, 19, 10, 4, belly);
      rect(c, 8, 8, 16, 10, body); rect(c, 10, 14, 12, 4, belly);
      if (kind === 'cat') { px(c, 9, 7, body); px(c, 9, 6, dk); px(c, 22, 7, body); px(c, 22, 6, dk); }
      else { rect(c, 7, 9, 3, 6, dk); rect(c, 22, 9, 3, 6, dk); }
      px(c, 12, 11, '#2a2030'); px(c, 19, 11, '#2a2030'); px(c, 15, 14, '#c05a4a'); px(c, 16, 14, '#c05a4a');
      if (kind === 'cat') { rect(c, 14, 12, 4, 1, dk); }
      rect(c, 10, 22, 3, 4 - (legStep === 1 ? 1 : 0), dk); rect(c, 19, 22, 3, 4 - (legStep === -1 ? 1 : 0), dk);
      rect(c, 14, 22, 2, 4, body); rect(c, 14, 24, 2, 2, dk);
    } else {
      // side view (right)
      rect(c, 6, 13, 20, 9, body); rect(c, 8, 18, 14, 4, belly);
      rect(c, 22, 8, 7, 9, body); rect(c, 26, 8, 2, 4, dk);
      if (kind === 'cat') { px(c, 22, 6, body); px(c, 23, 6, body); px(c, 22, 5, dk); } else { rect(c, 23, 9, 3, 3, dk); px(c, 22, 10, body); }
      px(c, 26, 11, '#2a2030'); px(c, 28, 13, '#c05a4a');
      rect(c, 6, 8, 3, 6, body); px(c, 7, 6, body);  // tail hint
      const f = legStep === 1 ? 1 : 0, b = legStep === -1 ? 1 : 0;
      rect(c, 9, 22, 3, 4 - b, dk); rect(c, 20, 22, 3, 4 - f, dk);
      rect(c, 8, 22, 1, 2, body); rect(c, 19, 22, 1, 2, body);
    }
    if (kind === 'cat' && dir === 'side') { rect(c, 3, 5, 2, 6, body); }
    const out = outlined(cv, '#2b2a33');
    if (dir !== 'left') return out;
    const fl = mk(T, T), f2 = fl.getContext('2d'); f2.translate(T, 0); f2.scale(-1, 1); f2.drawImage(out, 0, 0); return fl;
  }

  // ------------------------------------------------------------------ objects (one image, replicated per cell)
  function objCell(key, frame) {
    const cv = mk(T, T), c = cv.getContext('2d');
    const r = rnd(G.util.hash('obj:' + key));
    if (key === 'obj_chest' || key === 'obj_chest_open') {
      const open = key === 'obj_chest_open';
      const wood = '#8a5a2e', wd = shade(wood, -0.3), wl = shade(wood, 0.2);
      if (!open) {
        rect(c, 4, 13, 24, 15, wood); rect(c, 4, 13, 24, 1, wl); rect(c, 4, 27, 24, 1, wd);
        rect(c, 4, 8, 24, 6, wood); rect(c, 4, 8, 24, 1, wl); rect(c, 4, 13, 24, 1, wd);
        for (let x = 6; x < 26; x += 6) rect(c, x, 9, 1, 5, wd);
        rect(c, 4, 16, 24, 2, P_.brass[0]); rect(c, 4, 16, 24, 1, P_.brassLt);
        rect(c, 14, 15, 4, 6, P_.brass[1]); rect(c, 15, 17, 2, 2, '#2a1a10');
        rect(c, 4, 13, 1, 15, wd); rect(c, 27, 13, 1, 15, wd);
      } else {
        rect(c, 4, 15, 24, 13, wood); rect(c, 4, 15, 24, 1, wl); rect(c, 4, 27, 24, 1, wd);
        rect(c, 5, 15, 22, 3, '#2a170c');
        rect(c, 4, 3, 24, 9, wood); rect(c, 4, 3, 24, 1, wl); rect(c, 4, 11, 24, 1, wd);
        rect(c, 4, 9, 24, 2, P_.brass[0]); rect(c, 14, 9, 4, 3, P_.brass[1]);
        rect(c, 5, 6, 22, 3, '#2a170c');
        for (let i = 0; i < 6; i++) { px(c, 8 + i * 3, 16 + (i % 2), P_.gold); px(c, 9 + i * 3, 16, '#fff3a0'); }
        addGlow(c, 16, 14, 13, 'rgba(255,220,120,0.35)', 1);
      }
    } else if (key === 'obj_sign') {
      rect(c, 15, 14, 2, 16, '#6b4424'); rect(c, 15, 14, 1, 16, '#8a5c34');
      rect(c, 5, 5, 22, 11, '#a6743f'); rect(c, 5, 5, 22, 1, '#c79a5a'); rect(c, 5, 15, 22, 1, '#5a3a1e');
      rect(c, 4, 5, 1, 11, '#5a3a1e'); rect(c, 26, 5, 1, 11, '#5a3a1e');
      for (let y = 8; y < 14; y += 3) rect(c, 8, y, 16, 1, '#4a2c17');
      px(c, 6, 7, '#3a2412'); px(c, 25, 7, '#3a2412');
    } else if (key === 'obj_crate') {
      paintCrate(c, r);
    } else if (key === 'obj_beacon') {
      rect(c, 10, 23, 12, 7, P_.iron[0]); rect(c, 10, 23, 12, 1, P_.iron[1]);
      rect(c, 14, 9, 4, 15, P_.iron[1]); rect(c, 14, 9, 1, 15, '#7d8494');
      rect(c, 12, 5, 8, 5, P_.brass[0]); rect(c, 13, 6, 6, 3, '#ffe89a'); rect(c, 15, 1, 2, 4, P_.iron[2]);
      px(c, 15, 0, '#ff6b6b');
      for (let y = 12; y < 22; y += 4) rect(c, 14, y, 4, 1, P_.brass[1]);
      addGlow(c, 16, 7, 12 + (frame | 0) % 2, 'rgba(255,220,130,' + (0.45 + 0.1 * ((frame | 0) % 2)).toFixed(2) + ')', 1);
    } else if (key === 'obj_marigold_wheel') {
      const cx = 16, cy = 16, R = 12;
      for (let y = -R; y <= R; y++) for (let x = -R; x <= R; x++) {
        const d = Math.sqrt(x * x + y * y);
        if (d > R || d < R - 3) continue;
        px(c, cx + x, cy + y, d > R - 1 ? P_.brass[2] : P_.brass[0]);
      }
      for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; for (let t = 3; t < R - 2; t++) px(c, Math.round(cx + Math.cos(a) * t), Math.round(cy + Math.sin(a) * t), P_.brass[1]); }
      for (let y = -3; y <= 3; y++) for (let x = -3; x <= 3; x++) if (x * x + y * y <= 9) px(c, cx + x, cy + y, P_.brassLt);
      px(c, cx, cy, '#5a3a1e');
      // little pegs
      for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + Math.PI / 8; px(c, Math.round(cx + Math.cos(a) * (R + 1)), Math.round(cy + Math.sin(a) * (R + 1)), '#8a5c34'); }
    } else if (key === 'obj_lamp') {
      paintLampPost(c, r, frame | 0);
    } else {
      // unknown object key: small grey placeholder block
      rect(c, 8, 8, 16, 16, '#6a6a78'); rect(c, 8, 8, 16, 1, '#9a9aa8');
    }
    const outCol = key === 'obj_lamp' ? '#1a1d24' : '#2b2a33';
    return outlined(cv, outCol);
  }
  const OBJECT_KEYS = ['obj_chest', 'obj_chest_open', 'obj_lamp', 'obj_sign', 'obj_beacon', 'obj_crate', 'obj_marigold_wheel'];
  const CHAR_ORDER = ['down', 'left', 'right', 'up'];

  // ------------------------------------------------------------------ sheet cache
  const sheetCache = new Map();
  function buildSheet(key) {
    const sh = mk(96, 128), c = sh.getContext('2d');
    const isObj = OBJECT_KEYS.indexOf(key) >= 0;
    const isAnimal = key === 'cat' || key === 'dog';
    const S = CHARS[key] || CHARS.__placeholder;
    for (let row = 0; row < 4; row++) {
      const dir = CHAR_ORDER[row];
      for (let col = 0; col < 3; col++) {
        let cell;
        if (isObj) cell = objCell(key, col);
        else if (isAnimal) cell = animalCell(key, dir, col);
        else cell = charCell(S, dir, col);
        c.drawImage(cell, col * T, row * T);
      }
    }
    return sh;
  }
  function charSheet(key) {
    const k = String(key);
    let sh = sheetCache.get(k);
    if (!sh) { sh = buildSheet(k); sheetCache.set(k, sh); }
    return sh;
  }
  const DIR_ROW = { down: 0, left: 1, right: 2, up: 3 };
  function drawChar(ctx, key, dir, frame, x, y) {
    try {
      const sh = charSheet(key);
      const row = DIR_ROW[dir] != null ? DIR_ROW[dir] : 0;
      const col = Math.max(0, Math.min(2, frame | 0));
      ctx.drawImage(sh, col * T, row * T, T, T, x | 0, y | 0, T, T);
    } catch (e) { /* never throw from art */ }
  }
  G.gfx.charSheet = function (key) { return charSheet(key); };
  G.gfx.drawChar = drawChar;
  G.gfx.charKeys = function () { return Object.keys(CHARS).filter((k) => k !== '__placeholder').concat(['cat', 'dog'], OBJECT_KEYS); };
  // ------------------------------------------------------------------ glow & emotes
  // additive radial light centred at x,y (canvas coords)
  function glow(ctx, x, y, radius, color, alpha) {
    const r = Math.max(1, radius | 0);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color || 'rgba(255,200,120,1)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = alpha == null ? 0.6 : alpha;
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
    ctx.restore();
  }
  G.gfx.glow = glow;

  const EMOTE_LEN = 40;
  function heartPath(ctx, cx, cy, s) {
    ctx.beginPath();
    ctx.moveTo(cx, cy + s * 0.9);
    ctx.bezierCurveTo(cx - s * 1.4, cy, cx - s * 0.7, cy - s * 1.1, cx, cy - s * 0.35);
    ctx.bezierCurveTo(cx + s * 0.7, cy - s * 1.1, cx + s * 1.4, cy, cx, cy + s * 0.9);
    ctx.closePath();
  }
  function drawBubbleBody(ctx, cx, cy, w, h) {
    // pixel-ish rounded white bubble with dark outline and a tail
    const x = Math.round(cx - w / 2), y = Math.round(cy - h / 2);
    ctx.fillStyle = '#2b2a33';
    ctx.fillRect(x + 2, y - 1, w - 4, h + 2); ctx.fillRect(x - 1, y + 2, w + 2, h - 4); ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + 2, y + 1, w - 4, h - 2); ctx.fillRect(x + 1, y + 2, w - 2, h - 4);
    ctx.fillStyle = '#e8e4f4';
    ctx.fillRect(x + 2, y + h - 3, w - 4, 1);
    // tail
    const tx = Math.round(cx);
    ctx.fillStyle = '#2b2a33';
    ctx.fillRect(tx - 3, y + h, 6, 1); ctx.fillRect(tx - 2, y + h + 1, 4, 1); ctx.fillRect(tx - 1, y + h + 2, 2, 1);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(tx - 2, y + h, 4, 1); ctx.fillRect(tx - 1, y + h + 1, 2, 1);
  }
  function drawEmote(ctx, kind, x, y, t) {
    try {
      t = t || 0;
      if (t < 0 || t > EMOTE_LEN + 4) return;
      // pop-in with overshoot, hold, fade out in last 10 frames
      let s = 1;
      if (t < 6) s = 0.2 + 0.8 * (1 - Math.pow(1 - t / 6, 3)) + (t < 4 ? 0.12 * Math.sin((t / 4) * Math.PI) : 0);
      else if (t < 10) s = 1.08 - 0.08 * ((t - 6) / 4);
      const alpha = t > EMOTE_LEN - 10 ? Math.max(0, (EMOTE_LEN - t) / 10) : 1;
      const bob = Math.round(Math.sin(t * 0.25) * 1.2);
      const w = 22, h = 18;
      const cx = Math.round(x), cy = Math.round(y - 14 - bob);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(cx, cy + h / 2);
      ctx.scale(s, s);
      ctx.translate(-cx, -(cy + h / 2));
      const bx = cx, by = cy;
      drawBubbleBody(ctx, bx, by, w, h);
      const k = (kind || '').toLowerCase();
      if (k === 'heart') {
        ctx.fillStyle = '#2b2a33'; heartPath(ctx, bx, by + 1, 6.4); ctx.lineWidth = 1; ctx.strokeStyle = '#2b2a33'; ctx.stroke();
        ctx.fillStyle = '#ff4f7a'; heartPath(ctx, bx, by + 0.5, 5.4); ctx.fill();
        ctx.fillStyle = '#ffd0dc'; ctx.fillRect(bx - 4, by - 3, 2, 2);
      } else if (k === 'exclaim') {
        ctx.fillStyle = '#e0302a'; ctx.fillRect(bx - 2, by - 6, 4, 9); ctx.fillRect(bx - 2, by + 5, 4, 3);
      } else if (k === 'question') {
        ctx.fillStyle = '#2a6fd0'; ctx.font = 'bold 14px "Trebuchet MS",Arial,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('?', bx, by + 1);
      } else if (k === 'sweat') {
        ctx.fillStyle = '#7fc8ff'; heartPath(ctx, bx + 1, by + 1, 0); ctx.beginPath(); ctx.moveTo(bx, by - 6); ctx.quadraticCurveTo(bx + 5, by + 1, bx + 3, by + 4); ctx.quadraticCurveTo(bx, by + 7, bx - 3, by + 4); ctx.quadraticCurveTo(bx - 5, by + 1, bx, by - 6); ctx.fill();
        ctx.fillStyle = '#ffffff'; ctx.fillRect(bx - 2, by + 1, 1, 2);
      } else if (k === 'music') {
        ctx.fillStyle = '#2a2030';
        ctx.fillRect(bx - 1, by - 6, 2, 8); ctx.fillRect(bx + 3, by - 7, 2, 8);
        ctx.fillRect(bx - 1, by - 7, 6, 2);
        ctx.beginPath(); ctx.arc(bx - 3, by + 2, 2.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(bx + 5, by + 1, 2.5, 0, Math.PI * 2); ctx.fill();
      } else if (k === 'dots') {
        const phase = Math.floor(t / 6) % 4;
        for (let i = 0; i < 3; i++) { ctx.fillStyle = i < phase ? '#2a2030' : '#b8b4c8'; ctx.fillRect(bx - 6 + i * 5, by - 1, 3, 3); }
      } else if (k === 'anger') {
        ctx.strokeStyle = '#d03030'; ctx.lineWidth = 2;
        for (let i = 0; i < 4; i++) {
          const a = i * Math.PI / 2 + Math.PI / 4;
          ctx.beginPath(); ctx.moveTo(bx + Math.cos(a) * 3, by + Math.sin(a) * 3); ctx.lineTo(bx + Math.cos(a) * 6.5, by + Math.sin(a) * 6.5); ctx.stroke();
        }
        ctx.fillStyle = '#d03030'; ctx.fillRect(bx - 1, by - 1, 2, 2);
      } else if (k === 'bulb') {
        ctx.fillStyle = '#ffe066'; ctx.beginPath(); ctx.arc(bx, by - 1, 5, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#8a6a10'; ctx.lineWidth = 1; ctx.stroke();
        ctx.fillStyle = '#b8a040'; ctx.fillRect(bx - 2, by + 4, 4, 2);
        ctx.fillStyle = '#fffbe0'; ctx.fillRect(bx - 3, by - 4, 2, 2);
        glow(ctx, bx, by - 1, 10, 'rgba(255,230,120,0.6)', 0.6);
      } else {
        // unknown kind: plain dot
        ctx.fillStyle = '#2a2030'; ctx.fillRect(bx - 1, by - 1, 2, 2);
      }
      ctx.restore();
    } catch (e) { /* art must never throw */ }
  }
  G.gfx.drawEmote = drawEmote;
  G.gfx.EMOTE_LEN = EMOTE_LEN;

  // ================================================================== WORLD-SPACE GROUND
  // Used by map.js when it pre-renders a chunk (cached per chunk, never per frame):
  //   G.gfx.paintGround(g, def, tx, ty, px, py, ch)  one ground tile (base + edge blends) into the chunk canvas
  //   G.gfx.paintShadows(g, def, tx0, ty0, tw, th)    object shadows for a chunk, drawn after all its ground
  //   G.gfx.drawShore(ctx, def, tx, ty, sx, sy, frame) live foam on an animated water tile (cached blits)
  // Grass/moss/void are painted per pixel from WORLD coordinates, so they never repeat or seam.
  // Blends are written into a 32x32 pixel buffer per tile (one putImageData per tile).

  // deterministic world-space hash -> [0,1) and smooth value noise -> [0,1)
  function wh(x, y, s) {
    let h = Math.imul((x | 0) ^ Math.imul(s | 0, 0x9E3779B1), 0x85EBCA6B) ^ Math.imul((y | 0) + Math.imul(s | 0, 31), 0xC2B2AE35);
    h ^= h >>> 15; h = Math.imul(h, 0x2C1B3C6D); h ^= h >>> 12; h = Math.imul(h, 0x297A2D39); h ^= h >>> 15;
    return (h >>> 0) / 4294967296;
  }
  function vnoise(x, y, s) {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = wh(xi, yi, s), b = wh(xi + 1, yi, s), c = wh(xi, yi + 1, s), d = wh(xi + 1, yi + 1, s);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  // 32x32 RGBA buffer filled per pixel; fn(worldX, worldY, out[3])
  function pixelBuf(tx, ty, fn) {
    const buf = new Uint8ClampedArray(T * T * 4), o = [0, 0, 0];
    for (let j = 0; j < T; j++) for (let i = 0; i < T; i++) {
      fn(tx * T + i, ty * T + j, o);
      const k = (j * T + i) << 2;
      buf[k] = o[0]; buf[k + 1] = o[1]; buf[k + 2] = o[2]; buf[k + 3] = 255;
    }
    return buf;
  }
  function putBuf(c, buf) { c.putImageData(new ImageData(buf, T, T), 0, 0); }
  function pset(buf, k, c) { buf[k] = c[0]; buf[k + 1] = c[1]; buf[k + 2] = c[2]; buf[k + 3] = 255; }
  // raw pixels of a painted (non-procedural-per-pixel) tile, cached per char
  const tileRaw = new Map();
  function tileBuf(ch) {
    let b = tileRaw.get(ch);
    if (!b) { const s = mk(T, T).getContext('2d'); s.drawImage(tileFor(ch, 0), 0, 0); b = s.getImageData(0, 0, T, T).data; tileRaw.set(ch, b); }
    return b;
  }

  const GR = { base: hex2rgb('#5fa84a'), lt: hex2rgb('#6fb856'), dk: hex2rgb('#4f9a3e'), hiL: hex2rgb('#9ad46e'), hiD: hex2rgb('#3f7f35') };
  const MO = { base: hex2rgb('#4d6b33'), lt: hex2rgb('#5a7a3a'), dk: hex2rgb('#3e5a2a'), ivy: hex2rgb('#6e9440'), ivyD: hex2rgb('#3f6a32'), leaf: hex2rgb('#86b054'), hiL: hex2rgb('#6e8a48'), hiD: hex2rgb('#2f4520') };
  const FLOWERS = ['#fff6c8', '#ffe066', '#ffffff', '#ffb3c6', '#c9a7ff'].map(hex2rgb);
  const FL_CORE = hex2rgb('#e0a030'), FL_STEM = hex2rgb('#3f7f35'), VIOLET = hex2rgb('#7a4fd0');

  // two-tone grass: macro patches, speckle, and tufts of two blades per 5x5 world cell (cell-aligned => seamless)
  function grassPx(x, y, o) {
    const n = vnoise(x / 6.5, y / 6.5, 1);
    let c = n > 0.64 ? GR.lt : n < 0.36 ? GR.dk : GR.base;
    if (n > 0.6 && n <= 0.64 && wh(x, y, 3) < 0.5) c = GR.base;       // dithered patch edges
    else if (n >= 0.36 && n < 0.4 && wh(x, y, 3) < 0.5) c = GR.dk;
    const s = wh(x, y, 2);
    if (s < 0.045) c = GR.hiD; else if (s > 0.975) c = GR.hiL;
    const cx = Math.floor(x / 5), cy = Math.floor(y / 5);
    if (wh(cx, cy, 4) < 0.45) {
      for (let k = 0; k < 2; k++) {
        const bx = cx * 5 + Math.floor(wh(cx, cy, 10 + k) * 5), by = cy * 5 + 1 + Math.floor(wh(cx, cy, 20 + k) * 4);
        if (x === bx && (y === by || y === by - 1)) c = y === by - 1 ? GR.hiL : GR.hiD;
      }
    }
    o[0] = c[0]; o[1] = c[1]; o[2] = c[2];
  }
  // overgrown moss: olive mats, thin ivy runners with leaves, darker ivy patches
  function mossPx(x, y, o) {
    const n = vnoise(x / 5, y / 5, 5);
    let c = n > 0.66 ? MO.lt : n < 0.34 ? MO.dk : MO.base;
    const p = vnoise(x / 9, y / 9, 11);
    if (p > 0.7 && (p > 0.745 || wh(x, y, 12) < 0.5)) c = MO.ivyD;
    const iv = vnoise(x / 3, y / 2.2, 7);
    if (Math.abs(iv - 0.5) < 0.035) c = MO.ivy;
    if ((c === MO.ivy || c === MO.ivyD) && wh(x >> 1, y >> 1, 9) < 0.3) c = MO.leaf;
    const s = wh(x, y, 2);
    if (s < 0.05) c = MO.hiD; else if (s > 0.97) c = MO.hiL;
    o[0] = c[0]; o[1] = c[1]; o[2] = c[2];
  }
  // night sky for the void tile: deep blue, soft cloud banks, sparse stars
  function voidPx(x, y, o) {
    const cl = vnoise(x / 40, y / 28, 21) * 0.7 + vnoise(x / 11, y / 8, 23) * 0.3;
    const k = Math.max(0, cl - 0.45);
    o[0] = 9 + k * 46; o[1] = 13 + k * 50; o[2] = 38 + k * 84;
    const s = wh(x, y, 31);
    if (s > 0.9978) {
      const b = 0.5 + 0.5 * wh(x, y, 32);
      o[0] = 120 + 120 * b; o[1] = 128 + 110 * b; o[2] = 180 + 75 * b;
      if (s > 0.9995) { o[0] = 255; o[1] = 255; o[2] = 255; }
    }
  }
  // small flowers scattered on a ',' tile (per tile, kept inside the tile so nothing seams)
  function flowersOn(buf, tx, ty) {
    const n = 5 + Math.floor(wh(tx, ty, 41) * 4);
    for (let i = 0; i < n; i++) {
      const x = 3 + Math.floor(wh(tx, ty, 50 + i) * 24), y = 3 + Math.floor(wh(tx, ty, 80 + i) * 24);
      const col = FLOWERS[Math.floor(wh(tx, ty, 110 + i) * FLOWERS.length)];
      pset(buf, (y * T + x) << 2, FL_CORE);
      pset(buf, (y * T + x - 1) << 2, col); pset(buf, (y * T + x + 1) << 2, col);
      pset(buf, ((y - 1) * T + x) << 2, col); pset(buf, ((y + 1) * T + x) << 2, FL_STEM);
    }
  }

  // ground kinds. rank: a higher-rank kind spills its colour over its lower-rank neighbours.
  // style 'r' = ragged natural edge (2-4px), 's' = straight built edge (2px).
  const KIND = {};
  function kindDef(chars, k, rank, style, pal, bank) {
    const rgb = pal.map(hex2rgb);
    const def = { k, rank, style, pal: rgb, rim: hex2rgb(shade(pal[0], -0.32)), bank: hex2rgb(bank) };
    for (const ch of chars) KIND[ch] = def;
  }
  kindDef('.,', 'grass', 5, 'r', ['#5fa84a', '#4f9a3e', '#6fb856'], '#33502c');
  kindDef('v', 'moss', 6, 'r', ['#4d6b33', '#3e5a2a', '#5a7a3a'], '#243a1e');
  kindDef('_', 'sand', 7, 'r', P_.sand, '#a88a55');
  kindDef('h', 'hollow', 9, 'r', ['#2a1f3a', '#352848', '#1d1528'], '#120c1c');
  kindDef('y', 'ash', 3, 'r', P_.ash, '#4a4950');
  kindDef('a', 'arena', 4, 's', P_.arena, '#a88550');
  kindDef(':', 'dirt', 2, 'r', P_.dirt, '#5a3f24');
  kindDef('=l', 'cobble', 2, 's', P_.cobble, '#4e4d55');
  kindDef('t', 'stone', 2, 's', P_.stone, '#6f6e78');
  kindDef('g', 'marble', 2, 's', P_.marble, '#b9aa86');
  kindDef('m', 'metal', 2, 's', P_.iron, '#2a2d36');
  kindDef('f', 'wood', 1, 's', P_.woodFloor, '#4a2d18');
  kindDef('j', 'deck', 1, 's', P_.deck, '#4a2d18');
  kindDef('k', 'cave', 1, 'r', P_.cave, '#2c2b3a');
  kindDef('b', 'bridge', 1, 's', P_.woodFloor, '#2a1e14');
  kindDef('c', 'carpet', 4, 's', P_.carpet, '#5a1620');
  const WET = { '~': 1, 'w': 1 };

  // buffer index of depth d (0 = the tile's edge) at offset p along a side (N E S W)
  function sideIdx(side, p, d) {
    const x = side === 'W' ? d : side === 'E' ? T - 1 - d : p;
    const y = side === 'N' ? d : side === 'S' ? T - 1 - d : p;
    return (y * T + x) << 2;
  }
  function alongOf(side, tx, ty, p) { return (side === 'N' || side === 'S') ? tx * T + p : ty * T + p; }
  function edgeDepth(style, along) {
    if (style === 's') return 2;
    return 2 + Math.floor(vnoise(along / 3.2, 0.5, 13) * 2.99);       // 2..4 px, varies smoothly along the world edge
  }
  function spillSide(buf, nk, kd, side, tx, ty) {
    for (let p = 0; p < T; p++) {
      const a = alongOf(side, tx, ty, p), D = edgeDepth(nk.style, a);
      for (let d = 0; d < D; d++) {
        if (d === D - 1 && wh(a, d, 5) < 0.45) continue;                 // dithered last row = ragged
        let c = nk.pal[Math.floor(wh(a, d, 4) * nk.pal.length)];
        if (nk.k === 'hollow' && wh(a, d, 6) < 0.12) c = VIOLET;
        pset(buf, sideIdx(side, p, d), c);
      }
      pset(buf, sideIdx(side, p, D), kd.rim);                             // the lower terrain's dark rim
    }
  }
  function rimSide(buf, kd, side) {
    for (let p = 0; p < T; p++) pset(buf, sideIdx(side, p, 0), kd.rim);  // equal-rank seam
  }
  function bankSide(buf, kd, side, tx, ty) {                              // land beside water: darker wet soil
    for (let p = 0; p < T; p++) {
      const a = alongOf(side, tx, ty, p), D = 2 + Math.floor(vnoise(a / 2.7, 0.5, 17) * 2.99);
      for (let d = 0; d < D; d++) {
        if (d === D - 1 && wh(a, d, 19) < 0.4) continue;
        pset(buf, sideIdx(side, p, d), kd.bank);
      }
    }
  }
  function cornerBlob(buf, nk, cx, cy, tx, ty) {                          // only a diagonal neighbour is higher
    for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) {
      const r2 = i * i + j * j;
      if (r2 > 13) continue;
      if (r2 > 9 && wh(tx * T + i, ty * T + j, 23) < 0.5) continue;
      const x = cx ? T - 1 - i : i, y = cy ? T - 1 - j : j;
      pset(buf, (y * T + x) << 2, nk.pal[Math.floor(wh(tx * T + i, ty * T + j, 4) * nk.pal.length)]);
    }
  }
  function nbrCh(def, x, y) { return (x < 0 || y < 0 || x >= def.w || y >= def.h) ? null : def.ground[y][x]; }
  function higherThan(c, kd) { const k = c ? KIND[c] : null; return !!k && k.k !== kd.k && k.rank > kd.rank; }

  let groundWarned = false;
  function paintGround(g, def, tx, ty, px, py, ch) {
    try {
      let buf;
      if (ch === 'q') buf = pixelBuf(tx, ty, voidPx);
      else if (ch === '.' || ch === ',') { buf = pixelBuf(tx, ty, grassPx); if (ch === ',') flowersOn(buf, tx, ty); }
      else if (ch === 'v') buf = pixelBuf(tx, ty, mossPx);
      else buf = new Uint8ClampedArray(tileBuf(ch));
      const kd = KIND[ch];
      if (kd) {
        const nb = { N: nbrCh(def, tx, ty - 1), E: nbrCh(def, tx + 1, ty), S: nbrCh(def, tx, ty + 1), W: nbrCh(def, tx - 1, ty) };
        for (const side of ['N', 'E', 'S', 'W']) {
          const c = nb[side];
          if (!c) continue;
          if (WET[c]) { bankSide(buf, kd, side, tx, ty); continue; }
          const nk = KIND[c];
          if (!nk || nk.k === kd.k) continue;
          if (nk.rank > kd.rank) spillSide(buf, nk, kd, side, tx, ty);
          else if (nk.rank === kd.rank) rimSide(buf, kd, side);
        }
        // [diagonal x, diagonal y, side A, side B, corner quadrant x, quadrant y]
        const CORNERS = [[tx + 1, ty - 1, 'N', 'E', 1, 0], [tx - 1, ty - 1, 'N', 'W', 0, 0], [tx + 1, ty + 1, 'S', 'E', 1, 1], [tx - 1, ty + 1, 'S', 'W', 0, 1]];
        for (const [x, y, sa, sb, cx, cy] of CORNERS) {
          const nk = KIND[nbrCh(def, x, y)];
          if (!nk || nk.k === kd.k || nk.rank <= kd.rank) continue;
          if (higherThan(nb[sa], kd) || higherThan(nb[sb], kd)) continue;
          cornerBlob(buf, nk, cx, cy, tx, ty);
        }
      }
      g.putImageData(new ImageData(buf, T, T), px, py);
    } catch (err) {
      if (!groundWarned) { groundWarned = true; console.warn('[gfx] paintGround failed; using plain tile', err); }
      g.drawImage(tileFor(ch, 0), px, py);
    }
  }

  // ---- shadows: soft ellipses under objects; buildings throw a band south (in front of the facade) and a thin one east
  const SHADOW = {  // char: [centre x, centre y, rx, ry, alpha] in tile pixels
    T: [20, 27, 12, 4.5, 0.34], N: [19, 28, 9, 3.8, 0.32], d: [17, 28, 7, 3, 0.22], B: [18, 26, 12.5, 4.5, 0.3],
    R: [17, 26, 12, 4.2, 0.36], '+': [18, 28, 8, 2.8, 0.25], i: [16, 26, 8, 3, 0.22], s: [16, 28, 9, 3, 0.3],
    o: [17, 27, 13, 4.5, 0.32], Q: [16, 28, 7, 2.6, 0.28], L: [17, 28, 5, 2, 0.3], M: [16, 27, 13.5, 4, 0.32],
    J: [16, 27, 12, 4, 0.32], e: [16, 27, 13, 4, 0.3], r: [16, 27, 10, 3, 0.26], U: [17, 28, 6, 2.4, 0.28],
    C: [16, 28, 9, 3, 0.28], E: [16, 28, 10, 3, 0.24], H: [16, 28, 6, 2, 0.22], Z: [16, 28, 12, 3.5, 0.26],
    I: [16, 28, 12, 3.4, 0.3], x: [16, 29, 12, 1.8, 0.2],
  };
  const BUILD = { W: 1, X: 1, O: 1, '7': 1, '8': 1, '9': 1, A: 1, '1': 1, '2': 1, '3': 1, '4': 1, '5': 1, '6': 1 };
  function objAt(def, x, y) { return (x < 0 || y < 0 || x >= def.w || y >= def.h) ? ' ' : def.objects[y][x]; }
  function ellipseShadow(g, x, y, rx, ry, a) {
    g.translate(x, y); g.scale(rx, ry);
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, 1);
    a = Math.min(0.62, a * 1.75);                                    // soft but readable on bright grass
    gr.addColorStop(0, 'rgba(6,8,14,' + a + ')'); gr.addColorStop(0.6, 'rgba(6,8,14,' + (a * 0.7) + ')'); gr.addColorStop(1, 'rgba(6,8,14,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 1, 0, Math.PI * 2); g.fill();
  }
  let shadowWarned = false;
  function paintShadows(g, def, tx0, ty0, tw, th) {
    try {
      for (let ty = ty0 - 2; ty < ty0 + th + 2; ty++) for (let tx = tx0 - 2; tx < tx0 + tw + 2; tx++) {
        const o = objAt(def, tx, ty);
        if (!o || o === ' ') continue;
        const ox = (tx - tx0) * T, oy = (ty - ty0) * T;
        const s = SHADOW[o];
        if (s) { g.save(); g.translate(ox, oy); ellipseShadow(g, s[0], s[1], s[2], s[3], s[4]); g.restore(); }
        if (BUILD[o]) {
          if (!BUILD[objAt(def, tx, ty + 1)]) {
            const gy = oy + T, gr = g.createLinearGradient(0, gy, 0, gy + 8);
            gr.addColorStop(0, 'rgba(8,6,16,0.55)'); gr.addColorStop(1, 'rgba(8,6,16,0)');
            g.fillStyle = gr; g.fillRect(ox, gy, T, 8);
          }
          if (!BUILD[objAt(def, tx + 1, ty)]) {
            const gx = ox + T, gr = g.createLinearGradient(gx, 0, gx + 4, 0);
            gr.addColorStop(0, 'rgba(8,6,16,0.42)'); gr.addColorStop(1, 'rgba(8,6,16,0)');
            g.fillStyle = gr; g.fillRect(gx, oy, 4, T);
          }
        }
      }
    } catch (err) {
      if (!shadowWarned) { shadowWarned = true; console.warn('[gfx] paintShadows failed', err); }
    }
  }

  // ---- shorelines: foam on the water side, drawn live over the animated water (cached per shape/frame)
  const SHORE = new Map();
  const SIDE_BIT = { N: 1, E: 2, S: 4, W: 8 };
  function buildShore(mask, shallow, frame, v) {
    const buf = new Uint8ClampedArray(T * T * 4);
    const hi = hex2rgb(shallow ? '#e4f7f2' : '#eefaff'), mid = hex2rgb(shallow ? '#a9dcd6' : '#b9e4f7');
    for (const side of ['N', 'E', 'S', 'W']) {
      if (!(mask & SIDE_BIT[side])) continue;
      for (let p = 0; p < T; p++) {
        const D = ((p + frame * 2) & 7) < 4 ? 2 : 1;             // period 8 divides the tile: continuous along the shore
        for (let d = 0; d < D; d++) pset(buf, sideIdx(side, p, d), d === 0 ? hi : mid);
        if (wh(p, frame * 5 + SIDE_BIT[side], 61 + v) < 0.1) pset(buf, sideIdx(side, p, D), hi);   // glints
      }
    }
    const cv = mk(T, T);
    cv.getContext('2d').putImageData(new ImageData(buf, T, T), 0, 0);
    return cv;
  }
  let shoreWarned = false;
  function drawShore(ctx, def, tx, ty, sx, sy, frame) {
    try {
      const ch = def.ground[ty][tx];
      if (!WET[ch]) return;
      let mask = 0;
      if (KIND[nbrCh(def, tx, ty - 1)]) mask |= 1;
      if (KIND[nbrCh(def, tx + 1, ty)]) mask |= 2;
      if (KIND[nbrCh(def, tx, ty + 1)]) mask |= 4;
      if (KIND[nbrCh(def, tx - 1, ty)]) mask |= 8;
      if (!mask) return;
      const f = frame & 3, v = (tx * 7 + ty * 13) & 3;
      const key = ((((ch === 'w' ? 16 : 0) | mask) * 4 + f) * 4) + v;
      let cv = SHORE.get(key);
      if (!cv) { cv = buildShore(mask, ch === 'w', f, v); SHORE.set(key, cv); }
      ctx.drawImage(cv, sx, sy);
    } catch (err) {
      if (!shoreWarned) { shoreWarned = true; console.warn('[gfx] drawShore failed', err); }
    }
  }
  G.gfx.paintGround = paintGround;
  G.gfx.paintShadows = paintShadows;
  G.gfx.drawShore = drawShore;

  // ------------------------------------------------------------------ misc
  G.gfx.clearCaches = function () { tileCache.clear(); sheetCache.clear(); tileRaw.clear(); SHORE.clear(); };
  G.provide('gfx_world');
})();
