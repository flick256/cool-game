#!/usr/bin/env node
/* Scratch test for js/romance.js + js/hub.js (romance owner). Not part of the game.
 *   NODE_PATH=$(npm root -g) node tests/romance_check.js [--shots /path/to/dir]
 */
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const shotDir = args.indexOf('--shots') >= 0 ? args[args.indexOf('--shots') + 1] : null;
const root = path.resolve(__dirname, '..');

// same as tools/page_harness.js but declares UTF-8 (the game's index.html does), so ♥ — … − survive
async function openPage(files, extra) {
  const scripts = ['js/core.js', 'js/tiles.js', 'js/mapbuilder.js', 'tools/known.js', 'tools/stubs.js'].concat(extra || []).concat(files);
  const html = '<!DOCTYPE html><html><head><meta charset="utf-8"></head><body><canvas id="game"></canvas>' +
    scripts.map((s) => '<script src="file://' + path.resolve(root, s) + '"></script>').join('') + '</body></html>';
  const tmp = path.join(root, 'tests', '_romance_harness_' + process.pid + '.html');
  fs.writeFileSync(tmp, html);
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 640, height: 480 } });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('PAGEERROR ' + (e.stack || e.message)));
  await page.goto('file://' + tmp);
  await page.evaluate(() => { G.paused = true; });
  return { page, browser, errors, cleanup: () => { try { fs.unlinkSync(tmp); } catch (e) { /* ignore */ } } };
}

(async () => {
  const h = await openPage(['js/romance.js', 'js/hub.js'], ['tests/romance_stub.js']);
  const page = h.page;
  const res = await page.evaluate(async () => {
    const out = []; const ok = (name, cond, extra) => out.push({ name, pass: !!cond, extra: cond ? '' : JSON.stringify(extra === undefined ? null : extra) });
    const R = G.romance;
    const tick = () => new Promise((r) => setTimeout(r, 0));
    // drive frames until a promise settles (scripts await G.wait)
    async function settle(p, max) {
      let done = false, val; p.then((v) => { done = true; val = v; }, (e) => { done = true; val = 'ERR ' + e; });
      for (let i = 0; i < (max || 400) && !done; i++) { G.advance(1); await tick(); await tick(); }
      return { done, val };
    }
    const press = (b) => { G.input.press(b); G.advance(1); G.input.release(b); G.advance(1); };
    const logHas = (s) => G.__log.some((l) => l.indexOf(s) >= 0);
    const logClear = () => { G.__log.length = 0; };

    G.newGame('Rowan');
    G.state.roster.claret = { id: 'claret', level: 3 };
    G.state.roster.wren = { id: 'wren', level: 3 };
    G.state.party = ['rowan', 'claret'];
    G.state.chapter = 0;

    // ---- points & tiers
    R.add('claret', 14); ok('add 14 stays Companion', R.tier('claret') === 0 && R.get('claret') === 14, R.get('claret'));
    R.add('claret', 1); ok('15 becomes Friend', R.tier('claret') === 1 && R.tierName('claret') === 'Friend');
    R.add('claret', 25); ok('40 becomes Close', R.tier('claret') === 2);
    R.add('claret', 25); ok('65 becomes Devoted', R.tier('claret') === 3);
    R.add('claret', 100); ok('points clamp at 100', R.get('claret') === 100);
    R.add('caspian', -5); ok('points clamp at 0', R.get('caspian') === 0);
    R.setLover('claret'); ok('lover is tier 4 Beloved', R.tier('claret') === 4 && R.tierName('claret') === 'Beloved' && R.lover() === 'claret');
    ok('eligible includes lover', R.eligible().indexOf('claret') >= 0);
    R.setLover(null); R.add('claret', -100); ok('negative clamp & lover unset', R.get('claret') === 0 && R.tier('claret') === 0);

    // ---- gifts
    G.state.inventory = { brass_cog: 2, sweet_bun: 2, lavender_sachet: 1, ember_wine: 1, old_book: 0, moonpetal: 1, potion: 1 };
    R.add('claret', 0);
    ok('pref table: claret loves brass_cog', JSON.stringify(R.giftPrefs('claret').loves) === JSON.stringify(['brass_cog', 'wild_honey']));
    ok('giveGift love', R.giveGift('claret', 'brass_cog') === 'love' && R.get('claret') === 8, R.get('claret'));
    ok('consumes item', G.state.inventory.brass_cog === 1, G.state.inventory);
    ok('second gift same chapter = full', R.giveGift('claret', 'wild_honey') === 'full' && !R.canGift('claret'));
    ok('not owned = none', R.giveGift('rook', 'old_book') === 'none');
    ok('rook likes sweet_bun = like (+4)', R.giveGift('rook', 'sweet_bun') === 'like' && R.get('rook') === 4, R.get('rook'));
    ok('seraphine loves lavender = love', R.giveGift('seraphine', 'lavender_sachet') === 'love');
    ok('wren dislikes sweet_bun = dislike (no negative below 0)', R.giveGift('wren', 'sweet_bun') === 'dislike' && R.get('wren') === 0, R.get('wren'));
    ok('caspian neutral moonpetal = +1', R.giveGift('caspian', 'moonpetal') === 'neutral' && R.get('caspian') === 1);
    ok('caspian dislikes ember_wine', R.giveGift('caspian', 'ember_wine') === 'full');
    G.state.romance.gifts = {}; // chapter reset
    ok('gift allowance resets', R.canGift('caspian') && R.giveGift('caspian', 'ember_wine') === 'dislike', R.get('caspian'));
    ok('caspian -3 clamped at 0 after 1', R.get('caspian') === 0, R.get('caspian'));

    // ---- journal
    G.state.chapter = 0; R.addJournal('A quiet beginning.');
    ok('journal prefix prologue', R.journal().slice(-1)[0] === 'Prologue — A quiet beginning.', R.journal().slice(-1)[0]);
    G.state.chapter = 2; R.addJournal('Claret admitted she is afraid of heights.');
    ok('journal prefix Ch2', R.journal().slice(-1)[0] === 'Ch2 — Claret admitted she is afraid of heights.', R.journal().slice(-1)[0]);
    R.addJournal('Ch3 — already prefixed.');
    ok('no double prefix', R.journal().slice(-1)[0] === 'Ch3 — already prefixed.', R.journal().slice(-1)[0]);

    // ---- scenes
    const bad = R.registerScene({ id: 'bad_no_run' });
    ok('registerScene without run returns null (no throw)', bad === null);
    let ranTalk = 0;
    R.registerScene({ id: 't_b1', actor: 'claret', minTier: 1, minChapter: 1, kind: 'bond', journal: 'Claret and you talked on the deck.',
      run: async (c) => { ranTalk++; await c.say('Claret', 'Hello.'); } });
    R.registerScene({ id: 't_b2', actor: 'claret', minTier: 2, minChapter: 2, kind: 'bond', run: async () => { ranTalk++; } });
    R.registerScene({ id: 't_inn', actor: 'claret', minTier: 0, minChapter: 0, kind: 'inn', once: false, run: async () => { ranTalk++; } });
    R.registerScene({ id: 't_conf', actor: 'claret', minTier: 3, kind: 'confession', run: async () => {} });
    ok('scene registry', R.scene('t_b1') && R.scenes().length >= 4);
    G.state.chapter = 0; R.add('claret', 0);
    let av = R.available('claret').map((s) => s.id);
    ok('available: inn only in chapter 0 (no bond gates met)', av.join() === 't_inn', av);
    G.state.chapter = 1;
    av = R.available('claret').map((s) => s.id);
    ok('available: b1 opens at chapter 1 with Friend+', av.indexOf('t_b1') < 0 && av.indexOf('t_inn') >= 0, av);
    R.add('claret', 15); // Friend
    av = R.available('claret').map((s) => s.id);
    ok('b1 available when Friend & chapter 1', av.indexOf('t_b1') >= 0, av);
    ok('confession kind is not in available', av.indexOf('t_conf') < 0);
    ok('b2 locked (needs Close)', av.indexOf('t_b2') < 0);
    const logBefore = G.__log.length; logClear(); G.__log.length = 0;
    const d1 = settle(R.runScene('t_b1'));
    const r1 = await d1;
    ok('runScene completes', r1.done === true);
    ok('runScene marks seen', R.seen('t_b1') === true);
    ok('bond scene plays romance bgm', logHas('bgm:romance'), G.__log);
    ok('restores previous bgm', logHas('bgm:marigold'), G.__log);
    ok('scene journal line added', R.journal().slice(-1)[0] === 'Ch1 — Claret and you talked on the deck.', R.journal().slice(-1)[0]);
    ok('scene ran once', ranTalk === 1, ranTalk);
    av = R.available('claret').map((s) => s.id);
    ok('seen scene no longer available', av.indexOf('t_b1') < 0, av);
    await settle(R.runScene('t_inn')); await settle(R.runScene('t_inn'));
    ok('once:false scene stays available', R.available('claret').map((s) => s.id).indexOf('t_inn') >= 0);
    ok('unknown scene warns, no throw', (await settle(R.runScene('nope'))).done === true);

    // ---- bond trickle (3 per partner per chapter)
    G.state.chapter = 4;
    const tr = [R.bondTrickle('claret'), R.bondTrickle('claret'), R.bondTrickle('claret'), R.bondTrickle('claret')];
    ok('bondTrickle cap 3 per chapter', tr.join() === 'true,true,true,false', tr);
    G.state.chapter = 5;
    ok('bondTrickle resets next chapter', R.bondTrickle('claret') === true);

    // ---- afterRest
    G.state.chapter = 2; R.add('claret', 0);
    R.registerScene({ id: 't_rest', actor: 'claret', minTier: 0, minChapter: 0, kind: 'inn', run: async (c) => { await c.say('Claret', 'Night.'); } });
    G.__log.length = 0;
    const realRand = Math.random;
    Math.random = () => 0.1;
    const ranBefore = ranTalk;
    const ar1 = await settle(R.afterRest());
    ok('afterRest runs an inn chat at 30% roll', ar1.done && logHas('narrate:…you hear soft footsteps outside the room.') && ranTalk > ranBefore, G.__log.slice(-6));
    Math.random = () => 0.9;
    G.__log.length = 0;
    R.registerScene({ id: 't_rest2', actor: 'claret', minTier: 0, minChapter: 0, kind: 'inn', run: async () => {} });
    await settle(R.afterRest());
    ok('afterRest skips when roll fails', !logHas('narrate:'), G.__log);
    Math.random = realRand;

    // ---- affection command
    G.ui.toasts.length = 0; G.state.romance.points.wren = 10;
    await settle(G.script.run((c) => c.affection('wren', 3, 'Shared a quiet moment.')));
    ok('affection toast +', G.ui.toasts.indexOf('♥ Wren Alder +3') >= 0, G.ui.toasts);
    await settle(G.script.run((c) => c.affection('wren', -2)));
    ok('affection toast negative', G.ui.toasts.indexOf('Wren Alder −2') >= 0, G.ui.toasts);
    ok('affection journal reason', R.journal().slice(-1)[0].indexOf('Shared a quiet moment.') >= 0, R.journal().slice(-1)[0]);

    // ---- chapterEnd
    G.state.chapter = 0; G.state.flags = {};
    G.state.romance.gifts = { claret: 1 };
    G.__log.length = 0; G.ui.toasts.length = 0;
    const ce = await settle(G.script.run((c) => c.chapterEnd(1)), 600);
    ok('chapterEnd completes', ce.done === true, ce);
    ok('ch1_done & marigold_ready set', G.flag('ch1_done') && G.flag('marigold_ready'));
    ok('chapter becomes 1', G.state.chapter === 1);
    ok('gift flags reset', Object.keys(G.state.romance.gifts).length === 0);
    ok('title card uses chapter title', logHas('title:Brass & Steam / Chapter 1 Complete'), G.__log);
    ok('transfers to marigold_deck', logHas('transfer:marigold_deck'), G.__log);
    ok('heals party', logHas('healAll'));
    ok('someone wants to talk toast', G.ui.toasts.indexOf('Someone wants to talk…') >= 0, G.ui.toasts);
    G.state.chapter = 0; G.state.flags = {};
    G.__log.length = 0; G.ui.toasts.length = 0;
    const savedRoster = G.state.roster; G.state.roster = {};
    await settle(G.script.run((c) => c.chapterEnd(3, { to: 'pale_abbey' })), 600);
    ok('chapterEnd honours opts.to', logHas('transfer:pale_abbey'), G.__log);
    ok('chapter state uses max()', G.state.chapter === 3);
    ok('no toast when nobody is ready', G.ui.toasts.indexOf('Someone wants to talk…') < 0, G.ui.toasts);
    G.state.roster = savedRoster;
    G.state.chapter = 1;

    // ---- gift menu (scene + reaction)
    G.state.romance.gifts = {}; G.state.inventory = { brass_cog: 1, sweet_bun: 1 };
    G.__log.length = 0;
    const gm = settle(R.openGiftMenu('claret'));
    G.advance(1);
    ok('gift scene pushed', G.scenes.top() && G.scenes.top().name === 'giftmenu');
    press('ok');
    const gmRes = await gm;
    ok('gift menu resolves with kind', gmRes.val === 'love', gmRes);
    ok('reaction line spoken in Claret voice', G.__log.some((l) => l.indexOf('say:Claret Vane:') === 0 && l.indexOf('[claret]') > 0), G.__log.slice(-3));
    ok('gift menu popped', !(G.scenes.top() && G.scenes.top().name === 'giftmenu'));
    G.__log.length = 0;
    const gm2 = settle(R.openGiftMenu('claret'));
    await gm2;
    ok('already gifted -> full line, no menu', logHas('say:Claret Vane'), G.__log);

    // cancel path
    G.state.romance.gifts = {}; G.state.inventory = { sweet_bun: 1 };
    const gm3 = settle(R.openGiftMenu('rook'));
    G.advance(1); press('cancel');
    ok('gift cancel resolves null', (await gm3).val === null);

    // ---- sky chart: locks and travel
    G.state.flags = {}; G.setFlag('marigold_ready', true); G.setFlag('ch1_done', true); G.setFlag('sky_at', 'brasshaven');
    G.state.map.id = 'marigold_deck';
    G.__log.length = 0;
    const sc = settle(G.script.run((c) => c.skychart()));
    G.advance(1);
    ok('skychart pushed', G.scenes.top() && G.scenes.top().name === 'skychart');
    // move to Lumen Vale (index 4): from brasshaven(1): right x3 -> gladius(2), abbey(3), lumen(4)
    press('right'); press('right'); press('right');
    press('ok');
    ok('locked destination does not travel', G.scenes.top() && G.scenes.top().name === 'skychart');
    press('cancel');
    const scCancel = await sc;
    ok('cancel closes chart with no transfer', scCancel.done && !logHas('transfer:'), G.__log);
    G.__log.length = 0;
    G.setFlag('ch2_done', true); G.setFlag('ch3_done', true);
    const sc2 = settle(G.script.run((c) => c.skychart()), 600);
    G.advance(1);
    press('right'); press('right'); press('right'); // lumen_vale now open
    press('ok');
    for (let i = 0; i < 140; i++) G.advance(1);
    const sc2r = await sc2;
    ok('travel transfers to lumen_vale', sc2r.done && logHas('transfer:lumen_vale'), G.__log);
    ok('sky_at updated', G.flag('sky_at') === 'lumen_vale', G.flag('sky_at'));

    // ---- bonds scene (menu)
    G.state.romance.points = { claret: 62, caspian: 0, rook: 20, seraphine: 40, wren: 15 };
    G.state.romance.lover = 'claret';
    G.state.romance.journal = ['Prologue — You arrived.', 'Ch1 — Claret found the bent propeller.', 'Ch2 — Rook bought a round.'];
    G.state.roster.seraphine = { id: 'seraphine', level: 3 };
    G.state.chapter = 2;
    G.scenes.push('bonds', {});
    G.advance(3);
    ok('bonds scene on top', G.scenes.top().name === 'bonds');
    press('down'); press('up'); press('up');
    ok('no crash navigating bonds', true);
    press('pagedown');
    G.advance(2);
    press('down');
    press('cancel');
    ok('cancel pops bonds', !(G.scenes.top() && G.scenes.top().name === 'bonds'));

    // the page is alive
    return { results: out, log: G.__log.slice(-5), errors: [] };
  });
  let fail = 0;
  for (const r of res.results) { console.log((r.pass ? '  ok   ' : '  FAIL ') + r.name + (r.pass ? '' : '  ' + r.extra)); if (!r.pass) fail++; }
  console.log(`${res.results.length - fail}/${res.results.length} passed`);
  h.errors.slice(0, 20).forEach((e) => { console.log('[page error] ' + e); fail++; });

  // screenshots of the screens (fallback gfx)
  if (shotDir) {
    fs.mkdirSync(shotDir, { recursive: true });
    const shot = async (name, prep) => {
      await page.evaluate(prep);
      await page.locator('canvas#game').screenshot({ path: path.join(shotDir, name) });
    };
    await page.evaluate(() => { G.scenes.replace('bonds', {}); G.state.romance.points = { claret: 62, caspian: 0, rook: 20, seraphine: 40, wren: 15 }; G.state.romance.lover = 'claret'; G.state.roster.caspian = { id: 'caspian' }; G.state.roster.rook = { id: 'rook' }; G.advance(4); });
    await shot('bonds_list.png', () => G.advance(2));
    await shot('bonds_journal.png', () => { G.input.press('pagedown'); G.advance(2); G.input.release('pagedown'); G.advance(4); });
    await page.evaluate(() => { G.scenes.replace('skychart', {}); G.advance(3); });
    await shot('skychart.png', () => G.advance(60));
    await page.evaluate(() => { G.state.flags.sky_at = 'brasshaven'; G.scenes.replace('skychart', {}); G.advance(2); G.input.press('right'); G.advance(1); G.input.release('right'); G.advance(1); G.input.press('ok'); G.advance(1); G.input.release('ok'); G.advance(55); });
    await shot('skychart_travel.png', () => G.advance(2));
    await page.evaluate(() => { G.scenes.replace('bonds', {}); G.input.press('pagedown'); G.advance(2); G.input.release('pagedown'); G.advance(2); });
    await page.evaluate(() => { G.state.inventory = { brass_cog: 2, sweet_bun: 1, old_book: 1 }; G.state.romance.gifts = {}; G.scenes.replace('bonds', {}); G.advance(2); G.scenes.push('giftmenu', { actorId: 'claret', items: [{ id: 'brass_cog', count: 2 }, { id: 'sweet_bun', count: 1 }, { id: 'old_book', count: 1 }], onDone() {} }); G.advance(3); });
    await shot('gift_menu.png', () => G.advance(2));
  }
  await h.browser.close(); h.cleanup();
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
