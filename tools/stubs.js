/* Minimal stand-ins so a single module can be loaded/tested in isolation. Real modules overwrite these. Loaded in the PAGE. */
(function () {
  const G = window.G;
  if (!G.romance) {
    const scenes = {};
    G.romance = { _stub: true, CANDIDATES: ['claret','caspian','rook','seraphine','wren'],
      registerScene(d) { if (!d || !d.id || typeof d.run !== 'function') throw new Error('registerScene needs {id, run}'); scenes[d.id] = d; },
      scenes() { return Object.values(scenes); }, scene(id) { return scenes[id]; },
      get() { return 0; }, add() { return 0; }, tier() { return 0; }, lover() { return null; }, setLover() {}, eligible() { return []; }, seen() { return false; }, available() { return []; }, bondTrickle() {} };
  }
})();
