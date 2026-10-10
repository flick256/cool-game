/* Boots tests/ui.html into a chosen scene: ?scene=menu  or  ?demo=say|choice|card|name */
(function () {
  'use strict';
  const G = window.G;
  const q = new URLSearchParams(location.search);
  const scene = q.get('scene') || 'title';
  const demo = q.get('demo');
  window.__log = [];
  const L = (s) => window.__log.push(s + '@' + G.frame);
  // a plain painted backdrop so message overlays read clearly and stray presses do nothing
  G.scenes.register('blank', () => ({ opaque: true, draw(c) {
    const g = c.createLinearGradient(0, 0, 0, 480); g.addColorStop(0, '#2d4a3a'); g.addColorStop(1, '#4a3f2a');
    c.fillStyle = g; c.fillRect(0, 0, 640, 480);
    c.fillStyle = '#6b8a5c'; c.fillRect(0, 300, 640, 40);
  } }));
  if (!G.scenes.has('map')) G.scenes.register('map', (p) => ({ opaque: true, draw(c) { c.fillStyle = '#334'; c.fillRect(0, 0, 640, 480); c.fillStyle = '#fff'; c.fillText('MAP ' + (p.map || ''), 20, 20); } }));
  if (demo === 'say') {
    G.scenes.replace('blank', {});
    G.script.run(async (c) => {
      await c.say('Claret', 'I also found a bent propeller, worn-out struts, loose lug nuts and a giant gouge in the hull! This poor girl\'s been through the ringer!', { expr: 'worried' });
      await c.say('Rowan', 'Then we fix her. Together, {name}.', { expr: 'happy' });
      await c.narrate('The Marigold hums softly as the lanterns of Brasshaven flicker to life below.');
      const pick = await c.choice(['Earnest', 'Teasing', 'Flustered'], { prompt: 'How does Rowan answer?', cancel: 2 });
      await c.say('Claret', 'Choice ' + pick + ' noted.', { expr: 'smirk' });
      window.__demoDone = pick;
    });
  } else if (demo === 'choice') {
    G.scenes.replace('blank', {});
    G.script.run(async (c) => {
      await c.say('Claret', 'Well? Are we going or not?', { expr: 'smirk' });
      const pick = await c.choice(['Earnest', 'Teasing', 'Flustered', 'Brave'], { cancel: -1 });
      window.__demoDone = pick;
    });
  } else if (demo === 'card') {
    G.scenes.replace('blank', {});
    G.script.run(async (c) => {
      L('card');
      await c.titleCard('Brass & Steam', 'Brasshaven', 120);
      L('afterCard');
      await c.toast('Claret ♥ +3', 'heart');
      await c.toast('Potion x2 acquired', 'item');
      L('toasts');
      await c.hint('Hold Shift to run. Press Z near objects to interact.');
      L('hintDone');
      window.__demoDone = 1;
    });
  } else if (demo === 'name') {
    G.scenes.replace('blank', {});
    G.script.run(async (c) => { const n = await c.nameInput('Rowan'); window.__demoDone = n; });
  } else {
    G.scenes.replace(scene, { ending: q.get('ending') || undefined, shopId: q.get('shop') || 'wickholm_shop' });
  }
})();
