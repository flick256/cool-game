/* Integration scratch boot: real data/gfx; opens ?scene=... (title by default). */
(function () {
  'use strict';
  const G = window.G;
  const q = new URLSearchParams(location.search);
  const scene = q.get('scene') || 'title';
  if (scene === 'menu' || scene === 'shop' || scene === 'saveload') {
    G.newGame('Rowan');
    if (G.party && G.party.init) G.party.init();
    if (G.party && G.party.join) { try { G.party.join('claret', 3); } catch (e) { console.warn('join failed', e && e.message); } }
    G.state.gold = 640;
    G.state.map = { id: 'wickholm_house', x: 5, y: 6, dir: 'down' };
  }
  G.scenes.replace(scene, { mode: 'load', shopId: q.get('shop') || 'wickholm_shop' });
})();
