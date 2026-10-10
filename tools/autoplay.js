#!/usr/bin/env node
/* Real-engine smoke test: enters every map with the REAL engine and runs every event script with auto-confirmed dialogue.
 *   NODE_PATH=$(npm root -g) node tools/autoplay.js [mapId ...] [--variants 2] [--maxframes 4000]
 * Battles are auto-won. Reports script errors, missing commands, console warnings and hangs. */
const path = require('path'); const { chromium } = require('playwright');
const args = process.argv.slice(2); const maps = []; const opt = { variants: 2, maxframes: 4000 };
for (let i = 0; i < args.length; i++) { if (args[i] === '--variants') opt.variants = +args[++i]; else if (args[i] === '--maxframes') opt.maxframes = +args[++i]; else maps.push(args[i]); }
(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 640, height: 480 } });
  const pageErrs = []; page.on('pageerror', (e) => pageErrs.push(e.message));
  await page.goto('file://' + path.resolve(__dirname, '../index.html'));
  await page.waitForFunction(() => window.G && G.step);
  const report = await page.evaluate(async ({ opt, only }) => {
    G.paused = true;
    const issues = []; let label = '';
    const oe = console.error, ow = console.warn;
    console.error = (...a) => { issues.push(label + ' ERROR ' + a.map(String).join(' ').slice(0, 300)); };
    console.warn = (...a) => { const m = a.map(String).join(' '); if (!/load\]/.test(m)) issues.push(label + ' WARN ' + m.slice(0, 300)); };
    const mc = new MessageChannel(); const tick = () => new Promise((r) => { mc.port1.onmessage = r; mc.port2.postMessage(0); });
    // auto-win battles, keep everything else real
    G.script.define('battle', async (id, o) => { if (o && o.intro) await G.script.run(o.intro); if (o && o.onHalf) await G.script.run(o.onHalf); if (o && o.outro) await G.script.run(o.outro); return 'win'; });
    let variant = 0; let frames = 0; let age = 0;
    const drive = async (n) => {
      for (let i = 0; i < n; i++) {
        const tn = G.scenes.top() && G.scenes.top().name;
        const sub = tn && tn !== 'map' && tn !== 'battle' && tn !== 'title';
        if (sub) { if (i % 4 === 0) { G.input.press('cancel'); G.input.release('cancel'); } }
        else if (G.ui.modal && i % 3 === 0) { const d = variant === 1 ? Math.floor(Math.random() * 3) : 0; for (let q = 0; q < d; q++) { G.input.press('down'); G.input.release('down'); G.step(); } if (age > 400) { G.input.press('up'); G.input.release('up'); G.step(); } G.input.press('ok'); G.input.release('ok'); }
        G.step(); frames++; age++; await tick();
        if (!G.script.busy && !G.fx.fadeRes && G.fx.fade === 0 && i > 20 && G.scenes.top() && G.scenes.top().name === 'map' && !G.ui.modal) return true;
      } return false;
    };
    const reset = async (mapId, v) => {
      variant = v; G.debug.start({ map: mapId, party: ['rowan', 'claret', 'caspian', 'rook', 'seraphine', 'wren'], level: 20, flags: ['marigold_ready'] });
      for (let i = 0; i < 1200; i++) { await drive(1); if (G.scenes.top() && G.scenes.top().name === 'map' && !G.script.busy && G.fx.fade === 0 && i > 90) break; }
    };
    let count = 0;
    const ids = (only.length ? only : G.maps.list());
    for (const mapId of ids) {
      const def = G.maps.get(mapId); if (!def) { issues.push(mapId + ' not registered'); continue; }
      for (let v = 0; v < opt.variants; v++) {
        label = mapId + '/entry#' + v; await reset(mapId, v);
        for (const e of def.events) {
          if (typeof e.run !== 'function') continue;
          label = mapId + '/' + e.id + '#' + v; count++;
          if (G.map && G.map.id !== mapId) await reset(mapId, v);
          age = 0; const p = G.script.run(e.run); let done = false; p.then(() => { done = true; });
          let ok = false; for (let k = 0; k < opt.maxframes / 50; k++) { await drive(50); if (done) { ok = true; break; } }
          if (!ok) { issues.push(label + ' HANG (script did not finish in ' + opt.maxframes + ' frames) top=' + (G.scenes.top() && G.scenes.top().name) + ' modal=' + G.ui.modal); G.script.depth = 0; G.script.busy = false; if (G.ui.close) try { G.ui.close(); } catch (x) {} await reset(mapId, v); }
          // leave script-spawned scenes (menus) cleanly
          while (G.scenes.depth() > 1 && G.scenes.top().name !== 'map') G.scenes.pop();
          if (!G.scenes.top() || G.scenes.top().name !== 'map') await reset(mapId, v);
        }
      }
    }
    console.error = oe; console.warn = ow;
    const uniq = [...new Set(issues)];
    return { count, frames, issues: uniq };
  }, { opt, only: maps });
  console.log('ran ' + report.count + ' event scripts, ' + report.frames + ' frames');
  report.issues.slice(0, 120).forEach((i) => console.log('  ✗ ' + i)); if (report.issues.length > 120) console.log('  … ' + (report.issues.length - 120) + ' more');
  pageErrs.slice(0, 10).forEach((e) => console.log('[pageerror] ' + e));
  await browser.close(); process.exit(report.issues.length || pageErrs.length ? 1 : 0);
})();
