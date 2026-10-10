#!/usr/bin/env node
/* Headless checks for js/map.js.   NODE_PATH=$(npm root -g) node tests/map_check.js [--shots dir] */
const path = require('path');
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 640, height: 480 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push('PAGEERROR ' + (e.stack || e.message)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.goto('file://' + path.resolve(__dirname, 'map.html'));

  const results = await page.evaluate(async () => {
    const out = [];
    const check = (name, ok, info) => out.push({ name, ok: !!ok, info: info === undefined ? '' : String(info) });
    const tick = async (n) => { for (let i = 0; i < (n || 1); i++) { G.advance(1); for (let k = 0; k < 4; k++) await null; } };
    const waitFor = async (fn, max) => { for (let i = 0; i < (max || 300); i++) { if (fn()) return true; await tick(1); } return !!fn(); };
    const settle = () => waitFor(() => !G.map.player.moving && !G.script.busy, 400);
    const tap = async (b, frames) => { G.input.press(b); await tick(frames || 1); G.input.release(b); await tick(1); };
    const hold = async (b, frames) => { G.input.press(b); await tick(frames); G.input.release(b); await tick(1); };
    const P = () => G.map.player;
    const tp = async (x, y, dir) => { G.map.teleport(x, y, dir); await tick(2); };
    const logHas = (re) => window.__log.some((s) => re.test(s));
    const logCount = (re) => window.__log.filter((s) => re.test(s)).length;
    const runCmd = async (fn) => { G.script.run(fn); await waitFor(() => !G.script.busy, 1200); await tick(1); };

    // 1. boot, autos, bgm, state
    await tick(70);
    check('boots into test_village', G.scenes.top().name === 'map' && G.map.id === 'test_village', G.map.id);
    check('auto event ran (intro)', G.flag('auto_intro') === true && logHas(/Welcome/));
    check('bgm requested on entry', window.__bgm === 'forest', window.__bgm);
    check('G.state.map saved on entry', G.state.map.id === 'test_village', JSON.stringify(G.state.map));
    check('three followers from party', G.map.followers.length === 2, G.map.followers.length);

    // 2. single tap = exactly one tile + facing
    await tp(10, 15, 'down');
    await tap('right', 1); await settle();
    check('tap right moves exactly one tile and faces right', P().x === 11 && P().y === 15 && P().dir === 'right', P().x + ',' + P().y + ' ' + P().dir);

    // 3. hold-to-walk
    await tp(10, 15, 'down');
    await hold('right', 40); await settle();
    check('hold-walk covers 4-5 tiles in 40 frames', P().x >= 13 && P().x <= 16 && P().y === 15, P().x);

    // 4. collision with an object (fence at y=16)
    await tp(26, 17, 'down');
    await hold('up', 14); await settle();
    check('fence blocks movement, facing kept', P().x === 26 && P().y === 17 && P().dir === 'up', P().x + ',' + P().y + ' ' + P().dir);

    // 5. dash speed (6px/frame -> ~6 frames per tile)
    await tp(20, 22, 'right');
    G.input.press('dash'); G.input.press('right'); await tick(1); G.input.release('right');
    let f = 0; while (P().moving && f < 30) { await tick(1); f++; }
    G.input.release('dash'); await tick(1);
    check('dash step takes ~6 frames', f >= 4 && f <= 7 && P().x === 21, 'frames=' + f + ' x=' + P().x);

    // 6. step counting
    await tp(16, 21, 'down');
    const s0 = G.state.steps;
    await tap('right', 1); await settle(); await tap('right', 1); await settle(); await tap('right', 1); await settle();
    check('G.state.steps counts tiles', G.state.steps - s0 === 3, G.state.steps - s0);

    // 7. step trigger (once)
    await tp(16, 8, 'down');
    await tap('down', 1); await settle(); await tick(10);
    check('step trigger fires on arrival', G.flag('trig_step_test') === true && logHas(/stepped on the trigger/));
    const nTrig = logCount(/stepped on the trigger/);
    await tp(16, 8, 'down'); await tap('down', 1); await settle(); await tick(10);
    check('step trigger is once-only', logCount(/stepped on the trigger/) === nTrig);

    // 8. action on a facing NPC (and it turns to face the player)
    await tp(26, 13, 'up');
    await tap('ok', 1); await settle(); await tick(10);
    check('action on NPC runs its lines', logHas(/Watcher: I see you\./) || logHas(/I see you/));
    check('NPC turns to face the talker', G.map.getEvent('watcher').dir === 'down', G.map.getEvent('watcher').dir);

    // 9. chest: action gives item, sets flag, closed copy disappears
    await tp(20, 13, 'up');
    await tap('ok', 1); await settle(); await tick(10);
    check('chest gives item and sets flag', G.flag('chest_tv_chest') === true && logHas(/item:potion/));
    check('chest visibility swaps (closed off, open on)', !G.map.getEvent('tv_chest').active && G.map.getEvent('tv_chest_open').active);

    // 10. touch bump: fires once per press, re-arms after release
    await tp(22, 7, 'down');
    await hold('up', 30); await settle(); await tick(5);
    const b1 = logCount(/Bonk!/);
    check('bump fires once while holding', b1 === 1, b1);
    await tap('up', 1); await settle(); await tick(10);
    check('bump re-arms after release', logCount(/Bonk!/) === 2, logCount(/Bonk!/));

    // 11. transfer through a door: fade, switch, onEnter, back out
    await tp(7, 9, 'down');
    await tap('up', 1);
    const entered = await waitFor(() => G.map.id === 'test_interior' && !G.script.busy, 400);
    check('door transfer enters interior', entered, G.map.id);
    check('onEnter ran on transfer', G.flag('tint_entered') === true);
    check('player placed at interior spawn', P().x === 6 && P().y === 8, P().x + ',' + P().y);
    check('G.state.map follows the transfer', G.state.map.id === 'test_interior');
    await tap('down', 1);
    const back = await waitFor(() => G.map.id === 'test_village' && !G.script.busy, 400);
    check('exit door returns to village in front of the door', back && P().x === 7 && P().y === 9, G.map.id + ' ' + P().x + ',' + P().y);
    check('bgm changes with the map', window.__bgm === 'forest');

    // 12. followers trail on the same line after a straight walk
    await tp(10, 15, 'right');
    await hold('right', 40); await settle(); await tick(40);
    const p = P(), F = G.map.followers;
    check('followers trail on the follow chain', F.length === 2 && F[0].x === p.x - 1 && F[1].x === p.x - 2 && F[0].y === 15 && F[1].y === 15,
      'p=' + p.x + ' f0=' + F[0].x + ' f1=' + F[1].x);
    await runCmd(async (c) => { await c.follow(false); });
    check('follow(false) switches followers off', G.map.followers.length === 2 && G.map.getEvent('watcher') !== null);

    // 13. random encounters while walking (not while scripts run)
    await tp(20, 25, 'right');
    for (let i = 0; i < 60; i++) { await tap(i % 2 ? 'left' : 'right', 1); await settle(); }
    const nb = logCount(/^battle:wood/);
    check('random encounters fire while walking', nb >= 3, nb);
    check('encounter sfx played', window.__sfx.indexOf('encounter') >= 0);
    check('encounter passes troop bg/bgm', logHas(/bg=forest bgm=battle/));

    // 14. NPC wandering: moves, stays near home
    const w = G.map.getEvent('wanderer');
    const sx = w.x, sy = w.y; let moved = false, maxDx = 0, maxDy = 0;
    for (let i = 0; i < 900; i++) {
      await tick(1);
      if (w.x !== sx || w.y !== sy) moved = true;
      maxDx = Math.max(maxDx, Math.abs(w.x - w.hx)); maxDy = Math.max(maxDy, Math.abs(w.y - w.hy));
    }
    check('wanderer walks around', moved);
    check('wanderer stays near its home tile', maxDx <= 2 && maxDy <= 2, maxDx + ',' + maxDy);

    // 15. camera: pan to a corner clamps to bounds; reset follows the player again
    await runCmd(async (c) => { await c.camera(2, 2, 20); });
    check('camera pan clamps to map bounds', G.map.cam.x === 0 && G.map.cam.y === 0, G.map.cam.x + ',' + G.map.cam.y);
    await runCmd(async (c) => { await c.camReset(20); });
    const pc = P().x * 32 + 16, pcy = P().y * 32 + 16;
    const ex = Math.min(640, Math.max(0, pc - 320)), ey = Math.min(480, Math.max(0, pcy - 240));
    check('camReset returns the camera to the player', Math.round(G.map.cam.x) === ex && Math.round(G.map.cam.y) === ey, G.map.cam.x + ' vs ' + ex);

    // 16. walkTo (BFS)
    await runCmd(async (c) => { await c.walkTo('player', 12, 20); });
    check('walkTo reaches target', P().x === 12 && P().y === 20, P().x + ',' + P().y);

    // 17. emote waits ~40 frames
    let done = false, nTicks = 0;
    G.script.run(async (c) => { await c.emote('player', 'heart'); done = true; });
    while (!done && nTicks < 200) { await tick(1); nTicks++; }
    check('emote resolves after ~40 frames', nTicks >= 38 && nTicks <= 42, nTicks);

    // 18. jump: hop then back on the ground
    let minJy = 0; G.script.run(async (c) => { await c.jump('player'); });
    for (let i = 0; i < 22; i++) { await tick(1); minJy = Math.min(minJy, P().jy); }
    check('jump lifts the sprite and lands', minJy < -4 && Math.abs(P().jy) === 0, minJy);

    // 19. menu key pushes the menu scene and popping resumes the map
    await tp(10, 15, 'down');
    G.input.press('menu'); await tick(1); G.input.release('menu'); await tick(1);
    check('menu key opens menu scene', G.scenes.top().name === 'menu');
    G.scenes.pop(); await tick(2);
    check('closing menu resumes map', G.scenes.top().name === 'map');

    // 20. scripts that are busy ignore new triggers (action during a busy script)
    await tp(26, 13, 'up');
    const before = logCount(/I see you/);
    G.script.run(async (c) => { await c.wait(40); });
    await tick(1);
    G.input.press('ok'); await tick(1); G.input.release('ok');
    await waitFor(() => !G.script.busy, 200); await tick(5);
    check('action ignored while another script runs', logCount(/I see you/) === before, logCount(/I see you/) - before);

    // 21. showNpc / setEvent / setPos / face / setSprite
    await runCmd(async (c) => { await c.showNpc('watcher', false); });
    check('showNpc(false) hides an NPC', G.map.getEvent('watcher').hidden === true);
    await runCmd(async (c) => { await c.showNpc('watcher', true); await c.setEvent('watcher', { x: 27, y: 12 }); });
    check('setEvent moves an NPC', G.map.getEvent('watcher').x === 27 && G.map.getEvent('watcher').hx === 27);
    await runCmd(async (c) => { await c.setPos('player', 10, 15, 'left'); await c.face('player', 'down'); });
    check('setPos + face', P().x === 10 && P().y === 15 && P().dir === 'down', P().x + ',' + P().y + ' ' + P().dir);
    await runCmd(async (c) => { await c.setSprite('watcher', 'elder'); });
    check('setSprite changes an NPC sprite', G.map.getEvent('watcher').sprite === 'elder');

    // 22. scripted walk with dirs
    await tp(10, 15, 'down');
    await runCmd(async (c) => { await c.walk('player', ['up', 'up', 'right']); });
    check('scripted walk executes its steps', P().x === 11 && P().y === 13, P().x + ',' + P().y);

    // 23. the transfer does not leave the player input locked
    await tp(10, 15, 'down');
    await tap('right', 1); await settle();
    check('input works after all of the above', P().x === 11);

    return out;
  });

  const bad = results.filter((r) => !r.ok);
  for (const r of results) console.log((r.ok ? 'PASS ' : 'FAIL ') + r.name + (r.info ? '   [' + r.info + ']' : ''));
  errors.slice(0, 30).forEach((e) => console.log('[ERROR] ' + e));
  console.log(`\n${results.length - bad.length}/${results.length} checks passed, ${errors.length} page errors`);
  await browser.close();
  process.exit(bad.length || errors.length ? 1 : 0);
})();
