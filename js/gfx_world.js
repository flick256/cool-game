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
  PAINT.canopy_ground = null; // placeholder (not a tile)

  G.gfx._PAINT = PAINT; G.gfx._P = P_; G.gfx._internal = { mk, px, rect, rnd, hex2rgb, rgb2hex, shade, mix, speckle, dither, vgrad, outlined, addGlow, T };
  /*__PART2__*/
})();
