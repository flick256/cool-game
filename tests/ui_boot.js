/* Boots tests/ui.html into a chosen scene: ?scene=menu&view=items  or  ?demo=say|choice|card|hint|shop|save|options|gameover|credits|name */
(function () {
  'use strict';
  const G = window.G;
  const q = new URLSearchParams(location.search);
  const scene = q.get('scene') || 'title';
  const demo = q.get('demo');
  if (demo) {
    G.scenes.push('menu', {});   // over an empty background so overlays read clearly
  }
  if (demo === 'say') {
    G.scenes.replace('menu', {});
    G.script.run(async (c) => {
      await c.say('Claret', 'I also found a bent propeller, worn-out struts, loose lug nuts and a giant gouge in the hull! This poor girl\'s been through the ringer!', { expr: 'worried' });
      await c.say('Rowan', 'Then we fix her. Together, {name}.', { expr: 'happy' });
      await c.narrate('The Marigold hums softly as the lanterns of Brasshaven flicker to life below.');
      const pick = await c.choice(['Earnest', 'Teasing', 'Flustered'], { prompt: 'How does Rowan answer?', cancel: 2 });
      await c.say('Claret', 'Choice ' + pick + ' noted.', { expr: 'smirk' });
    });
  } else if (demo === 'card') {
    G.scenes.replace('menu', {});
    G.script.run(async (c) => { await c.titleCard('Brass & Steam', 'Brasshaven', 120); await c.toast('Claret ♥ +3', 'heart'); await c.toast('Potion x2 acquired', 'item'); await c.hint('Hold Shift to run. Press Z near objects to interact.'); });
  } else if (demo === 'name') {
    G.scenes.replace('title', {});
    G.scenes.push('nameentry', { default: 'Rowan', title: 'Name your Lamplighter', done: () => {} });
  } else {
    G.scenes.replace(scene, {});
  }
  if (q.get('view') && G.scenes.top() && G.scenes.top().name === 'menu') {
    // deep-link into a sub screen by simulating its command press
    const cmds = ['Items', 'Skills', 'Equip', 'Status', 'Bonds', 'Formation', 'Save', 'Options', 'Title'];
    const idx = cmds.indexOf(q.get('view'));
    if (idx >= 0) G.__menuGo = idx;
  }
})();
