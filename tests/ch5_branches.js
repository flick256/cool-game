/* Branch test for ch5.js endings. Loaded in the page after js/ch5.js (see tests/ch5_branches_run.js).
 * window.ch5Branch(mode) → runs the ending for mode 'twin' | 'common' | 'lone' with a logging mock `c`
 * and returns the list of command calls (for asserting that each ending plays the right scenes and credits). */
(function () {
  'use strict';
  const G = window.G;
  window.ch5Branch = async function (mode) {
    const log = [];
    const choices = [0, 1, 2];
    const ok = Promise.resolve();
    const base = {
      say: (who, text) => { log.push('say:' + who); return ok; },
      narrate: (t) => { log.push('narrate'); return ok; },
      choice: (opts) => { log.push('choice'); return Promise.resolve(0); },
      bgm: (n) => { log.push('bgm:' + n); return ok; }, sfx: () => ok, flash: () => ok, shake: () => ok,
      fade: () => ok, wait: () => ok, camera: () => ok, camReset: () => ok, titleCard: (t) => { log.push('card:' + t); return ok; },
      toast: () => ok, chapter: () => ok, emote: () => ok, showNpc: () => ok,
      runScene: (id) => { log.push('scene:' + id); return ok; },
      credits: (k) => { log.push('credits:' + k); return ok; },
      battle: () => Promise.resolve('win'),
      addItem: () => ok, removeItem: () => ok, walk: () => ok, transfer: () => ok, affection: () => ok,
    };
    const c = new Proxy(base, { get(t, k) { if (k in t) return t[k]; if (typeof k !== 'string' || k === 'then') return undefined; return () => ok; } });
    // romance stub overrides for this branch
    const cand = ['claret', 'caspian', 'rook', 'seraphine', 'wren'];
    const realTier = G.romance.tier, realLover = G.romance.lover;
    G.romance.lover = () => (mode === 'twin' ? 'seraphine' : null);
    G.romance.tier = (id) => (mode === 'lone' ? 0 : (cand.indexOf(id) < 3 ? 1 : 0));
    G.state.roster = {}; cand.forEach((id) => { G.state.roster[id] = { id }; });
    G.state.flags = { ch6_vael2: true };
    try {
      await G.story.scripts.ch6_endings(c);
    } finally {
      G.romance.tier = realTier; G.romance.lover = realLover;
    }
    return { mode, ending: G.state.flags.ending, log };
  };
})();
