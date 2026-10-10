/* =====================================================================
 * LANTERNBOUND — gfx_battle.js  (owner: gfx-battle)
 * Battle art on G.gfx: enemy sprites (pixel-art generated from signed-distance
 * shapes, cached), party battlers from the charSheet, painterly battle backdrops,
 * battle effects, shield pips and weakness icons. Everything is procedural.
 * ===================================================================== */
(function () {
  'use strict';
  const G = (window.G = window.G || {});
  G.gfx = G.gfx || {};

  /* ======================================================================
   * 1. Pixel-sprite core: signed-distance shapes -> banded (pixel-art) shading,
   *    automatic dark outline, emissive pixels with bloom halo.
   * ====================================================================== */
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const mixc = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const hx = (h) => {
    h = h.replace('#', ''); if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    const n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const toC = (c) => (typeof c === 'string' ? hx(c) : c);
  const pk = (c) => ((c[0] & 255) << 16) | ((c[1] & 255) << 8) | (c[2] & 255);
  const hash2 = (x, y) => {
    let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  // 4-step ramp: 0 shadow, 1 base, 2 light, 3 highlight
  function ramp(c) {
    c = toC(c);
    return [mixc(c, [22, 12, 34], 0.5), c, mixc(c, [255, 244, 214], 0.22), mixc(c, [255, 255, 248], 0.6)];
  }
  const LX = -0.597, LY = -0.697, LZ = 0.398; // light from upper-left

  // ---- signed distance primitives (carry a bounding box in .bb)
  const bbw = (fn, bb) => { fn.bb = bb; return fn; };
  const SD = {
    ell(cx, cy, rx, ry) {
      const r = Math.min(rx, ry);
      return bbw((x, y) => { const dx = (x - cx) / rx, dy = (y - cy) / ry; return (Math.sqrt(dx * dx + dy * dy) - 1) * r; },
        [cx - rx - 1.5, cy - ry - 1.5, cx + rx + 1.5, cy + ry + 1.5]);
    },
    circ(cx, cy, r) { return bbw((x, y) => Math.hypot(x - cx, y - cy) - r, [cx - r - 1.5, cy - r - 1.5, cx + r + 1.5, cy + r + 1.5]); },
    cap(x1, y1, x2, y2, r1, r2) {
      if (r2 === undefined) r2 = r1;
      const bx = x2 - x1, by = y2 - y1, l2 = bx * bx + by * by || 1, R = Math.max(r1, r2) + 1.5;
      return bbw((x, y) => {
        let t = ((x - x1) * bx + (y - y1) * by) / l2; t = t < 0 ? 0 : t > 1 ? 1 : t;
        return Math.hypot(x1 + bx * t - x, y1 + by * t - y) - (r1 + (r2 - r1) * t);
      }, [Math.min(x1, x2) - R, Math.min(y1, y2) - R, Math.max(x1, x2) + R, Math.max(y1, y2) + R]);
    },
    box(x0, y0, x1, y1, rr) {
      rr = rr || 0;
      const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, hx2 = (x1 - x0) / 2 - rr, hy2 = (y1 - y0) / 2 - rr;
      return bbw((x, y) => {
        const qx = Math.abs(x - cx) - hx2, qy = Math.abs(y - cy) - hy2;
        return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - rr;
      }, [x0 - 1, y0 - 1, x1 + 1, y1 + 1]);
    },
    poly(pts) {
      const n = pts.length;
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      for (const p of pts) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }
      return bbw((x, y) => {
        let d = 1e9, inside = false;
        for (let i = 0, j = n - 1; i < n; j = i++) {
          const ax = pts[j][0], ay = pts[j][1], bx = pts[i][0], by = pts[i][1];
          const ex = bx - ax, ey = by - ay;
          let t = ((x - ax) * ex + (y - ay) * ey) / ((ex * ex + ey * ey) || 1); t = t < 0 ? 0 : t > 1 ? 1 : t;
          const dx = ax + ex * t - x, dy = ay + ey * t - y; d = Math.min(d, dx * dx + dy * dy);
          if ((ay > y) !== (by > y) && x < (bx - ax) * (y - ay) / (by - ay) + ax) inside = !inside;
        }
        return (inside ? -1 : 1) * Math.sqrt(d);
      }, [x0 - 1.5, y0 - 1.5, x1 + 1.5, y1 + 1.5]);
    },
    U(...fs) {
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      for (const f of fs) { const b = f.bb; x0 = Math.min(x0, b[0]); y0 = Math.min(y0, b[1]); x1 = Math.max(x1, b[2]); y1 = Math.max(y1, b[3]); }
      return bbw((x, y) => { let d = 1e9; for (let i = 0; i < fs.length; i++) { const v = fs[i](x, y); if (v < d) d = v; } return d; }, [x0, y0, x1, y1]);
    },
    I(a, b) { return bbw((x, y) => Math.max(a(x, y), b(x, y)), a.bb); },
    D(a, b) { return bbw((x, y) => Math.max(a(x, y), -b(x, y)), a.bb); },
    ring(a, th) { return bbw((x, y) => Math.abs(a(x, y)) - th, a.bb); },
    gear(cx, cy, r, teeth, depth) {
      return bbw((x, y) => { const a = Math.atan2(y - cy, x - cx); return Math.hypot(x - cx, y - cy) - (r + depth * (0.5 + 0.5 * Math.cos(a * teeth))); },
        [cx - r - depth - 1.5, cy - r - depth - 1.5, cx + r + depth + 1.5, cy + r + depth + 1.5]);
    },
  };

  // ---- a logical-resolution sprite buffer
  function Spr(w, h, ol) {
    this.w = w; this.h = h;
    this.id = new Int16Array(w * h).fill(-1);
    this.band = new Uint8Array(w * h);
    this.em = new Int32Array(w * h).fill(-1);
    this.mats = [];
    this.ol = ol ? toC(ol) : [22, 14, 30];
  }
  Spr.prototype.M = function (c) {
    const r = (typeof c === 'string' || typeof c[0] === 'number') ? ramp(c) : c;
    this.mats.push(r); return this.mats.length - 1;
  };
  // paint a shape: material m, dome radius R (default from size)
  Spr.prototype.add = function (sdf, m, R) {
    const bb = sdf.bb, w = this.w, h = this.h;
    const x0 = Math.max(0, Math.floor(bb[0])), y0 = Math.max(0, Math.floor(bb[1]));
    const x1 = Math.min(w - 1, Math.ceil(bb[2])), y1 = Math.min(h - 1, Math.ceil(bb[3]));
    if (!R) R = Math.max(1.5, Math.min(bb[2] - bb[0], bb[3] - bb[1]) * 0.42);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const px = x + 0.5, py = y + 0.5, d = sdf(px, py);
      if (d > 0) continue;
      const gx = sdf(px + 0.5, py) - sdf(px - 0.5, py), gy = sdf(px, py + 0.5) - sdf(px, py - 0.5);
      const gl = Math.hypot(gx, gy) || 1;
      const k = clamp(-d / R, 0, 1), c = 1 - k, s = Math.sqrt(Math.max(0, 1 - c * c));
      const lam = (gx / gl) * c * LX + (gy / gl) * c * LY + s * LZ;
      const i = y * w + x;
      this.id[i] = m; this.band[i] = lam < 0.25 ? 0 : lam < 0.55 ? 1 : lam < 0.8 ? 2 : 3;
    }
  };
  Spr.prototype.px = function (x, y, m, band) {
    x = Math.floor(x); y = Math.floor(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = y * this.w + x; this.id[i] = m; this.band[i] = band || 0;
  };
  Spr.prototype.emp = function (x, y, c) {
    x = Math.floor(x); y = Math.floor(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.em[y * this.w + x] = typeof c === 'number' ? c : pk(toC(c));
  };
  // emissive fill / ring inside an sdf region
  Spr.prototype.emFill = function (sdf, c, ring) {
    const p = typeof c === 'number' ? c : pk(toC(c)), bb = sdf.bb;
    for (let y = Math.max(0, Math.floor(bb[1])); y <= Math.min(this.h - 1, Math.ceil(bb[3])); y++)
      for (let x = Math.max(0, Math.floor(bb[0])); x <= Math.min(this.w - 1, Math.ceil(bb[2])); x++) {
        const d = sdf(x + 0.5, y + 0.5);
        if (ring ? Math.abs(d) <= ring : d <= 0) this.em[y * this.w + x] = p;
      }
  };
  // recolour a fraction of one material (rust, grime, moss)
  Spr.prototype.speck = function (m, seed, prob, from) {
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      const i = y * this.w + x;
      if (this.id[i] === from && hash2(x + seed * 7, y - seed * 3) < prob) { this.id[i] = m; this.band[i] = 1; }
    }
  };
  // hollow-crack / ember-crack walks over solid pixels, emissive
  Spr.prototype.cracks = function (seed, n, len, c, mask) {
    const R = G.util.rng(seed), p = pk(toC(c));
    let placed = 0;
    for (let k = 0; k < n * 14 && placed < n; k++) {
      let x = Math.floor(R() * this.w), y = Math.floor(R() * this.h);
      if (this.id[y * this.w + x] < 0 || (mask && !mask(x, y))) continue;
      let dir = R() * Math.PI * 2, fx = x + 0.5, fy = y + 0.5;
      const L = len[0] + Math.floor(R() * (len[1] - len[0] + 1));
      for (let s = 0; s < L; s++) {
        dir += (R() - 0.5) * 1.1;
        fx += Math.cos(dir) * 0.9; fy += Math.sin(dir) * 0.9;
        const ix = Math.floor(fx), iy = Math.floor(fy);
        if (ix < 0 || iy < 0 || ix >= this.w || iy >= this.h || this.id[iy * this.w + ix] < 0) break;
        this.em[iy * this.w + ix] = p;
      }
      placed++;
    }
  };
  // sparse emissive stars over solid pixels
  Spr.prototype.stars = function (seed, prob, cols) {
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      const i = y * this.w + x;
      if (this.id[i] < 0) continue;
      const hsh = hash2(x * 3 + seed, y * 5 - seed);
      if (hsh < prob) this.em[i] = pk(toC(cols[Math.floor(hash2(x, y + seed) * cols.length)]));
    }
  };
  // stripes across a shape: every `every` rows at offset off
  Spr.prototype.stripes = function (sdf, m, every, off) {
    const bb = sdf.bb;
    for (let y = Math.max(0, Math.floor(bb[1])); y <= Math.min(this.h - 1, Math.ceil(bb[3])); y++) {
      if (((y - off) % every + every) % every !== 0) continue;
      for (let x = Math.max(0, Math.floor(bb[0])); x <= Math.min(this.w - 1, Math.ceil(bb[2])); x++)
        if (sdf(x + 0.5, y + 0.5) <= 0) this.id[y * this.w + x] = m, this.band[y * this.w + x] = 0;
    }
  };
  // pixel -> final canvas (scale), with outline pass, emissive pass and bloom halo
  Spr.prototype.render = function (scale) {
    scale = scale || 2;
    const w = this.w, h = this.h, W = w * scale, H = h * scale;
    const cv = G.util.canvas(W, H), cx = cv.getContext('2d');
    const gv = G.util.canvas(W, H), gx = gv.getContext('2d');
    const img = cx.createImageData(W, H), d = img.data;
    const gimg = gx.createImageData(W, H), gd = gimg.data;
    let anyGlow = false;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x;
      let c = null;
      if (this.id[i] >= 0) {
        const b = this.mats[this.id[i]][this.band[i]], j = (hash2(x, y) - 0.5) * 7;
        c = [b[0] + j, b[1] + j, b[2] + j];
      } else if ((x > 0 && this.id[i - 1] >= 0) || (x < w - 1 && this.id[i + 1] >= 0) ||
                 (y > 0 && this.id[i - w] >= 0) || (y < h - 1 && this.id[i + w] >= 0)) {
        c = this.ol;
      }
      const e = this.em[i];
      let ec = null;
      if (e >= 0) { ec = [(e >> 16) & 255, (e >> 8) & 255, e & 255]; anyGlow = true; if (this.id[i] >= 0) c = ec; }
      for (let sy = 0; sy < scale; sy++) for (let sx = 0; sx < scale; sx++) {
        const o = ((y * scale + sy) * W + x * scale + sx) * 4;
        if (c) { d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 255; }
        if (ec) { gd[o] = ec[0]; gd[o + 1] = ec[1]; gd[o + 2] = ec[2]; gd[o + 3] = 255; }
      }
      if (ec && this.id[i] < 0) { /* emissive pixel on the outline/empty: keep it visible */
        for (let sy = 0; sy < scale; sy++) for (let sx = 0; sx < scale; sx++) {
          const o = ((y * scale + sy) * W + x * scale + sx) * 4; d[o] = ec[0]; d[o + 1] = ec[1]; d[o + 2] = ec[2]; d[o + 3] = 255;
        }
      }
    }
    cx.putImageData(img, 0, 0);
    let glow = null;
    if (anyGlow) {
      gx.putImageData(gimg, 0, 0);
      glow = G.util.canvas(W, H);
      const g2 = glow.getContext('2d');
      try { g2.filter = 'blur(' + (scale * 2) + 'px)'; } catch (e) { /* no filter support: crisp glow only */ }
      g2.globalAlpha = 0.85; g2.drawImage(gv, 0, 0);
      try { g2.filter = 'none'; } catch (e) { /* ignore */ }
      g2.globalAlpha = 1; g2.drawImage(gv, 0, 0);
    }
    cv.__glow = glow;
    return cv;
  };

  // ---- shape helpers used by creature builders
  // fan wing: lobes around a root point; side -1 (left) / 1 (right); flap in [-1,1]
  function fanWing(rx, ry, side, spec, flap) {
    const centers = [], lobes = [];
    spec.forEach(([a, l, r], i) => {
      const aa = a + flap * (0.25 + 0.2 * i);
      const cx = rx + side * Math.cos(aa) * l, cy = ry - Math.sin(aa) * l;
      centers.push([cx, cy]); lobes.push(SD.circ(cx, cy, r));
    });
    const membrane = SD.poly([[rx, ry]].concat(centers));
    return { membrane, lobes, centers, all: SD.U(membrane, ...lobes) };
  }
  // a rounded mini-blob used for little bumps
  const cir = (cx, cy, r) => SD.circ(cx, cy, r);

  /* ======================================================================
   * 2. Archetype builders. Each returns a function (t) -> Spr; t = animation variant.
   * ====================================================================== */
  const BUILD = {};
  const META = {};   // per enemy: { lift, frames, pal }

  // ---- blob: slimes
  BUILD.moss_slime = (t) => {
    const S = new Spr(40, 32);
    const body = S.M('#74d162'), moss = S.M('#3d8a3c'), ink = S.M('#1a1224'), leaf = S.M('#56b04a');
    const sq = t ? 0.7 : 0;
    const b = SD.I(SD.ell(20, 22 + sq * 0.4, 15, 9.5 - sq * 0.4), SD.box(0, 0, 40, 27.5, 0));
    S.add(b, body, 6);
    S.add(SD.U(cir(11, 14, 3.6), cir(20, 11.5, 4.3), cir(29, 14, 3.6), cir(15.5, 13, 2.4), cir(24.5, 13, 2.4)), moss, 1.8);
    S.add(SD.poly([[19, 9], [14, 4], [20, 7], [24, 2], [23, 9]]), leaf, 1);
    S.add(SD.ell(31, 26.5, 1.6, 2.2), body, 1);
    S.add(SD.ell(8.5, 25.5, 1.3, 2), body, 1);
    for (const x of [14, 15, 24, 25]) for (let y = 18; y <= 21; y++) S.px(x, y, ink, 0);
    S.emp(14, 18, '#ffffff'); S.emp(24, 18, '#ffffff');
    S.px(19, 24, ink, 0); S.px(20, 25, ink, 0); S.px(21, 25, ink, 0); S.px(22, 24, ink, 0);
    S.px(11, 19, body, 3); S.px(12, 18, body, 3); S.px(30, 22, body, 3);
    return S;
  };

  // ---- winged: bats & moths
  BUILD.forest_bat = (t) => {
    const S = new Spr(44, 38);
    const body = S.M('#4e3a62'), mem = S.M('#8a5cae'), mem2 = S.M('#5d3d7f'), bone = S.M('#2d2338'), ink = S.M('#150f1d');
    const f = t ? 1 : -1;
    const spec = [[1.0, 7, 3.3], [0.5, 11.5, 3.8], [0.0, 13, 3.6], [-0.5, 11, 3.2], [-0.9, 7, 2.6]];
    const WL = fanWing(22, 21, -1, spec, f * 0.5), WR = fanWing(22, 21, 1, spec, f * 0.5);
    for (const W of [WL, WR]) {
      S.add(W.all, mem, 2.2);
      W.centers.forEach((c) => S.add(SD.cap(22, 21, c[0], c[1], 0.55, 0.45), bone, 0.8));
    }
    S.add(SD.ell(22, 21, 3.6, 5), body, 3);
    S.add(SD.circ(22, 14.5, 3.2), body, 2.4);
    S.add(SD.poly([[19.5, 13], [18.6, 8], [21.4, 12]]), body, 1);
    S.add(SD.poly([[24.5, 13], [25.4, 8], [22.6, 12]]), body, 1);
    S.emp(20, 14, '#ff5a5a'); S.emp(24, 14, '#ff5a5a');
    S.px(21, 17, ink, 0); S.px(23, 17, ink, 0);
    S.px(21, 17, S.M('#fbf6ea'), 3); S.px(23, 17, S.M('#fbf6ea'), 3);
    return S;
  };
  BUILD.pale_moth = (t) => {
    const S = new Spr(44, 40);
    const wing = S.M('#ece6f6'), dark = S.M('#b9aed3'), eye = S.M('#8674ad'), body = S.M('#d8d0e6'), ink = S.M('#1a1224');
    const f = t ? -1.2 : 1.2;
    const up = [SD.circ(13.5, 15 + f, 7.2), SD.circ(30.5, 15 + f, 7.2)];
    const lo = [SD.circ(15, 26 - f * 0.5, 5.4), SD.circ(29, 26 - f * 0.5, 5.4)];
    S.add(SD.U(SD.circ(13.5, 15 + f, 8.4), SD.circ(30.5, 15 + f, 8.4), SD.circ(15, 26 - f * 0.5, 6.6), SD.circ(29, 26 - f * 0.5, 6.6)), dark, 3);
    S.add(SD.U(...up, ...lo), wing, 3);
    S.add(SD.circ(13.5, 16 + f, 2.5), eye, 1);
    S.add(SD.circ(30.5, 16 + f, 2.5), eye, 1);
    S.px(13, 16 + f, ink, 0); S.px(30, 16 + f, ink, 0);
    S.add(SD.cap(22, 13, 22, 31, 2.6, 2), body, 2);
    S.add(SD.circ(22, 11, 2.5), body, 2);
    S.add(SD.cap(21, 9, 17, 2.5, 0.4), ink, 0.6);
    S.add(SD.cap(23, 9, 27, 2.5, 0.4), ink, 0.6);
    return S;
  };
  BUILD.void_moth = (t) => {
    const S = new Spr(48, 44);
    const wing = S.M('#2e2446'), edge = S.M('#4b3a72'), body = S.M('#1d1630'), ink = S.M('#0c0812'), bone = S.M('#3a2d56');
    const f = t ? -1.2 : 1.2;
    const up = [SD.circ(14, 15 + f, 8), SD.circ(34, 15 + f, 8)];
    const lo = [SD.circ(15.5, 29 - f * 0.5, 5.8), SD.circ(32.5, 29 - f * 0.5, 5.8)];
    S.add(SD.U(SD.circ(14, 15 + f, 9), SD.circ(34, 15 + f, 9), SD.circ(15.5, 29 - f * 0.5, 6.8), SD.circ(32.5, 29 - f * 0.5, 6.8)), edge, 3);
    S.add(SD.U(...up, ...lo), wing, 3.2);
    S.add(SD.cap(24, 14, 24, 35, 2.8, 2.2), body, 2);
    S.add(SD.circ(24, 11.5, 2.8), body, 2);
    S.add(SD.cap(23, 9, 18, 2, 0.5), bone, 0.6);
    S.add(SD.cap(25, 9, 30, 2, 0.5), bone, 0.6);
    S.px(23, 11, ink, 0); S.px(25, 11, ink, 0);
    S.emp(23, 11, '#c7a8ff'); S.emp(25, 11, '#c7a8ff');
    S.stars(11, 0.09, ['#b99cff', '#8ef0ff', '#ffd6ff']);
    S.emFill(SD.ring(SD.circ(14, 15 + f, 3.2), 0.6), '#9b7cff');
    S.emFill(SD.ring(SD.circ(34, 15 + f, 3.2), 0.6), '#9b7cff');
    return S;
  };

  // ---- quadrupeds: boar, hounds, whelp (drake with wings)
  function quadBuild(o) {
    return (t) => {
      const W = o.w, H = o.h, S = new Spr(W, H);
      const body = S.M(o.body), belly = S.M(o.belly || o.body), dark = S.M(o.dark), ink = S.M('#1a1224');
      const trim = S.M(o.trim || o.dark), tusk = S.M('#f4ecd6'), spike = S.M(o.spike || o.dark);
      const [tx, ty, trx, tr] = o.torso;
      const f = t ? 1 : -1;
      const legY1 = ty + tr * 0.35, legY2 = H - 2, lr = o.legR || 2.2;
      const bx = tx - trx * 0.6, fx = tx + trx * 0.55;
      if (o.wings) {
        const WG = fanWing(tx - 1, ty - tr * 0.4, -1, o.wings, f * 0.6);
        S.add(WG.all, dark, 1.6);
        WG.centers.forEach((c) => S.add(SD.cap(tx - 1, ty - tr * 0.4, c[0], c[1], 0.5, 0.4), trim, 0.8));
      }
      // far legs
      S.add(SD.cap(bx + 1.5, legY1, bx + 1.5 - f * 1.6, legY2, lr, lr * 0.85), dark, 1.2);
      S.add(SD.cap(fx - 1.5, legY1, fx - 1.5 + f * 1.6, legY2, lr, lr * 0.85), dark, 1.2);
      if (o.tail) S.add(SD.cap(tx - trx + 1, ty - tr * 0.2, tx - trx - o.tail[0], ty + o.tail[1], 1.4, 0.5), dark, 1);
      S.add(SD.ell(tx, ty, trx, tr), body, Math.min(trx, tr) * 0.95);
      S.add(SD.I(SD.ell(tx, ty + tr * 0.5, trx * 0.85, tr * 0.6), SD.ell(tx, ty, trx, tr)), belly, 2);
      if (o.spikes) {
        for (let i = 0; i < o.spikes; i++) {
          const sx = tx - trx * 0.7 + i * (trx * 1.3 / Math.max(1, o.spikes - 1));
          S.add(SD.poly([[sx - 1.6, ty - tr * 0.35], [sx + 0.2, ty - tr - 3.8], [sx + 1.6, ty - tr * 0.3]]), spike, 1);
        }
      }
      // near legs
      S.add(SD.cap(bx, legY1, bx + f * 1.8, legY2, lr, lr * 0.85), body, 1.2);
      S.add(SD.cap(fx, legY1, fx - f * 1.8, legY2, lr, lr * 0.85), body, 1.2);
      S.add(SD.ell(bx + f * 1.8, legY2 - 0.5, lr * 1.1, 1.3), ink, 0.6);
      S.add(SD.ell(fx - f * 1.8, legY2 - 0.5, lr * 1.1, 1.3), ink, 0.6);
      // head & snout
      const [hx, hy, hr] = o.head;
      const hd = SD.ell(hx, hy, hr * 1.05, hr);
      if (o.ears === 'pointy') {
        S.add(SD.poly([[hx - hr * 0.5, hy - hr * 0.6], [hx - hr * 0.2, hy - hr * 1.9], [hx + hr * 0.2, hy - hr * 0.6]]), dark, 1);
      } else if (o.ears === 'floppy') {
        S.add(SD.ell(hx - hr * 0.35, hy - hr * 0.2, hr * 0.42, hr * 0.8), dark, 1);
      }
      const sn = o.snout || hr * 0.9;
      S.add(SD.U(hd, SD.cap(hx + hr * 0.5, hy + hr * 0.25, hx + hr * 0.7 + sn, hy + hr * 0.3, hr * 0.62, hr * 0.5)), body, hr * 0.85);
      if (o.collar) {
        const nx = hx - hr * 0.95;
        S.add(SD.cap(nx, hy - hr * 0.7, nx + 0.8, hy + hr * 1.1, 2.4, 2.2), trim, 1);
        S.emp(nx - 0.5, hy - hr * 0.1, o.collarEm || '#ffd27a'); S.emp(nx - 0.5, hy + hr * 0.6, o.collarEm || '#ffd27a');
      }
      if (o.tusks) {
        const tx2 = hx + hr * 0.9 + sn * 0.45;
        S.add(SD.poly([[tx2 - 0.5, hy + hr * 0.5], [tx2 + 2.4, hy + hr * 1.5], [tx2 + 0.6, hy + hr * 0.7]]), tusk, 0.8);
      }
      const ey = hy - hr * 0.2, ex = hx + hr * 0.25;
      if (o.eye) { S.emp(ex, ey, o.eye); S.px(ex, ey, ink, 0); }
      else { S.px(ex, ey, ink, 0); S.emp(ex, ey - 1, '#ffffff'); }
      S.px(hx + hr * 0.7 + sn - 0.5, hy + hr * 0.1, ink, 0);
      if (o.cracks) S.cracks(o.seed || 7, o.cracks, [3, 7], o.crackCol || '#b77bff', (x, y) => y < H - 4);
      return S;
    };
  }
  BUILD.thorn_boar = quadBuild({
    w: 56, h: 40, body: '#8e5c3b', belly: '#b47c53', dark: '#56361f', spike: '#4f6a31', trim: '#4f6a31',
    torso: [24, 22, 17, 9.5], head: [44, 22, 8.5], snout: 5, ears: 'floppy', tusks: true, spikes: 6,
    tail: [3, -4], legR: 2.6,
  });
  BUILD.arena_hound = quadBuild({
    w: 58, h: 42, body: '#c9a06a', belly: '#e0bf8c', dark: '#7d5c3a', trim: '#8f9aa8',
    torso: [24, 20, 18, 8], head: [45, 16, 7.5], snout: 9, ears: 'pointy', collar: true, tail: [6, -6], legR: 1.8,
  });
  BUILD.hollow_hound = quadBuild({
    w: 58, h: 42, body: '#2c2338', belly: '#3d3150', dark: '#1a1424', trim: '#1a1424',
    torso: [24, 20, 18, 8], head: [45, 16, 7.5], snout: 9, ears: 'pointy', tail: [6, -7], legR: 1.8,
    eye: '#d59bff', cracks: 10, crackCol: '#b77bff', seed: 31,
  });
  BUILD.drake_whelp = quadBuild({
    w: 52, h: 46, body: '#c9473a', belly: '#e88e52', dark: '#7f2526', trim: '#5a1c22', spike: '#7f2526',
    torso: [22, 26, 14, 8], head: [39, 17, 7], snout: 8, ears: 'pointy', tail: [9, 0], legR: 2.2,
    wings: [[1.3, 10, 4.5], [0.8, 14, 4.8], [0.3, 12.5, 4.2], [-0.2, 8, 3.2]], eye: '#ffd24a',
  });

  // ---- wisps / wraiths
  BUILD.hollow_wisp = (t) => {
    const S = new Spr(32, 40);
    const outer = S.M('#7444b8'), inner = S.M('#c9a5ff'), core = S.M('#eadcff'), ink = S.M('#1a1224'), dark = S.M('#3a2360');
    const s = t ? 1 : -1;
    S.add(SD.cap(16, 28, 13 + s, 7, 4.2, 0.5), outer, 2);
    S.add(SD.cap(9, 28, 5 - s, 15, 3.2, 0.4), outer, 1.5);
    S.add(SD.cap(23, 28, 27 + s, 16, 3.2, 0.4), outer, 1.5);
    S.add(SD.ell(16, 22, 9, 10), outer, 4);
    S.add(SD.ell(16, 24, 5.5, 6.5), inner, 2.5);
    S.add(SD.ell(15, 22, 2.5, 3), core, 1.2);
    S.px(13, 22, ink, 0); S.px(19, 22, ink, 0);
    S.emp(12, 21, '#ffffff'); S.emp(18, 21, '#ffffff');
    S.cracks(41, 3, [2, 4], '#d7b8ff', (x, y) => y > 18 && y < 30);
    for (let y = 30; y < 36; y++) S.px(12 + ((y * 3) % 3), y, dark, 0);
    S.emFill(SD.ell(13 + s, 9, 1.5, 2), '#c99bff');
    return S;
  };
  BUILD.steam_sprite = (t) => {
    const S = new Spr(34, 36);
    const cl = S.M('#e4f7ff'), sh = S.M('#a9d8ea'), brass = S.M('#c8a04a'), dark = S.M('#6c5322'), ink = S.M('#18222e');
    const b = t ? 0.8 : 0;
    S.add(SD.U(cir(17, 18 - b, 8.5), cir(9.5, 22, 6), cir(24.5, 22, 6), cir(14, 11, 5.2), cir(22, 12, 5), cir(17, 26, 6)), cl, 4);
    S.add(SD.U(cir(9, 26, 4.5), cir(25, 26, 4.5)), sh, 1.5);
    S.add(SD.gear(12, 26, 4.2, 8, 1), brass, 1.1);
    S.add(SD.circ(12, 26, 1.2), dark, 0.8);
    S.add(SD.circ(29.5, 6, 1.6), cl, 1);
    S.add(SD.circ(31, 2, 1), cl, 0.8);
    S.emp(14, 17 - b, '#7ff0ff'); S.emp(21, 17 - b, '#7ff0ff');
    S.px(14, 18 - b, ink, 0); S.px(21, 18 - b, ink, 0);
    S.px(16, 23, ink, 0); S.px(17, 23, ink, 0);
    S.px(11, 11, cl, 3); S.px(12, 10, cl, 3);
    return S;
  };
  BUILD.ash_wraith = (t) => {
    const S = new Spr(36, 52);
    const robe = S.M('#8f96ab'), hood = S.M('#5c6276'), rag = S.M('#b5bbcc'), ink = S.M('#131420'), dark = S.M('#3e4356');
    const s = t ? 1.2 : -1.2;
    const hem = SD.poly([[9, 24], [27, 24], [31, 40], [28, 38], [27, 47], [23, 41], [19, 49], [16, 41], [12, 46], [10, 38], [5, 42]]);
    S.add(hem, robe, 4);
    S.add(SD.U(SD.cap(12, 26, 4, 36 + s, 2, 1.5), SD.cap(24, 26, 32, 35 - s, 2, 1.5)), rag, 1.2);
    S.add(SD.poly([[10, 16], [26, 16], [28, 26], [8, 26]]), robe, 3);
    S.add(SD.circ(18, 14.5, 6.5), hood, 3.5);
    S.add(SD.ell(18, 15, 3.2, 4.2), ink, 0.5);
    S.emp(16, 14, '#f5e6a0'); S.emp(20, 14, '#f5e6a0');
    S.add(SD.poly([[8, 16], [13, 6], [18, 8], [15, 19]]), hood, 1.5);
    S.speck(rag, 9, 0.12, robe);
    S.stripes(SD.poly([[9, 24], [27, 24], [31, 40], [5, 42]]), dark, 6, 2);
    return S;
  };

  /* ---- humanoids (guards, bandits, gladiators, skeletons, ghouls, husks, knights, inquisitor) */
  function humanBuild(o) {
    return (t) => {
      const W = o.w || 28, H = o.h || 48, S = new Spr(W, H);
      const cx = W / 2;
      const skin = S.M(o.skin || '#f0c49a'), cloth = S.M(o.cloth), arm = S.M(o.armor || o.cloth);
      const trim = S.M(o.trim || '#e8c15c'), dk = S.M(o.dark || '#2b2438'), hel = S.M(o.helm || o.armor || o.cloth);
      const ink = S.M('#150f1d'), hair = S.M(o.hair || '#3a2a22'), wood = S.M('#7a5636'), steel = S.M('#dfe6f0');
      const hunch = !!o.hunch, sw = t ? 1.4 : -1.4;
      const hx2 = hunch ? cx + 2.5 : cx, hy = hunch ? 14 : 10;
      // legs
      S.add(SD.cap(cx - 3, 31, cx - 3 - (hunch ? 0 : sw), H - 4, 2.6, 2.2), o.legs ? S.M(o.legs) : dk, 1.5);
      S.add(SD.cap(cx + 3, 31, cx + 3 + (hunch ? 0 : sw), H - 4, 2.6, 2.2), o.legs ? S.M(o.legs) : dk, 1.5);
      S.add(SD.ell(cx - 3 - (hunch ? 0 : sw), H - 3, 2.6, 1.4), ink, 0.6);
      S.add(SD.ell(cx + 3 + (hunch ? 0 : sw), H - 3, 2.6, 1.4), ink, 0.6);
      // torso
      if (o.coat) {
        S.add(SD.U(SD.poly([[cx - 6.6, 17], [cx + 6.6, 17], [cx + 8.5, H - 6], [cx - 8.5, H - 6]]), SD.ell(cx, 21, 6.6, 6)), cloth, 4);
        S.add(SD.poly([[cx - 1, 19], [cx + 1, 19], [cx + 1.5, H - 7], [cx - 1.5, H - 7]]), trim, 0.8);
        S.add(SD.poly([[cx - 6.6, H - 9], [cx - 8.5, H - 6], [cx - 5, H - 6]]), trim, 0.8);
      } else if (hunch) {
        S.add(SD.U(SD.poly([[cx - 6.5, 18], [cx + 6, 18], [cx + 4, 31], [cx - 5, 31]]), SD.ell(cx + 1, 21, 6.5, 5)), arm, 3.5);
      } else {
        S.add(SD.U(SD.poly([[cx - 6, 17], [cx + 6, 17], [cx + 4.5, 31], [cx - 4.5, 31]]), SD.ell(cx, 20, 6.5, 5)), arm, 3.5);
        S.add(SD.poly([[cx - 4.5, 30], [cx + 4.5, 30], [cx + 4.5, 32], [cx - 4.5, 32]]), trim, 0.6);
      }
      if (o.trimLines && !o.coat) S.add(SD.cap(cx, 17, cx, 30, 0.5), trim, 0.6);
      if (o.ribs) for (let y = 19; y <= 28; y += 2) for (let x = Math.round(cx - 4); x <= cx + 3; x++) if (x !== Math.round(cx)) S.px(x, y, dk, 0);
      // arms
      if (hunch) {
        S.add(SD.cap(cx - 6, 19, cx - 10, H - 7, 2.1, 1.8), arm, 1.5);
        S.add(SD.cap(cx + 5.5, 19, cx + 9, H - 7, 2.1, 1.8), arm, 1.5);
        S.add(SD.poly([[cx - 10.5, H - 7], [cx - 12, H - 2], [cx - 8.8, H - 4]]), steel, 0.6);
        S.add(SD.poly([[cx + 9, H - 7], [cx + 10.5, H - 2], [cx + 7.8, H - 4]]), steel, 0.6);
      } else {
        S.add(SD.cap(cx - 6, 19, cx - 8, 30, 2.3, 2), o.coat ? cloth : arm, 1.6);
        S.add(SD.cap(cx + 6, 19, cx + 8, 30, 2.3, 2), o.coat ? cloth : arm, 1.6);
        S.add(SD.circ(cx - 8, 31.5, 1.7), skin, 1);
        S.add(SD.circ(cx + 8, 31.5, 1.7), skin, 1);
      }
      // weapons / shields / props
      const wp = o.weapon;
      if (wp === 'spear' || wp === 'halberd') {
        S.add(SD.cap(cx + 10.5, 0, cx + 10.5, H - 1, 0.8, 0.6), wood, 0.8);
        S.add(SD.poly([[cx + 10.5, -1], [cx + 8.8, 5], [cx + 12.2, 5]]), steel, 0.6);
        if (wp === 'halberd') S.add(SD.poly([[cx + 10.5, 6], [cx + 16, 8], [cx + 16, 15], [cx + 10.5, 14]]), steel, 0.6);
      } else if (wp === 'sword') {
        S.add(SD.cap(cx + 8.5, 31, cx + 13, 9, 1, 0.5), steel, 0.6);
        S.add(SD.cap(cx + 6.5, 31, cx + 10.5, 29.5, 0.9), trim, 0.6);
      } else if (wp === 'axe') {
        S.add(SD.cap(cx + 10.5, 8, cx + 10.5, H - 2, 0.9, 0.8), wood, 0.8);
        S.add(SD.poly([[cx + 10.5, 6], [cx + 17.5, 3.5], [cx + 17.5, 13], [cx + 10.5, 11]]), steel, 0.6);
      } else if (wp === 'lantern') {
        for (let i = 0; i < 7; i++) S.px(cx - 8 - i * 0.45, 34 + i * 0.8, trim, 3);
        S.add(SD.box(cx - 13.5, 39, cx - 9.5, 45, 1), trim, 1);
        S.emp(cx - 11.5, 41.5, '#ffd27a'); S.emp(cx - 11.5, 40.5, '#fff2c0');
      }
      if (o.shield) {
        S.add(SD.circ(cx - 10.5, 29.5, 5.6), S.M(o.shield), 1.6);
        S.add(SD.ring(SD.circ(cx - 10.5, 29.5, 5.6), 0.7), trim, 0.6);
        S.add(SD.circ(cx - 10.5, 29.5, 1.6), trim, 0.8);
      }
      // head
      if (o.skull) {
        S.add(SD.ell(hx2, hy, 4.4, 4.8), skin, 2.5);
        S.add(SD.box(hx2 - 2.8, hy + 3.2, hx2 + 2.8, hy + 5.6, 1), skin, 0.8);
        S.px(hx2 - 2, hy - 0.5, ink, 0); S.px(hx2 - 1, hy - 0.5, ink, 0); S.px(hx2 + 1, hy - 0.5, ink, 0); S.px(hx2 + 2, hy - 0.5, ink, 0);
        S.px(hx2 - 2, hy + 0.5, ink, 0); S.px(hx2 + 2, hy + 0.5, ink, 0);
        for (let x = hx2 - 2; x <= hx2 + 2; x++) S.px(x, hy + 4, ink, 0);
        if (o.eye) { S.emp(hx2 - 1.5, hy - 0.5, o.eye); S.emp(hx2 + 1.5, hy - 0.5, o.eye); }
      } else {
        S.add(SD.ell(hx2, hy, 4.8, 5.2), skin, 2.5);
        S.add(SD.circ(hx2 - 4.6, hy, 1.1), skin, 0.5);
        S.add(SD.circ(hx2 + 4.6, hy, 1.1), skin, 0.5);
        if (o.eye) { S.emp(hx2 - 1.8, hy - 0.5, o.eye); S.emp(hx2 + 1.8, hy - 0.5, o.eye); }
        else { S.px(hx2 - 1.8, hy - 0.5, ink, 0); S.px(hx2 + 1.8, hy - 0.5, ink, 0); }
        S.px(hx2 - 1, hy + 2.5, ink, 0); S.px(hx2, hy + 2.5, ink, 0); S.px(hx2 + 1, hy + 2.5, ink, 0);
      }
      // helmets / hair
      switch (o.helm) {
        case 'bronze':
          S.add(SD.U(SD.ell(hx2, hy - 1.5, 5.6, 4.6), SD.box(hx2 - 5.6, hy - 1, hx2 + 5.6, hy + 1.5, 0.5)), hel, 2);
          S.add(SD.poly([[hx2 - 0.8, hy - 5.5], [hx2 + 0.8, hy - 5.5], [hx2 + 1.4, hy - 10], [hx2 - 1.4, hy - 9.5]]), S.M('#b8323a'), 0.6);
          S.add(SD.box(hx2 - 4.6, hy - 0.5, hx2 + 4.6, hy + 2.5, 1), hel, 1);
          break;
        case 'great':
          S.add(SD.box(hx2 - 5.4, hy - 5.8, hx2 + 5.4, hy + 2, 1.6), hel, 2);
          for (let x = hx2 - 3; x <= hx2 + 3; x++) S.px(x, hy + 0.5, ink, 0);
          S.add(SD.ring(SD.box(hx2 - 5.4, hy - 5.8, hx2 + 5.4, hy + 2, 1.6), 0.5), trim, 0.5);
          break;
        case 'hood':
          S.add(SD.U(SD.ell(hx2, hy - 1, 6.2, 6.2), SD.poly([[hx2 - 4, hy - 4], [hx2 + 4, hy - 4], [hx2 + 2, hy - 10]])), hel, 2.5);
          S.add(SD.ell(hx2, hy + 1.5, 3.6, 3.2), skin, 1); S.px(hx2 - 1.8, hy + 0.5, ink, 0); S.px(hx2 + 1.8, hy + 0.5, ink, 0);
          break;
        case 'hat':
          S.add(SD.ell(hx2, hy - 4.5, 8.8, 2.2), hel, 1);
          S.add(SD.box(hx2 - 4.5, hy - 10, hx2 + 4.5, hy - 3.5, 1.2), hel, 2);
          S.add(SD.box(hx2 - 4, hy - 4.2, hx2 + 4, hy - 3, 0.5), trim, 0.5);
          break;
        case 'horn':
          S.add(SD.box(hx2 - 5.2, hy - 6, hx2 + 5.2, hy + 2, 1.5), hel, 2);
          S.add(SD.cap(hx2 - 4, hy - 5, hx2 - 7.5, hy - 12, 1.2, 0.4), hel, 0.6);
          S.add(SD.cap(hx2 + 4, hy - 5, hx2 + 7.5, hy - 12, 1.2, 0.4), hel, 0.6);
          for (let x = hx2 - 3; x <= hx2 + 3; x++) S.px(x, hy + 0.5, ink, 0);
          break;
        case 'bandage':
          S.add(SD.ell(hx2, hy, 5.4, 5.8), cloth, 2);
          S.stripes(SD.ell(hx2, hy, 5.4, 5.8), dk, 3, 0);
          S.add(SD.ell(hx2, hy - 1, 4, 3), cloth, 1);
          break;
        case 'cowl':
          S.add(SD.ell(hx2, hy - 1, 6, 6.2), hel, 2.5);
          S.add(SD.poly([[hx2 - 6, hy - 1], [hx2 + 6, hy - 1], [hx2 + 4, hy + 6], [hx2 - 4, hy + 6]]), dk, 0.8);
          break;
        case 'mask':
          S.add(SD.U(SD.ell(hx2, hy - 1, 5.8, 6), SD.box(hx2 - 4.6, hy - 2, hx2 + 4.6, hy + 5, 1)), hel, 2);
          for (let x = hx2 - 3; x <= hx2 + 3; x++) S.px(x, hy - 0.5, ink, 0);
          S.add(SD.ring(SD.circ(hx2, hy - 1, 5.8), 0.5), trim, 0.5);
          break;
        default:
          if (o.hair) S.add(SD.ell(hx2, hy - 2.5, 5.2, 3.2), hair, 1.5);
      }
      if (o.scarf) {
        const sc = S.M(o.scarf);
        S.add(SD.box(hx2 - 4.8, hy + 1.5, hx2 + 4.8, hy + 4.5, 1.2), sc, 1);
        S.add(SD.cap(hx2 + 4, hy + 4, hx2 + 6, hy + 9 + (t ? 1 : 0), 1.2, 0.8), sc, 0.6);
      }
      if (o.crest) S.add(SD.poly([[hx2 - 0.8, hy - 6.5], [hx2 + 0.8, hy - 6.5], [hx2 + 1.4, hy - 10], [hx2 - 1.4, hy - 9.5]]), S.M(o.crest), 0.6);
      if (o.horns) { /* reserved */ }
      if (o.cracks) S.cracks(o.seed || 17, o.cracks, [3, 6], o.crackCol || '#b77bff', null);
      if (o.stripeTorso) S.stripes(SD.box(cx - 6, 17, cx + 6, 31, 0), dk, o.stripeTorso, 0);
      if (o.eyeGlow) S.emp(hx2 - 1.8, hy - 0.5, o.eyeGlow);
      if (o.eyeGlow) S.emp(hx2 + 1.8, hy - 0.5, o.eyeGlow);
      if (o.eyeCol) { S.emp(hx2 - 1.8, hy - 0.5, o.eyeCol); S.emp(hx2 + 1.8, hy - 0.5, o.eyeCol); }
      if (o.speck) S.speck(S.M(o.speck), 5, 0.2, arm);
      if (o.speck2) S.speck(S.M(o.speck2), 9, 0.18, cloth);
      return S;
    };
  }
  BUILD.order_guard = humanBuild({
    w: 28, h: 48, skin: '#f2c6a0', cloth: '#f2f1ea', armor: '#eceff6', trim: '#e2b64a', dark: '#3a3850', helm: 'great',
    weapon: 'spear', legs: '#f0eee6', hair: '#6c5a3c', trimLines: true,
  });
  BUILD.sand_bandit = humanBuild({
    w: 28, h: 48, skin: '#c98b5f', cloth: '#b58a55', armor: '#8c6a45', trim: '#d9b26a', dark: '#4b3a2a', helm: 'hat',
    scarf: '#b04a2a', weapon: 'sword', legs: '#7a5d3e', hair: '#2a1d14', speck2: '#9c7448',
  });
  BUILD.gladiator_recruit = humanBuild({
    w: 28, h: 48, skin: '#d59b6c', cloth: '#7d4a2b', armor: '#b98a4a', trim: '#e8c066', dark: '#4a2e1d', helm: 'bronze',
    weapon: 'sword', shield: '#a3703a', legs: '#6f4426', crest: '#b8323a', trimLines: true,
  });
  BUILD.catacomb_skeleton = humanBuild({
    w: 26, h: 48, skin: '#e9e1cc', cloth: '#d9d0b8', armor: '#e9e1cc', trim: '#8f7a5a', dark: '#5a5044', helm: null,
    skull: true, ribs: true, weapon: 'sword', legs: '#d4cab2', eye: '#7cffb0', hair: '#e9e1cc',
  });
  BUILD.crypt_ghoul = humanBuild({
    w: 30, h: 44, skin: '#8fa48a', cloth: '#4e5a48', armor: '#5d6a52', trim: '#7d8f6e', dark: '#2c3228', helm: 'hood',
    hunch: true, legs: '#3a4234', eyeCol: '#f2e7a0', hair: '#2a3026', speck2: '#6e7d62',
  });
  BUILD.hollow_husk = humanBuild({
    w: 28, h: 48, skin: '#b9b2a4', cloth: '#b8b0a0', armor: '#a59e90', trim: '#8a8474', dark: '#5d574c', helm: 'bandage',
    legs: '#9d968a', cracks: 9, crackCol: '#b77bff', seed: 23, eyeCol: '#cfa6ff', stripeTorso: 3,
  });
  BUILD.order_inquisitor = humanBuild({
    w: 30, h: 50, skin: '#f0c7a2', cloth: '#f5f3ee', armor: '#f5f3ee', trim: '#d8aa3a', dark: '#2a2536', helm: 'cowl',
    coat: true, weapon: 'lantern', legs: '#2a2536', hair: '#3a2c2a',
  });
  BUILD.hollow_knight = humanBuild({
    w: 30, h: 52, skin: '#2b2638', cloth: '#343049', armor: '#3b3658', trim: '#7d5fc2', dark: '#1c1a2c', helm: 'horn',
    weapon: 'sword', legs: '#252238', cracks: 14, crackCol: '#b77bff', seed: 47, eyeCol: '#d6a8ff', shield: '#2e2a44',
  });
  BUILD.cinder_golem = (t) => {
    const S = new Spr(44, 56);
    const stone = S.M('#544b57'), stone2 = S.M('#3a3440'), hi = S.M('#6d6371'), ink = S.M('#18131c');
    const s = t ? 1.2 : -1.2;
    S.add(SD.box(12, 30, 32, 42, 3), stone, 3);
    S.add(SD.box(15, 6, 29, 18, 3), stone, 3);
    S.add(SD.box(4, 20, 12, 40, 2.5), stone2, 2);
    S.add(SD.box(32, 20, 40, 40, 2.5), stone2, 2);
    S.add(SD.box(12, 42, 20, 53, 2), stone2, 2);
    S.add(SD.box(24, 42, 32, 53, 2), stone2, 2);
    S.add(SD.box(10, 18, 34, 22, 1.5), hi, 1);
    S.add(SD.box(15 + s * 0.5, 2, 29, 6, 2), stone2, 1.5);
    S.add(SD.poly([[18, 2], [21, -2], [22, 3], [25, -4], [26, 2]]), S.M('#ff7a2a'), 0.6);
    S.speck(hi, 13, 0.14, stone); S.speck(stone2, 3, 0.2, stone);
    S.px(19, 11, ink, 0); S.px(25, 11, ink, 0);
    S.emp(19, 11, '#ffb347'); S.emp(25, 11, '#ffb347');
    S.cracks(61, 12, [5, 10], '#ff8a3a', (x, y) => y > 6);
    S.cracks(62, 6, [3, 6], '#ffd27a', (x, y) => y > 6);
    return S;
  };
  BUILD.cog_rat = (t) => {
    const S = new Spr(40, 28);
    const brass = S.M('#c99a46'), dark = S.M('#7a5a2a'), iron = S.M('#5a5f6b'), ink = S.M('#1a1224');
    const f = t ? 1 : -1;
    for (const x of [11, 15, 24, 28]) S.add(SD.cap(x, 20, x + (x < 20 ? -f : f) * 0.8, 26, 1.4, 1.2), iron, 1);
    S.add(SD.cap(8, 15, 2, 9, 0.9, 0.5), iron, 0.8);
    S.add(SD.cap(2, 9, 3, 4, 0.5, 0.5), iron, 0.5);
    S.add(SD.ell(19, 16, 12, 7.5), brass, 4);
    S.add(SD.gear(17, 15, 4.8, 8, 1.2), dark, 1.2);
    S.add(SD.circ(17, 15, 1.4), iron, 0.8);
    S.add(SD.ell(31, 14, 5.5, 5), brass, 2.5);
    S.add(SD.cap(33, 15, 38, 16, 2.5, 1.5), brass, 1.5);
    S.add(SD.circ(29, 8.5, 2.2), dark, 1);
    S.px(37, 15, ink, 0);
    S.emp(32, 12, '#ff4a3a'); S.emp(31, 12, '#ff8a6a');
    S.add(SD.cap(14, 9, 14, 3, 0.7, 0.7), iron, 0.8);
    S.px(23, 11, S.M('#fff2c8'), 3); S.px(26, 9, S.M('#fff2c8'), 3);
    S.emFill(SD.circ(14, 1.5, 1.5), '#ffffff');
    return S;
  };
  BUILD.rust_bot = (t) => {
    const S = new Spr(36, 48);
    const iron = S.M('#8c6a52'), rust = S.M('#b8562a'), dark = S.M('#4b3a34'), ink = S.M('#1a1224');
    const f = t ? 1 : -1;
    S.add(SD.box(10, 36, 16, 46, 1.5), dark, 1);
    S.add(SD.box(20 + f * 0.5, 36, 26 + f * 0.5, 46, 1.5), dark, 1);
    S.add(SD.box(8, 16, 28, 37, 3), iron, 3);
    S.add(SD.box(12, 22, 24, 31, 1.5), dark, 1);
    S.add(SD.cap(8, 19, 3, 32, 2, 1.8), iron, 1.5);
    S.add(SD.cap(28, 19, 33, 30, 2, 1.8), iron, 1.5);
    S.add(SD.poly([[33, 30], [37, 25], [36, 33], [32, 34]]), dark, 0.6);
    S.add(SD.box(10, 4, 26, 16, 2.5), iron, 2.5);
    S.add(SD.box(12, 8, 24, 11, 1), dark, 1);
    for (let x = 14; x <= 21; x++) S.emp(x, 9, '#ffb347');
    S.add(SD.cap(18, 4, 18, 0, 0.6, 0.6), dark, 0.6);
    S.add(SD.circ(18, 0, 1.4), iron, 1);
    S.emp(18, 0, '#ffd27a');
    S.speck(rust, 4, 0.16, iron);
    S.px(9, 18, S.M('#c7b09a'), 3); S.px(27, 18, S.M('#c7b09a'), 3); S.px(9, 35, S.M('#c7b09a'), 3); S.px(27, 35, S.M('#c7b09a'), 3);
    return S;
  };
  BUILD.spire_sentinel = (t) => {
    const S = new Spr(40, 52);
    const body = S.M('#8fa3bf'), dark = S.M('#4a5a78'), ink = S.M('#18222e'), pale = S.M('#c7d6ea');
    const hover = t ? 1 : 0;
    const halo = SD.ell(20, 9 + hover * 0.5, 16, 4.6);
    S.emFill(SD.ring(halo, 0.7), '#8ef6ff');
    S.add(SD.box(13, 17, 27, 46, 3), body, 3);
    S.add(SD.ell(20, 12, 6, 6), body, 3);
    S.add(SD.box(15, 11, 25, 13.5, 1.2), dark, 1);
    S.emFill(SD.box(16, 11.5, 24, 12.8, 0), '#8ef6ff');
    S.add(SD.box(14, 44, 18, 51, 1), dark, 1);
    S.add(SD.box(22, 44, 26, 51, 1), dark, 1);
    S.add(SD.cap(13, 20, 7, 36 + hover, 2, 1.8), pale, 1.2);
    S.add(SD.cap(27, 20, 33, 36 + hover, 2, 1.8), pale, 1.2);
    S.add(SD.circ(20, 29, 3.2), dark, 1.2);
    S.emp(20, 29, '#8ef6ff');
    S.px(16, 35, dark, 0); S.px(24, 35, dark, 0); S.px(16, 24, dark, 0); S.px(24, 24, dark, 0);
    return S;
  };
  BUILD.cold_drone = (t) => {
    const S = new Spr(36, 32);
    const body = S.M('#c4e9ff'), arm = S.M('#3d4e66'), blade = S.M('#e2f6ff'), ink = S.M('#18222e');
    const spin = t ? 1 : -1;
    for (const [x, y] of [[6, 7], [30, 7], [6, 25], [30, 25]]) {
      S.add(SD.cap(18, 16, x, y, 1.1, 1), arm, 0.8);
      S.add(SD.ell(x, y, 5.2, 0.9 + (spin > 0 ? 0 : 0.3)), blade, 0.7);
    }
    S.add(SD.ell(18, 16, 9, 8), body, 4);
    S.add(SD.ell(18, 17.5, 9, 3.2), arm, 0.8);
    S.emFill(SD.circ(18, 15.5, 2.8), '#7ff0ff');
    S.px(18, 15, ink, 0);
    return S;
  };
  BUILD.briar_treant = (t) => {
    const S = new Spr(44, 56);
    const bark = S.M('#6a4a2e'), dark = S.M('#3e2a1a'), leaf = S.M('#4a9a3e'), leaf2 = S.M('#2f6e33'), thorn = S.M('#e6dcb0'), ink = S.M('#18140c');
    const sw = t ? 1 : 0;
    S.add(SD.cap(22, 46, 16 - sw, 54, 2.2, 1.6), dark, 1);
    S.add(SD.cap(22, 46, 28 + sw, 54, 2.2, 1.6), dark, 1);
    S.add(SD.cap(22, 30, 22, 52, 7, 5), bark, 3.5);
    S.add(SD.cap(22, 40, 14, 48, 1.4, 1), bark, 1);
    S.add(SD.cap(22, 40, 30, 48, 1.4, 1), bark, 1);
    S.add(SD.U(cir(22, 18, 12), cir(12, 24, 7.5), cir(32, 24, 7.5), cir(22, 6, 7)), leaf, 5);
    S.add(SD.U(cir(15, 14, 4), cir(31, 12, 4)), leaf2, 2);
    S.add(SD.cap(19, 32, 18, 42, 0.8, 0.6), dark, 0.6);
    S.add(SD.cap(25, 32, 26, 42, 0.8, 0.6), dark, 0.6);
    S.add(SD.poly([[10, 16], [5, 13], [9, 20]]), thorn, 0.5);
    S.add(SD.poly([[36, 18], [41, 14], [36, 23]]), thorn, 0.5);
    S.emp(18, 27, '#ffb347'); S.emp(26, 27, '#ffb347');
    S.px(18, 27, ink, 0); S.px(26, 27, ink, 0);
    S.px(20, 32, ink, 0); S.px(21, 33, ink, 0); S.px(22, 33, ink, 0); S.px(23, 33, ink, 0); S.px(24, 32, ink, 0);
    S.stripes(SD.cap(22, 30, 22, 52, 7, 5), dark, 4, 1);
    return S;
  };


  /* ---- bosses (hand-tuned) ---- */
  BUILD.hollow_stag = (t) => {
    const S = new Spr(80, 66);
    const fur = S.M('#6e4a32'), belly = S.M('#94694a'), dark = S.M('#3c2719'), bone = S.M('#e9dcbc'), boneD = S.M('#b9a582'), ink = S.M('#140d12'), hoof = S.M('#1d1419');
    const f = t ? 1 : -1;
    // far legs
    S.add(SD.cap(24, 44, 24 + f * 2, 62, 2.6, 2), dark, 1.2);
    S.add(SD.cap(50, 44, 50 - f * 2, 62, 2.6, 2), dark, 1.2);
    S.add(SD.ell(24 + f * 2, 63.5, 2.6, 1.5), hoof, 0.8);
    S.add(SD.ell(50 - f * 2, 63.5, 2.6, 1.5), hoof, 0.8);
    // tail
    S.add(SD.cap(16, 36, 9, 42 + f, 2.2, 1), dark, 1);
    // body
    S.add(SD.ell(37, 38, 22, 11), fur, 8);
    S.add(SD.I(SD.ell(37, 45, 19, 6), SD.ell(37, 38, 22, 11)), belly, 3);
    // near legs
    S.add(SD.cap(30, 44, 30 - f * 2, 62, 3, 2.2), fur, 1.2);
    S.add(SD.cap(58, 44, 58 + f * 2, 62, 3, 2.2), fur, 1.2);
    S.add(SD.ell(30 - f * 2, 63.5, 2.9, 1.6), hoof, 0.8);
    S.add(SD.ell(58 + f * 2, 63.5, 2.9, 1.6), hoof, 0.8);
    // neck & head
    S.add(SD.cap(55, 33, 63, 21, 6.5, 4.5), fur, 3);
    S.add(SD.ell(65, 19, 8, 5.5), fur, 4);
    S.add(SD.cap(69, 20, 77, 23, 3.6, 2.4), belly, 2);
    S.add(SD.poly([[61, 16], [56, 9], [63, 13]]), fur, 0.6);
    S.emp(66, 17, '#c58bff'); S.emp(70, 17, '#c58bff');
    S.px(67, 17, ink, 0); S.px(71, 17, ink, 0);
    S.px(76, 21, ink, 0);
    // antlers (bone, with violet hollow glow at the tips)
    const beam = (x1, y1, x2, y2, r) => S.add(SD.cap(x1, y1, x2, y2, r, r * 0.6), bone, 1);
    beam(63, 14, 55, 1, 1.7);
    beam(59, 8, 47, 4, 1.0); beam(58, 5, 52, -1, 0.9); beam(60, 10, 54, 11, 0.7);
    beam(66, 14, 74, 1, 1.6);
    beam(70, 8, 79, 4, 1.0); beam(71, 5, 76, -1, 0.9);
    for (const [x, y] of [[47, 4], [52, -1], [79, 4], [76, -1]]) S.emp(x, y, '#c58bff');
    // hollow cracks and void pits in the body
    S.cracks(77, 24, [5, 10], '#b77bff', (x, y) => y > 6);
    for (let i = 0; i < 6; i++) {
      const cxp = 30 + i * 4, cyp = 36 + (i % 2) * 4;
      S.add(SD.circ(cxp, cyp, 1.3), ink, 0.4);
      S.emFill(SD.ring(SD.circ(cxp, cyp, 1.3), 0.5), '#8f5cff');
    }
    return S;
  };

  BUILD.brass_sentinel = (t) => {
    const W = 88, H = 96, S = new Spr(W, H);
    const brass = S.M('#c9a24a'), brassD = S.M('#8c6b2a'), iron = S.M('#5b5d66'), ironD = S.M('#34363e'), rivet = S.M('#f4dc92'), ink = S.M('#1a1224');
    const st = t ? 1 : 0;
    S.add(SD.box(24, 66, 40, 88, 4), ironD, 3);
    S.add(SD.box(48, 66, 64, 88, 4), ironD, 3);
    S.add(SD.box(18, 86, 44, 95, 3), brassD, 2.5);
    S.add(SD.box(44, 86, 70, 95, 3), brassD, 2.5);
    S.add(SD.box(22, 58, 66, 70, 5), iron, 4);
    S.add(SD.ell(44, 44, 26, 22), brass, 9);
    S.add(SD.ring(SD.ell(44, 44, 26, 22), 1.6), iron, 0.8);
    S.add(SD.circ(44, 44, 9.5), iron, 2);
    S.emFill(SD.circ(44, 44, 6.5), '#ffb347');
    S.emFill(SD.circ(44, 44, 3), '#fff0b8');
    S.add(SD.cap(24, 30, 64, 30, 1.6), brassD, 1);
    S.add(SD.gear(44, 25, 4.6, 10, 1.2), brassD, 1.2);
    S.add(SD.circ(44, 25, 1.4), iron, 0.8);
    for (let a = 0; a < 14; a++) {
      const ang = a / 14 * Math.PI * 2;
      S.px(44 + Math.cos(ang) * 23.5, 44 + Math.sin(ang) * 19.5, rivet, 3);
    }
    S.add(SD.circ(18, 30, 10), iron, 4);
    S.add(SD.circ(70, 30, 10), iron, 4);
    S.add(SD.ring(SD.circ(18, 30, 10), 1), brassD, 0.6);
    S.add(SD.ring(SD.circ(70, 30, 10), 1), brassD, 0.6);
    S.add(SD.cap(18, 36, 11 - st, 62, 6, 5), brass, 4);
    S.add(SD.cap(70, 36, 77 + st, 62, 6, 5), brass, 4);
    S.add(SD.cap(12, 50, 10, 60, 2.1, 1.8), iron, 1);
    S.add(SD.cap(76, 50, 78, 60, 2.1, 1.8), iron, 1);
    S.add(SD.box(5, 58, 21, 71, 3), iron, 3);
    S.add(SD.box(67, 58, 83, 71, 3), iron, 3);
    S.add(SD.box(34, 8, 54, 26, 5), iron, 4);
    S.add(SD.box(37, 15, 51, 22, 2), ironD, 1);
    S.emFill(SD.box(39, 17, 49, 20, 2), '#ffd27a');
    S.add(SD.cap(38, 8, 38, 2, 1.3, 1.3), brassD, 0.8);
    S.add(SD.cap(50, 8, 50, 2, 1.3, 1.3), brassD, 0.8);
    S.speck(ironD, 17, 0.1, iron);
    return S;
  };

  BUILD.gladius_champion = (t) => {
    const W = 80, H = 96, S = new Spr(W, H);
    const steel = S.M('#a8b1bf'), steelD = S.M('#5f6878'), gold = S.M('#e2b84f'), red = S.M('#a8283a'), redD = S.M('#6e1624'), ink = S.M('#150f1d');
    const wood = S.M('#6b4a2e'), axe = S.M('#c9d1dc'), leather = S.M('#4a3024');
    const s = t ? 1 : -1;
    S.add(SD.poly([[24, 30], [56, 30], [62, 84], [40, 94], [18, 84]]), redD, 3);
    S.add(SD.cap(28, 64, 26 + s, 88, 6, 5), steelD, 3);
    S.add(SD.cap(52, 64, 54 - s, 88, 6, 5), steelD, 3);
    S.add(SD.box(20, 86, 34, 94, 2), steel, 2);
    S.add(SD.box(46, 86, 60, 94, 2), steel, 2);
    S.add(SD.poly([[24, 56], [56, 56], [60, 68], [20, 68]]), leather, 2);
    S.add(SD.U(SD.ell(40, 44, 18, 16), SD.box(26, 30, 54, 58, 6)), steel, 6);
    S.add(SD.ring(SD.ell(40, 44, 18, 16), 0.9), gold, 0.6);
    S.add(SD.circ(40, 46, 5), red, 2);
    S.add(SD.cap(40, 36, 40, 56, 0.8, 0.8), steelD, 0.5);
    S.add(SD.ell(18, 32, 10, 8), steel, 4);
    S.add(SD.ring(SD.ell(18, 32, 10, 8), 0.9), gold, 0.6);
    S.add(SD.ell(62, 32, 10, 8), steel, 4);
    S.add(SD.ring(SD.ell(62, 32, 10, 8), 0.9), gold, 0.6);
    S.add(SD.cap(18, 38, 12, 62, 6, 5), steel, 4);
    S.add(SD.circ(11, 64, 4.5), steelD, 2);
    S.add(SD.cap(62, 38, 66, 60, 5.5, 4.5), steel, 3);
    S.add(SD.circ(66, 62, 4.5), steelD, 2);
    S.add(SD.cap(66, 62, 74, 8, 1.6, 1.2), wood, 1.2);
    S.add(SD.poly([[70, 4], [79, 2], [78, 18], [72, 22], [70, 12]]), axe, 1);
    S.emFill(SD.box(77, 4, 80, 18, 0), '#ff9a4a');
    S.add(SD.box(27, 12, 53, 38, 6), steel, 4);
    S.add(SD.ring(SD.box(27, 12, 53, 38, 6), 0.8), gold, 0.5);
    S.add(SD.box(31, 24, 49, 28, 1.5), ink, 0.5);
    S.emFill(SD.box(33, 25, 47, 27, 0), '#ff5a3a');
    S.add(SD.poly([[36, 12], [44, 12], [46, 2], [40, 4], [37, 0]]), red, 1);
    S.speck(steelD, 21, 0.08, steel);
    return S;
  };

  BUILD.briar_matron = (t) => {
    const W = 92, H = 94, S = new Spr(W, H);
    const bark = S.M('#5e3e28'), barkD = S.M('#3a2416'), leaf = S.M('#3f8a3a'), leafD = S.M('#24582a'), leafL = S.M('#66b04a');
    const thorn = S.M('#e8dcb0'), ink = S.M('#14100c'), s = t ? 1 : -1;
    S.add(SD.cap(46, 84, 22, 92, 4, 2), barkD, 2);
    S.add(SD.cap(46, 84, 70, 92, 4, 2), barkD, 2);
    S.add(SD.cap(46, 84, 34, 93, 3, 2), barkD, 2);
    S.add(SD.cap(46, 84, 60, 93, 3, 2), barkD, 2);
    S.add(SD.cap(46, 52, 46, 88, 16, 12), bark, 6);
    S.stripes(SD.cap(46, 52, 46, 88, 16, 12), barkD, 5, s < 0 ? 0 : 2);
    S.add(SD.cap(32, 58, 8, 44 + s, 5, 4), bark, 3);
    S.add(SD.cap(60, 58, 84, 44 - s, 5, 4), bark, 3);
    S.add(SD.circ(8, 44 + s, 5), leafD, 2);
    S.add(SD.circ(84, 44 - s, 5), leafD, 2);
    S.add(SD.U(SD.circ(46, 28, 26), SD.circ(24, 38, 15), SD.circ(68, 38, 15), SD.circ(34, 16, 14), SD.circ(60, 16, 14)), leaf, 8);
    S.add(SD.ell(46, 44, 30, 7), leafD, 4);
    S.speck(leafL, 4, 0.12, leaf);
    for (let i = 0; i < 16; i++) {
      const a = i / 16 * Math.PI * 2, rr = 26 + (i % 3) * 3;
      const x = 46 + Math.cos(a) * rr, y = 30 + Math.sin(a) * rr * 0.85;
      S.add(SD.poly([[x, y], [x + 1.6 * Math.cos(a) - 0.8, y - 2.4], [x + 2.4, y + 0.4]]), thorn, 0.4);
    }
    S.add(SD.ell(40, 64, 4.4, 4.8), barkD, 1.5);
    S.add(SD.ell(52, 64, 4.4, 4.8), barkD, 1.5);
    S.emFill(SD.circ(40, 64, 3), '#ffb347');
    S.emFill(SD.circ(52, 64, 3), '#ffb347');
    S.px(40, 64, ink, 0); S.px(52, 64, ink, 0); S.px(40, 65, ink, 0); S.px(52, 65, ink, 0);
    S.add(SD.box(38, 73, 54, 78, 2), ink, 1);
    for (let x = 40; x <= 52; x += 4) S.add(SD.poly([[x, 73], [x + 2, 78], [x + 4, 73]]), thorn, 0.3);
    for (const [x, y] of [[30, 50], [62, 52], [46, 14], [30, 14], [62, 14], [20, 40], [72, 40]]) S.emp(x, y, '#ff7aa8');
    S.add(SD.cap(30, 40, 24, 80 + s, 1.2, 0.8), leafD, 0.6);
    S.add(SD.cap(64, 40, 70, 82 - s, 1.2, 0.8), leafD, 0.6);
    return S;
  };

  BUILD.hollow_choir = (t) => {
    const W = 88, H = 84, S = new Spr(W, H);
    const robe = S.M('#3a2f52'), robeL = S.M('#6e5a96'), hood = S.M('#2b2240'), gold = S.M('#e2c46a'), ink = S.M('#120c1a'), pale = S.M('#d9cff0');
    const rot = t ? 0.2 : 0, cx = 44, cy = 40, rx = 30, ry = 16;
    const figs = [];
    for (let k = 0; k < 5; k++) {
      const a = -Math.PI / 2 + k * 2 * Math.PI / 5 + rot;
      figs.push({ x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry });
    }
    figs.sort((p, q) => p.y - q.y);
    S.emFill(SD.ring(SD.ell(cx, cy, rx + 5, ry + 4), 0.6), '#c9a8ff');
    S.add(SD.ell(cx, cy, 9, 7), ink, 3);
    S.emFill(SD.ring(SD.ell(cx, cy, 9, 7), 0.7), '#9b7cff');
    for (const f of figs) {
      S.add(SD.poly([[f.x - 4.5, f.y - 4], [f.x + 4.5, f.y - 4], [f.x + 7, f.y + 12], [f.x - 7, f.y + 12]]), robe, 3);
      S.add(SD.circ(f.x - 4.5, f.y + 12, 2.2), robe, 1);
      S.add(SD.circ(f.x, f.y + 12.5, 2.2), robe, 1);
      S.add(SD.circ(f.x + 4.5, f.y + 12, 2.2), robe, 1);
      S.add(SD.cap(f.x - 4, f.y - 2, f.x - 2, f.y + 10, 0.8, 0.8), robeL, 0.5);
      S.add(SD.box(f.x - 4.5, f.y + 1, f.x + 4.5, f.y + 2.5, 0.5), gold, 0.5);
      S.add(SD.ell(f.x, f.y - 6, 4.6, 5), hood, 2.5);
      S.add(SD.ell(f.x, f.y - 5, 2.6, 2.8), ink, 0.6);
      S.emFill(SD.circ(f.x, f.y - 5, 1.5), '#ffe9a8');
      S.add(SD.circ(f.x - 6.2, f.y + 3, 1.6), pale, 0.8);
      S.add(SD.circ(f.x + 6.2, f.y + 3, 1.6), pale, 0.8);
    }
    S.cracks(91, 12, [4, 8], '#b77bff', (x, y) => y > 20 && y < 70);
    return S;
  };

  BUILD.inquisitor_hale = (t) => {
    const W = 56, H = 92, S = new Spr(W, H);
    const cx = 28, s = t ? 1.5 : -1.5;
    const coat = S.M('#f3f0e8'), coatD = S.M('#c9c3b4'), gold = S.M('#e2b64a'), dark = S.M('#2a2536'), steel = S.M('#d7dce6');
    const ink = S.M('#150f1d'), skin = S.M('#f0c39c'), lamp = S.M('#c69a3a'), chain = S.M('#d0a24a'), wood = S.M('#7a5636');
    S.add(SD.cap(cx - 6, 70, cx - 6 + s, 86, 4, 3.2), dark, 2);
    S.add(SD.cap(cx + 6, 70, cx + 6 - s, 86, 4, 3.2), dark, 2);
    S.add(SD.box(cx - 9, 84, cx - 2, 90, 1.5), ink, 1);
    S.add(SD.box(cx + 2, 84, cx + 9, 90, 1.5), ink, 1);
    S.add(SD.U(SD.poly([[cx - 12, 34], [cx + 12, 34], [cx + 14, 88], [cx - 14, 88]]), SD.ell(cx, 40, 12, 9)), coat, 6);
    S.add(SD.poly([[cx - 1, 44], [cx + 1, 44], [cx + 2, 88], [cx - 2, 88]]), coatD, 0.5);
    S.add(SD.cap(cx - 11, 44, cx - 12, 88, 0.6, 0.6), gold, 0.5);
    S.add(SD.cap(cx + 11, 44, cx + 12, 88, 0.6, 0.6), gold, 0.5);
    S.add(SD.cap(cx - 10, 36, cx + 8, 58, 1.5, 1.5), gold, 0.5);
    S.add(SD.cap(cx - 11, 38, cx - 18, 62, 4.6, 4), coat, 3);
    S.add(SD.cap(cx + 11, 38, cx + 17, 62, 4.6, 4), coat, 3);
    S.add(SD.circ(cx - 18, 64, 2.6), skin, 1);
    S.add(SD.circ(cx + 17, 64, 2.6), skin, 1);
    S.add(SD.cap(cx + 18, 64, cx + 20, 0, 1, 0.8), wood, 0.8);
    S.add(SD.poly([[cx + 20, -1], [cx + 17, 4], [cx + 23, 4]]), gold, 0.5);
    for (let i = 0; i < 12; i++) S.px(cx - 18 - i * 0.25, 66 + i * 1.0, chain, 3);
    S.add(SD.box(cx - 22, 76, cx - 14, 84, 1.5), lamp, 1.5);
    S.emFill(SD.box(cx - 20, 78, cx - 16, 82, 1), '#ffd27a');
    S.emp(cx - 18, 79, '#fff4c8');
    S.add(SD.box(cx - 3, 27, cx + 3, 33, 1), skin, 1);
    S.add(SD.ell(cx, 20, 7, 8), skin, 2);
    S.add(SD.box(cx - 7.5, 10, cx + 7.5, 27, 3.5), steel, 4);
    S.add(SD.ring(SD.box(cx - 7.5, 10, cx + 7.5, 27, 3.5), 0.7), gold, 0.5);
    S.add(SD.box(cx - 6, 18, cx + 6, 21, 1.2), ink, 0.5);
    S.emFill(SD.box(cx - 5, 19, cx + 5, 20, 0), '#ffb070');
    S.add(SD.poly([[cx - 3, 11], [cx + 3, 11], [cx + 1, 2], [cx - 1, 2]]), coat, 1);
    S.add(SD.ell(cx - 12, 38, 4.5, 3.5), gold, 1.5);
    S.add(SD.ell(cx + 12, 38, 4.5, 3.5), gold, 1.5);
    return S;
  };

  BUILD.hollow_elowen = (t) => {
    const W = 56, H = 92, S = new Spr(W, H, '#1d1433');
    const cx = 28, sw = t ? 1 : -1;
    const dress = S.M('#c8c2e6'), dressD = S.M('#8f88b8'), dressL = S.M('#ece8fb'), hair = S.M('#2b2452'), hairL = S.M('#4a3f80');
    const skin = S.M('#d9d3ee'), ink = S.M('#1f1838'), violet = S.M('#7a5ac0');
    S.add(SD.poly([[cx - 7, 12], [cx + 7, 12], [cx + 10, 40], [cx + 8, 64 + sw], [cx + 3, 58], [cx, 70 + sw], [cx - 4, 58], [cx - 9, 66 - sw], [cx - 11, 36]]), hair, 2.5);
    S.add(SD.poly([[cx - 6, 24], [cx + 6, 24], [cx + 9, 46], [cx + 14, 90], [cx - 14, 90], [cx - 9, 46]]), dress, 5);
    for (const xo of [-12, -6, 0, 6, 12]) S.add(SD.cap(cx + xo, 88, cx + xo + sw * 0.8, 92, 1.3, 0.6), dressD, 0.5);
    S.add(SD.cap(cx - 4, 40, cx - 7, 88, 0.8, 0.8), dressD, 0.6);
    S.add(SD.cap(cx + 4, 40, cx + 8, 88, 0.8, 0.8), dressD, 0.6);
    S.add(SD.poly([[cx - 5, 22], [cx + 5, 22], [cx + 4.5, 34], [cx - 4.5, 34]]), dressL, 1.5);
    S.cracks(88, 10, [4, 9], '#b77bff', (x, y) => y > 30);
    S.add(SD.cap(cx - 6, 26, cx - 14, 48 + sw, 2, 1.6), dressL, 1.2);
    S.add(SD.cap(cx + 6, 26, cx + 14, 46 - sw, 2, 1.6), dressL, 1.2);
    S.add(SD.circ(cx - 14, 49 + sw, 2.2), skin, 1);
    S.add(SD.circ(cx + 14, 47 - sw, 2.2), skin, 1);
    S.add(SD.ell(cx, 14, 5.2, 6), skin, 3);
    for (let x = cx - 2; x <= cx + 2; x++) S.px(x, 14, ink, 0);
    S.add(SD.ell(cx, 9, 6, 4), hair, 1.5);
    S.add(SD.ell(cx - 1, 8, 3, 2), hairL, 1);
    S.add(SD.circ(cx, 36, 3.8), violet, 1);
    S.add(SD.ring(SD.circ(cx, 36, 3.8), 0.6), hairL, 0.5);
    S.emFill(SD.circ(cx, 36, 2.6), '#ffb050');
    S.emFill(SD.circ(cx, 35.5, 1.2), '#fff1c0');
    return S;
  };

  BUILD.warden_vael = (t) => {
    const W = 56, H = 92, S = new Spr(W, H);
    const cx = 28, ph = (t || 0) * Math.PI / 6;
    const silk = S.M('#c9d3e6'), silkD = S.M('#8d99b2'), collar = S.M('#2c3345'), gold = S.M('#e8c25c');
    const skin = S.M('#efd5bd'), hair = S.M('#d9d6e8'), ink = S.M('#141827'), lampM = S.M('#9aa4b8'), glove = S.M('#262c3f');
    const lamps = [0, 1, 2].map((i) => {
      const a = ph + i * 2 * Math.PI / 3;
      return { x: cx + Math.cos(a) * 24, y: 40 + Math.sin(a) * 10, d: Math.sin(a) };
    });
    const lampDraw = (l) => {
      S.add(SD.box(l.x - 2.2, l.y - 2.5, l.x + 2.2, l.y + 2.5, 1), lampM, 1);
      S.emFill(SD.box(l.x - 1.2, l.y - 1.2, l.x + 1.2, l.y + 1.2, 0), '#ffd27a');
    };
    lamps.filter((l) => l.d < 0).forEach(lampDraw);
    S.add(SD.U(SD.poly([[cx - 11, 30], [cx + 11, 30], [cx + 13, 80], [cx + 4, 88], [cx - 4, 80], [cx - 13, 88], [cx - 14, 70]]), SD.ell(cx, 36, 12, 9)), silk, 5);
    S.add(SD.poly([[cx - 6, 26], [cx + 6, 26], [cx + 4, 36], [cx - 4, 36]]), collar, 1.5);
    S.add(SD.poly([[cx - 1, 36], [cx + 1, 36], [cx + 1, 62], [cx - 1, 62]]), silkD, 0.5);
    S.add(SD.circ(cx, 44, 3), gold, 1.2);
    S.emFill(SD.circ(cx, 44, 2), '#ffe08a');
    S.add(SD.circ(cx - 9, 56, 2.2), glove, 1);
    S.add(SD.circ(cx + 9, 56, 2.2), glove, 1);
    S.add(SD.ell(cx, 20, 6.2, 7.2), skin, 3.5);
    S.add(SD.ell(cx, 12, 6.8, 4.5), hair, 2);
    S.add(SD.poly([[cx - 7, 14], [cx - 6, 22], [cx - 4, 16]]), hair, 0.5);
    S.add(SD.poly([[cx + 7, 14], [cx + 6, 22], [cx + 4, 16]]), hair, 0.5);
    S.px(cx - 2.5, 20, ink, 0); S.px(cx + 2.5, 20, ink, 0);
    S.px(cx - 1, 25, ink, 0); S.px(cx, 25, ink, 0);
    lamps.filter((l) => l.d >= 0).forEach(lampDraw);
    return S;
  };

  BUILD.vael_cold_engine = (t) => {
    const W = 96, H = 96, S = new Spr(W, H);
    const iron = S.M('#434a5a'), ironD = S.M('#262b38'), ironL = S.M('#6a7388'), brassD = S.M('#6b4f2a'), ink = S.M('#07040d');
    const rot = t ? 1 : 0;
    S.add(SD.box(10, 84, 86, 95, 4), ironD, 3);
    for (let x = 16; x <= 80; x += 8) S.px(x, 90, ironL, 3);
    S.add(SD.cap(30, 70, 24, 86, 3, 3), iron, 2);
    S.add(SD.cap(66, 70, 72, 86, 3, 3), iron, 2);
    S.add(SD.box(26, 60, 70, 84, 5), iron, 4);
    S.add(SD.box(28, 28, 68, 62, 6), ironD, 4);
    for (const x of [34, 48, 62]) S.add(SD.poly([[x - 2, 28], [x, 19], [x + 2, 28]]), ironL, 0.5);
    S.add(SD.box(14, 58, 26, 72, 3), iron, 3);
    S.add(SD.box(70, 58, 82, 72, 3), iron, 3);
    S.add(SD.circ(48, 44, 14), ink, 2);
    S.emFill(SD.ring(SD.circ(48, 44, 14), 1.1), '#9d6bff');
    S.emFill(SD.ring(SD.circ(48, 44, 19), 0.6), '#7fe8ff');
    for (let k = 0; k < 8; k++) {
      const a = k * Math.PI / 4 + rot * 0.2;
      for (let r = 21; r <= 29; r++) S.emp(48 + Math.cos(a) * r, 44 + Math.sin(a) * r, '#bff3ff');
    }
    S.cracks(94, 8, [4, 8], '#9fe9ff', (x, y) => y > 30 && y < 60);
    S.add(SD.cap(12, 30, 12, 82, 1.5, 1.5), brassD, 1);
    S.add(SD.cap(84, 30, 84, 82, 1.5, 1.5), brassD, 1);
    S.add(SD.box(40, 8, 56, 28, 3), ironD, 3);
    S.emFill(SD.box(44, 10, 52, 12, 0), '#9fe9ff');
    return S;
  };

  /* ======================================================================
   * 3. Enemy cache + public API
   * ====================================================================== */
  const LIFT = { forest_bat: 14, pale_moth: 16, void_moth: 16, hollow_wisp: 10, steam_sprite: 10, ash_wraith: 8,
    hollow_choir: 16, hollow_elowen: 12, warden_vael: 14, cold_drone: 14 };
  const cache = {};
  function fallbackBuild(key) {
    return (t) => {
      const S = new Spr(36, 32);
      let hsh = G.util.hash(String(key || '?')) >>> 0;
      const c = [60 + (hsh & 127), 60 + ((hsh >> 7) & 127), 60 + ((hsh >> 14) & 127)];
      const m = S.M(c);
      S.add(SD.ell(18, 18, 13, 10), m, 4);
      S.px(14, 16, S.M('#120c1a'), 0); S.px(21, 16, S.M('#120c1a'), 0);
      return S;
    };
  }
  function variants(key) {
    if (cache[key]) return cache[key];
    const build = BUILD[key] || fallbackBuild(key);
    const n = key === 'warden_vael' ? 4 : 2;
    const list = [];
    for (let t = 0; t < n; t++) {
      try { list.push(build(t).render(2)); }
      catch (e) { console.warn('[gfx_battle] enemy build failed:', key, e); list.push(fallbackBuild(key)(0).render(2)); }
    }
    list[0].__frames = list;
    cache[key] = list;
    return list;
  }
  let WORK = null;
  const work = () => WORK || (WORK = G.util.canvas(256, 256));

  Object.assign(G.gfx, {
    // cached canvas for an enemy (2x pixel art). .__frames = animation variants, .__glow = bloom layer
    enemy(key) { return variants(key)[0]; },
    // draw enemy with bottom-centre anchor at (x,y)
    drawEnemy(ctx, key, x, y, frame, opts) {
      opts = opts || {};
      frame = frame | 0;
      const vs = variants(key);
      const v = vs[Math.floor(frame / 14) % vs.length];
      const sc = opts.scale || 1, alpha = opts.alpha == null ? 1 : opts.alpha;
      const w = v.width, h0 = v.height;
      const lift = (LIFT[key] || 0);
      const br = Math.sin(frame * 0.085 + key.length * 0.7);
      const sq = lift ? 0 : Math.round(br * 2);
      const bob = lift ? Math.round(Math.sin(frame * 0.07) * 2) : 0;
      const shx = opts.shake ? Math.round((Math.random() - 0.5) * 2 * opts.shake) : 0;
      const shy = opts.shake ? Math.round((Math.random() - 0.5) * opts.shake) : 0;
      const dw = Math.round(w * sc), dh = Math.round((h0 + sq) * sc);
      const ox = Math.round(x - dw / 2) + shx, oy = Math.round(y - dh - lift * sc + bob) + shy;
      ctx.save();
      if (!opts.noShadow) {
        ctx.globalAlpha = alpha * (lift ? 0.22 : 0.34);
        ctx.fillStyle = '#120a1c';
        ctx.beginPath();
        ctx.ellipse(Math.round(x), Math.round(y), Math.max(4, Math.round(dw * 0.36)), Math.max(2, Math.round(dw * 0.07)), 0, 0, Math.PI * 2);
        ctx.fill();
      }
      let src = v;
      if ((opts.flash > 0) || opts.tint) {
        const wk = work(), wc = wk.getContext('2d');
        wc.setTransform(1, 0, 0, 1, 0, 0);
        wc.globalCompositeOperation = 'source-over'; wc.globalAlpha = 1;
        wc.clearRect(0, 0, wk.width, wk.height);
        wc.drawImage(v, 0, 0);
        wc.globalCompositeOperation = 'source-atop';
        if (opts.tint) { wc.globalAlpha = opts.tintAlpha == null ? 0.5 : opts.tintAlpha; wc.fillStyle = opts.tint; wc.fillRect(0, 0, w, h0); }
        if (opts.flash > 0) { wc.globalAlpha = Math.min(1, opts.flash); wc.fillStyle = '#ffffff'; wc.fillRect(0, 0, w, h0); }
        wc.globalAlpha = 1; wc.globalCompositeOperation = 'source-over';
        src = wk;
      }
      ctx.imageSmoothingEnabled = false;
      ctx.globalAlpha = alpha;
      if (opts.flipX) {
        ctx.save(); ctx.translate(ox + dw, oy); ctx.scale(-1, 1);
        ctx.drawImage(src, 0, 0, w, h0, 0, 0, dw, dh);
        ctx.restore();
      } else {
        ctx.drawImage(src, 0, 0, w, h0, ox, oy, dw, dh);
      }
      if (v.__glow) {
        const pulse = 0.65 + 0.35 * Math.sin(frame * 0.12 + 1.3);
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = alpha * pulse * (opts.glow == null ? 0.9 : opts.glow);
        ctx.drawImage(v.__glow, 0, 0, w, h0, ox, oy, dw, dh);
        ctx.globalCompositeOperation = 'source-over';
      }
      ctx.restore();
    },
  });

  /* ======================================================================
   * 4. Battle backgrounds: 640x480 layered painterly scenes (cached per key)
   *    sky -> sun/glow -> far silhouettes (blurred) -> fog -> mid layer -> ground
   *    plane with perspective detail -> calm bottom 140px -> stipple + vignette
   * ====================================================================== */
  const BG_CACHE = {};
  const bgRnd = (R, a, b) => a + (b - a) * R();
  const W640 = 640, H480 = 480;
  const sihouetteFns = {
    // draws ONE silhouette standing on base (or hanging from y=0 when flip)
    round(c, x, base, w, h) {
      c.fillRect(x - Math.max(1, w * 0.06), base - h * 0.45, Math.max(2, w * 0.12), h * 0.45 + 4);
      c.beginPath(); c.ellipse(x, base - h * 0.66, w * 0.5, h * 0.36, 0, 0, Math.PI * 2); c.fill();
    },
    conifer(c, x, base, w, h) {
      for (let k = 0; k < 3; k++) {
        const yb = base - h * 0.3 * k, wd = w * (1 - k * 0.22);
        c.beginPath(); c.moveTo(x - wd / 2, yb); c.lineTo(x + wd / 2, yb); c.lineTo(x, yb - h * 0.42); c.closePath(); c.fill();
      }
      c.fillRect(x - 1.5, base - 3, 3, 5);
    },
    block(c, x, base, w, h, lit, R) {
      c.fillRect(x - w / 2, base - h * 0.8, w, h * 0.8);
      c.beginPath(); c.moveTo(x - w / 2 - 3, base - h * 0.8); c.lineTo(x + w / 2 + 3, base - h * 0.8); c.lineTo(x, base - h); c.closePath(); c.fill();
      if (lit) for (let yy = base - h * 0.72; yy < base - 6; yy += 9) for (let xx = x - w / 2 + 4; xx < x + w / 2 - 3; xx += 7) {
        if (R() < 0.3) { c.fillStyle = lit; c.fillRect(xx, yy, 2.5, 3.5); c.fillStyle = sihouetteFns._col; }
      }
    },
    spire(c, x, base, w, h, lit, R) {
      c.fillRect(x - w * 0.3, base - h * 0.85, w * 0.6, h * 0.85);
      c.beginPath(); c.moveTo(x - w * 0.36, base - h * 0.85); c.lineTo(x + w * 0.36, base - h * 0.85); c.lineTo(x, base - h); c.closePath(); c.fill();
      if (lit) { c.fillStyle = lit; c.fillRect(x - 1, base - h * 0.5, 2, 5); c.fillRect(x - 1, base - h * 0.3, 2, 5); }
    },
    arch(c, x, base, w, h) {
      c.fillRect(x - w / 2, base - h, w, h);
      c.fillStyle = 'rgba(0,0,0,0.3)';
      for (let k = 0; k < 2; k++) { const ax = x - w / 2 + w * (0.22 + k * 0.5); c.beginPath(); c.ellipse(ax, base - h * 0.35, w * 0.14, h * 0.26, 0, Math.PI, 0); c.lineTo(ax + w * 0.14, base); c.lineTo(ax - w * 0.14, base); c.fill(); }
      c.fillStyle = sihouetteFns._col;
    },
    stalag(c, x, base, w, h, flip) {
      c.beginPath();
      if (flip) { c.moveTo(x - w / 2, 0); c.lineTo(x + w / 2, 0); c.lineTo(x, h); }
      else { c.moveTo(x - w / 2, base); c.lineTo(x + w / 2, base); c.lineTo(x, base - h); }
      c.closePath(); c.fill();
    },
    column(c, x, base, w, h) {
      c.fillRect(x - w * 0.25, base - h, w * 0.5, h);
      c.fillRect(x - w * 0.42, base - h - 3, w * 0.84, 4);
      c.fillRect(x - w * 0.42, base - 4, w * 0.84, 4);
    },
    broken(c, x, base, w, h) {
      c.beginPath(); c.moveTo(x - w / 2, base); c.lineTo(x - w / 2, base - h * 0.8); c.lineTo(x - w * 0.1, base - h * 0.95);
      c.lineTo(x + w * 0.05, base - h * 0.7); c.lineTo(x + w / 2, base - h); c.lineTo(x + w / 2, base); c.closePath(); c.fill();
    },
    dune(c, x, base, w, h) { c.beginPath(); c.ellipse(x, base, w * 0.6, h * 0.5, 0, Math.PI, 0); c.fill(); },
    shard(c, x, base, w, h, R) {
      c.beginPath(); c.moveTo(x - w * 0.5, base + h * 0.2); c.lineTo(x - w * 0.1, base - h * 0.5); c.lineTo(x + w * 0.5, base - h * 0.1); c.lineTo(x + w * 0.2, base + h * 0.4); c.closePath(); c.fill();
    },
    gear(c, x, base, w, h) {
      c.beginPath(); c.arc(x, base - h * 0.5, w * 0.5, 0, Math.PI * 2); c.fill();
      for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; c.fillRect(x + Math.cos(a) * w * 0.4 - 2, base - h * 0.5 + Math.sin(a) * w * 0.4 - 2, 4, 4); }
    },
    pipe(c, x, base, w, h) { c.fillRect(x - w / 2, base - h, w, h); },
  };

  // one layer of silhouettes. o: {shape,n,hmin,hmax,wmin,wmax,col,lit,base,blur,flip,ridge,amp}
  // far layers are rasterised at 1/4 size and upscaled smoothly: a cheap painterly blur
  function bgLayer(c, R, o) {
    if (o.blur) {
      const L = G.util.canvas(160, 120), lc = L.getContext('2d');
      lc.imageSmoothingEnabled = true;
      lc.scale(0.25, 0.25);
      bgLayerDraw(lc, R, o);
      c.save(); c.imageSmoothingEnabled = true; c.drawImage(L, 0, 0, W640, H480); c.restore();
    } else {
      bgLayerDraw(c, R, o);
    }
  }
  function bgLayerDraw(c, R, o) {
    c.save();
    sihouetteFns._col = o.col;
    c.fillStyle = o.col;
    if (o.ridge) {
      const pts = [];
      let v = 0;
      for (let x = 0; x <= W640 + 16; x += 16) {
        v = v * 0.5 + bgRnd(R, -1, 1) * 0.5;
        pts.push([x, o.base - o.amp * (0.5 + 0.5 * Math.sin(x * 0.011 + o.ridge) + v * 0.6)]);
      }
      c.beginPath(); c.moveTo(0, H480);
      pts.forEach((p) => c.lineTo(p[0], p[1]));
      c.lineTo(W640, H480); c.closePath(); c.fill();
    }
    const fn = sihouetteFns[o.shape] || sihouetteFns.block;
    for (let i = 0; i < (o.n || 0); i++) {
      const x = bgRnd(R, -10, W640 + 10), w = bgRnd(R, o.wmin, o.wmax), h = bgRnd(R, o.hmin, o.hmax);
      c.fillStyle = o.col;
      if (o.shape === 'block' || o.shape === 'spire') fn(c, x, o.base, w, h, o.lit, R);
      else if (o.shape === 'stalag') fn(c, x, o.base, w, h, o.flip);
      else if (o.shape === 'shard') fn(c, x, o.base - bgRnd(R, 0, 120), w, h, R);
      else fn(c, x, o.base, w, h, R);
    }
    c.restore();
  }

  // perspective ground detail; vp = vanishing point
  function bgGround(c, R, hz, det, col) {
    const vx = W640 / 2, vy = hz - 40;
    const rowY = (i, n) => hz + (H480 - hz) * Math.pow(i / n, 1.7);
    c.save();
    switch (det) {
      case 'grass':
        for (let i = 0; i < 2600; i++) {
          const y = hz + (H480 - hz) * Math.pow(R(), 0.7), x = R() * W640, s = 1 + (y - hz) / 60;
          c.strokeStyle = R() < 0.5 ? col[0] : col[1]; c.globalAlpha = 0.55;
          c.beginPath(); c.moveTo(x, y); c.lineTo(x + (R() - 0.5) * 3 * s, y - (3 + R() * 4) * s); c.stroke();
        }
        break;
      case 'cobble': case 'grate': case 'stone': case 'flags': case 'tile': {
        c.strokeStyle = det === 'grate' ? '#0d1418' : '#2a2320'; c.lineWidth = 1; c.globalAlpha = det === 'grate' ? 0.6 : 0.35;
        for (let i = 1; i <= 10; i++) { const y = rowY(i, 10); c.beginPath(); c.moveTo(0, y); c.lineTo(W640, y); c.stroke(); }
        for (let k = -8; k <= 8; k++) { c.beginPath(); c.moveTo(vx + k * 22, vy); c.lineTo(vx + k * 150, H480); c.stroke(); }
        c.globalAlpha = 0.25;
        for (let i = 0; i < 260; i++) { c.fillStyle = R() < 0.5 ? col[0] : '#ffffff'; const y = hz + (H480 - hz) * Math.pow(R(), 0.8); c.fillRect(R() * W640, y, 2 + R() * 6, 1); }
        if (det === 'grate') { c.globalAlpha = 0.9; c.fillStyle = '#c99a4a'; for (let i = 1; i <= 10; i++) for (let k = -6; k <= 6; k++) { const y = rowY(i, 10); c.fillRect(vx + k * 22 * (1 + i * 0.04) - 1, y - 1, 2, 2); } }
        break;
      }
      case 'sand':
        for (let i = 0; i < 60; i++) {
          const y = hz + (H480 - hz) * Math.pow(i / 60, 1.2);
          c.strokeStyle = i % 2 ? '#f6d08a' : '#8c5c2c'; c.globalAlpha = 0.18;
          c.beginPath(); for (let x = 0; x <= W640; x += 12) c.lineTo(x, y + Math.sin(x * 0.05 + i) * 1.4); c.stroke();
        }
        break;
      case 'marble':
        for (let i = 0; i < 26; i++) {
          c.strokeStyle = i % 3 ? '#ffffff' : '#b59a58'; c.globalAlpha = 0.22; c.lineWidth = 1 + R() * 1.5;
          let x = R() * W640, y = hz + R() * (H480 - hz); c.beginPath(); c.moveTo(x, y);
          for (let s = 0; s < 8; s++) { x += (R() - 0.4) * 60; y += (R() - 0.5) * 22; c.lineTo(x, y); }
          c.stroke();
        }
        c.lineWidth = 1;
        break;
      case 'planks':
        c.strokeStyle = '#2a170c'; c.lineWidth = 1.2; c.globalAlpha = 0.5;
        for (let k = -10; k <= 10; k++) { c.beginPath(); c.moveTo(vx + k * 40, vy); c.lineTo(vx + k * 240, H480); c.stroke(); }
        for (let i = 1; i <= 12; i++) { const y = rowY(i, 12); c.beginPath(); c.moveTo(0, y); c.lineTo(W640, y); c.stroke(); }
        break;
      case 'ash':
        for (let i = 0; i < 1400; i++) { c.fillStyle = R() < 0.6 ? '#2c2624' : '#c9bdb4'; c.globalAlpha = 0.3; c.fillRect(R() * W640, hz + R() * (H480 - hz), 1 + R() * 2, 1); }
        break;
      case 'hollow':
        c.strokeStyle = '#a563ff'; c.lineWidth = 1.2;
        for (let i = 0; i < 24; i++) {
          let x = R() * W640, y = hz + R() * (H480 - hz), a = R() * 6.28; c.globalAlpha = 0.5; c.beginPath(); c.moveTo(x, y);
          for (let s = 0; s < 7; s++) { a += (R() - 0.5) * 1.2; x += Math.cos(a) * 14; y += Math.sin(a) * 6; c.lineTo(x, y); }
          c.stroke();
        }
        c.lineWidth = 1;
        break;
      case 'moss':
        for (let i = 0; i < 1800; i++) { c.fillStyle = R() < 0.5 ? col[0] : col[1]; c.globalAlpha = 0.45; const y = hz + (H480 - hz) * Math.pow(R(), 0.7); c.fillRect(R() * W640, y, 2 + R() * 3, 2); }
        break;
    }
    c.restore();
  }

  // painterly soft shapes: clouds, steam, glows
  // soft blobs (clouds, steam): radial falloff, no filters
  function bgSoft(c, R, col, n, rx, ry, yMin, yMax, a) {
    c.save();
    for (let i = 0; i < n; i++) {
      const x = R() * W640, y = bgRnd(R, yMin, yMax), sx = rx * (0.6 + R()), sy = ry * (0.6 + R() * 0.6);
      c.save(); c.translate(x, y); c.scale(sx, sy);
      const g = c.createRadialGradient(0, 0, 0, 0, 0, 1);
      g.addColorStop(0, col); g.addColorStop(1, 'rgba(255,255,255,0)');
      c.globalAlpha = a * (0.5 + R() * 0.5); c.fillStyle = g;
      c.fillRect(-1, -1, 2, 2);
      c.restore();
    }
    c.restore();
  }

  function bgGlowAt(c, x, y, r, col, a) {
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = a; c.fillStyle = g;
    c.fillRect(x - r, y - r, r * 2, r * 2); c.restore();
  }

  const BG_DEF = {
    forest: { sky: ['#1f4d52', '#5f9f8a', '#f2dc92'], sun: [520, 96, 150, '#fff0b0'], hz: 296, far: [
        { shape: 'round', n: 26, hmin: 90, hmax: 150, wmin: 40, wmax: 70, col: '#3f6f58', base: 300, blur: 2.2 }],
      mid: [{ shape: 'round', n: 9, hmin: 170, hmax: 230, wmin: 70, wmax: 110, col: '#2c5a3a', base: 306 }],
      ground: { det: 'grass', col: ['#2f6a32', '#8ac25a'], top: '#6aa54a', bot: '#3c7032' }, pond: true, extra: 'shafts' },
    village: { sky: ['#b8603a', '#eba063', '#ffe2a6'], sun: [150, 112, 120, '#ffe9a8'], hz: 300, far: [
        { shape: 'spire', n: 6, hmin: 110, hmax: 180, wmin: 20, wmax: 26, col: '#7a4f5a', base: 302, lit: '#ffd27a', blur: 2 },
        { shape: 'block', n: 14, hmin: 50, hmax: 80, wmin: 40, wmax: 62, col: '#8e5b58', base: 304, lit: '#ffd27a', blur: 2 }],
      mid: [{ shape: 'block', n: 7, hmin: 80, hmax: 120, wmin: 74, wmax: 100, col: '#a8745a', base: 312, lit: '#ffb55a' }],
      ground: { det: 'cobble', col: ['#7a6a58', '#b59a7a'], top: '#a3917c', bot: '#6f5f4e' }, extra: 'clouds' },
    cave: { sky: ['#0f0a1c', '#2b1f3e', '#43315a'], hz: 296, far: [
        { shape: 'stalag', n: 14, hmin: 90, hmax: 170, wmin: 40, wmax: 80, col: '#2a1f38', base: 0, flip: true, blur: 2.5 }],
      mid: [{ shape: 'stalag', n: 10, hmin: 80, hmax: 150, wmin: 40, wmax: 70, col: '#3d2d4e', base: 316 }],
      ground: { det: 'hollow', col: ['#3c2f4f', '#7a5aa0'], top: '#3a2d4c', bot: '#1d1528' }, extra: 'crystals' },
    city: { sky: ['#4f4236', '#b8803f', '#f0c776'], sun: [420, 84, 120, '#ffd98a'], hz: 298, far: [
        { shape: 'block', n: 18, hmin: 70, hmax: 150, wmin: 26, wmax: 48, col: '#5b4a4f', base: 304, lit: '#ffb347', blur: 2.5 }],
      mid: [{ shape: 'block', n: 8, hmin: 90, hmax: 130, wmin: 60, wmax: 90, col: '#6e5548', base: 314, lit: '#ffd27a' }, { shape: 'pipe', n: 6, hmin: 150, hmax: 210, wmin: 6, wmax: 9, col: '#3f332e', base: 330 }],
      ground: { det: 'cobble', col: ['#66584c', '#a0886a'], top: '#7a6a5b', bot: '#4a3f3a' }, extra: 'puddles' },
    steam: { sky: ['#0d262e', '#2d5a62', '#5e8a86'], hz: 300, far: [
        { shape: 'arch', n: 7, hmin: 130, hmax: 180, wmin: 60, wmax: 80, col: '#22434b', base: 304, blur: 2 }],
      mid: [{ shape: 'pipe', n: 12, hmin: 180, hmax: 260, wmin: 7, wmax: 14, col: '#3a5a60', base: 330 }],
      ground: { det: 'grate', col: ['#3d4f56', '#1f2d33'], top: '#2c3d43', bot: '#14201f' }, extra: 'steam' },
    arena: { sky: ['#8c3b25', '#e47e46', '#ffd08a'], sun: [330, 88, 130, '#ffe0a0'], hz: 300, far: [
        { shape: 'arch', n: 9, hmin: 110, hmax: 150, wmin: 70, wmax: 90, col: '#8a5638', base: 304, blur: 2.2 }],
      mid: [{ shape: 'block', n: 5, hmin: 40, hmax: 60, wmin: 90, wmax: 130, col: '#5e3524', base: 312, lit: '#ffd27a' }],
      ground: { det: 'sand', col: ['#e7b874', '#9c6a34'], top: '#d8a85e', bot: '#a8733a' }, extra: 'clouds' },
    abbey: { sky: ['#a9cde8', '#e9f4ff', '#fff6dc'], sun: [250, 70, 150, '#fffbe0'], hz: 300, far: [
        { shape: 'spire', n: 8, hmin: 130, hmax: 210, wmin: 24, wmax: 36, col: '#9fb3c9', base: 306, lit: '#ffe9a8', blur: 2.2 }],
      mid: [{ shape: 'column', n: 8, hmin: 130, hmax: 170, wmin: 16, wmax: 22, col: '#e8e1d2', base: 316 }],
      ground: { det: 'marble', col: ['#ffffff', '#c7b48a'], top: '#eee5d0', bot: '#b8ad98' }, extra: 'beams' },
    crypt: { sky: ['#0c1424', '#22364a', '#4a6670'], hz: 300, far: [
        { shape: 'spire', n: 10, hmin: 120, hmax: 200, wmin: 18, wmax: 30, col: '#2a3a4c', base: 308, lit: '#ffb060', blur: 2.5 }],
      mid: [{ shape: 'stalag', n: 10, hmin: 20, hmax: 36, wmin: 24, wmax: 34, col: '#4d5d66', base: 316 }],
      ground: { det: 'flags', col: ['#2a3840', '#14202a'], top: '#2f3c44', bot: '#18222a' }, extra: 'candles' },
    witchwood: { sky: ['#0a1c2a', '#1c4850', '#3a7566'], hz: 300, far: [
        { shape: 'round', n: 22, hmin: 130, hmax: 210, wmin: 30, wmax: 50, col: '#1d3a40', base: 304, blur: 2.5 }],
      mid: [{ shape: 'conifer', n: 8, hmin: 110, hmax: 160, wmin: 40, wmax: 60, col: '#23423f', base: 314 }],
      ground: { det: 'moss', col: ['#1d4a3a', '#5aa27c'], top: '#2a5a48', bot: '#143026' }, extra: 'fireflies' },
    road: { sky: ['#43363a', '#a86a54', '#e7b58c'], sun: [160, 116, 80, '#ffd0a0'], hz: 300, far: [
        { shape: 'round', n: 9, hmin: 70, hmax: 110, wmin: 20, wmax: 30, col: '#5e504e', base: 306, blur: 2.2 }],
      mid: [{ shape: 'broken', n: 8, hmin: 110, hmax: 160, wmin: 20, wmax: 30, col: '#6e605b', base: 318 }],
      ground: { det: 'ash', col: ['#8a7f78', '#4a423f'], top: '#7b706b', bot: '#4a423f' }, extra: 'clouds' },
    spire: { sky: ['#241546', '#5e3a78', '#e6b05a'], hz: 300, far: [
        { shape: 'spire', n: 1, hmin: 260, hmax: 270, wmin: 60, wmax: 60, col: '#382a4e', base: 310, lit: '#ffd27a', blur: 1.5 },
        { shape: 'spire', n: 6, hmin: 100, hmax: 170, wmin: 16, wmax: 26, col: '#3e3056', base: 306, lit: '#ffd27a', blur: 2.5 }],
      mid: [{ shape: 'shard', n: 9, hmin: 40, hmax: 70, wmin: 30, wmax: 50, col: '#4b3c68', base: 230 }],
      ground: { det: 'stone', col: ['#5a4d6a', '#2b2438'], top: '#564a68', bot: '#2a2338' }, extra: 'runes' },
    chamber: { sky: ['#0a0920', '#1d1a4c', '#3c2e6e'], sun: [320, 150, 180, '#ffcf70'], hz: 300, far: [
        { shape: 'column', n: 12, hmin: 150, hmax: 190, wmin: 18, wmax: 24, col: '#2c2654', base: 306, blur: 2 }],
      mid: [{ shape: 'column', n: 0, hmin: 1, hmax: 2, wmin: 1, wmax: 2, col: '#2c2654', base: 320 }],
      ground: { det: 'tile', col: ['#2c2650', '#4a3f7a'], top: '#2a2456', bot: '#120f28' }, extra: 'reflect' },
    ship: { sky: ['#4f9fe0', '#a4d8f2', '#fff0cc'], sun: [520, 80, 110, '#fff8e0'], hz: 302, far: [
        { shape: 'dune', n: 6, hmin: 100, hmax: 160, wmin: 160, wmax: 260, col: '#e9f2fb', base: 330, blur: 3 }],
      mid: [{ shape: 'shard', n: 4, hmin: 60, hmax: 90, wmin: 60, wmax: 100, col: '#c4d2e4', base: 260 }],
      ground: { det: 'planks', col: ['#3a2215', '#1a0e08'], top: '#8b5a3a', bot: '#5a3a24' }, extra: 'clouds' },
    void: { sky: ['#040208', '#120820', '#2a0f3f'], hz: 300, far: [
        { shape: 'shard', n: 14, hmin: 40, hmax: 110, wmin: 20, wmax: 60, col: '#2a1b40', base: 180, blur: 1.5 }],
      mid: [{ shape: 'shard', n: 6, hmin: 30, hmax: 60, wmin: 20, wmax: 40, col: '#3b2357', base: 260 }],
      ground: { det: 'hollow', col: ['#22123a', '#8a5ad0'], top: '#1a0e28', bot: '#0a0512' }, extra: 'stars' },
  };

  function bgBuild(key) {
    const P = BG_DEF[key] || BG_DEF.forest;
    const R = G.util.rng(G.util.hash('battlebg:' + key));
    const cv = G.util.canvas(W640, H480), c = cv.getContext('2d');
    const hz = P.hz;
    // sky
    const sg = c.createLinearGradient(0, 0, 0, hz + 12);
    P.sky.forEach((col, i) => sg.addColorStop(i / (P.sky.length - 1), col));
    c.fillStyle = sg; c.fillRect(0, 0, W640, H480);
    if (P.extra === 'stars') { for (let i = 0; i < 140; i++) { c.fillStyle = R() < 0.2 ? '#cbb6ff' : '#ffffff'; c.globalAlpha = 0.2 + R() * 0.6; c.fillRect(R() * W640, R() * hz, R() < 0.1 ? 2 : 1, R() < 0.1 ? 2 : 1); } c.globalAlpha = 1; }
    if (P.sun) bgGlowAt(c, P.sun[0], P.sun[1], P.sun[2], P.sun[3], 0.9);
    if (P.extra === 'clouds') bgSoft(c, R, '#ffffff', 7, 90, 14, 40, 170, 0.25);
    if (P.extra === 'beams') { c.save(); c.globalCompositeOperation = 'lighter'; for (let i = 0; i < 5; i++) { c.fillStyle = 'rgba(255,250,220,0.07)'; const x = 100 + i * 110; c.beginPath(); c.moveTo(x, 0); c.lineTo(x + 40, 0); c.lineTo(x - 60, hz + 40); c.lineTo(x - 100, hz + 40); c.fill(); } c.restore(); }
    // far layers (painterly blur)
    const rr = (k) => G.util.rng(G.util.hash(key + k));
    P.far.forEach((o, i) => bgLayer(c, rr('far' + i), o));
    // fog band at horizon
    const fg = c.createLinearGradient(0, hz - 40, 0, hz + 20);
    fg.addColorStop(0, 'rgba(240,235,220,0)'); fg.addColorStop(0.7, 'rgba(240,235,220,0.28)'); fg.addColorStop(1, 'rgba(240,235,220,0)');
    c.fillStyle = fg; c.fillRect(0, hz - 40, W640, 60);
    if (P.extra === 'steam') bgSoft(c, rr('steam'), '#e6fbff', 16, 60, 22, 40, 250, 0.22);
    P.mid.forEach((o, i) => { if (o.n) bgLayer(c, rr('mid' + i), o); });
    if (P.extra === 'crystals') for (let i = 0; i < 26; i++) bgGlowAt(c, R() * W640, hz + 10 + R() * 120, 10 + R() * 14, 'rgba(120,200,255,0.9)', 0.35);
    // ground plane
    const gg = c.createLinearGradient(0, hz, 0, H480);
    gg.addColorStop(0, P.ground.top); gg.addColorStop(1, P.ground.bot);
    c.fillStyle = gg; c.fillRect(0, hz, W640, H480 - hz);
    if (P.pond) {
      c.save(); c.fillStyle = '#6fb8c8'; c.globalAlpha = 0.85; c.beginPath(); c.ellipse(300, hz + 4, 190, 14, 0, 0, Math.PI * 2); c.fill();
      c.globalAlpha = 0.35; c.fillStyle = '#e8fbff'; c.beginPath(); c.ellipse(260, hz + 1, 60, 3, 0, 0, Math.PI * 2); c.fill(); c.restore();
    }
    bgGround(c, rr('ground'), hz + 14, P.ground.det, P.ground.col);
    if (P.extra === 'puddles') for (let i = 0; i < 8; i++) { c.save(); c.globalAlpha = 0.35; c.fillStyle = '#ffd98a'; c.beginPath(); c.ellipse(R() * W640, hz + 40 + R() * 150, 18 + R() * 20, 4 + R() * 3, 0, 0, Math.PI * 2); c.fill(); c.restore(); }
    if (P.extra === 'reflect') for (let i = 0; i < 6; i++) bgGlowAt(c, 80 + i * 100, hz + 120 + (i % 2) * 40, 40, 'rgba(180,150,255,0.6)', 0.25);
    if (P.extra === 'runes') for (let i = 0; i < 16; i++) { c.save(); c.strokeStyle = '#c59bff'; c.globalAlpha = 0.45; const x = 40 + R() * 560, y = hz + 30 + R() * 110; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 6, y - 6); c.lineTo(x + 12, y); c.stroke(); c.restore(); }
    if (P.extra === 'candles') for (let i = 0; i < 9; i++) bgGlowAt(c, R() * W640, hz + 30 + R() * 100, 26, 'rgba(255,170,90,0.8)', 0.4);
    if (P.extra === 'fireflies') for (let i = 0; i < 34; i++) bgGlowAt(c, R() * W640, R() * 280 + 40, 6 + R() * 6, 'rgba(230,255,120,0.9)', 0.45);
    if (P.extra === 'shafts') { c.save(); c.globalCompositeOperation = 'lighter'; for (let i = 0; i < 4; i++) { c.fillStyle = 'rgba(255,240,180,0.06)'; const x = 120 + i * 130; c.beginPath(); c.moveTo(x, 0); c.lineTo(x + 50, 0); c.lineTo(x - 30, hz + 60); c.lineTo(x - 70, hz + 60); c.fill(); } c.restore(); }
    // painterly stipple (skip the calm bottom)
    for (let i = 0; i < 1400; i++) {
      const y = R() * (H480 - 150);
      c.globalAlpha = 0.05 + R() * 0.06; c.fillStyle = R() < 0.5 ? '#000000' : '#ffffff';
      c.fillRect(R() * W640, y, 1 + R() * 2, 1 + R() * 2);
    }
    c.globalAlpha = 1;
    // calmer bottom 140px: fade detail into a soft gradient
    const cg = c.createLinearGradient(0, H480 - 150, 0, H480);
    cg.addColorStop(0, 'rgba(10,8,20,0)'); cg.addColorStop(0.6, 'rgba(10,8,20,0.35)'); cg.addColorStop(1, 'rgba(10,8,20,0.55)');
    c.fillStyle = cg; c.fillRect(0, H480 - 150, W640, 150);
    // vignette
    const vg = c.createRadialGradient(W640 / 2, H480 * 0.45, 180, W640 / 2, H480 * 0.45, 420);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.42)');
    c.fillStyle = vg; c.fillRect(0, 0, W640, H480);
    return cv;
  }

  Object.assign(G.gfx, {
    // cached 640x480 painterly battle backdrop
    battleBg(key) {
      if (!BG_CACHE[key]) BG_CACHE[key] = bgBuild(key);
      return BG_CACHE[key];
    },
  });

  /* ======================================================================
   * 5. Party battlers: charSheet cell (row 1 = facing left, toward enemies) at 2x
   * ====================================================================== */
  const PH = {};
  function placeholderSheet(actor) {
    if (PH[actor]) return PH[actor];
    const c = G.util.canvas(32, 32), x = c.getContext('2d');
    const hue = G.util.hash(String(actor)) % 360;
    x.fillStyle = 'hsl(' + hue + ',55%,55%)'; x.fillRect(9, 3, 14, 13);
    x.fillStyle = '#ffd9b0'; x.fillRect(10, 5, 12, 9);
    x.fillStyle = 'hsl(' + ((hue + 180) % 360) + ',40%,35%)'; x.fillRect(7, 16, 18, 10);
    x.fillStyle = '#222'; x.fillRect(10, 26, 4, 5); x.fillRect(18, 26, 4, 5);
    PH[actor] = c; return c;
  }
  // a 32x32 cell for (col,row) of the actor's charSheet
  function battlerSource(actor, col, row) {
    let sh = null;
    try { sh = G.gfx.charSheet ? G.gfx.charSheet(actor) : null; } catch (e) { sh = null; }
    if (!sh || sh.width < 96) return { img: placeholderSheet(actor), sx: 0, sy: 0 };
    return { img: sh, sx: col * 32, sy: row * 32 };
  }
  const BW = G.util.canvas(64, 64);       // scratch: 2x battler cell
  const BWc = BW.getContext('2d');
  function drawBattlerCell(actor, col, row, tint, tintA, flash) {
    const s = battlerSource(actor, col, row);
    BWc.setTransform(1, 0, 0, 1, 0, 0);
    BWc.globalCompositeOperation = 'source-over'; BWc.globalAlpha = 1;
    BWc.clearRect(0, 0, 64, 64);
    BWc.imageSmoothingEnabled = false;
    BWc.drawImage(s.img, s.sx, s.sy, 32, 32, 0, 0, 64, 64);
    if (tint || flash) {
      BWc.globalCompositeOperation = 'source-atop';
      if (tint) { BWc.globalAlpha = tintA == null ? 0.5 : tintA; BWc.fillStyle = tint; BWc.fillRect(0, 0, 64, 64); }
      if (flash) { BWc.globalAlpha = flash; BWc.fillStyle = '#ffffff'; BWc.fillRect(0, 0, 64, 64); }
      BWc.globalCompositeOperation = 'source-over'; BWc.globalAlpha = 1;
    }
    return BW;
  }

  // pose transform for frame t (frames since the action started). Returns offsets, scale, rotation, etc.
  function poseOf(pose, t) {
    const p = { dx: 0, dy: 0, rot: 0, sx: 1, sy: 1, alpha: 1, col: 1, flash: 0, tint: null, glow: 0, shake: 0, row: 1, hop: 0 };
    const s = Math.sin(t * 0.08);
    switch (pose) {
      case 'attack': {
        const lunge = t < 10 ? t / 10 : t < 22 ? 1 - (t - 10) / 12 : 0;
        p.dx = Math.round(-10 * lunge); p.rot = -0.1 * lunge; p.dy = Math.round(-2 * lunge);
        break;
      }
      case 'cast':
        p.dy = Math.round(-2 + s); p.glow = 0.6 + 0.4 * Math.sin(t * 0.2);
        break;
      case 'hurt': {
        const k = Math.max(0, 1 - t / 18);
        p.shake = Math.round(3 * k * Math.sin(t * 2.4)); p.tint = '#ff3040'; p.flash = 0.45 * k;
        p.dx = p.shake;
        break;
      }
      case 'defend':
        p.sx = 1.06; p.sy = 0.94; p.dy = 2; p.glow = 0.4 + 0.2 * s;
        break;
      case 'dead':
        p.rot = -Math.PI / 2 + 0.05; p.dx = -12; p.dy = 0; p.alpha = 0.75; p.col = 0.3; p.tint = '#302030'; p.tintA = 0.4;
        break;
      case 'win': {
        const hop = Math.abs(Math.sin(t * 0.14));
        p.dy = -Math.round(hop * 12);
        break;
      }
      case 'weak':
        p.sy = 0.9; p.sx = 1.04; p.rot = 0.07; p.col = 0.5; p.dy = 3;
        break;
      default: // idle breathing
        p.dy = s > 0.6 ? -1 : 0; p.sy = 1 + 0.012 * s; p.sx = 1 - 0.006 * s;
    }
    return p;
  }

  function drawBattlerAt(ctx, actor, pose, x, y, frame, opts) {
    opts = opts || {};
    const p = poseOf(pose, frame | 0);
    const col = opts.row != null ? opts.row : 1;
    const tint = opts.tint || p.tint;
    const flash = Math.max(opts.flash || 0, p.flash || 0);
    const cell = drawBattlerCell(actor, opts.frame != null ? opts.frame : 1, col, tint, opts.tint ? 0.5 : (p.tintA || 0.5), flash);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = (opts.alpha == null ? 1 : opts.alpha) * p.alpha;
    const bx = Math.round(x + p.dx + (opts.dx || 0)), by = Math.round(y + p.dy + (opts.dy || 0));
    ctx.translate(bx, by);
    if (p.rot) ctx.rotate(p.rot);
    if (p.sx !== 1 || p.sy !== 1) ctx.scale(p.sx, p.sy);
    if (p.col < 1) { try { ctx.filter = 'saturate(' + p.col + ')'; } catch (e) { /* no filter */ } }
    if (opts.flipX) ctx.scale(-1, 1);
    ctx.drawImage(cell, -32, -64);
    try { ctx.filter = 'none'; } catch (e) { /* ignore */ }
    if (p.glow > 0) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      const gx = bx, gy = by - 40;
      const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, 46);
      g.addColorStop(0, 'rgba(255,230,150,' + (0.6 * p.glow) + ')'); g.addColorStop(1, 'rgba(255,230,150,0)');
      ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(gx - 46, gy - 46, 92, 92);
    }
    if (pose === 'defend') {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = 'rgba(140,210,255,' + (0.5 + 0.2 * Math.sin(frame * 0.2)) + ')'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(bx, by - 30, 26, 36, 0, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  }

  Object.assign(G.gfx, {
    // pose: idle attack cast hurt defend dead win weak. frame = frames since the action started.
    drawBattler(ctx, actor, pose, x, y, frame, opts) { drawBattlerAt(ctx, actor, pose || 'idle', x, y, frame | 0, opts || {}); },
    // cached 96x96 canvas of the pose at frame 0 (anchor at 48,92)
    battler(actor, pose) {
      const key = actor + ':' + (pose || 'idle');
      if (!BATTLER_CACHE[key]) {
        const c = G.util.canvas(96, 96), x = c.getContext('2d');
        drawBattlerAt(x, actor, pose || 'idle', 48, 92, 0, {});
        BATTLER_CACHE[key] = c;
      }
      return BATTLER_CACHE[key];
    },
  });
  const BATTLER_CACHE = {};

  /* ======================================================================
   * 6. Battle effects: animated by t in 0..1, additive glow, deterministic particles
   * ====================================================================== */
  const FX_FRAMES = { slash: 22, pierce: 20, blunt: 24, arrow: 28, fire: 34, ice: 32, lightning: 22, wind: 36, light: 40,
    dark: 36, heal: 38, buff: 32, debuff: 32, break: 40, hit: 20, steal: 30, bond: 44, poison: 40, revive: 44, shield: 36 };
  const PARTS = {};
  // deterministic particle table per (name, n)
  function parts(name, n) {
    const k = name + ':' + n;
    if (PARTS[k]) return PARTS[k];
    const R = G.util.rng(G.util.hash('fx:' + name));
    const list = [];
    for (let i = 0; i < n; i++) list.push({ a: R() * Math.PI * 2, r: 0.3 + R() * 0.7, ph: R(), sz: 0.6 + R() * 1.4, sp: 0.6 + R() * 0.8, k: R() });
    PARTS[k] = list; return list;
  }
  const ease = (t) => 1 - Math.pow(1 - t, 3);
  function glowDot(c, x, y, r, col, a) {
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.globalAlpha = a; c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
  }
  function spark(c, x, y, s, col) {
    c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), 2, 2);
    c.fillRect(Math.round(x) - 2 * s, Math.round(y), 2 * s, 1); c.fillRect(Math.round(x) + 2, Math.round(y), 2 * s, 1);
    c.fillRect(Math.round(x), Math.round(y) - 2 * s, 1, 2 * s); c.fillRect(Math.round(x), Math.round(y) + 2, 1, 2 * s);
  }
  function starBurst(c, x, y, r, col, n, rot) {
    c.strokeStyle = col; c.lineWidth = 2;
    for (let i = 0; i < n; i++) {
      const a = rot + i * Math.PI * 2 / n;
      c.beginPath(); c.moveTo(x + Math.cos(a) * r * 0.3, y + Math.sin(a) * r * 0.3); c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); c.stroke();
    }
  }
  function heartPt(u) {
    return [16 * Math.pow(Math.sin(u), 3), -(13 * Math.cos(u) - 5 * Math.cos(2 * u) - 2 * Math.cos(3 * u) - Math.cos(4 * u))];
  }
  function drawFxAt(c, name, x, y, t, o) {
    t = Math.max(0, Math.min(1, t));
    const S = o.big ? 1.5 : 1;
    const C = o.color;
    c.save();
    c.imageSmoothingEnabled = false;
    switch (name) {
      case 'slash': {
        c.globalCompositeOperation = 'lighter';
        const a1 = -2.5 + 1.9 * ease(t);
        for (let k = 0; k < 3; k++) {
          const r = (30 + k * 8) * S, alpha = (1 - t * 0.5) * (1 - k * 0.25);
          c.strokeStyle = C || (k === 0 ? '#ffffff' : '#9fd8ff'); c.lineWidth = (k === 0 ? 6 : 3) * S;
          c.globalAlpha = alpha;
          c.beginPath(); c.arc(x, y, r, a1 - 0.9 + k * 0.12, a1 + k * 0.12); c.stroke();
        }
        if (t > 0.6) { glowDot(c, x + Math.cos(a1) * 26 * S, y + Math.sin(a1) * 26 * S, 12 * S, 'rgba(255,255,255,0.9)', (t - 0.6) * 2.5); }
        break;
      }
      case 'pierce': {
        c.globalCompositeOperation = 'lighter';
        const p = ease(Math.min(1, t * 1.6));
        const sx = x - 70 * S + 70 * S * p, sy = y + 12 * S - 12 * S * p;
        c.strokeStyle = C || '#eaf6ff'; c.lineWidth = 3 * S; c.globalAlpha = 1 - Math.max(0, (t - 0.7) * 3);
        c.beginPath(); c.moveTo(sx - 40 * S, sy + 4 * S); c.lineTo(sx, sy); c.stroke();
        c.lineWidth = 1; c.beginPath(); c.moveTo(sx - 60 * S, sy + 8 * S); c.lineTo(sx - 10, sy + 1); c.stroke();
        if (t > 0.45) { const u = (t - 0.45) / 0.55; starBurst(c, x, y, 18 * S * u, C || '#ffffff', 4, 0.4); glowDot(c, x, y, 14 * S, 'rgba(200,230,255,0.8)', 1 - u); }
        break;
      }
      case 'blunt': {
        c.globalCompositeOperation = 'lighter';
        const r = (10 + 40 * ease(t)) * S;
        c.strokeStyle = C || '#fff0c8'; c.lineWidth = 4 * S * (1 - t * 0.5); c.globalAlpha = Math.min(1, 1.4 - t);
        c.beginPath(); c.ellipse(x, y + 8 * S, r, r * 0.42, 0, 0, Math.PI * 2); c.stroke();
        c.globalCompositeOperation = 'source-over';
        for (const p of parts('blunt', 14)) {
          const d = (10 + 36 * p.sp * ease(t)) * S;
          c.fillStyle = 'rgba(190,160,120,' + (0.7 * (1 - t)) + ')';
          c.fillRect(x + Math.cos(p.a) * d, y + 10 * S - Math.abs(Math.sin(p.a)) * d * 0.4 - t * 6 * p.sz, 3 * p.sz, 2 * p.sz);
        }
        if (t < 0.4) glowDot(c, x, y, 26 * S, 'rgba(255,240,200,0.9)', 1 - t / 0.4);
        break;
      }
      case 'arrow': {
        const p = Math.min(1, t / 0.8), e = p * p;
        const ax = x - 70 * S + 70 * S * e, ay = y - 36 * S + 36 * S * e;
        const ang = 0;
        c.save(); c.translate(ax, ay); c.rotate(Math.atan2(36 * S, 70 * S));
        c.fillStyle = C || '#d9b67a'; c.fillRect(-26 * S, -0.5, 26 * S, 1.5);
        c.fillStyle = '#dfe6f0'; c.beginPath(); c.moveTo(0, -2 * S); c.lineTo(5 * S, 0); c.lineTo(0, 2 * S); c.fill();
        c.fillStyle = '#e8e0d0'; c.fillRect(-28 * S, -3 * S, 4 * S, 2 * S); c.fillRect(-28 * S, 1 * S, 4 * S, 2 * S);
        c.restore();
        c.globalCompositeOperation = 'lighter';
        if (t > 0.78) { const u = (t - 0.78) / 0.22; for (const p of parts('arrow', 8)) spark(c, x + Math.cos(p.a) * 14 * u * S, y + Math.sin(p.a) * 10 * u * S, 1, '#ffe9b0'); }
        void ang;
        break;
      }
      case 'fire': {
        c.globalCompositeOperation = 'lighter';
        glowDot(c, x, y, 40 * S, 'rgba(255,120,40,0.7)', 0.6 * Math.sin(Math.PI * Math.min(1, t * 1.2)));
        for (const p of parts('fire', 26)) {
          const life = (t * 1.4 + p.ph) % 1;
          const px = x + Math.cos(p.a) * 22 * p.r * S * (0.4 + life), py = y + 14 * S - life * 60 * p.sp * S;
          const col = life < 0.4 ? '#fff2a0' : life < 0.75 ? '#ff9a2a' : '#c8321a';
          glowDot(c, px, py, (6 + 6 * (1 - life)) * p.sz * S, col, 0.8 * (1 - life));
        }
        break;
      }
      case 'ice': {
        c.globalCompositeOperation = 'source-over';
        for (const p of parts('ice', 9)) {
          const g = Math.min(1, t * 2.5) * (1 - Math.max(0, (t - 0.8) * 5));
          const r = (14 + 14 * p.r) * S, px = x + Math.cos(p.a) * r, py = y + 6 * S + Math.sin(p.a) * r * 0.45;
          const h = (12 + 10 * p.sz) * S * g;
          c.globalAlpha = Math.max(0, g);
          c.fillStyle = 'rgba(190,235,255,0.92)';
          c.beginPath(); c.moveTo(px, py - h); c.lineTo(px + 4 * S, py); c.lineTo(px, py + h * 0.3); c.lineTo(px - 4 * S, py); c.closePath(); c.fill();
          c.fillStyle = 'rgba(120,200,255,0.9)';
          c.beginPath(); c.moveTo(px + 4 * S, py); c.lineTo(px, py + h * 0.3); c.lineTo(px + 1, py); c.closePath(); c.fill();
        }
        c.globalCompositeOperation = 'lighter';
        glowDot(c, x, y + 6 * S, 34 * S, 'rgba(160,220,255,0.5)', 0.8 * (1 - t));
        c.globalAlpha = 1;
        break;
      }
      case 'lightning': {
        c.globalCompositeOperation = 'lighter';
        const seg = Math.floor(t * 6), R = G.util.rng(G.util.hash('bolt' + seg));
        const pts = [];
        const n = 12;
        for (let i = 0; i <= n; i++) {
          const f = i / n;
          pts.push([x + (R() - 0.5) * 16 * S * (i && i < n ? 1 : 0), y - 130 * S + f * 130 * S]);
        }
        const fl = (t < 0.15) ? 1 : Math.max(0, 1 - t * 1.3);
        c.globalAlpha = fl;
        if (t < 0.15) { c.fillStyle = 'rgba(200,230,255,' + (0.25 * (1 - t / 0.15)) + ')'; c.fillRect(0, 0, 640, 480); }
        c.strokeStyle = 'rgba(120,200,255,0.9)'; c.lineWidth = 7 * S;
        c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.stroke();
        c.strokeStyle = C || '#ffffff'; c.lineWidth = 2 * S;
        c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.stroke();
        glowDot(c, x, y, 26 * S, 'rgba(180,230,255,0.9)', fl);
        break;
      }
      case 'wind': {
        c.globalCompositeOperation = 'lighter';
        for (let k = 0; k < 3; k++) {
          const r = (18 + k * 12) * S, a0 = t * 9 + k * 2.1;
          c.strokeStyle = C || (k % 2 ? '#d8fff0' : '#9ff0c8'); c.lineWidth = 2.2 * S; c.globalAlpha = 0.85 * (1 - t * 0.5);
          c.beginPath(); c.ellipse(x, y, r, r * 0.42, 0, a0, a0 + 2.2); c.stroke();
        }
        for (const p of parts('wind', 10)) {
          const a = p.a + t * 8 * p.sp, r = (16 + 22 * p.r) * S;
          spark(c, x + Math.cos(a) * r, y + Math.sin(a) * r * 0.4 - 4, p.sz > 1 ? 1 : 0.5, '#e8fff6');
        }
        c.globalAlpha = 1;
        break;
      }
      case 'light': {
        c.globalCompositeOperation = 'lighter';
        const h = 150 * S, grow = ease(Math.min(1, t * 2.2));
        const bw = (10 + 24 * grow) * S;
        const g = c.createLinearGradient(0, y - h, 0, y);
        g.addColorStop(0, 'rgba(255,246,200,0)'); g.addColorStop(0.7, 'rgba(255,246,200,0.55)'); g.addColorStop(1, 'rgba(255,255,240,0.9)');
        c.fillStyle = g; c.globalAlpha = 1 - Math.max(0, (t - 0.7) * 3.3);
        c.fillRect(x - bw / 2, y - h, bw, h);
        glowDot(c, x, y, 40 * S * grow, 'rgba(255,240,190,0.8)', 1 - t * 0.5);
        for (const p of parts('light', 16)) {
          const life = (t * 1.2 + p.ph) % 1;
          spark(c, x + Math.cos(p.a * 3) * 16 * p.r * S, y - life * 130 * S * p.sp, p.sz > 1.2 ? 1 : 0.5, '#fffbe0');
        }
        break;
      }
      case 'dark': {
        c.globalCompositeOperation = 'source-over';
        for (const p of parts('dark', 5)) {
          const u = Math.min(1, t * 1.3), a = p.a + t * 4 + p.k;
          const r = (46 * (1 - u) + 4) * S, px = x + Math.cos(a) * r, py = y + Math.sin(a) * r * 0.5;
          const rad = (7 + 3 * p.sz) * S;
          c.globalAlpha = 0.95 * (1 - Math.max(0, (t - 0.85) * 6.6));
          c.fillStyle = '#0c0614'; c.beginPath(); c.arc(px, py, rad, 0, Math.PI * 2); c.fill();
          c.globalCompositeOperation = 'lighter'; c.strokeStyle = C || '#a270ff'; c.lineWidth = 1.5 * S; c.stroke();
          c.globalCompositeOperation = 'source-over';
        }
        c.globalAlpha = 1;
        c.globalCompositeOperation = 'lighter';
        glowDot(c, x, y, 30 * S, 'rgba(140,80,220,0.6)', 0.5 * Math.sin(Math.PI * Math.min(1, t * 1.1)));
        break;
      }
      case 'heal': {
        c.globalCompositeOperation = 'lighter';
        glowDot(c, x, y, 36 * S, 'rgba(120,255,160,0.45)', 0.7 * (1 - t * 0.6));
        for (const p of parts('heal', 14)) {
          const life = (t * 1.3 + p.ph) % 1;
          const px = x + Math.cos(p.a) * 20 * p.r * S, py = y + 12 * S - life * 56 * S * p.sp;
          spark(c, px, py, p.sz > 1.2 ? 2 : 1, life < 0.5 ? '#c9ffd9' : '#ffe98a');
        }
        break;
      }
      case 'buff': case 'debuff': {
        const up = name === 'buff';
        c.globalCompositeOperation = 'lighter';
        const col = C || (up ? '#7dff9a' : '#c86bff');
        for (const p of parts(name, 6)) {
          const life = (t * 1.2 + p.ph) % 1;
          const px = x + (p.r - 0.5) * 48 * S, py = up ? y + 14 * S - life * 56 * S : y - 30 * S + life * 56 * S;
          c.globalAlpha = 1 - life;
          c.fillStyle = col;
          const d = up ? -1 : 1;
          c.beginPath(); c.moveTo(px, py + d * 6 * S); c.lineTo(px + 5 * S, py - d * 0 + d * 0); c.lineTo(px, py - d * 0); c.closePath(); c.fill();
          c.fillRect(px - 1.5 * S, py - d * 2 * S, 3 * S, 6 * S);
          c.beginPath(); c.moveTo(px - 5 * S, py - d * 2 * S); c.lineTo(px + 5 * S, py - d * 2 * S); c.lineTo(px, py + (up ? -6 : 6) * S); c.closePath(); c.fill();
        }
        c.globalAlpha = 1;
        glowDot(c, x, y, 28 * S, up ? 'rgba(120,255,160,0.35)' : 'rgba(170,90,255,0.35)', 0.8 * (1 - t));
        break;
      }
      case 'break': {
        c.globalCompositeOperation = 'source-over';
        const sz = 14 * S;
        const shardPts = [[-1, -1.3], [1, -1.3], [1.2, 0], [0.4, 1.4], [-1, 1], [-1.3, 0]];
        for (let k = 0; k < 6; k++) {
          const p = parts('break', 6)[k];
          const ax = Math.cos(p.a) * 26 * S, ay = Math.sin(p.a) * 26 * S;
          const px = x + ax * ease(t) * 1.8, py = y + ay * ease(t) * 1.4 + 60 * t * t * S;
          c.save(); c.translate(px, py); c.rotate(t * (p.k * 8 - 4));
          c.globalAlpha = 1 - Math.max(0, (t - 0.6) * 2.5);
          c.beginPath();
          shardPts.forEach((q, i) => (i ? c.lineTo(q[0] * sz * 0.5, q[1] * sz * 0.5) : c.moveTo(q[0] * sz * 0.5, q[1] * sz * 0.5)));
          c.closePath();
          c.fillStyle = '#d8f2ff'; c.fill();
          c.strokeStyle = '#4a7aa8'; c.lineWidth = 1; c.stroke();
          c.restore();
        }
        c.globalAlpha = 1;
        c.globalCompositeOperation = 'lighter';
        if (t < 0.25) { starBurst(c, x, y, 34 * S * (t / 0.25 + 0.2), '#ffffff', 10, 0.2); }
        break;
      }
      case 'hit': {
        c.globalCompositeOperation = 'lighter';
        const u = t, rr = (8 + 18 * ease(u)) * S;
        starBurst(c, x, y, rr, C || '#ffffff', 6, 0.3 + u);
        glowDot(c, x, y, 16 * S, 'rgba(255,255,255,0.9)', 1 - u);
        break;
      }
      case 'steal': {
        c.globalCompositeOperation = 'lighter';
        for (let k = 0; k < 4; k++) {
          const p = (t * 1.3 + k * 0.22) % 1;
          const ex = x + 50 * S, ey = y - 34 * S;
          const px = x + (ex - x) * p, py = y + (ey - y) * p - Math.sin(p * Math.PI) * 26 * S;
          const sq = Math.abs(Math.cos(p * 10 + k));
          c.fillStyle = C || '#ffd86b';
          c.globalAlpha = 1 - Math.max(0, p - 0.85) * 6;
          c.beginPath(); c.ellipse(px, py, 4.5 * S, 4.5 * S * (0.25 + 0.75 * sq), 0, 0, Math.PI * 2); c.fill();
          c.fillStyle = '#fff6c8'; c.fillRect(px - 1, py - 2 * S, 2, 2);
        }
        c.globalAlpha = 1;
        spark(c, x + 50 * S, y - 34 * S, 2 * S, '#fff6c8');
        break;
      }
      case 'bond': {
        // interlocking heart-flame helix: two hearts with flame dots rising
        c.globalCompositeOperation = 'lighter';
        glowDot(c, x, y - 6 * S, 40 * S, 'rgba(255,120,150,0.4)', 0.6 * (1 - Math.max(0, t - 0.8) * 4));
        for (let h = 0; h < 2; h++) {
          const sign = h ? -1 : 1, off = h ? 6 : -6;
          for (let i = 0; i < 26; i++) {
            const u = i / 26 * Math.PI * 2;
            const hp = heartPt(u);
            const rise = ((t * 1.2 + i / 26 + h * 0.5) % 1);
            const px = x + off * S + hp[0] * 1.5 * S + Math.sin(rise * 6 + i) * 3 * S * sign;
            const py = y + 6 * S + hp[1] * 1.5 * S - rise * 14 * S;
            const col = i % 3 ? '#ff7aa0' : '#ffd27a';
            glowDot(c, px, py, (4 + 3 * (1 - rise)) * S, col, 0.9 * (1 - rise * 0.5) * Math.min(1, t * 4));
          }
        }
        break;
      }
      case 'poison': {
        c.globalCompositeOperation = 'source-over';
        c.globalAlpha = 0.3 * (1 - t * 0.5);
        c.fillStyle = '#6fe04a'; c.beginPath(); c.ellipse(x, y, 32 * S, 20 * S, 0, 0, Math.PI * 2); c.fill();
        c.globalAlpha = 1;
        for (const p of parts('poison', 12)) {
          const life = (t * 1.1 + p.ph) % 1;
          const px = x + Math.cos(p.a) * 24 * p.r * S + Math.sin(life * 9 + p.a) * 3 * S;
          const py = y + 12 * S - life * 52 * S * p.sp;
          const r = (2 + 3 * p.sz) * S;
          c.globalAlpha = 0.85 * (1 - life);
          c.strokeStyle = '#b8ff8a'; c.lineWidth = 1.2 * S; c.fillStyle = 'rgba(120,230,90,0.4)';
          c.beginPath(); c.arc(px, py, r, 0, Math.PI * 2); c.fill(); c.stroke();
          c.fillStyle = '#eaffd8'; c.fillRect(px - r * 0.5, py - r * 0.6, 1.5, 1.5);
        }
        c.globalAlpha = 1;
        break;
      }
      case 'revive': {
        c.globalCompositeOperation = 'lighter';
        const grow = ease(Math.min(1, t * 2));
        const g = c.createLinearGradient(0, y - 120 * S, 0, y + 10 * S);
        g.addColorStop(0, 'rgba(255,230,140,0)'); g.addColorStop(1, 'rgba(255,240,180,0.7)');
        c.fillStyle = g; c.globalAlpha = (1 - Math.max(0, t - 0.8) * 5) * grow;
        c.fillRect(x - 14 * S * grow, y - 120 * S, 28 * S * grow, 130 * S);
        glowDot(c, x, y - 8 * S, 44 * S * grow, 'rgba(255,220,120,0.7)', 0.8);
        for (const p of parts('revive', 18)) {
          const life = (t * 1.1 + p.ph) % 1;
          const a = p.a + life * 6;
          const px = x + Math.cos(a) * 18 * p.r * S, py = y - life * 100 * S;
          c.globalAlpha = 1 - life;
          c.fillStyle = '#ffe9a0';
          c.save(); c.translate(px, py); c.rotate(a); c.beginPath(); c.ellipse(0, 0, 4 * S, 1.6 * S, 0, 0, Math.PI * 2); c.fill(); c.restore();
        }
        c.globalAlpha = 1;
        break;
      }
      case 'shield': {
        c.globalCompositeOperation = 'lighter';
        const grow = ease(Math.min(1, t * 2.4)), r = 26 * S * grow;
        c.strokeStyle = C || '#9fe3ff'; c.lineWidth = 2 * S; c.globalAlpha = 1 - Math.max(0, t - 0.7) * 3.3;
        c.beginPath();
        for (let i = 0; i <= 6; i++) {
          const a = i * Math.PI / 3 + Math.PI / 6;
          const px = x + Math.cos(a) * r, py = y - 4 * S + Math.sin(a) * r * 1.1;
          if (i === 0) c.moveTo(px, py); else c.lineTo(px, py);
        }
        c.closePath(); c.fillStyle = 'rgba(140,220,255,0.18)'; c.fill(); c.stroke();
        c.lineWidth = 1; c.globalAlpha *= 0.7;
        c.beginPath(); c.ellipse(x, y - 4 * S, r * (0.6 + 0.4 * t), r * 1.1 * (0.6 + 0.4 * t), 0, 0, Math.PI * 2); c.stroke();
        for (const p of parts('shield', 8)) { const a = p.a + t * 3; spark(c, x + Math.cos(a) * r, y - 4 * S + Math.sin(a) * r * 1.1, 1, '#eaffff'); }
        c.globalAlpha = 1;
        break;
      }
      default:
        glowDot(c, x, y, 20 * S, 'rgba(255,255,255,0.6)', 1 - t);
    }
    c.restore();
  }

  Object.assign(G.gfx, {
    // t in 0..1; opts {big, color}
    drawFx(ctx, name, x, y, t, opts) { drawFxAt(ctx, String(name), x, y, t, opts || {}); },
    fxDuration(name) { return FX_FRAMES[name] || 24; },
  });

  /* ======================================================================
   * 7. HUD helpers: shield pips, weakness icons
   * ====================================================================== */
  const WEAK_COL = { fire: '#ff7a3a', ice: '#8fd8ff', lightning: '#ffe35a', wind: '#9ff0c8', light: '#fff3b0', dark: '#a77cff',
    sword: '#dfe6f0', spear: '#cfd8e6', dagger: '#e6e0ff', axe: '#f0b080', bow: '#c8a878', staff: '#d8b070' };
  const WEAK_GLYPH = { fire: 'F', ice: 'I', lightning: 'L', wind: 'W', light: 'Li', dark: 'D', sword: 'S', spear: 'P', dagger: 'Dg', axe: 'A', bow: 'B', staff: 'St' };
  function shieldPath(c, x, y, s) {
    c.beginPath(); c.moveTo(x, y); c.lineTo(x + 8 * s, y); c.lineTo(x + 8 * s, y + 5 * s);
    c.quadraticCurveTo(x + 8 * s, y + 9 * s, x + 4 * s, y + 10 * s); c.quadraticCurveTo(x, y + 9 * s, x, y + 5 * s); c.closePath();
  }
  Object.assign(G.gfx, {
    // count filled of max shield pips; broken = grey pips with a crack
    drawShieldPips(ctx, x, y, count, max, broken) {
      ctx.save();
      for (let i = 0; i < (max || 0); i++) {
        const px = Math.round(x + i * 11), py = Math.round(y);
        const on = i < count && !broken;
        shieldPath(ctx, px, py, 1);
        ctx.fillStyle = broken ? '#5a6078' : on ? '#9fe3ff' : '#1c2442';
        ctx.fill();
        ctx.strokeStyle = broken ? '#8a90a8' : '#9cc8ff'; ctx.lineWidth = 1; ctx.stroke();
        if (on) { ctx.fillStyle = '#ffffff'; ctx.fillRect(px + 1, py + 1, 2, 2); }
        if (broken) { ctx.strokeStyle = '#ff6b6b'; ctx.beginPath(); ctx.moveTo(px + 1, py + 1); ctx.lineTo(px + 6, py + 8); ctx.stroke(); }
      }
      ctx.restore();
    },
    // one slot per weakness token: revealed -> icon, unrevealed -> '?'
    drawWeakIcons(ctx, x, y, weakList, revealedSet) {
      const isRev = (k) => (revealedSet instanceof Set ? revealedSet.has(k) : Array.isArray(revealedSet) ? revealedSet.includes(k) : !!(revealedSet && revealedSet[k]));
      const list = (weakList || []).slice(0, 12);
      list.forEach((k, i) => {
        const px = Math.round(x + i * 16), py = Math.round(y);
        if (isRev(k)) {
          let drawn = false;
          if (G.gfx.icon) { try { G.gfx.icon(ctx, k, px, py, 14); drawn = true; } catch (e) { drawn = false; } }
          if (!drawn) {
            ctx.save();
            ctx.fillStyle = WEAK_COL[k] || '#ffffff';
            ctx.beginPath(); ctx.arc(px + 6, py + 6, 6, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#000'; ctx.lineWidth = 1; ctx.stroke();
            ctx.fillStyle = '#10101a'; ctx.font = 'bold 8px Arial'; ctx.textAlign = 'center';
            ctx.fillText(WEAK_GLYPH[k] || k[0].toUpperCase(), px + 6, py + 9);
            ctx.restore();
          }
        } else {
          ctx.save();
          ctx.fillStyle = '#1b1f38'; ctx.fillRect(px, py, 12, 12);
          ctx.strokeStyle = '#9cc8ff'; ctx.strokeRect(px + 0.5, py + 0.5, 11, 11);
          ctx.fillStyle = '#e8f0ff'; ctx.font = 'bold 10px Arial'; ctx.textAlign = 'center';
          ctx.fillText('?', px + 6, py + 10);
          ctx.restore();
        }
      });
    },
  });

  G.provide('gfx_battle');
})();
