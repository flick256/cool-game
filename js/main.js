/* =====================================================================
 * LANTERNBOUND — main.js  (OVERSEER-OWNED) boot + debug start
 * Debug URL:  index.html?map=brasshaven&x=10&y=12&chapter=1&party=rowan,claret&level=8&flags=a,b&gold=999
 * ===================================================================== */
(function () {
  'use strict';
  const G = window.G;
  const q = new URLSearchParams(location.search);
  G.debug = {
    // jump straight into a map with a prepared party/state (used by humans and the test harness)
    start(o) {
      G.newGame(o.name || 'Rowan');
      const S = G.state;
      if (o.chapter != null) S.chapter = +o.chapter;
      if (o.gold != null) S.gold = +o.gold;
      (o.party || []).forEach((id) => { if (id !== 'rowan' && G.party && G.party.join) G.party.join(id, o.level ? +o.level : undefined); });
      if (o.level && G.party && G.party.setLevel) { Object.keys(S.roster).forEach((id) => G.party.setLevel(id, +o.level)); }
      (o.flags || []).forEach((f) => { if (f) { const kv = f.split('='); G.setFlag(kv[0], kv.length > 1 ? (isNaN(+kv[1]) ? kv[1] : +kv[1]) : true); } });
      if (G.party && G.party.healAll) G.party.healAll();
      const m = G.maps.get(o.map); if (!m) { console.error('[debug] unknown map', o.map); return; }
      S.map = { id: o.map, x: o.x != null ? +o.x : m.spawn.x, y: o.y != null ? +o.y : m.spawn.y, dir: o.dir || m.spawn.dir || 'down' };
      G.resumeGame();
    },
  };
  function boot() {
    if (q.has('map')) {
      G.debug.start({ map: q.get('map'), x: q.get('x'), y: q.get('y'), chapter: q.get('chapter'), gold: q.get('gold'), level: q.get('level'),
        party: (q.get('party') || '').split(',').filter(Boolean), flags: (q.get('flags') || '').split(',').filter(Boolean) });
    } else if (G.scenes.has('title')) {
      G.scenes.replace('title', {});
    } else {
      console.warn('[boot] no title scene registered yet');
    }
    G.start();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
