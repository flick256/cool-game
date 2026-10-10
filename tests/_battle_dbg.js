const { open } = require('../tools/page_harness');
(async () => {
  const h = await open(['js/data.js', 'js/battle.js']);
  console.log('opened');
  const step = process.argv[2];
  const r = await h.page.evaluate((step) => {
    G.newGame('Rowan'); G.party.healAll();
    if (step === 'setup') { const s = G.battle.setupUnits('boss_stag', ['rowan']); return 'setup ok ' + s.enemies.length; }
    if (step === 'sim') { const r = G.battleSim('boss_stag', ['rowan'], { seed: 99 }); return r.result + ' ' + r.rounds; }
    if (step === 'simlog') { const r = G.battleSim('boss_stag', ['rowan'], { seed: 99, log: true }); return r.result + ' ' + r.events.length; }
  }, step);
  console.log(step, '=>', r);
  await h.browser.close(); h.cleanup();
})();
