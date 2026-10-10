/* =====================================================================
 * LANTERNBOUND — dress.js  (OVERSEER-OWNED)
 * Procedural "map dressing": after every chapter has registered its maps, add ground variation, flowers,
 * tall grass, bushes, tree clusters, rubble etc. to outdoor maps so they look lived-in (RPG Maker style).
 * Safe: obstacles never go near events/spawn, and a reachability check reverts any pass that breaks a map.
 * Disable per map with `def.noDress = true`.
 * ===================================================================== */
(function () {
  'use strict';
  const G = window.G;
  const GRASS = '.,', MOSS = 'v', DIRT = ':', SAND = '_', ASH = 'y', HOLLOW = 'h', COBBLE = '=l', ROCKY = 'k';

  function dressMap(def) {
    if (def.noDress || def.interior || def.dressed) return false;
    const rnd = G.util.rng(G.util.hash('dress:' + def.id));
    const W = def.w, H = def.h;
    const gr = def.ground.map((r) => r.split('')), ob = def.objects.map((r) => r.split(''));
    // classify map: count ground types
    const cnt = {}; let tot = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const c = gr[y][x]; cnt[c] = (cnt[c] || 0) + 1; tot++; }
    const outdoorish = (cnt['.'] || 0) + (cnt[','] || 0) + (cnt['v'] || 0) + (cnt['y'] || 0) + (cnt['h'] || 0) + (cnt[':'] || 0) + (cnt['_'] || 0);
    if (outdoorish < tot * 0.25) return false;     // mostly floor/cave/deck -> leave alone
    const forest = def.id.indexOf('wood') >= 0 || def.id.indexOf('whisper') >= 0 || def.id === 'wickholm' || def.id === 'pale_abbey' || def.id === 'lumen_vale';
    const pine = def.id.indexOf('whisper') >= 0 || def.id === 'pale_abbey' || def.id.indexOf('ashen') >= 0;
    const blighted = def.id.indexOf('ashen') >= 0 || def.id.indexOf('spire') >= 0;

    // protected tiles: near events (incl. step triggers & NPCs) and the spawn
    const prot = new Uint8Array(W * H);
    const mark = (x, y, r) => { for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) { const a = x + i, b = y + j; if (a >= 0 && b >= 0 && a < W && b < H) prot[b * W + a] = 1; } };
    for (const e of def.events) { for (let j = 0; j < (e.h || 1); j++) for (let i = 0; i < (e.w || 1); i++) mark(e.x + i, e.y + j, 2); }
    mark(def.spawn.x, def.spawn.y, 3);

    const snapshotG = def.ground.slice(), snapshotO = def.objects.slice();
    const before = G.maps.check(def.id).length;
    const attempt = (obstacleScale) => {
      const g2 = gr.map((r) => r.slice()), o2 = ob.map((r) => r.slice());
      const free = (x, y) => o2[y][x] === ' ' && !prot[y * W + x];
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const g = gr[y][x]; const r = rnd();
        const edge = Math.min(x, y, W - 1 - x, H - 1 - y);
        if (g === '.' || g === ',') {
          if (g === '.' && r < 0.09) g2[y][x] = ',';
          if (o2[y][x] === ' ') {
            const q = rnd();
            if (q < 0.035) o2[y][x] = 'F'; else if (q < 0.085) o2[y][x] = 'G';
            else if (!prot[y * W + x] && obstacleScale > 0) {
              if (edge <= 2 && q < 0.5 * obstacleScale + 0.085) o2[y][x] = pine ? 'N' : 'T';
              else if (edge <= 4 && q < 0.2 * obstacleScale + 0.085) o2[y][x] = (rnd() < 0.5 ? 'B' : (pine ? 'N' : 'T'));
              else if (forest && q < 0.07 * obstacleScale + 0.085) o2[y][x] = rnd() < 0.6 ? 'B' : (pine ? 'N' : 'T');
              else if (q < 0.025 * obstacleScale + 0.085) o2[y][x] = rnd() < 0.5 ? 'B' : 'R';
            }
          }
        } else if (g === 'v') {
          if (o2[y][x] === ' ') {
            const q = rnd();
            if (q < 0.05) o2[y][x] = 'G';
            else if (q < 0.065) o2[y][x] = 'F';
            else if (!prot[y * W + x] && obstacleScale > 0) {
              if (edge <= 2 && q < 0.55 * obstacleScale + 0.065) o2[y][x] = 'T';
              else if (q < 0.04 * obstacleScale + 0.065) o2[y][x] = 'B';
              else if (q < 0.055 * obstacleScale + 0.065) o2[y][x] = 'R';
            }
          }
          if (r < 0.05) g2[y][x] = '.';           // patches of healthier grass in the moss
        } else if (g === ':') {
          if (o2[y][x] === ' ' && !prot[y * W + x] && obstacleScale > 0 && rnd() < 0.008) o2[y][x] = 'R';
        } else if (g === '_') {
          if (o2[y][x] === ' ' && !prot[y * W + x] && obstacleScale > 0 && rnd() < 0.012) o2[y][x] = 'R';
        } else if (g === 'y' || g === 'h') {
          if (o2[y][x] === ' ' && !prot[y * W + x] && obstacleScale > 0) {
            const q = rnd();
            if (edge <= 2 && q < 0.4 * obstacleScale) o2[y][x] = 'd';
            else if (q < 0.025 * obstacleScale) o2[y][x] = 'd';
            else if (q < 0.05 * obstacleScale) o2[y][x] = 'r';
            else if (g === 'h' && q < 0.058 * obstacleScale) o2[y][x] = 'i';
          }
          if (g === 'y' && r < 0.04) g2[y][x] = 'h';  // creeping Hollow ground
        } else if (g === '=') {
          // occasional weeds growing between cobbles at map edges only
          if (edge <= 1 && o2[y][x] === ' ' && !prot[y * W + x] && rnd() < 0.06) o2[y][x] = 'G';
        }
      }
      return { g2, o2 };
    };

    for (const scale of [1, 0.5, 0]) {
      const { g2, o2 } = attempt(scale);
      def.ground = g2.map((r) => r.join('')); def.objects = o2.map((r) => r.join(''));
      const after = G.maps.check(def.id).length;
      if (after <= before) { def.dressed = true; return true; }
      def.ground = snapshotG; def.objects = snapshotO;     // revert and retry softer
    }
    def.ground = snapshotG; def.objects = snapshotO; return false;
  }

  G.maps.dressAll = function () { let n = 0; for (const id of G.maps.list()) { try { if (dressMap(G.maps.get(id))) n++; } catch (e) { console.warn('[dress] failed for', id, e.message); } } return n; };
  G.provide('dress');
})();
