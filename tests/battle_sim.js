#!/usr/bin/env node
/* Headless balance check for battle.js using the real data.js.
 *   NODE_PATH=$(npm root -g) node tests/battle_sim.js [troopId ...] [--party rowan,claret] [--level 5] [--seeds 20]
 * Prints win rate and average rounds per troop. */
const { open } = require('../tools/page_harness');
const args = process.argv.slice(2);
const opt = { party: 'rowan', level: 0, seeds: 20 };
const troops = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--party') opt.party = args[++i];
  else if (args[i] === '--level') opt.level = +args[++i];
  else if (args[i] === '--seeds') opt.seeds = +args[++i];
  else troops.push(args[i]);
}
(async () => {
  const h = await open(['js/data.js', 'js/battle.js']);
  const res = await h.page.evaluate((o) => {
    G.newGame('Rowan');
    const ids = o.party.split(',');
    ids.slice(1).forEach((id) => G.party.join(id, o.level || undefined));
    if (o.level) Object.keys(G.state.roster).forEach((id) => G.party.setLevel(id, o.level));
    G.party.healAll();
    const list = o.troops.length ? o.troops : Object.keys(G.data.troops);
    const out = [];
    for (const t of list) {
      let win = 0, rounds = 0, timeouts = 0;
      for (let s = 1; s <= o.seeds; s++) {
        const r = G.battleSim(t, ids, { seed: s * 7919 + 13 });
        if (r.result === 'win') win++; if (r.result === 'timeout') timeouts++; rounds += r.rounds;
      }
      out.push({ t, winRate: win / o.seeds, avgRounds: +(rounds / o.seeds).toFixed(1), timeouts });
    }
    return out;
  }, Object.assign({}, opt, { troops }));
  for (const r of res) console.log(r.t.padEnd(16), 'win ' + Math.round(r.winRate * 100) + '%', 'rounds ' + r.avgRounds, r.timeouts ? 'TIMEOUTS ' + r.timeouts : '');
  h.errors.slice(0, 20).forEach((e) => console.log('[page] ' + e));
  await h.browser.close(); h.cleanup();
  process.exit(h.errors.length ? 1 : 0);
})();
