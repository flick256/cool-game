/* data.js tests + rough balance table.
 *   NODE_PATH=$(npm root -g) node tests/data_test.js [--table]
 * Checks: validate() empty, every KNOWN item/troop/actor/shop exists, no NaN stats,
 * runtime party API smoke test. Prints a per-troop balance table (basic attacks,
 * weakness exploited / not exploited / with sustained boost) for tuning.
 */
const { open } = require('../tools/page_harness');

// Party plan per troop: [party level, party size, equipment tier]
const PLAN = {
  tutorial: [2, 1, 1], wood_1: [3, 1, 1], wood_2: [3, 1, 1], wood_3: [4, 1, 1], wood_4: [4, 1, 1], boss_stag: [6, 1, 1],
  city_1: [7, 2, 2], city_2: [7, 2, 2], city_3: [8, 2, 2],
  under_1: [8, 3, 2], under_2: [8, 3, 2], under_3: [9, 3, 2], under_4: [9, 3, 2], boss_sentinel: [11, 3, 2],
  aq_1: [12, 3, 2], aq_2: [12, 3, 2], aq_3: [13, 3, 2], aq_4: [13, 3, 2],
  arena_1: [12, 3, 2], arena_2: [13, 3, 2], arena_3: [13, 3, 2], boss_champion: [17, 4, 3],
  crypt_1: [16, 4, 3], crypt_2: [16, 4, 3], crypt_3: [17, 4, 3], crypt_4: [17, 4, 3], boss_choir: [20, 4, 3],
  ww_1: [16, 4, 3], ww_2: [17, 4, 3], ww_3: [17, 4, 3], ww_4: [18, 4, 3], boss_matron: [22, 4, 3],
  ash_1: [21, 4, 3], ash_2: [21, 4, 3], ash_3: [22, 4, 3], ash_4: [23, 4, 3], boss_hale: [26, 4, 3],
  spire_1: [26, 4, 4], spire_2: [27, 4, 4], spire_3: [27, 4, 4], spire_4: [27, 4, 4], spire_5: [28, 4, 4],
  boss_elowen: [31, 4, 4], boss_vael1: [33, 4, 4], boss_vael2: [35, 4, 4],
};
// Target "rounds to kill" (basic attacks, weakness exploited): normal 3-5, boss 5-10.
const PARTY_ORDER = ['rowan', 'claret', 'caspian', 'rook'];

(async () => {
  const h = await open(['js/data.js']);
  const out = await h.page.evaluate((args) => {
    const { PLAN, PARTY_ORDER } = args;
    const KNOWN = window.KNOWN;
    const fails = [];
    const check = (c, m) => { if (!c) fails.push(m); };

    // 1. validate + KNOWN cross-check
    const problems = G.data.validate();
    problems.forEach((p) => fails.push('validate: ' + p));
    ['items', 'troops', 'actors', 'shops'].forEach((k) => {
      KNOWN[k].forEach((id) => {
        const tbl = k === 'items' ? G.data.items : (k === 'troops' ? G.data.troops : (k === 'actors' ? G.data.actors : G.data.shops));
        check(!!tbl[id], 'KNOWN.' + k + ' missing ' + id);
      });
    });
    check(Object.keys(G.data.troops).length >= 45, 'expected 45+ troops');
    check(Object.keys(G.data.enemies).length >= 34, 'expected 34 enemies');

    // 2. NaN / finite stat checks
    const finite = (v) => typeof v === 'number' && isFinite(v);
    Object.values(G.data.actors).forEach((a) => {
      check(a.learn.length >= 8 && a.learn.length <= 10, a.id + ' learn length');
      for (let lv = 1; lv <= 30; lv++) {
        const s = G.party.calcStats(a.id, lv, a.equip);
        Object.keys(s).forEach((k) => check(finite(s[k]), 'NaN stat ' + a.id + ' L' + lv + ' ' + k));
      }
    });
    Object.values(G.data.enemies).forEach((e) => {
      Object.keys(e.stats).forEach((k) => check(finite(e.stats[k]), 'NaN enemy stat ' + e.id + ' ' + k));
      check(finite(e.hp) && e.hp > 0, 'enemy hp ' + e.id);
    });
    for (let L = 1; L <= 30; L++) check(finite(G.data.expFor(L)), 'NaN expFor ' + L);
    const exp = [];
    for (let L = 1; L <= 30; L++) exp.push(G.data.expFor(L));

    // 3. runtime API smoke test
    G.newGame('Tester');
    const S = G.state;
    check(S.roster.rowan && S.roster.rowan.level === 3, 'rowan starts at L3');
    check(S.inventory.potion === 3 && S.inventory.ether === 1, 'starting potions');
    check(G.party.members().join() === 'rowan', 'party starts with rowan');
    check(G.party.useItem('potion', 'rowan') === true && G.party.count('potion') === 2, 'useItem potion');
    check(G.party.useItem('bp_tonic', 'rowan') === false, 'battle-only item refused in menu');
    G.party.addItem('phoenix_down', 1);
    G.party.join('claret');
    check(G.party.members().indexOf('claret') >= 0, 'join claret');
    check(S.roster.claret.level >= 5, 'claret join level >= joinLevel 5 (got ' + S.roster.claret.level + ')');
    check(G.party.equip('claret', 'weapon', 'axe_1') === false, 'equip fails when item not in inventory');
    G.party.addItem('axe_1', 1);
    check(G.party.equip('claret', 'weapon', 'axe_1') === true, 'claret equips axe_1');
    check(G.party.weaponTypesOf('claret').join() === 'axe', 'claret weapon types after axe');
    check(G.party.equip('rowan', 'armor', 'mail_1') === false, 'rowan cannot wear mail');
    check(G.party.equip('rowan', 'weapon2', 'bow_1') === false, 'rowan weapon2 bow refused (no bow type)');
    G.party.join('rook', 1);
    check(G.party.equip('rook', 'weapon2', 'bow_1') === false, 'bow_1 not in inventory yet');
    G.party.addItem('bow_1', 1);
    check(G.party.equip('rook', 'weapon2', 'bow_1') === true, 'rook equips bow_1 in weapon2');
    check(G.party.weaponTypesOf('rook').join() === 'dagger,bow', 'rook weapon types dagger+bow');
    check(G.party.equip('rook', 'weapon2', null) === true && G.party.count('bow_1') === 1, 'unequip returns item');
    const lv = G.party.gainExp('rowan', 5000);
    check(lv.length >= 5, 'gainExp gives multiple level-ups (got ' + lv.length + ')');
    check(G.party.actor('rowan').level === 30 || G.party.actor('rowan').level > 3, 'rowan levelled');
    const sk = G.party.skills('rowan');
    check(sk.indexOf('kindle_spark') >= 0, 'rowan has kindle_spark at high level');
    check(sk.indexOf('bond_claret') < 0, 'bond_claret needs partner tier (G.romance absent -> tier 0)');
    check(G.data.describeSkill('wickcutter').line.length > 0, 'describeSkill');
    check(G.data.skillIcons('bond_claret').indexOf('heart') >= 0, 'bond icon');
    check(G.data.itemsByType('gift').length === 16, 'gift count 16 (' + G.data.itemsByType('gift').length + ')');
    check(G.party.leave('rowan') === false, 'rowan cannot leave');
    G.party.setParty(['claret', 'rowan', 'nobody']);
    check(G.party.members()[0] === 'rowan', 'setParty keeps rowan first');
    G.party.healAll();
    check(S.roster.rowan.hp === G.party.stats('rowan').mhp, 'healAll');

    // 4. balance table
    const armorClassOf = (aid) => G.data.items[G.data.actors[aid].equip.armor].armorClass;
    const wtOf = (aid) => G.data.items[G.data.actors[aid].equip.weapon].weaponType;
    const rows = [];
    const dmgVs = (m, e, exploit) => {
      const base = Math.max(1, 2 * m.patk - 0.9 * e.pdef);
      const weak = exploit && e.weak.indexOf(m.wt) >= 0 ? 1.2 : 1;
      const crit = 1 + (m.crit / 100) * 0.5;
      return base * weak * crit * (1 - e.eva / 100);
    };
    const sim = (enemies, party, exploit, boost) => {
      const E = enemies.map((e) => ({ ...e, cur: e.hp }));
      const M = party.map((m) => ({ ...m, cur: m.hp }));
      let ei = -1, mi = -1, kill = null, wipe = null;
      for (let round = 1; round <= 120; round++) {
        for (const m of M) {
          if (m.cur <= 0) continue;
          for (let k = 0; k < (boost ? 2 : 1); k++) {
            if (!E.some((e) => e.cur > 0)) break;
            do { ei = (ei + 1) % E.length; } while (E[ei].cur <= 0);
            E[ei].cur -= dmgVs(m, E[ei], exploit);
          }
        }
        if (E.every((e) => e.cur <= 0)) { kill = round; break; }
        for (const e of E) {
          if (e.cur <= 0 || M.every((m) => m.cur <= 0)) continue;
          do { mi = (mi + 1) % M.length; } while (M[mi].cur <= 0);
          M[mi].cur -= Math.max(1, 2 * e.patk - 0.9 * M[mi].pdef);
        }
        if (M.every((m) => m.cur <= 0)) { wipe = round; break; }
      }
      return { kill: kill || 999, wipe: wipe || 999 };
    };

    for (const tid of Object.keys(G.data.troops)) {
      const plan = PLAN[tid]; if (!plan) continue;
      const [pl, n, tier] = plan;
      const t = G.data.troops[tid];
      const enemies = t.enemies.map((eid) => G.data.enemies[eid]);
      const party = PARTY_ORDER.slice(0, n).map((aid) => {
        const eq = { weapon: wtOf(aid) + '_' + tier, weapon2: null, armor: armorClassOf(aid) + '_' + tier, accessory: null };
        const s = G.party.calcStats(aid, pl, eq);
        return { id: aid, patk: s.patk, pdef: s.pdef, crit: s.crit, wt: wtOf(aid), hp: s.mhp };
      });
      const eSim = enemies.map((e) => ({ hp: e.hp, pdef: e.stats.pdef, patk: e.stats.patk, eva: e.stats.eva, weak: e.weak }));
      const exp = sim(eSim, party, true, false);
      const nowk = sim(eSim, party, false, false);
      const boost = sim(eSim, party, true, true);
      const wipe = sim(eSim, party, true, false).wipe;
      const isBoss = !!enemies.some((e) => e.boss);
      const hpSum = enemies.reduce((a, e) => a + e.hp, 0);
      const flag = isBoss ? (exp.kill < 5 || exp.kill > 10) : (exp.kill < 3 || exp.kill > 5);
      rows.push({ tid, lvl: pl, party: n + 'x' + tier, hp: hpSum, kill: exp.kill, nowk: nowk.kill, boost: boost.kill, wipe, boss: isBoss, flag });
    }
    return { fails, rows, exp, problemsCount: problems.length };
  }, { PLAN, PARTY_ORDER });

  const fails = out.fails.slice();
  h.errors.forEach((e) => fails.push('[page] ' + e));
  const pad = (v, n) => String(v).padStart(n);
  const lpad = (v, n) => String(v).padEnd(n);
  console.log('\nBALANCE (rounds to kill a troop; basic attacks. exploit = weakness hit x1.2; boost = sustained +1 hit/round)');
  console.log(lpad('troop', 14) + lpad('lv', 5) + lpad('party', 8) + pad('enemyHP', 9) + pad('exploit', 9) + pad('noweak', 8) + pad('boost', 7) + pad('wipe', 7) + '  note');
  for (const r of out.rows) {
    console.log(lpad(r.tid, 14) + pad(r.lvl, 5) + '  ' + lpad(r.party, 6) + pad(r.hp, 9) + pad(r.kill, 9) + pad(r.nowk, 8) + pad(r.boost, 7) + pad(r.wipe, 7) + '  ' + (r.flag ? '<-- tune (target ' + (r.boss ? '5-10' : '3-5') + ')' : ''));
  }
  const flagged = out.rows.filter((r) => r.flag).length;
  console.log('\nflagged rows (exploit-round target): ' + flagged + ' / ' + out.rows.length);
  if (fails.length) { console.log('\nFAILURES (' + fails.length + '):'); fails.forEach((f) => console.log('  - ' + f)); }
  else console.log('\nAll data checks passed (validate() empty, KNOWN ids present, no NaN, party API smoke test ok).');
  await h.browser.close(); h.cleanup();
  process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
