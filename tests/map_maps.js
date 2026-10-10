/* Scratch harness for js/map.js — loaded by tests/map.html.
 * Builds two test maps (village + interior) and stubs the commands that other modules own
 * (say, addItem, battle, ...) so the map engine can be exercised in isolation. */
(function () {
  'use strict';
  const G = window.G;

  // deterministic Math.random so headless runs are repeatable
  let seed = 12345;
  Math.random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

  window.__log = [];
  window.__sfx = [];
  window.__bgm = null;
  if (!G.audio) {
    G.audio = {
      playBgm(n) { window.__bgm = n; }, sfx(n) { window.__sfx.push(n); },
      stopBgm() {}, unlock() {}, update() {}, jingle() {},
    };
  }
  // stand-ins for commands owned by ui / data / battle
  const S = G.script;
  const stub = (name, fn) => { if (!S.cmds[name]) S.define(name, fn); };
  stub('say', (sp, text) => { window.__log.push((sp || '-') + ': ' + text); return G.wait(3); });
  stub('choice', () => Promise.resolve(0));
  stub('addItem', (id, n) => { window.__log.push('item:' + id + ' x' + (n || 1)); return Promise.resolve(); });
  stub('gold', () => Promise.resolve());
  stub('healAll', () => Promise.resolve());
  stub('saveMenu', () => G.wait(1));
  stub('afterRest', () => Promise.resolve());
  stub('shop', () => Promise.resolve());
  stub('battle', (id, opts) => {
    window.__log.push('battle:' + id + ' bg=' + (opts && opts.bg) + ' bgm=' + (opts && opts.bgm));
    return G.wait(10).then(() => 'win');
  });
  if (!G.scenes.has('menu')) G.scenes.register('menu', () => ({ opaque: false, update() {}, draw() {} }));

  const B = G.maps.build, H = G.maps.helpers;

  // ---------------------------------------------------------------- village 40x30
  const v = B('test_village', 40, 30, { name: 'Test Village', bgm: 'forest', spawn: { x: 10, y: 15, dir: 'down' } });
  v.path([[10, 15], [10, 8], [30, 8]], ':', 2, 'ground');
  v.pond(30, 20, 3, 2);
  v.blob('ground', 33, 22, 2, 1, 'w');
  v.house(4, 4, 6, 5, { roof: '5', wall: 'X' });          // door at (7,8)
  v.tiles('objects', [[14, 4], [15, 4], [18, 5], [3, 12], [3, 13], [4, 20], [5, 20], [16, 18], [17, 18]], 'T');
  v.hline('objects', 24, 16, 6, 'x');                       // fence y=16, x 24..29
  v.set('objects', 8, 14, 'L');
  v.set('objects', 22, 3, 'o');
  v.tiles('objects', [[6, 18], [7, 18]], 'B');
  v.tiles('objects', [[12, 22], [13, 22], [12, 23]], 'F');
  v.set('objects', 26, 26, 'R');
  v.ev(H.auto('intro', async (c) => { await c.say(null, 'Welcome to the test village.'); }));
  v.ev(H.trigger('step_test', 16, 9, async (c) => { await c.say(null, 'You stepped on the trigger.'); }, { once: true }));
  v.ev(H.npc('wanderer', 14, 13, 'villager_m1', ['Lovely day!', "Keep walking, I'm busy."], { move: 'wander', name: 'Villager' }));
  v.ev(H.npc('watcher', 26, 12, 'villager_f1', ['I see you.'], { move: 'face', name: 'Watcher' }));
  v.ev(H.chest('tv_chest', 20, 12, 'potion', 1));
  v.ev({ id: 'bump_box', x: 22, y: 6, sprite: 'obj_crate', solid: true, trigger: 'touch', run: async (c) => { await c.say(null, 'Bonk!'); } });
  v.ev(H.transfer(7, 8, 'test_interior', 6, 8, 'up'));
  v.encounters({ steps: [5, 8], troops: [{ id: 'wood_1', weight: 3 }, { id: 'wood_2', weight: 1 }] });
  v.finish();

  // ---------------------------------------------------------------- interior 14x10
  const t = B('test_interior', 14, 10, {
    name: 'Test Interior', bgm: 'tavern', spawn: { x: 6, y: 8, dir: 'up' }, interior: true,
    tint: 'rgba(10,20,60,0.2)',
    onEnter: async () => { G.setFlag('tint_entered', true); },
  });
  t.room(0, 0, 14, 10, { floor: 'f', wall: 'W', topWall: 2 });
  t.rect('objects', 2, 3, 3, 1, 'Y');
  t.set('objects', 10, 3, 'E');
  t.set('objects', 6, 9, 'D');
  t.ev(H.transfer(6, 9, 'test_village', 7, 9, 'down'));
  t.finish();

  // ---------------------------------------------------------------- start: party of three, then enter the village
  G.state.party = ['rowan', 'claret', 'caspian'];
  window.__start = () => G.scenes.replace('map', { map: 'test_village', x: 10, y: 15, dir: 'down' });
  window.__start();
})();
