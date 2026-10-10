const { open } = require('../tools/page_harness');
(async () => {
  const h = await open(['js/data.js', 'js/battle.js']);
  const out = await h.page.evaluate(() => {
    G.newGame('Rowan'); G.party.healAll();
    const r = G.battleSim('boss_stag', ['rowan'], { seed: 99, log: true });
    const n = (u) => u ? u.name + '(' + u.side[0] + ' hp' + u.hp + '/' + u.mhp + (u.broken ? ' BROKE' : '') + ')' : '';
    const lines = r.events.map((e) => {
      if (e.type === 'turn') return 'TURN ' + n(e.unit) + ' -> ' + (e.action.skill ? e.action.skill.id : e.action.kind) + ' ' + (e.action.targets || []).map(n).join(',');
      if (e.type === 'hit') return '  hit ' + n(e.unit) + ' for ' + e.amount + (e.weak ? ' WEAK' : '') + (e.crit ? ' CRIT' : '');
      return '  ' + e.type + (e.unit ? ' ' + n(e.unit) : '');
    });
    return { result: r.result, rounds: r.rounds, lines: lines.slice(0, 90), enemy: G.battle.makeEnemyUnit('hollow_stag').stats, party: G.battle.makePartyUnit('rowan').stats };
  });
  console.log(JSON.stringify(out.enemy), JSON.stringify(out.party));
  console.log(out.result, out.rounds);
  console.log(out.lines.join('\n'));
  h.errors.forEach((e) => console.log('[page] ' + e));
  await h.browser.close(); h.cleanup();
})();
