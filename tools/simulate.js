#!/usr/bin/env node
/* Mock-run every event script / story script / romance scene with a logging mock `c`.
 *   NODE_PATH=$(npm root -g) node tools/simulate.js js/ch1.js [js/bonds_a.js ...] [--all] [--verbose]
 * --all : load every js/*.js engine+content file (final integration check) instead of just the listed files. */
const { open } = require('./page_harness');
const fs = require('fs'); const path = require('path');
(async () => {
  let args = process.argv.slice(2); const verbose = args.includes('--verbose'); const all = args.includes('--all'); args = args.filter((a) => !a.startsWith('--'));
  let files = args;
  if (all) files = ['gfx_ui','gfx_world','gfx_battle','audio','data','ui','romance','map','battle','hub','ch1','ch2','ch3','ch4','ch5','bonds_a','bonds_b'].map((n) => 'js/' + n + '.js').filter((f) => fs.existsSync(path.resolve(__dirname, '..', f)));
  const h = await open(files);
  const report = await h.page.evaluate(async (verbose) => {
    const problems = [], log = []; const K = KNOWN; let current = '';
    const P = (m) => problems.push(current + ': ' + m);
    const want = (list, v, what) => { if (v !== undefined && v !== null && list.indexOf(v) < 0) P('unknown ' + what + ' "' + v + '"'); };
    const ok = Promise.resolve();
    const mock = {
      say: (who, text, o) => { if (typeof text !== 'string') P('say() text not a string'); else { if (text.length > 220) P('say() text too long (' + text.length + '): ' + text.slice(0, 40) + '…'); if (/undefined|\[object/.test(text)) P('say() text has undefined: ' + text); }
        if (who !== null && who !== undefined && typeof who !== 'string') P('say() speaker must be string|null'); if (o && o.face) want(K.portraits, o.face, 'portrait'); if (o && o.expr) want(K.exprs, o.expr, 'expression'); if (verbose) log.push((who || '·') + ': ' + text); return ok; },
      narrate: (t) => mock.say(null, t), choice: (opts, o) => { if (!Array.isArray(opts) || !opts.length || opts.some((x) => typeof x !== 'string')) P('choice() needs array of strings'); return Promise.resolve(Math.floor(Math.random() * (opts ? opts.length : 1))); },
      nameInput: (d) => Promise.resolve(d || 'Rowan'), titleCard: () => ok, toast: () => ok, hint: () => ok, shop: (id) => { want(K.shops, id, 'shop'); return ok; }, saveMenu: () => ok, credits: () => ok,
      fade: () => ok, flash: () => ok, shake: () => ok, wait: () => ok, flag: (k) => G.flag(k), set: (k, v) => G.setFlag(k, v), inc: (k, n) => { G.state.flags[k] = (G.state.flags[k] || 0) + (n == null ? 1 : n); }, gold: () => ok, chapter: () => ok,
      bgm: (n) => { want(K.bgm, n, 'bgm'); return ok; }, sfx: (n) => { want(K.sfx, n, 'sfx'); return ok; }, stopBgm: () => ok,
      run: (fn) => fn(mockProxy), callScript: (n, ...a) => { const f = G.story.scripts[n]; if (!f) { P('callScript unknown story script ' + n); return ok; } return f(mockProxy, ...a); },
      addItem: (id) => { want(K.items, id, 'item'); return ok; }, removeItem: (id) => { want(K.items, id, 'item'); return ok; }, hasItem: () => 1, join: (id) => { want(K.actors, id, 'actor'); return ok; }, leave: (id) => { want(K.actors, id, 'actor'); return ok; }, healAll: () => ok, setParty: (ids) => { (ids || []).forEach((i) => want(K.actors, i, 'actor')); return ok; },
      transfer: (id) => { want(K.maps, id, 'map'); return ok; }, walk: () => ok, walkTo: () => ok, face: () => ok, setPos: () => ok, showNpc: () => ok, setSprite: (id, s) => { want(K.sprites, s, 'sprite'); return ok; }, setEvent: () => ok, camera: () => ok, camReset: () => ok,
      emote: (w, k) => { want(K.emotes, k, 'emote'); return ok; }, jump: () => ok, follow: () => ok,
      battle: (id) => { want(K.troops, id, 'troop'); return Promise.resolve(Math.random() < 0.9 ? 'win' : 'lose'); },
      affection: (id) => { want(K.candidates, id, 'romance candidate'); return ok; }, runScene: (id) => { want(K.sceneIds, id, 'scene id'); return ok; }, afterRest: () => ok,
      chapterEnd: (n) => ok, skychart: () => ok,
    };
    const mockProxy = new Proxy(mock, { get(t, k) { if (k in t) return t[k]; if (typeof k !== 'string' || k === 'then') return undefined; P('uses undefined command c.' + k + '()'); return () => ok; } });
    const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout (script hangs or loops forever)')), ms))]);
    const runIt = async (label, fn) => { current = label; try { await withTimeout(Promise.resolve(fn(mockProxy)), 4000); } catch (e) { P('EXCEPTION ' + (e && e.message)); } };
    // reset volatile state then run all content
    G.newGame('Rowan');
    for (const id of G.maps.list()) {
      const d = G.maps.get(id);
      for (const e of d.events) {
        if (e.sprite) want(K.sprites, e.sprite, 'sprite (event ' + e.id + ' on ' + id + ')');
        if (typeof e.run === 'function') { for (const variant of [1, 2]) { if (variant === 2) { G.state.flags = {}; } await runIt(id + '/' + e.id + (variant === 2 ? '#2' : ''), e.run); } }
      }
      if (d.onEnter) await runIt(id + '/onEnter', d.onEnter);
      if (d.encounters) for (const t of d.encounters.troops) { current = id + '/encounters'; want(K.troops, t.id, 'troop'); }
      current = id; want(K.bgm, d.bgm, 'bgm');
    }
    for (const [n, f] of Object.entries(G.story.scripts || {})) await runIt('story/' + n, f);
    const sc = (G.romance && G.romance.scenes) ? G.romance.scenes() : [];
    for (const s of sc) { if (s.actor) want(K.actors, s.actor, 'actor in scene ' + s.id); for (let k = 0; k < 3; k++) await runIt('scene/' + s.id + '#' + k, s.run); }
    return { problems, maps: G.maps.list().length, scripts: Object.keys(G.story.scripts || {}).length, scenes: sc.length, log: log.slice(0, 200) };
  }, verbose);
  console.log(`simulated: ${report.maps} maps, ${report.scripts} story scripts, ${report.scenes} romance scenes`);
  const uniq = [...new Set(report.problems)]; uniq.slice(0, 80).forEach((p) => console.log('  ✗ ' + p)); if (uniq.length > 80) console.log('  … ' + (uniq.length - 80) + ' more');
  if (verbose) report.log.forEach((l) => console.log('  | ' + l));
  h.errors.filter((e) => !/Failed to load resource/.test(e)).slice(0, 20).forEach((e) => console.log('[page] ' + e));
  await h.browser.close(); h.cleanup(); process.exit(uniq.length ? 1 : 0);
})();
