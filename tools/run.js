#!/usr/bin/env node
/* Headless runner for Lanternbound.
 *   node tools/run.js [--url "index.html?map=wickholm"] [--frames 120] [--shot out.png] [--eval "G.state.gold"] [--keys "ok,down:10,ok"] [--quiet]
 * Prints console errors/warnings; exits non-zero if there were page errors. Uses the preinstalled Chromium.
 * Run:  NODE_PATH=$(npm root -g) node tools/run.js ...
 */
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2); const opt = {};
for (let i = 0; i < args.length; i++) { const a = args[i]; if (a.startsWith('--')) { const k = a.slice(2); const v = (args[i + 1] && !args[i + 1].startsWith('--')) ? args[++i] : true; opt[k] = v; } }
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: 640, height: 480 } });
  const errors = [], logs = [];
  page.on('console', (m) => { const t = m.type(); const s = m.text(); if (t === 'error') { if (!/Failed to load resource/.test(s)) errors.push(s); } else if (t === 'warning' || (!opt.quiet && t === 'log')) logs.push('[' + t + '] ' + s); });
  page.on('pageerror', (e) => errors.push('PAGEERROR ' + (e.stack || e.message)));
  const root = path.resolve(__dirname, '..');
  const url = 'file://' + root + '/' + (opt.url || 'index.html');
  await page.goto(url);
  await page.waitForFunction(() => window.G && G.step, null, { timeout: 10000 }).catch(() => {});
  // the real RAF loop runs too; for determinism we pause it and step manually
  await page.evaluate(() => { G.paused = true; });
  const keys = (opt.keys || '').split(',').filter(Boolean);
  for (const k of keys) {
    // "ok" = tap; "down:10" = hold down for 10 frames; "wait:30" = advance 30 frames
    const [name, n] = k.split(':');
    if (name === 'wait') { await page.evaluate((n) => G.advance(+n), n || 30); continue; }
    await page.evaluate(([b, n]) => { G.input.press(b); G.advance(n); G.input.release(b); G.advance(2); }, [name, +(n || 3)]);
  }
  if (opt.frames) await page.evaluate((n) => G.advance(+n), opt.frames);
  if (opt.eval) { const r = await page.evaluate((e) => { try { return JSON.stringify(eval(e)); } catch (err) { return 'EVAL ERROR ' + err.message; } }, opt.eval); console.log('eval =>', r); }
  if (opt.shot) { await page.locator('canvas#game').screenshot({ path: path.resolve(opt.shot) }); console.log('screenshot ->', opt.shot); }
  const miss = await page.evaluate(() => window.__loadErrors || []);
  if (miss.length && !opt.quiet) console.log('missing scripts:', miss.map((s) => s.split('/').pop()).join(', '));
  logs.slice(0, 40).forEach((l) => console.log(l));
  errors.slice(0, 40).forEach((e) => console.log('[ERROR] ' + e));
  await browser.close();
  process.exit(errors.length ? 1 : 0);
})();
