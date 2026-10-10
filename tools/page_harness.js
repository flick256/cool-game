/* Node-side helper: builds a temp HTML page loading core+tiles+mapbuilder+stubs+given files, returns {page, browser, errors}. */
const path = require('path'); const fs = require('fs');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
exports.open = async function (files, extraScripts) {
  const abs = (f) => 'file://' + path.resolve(f);
  const scripts = ['js/core.js', 'js/tiles.js', 'js/mapbuilder.js', 'tools/known.js', 'tools/stubs.js'].concat(extraScripts || []).concat(files);
  const html = '<!DOCTYPE html><html><body><canvas id="game"></canvas>' + scripts.map((s) => '<script src="' + abs(path.resolve(root, s)) + '"></script>').join('') + '</body></html>';
  const tmp = path.join(root, 'tests', '_harness_' + process.pid + '.html'); fs.writeFileSync(tmp, html);
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 640, height: 480 } });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); else if (m.type() === 'warning') errors.push('[warn] ' + m.text()); });
  page.on('pageerror', (e) => errors.push('PAGEERROR ' + (e.stack || e.message)));
  await page.goto('file://' + tmp);
  await page.evaluate(() => { G.paused = true; });
  return { page, browser, errors, cleanup: () => { try { fs.unlinkSync(tmp); } catch (e) {} } };
};
