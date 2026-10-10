#!/usr/bin/env node
/* Story-progression test: from a NEW GAME, repeatedly visits each chapter's maps in the real engine and runs every event whose `if` is currently
 * true (dialogue auto-confirmed, battles auto-won), then checks the chapter completion flags. Run: NODE_PATH=$(npm root -g) node tools/chain.js */
const path = require('path'); const { chromium } = require('playwright');
const LOVE = (process.argv.indexOf('--love') > 0) ? process.argv[process.argv.indexOf('--love') + 1] : null;
(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 640, height: 480 } });
  const pageErrs = []; page.on('pageerror', (e) => pageErrs.push(e.message)); page.on('console', (m) => { if (m.type() === 'log' && /^\[chain\]/.test(m.text())) console.log(m.text()); });
  await page.goto('file://' + path.resolve(__dirname, '../index.html'));
  await page.waitForFunction(() => window.G && G.step);
  const out = await page.evaluate(async (LOVE) => {
    G.paused = true; const log = []; const issues = [];
    const oe = console.error, ow = console.warn; console.error = (...a) => issues.push('ERROR ' + a.map(String).join(' ').slice(0, 200)); console.warn = (...a) => { const m = a.map(String).join(' '); if (!/load\]/.test(m)) issues.push('WARN ' + m.slice(0, 200)); };
    const mc = new MessageChannel(); const tick = () => new Promise((r) => { mc.port1.onmessage = r; mc.port2.postMessage(0); });
    G.script.define('battle', async (id, o) => { if (o && o.intro) await G.script.run(o.intro); if (o && o.onHalf) await G.script.run(o.onHalf); if (o && o.outro) await G.script.run(o.outro); G.state.battles++; return 'win'; });
    let age = 0, frames = 0;
    const drive = async (n) => { for (let i = 0; i < n; i++) {
      const tn = G.scenes.top() && G.scenes.top().name; const sub = tn && !['map', 'battle', 'title', 'credits'].includes(tn);
      if (tn === 'credits') return 'credits';
      if (sub) { if (i % 4 === 0) { G.input.press('cancel'); G.input.release('cancel'); } }
      else if (G.ui.modal && i % 3 === 0) { if (age > 500) { G.input.press('up'); G.input.release('up'); G.step(); } G.input.press('ok'); G.input.release('ok'); }
      G.step(); frames++; age++; await tick(); } return null; };
    const settle = async () => { for (let i = 0; i < 40; i++) { const r = await drive(40); if (r) return r; if (G.scenes.top() && G.scenes.top().name === 'map' && !G.script.busy && G.fx.fade === 0 && !G.ui.modal) return null; } return null; };
    // new game exactly as the title screen does
    G.newGame('Rowan'); G.resumeGame(); await settle();
    const runEv = async (def, e) => { age = 0; const p = G.script.run(e.run); let done = false; p.then(() => { done = true; }); for (let k = 0; k < 120 && !done; k++) { const r = await drive(50); if (r === 'credits') return 'credits'; } if (!done) { G.script.depth = 0; G.script.busy = false; issues.push('HANG ' + def.id + '/' + e.id); } while (G.scenes.depth() > 1 && G.scenes.top().name !== 'map' && G.scenes.top().name !== 'credits') G.scenes.pop(); return null; };
    const goto = async (id) => { if (G.map && G.map.id === id) return; age = 0; let done = false; G.script.run((c) => c.transfer(id)).then(() => { done = true; }); for (let k = 0; k < 60 && !done; k++) { const r = await drive(50); if (r === 'credits') return; } await settle(); };
    const chapters = [
      ['ch1', ['wickholm_house', 'wickholm', 'mossgrave_wood', 'brasshaven', 'brasshaven_workshop', 'brasshaven_inn', 'undercroft_1', 'undercroft_2', 'brasshaven_workshop', 'brasshaven'], 'ch1_done', ['claret']],
      ['ch2', ['gladius_citadel', 'gladius_tavern', 'gladius_arena', 'gladius_citadel', 'gladius_arena', 'aqueduct_1', 'aqueduct_2'], 'ch2_done', ['caspian', 'rook']],
      ['ch3', ['pale_abbey', 'pale_abbey_hall', 'whisperwood_1', 'wren_cottage', 'whisperwood_2', 'wren_cottage', 'abbey_crypt_1', 'abbey_crypt_2', 'pale_abbey'], 'ch3_done', ['seraphine', 'wren']],
      ['ch4', ['lumen_vale', 'lumen_inn', 'lumen_lake', 'ashen_road_1', 'ashen_road_2', 'lumen_vale'], 'ch4_done', []],
      ['ch5', ['spire_gate', 'spire_hall_1', 'spire_hall_2', 'spire_upper', 'hearthstar_chamber'], 'ch6_done', []],
    ];
    let ended = null;
    for (const [name, maps, flag, need] of chapters) {
      if (name === 'ch4' && LOVE) { G.state.romance.points[LOVE] = 72; G.party.setParty(['rowan', LOVE, 'claret', 'caspian'].filter((v, i, a) => a.indexOf(v) === i).slice(0, 4)); log.push('primed love=' + LOVE + ' party=' + G.state.party.join(',')); }
      const satisfied = () => G.flag(flag) && need.every((n) => G.state.roster[n]);
      for (let pass = 0; pass < 8 && !satisfied() && !ended; pass++) {
        for (const id of maps) {
          await goto(id); const def = G.maps.get(id);
          for (const e of def.events) {
            if (typeof e.run !== 'function' || e.trigger === 'auto') continue;
            let ok = true; try { ok = e.if ? !!e.if() : true; } catch (x) { ok = false; }
            if (!ok) continue; if (/save|shop|smith|merchant|innkeeper|ship_pad|sign/.test(e.id) && !/gate|door/.test(e.id)) continue;
            console.log('[chain] ' + name + ' pass' + pass + ' ' + id + '/' + e.id + ' f=' + frames); const r = await runEv(def, e); if (r === 'credits') { ended = 'credits'; break; }
            if (G.map && G.map.id !== id) await goto(id);
          }
          if (ended || satisfied()) break;
        }
      }
      log.push(name + ': ' + flag + '=' + !!G.flag(flag) + ' needJoined=' + need.map((n) => n + ':' + !!G.state.roster[n]).join(',') + ' chapter=' + G.state.chapter + ' party=' + G.state.party.join(',') + ' roster=' + Object.keys(G.state.roster).join(','));
      if (!G.flag(flag) && !ended) { log.push('  flags: ' + Object.keys(G.state.flags).filter((k) => k.startsWith(name)).join(' ')); }
      if (ended) break;
      if (name !== 'ch5') { /* between chapters the player is on the Marigold; goto handles transfers */ }
    }
    log.push('romance: ' + JSON.stringify(G.state.romance.points) + ' lover=' + G.state.romance.lover + ' ending=' + G.flag('ending') + ' endedAt=' + ended);
    console.error = oe; console.warn = ow; return { log, issues: [...new Set(issues)], frames };
  }, LOVE);
  out.log.forEach((l) => console.log(l)); console.log('frames', out.frames); out.issues.slice(0, 40).forEach((i) => console.log('  ✗ ' + i)); pageErrs.slice(0, 5).forEach((e) => console.log('[pageerror]', e));
  await browser.close();
})();
