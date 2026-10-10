/* =====================================================================
 * LANTERNBOUND — gfx_ui.js  (owner: gfx-ui)
 * G.gfx: RPG-Maker style windows, outlined text, gauges, cursor, pips,
 * a vector icon set, cached portraits (144x192) and faces (48x48),
 * the animated title backdrop + logo, menu backdrop, heart meter.
 * Everything is procedural and cached; nothing is generated per frame
 * except cheap blits and a few gradients.
 * ===================================================================== */
(function () {
  'use strict';
  const G = (window.G = window.G || {});
  G.gfx = G.gfx || {};

  const PI2 = Math.PI * 2;
  const FONT = '"Trebuchet MS","Segoe UI",Arial,sans-serif';
  const SERIF = 'Georgia,"Palatino Linotype","Book Antiqua",serif';
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const mk = (w, h) => G.util.canvas(w, h);

  // ------------------------------------------------------------ colour helpers
  function rgbOf(c) { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function hexOf(r, g, b) {
    return '#' + [r, g, b].map((v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('');
  }
  function mixc(a, b, t) {
    const A = rgbOf(a), B = rgbOf(b);
    return hexOf(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t);
  }
  const lite = (c, t) => mixc(c, '#ffffff', t);
  // shade(c, -0.4) darkens, shade(c, 0.4) lightens
  const shade = (c, t) => (t < 0 ? mixc(c, '#000000', -t) : mixc(c, '#ffffff', t));

  function lg(g, x0, y0, x1, y1, stops) {
    const gr = g.createLinearGradient(x0, y0, x1, y1);
    for (const s of stops) gr.addColorStop(s[0], s[1]);
    return gr;
  }
  function rg(g, x0, y0, r0, x1, y1, r1, stops) {
    const gr = g.createRadialGradient(x0, y0, Math.max(0, r0), x1, y1, Math.max(0.01, r1));
    for (const s of stops) gr.addColorStop(s[0], s[1]);
    return gr;
  }

  // ------------------------------------------------------------ path helpers
  // rounded-rect path (no beginPath)
  function rrp(g, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }
  function rr(g, x, y, w, h, r) { g.beginPath(); rrp(g, x, y, w, h, r); }
  // fill (+ optional outline) a path built by pathFn (pathFn must not call beginPath)
  function paint(g, pathFn, fill, stroke, lw) {
    g.beginPath(); pathFn(g);
    if (fill) { g.fillStyle = fill; g.fill(); }
    if (stroke) { g.lineWidth = lw || 2; g.strokeStyle = stroke; g.stroke(); }
  }
  function clipped(g, pathFn, fn) {
    g.save(); g.beginPath(); pathFn(g); g.clip(); fn(); g.restore();
  }
  // draw fn on the left side, then mirrored around cx
  function sym(g, cx, fn) {
    fn(g);
    g.save(); g.translate(2 * cx, 0); g.scale(-1, 1); fn(g); g.restore();
  }
  // zig-zag line from the current point to (x1,y1)
  function waveTo(g, x0, y0, x1, y1, n, amp) {
    for (let i = 1; i <= n; i++) {
      const t0 = (i - 0.5) / n, t1 = i / n;
      g.quadraticCurveTo(x0 + (x1 - x0) * t0 + (i % 2 ? amp : -amp), y0 + (y1 - y0) * t0,
        x0 + (x1 - x0) * t1, y0 + (y1 - y0) * t1);
    }
  }
  function streaks(g, rng, n, x0, y0, x1, y1, col, alpha, len) {
    g.save(); g.strokeStyle = col; g.globalAlpha = alpha; g.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const x = x0 + rng() * (x1 - x0), y = y0 + rng() * (y1 - y0);
      const L = (len || 14) * (0.5 + rng());
      g.lineWidth = 0.7 + rng() * 1.1;
      g.beginPath(); g.moveTo(x, y);
      g.quadraticCurveTo(x + (rng() - 0.5) * 3, y + L * 0.5, x + (rng() - 0.5) * 4, y + L);
      g.stroke();
    }
    g.restore();
  }
  function drop(g, x, y, s, fill) {
    paint(g, (g) => {
      g.moveTo(x, y - s);
      g.bezierCurveTo(x + s * 0.7, y - s * 0.2, x + s * 0.8, y + s * 0.5, x, y + s * 0.8);
      g.bezierCurveTo(x - s * 0.8, y + s * 0.5, x - s * 0.7, y - s * 0.2, x, y - s);
    }, fill, '#1a2a4a', 1);
  }

  // ------------------------------------------------------------ text
  let measureCtx = null;
  function mctx(size, bold) {
    if (!measureCtx) measureCtx = mk(4, 4).getContext('2d');
    measureCtx.font = (bold ? 'bold ' : '') + size + 'px ' + FONT;
    return measureCtx;
  }
  function textWidth(str, size, bold) {
    size = size || 16;
    const c = mctx(size, bold);
    let w = 0;
    String(str).split('\n').forEach((l) => { w = Math.max(w, c.measureText(l).width); });
    return Math.ceil(w);
  }
  function wrap(str, maxWidth, size, bold) {
    size = size || 16;
    const c = mctx(size, bold);
    const out = [];
    String(str).split('\n').forEach((par) => {
      const words = par.split(' ');
      let line = '';
      for (const wd of words) {
        const cand = line ? line + ' ' + wd : wd;
        if (c.measureText(cand).width <= maxWidth) { line = cand; continue; }
        if (line) out.push(line);
        let w2 = wd;
        while (c.measureText(w2).width > maxWidth && w2.length > 1) {
          let k = w2.length - 1;
          while (k > 1 && c.measureText(w2.slice(0, k)).width > maxWidth) k--;
          out.push(w2.slice(0, k));
          w2 = w2.slice(k);
        }
        line = w2;
      }
      out.push(line);
    });
    return out;
  }
  function text(ctx, str, x, y, opts) {
    opts = opts || {};
    const size = opts.size || 16, lh = Math.round(size * 1.3);
    const lines = opts.maxWidth ? wrap(str, opts.maxWidth, size, opts.bold) : String(str).split('\n');
    const ow = opts.outline === false ? 0 : Math.max(2, Math.round(size / 8));
    ctx.save();
    ctx.font = (opts.bold ? 'bold ' : '') + size + 'px ' + FONT;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    ctx.lineJoin = 'round';
    const align = opts.align || 'left';
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      const w = ctx.measureText(l).width;
      const dx = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
      const px = Math.round(dx), py = Math.round(y + i * lh);
      if (opts.shadow) { ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillText(l, px + 2, py + 2); }
      if (ow) { ctx.lineWidth = ow; ctx.strokeStyle = opts.outlineColor || '#000'; ctx.strokeText(l, px, py); }
      ctx.fillStyle = opts.color || '#fff';
      ctx.fillText(l, px, py);
    }
    ctx.restore();
    return lines.length * lh;
  }

  // ------------------------------------------------------------ windows
  const WIN = {
    blue:      { body: ['#2d4cb2', '#17296f', '#0b1544'], frame: ['#f4f8ff', '#91a9e6', '#3a51a2'] },
    dark:      { body: ['#363c50', '#1c2132', '#0d1019'], frame: ['#e6eaf4', '#8d96ab', '#4a5268'] },
    parchment: { body: ['#fbf0d2', '#efdcae', '#dcc08a'], frame: ['#86572a', '#c08c4f', '#5a3616'] },
    gold:      { body: ['#4d3c16', '#2b2309', '#16110a'], frame: ['#fff2b8', '#dcad4e', '#7a5418'] },
  };
  function windowBox(ctx, x, y, w, h, opts) {
    opts = opts || {};
    const st = WIN[opts.style] || WIN.blue;
    const alpha = opts.alpha == null ? 0.93 : opts.alpha;
    x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
    ctx.save();
    rr(ctx, x + 2, y + 3, w, h, 9);
    ctx.fillStyle = 'rgba(0,0,0,0.32)'; ctx.fill();
    rr(ctx, x, y, w, h, 9);
    ctx.fillStyle = lg(ctx, 0, y, 0, y + h, [[0, st.frame[0]], [0.5, st.frame[1]], [1, st.frame[2]]]);
    ctx.fill();
    ctx.globalAlpha = alpha;
    rr(ctx, x + 3, y + 3, w - 6, h - 6, 6);
    ctx.fillStyle = lg(ctx, 0, y, 0, y + h, [[0, st.body[0]], [0.42, st.body[1]], [1, st.body[2]]]);
    ctx.fill();
    ctx.globalAlpha = 1;
    // soft top sheen + inner hairline (RPG Maker windowskin feel)
    rr(ctx, x + 3, y + 3, w - 6, h - 6, 6);
    ctx.save(); ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,0.07)'; ctx.fillRect(x, y, w, Math.max(6, h * 0.28));
    ctx.restore();
    rr(ctx, x + 5.5, y + 5.5, w - 11, h - 11, 4);
    ctx.strokeStyle = 'rgba(255,255,255,0.16)'; ctx.lineWidth = 1; ctx.stroke();
    // corner studs
    if (w > 40 && h > 40) {
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      for (const [cx, cy] of [[x + 6, y + 6], [x + w - 6, y + 6], [x + 6, y + h - 6], [x + w - 6, y + h - 6]]) {
        ctx.beginPath(); ctx.arc(cx, cy, 1.2, 0, PI2); ctx.fill();
      }
    }
    ctx.restore();
  }

  // ------------------------------------------------------------ gauge / cursor / pips
  function gauge(ctx, x, y, w, h, ratio, c1, c2, opts) {
    opts = opts || {};
    x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
    ratio = clamp(ratio || 0, 0, 1);
    const r = Math.max(1, Math.floor(h / 2));
    ctx.save();
    rr(ctx, x, y, w, h, r);
    ctx.fillStyle = opts.bg || '#0a0e24'; ctx.fill();
    ctx.lineWidth = 1; ctx.strokeStyle = opts.border || '#aebfff'; ctx.stroke();
    const iw = w - 2, ih = h - 2;
    if (opts.ghost != null && opts.ghost > ratio) {
      const gw = Math.round(iw * clamp(opts.ghost, 0, 1));
      rr(ctx, x + 1, y + 1, gw, ih, Math.max(1, ih / 2));
      ctx.fillStyle = opts.ghostColor || 'rgba(255,255,255,0.6)'; ctx.fill();
    }
    const fw = Math.round(iw * ratio);
    if (fw > 0) {
      const a = c1 || '#7de07a', b = c2 || '#2c9a3c';
      rr(ctx, x + 1, y + 1, fw, ih, Math.max(1, ih / 2));
      ctx.fillStyle = lg(ctx, 0, y, 0, y + h, [[0, lite(a, 0.35)], [0.5, a], [1, b]]);
      ctx.fill();
      // gloss
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      ctx.fillRect(x + 2, y + 1, Math.max(0, fw - 2), Math.max(1, Math.floor(ih / 3)));
    }
    ctx.restore();
  }

  let handCanvas = null;
  function cursor(ctx, x, y, frame) {
    const f = frame == null ? (G.frame || 0) : frame;
    const bob = Math.round(Math.sin(f * 0.2) * 2);
    if (!handCanvas) handCanvas = iconCanvas('cursor', 16);
    ctx.drawImage(handCanvas, Math.round(x) + bob, Math.round(y) - 8);
  }

  function pips(ctx, x, y, n, max, color, opts) {
    opts = opts || {};
    const s = opts.size || 6, gap = opts.gap == null ? 3 : opts.gap;
    const diamond = opts.shape === 'diamond';
    const col = color || '#ffd35a';
    ctx.save();
    for (let i = 0; i < max; i++) {
      const cx = Math.round(x + i * (s + gap) + s / 2), cy = Math.round(y + s / 2);
      const r = s / 2;
      ctx.beginPath();
      if (diamond) { ctx.moveTo(cx, cy - r - 0.5); ctx.lineTo(cx + r + 0.5, cy); ctx.lineTo(cx, cy + r + 0.5); ctx.lineTo(cx - r - 0.5, cy); ctx.closePath(); }
      else ctx.arc(cx, cy, r, 0, PI2);
      if (i < n) {
        ctx.fillStyle = lg(ctx, 0, cy - r, 0, cy + r, [[0, lite(col, 0.5)], [1, shade(col, -0.25)]]);
        ctx.fill();
        ctx.strokeStyle = '#1b1204'; ctx.lineWidth = 1; ctx.stroke();
      } else {
        ctx.fillStyle = '#18203f'; ctx.fill();
        ctx.strokeStyle = '#6f7fb0'; ctx.lineWidth = 1; ctx.stroke();
      }
    }
    ctx.restore();
  }

  // ------------------------------------------------------------ icons (drawn in a 16-unit space)
  const ICON = {};
  const PATH = {};
  PATH.heart = (g) => {
    g.beginPath(); g.moveTo(8, 14.6);
    g.bezierCurveTo(1.6, 10.6, 0.4, 7.4, 1.4, 4.8);
    g.bezierCurveTo(2.4, 2.2, 6.0, 1.6, 8, 4.6);
    g.bezierCurveTo(10, 1.6, 13.6, 2.2, 14.6, 4.8);
    g.bezierCurveTo(15.6, 7.4, 14.4, 10.6, 8, 14.6);
    g.closePath();
  };
  // a fire-style flame centred at (cx,cy)
  function flamePath(g, cx, cy, w, h) {
    g.beginPath();
    g.moveTo(cx, cy - h / 2);
    g.bezierCurveTo(cx + w * 0.25, cy - h * 0.2, cx + w * 0.6, cy, cx + w * 0.5, cy + h * 0.22);
    g.bezierCurveTo(cx + w * 0.45, cy + h * 0.48, cx - w * 0.45, cy + h * 0.48, cx - w * 0.5, cy + h * 0.22);
    g.bezierCurveTo(cx - w * 0.6, cy, cx - w * 0.25, cy - h * 0.2, cx, cy - h / 2);
    g.closePath();
  }
  const STEEL = (g) => lg(g, -2, 0, 2, 0, [[0, '#f6f9ff'], [0.5, '#b8c7e0'], [1, '#6c82a6']]);
  function blade(g, pts, col) {
    g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
    g.closePath(); g.fillStyle = col; g.fill(); g.strokeStyle = '#1c2640'; g.lineWidth = 1; g.stroke();
  }

  ICON.heart = (g) => {
    PATH.heart(g);
    g.fillStyle = lg(g, 0, 2, 0, 15, [[0, '#ffa3b0'], [0.45, '#e2364f'], [1, '#7e0c26']]); g.fill();
    g.lineWidth = 1; g.strokeStyle = '#3a0816'; g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.85)'; g.beginPath(); g.ellipse(4.5, 5.4, 1.4, 0.9, -0.6, 0, PI2); g.fill();
  };
  ICON.heartEmpty = (g) => { PATH.heart(g); g.fillStyle = '#2a1a34'; g.fill(); g.lineWidth = 1; g.strokeStyle = '#9a86b8'; g.stroke(); };
  ICON.heartHalf = (g) => { ICON.heartEmpty(g); g.save(); g.beginPath(); g.rect(0, 0, 8, 16); g.clip(); ICON.heart(g); g.restore(); };

  ICON.sword = (g) => {
    g.save(); g.translate(8, 8); g.rotate(Math.PI / 4);
    blade(g, [[-1.7, -4.4], [0, -7.6], [1.7, -4.4], [1.7, 4.2], [-1.7, 4.2]], STEEL(g));
    g.fillStyle = '#d9a441'; g.fillRect(-4.6, 4.2, 9.2, 2.2); g.strokeStyle = '#6a4a14'; g.strokeRect(-4.6, 4.2, 9.2, 2.2);
    g.fillStyle = '#6b3b1e'; g.fillRect(-1.1, 6.4, 2.2, 4.6);
    g.beginPath(); g.arc(0, 11.6, 1.7, 0, PI2); g.fillStyle = '#d9a441'; g.fill();
    g.restore();
  };
  ICON.spear = (g) => {
    g.save(); g.translate(8, 8); g.rotate(Math.PI / 4);
    g.fillStyle = '#9a6a3a'; g.fillRect(-0.9, -4.5, 1.8, 15.5);
    g.beginPath(); g.moveTo(0, -8.4); g.quadraticCurveTo(3.2, -5.4, 0, -2.2); g.quadraticCurveTo(-3.2, -5.4, 0, -8.4); g.closePath();
    g.fillStyle = STEEL(g); g.fill(); g.strokeStyle = '#1c2640'; g.lineWidth = 1; g.stroke();
    g.fillStyle = '#d9a441'; g.fillRect(-1.8, -2.6, 3.6, 1.6);
    g.restore();
  };
  ICON.dagger = (g) => {
    g.save(); g.translate(8, 8); g.rotate(Math.PI / 4);
    blade(g, [[-1.3, -2], [0, -7], [1.3, -2], [1.3, 2.4], [-1.3, 2.4]], STEEL(g));
    g.fillStyle = '#d9a441'; g.fillRect(-3.6, 2.2, 7.2, 1.7);
    g.fillStyle = '#2d1a10'; g.fillRect(-1, 3.9, 2, 4.5);
    g.restore();
  };
  ICON.axe = (g) => {
    g.save(); g.translate(8, 8); g.rotate(Math.PI / 4);
    g.fillStyle = '#8a5a2e'; g.fillRect(-0.9, -5.5, 1.8, 15);
    g.beginPath(); g.moveTo(0.6, -6.2); g.quadraticCurveTo(7, -7.2, 6.2, -1.2); g.quadraticCurveTo(4.8, 1.4, 0.5, 0.2); g.closePath();
    g.fillStyle = STEEL(g); g.fill(); g.strokeStyle = '#1c2640'; g.lineWidth = 1; g.stroke();
    g.restore();
  };
  ICON.bow = (g) => {
    g.beginPath(); g.moveTo(5.5, 1.2); g.quadraticCurveTo(-3.6, 8, 5.5, 14.8);
    g.strokeStyle = '#2b1606'; g.lineWidth = 3.2; g.stroke();
    g.beginPath(); g.moveTo(5.5, 1.2); g.quadraticCurveTo(-3.6, 8, 5.5, 14.8);
    g.strokeStyle = '#c28a4a'; g.lineWidth = 1.7; g.stroke();
    g.beginPath(); g.moveTo(5.5, 1.2); g.lineTo(5.5, 14.8); g.strokeStyle = '#f0ead8'; g.lineWidth = 0.6; g.stroke();
    g.beginPath(); g.moveTo(0.5, 8); g.lineTo(11.5, 8); g.strokeStyle = '#4a2c10'; g.lineWidth = 1.1; g.stroke();
    blade(g, [[11.5, 8], [8.6, 6.2], [8.6, 9.8]], '#dfe8f5');
  };
  ICON.staff = (g) => {
    g.save(); g.translate(8, 8); g.rotate(0.22);
    g.fillStyle = '#7a4f2a'; g.fillRect(-1, -3, 2, 17.5);
    g.strokeStyle = '#2a170a'; g.lineWidth = 0.8; g.strokeRect(-1, -3, 2, 17.5);
    g.beginPath(); g.arc(0, -5.5, 3.8, 0, PI2);
    g.fillStyle = rg(g, -1.4, -6.8, 0.4, 0, -5.5, 3.8, [[0, '#f4fbff'], [0.5, '#6fd6ff'], [1, '#2a5fc0']]); g.fill();
    g.strokeStyle = '#1b2a55'; g.lineWidth = 1; g.stroke();
    g.restore();
  };
  // elemental glyphs
  ICON.fire = (g) => {
    flamePath(g, 8, 8.4, 11, 15);
    g.fillStyle = lg(g, 0, 1, 0, 15, [[0, '#ffe27a'], [0.45, '#ff8a2a'], [1, '#b8261a']]); g.fill();
    g.lineWidth = 1; g.strokeStyle = '#4a0c06'; g.stroke();
    flamePath(g, 8, 10.6, 5, 7); g.fillStyle = '#fff3b0'; g.fill();
  };
  ICON.flame = (g) => {                       // the wick: pale gold candle flame with blue base
    flamePath(g, 8, 8, 9, 14);
    g.fillStyle = lg(g, 0, 1, 0, 15, [[0, '#ffffff'], [0.4, '#ffe08a'], [0.85, '#ffa43a'], [1, '#5ea8ff']]); g.fill();
    g.lineWidth = 1; g.strokeStyle = '#6a3a10'; g.stroke();
  };
  ICON.ice = (g) => {
    const shard = (dx) => {
      g.beginPath(); g.moveTo(8 + dx, 1); g.lineTo(12 + dx, 8); g.lineTo(8 + dx, 15); g.lineTo(4 + dx, 8); g.closePath();
      g.fillStyle = lg(g, 4 + dx, 1, 12 + dx, 15, [[0, '#f2feff'], [0.5, '#7fd8ff'], [1, '#2b6fc8']]); g.fill();
      g.lineWidth = 1; g.strokeStyle = '#123463'; g.stroke();
    };
    shard(0);
    g.beginPath(); g.moveTo(4, 8); g.lineTo(12, 8); g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 0.7; g.stroke();
  };
  ICON.lightning = (g) => {
    blade(g, [[9.6, 0.8], [3, 9.2], [7.6, 9.2], [6.2, 15.4], [13.2, 6.4], [8.4, 6.4], [10.8, 0.8]], lg(g, 0, 0, 0, 16, [[0, '#fffbd0'], [0.5, '#ffe14a'], [1, '#e08a14']]));
  };
  ICON.wind = (g) => {
    const sw = (y, x2, lw) => {
      g.beginPath(); g.moveTo(2, y); g.bezierCurveTo(6, y - 3, 12, y - 3, 13.5, y - 0.2);
      g.quadraticCurveTo(14.5, y + 2.2, 11.8, y + 2.6);
      g.strokeStyle = '#0c3a2e'; g.lineWidth = lw + 1.2; g.stroke();
      g.strokeStyle = '#c5fbe0'; g.lineWidth = lw; g.stroke();
    };
    sw(5, 0, 1.6); sw(9.5, 0, 1.6); sw(14, 0, 1.4);
  };
  ICON.light = (g) => {
    g.save(); g.translate(8, 8);
    for (let i = 0; i < 8; i++) {
      g.rotate(PI2 / 8);
      g.beginPath(); g.moveTo(-1.2, -4.6); g.lineTo(0, -7.6); g.lineTo(1.2, -4.6); g.closePath();
      g.fillStyle = '#ffe98a'; g.fill(); g.strokeStyle = '#7a5410'; g.lineWidth = 0.6; g.stroke();
    }
    g.restore();
    g.beginPath(); g.arc(8, 8, 4.4, 0, PI2);
    g.fillStyle = rg(g, 6.5, 6.5, 0.5, 8, 8, 4.4, [[0, '#ffffff'], [0.6, '#ffe27a'], [1, '#e89a1a']]); g.fill();
    g.lineWidth = 0.9; g.strokeStyle = '#7a5410'; g.stroke();
  };
  ICON.dark = (g) => {
    g.beginPath(); g.arc(8, 8, 6.4, 0, PI2);
    g.fillStyle = lg(g, 2, 2, 14, 14, [[0, '#b9a2ff'], [0.5, '#6b3ea8'], [1, '#2a1048']]); g.fill();
    g.globalCompositeOperation = 'destination-out';
    g.beginPath(); g.arc(11, 5.6, 5.4, 0, PI2); g.fill();
    g.globalCompositeOperation = 'source-over';
    g.beginPath(); g.arc(8, 8, 6.4, 0, PI2); g.lineWidth = 0.9; g.strokeStyle = '#1a0a30'; g.stroke();
  };

  // items
  function flask(g, col, hi) {
    g.beginPath(); g.arc(8, 10.4, 5.2, 0, PI2);
    g.fillStyle = rg(g, 6.2, 8.4, 0.5, 8, 10.4, 5.4, [[0, lite(col, 0.6)], [0.6, col], [1, shade(col, -0.5)]]); g.fill();
    g.lineWidth = 1; g.strokeStyle = '#1e1020'; g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.22)'; g.fillRect(6.6, 3.6, 2.8, 4.2);   // glass neck
    g.strokeStyle = '#1e1020'; g.strokeRect(6.6, 3.6, 2.8, 4.2);
    g.fillStyle = '#9b6a3a'; g.fillRect(5.8, 1.2, 4.4, 2.8); g.strokeRect(5.8, 1.2, 4.4, 2.8);
    g.beginPath(); g.ellipse(6.2, 8.8, 1.2, 2.2, 0.5, 0, PI2); g.fillStyle = hi; g.fill();
  }
  ICON.potion = (g) => flask(g, '#e0384a', '#ffd0d6');
  ICON.ether = (g) => flask(g, '#3f7fe8', '#d0e6ff');
  ICON.elixir = (g) => flask(g, '#f0a420', '#fff1c0');
  ICON.phoenix = (g) => {
    g.beginPath(); g.moveTo(3.5, 14.5); g.quadraticCurveTo(13.5, 9, 13, 1); g.quadraticCurveTo(6, 3.5, 3.5, 14.5); g.closePath();
    g.fillStyle = lg(g, 3, 1, 13, 14, [[0, '#ffe59a'], [0.5, '#ff7a2a'], [1, '#c02a2a']]); g.fill();
    g.lineWidth = 1; g.strokeStyle = '#5a1a0a'; g.stroke();
    g.beginPath(); g.moveTo(3.5, 14.5); g.lineTo(10.5, 3.5); g.strokeStyle = '#fff0c0'; g.lineWidth = 0.7; g.stroke();
  };
  ICON.gold = (g) => {
    g.beginPath(); g.arc(8, 8, 6.2, 0, PI2);
    g.fillStyle = rg(g, 6, 5.5, 0.5, 8, 8, 6.4, [[0, '#fff6c0'], [0.55, '#f2c03a'], [1, '#9a6612']]); g.fill();
    g.lineWidth = 1; g.strokeStyle = '#4a3008'; g.stroke();
    g.beginPath(); g.arc(8, 8, 3.9, 0, PI2); g.strokeStyle = '#b8801c'; g.lineWidth = 1; g.stroke();
    g.beginPath(); g.moveTo(6.2, 6.8); g.lineTo(9.8, 6.8); g.moveTo(6.2, 9.2); g.lineTo(9.8, 9.2);
    g.strokeStyle = '#8a5a10'; g.lineWidth = 0.8; g.stroke();
  };
  ICON.key = (g) => {
    g.beginPath(); g.arc(5, 5.2, 3.2, 0, PI2); g.lineWidth = 2.2; g.strokeStyle = '#8a6216'; g.stroke();
    g.beginPath(); g.arc(5, 5.2, 3.2, 0, PI2); g.lineWidth = 0.8; g.strokeStyle = '#ffe89a'; g.stroke();
    g.save(); g.translate(7.4, 7.4); g.rotate(Math.PI / 4);
    g.fillStyle = lg(g, 0, -1, 0, 1, [[0, '#ffe89a'], [1, '#a87618']]);
    g.fillRect(-0.9, -0.5, 1.8, 9.5); g.strokeStyle = '#4a3008'; g.lineWidth = 0.7; g.strokeRect(-0.9, -0.5, 1.8, 9.5);
    g.fillRect(-0.9, 6, 2.6, 1.6); g.strokeRect(-0.9, 6, 2.6, 1.6);
    g.restore();
  };
  function shieldPath(g, dx, dy) {
    g.beginPath();
    g.moveTo(3 + dx, 2.4 + dy); g.lineTo(13 + dx, 2.4 + dy); g.lineTo(13 + dx, 8 + dy);
    g.quadraticCurveTo(13 + dx, 13 + dy, 8 + dx, 15 + dy); g.quadraticCurveTo(3 + dx, 13 + dy, 3 + dx, 8 + dy); g.closePath();
  }
  ICON.shield = (g) => {
    shieldPath(g, 0, 0);
    g.fillStyle = lg(g, 3, 2, 13, 15, [[0, '#d8e8ff'], [0.45, '#5f8fd6'], [1, '#22417e']]); g.fill();
    g.lineWidth = 1.1; g.strokeStyle = '#0f1e40'; g.stroke();
    g.beginPath(); g.moveTo(8, 4); g.lineTo(8, 12); g.moveTo(5, 7); g.lineTo(11, 7);
    g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 0.9; g.stroke();
  };
  ICON.guard = (g) => {
    shieldPath(g, 0, 0);
    g.fillStyle = lg(g, 3, 2, 13, 15, [[0, '#fff4c4'], [0.5, '#e0b04a'], [1, '#7a5214']]); g.fill();
    g.lineWidth = 1.1; g.strokeStyle = '#3a2408'; g.stroke();
    g.beginPath(); g.arc(8, 7.6, 2.3, 0, PI2); g.strokeStyle = '#fff4c4'; g.lineWidth = 0.9; g.stroke();
  };
  ICON.shieldBreak = (g) => {
    const half = (side) => {
      g.save(); g.beginPath(); g.rect(side < 0 ? 0 : 8, 0, 8, 16); g.clip();
      shieldPath(g, side < 0 ? -1.2 : 1.4, side < 0 ? 0 : 1);
      g.fillStyle = lg(g, 3, 2, 13, 15, [[0, '#dfe6f2'], [0.5, '#7c8aa6'], [1, '#353f58']]); g.fill();
      g.lineWidth = 1.1; g.strokeStyle = '#141a2c'; g.stroke();
      g.restore();
    };
    half(-1); half(1);
    g.beginPath(); g.moveTo(8.2, 1); g.lineTo(6.6, 5); g.lineTo(9.4, 8); g.lineTo(7.4, 12); g.lineTo(8.6, 15.4);
    g.strokeStyle = '#ff5a4a'; g.lineWidth = 1.3; g.stroke();
  };
  ICON.unknown = (g) => {
    rr(g, 1.5, 1.5, 13, 13, 3.2);
    g.fillStyle = '#25203d'; g.fill(); g.strokeStyle = '#cdd6ff'; g.lineWidth = 1.1; g.stroke();
    g.fillStyle = '#ffffff'; g.font = 'bold 12px ' + FONT; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('?', 8, 8.8);
    g.textAlign = 'left'; g.textBaseline = 'alphabetic';
  };
  ICON.bp = (g) => {
    g.beginPath(); g.moveTo(8, 1.2); g.lineTo(14.8, 8); g.lineTo(8, 14.8); g.lineTo(1.2, 8); g.closePath();
    g.fillStyle = lg(g, 1, 1, 15, 15, [[0, '#fff8c8'], [0.5, '#f5b83e'], [1, '#a95a14']]); g.fill();
    g.lineWidth = 1; g.strokeStyle = '#5a3008'; g.stroke();
    g.beginPath(); g.moveTo(1.2, 8); g.lineTo(8, 8); g.lineTo(8, 1.2); g.moveTo(8, 8); g.lineTo(14.8, 8);
    g.strokeStyle = 'rgba(90,40,8,0.5)'; g.lineWidth = 0.7; g.stroke();
  };
  ICON.sp = (g) => {
    g.beginPath(); g.moveTo(8, 0.8); g.lineTo(12.6, 8); g.lineTo(8, 15.2); g.lineTo(3.4, 8); g.closePath();
    g.fillStyle = lg(g, 3, 0, 13, 16, [[0, '#e6fbff'], [0.5, '#5aaeff'], [1, '#1d4cb0']]); g.fill();
    g.lineWidth = 1; g.strokeStyle = '#0c2350'; g.stroke();
    g.beginPath(); g.moveTo(3.4, 8); g.lineTo(12.6, 8); g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineWidth = 0.6; g.stroke();
  };
  ICON.exp = (g) => {
    [[2.5, 9, 3], [6.5, 6, 3], [10.5, 3, 3]].forEach(([x, y, w]) => {
      g.fillStyle = lg(g, 0, y, 0, 14, [[0, '#c8ffb0'], [1, '#2e9a40']]);
      g.fillRect(x, y, w, 14 - y); g.strokeStyle = '#123a1a'; g.lineWidth = 0.8; g.strokeRect(x, y, w, 14 - y);
    });
  };
  ICON.poison = (g) => {
    g.beginPath(); g.moveTo(8, 1.4);
    g.bezierCurveTo(8, 1.4, 2.6, 8.2, 3, 10.9); g.bezierCurveTo(3.4, 13.9, 12.6, 13.9, 13, 10.9); g.bezierCurveTo(13.4, 8.2, 8, 1.4, 8, 1.4);
    g.closePath();
    g.fillStyle = lg(g, 0, 1, 0, 15, [[0, '#d4ff8a'], [0.6, '#5cb83a'], [1, '#2a5a1a']]); g.fill();
    g.lineWidth = 1; g.strokeStyle = '#17300e'; g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.8)'; g.beginPath(); g.arc(5.8, 10.2, 1.1, 0, PI2); g.fill();
  };
  ICON.sleep = (g) => {
    g.lineJoin = 'miter';
    g.beginPath(); g.moveTo(1.8, 3); g.lineTo(6.6, 3); g.lineTo(1.8, 8.2); g.lineTo(6.6, 8.2);
    g.strokeStyle = '#8fc4ff'; g.lineWidth = 1.5; g.stroke();
    g.beginPath(); g.moveTo(7.6, 7.2); g.lineTo(11.4, 7.2); g.lineTo(7.6, 12.6); g.lineTo(11.4, 12.6);
    g.strokeStyle = '#e6f2ff'; g.lineWidth = 1.9; g.stroke();
    g.lineJoin = 'round';
  };
  ICON.up = (g) => {
    g.beginPath(); g.moveTo(8, 1.2); g.lineTo(14.2, 8); g.lineTo(10.6, 8); g.lineTo(10.6, 14.8); g.lineTo(5.4, 14.8); g.lineTo(5.4, 8); g.lineTo(1.8, 8); g.closePath();
    g.fillStyle = lg(g, 0, 1, 0, 15, [[0, '#d0ffb0'], [1, '#2f9a3a']]); g.fill(); g.lineWidth = 1; g.strokeStyle = '#143a1a'; g.stroke();
  };
  ICON.down = (g) => {
    g.beginPath(); g.moveTo(8, 14.8); g.lineTo(14.2, 8); g.lineTo(10.6, 8); g.lineTo(10.6, 1.2); g.lineTo(5.4, 1.2); g.lineTo(5.4, 8); g.lineTo(1.8, 8); g.closePath();
    g.fillStyle = lg(g, 0, 1, 0, 15, [[0, '#ffc0b0'], [1, '#b8301e']]); g.fill(); g.lineWidth = 1; g.strokeStyle = '#4a0e06'; g.stroke();
  };
  ICON.check = (g) => {
    g.beginPath(); g.arc(8, 8, 6.6, 0, PI2);
    g.fillStyle = lg(g, 0, 1, 0, 15, [[0, '#9cf08a'], [1, '#2a8a3a']]); g.fill(); g.lineWidth = 1; g.strokeStyle = '#123a1a'; g.stroke();
    g.beginPath(); g.moveTo(4.4, 8.2); g.lineTo(7.1, 10.8); g.lineTo(11.8, 5.4);
    g.strokeStyle = '#ffffff'; g.lineWidth = 2.2; g.stroke();
  };
  ICON.lock = (g) => {
    g.beginPath(); g.arc(8, 6.6, 3.4, Math.PI, 0); g.strokeStyle = '#9aa4bc'; g.lineWidth = 1.8; g.stroke();
    rr(g, 3.4, 7.4, 9.2, 7.2, 1.6);
    g.fillStyle = lg(g, 0, 7, 0, 15, [[0, '#f0f3fa'], [1, '#7d88a4']]); g.fill(); g.lineWidth = 1; g.strokeStyle = '#2a3046'; g.stroke();
    g.beginPath(); g.arc(8, 10.6, 1.1, 0, PI2); g.fillStyle = '#2a3046'; g.fill();
  };
  ICON.gift = (g) => {
    rr(g, 2.2, 6.4, 11.6, 8.4, 1.2);
    g.fillStyle = lg(g, 0, 6, 0, 15, [[0, '#f0606e'], [1, '#9a1e30']]); g.fill(); g.lineWidth = 1; g.strokeStyle = '#3a0812'; g.stroke();
    rr(g, 1.6, 4.2, 12.8, 2.8, 0.9);
    g.fillStyle = lg(g, 0, 4, 0, 7, [[0, '#ffe59a'], [1, '#c0841e']]); g.fill(); g.strokeStyle = '#5a3a08'; g.stroke();
    g.fillStyle = '#ffd25a'; g.fillRect(7.2, 4.2, 1.6, 10.6); g.strokeStyle = '#6a4608'; g.strokeRect(7.2, 4.2, 1.6, 10.6);
    g.beginPath(); g.ellipse(5.4, 3.4, 2.2, 1.5, -0.4, 0, PI2); g.ellipse(10.6, 3.4, 2.2, 1.5, 0.4, 0, PI2);
    g.strokeStyle = '#c0841e'; g.lineWidth = 1.1; g.stroke();
  };
  ICON.book = (g) => {
    g.beginPath(); g.moveTo(8, 3.8); g.quadraticCurveTo(4.4, 2.2, 1.2, 3.4); g.lineTo(1.2, 13.2); g.quadraticCurveTo(4.6, 12.2, 8, 13.8); g.closePath();
    g.fillStyle = '#f5e8c4'; g.fill(); g.strokeStyle = '#5a3a1a'; g.lineWidth = 1; g.stroke();
    g.beginPath(); g.moveTo(8, 3.8); g.quadraticCurveTo(11.6, 2.2, 14.8, 3.4); g.lineTo(14.8, 13.2); g.quadraticCurveTo(11.4, 12.2, 8, 13.8); g.closePath();
    g.fillStyle = '#efdcb0'; g.fill(); g.stroke();
    g.beginPath(); g.moveTo(8, 3.8); g.lineTo(8, 13.8); g.strokeStyle = '#7a4a22'; g.lineWidth = 1.2; g.stroke();
    g.fillStyle = '#b02a2a'; g.fillRect(12.4, 13.2, 1.2, 2.2);
  };
  ICON.star = (g) => {
    g.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? 3.2 : 7, a = -Math.PI / 2 + i * Math.PI / 5;
      g.lineTo(8 + Math.cos(a) * r, 8 + Math.sin(a) * r);
    }
    g.closePath();
    g.fillStyle = lg(g, 0, 1, 0, 15, [[0, '#fff5a8'], [0.6, '#ffc83a'], [1, '#c07a10']]); g.fill();
    g.lineWidth = 1; g.strokeStyle = '#6a4208'; g.stroke();
  };
  ICON.lantern = (g) => {
    g.beginPath(); g.arc(8, 2.8, 2.6, Math.PI, 0); g.strokeStyle = '#b8862a'; g.lineWidth = 1.2; g.stroke();
    rr(g, 4.2, 4.2, 7.6, 8.8, 2.2);
    g.fillStyle = rg(g, 8, 8, 0.5, 8, 8, 6, [[0, 'rgba(255,240,180,0.95)'], [1, 'rgba(255,170,60,0.55)']]); g.fill();
    g.lineWidth = 1; g.strokeStyle = '#7a5214'; g.stroke();
    flamePath(g, 8, 8.8, 3.2, 5); g.fillStyle = '#fff6c8'; g.fill();
    g.fillStyle = '#b8862a'; g.fillRect(3.4, 12.6, 9.2, 1.8); g.strokeStyle = '#4a3008'; g.strokeRect(3.4, 12.6, 9.2, 1.8);
  };
  ICON.cog = (g) => {
    g.save(); g.translate(8, 8);
    for (let i = 0; i < 8; i++) { g.rotate(PI2 / 8); g.fillStyle = '#c9953a'; g.fillRect(-1.5, -7.4, 3, 3.4); g.strokeStyle = '#4a3008'; g.lineWidth = 0.7; g.strokeRect(-1.5, -7.4, 3, 3.4); }
    g.restore();
    g.beginPath(); g.arc(8, 8, 5, 0, PI2); g.fillStyle = lg(g, 3, 3, 13, 13, [[0, '#f2c76a'], [1, '#8a5a1a']]); g.fill(); g.lineWidth = 1; g.strokeStyle = '#4a3008'; g.stroke();
    g.beginPath(); g.arc(8, 8, 1.9, 0, PI2); g.fillStyle = '#3a2408'; g.fill();
  };
  ICON.ring = (g) => {
    g.beginPath(); g.arc(8, 9.2, 4.6, 0, PI2); g.lineWidth = 2.4; g.strokeStyle = '#8a5e14'; g.stroke();
    g.beginPath(); g.arc(8, 9.2, 4.6, 0, PI2); g.lineWidth = 0.8; g.strokeStyle = '#ffe49a'; g.stroke();
    g.beginPath(); g.moveTo(8, 1.4); g.lineTo(10.6, 4.2); g.lineTo(8, 6.4); g.lineTo(5.4, 4.2); g.closePath();
    g.fillStyle = lg(g, 0, 1, 0, 7, [[0, '#f8fbff'], [0.5, '#7fd0ff'], [1, '#2a5ab0']]); g.fill(); g.strokeStyle = '#1a3060'; g.lineWidth = 0.8; g.stroke();
  };
  ICON.feather = (g) => {
    g.beginPath(); g.moveTo(3.5, 14.5); g.quadraticCurveTo(12.5, 9, 13.2, 1.2); g.quadraticCurveTo(7, 4, 3.5, 14.5); g.closePath();
    g.fillStyle = lg(g, 3, 1, 13, 14, [[0, '#ffffff'], [1, '#7aa6d8']]); g.fill(); g.lineWidth = 1; g.strokeStyle = '#2a3a60'; g.stroke();
    g.beginPath(); g.moveTo(3.5, 14.5); g.lineTo(11, 3.2); g.strokeStyle = '#4a5a80'; g.lineWidth = 0.7; g.stroke();
  };
  ICON.map = (g) => {
    g.beginPath(); g.moveTo(1.2, 3.4); g.lineTo(5.6, 2); g.lineTo(10.4, 3.6); g.lineTo(14.8, 2.2); g.lineTo(14.8, 12.6); g.lineTo(10.4, 14); g.lineTo(5.6, 12.4); g.lineTo(1.2, 13.8); g.closePath();
    g.fillStyle = '#eedca6'; g.fill(); g.lineWidth = 1; g.strokeStyle = '#5a3a1a'; g.stroke();
    g.beginPath(); g.moveTo(5.6, 2); g.lineTo(5.6, 12.4); g.moveTo(10.4, 3.6); g.lineTo(10.4, 14); g.strokeStyle = '#a88a52'; g.lineWidth = 0.7; g.stroke();
    g.beginPath(); g.moveTo(7.6, 6.4); g.lineTo(9, 8.6); g.moveTo(9, 6.4); g.lineTo(7.6, 8.6); g.strokeStyle = '#c02a2a'; g.lineWidth = 1.3; g.stroke();
  };
  ICON.music = (g) => {
    g.beginPath(); g.ellipse(5, 12, 2.6, 2, -0.3, 0, PI2); g.ellipse(12, 10.6, 2.6, 2, -0.3, 0, PI2);
    g.fillStyle = '#c9b8ff'; g.fill(); g.strokeStyle = '#2a1a50'; g.lineWidth = 0.9; g.stroke();
    g.beginPath(); g.moveTo(7.2, 11.6); g.lineTo(7.2, 2.2); g.lineTo(14.2, 1); g.lineTo(14.2, 9.4);
    g.strokeStyle = '#2a1a50'; g.lineWidth = 1.2; g.stroke();
  };
  ICON.bond = (g) => {
    const h = (x, y, s) => { g.save(); g.translate(x, y); g.scale(s, s); g.translate(-8, -8); PATH.heart(g); g.restore(); };
    g.save(); g.beginPath(); g.rect(0, 0, 9, 16); g.clip(); h(5.8, 8.2, 0.62); g.fillStyle = '#e2364f'; g.fill(); g.restore();
    g.save(); g.beginPath(); g.rect(7, 0, 9, 16); g.clip(); h(10.2, 8.2, 0.62); g.fillStyle = '#ffb040'; g.fill(); g.restore();
    g.beginPath(); g.moveTo(7, 0); g.lineTo(7, 16); g.strokeStyle = '#fff3c0'; g.lineWidth = 0.7; g.stroke();
  };
  ICON.compass = (g) => {
    g.beginPath(); g.arc(8, 8, 6.6, 0, PI2);
    g.fillStyle = rg(g, 6, 6, 1, 8, 8, 6.6, [[0, '#fff0b8'], [1, '#b98a30']]); g.fill(); g.lineWidth = 1.2; g.strokeStyle = '#4a3008'; g.stroke();
    g.save(); g.translate(8, 8); g.rotate(0.6);
    g.beginPath(); g.moveTo(0, -5); g.lineTo(1.8, 0); g.lineTo(0, 5); g.lineTo(-1.8, 0); g.closePath(); g.fillStyle = '#d02a2a'; g.fill();
    g.beginPath(); g.moveTo(0, 5); g.lineTo(1.8, 0); g.lineTo(0, -1); g.closePath(); g.fillStyle = '#f4f0e0'; g.fill();
    g.restore();
  };
  ICON.bag = (g) => {
    g.beginPath(); g.moveTo(4.4, 6.2); g.quadraticCurveTo(4, 2.2, 8, 2.2); g.quadraticCurveTo(12, 2.2, 11.6, 6.2); g.strokeStyle = '#5a3a1a'; g.lineWidth = 1.4; g.stroke();
    rr(g, 2.4, 5.8, 11.2, 9, 3);
    g.fillStyle = lg(g, 0, 6, 0, 15, [[0, '#c69a5a'], [1, '#6a4422']]); g.fill(); g.lineWidth = 1; g.strokeStyle = '#2a1a0a'; g.stroke();
    g.fillStyle = '#ffd25a'; g.beginPath(); g.arc(8, 10.2, 1.4, 0, PI2); g.fill();
  };
  // status icons: a base glyph with a small arrow / mark
  function mini(g, fn, x, y, s) { g.save(); g.translate(x, y); g.scale(s, s); fn(g); g.restore(); }
  ICON.atkup = (g) => { ICON.sword(g); mini(g, ICON.up, 9.6, 8.6, 0.5); };
  ICON.atkdown = (g) => { ICON.sword(g); mini(g, ICON.down, 9.6, 8.6, 0.5); };
  ICON.defup = (g) => { ICON.shield(g); mini(g, ICON.up, 9.6, 8.6, 0.5); };
  ICON.defdown = (g) => { ICON.shield(g); mini(g, ICON.down, 9.6, 8.6, 0.5); };
  ICON.spdup = (g) => {
    [[2.2, '#8ff07a'], [7.2, '#8ff07a']].forEach(([x, c]) => {
      g.beginPath(); g.moveTo(x, 3); g.lineTo(x + 4.2, 8); g.lineTo(x, 13); g.lineTo(x + 1.6, 13); g.lineTo(x + 5.8, 8); g.lineTo(x + 1.6, 3); g.closePath();
      g.fillStyle = c; g.fill(); g.lineWidth = 0.9; g.strokeStyle = '#17380f'; g.stroke();
    });
  };
  ICON.spddown = (g) => {
    [[2.2, '#c8c0d8'], [7.2, '#c8c0d8']].forEach(([x, c]) => {
      g.beginPath(); g.moveTo(x + 5.8, 3); g.lineTo(x + 1.6, 8); g.lineTo(x + 5.8, 13); g.lineTo(x + 4.2, 13); g.lineTo(x, 8); g.lineTo(x + 4.2, 3); g.closePath();
      g.fillStyle = c; g.fill(); g.lineWidth = 0.9; g.strokeStyle = '#2a2238'; g.stroke();
    });
  };
  ICON.regen = (g) => {
    mini(g, ICON.heart, 0.6, 2.2, 0.82);
    g.beginPath(); g.moveTo(12.4, 1.6); g.lineTo(12.4, 6.4); g.moveTo(10, 4); g.lineTo(14.8, 4);
    g.strokeStyle = '#7bff9a'; g.lineWidth = 1.8; g.stroke();
  };
  ICON.taunt = (g) => {
    g.beginPath(); g.arc(8, 8, 6.6, 0, PI2); g.fillStyle = lg(g, 0, 1, 0, 15, [[0, '#ffb070'], [1, '#c83a1a']]); g.fill();
    g.lineWidth = 1; g.strokeStyle = '#4a1608'; g.stroke();
    g.fillStyle = '#ffffff'; g.font = 'bold 11px ' + FONT; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('!', 8, 8.6);
    g.textAlign = 'left'; g.textBaseline = 'alphabetic';
  };
  ICON.cursor = (g) => {          // white pointing glove, facing right
    g.beginPath(); rrp(g, 1.2, 5.6, 7.4, 8.4, 3.2); g.closePath();
    g.beginPath(); rrp(g, 1.2, 5.6, 7.4, 8.4, 3.2);
    g.fillStyle = '#ffffff'; g.fill(); g.lineWidth = 1.2; g.strokeStyle = '#1a1420'; g.stroke();
    g.beginPath(); rrp(g, 7.2, 6.4, 7.6, 3.4, 1.7);
    g.fillStyle = '#ffffff'; g.fill(); g.lineWidth = 1.2; g.strokeStyle = '#1a1420'; g.stroke();
    g.beginPath(); g.moveTo(3, 9.4); g.lineTo(7.2, 9.4); g.strokeStyle = '#c7c0d8'; g.lineWidth = 0.8; g.stroke();
  };

  const ALIAS = { hi_potion: 'potion', hi_ether: 'ether', phoenix_down: 'phoenix', bp_tonic: 'bp', feather_quill: 'feather',
    ember_compass: 'compass', music_box: 'music', brass_cog: 'cog', lucky_coin: 'gold', coin: 'gold', hp: 'heart',
    smelling_salts: 'poison', antidote: 'poison', witchwood_charm: 'staff', charm: 'star', scroll: 'book' };
  const iconCache = {};
  function iconCanvas(name, size) {
    const key = name + '|' + size;
    if (iconCache[key]) return iconCache[key];
    const cv = mk(size, size), g = cv.getContext('2d');
    g.imageSmoothingEnabled = true;
    g.setTransform(size / 16, 0, 0, size / 16, 0, 0);
    g.lineJoin = 'round'; g.lineCap = 'round';
    (ICON[name] || ICON.unknown)(g);
    iconCache[key] = cv;
    return cv;
  }
  function icon(ctx, name, x, y, size) {
    size = Math.max(4, Math.round(size || 16));
    const n = ICON[name] ? name : (ALIAS[name] && ICON[ALIAS[name]] ? ALIAS[name] : 'unknown');
    ctx.drawImage(iconCanvas(n, size), Math.round(x), Math.round(y));
  }
  const ICON_NAMES = Object.keys(ICON).filter((k) => k !== 'cursor');

  // ------------------------------------------------------------ portraits: geometry + expressions
  const GEO = {
    cx: 72, top: 50, faceHW: 25, jawHW: 17, cheekY: 97, chinY: 128, chinBulge: 4,
    eyeY: 86, eyeDX: 12, eyeW: 9, eyeH: 9.2, browY: 72, browW: 2.6,
    noseY: 102, mouthY: 114, mouthW: 7.5, earY: 90, nw: 11, neckBot: 152, shY: 146, sw: 58, bottom: 192,
  };
  // b = [inner, outer] brow offsets (negative = up); lid = [inner, outer] upper-lid line offsets in eye-heights
  const EXPR = {
    normal:    { mouth: 'neutral', b: [0, -1] },
    happy:     { mouth: 'open', b: [-2, -3], eye: 'happy', blush: 0.5 },
    sad:       { mouth: 'frown', b: [-4, 1], lid: [-0.45, -0.05], tear: true },
    angry:     { mouth: 'gritted', b: [4, -3], lid: [-0.3, -0.62], eyeK: 0.86, vein: true },
    surprised: { mouth: 'o', b: [-6, -6], eyeK: 1.22, pupil: 0.5 },
    blush:     { mouth: 'small', b: [-1, -1], lid: [-0.55, -0.5], blush: 1 },
    smirk:     { mouth: 'smirk', bl: [0, -1], br: [-5, -3], lidR: [-0.4, -0.3], blush: 0.3 },
    worried:   { mouth: 'wavy', b: [-6, -2], eyeK: 1.06, sweat: true },
  };
  const EXPRESSIONS = Object.keys(EXPR);
  const lidFor = (E, side) => (side < 0 ? E.lidL || E.lid : E.lidR || E.lid);
  const browFor = (E, side) => (side < 0 ? E.bl || E.b : E.br || E.b) || [0, -1];

  function facePath(g, o) {
    const cx = o.cx, t = o.top, hw = o.faceHW, jw = o.jawHW, cy = o.cheekY, c = o.chinY, b = o.chinBulge;
    g.moveTo(cx, t);
    g.bezierCurveTo(cx + hw * 0.7, t - 0.5, cx + hw + 1, t + (cy - t) * 0.35, cx + hw, cy - 8);
    g.bezierCurveTo(cx + hw, cy + 8, cx + jw + 3, c - 10, cx + jw * 0.45, c - 1);
    g.quadraticCurveTo(cx, c + b + 2, cx - jw * 0.45, c - 1);
    g.bezierCurveTo(cx - jw - 3, c - 10, cx - hw, cy + 8, cx - hw, cy - 8);
    g.bezierCurveTo(cx - hw - 1, t + (cy - t) * 0.35, cx - hw * 0.7, t - 0.5, cx, t);
    g.closePath();
  }
  function shoulderPath(g, o) {
    const cx = o.cx, nb = o.neckBot, sy = o.shY, sw = o.sw, nw = o.nw;
    g.moveTo(cx - nw - 4, nb - 2);
    g.bezierCurveTo(cx - nw - 14, nb + 2, cx - sw + 6, nb + 2, cx - sw, sy + 8);
    g.quadraticCurveTo(cx - sw - 2, sy + 22, cx - sw - 4, o.bottom + 4);
    g.lineTo(cx + sw + 4, o.bottom + 4);
    g.quadraticCurveTo(cx + sw + 2, sy + 22, cx + sw, sy + 8);
    g.bezierCurveTo(cx + sw - 6, nb + 2, cx + nw + 14, nb + 2, cx + nw + 4, nb - 2);
    g.closePath();
  }
  function neckPaint(g, P, o) {
    const cx = o.cx, nw = o.nw, top = o.chinY - 16, bot = o.neckBot + 6;
    paint(g, (g) => { g.moveTo(cx - nw, top); g.lineTo(cx + nw, top); g.lineTo(cx + nw + 1, bot); g.lineTo(cx - nw - 1, bot); g.closePath(); },
      lg(g, cx - nw, 0, cx + nw, 0, [[0, P.skinSh], [0.45, P.skin], [1, P.skinSh]]), P.line, 1.8);
    clipped(g, (g) => { g.moveTo(cx - nw, top); g.lineTo(cx + nw, top); g.lineTo(cx + nw + 1, bot); g.lineTo(cx - nw - 1, bot); g.closePath(); }, () => {
      g.fillStyle = 'rgba(90,40,30,0.32)';
      g.beginPath(); g.ellipse(cx, o.chinY - 2, nw + 4, 9, 0, 0, PI2); g.fill();
    });
  }
  function hairMass(g, P, fn, y0, y1, alpha) {
    g.save(); if (alpha != null) g.globalAlpha = alpha;
    paint(g, fn, lg(g, 0, y0, 0, y1, [[0, P.hair], [0.6, P.hair], [1, P.hairSh]]), P.line, 2.2);
    // glossy sheen across the crown, clipped to the hair shape
    clipped(g, fn, () => {
      g.fillStyle = rg(g, 58, y0 + 6, 2, 62, y0 + 8, 30, [[0, 'rgba(255,255,255,0.20)'], [1, 'rgba(255,255,255,0)']]);
      g.fillRect(20, y0 - 4, 110, 40);
    });
    g.restore();
  }
  function hairHi(g, P, rng, fn, box, n, len) {
    clipped(g, fn, () => streaks(g, rng, Math.round(n * 0.6), box[0], box[1], box[2], box[3], P.hairHi, 0.42, (len || 14) * 1.3));
  }

  // eyes (side -1 = viewer's left eye)
  function eyeDraw(g, P, o, side, E) {
    const ex = o.cx + side * o.eyeDX, ey = o.eyeY;
    const hw = o.eyeW * (P.eyeWK || 1), eh = o.eyeH * (E.eyeK || 1);
    const inner = ex - side * hw, outer = ex + side * hw;
    const ln = P.line;
    if (E.eye === 'happy') {
      g.beginPath(); g.moveTo(inner, ey + 2); g.quadraticCurveTo(ex, ey - eh * 1.9, outer, ey + 2);
      g.strokeStyle = ln; g.lineWidth = 2.6; g.lineCap = 'round'; g.stroke();
      g.beginPath(); g.moveTo(inner, ey + 6); g.quadraticCurveTo(ex, ey + 3.5, outer, ey + 6);
      g.strokeStyle = P.lowerLid || '#8a5566'; g.lineWidth = 1.2; g.stroke();
      return;
    }
    const almond = () => {
      g.moveTo(inner, ey); g.quadraticCurveTo(ex, ey - 2 * eh, outer, ey);
      g.quadraticCurveTo(ex, ey + 1.8 * eh, inner, ey);
    };
    // white / iris
    g.save();
    g.beginPath(); almond();
    if (P.hollow) { g.fillStyle = '#140d2a'; }
    else { g.fillStyle = lg(g, 0, ey - eh, 0, ey + eh, [[0, '#e8eaf6'], [0.45, '#ffffff'], [1, '#c4c9de']]); }
    g.fill();
    g.clip();
    const ir = eh * (P.irisK || 0.82);
    const ix = ex + (P.look == null ? 0.6 : P.look), iy = ey + 0.6;
    g.beginPath(); g.arc(ix, iy, ir, 0, PI2);
    g.fillStyle = rg(g, ix - ir * 0.3, iy - ir * 0.4, ir * 0.1, ix, iy, ir, [[0, lite(P.eye, 0.45)], [0.55, P.eye], [1, shade(P.eye, -0.6)]]);
    g.fill();
    if (P.hollow) {
      g.beginPath(); g.arc(ix, iy, ir * 0.55, 0, PI2); g.fillStyle = 'rgba(255,255,255,0.35)'; g.fill();
    } else {
      g.beginPath(); g.arc(ix, iy + 0.4, ir * (E.pupil || 0.44), 0, PI2); g.fillStyle = '#0d0a14'; g.fill();
      g.beginPath(); g.arc(ix, iy, ir * 0.98, 0, PI2); g.strokeStyle = shade(P.eye, -0.7); g.lineWidth = 0.9; g.stroke();
    }
    g.beginPath(); g.arc(ix - ir * 0.38, iy - ir * 0.42, Math.max(1, ir * 0.34), 0, PI2); g.fillStyle = '#ffffff'; g.fill();
    g.beginPath(); g.arc(ix + ir * 0.42, iy + ir * 0.46, Math.max(0.6, ir * 0.17), 0, PI2); g.fillStyle = 'rgba(255,255,255,0.9)'; g.fill();
    g.fillStyle = lg(g, 0, ey - eh, 0, ey - eh * 0.1, [[0, 'rgba(40,20,50,0.55)'], [1, 'rgba(40,20,50,0)']]);
    g.fillRect(Math.min(inner, outer) - 2, ey - eh - 2, Math.abs(outer - inner) + 4, eh * 1.6);
    g.restore();
    // upper lid / cover
    const lid = lidFor(E, side);
    const lw = P.lidW || 2.6;
    if (lid) {
      const yI = ey + lid[0] * eh, yO = ey + lid[1] * eh;
      g.save();
      g.beginPath();
      g.moveTo(inner - side * 1.5, yI); g.lineTo(outer + side * 1.5, yO);
      g.lineTo(outer + side * 1.5, ey - eh * 3); g.lineTo(inner - side * 1.5, ey - eh * 3); g.closePath();
      g.fillStyle = P.skin; g.fill();
      g.restore();
      g.beginPath(); g.moveTo(inner, yI); g.quadraticCurveTo((inner + outer) / 2, Math.min(yI, yO) - eh * 0.12, outer, yO);
      g.strokeStyle = ln; g.lineWidth = lw; g.stroke();
      g.beginPath(); g.moveTo(outer, yO); g.lineTo(outer + side * 2.8, yO - 2.4);
      g.lineWidth = 1.6; g.stroke();
    } else {
      g.beginPath(); g.moveTo(inner, ey); g.quadraticCurveTo(ex, ey - 2 * eh, outer, ey);
      g.strokeStyle = ln; g.lineWidth = lw; g.stroke();
      g.beginPath(); g.moveTo(outer, ey); g.lineTo(outer + side * 2.8, ey - 2.4);
      g.lineWidth = 1.6; g.stroke();
    }
    // lower lid
    g.beginPath(); g.moveTo(inner, ey); g.quadraticCurveTo(ex, ey + 1.8 * eh, outer, ey);
    g.strokeStyle = P.lowerLid || '#8a5566'; g.lineWidth = 1; g.stroke();
  }
  function browDraw(g, P, o, side, E) {
    const bo = browFor(E, side);
    const ex = o.cx + side * o.eyeDX, hw = o.eyeW * 1.15;
    const inner = ex - side * hw * 0.9, outer = ex + side * hw * 1.1;
    const yI = o.browY + bo[0], yO = o.browY + bo[1];
    g.beginPath(); g.moveTo(inner, yI + 0.5);
    g.quadraticCurveTo((inner + outer) / 2, Math.min(yI, yO) - 2.6, outer, yO + 0.5);
    g.strokeStyle = P.brow; g.lineWidth = o.browW; g.lineCap = 'round'; g.stroke();
  }
  function mouthDraw(g, P, o, E) {
    const x = o.cx, y = o.mouthY, w = o.mouthW;
    const lip = P.lip, dark = '#4e1a26';
    g.lineCap = 'round';
    switch (E.mouth) {
      case 'open': {
        g.beginPath(); g.moveTo(x - w, y - 1); g.quadraticCurveTo(x, y - 1.5, x + w, y - 1);
        g.quadraticCurveTo(x, y + w * 1.05, x - w, y - 1); g.closePath();
        g.fillStyle = dark; g.fill(); g.save(); g.clip();
        g.fillStyle = '#ffffff'; g.fillRect(x - w, y - 2, w * 2, 2.4);
        g.fillStyle = '#e0707a'; g.beginPath(); g.ellipse(x, y + w * 0.7, w * 0.7, w * 0.45, 0, 0, PI2); g.fill();
        g.restore();
        g.beginPath(); g.moveTo(x - w, y - 1); g.quadraticCurveTo(x, y - 1.5, x + w, y - 1);
        g.quadraticCurveTo(x, y + w * 1.05, x - w, y - 1); g.strokeStyle = P.line; g.lineWidth = 1.4; g.stroke();
        break;
      }
      case 'frown':
        g.beginPath(); g.moveTo(x - w * 0.85, y + 2.6); g.quadraticCurveTo(x, y - 2.2, x + w * 0.85, y + 2.6);
        g.strokeStyle = P.line; g.lineWidth = 1.8; g.stroke();
        break;
      case 'gritted':
        g.beginPath(); g.moveTo(x - w, y + 0.6); g.lineTo(x + w, y - 0.6);
        g.strokeStyle = P.line; g.lineWidth = 2.1; g.stroke();
        g.beginPath(); g.moveTo(x - 2.4, y + 0.2); g.lineTo(x - 2.4, y + 2.4); g.moveTo(x + 2.4, y - 0.2); g.lineTo(x + 2.4, y + 2);
        g.strokeStyle = '#f2e8e0'; g.lineWidth = 1; g.stroke();
        break;
      case 'o':
        g.beginPath(); g.ellipse(x, y + 1, 3.4, 4.2, 0, 0, PI2); g.fillStyle = dark; g.fill();
        g.strokeStyle = P.line; g.lineWidth = 1.6; g.stroke();
        break;
      case 'small':
        g.beginPath(); g.moveTo(x - 4.5, y); g.quadraticCurveTo(x, y + 3.4, x + 4.5, y);
        g.strokeStyle = P.line; g.lineWidth = 1.5; g.stroke();
        break;
      case 'smirk':
        g.beginPath(); g.moveTo(x - w * 0.85, y + 0.8); g.quadraticCurveTo(x + 1, y + 3, x + w, y - 2.4);
        g.strokeStyle = P.line; g.lineWidth = 1.8; g.stroke();
        g.beginPath(); g.moveTo(x + w + 1.2, y - 4.4); g.quadraticCurveTo(x + w + 3, y - 1.2, x + w + 0.6, y + 0.6);
        g.strokeStyle = 'rgba(90,40,40,0.55)'; g.lineWidth = 0.9; g.stroke();
        break;
      case 'wavy':
        g.beginPath(); g.moveTo(x - w, y + 1.2);
        g.bezierCurveTo(x - w / 2, y - 1.6, x - w / 4, y + 3, x, y + 0.6);
        g.bezierCurveTo(x + w / 4, y - 1.6, x + w / 2, y + 3, x + w, y + 1.2);
        g.strokeStyle = P.line; g.lineWidth = 1.5; g.stroke();
        break;
      default: // neutral
        g.beginPath(); g.moveTo(x - w * 0.8, y); g.quadraticCurveTo(x, y + 1.7, x + w * 0.8, y);
        g.strokeStyle = P.line; g.lineWidth = 1.7; g.stroke();
        g.beginPath(); g.moveTo(x - w * 0.5, y + 1.5); g.quadraticCurveTo(x, y + 3.2, x + w * 0.5, y + 1.5);
        g.strokeStyle = lip; g.lineWidth = 1.2; g.stroke();
    }
  }
  function noseDraw(g, P, o) {
    const x = o.cx, y = o.noseY;
    g.beginPath(); g.moveTo(x + 3, y - 7); g.quadraticCurveTo(x + 4.6, y - 1, x + 2.6, y); g.quadraticCurveTo(x + 0.6, y + 1.6, x - 2.2, y + 0.2);
    g.strokeStyle = P.skinSh; g.lineWidth = 1.3; g.lineCap = 'round'; g.stroke();
    g.beginPath(); g.ellipse(x + 1.2, y + 1.4, 1.2, 0.8, 0, 0, PI2); g.fillStyle = 'rgba(120,50,40,0.45)'; g.fill();
  }

  function paintHead(g, P, o, E, spec) {
    if (spec.ears !== false) {
      for (const side of [-1, 1]) {
        const ex = o.cx + side * (o.faceHW - 1), ey = o.earY;
        paint(g, (g) => { g.ellipse(ex, ey, 4.8, 8.2, 0, 0, PI2); },
          lg(g, ex - 6, ey - 8, ex + 6, ey + 8, [[0, P.skin], [1, P.skinSh]]), P.line, 1.8);
      }
    }
    paint(g, (g) => facePath(g, o), lg(g, o.cx, o.top, o.cx + 6, o.chinY, [[0, P.skin], [0.7, P.skin], [1, P.skinSh]]), P.line, 2.2);
    clipped(g, (g) => facePath(g, o), () => {
      // soft cast shadow from the hairline / fringe
      g.fillStyle = lg(g, 0, o.top - 2, 0, o.top + 13, [[0, 'rgba(70,30,50,0.30)'], [1, 'rgba(70,30,50,0)']]);
      g.fillRect(o.cx - o.faceHW - 2, o.top - 2, o.faceHW * 2 + 4, 16);
      g.fillStyle = 'rgba(120,50,40,0.13)';
      g.beginPath(); g.ellipse(o.cx + o.faceHW + 4, o.cheekY - 4, 14, 44, 0, 0, PI2); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.14)';
      g.beginPath(); g.ellipse(o.cx - 8, o.top + 12, 16, 8, -0.1, 0, PI2); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.10)';
      g.beginPath(); g.ellipse(o.cx - 16, o.cheekY - 10, 6, 8, 0, 0, PI2); g.fill();
    });
    // blush
    const bl = (P.blush == null ? 0.14 : P.blush) + (E.blush || 0);
    if (bl > 0) {
      for (const side of [-1, 1]) {
        const bx = o.cx + side * (o.eyeDX + 4), by = o.eyeY + 13;
        g.fillStyle = rg(g, bx, by, 0, bx, by, 10, [[0, 'rgba(255,92,118,' + Math.min(0.85, bl) + ')'], [1, 'rgba(255,92,118,0)']]);
        g.beginPath(); g.arc(bx, by, 10, 0, PI2); g.fill();
      }
    }
    if (spec.mid) spec.mid(g, P, o, E);
    noseDraw(g, P, o);
    for (const side of [-1, 1]) {
      eyeDraw(g, P, o, side, E);
      browDraw(g, P, o, side, E);
    }
    mouthDraw(g, P, o, E);
  }
  function dropMark(g, x, y, s, fill) { drop(g, x, y, s, fill); }
  function marks(g, P, o, E) {
    if (E.tear) dropMark(g, o.cx - o.eyeDX + 1, o.eyeY + o.eyeH + 6, 3.4, 'rgba(150,210,255,0.95)');
    if (E.sweat) dropMark(g, o.cx + o.faceHW - 2, o.top + 6, 4.2, '#9fd8ff');
    if (E.vein) {
      const x = o.cx + o.faceHW - 6, y = o.top + 12;
      g.strokeStyle = '#d62f3f'; g.lineWidth = 1.6; g.lineCap = 'round';
      g.beginPath(); g.moveTo(x - 3, y - 3); g.lineTo(x + 3, y + 3); g.moveTo(x + 3, y - 3); g.lineTo(x - 3, y + 3); g.stroke();
    }
  }

  // ------------------------------------------------------------ character specs
  const SPEC = {};

  // ---- Claret: dark blue-black wavy hair, goggles, leather jacket, blue top, brass pendant
  SPEC.claret = {
    color: '#2f5c9e',
    p: { skin: '#f3c8a4', skinSh: '#d4937a', line: '#1d1520', hair: '#252b56', hairHi: '#6f84c8', hairSh: '#0b0d22', eye: '#3d86d6', brow: '#1b1e36', lip: '#c46a70', blush: 0.2, look: 0.7, browW: 2.6 },
    back(g, P, o, R) {
      const cx = o.cx;
      const fn = (g) => {
        g.moveTo(cx - 37, 66); g.quadraticCurveTo(cx - 42, 26, cx, 21); g.quadraticCurveTo(cx + 42, 26, cx + 37, 66);
        g.quadraticCurveTo(cx + 44, 92, cx + 40, 112);
        waveTo(g, cx + 40, 112, cx + 46, 156, 4, 3);
        g.lineTo(cx - 46, 156);
        waveTo(g, cx - 46, 156, cx - 40, 112, 4, 3);
        g.quadraticCurveTo(cx - 44, 92, cx - 37, 66); g.closePath();
      };
      hairMass(g, P, fn, 21, 156);
      hairHi(g, P, R.rng, fn, [cx - 40, 30, cx + 40, 150], 26, 16);
    },
    body(g, P, o) {
      const cx = o.cx;
      neckPaint(g, P, o);
      paint(g, (g) => shoulderPath(g, o), lg(g, 0, o.shY, 0, o.bottom, [[0, '#3f73b8'], [1, '#1a3868']]), P.line, 2);
      // jacket panels (left, mirrored)
      sym(g, cx, (g) => paint(g, (g) => {
        g.moveTo(cx - o.nw - 3, o.neckBot - 2); g.lineTo(cx - o.sw + 6, o.shY + 8);
        g.quadraticCurveTo(cx - o.sw - 1, o.shY + 26, cx - o.sw + 4, o.bottom + 4);
        g.lineTo(cx - 12, o.bottom + 4); g.lineTo(cx - 7, o.neckBot + 30);
        g.quadraticCurveTo(cx - 12, o.neckBot + 8, cx - o.nw - 3, o.neckBot - 2); g.closePath();
      }, lg(g, cx - 30, o.shY, cx - 6, o.bottom, [[0, '#b77a48'], [0.5, '#8b5530'], [1, '#4f2c18']]), P.line, 2));
      // highlight on jacket
      sym(g, cx, (g) => {
        g.beginPath(); g.moveTo(cx - 26, o.shY + 22); g.quadraticCurveTo(cx - 24, o.shY + 40, cx - 20, o.shY + 62);
        g.strokeStyle = 'rgba(255,220,170,0.25)'; g.lineWidth = 3; g.lineCap = 'round'; g.stroke();
      });
      // leather straps crossing the chest
      sym(g, cx, (g) => {
        g.beginPath(); g.moveTo(cx - o.sw + 12, o.shY + 12); g.lineTo(cx - 16, o.bottom);
        g.strokeStyle = '#2a1810'; g.lineWidth = 4.2; g.stroke();
        g.beginPath(); g.arc(cx - 26, o.shY + 22, 2.2, 0, PI2); g.fillStyle = '#d6a24a'; g.fill();
      });
      // brass pendant on a chain
      g.beginPath(); g.moveTo(cx - 9, o.neckBot - 1); g.lineTo(cx, o.neckBot + 11); g.lineTo(cx + 9, o.neckBot - 1);
      g.strokeStyle = '#d6a24a'; g.lineWidth = 1.1; g.stroke();
      paint(g, (g) => g.arc(cx, o.neckBot + 12.5, 4.4, 0, PI2), rg(g, cx - 1, o.neckBot + 11, 0.5, cx, o.neckBot + 12.5, 4.6, [[0, '#ffe9a0'], [1, '#8a5a1a']]), '#4a2e0a', 1);
    },
    front(g, P, o, R) {
      const cx = o.cx;
      const fn = (g) => {
        g.moveTo(cx - 31, 62); g.quadraticCurveTo(cx - 38, 26, cx - 2, 21); g.quadraticCurveTo(cx + 36, 24, cx + 32, 62);
        g.quadraticCurveTo(cx + 26, 48, cx + 12, 44); g.quadraticCurveTo(cx - 2, 40, cx - 16, 50); g.quadraticCurveTo(cx - 22, 54, cx - 31, 62); g.closePath();
      };
      hairMass(g, P, fn, 21, 62);
      hairHi(g, P, R.rng, fn, [cx - 30, 22, cx + 30, 60], 14, 10);
      // side locks over the ears
      sym(g, cx, (g) => hairMass(g, P, (g) => {
        g.moveTo(cx - 27, 58); g.quadraticCurveTo(cx - 34, 92, cx - 29, 128);
        g.quadraticCurveTo(cx - 24, 136, cx - 19, 127); g.quadraticCurveTo(cx - 24, 96, cx - 20, 62); g.closePath();
      }, 58, 136));
    },
    acc(g, P, o) {
      const cx = o.cx;
      g.beginPath(); g.moveTo(cx - 31, 48); g.quadraticCurveTo(cx, 30, cx + 31, 48);
      g.strokeStyle = '#3b2416'; g.lineWidth = 4; g.stroke();
      const gy = 43;
      for (const s of [-1, 1]) {
        const gx = cx + s * 12;
        paint(g, (g) => g.arc(gx, gy, 9.6, 0, PI2), lg(g, gx - 9, gy - 9, gx + 9, gy + 9, [[0, '#f5d27a'], [0.5, '#c28a2c'], [1, '#6e4612']]), P.line, 1.8);
        paint(g, (g) => g.arc(gx, gy, 6.4, 0, PI2), rg(g, gx - 2, gy - 2, 1, gx, gy, 6.6, [[0, '#e8fbff'], [0.6, '#6fc6ef'], [1, '#2d6fb0']]), '#1e3d66', 1);
        g.beginPath(); g.arc(gx - 2.5, gy - 2.5, 1.6, 0, PI2); g.fillStyle = 'rgba(255,255,255,0.9)'; g.fill();
      }
      paint(g, (g) => { g.rect(cx - 4, gy - 2, 8, 4); }, '#c9962e', P.line, 1);
    },
  };

  // ---- Caspian: silver-streaked dark hair, scarred jaw, white-gold battered pauldrons
  SPEC.caspian = {
    color: '#8c98b8',
    geo: { faceHW: 26, jawHW: 19, chinBulge: 3, sw: 64, eyeDX: 12.5, browW: 3.2, nw: 11 },
    p: { skin: '#e4b28c', skinSh: '#b57a58', line: '#241a18', hair: '#2a2e3f', hairHi: '#9aa3b8', hairSh: '#12141e', eye: '#6f97c4', brow: '#2c2f3e', lip: '#a4645a', blush: 0.08, look: 0.3, lowerLid: '#6a5060' },
    back(g, P, o, R) {
      const cx = o.cx;
      const fn = (g) => {
        g.moveTo(cx - 30, 80); g.quadraticCurveTo(cx - 36, 28, cx, 22); g.quadraticCurveTo(cx + 36, 28, cx + 30, 80);
        g.quadraticCurveTo(cx + 34, 104, cx + 30, 118); g.lineTo(cx - 30, 118); g.quadraticCurveTo(cx - 34, 104, cx - 30, 80); g.closePath();
      };
      hairMass(g, P, fn, 22, 118);
    },
    body(g, P, o) {
      const cx = o.cx;
      neckPaint(g, P, o);
      paint(g, (g) => shoulderPath(g, o), lg(g, 0, o.shY, 0, o.bottom, [[0, '#4a5066'], [1, '#22263a']]), P.line, 2);
      // scuffed white-gold pauldrons
      sym(g, cx, (g) => {
        paint(g, (g) => {
          g.moveTo(cx - o.sw - 6, o.shY + 2);
          g.quadraticCurveTo(cx - o.sw + 6, o.shY - 14, cx - 26, o.shY + 2);
          g.quadraticCurveTo(cx - 24, o.shY + 34, cx - o.sw - 4, o.shY + 40);
          g.closePath();
        }, lg(g, cx - 60, o.shY - 10, cx - 20, o.shY + 40, [[0, '#ffffff'], [0.5, '#e6e2d6'], [1, '#aaa496']]), P.line, 2);
        g.beginPath(); g.moveTo(cx - 52, o.shY + 6); g.quadraticCurveTo(cx - 40, o.shY - 2, cx - 30, o.shY + 8);
        g.strokeStyle = '#d8a941'; g.lineWidth = 2.6; g.stroke();
        g.beginPath(); g.moveTo(cx - 50, o.shY + 22); g.lineTo(cx - 34, o.shY + 16);
        g.moveTo(cx - 46, o.shY + 30); g.lineTo(cx - 28, o.shY + 26);
        g.strokeStyle = 'rgba(70,60,50,0.55)'; g.lineWidth = 0.9; g.stroke();
        // scratched sigil (circle with a broken flame)
        g.beginPath(); g.arc(cx - 40, o.shY + 18, 5, 0.3, Math.PI * 1.8); g.strokeStyle = 'rgba(80,80,90,0.6)'; g.lineWidth = 0.9; g.stroke();
        g.beginPath(); g.moveTo(cx - 40, o.shY + 15); g.lineTo(cx - 41, o.shY + 22); g.lineTo(cx - 37, o.shY + 21);
        g.strokeStyle = 'rgba(80,80,90,0.5)'; g.stroke();
      });
      // tunic collar V
      paint(g, (g) => {
        g.moveTo(cx - 12, o.neckBot - 2); g.lineTo(cx, o.neckBot + 22); g.lineTo(cx + 12, o.neckBot - 2); g.closePath();
      }, '#1d2030', null);
    },
    front(g, P, o, R) {
      const cx = o.cx;
      const fn = (g) => {
        g.moveTo(cx - 30, 62); g.quadraticCurveTo(cx - 34, 26, cx + 2, 21); g.quadraticCurveTo(cx + 34, 26, cx + 30, 62);
        g.quadraticCurveTo(cx + 18, 40, cx - 2, 42); g.quadraticCurveTo(cx - 16, 44, cx - 26, 52); g.quadraticCurveTo(cx - 28, 56, cx - 30, 62); g.closePath();
      };
      hairMass(g, P, fn, 21, 62);
      hairHi(g, P, R.rng, fn, [cx - 30, 22, cx + 30, 56], 18, 12);
      // silver streaks
      clipped(g, fn, () => {
        g.strokeStyle = '#dfe6f4'; g.lineCap = 'round';
        for (let i = 0; i < 6; i++) {
          const x = cx - 22 + i * 8 + R.rng() * 2;
          g.beginPath(); g.moveTo(x, 26 + R.rng() * 4); g.quadraticCurveTo(x + 9, 36, x + 12 + R.rng() * 4, 46 + R.rng() * 6);
          g.lineWidth = 0.9 + R.rng() * 0.8; g.globalAlpha = 0.75; g.stroke(); g.globalAlpha = 1;
        }
      });
      sym(g, cx, (g) => hairMass(g, P, (g) => {
        g.moveTo(cx - 28, 58); g.quadraticCurveTo(cx - 33, 88, cx - 30, 110); g.quadraticCurveTo(cx - 24, 116, cx - 21, 108);
        g.quadraticCurveTo(cx - 24, 84, cx - 22, 62); g.closePath();
      }, 58, 116));
    },
    mid(g, P, o) {
      // stubble shade and a scar on the jaw
      clipped(g, (g) => facePath(g, o), () => {
        g.fillStyle = 'rgba(50,36,40,0.10)';
        g.beginPath(); g.ellipse(o.cx, o.chinY - 6, 22, 12, 0, 0, PI2); g.fill();
      });
      g.beginPath(); g.moveTo(o.cx - 16, o.chinY - 14); g.lineTo(o.cx - 10, o.chinY - 3);
      g.strokeStyle = '#a0584a'; g.lineWidth = 1.1; g.stroke();
      g.beginPath(); g.moveTo(o.cx - 15, o.chinY - 9); g.lineTo(o.cx - 12, o.chinY - 9.5);
      g.strokeStyle = 'rgba(255,240,230,0.7)'; g.lineWidth = 0.8; g.stroke();
    },
    acc() {},
  };

  // ---- Rook: flame-red messy hair, green coat, smirk, lucky coin
  SPEC.rook = {
    color: '#c4602a',
    geo: { faceHW: 25, jawHW: 16, eyeDX: 11.6, eyeW: 8.4 },
    p: { skin: '#eec09a', skinSh: '#c58b68', line: '#20150f', hair: '#c3431f', hairHi: '#ff9a58', hairSh: '#6e1a0c', eye: '#e3a53a', brow: '#6a2212', lip: '#c86a5e', blush: 0.2, look: 0.9, irisK: 0.86 },
    back(g, P, o, R) {
      const cx = o.cx;
      const fn = (g) => {
        const pts = [];
        for (let i = 0; i <= 14; i++) {
          const a = Math.PI + (i / 14) * Math.PI;
          const sp = i % 2 ? 0.78 : 1.0;
          pts.push([cx + Math.cos(a) * 38 * sp, 60 + Math.sin(a) * 40 * sp - 6]);
        }
        g.moveTo(pts[0][0], pts[0][1]);
        for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
        g.quadraticCurveTo(cx + 40, 86, cx + 30, 104); g.lineTo(cx - 30, 104);
        g.quadraticCurveTo(cx - 40, 86, cx - 38, 70); g.closePath();
      };
      hairMass(g, P, fn, 14, 104);
      hairHi(g, P, R.rng, fn, [cx - 40, 14, cx + 40, 90], 24, 10);
    },
    body(g, P, o) {
      const cx = o.cx;
      neckPaint(g, P, o);
      paint(g, (g) => shoulderPath(g, o), lg(g, 0, o.shY, 0, o.bottom, [[0, '#3e8a5e'], [1, '#1c4530']]), P.line, 2);
      // white shirt V
      paint(g, (g) => { g.moveTo(cx - 9, o.neckBot - 2); g.lineTo(cx, o.neckBot + 26); g.lineTo(cx + 9, o.neckBot - 2); g.closePath(); }, '#efeadf', P.line, 1);
      // high upturned collars
      sym(g, cx, (g) => paint(g, (g) => {
        g.moveTo(cx - 6, o.neckBot - 8); g.lineTo(cx - 19, o.neckBot - 26); g.lineTo(cx - 14, o.neckBot + 4); g.closePath();
      }, '#2a5e42', P.line, 1.4));
      // coat lapels and trim
      sym(g, cx, (g) => {
        paint(g, (g) => {
          g.moveTo(cx - 9, o.neckBot - 2); g.lineTo(cx - 26, o.shY + 30); g.lineTo(cx - 18, o.bottom + 4); g.lineTo(cx - 6, o.bottom + 4); g.lineTo(cx - 4, o.neckBot + 20); g.closePath();
        }, lg(g, cx - 26, o.shY, cx - 4, o.bottom, [[0, '#4f9a6c'], [1, '#2a5a3e']]), P.line, 1.6);
        g.beginPath(); g.moveTo(cx - 24, o.shY + 40); g.lineTo(cx - 12, o.shY + 40);
        g.strokeStyle = '#c8a050'; g.lineWidth = 1.6; g.stroke();
        g.beginPath(); g.arc(cx - 10, o.shY + 58, 2, 0, PI2); g.fillStyle = '#e0b050'; g.fill();
      });
      // lucky coin on a chain
      g.beginPath(); g.moveTo(cx - 10, o.neckBot - 1); g.lineTo(cx - 4, o.neckBot + 22);
      g.strokeStyle = '#e0b050'; g.lineWidth = 1; g.stroke();
      paint(g, (g) => g.arc(cx - 4, o.neckBot + 25, 6, 0, PI2), rg(g, cx - 6, o.neckBot + 22, 0.5, cx - 4, o.neckBot + 25, 6.2, [[0, '#fff3b0'], [0.6, '#e6aa30'], [1, '#8a5a10']]), '#5a3a08', 1);
      g.beginPath(); g.moveTo(cx - 4, o.neckBot + 21); g.lineTo(cx - 2.5, o.neckBot + 24.6); g.lineTo(cx - 6.6, o.neckBot + 26); g.lineTo(cx - 1.5, o.neckBot + 27);
      g.strokeStyle = '#8a5a10'; g.lineWidth = 0.7; g.stroke();
    },
    front(g, P, o, R) {
      const cx = o.cx;
      const fn = (g) => {
        g.moveTo(cx - 30, 60); g.quadraticCurveTo(cx - 34, 36, cx - 10, 36);
        g.lineTo(cx - 20, 24); g.lineTo(cx - 6, 32); g.lineTo(cx, 18); g.lineTo(cx + 6, 31); g.lineTo(cx + 18, 22); g.lineTo(cx + 14, 36);
        g.quadraticCurveTo(cx + 30, 40, cx + 30, 60);
        g.quadraticCurveTo(cx + 22, 46, cx + 10, 46); g.quadraticCurveTo(cx - 2, 50, cx - 10, 46);
        g.quadraticCurveTo(cx - 20, 50, cx - 30, 60); g.closePath();
      };
      hairMass(g, P, fn, 18, 60);
      hairHi(g, P, R.rng, fn, [cx - 30, 18, cx + 30, 56], 16, 10);
      // gold hoop earring
      g.beginPath(); g.arc(cx - 27, 92, 3.4, 0.5, Math.PI * 1.6); g.strokeStyle = '#e8b64a'; g.lineWidth = 1.4; g.stroke();
    },
    acc() {},
  };

  // ---- Seraphine: teal-green hair, white winged headdress, pale robes
  SPEC.seraphine = {
    color: '#4fb8a8',
    geo: { faceHW: 24, jawHW: 16, eyeW: 8.6, eyeH: 9 },
    p: { skin: '#f7dcc8', skinSh: '#dcae98', line: '#2b2a3a', hair: '#2e9d8f', hairHi: '#9ae9dc', hairSh: '#15574e', eye: '#4fb0a4', brow: '#2e6d66', lip: '#d88c8a', blush: 0.3, look: 0.5, browW: 2.1 },
    back(g, P, o, R) {
      const cx = o.cx;
      // wings behind the head
      sym(g, cx, (g) => {
        const feathers = (x0, y0, ang, len, n) => {
          for (let i = 0; i < n; i++) {
            const t = i / (n - 1), a = ang + t * 0.9;
            const fx = x0 + Math.cos(a) * len * (0.45 + t * 0.55), fy = y0 + Math.sin(a) * len * (0.45 + t * 0.55);
            g.save(); g.translate(fx, fy); g.rotate(a + Math.PI / 2);
            g.beginPath(); g.ellipse(0, 0, 5.2, 13, 0, 0, PI2);
            g.fillStyle = lg(g, 0, -13, 0, 13, [[0, '#ffffff'], [1, '#c4cde4']]); g.fill();
            g.lineWidth = 1.1; g.strokeStyle = '#3a4a70'; g.stroke();
            g.restore();
          }
        };
        feathers(cx - 22, 52, -2.7, 52, 6);
        feathers(cx - 24, 60, -2.2, 46, 5);
      });
    },
    body(g, P, o, R) {
      const cx = o.cx;
      const fn = (g) => {
        g.moveTo(cx - 30, 56);
        g.quadraticCurveTo(cx - 36, 92, cx - 34, 124);
        g.quadraticCurveTo(cx - 32, 136, cx - 36, 150);
        g.lineTo(cx + 36, 150);
        g.quadraticCurveTo(cx + 32, 136, cx + 34, 124);
        g.quadraticCurveTo(cx + 36, 92, cx + 30, 56); g.closePath();
      };
      hairMass(g, P, fn, 56, 150);
      hairHi(g, P, R.rng, fn, [cx - 34, 60, cx + 34, 146], 24, 16);
      neckPaint(g, P, o);
      paint(g, (g) => shoulderPath(g, o), lg(g, 0, o.shY, 0, o.bottom, [[0, '#f8f9fe'], [1, '#c8d0e6']]), P.line, 2);
      // lavender sash and gold embroidered collar
      paint(g, (g) => { g.moveTo(cx - 26, o.shY + 30); g.quadraticCurveTo(cx, o.shY + 40, cx + 26, o.shY + 30); g.lineTo(cx + 26, o.shY + 42); g.quadraticCurveTo(cx, o.shY + 52, cx - 26, o.shY + 42); g.closePath(); }, '#cbbcf0', P.line, 1);
      g.beginPath(); g.moveTo(cx - 14, o.neckBot - 2); g.lineTo(cx, o.neckBot + 30); g.lineTo(cx + 14, o.neckBot - 2);
      g.strokeStyle = '#e7c46b'; g.lineWidth = 2.4; g.stroke();
      g.beginPath(); g.arc(cx, o.neckBot + 16, 3.4, 0, PI2); g.fillStyle = '#e7c46b'; g.fill();
      g.beginPath(); g.arc(cx, o.neckBot + 16, 1.4, 0, PI2); g.fillStyle = '#7ce6d6'; g.fill();
      for (const s of [-1, 1]) { // side bands of the robe
        g.beginPath(); g.moveTo(cx + s * 24, o.shY + 6); g.lineTo(cx + s * 30, o.bottom);
        g.strokeStyle = 'rgba(200,190,235,0.7)'; g.lineWidth = 2; g.stroke();
      }
    },
    front(g, P, o, R) {
      const cx = o.cx;
      const fn = (g) => {
        g.moveTo(cx - 28, 66); g.quadraticCurveTo(cx - 34, 30, cx - 2, 21); g.quadraticCurveTo(cx + 34, 28, cx + 28, 66);
        g.quadraticCurveTo(cx + 22, 52, cx + 4, 56); g.quadraticCurveTo(cx - 6, 62, cx - 2, 46); g.quadraticCurveTo(cx - 20, 50, cx - 28, 66); g.closePath();
      };
      hairMass(g, P, fn, 21, 66);
      hairHi(g, P, R.rng, fn, [cx - 28, 22, cx + 28, 60], 14, 12);
      sym(g, cx, (g) => hairMass(g, P, (g) => {
        g.moveTo(cx - 27, 60); g.quadraticCurveTo(cx - 33, 90, cx - 30, 124); g.quadraticCurveTo(cx - 24, 130, cx - 20, 122);
        g.quadraticCurveTo(cx - 24, 92, cx - 20, 64); g.closePath();
      }, 60, 128));
    },
    acc(g, P, o) {
      const cx = o.cx;
      g.beginPath(); g.arc(cx, 50, 27, Math.PI * 1.12, Math.PI * 1.88); g.strokeStyle = '#e7c46b'; g.lineWidth = 2.6; g.stroke();
      paint(g, (g) => g.arc(cx, 42, 3.2, 0, PI2), rg(g, cx - 1, 41, 0.3, cx, 42, 3.4, [[0, '#e8fff8'], [1, '#2a9a88']]), '#8a6a1a', 1);
    },
  };

  // ---- Wren (they/them): messy blue-grey hair, wide blue witch hat, patchwork cloak
  SPEC.wren = {
    color: '#3a5fb8',
    geo: { faceHW: 24, jawHW: 16, eyeW: 8.8, eyeH: 9.2, eyeDX: 12.6 },
    p: { skin: '#e9c0a2', skinSh: '#c08e72', line: '#1f2030', hair: '#6c7d98', hairHi: '#bccae0', hairSh: '#38455c', eye: '#86c6e0', brow: '#3d4a60', lip: '#b98072', blush: 0.16, look: 0.4, browW: 2.2, freckle: '#a06a4f' },
    back(g, P, o, R) {
      const cx = o.cx;
      const fn = (g) => {
        g.moveTo(cx - 34, 62); g.quadraticCurveTo(cx - 36, 30, cx, 26); g.quadraticCurveTo(cx + 36, 30, cx + 34, 62);
        g.lineTo(cx + 38, 96); g.lineTo(cx + 32, 104); g.lineTo(cx + 36, 116); g.lineTo(cx - 36, 116); g.lineTo(cx - 32, 104); g.lineTo(cx - 38, 96); g.closePath();
      };
      hairMass(g, P, fn, 26, 116);
    },
    body(g, P, o, R) {
      const cx = o.cx;
      neckPaint(g, P, o);
      paint(g, (g) => shoulderPath(g, o), '#3b3442', P.line, 2);
      // patchwork cloak: coloured panels clipped to the shoulder shape
      const patches = ['#9a5a3a', '#c59a3a', '#4f7a4a', '#7a4a7a', '#d8c8a0', '#3f6a8a', '#b04a3a', '#5a7a3a'];
      clipped(g, (g) => shoulderPath(g, o), () => {
        for (let i = 0; i < 14; i++) {
          const x = cx - 66 + (i % 7) * 20 + R.rng() * 6, y = o.shY - 4 + Math.floor(i / 7) * 26 + R.rng() * 8;
          const w = 14 + R.rng() * 8, h = 12 + R.rng() * 8;
          g.save(); g.translate(x + w / 2, y + h / 2); g.rotate((R.rng() - 0.5) * 0.4);
          g.fillStyle = patches[i % patches.length]; g.fillRect(-w / 2, -h / 2, w, h);
          g.setLineDash([2, 2]); g.strokeStyle = 'rgba(255,240,210,0.6)'; g.lineWidth = 0.8; g.strokeRect(-w / 2 + 1.5, -h / 2 + 1.5, w - 3, h - 3); g.setLineDash([]);
          g.restore();
        }
      });
      paint(g, (g) => shoulderPath(g, o), null, P.line, 2);
      // high cloak collar
      sym(g, cx, (g) => paint(g, (g) => {
        g.moveTo(cx - 8, o.neckBot - 6); g.lineTo(cx - 22, o.neckBot - 18); g.lineTo(cx - 14, o.neckBot + 4); g.closePath();
      }, '#4a4256', P.line, 1.4));
      // a bit of blue inner tunic
      paint(g, (g) => { g.moveTo(cx - 8, o.neckBot - 2); g.lineTo(cx, o.neckBot + 18); g.lineTo(cx + 8, o.neckBot - 2); g.closePath(); }, '#2f4fa0', null);
    },
    front(g, P, o, R) {
      const cx = o.cx;
      const fn = (g) => {
        g.moveTo(cx - 30, 60); g.lineTo(cx - 33, 48); g.lineTo(cx - 26, 46); g.lineTo(cx - 24, 40);
        g.quadraticCurveTo(cx - 6, 52, cx + 4, 42); g.lineTo(cx + 14, 46); g.lineTo(cx + 22, 42); g.lineTo(cx + 26, 52); g.lineTo(cx + 32, 58);
        g.quadraticCurveTo(cx + 22, 60, cx + 18, 64); g.lineTo(cx - 30, 64); g.closePath();
      };
      hairMass(g, P, fn, 40, 64);
      hairHi(g, P, R.rng, fn, [cx - 30, 40, cx + 30, 62], 14, 8);
    },
    mid(g, P, o) {
      clipped(g, (g) => facePath(g, o), () => {
        g.fillStyle = P.freckle; g.globalAlpha = 0.5;
        [[-14, 97], [-10, 100], [-16, 101], [11, 98], [14, 101], [8, 101]].forEach(([x, y]) => { g.beginPath(); g.arc(o.cx + x, y, 0.9, 0, PI2); g.fill(); });
        g.globalAlpha = 1;
      });
    },
    acc(g, P, o, R) {
      const cx = o.cx;
      // wide blue hat, bent tip, band and feather
      paint(g, (g) => g.ellipse(cx, 52, 46, 9, 0, 0, PI2), lg(g, 0, 44, 0, 60, [[0, '#3b64c4'], [1, '#1d3684']]), P.line, 1.8);
      paint(g, (g) => { g.moveTo(cx - 23, 52); g.quadraticCurveTo(cx - 24, 18, cx - 4, 10); g.quadraticCurveTo(cx + 10, 4, cx + 30, 9); g.quadraticCurveTo(cx + 14, 18, cx + 22, 52); g.closePath(); },
        lg(g, cx - 24, 0, cx + 24, 0, [[0, '#4a72d0'], [0.5, '#2c4fb0'], [1, '#1a2f78']]), P.line, 1.8);
      g.beginPath(); g.moveTo(cx - 23, 42); g.quadraticCurveTo(cx, 46, cx + 22, 42); g.lineTo(cx + 22, 49); g.quadraticCurveTo(cx, 53, cx - 23, 49); g.closePath();
      g.fillStyle = '#15266c'; g.fill(); g.strokeStyle = P.line; g.lineWidth = 1; g.stroke();
      paint(g, (g) => g.rect(cx - 3, 41, 6, 6), '#d8a94a', '#5a3a08', 0.9);
      // feather
      g.beginPath(); g.moveTo(cx + 18, 36); g.quadraticCurveTo(cx + 40, 20, cx + 46, 0);
      g.strokeStyle = '#2a3a4a'; g.lineWidth = 3.4; g.stroke();
      g.beginPath(); g.moveTo(cx + 18, 36); g.quadraticCurveTo(cx + 40, 20, cx + 46, 0);
      g.strokeStyle = '#ece8f8'; g.lineWidth = 2; g.stroke();
      g.beginPath(); g.moveTo(cx + 28, 24); g.lineTo(cx + 22, 16); g.moveTo(cx + 34, 16); g.lineTo(cx + 28, 8);
      g.strokeStyle = '#7ec08a'; g.lineWidth = 1.2; g.stroke();
    },
  };

  // ---- Rowan: warm chestnut hair, cream + gold lamplighter's coat, empty lantern pendant
  SPEC.rowan = {
    color: '#d9a447',
    p: { skin: '#f1c9a3', skinSh: '#d7a07c', line: '#2a1a14', hair: '#8b4e2b', hairHi: '#e0a46a', hairSh: '#4e2614', eye: '#6b9a4c', brow: '#5a3420', lip: '#c67c6c', blush: 0.14, look: 0.6, browW: 2.3, irisK: 0.84 },
    back(g, P, o, R) {
      const cx = o.cx;
      const fn = (g) => {
        g.moveTo(cx - 36, 64); g.quadraticCurveTo(cx - 40, 26, cx, 21); g.quadraticCurveTo(cx + 40, 26, cx + 36, 64);
        g.quadraticCurveTo(cx + 40, 92, cx + 36, 112);
        waveTo(g, cx + 36, 112, cx + 34, 136, 2, 2.5);
        g.lineTo(cx - 34, 136);
        waveTo(g, cx - 34, 136, cx - 36, 112, 2, 2.5);
        g.quadraticCurveTo(cx - 40, 92, cx - 36, 64); g.closePath();
      };
      hairMass(g, P, fn, 21, 136);
      hairHi(g, P, R.rng, fn, [cx - 36, 26, cx + 36, 130], 22, 14);
    },
    body(g, P, o) {
      const cx = o.cx;
      neckPaint(g, P, o);
      paint(g, (g) => shoulderPath(g, o), lg(g, 0, o.shY, 0, o.bottom, [[0, '#f6e8c8'], [1, '#c7aa70']]), P.line, 2);
      // high collar
      sym(g, cx, (g) => paint(g, (g) => {
        g.moveTo(cx - 8, o.neckBot - 4); g.lineTo(cx - 20, o.neckBot - 18); g.lineTo(cx - 13, o.neckBot + 8); g.closePath();
      }, '#e6cf98', P.line, 1.4));
      // coat front panels with gold trim and buttons
      sym(g, cx, (g) => {
        g.beginPath(); g.moveTo(cx - 6, o.neckBot - 2); g.lineTo(cx - 6, o.bottom); g.strokeStyle = '#d9a33c'; g.lineWidth = 2; g.stroke();
        g.beginPath(); g.moveTo(cx - 24, o.shY + 40); g.quadraticCurveTo(cx - 14, o.shY + 50, cx - 8, o.shY + 66);
        g.strokeStyle = 'rgba(160,120,50,0.5)'; g.lineWidth = 1.2; g.stroke();
      });
      for (const by of [o.neckBot + 22, o.neckBot + 40, o.neckBot + 58]) {
        paint(g, (g) => g.arc(cx, by, 2.2, 0, PI2), rg(g, cx - 1, by - 1, 0.3, cx, by, 2.4, [[0, '#fff1b0'], [1, '#b07a1a']]), '#5a3a08', 0.8);
      }
      // empty lantern pendant on a thin chain
      g.beginPath(); g.moveTo(cx - 8, o.neckBot - 2); g.lineTo(cx, o.neckBot + 6); g.lineTo(cx + 8, o.neckBot - 2);
      g.strokeStyle = '#d9a33c'; g.lineWidth = 1; g.stroke();
      rr(g, cx - 4, o.neckBot + 5, 8, 10, 2.2);
      g.fillStyle = 'rgba(40,30,30,0.35)'; g.fill();
      g.strokeStyle = '#8a6a2a'; g.lineWidth = 1.4; g.stroke();
      rr(g, cx - 2.2, o.neckBot + 2.4, 4.4, 2.8, 1); g.fillStyle = '#c99a3c'; g.fill(); g.strokeStyle = '#5a3a08'; g.lineWidth = 0.8; g.stroke();
      g.beginPath(); g.moveTo(cx - 2, o.neckBot + 8); g.lineTo(cx - 2, o.neckBot + 12); g.strokeStyle = 'rgba(255,255,255,0.45)'; g.lineWidth = 0.9; g.stroke();
    },
    front(g, P, o, R) {
      const cx = o.cx;
      const fn = (g) => {
        g.moveTo(cx - 30, 62); g.quadraticCurveTo(cx - 36, 28, cx - 2, 21); g.quadraticCurveTo(cx + 36, 26, cx + 31, 62);
        g.quadraticCurveTo(cx + 22, 50, cx + 6, 52); g.quadraticCurveTo(cx - 2, 42, cx - 8, 50);
        g.quadraticCurveTo(cx - 18, 46, cx - 30, 62); g.closePath();
      };
      hairMass(g, P, fn, 21, 62);
      hairHi(g, P, R.rng, fn, [cx - 30, 22, cx + 30, 58], 16, 10);
      sym(g, cx, (g) => hairMass(g, P, (g) => {
        g.moveTo(cx - 28, 60); g.quadraticCurveTo(cx - 33, 92, cx - 30, 120); g.quadraticCurveTo(cx - 25, 126, cx - 21, 118);
        g.quadraticCurveTo(cx - 24, 92, cx - 22, 62); g.closePath();
      }, 60, 126));
    },
    acc() {},
  };

  // ---- Maren: grey bun, knitted shawl, round glasses, wrinkles
  SPEC.maren = {
    color: '#9a4f5a',
    geo: { faceHW: 24, jawHW: 17, eyeW: 7.4, eyeH: 7.2, browW: 2.2, mouthW: 7 },
    p: { skin: '#e6b595', skinSh: '#b98362', line: '#2a2024', hair: '#a4aab4', hairHi: '#eef0f4', hairSh: '#5f6674', eye: '#6b4a2c', brow: '#8c8f98', lip: '#b87a6e', blush: 0.14, look: 0.4, lowerLid: '#a07060' },
    back(g, P, o, R) {
      const cx = o.cx;
      hairMass(g, P, (g) => { g.arc(cx + 6, 30, 14, 0, PI2); }, 16, 44);
      paint(g, (g) => g.arc(cx + 6, 30, 3.2, 0, PI2), '#8a2f3a', P.line, 1);
      const fn = (g) => {
        g.moveTo(cx - 32, 70); g.quadraticCurveTo(cx - 32, 32, cx, 24); g.quadraticCurveTo(cx + 32, 32, cx + 32, 70);
        g.quadraticCurveTo(cx + 30, 100, cx + 28, 120); g.lineTo(cx - 28, 120); g.quadraticCurveTo(cx - 30, 100, cx - 32, 70); g.closePath();
      };
      hairMass(g, P, fn, 24, 120);
    },
    body(g, P, o, R) {
      const cx = o.cx;
      neckPaint(g, P, o);
      paint(g, (g) => shoulderPath(g, o), '#e9dfd0', P.line, 2);
      // cameo brooch on blouse
      paint(g, (g) => g.ellipse(cx, o.neckBot + 12, 4.4, 5.4, 0, 0, PI2), rg(g, cx - 1, o.neckBot + 10, 0.5, cx, o.neckBot + 12, 5.6, [[0, '#fff0d0'], [1, '#b8843a']]), '#5a3a08', 1);
      // knitted shawl (drapes over shoulders) with knit texture
      const shawl = (g) => {
        g.moveTo(cx - 34, o.shY - 8); g.quadraticCurveTo(cx, o.neckBot - 6, cx + 34, o.shY - 8);
        g.quadraticCurveTo(cx + 46, o.shY + 40, cx + 44, o.bottom + 6); g.lineTo(cx - 44, o.bottom + 6);
        g.quadraticCurveTo(cx - 46, o.shY + 40, cx - 34, o.shY - 8); g.closePath();
      };
      paint(g, shawl, lg(g, 0, o.shY, 0, o.bottom, [[0, '#b0606c'], [1, '#6a2e3a']]), P.line, 2);
      clipped(g, shawl, () => {
        g.strokeStyle = 'rgba(255,220,220,0.22)'; g.lineWidth = 1;
        for (let y = o.shY; y < o.bottom; y += 4) {
          g.beginPath();
          for (let x = cx - 50; x < cx + 50; x += 6) { g.moveTo(x, y); g.quadraticCurveTo(x + 3, y - 2, x + 6, y); }
          g.stroke();
        }
      });
      // fringe at the bottom edge of the shawl
      g.strokeStyle = '#e8dcc8'; g.lineWidth = 1;
      for (let x = cx - 40; x <= cx + 40; x += 4) { g.beginPath(); g.moveTo(x, o.bottom + 4); g.lineTo(x + (R.rng() - 0.5) * 2, o.bottom + 9); g.stroke(); }
    },
    front(g, P, o, R) {
      const cx = o.cx;
      const fn = (g) => {
        g.moveTo(cx - 28, 58); g.quadraticCurveTo(cx - 30, 36, cx - 4, 27); g.quadraticCurveTo(cx + 20, 30, cx + 27, 56);
        g.quadraticCurveTo(cx + 12, 44, cx - 2, 48); g.quadraticCurveTo(cx - 14, 46, cx - 28, 58); g.closePath();
      };
      hairMass(g, P, fn, 26, 58);
      hairHi(g, P, R.rng, fn, [cx - 28, 28, cx + 28, 56], 14, 10);
    },
    mid(g, P, o) {
      // nasolabial folds
      g.strokeStyle = 'rgba(120,70,50,0.45)'; g.lineWidth = 1.1; g.lineCap = 'round';
      g.beginPath(); g.moveTo(o.cx - 15, o.noseY + 2); g.quadraticCurveTo(o.cx - 19, o.noseY + 8, o.cx - 16, o.mouthY - 2); g.stroke();
      g.beginPath(); g.moveTo(o.cx + 15, o.noseY + 2); g.quadraticCurveTo(o.cx + 19, o.noseY + 8, o.cx + 16, o.mouthY - 2); g.stroke();
      // forehead lines
      g.beginPath(); g.moveTo(o.cx - 14, o.top + 14); g.quadraticCurveTo(o.cx, o.top + 12, o.cx + 14, o.top + 14);
      g.moveTo(o.cx - 12, o.top + 20); g.quadraticCurveTo(o.cx, o.top + 18, o.cx + 12, o.top + 20); g.stroke();
    },
    acc(g, P, o) {
      const cx = o.cx;
      for (const s of [-1, 1]) {
        const gx = cx + s * o.eyeDX, gy = o.eyeY + 0.5;
        g.beginPath(); g.arc(gx, gy, 9, 0, PI2); g.strokeStyle = '#8a6a2a'; g.lineWidth = 1.5; g.stroke();
        g.beginPath(); g.arc(gx, gy, 9, 0, PI2); g.fillStyle = 'rgba(210,240,250,0.12)'; g.fill();
      }
      g.beginPath(); g.moveTo(cx - 3, o.eyeY - 1); g.quadraticCurveTo(cx, o.eyeY - 4, cx + 3, o.eyeY - 1);
      g.strokeStyle = '#8a6a2a'; g.lineWidth = 1.2; g.stroke();
    },
  };

  // ---- Bram: grey beard, goggles pushed up on the forehead, leather apron
  SPEC.bram = {
    color: '#8c7a5a',
    geo: { faceHW: 26, jawHW: 19, eyeW: 7.8, eyeH: 7.4, browW: 3.4, mouthW: 8, cheekY: 96 },
    p: { skin: '#dfa98c', skinSh: '#b27f63', line: '#23191a', hair: '#8a8273', hairHi: '#c8c1b4', hairSh: '#4f4a42', eye: '#5b4a3a', brow: '#8f8a80', lip: '#9c6a5e', beard: '#8c8a86', beardSh: '#5d5b58', blush: 0.1, look: 0.2 },
    back(g, P, o, R) {
      const cx = o.cx;
      const fn = (g) => {
        g.moveTo(cx - 30, 58); g.quadraticCurveTo(cx - 32, 28, cx, 22); g.quadraticCurveTo(cx + 32, 28, cx + 30, 58);
        g.lineTo(cx + 30, 66); g.lineTo(cx - 30, 66); g.closePath();
      };
      hairMass(g, P, fn, 22, 66);
    },
    body(g, P, o, R) {
      const cx = o.cx;
      neckPaint(g, P, o);
      paint(g, (g) => shoulderPath(g, o), lg(g, 0, o.shY, 0, o.bottom, [[0, '#e6dfcc'], [1, '#aea68e']]), P.line, 2);
      // leather apron
      paint(g, (g) => {
        g.moveTo(cx - 30, o.shY + 14); g.lineTo(cx + 30, o.shY + 14); g.lineTo(cx + 36, o.bottom + 4); g.lineTo(cx - 36, o.bottom + 4); g.closePath();
      }, lg(g, 0, o.shY, 0, o.bottom, [[0, '#8a5e36'], [1, '#4a2e18']]), P.line, 2);
      g.beginPath(); g.moveTo(cx - 14, o.shY + 14); g.quadraticCurveTo(cx - 12, o.shY - 14, cx - 22, o.neckBot - 2);
      g.moveTo(cx + 14, o.shY + 14); g.quadraticCurveTo(cx + 12, o.shY - 14, cx + 22, o.neckBot - 2);
      g.strokeStyle = '#5a3a20'; g.lineWidth = 3; g.stroke();
      paint(g, (g) => g.rect(cx - 16, o.shY + 40, 32, 22), '#7a5232', P.line, 1.2);
      for (const [rx, ry] of [[cx - 26, o.shY + 22], [cx + 26, o.shY + 22], [cx - 24, o.shY + 60], [cx + 24, o.shY + 60]]) {
        paint(g, (g) => g.arc(rx, ry, 1.6, 0, PI2), '#d0b070', null);
      }
    },
    front(g, P, o, R) {
      const cx = o.cx;
      const fn = (g) => {
        g.moveTo(cx - 30, 52); g.quadraticCurveTo(cx - 30, 36, cx - 16, 34); g.quadraticCurveTo(cx, 30, cx + 16, 34);
        g.quadraticCurveTo(cx + 30, 36, cx + 30, 52); g.quadraticCurveTo(cx + 24, 44, cx + 10, 46); g.quadraticCurveTo(cx, 42, cx - 10, 46);
        g.quadraticCurveTo(cx - 24, 44, cx - 30, 52); g.closePath();
      };
      hairMass(g, P, fn, 30, 52);
      hairHi(g, P, R.rng, fn, [cx - 30, 30, cx + 30, 50], 12, 8);
    },
    mid(g, P, o) {
      // full grey beard from the ears to the chin, with mustache
      const beard = (g) => {
        g.moveTo(o.cx - o.faceHW - 2, o.cheekY - 8);
        g.quadraticCurveTo(o.cx - o.faceHW - 4, o.chinY + 6, o.cx - 6, o.chinY + 12);
        g.quadraticCurveTo(o.cx, o.chinY + 16, o.cx + 6, o.chinY + 12);
        g.quadraticCurveTo(o.cx + o.faceHW + 4, o.chinY + 6, o.cx + o.faceHW + 2, o.cheekY - 8);
        g.quadraticCurveTo(o.cx + 16, o.noseY + 16, o.cx, o.noseY + 14);
        g.quadraticCurveTo(o.cx - 16, o.noseY + 16, o.cx - o.faceHW - 2, o.cheekY - 8);
        g.closePath();
      };
      paint(g, beard, lg(g, 0, o.cheekY, 0, o.chinY + 16, [[0, P.beard], [1, P.beardSh]]), P.line, 1.6);
      streaks_(g, P, o);
      // mustache
      paint(g, (g) => {
        g.moveTo(o.cx - 12, o.noseY + 12); g.quadraticCurveTo(o.cx - 4, o.noseY + 9, o.cx, o.noseY + 12);
        g.quadraticCurveTo(o.cx + 4, o.noseY + 9, o.cx + 12, o.noseY + 12); g.quadraticCurveTo(o.cx + 6, o.noseY + 16, o.cx, o.noseY + 14.5);
        g.quadraticCurveTo(o.cx - 6, o.noseY + 16, o.cx - 12, o.noseY + 12); g.closePath();
      }, '#9a968c', P.line, 1);
    },
    acc(g, P, o) {
      // goggles pushed up on the head
      const cx = o.cx;
      g.beginPath(); g.moveTo(cx - 28, 40); g.quadraticCurveTo(cx, 28, cx + 28, 40); g.strokeStyle = '#4a3420'; g.lineWidth = 3.4; g.stroke();
      for (const s of [-1, 1]) {
        const gx = cx + s * 11, gy = 30;
        paint(g, (g) => g.arc(gx, gy, 8.6, 0, PI2), lg(g, gx - 8, gy - 8, gx + 8, gy + 8, [[0, '#f0c36a'], [0.5, '#b07a20'], [1, '#5a3a0a']]), P.line, 1.6);
        paint(g, (g) => g.arc(gx, gy, 5.6, 0, PI2), rg(g, gx - 2, gy - 2, 1, gx, gy, 5.8, [[0, '#fff0b0'], [1, '#c26a10']]), '#3a2408', 1);
      }
    },
  };
  function streaks_(g, P, o) {
    // grey strands in the beard
    const r = G.util.rng(9001 + o.cx);
    g.save(); g.strokeStyle = P.beardSh; g.globalAlpha = 0.6; g.lineWidth = 0.8;
    for (let i = 0; i < 16; i++) {
      const x = o.cx - 18 + r() * 36, y = o.noseY + 18 + r() * 14;
      g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 1, y + 3, x + (r() - 0.5) * 2, y + 6); g.stroke();
    }
    g.restore();
  }

  // ---- Torvald: bald burly man, handlebar mustache, red arena coat
  SPEC.torvald = {
    color: '#b8302a',
    geo: { top: 30, faceHW: 29, jawHW: 23, chinBulge: 4, cheekY: 98, chinY: 130, sw: 68, nw: 13, neckBot: 154, shY: 148, eyeW: 7, eyeH: 6.6, browW: 4.2, browY: 72, noseY: 104, mouthY: 118, mouthW: 8, eyeDX: 13, eyeY: 86 },
    p: { skin: '#c98f6c', skinSh: '#9c6247', line: '#231612', hair: '#4a3a2a', hairHi: '#6e5a44', hairSh: '#2c2118', eye: '#3a2a1a', brow: '#3b2a1f', lip: '#8e5a4e', blush: 0.26, look: 0.2, irisK: 0.86 },
    back() {},
    body(g, P, o) {
      const cx = o.cx;
      neckPaint(g, P, o);
      paint(g, (g) => shoulderPath(g, o), lg(g, 0, o.shY, 0, o.bottom, [[0, '#cc3a32'], [1, '#6e1816']]), P.line, 2);
      // open collar and gold trim
      paint(g, (g) => { g.moveTo(cx - 16, o.neckBot - 2); g.lineTo(cx, o.neckBot + 26); g.lineTo(cx + 16, o.neckBot - 2); g.closePath(); }, '#2a1412', P.line, 1);
      sym(g, cx, (g) => {
        g.beginPath(); g.moveTo(cx - 16, o.neckBot - 2); g.lineTo(cx - 30, o.shY + 6); g.strokeStyle = '#e0b050'; g.lineWidth = 2.4; g.stroke();
        g.beginPath(); g.arc(cx - 40, o.shY + 6, 6, 0, PI2); g.fillStyle = lg(g, 0, o.shY, 0, o.shY + 12, [[0, '#f8d878'], [1, '#9a6a18']]); g.fill();
        g.strokeStyle = '#4a2e08'; g.lineWidth = 1; g.stroke();
      });
      sym(g, cx, (g) => { g.beginPath(); g.moveTo(cx - 52, o.shY + 36); g.quadraticCurveTo(cx - 40, o.shY + 30, cx - 30, o.shY + 44); g.strokeStyle = 'rgba(255,190,150,0.25)'; g.lineWidth = 3; g.stroke(); });
    },
    front() {},
    mid(g, P, o) {
      // bald-dome sheen and the scar through the right brow
      g.beginPath(); g.ellipse(o.cx - 8, o.top + 6, 12, 6, -0.2, 0, PI2); g.fillStyle = 'rgba(255,240,220,0.22)'; g.fill();
      g.beginPath(); g.moveTo(o.cx + 19, o.browY - 6); g.lineTo(o.cx + 26, o.browY + 4);
      g.strokeStyle = '#a2604a'; g.lineWidth = 1.1; g.stroke();
      // handlebar mustache with curled tips
      const my = o.noseY + 13;
      paint(g, (g) => {
        g.moveTo(o.cx - 14, my + 2);
        g.quadraticCurveTo(o.cx - 22, my - 9, o.cx - 27, my - 6);
        g.quadraticCurveTo(o.cx - 23, my - 1, o.cx - 16, my + 3);
        g.quadraticCurveTo(o.cx - 6, my + 1, o.cx, my + 3);
        g.quadraticCurveTo(o.cx + 6, my + 1, o.cx + 16, my + 3);
        g.quadraticCurveTo(o.cx + 23, my - 1, o.cx + 27, my - 6);
        g.quadraticCurveTo(o.cx + 22, my - 9, o.cx + 14, my + 2);
        g.quadraticCurveTo(o.cx, my + 6, o.cx - 14, my + 2);
        g.closePath();
      }, '#4a3426', P.line, 1.2);
    },
    acc() {},
  };

  // ---- Abbess Orla: white-gold veil, white robes, gold sun medallion
  SPEC.abbess = {
    color: '#e6d6a0',
    geo: { faceHW: 24, jawHW: 17, eyeDX: 11.6, eyeW: 7.6, eyeH: 7.8 },
    p: { skin: '#ecd0b4', skinSh: '#c9a286', line: '#2a2030', hair: '#d8d4cc', hairHi: '#fff', hairSh: '#a8a296', eye: '#6f8aa0', brow: '#9a9488', lip: '#b5777a', blush: 0.14, look: 0.3, lowerLid: '#9a7a70' },
    back(g, P, o, R) {
      const cx = o.cx;
      const veil = (g) => {
        g.moveTo(cx - 38, 74); g.quadraticCurveTo(cx - 42, 24, cx, 17); g.quadraticCurveTo(cx + 42, 24, cx + 38, 74);
        g.quadraticCurveTo(cx + 46, 110, cx + 44, 150); g.lineTo(cx - 44, 150); g.quadraticCurveTo(cx - 46, 110, cx - 38, 74); g.closePath();
      };
      paint(g, veil, lg(g, 0, 16, 0, 150, [[0, '#ffffff'], [0.6, '#f0e8d4'], [1, '#d4c8a8']]), P.line, 1.8);
      g.beginPath(); g.moveTo(cx - 36, 70); g.quadraticCurveTo(cx - 40, 26, cx, 19); g.quadraticCurveTo(cx + 40, 26, cx + 36, 70);
      g.strokeStyle = '#d8b04e'; g.lineWidth = 2.4; g.stroke();
    },
    body(g, P, o) {
      const cx = o.cx;
      neckPaint(g, P, o);
      paint(g, (g) => shoulderPath(g, o), lg(g, 0, o.shY, 0, o.bottom, [[0, '#fbf7ea'], [1, '#d6cbb0']]), P.line, 2);
      // gold embroidered band at the collar
      g.beginPath(); g.moveTo(cx - 20, o.neckBot - 2); g.quadraticCurveTo(cx, o.neckBot + 14, cx + 20, o.neckBot - 2);
      g.strokeStyle = '#d7b04e'; g.lineWidth = 3; g.stroke();
      g.setLineDash([1.5, 2]); g.strokeStyle = '#fff1b8'; g.lineWidth = 1; g.stroke(); g.setLineDash([]);
      // sun medallion
      const my = o.neckBot + 32;
      for (let i = 0; i < 12; i++) {
        const a = i / 12 * PI2;
        g.beginPath(); g.moveTo(cx + Math.cos(a) * 8, my + Math.sin(a) * 8); g.lineTo(cx + Math.cos(a) * 12, my + Math.sin(a) * 12);
        g.strokeStyle = '#d7b04e'; g.lineWidth = 1.6; g.stroke();
      }
      paint(g, (g) => g.arc(cx, my, 7, 0, PI2), rg(g, cx - 2, my - 2, 1, cx, my, 7, [[0, '#fff6c8'], [1, '#c8961e']]), '#6a4a10', 1);
      g.beginPath(); g.arc(cx, my, 2.8, 0, PI2); g.fillStyle = '#fff'; g.fill();
    },
    front(g, P, o) {
      const cx = o.cx;
      // veil front: edge that frames the forehead and cheeks
      const fn = (g) => {
        g.moveTo(cx - 36, 84); g.quadraticCurveTo(cx - 40, 30, cx, 20); g.quadraticCurveTo(cx + 40, 30, cx + 36, 84);
        g.lineTo(cx + 30, 88); g.quadraticCurveTo(cx + 26, 54, cx + 0, 46); g.quadraticCurveTo(cx - 26, 54, cx - 30, 88); g.closePath();
      };
      paint(g, fn, lg(g, 0, 16, 0, 90, [[0, '#ffffff'], [1, '#e6dcc0']]), P.line, 1.6);
      g.beginPath(); g.moveTo(cx - 28, 86); g.quadraticCurveTo(cx - 26, 56, cx, 46); g.quadraticCurveTo(cx + 26, 56, cx + 28, 86);
      g.strokeStyle = '#d7b04e'; g.lineWidth = 2.2; g.stroke();
    },
    acc() {},
  };

  // ---- Hale: young pale man, short silver hair, white Order coat, hard eyes
  SPEC.hale = {
    color: '#cfd6e6',
    geo: { faceHW: 24, jawHW: 17, eyeW: 7.2, eyeH: 6.4, browW: 2.2, mouthW: 6 },
    p: { skin: '#f3e3d8', skinSh: '#d6bcae', line: '#1b1a24', hair: '#dfe3ec', hairHi: '#ffffff', hairSh: '#8e96a8', eye: '#7f78b6', brow: '#4a4f62', lip: '#b08a88', blush: 0.04, look: 0.2, lowerLid: '#8a7a8a', irisK: 0.8 },
    back(g, P, o, R) {
      const cx = o.cx;
      const fn = (g) => {
        g.moveTo(cx - 28, 60); g.quadraticCurveTo(cx - 30, 30, cx, 26); g.quadraticCurveTo(cx + 30, 30, cx + 28, 60); g.lineTo(cx + 26, 66); g.lineTo(cx - 26, 66); g.closePath();
      };
      hairMass(g, P, fn, 26, 66);
    },
    body(g, P, o) {
      const cx = o.cx;
      neckPaint(g, P, o);
      paint(g, (g) => shoulderPath(g, o), lg(g, 0, o.shY, 0, o.bottom, [[0, '#ffffff'], [1, '#c5cad8']]), P.line, 2);
      // stand collar
      sym(g, cx, (g) => paint(g, (g) => { g.moveTo(cx - 6, o.neckBot - 4); g.lineTo(cx - 18, o.neckBot - 22); g.lineTo(cx - 13, o.neckBot + 8); g.closePath(); }, '#dfe3ee', P.line, 1.3));
      // silver trim and buttons
      sym(g, cx, (g) => { g.beginPath(); g.moveTo(cx - 16, o.neckBot - 2); g.lineTo(cx - 24, o.bottom); g.strokeStyle = '#aab3c7'; g.lineWidth = 1.6; g.stroke(); });
      for (const by of [o.neckBot + 22, o.neckBot + 40]) { paint(g, (g) => g.arc(cx, by, 2, 0, PI2), '#c4cad8', '#4a5068', 0.8); }
      // the Order's brooch: a hollow gold ring with a lantern glyph
      paint(g, (g) => g.arc(cx - 16, o.neckBot + 22, 5, 0, PI2), lg(g, cx - 20, o.neckBot + 16, cx - 12, o.neckBot + 28, [[0, '#fff8d0'], [1, '#b8862a']]), '#5a3a08', 1);
      g.beginPath(); g.arc(cx - 16, o.neckBot + 22, 2.4, 0, PI2); g.fillStyle = '#7a5a20'; g.fill();
    },
    front(g, P, o, R) {
      const cx = o.cx;
      // short silver hair swept off a high peak to the right, with a tapered lower edge
      const fn = (g) => {
        g.moveTo(cx - 29, 60); g.quadraticCurveTo(cx - 26, 28, cx + 4, 21); g.quadraticCurveTo(cx + 28, 22, cx + 30, 42);
        g.lineTo(cx + 28, 58); g.quadraticCurveTo(cx + 14, 44, cx + 4, 47); g.quadraticCurveTo(cx - 10, 42, cx - 18, 50);
        g.quadraticCurveTo(cx - 24, 54, cx - 29, 60); g.closePath();
      };
      hairMass(g, P, fn, 21, 60);
      hairHi(g, P, R.rng, fn, [cx - 28, 22, cx + 28, 56], 22, 9);
    },
    mid(g, P, o) {
      // shadows under the eyes
      for (const s of [-1, 1]) {
        g.beginPath(); g.ellipse(o.cx + s * o.eyeDX, o.eyeY + 12, 7, 2.6, 0, 0, PI2); g.fillStyle = 'rgba(90,70,120,0.18)'; g.fill();
      }
    },
    acc() {},
  };

  // ---- Elowen: ghostly, long dark-violet hair, hollow pale eyes, glowing flame at the chest
  SPEC.elowen = {
    color: '#8a6ac0',
    geo: { faceHW: 23, jawHW: 15, eyeW: 8, eyeH: 8.2, chinY: 126 },
    p: { skin: '#dcd6f2', skinSh: '#a597d4', line: '#4a3a7a', hair: '#3e2a62', hairHi: '#a486e0', hairSh: '#1b1136', eye: '#e6e6ff', hollow: true, brow: '#5a4a86', lip: '#9c86c8', blush: 0.16, look: 0.0, lowerLid: '#6a5a9a', lidW: 1.8 },
    back(g, P, o, R) {
      const cx = o.cx;
      const fn = (g) => {
        g.moveTo(cx - 34, 66); g.quadraticCurveTo(cx - 40, 24, cx, 20); g.quadraticCurveTo(cx + 40, 24, cx + 34, 66);
        g.quadraticCurveTo(cx + 42, 110, cx + 36, 150);
        waveTo(g, cx + 36, 150, cx + 26, 190, 3, 4);
        g.lineTo(cx - 26, 190);
        waveTo(g, cx - 26, 190, cx - 36, 150, 3, 4);
        g.quadraticCurveTo(cx - 42, 110, cx - 34, 66); g.closePath();
      };
      hairMass(g, P, fn, 20, 190, 0.92);
      hairHi(g, P, R.rng, fn, [cx - 40, 30, cx + 40, 180], 30, 22);
    },
    body(g, P, o, R) {
      const cx = o.cx;
      neckPaint(g, P, o);
      paint(g, (g) => shoulderPath(g, o), lg(g, 0, o.shY, 0, o.bottom, [[0, '#6a5a94'], [1, '#2a2048']]), P.line, 1.8);
      // ornate high neckline with pale lace
      paint(g, (g) => { g.moveTo(cx - 20, o.neckBot - 2); g.quadraticCurveTo(cx, o.neckBot + 10, cx + 20, o.neckBot - 2); g.lineTo(cx + 20, o.neckBot + 4); g.quadraticCurveTo(cx, o.neckBot + 18, cx - 20, o.neckBot + 4); g.closePath(); }, '#d8ccff', P.line, 1);
      g.beginPath(); g.moveTo(cx - 20, o.neckBot + 2); g.lineTo(cx + 20, o.neckBot + 2); g.setLineDash([1.5, 2]); g.strokeStyle = '#c0b0f0'; g.lineWidth = 0.9; g.stroke(); g.setLineDash([]);
      sym(g, cx, (g) => { g.beginPath(); g.moveTo(cx - 30, o.shY + 6); g.quadraticCurveTo(cx - 22, o.shY + 40, cx - 26, o.bottom); g.strokeStyle = 'rgba(190,170,240,0.45)'; g.lineWidth = 2; g.stroke(); });
    },
    front(g, P, o, R) {
      const cx = o.cx;
      const fn = (g) => {
        g.moveTo(cx - 30, 70); g.quadraticCurveTo(cx - 36, 30, cx, 22); g.quadraticCurveTo(cx + 36, 30, cx + 30, 70);
        g.quadraticCurveTo(cx + 22, 56, cx + 10, 54); g.quadraticCurveTo(cx, 46, cx - 6, 54); g.quadraticCurveTo(cx - 20, 58, cx - 30, 70); g.closePath();
      };
      hairMass(g, P, fn, 22, 70, 0.95);
      hairHi(g, P, R.rng, fn, [cx - 30, 24, cx + 30, 66], 14, 10);
      sym(g, cx, (g) => hairMass(g, P, (g) => {
        g.moveTo(cx - 28, 66); g.quadraticCurveTo(cx - 36, 100, cx - 32, 132); g.quadraticCurveTo(cx - 26, 140, cx - 22, 130);
        g.quadraticCurveTo(cx - 26, 100, cx - 22, 70); g.closePath();
      }, 66, 140, 0.9));
    },
    mid(g, P, o) {
      // hollow sockets
      for (const s of [-1, 1]) {
        g.beginPath(); g.ellipse(o.cx + s * o.eyeDX, o.eyeY + 1, 10, 9, 0, 0, PI2); g.fillStyle = 'rgba(30,18,60,0.35)'; g.fill();
      }
    },
    acc(g, P, o, R) {
      const cx = o.cx, fy = o.neckBot + 22;
      // soft glowing flame at the chest
      g.save(); g.globalCompositeOperation = 'lighter';
      g.fillStyle = rg(g, cx, fy, 1, cx, fy, 26, [[0, 'rgba(255,220,140,0.9)'], [0.4, 'rgba(255,150,70,0.45)'], [1, 'rgba(255,120,40,0)']]);
      g.beginPath(); g.arc(cx, fy, 26, 0, PI2); g.fill();
      g.restore();
      flamePath(g, cx, fy, 10, 16);
      g.fillStyle = lg(g, 0, fy - 8, 0, fy + 8, [[0, '#fff8d8'], [0.45, '#ffc050'], [1, '#e8602a']]); g.fill();
      g.lineWidth = 0.9; g.strokeStyle = 'rgba(255,240,200,0.8)'; g.stroke();
      for (let i = 0; i < 6; i++) {
        const x = cx + (R.rng() - 0.5) * 60, y = o.shY + 10 + R.rng() * 90;
        g.beginPath(); g.arc(x, y, 0.9 + R.rng() * 0.8, 0, PI2); g.fillStyle = 'rgba(255,200,130,0.8)'; g.fill();
      }
    },
  };

  // ---- Vael: elegant silver hair, silver coat, glowing lantern brooch, goatee
  SPEC.vael = {
    color: '#c6d2ea',
    geo: { faceHW: 24, jawHW: 17, eyeW: 8, eyeH: 7.4, browW: 2.2 },
    p: { skin: '#e8c6a6', skinSh: '#c49a7c', line: '#20202c', hair: '#d4d8e2', hairHi: '#ffffff', hairSh: '#7b8398', eye: '#7f9cc0', brow: '#8c93a6', lip: '#b07d70', blush: 0.06, look: 0.4, lowerLid: '#8a7a8a' },
    back(g, P, o, R) {
      const cx = o.cx;
      const fn = (g) => {
        g.moveTo(cx - 30, 62); g.quadraticCurveTo(cx - 34, 26, cx, 21); g.quadraticCurveTo(cx + 34, 26, cx + 30, 62); g.lineTo(cx + 30, 68); g.lineTo(cx - 30, 68); g.closePath();
      };
      hairMass(g, P, fn, 21, 68);
    },
    body(g, P, o, R) {
      const cx = o.cx;
      neckPaint(g, P, o);
      paint(g, (g) => shoulderPath(g, o), lg(g, 0, o.shY, 0, o.bottom, [[0, '#a8b2c8'], [1, '#4e5870']]), P.line, 2);
      // coat lapels
      sym(g, cx, (g) => paint(g, (g) => {
        g.moveTo(cx - 10, o.neckBot - 2); g.lineTo(cx - 30, o.shY + 20); g.lineTo(cx - 26, o.bottom + 4); g.lineTo(cx - 8, o.bottom + 4); g.lineTo(cx - 4, o.neckBot + 28); g.closePath();
      }, lg(g, cx - 30, o.shY, cx - 4, o.bottom, [[0, '#c8d0e0'], [1, '#6e7890']]), P.line, 1.6));
      // stand collar and a white cravat
      sym(g, cx, (g) => paint(g, (g) => { g.moveTo(cx - 8, o.neckBot - 4); g.lineTo(cx - 20, o.neckBot - 20); g.lineTo(cx - 14, o.neckBot + 6); g.closePath(); }, '#8a94aa', P.line, 1.2));
      paint(g, (g) => { g.moveTo(cx - 9, o.neckBot - 2); g.lineTo(cx, o.neckBot + 16); g.lineTo(cx + 9, o.neckBot - 2); g.closePath(); }, '#f4f5fa', P.line, 1);
      // silver embroidery on the coat
      sym(g, cx, (g) => { g.beginPath(); g.moveTo(cx - 22, o.shY + 30); g.quadraticCurveTo(cx - 16, o.shY + 44, cx - 18, o.shY + 66); g.strokeStyle = '#e2e6f0'; g.setLineDash([2, 2]); g.lineWidth = 1; g.stroke(); g.setLineDash([]); });
    },
    front(g, P, o, R) {
      const cx = o.cx;
      // silver hair combed back from a high crown, swept to the left
      const fn = (g) => {
        g.moveTo(cx - 30, 56); g.quadraticCurveTo(cx - 36, 26, cx - 4, 19); g.quadraticCurveTo(cx + 30, 22, cx + 30, 50);
        g.quadraticCurveTo(cx + 20, 40, cx + 6, 42); g.quadraticCurveTo(cx - 12, 40, cx - 20, 48); g.quadraticCurveTo(cx - 26, 52, cx - 30, 56); g.closePath();
      };
      hairMass(g, P, fn, 19, 56);
      hairHi(g, P, R.rng, fn, [cx - 30, 20, cx + 30, 52], 26, 12);
    },
    mid(g, P, o) {
      // silver goatee
      paint(g, (g) => {
        g.moveTo(o.cx - 5, o.mouthY + 3); g.quadraticCurveTo(o.cx, o.mouthY + 9, o.cx + 5, o.mouthY + 3);
        g.quadraticCurveTo(o.cx + 4, o.mouthY + 14, o.cx, o.chinY + 6); g.quadraticCurveTo(o.cx - 4, o.mouthY + 14, o.cx - 5, o.mouthY + 3); g.closePath();
      }, lg(g, 0, o.mouthY, 0, o.chinY + 6, [[0, '#e8ecf4'], [1, '#9aa2b6']]), P.line, 1);
      // crow's feet
      g.strokeStyle = 'rgba(120,80,70,0.45)'; g.lineWidth = 0.9;
      for (const s of [-1, 1]) {
        g.beginPath(); g.moveTo(o.cx + s * (o.eyeDX + 9), o.eyeY - 3); g.lineTo(o.cx + s * (o.eyeDX + 13), o.eyeY - 5);
        g.moveTo(o.cx + s * (o.eyeDX + 9), o.eyeY + 1); g.lineTo(o.cx + s * (o.eyeDX + 13), o.eyeY + 2); g.stroke();
      }
    },
    acc(g, P, o, R) {
      const cx = o.cx, by = o.neckBot + 26;
      // glowing lantern brooch on the lapel
      g.save(); g.globalCompositeOperation = 'lighter';
      g.fillStyle = rg(g, cx - 14, by, 1, cx - 14, by, 18, [[0, 'rgba(255,250,210,0.9)'], [1, 'rgba(255,220,120,0)']]);
      g.beginPath(); g.arc(cx - 14, by, 18, 0, PI2); g.fill(); g.restore();
      rr(g, cx - 19, by - 6, 10, 12, 2.2);
      g.fillStyle = lg(g, 0, by - 6, 0, by + 6, [[0, '#fffbe6'], [1, '#e8c060']]); g.fill();
      g.lineWidth = 1.2; g.strokeStyle = '#5a3a08'; g.stroke();
      flamePath(g, cx - 14, by + 1, 4, 6); g.fillStyle = '#ffffff'; g.fill();
      g.beginPath(); g.arc(cx - 14, by - 8.4, 2, Math.PI, 0); g.strokeStyle = '#8a6a20'; g.lineWidth = 1; g.stroke();
    },
  };

  // ---- Pip: small child with an oversized lamp-cap
  SPEC.pip = {
    color: '#5a9a6a',
    geo: { top: 56, faceHW: 27, jawHW: 22, cheekY: 106, chinY: 136, chinBulge: 4, eyeY: 97, eyeDX: 13, eyeW: 10, eyeH: 10,
      browY: 87, browW: 2.2, noseY: 112, mouthY: 124, mouthW: 6, nw: 8, neckBot: 154, shY: 152, sw: 42, earY: 100 },
    p: { skin: '#f8d6b8', skinSh: '#dba684', line: '#2a1b16', hair: '#b6743b', hairHi: '#e6a25f', hairSh: '#6e3f1f', eye: '#4a8ed8', brow: '#8a5a2e', lip: '#d37a6a', blush: 0.34, look: 0.7, irisK: 0.84, browW: 2.2 },
    back(g, P, o, R) {
      const cx = o.cx;
      hairMass(g, P, (g) => {
        g.moveTo(cx - 36, 70); g.quadraticCurveTo(cx - 38, 40, cx, 36); g.quadraticCurveTo(cx + 38, 40, cx + 36, 70); g.lineTo(cx + 34, 80); g.lineTo(cx - 34, 80); g.closePath();
      }, 36, 80);
    },
    body(g, P, o, R) {
      const cx = o.cx;
      neckPaint(g, P, o);
      paint(g, (g) => shoulderPath(g, o), lg(g, 0, o.shY, 0, o.bottom, [[0, '#8b6a40'], [1, '#4a3420']]), P.line, 2);
      // cream scarf
      paint(g, (g) => { g.moveTo(cx - 20, o.neckBot - 4); g.quadraticCurveTo(cx, o.neckBot + 12, cx + 20, o.neckBot - 4); g.quadraticCurveTo(cx + 14, o.neckBot + 14, cx + 6, o.neckBot + 20); g.quadraticCurveTo(cx - 6, o.neckBot + 14, cx - 20, o.neckBot - 4); g.closePath(); }, '#f3ead2', P.line, 1.2);
      for (const by of [o.neckBot + 28, o.neckBot + 44]) paint(g, (g) => g.arc(cx, by, 2.4, 0, PI2), rg(g, cx - 1, by - 1, 0.3, cx, by, 2.6, [[0, '#fff0b0'], [1, '#a87420']]), '#4a3008', 0.8);
    },
    front(g, P, o, R) {
      const cx = o.cx;
      const fn = (g) => {
        g.moveTo(cx - 26, 84); g.quadraticCurveTo(cx - 30, 66, cx - 16, 60); g.quadraticCurveTo(cx - 6, 64, cx - 2, 58);
        g.quadraticCurveTo(cx + 8, 66, cx + 20, 60); g.quadraticCurveTo(cx + 30, 66, cx + 26, 84); g.closePath();
      };
      hairMass(g, P, fn, 58, 84);
      hairHi(g, P, R.rng, fn, [cx - 26, 58, cx + 26, 82], 10, 8);
    },
    acc(g, P, o, R) {
      const cx = o.cx;
      // the oversized lamp-cap
      const dome = (g) => {
        g.moveTo(cx - 46, 62); g.quadraticCurveTo(cx - 48, 16, cx, 12); g.quadraticCurveTo(cx + 48, 16, cx + 46, 62); g.closePath();
      };
      paint(g, dome, lg(g, cx - 40, 12, cx + 40, 60, [[0, '#4f9a72'], [0.5, '#2e6a4a'], [1, '#183a2a']]), P.line, 2);
      // cap seams
      g.beginPath(); g.moveTo(cx - 14, 14); g.quadraticCurveTo(cx - 20, 40, cx - 16, 60); g.moveTo(cx + 14, 14); g.quadraticCurveTo(cx + 20, 40, cx + 16, 60);
      g.strokeStyle = 'rgba(10,30,20,0.5)'; g.lineWidth = 1.2; g.stroke();
      // highlight
      g.beginPath(); g.moveTo(cx - 30, 40); g.quadraticCurveTo(cx - 30, 22, cx - 12, 18);
      g.strokeStyle = 'rgba(200,255,220,0.35)'; g.lineWidth = 3; g.stroke();
      // brim
      rr(g, cx - 52, 56, 104, 9, 4.5);
      g.fillStyle = lg(g, 0, 56, 0, 65, [[0, '#3f8a5e'], [1, '#17422c']]); g.fill(); g.lineWidth = 2; g.strokeStyle = P.line; g.stroke();
      // brass band
      rr(g, cx - 40, 49, 80, 7, 2.5);
      g.fillStyle = lg(g, 0, 49, 0, 56, [[0, '#ffe08a'], [1, '#a46a18']]); g.fill(); g.lineWidth = 1; g.strokeStyle = '#4a2e08'; g.stroke();
      // lamp on top of the cap
      rr(g, cx - 8, 2, 16, 12, 3);
      g.fillStyle = lg(g, 0, 2, 0, 14, [[0, '#fff2b0'], [1, '#b07a1a']]); g.fill(); g.lineWidth = 1.4; g.strokeStyle = '#4a2e08'; g.stroke();
      g.save(); g.globalCompositeOperation = 'lighter';
      g.fillStyle = rg(g, cx, 8, 1, cx, 8, 26, [[0, 'rgba(255,230,140,0.85)'], [1, 'rgba(255,200,80,0)']]);
      g.beginPath(); g.arc(cx, 8, 26, 0, PI2); g.fill(); g.restore();
      flamePath(g, cx, 7.5, 5, 8); g.fillStyle = '#fff8d0'; g.fill();
    },
  };

  // ---- unknown: a hooded silhouette
  SPEC.unknown = {
    color: '#3a3f66',
    ears: false,
    p: { skin: '#2a2a44', skinSh: '#17172a', line: '#0b0b18', hair: '#1c1d33', hairHi: '#3a3f66', hairSh: '#0b0c18', eye: '#e8b060', brow: '#15162a', lip: '#2a2a44', blush: 0, look: 0 },
    back(g, P, o) {
      const cx = o.cx;
      paint(g, (g) => { g.moveTo(cx - 40, 192); g.quadraticCurveTo(cx - 44, 90, cx, 16); g.quadraticCurveTo(cx + 44, 90, cx + 40, 192); g.closePath(); },
        lg(g, 0, 16, 0, 192, [[0, '#2a2f52'], [1, '#0e1026']]), P.line, 2);
    },
    body(g, P, o) {
      neckPaint(g, P, o);
      paint(g, (g) => shoulderPath(g, o), lg(g, 0, o.shY, 0, o.bottom, [[0, '#262b4c'], [1, '#0c0e22']]), P.line, 2);
    },
    front(g, P, o) {
      const cx = o.cx;
      paint(g, (g) => { g.moveTo(cx - 34, 74); g.quadraticCurveTo(cx - 36, 28, cx, 18); g.quadraticCurveTo(cx + 36, 28, cx + 34, 74); g.quadraticCurveTo(cx + 26, 52, cx, 50); g.quadraticCurveTo(cx - 26, 52, cx - 34, 74); g.closePath(); },
        lg(g, 0, 18, 0, 74, [[0, '#2f3560'], [1, '#121430']]), P.line, 2);
    },
    mid(g, P, o) {
      // the faint hollow glow where a face would be
      g.save(); g.globalCompositeOperation = 'lighter';
      g.fillStyle = rg(g, o.cx, 92, 1, o.cx, 92, 26, [[0, 'rgba(120,140,255,0.22)'], [1, 'rgba(120,140,255,0)']]);
      g.beginPath(); g.arc(o.cx, 92, 26, 0, PI2); g.fill(); g.restore();
    },
    acc(g, P, o) {
      g.beginPath(); g.arc(o.cx - 9, 96, 1.8, 0, PI2); g.arc(o.cx + 9, 96, 1.8, 0, PI2); g.fillStyle = '#e8b060'; g.fill();
      g.font = 'bold 22px ' + FONT; g.textAlign = 'center'; g.fillStyle = 'rgba(232,176,96,0.5)'; g.fillText('?', o.cx, 176); g.textAlign = 'left';
    },
  };
  // the unknown silhouette keeps no face shading
  SPEC.unknown.front = SPEC.unknown.front;

  const ALIAS_ID = { sera: 'seraphine', orla: 'abbess', lamplighter: 'rowan', hollow_elowen: 'elowen' };
  const PORTRAIT_IDS = ['rowan', 'claret', 'caspian', 'rook', 'seraphine', 'wren', 'maren', 'bram', 'torvald',
    'abbess', 'hale', 'elowen', 'vael', 'pip', 'unknown'];
  function resolveId(id) {
    id = String(id || 'unknown').toLowerCase();
    if (ALIAS_ID[id]) id = ALIAS_ID[id];
    return SPEC[id] ? id : 'unknown';
  }
  function resolveExpr(e) { return EXPR[e] ? e : 'normal'; }

  // The layered painter: back hair/wings -> body -> head -> front hair -> accessories -> marks
  function buildPortrait(id, expr) {
    const spec = SPEC[id];
    const cv = mk(144, 192), g = cv.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.lineJoin = 'round'; g.lineCap = 'round';
    const o = Object.assign({}, GEO, spec.geo || {});
    const E = Object.assign({}, EXPR.normal, EXPR[expr] || {});
    const P = spec.p;
    const R = { rng: G.util.rng(G.util.hash(id) ^ 0x51ed), E, id, expr };
    if (spec.back) spec.back(g, P, o, R);
    spec.body(g, P, o, R);
    paintHead(g, P, o, E, spec);
    if (spec.front) spec.front(g, P, o, R);
    if (spec.acc) spec.acc(g, P, o, R);
    marks(g, P, o, E);
    if (id === 'elowen') return ghostify(cv);
    return cv;
  }
  // soft lavender glow around translucent characters
  function ghostify(cv) {
    const out = mk(cv.width, cv.height), g = out.getContext('2d');
    g.save(); g.shadowColor = 'rgba(190,160,255,0.9)'; g.shadowBlur = 8; g.globalAlpha = 0.6; g.drawImage(cv, 0, 0); g.restore();
    g.globalAlpha = 0.93; g.drawImage(cv, 0, 0);
    return out;
  }

  const portraitCache = {};
  function portrait(id, expr) {
    const rid = resolveId(id), rex = resolveExpr(expr);
    const key = rid + ':' + rex;
    if (!portraitCache[key]) portraitCache[key] = buildPortrait(rid, rex);
    return portraitCache[key];
  }
  const faceCache = {};
  function face(id, expr) {
    const rid = resolveId(id), rex = resolveExpr(expr);
    const key = rid + ':' + rex;
    if (faceCache[key]) return faceCache[key];
    const pc = portrait(rid, rex);
    const col = (SPEC[rid].color) || '#3a4a7a';
    const cv = mk(48, 48), g = cv.getContext('2d');
    g.fillStyle = rg(g, 24, 16, 2, 24, 26, 34, [[0, lite(col, 0.3)], [0.6, shade(col, -0.45)], [1, shade(col, -0.75)]]);
    g.fillRect(0, 0, 48, 48);
    g.imageSmoothingEnabled = true;
    g.drawImage(pc, 17, 20, 110, 110, 0, 0, 48, 48);
    g.strokeStyle = lite(col, 0.45); g.lineWidth = 2; g.strokeRect(1, 1, 46, 46);
    g.strokeStyle = 'rgba(0,0,0,0.6)'; g.lineWidth = 1; g.strokeRect(0.5, 0.5, 47, 47);
    faceCache[key] = cv;
    return cv;
  }
  function drawPortrait(ctx, id, expr, x, y, opts) {
    opts = opts || {};
    const pc = portrait(id, expr), sc = opts.scale || 1;
    const dw = Math.round(144 * sc), dh = Math.round(192 * sc);
    ctx.save();
    if (opts.alpha != null) ctx.globalAlpha = opts.alpha;
    if (opts.flip) {
      ctx.translate(Math.round(x) + dw, Math.round(y));
      ctx.scale(-1, 1);
      ctx.drawImage(pc, 0, 0, dw, dh);
    } else {
      ctx.drawImage(pc, Math.round(x), Math.round(y), dw, dh);
    }
    ctx.restore();
  }
  function drawFace(ctx, id, x, y, size, expr) {
    size = size || 48;
    const fc = face(id, expr);
    ctx.save();
    if (size !== 48) ctx.imageSmoothingEnabled = true;
    ctx.drawImage(fc, Math.round(x), Math.round(y), size, size);
    ctx.restore();
  }

  // ------------------------------------------------------------ sprites shared by title / menu
  const glowCache = {};
  function glowSprite(rgbStr) {
    if (glowCache[rgbStr]) return glowCache[rgbStr];
    const cv = mk(32, 32), g = cv.getContext('2d');
    g.fillStyle = rg(g, 16, 16, 0, 16, 16, 16, [[0, 'rgba(' + rgbStr + ',1)'], [0.35, 'rgba(' + rgbStr + ',0.45)'], [1, 'rgba(' + rgbStr + ',0)']]);
    g.fillRect(0, 0, 32, 32);
    glowCache[rgbStr] = cv;
    return cv;
  }
  function rng01(seed) { return G.util.rng(seed); }

  // ------------------------------------------------------------ title screen
  let TA = null;
  function titleAssets() {
    if (TA) return TA;
    const W = 640, H = 480;
    const R = rng01(20261010);
    // sky
    const sky = mk(W, H), s = sky.getContext('2d');
    s.fillStyle = lg(s, 0, 0, 0, H, [[0, '#03051a'], [0.42, '#101946'], [0.66, '#3a2a62'], [0.84, '#9a4f5c'], [1, '#e2904e']]);
    s.fillRect(0, 0, W, H);
    s.fillStyle = rg(s, 320, 262, 10, 320, 262, 330, [[0, 'rgba(255,196,120,0.6)'], [0.35, 'rgba(255,130,80,0.22)'], [1, 'rgba(255,120,80,0)']]);
    s.fillRect(0, 0, W, H);
    // far skyline with the Hearth Spire (parallax layer 1)
    const FW = 1000, FH = 240;
    const far = mk(FW, FH), f = far.getContext('2d');
    f.fillStyle = lg(f, 0, 0, 0, FH, [[0, '#2c2456'], [1, '#17122e']]);
    let x = 0;
    while (x < FW) {
      const bw = 26 + R() * 46, bh = 36 + R() * 70, top = FH - bh;
      if (Math.abs(x - 500) < 60) { x += bw; continue; }
      f.fillRect(x, top, bw, bh);
      if (R() < 0.5) { f.beginPath(); f.moveTo(x - 2, top); f.lineTo(x + bw / 2, top - 16 - R() * 12); f.lineTo(x + bw + 2, top); f.closePath(); f.fill(); }
      for (let wy = top + 8; wy < FH - 10; wy += 13) for (let wx = x + 5; wx < x + bw - 6; wx += 9) {
        if (R() < 0.12) { f.fillStyle = 'rgba(255,200,120,0.85)'; f.fillRect(wx, wy, 3, 4); f.fillStyle = lg(f, 0, 0, 0, FH, [[0, '#2c2456'], [1, '#17122e']]); }
      }
      x += bw + 2 + R() * 6;
    }
    // the Hearth Spire
    f.fillStyle = lg(f, 470, 0, 530, 0, [[0, '#2a2250'], [0.5, '#3c3272'], [1, '#221c44']]);
    f.beginPath(); f.moveTo(474, FH); f.lineTo(484, 92); f.lineTo(494, 40); f.lineTo(506, 40); f.lineTo(516, 92); f.lineTo(526, FH); f.closePath(); f.fill();
    f.fillRect(466, 150, 68, 12); f.fillRect(470, 196, 60, 10);
    f.fillStyle = rg(f, 500, 34, 2, 500, 34, 22, [[0, 'rgba(255,240,180,1)'], [0.3, 'rgba(255,190,90,0.7)'], [1, 'rgba(255,160,60,0)']]);
    f.beginPath(); f.arc(500, 34, 22, 0, PI2); f.fill();
    // near forest (parallax layer 2)
    const NW = 1000, NH = 200;
    const near = mk(NW, NH), n = near.getContext('2d');
    n.fillStyle = lg(n, 0, 0, 0, NH, [[0, '#120e26'], [1, '#07050f']]);
    n.fillRect(0, 60, NW, NH - 60);
    for (let tx = -10; tx < NW + 20; tx += 14 + R() * 18) {
      const th = 70 + R() * 80, tw = 14 + R() * 10, by = NH - 8 + R() * 6;
      for (let k = 0; k < 3; k++) {
        const yy = by - th + k * th * 0.28, ww = tw * (1 - k * 0.22);
        n.beginPath(); n.moveTo(tx, yy - th * 0.45); n.lineTo(tx + ww / 2, yy + 4); n.lineTo(tx - ww / 2, yy + 4); n.closePath(); n.fill();
      }
      n.fillRect(tx - 1.5, by - 6, 3, 14);
    }
    // a few tiny lamp-lit cottages on the near ridge
    for (let i = 0; i < 6; i++) {
      const hx = 80 + i * 160 + R() * 40, hy = NH - 22;
      n.fillStyle = '#0a0816'; n.fillRect(hx, hy - 16, 22, 16);
      n.beginPath(); n.moveTo(hx - 3, hy - 16); n.lineTo(hx + 11, hy - 28); n.lineTo(hx + 25, hy - 16); n.fill();
      n.fillStyle = 'rgba(255,200,110,0.9)'; n.fillRect(hx + 8, hy - 10, 4, 4);
    }
    // sun: a huge lantern with a cage of brass bars
    const SUN = 320;
    const sun = mk(SUN, SUN), u = sun.getContext('2d');
    const cx = SUN / 2;
    u.fillStyle = rg(u, cx, cx, 40, cx, cx, cx, [[0, 'rgba(255,220,140,0.55)'], [0.45, 'rgba(255,150,70,0.28)'], [1, 'rgba(255,120,60,0)']]);
    u.fillRect(0, 0, SUN, SUN);
    u.beginPath(); u.arc(cx, cx, 64, 0, PI2);
    u.fillStyle = rg(u, cx - 14, cx - 18, 6, cx, cx, 66, [[0, '#ffffff'], [0.3, '#fff3b8'], [0.7, '#ffb347'], [1, '#e0602a']]);
    u.fill();
    u.save(); u.beginPath(); u.arc(cx, cx, 64, 0, PI2); u.clip();
    u.strokeStyle = 'rgba(70,40,18,0.65)'; u.lineWidth = 4;
    for (let i = -3; i <= 3; i++) { u.beginPath(); u.moveTo(cx + i * 16, cx - 70); u.lineTo(cx + i * 16, cx + 70); u.stroke(); }
    u.beginPath(); u.moveTo(cx - 70, cx); u.lineTo(cx + 70, cx); u.stroke();
    u.restore();
    u.beginPath(); u.arc(cx, cx, 64, 0, PI2); u.strokeStyle = '#5a3414'; u.lineWidth = 3; u.stroke();
    // brass cap and ring
    u.fillStyle = lg(u, cx - 20, cx - 84, cx + 20, cx - 64, [[0, '#ffe08a'], [1, '#8a5a1a']]);
    u.fillRect(cx - 14, cx - 84, 28, 14);
    u.beginPath(); u.arc(cx, cx - 88, 7, 0, PI2); u.strokeStyle = '#8a5a1a'; u.lineWidth = 3; u.stroke();
    // rays
    const RAYS = 420, rays = mk(RAYS, RAYS), r = rays.getContext('2d');
    for (let i = 0; i < 18; i++) {
      const a = i / 18 * PI2, w = (i % 2 ? 0.05 : 0.09);
      r.beginPath(); r.moveTo(RAYS / 2, RAYS / 2);
      r.lineTo(RAYS / 2 + Math.cos(a - w) * RAYS / 2, RAYS / 2 + Math.sin(a - w) * RAYS / 2);
      r.lineTo(RAYS / 2 + Math.cos(a + w) * RAYS / 2, RAYS / 2 + Math.sin(a + w) * RAYS / 2);
      r.closePath();
      r.fillStyle = rg(r, RAYS / 2, RAYS / 2, 60, RAYS / 2, RAYS / 2, RAYS / 2, [[0, 'rgba(255,220,150,0.30)'], [1, 'rgba(255,200,120,0)']]);
      r.fill();
    }
    // stars
    const stars = [];
    for (let i = 0; i < 170; i++) {
      const warm = R() < 0.2;
      stars.push({ x: Math.floor(R() * W), y: Math.floor(R() * 230), s: R() < 0.15 ? 2 : 1, a: 0.35 + R() * 0.65, sp: 0.02 + R() * 0.05, ph: R() * 6, c: warm ? '#ffe0a0' : '#dfe8ff' });
    }
    // vignette
    const vig = mk(W, H), v = vig.getContext('2d');
    v.fillStyle = rg(v, W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 0.85, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.6)']]);
    v.fillRect(0, 0, W, H);
    // embers and fireflies
    const embers = [];
    for (let i = 0; i < 46; i++) {
      embers.push({ x: R() * W, y: R() * H, sp: 0.25 + R() * 0.6, off: R() * 600, amp: 6 + R() * 16, ph: R() * 6, s: 1.5 + R() * 2.5, warm: R() < 0.6 });
    }
    TA = {
      sky, far, near, sun, rays, stars, vig, embers,
      glowWarm: glowSprite('255,190,100'), glowCool: glowSprite('200,255,170'),
      farW: FW, nearW: NW,
    };
    return TA;
  }
  function drawTitleScreen(ctx, t) {
    t = t == null ? (G.frame || 0) : t;
    const A = titleAssets();
    const W = 640, H = 480;
    ctx.save();
    ctx.drawImage(A.sky, 0, 0);
    // twinkling stars
    for (const st of A.stars) {
      const tw = 0.5 + 0.5 * Math.sin(t * st.sp + st.ph);
      ctx.globalAlpha = (0.2 + 0.8 * tw) * st.a;
      ctx.fillStyle = st.c;
      ctx.fillRect(st.x, st.y, st.s, st.s);
    }
    ctx.globalAlpha = 1;
    // lantern-sun with slowly turning rays and a breathing glow
    const pulse = 1 + Math.sin(t * 0.02) * 0.025;
    ctx.save(); ctx.translate(320, 262); ctx.rotate(t * 0.0025);
    ctx.drawImage(A.rays, -A.rays.width / 2, -A.rays.height / 2);
    ctx.restore();
    ctx.save(); ctx.translate(320, 262); ctx.scale(pulse, pulse);
    ctx.drawImage(A.sun, -A.sun.width / 2, -A.sun.height / 2);
    ctx.restore();
    // parallax skyline and forest
    const farX = Math.round(Math.sin(t * 0.0045) * 14);
    const nearX = Math.round(Math.sin(t * 0.0075 + 1.2) * 26);
    ctx.drawImage(A.far, -180 + farX, 240);
    ctx.drawImage(A.near, -180 + nearX, 280);
    // embers (warm) and fireflies (cool), additive
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const e of A.embers) {
      const k = (e.off + t * e.sp) % (H + 60);
      const y = H + 30 - k;
      const x = e.x + Math.sin(t * 0.02 + e.ph) * e.amp;
      const fl = 0.55 + 0.45 * Math.sin(t * 0.07 + e.ph * 3);
      const sz = e.s * 5;
      ctx.globalAlpha = fl * (y < 260 ? Math.max(0, y / 260) : 1);
      ctx.drawImage(e.warm ? A.glowWarm : A.glowCool, Math.round(x - sz), Math.round(y - sz), Math.round(sz * 2), Math.round(sz * 2));
    }
    ctx.restore();
    ctx.globalAlpha = 1;
    ctx.drawImage(A.vig, 0, 0);
    ctx.restore();
  }

  // ------------------------------------------------------------ logo
  let LOGO = null;
  const LOGO_TEXT = 'LANTERNBOUND';
  const SUB_TEXT = 'Hearts of the Hollow Dusk';
  function spacedText(g, str, x, y, sp, mode) {
    for (const ch of str) {
      if (mode === 'stroke') g.strokeText(ch, x, y); else g.fillText(ch, x, y);
      x += g.measureText(ch).width + sp;
    }
  }
  function spacedWidth(g, str, sp) {
    let w = 0;
    for (const ch of str) w += g.measureText(ch).width + sp;
    return w - sp;
  }
  function logoAssets() {
    if (LOGO) return LOGO;
    const font = 'bold 56px ' + SERIF, sp = 5;
    const m = mk(8, 8).getContext('2d');
    m.font = font;
    const tw = Math.ceil(spacedWidth(m, LOGO_TEXT, sp));
    const cw = tw + 60, ch = 104;
    const body = mk(cw, ch), b = body.getContext('2d');
    const base = 80, x0 = 30;
    b.font = font; b.textBaseline = 'alphabetic'; b.lineJoin = 'round';
    // warm bloom behind the letters
    b.save(); b.shadowColor = 'rgba(255,150,40,0.95)'; b.shadowBlur = 22; b.fillStyle = '#ffb040';
    spacedText(b, LOGO_TEXT, x0, base, sp); b.restore();
    // deep outline
    b.strokeStyle = '#2a1204'; b.lineWidth = 9; spacedText(b, LOGO_TEXT, x0, base, sp, 'stroke');
    b.strokeStyle = '#7a3410'; b.lineWidth = 4; spacedText(b, LOGO_TEXT, x0, base, sp, 'stroke');
    // gold gradient face
    b.fillStyle = lg(b, 0, base - 46, 0, base + 4, [[0, '#fffbe6'], [0.42, '#ffd864'], [0.56, '#f5a52e'], [1, '#b5581c']]);
    spacedText(b, LOGO_TEXT, x0, base, sp);
    // inner highlight line on the upper half
    b.save(); b.beginPath(); b.rect(0, 0, cw, base - 28); b.clip();
    b.fillStyle = 'rgba(255,255,240,0.55)'; spacedText(b, LOGO_TEXT, x0, base - 1, sp); b.restore();
    b.strokeStyle = 'rgba(120,50,10,0.8)'; b.lineWidth = 1; spacedText(b, LOGO_TEXT, x0, base, sp, 'stroke');
    // shine mask (white letters, used for the sweeping highlight)
    const shine = mk(cw, ch), s = shine.getContext('2d');
    s.font = font; s.textBaseline = 'alphabetic'; s.fillStyle = '#ffffff';
    spacedText(s, LOGO_TEXT, x0, base, sp);
    // subtitle
    const sub = mk(cw, 30), q = sub.getContext('2d');
    q.font = 'italic 19px ' + SERIF; q.textBaseline = 'top'; q.lineJoin = 'round';
    const sw = Math.ceil(q.measureText(SUB_TEXT).width);
    const sx = Math.round((cw - sw) / 2);
    q.strokeStyle = '#2a1204'; q.lineWidth = 4; q.strokeText(SUB_TEXT, sx, 4);
    q.fillStyle = '#ffe2a6'; q.fillText(SUB_TEXT, sx, 4);
    LOGO = { body, shine, sub, subW: sw, w: cw, h: ch };
    return LOGO;
  }
  // draws the logo centred on x with its top at y. Returns the bottom y.
  function drawLogo(ctx, x, y, t) {
    t = t == null ? (G.frame || 0) : t;
    const L = logoAssets();
    const bob = Math.round(Math.sin(t * 0.03) * 2);
    const lx = Math.round(x - L.w / 2), ly = Math.round(y + bob);
    ctx.save();
    ctx.drawImage(L.body, lx, ly);
    // a diagonal glint sweeps across the letters every few seconds
    const period = 420, ph = t % period;
    if (ph < 140) {
      const bx = lx - 120 + ph * 6.2;
      ctx.beginPath();
      ctx.moveTo(bx, ly); ctx.lineTo(bx + 46, ly); ctx.lineTo(bx + 16, ly + L.h); ctx.lineTo(bx - 30, ly + L.h); ctx.closePath();
      ctx.clip();
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.85;
      ctx.drawImage(L.shine, lx, ly);
    }
    ctx.restore();
    // subtitle with flame motifs on both sides
    const sy = ly + L.h - 16;
    const sxl = Math.round(x - L.subW / 2);
    ctx.drawImage(L.sub, Math.round(x - L.w / 2), sy);
    const fl = 0.85 + 0.15 * Math.sin(t * 0.09);
    ctx.save(); ctx.globalAlpha = fl;
    icon(ctx, 'flame', sxl - 22, sy + 3, 14);
    icon(ctx, 'flame', sxl + L.subW + 8, sy + 3, 14);
    ctx.restore();
    return ly + L.h + 10;
  }

  // ------------------------------------------------------------ menu backdrop
  let MB = null;
  function menuAssets() {
    if (MB) return MB;
    const W = 640, H = 480, R = rng01(77001);
    const base = mk(W, H), b = base.getContext('2d');
    b.fillStyle = lg(b, 0, 0, 0, H, [[0, '#070b22'], [0.55, '#14204f'], [1, '#261c44']]);
    b.fillRect(0, 0, W, H);
    b.fillStyle = rg(b, 40, H, 10, 40, H, 420, [[0, 'rgba(255,150,70,0.20)'], [1, 'rgba(255,150,70,0)']]);
    b.fillRect(0, 0, W, H);
    b.fillStyle = rg(b, W, 0, 10, W, 0, 360, [[0, 'rgba(90,130,255,0.22)'], [1, 'rgba(90,130,255,0)']]);
    b.fillRect(0, 0, W, H);
    // faint diagonal hatch for texture
    b.strokeStyle = 'rgba(160,190,255,0.035)'; b.lineWidth = 1;
    for (let x = -H; x < W; x += 14) { b.beginPath(); b.moveTo(x, 0); b.lineTo(x + H, H); b.stroke(); }
    const vig = mk(W, H), v = vig.getContext('2d');
    v.fillStyle = rg(v, W / 2, H / 2, H * 0.4, W / 2, H / 2, H * 0.9, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.55)']]);
    v.fillRect(0, 0, W, H);
    const motes = [];
    for (let i = 0; i < 26; i++) motes.push({ x: R() * W, y: R() * H, sp: 0.15 + R() * 0.35, ph: R() * 6, s: 3 + R() * 6, warm: R() < 0.7 });
    MB = { base, vig, motes, warm: glowSprite('255,190,110'), cool: glowSprite('170,200,255') };
    return MB;
  }
  function drawMenuBg(ctx, t) {
    t = t == null ? (G.frame || 0) : t;
    const M = menuAssets();
    ctx.drawImage(M.base, 0, 0);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const m of M.motes) {
      const y = 480 - ((m.y + t * m.sp) % 500) + 10;
      const x = m.x + Math.sin(t * 0.01 + m.ph) * 12;
      ctx.globalAlpha = 0.35 + 0.35 * Math.sin(t * 0.03 + m.ph);
      ctx.drawImage(m.warm ? M.warm : M.cool, Math.round(x - m.s), Math.round(y - m.s), Math.round(m.s * 2), Math.round(m.s * 2));
    }
    ctx.restore();
    ctx.drawImage(M.vig, 0, 0);
  }

  // ------------------------------------------------------------ romance heart meter
  const TIER_AT = [0, 15, 40, 65, 100];
  function drawHeartMeter(ctx, x, y, points, tier, w) {
    points = clamp(points || 0, 0, 100);
    tier = clamp(tier | 0, 0, 4);
    w = w || 180;
    const hs = 16, gap = 4;
    ctx.save();
    for (let i = 0; i < 5; i++) {
      const hx = Math.round(x + i * (hs + gap)), hy = Math.round(y);
      if (i < tier) icon(ctx, i === 4 ? 'star' : 'heart', hx, hy, hs);
      else if (i === tier && tier < 4) {
        const seg = (points - TIER_AT[tier]) / (TIER_AT[tier + 1] - TIER_AT[tier]);
        icon(ctx, seg >= 0.5 ? 'heartHalf' : 'heartEmpty', hx, hy, hs);
      } else if (i === 4 && tier === 4) icon(ctx, 'star', hx, hy, hs);
      else icon(ctx, 'heartEmpty', hx, hy, hs);
    }
    const tx = x + 5 * (hs + gap) + 8;
    text(ctx, points + ' / 100', tx, y + 2, { size: 12, color: '#ffe3ef', bold: true });
    const by = Math.round(y + hs + 6);
    gauge(ctx, x, by, w, 10, points / 100, '#ff86ab', '#c2185b', { bg: '#1a0c24', border: '#e6b8d0' });
    for (let i = 1; i < 4; i++) {
      const tkx = Math.round(x + (w - 2) * (TIER_AT[i] / 100)) + 1;
      ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillRect(tkx, by - 2, 1, 14);
    }
    ctx.restore();
    return hs + 6 + 10 + 4;
  }

  // ------------------------------------------------------------ public API
  Object.assign(G.gfx, {
    window: windowBox,
    text,
    textWidth,
    wrap,
    gauge,
    cursor,
    pips,
    icon,
    iconNames: () => ICON_NAMES.slice(),
    portrait,
    face,
    drawPortrait,
    drawFace,
    portraitIds: () => PORTRAIT_IDS.slice(),
    expressions: () => EXPRESSIONS.slice(),
    drawTitleScreen,
    drawLogo,
    drawMenuBg,
    drawHeartMeter,
  });
  G.provide('gfx_ui');
})();
