#!/usr/bin/env node
/* Headless scene test for the battle scene (real modules, scripted key presses).
 *   NODE_PATH=$(npm root -g) node tests/battle_scene.js [troopId] [outDir] [--party rowan,claret]
 * Auto-plays one battle through G.input and saves screenshots at key moments. */
const path = require('path');
const fs = require('fs');
const { open } = require('../tools/page_harness');
const args = process.argv.slice(2);
const pos = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--party');
const troop = pos[0] || 'wood_4';
const outDir = pos[1] || '/tmp/battle_shots';
const pIdx = args.indexOf('--party');
const partyList = pIdx >= 0 ? args[pIdx + 1].split(',') : ['rowan', 'claret'];
fs.mkdirSync(outDir, { recursive: true });

(async () => {
  const files = ['js/gfx_ui.js', 'js/gfx_world.js', 'js/gfx_battle.js', 'js/audio.js', 'js/data.js', 'js/ui.js', 'js/romance.js', 'js/battle.js'];
  const h = await open(files);
  const p = h.page;
  await p.evaluate((pl) => {
    G.newGame('Rowan');
    pl.slice(1).forEach((id) => G.party.join(id, 6));
    Object.keys(G.state.roster).forEach((id) => G.party.setLevel(id, 6));
    G.party.healAll();
    G.state.inventory.potion = 3;
    G.scenes.register('bottom', () => ({ opaque: true, draw(c) { c.fillStyle = '#222'; c.fillRect(0, 0, 640, 480); }, update() {} }));
    G.scenes.replace('bottom', {});
  }, partyList);
  await p.evaluate((t) => {
    window.__res = null; window.__got = {};
    G.script.run(async (c) => { window.__res = await c.battle(t, { canEscape: true }); });
  }, troop);

  const shots = [];
  const snap = async (name) => { const f = path.join(outDir, troop + '_' + name + '.png'); await p.locator('canvas#game').screenshot({ path: f }); shots.push(name); };

  // page-side driver: advances up to n frames; stops early when a shot-worthy state appears
  // (returns {why}) so Node can take a screenshot; otherwise presses the sensible buttons.
  const drive = (n) => p.evaluate((n) => {
    const got = window.__got;
    let why = null;
    for (let i = 0; i < n && why === null; i++) {
      if (window.__res !== null) { why = 'done'; break; }
      G.advance(1);
      const s = G.scenes.top();
      if (!s || s.name !== 'battle') { why = 'scene'; break; }
      if (s.big && s.big.text === 'BREAK!' && !got.break) { got.break = true; why = 'break'; break; }
      if (s.big && s.big.text === 'VICTORY!' && !got.victory) { got.victory = true; why = 'victory'; break; }
      if (s.big && s.big.text === 'DEFEATED' && !got.defeat) { got.defeat = true; why = 'defeat'; break; }
      const m = s.menu;
      if (!m || m.ready > 0 || G.ui.modal) continue;
      if (m.kind === 'list' && m.mode === 'cmd' && !got.menu) { got.menu = true; why = 'menu'; break; }
      if (m.kind === 'target' && !got.target) { got.target = true; why = 'target'; break; }
      if (m.kind === 'list' && m.mode === 'sub' && !got.sub) { got.sub = true; why = 'sub'; break; }
      if (m.kind === 'ack' && !got.ack) { got.ack = true; why = 'ack'; break; }
      // choose: attack (cursor 0) normally; boost once when BP allows
      let btn = 'ok';
      if (m.kind === 'list' && m.mode === 'cmd') {
        if (s.actor && s.actor.bp >= 2 && s.boost === 0 && !got.boostedRound || (s.actor && s.actor.bp >= 3 && s.boost < 2)) {
          got.boostedRound = s.round; G.input.press('boost'); G.advance(2); G.input.release('boost'); G.advance(2); continue;
        }
        if (m.cursor !== 0) btn = 'up';
      }
      // cycle the target cursor once, then confirm (keeps the driver from looping on a single menu)
      if (m.kind === 'target' && m.cands.length > 1 && !m.__moved) { m.__moved = true; G.input.press('down'); G.advance(2); G.input.release('down'); G.advance(2); continue; }
      if (m.kind === 'list' && m.mode === 'cmd' && btn === 'up') { G.input.press('up'); G.advance(2); G.input.release('up'); G.advance(2); continue; }
      G.input.press('ok'); G.advance(2); G.input.release('ok'); G.advance(2);
    }
    const s = G.scenes.top();
    return { why, res: window.__res, scene: s ? s.name : null, round: s && s.round,
      menu: s && s.menu ? s.menu.kind + '/' + (s.menu.mode || '') : null, big: s && s.big ? s.big.text : null,
      fx: s && s.fxs ? s.fxs.length : 0 };
  }, n);

  await p.evaluate(() => G.advance(70));
  await snap('intro');
  let r = null, guard = 0;
  while (guard++ < 3000) {
    r = await drive(120);
    if (r.why === 'done' || r.why === 'scene') break;
    if (r.why === 'menu') await snap('menu');
    else if (r.why === 'target') await snap('target');
    else if (r.why === 'sub') await snap('submenu');
    else if (r.why === 'break') await snap('break');
    else if (r.why === 'victory') await snap('victory');
    else if (r.why === 'defeat') await snap('defeat');
    else if (r.why === 'ack') await snap('rewards');
  }
  const final = await p.evaluate(() => ({ res: window.__res, scene: G.scenes.top() ? G.scenes.top().name : null,
    roster: Object.keys(G.state.roster).map((id) => [id, G.state.roster[id].level, G.state.roster[id].exp, G.state.roster[id].hp]),
    gold: G.state.gold, battles: G.state.battles, inv: G.state.inventory }));
  console.log('result:', JSON.stringify(final));
  console.log('shots:', shots.join(', '), '->', outDir);
  const errs = h.errors.filter((e) => !/Failed to load resource/.test(e));
  errs.slice(0, 30).forEach((e) => console.log('[page] ' + e));
  await h.browser.close(); h.cleanup();
  process.exit(errs.length ? 1 : 0);
})();
